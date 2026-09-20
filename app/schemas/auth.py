import uuid

from pydantic import BaseModel, EmailStr, field_validator

from app.models.enums import UserRole


class UserSignup(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    role: UserRole = UserRole.PATIENT

    @field_validator("role", mode="before")
    @classmethod
    def normalize_role(cls, v):
        if isinstance(v, UserRole):
            return v
        if isinstance(v, str):
            clean = v.strip().lower()
            for member in UserRole:
                if member.value == clean or member.name.lower() == clean:
                    return member
        return v


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: uuid.UUID
    email: EmailStr
    full_name: str
    role: UserRole

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut
