import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict

from app.models.enums import UrgencyLevel


class RiskAssessmentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True, protected_namespaces=())

    id: uuid.UUID
    patient_id: uuid.UUID
    symptom_report_id: Optional[uuid.UUID]
    risk_score: float
    urgency: UrgencyLevel
    reasoning: Optional[str]
    model_used: str
    created_at: datetime


class VitalsInput(BaseModel):
    blood_pressure_sys: Optional[float] = None
    blood_pressure_dia: Optional[float] = None
    body_temp_c: Optional[float] = None
    systolic_bp: Optional[float] = None
    diastolic_bp: Optional[float] = None
    temperature: Optional[float] = None
    heart_rate: float = 75.0
    spo2: float = 98.0
    respiratory_rate: Optional[float] = 18.0
    gcs: Optional[int] = 15

    def get_sys_bp(self) -> float:
        if self.blood_pressure_sys is not None:
            return self.blood_pressure_sys
        if self.systolic_bp is not None:
            return self.systolic_bp
        return 120.0

    def get_dia_bp(self) -> float:
        if self.blood_pressure_dia is not None:
            return self.blood_pressure_dia
        if self.diastolic_bp is not None:
            return self.diastolic_bp
        return 80.0

    def get_temp(self) -> float:
        if self.body_temp_c is not None:
            return self.body_temp_c
        if self.temperature is not None:
            return self.temperature
        return 37.0


class RiskAssessmentResponse(BaseModel):
    model_config = ConfigDict(protected_namespaces=())

    risk_score: float
    risk_level: str
    urgency: str
    news_score: float
    reasoning: str
    recommended_actions: list[str] = []
    model_used: str = "rules_and_ai"


