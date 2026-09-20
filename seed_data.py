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
    RiskAssessment, Recommendation, Referral, FollowUp,
    AccessConsent, AccessAuditLog
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
    # Cardiology & Cardiac Markers
    {
        "name": "12-Lead Electrocardiogram (ECG)",
        "cat": "Cardiology & ECG",
        "summary": "Normal Sinus Rhythm at 74 bpm, normal PR interval (156 ms) and QRS duration (88 ms). No ST elevation or pathological Q waves.",
    },
    {
        "name": "High-Sensitivity Cardiac Troponin-I (hs-cTnI)",
        "cat": "Cardiology & ECG",
        "summary": "hs-cTnI: 0.012 ng/mL (Normal Reference < 0.034 ng/mL). Negative for acute myocardial injury.",
    },
    {
        "name": "Cardiac Troponin-T Rapid Assay",
        "cat": "Cardiology & ECG",
        "summary": "Troponin-T: 0.88 ng/mL (High / Critical). Highly suspicious for acute myocardial ischemia. Immediate cardiology review advised.",
    },
    {
        "name": "2D Echocardiogram & Color Doppler",
        "cat": "Cardiology & ECG",
        "summary": "Left ventricular ejection fraction (LVEF) 58%. Mild concentric LV hypertrophy. No regional wall motion abnormalities or significant valvular regurgitation.",
    },
    {
        "name": "Serum Creatine Kinase-MB (CK-MB)",
        "cat": "Cardiology & ECG",
        "summary": "CK-MB: 18 U/L (Normal Reference: 5 - 25 U/L). Index normal, no evidence of acute ischemic muscle damage.",
    },
    {
        "name": "NT-proBNP Heart Failure Biomarker",
        "cat": "Cardiology & ECG",
        "summary": "NT-proBNP: 185 pg/mL (Normal < 300 pg/mL). Low clinical probability of acute congestive heart failure decompensation.",
    },

    # Pathology & Hematology
    {
        "name": "Complete Blood Count (CBC) with 5-Part Differential",
        "cat": "Pathology & Blood",
        "summary": "Hb: 14.2 g/dL, WBC: 7,400/mcL, Platelets: 260,000/mcL, Neutrophils: 64%, Lymphocytes: 28%. Normocytic normochromic red cell indices.",
    },
    {
        "name": "Erythrocyte Sedimentation Rate (ESR - Westergren)",
        "cat": "Pathology & Blood",
        "summary": "ESR: 28 mm/hr (Mildly Elevated, Ref: 0 - 20 mm/hr). Indicates subacute systemic inflammatory or infectious response.",
    },
    {
        "name": "Prothrombin Time & INR (PT/INR Coagulation Panel)",
        "cat": "Pathology & Blood",
        "summary": "PT: 12.8 sec, INR: 1.05 (Therapeutic / Normal Reference). Adequate intrinsic and extrinsic coagulation pathway integrity.",
    },
    {
        "name": "Serum Ferritin & Iron Deficiency Profile",
        "cat": "Pathology & Blood",
        "summary": "Serum Ferritin: 18 ng/mL (Low, Ref: 30 - 300 ng/mL), Serum Iron: 42 ug/dL, TIBC: 410 ug/dL. Microcytic hypochromic iron deficiency pattern.",
    },
    {
        "name": "D-Dimer Quantitative Plasma Assay",
        "cat": "Pathology & Blood",
        "summary": "D-Dimer: 320 ng/mL FEU (Normal < 500 ng/mL). Venous thromboembolism / pulmonary embolism ruled out.",
    },

    # Biochemistry, Metabolic & Endocrine
    {
        "name": "Lipid Profile Panel",
        "cat": "Biochemistry & Panels",
        "summary": "Total Cholesterol: 238 mg/dL (Elevated), LDL: 152 mg/dL (Borderline High), HDL: 44 mg/dL, Triglycerides: 195 mg/dL. Statin therapy & lifestyle counseling indicated.",
    },
    {
        "name": "Fasting Blood Glucose & HbA1c Screening",
        "cat": "Biochemistry & Panels",
        "summary": "Fasting Glucose: 138 mg/dL, HbA1c: 7.4% (Suboptimal Glycemic Control). Consistent with established Type 2 Diabetes Mellitus.",
    },
    {
        "name": "Comprehensive Metabolic Panel (CMP - 14 Parameters)",
        "cat": "Biochemistry & Panels",
        "summary": "Serum Creatinine: 0.92 mg/dL, eGFR: 92 mL/min, BUN: 14 mg/dL, Sodium: 140 mEq/L, Potassium: 4.3 mEq/L, Calcium: 9.4 mg/dL. Normal metabolic baseline.",
    },
    {
        "name": "Liver Function Test (LFT Profile)",
        "cat": "Biochemistry & Panels",
        "summary": "SGOT/AST: 34 U/L, SGPT/ALT: 42 U/L, Total Bilirubin: 0.8 mg/dL, Alkaline Phosphatase: 88 U/L, Albumin: 4.2 g/dL. Hepatic cellular enzymes within normal limits.",
    },
    {
        "name": "Kidney Function & Serum Creatinine (KFT)",
        "cat": "Biochemistry & Panels",
        "summary": "Serum Creatinine: 1.65 mg/dL (Elevated, Ref: 0.7 - 1.2 mg/dL), BUN: 32 mg/dL, eGFR: 48 mL/min/1.73m2. Suggestive of moderate CKD Stage 3a.",
    },
    {
        "name": "Thyroid Stimulating Hormone (TSH 3rd Gen)",
        "cat": "Biochemistry & Panels",
        "summary": "TSH: 6.85 uIU/mL (Elevated, Ref: 0.45 - 4.50 uIU/mL), Free T4: 0.98 ng/dL. Subclinical primary hypothyroidism.",
    },
    {
        "name": "Serum Electrolytes Panel (Na, K, Cl, HCO3)",
        "cat": "Biochemistry & Panels",
        "summary": "Sodium: 138 mEq/L, Potassium: 3.9 mEq/L, Chloride: 102 mEq/L, Bicarbonate: 24 mEq/L. Balanced electrolyte equilibrium.",
    },
    {
        "name": "Serum Uric Acid Assay",
        "cat": "Biochemistry & Panels",
        "summary": "Serum Uric Acid: 8.4 mg/dL (High, Ref: 3.5 - 7.2 mg/dL). Hyperuricemia with clinical gout correlation.",
    },

    # Radiology & Imaging
    {
        "name": "Digital Chest X-Ray (PA View)",
        "cat": "Radiology & Scans",
        "summary": "Bilateral lung fields clear. Costophrenic and cardiophrenic angles sharp. Cardiothoracic ratio 0.45 (Normal). Bony rib cage unremarkable.",
    },
    {
        "name": "High-Resolution CT (HRCT) Chest",
        "cat": "Radiology & Scans",
        "summary": "No focal consolidation, ground glass opacities, or bronchiectasis. Normal mediastinal contour without significant lymphadenopathy.",
    },
    {
        "name": "Ultrasound Whole Abdomen & Pelvis",
        "cat": "Radiology & Scans",
        "summary": "Mild Grade-I diffuse hepatic steatosis (Fatty Liver). Gallbladder, pancreas, spleen, and bilateral kidneys show preserved parenchymal thickness.",
    },
    {
        "name": "MRI Brain with Diffusion Weighted Imaging (DWI)",
        "cat": "Radiology & Scans",
        "summary": "No evidence of acute ischemic stroke, intracranial hemorrhage, or space-occupying lesion. Ventricular size commensurate with age.",
    },
    {
        "name": "CT Coronary Angiography",
        "cat": "Radiology & Scans",
        "summary": "LAD demonstrates 30-40% soft eccentric proximal plaque without flow-limiting stenosis. RCA and LCx patent.",
    },

    # Pulmonology & Respiratory
    {
        "name": "Arterial Blood Gas (ABG)",
        "cat": "Pulmonology & Respiratory",
        "summary": "pH: 7.42, PaO2: 96 mmHg, PaCO2: 37 mmHg, HCO3: 24.2 mEq/L, SpO2: 98.4%, Lactate: 1.1 mmol/L. Normal alveolar gas exchange without acidosis.",
    },
    {
        "name": "Spirometry & Pulmonary Function Test (PFT)",
        "cat": "Pulmonology & Respiratory",
        "summary": "FEV1/FVC ratio: 0.68 (Reduced, Ref > 0.75). Positive post-bronchodilator reversibility of 14% (250 mL), consistent with mild reversible obstructive airway disease (Asthma).",
    },

    # Infectious Disease & Serology
    {
        "name": "Dengue NS1 Antigen & IgM/IgG Serology",
        "cat": "Pathology & Blood",
        "summary": "Dengue NS1 Antigen: NEGATIVE, Dengue IgM: NEGATIVE, Dengue IgG: POSITIVE (Indicates past resolved exposure).",
    },
    {
        "name": "C-Reactive Protein (Quantitative hs-CRP)",
        "cat": "Pathology & Blood",
        "summary": "hs-CRP: 12.4 mg/L (High, Ref < 3.0 mg/L). Significant systemic inflammatory marker elevation.",
    },
    {
        "name": "Urine Routine & Microscopic Examination",
        "cat": "Pathology & Blood",
        "summary": "Color: Pale yellow, Protein: Nil, Glucose: Nil, Pus cells: 2-3 /HPF, RBCs: Nil, Epithelial cells: Few. Negative for active urinary tract infection.",
    },
]


