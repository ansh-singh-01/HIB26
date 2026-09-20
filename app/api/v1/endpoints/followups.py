import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models import Patient, Recommendation, Referral, FollowUp, User
from app.schemas.followup import FollowUpCreate, FollowUpOut

router = APIRouter()


async def _get_owned_referral_or_404(db: AsyncSession, referral_id: uuid.UUID, current_user: User) -> Referral:
    """A patient can only touch follow-ups on their own referrals."""
    result = await db.execute(select(Patient).where(Patient.user_id == current_user.id))
    patient = result.scalar_one_or_none()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient profile not found.")

    result = await db.execute(
        select(Referral)
        .join(Recommendation, Referral.recommendation_id == Recommendation.id)
        .where(Referral.id == referral_id, Recommendation.patient_id == patient.id)
    )
    referral = result.scalar_one_or_none()
    if not referral:
        raise HTTPException(status_code=404, detail="Referral not found for this patient.")
    return referral


@router.post("/referrals/{referral_id}/follow-ups", response_model=FollowUpOut, status_code=201)
async def schedule_follow_up(
    referral_id: uuid.UUID,
    payload: FollowUpCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """5. Care & Follow-up -> Monitoring & Follow-up."""
    await _get_owned_referral_or_404(db, referral_id, current_user)

    follow_up = FollowUp(
        referral_id=referral_id,
        scheduled_at=payload.scheduled_at,
        notes=payload.notes,
    )
    db.add(follow_up)
    await db.commit()
    await db.refresh(follow_up)
    return follow_up


@router.get("/referrals/{referral_id}/follow-ups", response_model=list[FollowUpOut])
async def list_follow_ups(
    referral_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await _get_owned_referral_or_404(db, referral_id, current_user)
    result = await db.execute(
        select(FollowUp).where(FollowUp.referral_id == referral_id).order_by(FollowUp.scheduled_at)
    )
    return result.scalars().all()


@router.patch("/follow-ups/{follow_up_id}/complete", response_model=FollowUpOut)
async def complete_follow_up(
    follow_up_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(FollowUp).where(FollowUp.id == follow_up_id))
    follow_up = result.scalar_one_or_none()
    if not follow_up:
        raise HTTPException(status_code=404, detail="Follow-up not found.")

    # ownership check via the parent referral
    await _get_owned_referral_or_404(db, follow_up.referral_id, current_user)

    follow_up.completed = True
    await db.commit()
    await db.refresh(follow_up)
    return follow_up


@router.get("/follow-ups/due", response_model=list[FollowUpOut])
async def due_follow_ups(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Follow-ups scheduled in the past that are still not completed, for this patient."""
    result = await db.execute(select(Patient).where(Patient.user_id == current_user.id))
    patient = result.scalar_one_or_none()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient profile not found.")

    result = await db.execute(
        select(FollowUp)
        .join(Referral, FollowUp.referral_id == Referral.id)
        .join(Recommendation, Referral.recommendation_id == Recommendation.id)
        .where(
            Recommendation.patient_id == patient.id,
            FollowUp.completed == False,  # noqa: E712
            FollowUp.scheduled_at <= datetime.utcnow(),
        )
        .order_by(FollowUp.scheduled_at)
    )
    return result.scalars().all()
