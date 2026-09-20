import uuid
from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import SymptomReport, WearableReading, RiskAssessment
from app.services import gemini_client, rules_engine


def _vitals_to_dict(reading: Optional[WearableReading]) -> Optional[dict]:
    if reading is None:
        return None
    return {
        "heart_rate": reading.heart_rate,
        "spo2": reading.spo2,
        "blood_pressure_sys": reading.blood_pressure_sys,
        "blood_pressure_dia": reading.blood_pressure_dia,
        "body_temp_c": reading.body_temp_c,
    }


async def get_latest_symptom_report(db: AsyncSession, patient_id: uuid.UUID) -> Optional[SymptomReport]:
    result = await db.execute(
        select(SymptomReport)
        .where(SymptomReport.patient_id == patient_id)
        .order_by(SymptomReport.reported_at.desc())
        .limit(1)
    )
    return result.scalar_one_or_none()


async def get_latest_vitals(db: AsyncSession, patient_id: uuid.UUID) -> Optional[WearableReading]:
    result = await db.execute(
        select(WearableReading)
        .where(WearableReading.patient_id == patient_id)
        .order_by(WearableReading.recorded_at.desc())
        .limit(1)
    )
    return result.scalar_one_or_none()


async def assess_and_save(
    db: AsyncSession,
    patient_id: uuid.UUID,
    symptom_report: SymptomReport,
    vitals_reading: Optional[WearableReading],
) -> RiskAssessment:
    """
    2. AI Analysis stage: rules first (fast, deterministic emergency catch),
    then AI-assisted analysis for everything else. Persists and returns the
    resulting RiskAssessment row.
    """
    vitals_dict = _vitals_to_dict(vitals_reading)

    rule_result = rules_engine.run_emergency_rules(symptom_report.symptoms, vitals_dict)
    if rule_result is not None:
        model_used = "rule_engine"
        result = rule_result
    else:
        model_used = "gemini" if _has_gemini_key() else "mock"
        result = gemini_client.analyze(
            symptoms=symptom_report.symptoms,
            free_text=symptom_report.free_text,
            vitals=vitals_dict,
        )

    assessment = RiskAssessment(
        patient_id=patient_id,
        symptom_report_id=symptom_report.id,
        risk_score=result["risk_score"],
        urgency=result["urgency"],
        reasoning=result["reasoning"],
        model_used=model_used,
        raw_model_output=result,
    )
    db.add(assessment)
    await db.commit()
    await db.refresh(assessment)
    return assessment


def _has_gemini_key() -> bool:
    from app.core.config import settings
    return bool(settings.GEMINI_API_KEY)
