"""
3. Recommendation -> Healthcare Recommender.

Decides which specialty and which diagnostic service a patient should be
routed to, using simple keyword rules over the structured symptom flags
(with a free-text fallback) -- deterministic and fast, no model call
needed for this step. Emergency cases skip straight to emergency medicine
regardless of which body system is involved.

To extend: add a new (flag, value) tuple to the relevant list. Lists are
checked top-to-bottom, so put more specific/urgent flags first -- a
patient with both "chest_pain" and "fever" should be routed to cardiology,
not general medicine.
"""
from typing import Optional

from app.models.enums import UrgencyLevel

SPECIALTY_RULES: list[tuple[str, str]] = [
    ("stroke_signs", "neurology"),
    ("seizure", "neurology"),
    ("severe_headache", "neurology"),
    ("numbness", "neurology"),
    ("chest_pain", "cardiology"),
    ("palpitations", "cardiology"),
    ("high_blood_pressure", "cardiology"),
    ("difficulty_breathing_severe", "pulmonology"),
    ("difficulty_breathing", "pulmonology"),
    ("shortness_of_breath", "pulmonology"),
    ("wheezing", "pulmonology"),
    ("cough", "pulmonology"),
    ("severe_bleeding", "general_surgery"),
    ("fracture_suspected", "orthopedics"),
    ("joint_pain", "orthopedics"),
    ("back_pain", "orthopedics"),
    ("abdominal_pain", "gastroenterology"),
    ("vomiting", "gastroenterology"),
    ("diarrhea", "gastroenterology"),
    ("nausea", "gastroenterology"),
    ("pelvic_pain", "obstetrics_gynecology"),
    ("pregnancy_related", "obstetrics_gynecology"),
    ("rash", "dermatology"),
    ("skin_rash", "dermatology"),
    ("eye_pain", "ophthalmology"),
    ("vision_loss", "ophthalmology"),
    ("ear_pain", "ent"),
    ("sore_throat", "ent"),
    ("suicidal_ideation", "psychiatry"),
    ("anxiety", "psychiatry"),
    ("depression", "psychiatry"),
    ("fever", "general_medicine"),
    ("fatigue", "general_medicine"),
]

SERVICE_RULES: list[tuple[str, str]] = [
    ("stroke_signs", "CT scan (brain)"),
    ("severe_headache", "CT scan (brain)"),
    ("seizure", "EEG"),
    ("chest_pain", "ECG"),
    ("palpitations", "ECG"),
    ("difficulty_breathing_severe", "Chest X-ray"),
    ("difficulty_breathing", "Chest X-ray"),
    ("shortness_of_breath", "Pulmonary function test"),
    ("cough", "Chest X-ray"),
    ("fracture_suspected", "X-ray"),
    ("abdominal_pain", "Abdominal ultrasound"),
    ("fever", "Blood test (CBC)"),
    ("high_blood_pressure", "Blood pressure monitoring"),
]

# Fallback when structured flags don't cover it -- checked against
# SymptomReport.free_text, same "first match wins" ordering.
FREE_TEXT_SPECIALTY_KEYWORDS: list[tuple[str, str]] = [
    ("chest pain", "cardiology"),
    ("heart", "cardiology"),
    ("breath", "pulmonology"),
    ("cough", "pulmonology"),
    ("headache", "neurology"),
    ("dizzy", "neurology"),
    ("numb", "neurology"),
    ("stomach", "gastroenterology"),
    ("abdomen", "gastroenterology"),
    ("vomit", "gastroenterology"),
    ("bone", "orthopedics"),
    ("fracture", "orthopedics"),
    ("joint", "orthopedics"),
    ("rash", "dermatology"),
    ("skin", "dermatology"),
    ("eye", "ophthalmology"),
    ("ear", "ent"),
    ("throat", "ent"),
    ("pregnan", "obstetrics_gynecology"),
    ("anxious", "psychiatry"),
    ("depress", "psychiatry"),
]

DEFAULT_SPECIALTY = "general_medicine"
DEFAULT_SERVICE = "General consultation"


def _match(symptoms: dict, rules: list[tuple[str, str]]) -> Optional[str]:
    for flag, value in rules:
        if symptoms.get(flag) is True:
            return value
    return None


def _match_free_text(free_text: Optional[str]) -> Optional[str]:
    if not free_text:
        return None
    text = free_text.lower()
    for keyword, specialty in FREE_TEXT_SPECIALTY_KEYWORDS:
        if keyword in text:
            return specialty
    return None


def determine_specialty(symptoms: dict, free_text: Optional[str], urgency: UrgencyLevel) -> str:
    if urgency == UrgencyLevel.EMERGENCY:
        # Emergency is a triage decision, not a body-system referral --
        # route straight to emergency medicine regardless of which flag fired.
        return "emergency_medicine"

    return (
        _match(symptoms, SPECIALTY_RULES)
        or _match_free_text(free_text)
        or DEFAULT_SPECIALTY
    )


def determine_service(symptoms: dict, urgency: UrgencyLevel) -> str:
    if urgency == UrgencyLevel.EMERGENCY:
        return "Emergency Department triage"

    return _match(symptoms, SERVICE_RULES) or DEFAULT_SERVICE
