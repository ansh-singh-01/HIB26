"""
Smart Health Grid - Realistic Indore Healthcare Data Seeder
Populates the database with realistic patients, doctors, Indore health facilities,
wearable telemetry streams, medical histories, medications, allergies, diagnostic tests,
risk assessments, recommendations, referrals, and care encounters using Faker.
"""

import asyncio
import random
import uuid
from datetime import datetime, timedelta
from faker import Faker

from sqlalchemy import select
from app.core.database import Base, engine, AsyncSessionLocal
from app.core.security import hash_password
from app.models import (
    User, Patient, SymptomReport, WearableReading, MedicalHistoryRecord,
    PatientMedication, PatientAllergy, MedicalTestRecord, CareEncounter,
    Facility, Bed, Doctor, Equipment, MedicineStock,
    RiskAssessment, Recommendation, Referral, FollowUp
)
from app.models.enums import UserRole, FacilityType, UrgencyLevel, RecommendationStatus

fake = Faker('en_IN')
Faker.seed(42)
random.seed(42)

INDORE_FACILITIES = [
    {
        "name": "Maharaja Yashwantrao Hospital (MYH Indore)",
        "type": FacilityType.TERTIARY,
        "lat": 22.7161,
        "lng": 75.8767,
        "address": "MY Hospital Campus, Residency Area, Indore, MP 452001",
        "phone": "+91 731 2527201",
        "beds": [
            {"ward_type": "general", "total": 150, "avail": 42},
            {"ward_type": "icu", "total": 35, "avail": 8},
            {"ward_type": "emergency", "total": 20, "avail": 5},
        ],
        "equipment": [
            {"name": "Ventilator", "total": 25, "avail": 8},
            {"name": "ECG Machine", "total": 15, "avail": 12},
            {"name": "Oxygen Concentrator", "total": 40, "avail": 28},
            {"name": "X-Ray Machine", "total": 8, "avail": 6},
            {"name": "Defibrillator", "total": 10, "avail": 8},
        ],
        "doctors": [
            {"name": "Dr. Rajesh Sharma", "specialty": "cardiology"},
            {"name": "Dr. Sunita Verma", "specialty": "pulmonology"},
            {"name": "Dr. Amit Tandon", "specialty": "emergency_medicine"},
            {"name": "Dr. Vikramaditya Joshi", "specialty": "neurology"},
            {"name": "Dr. Meenakshi Gupta", "specialty": "general_surgery"},
        ],
        "medicines": [
            {"name": "Paracetamol 500mg", "qty": 1200},
            {"name": "Amoxicillin 500mg", "qty": 850},
            {"name": "Nitroglycerin 0.4mg", "qty": 300},
            {"name": "Salbutamol Inhaler", "qty": 180},
            {"name": "Medical Oxygen Cylinder 40L", "qty": 95},
            {"name": "Heparin Injection", "qty": 220},
        ]
    },
    {
        "name": "Bombay Hospital Indore",
        "type": FacilityType.HOSPITAL,
        "lat": 22.7533,
        "lng": 75.8937,
        "address": "Ring Road, Eastern Ring Rd, Scheme No 94, Indore, MP 452010",
        "phone": "+91 731 2438000",
        "beds": [
            {"ward_type": "general", "total": 120, "avail": 32},
            {"ward_type": "icu", "total": 25, "avail": 6},
            {"ward_type": "emergency", "total": 15, "avail": 4},
        ],
        "equipment": [
            {"name": "Ventilator", "total": 18, "avail": 5},
            {"name": "ECG Machine", "total": 10, "avail": 8},
            {"name": "CT Scanner", "total": 3, "avail": 2},
            {"name": "Oxygen Concentrator", "total": 30, "avail": 20},
        ],
        "doctors": [
            {"name": "Dr. Anand Kumar Jain", "specialty": "cardiology"},
            {"name": "Dr. Priyanka Kulkarni", "specialty": "neurology"},
            {"name": "Dr. Sanjay Choudhary", "specialty": "pulmonology"},
            {"name": "Dr. Alok Agrawal", "specialty": "emergency_medicine"},
        ],
        "medicines": [
            {"name": "Aspirin 75mg", "qty": 1500},
            {"name": "Atorvastatin 20mg", "qty": 900},
            {"name": "Clopidogrel 75mg", "qty": 600},
            {"name": "Insulin Human 40IU/ml", "qty": 350},
            {"name": "Medical Oxygen Cylinder 40L", "qty": 70},
        ]
    },
    {
        "name": "CHC Vijay Nagar Health Centre",
        "type": FacilityType.CHC,
        "lat": 22.7539,
        "lng": 75.8924,
        "address": "AB Rd, Vijay Nagar Square, Indore, MP 452010",
        "phone": "+91 731 2551122",
        "beds": [
            {"ward_type": "general", "total": 50, "avail": 18},
            {"ward_type": "icu", "total": 5, "avail": 2},
            {"ward_type": "emergency", "total": 8, "avail": 3},
        ],
        "equipment": [
            {"name": "Ventilator", "total": 4, "avail": 2},
            {"name": "ECG Machine", "total": 5, "avail": 4},
            {"name": "Oxygen Concentrator", "total": 15, "avail": 10},
            {"name": "X-Ray Machine", "total": 2, "avail": 2},
        ],
        "doctors": [
            {"name": "Dr. Ritu Trivedi", "specialty": "general_medicine"},
            {"name": "Dr. Deepesh Saxena", "specialty": "emergency_medicine"},
            {"name": "Dr. Kavita Mehta", "specialty": "pediatrics"},
        ],
        "medicines": [
            {"name": "Paracetamol 500mg", "qty": 2000},
            {"name": "ORS Powder Sachets", "qty": 1500},
            {"name": "Metformin 500mg", "qty": 800},
            {"name": "Amlodipine 5mg", "qty": 750},
        ]
    },
    {
        "name": "PHC Old Palasia Clinic",
        "type": FacilityType.PHC,
        "lat": 22.7244,
        "lng": 75.8839,
        "address": "Manorama Ganj, Old Palasia, Indore, MP 452001",
        "phone": "+91 731 2490011",
        "beds": [
            {"ward_type": "general", "total": 20, "avail": 8},
            {"ward_type": "emergency", "total": 4, "avail": 2},
        ],
        "equipment": [
            {"name": "ECG Machine", "total": 2, "avail": 2},
            {"name": "Oxygen Concentrator", "total": 5, "avail": 4},
            {"name": "Nebulizer Machine", "total": 6, "avail": 5},
        ],
        "doctors": [
            {"name": "Dr. Neha Patwardhan", "specialty": "general_medicine"},
            {"name": "Dr. Suresh Rathore", "specialty": "primary_care"},
        ],
        "medicines": [
            {"name": "Paracetamol 500mg", "qty": 1800},
            {"name": "Azithromycin 500mg", "qty": 400},
            {"name": "Cetrizen 10mg", "qty": 1200},
            {"name": "Pantoprazole 40mg", "qty": 900},
        ]
    },
    {
        "name": "Choithram Hospital & Research Centre",
        "type": FacilityType.TERTIARY,
        "lat": 22.6953,
        "lng": 75.8486,
        "address": "Manik Bagh Road, Choithram Square, Indore, MP 452014",
        "phone": "+91 731 2463377",
        "beds": [
            {"ward_type": "general", "total": 100, "avail": 28},
            {"ward_type": "icu", "total": 20, "avail": 5},
            {"ward_type": "emergency", "total": 10, "avail": 3},
        ],
        "equipment": [
            {"name": "Ventilator", "total": 12, "avail": 4},
            {"name": "ECG Machine", "total": 8, "avail": 6},
            {"name": "Oxygen Concentrator", "total": 25, "avail": 18},
            {"name": "Defibrillator", "total": 6, "avail": 5},
        ],
        "doctors": [
            {"name": "Dr. Harish Vyas", "specialty": "cardiology"},
            {"name": "Dr. Smita Pendharkar", "specialty": "pulmonology"},
            {"name": "Dr. Manish Khandelwal", "specialty": "general_surgery"},
        ],
        "medicines": [
            {"name": "Aspirin 150mg", "qty": 1100},
            {"name": "Epinephrine Injection", "qty": 150},
            {"name": "Salbutamol Nebules", "qty": 500},
            {"name": "Medical Oxygen Cylinder 40L", "qty": 60},
        ]
    },
    {
        "name": "PHC Rau Primary Care Centre",
        "type": FacilityType.PHC,
        "lat": 22.6366,
        "lng": 75.8048,
        "address": "Rau Bypass Square, Rau, Indore, MP 453331",
        "phone": "+91 731 2856022",
        "beds": [
            {"ward_type": "general", "total": 15, "avail": 7},
            {"ward_type": "emergency", "total": 2, "avail": 1},
        ],
        "equipment": [
            {"name": "ECG Machine", "total": 1, "avail": 1},
            {"name": "Oxygen Concentrator", "total": 4, "avail": 3},
        ],
        "doctors": [
            {"name": "Dr. Rameshwar Solanki", "specialty": "general_medicine"},
        ],
        "medicines": [
            {"name": "Paracetamol 500mg", "qty": 1400},
            {"name": "Ibuprofen 400mg", "qty": 600},
            {"name": "Ciprofloxacin 500mg", "qty": 350},
        ]
    }
]

