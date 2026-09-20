import pytest

from tests.conftest import auth_headers

pytestmark = pytest.mark.asyncio


async def _full_setup_to_risk(client, headers, symptoms, vitals, free_text=""):
    await client.post("/api/v1/patients/me", headers=headers, json={})
    await client.post("/api/v1/patients/me/symptoms", headers=headers, json={"symptoms": symptoms, "free_text": free_text})
    await client.post("/api/v1/patients/me/vitals", headers=headers, json=vitals)
    risk_resp = await client.post("/api/v1/risk/assess", headers=headers)
    return risk_resp.json()["id"]


async def test_chest_pain_routes_to_cardiology(client, patient_token):
    headers = auth_headers(patient_token)
    risk_id = await _full_setup_to_risk(
        client, headers,
        symptoms={"chest_pain": True, "severity": 6},
        vitals={"heart_rate": 100, "spo2": 97, "blood_pressure_sys": 130, "blood_pressure_dia": 85, "body_temp_c": 37.0},
    )
    resp = await client.post("/api/v1/recommendations/generate", headers=headers, json={"risk_assessment_id": risk_id})
    assert resp.status_code == 201
    body = resp.json()
    assert body["recommended_specialty"] == "cardiology"
    assert body["recommended_service"] == "ECG"


async def test_emergency_overrides_symptom_specialty(client, patient_token):
    headers = auth_headers(patient_token)
    # abdominal_pain would normally route to gastroenterology, but critical
    # vitals should force emergency_medicine regardless.
    risk_id = await _full_setup_to_risk(
        client, headers,
        symptoms={"abdominal_pain": True, "severity": 8},
        vitals={"heart_rate": 135, "spo2": 87, "blood_pressure_sys": 150, "blood_pressure_dia": 95, "body_temp_c": 39.2},
    )
    resp = await client.post("/api/v1/recommendations/generate", headers=headers, json={"risk_assessment_id": risk_id})
    assert resp.status_code == 201
    body = resp.json()
    assert body["recommended_specialty"] == "emergency_medicine"


async def test_unmatched_symptoms_default_to_general_medicine(client, patient_token):
    headers = auth_headers(patient_token)
    risk_id = await _full_setup_to_risk(
        client, headers,
        symptoms={"tiredness_unlisted_flag": True, "severity": 2},
        vitals={"heart_rate": 70, "spo2": 99, "blood_pressure_sys": 110, "blood_pressure_dia": 70, "body_temp_c": 36.7},
    )
    resp = await client.post("/api/v1/recommendations/generate", headers=headers, json={"risk_assessment_id": risk_id})
    assert resp.status_code == 201
    assert resp.json()["recommended_specialty"] == "general_medicine"


async def test_recommendation_for_other_patients_risk_assessment_rejected(client, patient_token, admin_token):
    """A patient shouldn't be able to generate a recommendation from someone else's risk assessment."""
    headers_a = auth_headers(patient_token)
    risk_id = await _full_setup_to_risk(
        client, headers_a,
        symptoms={"fever": True, "severity": 4},
        vitals={"heart_rate": 80, "spo2": 97, "blood_pressure_sys": 120, "blood_pressure_dia": 78, "body_temp_c": 37.8},
    )

    # a second, unrelated patient tries to use patient A's risk_assessment_id
    from tests.conftest import signup_and_login
    token_b = await signup_and_login(client, role="patient")
    headers_b = auth_headers(token_b)
    await client.post("/api/v1/patients/me", headers=headers_b, json={})

    resp = await client.post("/api/v1/recommendations/generate", headers=headers_b, json={"risk_assessment_id": risk_id})
    assert resp.status_code == 404
