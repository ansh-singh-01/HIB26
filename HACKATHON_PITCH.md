# 🏆 Smart Health Grid — Hackathon Pitch & Live Demo Guide

Use this guide when pitching your project to hackathon judges!

---

## 🎯 1-Minute Elevator Pitch

> *"Traditional healthcare navigation is fragmented — patients with critical symptoms often spend hours searching for the right specialist or end up at overcrowded hospitals with no open beds. **Smart Health Grid** solves this with an end-to-end 5-stage clinical intelligence engine. It combines real-time wearable vitals, safety-first rule engine triage, Google Gemini AI clinical reasoning, and live hospital resource matching (beds, specialists, equipment) to route patients to the nearest qualified facility in seconds."*

---

## 💡 Top 4 Technical Highlights to Emphasize to Judges

1. **Safety-First Hybrid AI Architecture**:
   - Critical vitals (e.g. SpO2 < 90%, Systolic BP > 180) automatically **short-circuit** through a deterministic Clinical Rule Engine into Immediate Emergency mode.
   - Saves critical seconds and guarantees zero AI hallucination for life-threatening emergencies, while leveraging Google Gemini for nuanced symptom triage on non-critical cases.

2. **Real-Time Resource & Geographic Matching**:
   - Calculates Haversine distances to nearby medical facilities.
   - Dynamically checks real-time bed availability (ICU, Emergency, General) and specialist availability before routing patients.

3. **Multi-Role RBAC & Care Continuity**:
   - Enforces ownership & role isolation for **Patients**, **Doctors**, and **Admins**.
   - Integrates post-referral follow-up tracking to ensure care compliance.

4. **Production-Ready & Fully Tested**:
   - 30 automated integration & unit tests (`pytest`).
   - Async SQLAlchemy 2.0 + PostgreSQL + Alembic database migrations.

---

## 🚀 3-Minute Live Demo Flow for Judges

### Demo Option A: Interactive Web UI ([http://localhost:8000/](http://localhost:8000/))

1. **Step 1: Patient Data Intake & Vitals**
   - Click *Login / Register* as patient.
   - Log symptoms (e.g. *Chest Pain*, *Shortness of Breath*) and Vitals (HR: `115`, BP: `165/105`).
   - Click **Submit Symptoms & Vitals**.

2. **Step 2: AI Clinical Triage & Risk Score**
   - Click **Run Risk Engine Assessment**.
   - Show judges the calculated **Risk Score (0.85)**, **Emergency Urgency Badge**, and AI Clinical Rationale.

3. **Step 3: Recommendation Routing**
   - Click **Generate Specialty Recommendation**.
   - Show the determined specialty (**Cardiology**) and required diagnostic services (**ECG, Cardiac Enzymes**).

4. **Step 4 & 5: Hospital Matching & Follow-Up**
   - Click **Match Nearest Facility & Create Referral**.
   - Show the matched hospital (**MY Hospital, Indore**) and assigned specialist (**Dr. Vikram Malhotra**).
   - Click **Schedule 7-Day Follow-Up** to demonstrate care monitoring.

5. **Resource Grid View**
   - Switch to **Hospital & Resource Grid** tab to show live bed capacities, equipment stock, and admin controls.

---

### Demo Option B: Interactive Swagger API ([http://localhost:8000/docs](http://localhost:8000/docs))

- Show judges the organized 5-stage endpoint routes (`/patients`, `/risk`, `/recommendations`, `/referrals`, `/facilities`).
- Execute `POST /api/v1/risk/assess` live to showcase response latency and structured Pydantic outputs.
