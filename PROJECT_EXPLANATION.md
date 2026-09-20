# Smart Health Grid Backend — Project & File Explanation Guide

This document provides a comprehensive explanation of every directory and file in the **Smart Health Grid Backend** codebase.

---

## 📐 Project Architecture Overview

**Smart Health Grid** is an AI-powered, real-time clinical triage, patient routing, resource matching, and care-coordination platform. Built with **FastAPI**, **SQLAlchemy Async (PostgreSQL)**, **Pydantic v2**, and **Google Gemini AI**, the backend provides:

1. **Role-Based Access Control (RBAC)**: Support for Admins, Doctors, Nurses, Paramedics, and Facility Managers.
2. **Clinical Risk Engine**: Hybrid clinical risk assessment combining deterministic NEWS2/EWS medical rules with Gemini LLM reasoning.
3. **Smart Facility Matching**: Real-time matching based on medical capability, ICU/general bed capacity, ventilator availability, and travel distance (Google Maps API + Haversine fallback).
4. **Care & Follow-up Lifecycle**: Inter-facility referral routing, transfer management, and post-referral recovery logs.

---

## 📁 Repository Directory Structure

```text
smart-health-grid-backend/
├── .dockerignore
├── .env
├── .env.example
├── DEPLOYMENT.md
├── Dockerfile
├── HACKATHON_PITCH.md
├── PROJECT_EXPLANATION.md (This File)
├── README.md
├── alembic.ini
├── docker-compose.yml
├── pytest.ini
├── requirements.txt
├── smart-health-grid-backend.zip
│
├── frontend/                     # Modern React Single Page Application (Vite + CSS Modules + Lucide)
│   ├── index.html                # Entry HTML with Google Fonts (Plus Jakarta Sans & Inter)
│   ├── package.json              # React, React Router DOM, Lucide React, Axios dependencies
│   ├── vite.config.js            # Vite configuration with API proxy to http://localhost:8000
│   └── src/
│       ├── main.jsx              # React DOM render root
│       ├── App.jsx               # Protected routes & client layout provider
│       ├── index.css             # Premium dark mode design tokens & glassmorphic styles
│       ├── components/
│       │   └── Navbar.jsx        # Navigation bar with role badges & profile controls
│       ├── context/
│       │   └── AuthContext.jsx   # Authentication context & role permission validator
│       ├── pages/
│       │   ├── Login.jsx         # Sign in page
│       │   ├── Register.jsx      # Role registration page
│       │   ├── Dashboard.jsx     # Overview dashboard & system status metrics
│       │   ├── TriageRiskAssessment.jsx # NEWS2 calculator & Gemini AI risk triage
│       │   ├── FacilityMatcher.jsx      # Hospital discovery & capability filter matrix
│       │   ├── ReferralsTracker.jsx     # Inter-hospital referral transfer lifecycle
│       │   ├── PatientsList.jsx         # Patient registry & doctor follow-up notes
│       │   └── CapacityManager.jsx      # Live hospital bed & ICU capacity manager
│       └── services/
│           └── api.js            # Axios REST API interceptors & service endpoints
│
├── alembic/

│   ├── README
│   ├── env.py
│   ├── script.py.mako
│   └── versions/
│       ├── 2267bef6fb34_initial_schema.py
│       └── c679453a793b_add_doctor_user_id_link.py
│
├── app/
│   ├── __init__.py
│   ├── main.py
│   │
│   ├── api/
│   │   ├── __init__.py
│   │   ├── deps.py
│   │   └── v1/
│   │       ├── __init__.py
│   │       └── endpoints/
│   │           ├── __init__.py
│   │           ├── auth.py
│   │           ├── facilities.py
│   │           ├── followups.py
│   │           ├── patients.py
│   │           ├── recommendations.py
│   │           ├── referrals.py
│   │           └── risk.py
│   │
│   ├── core/
│   │   ├── __init__.py
│   │   ├── config.py
│   │   ├── database.py
│   │   └── security.py
│   │
│   ├── models/
│   │   ├── __init__.py
│   │   ├── care.py
│   │   ├── enums.py
│   │   ├── facility.py
│   │   └── patient.py
│   │
│   ├── schemas/
│   │   ├── __init__.py
│   │   ├── auth.py
│   │   ├── facility.py
│   │   ├── followup.py
│   │   ├── patient.py
│   │   ├── recommendation.py
│   │   ├── referral.py
│   │   └── risk.py
│   │
│   ├── scripts/
│   │   ├── __init__.py
│   │   └── seed_facilities.py
│   │
│   └── services/
│       ├── __init__.py
│       ├── facility_matcher.py
│       ├── firebase_service.py
│       ├── gemini_client.py
│       ├── google_maps.py
│       ├── keyword_rules.py
│       ├── recommendation_engine.py
│       ├── risk_engine.py
│       ├── rules_engine.py
│       └── similarity_engine.py
│
├── static/
└── tests/
    ├── __init__.py
    ├── conftest.py
    ├── test_auth.py
    ├── test_patients.py
    ├── test_recommendations.py
    ├── test_referrals_and_followups.py
    ├── test_risk.py
    └── test_roles.py
```

