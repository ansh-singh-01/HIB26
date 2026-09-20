"""
Wraps calls to Google's Gemini API for nuanced risk analysis.
Falls back to a deterministic mock when GEMINI_API_KEY is not set, so the
rest of the system can be built and tested before a real key is wired in.
"""
import json
import re
from typing import Optional

from app.core.config import settings

_gemini_configured = False


def _ensure_configured():
    global _gemini_configured
    if _gemini_configured or not settings.GEMINI_API_KEY:
        return
    import google.generativeai as genai
    genai.configure(api_key=settings.GEMINI_API_KEY)
    _gemini_configured = True


def _mock_analysis(symptoms: dict, free_text: Optional[str], vitals: Optional[dict]) -> dict:
    """
    Kaggle ML-backed clinical analysis when Gemini API is unconfigured or in testing.
    Uses Bayesian inference across 246k records, 773 conditions, and 377 symptoms.
    """
    from app.services.disease_predictor import predict_diseases, normalize_and_match_symptoms

    active_symptoms = [k for k, v in symptoms.items() if v is True and k != "severity"]
    matched = normalize_and_match_symptoms(active_symptoms, free_text=free_text)

    # Run ML disease prediction
    predictions = predict_diseases(
        symptoms=matched or active_symptoms,
        vitals=vitals,
        chief_complaint=free_text,
        top_k=3,
    )
    top_disease = predictions[0] if predictions else None

    if top_disease and top_disease["urgency"] == "emergency":
        urgency = "emergency"
        risk_score = 0.90
    elif top_disease and top_disease["urgency"] == "urgent":
        urgency = "urgent"
        risk_score = 0.70
    else:
        raw_severity = symptoms.get("severity", 0)
        severity = raw_severity if isinstance(raw_severity, (int, float)) else 0
        symptom_count = len(matched) or len(active_symptoms)
        risk_score = min(0.65, round((severity / 10) * 0.4 + (symptom_count / 6) * 0.35, 2))
        urgency = "urgent" if risk_score >= 0.5 else "routine"

    disease_summary = f"{top_disease['disease_name']} ({top_disease['confidence_pct']}%)" if top_disease else "General clinical presentation"
    diagnostics = ", ".join(top_disease['recommended_diagnostics'][:2]) if top_disease else "standard evaluation"

    return {
        "risk_score": risk_score,
        "urgency": urgency,
        "reasoning": (
            f"[Kaggle Clinical Dataset Triage Engine] Presentation correlates with {disease_summary}. "
            f"Recommended specialty: {top_disease['recommended_specialty'].replace('_', ' ').title() if top_disease else 'General Medicine'} "
            f"with {diagnostics}."
        ),
    }


def _build_prompt(symptoms: dict, free_text: Optional[str], vitals: Optional[dict]) -> str:
    from app.services.disease_predictor import predict_diseases, normalize_and_match_symptoms
    active_symptoms = [k for k, v in symptoms.items() if v is True and k != "severity"]
    differential = predict_diseases(symptoms=active_symptoms, vitals=vitals, chief_complaint=free_text, top_k=3)
    diff_summary = ", ".join(f"{d['disease_name']} ({d['confidence_pct']}%)" for d in differential)

    return f"""You are an advanced clinical triage assistant. Given the patient presentation below:

Symptoms (structured): {json.dumps(symptoms)}
Patient's own description: {free_text or "none provided"}
Latest vitals: {json.dumps(vitals) if vitals else "none available"}
Pre-computed Differential Diagnosis Candidates from Kaggle clinical knowledge base: {diff_summary}

Respond with ONLY a JSON object, no markdown, no preamble, in this exact shape:
{{"risk_score": <float 0.0-1.0>, "urgency": "<routine|urgent|emergency>", "reasoning": "<one or two sentence clinical rationale>"}}
"""



