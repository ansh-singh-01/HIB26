import pytest

import tests.conftest as conftest
from tests.conftest import auth_headers
from app.models import Facility, Bed, Doctor, Equipment, MedicineStock
from app.models.enums import FacilityType

pytestmark = pytest.mark.asyncio


async def _seed_test_facilities():
    """Minimal version of app/scripts/seed_facilities.py, scoped to the test DB."""
    async with conftest.TestSessionLocal() as db:
        cardiology_facility = Facility(
            name="Test Cardiac Center", type=FacilityType.HOSPITAL,
            location_lat=22.70, location_lng=75.85, address="Test address",
        )
        db.add(cardiology_facility)
        await db.flush()
        db.add(Doctor(facility_id=cardiology_facility.id, full_name="Dr. Test Cardio", specialty="cardiology", available=True))
        db.add(Bed(facility_id=cardiology_facility.id, ward_type="general", total_count=10, available_count=5))

        emergency_facility = Facility(
            name="Test Emergency Center", type=FacilityType.HOSPITAL,
            location_lat=22.705, location_lng=75.855, address="Test address 2",
        )
        db.add(emergency_facility)
        await db.flush()
        db.add(Bed(facility_id=emergency_facility.id, ward_type="emergency", total_count=10, available_count=3))

        await db.commit()


async def _setup_to_referral(client, headers, symptoms, vitals, patient_location):
    await client.post("/api/v1/patients/me", headers=headers, json=patient_location)
    await client.post("/api/v1/patients/me/symptoms", headers=headers, json={"symptoms": symptoms, "free_text": ""})
    await client.post("/api/v1/patients/me/vitals", headers=headers, json=vitals)
    risk_id = (await client.post("/api/v1/risk/assess", headers=headers)).json()["id"]
    rec_id = (await client.post(
        "/api/v1/recommendations/generate", headers=headers, json={"risk_assessment_id": risk_id}
    )).json()["id"]
    return rec_id


async def test_specialist_match_picks_correct_facility(client, patient_token):
    await _seed_test_facilities()
    headers = auth_headers(patient_token)
    rec_id = await _setup_to_referral(
        client, headers,
        symptoms={"chest_pain": True, "severity": 5},
        vitals={"heart_rate": 95, "spo2": 97, "blood_pressure_sys": 128, "blood_pressure_dia": 82, "body_temp_c": 37.0},
        patient_location={"location_lat": 22.701, "location_lng": 75.851},
    )
    resp = await client.post("/api/v1/referrals/match", headers=headers, json={"recommendation_id": rec_id})
    assert resp.status_code == 201
    body = resp.json()
    assert body["facility"]["name"] == "Test Cardiac Center"
    assert body["doctor"]["specialty"] == "cardiology"
    assert body["distance_km"] < 1.0


async def test_emergency_match_ignores_specialty_needs_beds(client, patient_token):
    await _seed_test_facilities()
    headers = auth_headers(patient_token)
    rec_id = await _setup_to_referral(
        client, headers,
        symptoms={"severe_bleeding": True, "severity": 9},
        vitals={"heart_rate": 140, "spo2": 85, "blood_pressure_sys": 80, "blood_pressure_dia": 50, "body_temp_c": 36.5},
        patient_location={"location_lat": 22.706, "location_lng": 75.856},
    )
    resp = await client.post("/api/v1/referrals/match", headers=headers, json={"recommendation_id": rec_id})
    assert resp.status_code == 201
    body = resp.json()
    assert body["facility"]["name"] == "Test Emergency Center"
    assert body["emergency_alert_sent"] is True


async def test_match_returns_404_when_no_facility_qualifies(client, patient_token):
    # no facilities seeded at all
    headers = auth_headers(patient_token)
    rec_id = await _setup_to_referral(
        client, headers,
        symptoms={"eye_pain": True, "severity": 3},
        vitals={"heart_rate": 75, "spo2": 98, "blood_pressure_sys": 115, "blood_pressure_dia": 75, "body_temp_c": 37.0},
        patient_location={"location_lat": 22.7, "location_lng": 75.8},
    )
    resp = await client.post("/api/v1/referrals/match", headers=headers, json={"recommendation_id": rec_id})
    assert resp.status_code == 404


async def test_followup_schedule_and_complete(client, patient_token):
    await _seed_test_facilities()
    headers = auth_headers(patient_token)
    rec_id = await _setup_to_referral(
        client, headers,
        symptoms={"chest_pain": True, "severity": 4},
        vitals={"heart_rate": 90, "spo2": 97, "blood_pressure_sys": 125, "blood_pressure_dia": 80, "body_temp_c": 37.0},
        patient_location={"location_lat": 22.701, "location_lng": 75.851},
    )
    referral_id = (await client.post("/api/v1/referrals/match", headers=headers, json={"recommendation_id": rec_id})).json()["id"]

    create_resp = await client.post(
        f"/api/v1/referrals/{referral_id}/follow-ups",
        headers=headers,
        json={"scheduled_at": "2030-01-01T10:00:00", "notes": "Check progress"},
    )
    assert create_resp.status_code == 201
    followup_id = create_resp.json()["id"]

    complete_resp = await client.patch(f"/api/v1/follow-ups/{followup_id}/complete", headers=headers)
    assert complete_resp.status_code == 200
    assert complete_resp.json()["completed"] is True


async def test_followup_on_other_patients_referral_rejected(client, patient_token):
    await _seed_test_facilities()
    headers_a = auth_headers(patient_token)
    rec_id = await _setup_to_referral(
        client, headers_a,
        symptoms={"chest_pain": True, "severity": 4},
        vitals={"heart_rate": 90, "spo2": 97, "blood_pressure_sys": 125, "blood_pressure_dia": 80, "body_temp_c": 37.0},
        patient_location={"location_lat": 22.701, "location_lng": 75.851},
    )
    referral_id = (await client.post("/api/v1/referrals/match", headers=headers_a, json={"recommendation_id": rec_id})).json()["id"]

    from tests.conftest import signup_and_login
    token_b = await signup_and_login(client, role="patient")
    headers_b = auth_headers(token_b)
    await client.post("/api/v1/patients/me", headers=headers_b, json={})

    resp = await client.post(
        f"/api/v1/referrals/{referral_id}/follow-ups",
        headers=headers_b,
        json={"scheduled_at": "2030-01-01T10:00:00"},
    )
    assert resp.status_code == 404