---

## 🛠️ Root Configuration & Tooling Files

### 📄 [`.dockerignore`](file:///Users/veduu/Downloads/smart-health-grid-backend_4/.dockerignore)
- **Purpose**: Defines patterns for files and directories that should be excluded from the Docker build context.
- **Details**: Excludes virtual environments (`.venv`, `venv`), bytecode (`__pycache__`), local environment files (`.env`), test artifacts, and git directories to ensure lightweight and secure Docker builds.

### 📄 [`.env`](file:///Users/veduu/Downloads/smart-health-grid-backend_4/.env)
- **Purpose**: Active environment variable storage for local execution.
- **Details**: Contains sensitive key-value pairs like `DATABASE_URL` (PostgreSQL credentials), `SECRET_KEY` (JWT signature key), `GEMINI_API_KEY` (AI API integration key), `GOOGLE_MAPS_API_KEY`, and `ENVIRONMENT=development`.

### 📄 [`.env.example`](file:///Users/veduu/Downloads/smart-health-grid-backend_4/.env.example)
- **Purpose**: Template environment file committed to version control.
- **Details**: Documents all required and optional configuration keys without exposing real secret credentials. Serves as a guide when configuring new development, staging, or production environments.

### 📄 [`Dockerfile`](file:///Users/veduu/Downloads/smart-health-grid-backend_4/Dockerfile)
- **Purpose**: Container definition for building the FastAPI production image.
- **Details**: Uses `python:3.11-slim`, installs system dependencies, copies `requirements.txt`, installs Python packages, copies application code, exposes port 8000, and launches Uvicorn (`uvicorn app.main:app --host 0.0.0.0 --port 8000`).

### 📄 [`docker-compose.yml`](file:///Users/veduu/Downloads/smart-health-grid-backend_4/docker-compose.yml)
- **Purpose**: Multi-container orchestration specification for local development and integration testing.
- **Details**: Spawns two interconnected services:
  1. `db`: PostgreSQL container with environment credentials and persistent volume storage.
  2. `web`: FastAPI backend container depending on `db`, linking environment variables, and mapping port 8000.

### 📄 [`requirements.txt`](file:///Users/veduu/Downloads/smart-health-grid-backend_4/requirements.txt)
- **Purpose**: Defines Python library dependencies required by the project.
- **Details**: Key dependencies include:
  - `fastapi` & `uvicorn`: Web framework and ASGI server.
  - `sqlalchemy` & `asyncpg` / `psycopg2-binary`: Async ORM and PostgreSQL drivers.
  - `alembic`: Database migration tool.
  - `pydantic` & `pydantic-settings`: Data validation and environment settings management.
  - `python-jose` & `bcrypt`: Password hashing and JWT generation.
  - `google-generativeai`: SDK for Google Gemini LLM API.
  - `httpx`: Async HTTP client for external service calls.
  - `pytest` & `pytest-asyncio`: Automated test runner and async testing support.

### 📄 [`pytest.ini`](file:///Users/veduu/Downloads/smart-health-grid-backend_4/pytest.ini)
- **Purpose**: Configuration file for the `pytest` testing suite.
- **Details**: Specifies default command line options, test discovery patterns, and sets `asyncio_mode = auto` to seamlessly handle async test functions.