MEDICAL_CONDITIONS = [
    "Essential Hypertension", "Type 2 Diabetes Mellitus", "Bronchial Asthma",
    "Coronary Artery Disease", "Hyperlipidemia", "Chronic Kidney Disease Stage 2",
    "Hypothyroidism", "Previous Acute Myocardial Infarction", "Osteoarthritis"
]

MEDICINES_LIST = [
    {"name": "Metformin", "dose": "500mg", "freq": "Twice daily after meals"},
    {"name": "Amlodipine", "dose": "5mg", "freq": "Once daily morning"},
    {"name": "Atorvastatin", "dose": "20mg", "freq": "Once daily night"},
    {"name": "Aspirin", "dose": "75mg", "freq": "Once daily morning"},
    {"name": "Albuterol Inhaler", "dose": "100mcg", "freq": "As needed for shortness of breath"},
    {"name": "Telmisartan", "dose": "40mg", "freq": "Once daily morning"},
    {"name": "Levothyroxine", "dose": "50mcg", "freq": "Once daily empty stomach"},
]

ALLERGIES_LIST = [
    {"allergen": "Penicillin", "severity": "severe", "reaction": "Anaphylaxis and generalized urticaria"},
    {"allergen": "Sulfa Antibiotics", "severity": "moderate", "reaction": "Maculopapular skin rash"},
    {"allergen": "Peanuts", "severity": "severe", "reaction": "Bronchospasm and facial edema"},
    {"allergen": "Latex", "severity": "mild", "reaction": "Contact dermatitis"},
    {"allergen": "NSAIDs / Aspirin", "severity": "moderate", "reaction": "Gastric irritation and bronchospasm"},
]

