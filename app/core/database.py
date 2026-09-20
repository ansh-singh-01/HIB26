from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase

from app.core.config import settings

extra_args = {}
if "sqlite" in settings.DATABASE_URL:
    extra_args["connect_args"] = {"check_same_thread": False}
elif "mysql" in settings.DATABASE_URL:
    extra_args["pool_recycle"] = 3600
    extra_args["pool_pre_ping"] = True

engine = create_async_engine(settings.DATABASE_URL, echo=(settings.ENVIRONMENT == "development"), **extra_args)



AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


class Base(DeclarativeBase):
    pass


async def get_db():
    """FastAPI dependency that yields a DB session per request."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()