### 📄 [`alembic.ini`](file:///Users/veduu/Downloads/smart-health-grid-backend_4/alembic.ini)
- **Purpose**: Core configuration file for Alembic database migration management.
- **Details**: Defines database connection strings, migration script location (`alembic/`), template formatting, and logging configurations.

### 📄 [`smart-health-grid-backend.zip`](file:///Users/veduu/Downloads/smart-health-grid-backend_4/smart-health-grid-backend.zip)
- **Purpose**: Compressed zip archive containing a full code snapshot of the repository.

---

## 📖 Documentation Files

### 📄 [`README.md`](file:///Users/veduu/Downloads/smart-health-grid-backend_4/README.md)
- **Purpose**: Primary documentation for developers and reviewers.
- **Details**: Covers project mission, key features (Risk stratification, resource matching, referral routing), system architecture diagram, tech stack details, installation guide, API endpoint overview, and environment configurations.

### 📄 [`DEPLOYMENT.md`](file:///Users/veduu/Downloads/smart-health-grid-backend_4/DEPLOYMENT.md)
- **Purpose**: Technical deployment runbook.
- **Details**: Step-by-step instructions for deploying the backend to cloud platforms (Docker Compose, Render, Railway, AWS/GCP), configuring PostgreSQL database connections, managing environment variables, and running Alembic migrations in production.

### 📄 [`HACKATHON_PITCH.md`](file:///Users/veduu/Downloads/smart-health-grid-backend_4/HACKATHON_PITCH.md)
- **Purpose**: Presentation outline and hackathon pitch guide.
- **Details**: Explains the healthcare problem (patient overload, delayed triage, resource mismatching), Smart Health Grid solution, competitive advantages, clinical impact metrics, and step-by-step live demo script.

---

## 🗄️ Database Migrations (`alembic/`)

### 📄 [`alembic/env.py`](file:///Users/veduu/Downloads/smart-health-grid-backend_4/alembic/env.py)
- **Purpose**: Execution context script invoked when running Alembic migration commands (`alembic revision`, `alembic upgrade`).
- **Details**: Connects to the database engine (using `DATABASE_URL_SYNC` from app settings), imports SQLAlchemy `Base.metadata` from `app.models`, and executes migrations in online or offline mode.

### 📄 [`alembic/script.py.mako`](file:///Users/veduu/Downloads/smart-health-grid-backend_4/alembic/script.py.mako)
- **Purpose**: Mako template file used by Alembic to render new migration Python scripts.
- **Details**: Standardizes header comments, imports, `upgrade()`, and `downgrade()` boilerplate for newly generated migration files.

### 📄 [`alembic/README`](file:///Users/veduu/Downloads/smart-health-grid-backend_4/alembic/README)
- **Purpose**: Default Alembic help documentation explaining migration commands.

### 📄 [`alembic/versions/2267bef6fb34_initial_schema.py`](file:///Users/veduu/Downloads/smart-health-grid-backend_4/alembic/versions/2267bef6fb34_initial_schema.py)
- **Purpose**: Initial database schema migration script.
- **Details**: Creates initial database tables: `users`, `facilities`, `patients`, `referrals`, `followups`, and `risk_evaluations` along with their indexes and foreign key constraints.

### 📄 [`alembic/versions/c679453a793b_add_doctor_user_id_link.py`](file:///Users/veduu/Downloads/smart-health-grid-backend_4/alembic/versions/c679453a793b_add_doctor_user_id_link.py)
- **Purpose**: Database schema update migration script.
- **Details**: Adds `user_id` foreign key column to the `doctors` table to link clinical doctor profiles directly to registered `User` authentication records.

---

## ⚡ Application Core (`app/core/` & `app/main.py`)

### 📄 [`app/main.py`](file:///Users/veduu/Downloads/smart-health-grid-backend_4/app/main.py)
- **Purpose**: Application entry point and FastAPI initialization script.
- **Details**:
  - Instantiates `FastAPI(title="Smart Health Grid API")`.
  - Configures `CORSMiddleware` to allow cross-origin requests from frontend applications.
  - Implements `/health` endpoint for readiness probes.
  - Includes API router modules (`auth`, `patients`, `risk`, `recommendations`, `referrals`, `followups`, `facilities`) under `/api/v1`.
  - Mounts static files folder (`static/`) for web assets.

