import enum


class UrgencyLevel(str, enum.Enum):
    ROUTINE = "routine"
    URGENT = "urgent"
    EMERGENCY = "emergency"


class RecommendationStatus(str, enum.Enum):
    PENDING = "pending"
    ACCEPTED = "accepted"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class FacilityType(str, enum.Enum):
    PHC = "phc"
    CHC = "chc"
    HOSPITAL = "hospital"
    PRIMARY = "primary"
    SECONDARY = "secondary"
    TERTIARY = "tertiary"
    CLINIC = "clinic"
    DIAGNOSTIC_CENTER = "diagnostic_center"
    PHARMACY = "pharmacy"


class UserRole(str, enum.Enum):
    PATIENT = "patient"
    DOCTOR = "doctor"
    NURSE = "nurse"
    PARAMEDIC = "paramedic"
    FACILITY_MANAGER = "facility_manager"
    HEALTHCARE_PROVIDER = "healthcare_provider"
    ADMIN = "admin"

