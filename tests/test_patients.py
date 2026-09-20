import pytest

from tests.conftest import auth_headers

pytestmark = pytest.mark.asyncio


async def test_create_and_fetch_profile(client, patient_token):
    headers = auth_headers(patient_token)

    create_resp = await client.post(
        "/api/v1/patients/me",
        headers=headers,
        json={"gender": "female", "blood_group": "O+", "location_lat": 22.7, "location_lng": 75.8},
    )
    assert create_resp.status_code == 201
    assert create_resp.json()["blood_group"] == "O+"

    get_resp = await client.get("/api/v1/patients/me", headers=headers)
    assert get_resp.status_code == 200
    assert get_resp.json()["gender"] == "female"


async def test_duplicate_profile_rejected(client, patient_token):
    headers = auth_headers(patient_token)
    await client.post("/api/v1/patients/me", headers=headers, json={})
    second = await client.post("/api/v1/patients/me", headers=headers, json={})
    assert second.status_code == 400


async def test_log_symptoms_requires_profile_first(client, patient_token):
    headers = auth_headers(patient_token)
    resp = await client.post(
        "/api/v1/patients/me/symptoms",
        headers=headers,
        json={"symptoms": {"fever": True}, "free_text": "hot"},
    )
    assert resp.status_code == 404


async def test_log_symptoms_and_vitals(client, patient_token):
    headers = auth_headers(patient_token)
    await client.post("/api/v1/patients/me", headers=headers, json={})

    sym_resp = await client.post(
        "/api/v1/patients/me/symptoms",
        headers=headers,
        json={"symptoms": {"fever": True, "severity": 5}, "free_text": "Mild fever"},
    )
    assert sym_resp.status_code == 201

    vit_resp = await client.post(
        "/api/v1/patients/me/vitals",
        headers=headers,
        json={"heart_rate": 80, "spo2": 97, "blood_pressure_sys": 118, "blood_pressure_dia": 76, "body_temp_c": 37.5},
    )
    assert vit_resp.status_code == 201

    list_resp = await client.get("/api/v1/patients/me/vitals", headers=headers)
    assert list_resp.status_code == 200
    assert len(list_resp.json()) == 1


async def test_log_medical_history(client, patient_token):
    headers = auth_headers(patient_token)
    await client.post("/api/v1/patients/me", headers=headers, json={})

    post_resp = await client.post(
        "/api/v1/patients/me/medical-history",
        headers=headers,
        json={"condition": "Hypertension", "notes": "On beta blockers"},
    )
    assert post_resp.status_code == 201
    assert post_resp.json()["condition"] == "Hypertension"

    get_resp = await client.get("/api/v1/patients/me/medical-history", headers=headers)
    assert get_resp.status_code == 200
    assert len(get_resp.json()) == 1
    assert get_resp.json()[0]["condition"] == "Hypertension"
