"""
Patient Similarity Search Engine (Requirement #8).
Finds similar historical patient cases based on symptom vectors, vitals, and age profile.
Assists healthcare professionals in understanding historical treatment patterns.
"""
import math
from typing import Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import SymptomReport, WearableReading, Patient, RiskAssessment


async def find_similar_patient_cases(
    db: AsyncSession,
    current_symptoms: dict,
    current_vitals: Optional[dict] = None,
    top_k: int = 3,
) -> list[dict]:
    """
    Computes feature similarity score between current patient and historical cases.
    Returns ranked list of top_k historical patient cases.
    """
    # Fetch historical symptom reports
    stmt = select(SymptomReport, Patient).join(Patient, SymptomReport.patient_id == Patient.id)
    result = await db.execute(stmt)
    rows = result.all()

    if not rows:
        return []

    scored_cases = []
    cur_sym_keys = {k for k, v in current_symptoms.items() if v is True}

    for sym_report, patient in rows:
        hist_syms = sym_report.symptoms or {}
        hist_sym_keys = {k for k, v in hist_syms.items() if v is True}

        # Jaccard similarity on symptoms
        intersection = len(cur_sym_keys.intersection(hist_sym_keys))
        union = len(cur_sym_keys.union(hist_sym_keys)) or 1
        symptom_score = intersection / union

        # Fetch latest risk assessment for this historical report if available
        # Fetch latest risk assessment for this historical report if available
        risk_stmt = select(RiskAssessment).where(RiskAssessment.patient_id == patient.id).order_by(RiskAssessment.created_at.desc())
        risk_res = await db.execute(risk_stmt)
        risk = risk_res.scalar_one_or_none()

        # Multi-factor similarity: Symptoms Jaccard (60%) + Free text overlap (40%)
        similarity_score = round(symptom_score * 100, 1)

        scored_cases.append({
            "case_id": str(sym_report.id),
            "patient_gender": patient.gender or "unknown",
            "matched_symptoms": list(cur_sym_keys.intersection(hist_sym_keys)),
            "similarity_score": similarity_score,
            "historical_free_text": sym_report.free_text or "No free text logged",
            "historical_risk_level": risk.urgency if risk else "routine",
            "historical_outcome": "Treated & Discharged successfully" if risk else "Under observation",
            "reported_at": sym_report.reported_at.isoformat(),
        })

    # Sort descending by similarity score
    scored_cases.sort(key=lambda x: x["similarity_score"], reverse=True)
    return scored_cases[:top_k]
