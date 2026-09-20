import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class PatientProfileCreate(BaseModel):
    date_of_birth: Optional[datetime] = None
    gender: Optional[str] = None
    blood_group: Optional[str] = None
    wearable_device_id: Optional[str] = None
    location_lat: Optional[float] = None
    location_lng: Optional[float] = None


class PatientProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    date_of_birth: Optional[datetime] = None
    gender: Optional[str] = None
    blood_group: Optional[str] = None
    wearable_device_id: Optional[str] = None
    location_lat: Optional[float] = None
    location_lng: Optional[float] = None


class StaffPatientRegister(BaseModel):
    """
    Used by staff/doctors/admins to onboard a brand-new patient (as opposed
    to a patient self-registering via /auth/register + /patients/me).
    Creates a new User account for the patient plus their profile, so the
    resulting record is never confused with the staff member's own account.
    """
    full_name: str
    email: Optional[str] = None  # auto-generated if not supplied
    date_of_birth: Optional[datetime] = None
    gender: Optional[str] = None
    blood_group: Optional[str] = None
    location_lat: Optional[float] = None
    location_lng: Optional[float] = None
    medical_history: Optional[list[str]] = None
    chronic_conditions: Optional[list[str]] = None


class StaffPatientRegisterOut(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    full_name: str
    email: str
    date_of_birth: Optional[datetime] = None
    gender: Optional[str] = None
    blood_group: Optional[str] = None
    location_lat: Optional[float] = None
    location_lng: Optional[float] = None

    class Config:
        from_attributes = True


class PatientProfileOut(PatientProfileCreate):
    id: uuid.UUID
    user_id: uuid.UUID
    full_name: Optional[str] = None
    email: Optional[str] = None
    medi_connect_id: Optional[str] = None
    active_consent_duration: Optional[str] = None
    consent_time_remaining: Optional[str] = None
    consent_expires_at: Optional[datetime] = None
    assigned_doctor_name: Optional[str] = None
    chief_complaint: Optional[str] = None

    class Config:
        from_attributes = True


class SymptomReportCreate(BaseModel):
    symptoms: dict = Field(..., description='e.g. {"fever": true, "chest_pain": true, "severity": 7}')
    free_text: Optional[str] = None


class SymptomReportOut(SymptomReportCreate):
    id: uuid.UUID
    patient_id: uuid.UUID
    reported_at: datetime

    class Config:
        from_attributes = True


class WearableReadingCreate(BaseModel):
    heart_rate: Optional[int] = None
    spo2: Optional[int] = None
    blood_pressure_sys: Optional[int] = None
    blood_pressure_dia: Optional[int] = None
    body_temp_c: Optional[float] = None


class WearableReadingOut(WearableReadingCreate):
    id: uuid.UUID
    patient_id: uuid.UUID
    recorded_at: datetime

    class Config:
        from_attributes = True


class MedicalHistoryRecordCreate(BaseModel):
    condition: str
    notes: Optional[str] = None
    diagnosed_at: Optional[datetime] = None


class MedicalHistoryRecordOut(MedicalHistoryRecordCreate):
    id: uuid.UUID
    patient_id: uuid.UUID

    class Config:
        from_attributes = True


class PatientMedicationCreate(BaseModel):
    medicine_name: str
    dosage: Optional[str] = None
    frequency: Optional[str] = None
    status: Optional[str] = "active"
    prescribed_at: Optional[datetime] = None

    # Compatibility aliases
    name: Optional[str] = None
    is_active: Optional[bool] = None

    def model_dump(self, *args, **kwargs):
        data = super().model_dump(*args, **kwargs)
        if data.get("name") and not data.get("medicine_name"):
            data["medicine_name"] = data["name"]
        data.pop("name", None)
        if data.get("is_active") is not None:
            data["status"] = "active" if data["is_active"] else "inactive"
        data.pop("is_active", None)
        return data


class PatientMedicationOut(BaseModel):
    id: uuid.UUID
    patient_id: uuid.UUID
    medicine_name: str
    dosage: Optional[str] = None
    frequency: Optional[str] = None
    status: Optional[str] = "active"
    prescribed_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class PatientAllergyCreate(BaseModel):
    allergen: str
    severity: Optional[str] = "moderate"
    reaction: Optional[str] = None
    reaction_notes: Optional[str] = None

    def model_dump(self, *args, **kwargs):
        data = super().model_dump(*args, **kwargs)
        if data.get("reaction_notes") and not data.get("reaction"):
            data["reaction"] = data["reaction_notes"]
        data.pop("reaction_notes", None)
        return data


class PatientAllergyOut(BaseModel):
    id: uuid.UUID
    patient_id: uuid.UUID
    allergen: str
    severity: Optional[str] = "moderate"
    reaction: Optional[str] = None

    class Config:
        from_attributes = True


class MedicalTestRecordCreate(BaseModel):
    test_name: str
    category: Optional[str] = None
    result_summary: Optional[str] = None
    test_date: Optional[datetime] = None
    conducted_at: Optional[datetime] = None

    def model_dump(self, *args, **kwargs):
        data = super().model_dump(*args, **kwargs)
        if data.get("conducted_at") and not data.get("test_date"):
            data["test_date"] = data["conducted_at"]
        data.pop("conducted_at", None)
        return data


class MedicalTestRecordOut(BaseModel):
    id: uuid.UUID
    patient_id: uuid.UUID
    test_name: str
    category: Optional[str] = None
    result_summary: Optional[str] = None
    test_date: Optional[datetime] = None

    class Config:
        from_attributes = True


class CareEncounterCreate(BaseModel):
    facility_id: Optional[uuid.UUID] = None
    doctor_id: Optional[uuid.UUID] = None
    chief_complaint: Optional[str] = None
    diagnosis: Optional[str] = None
    treatment_notes: Optional[str] = None
    encounter_date: Optional[datetime] = None


class CareEncounterOut(CareEncounterCreate):
    id: uuid.UUID
    patient_id: uuid.UUID
    encounter_date: datetime

    class Config:
        from_attributes = True


class FollowUpCreate(BaseModel):
    patient_id: Optional[uuid.UUID] = None
    referral_id: Optional[uuid.UUID] = None
    scheduled_at: datetime
    notes: Optional[str] = None
    completed: bool = False


class FollowUpOut(FollowUpCreate):
    id: uuid.UUID
    created_at: datetime

    class Config:
        from_attributes = True


# --- DigiYatra Healthcare Identity & Consent Schemas ------------------

class DigitalPassportOut(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    full_name: str
    email: str
    medi_connect_id: str
    qr_payload: str
    date_of_birth: Optional[datetime] = None
    gender: Optional[str] = None
    blood_group: Optional[str] = None
    wearable_device_id: Optional[str] = None
    connected_facilities_count: int = 0
    medical_records_count: int = 0
    active_referrals_count: int = 0
    current_care: Optional[dict] = None  # { "has_active_referral": bool, "facility_name": str, ... }

    class Config:
        from_attributes = True


class AccessConsentCreate(BaseModel):
    facility_name: str
    department: Optional[str] = "General Medicine"
    requested_by_role: Optional[str] = "doctor"
    scopes: list[str] = ["basic_profile", "allergies", "medications", "medical_history", "vitals", "tests"]
    duration: str = "visit"  # visit, 24h, 7d


class AccessConsentOut(BaseModel):
    id: uuid.UUID
    patient_id: uuid.UUID
    facility_id: Optional[uuid.UUID] = None
    facility_name: str
    department: Optional[str] = None
    requested_by_role: str
    status: str
    scopes: list[str]
    duration: str
    granted_at: datetime
    expires_at: Optional[datetime] = None
    revoked_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class AccessAuditLogOut(BaseModel):
    id: uuid.UUID
    patient_id: uuid.UUID
    facility_name: str
    staff_role: str
    action: str
    details: Optional[str] = None
    timestamp: datetime

    class Config:
        from_attributes = True


class HospitalCheckinRequest(BaseModel):
    medi_connect_id: str
    facility_name: str = "Indore City General Hospital"
    staff_role: str = "Doctor"


class HospitalCheckinOut(BaseModel):
    verified: bool
    patient_id: Optional[uuid.UUID] = None
    medi_connect_id: str
    full_name: Optional[str] = None
    consent_status: str  # "active", "pending", "revoked"
    consent_id: Optional[uuid.UUID] = None
    granted_scopes: list[str] = []
    duration: Optional[str] = None
    # Scoped context payloads (only populated if granted)
    basic_profile: Optional[dict] = None
    allergies: Optional[list[dict]] = None
    medications: Optional[list[dict]] = None
    medical_history: Optional[list[dict]] = None
    vitals: Optional[dict] = None
    tests: Optional[list[dict]] = None
    message: str


class PatientJourneyEventOut(BaseModel):
    id: str
    date: datetime
    category: str  # "symptoms", "risk_assessment", "referral", "checkin", "encounter", "test", "medication", "followup"
    title: str
    facility_or_provider: Optional[str] = None
    summary: str
    severity_or_status: Optional[str] = None
    details: Optional[dict] = None


