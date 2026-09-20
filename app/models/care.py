import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import String, DateTime, ForeignKey, Text, Float, JSON, Uuid as UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship


from app.core.database import Base
from app.models.enums import UrgencyLevel, RecommendationStatus


class RiskAssessment(Base):
    """2. AI Analysis -> Risk Assessment (output of AI Analysis Engine)."""
    __tablename__ = "risk_assessments"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    patient_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("patients.id"))
    symptom_report_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("symptom_reports.id"), nullable=True)
    risk_score: Mapped[float] = mapped_column(Float)  # 0-1
    urgency: Mapped[UrgencyLevel] = mapped_column(String(20))  # Emergency or Routine?
    reasoning: Mapped[str] = mapped_column(Text, nullable=True)  # explanation from Gemini/ML
    model_used: Mapped[str] = mapped_column(String(50), default="gemini")
    raw_model_output: Mapped[dict] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class Recommendation(Base):
    """3. Recommendation -> Suggested Care Path."""
    __tablename__ = "recommendations"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    patient_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("patients.id"))
    risk_assessment_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("risk_assessments.id"))
    recommended_specialty: Mapped[str] = mapped_column(String(100), nullable=True)
    recommended_service: Mapped[str] = mapped_column(String(100), nullable=True)  # diagnostic service
    status: Mapped[RecommendationStatus] = mapped_column(String(20), default=RecommendationStatus.PENDING)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    referral: Mapped["Referral"] = relationship(back_populates="recommendation", uselist=False)


class Referral(Base):
    """5. Care & Follow-up -> Referral & Navigation + matched facility."""
    __tablename__ = "referrals"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    recommendation_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("recommendations.id"), nullable=True)
    facility_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("facilities.id"))
    doctor_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("doctors.id"), nullable=True)
    patient_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("patients.id"), nullable=True)
    from_facility_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("facilities.id"), nullable=True)
    to_facility_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("facilities.id"), nullable=True)
    status: Mapped[str] = mapped_column(String(50), default="PENDING")
    priority: Mapped[str] = mapped_column(String(50), default="EMERGENCY")
    reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    navigation_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    emergency_alert_sent: Mapped[bool] = mapped_column(default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    recommendation: Mapped[Optional["Recommendation"]] = relationship(back_populates="referral")
    follow_ups: Mapped[list["FollowUp"]] = relationship(back_populates="referral")


class FollowUp(Base):
    """5. Care & Follow-up -> Monitoring & Follow-up."""
    __tablename__ = "follow_ups"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    patient_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("patients.id"), nullable=True)
    referral_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("referrals.id"), nullable=True)
    scheduled_at: Mapped[datetime] = mapped_column(DateTime)
    completed: Mapped[bool] = mapped_column(default=False)
    notes: Mapped[str] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    referral: Mapped["Referral"] = relationship(back_populates="follow_ups")

