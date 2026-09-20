import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict


class ReferralCreate(BaseModel):
    recommendation_id: uuid.UUID


class FacilitySummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    name: str
    type: str
    address: Optional[str]
    phone: Optional[str]
    location_lat: float
    location_lng: float


class DoctorSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    full_name: str
    specialty: str


class ReferralOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    recommendation_id: Optional[uuid.UUID] = None
    facility_id: uuid.UUID
    doctor_id: Optional[uuid.UUID] = None
    patient_id: Optional[uuid.UUID] = None
    from_facility_id: Optional[uuid.UUID] = None
    to_facility_id: Optional[uuid.UUID] = None
    status: str = "PENDING"
    priority: str = "EMERGENCY"
    reason: Optional[str] = None
    notes: Optional[str] = None
    navigation_notes: Optional[str] = None
    emergency_alert_sent: bool = False
    created_at: datetime

    facility: Optional[FacilitySummary] = None
    doctor: Optional[DoctorSummary] = None
    distance_km: Optional[float] = None
