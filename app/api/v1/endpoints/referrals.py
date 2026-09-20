import uuid
from typing import Optional
from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models import Patient, Recommendation, Referral, User, Facility, Doctor, CareEncounter
from app.schemas.referral import ReferralCreate, ReferralOut, FacilitySummary, DoctorSummary
from app.services import facility_matcher, firebase_service

router = APIRouter()


class ReferralStatusUpdate(BaseModel):
    status: str
    notes: Optional[str] = None


class DirectReferralCreate(BaseModel):
    recommendation_id: Optional[uuid.UUID] = None
    facility_id: Optional[uuid.UUID] = None
    doctor_id: Optional[uuid.UUID] = None
    patient_id: Optional[uuid.UUID] = None
    from_facility_id: Optional[uuid.UUID] = None
    to_facility_id: Optional[uuid.UUID] = None
    priority: Optional[str] = "EMERGENCY"
    reason: Optional[str] = "Clinical escalation & specialist transfer"
    navigation_notes: Optional[str] = "Referral dispatched"


async def _get_patient_or_404(db: AsyncSession, current_user: User) -> Patient:
    result = await db.execute(select(Patient).where(Patient.user_id == current_user.id))
    patient = result.scalar_one_or_none()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient profile not found. Create one first.")
    return patient


def _build_referral_out(referral: Referral, match: facility_matcher.FacilityMatch) -> ReferralOut:
    return ReferralOut(
        id=referral.id,
        recommendation_id=referral.recommendation_id,
        facility_id=referral.facility_id,
        doctor_id=referral.doctor_id,
        patient_id=referral.patient_id,
        from_facility_id=referral.from_facility_id,
        to_facility_id=referral.to_facility_id or referral.facility_id,
        status=referral.status or "PENDING",
        priority=referral.priority or "EMERGENCY",
        reason=referral.reason or referral.navigation_notes,
        notes=referral.notes,
        navigation_notes=referral.navigation_notes,
        emergency_alert_sent=referral.emergency_alert_sent,
        created_at=referral.created_at,
        facility=FacilitySummary.model_validate(match.facility),
        doctor=DoctorSummary.model_validate(match.doctor) if match.doctor else None,
        distance_km=None if match.distance_km < 0 else round(match.distance_km, 2),
    )


@router.get("/", response_model=list[ReferralOut])
async def list_referrals(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Referral).order_by(Referral.created_at.desc()))
    referrals = result.scalars().all()
    out = []
    for r in referrals:
        fac_res = await db.execute(select(Facility).where(Facility.id == r.facility_id))
        fac = fac_res.scalar_one_or_none()
        doc = None
        if r.doctor_id:
            doc_res = await db.execute(select(Doctor).where(Doctor.id == r.doctor_id))
            doc = doc_res.scalar_one_or_none()

        # Parse status if not explicitly set
        st = r.status or "PENDING"
        if (not r.status or r.status == "PENDING") and r.navigation_notes and "[STATUS: " in r.navigation_notes:
            try:
                st = r.navigation_notes.split("[STATUS: ")[-1].split("]")[0].strip()
            except Exception:
                pass

        # Backfill patient_id from recommendation if needed
        pid = r.patient_id
        if not pid and r.recommendation_id:
            rec_res = await db.execute(select(Recommendation.patient_id).where(Recommendation.id == r.recommendation_id))
            pid = rec_res.scalar_one_or_none()

        out.append(
            ReferralOut(
                id=r.id,
                recommendation_id=r.recommendation_id,
                facility_id=r.facility_id,
                doctor_id=r.doctor_id,
                patient_id=pid,
                from_facility_id=r.from_facility_id or (fac.id if fac else None),
                to_facility_id=r.to_facility_id or r.facility_id,
                status=st,
                priority=r.priority or "EMERGENCY",
                reason=r.reason or (r.navigation_notes if r.navigation_notes and not r.navigation_notes.startswith("[STATUS:") else "Clinical escalation & specialist transfer"),
                notes=r.notes,
                navigation_notes=r.navigation_notes,
                emergency_alert_sent=r.emergency_alert_sent,
                created_at=r.created_at,
                facility=FacilitySummary.model_validate(fac) if fac else None,
                doctor=DoctorSummary.model_validate(doc) if doc else None,
                distance_km=None,
            )
        )
    return out


