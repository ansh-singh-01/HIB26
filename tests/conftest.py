import uuid

import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker

from app.core.database import Base, get_db
from app.main import app
import os

TEST_DATABASE_URL = os.getenv("TEST_DATABASE_URL", "sqlite+aiosqlite:///./test_smart_health_grid.db")

# Populated by the setup_db fixture, read by the get_db override -- must be
# created fresh inside each test's event loop, since asyncpg connections
# can't cross event loops (pytest-asyncio spins up a new loop per test).
TestSessionLocal = None


@pytest_asyncio.fixture(scope="function", autouse=True)
async def setup_db():
    global TestSessionLocal
    engine = create_async_engine(TEST_DATABASE_URL)
    TestSessionLocal = async_sessionmaker(bind=engine, expire_on_commit=False)

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)

    yield

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await engine.dispose()
    TestSessionLocal = None


async def _override_get_db():
    async with TestSessionLocal() as session:
        yield session


app.dependency_overrides[get_db] = _override_get_db


@pytest_asyncio.fixture
async def client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


async def signup_and_login(client: AsyncClient, role: str = "patient", email: str | None = None) -> str:
    """Returns a bearer token for a freshly created user with the given role."""
    email = email or f"{role}_{uuid.uuid4().hex[:10]}@test.com"
    resp = await client.post(
        "/api/v1/auth/signup",
        json={"email": email, "password": "secret123", "full_name": f"Test {role.title()}", "role": role},
    )
    assert resp.status_code == 201, resp.text
    return resp.json()["access_token"]


@pytest_asyncio.fixture
async def patient_token(client):
    return await signup_and_login(client, role="patient")


@pytest_asyncio.fixture
async def admin_token(client):
    return await signup_and_login(client, role="admin")


def auth_headers(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}