def analyze(symptoms: dict, free_text: Optional[str] = None, vitals: Optional[dict] = None) -> dict:
    """
    Returns {"risk_score": float, "urgency": str, "reasoning": str}.
    Uses Gemini if configured, otherwise a deterministic mock.
    """
    if not settings.GEMINI_API_KEY:
        return _mock_analysis(symptoms, free_text, vitals)

    _ensure_configured()
    try:
        import google.generativeai as genai
        model = genai.GenerativeModel(settings.GEMINI_MODEL)
        prompt = _build_prompt(symptoms, free_text, vitals)
        response = model.generate_content(prompt)

        text = response.text.strip()
        text = re.sub(r"^```(json)?|```$", "", text, flags=re.MULTILINE).strip()

        parsed = json.loads(text)
        return {
            "risk_score": float(parsed["risk_score"]),
            "urgency": parsed["urgency"],
            "reasoning": parsed["reasoning"],
        }
    except Exception as e:
        # Fall back gracefully on 429 quota limits, network timeouts, or parse errors
        mock = _mock_analysis(symptoms, free_text, vitals)
        mock["reasoning"] = f"[Local Triage Engine Fallback] {mock['reasoning']}"
        return mock


def summarize_patient_history(history_records: list[dict]) -> str:
    """Requirement #9: Convert long patient record into concise summary."""
    if not history_records:
        return "No prior medical history records found."

    conditions = ", ".join(r.get("condition", "Condition") for r in history_records[:3])
    default_summary = f"Patient has history of {conditions}. Recent treatments and vital readings logged."

    if not settings.GEMINI_API_KEY:
        return default_summary

    _ensure_configured()
    try:
        import google.generativeai as genai
        model = genai.GenerativeModel(settings.GEMINI_MODEL)
        prompt = f"Summarize the following patient medical history into a concise 2-sentence clinical summary for a doctor: {json.dumps(history_records)}"
        resp = model.generate_content(prompt)
        return resp.text.strip()
    except Exception:
        return default_summary


def parse_natural_language_symptoms(text: str) -> dict:
    """Requirement #9: Convert natural-language patient text into structured symptom dictionary."""
    if not text:
        return {}

    text_lower = text.lower()
    default_parsed = {
        "chest_pain": "chest" in text_lower or "heart" in text_lower,
        "shortness_of_breath": "breath" in text_lower or "breathing" in text_lower,
        "fever": "fever" in text_lower or "hot" in text_lower,
        "abdominal_pain": "stomach" in text_lower or "abdominal" in text_lower,
        "severity": 7 if "severe" in text_lower or "pain" in text_lower else 4,
    }

    from app.services.disease_predictor import normalize_and_match_symptoms
    matched = normalize_and_match_symptoms([], free_text=text)
    for m in matched:
        default_parsed[m.replace(" ", "_")] = True

    if not settings.GEMINI_API_KEY:

        return default_parsed

    _ensure_configured()
    try:
        import google.generativeai as genai
        model = genai.GenerativeModel(settings.GEMINI_MODEL)
        prompt = f"""Extract symptoms from patient text: "{text}". Return ONLY JSON object: {{"chest_pain": bool, "shortness_of_breath": bool, "fever": bool, "abdominal_pain": bool, "severity": int (1-10)}}"""
        resp = model.generate_content(prompt)
        clean = re.sub(r"^```(json)?|```$", "", resp.text.strip(), flags=re.MULTILINE).strip()
        return json.loads(clean)
    except Exception:
        return default_parsed


def explain_recommendation(facility_name: str, care_needs: str, distance_km: float) -> str:
    """Requirement #9: Explain system recommendation in simple patient-friendly language."""
    default_explanation = f"{facility_name} is recommended because it has the required specialist, open beds, and equipment for {care_needs} within {distance_km:.1f} km."

    if not settings.GEMINI_API_KEY:
        return default_explanation

    _ensure_configured()
    try:
        import google.generativeai as genai
        model = genai.GenerativeModel(settings.GEMINI_MODEL)
        prompt = f"Explain in one simple patient-friendly sentence why {facility_name} (located {distance_km:.1f} km away) was recommended for a patient needing {care_needs}."
        resp = model.generate_content(prompt)
        return resp.text.strip()
    except Exception:
        return default_explanation