### 📄 [`app/core/config.py`](file:///Users/veduu/Downloads/smart-health-grid-backend_4/app/core/config.py)
- **Purpose**: Centralized application configuration powered by Pydantic `BaseSettings`.
- **Details**: Parses environment variables from `.env` with default fallbacks for:
  - Database URLs (`DATABASE_URL`, `DATABASE_URL_SYNC`).
  - Auth settings (`SECRET_KEY`, `ALGORITHM`, `ACCESS_TOKEN_EXPIRE_MINUTES`).
  - API Keys (`GEMINI_API_KEY`, `GOOGLE_MAPS_API_KEY`, `FIREBASE_PROJECT_ID`).
  - System environment (`ENVIRONMENT`).

### 📄 [`app/core/database.py`](file:///Users/veduu/Downloads/smart-health-grid-backend_4/app/core/database.py)
- **Purpose**: Database connection setup and session management.
- **Details**:
  - Initializes SQLAlchemy async engine (`create_async_engine`).
  - Configures `AsyncSessionLocal` session factory.
  - Defines declarative base model `Base(DeclarativeBase)`.
  - Provides `get_db()` async generator dependency yielding DB sessions for request lifecycle.

### 📄 [`app/core/security.py`](file:///Users/veduu/Downloads/smart-health-grid-backend_4/app/core/security.py)
- **Purpose**: Security helper utilities for authentication and password cryptography.
- **Details**:
  - `hash_password(password: str) -> str`: Uses `bcrypt` with salt to securely hash user passwords.
  - `verify_password(plain_password: str, hashed_password: str) -> bool`: Validates plain passwords against hashed database strings.
  - `create_access_token(subject: str, extra_claims: Optional[dict]) -> str`: Generates signed JWT tokens with expiration timestamps.
  - `decode_access_token(token: str) -> Optional[dict]`: Decodes and verifies incoming JWT tokens using the application `SECRET_KEY`.

### 📄 [`app/core/__init__.py`](file:///Users/veduu/Downloads/smart-health-grid-backend_4/app/core/__init__.py) & [`app/__init__.py`](file:///Users/veduu/Downloads/smart-health-grid-backend_4/app/__init__.py)
- **Purpose**: Python package markers identifying directory modules.

---

## 🗃️ Database Models (`app/models/`)

### 📄 [`app/models/enums.py`](file:///Users/veduu/Downloads/smart-health-grid-backend_4/app/models/enums.py)
- **Purpose**: Defines standardized system enumerations (`Enum`).
- **Details**:
  - `UserRole`: `ADMIN`, `DOCTOR`, `NURSE`, `PARAMEDIC`, `FACILITY_MANAGER`.
  - `RiskLevel`: `LOW`, `MEDIUM`, `HIGH`, `CRITICAL`.
  - `FacilityTier`: `PRIMARY`, `SECONDARY`, `TERTIARY`.
  - `ReferralStatus`: `PENDING`, `ACCEPTED`, `REJECTED`, `IN_TRANSIT`, `COMPLETED`, `CANCELLED`.
  - `UrgencyLevel`: `ROUTINE`, `URGENT`, `EMERGENCY`, `IMMEDIATE`.

### 📄 [`app/models/patient.py`](file:///Users/veduu/Downloads/smart-health-grid-backend_4/app/models/patient.py)
- **Purpose**: SQLAlchemy ORM model for Patient entities.
- **Details**: Maps the `patients` database table storing patient demographics (name, DOB, gender, blood group, emergency contact), medical history, chronic conditions, current location (latitude, longitude), and creation timestamps.

### 📄 [`app/models/facility.py`](file:///Users/veduu/Downloads/smart-health-grid-backend_4/app/models/facility.py)
- **Purpose**: SQLAlchemy ORM model for Healthcare Facilities.
- **Details**: Maps the `facilities` database table storing hospital name, tier, address, coordinates, total/available general beds, total/available ICU beds, ventilator count, specialty list (JSON array), phone number, and current load percentage.

