import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict

from app.models.enums import RecommendationStatus


class RecommendationCreate(BaseModel):
    risk_assessment_id: uuid.UUID


class RecommendationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True, protected_namespaces=())

    id: uuid.UUID
    patient_id: uuid.UUID
    risk_assessment_id: uuid.UUID
    recommended_specialty: Optional[str]
    recommended_service: Optional[str]
    status: RecommendationStatus
    created_at: datetime


class DiseasePredictionRequest(BaseModel):
    symptoms: list[str]
    vitals: Optional[dict] = None
    chief_complaint: Optional[str] = None
    top_k: int = 5


class DiseasePredictionItem(BaseModel):
    disease_name: str
    confidence_pct: float
    matched_symptoms: list[str]
    recommended_specialty: str
    urgency: str
    required_bed_type: str
    recommended_diagnostics: list[str]
    required_equipment: list[str]


class DiseasePredictionResponse(BaseModel):
    total_predictions: int
    analyzed_symptoms: list[str]
    top_recommended_specialty: str
    predictions: list[DiseasePredictionItem]


class SymptomsCatalogResponse(BaseModel):
    total_symptoms: int
    symptoms: list[str]

