import pytest

from tests.conftest import auth_headers

pytestmark = pytest.mark.asyncio


async def _setup_patient_with_report(client, headers, symptoms, vitals, free_text=""):
    await client.post("/api/v1/patients/me", headers=headers, json={})
    await client.post(
        "/api/v1/patients/me/symptoms",
        headers=headers,
        json={"symptoms": symptoms, "free_text": free_text},
    )
    await client.post("/api/v1/patients/me/vitals", headers=headers, json=vitals)


async def test_emergency_vitals_trigger_rule_engine(client, patient_token):
    headers = auth_headers(patient_token)
    # SpO2 85 is a hard rule-engine trigger (< 90)
    await _setup_patient_with_report(
        client, headers,
        symptoms={"shortness_of_breath": True, "severity": 7},
        vitals={"heart_rate": 120, "spo2": 85, "blood_pressure_sys": 140, "blood_pressure_dia": 90, "body_temp_c": 37.5},
    )
    resp = await client.post("/api/v1/risk/assess", headers=headers)
    assert resp.status_code == 201
    body = resp.json()
    assert body["urgency"] == "emergency"
    assert body["model_used"] == "rule_engine"


async def test_normal_vitals_fall_through_to_ai(client, patient_token):
    headers = auth_headers(patient_token)
    await _setup_patient_with_report(
        client, headers,
        symptoms={"fatigue": True, "severity": 2},
        vitals={"heart_rate": 72, "spo2": 98, "blood_pressure_sys": 118, "blood_pressure_dia": 76, "body_temp_c": 36.8},
    )
    resp = await client.post("/api/v1/risk/assess", headers=headers)
    assert resp.status_code == 201
    body = resp.json()
    assert body["urgency"] in ("routine", "urgent")
    assert body["model_used"] in ("mock", "gemini")


async def test_risk_assess_requires_symptoms_first(client, patient_token):
    headers = auth_headers(patient_token)
    await client.post("/api/v1/patients/me", headers=headers, json={})
    resp = await client.post("/api/v1/risk/assess", headers=headers)
    assert resp.status_code == 400


async def test_risk_history_returns_assessments(client, patient_token):
    headers = auth_headers(patient_token)
    await _setup_patient_with_report(
        client, headers,
        symptoms={"headache": True, "severity": 3},
        vitals={"heart_rate": 75, "spo2": 98, "blood_pressure_sys": 115, "blood_pressure_dia": 74, "body_temp_c": 37.0},
    )
    await client.post("/api/v1/risk/assess", headers=headers)

    history_resp = await client.get("/api/v1/risk/history", headers=headers)
    assert history_resp.status_code == 200
    assert len(history_resp.json()) == 1
