import pytest

from tests.conftest import auth_headers

pytestmark = pytest.mark.asyncio


async def test_patient_cannot_create_facility(client, patient_token):
    resp = await client.post(
        "/api/v1/facilities",
        headers=auth_headers(patient_token),
        json={"name": "X", "type": "clinic", "location_lat": 22.7, "location_lng": 75.8},
    )
    assert resp.status_code == 403


async def test_admin_can_create_facility(client, admin_token):
    resp = await client.post(
        "/api/v1/facilities",
        headers=auth_headers(admin_token),
        json={"name": "Admin Clinic", "type": "clinic", "location_lat": 22.7, "location_lng": 75.8},
    )
    assert resp.status_code == 201
    assert resp.json()["name"] == "Admin Clinic"


async def test_any_authenticated_user_can_list_facilities(client, patient_token, admin_token):
    await client.post(
        "/api/v1/facilities",
        headers=auth_headers(admin_token),
        json={"name": "Visible Clinic", "type": "clinic", "location_lat": 22.7, "location_lng": 75.8},
    )
    resp = await client.get("/api/v1/facilities", headers=auth_headers(patient_token))
    assert resp.status_code == 200
    assert len(resp.json()) == 1


async def test_admin_bed_update_rejects_over_capacity(client, admin_token):
    headers = auth_headers(admin_token)
    facility = (await client.post(
        "/api/v1/facilities", headers=headers,
        json={"name": "Bed Test Clinic", "type": "clinic", "location_lat": 22.7, "location_lng": 75.8},
    )).json()

    # Insert a bed directly via DB session since there's no bed-creation endpoint yet
    from tests.conftest import TestSessionLocal
    from app.models import Bed
    import uuid as uuid_module

    async with TestSessionLocal() as db:
        bed = Bed(facility_id=uuid_module.UUID(facility["id"]), ward_type="general", total_count=10, available_count=5)
        db.add(bed)
        await db.commit()
        await db.refresh(bed)
        bed_id = str(bed.id)

    over_capacity_resp = await client.patch(
        f"/api/v1/facilities/{facility['id']}/beds/{bed_id}",
        headers=headers,
        json={"available_count": 999},
    )
    assert over_capacity_resp.status_code == 400

    valid_resp = await client.patch(
        f"/api/v1/facilities/{facility['id']}/beds/{bed_id}",
        headers=headers,
        json={"available_count": 3},
    )
    assert valid_resp.status_code == 200
    assert valid_resp.json()["available_count"] == 3


async def test_doctor_without_linked_record_gets_404(client):
    from tests.conftest import signup_and_login
    token = await signup_and_login(client, role="doctor")
    resp = await client.get("/api/v1/facilities/me/referrals", headers=auth_headers(token))
    assert resp.status_code == 404


async def test_patient_cannot_access_doctor_route(client, patient_token):
    resp = await client.get("/api/v1/facilities/me/referrals", headers=auth_headers(patient_token))
    assert resp.status_code == 403
