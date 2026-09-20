import json
import random
import secrets
import uuid
from datetime import datetime, timedelta
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.database import get_db
from app.core.security import hash_password
from app.models import (
    Patient, SymptomReport, WearableReading, MedicalHistoryRecord, User,
    PatientMedication, PatientAllergy, MedicalTestRecord, CareEncounter, FollowUp,
    AccessConsent, AccessAuditLog, Referral, Recommendation, RiskAssessment, Facility, Doctor
)
from app.models.enums import UserRole
from app.schemas.patient import (
    PatientProfileCreate, PatientProfileUpdate, PatientProfileOut,
    SymptomReportCreate, SymptomReportOut,
    WearableReadingCreate, WearableReadingOut,
    MedicalHistoryRecordCreate, MedicalHistoryRecordOut,
    PatientMedicationCreate, PatientMedicationOut,
    PatientAllergyCreate, PatientAllergyOut,
    MedicalTestRecordCreate, MedicalTestRecordOut,
    CareEncounterCreate, CareEncounterOut,
    FollowUpCreate, FollowUpOut,
    StaffPatientRegister, StaffPatientRegisterOut,
    DigitalPassportOut, AccessConsentCreate, AccessConsentOut,
    AccessAuditLogOut, HospitalCheckinRequest, HospitalCheckinOut,
    PatientJourneyEventOut,
)

router = APIRouter()


# In-memory queue status tracker for live session updates
# Key: (doctor_id, patient_id) -> status string ("WAITING", "IN_CONSULTATION", "COMPLETED")
_DOCTOR_QUEUE_STATUS_STORE = {}


async def _resolve_doctor_and_facility(db: AsyncSession, current_user: User):
    """
    Finds or associates the doctor record and affiliated facility for current user.
    """
    doctor = None
    # 1. Search by user_id
    res = await db.execute(select(Doctor).where(Doctor.user_id == current_user.id))
    doctor = res.scalar_one_or_none()

    # 2. Search by matching full name
    if not doctor and current_user.full_name:
        res = await db.execute(select(Doctor).where(Doctor.full_name == current_user.full_name))
        doctor = res.scalar_one_or_none()

    # 3. Search by default doctor for doctor role
    is_doc_role = current_user.role == UserRole.DOCTOR or (
        isinstance(current_user.role, str) and current_user.role.lower() == "doctor"
    )
    if not doctor and is_doc_role:
        res = await db.execute(select(Doctor).where(Doctor.full_name.ilike("%Rajesh Sharma%")))
        doctor = res.scalar_one_or_none()
        if not doctor:
            res = await db.execute(select(Doctor).limit(1))
            doctor = res.scalar_one_or_none()
        if doctor and not doctor.user_id:
            doctor.user_id = current_user.id
            await db.commit()

    facility = None
    if doctor and doctor.facility_id:
        f_res = await db.execute(select(Facility).where(Facility.id == doctor.facility_id))
        facility = f_res.scalar_one_or_none()

    return doctor, facility


def _ensure_mc_id(patient: Patient) -> str:
    if not patient.medi_connect_id:
        patient.medi_connect_id = f"MC-{random.randint(10000, 99999)}"
    return patient.medi_connect_id


async def _get_or_404(db: AsyncSession, current_user: User) -> Patient:
    result = await db.execute(select(Patient).where(Patient.user_id == current_user.id))
    patient = result.scalar_one_or_none()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient profile not found. Create one first via POST /me.")
    if not patient.medi_connect_id:
        _ensure_mc_id(patient)
        await db.commit()
    return patient


def _profile_out(patient: Patient, user: Optional[User]) -> PatientProfileOut:
    data = PatientProfileOut.model_validate(patient)
    if user:
        data.full_name = user.full_name
        data.email = user.email
    data.medi_connect_id = patient.medi_connect_id or _ensure_mc_id(patient)
    return data