### 📄 [`app/models/care.py`](file:///Users/veduu/Downloads/smart-health-grid-backend_4/app/models/care.py)
- **Purpose**: SQLAlchemy ORM models for User Auth, Referrals, Follow-ups, and Risk Logs.
- **Details**:
  - `User`: User auth credentials, hashed password, role, and associated facility ID.
  - `Referral`: Patient transfer record between originating facility and target facility with status and priority.
  - `FollowUp`: Post-care follow-up logs with clinical notes and recovery assessment.
  - `RiskEvaluationLog`: Audit log capturing input vitals, evaluation results, risk scores, and Gemini AI reasoning.

### 📄 [`app/models/__init__.py`](file:///Users/veduu/Downloads/smart-health-grid-backend_4/app/models/__init__.py)
- **Purpose**: Package exporter providing easy imports for all SQLAlchemy models (`User`, `Patient`, `HealthcareFacility`, `Referral`, `FollowUp`, `RiskEvaluationLog`).

---

## 📋 Data Schemas & DTOs (`app/schemas/`)

### 📄 [`app/schemas/auth.py`](file:///Users/veduu/Downloads/smart-health-grid-backend_4/app/schemas/auth.py)
- **Purpose**: Pydantic validation schemas for authentication workflows.
- **Details**: Defines `UserCreate`, `UserResponse`, `UserLogin`, `Token`, and `TokenData` schemas ensuring strict type validation on login/registration requests and responses.

### 📄 [`app/schemas/patient.py`](file:///Users/veduu/Downloads/smart-health-grid-backend_4/app/schemas/patient.py)
- **Purpose**: Pydantic schemas for patient management.
- **Details**: Includes `PatientCreate`, `PatientUpdate`, and `PatientResponse` for input validation when registering or updating patient records.

### 📄 [`app/schemas/facility.py`](file:///Users/veduu/Downloads/smart-health-grid-backend_4/app/schemas/facility.py)
- **Purpose**: Pydantic schemas for healthcare facility records.
- **Details**: Includes `FacilityCreate`, `FacilityUpdate`, `FacilityCapacityUpdate`, and `FacilityResponse` schemas for managing hospital capabilities, bed capacity updates, and search filters.

### 📄 [`app/schemas/risk.py`](file:///Users/veduu/Downloads/smart-health-grid-backend_4/app/schemas/risk.py)
- **Purpose**: Pydantic schemas for clinical risk intake and score outputs.
- **Details**: Defines `VitalsInput` (blood pressure, heart rate, SpO2, temp, GCS), `SymptomInput`, `RiskAssessmentRequest`, and `RiskAssessmentResponse` (risk level, NEWS score, recommended actions).

### 📄 [`app/schemas/recommendation.py`](file:///Users/veduu/Downloads/smart-health-grid-backend_4/app/schemas/recommendation.py)
- **Purpose**: Pydantic schemas for facility match recommendations.
- **Details**: Defines `RecommendationRequest`, `FacilityMatchDetail` (scoring breakdown, distance, ETA, bed availability), and `RecommendationResponse`.

### 📄 [`app/schemas/referral.py`](file:///Users/veduu/Downloads/smart-health-grid-backend_4/app/schemas/referral.py)
- **Purpose**: Pydantic schemas for patient transfer referrals.
- **Details**: Defines `ReferralCreate`, `ReferralUpdateStatus`, and `ReferralResponse` schemas validating inter-hospital transfer requests and status transitions.

### 📄 [`app/schemas/followup.py`](file:///Users/veduu/Downloads/smart-health-grid-backend_4/app/schemas/followup.py)
- **Purpose**: Pydantic schemas for post-referral patient monitoring.
- **Details**: Defines `FollowUpCreate` and `FollowUpResponse` for recording clinical notes, vital updates, and follow-up dates.

### 📄 [`app/schemas/__init__.py`](file:///Users/veduu/Downloads/smart-health-grid-backend_4/app/schemas/__init__.py)
- **Purpose**: Exports Pydantic schemas across the package.

---

## 🧠 Business Logic & AI Services (`app/services/`)