async def seed_database():
    print("[INIT] Initializing Smart Health Grid Indore Data Seeder...")
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

        # 3. Create 25 Diverse Patients with realistic histories, vitals, symptoms, diagnostic reports, and consents
        print("[SEEDS] Seeding 25 realistic patient profiles in Indore...")
        total_reports_seeded = 0
        total_consents_seeded = 0

        for i in range(25):
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

            dob = datetime.utcnow() - timedelta(days=random.randint(7000, 26000))
            lat = 22.7196 + random.uniform(-0.045, 0.045)
            lng = 75.8577 + random.uniform(-0.045, 0.045)

            mc_id = f"MC-{random.randint(10000, 99999)}"
            patient = Patient(
                user_id=user.id,
                date_of_birth=dob,
                gender="FEMALE" if i % 2 == 0 else "MALE",
                blood_group=random.choice(["A+", "B+", "O+", "AB+", "O-", "A-", "B-"]),
                wearable_device_id=f"IOT-INDORE-WATCH-{1000 + i}",
                location_lat=lat,
                location_lng=lng,
                medi_connect_id=mc_id,
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
                    notes=f"Diagnosed during health checkup. Patient managed with lifestyle modifications and routine clinical follow-up.",
                    diagnosed_at=datetime.utcnow() - timedelta(days=random.randint(100, 1200))
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
            if random.random() > 0.35:
                alg = random.choice(ALLERGIES_LIST)
                db.add(PatientAllergy(
                    patient_id=patient.id,
                    allergen=alg["allergen"],
                    severity=alg["severity"],
                    reaction=alg["reaction"]
                ))

            # Seed Medical Tests / Reports (2 to 4 reports per patient from the expanded 24-test catalog)
            num_tests = random.randint(2, 4)
            chosen_tests = random.sample(TESTS_LIST, num_tests)
            for t in chosen_tests:
                db.add(MedicalTestRecord(
                    patient_id=patient.id,
                    test_name=t["name"],
                    category=t["cat"],
                    result_summary=t["summary"],
                    test_date=datetime.utcnow() - timedelta(days=random.randint(1, 140), hours=random.randint(0, 23))
                ))
                total_reports_seeded += 1

            # Seed Active DigiYatra Visit Consent for the doctor consultation queue
            consent_fac = created_facilities[0] if i % 2 == 0 else created_facilities[1]
            consent_dept = "Cardiology & Critical Care" if i % 2 == 0 else "General Medicine & Outpatient"
            db.add(AccessConsent(
                patient_id=patient.id,
                facility_name=consent_fac.name,
                department=consent_dept,
                requested_by_role="doctor",
                status="active",
                scopes=["basic_profile", "allergies", "medications", "medical_history", "vitals", "tests"],
                duration="24h",
                granted_at=datetime.utcnow() - timedelta(hours=random.randint(1, 8)),
                expires_at=datetime.utcnow() + timedelta(hours=random.randint(6, 22)),
            ))
            total_consents_seeded += 1

            # Seed Symptoms & Vitals (Normal vs Critical scenarios)
            is_emergency_scenario = (i % 3 == 0)
            if is_emergency_scenario:
                spo2 = random.randint(84, 90)
                hr = random.randint(128, 148)
                sys_bp = random.randint(178, 198)
                temp = round(random.uniform(38.6, 39.8), 1)
                syms = {"chest_pain": True, "shortness_of_breath": True, "dizziness": True, "severity": 9}
                chief = "Acute crushing substernal chest discomfort radiating to left arm with diaphoresis and dyspnea"
            else:
                spo2 = random.randint(96, 99)
                hr = random.randint(66, 82)
                sys_bp = random.randint(116, 126)
                temp = round(random.uniform(36.6, 37.2), 1)
                syms = {"fever": True, "cough": True, "mild_fatigue": True, "severity": 4}
                chief = "Mild low-grade fever with productive dry cough and generalized body aches for 3 days"

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
                blood_pressure_dia=random.randint(76, 96),
                body_temp_c=temp,
                recorded_at=datetime.utcnow() - timedelta(minutes=random.randint(5, 60))
            )
            db.add(wearable_reading)
            await db.flush()

            # Seed Risk Assessment
            risk_score = 9.4 if is_emergency_scenario else 4.2
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
                recommended_service="12-Lead ECG & Urgent ICU Monitoring" if is_emergency_scenario else "Outpatient Consultation & Routine Diagnostics",
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
                navigation_notes=f"Routed to {assigned_fac.name} via Emergency Ambulance Corridor." if is_emergency_scenario else f"Scheduled consultation at {assigned_fac.name}.",
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
                notes="7-day post-triage clinical review and diagnostic report inspection scheduled."
            ))

            db.add(CareEncounter(
                patient_id=patient.id,
                facility_id=assigned_fac.id,
                chief_complaint=chief,
                diagnosis=f"Triage Evaluation: {rec_spec.title()}",
                treatment_notes="Patient received initial clinical stabilization, baseline vitals intake, and diagnostic test referral.",
                encounter_date=datetime.utcnow()
            ))

        await db.commit()
        print(f"[SUCCESS] Database successfully seeded with 25 patients, {total_reports_seeded} diagnostic reports, and {total_consents_seeded} active consents!")

if __name__ == "__main__":
    asyncio.run(seed_database())
