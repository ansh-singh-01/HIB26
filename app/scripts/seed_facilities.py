"""
Seed a handful of fictional Indore-area facilities so the Resource Matching
stage has real data to query against. These are made-up names/doctors for
testing only -- not real hospitals.

Run with: python -m app.scripts.seed_facilities
Safe to re-run: it clears and re-inserts seed rows each time.
"""
import asyncio

from sqlalchemy import delete

from app.core.database import AsyncSessionLocal
from app.models import Facility, Bed, Doctor, Equipment, MedicineStock
from app.models.enums import FacilityType

FACILITIES = [
    {
        "name": "Indore City General Hospital",
        "type": FacilityType.HOSPITAL,
        "location_lat": 22.7196,
        "location_lng": 75.8577,
        "address": "Near city center, Indore",
        "phone": "0731-2000001",
        "beds": [
            {"ward_type": "general", "total_count": 40, "available_count": 12},
            {"ward_type": "icu", "total_count": 10, "available_count": 2},
        ],
        "doctors": [
            {"full_name": "Dr. Priya Sharma", "specialty": "cardiology", "available": True},
            {"full_name": "Dr. Ravi Mehta", "specialty": "general_medicine", "available": True},
        ],
        "equipment": [
            {"name": "ECG machine", "total_count": 5, "available_count": 3},
            {"name": "Ventilator", "total_count": 8, "available_count": 2},
        ],
        "medicines": [
            {"medicine_name": "Aspirin", "quantity": 500},
            {"medicine_name": "Paracetamol", "quantity": 1000},
        ],
    },
    {
        "name": "Vijay Nagar Multispecialty Clinic",
        "type": FacilityType.CLINIC,
        "location_lat": 22.7532,
        "location_lng": 75.8937,
        "address": "Vijay Nagar, Indore",
        "phone": "0731-2000002",
        "beds": [
            {"ward_type": "general", "total_count": 15, "available_count": 5},
        ],
        "doctors": [
            {"full_name": "Dr. Ananya Joshi", "specialty": "dermatology", "available": True},
            {"full_name": "Dr. Karan Verma", "specialty": "orthopedics", "available": True},
        ],
        "equipment": [
            {"name": "X-ray machine", "total_count": 2, "available_count": 1},
        ],
        "medicines": [
            {"medicine_name": "Ibuprofen", "quantity": 300},
        ],
    },
    {
        "name": "Rajwada Diagnostic & Emergency Center",
        "type": FacilityType.HOSPITAL,
        "location_lat": 22.7150,
        "location_lng": 75.8330,
        "address": "Near Rajwada, Indore",
        "phone": "0731-2000003",
        "beds": [
            {"ward_type": "emergency", "total_count": 20, "available_count": 6},
            {"ward_type": "icu", "total_count": 8, "available_count": 3},
        ],
        "doctors": [
            {"full_name": "Dr. Suresh Nair", "specialty": "emergency_medicine", "available": True},
            {"full_name": "Dr. Meera Iyer", "specialty": "pulmonology", "available": True},
        ],
        "equipment": [
            {"name": "CT scanner", "total_count": 2, "available_count": 1},
            {"name": "X-ray machine", "total_count": 3, "available_count": 2},
        ],
        "medicines": [
            {"medicine_name": "Adrenaline", "quantity": 100},
            {"medicine_name": "Saline IV", "quantity": 400},
        ],
    },
    {
        "name": "Bhawarkuan Neuro & Cardiac Institute",
        "type": FacilityType.HOSPITAL,
        "location_lat": 22.6890,
        "location_lng": 75.8710,
        "address": "Bhawarkuan, Indore",
        "phone": "0731-2000004",
        "beds": [
            {"ward_type": "icu", "total_count": 12, "available_count": 4},
            {"ward_type": "general", "total_count": 30, "available_count": 10},
        ],
        "doctors": [
            {"full_name": "Dr. Alok Kapoor", "specialty": "neurology", "available": True},
            {"full_name": "Dr. Sanya Gupta", "specialty": "cardiology", "available": True},
        ],
        "equipment": [
            {"name": "MRI scanner", "total_count": 1, "available_count": 1},
            {"name": "ECG machine", "total_count": 4, "available_count": 4},
        ],
        "medicines": [
            {"medicine_name": "Clopidogrel", "quantity": 200},
        ],
    },
    {
        "name": "Palasia Family Clinic",
        "type": FacilityType.CLINIC,
        "location_lat": 22.7280,
        "location_lng": 75.8860,
        "address": "Palasia, Indore",
        "phone": "0731-2000005",
        "beds": [
            {"ward_type": "general", "total_count": 10, "available_count": 4},
        ],
        "doctors": [
            {"full_name": "Dr. Nikhil Rao", "specialty": "general_medicine", "available": True},
            {"full_name": "Dr. Farah Sheikh", "specialty": "gastroenterology", "available": True},
        ],
        "equipment": [],
        "medicines": [
            {"medicine_name": "Omeprazole", "quantity": 250},
        ],
    },
]


from sqlalchemy import select
from app.services.kaggle_facilities import generate_india_facilities_from_dataset


async def seed():
    async with AsyncSessionLocal() as db:
        # Load Kaggle India Primary Health Care facilities
        kaggle_facilities = []
        try:
            kaggle_facilities = generate_india_facilities_from_dataset(max_per_state=2)
            print(f"Loaded {len(kaggle_facilities)} facilities from Kaggle India Healthcare dataset.")
        except Exception as e:
            print(f"Kaggle facilities load notice: {e}. Proceeding with core facilities.")

        # Combine core facilities + Kaggle facilities
        all_facilities = FACILITIES + kaggle_facilities

        for f in all_facilities:
            facility_type = f["type"]
            if isinstance(facility_type, str):
                try:
                    facility_type = FacilityType(facility_type.lower())
                except Exception:
                    facility_type = FacilityType.HOSPITAL

            # Idempotent match: check if facility already exists by name
            res = await db.execute(select(Facility).where(Facility.name == f["name"]))
            facility = res.scalar_one_or_none()

            if facility:
                facility.type = facility_type
                facility.location_lat = f["location_lat"]
                facility.location_lng = f["location_lng"]
                facility.address = f["address"]
                facility.phone = f.get("phone", "0731-2000000")
            else:
                facility = Facility(
                    name=f["name"],
                    type=facility_type,
                    location_lat=f["location_lat"],
                    location_lng=f["location_lng"],
                    address=f["address"],
                    phone=f.get("phone", "0731-2000000"),
                )
                db.add(facility)
                await db.flush()

            # Refresh child records for this facility
            await db.execute(delete(Bed).where(Bed.facility_id == facility.id))
            await db.execute(delete(Doctor).where(Doctor.facility_id == facility.id))
            await db.execute(delete(Equipment).where(Equipment.facility_id == facility.id))
            await db.execute(delete(MedicineStock).where(MedicineStock.facility_id == facility.id))

            for b in f.get("beds", []):
                db.add(Bed(facility_id=facility.id, **b))
            for d in f.get("doctors", []):
                db.add(Doctor(facility_id=facility.id, **d))
            for e in f.get("equipment", []):
                db.add(Equipment(facility_id=facility.id, **e))
            for m in f.get("medicines", []):
                db.add(MedicineStock(facility_id=facility.id, **m))

        await db.commit()
    print(f"Successfully seeded {len(all_facilities)} facilities (including Kaggle India Primary Healthcare data) with beds, doctors, equipment, and medicine stock.")


if __name__ == "__main__":
    asyncio.run(seed())

