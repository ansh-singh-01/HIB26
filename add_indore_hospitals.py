import asyncio
import uuid
from app.core.database import AsyncSessionLocal
from app.models import Facility, Bed, Doctor, Equipment, MedicineStock
from app.models.enums import FacilityType
from sqlalchemy import select

ADDITIONAL_INDORE_FACILITIES = [
    {
        "name": "Medanta Super Specialty Hospital Indore",
        "type": FacilityType.TERTIARY,
        "lat": 22.7512,
        "lng": 75.8953,
        "address": "Sector B, Scheme No 54, PU4 Commercial, Vijay Nagar, Indore, MP 452010",
        "phone": "+91 731 7122222",
        "beds": [
            {"ward_type": "general", "total": 160, "avail": 48},
            {"ward_type": "icu", "total": 45, "avail": 12},
            {"ward_type": "emergency", "total": 20, "avail": 6},
        ],
        "equipment": [
            {"name": "Ventilator", "total": 22, "avail": 9},
            {"name": "Cath Lab", "total": 3, "avail": 2},
            {"name": "ECG Machine", "total": 12, "avail": 10},
            {"name": "MRI 3T Scanner", "total": 2, "avail": 1},
        ],
        "doctors": [
            {"name": "Dr. Sandeep Srivastava", "specialty": "cardiology"},
            {"name": "Dr. Prateek Sharma", "specialty": "neurology"},
            {"name": "Dr. Varun Chouhan", "specialty": "emergency_medicine"},
        ],
        "medicines": [
            {"name": "Atorvastatin 40mg", "qty": 1400},
            {"name": "Heparin Injection", "qty": 300},
            {"name": "Streptokinase 1.5M IU", "qty": 90},
        ]
    },
    {
        "name": "Sri Aurobindo Institute of Medical Sciences (SAIMS Indore)",
        "type": FacilityType.TERTIARY,
        "lat": 22.8015,
        "lng": 75.8398,
        "address": "Indore-Ujjain Highway, Bhawrasla, Sanwer Road, Indore, MP 453555",
        "phone": "+91 731 4231000",
        "beds": [
            {"ward_type": "general", "total": 250, "avail": 75},
            {"ward_type": "icu", "total": 60, "avail": 16},
            {"ward_type": "emergency", "total": 30, "avail": 10},
        ],
        "equipment": [
            {"name": "Ventilator", "total": 35, "avail": 14},
            {"name": "ECG Machine", "total": 20, "avail": 15},
            {"name": "Trauma CT Unit", "total": 2, "avail": 2},
        ],
        "doctors": [
            {"name": "Dr. Vinod Bhandari", "specialty": "general_surgery"},
            {"name": "Dr. Manjushree Bhandari", "specialty": "pulmonology"},
            {"name": "Dr. Jaideep Singh", "specialty": "emergency_medicine"},
        ],
        "medicines": [
            {"name": "Paracetamol IV", "qty": 2500},
            {"name": "Medical Oxygen Cylinder 40L", "qty": 120},
            {"name": "Ceftriaxone 1g", "qty": 800},
        ]
    },
    {
        "name": "CHC Khajrana Community Health Centre",
        "type": FacilityType.CHC,
        "lat": 22.7302,
        "lng": 75.9080,
        "address": "Khajrana Main Road, Near Khajrana Ganesh Mandir, Indore, MP 452016",
        "phone": "+91 731 2578900",
        "beds": [
            {"ward_type": "general", "total": 45, "avail": 16},
            {"ward_type": "icu", "total": 6, "avail": 3},
            {"ward_type": "emergency", "total": 8, "avail": 4},
        ],
        "equipment": [
            {"name": "Ventilator", "total": 3, "avail": 2},
            {"name": "ECG Machine", "total": 4, "avail": 3},
            {"name": "Oxygen Concentrator", "total": 12, "avail": 9},
        ],
        "doctors": [
            {"name": "Dr. Farooq Khan", "specialty": "general_medicine"},
            {"name": "Dr. Shabana Sheikh", "specialty": "pediatrics"},
        ],
        "medicines": [
            {"name": "ORS Sachets", "qty": 1800},
            {"name": "Paracetamol 500mg", "qty": 2200},
            {"name": "Amoxicillin 250mg", "qty": 700},
        ]
    }
]

async def seed_additional():
    async with AsyncSessionLocal() as db:
        for f_data in ADDITIONAL_INDORE_FACILITIES:
            res = await db.execute(select(Facility).where(Facility.name == f_data["name"]))
            existing = res.scalar_one_or_none()
            if existing:
                print(f"Already exists: {f_data['name']}")
                continue
            
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
            print(f"Created facility: {facility.name} (id={facility.id})")

            for b in f_data["beds"]:
                db.add(Bed(facility_id=facility.id, ward_type=b["ward_type"], total_count=b["total"], available_count=b["avail"]))
            for eq in f_data["equipment"]:
                db.add(Equipment(facility_id=facility.id, name=eq["name"], total_count=eq["total"], available_count=eq["avail"]))
            for d in f_data["doctors"]:
                db.add(Doctor(facility_id=facility.id, name=d["name"], specialty=d["specialty"], is_available=True))
            for m in f_data["medicines"]:
                db.add(MedicineStock(facility_id=facility.id, medicine_name=m["name"], quantity=m["qty"], threshold=50))
        
        await db.commit()
        print("Successfully committed additional Indore healthcare facilities!")

if __name__ == "__main__":
    asyncio.run(seed_additional())
