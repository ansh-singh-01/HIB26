import pytest

from tests.conftest import auth_headers

pytestmark = pytest.mark.asyncio


async def test_signup_returns_token(client):
    resp = await client.post(
        "/api/v1/auth/signup",
        json={"email": "new@test.com", "password": "secret123", "full_name": "New User", "role": "patient"},
    )
    assert resp.status_code == 201
    body = resp.json()
    assert body["token_type"] == "bearer"
    assert body["user"]["email"] == "new@test.com"
    assert body["user"]["role"] == "patient"


async def test_signup_duplicate_email_rejected(client):
    payload = {"email": "dupe@test.com", "password": "secret123", "full_name": "Dupe", "role": "patient"}
    first = await client.post("/api/v1/auth/signup", json=payload)
    assert first.status_code == 201

    second = await client.post("/api/v1/auth/signup", json=payload)
    assert second.status_code == 400


async def test_login_success(client):
    await client.post(
        "/api/v1/auth/signup",
        json={"email": "loginme@test.com", "password": "secret123", "full_name": "Login Me", "role": "patient"},
    )
    resp = await client.post(
        "/api/v1/auth/login",
        data={"username": "loginme@test.com", "password": "secret123"},
    )
    assert resp.status_code == 200
    assert "access_token" in resp.json()


async def test_login_wrong_password_rejected(client):
    await client.post(
        "/api/v1/auth/signup",
        json={"email": "wrongpw@test.com", "password": "correct123", "full_name": "X", "role": "patient"},
    )
    resp = await client.post(
        "/api/v1/auth/login",
        data={"username": "wrongpw@test.com", "password": "incorrect"},
    )
    assert resp.status_code == 401


async def test_protected_route_requires_token(client):
    resp = await client.get("/api/v1/patients/me")
    assert resp.status_code == 401


async def test_protected_route_with_token(client, patient_token):
    resp = await client.get("/api/v1/patients/me", headers=auth_headers(patient_token))
    # 404 because no profile created yet -- but crucially NOT 401
    assert resp.status_code == 404
