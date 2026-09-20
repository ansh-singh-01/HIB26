import uuid
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, ConfigDict
from app.models.enums import FacilityType


class FacilityCreate(BaseModel):
    name: str
    type: FacilityType = FacilityType.HOSPITAL
    location_lat: float = 22.7196
    location_lng: float = 75.8577
    address: Optional[str] = "Indore Health Grid"
    phone: Optional[str] = "0731-2000001"
    total_general_beds: Optional[int] = 50
    available_general_beds: Optional[int] = 20
    total_icu_beds: Optional[int] = 10
    available_icu_beds: Optional[int] = 4
    ventilator_count: Optional[int] = 5
    specialties: Optional[List[str]] = ["emergency_medicine", "cardiology"]


class FacilityOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    name: str
    type: str
    location_lat: float
    location_lng: float
    address: Optional[str] = None
    phone: Optional[str] = None
    total_general_beds: Optional[int] = 50
    available_general_beds: Optional[int] = 20
    total_icu_beds: Optional[int] = 10
    available_icu_beds: Optional[int] = 4
    ventilator_count: Optional[int] = 5
    specialties: Optional[List[str]] = ["emergency_medicine"]


class FacilityCapacityUpdate(BaseModel):
    total_general_beds: Optional[int] = None
    available_general_beds: Optional[int] = None
    total_icu_beds: Optional[int] = None
    available_icu_beds: Optional[int] = None
    ventilator_count: Optional[int] = None


class BedUpdate(BaseModel):
    available_count: int


class BedOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    facility_id: uuid.UUID
    ward_type: str
    total_count: int
    available_count: int


class InventoryItemCreate(BaseModel):
    name: str
    category: str = "medicine" # "medicine" or "equipment"
    quantity: int
    available_count: Optional[int] = None


class InventoryItemOut(BaseModel):
    id: uuid.UUID
    facility_id: uuid.UUID
    name: str
    category: str
    total_quantity: int
    available_quantity: int
