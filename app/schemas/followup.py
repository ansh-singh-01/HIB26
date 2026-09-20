import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict


class FollowUpCreate(BaseModel):
    scheduled_at: datetime
    notes: Optional[str] = None


class FollowUpUpdate(BaseModel):
    notes: Optional[str] = None


class FollowUpOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    patient_id: Optional[uuid.UUID] = None
    referral_id: Optional[uuid.UUID] = None
    scheduled_at: datetime
    completed: bool
    notes: Optional[str] = None
    created_at: datetime
