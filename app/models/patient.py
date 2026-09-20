import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import String, DateTime, ForeignKey, JSON, Text, Uuid as UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship


from app.core.database import Base
from app.models.enums import UserRole


class User(Base):
    """Auth identity — a Patient or Doctor logs in as a User."""
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[UserRole] = mapped_column(String(20), default=UserRole.PATIENT)
    full_name: Mapped[str] = mapped_column(String(255))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    patient_profile: Mapped["Patient"] = relationship(back_populates="user", uselist=False)


class Patient(Base):
    """1. Patient Data — core patient record."""
    __tablename__ = "patients"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), unique=True)
    date_of_birth: Mapped[datetime] = mapped_column(DateTime, nullable=True)
    gender: Mapped[str] = mapped_column(String(20), nullable=True)
    blood_group: Mapped[str] = mapped_column(String(10), nullable=True)
    wearable_device_id: Mapped[str] = mapped_column(String(100), nullable=True)
    location_lat: Mapped[float] = mapped_column(nullable=True)
    location_lng: Mapped[float] = mapped_column(nullable=True)
    medi_connect_id: Mapped[Optional[str]] = mapped_column(String(32), unique=True, index=True, nullable=True)

    user: Mapped["User"] = relationship(back_populates="patient_profile")
    symptoms: Mapped[list["SymptomReport"]] = relationship(back_populates="patient")
    vitals: Mapped[list["WearableReading"]] = relationship(back_populates="patient")
    history: Mapped[list["MedicalHistoryRecord"]] = relationship(back_populates="patient")
    consents: Mapped[list["AccessConsent"]] = relationship(back_populates="patient")
    audit_logs: Mapped[list["AccessAuditLog"]] = relationship(back_populates="patient")


class SymptomReport(Base):
    """Collected Inputs -> Symptoms reported."""
    __tablename__ = "symptom_reports"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    patient_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("patients.id"))
    symptoms: Mapped[dict] = mapped_column(JSON)  # e.g. {"fever": true, "chest_pain": true, "severity": 7}
    free_text: Mapped[str] = mapped_column(Text, nullable=True)
    reported_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    patient: Mapped["Patient"] = relationship(back_populates="symptoms")


class WearableReading(Base):
    """Collected Inputs -> Vital signs from wearable."""
    __tablename__ = "wearable_readings"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    patient_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("patients.id"))
    heart_rate: Mapped[int] = mapped_column(nullable=True)
    spo2: Mapped[int] = mapped_column(nullable=True)
    blood_pressure_sys: Mapped[int] = mapped_column(nullable=True)
    blood_pressure_dia: Mapped[int] = mapped_column(nullable=True)
    body_temp_c: Mapped[float] = mapped_column(nullable=True)
    recorded_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    patient: Mapped["Patient"] = relationship(back_populates="vitals")


class MedicalHistoryRecord(Base):
    """Collected Inputs -> Medical history records."""
    __tablename__ = "medical_history_records"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    patient_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("patients.id"))
    condition: Mapped[str] = mapped_column(String(255))
    notes: Mapped[str] = mapped_column(Text, nullable=True)
    diagnosed_at: Mapped[datetime] = mapped_column(DateTime, nullable=True)

    patient: Mapped["Patient"] = relationship(back_populates="history")


class PatientMedication(Base):
    """Patient Active/Past Medications."""
    __tablename__ = "patient_medications"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    patient_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("patients.id"))
    medicine_name: Mapped[str] = mapped_column(String(255), nullable=False)
    dosage: Mapped[str] = mapped_column(String(100), nullable=True)
    frequency: Mapped[str] = mapped_column(String(100), nullable=True)
    status: Mapped[str] = mapped_column(String(50), default="active")
    prescribed_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class PatientAllergy(Base):
    """Patient Allergies & Reactions."""
    __tablename__ = "patient_allergies"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    patient_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("patients.id"))
    allergen: Mapped[str] = mapped_column(String(255), nullable=False)
    severity: Mapped[str] = mapped_column(String(50), default="moderate")
    reaction: Mapped[str] = mapped_column(Text, nullable=True)


class MedicalTestRecord(Base):
    """Diagnostic Test Results & Lab Reports."""
    __tablename__ = "medical_test_records"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    patient_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("patients.id"))
    test_name: Mapped[str] = mapped_column(String(255), nullable=False)
    category: Mapped[str] = mapped_column(String(100), nullable=True)
    result_summary: Mapped[str] = mapped_column(Text, nullable=True)
    test_date: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class CareEncounter(Base):
    """5. Care & Follow-up -> Clinical Encounter & Treatment Record."""
    __tablename__ = "care_encounters"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    patient_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("patients.id"))
    facility_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("facilities.id"), nullable=True)
    doctor_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("doctors.id"), nullable=True)
    chief_complaint: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    diagnosis: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    treatment_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    encounter_date: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class AccessConsent(Base):
    """DigiYatra Patient Consent: Scoped & time-bound access grant."""
    __tablename__ = "access_consents"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    patient_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("patients.id"))
    facility_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("facilities.id"), nullable=True)
    facility_name: Mapped[str] = mapped_column(String(255))
    department: Mapped[Optional[str]] = mapped_column(String(100), default="General Medicine")
    requested_by_role: Mapped[str] = mapped_column(String(50), default="doctor")
    status: Mapped[str] = mapped_column(String(20), default="active")  # active, revoked, expired
    scopes: Mapped[list] = mapped_column(JSON, default=list)  # ["basic_profile", "allergies", "medications", "medical_history", "vitals", "tests"]
    duration: Mapped[str] = mapped_column(String(50), default="visit")  # visit, 24h, 7d
    granted_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    expires_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    revoked_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    patient: Mapped["Patient"] = relationship(back_populates="consents")


class AccessAuditLog(Base):
    """DigiYatra Zero-Trust Audit Log: Who accessed what, when, and where."""
    __tablename__ = "access_audit_logs"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    patient_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("patients.id"))
    facility_name: Mapped[str] = mapped_column(String(255))
    staff_role: Mapped[str] = mapped_column(String(50))  # Doctor, Nurse, Lab Staff, Pharmacist, Reception
    action: Mapped[str] = mapped_column(String(100))  # "Identity Verified", "Reviewed Allergies & Vitals", etc.
    details: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    timestamp: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    patient: Mapped["Patient"] = relationship(back_populates="audit_logs")