### 📄 [`app/services/gemini_client.py`](file:///Users/veduu/Downloads/smart-health-grid-backend_4/app/services/gemini_client.py)
- **Purpose**: Integration wrapper for Google Gemini AI.
- **Details**: Constructs structured clinical prompts containing patient vitals, symptoms, and history. Calls Gemini API (`google.generativeai`) to return structured JSON clinical reasoning, risk level, and emergency flags. Provides automatic mock fallback if no API key is provided or network calls fail.

### 📄 [`app/services/rules_engine.py`](file:///Users/veduu/Downloads/smart-health-grid-backend_4/app/services/rules_engine.py)
- **Purpose**: Deterministic medical rules engine.
- **Details**: Evaluates patient vital signs against established clinical protocol guidelines (such as NEWS2 / Early Warning Scores). Computes numeric score components for blood pressure, heart rate, oxygen saturation, temperature, and GCS, producing a baseline deterministic risk tier (`LOW`, `MEDIUM`, `HIGH`, `CRITICAL`).

### 📄 [`app/services/keyword_rules.py`](file:///Users/veduu/Downloads/smart-health-grid-backend_4/app/services/keyword_rules.py)
- **Purpose**: Symptom keyword mapping and triage rule dictionary.
- **Details**: Contains dictionary mappings of high-risk symptoms and chief complaint keywords (e.g. "chest pain", "shortness of breath", "stroke", "unconscious", "haemorrhage") to specific medical specialties, urgency ratings, and clinical flags.

### 📄 [`app/services/risk_engine.py`](file:///Users/veduu/Downloads/smart-health-grid-backend_4/app/services/risk_engine.py)
- **Purpose**: Core risk assessment orchestrator.
- **Details**: Combines output from deterministic `rules_engine.py` and generative `gemini_client.py`. Synthesizes final risk level, clinical urgency rating, reasoning summary, and suggested immediate actions. Logs evaluation history to database.

### 📄 [`app/services/facility_matcher.py`](file:///Users/veduu/Downloads/smart-health-grid-backend_4/app/services/facility_matcher.py)
- **Purpose**: Intelligent hospital matching and scoring engine.
- **Details**: Filters candidate hospitals by required specialty, minimum facility tier, ICU/general bed availability, and ventilator count. Calculates travel distance and ranks facilities using a weighted composite score:
  $$\text{Score} = w_d \cdot \text{DistanceScore} + w_b \cdot \text{CapacityScore} + w_t \cdot \text{TierMatchScore}$$

### 📄 [`app/services/recommendation_engine.py`](file:///Users/veduu/Downloads/smart-health-grid-backend_4/app/services/recommendation_engine.py)
- **Purpose**: Higher-level pipeline coordinator.
- **Details**: Connects patient intake, calls `risk_engine` for risk assessment, runs `facility_matcher` for hospital routing, and constructs full recommendation payloads for API consumers.

### 📄 [`app/services/similarity_engine.py`](file:///Users/veduu/Downloads/smart-health-grid-backend_4/app/services/similarity_engine.py)
- **Purpose**: Historical patient case similarity engine.
- **Details**: Computes similarity scores between a current patient case and historical database records (using vitals normalized distance and symptom Jaccard index) to recommend proven care pathways.

### 📄 [`app/services/google_maps.py`](file:///Users/veduu/Downloads/smart-health-grid-backend_4/app/services/google_maps.py)
- **Purpose**: Google Maps API integration service.
- **Details**: Fetches driving distance and real-time transit times using Google Maps Distance Matrix API. Includes Haversine formula calculation as a fallback when the API key is not configured.

### 📄 [`app/services/firebase_service.py`](file:///Users/veduu/Downloads/smart-health-grid-backend_4/app/services/firebase_service.py)
- **Purpose**: Push notification service wrapper.
- **Details**: Sends Firebase Cloud Messaging (FCM) push alerts to mobile apps or emergency dispatch dashboards when critical referrals or high-risk cases are created.

### 📄 [`app/services/__init__.py`](file:///Users/veduu/Downloads/smart-health-grid-backend_4/app/services/__init__.py)
- **Purpose**: Service module package marker.

---

## 🌐 API Routes & Dependencies (`app/api/`)

