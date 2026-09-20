# Smart Health Grid — Backend API

An intelligent, end-to-end healthcare pipeline built with **FastAPI**, **PostgreSQL**, **SQLAlchemy (Async)**, **Alembic**, and **Google Gemini AI**.

Smart Health Grid connects patient data intake, AI-driven clinical triage, medical recommendation routing, real-time hospital resource matching, and care follow-up scheduling.

> 🏆 **Hackathon Presentation & Demo Guide**: See [HACKATHON_PITCH.md](file:///Users/veduu/Downloads/smart-health-grid-backend_4/HACKATHON_PITCH.md) for pitch scripts and judge walkthroughs.
> 
> 🌐 **Interactive Demo Dashboard**: Available live at [http://localhost:8000/](http://localhost:8000/) when server is running.

---

## 🏗️ System Architecture & 5-Stage Pipeline

```
  [Stage 1: Patient Data]
  ├── Patient Profile & History
  ├── Reported Symptoms (Structured + Free Text)
  └── Wearable Vitals (HR, BP, SpO2, Temp, Resp Rate)
            │
            ▼
  [Stage 2: AI Clinical Triage]
  ├── Emergency Rule Engine (Vitals Threshold Evaluation)
  └── Gemini AI Analysis Engine (Deterministic Mock Fallback)
            │
            ▼
  [Stage 3: Recommendation Routing]
  ├── Specialty Determination (Cardiology, Neurology, Emergency Medicine, etc.)
  └── Diagnostic Service Mapping (ECG, CT, MRI, Blood Panel)
            │
            ▼
  [Stage 4: Resource Availability & Matching]
  ├── Haversine Geographic Distance Calculation
  ├── Emergency Mode: Nearest facility with available Beds (ICU/Emergency)
  └── Specialist Mode: Nearest facility with matching Doctor specialty
            │
            ▼
  [Stage 5: Care & Follow-Up]
  ├── Automated Referral Creation
  ├── Doctor Assignment & Navigation Routing
  └── Follow-Up Task Scheduling & Completion Tracking
```

---

## ✨ Features

- **End-to-End Clinical Pipeline**: Automated 5-stage workflow from symptom logging to hospital bed booking and follow-up tracking.
- **Rule Engine & AI Hybrid Triage**: Short-circuits critical vitals directly into high-urgency emergency mode while using Google Gemini for nuanced symptom triage.
- **Geographic & Resource Matching**: Matches patients to nearby medical facilities based on Haversine distance, specialist availability, bed capacity (ICU, Emergency, General), equipment, and medicine stocks.
- **Role-Based Access Control (RBAC)**: Secure access control enforced via OAuth2 JWT tokens for **Patient**, **Doctor**, and **Admin** roles.
- **Doctor Account Linking**: Dedicated Admin endpoint (`PATCH /api/v1/facilities/doctors/{id}/link-user`) allowing admins to link doctor logins to facility records.
- **Full Automated Test Coverage**: 30 isolated unit and integration tests covering all pipeline stages and security boundaries.

---

## 🛠️ Tech Stack & Dependencies

- **Framework**: FastAPI 0.115
- **Database**: PostgreSQL 15/16 + asyncpg & psycopg2
- **ORM & Migrations**: SQLAlchemy 2.0 (Async) + Alembic 1.13
- **Authentication**: Direct `bcrypt` password hashing + JWT tokens (`python-jose`)
- **AI Integration**: Google Generative AI SDK (`google-generativeai`)
- **Testing**: `pytest`, `pytest-asyncio`, `httpx`

---

## 🚀 Quick Start (Docker — Recommended)

### 1. Configure Environment
```bash
cp .env.example .env
```

### 2. Start Services via Docker Compose
```bash
docker compose up --build -d
```
This spins up PostgreSQL and the FastAPI server. The backend automatically runs Alembic migrations (`alembic upgrade head`) before opening port `8000`.

### 3. Seed Facility Data
```bash
docker compose exec api python -m app.scripts.seed_facilities
```

### 4. Access Interactive API Documentation
- **Swagger UI**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **ReDoc**: [http://localhost:8000/redoc](http://localhost:8000/redoc)

---

## ⚙️ Quick Start (Manual / Local Setup)

### 1. Create Virtual Environment & Install Dependencies
```bash
python3 -m venv .venv
source .venv/bin/activate       # On Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

### 2. Start PostgreSQL Container
```bash
docker run --name shg-postgres \
  -e POSTGRES_USER=shg_user \
  -e POSTGRES_PASSWORD=shg_pass \
  -e POSTGRES_DB=smart_health_grid \
  -p 5433:5432 -d postgres:16
```

### 3. Configure `.env`
Ensure `.env` matches your database port and credentials:
```env
PROJECT_NAME="Smart Health Grid Backend"
ENVIRONMENT="development"
DEBUG=True

DATABASE_URL="postgresql+asyncpg://shg_user:shg_pass@localhost:5433/smart_health_grid"
DATABASE_URL_SYNC="postgresql+psycopg2://shg_user:shg_pass@localhost:5433/smart_health_grid"

SECRET_KEY="dev-secret-change-me"
ALGORITHM="HS256"
ACCESS_TOKEN_EXPIRE_MINUTES=60

# Optional: Set real Gemini API Key (leave empty to use deterministic clinical mock)
GEMINI_API_KEY=""
```

### 4. Run Database Migrations
```bash
alembic upgrade head
```

### 5. Seed Test Facility Data
Seeds 5 fictional Indore-area hospitals/clinics with doctors, bed capacities, equipment, and medicine stocks:
```bash
python -m app.scripts.seed_facilities
```

### 6. Start API Server
```bash
uvicorn app.main:app --port 8000 --reload
```

---

## 🧪 Running Automated Tests

Tests execute against an isolated test database (`smart_health_grid_test`) to prevent modifying development data.

### 1. Create Test Database (One-time)
```bash
docker exec shg-postgres psql -U shg_user -d postgres -c "CREATE DATABASE smart_health_grid_test OWNER shg_user;"
```

### 2. Execute Pytest Suite
```bash
pytest -v
```

> **Test Suite Coverage (30 Tests Passing)**:
> - User Signup & JWT Authentication
> - Patient Profile, Symptom & Vital Logging
> - Rule Engine & AI Risk Assessment
> - Clinical Recommendation Routing & Emergency Override
> - Specialist vs. Emergency Facility Matching
> - Follow-Up Scheduling & Status Updating
> - Role-Based Access Controls & Doctor Account Linking

---

## 📡 API Endpoint Reference Table

| Category | Method | Endpoint | Access Role | Description |
| :--- | :--- | :--- | :--- | :--- |
| **Auth** | `POST` | `/api/v1/auth/signup` | Public | Register new user (`patient`, `doctor`, or `admin`) |
| **Auth** | `POST` | `/api/v1/auth/login` | Public | Authenticate user & return JWT token |
| **Stage 1** | `POST` | `/api/v1/patients/me` | Patient | Create or update patient profile |
| **Stage 1** | `GET` | `/api/v1/patients/me` | Patient | Fetch patient profile |
| **Stage 1** | `POST` | `/api/v1/patients/me/symptoms` | Patient | Log patient symptoms (structured + free text) |
| **Stage 1** | `POST` | `/api/v1/patients/me/vitals` | Patient | Log vital signs (HR, BP, SpO2, Temp, Resp Rate) |
| **Stage 2** | `POST` | `/api/v1/risk/assess` | Patient | Run clinical triage & AI risk assessment |
| **Stage 2** | `GET` | `/api/v1/risk/history` | Patient | Fetch history of risk assessments |
| **Stage 3** | `POST` | `/api/v1/recommendations/generate` | Patient | Generate specialty & diagnostic service recommendation |
| **Stage 3** | `GET` | `/api/v1/recommendations/history` | Patient | Fetch recommendation history |
| **Stage 4** | `GET` | `/api/v1/facilities` | Authenticated | List all medical facilities |
| **Stage 4** | `GET` | `/api/v1/facilities/doctors` | Authenticated | List doctors across facilities |
| **Stage 4** | `POST` | `/api/v1/facilities` | Admin | Create a new facility record |
| **Stage 4** | `PATCH` | `/api/v1/facilities/{id}/beds/{id}` | Admin | Update ward bed capacity |
| **Stage 4** | `PATCH` | `/api/v1/facilities/doctors/{id}/link-user` | Admin | Link Doctor record to a Doctor user login ID |
| **Stage 5** | `POST` | `/api/v1/referrals/match` | Patient | Find nearest facility & create care referral |
| **Stage 5** | `GET` | `/api/v1/facilities/me/referrals` | Doctor | View referrals assigned to logged-in doctor |
| **Stage 5** | `POST` | `/api/v1/referrals/{id}/follow-ups` | Patient | Schedule follow-up appointment |
| **Stage 5** | `PATCH` | `/api/v1/follow-ups/{id}/complete` | Doctor / Patient | Mark follow-up appointment completed |
| **Stage 5** | `GET` | `/api/v1/follow-ups/due` | Authenticated | List due follow-up tasks |

---

## 📁 Project Directory Structure

```
smart-health-grid-backend/
├── alembic/                    # Database migration scripts
│   ├── versions/              # Revision files
│   └── env.py                 # Migration configuration
├── app/
│   ├── api/
│   │   ├── deps.py            # Security & DB dependencies
│   │   └── v1/endpoints/      # API Route Handlers
│   │       ├── auth.py
│   │       ├── facilities.py
│   │       ├── followups.py
│   │       ├── patients.py
│   │       ├── recommendations.py
│   │       ├── referrals.py
│   │       └── risk.py
│   ├── core/
│   │   ├── config.py          # Environment settings
│   │   ├── database.py        # Async SQLAlchemy engine
│   │   └── security.py        # Password hashing & JWT
│   ├── models/                # SQLAlchemy Models
│   │   ├── enums.py
│   │   ├── patient.py
│   │   ├── facility.py
│   │   └── care.py
│   ├── schemas/               # Pydantic Request/Response Models
│   ├── scripts/
│   │   └── seed_facilities.py # Facility seeder script
│   ├── services/              # Core Domain Engines
│   │   ├── rules_engine.py
│   │   ├── gemini_client.py
│   │   ├── risk_engine.py
│   │   ├── keyword_rules.py
│   │   ├── recommendation_engine.py
│   │   └── facility_matcher.py
│   └── main.py                # FastAPI Application Entrypoint
├── tests/                     # Pytest suite
│   ├── conftest.py
│   ├── test_auth.py
│   ├── test_patients.py
│   ├── test_recommendations.py
│   ├── test_referrals_and_followups.py
│   ├── test_risk.py
│   └── test_roles.py
├── .env                       # Environment variables
├── Dockerfile                 # Container definition
├── docker-compose.yml         # Compose configuration
├── pytest.ini                 # Pytest configuration
└── requirements.txt           # Python dependencies
```
#   H I B 2 6  
 