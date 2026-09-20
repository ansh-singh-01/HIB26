import uuid
from datetime import datetime
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.services import rules_engine, gemini_client, facility_matcher, google_maps, firebase_service
from app.schemas.risk import VitalsInput

router = APIRouter()

# Default Indore Emergency Coordinates (Central Madhya Pradesh Health Hub)
INDORE_DEFAULT_LAT = 22.7196
INDORE_DEFAULT_LNG = 75.8577


class TelemetryInput(BaseModel):
    patient_id: Optional[str] = None
    wearable_device_id: Optional[str] = "IOT-WATCH-9942"
    heart_rate: float
    spo2: float
    blood_pressure_sys: float
    blood_pressure_dia: float
    body_temp_c: float
    respiratory_rate: Optional[float] = 18.0
    gcs: Optional[int] = 15
    location_lat: Optional[float] = INDORE_DEFAULT_LAT
    location_lng: Optional[float] = INDORE_DEFAULT_LNG


class PatientSymptomReport(BaseModel):
    patient_id: Optional[str] = None
    symptoms: List[str]
    chief_complaint: str
    severity_rating: Optional[int] = 5


@router.post("/telemetry")
async def receive_iot_telemetry(data: TelemetryInput, db: AsyncSession = Depends(get_db)):
    """
    Ingest continuous IoT telemetry stream from wearables/sensors.
    Automatically evaluates risk and triggers emergency routing if vital thresholds are breached.
    """
    patient_lat = data.location_lat if data.location_lat is not None else INDORE_DEFAULT_LAT
    patient_lng = data.location_lng if data.location_lng is not None else INDORE_DEFAULT_LNG

    is_critical_vitals = (
        data.spo2 < 90.0 or
        data.blood_pressure_sys < 90.0 or
        data.blood_pressure_sys > 180.0 or
        data.heart_rate > 130.0 or
        data.heart_rate < 40.0
    )

    vitals_dict = {
        "heart_rate": data.heart_rate,
        "spo2": data.spo2,
        "blood_pressure_sys": data.blood_pressure_sys,
        "blood_pressure_dia": data.blood_pressure_dia,
        "body_temp_c": data.body_temp_c,
    }

    symptoms_list = []
    if data.spo2 < 90.0:
        symptoms_list.append("severe hypoxia")
    if data.blood_pressure_sys < 90.0:
        symptoms_list.append("hypotension / shock")

    # Assess risk via rules engine or gemini
    symptoms_dict = {s: True for s in symptoms_list}
    rule_res = rules_engine.run_emergency_rules(symptoms_dict, vitals_dict)
    if rule_res:
        risk_score = rule_res["risk_score"]
        urgency = rule_res["urgency"]
        reasoning = rule_res["reasoning"]
        recommended_actions = rule_res.get("recommended_actions", [])
    elif not symptoms_list and 60 <= data.heart_rate <= 100 and data.spo2 >= 95 and 90 <= data.blood_pressure_sys <= 135 and 36.0 <= data.body_temp_c <= 37.5:
        # Normal stable vitals: fast-path locally to preserve API rate limits for genuine alerts
        risk_score = 0.05
        urgency = "routine"
        reasoning = "Continuous IoT telemetry parameters verified within normal physiological limits."
        recommended_actions = ["Continue routine monitoring."]
    else:
        ai_res = gemini_client.analyze(symptoms_dict, "IoT Wearable Telemetry Sensor Stream Alert", vitals_dict)
        risk_score = ai_res.get("risk_score", 5)
        urgency = ai_res.get("urgency", "MEDIUM")
        reasoning = ai_res.get("reasoning", "Continuous IoT telemetry parameters evaluated.")
        recommended_actions = ai_res.get("recommended_actions", ["Monitor vitals closely."])

    is_emergency = is_critical_vitals or urgency in ["HIGH", "CRITICAL"]

    matched_facility = None
    navigation_info = None

    if is_emergency:
        match = await facility_matcher.find_best_facility(
            db=db,
            patient_lat=patient_lat,
            patient_lng=patient_lng,
            specialty="emergency_medicine",
        )
        if match and match.facility:
            fac = match.facility
            bed_res = await db.execute(select(facility_matcher.Bed).where(facility_matcher.Bed.facility_id == fac.id))
            beds = bed_res.scalars().all()
            icu_beds = sum(b.available_count for b in beds if "icu" in b.ward_type.lower())
            gen_beds = sum(b.available_count for b in beds if "general" in b.ward_type.lower() or "regular" in b.ward_type.lower())

            # Real Google Maps calculation
            route_calc = await google_maps.calculate_travel_distance(
                patient_lat, patient_lng, fac.location_lat, fac.location_lng
            )

            matched_facility = {
                "id": str(fac.id),
                "name": fac.name,
                "type": fac.type,
                "address": fac.address,
                "phone": fac.phone,
                "available_icu_beds": icu_beds,
                "available_general_beds": gen_beds,
                "distance_km": route_calc["distance_km"],
                "match_score": 98,
            }

            maps_url = f"https://www.google.com/maps/dir/?api=1&origin={patient_lat},{patient_lng}&destination={fac.location_lat},{fac.location_lng}&travelmode=driving"

            navigation_info = {
                "destination": fac.name,
                "address": fac.address or "Indore Emergency Care Center",
                "distance_km": route_calc["distance_km"],
                "estimated_travel_minutes": route_calc["duration_mins"],
                "emergency_hotline": fac.phone or "108 / 112 Emergency Services",
                "google_maps_directions_url": maps_url,
                "routing_source": route_calc["source"]
            }

            # Trigger FCM Push notification to facility
            await firebase_service.send_emergency_fcm_alert(
                device_token="FACILITY_ADMIN_INDORE_DEVICE_TOKEN",
                title=f"🚨 EMERGENCY INCOMING PATIENT: {fac.name}",
                body=f"IoT Telemetry alert: SpO2={data.spo2}%, HR={data.heart_rate}bpm. Dispatching to ER entrance.",
                extra_data={"facility_id": str(fac.id), "lat": patient_lat, "lng": patient_lng}
            )

    return {
        "timestamp": datetime.utcnow().isoformat(),
        "patient_id": data.patient_id,
        "device_id": data.wearable_device_id,
        "vitals_received": {
            "heart_rate": data.heart_rate,
            "spo2": data.spo2,
            "blood_pressure": f"{int(data.blood_pressure_sys)}/{int(data.blood_pressure_dia)}",
            "temperature": data.body_temp_c,
        },
        "emergency_triggered": is_emergency,
        "risk_level": urgency,
        "news_score": risk_score,
        "ai_reasoning": reasoning,
        "recommended_actions": recommended_actions,
        "matched_facility": matched_facility,
        "navigation": navigation_info,
    }


@router.post("/symptom-report")
async def report_patient_symptoms(report: PatientSymptomReport, db: AsyncSession = Depends(get_db)):
    """
    Patient self-report endpoint for logging symptoms and receiving instant care path suggestions.
    """
    vitals_normal = {
        "blood_pressure_sys": 120, "blood_pressure_dia": 80, "heart_rate": 75, "spo2": 98, "body_temp_c": 37.0
    }
    symptoms_dict = {s: True for s in report.symptoms}
    rule_res = rules_engine.run_emergency_rules(symptoms_dict, vitals_normal)
    if rule_res:
        risk_level = rule_res["urgency"]
        reasoning = rule_res["reasoning"]
        recommended_actions = rule_res.get("recommended_actions", [])
    else:
        ai_res = gemini_client.analyze(symptoms_dict, report.chief_complaint, vitals_normal)
        risk_level = ai_res.get("urgency", "MEDIUM")
        reasoning = ai_res.get("reasoning", "Symptoms self-reported by patient.")
        recommended_actions = ai_res.get("recommended_actions", ["Consult nearest healthcare provider."])

    return {
        "status": "Symptom Logged",
        "risk_level": risk_level,
        "reasoning": reasoning,
        "suggested_care_path": recommended_actions,
    }