### 📄 [`app/api/deps.py`](file:///Users/veduu/Downloads/smart-health-grid-backend_4/app/api/deps.py)
- **Purpose**: Shared FastAPI dependency injection providers.
- **Details**:
  - `get_current_user`: Extracts Bearer token from authorization header, decodes JWT, queries DB, and returns authenticated `User`.
  - `require_role(*allowed_roles)`: Dependency factory enforcing Role-Based Access Control (RBAC), throwing `403 FORBIDDEN` if user lacks required role.

### 📄 [`app/api/v1/endpoints/auth.py`](file:///Users/veduu/Downloads/smart-health-grid-backend_4/app/api/v1/endpoints/auth.py)
- **Purpose**: Authentication REST endpoints.
- **Details**:
  - `POST /api/v1/auth/register`: User registration endpoint.
  - `POST /api/v1/auth/login`: Authenticates credentials and returns JWT token.
  - `GET /api/v1/auth/me`: Returns profile of currently logged-in user.

### 📄 [`app/api/v1/endpoints/patients.py`](file:///Users/veduu/Downloads/smart-health-grid-backend_4/app/api/v1/endpoints/patients.py)
- **Purpose**: Patient management REST endpoints.
- **Details**: Provides CRUD routes (`POST /`, `GET /`, `GET /{id}`, `PUT /{id}`, `DELETE /{id}`) to register patients, update medical histories, and query patient records.

### 📄 [`app/api/v1/endpoints/facilities.py`](file:///Users/veduu/Downloads/smart-health-grid-backend_4/app/api/v1/endpoints/facilities.py)
- **Purpose**: Healthcare facility REST endpoints.
- **Details**: Allows listing hospitals, creating new facility entries, retrieving details, and updating bed/ICU/ventilator capacity (`PATCH /{id}/capacity`).

### 📄 [`app/api/v1/endpoints/risk.py`](file:///Users/veduu/Downloads/smart-health-grid-backend_4/app/api/v1/endpoints/risk.py)
- **Purpose**: Clinical risk assessment endpoint.
- **Details**: Provides `POST /api/v1/risk/assess` endpoint to run real-time clinical triage evaluation on patient vitals and symptoms.

### 📄 [`app/api/v1/endpoints/recommendations.py`](file:///Users/veduu/Downloads/smart-health-grid-backend_4/app/api/v1/endpoints/recommendations.py)
- **Purpose**: Facility recommendation and routing endpoint.
- **Details**: Provides `POST /api/v1/recommendations/match` endpoint to evaluate patient risk and return ranked suitable facilities.

### 📄 [`app/api/v1/endpoints/referrals.py`](file:///Users/veduu/Downloads/smart-health-grid-backend_4/app/api/v1/endpoints/referrals.py)
- **Purpose**: Inter-facility referral routing endpoints.
- **Details**: Routes for creating patient transfers (`POST /`), retrieving referrals (`GET /`), and updating transfer status (`PATCH /{id}/status` - e.g., PENDING -> ACCEPTED -> IN_TRANSIT -> COMPLETED).

### 📄 [`app/api/v1/endpoints/followups.py`](file:///Users/veduu/Downloads/smart-health-grid-backend_4/app/api/v1/endpoints/followups.py)
- **Purpose**: Post-care follow-up logging endpoints.
- **Details**: Routes (`POST /patients/{id}/followups`, `GET /patients/{id}/followups`) to add and view follow-up progress notes recorded by doctors.

### 📄 [`app/api/__init__.py`](file:///Users/veduu/Downloads/smart-health-grid-backend_4/app/api/__init__.py), [`app/api/v1/__init__.py`](file:///Users/veduu/Downloads/smart-health-grid-backend_4/app/api/v1/__init__.py), [`app/api/v1/endpoints/__init__.py`](file:///Users/veduu/Downloads/smart-health-grid-backend_4/app/api/v1/endpoints/__init__.py)
- **Purpose**: Package initialization files for API routing modules.

---

## 📜 Utility Scripts (`app/scripts/`)

