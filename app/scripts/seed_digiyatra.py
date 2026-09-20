import asyncio
import random
import uuid
from datetime import datetime, timedelta

from sqlalchemy import select, text
from app.core.database import AsyncSessionLocal, engine, Base
from app.models import (
    User, Patient, SymptomReport, WearableReading, MedicalHistoryRecord,
    PatientMedication, PatientAllergy, MedicalTestRecord, CareEncounter,
    AccessConsent, AccessAuditLog, Facility, Referral, Recommendation, RiskAssessment, FollowUp
)
from app.models.enums import UrgencyLevel, RecommendationStatus


def generate_mc_id() -> str:
    """Generate a clean 5-digit Medi-Connect ID, e.g. MC-84291."""
    digits = random.randint(10000, 99999)
    return f"MC-{digits}"


async def init_digiyatra_schema_and_seed():
    print("Connecting to database to ensure DigiYatra schema is in place...")
    async with engine.begin() as conn:
        # Add medi_connect_id column if not exists
        await conn.execute(text("ALTER TABLE patients ADD COLUMN IF NOT EXISTS medi_connect_id VARCHAR(32);"))
        await conn.execute(text("CREATE UNIQUE INDEX IF NOT EXISTS ix_patients_medi_connect_id ON patients(medi_connect_id);"))
        # Create any new tables (access_consents, access_audit_logs)
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as db:
        # 1. Backfill medi_connect_id for all patients who don't have one
        patients_res = await db.execute(select(Patient, User).join(User, Patient.user_id == User.id))
        all_patients = patients_res.all()

        existing_mc_ids = set()
        for p, _ in all_patients:
            if p.medi_connect_id:
                existing_mc_ids.add(p.medi_connect_id)

        count_updated = 0
        for p, u in all_patients:
            if not p.medi_connect_id:
                new_id = generate_mc_id()
                while new_id in existing_mc_ids:
                    new_id = generate_mc_id()
                p.medi_connect_id = new_id
                existing_mc_ids.add(new_id)
                count_updated += 1
                print(f"Assigned Medi-Connect ID {new_id} to patient {u.full_name} ({u.email})")

        await db.commit()
        print(f"Updated {count_updated} patient records with Medi-Connect IDs.")

        # 2. Enrich the primary demo patient (patient1@healthgrid.in / Amaira Maharaj or first patient)
        demo_res = await db.execute(
            select(Patient, User).join(User, Patient.user_id == User.id).where(User.email == "patient1@healthgrid.in")
        )
        demo_row = demo_res.first()
        if not demo_row:
            demo_res = await db.execute(select(Patient, User).join(User, Patient.user_id == User.id))
            demo_row = demo_res.first()

        if demo_row:
            demo_patient, demo_user = demo_row
            print(f"Enriching DigiYatra demo profile for {demo_user.full_name} ({demo_patient.medi_connect_id})...")

            # Ensure basic health info
            demo_patient.blood_group = demo_patient.blood_group or "B+"
            demo_patient.gender = demo_patient.gender or "Female"
            if not demo_patient.date_of_birth:
                demo_patient.date_of_birth = datetime(1994, 6, 15)

            # Check / add allergies
            allg_res = await db.execute(select(PatientAllergy).where(PatientAllergy.patient_id == demo_patient.id))
            if not allg_res.scalars().first():
                db.add(PatientAllergy(patient_id=demo_patient.id, allergen="Penicillin", severity="high", reaction="Acute anaphylaxis & rash"))
                db.add(PatientAllergy(patient_id=demo_patient.id, allergen="Sulfa Drugs", severity="moderate", reaction="Hives and fever"))

            # Check / add medications
            med_res = await db.execute(select(PatientMedication).where(PatientMedication.patient_id == demo_patient.id))
            if not med_res.scalars().first():
                db.add(PatientMedication(patient_id=demo_patient.id, medicine_name="Amlodipine Besylate", dosage="5mg", frequency="Once daily morning", status="active"))
                db.add(PatientMedication(patient_id=demo_patient.id, medicine_name="Metformin HCl", dosage="500mg", frequency="Twice daily with meals", status="active"))
                db.add(PatientMedication(patient_id=demo_patient.id, medicine_name="Atorvastatin", dosage="10mg", frequency="Once daily night", status="active"))

            # Check / add medical history
            hist_res = await db.execute(select(MedicalHistoryRecord).where(MedicalHistoryRecord.patient_id == demo_patient.id))
            if not hist_res.scalars().first():
                db.add(MedicalHistoryRecord(patient_id=demo_patient.id, condition="Hypertension (Stage 1)", notes="Diagnosed 2023, managed with diet & Amlodipine"))
                db.add(MedicalHistoryRecord(patient_id=demo_patient.id, condition="Type 2 Diabetes Mellitus", notes="Well controlled, HbA1c 6.8%"))

            # Check / add medical tests
            test_res = await db.execute(select(MedicalTestRecord).where(MedicalTestRecord.patient_id == demo_patient.id))
            existing_tests = test_res.scalars().all()
            if len(existing_tests) < 4:
                existing_names = {t.test_name for t in existing_tests}
                new_tests = [
                    (
                        "Complete Blood Count (CBC) with 5-Part Differential",
                        "Pathology & Blood",
                        "Adult hemogram within established clinical norms. Hemoglobin, platelet count, and absolute neutrophil count optimal. No cellular atypia or left shift noted. (Facility: Thyrocare Central Diagnostics | Dr. Priya Sharma)",
                        datetime.utcnow() - timedelta(days=3)
                    ),
                    (
                        "12-Lead Electrocardiogram (ECG)",
                        "Cardiology & ECG",
                        "Sinus rhythm at 74 bpm. Normal PR and QRS intervals. No ischemic ST elevation detected. (Facility: Maharaja Yashwantrao Hospital MYH Indore | Dr. Vikram Malhotra)",
                        datetime.utcnow() - timedelta(days=5)
                    ),
                    (
                        "Comprehensive Metabolic & Lipid Panel (CMP)",
                        "Biochemistry & Panels",
                        "Fasting Blood Sugar: 108 mg/dL. Creatinine: 0.88 mg/dL. eGFR > 90 mL/min. Electrolytes balanced. (Facility: Apollo Health City Central Labs | Dr. Ananya Roy)",
                        datetime.utcnow() - timedelta(days=8)
                    ),
                    (
                        "Digital Chest X-Ray (PA View)",
                        "Radiology & Scans",
                        "Both lung fields clear without focal consolidation, effusion, or pneumothorax. Normal cardiothoracic ratio. (Facility: Community Health Centre CHC Sanwer | Dr. R. K. Saxena)",
                        datetime.utcnow() - timedelta(days=14)
                    ),
                    (
                        "Glycated Hemoglobin (HbA1c) Screening",
                        "Pathology & Blood",
                        "HbA1c: 6.4% [Moderate glycemic control, pre-diabetic range]. Estimated average glucose: 137 mg/dL. (Facility: Pathkind Diagnostic Grid | Dr. S. K. Gupta)",
                        datetime.utcnow() - timedelta(days=21)
                    ),
                ]
                for name, cat, summary, dt in new_tests:
                    if name not in existing_names:
                        db.add(MedicalTestRecord(
                            patient_id=demo_patient.id,
                            test_name=name,
                            category=cat,
                            result_summary=summary,
                            test_date=dt
                        ))

            # Check / add care encounters
            enc_res = await db.execute(select(CareEncounter).where(CareEncounter.patient_id == demo_patient.id))
            if not enc_res.scalars().first():
                # Find a hospital
                fac_res = await db.execute(select(Facility).limit(1))
                fac = fac_res.scalar_one_or_none()
                fac_id = fac.id if fac else None

                db.add(CareEncounter(
                    patient_id=demo_patient.id,
                    facility_id=fac_id,
                    chief_complaint="Mild intermittent palpitations and exertional dyspnea",
                    diagnosis="Exertional Palpitations, Essential Hypertension",
                    treatment_notes="Vitals stable. ECG reviewed. Advised 24-hr ambulatory BP monitoring, hydration, and continue Amlodipine 5mg.",
                    encounter_date=datetime.utcnow() - timedelta(days=2)
                ))

            # Check / add DigiYatra Access Consents
            consent_res = await db.execute(select(AccessConsent).where(AccessConsent.patient_id == demo_patient.id))
            if not consent_res.scalars().first():
                db.add(AccessConsent(
                    patient_id=demo_patient.id,
                    facility_name="Maharaja Yashwantrao Hospital (MYH Indore)",
                    department="Cardiology Department",
                    requested_by_role="doctor",
                    status="active",
                    scopes=["basic_profile", "allergies", "medications", "medical_history", "vitals", "tests"],
                    duration="visit",
                    granted_at=datetime.utcnow() - timedelta(hours=3),
                    expires_at=datetime.utcnow() + timedelta(hours=21)
                ))
                db.add(AccessConsent(
                    patient_id=demo_patient.id,
                    facility_name="CHC Vijay Nagar Health Centre",
                    department="Primary Outpatient Care",
                    requested_by_role="nurse",
                    status="active",
                    scopes=["basic_profile", "allergies", "vitals"],
                    duration="24h",
                    granted_at=datetime.utcnow() - timedelta(days=1),
                    expires_at=datetime.utcnow() + timedelta(hours=12)
                ))

            # Check / add DigiYatra Audit Logs
            audit_res = await db.execute(select(AccessAuditLog).where(AccessAuditLog.patient_id == demo_patient.id))
            if not audit_res.scalars().first():
                db.add(AccessAuditLog(
                    patient_id=demo_patient.id,
                    facility_name="Maharaja Yashwantrao Hospital (MYH Indore)",
                    staff_role="Reception / Triage",
                    action="Digital Identity Verified",
                    details=f"Medi-Connect QR scanned at Gate 2 Check-in Terminal. Identity verified.",
                    timestamp=datetime.utcnow() - timedelta(hours=3)
                ))
                db.add(AccessAuditLog(
                    patient_id=demo_patient.id,
                    facility_name="Maharaja Yashwantrao Hospital (MYH Indore)",
                    staff_role="Cardiologist",
                    action="Reviewed Clinical Profile",
                    details="Accessed scoped record: Allergies, Current Medications, and ECG diagnostics.",
                    timestamp=datetime.utcnow() - timedelta(hours=2, minutes=45)
                ))
                db.add(AccessAuditLog(
                    patient_id=demo_patient.id,
                    facility_name="Indore Diagnostics & Imaging Centre",
                    staff_role="Lab Technician",
                    action="ECG Diagnostic Attached",
                    details="12-Lead Electrocardiogram report attached to Medi-Connect passport.",
                    timestamp=datetime.utcnow() - timedelta(days=2)
                ))
                db.add(AccessAuditLog(
                    patient_id=demo_patient.id,
                    facility_name="Apollo Pharmacy Indore",
                    staff_role="Pharmacist",
                    action="Prescription Dispensed",
                    details="Dispensed Amlodipine Besylate 5mg (30 tabs) per cardiology consultation.",
                    timestamp=datetime.utcnow() - timedelta(days=2, hours=1)
                ))

            await db.commit()
            print(f"DigiYatra demo seeding completed successfully for {demo_user.full_name} ({demo_patient.medi_connect_id})!")


if __name__ == "__main__":
    asyncio.run(init_digiyatra_schema_and_seed())