TESTS_LIST = [
    {"name": "12-Lead Electrocardiogram (ECG)", "cat": "Cardiology", "summary": "Normal Sinus Rhythm, 72 bpm, ST segment normal."},
    {"name": "Fasting Blood Glucose & HbA1c", "cat": "Pathology", "summary": "HbA1c: 6.8% (Fair control), Fasting Glucose: 118 mg/dL."},
    {"name": "Lipid Profile Panel", "cat": "Pathology", "summary": "Total Cholesterol: 195 mg/dL, LDL: 110 mg/dL, HDL: 45 mg/dL."},
    {"name": "Chest X-Ray PA View", "cat": "Radiology", "summary": "Lung fields clear, cardiothoracic ratio within normal limits."},
    {"name": "Arterial Blood Gas (ABG)", "cat": "Pulmonology", "summary": "pH 7.41, PaO2 94 mmHg, PaCO2 38 mmHg, SpO2 98%."},
]


async def seed_database():
    print("🌱 Initializing Smart Health Grid Indore Data Seeder...")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as db:
        # 1. Create Default Admin & Doctor Users
        admin_user = User(
            email="admin@smarthealthgrid.in",
            hashed_password=hash_password("admin123"),
            full_name="Indore Health Grid Admin",
            role=UserRole.ADMIN,
        )
        db.add(admin_user)

        admin_user_alt = User(
            email="admin@healthgrid.in",
            hashed_password=hash_password("Password123!"),
            full_name="Indore Health Grid Admin",
            role=UserRole.ADMIN,
        )
        db.add(admin_user_alt)

        doctor_user = User(
            email="doctor@smarthealthgrid.in",
            hashed_password=hash_password("doctor123"),
            full_name="Dr. Rajesh Sharma",
            role=UserRole.DOCTOR,
        )
        db.add(doctor_user)

        doctor_user_alt = User(
            email="doctor1@healthgrid.in",
            hashed_password=hash_password("Password123!"),
            full_name="Dr. Rajesh Sharma",
            role=UserRole.DOCTOR,
        )
        db.add(doctor_user_alt)

        # 2. Create Facilities, Beds, Equipment, Medicines, Doctors
        created_facilities = []
        for f_data in INDORE_FACILITIES:
            facility = Facility(
                name=f_data["name"],
                type=f_data["type"],
                location_lat=f_data["lat"],
                location_lng=f_data["lng"],
                address=f_data["address"],
                phone=f_data["phone"],
            )
            db.add(facility)
            await db.flush()
            created_facilities.append(facility)

            # Add Beds
            for b in f_data["beds"]:
                db.add(Bed(facility_id=facility.id, ward_type=b["ward_type"], total_count=b["total"], available_count=b["avail"]))

            # Add Equipment
            for eq in f_data["equipment"]:
                db.add(Equipment(facility_id=facility.id, name=eq["name"], total_count=eq["total"], available_count=eq["avail"]))

            # Add Medicines
            for m in f_data["medicines"]:
                db.add(MedicineStock(facility_id=facility.id, medicine_name=m["name"], quantity=m["qty"]))

            # Add Doctors
            for d in f_data["doctors"]:
                doc = Doctor(
                    facility_id=facility.id,
                    full_name=d["name"],
                    specialty=d["specialty"],
                    available=True,
                    user_id=doctor_user.id if d["name"] == "Dr. Rajesh Sharma" else None
                )
                db.add(doc)

        await db.commit()

        # 3. Create 15 Fake Patients with realistic histories, vitals, symptoms
        print("👥 Seeding 15 realistic patient profiles in Indore...")
        patient_users = []
        for i in range(15):
            fname = fake.name_female() if i % 2 == 0 else fake.name_male()
            email = f"patient{i+1}@healthgrid.in"
            user = User(
                email=email,
                hashed_password=hash_password("patient123"),
                full_name=fname,
                role=UserRole.PATIENT,
            )
            db.add(user)
            await db.flush()

            dob = datetime.utcnow() - timedelta(days=random.randint(7000, 25000))
            # Indore location offset
            lat = 22.7196 + random.uniform(-0.04, 0.04)
            lng = 75.8577 + random.uniform(-0.04, 0.04)

            patient = Patient(
                user_id=user.id,
                date_of_birth=dob,
                gender="FEMALE" if i % 2 == 0 else "MALE",
                blood_group=random.choice(["A+", "B+", "O+", "AB+", "O-", "A-"]),
                wearable_device_id=f"IOT-INDORE-WATCH-{1000 + i}",
                location_lat=lat,
                location_lng=lng,
            )
            db.add(patient)
            await db.flush()

            # Seed Medical History
            num_hist = random.randint(1, 3)
            chosen_conds = random.sample(MEDICAL_CONDITIONS, num_hist)
            for cond in chosen_conds:
                db.add(MedicalHistoryRecord(
                    patient_id=patient.id,
                    condition=cond,
                    notes=f"Diagnosed during routine health checkup. Patient managed with lifestyle & meds.",
                    diagnosed_at=datetime.utcnow() - timedelta(days=random.randint(100, 1000))
                ))

            # Seed Medications
            num_meds = random.randint(1, 3)
            chosen_meds = random.sample(MEDICINES_LIST, num_meds)
            for m in chosen_meds:
                db.add(PatientMedication(
                    patient_id=patient.id,
                    medicine_name=m["name"],
                    dosage=m["dose"],
                    frequency=m["freq"],
                    status="active",
                    prescribed_at=datetime.utcnow() - timedelta(days=random.randint(30, 300))
                ))

            # Seed Allergies
            if random.random() > 0.4:
                alg = random.choice(ALLERGIES_LIST)
                db.add(PatientAllergy(
                    patient_id=patient.id,
                    allergen=alg["allergen"],
                    severity=alg["severity"],
                    reaction=alg["reaction"]
                ))

            # Seed Medical Tests
            num_tests = random.randint(1, 2)
            chosen_tests = random.sample(TESTS_LIST, num_tests)
            for t in chosen_tests:
                db.add(MedicalTestRecord(
                    patient_id=patient.id,
                    test_name=t["name"],
                    category=t["cat"],
                    result_summary=t["summary"],
                    test_date=datetime.utcnow() - timedelta(days=random.randint(10, 150))
                ))

            # Seed Symptoms & Vitals (Normal vs Critical scenario)
            is_emergency_scenario = (i % 4 == 0)
            if is_emergency_scenario:
                spo2 = random.randint(84, 89)
                hr = random.randint(132, 145)
                sys_bp = random.randint(182, 195)
                temp = round(random.uniform(38.8, 39.8), 1)
                syms = {"chest_pain": True, "shortness_of_breath": True, "dizziness": True, "severity": 9}
                chief = "Sudden onset severe crushing substernal chest pain with profuse sweating"
            else:
                spo2 = random.randint(96, 99)
                hr = random.randint(68, 84)
                sys_bp = random.randint(118, 128)
                temp = round(random.uniform(36.6, 37.2), 1)
                syms = {"fever": True, "cough": True, "mild_fatigue": True, "severity": 4}
                chief = "Mild fever and persistent dry cough for 3 days"

            symptom_report = SymptomReport(
                patient_id=patient.id,
                symptoms=syms,
                free_text=chief,
                reported_at=datetime.utcnow() - timedelta(hours=random.randint(1, 24))
            )
            db.add(symptom_report)

            wearable_reading = WearableReading(
                patient_id=patient.id,
                heart_rate=hr,
                spo2=spo2,
                blood_pressure_sys=sys_bp,
                blood_pressure_dia=random.randint(75, 95),
                body_temp_c=temp,
                recorded_at=datetime.utcnow() - timedelta(minutes=random.randint(5, 60))
            )
            db.add(wearable_reading)
            await db.flush()

            # Seed Risk Assessment
            risk_score = 9.5 if is_emergency_scenario else 4.2
            urgency_str = "CRITICAL" if is_emergency_scenario else "ROUTINE"
            risk_assessment = RiskAssessment(
                patient_id=patient.id,
                symptom_report_id=symptom_report.id,
                risk_score=risk_score,
                urgency=UrgencyLevel.EMERGENCY if is_emergency_scenario else UrgencyLevel.ROUTINE,
                reasoning="Hybrid NEWS2 + Gemini AI clinical triage score evaluated.",
                model_used="gemini_and_rules",
                created_at=datetime.utcnow() - timedelta(minutes=15)
            )
            db.add(risk_assessment)
            await db.flush()

            # Seed Recommendation
            rec_spec = "cardiology" if is_emergency_scenario else "general_medicine"
            recommendation = Recommendation(
                patient_id=patient.id,
                risk_assessment_id=risk_assessment.id,
                recommended_specialty=rec_spec,
                recommended_service="ECG & ICU Monitoring" if is_emergency_scenario else "Outpatient Consultation",
                status=RecommendationStatus.ACCEPTED,
                created_at=datetime.utcnow() - timedelta(minutes=10)
            )

            db.add(recommendation)
            await db.flush()

            # Seed Referral
            assigned_fac = created_facilities[0] if is_emergency_scenario else created_facilities[2]
            referral = Referral(
                recommendation_id=recommendation.id,
                facility_id=assigned_fac.id,
                navigation_notes=f"Routed to {assigned_fac.name} via Emergency Ambulance Corridor.",
                emergency_alert_sent=is_emergency_scenario,
                created_at=datetime.utcnow() - timedelta(minutes=5)
            )
            db.add(referral)
            await db.flush()

            # Seed Follow-up & Care Encounter
            db.add(FollowUp(
                patient_id=patient.id,
                referral_id=referral.id,
                scheduled_at=datetime.utcnow() + timedelta(days=7),
                completed=False,
                notes="7-day post-triage clinical review scheduled."
            ))

            db.add(CareEncounter(
                patient_id=patient.id,
                facility_id=assigned_fac.id,
                chief_complaint=chief,
                diagnosis=f"Triage Evaluation: {rec_spec.title()}",
                treatment_notes="Patient received initial stabilization and treatment plan.",
                encounter_date=datetime.utcnow()
            ))

        await db.commit()
        print("✅ Database successfully seeded with rich Indore healthcare data!")

if __name__ == "__main__":
    asyncio.run(seed_database())
