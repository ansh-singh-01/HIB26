"""
Fast, deterministic emergency detection. Runs before any AI call so that
clearly critical cases (crashing SpO2, no pulse-range HR, etc.) never wait
on API latency or a possibly-wrong model output.

Returns None if nothing rings the emergency bell -- caller then proceeds to
AI-assisted analysis for the nuanced cases.
"""
from typing import Optional

# Critical symptom keys that, if flagged true, are always an emergency
# regardless of vitals (e.g. self-reported unconsciousness can't be sensed
# by a wearable).
CRITICAL_SYMPTOM_FLAGS = {
    "unconscious", "severe_bleeding", "stroke_signs",
    "difficulty_breathing_severe", "seizure", "suicidal_ideation",
}


def check_vitals(vitals: Optional[dict]) -> Optional[str]:
    """Returns a reason string if vitals cross an emergency threshold, else None."""
    if not vitals:
        return None

    spo2 = vitals.get("spo2")
    if spo2 is not None and spo2 < 90:
        return f"SpO2 critically low at {spo2}%"

    hr = vitals.get("heart_rate")
    if hr is not None and (hr > 130 or hr < 40):
        return f"Heart rate out of safe range at {hr} bpm"

    sys_bp = vitals.get("blood_pressure_sys")
    if sys_bp is not None and (sys_bp > 180 or sys_bp < 90):
        return f"Systolic blood pressure critical at {sys_bp} mmHg"

    temp = vitals.get("body_temp_c")
    if temp is not None and (temp > 40 or temp < 35):
        return f"Body temperature critical at {temp}°C"

    return None


def check_symptoms(symptoms: dict) -> Optional[str]:
    """Returns a reason string if a critical symptom flag is set, else None."""
    for key in CRITICAL_SYMPTOM_FLAGS:
        if symptoms.get(key) is True:
            return f"Critical symptom flag reported: {key.replace('_', ' ')}"

    severity = symptoms.get("severity")
    if isinstance(severity, (int, float)) and severity >= 9:
        return f"Self-reported severity extreme at {severity}/10"

    return None


def run_emergency_rules(symptoms: dict, vitals: Optional[dict]) -> Optional[dict]:
    """
    Entry point. Returns a risk-assessment-shaped dict if an emergency rule
    fires, otherwise None (caller should fall through to AI analysis).
    """
    reason = check_vitals(vitals) or check_symptoms(symptoms)
    if reason is None:
        return None

    return {
        "risk_score": 0.95,
        "urgency": "emergency",
        "reasoning": f"Rule engine flagged emergency: {reason}.",
    }
