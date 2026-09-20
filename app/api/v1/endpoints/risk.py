from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models import Patient, RiskAssessment, User
from app.schemas.risk import RiskAssessmentOut
from app.services import risk_engine

router = APIRouter()


async def _get_patient_or_404(db: AsyncSession, current_user: User) -> Patient:
    result = await db.execute(select(Patient).where(Patient.user_id == current_user.id))
    patient = result.scalar_one_or_none()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient profile not found. Create one first.")
    return patient


from typing import Optional, List
from pydantic import BaseModel
from app.services import rules_engine, gemini_client
from app.models import SymptomReport, WearableReading


class DirectRiskAssessmentInput(BaseModel):
    vitals: Optional[dict] = None
    symptoms: Optional[List[str]] = None
    chief_complaint: Optional[str] = None
    medical_history: Optional[List[str]] = None
    patient_id: Optional[str] = None
    location_lat: Optional[float] = None
    location_lng: Optional[float] = None


@router.post("/assess", status_code=201)
async def assess_risk(
    payload: Optional[DirectRiskAssessmentInput] = None,
    db: AsyncSession = Depends(get_db),
):
    """
    2. AI Analysis -> Risk Assessment.
    Supports either pre-logged patient symptoms/vitals or direct payload.
    Rule engine runs first for obvious emergencies; otherwise falls through to Gemini.
    """
    if payload and (payload.symptoms or payload.vitals):
        symptoms_dict = {s: True for s in (payload.symptoms or [])}
        vitals = payload.vitals or {}

        rule_res = rules_engine.run_emergency_rules(symptoms_dict, vitals)
        if rule_res:
            risk_score = rule_res["risk_score"]
            urgency = rule_res["urgency"]
            reasoning = rule_res["reasoning"]
            model_used = "rule_engine"
            actions = rule_res.get("recommended_actions", [])
        else:
            ai_res = gemini_client.analyze(symptoms_dict, payload.chief_complaint or "Triage", vitals)
            risk_score = ai_res.get("risk_score", 5)
            urgency = ai_res.get("urgency", "MEDIUM")
            reasoning = ai_res.get("reasoning", "Clinical parameters evaluated.")
            model_used = "gemini" if risk_engine._has_gemini_key() else "mock"
            actions = ai_res.get("recommended_actions", [])

        risk_level_map = {10: "CRITICAL", 8: "HIGH", 5: "MEDIUM", 2: "LOW"}
        risk_level = risk_level_map.get(risk_score, urgency)

        return {
            "risk_score": risk_score,
            "risk_level": risk_level,
            "urgency": urgency,
            "news_score": risk_score,
            "reasoning": reasoning,
            "recommended_actions": actions,
            "model_used": model_used,
        }

    # Fallback to current patient's logged symptoms/vitals if no body payload
    patient = None
    # Check if patient exists
    sym_res = await db.execute(select(SymptomReport).order_by(SymptomReport.reported_at.desc()).limit(1))
    latest_sym = sym_res.scalar_one_or_none()
    if latest_sym:
        patient_id = latest_sym.patient_id
        vit_res = await db.execute(select(WearableReading).where(WearableReading.patient_id == patient_id).order_by(WearableReading.recorded_at.desc()).limit(1))
        latest_vit = vit_res.scalar_one_or_none()
        assessment = await risk_engine.assess_and_save(
            db=db,
            patient_id=patient_id,
            symptom_report=latest_sym,
            vitals_reading=latest_vit,
        )
        return assessment

    raise HTTPException(status_code=400, detail="No symptoms or vitals provided for risk assessment.")


@router.get("/history", response_model=list[RiskAssessmentOut])
async def risk_history(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    patient = await _get_patient_or_404(db, current_user)
    result = await db.execute(
        select(RiskAssessment)
        .where(RiskAssessment.patient_id == patient.id)
        .order_by(RiskAssessment.created_at.desc())
    )
    return result.scalars().all()

