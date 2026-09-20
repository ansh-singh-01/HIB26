import uuid
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models import Patient, Recommendation, User
from app.schemas.recommendation import (
    RecommendationCreate, RecommendationOut,
    DiseasePredictionRequest, DiseasePredictionResponse,
    SymptomsCatalogResponse
)
from app.services import recommendation_engine, disease_predictor


router = APIRouter()


async def _get_patient_or_404(db: AsyncSession, current_user: User) -> Patient:
    result = await db.execute(select(Patient).where(Patient.user_id == current_user.id))
    patient = result.scalar_one_or_none()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient profile not found. Create one first.")
    return patient


class RecommendationMatchInput(BaseModel):
    vitals: Optional[dict] = None
    symptoms: Optional[List[str]] = None
    chief_complaint: Optional[str] = "Clinical evaluation"
    medical_history: Optional[List[str]] = None
    patient_id: Optional[str] = None
    location_lat: Optional[float] = 22.7196
    location_lng: Optional[float] = 75.8577


@router.post("/match")
async def match_recommendations(
    payload: RecommendationMatchInput,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Unified AI Care Recommendation & Facility Matching Endpoint.
    Executes end-to-end clinical recommendation workflow:
    Symptoms + Vitals + History -> Risk Level -> Required Specialty -> Facility Resource Capacity -> Indore Ranking.
    """
    patient_id_uuid: Optional[uuid.UUID] = None
    if payload.patient_id:
        try:
            patient_id_uuid = uuid.UUID(payload.patient_id)
        except (ValueError, TypeError):
            raise HTTPException(status_code=400, detail="Invalid patient_id format.")
    else:
        patient_res = await db.execute(select(Patient).where(Patient.user_id == current_user.id))
        user_patient = patient_res.scalar_one_or_none()
        if user_patient:
            patient_id_uuid = user_patient.id

    if patient_id_uuid and current_user.role == "patient":
        patient_res = await db.execute(select(Patient).where(Patient.user_id == current_user.id))
        user_patient = patient_res.scalar_one_or_none()
        if not user_patient or user_patient.id != patient_id_uuid:
            raise HTTPException(status_code=403, detail="Not authorized to access recommendations for another patient.")

    res = await recommendation_engine.recommend_end_to_end_care_path(
        db=db,
        patient_id=patient_id_uuid,
        symptoms=payload.symptoms or [],
        vitals=payload.vitals or {},
        chief_complaint=payload.chief_complaint or "Clinical evaluation",
        medical_history=payload.medical_history or [],
        patient_lat=payload.location_lat,
        patient_lng=payload.location_lng,
    )
    return res


@router.post("/generate", response_model=RecommendationOut, status_code=201)
async def generate_recommendation(
    payload: RecommendationCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    patient = await _get_patient_or_404(db, current_user)

    risk_assessment = await recommendation_engine.get_risk_assessment(
        db, payload.risk_assessment_id, patient.id
    )
    if risk_assessment is None:
        raise HTTPException(status_code=404, detail="Risk assessment not found for this patient.")

    recommendation = await recommendation_engine.generate_and_save(db, risk_assessment)
    return recommendation


@router.get("/history", response_model=list[RecommendationOut])
async def recommendation_history(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    patient = await _get_patient_or_404(db, current_user)
    result = await db.execute(
        select(Recommendation)
        .where(Recommendation.patient_id == patient.id)
        .order_by(Recommendation.created_at.desc())
    )
    return result.scalars().all()


@router.post("/predict-disease", response_model=DiseasePredictionResponse)
async def predict_clinical_diseases(
    payload: DiseasePredictionRequest,
    current_user: User = Depends(get_current_user),
):
    """
    Predict probable clinical diseases based on patient symptoms using the Kaggle medical dataset (246k+ records).
    Returns top conditions with confidence scores, recommended specialties, and diagnostics.
    """
    predictions = disease_predictor.predict_diseases(
        symptoms=payload.symptoms,
        vitals=payload.vitals,
        chief_complaint=payload.chief_complaint,
        top_k=payload.top_k,
    )
    analyzed_symptoms = disease_predictor.normalize_and_match_symptoms(payload.symptoms, payload.chief_complaint)
    top_specialty = predictions[0]["recommended_specialty"] if predictions else "general_medicine"
    return {
        "total_predictions": len(predictions),
        "analyzed_symptoms": analyzed_symptoms,
        "top_recommended_specialty": top_specialty,
        "predictions": predictions,
    }


@router.get("/symptoms-catalog", response_model=SymptomsCatalogResponse)
async def get_symptoms_catalog():
    """
    Returns the comprehensive catalog of all 377 recognized clinical symptoms from the Kaggle dataset.
    """
    symptoms = disease_predictor.get_all_symptoms()
    return {
        "total_symptoms": len(symptoms),
        "symptoms": symptoms,
    }


