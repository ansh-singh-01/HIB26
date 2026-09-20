import uuid
from typing import Optional, List, Dict, Any
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import (
    RiskAssessment, SymptomReport, Recommendation, Patient, Facility, Bed, Doctor, Equipment, MedicineStock,
    PatientMedication, PatientAllergy
)
from app.models.enums import UrgencyLevel
from app.services import keyword_rules, facility_matcher, disease_predictor



async def get_risk_assessment(
    db: AsyncSession, risk_assessment_id: uuid.UUID, patient_id: uuid.UUID
) -> Optional[RiskAssessment]:
    result = await db.execute(
        select(RiskAssessment).where(
            RiskAssessment.id == risk_assessment_id,
            RiskAssessment.patient_id == patient_id,
        )
    )
    return result.scalar_one_or_none()


async def generate_and_save(db: AsyncSession, risk_assessment: RiskAssessment) -> Recommendation:
    symptoms: dict = {}
    free_text: Optional[str] = None

    if risk_assessment.symptom_report_id:
        result = await db.execute(
            select(SymptomReport).where(SymptomReport.id == risk_assessment.symptom_report_id)
        )
        symptom_report = result.scalar_one_or_none()
        if symptom_report:
            symptoms = symptom_report.symptoms or {}
            free_text = symptom_report.free_text

    try:
        urgency = UrgencyLevel(risk_assessment.urgency)
    except ValueError:
        urgency = UrgencyLevel.EMERGENCY if risk_assessment.urgency in ["high", "critical"] else UrgencyLevel.ROUTINE

    specialty = keyword_rules.determine_specialty(symptoms, free_text, urgency)
    service = keyword_rules.determine_service(symptoms, urgency)

    recommendation = Recommendation(
        patient_id=risk_assessment.patient_id,
        risk_assessment_id=risk_assessment.id,
        recommended_specialty=specialty,
        recommended_service=service,
    )
    db.add(recommendation)
    await db.commit()
    await db.refresh(recommendation)
    return recommendation