@router.get("/", response_model=List[PatientProfileOut])
async def list_patients(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    is_doctor = (
        current_user.role == UserRole.DOCTOR or 
        (isinstance(current_user.role, str) and current_user.role.lower() == "doctor")
    )
    
    if is_doctor:
        doctor, facility = await _resolve_doctor_and_facility(db, current_user)
        facility_name = facility.name if facility else "Maharaja Yashwantrao Hospital (MYH Indore)"
        doctor_name = doctor.full_name if doctor else current_user.full_name
        doc_id = doctor.id if doctor else None
        fac_id = facility.id if facility else None

        # Gather patient IDs that belong under this doctor/facility
        patient_ids = set()

        # 1. Care encounters with this doctor or facility
        enc_q = select(CareEncounter.patient_id)
        if doc_id and fac_id:
            enc_q = enc_q.where((CareEncounter.doctor_id == doc_id) | (CareEncounter.facility_id == fac_id))
        elif doc_id:
            enc_q = enc_q.where(CareEncounter.doctor_id == doc_id)
        elif fac_id:
            enc_q = enc_q.where(CareEncounter.facility_id == fac_id)
        enc_res = await db.execute(enc_q)
        for pid in enc_res.scalars().all():
            patient_ids.add(pid)

        # 2. Referrals assigned to this doctor or facility
        ref_q = select(Referral)
        if doc_id and fac_id:
            ref_q = ref_q.where((Referral.doctor_id == doc_id) | (Referral.facility_id == fac_id))
        elif doc_id:
            ref_q = ref_q.where(Referral.doctor_id == doc_id)
        elif fac_id:
            ref_q = ref_q.where(Referral.facility_id == fac_id)
        ref_res = await db.execute(ref_q)
        for r in ref_res.scalars().all():
            if r.recommendation_id:
                rec_res = await db.execute(select(Recommendation.patient_id).where(Recommendation.id == r.recommendation_id))
                rec_pid = rec_res.scalar_one_or_none()
                if rec_pid:
                    patient_ids.add(rec_pid)

        # 3. Active or granted consents for this facility or department
        now = datetime.utcnow()
        c_q = select(AccessConsent).where(
            AccessConsent.status == "active",
            (AccessConsent.expires_at == None) | (AccessConsent.expires_at > now - timedelta(hours=24))
        )
        c_res = await db.execute(c_q)
        all_consents = c_res.scalars().all()
        matching_consents_by_patient = {}
        for c in all_consents:
            if (
                facility_name.lower() in c.facility_name.lower() or 
                c.facility_name.lower() in facility_name.lower() or
                (doctor and doctor.specialty and doctor.specialty.lower() in (c.department or "").lower())
            ):
                patient_ids.add(c.patient_id)
                if c.patient_id not in matching_consents_by_patient:
                    matching_consents_by_patient[c.patient_id] = c

        # Fallback for demo: if no patient found, link demo patient
        if not patient_ids:
            first_p_res = await db.execute(select(Patient.id).limit(2))
            for pid in first_p_res.scalars().all():
                patient_ids.add(pid)

        result = await db.execute(
            select(Patient, User)
            .join(User, Patient.user_id == User.id)
            .where(Patient.id.in_(list(patient_ids)))
        )
        patient_rows = result.all()

        output = []
        for p, u in patient_rows:
            p_out = _profile_out(p, u)
            p_out.assigned_doctor_name = doctor_name
            # Find matching consent
            c = matching_consents_by_patient.get(p.id)
            if not c:
                for ac in all_consents:
                    if ac.patient_id == p.id:
                        c = ac
                        break
            if c:
                p_out.active_consent_duration = f"{c.duration.title() if c.duration else '24h'} Visit Window"
                p_out.consent_expires_at = c.expires_at
                if c.expires_at:
                    rem = c.expires_at - now
                    if rem.total_seconds() > 0:
                        hrs = int(rem.total_seconds() // 3600)
                        mins = int((rem.total_seconds() % 3600) // 60)
                        p_out.consent_time_remaining = f"{hrs}h {mins}m remaining"
                    else:
                        p_out.consent_time_remaining = "Expired"
                else:
                    p_out.consent_time_remaining = "Active Visit"
            else:
                p_out.active_consent_duration = "24h Visit Window"
                p_out.consent_time_remaining = "18h 45m remaining"

            # Get latest chief complaint
            enc_last = await db.execute(
                select(CareEncounter)
                .where(CareEncounter.patient_id == p.id)
                .order_by(CareEncounter.encounter_date.desc())
                .limit(1)
            )
            latest_enc = enc_last.scalar_one_or_none()
            if latest_enc and latest_enc.chief_complaint:
                p_out.chief_complaint = latest_enc.chief_complaint
            else:
                p_out.chief_complaint = "Routine Clinical Consultation"

            output.append(p_out)

        return output

    # If admin: return all patients
    result = await db.execute(select(Patient, User).join(User, Patient.user_id == User.id))
    return [_profile_out(patient, user) for patient, user in result.all()]


@router.post("/", response_model=PatientProfileOut, status_code=201)
async def create_patient(
    payload: PatientProfileCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    existing = await db.execute(select(Patient).where(Patient.user_id == current_user.id))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Profile already exists for this user")

    patient = Patient(user_id=current_user.id, **payload.model_dump())
    db.add(patient)
    await db.commit()
    await db.refresh(patient)
    return patient


@router.post("/register", response_model=StaffPatientRegisterOut, status_code=201)
async def register_new_patient(
    payload: StaffPatientRegister,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Staff/doctor-facing patient intake. Unlike POST /, this creates a brand
    new User + Patient pair for someone other than the caller, so multiple
    patients can be registered from the same staff account.
    """
    email = payload.email
    if not email:
        email = f"patient-{uuid.uuid4().hex[:10]}@smarthealthgrid.local"
    else:
        existing = await db.execute(select(User).where(User.email == email))
        if existing.scalar_one_or_none():
            raise HTTPException(status_code=400, detail="Email already registered")

    temp_password = secrets.token_urlsafe(12)
    new_user = User(
        email=email,
        hashed_password=hash_password(temp_password),
        full_name=payload.full_name,
        role=UserRole.PATIENT,
    )
    db.add(new_user)
    await db.flush()  # get new_user.id before creating the dependent Patient row

    patient = Patient(
        user_id=new_user.id,
        date_of_birth=payload.date_of_birth,
        gender=payload.gender,
        blood_group=payload.blood_group,
        location_lat=payload.location_lat,
        location_lng=payload.location_lng,
    )
    db.add(patient)
    await db.flush()

    for condition in (payload.medical_history or []):
        db.add(MedicalHistoryRecord(patient_id=patient.id, condition=condition, notes="Reported medical history"))
    for condition in (payload.chronic_conditions or []):
        db.add(MedicalHistoryRecord(patient_id=patient.id, condition=condition, notes="Chronic condition"))

    await db.commit()
    await db.refresh(patient)

    return StaffPatientRegisterOut(
        id=patient.id,
        user_id=new_user.id,
        full_name=new_user.full_name,
        email=new_user.email,
        date_of_birth=patient.date_of_birth,
        gender=patient.gender,
        blood_group=patient.blood_group,
        location_lat=patient.location_lat,
        location_lng=patient.location_lng,
    )


@router.get("/me", response_model=PatientProfileOut)
async def get_my_profile(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    patient = await _get_or_404(db, current_user)
    return _profile_out(patient, current_user)


@router.post("/me", response_model=PatientProfileOut, status_code=201)
async def create_my_profile(
    payload: PatientProfileCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    existing = await db.execute(select(Patient).where(Patient.user_id == current_user.id))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Profile already exists")

    patient = Patient(user_id=current_user.id, **payload.model_dump())
    db.add(patient)
    await db.commit()
    await db.refresh(patient)
    return patient


@router.put("/me", response_model=PatientProfileOut)
@router.patch("/me", response_model=PatientProfileOut)
async def update_my_profile(
    payload: PatientProfileUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Consistently update the authenticated patient's profile:
    - User full_name
    - Patient date_of_birth, gender, blood_group, wearable_device_id, location coordinates
    """
    patient = await _get_or_404(db, current_user)

    if payload.full_name is not None and payload.full_name.strip():
        current_user.full_name = payload.full_name.strip()
        db.add(current_user)

    if payload.date_of_birth is not None:
        patient.date_of_birth = payload.date_of_birth
    if payload.gender is not None:
        patient.gender = payload.gender
    if payload.blood_group is not None:
        patient.blood_group = payload.blood_group
    if payload.wearable_device_id is not None:
        patient.wearable_device_id = payload.wearable_device_id
    if payload.location_lat is not None:
        patient.location_lat = payload.location_lat
    if payload.location_lng is not None:
        patient.location_lng = payload.location_lng

    db.add(patient)
    await db.commit()
    await db.refresh(patient)
    await db.refresh(current_user)
    return _profile_out(patient, current_user)


@router.get("/{id}", response_model=PatientProfileOut)
async def get_patient_by_id(
    id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Patient, User).join(User, Patient.user_id == User.id).where(Patient.id == id))
    row = result.first()
    if not row:
        raise HTTPException(status_code=404, detail="Patient not found")
    patient, user = row
    return _profile_out(patient, user)


@router.put("/{id}", response_model=PatientProfileOut)
async def update_patient(
    id: uuid.UUID,
    payload: PatientProfileCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Patient).where(Patient.id == id))
    patient = result.scalar_one_or_none()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    for field, val in payload.model_dump(exclude_unset=True).items():
        setattr(patient, field, val)

    await db.commit()
    await db.refresh(patient)
    return patient


@router.post("/me/symptoms", response_model=SymptomReportOut, status_code=201)
async def log_symptoms(
    payload: SymptomReportCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    patient = await _get_or_404(db, current_user)
    report = SymptomReport(patient_id=patient.id, **payload.model_dump())
    db.add(report)
    await db.commit()
    await db.refresh(report)
    return report


@router.post("/me/vitals", response_model=WearableReadingOut, status_code=201)
async def log_vitals(
    payload: WearableReadingCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    patient = await _get_or_404(db, current_user)
    reading = WearableReading(patient_id=patient.id, **payload.model_dump())
    db.add(reading)
    await db.commit()
    await db.refresh(reading)
    return reading


@router.get("/me/vitals", response_model=list[WearableReadingOut])
async def list_my_vitals(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    patient = await _get_or_404(db, current_user)
    result = await db.execute(
        select(WearableReading).where(WearableReading.patient_id == patient.id).order_by(WearableReading.recorded_at.desc())
    )
    return result.scalars().all()


@router.post("/me/medical-history", response_model=MedicalHistoryRecordOut, status_code=201)
async def add_medical_history(
    payload: MedicalHistoryRecordCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    patient = await _get_or_404(db, current_user)
    record = MedicalHistoryRecord(patient_id=patient.id, **payload.model_dump())
    db.add(record)
    await db.commit()
    await db.refresh(record)
    return record


@router.get("/me/medical-history", response_model=list[MedicalHistoryRecordOut])
async def list_my_medical_history(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    patient = await _get_or_404(db, current_user)
    result = await db.execute(
        select(MedicalHistoryRecord).where(MedicalHistoryRecord.patient_id == patient.id)
    )
    return result.scalars().all()


@router.get("/me/medical-tests", response_model=List[MedicalTestRecordOut])
async def list_my_medical_tests(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retrieve all diagnostic tests and lab reports for the authenticated patient."""
    patient = await _get_or_404(db, current_user)
    result = await db.execute(
        select(MedicalTestRecord)
        .where(MedicalTestRecord.patient_id == patient.id)
        .order_by(MedicalTestRecord.test_date.desc())
    )
    return result.scalars().all()


@router.post("/me/medical-tests", response_model=MedicalTestRecordOut, status_code=201)
async def add_my_medical_test(
    payload: MedicalTestRecordCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Add or connect a new medical report to the authenticated patient's longitudinal history."""
    patient = await _get_or_404(db, current_user)
    data = payload.model_dump()
    if not data.get("test_date"):
        data["test_date"] = datetime.utcnow()
    test = MedicalTestRecord(patient_id=patient.id, **data)
    db.add(test)
    await db.commit()
    await db.refresh(test)
    return test


# Medication Management
@router.get("/{id}/medications", response_model=List[PatientMedicationOut])
async def get_patient_medications(
    id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(PatientMedication).where(PatientMedication.patient_id == id))
    return result.scalars().all()


@router.post("/{id}/medications", response_model=PatientMedicationOut, status_code=201)
async def add_patient_medication(
    id: uuid.UUID,
    payload: PatientMedicationCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    data = payload.model_dump(exclude={"patient_id"})
    med = PatientMedication(patient_id=id, **data)
    db.add(med)
    await db.commit()
    await db.refresh(med)
    return med


# Allergy Records
@router.get("/{id}/allergies", response_model=List[PatientAllergyOut])
async def get_patient_allergies(
    id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(PatientAllergy).where(PatientAllergy.patient_id == id))
    return result.scalars().all()


@router.post("/{id}/allergies", response_model=PatientAllergyOut, status_code=201)
async def add_patient_allergy(
    id: uuid.UUID,
    payload: PatientAllergyCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    data = payload.model_dump(exclude={"patient_id"})
    allergy = PatientAllergy(patient_id=id, **data)
    db.add(allergy)
    await db.commit()
    await db.refresh(allergy)
    return allergy


# Medical Tests
@router.get("/{id}/medical-tests", response_model=List[MedicalTestRecordOut])
async def get_patient_medical_tests(
    id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(MedicalTestRecord).where(MedicalTestRecord.patient_id == id))
    return result.scalars().all()


@router.post("/{id}/medical-tests", response_model=MedicalTestRecordOut, status_code=201)
async def add_patient_medical_test(
    id: uuid.UUID,
    payload: MedicalTestRecordCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    data = payload.model_dump(exclude={"patient_id"})
    test = MedicalTestRecord(patient_id=id, **data)
    db.add(test)
    await db.commit()
    await db.refresh(test)
    return test


# Care Encounters / Treatment History
@router.get("/{id}/care-encounters", response_model=List[CareEncounterOut])
async def get_patient_care_encounters(
    id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(CareEncounter).where(CareEncounter.patient_id == id))
    return result.scalars().all()


@router.post("/{id}/care-encounters", response_model=CareEncounterOut, status_code=201)
async def create_patient_care_encounter(
    id: uuid.UUID,
    payload: CareEncounterCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    data = payload.model_dump(exclude={"patient_id"})
    encounter = CareEncounter(patient_id=id, **data)
    db.add(encounter)
    await db.commit()
    await db.refresh(encounter)
    return encounter


# FollowUps
@router.get("/{id}/followups", response_model=List[FollowUpOut])
async def get_patient_followups(
    id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(FollowUp).where(FollowUp.patient_id == id))
    return result.scalars().all()


@router.post("/{id}/followups", response_model=FollowUpOut, status_code=201)
async def create_patient_followup(
    id: uuid.UUID,
    payload: FollowUpCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    data = payload.model_dump(exclude={"patient_id"})
    followup = FollowUp(patient_id=id, **data)
    db.add(followup)
    await db.commit()
    await db.refresh(followup)
    return followup



@router.post("/me/similar-cases")
async def find_similar_cases(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    from app.services.similarity_engine import find_similar_patient_cases
    patient = await _get_or_404(db, current_user)
    
    sym_res = await db.execute(
        select(SymptomReport).where(SymptomReport.patient_id == patient.id).order_by(SymptomReport.reported_at.desc())
    )
    latest_sym = sym_res.scalar_one_or_none()
    symptoms = latest_sym.symptoms if latest_sym else {"chest_pain": True}

    matches = await find_similar_patient_cases(db, symptoms, top_k=3)
    return {"patient_id": str(patient.id), "similar_cases": matches}


# =====================================================================
# DIGIYATRA FOR HEALTHCARE: IDENTITY, PASSPORT, JOURNEY & CONSENT APIS
# =====================================================================

@router.get("/me/passport", response_model=DigitalPassportOut)
async def get_my_digital_passport(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Returns the patient's Digital Health Passport (DigiYatra Healthcare Identity):
    - Unique Medi-Connect ID (e.g. MC-84291)
    - Verifiable QR Payload
    - Connected facilities, active records count, and current care status.
    """
    patient = await _get_or_404(db, current_user)
    mc_id = patient.medi_connect_id or _ensure_mc_id(patient)

    # 1. Connected facilities count
    consents_res = await db.execute(
        select(AccessConsent.facility_name).where(AccessConsent.patient_id == patient.id).distinct()
    )
    connected_facilities = set(consents_res.scalars().all())

    # 2. Medical records count (history + tests + encounters)
    hist_res = await db.execute(select(MedicalHistoryRecord).where(MedicalHistoryRecord.patient_id == patient.id))
    tests_res = await db.execute(select(MedicalTestRecord).where(MedicalTestRecord.patient_id == patient.id))
    enc_res = await db.execute(select(CareEncounter).where(CareEncounter.patient_id == patient.id))
    total_records = len(hist_res.scalars().all()) + len(tests_res.scalars().all()) + len(enc_res.scalars().all())

    # 3. Active referrals & Current care
    ref_query = (
        select(Referral, Facility)
        .join(Facility, Referral.facility_id == Facility.id)
        .join(Recommendation, Referral.recommendation_id == Recommendation.id)
        .where(Recommendation.patient_id == patient.id)
        .order_by(Referral.created_at.desc())
    )
    ref_res = await db.execute(ref_query)
    referral_rows = ref_res.all()
    active_referrals_count = len(referral_rows)

    current_care = None
    if referral_rows:
        latest_ref, latest_fac = referral_rows[0]
        connected_facilities.add(latest_fac.name)
        current_care = {
            "has_active_referral": True,
            "facility_name": latest_fac.name,
            "facility_type": str(latest_fac.type),
            "address": latest_fac.address,
            "phone": latest_fac.phone,
            "navigation_notes": latest_ref.navigation_notes or "Specialist routing active",
            "emergency_alert_sent": latest_ref.emergency_alert_sent,
            "transit_eta": "6-12 minutes",
        }
    else:
        current_care = {
            "has_active_referral": False,
            "facility_name": "No Active Referral",
            "navigation_notes": "Vital signs and clinical status normal. Routine preventive mode.",
        }

    qr_payload_dict = {
        "medi_connect_id": mc_id,
        "full_name": current_user.full_name,
        "blood_group": patient.blood_group or "Not Specified",
        "dob": patient.date_of_birth.strftime("%Y-%m-%d") if patient.date_of_birth else None,
        "issuer": "Medi-Connect National Health Grid",
        "verified": True,
    }

    return DigitalPassportOut(
        id=patient.id,
        user_id=current_user.id,
        full_name=current_user.full_name or "Patient",
        email=current_user.email,
        medi_connect_id=mc_id,
        qr_payload=json.dumps(qr_payload_dict),
        date_of_birth=patient.date_of_birth,
        gender=patient.gender,
        blood_group=patient.blood_group,
        wearable_device_id=patient.wearable_device_id,
        connected_facilities_count=len(connected_facilities),
        medical_records_count=total_records,
        active_referrals_count=active_referrals_count,
        current_care=current_care,
    )


@router.get("/me/journey", response_model=List[PatientJourneyEventOut])
async def get_my_healthcare_journey(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Unified Longitudinal Healthcare Journey:
    Combines symptoms, AI triage, referrals, check-in verifications, clinical encounters,
    diagnostic tests, pharmacy dispensing, and follow-ups in chronological sequence.
    """
    patient = await _get_or_404(db, current_user)
    events: list[PatientJourneyEventOut] = []

    # 1. Care Encounters
    enc_res = await db.execute(
        select(CareEncounter, Facility)
        .outerjoin(Facility, CareEncounter.facility_id == Facility.id)
        .where(CareEncounter.patient_id == patient.id)
    )
    for enc, fac in enc_res.all():
        fac_name = fac.name if fac else "Participating Hospital"
        events.append(PatientJourneyEventOut(
            id=f"enc-{enc.id}",
            date=enc.encounter_date,
            category="encounter",
            title=f"Clinical Consultation & Diagnosis",
            facility_or_provider=fac_name,
            summary=f"Chief Complaint: {enc.chief_complaint or 'Routine checkup'}. Assessment: {enc.diagnosis or 'Evaluated by physician'}.",
            severity_or_status="Completed",
            details={"treatment_notes": enc.treatment_notes or "Treatment plan discussed."},
        ))

    # 2. Diagnostic Tests
    test_res = await db.execute(
        select(MedicalTestRecord).where(MedicalTestRecord.patient_id == patient.id)
    )
    for t in test_res.scalars().all():
        events.append(PatientJourneyEventOut(
            id=f"test-{t.id}",
            date=t.test_date,
            category="test",
            title=t.test_name,
            facility_or_provider=t.category or "Diagnostic Centre",
            summary=t.result_summary or "Report attached to digital passport.",
            severity_or_status="Report Available",
            details={"category": t.category},
        ))

    # 3. DigiYatra Check-ins & Audit Events
    audit_res = await db.execute(
        select(AccessAuditLog).where(AccessAuditLog.patient_id == patient.id)
    )
    for a in audit_res.scalars().all():
        events.append(PatientJourneyEventOut(
            id=f"audit-{a.id}",
            date=a.timestamp,
            category="checkin",
            title=a.action,
            facility_or_provider=a.facility_name,
            summary=a.details or f"Staff role: {a.staff_role}",
            severity_or_status=a.staff_role,
        ))

    # 4. Referrals
    ref_res = await db.execute(
        select(Referral, Facility)
        .join(Facility, Referral.facility_id == Facility.id)
        .join(Recommendation, Referral.recommendation_id == Recommendation.id)
        .where(Recommendation.patient_id == patient.id)
    )
    for ref, fac in ref_res.all():
        events.append(PatientJourneyEventOut(
            id=f"ref-{ref.id}",
            date=ref.created_at,
            category="referral",
            title="Hospital Care Referral & GPS Routing",
            facility_or_provider=fac.name,
            summary=ref.navigation_notes or f"Referred to {fac.name} with emergency dispatch priority.",
            severity_or_status="Emergency Alert" if ref.emergency_alert_sent else "Routine",
        ))

    # 5. AI Risk Assessments
    risk_res = await db.execute(
        select(RiskAssessment).where(RiskAssessment.patient_id == patient.id)
    )
    for r in risk_res.scalars().all():
        urgency_str = str(r.urgency) if r.urgency else "Routine"
        events.append(PatientJourneyEventOut(
            id=f"risk-{r.id}",
            date=r.created_at,
            category="risk_assessment",
            title=f"AI Clinical Triage ({urgency_str})",
            facility_or_provider=f"Model: {r.model_used.upper()}",
            summary=r.reasoning or f"Risk Score: {round(r.risk_score * 100)}% urgency assessed.",
            severity_or_status=urgency_str,
        ))

    # 6. Symptom Reports
    sym_res = await db.execute(
        select(SymptomReport).where(SymptomReport.patient_id == patient.id)
    )
    for s in sym_res.scalars().all():
        sym_keys = list(s.symptoms.keys()) if isinstance(s.symptoms, dict) else []
        desc_text = s.free_text or (", ".join(sym_keys) if sym_keys else "Self-reported discomfort")
        events.append(PatientJourneyEventOut(
            id=f"sym-{s.id}",
            date=s.reported_at,
            category="symptoms",
            title="Symptoms Logged",
            facility_or_provider="Wearable & Patient Self-Intake",
            summary=desc_text,
            severity_or_status="Logged",
        ))

    # 7. Medications
    med_res = await db.execute(
        select(PatientMedication).where(PatientMedication.patient_id == patient.id)
    )
    for m in med_res.scalars().all():
        events.append(PatientJourneyEventOut(
            id=f"med-{m.id}",
            date=m.prescribed_at,
            category="medication",
            title=f"Prescription: {m.medicine_name}",
            facility_or_provider="Pharmacy Dispense",
            summary=f"Dosage: {m.dosage or 'As advised'} | Frequency: {m.frequency or 'Regular'} | Status: {m.status.title()}",
            severity_or_status=m.status,
        ))

    # 8. Follow-ups
    fol_res = await db.execute(
        select(FollowUp).where(FollowUp.patient_id == patient.id)
    )
    for f in fol_res.scalars().all():
        events.append(PatientJourneyEventOut(
            id=f"fol-{f.id}",
            date=f.scheduled_at,
            category="followup",
            title="Scheduled Follow-up Consultation",
            facility_or_provider="Primary Health Centre",
            summary=f.notes or "Post-treatment monitoring check.",
            severity_or_status="Completed" if f.completed else "Upcoming",
        ))

    # Sort descending by event date
    events.sort(key=lambda x: x.date, reverse=True)
    return events


# --- Consent & Privacy APIs -------------------------------------------

@router.get("/me/consents", response_model=List[AccessConsentOut])
async def list_my_consents(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all active and past DigiYatra hospital access grants for the patient."""
    patient = await _get_or_404(db, current_user)
    result = await db.execute(
        select(AccessConsent).where(AccessConsent.patient_id == patient.id).order_by(AccessConsent.granted_at.desc())
    )
    return result.scalars().all()


@router.post("/me/consents", response_model=AccessConsentOut, status_code=201)
async def create_my_consent(
    payload: AccessConsentCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Grant scoped, time-bound consent to a healthcare facility."""
    patient = await _get_or_404(db, current_user)

    duration = payload.duration or "visit"
    now = datetime.utcnow()
    expires_at = now + timedelta(hours=24) if duration in ["visit", "24h"] else now + timedelta(days=7)

    consent = AccessConsent(
        patient_id=patient.id,
        facility_name=payload.facility_name,
        department=payload.department or "General Medicine",
        requested_by_role=payload.requested_by_role or "doctor",
        status="active",
        scopes=payload.scopes or ["basic_profile", "allergies", "medications", "medical_history", "vitals", "tests"],
        duration=duration,
        granted_at=now,
        expires_at=expires_at,
    )
    db.add(consent)

    # Log to audit trail
    db.add(AccessAuditLog(
        patient_id=patient.id,
        facility_name=payload.facility_name,
        staff_role="Patient Self-Auth",
        action="Consent Granted by Patient",
        details=f"Authorized {duration} access with scopes: {', '.join(consent.scopes)}",
        timestamp=now,
    ))

    await db.commit()
    await db.refresh(consent)
    return consent


@router.post("/me/consents/{consent_id}/revoke", response_model=AccessConsentOut)
async def revoke_consent(
    consent_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Immediately revoke a facility's access to the patient's records."""
    patient = await _get_or_404(db, current_user)
    result = await db.execute(
        select(AccessConsent).where(AccessConsent.id == consent_id, AccessConsent.patient_id == patient.id)
    )
    consent = result.scalar_one_or_none()
    if not consent:
        raise HTTPException(status_code=404, detail="Consent grant not found")

    consent.status = "revoked"
    consent.revoked_at = datetime.utcnow()

    # Log to audit trail
    db.add(AccessAuditLog(
        patient_id=patient.id,
        facility_name=consent.facility_name,
        staff_role="Patient Self-Auth",
        action="Access Revoked by Patient",
        details=f"Patient immediately revoked access for {consent.facility_name} ({consent.department}).",
        timestamp=datetime.utcnow(),
    ))

    await db.commit()
    await db.refresh(consent)
    return consent


@router.get("/me/consent-history", response_model=List[AccessAuditLogOut])
async def get_my_consent_history(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Zero-Trust Access History: Audit log of who accessed the patient's records."""
    patient = await _get_or_404(db, current_user)
    result = await db.execute(
        select(AccessAuditLog).where(AccessAuditLog.patient_id == patient.id).order_by(AccessAuditLog.timestamp.desc())
    )
    return result.scalars().all()


# --- Hospital Check-in Terminal & Verification APIs -------------------

@router.post("/terminal/checkin", response_model=HospitalCheckinOut)
async def hospital_checkin_terminal(
    payload: HospitalCheckinRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    DigiYatra Hospital Check-In Terminal:
    Hospital staff enters/scans patient's Medi-Connect ID.
    Validates identity, evaluates patient consent, and returns scoped context.
    """
    clean_id = payload.medi_connect_id.strip().upper()
    res = await db.execute(
        select(Patient, User).join(User, Patient.user_id == User.id).where(Patient.medi_connect_id == clean_id)
    )
    row = res.first()
    if not row:
        raise HTTPException(status_code=404, detail=f"No patient found with Medi-Connect ID {clean_id}")

    patient, user = row

    # Check active consent for this facility or general active consent
    now = datetime.utcnow()
    c_res = await db.execute(
        select(AccessConsent).where(
            AccessConsent.patient_id == patient.id,
            AccessConsent.status == "active",
            (AccessConsent.expires_at == None) | (AccessConsent.expires_at > now)
        ).order_by(AccessConsent.granted_at.desc())
    )
    active_consents = c_res.scalars().all()

    # Match facility if possible, otherwise accept active consent
    matching_consent = None
    for c in active_consents:
        if payload.facility_name.lower() in c.facility_name.lower() or c.facility_name.lower() in payload.facility_name.lower():
            matching_consent = c
            break
    if not matching_consent and active_consents:
        matching_consent = active_consents[0]

    if not matching_consent:
        return HospitalCheckinOut(
            verified=True,
            patient_id=patient.id,
            medi_connect_id=clean_id,
            full_name=user.full_name,
            consent_status="pending",
            message="Identity verified, but patient consent has not been granted for this facility. Please request access.",
        )

    # Consent is active! Filter scoped context
    scopes = matching_consent.scopes or []
    
    # Audit log
    db.add(AccessAuditLog(
        patient_id=patient.id,
        facility_name=payload.facility_name,
        staff_role=payload.staff_role,
        action="DigiYatra Check-In & Scoped Context Accessed",
        details=f"Identity verified at {payload.facility_name}. Accessed consented scopes: {', '.join(scopes)}",
        timestamp=now,
    ))
    await db.commit()

    basic_profile = None
    if "basic_profile" in scopes:
        basic_profile = {
            "name": user.full_name,
            "email": user.email,
            "dob": patient.date_of_birth.strftime("%Y-%m-%d") if patient.date_of_birth else "Not set",
            "gender": patient.gender or "Not specified",
            "blood_group": patient.blood_group or "Not specified",
            "wearable_device_id": patient.wearable_device_id or "Unpaired",
        }

    allergies_list = None
    if "allergies" in scopes:
        allg_res = await db.execute(select(PatientAllergy).where(PatientAllergy.patient_id == patient.id))
        allergies_list = [
            {"allergen": a.allergen, "severity": a.severity, "reaction": a.reaction}
            for a in allg_res.scalars().all()
        ]

    meds_list = None
    if "medications" in scopes:
        med_res = await db.execute(select(PatientMedication).where(PatientMedication.patient_id == patient.id))
        meds_list = [
            {"name": m.medicine_name, "dosage": m.dosage, "frequency": m.frequency, "status": m.status}
            for m in med_res.scalars().all()
        ]

    hist_list = None
    if "medical_history" in scopes:
        hist_res = await db.execute(select(MedicalHistoryRecord).where(MedicalHistoryRecord.patient_id == patient.id))
        hist_list = [
            {"condition": h.condition, "notes": h.notes}
            for h in hist_res.scalars().all()
        ]

    vitals_data = None
    if "vitals" in scopes:
        vit_res = await db.execute(
            select(WearableReading).where(WearableReading.patient_id == patient.id).order_by(WearableReading.recorded_at.desc()).limit(1)
        )
        latest_vit = vit_res.scalar_one_or_none()
        if latest_vit:
            vitals_data = {
                "heart_rate": latest_vit.heart_rate or 74,
                "spo2": latest_vit.spo2 or 98,
                "blood_pressure": f"{latest_vit.blood_pressure_sys or 120}/{latest_vit.blood_pressure_dia or 80}",
                "temperature": latest_vit.body_temp_c or 37.0,
                "recorded_at": latest_vit.recorded_at.strftime("%H:%M:%S"),
            }

    tests_list = None
    if "tests" in scopes:
        test_res = await db.execute(
            select(MedicalTestRecord).where(MedicalTestRecord.patient_id == patient.id).order_by(MedicalTestRecord.test_date.desc()).limit(5)
        )
        tests_list = [
            {"test_name": t.test_name, "category": t.category, "summary": t.result_summary, "date": t.test_date.strftime("%Y-%m-%d")}
            for t in test_res.scalars().all()
        ]

    return HospitalCheckinOut(
        verified=True,
        patient_id=patient.id,
        medi_connect_id=clean_id,
        full_name=user.full_name,
        consent_status="active",
        consent_id=matching_consent.id,
        granted_scopes=scopes,
        duration=matching_consent.duration,
        basic_profile=basic_profile,
        allergies=allergies_list,
        medications=meds_list,
        medical_history=hist_list,
        vitals=vitals_data,
        tests=tests_list,
        message="Patient verified and scoped clinical context securely retrieved under active consent.",
    )


@router.post("/terminal/grant-visit-consent", response_model=HospitalCheckinOut)
async def terminal_grant_visit_consent(
    payload: HospitalCheckinRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Rapid 1-tap consent approval for hospital check-in:
    Allows patient or hospital staff (with patient consent) to approve visit-level access.
    """
    clean_id = payload.medi_connect_id.strip().upper()
    res = await db.execute(
        select(Patient, User).join(User, Patient.user_id == User.id).where(Patient.medi_connect_id == clean_id)
    )
    row = res.first()
    if not row:
        raise HTTPException(status_code=404, detail="Patient not found")

    patient, user = row
    now = datetime.utcnow()

    consent = AccessConsent(
        patient_id=patient.id,
        facility_name=payload.facility_name,
        department="Hospital Check-In Terminal",
        requested_by_role=payload.staff_role.lower(),
        status="active",
        scopes=["basic_profile", "allergies", "medications", "medical_history", "vitals", "tests"],
        duration="visit",
        granted_at=now,
        expires_at=now + timedelta(hours=24),
    )
    db.add(consent)
    await db.commit()

    # Re-run checkin to return verified scoped context
    return await hospital_checkin_terminal(payload, db, current_user)


@router.post("/terminal/action")
async def terminal_record_action(
    payload: dict,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Record clinical encounter, test result, or pharmacy prescription from hospital check-in terminal:
    Updates patient's longitudinal journey and audit trail.
    """
    clean_id = payload.get("medi_connect_id", "").strip().upper()
    action_type = payload.get("action_type")  # "encounter", "test", "medication"
    facility_name = payload.get("facility_name", "Indore General Hospital")
    staff_role = payload.get("staff_role", "Doctor")

    res = await db.execute(select(Patient).where(Patient.medi_connect_id == clean_id))
    patient = res.scalar_one_or_none()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    if action_type == "encounter":
        enc = CareEncounter(
            patient_id=patient.id,
            chief_complaint=payload.get("chief_complaint", "Triage Consultation"),
            diagnosis=payload.get("diagnosis", "Evaluated by clinician"),
            treatment_notes=payload.get("treatment_notes", "Treatment plan established."),
            encounter_date=datetime.utcnow(),
        )
        db.add(enc)
        db.add(AccessAuditLog(
            patient_id=patient.id,
            facility_name=facility_name,
            staff_role=staff_role,
            action="Clinical Care Encounter Recorded",
            details=f"Diagnosis: {enc.diagnosis}. Notes: {enc.treatment_notes}",
            timestamp=datetime.utcnow(),
        ))

    elif action_type == "test":
        test = MedicalTestRecord(
            patient_id=patient.id,
            test_name=payload.get("test_name", "Diagnostic Panel"),
            category=payload.get("category", "Laboratory"),
            result_summary=payload.get("result_summary", "Completed. Results verified by pathologist."),
            test_date=datetime.utcnow(),
        )
        db.add(test)
        db.add(AccessAuditLog(
            patient_id=patient.id,
            facility_name=facility_name,
            staff_role="Lab Technician",
            action="Diagnostic Test Result Uploaded",
            details=f"Test: {test.test_name}. Summary: {test.result_summary}",
            timestamp=datetime.utcnow(),
        ))

    elif action_type == "medication":
        med = PatientMedication(
            patient_id=patient.id,
            medicine_name=payload.get("medicine_name", "Rx Medication"),
            dosage=payload.get("dosage", "Standard dose"),
            frequency=payload.get("frequency", "Once daily"),
            status="active",
            prescribed_at=datetime.utcnow(),
        )
        db.add(med)
        db.add(AccessAuditLog(
            patient_id=patient.id,
            facility_name=facility_name,
            staff_role="Pharmacist",
            action="Prescription Dispensed",
            details=f"Dispensed {med.medicine_name} ({med.dosage}) to patient.",
            timestamp=datetime.utcnow(),
        ))

    await db.commit()
    return {"status": "success", "message": f"{action_type.title()} successfully recorded to patient's DigiYatra longitudinal journey."}


# --- Doctor Consultation Queue & Clinical Encounters --------------------

@router.get("/doctor/queue")
async def get_doctor_consultation_queue(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Doctor-focused Consultation Queue:
    Retrieves incoming patients routed by hospital admin check-in, with scoped clinical
    records and real-time countdown of active consent durations.
    """
    doctor, facility = await _resolve_doctor_and_facility(db, current_user)
    facility_name = facility.name if facility else "Maharaja Yashwantrao Hospital (MYH Indore)"
    facility_id = facility.id if facility else None
    doctor_name = doctor.full_name if doctor else current_user.full_name
    doctor_specialty = doctor.specialty if doctor else "cardiology"
    doc_id = doctor.id if doctor else current_user.id

    now = datetime.utcnow()

    # Find patients with active consents or care encounters
    c_res = await db.execute(
        select(AccessConsent, Patient, User)
        .join(Patient, AccessConsent.patient_id == Patient.id)
        .join(User, Patient.user_id == User.id)
        .where(
            AccessConsent.status == "active",
            (AccessConsent.expires_at == None) | (AccessConsent.expires_at > now - timedelta(hours=24))
        )
        .order_by(AccessConsent.granted_at.desc())
    )
    consent_rows = c_res.all()

    seen_patient_ids = set()
    queue_list = []

    for c, patient, user in consent_rows:
        is_fac_match = (
            facility_name.lower() in c.facility_name.lower() or 
            c.facility_name.lower() in facility_name.lower() or
            doctor_specialty.lower() in (c.department or "").lower()
        )
        if not is_fac_match and len(queue_list) >= 2:
            continue
        if patient.id in seen_patient_ids:
            continue
        seen_patient_ids.add(patient.id)

        # Time per record calculation
        expires_at = c.expires_at
        time_rem_sec = 0
        time_rem_fmt = "Active (Visit)"
        is_expired = False
        if expires_at:
            delta = expires_at - now
            time_rem_sec = max(0, int(delta.total_seconds()))
            if time_rem_sec > 0:
                hrs = time_rem_sec // 3600
                mins = (time_rem_sec % 3600) // 60
                time_rem_fmt = f"{hrs}h {mins}m remaining"
            else:
                time_rem_fmt = "Expired"
                is_expired = True

        status_key = f"{doc_id}:{patient.id}"
        q_status = _DOCTOR_QUEUE_STATUS_STORE.get(status_key, "WAITING")

        age = 30
        if patient.date_of_birth:
            age = max(1, (now.date() - patient.date_of_birth.date()).days // 365)

        # Vitals
        v_res = await db.execute(
            select(WearableReading)
            .where(WearableReading.patient_id == patient.id)
            .order_by(WearableReading.recorded_at.desc())
            .limit(1)
        )
        latest_vit = v_res.scalar_one_or_none()
        vitals_dict = {
            "heart_rate": latest_vit.heart_rate if latest_vit and latest_vit.heart_rate else 74,
            "spo2": latest_vit.spo2 if latest_vit and latest_vit.spo2 else 98,
            "blood_pressure": f"{latest_vit.blood_pressure_sys or 124}/{latest_vit.blood_pressure_dia or 82}" if latest_vit else "124/82",
            "temperature": latest_vit.body_temp_c if latest_vit and latest_vit.body_temp_c else 37.0,
            "recorded_at": latest_vit.recorded_at.strftime("%H:%M:%S") if latest_vit and latest_vit.recorded_at else "Recent",
        }

        # Allergies
        allg_res = await db.execute(select(PatientAllergy).where(PatientAllergy.patient_id == patient.id))
        allergies = [
            {"allergen": a.allergen, "severity": a.severity, "reaction": a.reaction}
            for a in allg_res.scalars().all()
        ]

        # Medications
        med_res = await db.execute(select(PatientMedication).where(PatientMedication.patient_id == patient.id))
        medications = [
            {"name": m.medicine_name, "dosage": m.dosage, "frequency": m.frequency, "status": m.status}
            for m in med_res.scalars().all()
        ]

        # Medical History
        hist_res = await db.execute(select(MedicalHistoryRecord).where(MedicalHistoryRecord.patient_id == patient.id))
        medical_history = [
            {"condition": h.condition, "notes": h.notes}
            for h in hist_res.scalars().all()
        ]

        # Diagnostic Tests
        test_res = await db.execute(
            select(MedicalTestRecord)
            .where(MedicalTestRecord.patient_id == patient.id)
            .order_by(MedicalTestRecord.test_date.desc())
            .limit(6)
        )
        recent_tests = [
            {
                "test_name": t.test_name,
                "category": t.category,
                "summary": t.result_summary,
                "date": t.test_date.strftime("%Y-%m-%d"),
            }
            for t in test_res.scalars().all()
        ]

        # Chief complaint
        enc_res = await db.execute(
            select(CareEncounter)
            .where(CareEncounter.patient_id == patient.id)
            .order_by(CareEncounter.encounter_date.desc())
            .limit(1)
        )
        latest_enc = enc_res.scalar_one_or_none()
        chief_complaint = (
            latest_enc.chief_complaint 
            if latest_enc and latest_enc.chief_complaint 
            else "Cardiovascular check-up & palpitations review"
        )

        queue_list.append({
            "queue_token": f"TK-{str(len(queue_list) + 1).zfill(2)}",
            "queue_status": q_status,
            "patient_id": str(patient.id),
            "medi_connect_id": patient.medi_connect_id or _ensure_mc_id(patient),
            "full_name": user.full_name,
            "gender": patient.gender or "Unspecified",
            "age": age,
            "date_of_birth": patient.date_of_birth.strftime("%Y-%m-%d") if patient.date_of_birth else None,
            "blood_group": patient.blood_group or "B+",
            "checked_in_at": (c.granted_at or now).strftime("%I:%M %p"),
            "checked_in_by": "Hospital Intake Terminal (Admin)",
            "chief_complaint": chief_complaint,
            "triage_urgency": "Urgent" if "palpitations" in chief_complaint.lower() or "dyspnea" in chief_complaint.lower() else "Priority",
            "consent": {
                "consent_id": str(c.id),
                "duration": c.duration or "visit",
                "department": c.department or "Cardiology Department",
                "scopes": c.scopes or ["basic_profile", "allergies", "medications", "vitals", "tests"],
                "granted_at": c.granted_at.isoformat() if c.granted_at else now.isoformat(),
                "expires_at": expires_at.isoformat() if expires_at else None,
                "time_remaining_seconds": time_rem_sec,
                "time_remaining_formatted": time_rem_fmt,
                "is_expired": is_expired,
            },
            "vitals": vitals_dict,
            "allergies": allergies,
            "medications": medications,
            "medical_history": medical_history,
            "recent_tests": recent_tests,
        })

    # If no patients in queue, ensure at least primary demo patient is included
    if not queue_list:
        p_res = await db.execute(
            select(Patient, User)
            .join(User, Patient.user_id == User.id)
            .where(User.email.in_(["patient1@healthgrid.in", "patient15@healthgrid.in"]))
            .limit(1)
        )
        p_row = p_res.first()
        if not p_row:
            p_res = await db.execute(select(Patient, User).join(User, Patient.user_id == User.id).limit(1))
            p_row = p_res.first()
        if p_row:
            p, u = p_row
            new_c = AccessConsent(
                patient_id=p.id,
                facility_name=facility_name,
                department="Cardiology Department",
                requested_by_role="doctor",
                status="active",
                scopes=["basic_profile", "allergies", "medications", "medical_history", "vitals", "tests"],
                duration="visit",
                granted_at=now - timedelta(hours=2),
                expires_at=now + timedelta(hours=22),
            )
            db.add(new_c)
            await db.commit()
            return await get_doctor_consultation_queue(db, current_user)

    total = len(queue_list)
    waiting = sum(1 for q in queue_list if q["queue_status"] == "WAITING")
    in_consult = sum(1 for q in queue_list if q["queue_status"] == "IN_CONSULTATION")
    completed = sum(1 for q in queue_list if q["queue_status"] == "COMPLETED")

    return {
        "doctor": {
            "id": str(doc_id),
            "full_name": doctor_name,
            "specialty": doctor_specialty.replace("_", " ").title(),
            "facility_id": str(facility_id) if facility_id else None,
            "facility_name": facility_name,
            "department": "Cardiology & Clinical Care",
        },
        "summary": {
            "total_in_queue": total,
            "waiting": waiting,
            "in_consultation": in_consult,
            "completed_today": completed,
        },
        "queue": queue_list,
    }


@router.post("/doctor/queue/status")
async def update_doctor_queue_status(
    payload: dict,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    patient_id = payload.get("patient_id")
    new_status = payload.get("status", "IN_CONSULTATION").upper()
    if not patient_id:
        raise HTTPException(status_code=400, detail="patient_id is required")

    doctor, facility = await _resolve_doctor_and_facility(db, current_user)
    doc_id = doctor.id if doctor else current_user.id
    status_key = f"{doc_id}:{patient_id}"
    _DOCTOR_QUEUE_STATUS_STORE[status_key] = new_status

    # Audit log
    db.add(AccessAuditLog(
        patient_id=uuid.UUID(patient_id),
        facility_name=facility.name if facility else "Hospital Clinic",
        staff_role="Doctor",
        action=f"Queue Status Updated: {new_status}",
        details=f"Dr. {doctor.full_name if doctor else current_user.full_name} set consultation queue status to {new_status}.",
        timestamp=datetime.utcnow(),
    ))
    await db.commit()

    return {"status": "success", "patient_id": patient_id, "new_status": new_status}


@router.post("/doctor/encounter")
async def record_doctor_encounter(
    payload: dict,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    patient_id_str = payload.get("patient_id")
    if not patient_id_str:
        raise HTTPException(status_code=400, detail="patient_id is required")

    doctor, facility = await _resolve_doctor_and_facility(db, current_user)
    doc_id = doctor.id if doctor else None
    fac_id = facility.id if facility else None
    fac_name = facility.name if facility else "Maharaja Yashwantrao Hospital (MYH Indore)"
    doc_name = doctor.full_name if doctor else current_user.full_name

    patient_uuid = uuid.UUID(patient_id_str)
    chief_complaint = payload.get("chief_complaint", "Clinical Consultation")
    diagnosis = payload.get("diagnosis", "Evaluated by clinician")
    treatment_notes = payload.get("treatment_notes", "Treatment plan established.")
    display_doc = doc_name if doc_name.startswith("Dr.") else f"Dr. {doc_name}"

    # 1. Create CareEncounter
    enc = CareEncounter(
        patient_id=patient_uuid,
        facility_id=fac_id,
        doctor_id=doc_id,
        chief_complaint=chief_complaint,
        diagnosis=diagnosis,
        treatment_notes=treatment_notes,
        encounter_date=datetime.utcnow(),
    )
    db.add(enc)

    # 2. Add prescription if provided
    prescriptions = payload.get("prescriptions", [])
    for rx in prescriptions:
        if rx.get("medicine_name"):
            db.add(PatientMedication(
                patient_id=patient_uuid,
                medicine_name=rx["medicine_name"],
                dosage=rx.get("dosage", "As directed"),
                frequency=rx.get("frequency", "Once daily"),
                status="active",
                prescribed_at=datetime.utcnow(),
            ))

    # 3. Add lab order if provided
    lab_orders = payload.get("lab_orders", [])
    for order in lab_orders:
        if order.get("test_name"):
            db.add(MedicalTestRecord(
                patient_id=patient_uuid,
                test_name=order["test_name"],
                category=order.get("category", "Ordered by Clinician"),
                result_summary=f"Ordered by {display_doc}. Specimen collection scheduled.",
                test_date=datetime.utcnow(),
            ))

    # 4. Mark status completed
    status_key = f"{doc_id if doc_id else current_user.id}:{patient_id_str}"
    _DOCTOR_QUEUE_STATUS_STORE[status_key] = "COMPLETED"

    # 5. Audit log
    db.add(AccessAuditLog(
        patient_id=patient_uuid,
        facility_name=fac_name,
        staff_role="Doctor",
        action="Clinical Consultation Completed & Scoped Records Updated",
        details=f"{display_doc} completed consultation. Diagnosis: {diagnosis}. Added {len(prescriptions)} Rx medications and {len(lab_orders)} diagnostic orders.",
        timestamp=datetime.utcnow(),
    ))

    await db.commit()

    return {
        "status": "success",
        "message": f"Consultation successfully logged by {display_doc}. Patient marked as completed in queue.",
        "encounter_id": str(enc.id),
    }


