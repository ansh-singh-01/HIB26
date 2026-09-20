import uuid
from datetime import datetime

from sqlalchemy import String, DateTime, ForeignKey, Integer, Float, Boolean, Uuid as UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship


from app.core.database import Base
from app.models.enums import FacilityType


class Facility(Base):
    """4. Resource Matching -> Best Matched Facility."""
    __tablename__ = "facilities"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(255))
    type: Mapped[FacilityType] = mapped_column(String(30))
    location_lat: Mapped[float] = mapped_column(Float)
    location_lng: Mapped[float] = mapped_column(Float)
    address: Mapped[str] = mapped_column(String(500), nullable=True)
    phone: Mapped[str] = mapped_column(String(30), nullable=True)

    beds: Mapped[list["Bed"]] = relationship(back_populates="facility")
    doctors: Mapped[list["Doctor"]] = relationship(back_populates="facility")
    equipment: Mapped[list["Equipment"]] = relationship(back_populates="facility")
    medicines: Mapped[list["MedicineStock"]] = relationship(back_populates="facility")


class Bed(Base):
    """Facility Availability Check -> Beds."""
    __tablename__ = "beds"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    facility_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("facilities.id"))
    ward_type: Mapped[str] = mapped_column(String(50))  # icu, general, emergency
    total_count: Mapped[int] = mapped_column(Integer, default=0)
    available_count: Mapped[int] = mapped_column(Integer, default=0)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    facility: Mapped["Facility"] = relationship(back_populates="beds")


class Doctor(Base):
    """Facility Availability Check -> Doctors; also used for Specialist Matching."""
    __tablename__ = "doctors"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    facility_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("facilities.id"))
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), nullable=True, unique=True)
    full_name: Mapped[str] = mapped_column(String(255))
    specialty: Mapped[str] = mapped_column(String(100), index=True)
    available: Mapped[bool] = mapped_column(Boolean, default=True)

    facility: Mapped["Facility"] = relationship(back_populates="doctors")


class Equipment(Base):
    """Facility Availability Check -> Equipment."""
    __tablename__ = "equipment"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    facility_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("facilities.id"))
    name: Mapped[str] = mapped_column(String(150))  # e.g. ventilator, MRI, dialysis machine
    total_count: Mapped[int] = mapped_column(Integer, default=0)
    available_count: Mapped[int] = mapped_column(Integer, default=0)

    facility: Mapped["Facility"] = relationship(back_populates="equipment")


class MedicineStock(Base):
    """Facility Availability Check -> Medicines."""
    __tablename__ = "medicine_stock"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    facility_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("facilities.id"))
    medicine_name: Mapped[str] = mapped_column(String(255), index=True)
    quantity: Mapped[int] = mapped_column(Integer, default=0)

    facility: Mapped["Facility"] = relationship(back_populates="medicines")
