import uuid

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import decode_access_token
from app.models import User
from app.models.enums import UserRole

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")


async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db),
) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    payload = decode_access_token(token)
    if payload is None or "sub" not in payload:
        raise credentials_exception

    try:
        user_id = uuid.UUID(payload["sub"])
    except ValueError:
        raise credentials_exception

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if user is None:
        raise credentials_exception
    return user


def require_role(*allowed_roles):
    """
    Dependency factory: require_role(UserRole.ADMIN) or
    require_role("admin", "doctor") for multiple.
    Raises 403 if the current user's role isn't in the allowed set.
    """
    role_strings = {r.value if hasattr(r, 'value') else str(r) for r in allowed_roles}

    async def _check(current_user: User = Depends(get_current_user)) -> User:
        user_role_str = current_user.role.value if hasattr(current_user.role, 'value') else str(current_user.role)
        if user_role_str not in role_strings and current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"This action requires one of these roles: {list(role_strings)}",
            )
        return current_user

    return _check

