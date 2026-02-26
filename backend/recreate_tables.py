"""Drop and recreate all database tables. Use for dev only."""
import asyncio
from app.db.database import engine, Base
from app.db import models  # noqa: F401 – registers ORM models


async def main():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    await engine.dispose()
    print("All tables recreated successfully.")


if __name__ == "__main__":
    asyncio.run(main())