### 📄 [`app/scripts/seed_facilities.py`](file:///Users/veduu/Downloads/smart-health-grid-backend_4/app/scripts/seed_facilities.py)
- **Purpose**: Database seeding script.
- **Details**: Populates PostgreSQL with initial sample healthcare facilities (primary clinics, secondary community hospitals, tertiary trauma centers) with sample locations, bed counts, and specialty capabilities for testing and demo purposes.

### 📄 [`app/scripts/__init__.py`](file:///Users/veduu/Downloads/smart-health-grid-backend_4/app/scripts/__init__.py)
- **Purpose**: Script directory package marker.

---

## 🧪 Test Suite (`tests/`)

### 📄 [`tests/conftest.py`](file:///Users/veduu/Downloads/smart-health-grid-backend_4/tests/conftest.py)
- **Purpose**: Pytest configuration and shared fixtures.
- **Details**: Configures test database session (in-memory SQLite / async Postgres), test HTTP client (`httpx.AsyncClient`), and reusable test user fixtures (admin, doctor, paramedic tokens).

### 📄 [`tests/test_auth.py`](file:///Users/veduu/Downloads/smart-health-grid-backend_4/tests/test_auth.py)
- **Purpose**: Authentication test cases.
- **Details**: Tests user registration, password verification, valid/invalid login attempts, and JWT token decoding.

### 📄 [`tests/test_patients.py`](file:///Users/veduu/Downloads/smart-health-grid-backend_4/tests/test_patients.py)
- **Purpose**: Patient endpoint test cases.
- **Details**: Tests patient registration, field updates, validation errors, and RBAC permission checks.

### 📄 [`tests/test_roles.py`](file:///Users/veduu/Downloads/smart-health-grid-backend_4/tests/test_roles.py)
- **Purpose**: Role-Based Access Control test cases.
- **Details**: Validates that unauthorized roles (e.g. Paramedic) cannot perform admin or doctor-restricted actions.

### 📄 [`tests/test_risk.py`](file:///Users/veduu/Downloads/smart-health-grid-backend_4/tests/test_risk.py)
- **Purpose**: Clinical risk engine test cases.
- **Details**: Tests NEWS2 rule engine outputs against known clinical input scenarios (normal vitals vs severe hypoxia or hypotension).

### 📄 [`tests/test_recommendations.py`](file:///Users/veduu/Downloads/smart-health-grid-backend_4/tests/test_recommendations.py)
- **Purpose**: Recommendation engine test cases.
- **Details**: Integration tests verifying facility matching logic based on distance, specialty, and bed availability.

### 📄 [`tests/test_referrals_and_followups.py`](file:///Users/veduu/Downloads/smart-health-grid-backend_4/tests/test_referrals_and_followups.py)
- **Purpose**: Referral and follow-up lifecycle test cases.
- **Details**: Tests creation of referrals, status transition updates, and follow-up note additions.

### 📄 [`tests/__init__.py`](file:///Users/veduu/Downloads/smart-health-grid-backend_4/tests/__init__.py)
- **Purpose**: Test package marker.

---

## 🌐 Static Assets (`static/`)

### 📁 [`static/`](file:///Users/veduu/Downloads/smart-health-grid-backend_4/static/)
- **Purpose**: Directory for serving static assets.
- **Details**: Served by FastAPI (`app.mount("/", StaticFiles(directory="static", html=True), name="static")`) to deliver web assets or demo user interface files.

---

## 💡 Summary Matrix

| Category | Key Files | Primary Responsibility |
| :--- | :--- | :--- |
| **Config & Docker** | `.env`, `Dockerfile`, `docker-compose.yml`, `config.py` | Environment settings, containerization & DB connection |
| **Database & Migrations** | `database.py`, `alembic/`, `models/` | PostgreSQL ORM models & version-controlled schema migrations |
| **Auth & Security** | `security.py`, `deps.py`, `auth.py` | Password hashing, JWT token creation, RBAC validation |
| **Clinical AI & Matching** | `gemini_client.py`, `risk_engine.py`, `facility_matcher.py` | AI triage, NEWS2 rules scoring & hospital resource matching |
| **API Layer** | `main.py`, `endpoints/*.py`, `schemas/*.py` | REST API endpoints & Pydantic request/response validation |
| **Testing Suite** | `conftest.py`, `tests/test_*.py` | Automated unit & integration tests covering workflow |