async def recommend_end_to_end_care_path(
    db: AsyncSession,
    patient_id: Optional[uuid.UUID] = None,
    symptoms: Optional[List[str]] = None,
    vitals: Optional[Dict[str, Any]] = None,
    chief_complaint: Optional[str] = None,
    medical_history: Optional[List[str]] = None,
    patient_lat: Optional[float] = 22.7196, # Default to Indore city center
    patient_lng: Optional[float] = 75.8577,
) -> Dict[str, Any]:
    """
    Complete Multi-Factor Recommender Pipeline:
    Patient Symptoms + Vitals + History -> Risk Level -> Required Bed Type & Equipment -> Resource-Aware Facility Ranking in Indore.
    """
    symptoms = symptoms or []
    vitals = vitals or {}
    medical_history = medical_history or []
    chief_complaint = chief_complaint or "Clinical presentation evaluation"

    # Fetch patient medications/allergies if patient_id is provided
    med_names = []
    allergy_names = []
    if patient_id:
        med_res = await db.execute(select(PatientMedication).where(PatientMedication.patient_id == patient_id))
        med_names = [m.medicine_name for m in med_res.scalars().all()]

        all_res = await db.execute(select(PatientAllergy).where(PatientAllergy.patient_id == patient_id))
        allergy_names = [a.allergen for a in all_res.scalars().all()]

    # 1. Evaluate Vitals & Clinical Presentation
    spo2 = float(vitals.get("spo2", 98))
    heart_rate = float(vitals.get("heart_rate", 75))
    sys_bp = float(vitals.get("blood_pressure_sys", vitals.get("systolic_bp", 120)))
    dia_bp = float(vitals.get("blood_pressure_dia", vitals.get("diastolic_bp", 80)))
    temp = float(vitals.get("body_temp_c", vitals.get("temperature", 37.0)))

    is_hypoxic = spo2 < 90.0
    is_critical_hr = heart_rate > 130 or heart_rate < 40
    is_critical_bp = sys_bp > 180 or sys_bp < 90

    # Determine Urgency Level
    if is_hypoxic or is_critical_hr or is_critical_bp:
        urgency = UrgencyLevel.EMERGENCY
        required_bed_type = "icu"
    elif temp > 38.5 or any("severe" in s.lower() or "chest" in s.lower() for s in symptoms):
        urgency = UrgencyLevel.URGENT
        required_bed_type = "general"
    else:
        urgency = UrgencyLevel.ROUTINE
        required_bed_type = "general"

    # Determine Required Specialty
    # keyword_rules expects a dict of {symptom_flag: True}, not the raw list.
    symptoms_dict = {s: True for s in symptoms}
    specialty = keyword_rules.determine_specialty(symptoms_dict, chief_complaint, urgency)
    service = keyword_rules.determine_service(symptoms_dict, urgency)

    # Predict conditions using Kaggle Diseases & Symptoms Dataset
    predicted_diseases = disease_predictor.predict_diseases(
        symptoms=symptoms,
        vitals=vitals,
        chief_complaint=chief_complaint,
        top_k=5,
    )

    # Refine specialty using disease prediction if keyword rules gave general_medicine
    if specialty == "general_medicine" and predicted_diseases:
        top_pred_specialty = predicted_diseases[0].get("recommended_specialty")
        if top_pred_specialty and top_pred_specialty != "general_medicine":
            specialty = top_pred_specialty

    # Determine Required Equipment
    required_equipment = []
    if is_hypoxic:
        required_equipment.append("Ventilator")
    if "chest_pain" in symptoms or "cardiac" in chief_complaint.lower() or any("hypertension" in m.lower() for m in medical_history) or specialty == "cardiology":
        required_equipment.append("ECG")
        if specialty == "general_medicine":
            specialty = "cardiology"
    if "trauma" in chief_complaint.lower() or "fracture" in symptoms or specialty == "orthopedics":
        required_equipment.append("X-Ray")
        specialty = "orthopedics"

    # Add equipment from top predicted disease
    if predicted_diseases and predicted_diseases[0].get("required_equipment"):
        for eq in predicted_diseases[0]["required_equipment"]:
            if eq not in required_equipment:
                required_equipment.append(eq)


    # Resource-aware facility matching
    top_match = await facility_matcher.find_best_facility_for_resources(
        db=db,
        patient_lat=patient_lat or 22.7196,
        patient_lng=patient_lng or 75.8577,
        required_specialty=specialty,
        required_bed_type=required_bed_type,
        required_equipment=required_equipment,
    )

    matched_facility_info = None
    if top_match and top_match.get("facility"):
        fac = top_match["facility"]
        doc = top_match.get("doctor")
        matched_facility_info = {
            "facility_id": str(fac.id),
            "name": fac.name,
            "type": fac.type,
            "address": fac.address or "Indore Central Health Grid Hub",
            "phone": fac.phone,
            "assigned_doctor": doc.full_name if doc else f"On-Call {specialty.replace('_', ' ').title()} Specialist",
            "distance_km": top_match["distance_km"],
            "match_score": top_match["score"],
            "match_percentage": top_match["match_percentage"],
        }

    return {
        "urgency_level": urgency.value,
        "recommended_specialty": specialty,
        "recommended_service": service,
        "predicted_diseases": predicted_diseases,
        "resource_requirements": {
            "required_bed_type": required_bed_type,
            "required_equipment": required_equipment,
            "required_specialty": specialty,
        },
        "matched_facility": matched_facility_info,
        "recommended_facilities": [matched_facility_info] if matched_facility_info else [],
        "patient_context": {
            "active_medications": med_names,
            "allergies": allergy_names,
            "history_comorbidities": medical_history,
        },
        "care_path_steps": [
            f"Dispatch / Route to {matched_facility_info['name'] if matched_facility_info else 'Nearest Hospital'}",
            f"Admit to {required_bed_type.upper()} Ward",
            f"Consult {specialty.replace('_', ' ').title()} Specialist",
            f"Perform {service.upper()} procedure with {', '.join(required_equipment) if required_equipment else 'standard care'}"
        ]
    }