@router.post("/", response_model=ReferralOut, status_code=201)
async def create_referral_direct(
    payload: DirectReferralCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    facility_id = payload.to_facility_id or payload.facility_id
    if not facility_id:
        fac_res = await db.execute(select(Facility).limit(1))
        fac = fac_res.scalar_one_or_none()
        if not fac:
            raise HTTPException(status_code=400, detail="No facility available to assign referral.")
        facility_id = fac.id
    else:
        fac_res = await db.execute(select(Facility).where(Facility.id == facility_id))
        fac = fac_res.scalar_one_or_none()

    referral = Referral(
        recommendation_id=payload.recommendation_id,
        facility_id=facility_id,
        doctor_id=payload.doctor_id,
        patient_id=payload.patient_id,
        from_facility_id=payload.from_facility_id,
        to_facility_id=facility_id,
        status="PENDING",
        priority=payload.priority or "EMERGENCY",
        reason=payload.reason or "Clinical escalation & specialist transfer",
        notes=payload.navigation_notes,
        navigation_notes=payload.navigation_notes or "Patient referral initiated.",
        emergency_alert_sent=True,
    )
    db.add(referral)
    await db.commit()
    await db.refresh(referral)

    doc = None
    if payload.doctor_id:
        doc_res = await db.execute(select(Doctor).where(Doctor.id == payload.doctor_id))
        doc = doc_res.scalar_one_or_none()

    # Trigger Firebase Notification
    await firebase_service.send_emergency_fcm_alert(
        device_token="FACILITY_ADMIN_DEVICE_TOKEN",
        title=f"New Patient Referral: {fac.name if fac else 'Facility'}",
        body=f"Referral #{referral.id} assigned to facility.",
        extra_data={"referral_id": str(referral.id)}
    )

    return ReferralOut(
        id=referral.id,
        recommendation_id=referral.recommendation_id,
        facility_id=referral.facility_id,
        doctor_id=referral.doctor_id,
        patient_id=referral.patient_id,
        from_facility_id=referral.from_facility_id,
        to_facility_id=referral.to_facility_id,
        status="PENDING",
        priority=referral.priority or "EMERGENCY",
        reason=referral.reason,
        notes=referral.notes,
        navigation_notes=referral.navigation_notes,
        emergency_alert_sent=referral.emergency_alert_sent,
        created_at=referral.created_at,
        facility=FacilitySummary.model_validate(fac) if fac else None,
        doctor=DoctorSummary.model_validate(doc) if doc else None,
        distance_km=None,
    )


@router.patch("/{id}/status", response_model=ReferralOut)
async def update_referral_status(
    id: uuid.UUID,
    payload: ReferralStatusUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Updates status of referral (e.g. COMPLETED, ACCEPTED, IN_TRANSIT, REJECTED).
    When completed, automatically logs a CareEncounter into patient's medical history.
    """
    result = await db.execute(select(Referral).where(Referral.id == id))
    referral = result.scalar_one_or_none()
    if not referral:
        raise HTTPException(status_code=404, detail="Referral not found")

    clean_status = payload.status.strip().upper()
    referral.status = clean_status
    referral.notes = payload.notes or referral.notes
    referral.navigation_notes = f"[STATUS: {clean_status}] {payload.notes or referral.navigation_notes or ''}"

    # Audit Requirement #15: Auto-create CareEncounter on treatment completion
    if clean_status == "COMPLETED":
        pat_id = referral.patient_id
        specialty = "Specialty Consultation"
        if referral.recommendation_id:
            rec_res = await db.execute(select(Recommendation).where(Recommendation.id == referral.recommendation_id))
            rec = rec_res.scalar_one_or_none()
            if rec:
                rec.status = "completed"
                pat_id = rec.patient_id
                specialty = rec.recommended_specialty or specialty

        if pat_id:
            encounter = CareEncounter(
                patient_id=pat_id,
                facility_id=referral.facility_id,
                doctor_id=referral.doctor_id,
                chief_complaint=f"Referral #{str(referral.id)[:8]} Completed Care",
                diagnosis=f"Specialty Treated: {specialty}",
                treatment_notes=payload.notes or "Treatment completed at facility. Patient discharged with follow-up instructions.",
            )
            db.add(encounter)

    await db.commit()
    await db.refresh(referral)

    fac_res = await db.execute(select(Facility).where(Facility.id == referral.facility_id))
    fac = fac_res.scalar_one_or_none()
    doc = None
    if referral.doctor_id:
        doc_res = await db.execute(select(Doctor).where(Doctor.id == referral.doctor_id))
        doc = doc_res.scalar_one_or_none()

    return ReferralOut(
        id=referral.id,
        recommendation_id=referral.recommendation_id,
        facility_id=referral.facility_id,
        doctor_id=referral.doctor_id,
        patient_id=referral.patient_id,
        from_facility_id=referral.from_facility_id,
        to_facility_id=referral.to_facility_id or referral.facility_id,
        status=referral.status,
        priority=referral.priority or "EMERGENCY",
        reason=referral.reason,
        notes=referral.notes,
        navigation_notes=referral.navigation_notes,
        emergency_alert_sent=referral.emergency_alert_sent,
        created_at=referral.created_at,
        facility=FacilitySummary.model_validate(fac) if fac else None,
        doctor=DoctorSummary.model_validate(doc) if doc else None,
        distance_km=None,
    )


@router.post("/match", response_model=ReferralOut, status_code=201)
async def match_and_create_referral(
    payload: ReferralCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    patient = await _get_patient_or_404(db, current_user)

    result = await db.execute(
        select(Recommendation).where(
            Recommendation.id == payload.recommendation_id,
            Recommendation.patient_id == patient.id,
        )
    )
    recommendation = result.scalar_one_or_none()
    if recommendation is None:
        raise HTTPException(status_code=404, detail="Recommendation not found for this patient.")

    match = await facility_matcher.find_best_facility(
        db,
        patient_lat=patient.location_lat,
        patient_lng=patient.location_lng,
        specialty=recommendation.recommended_specialty,
    )
    if match is None:
        raise HTTPException(
            status_code=404,
            detail=f"No facility currently available for specialty '{recommendation.recommended_specialty}'.",
        )

    is_emergency = recommendation.recommended_specialty == "emergency_medicine"
    notes = (
        f"Routed to {match.facility.name}"
        + (f", {round(match.distance_km, 2)} km away" if match.distance_km >= 0 else " (patient location unknown)")
        + (f". See {match.doctor.full_name} ({match.doctor.specialty})." if match.doctor else ".")
    )

    referral = Referral(
        recommendation_id=recommendation.id,
        facility_id=match.facility.id,
        doctor_id=match.doctor.id if match.doctor else None,
        navigation_notes=notes,
        emergency_alert_sent=is_emergency,
    )
    db.add(referral)
    await db.commit()
    await db.refresh(referral)

    if is_emergency:
        await firebase_service.send_emergency_fcm_alert(
            device_token="EMERGENCY_DISPATCH_TOKEN",
            title=f"🚨 EMERGENCY REFERRAL: {match.facility.name}",
            body=notes,
            extra_data={"referral_id": str(referral.id)}
        )

    return _build_referral_out(referral, match)


@router.get("/history", response_model=list[ReferralOut])
async def referral_history(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    patient = await _get_patient_or_404(db, current_user)
    result = await db.execute(
        select(Referral)
        .join(Recommendation, Referral.recommendation_id == Recommendation.id)
        .where(Recommendation.patient_id == patient.id)
        .order_by(Referral.created_at.desc())
    )
    referrals = result.scalars().all()

    out = []
    for referral in referrals:
        fac_result = await db.execute(select(Facility).where(Facility.id == referral.facility_id))
        facility = fac_result.scalar_one()
        doctor = None
        if referral.doctor_id:
            doc_result = await db.execute(select(Doctor).where(Doctor.id == referral.doctor_id))
            doctor = doc_result.scalar_one_or_none()
        out.append(
            ReferralOut(
                id=referral.id,
                recommendation_id=referral.recommendation_id,
                facility_id=referral.facility_id,
                doctor_id=referral.doctor_id,
                navigation_notes=referral.navigation_notes,
                emergency_alert_sent=referral.emergency_alert_sent,
                created_at=referral.created_at,
                facility=FacilitySummary.model_validate(facility),
                doctor=DoctorSummary.model_validate(doctor) if doctor else None,
                distance_km=None,
            )
        )
    return out

