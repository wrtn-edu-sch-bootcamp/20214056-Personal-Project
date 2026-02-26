import ssl

from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import DeclarativeBase

from app.config import get_settings

settings = get_settings()

# Neon (cloud PostgreSQL) requires SSL; local dev does not
_connect_args: dict = {}
if "neon.tech" in settings.database_url or "neon" in settings.database_url:
    ssl_ctx = ssl.create_default_context()
    _connect_args["ssl"] = ssl_ctx

engine = create_async_engine(
    settings.database_url,
    echo=False,
    connect_args=_connect_args,
)
async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


async def get_db() -> AsyncSession:  # type: ignore[misc]
    """Dependency that provides a DB session per request."""
    async with async_session() as session:
        yield session
