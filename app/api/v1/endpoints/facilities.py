import uuid
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, require_role
from app.core.database import get_db
from app.models import Facility, Bed, Doctor, Equipment, MedicineStock, Referral, User
from app.models.enums import UserRole
from app.schemas.facility import (
    FacilityCreate, FacilityOut, FacilityCapacityUpdate, BedUpdate, BedOut,
    InventoryItemCreate, InventoryItemOut
)
from app.schemas.referral import ReferralOut, FacilitySummary, DoctorSummary
from app.services.predictive_inventory import predict_facility_shortages

router = APIRouter()


async def _enrich_facility(db: AsyncSession, facility: Facility) -> FacilityOut:
    """Helper to populate aggregated bed counts, ventilators, and specialties for a facility."""
    # Beds
    bed_res = await db.execute(select(Bed).where(Bed.facility_id == facility.id))
    beds = bed_res.scalars().all()

    gen_beds = [b for b in beds if "icu" not in b.ward_type.lower() and "emergency" not in b.ward_type.lower()]
    icu_beds = [b for b in beds if "icu" in b.ward_type.lower() or "emergency" in b.ward_type.lower()]

    tot_gen = sum(b.total_count for b in gen_beds) if gen_beds else 40
    avail_gen = sum(b.available_count for b in gen_beds) if gen_beds else 15
    tot_icu = sum(b.total_count for b in icu_beds) if icu_beds else 10
    avail_icu = sum(b.available_count for b in icu_beds) if icu_beds else 3

    # Equipment (Ventilators)
    eq_res = await db.execute(select(Equipment).where(Equipment.facility_id == facility.id))
    equipment_items = eq_res.scalars().all()
    v_count = sum(e.available_count for e in equipment_items if "ventilat" in e.name.lower())
    if not v_count and equipment_items:
        v_count = sum(e.available_count for e in equipment_items)
    if not v_count:
        v_count = 5

    # Doctors / Specialties
    doc_res = await db.execute(select(Doctor).where(Doctor.facility_id == facility.id))
    doctors = doc_res.scalars().all()
    specs = list({d.specialty for d in doctors}) if doctors else ["emergency_medicine", "cardiology", "general_medicine"]

    return FacilityOut(
        id=facility.id,
        name=facility.name,
        type=facility.type,
        location_lat=facility.location_lat,
        location_lng=facility.location_lng,
        address=facility.address,
        phone=facility.phone,
        total_general_beds=tot_gen,
        available_general_beds=avail_gen,
        total_icu_beds=tot_icu,
        available_icu_beds=avail_icu,
        ventilator_count=v_count,
        specialties=specs,
    )


# --- Public & Authenticated routes ---------------------------------------

@router.get("", response_model=List[FacilityOut])
@router.get("/", response_model=List[FacilityOut])
async def list_facilities(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Facility))
    facilities = result.scalars().all()
    enriched = []
    for f in facilities:
        enriched.append(await _enrich_facility(db, f))
    return enriched


@router.post("/sync-kaggle")
@router.post("/sync-kaggle/")
async def sync_kaggle_facilities(db: AsyncSession = Depends(get_db)):
    """
    Sync and ingest facilities from the Kaggle India Primary Healthcare dataset.
    """
    from app.services.kaggle_facilities import generate_india_facilities_from_dataset
    from app.models.enums import FacilityType

    kaggle_facilities = generate_india_facilities_from_dataset(max_per_state=2)
    synced_count = 0

    for f in kaggle_facilities:
        facility_type = f["type"]
        if isinstance(facility_type, str):
            try:
                facility_type = FacilityType(facility_type.lower())
            except Exception:
                facility_type = FacilityType.HOSPITAL

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

        synced_count += 1

    await db.commit()
    return {"message": f"Successfully synced {synced_count} facilities from Kaggle dataset.", "total_synced": synced_count}


@router.get("/{facility_id}", response_model=FacilityOut)
async def get_facility_details(facility_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Facility).where(Facility.id == facility_id))
    facility = result.scalar_one_or_none()
    if not facility:
        raise HTTPException(status_code=404, detail="Facility not found")
    return await _enrich_facility(db, facility)


# --- Capacity & Resource Updates ---------------------------------------

