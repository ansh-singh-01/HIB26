"""
4. Resource Matching stage. Given a Recommendation (specialty + service) and
the patient's location, finds the nearest facility that can actually serve
them right now.

Two matching modes:
- Emergency (specialty == "emergency_medicine"): any facility with free
  emergency/ICU beds qualifies -- ER triage doesn't require a specialist
  match, it requires a bed and a door that's open.
- Non-emergency: nearest facility with an *available* doctor in the
  recommended specialty.

Distance is computed with the haversine formula in Python rather than a
PostGIS query, since candidate counts are small (single city / region) --
fine for this scale, revisit if the facility table grows into the
thousands.
"""
import math
from dataclasses import dataclass
from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Facility, Bed, Doctor

EARTH_RADIUS_KM = 6371.0


def haversine_km(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    d_phi = math.radians(lat2 - lat1)
    d_lambda = math.radians(lng2 - lng1)
    a = math.sin(d_phi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(d_lambda / 2) ** 2
    return 2 * EARTH_RADIUS_KM * math.asin(math.sqrt(a))


@dataclass
class FacilityMatch:
    facility: Facility
    doctor: Optional[Doctor]
    distance_km: float


async def _candidates_with_beds(db: AsyncSession) -> list[Facility]:
    """Facilities with at least one bed (any ward type) currently available."""
    result = await db.execute(
        select(Facility).join(Bed).where(Bed.available_count > 0).distinct()
    )
    return list(result.scalars().all())


async def _candidates_with_specialist(db: AsyncSession, specialty: str) -> list[tuple[Facility, Doctor]]:
    result = await db.execute(
        select(Facility, Doctor)
        .join(Doctor, Doctor.facility_id == Facility.id)
        .where(Doctor.specialty == specialty, Doctor.available == True)  # noqa: E712
    )
    return [(row[0], row[1]) for row in result.all()]


from app.models import Facility, Bed, Doctor, Equipment, MedicineStock


async def compute_facility_suitability(
    db: AsyncSession,
    facility: Facility,
    doctor: Optional[Doctor],
    specialty: str,
    distance_km: float,
) -> float:
    """
    Computes a Multi-Factor Suitability Score (0.0 to 100.0) based on:
    - Specialist Match & Availability (35%)
    - Available Bed Capacity (25%)
    - Equipment Availability (20%)
    - Medicine Stock Level (10%)
    - Proximity & Distance (10%)
    """
    score = 0.0

    # 1. Doctor / Specialist (35 pts)
    if doctor and doctor.specialty == specialty and doctor.available:
        score += 35.0
    elif specialty == "emergency_medicine":
        score += 30.0

    # 2. Bed Capacity (25 pts)
    bed_res = await db.execute(select(Bed).where(Bed.facility_id == facility.id))
    beds = bed_res.scalars().all()
    total_avail_beds = sum(b.available_count for b in beds)
    score += min(25.0, total_avail_beds * 2.5)

    # 3. Equipment (20 pts)
    eq_res = await db.execute(select(Equipment).where(Equipment.facility_id == facility.id))
    equipments = eq_res.scalars().all()
    avail_eq = sum(e.available_count for e in equipments)
    score += min(20.0, avail_eq * 5.0)

    # 4. Medicine Stock (10 pts)
    med_res = await db.execute(select(MedicineStock).where(MedicineStock.facility_id == facility.id))
    medicines = med_res.scalars().all()
    total_med = sum(m.quantity for m in medicines)
    score += min(10.0, total_med / 50.0)

    # 5. Distance (10 pts) - closer is higher
    if distance_km >= 0:
        dist_score = max(0.0, 10.0 - (distance_km * 0.5))
        score += dist_score

    return round(score, 1)


async def compute_resource_suitability(
    db: AsyncSession,
    facility: Facility,
    doctor: Optional[Doctor],
    required_specialty: str,
    required_bed_type: str,
    required_equipment: list[str],
    distance_km: float,
) -> float:
    """
    Computes Resource-Specific Suitability Score (0 to 100) checking EXACT patient needs:
    - Doctor / Specialist match (25%)
    - Required Bed type (ICU/General) availability (30%)
    - Required Equipment (Ventilator/ECG/X-Ray) availability (25%)
    - Proximity & Distance (20%)
    """
    score = 0.0

    # 1. Doctor Match (25 pts) - Hard requirement for non-emergency matching
    has_specialist = doctor and doctor.specialty == required_specialty and doctor.available
    if required_specialty != "emergency_medicine" and not has_specialist:
        return 0.0  # Exclude facility if required non-emergency specialist is not available

    if has_specialist:
        score += 25.0
    elif required_specialty == "emergency_medicine":
        score += 20.0


    # 2. Required Bed Type Availability (30 pts)
    bed_res = await db.execute(select(Bed).where(Bed.facility_id == facility.id))
    beds = bed_res.scalars().all()
    matching_beds = [b for b in beds if required_bed_type.lower() in b.ward_type.lower()]
    avail_beds = sum(b.available_count for b in matching_beds) if matching_beds else sum(b.available_count for b in beds)

    if avail_beds > 0:
        score += 30.0
    elif beds:
        score += 15.0  # partial credit if general beds available

    # 3. Required Equipment Availability (25 pts)
    eq_res = await db.execute(select(Equipment).where(Equipment.facility_id == facility.id))
    equipments = eq_res.scalars().all()
    if required_equipment:
        eq_found = 0
        for req in required_equipment:
            if any(req.lower() in e.name.lower() and e.available_count > 0 for e in equipments):
                eq_found += 1
        score += (eq_found / len(required_equipment)) * 25.0
    else:
        avail_eq = sum(e.available_count for e in equipments)
        score += min(25.0, avail_eq * 5.0)

    # 4. Proximity Score (20 pts)
    if distance_km >= 0:
        score += max(0.0, 20.0 - (distance_km * 1.5))

    return round(score, 1)


async def find_best_facility_for_resources(
    db: AsyncSession,
    patient_lat: Optional[float],
    patient_lng: Optional[float],
    required_specialty: str,
    required_bed_type: str = "general",
    required_equipment: Optional[list[str]] = None,
) -> Optional[dict]:
    """
    Finds and ranks facilities based on exact patient resource requirements.
    """
    required_equipment = required_equipment or []

    # Get all candidate facilities
    result = await db.execute(select(Facility))
    facilities = result.scalars().all()

    if not facilities:
        return None

    patient_lat = patient_lat if patient_lat is not None else 22.7196
    patient_lng = patient_lng if patient_lng is not None else 75.8577

    ranked = []
    for facility in facilities:
        dist = haversine_km(patient_lat, patient_lng, facility.location_lat, facility.location_lng)

        # Get doctor in specialty if available
        doc_res = await db.execute(
            select(Doctor).where(Doctor.facility_id == facility.id, Doctor.specialty == required_specialty, Doctor.available == True)
        )
        doctor = doc_res.scalar_one_or_none()

        score = await compute_resource_suitability(
            db=db,
            facility=facility,
            doctor=doctor,
            required_specialty=required_specialty,
            required_bed_type=required_bed_type,
            required_equipment=required_equipment,
            distance_km=dist,
        )

        ranked.append({
            "facility": facility,
            "doctor": doctor,
            "distance_km": round(dist, 2),
            "score": score,
            "match_percentage": min(99, int(score)),
        })

    positive_ranked = [r for r in ranked if r["score"] > 0]
    if positive_ranked:
        positive_ranked.sort(key=lambda x: x["score"], reverse=True)
        return positive_ranked[0]

    ranked.sort(key=lambda x: x["distance_km"])
    if ranked:
        ranked[0]["match_percentage"] = 65
    return ranked[0] if ranked else None



async def find_best_facility(
    db: AsyncSession,
    patient_lat: Optional[float],
    patient_lng: Optional[float],
    specialty: str,
) -> Optional[FacilityMatch]:
    """
    Finds best facility:
    - Emergency mode ("emergency_medicine"): nearest facility with available beds.
    - Non-emergency mode: ranks facilities by Multi-Factor Suitability Score.
    """
    if specialty == "emergency_medicine":
        candidates = await _candidates_with_beds(db)
        pairs = [(f, None) for f in candidates]
        if not pairs:
            # Fallback to any facility
            all_fac = await db.execute(select(Facility))
            pairs = [(f, None) for f in all_fac.scalars().all()]
        if not pairs:
            return None
        if patient_lat is None or patient_lng is None:
            facility, doctor = pairs[0]
            return FacilityMatch(facility=facility, doctor=doctor, distance_km=-1.0)
        
        best: Optional[FacilityMatch] = None
        for facility, doctor in pairs:
            dist = haversine_km(patient_lat, patient_lng, facility.location_lat, facility.location_lng)
            if best is None or dist < best.distance_km:
                best = FacilityMatch(facility=facility, doctor=doctor, distance_km=dist)
        return best

    # Non-emergency: multi-factor suitability scoring
    pairs = await _candidates_with_specialist(db, specialty)
    if not pairs:
        # Fallback to facilities with general beds
        candidates = await _candidates_with_beds(db)
        pairs = [(f, None) for f in candidates]
    if not pairs:
        all_fac = await db.execute(select(Facility))
        pairs = [(f, None) for f in all_fac.scalars().all()]
    if not pairs:
        return None

    if patient_lat is None or patient_lng is None:
        facility, doctor = pairs[0]
        return FacilityMatch(facility=facility, doctor=doctor, distance_km=-1.0)

    best_match: Optional[FacilityMatch] = None
    best_score = -1.0

    for facility, doctor in pairs:
        dist = haversine_km(patient_lat, patient_lng, facility.location_lat, facility.location_lng)
        suitability = await compute_facility_suitability(db, facility, doctor, specialty, dist)
        if suitability > best_score:
            best_score = suitability
            best_match = FacilityMatch(facility=facility, doctor=doctor, distance_km=dist)

    return best_match