@router.patch("/{facility_id}/capacity", response_model=FacilityOut)
async def update_facility_capacity(
    facility_id: uuid.UUID,
    payload: FacilityCapacityUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN, UserRole.FACILITY_MANAGER, "admin", "facility_manager")),
):
    """
    Capacity Manager Endpoint: Updates general beds, ICU beds, and ventilator equipment.
    """
    result = await db.execute(select(Facility).where(Facility.id == facility_id))
    facility = result.scalar_one_or_none()
    if not facility:
        raise HTTPException(status_code=404, detail="Facility not found")

    bed_res = await db.execute(select(Bed).where(Bed.facility_id == facility.id))
    beds = bed_res.scalars().all()

    gen_bed = next((b for b in beds if "icu" not in b.ward_type.lower()), None)
    icu_bed = next((b for b in beds if "icu" in b.ward_type.lower() or "emergency" in b.ward_type.lower()), None)

    if gen_bed:
        if payload.total_general_beds is not None: gen_bed.total_count = payload.total_general_beds
        if payload.available_general_beds is not None: gen_bed.available_count = payload.available_general_beds
    elif payload.total_general_beds is not None:
        db.add(Bed(facility_id=facility.id, ward_type="general", total_count=payload.total_general_beds, available_count=payload.available_general_beds or payload.total_general_beds))

    if icu_bed:
        if payload.total_icu_beds is not None: icu_bed.total_count = payload.total_icu_beds
        if payload.available_icu_beds is not None: icu_bed.available_count = payload.available_icu_beds
    elif payload.total_icu_beds is not None:
        db.add(Bed(facility_id=facility.id, ward_type="icu", total_count=payload.total_icu_beds, available_count=payload.available_icu_beds or payload.total_icu_beds))

    if payload.ventilator_count is not None:
        eq_res = await db.execute(select(Equipment).where(Equipment.facility_id == facility.id, Equipment.name.ilike("%ventilator%")))
        vent = eq_res.scalar_one_or_none()
        if vent:
            vent.available_count = payload.ventilator_count
        else:
            db.add(Equipment(facility_id=facility.id, name="Ventilator", total_count=payload.ventilator_count, available_count=payload.ventilator_count))

    await db.commit()
    await db.refresh(facility)
    return await _enrich_facility(db, facility)


# --- Healthcare Inventory Management ----------------------------------

@router.get("/{facility_id}/inventory")
async def get_facility_inventory(facility_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    """Inventory Management Endpoint: Fetches medicine stock & equipment."""
    med_res = await db.execute(select(MedicineStock).where(MedicineStock.facility_id == facility_id))
    medicines = med_res.scalars().all()

    eq_res = await db.execute(select(Equipment).where(Equipment.facility_id == facility_id))
    equipment = eq_res.scalars().all()

    return {
        "facility_id": str(facility_id),
        "medicines": [{"id": str(m.id), "name": m.medicine_name, "quantity": m.quantity} for m in medicines],
        "equipment": [{"id": str(e.id), "name": e.name, "total_count": e.total_count, "available_count": e.available_count} for e in equipment]
    }


@router.post("/{facility_id}/inventory", status_code=201)
async def add_inventory_item(
    facility_id: uuid.UUID,
    item: InventoryItemCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN, UserRole.FACILITY_MANAGER, "admin", "facility_manager")),
):
    """Adds a new Medicine or Equipment inventory item."""
    if item.category == "medicine":
        stock = MedicineStock(facility_id=facility_id, medicine_name=item.name, quantity=item.quantity)
        db.add(stock)
    else:
        eq = Equipment(facility_id=facility_id, name=item.name, total_count=item.quantity, available_count=item.available_count or item.quantity)
        db.add(eq)
    await db.commit()
    return {"status": "Item added to inventory"}


@router.get("/{facility_id}/predictive-shortages")
async def get_predictive_shortages(facility_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    """Predictive Resource Planning & Forecast Endpoint."""
    return await predict_facility_shortages(db, facility_id)


# --- Doctor Facility Referrals Endpoint ----------------------------------

@router.get("/me/referrals")
async def get_my_facility_referrals(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.DOCTOR, "doctor")),
):
    doc_res = await db.execute(select(Doctor).where(Doctor.user_id == current_user.id))
    doctor = doc_res.scalar_one_or_none()
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor profile not found for current user.")

    result = await db.execute(select(Referral).where(Referral.facility_id == doctor.facility_id))
    referrals = result.scalars().all()
    return referrals


# --- Admin Create Facility ---------------------------------------------

@router.post("", response_model=FacilityOut, status_code=201)
@router.post("/", response_model=FacilityOut, status_code=201)
async def create_facility(
    payload: FacilityCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN, "admin")),
):
    facility = Facility(
        name=payload.name,
        type=payload.type,
        location_lat=payload.location_lat,
        location_lng=payload.location_lng,
        address=payload.address,
        phone=payload.phone,
    )
    db.add(facility)
    await db.flush()

    # Add default beds
    db.add(Bed(facility_id=facility.id, ward_type="general", total_count=payload.total_general_beds or 50, available_count=payload.available_general_beds or 20))
    db.add(Bed(facility_id=facility.id, ward_type="icu", total_count=payload.total_icu_beds or 10, available_count=payload.available_icu_beds or 4))
    db.add(Equipment(facility_id=facility.id, name="Ventilator", total_count=payload.ventilator_count or 5, available_count=payload.ventilator_count or 5))

    await db.commit()
    await db.refresh(facility)
    return await _enrich_facility(db, facility)


@router.patch("/{facility_id}/beds/{bed_id}", response_model=BedOut)
async def update_bed_availability(
    facility_id: uuid.UUID,
    bed_id: uuid.UUID,
    payload: BedUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN, UserRole.FACILITY_MANAGER, "admin", "facility_manager")),
):
    result = await db.execute(select(Bed).where(Bed.id == bed_id, Bed.facility_id == facility_id))
    bed = result.scalar_one_or_none()
    if not bed:
        raise HTTPException(status_code=404, detail="Bed not found for this facility.")

    if payload.available_count > bed.total_count:
        raise HTTPException(status_code=400, detail=f"available_count ({payload.available_count}) cannot exceed total_count ({bed.total_count})")

    bed.available_count = payload.available_count
    await db.commit()
    await db.refresh(bed)
    return bed


