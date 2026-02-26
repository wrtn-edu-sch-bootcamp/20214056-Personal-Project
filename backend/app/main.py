"""FastAPI application entry point."""

from __future__ import annotations

import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.api import auth, portfolio, jobs, interview, resume, company, company_candidates
from app.db.database import engine, Base

logger = logging.getLogger(__name__)
settings = get_settings()

# ── Scheduler helper ──────────────────────────────────────────

_scheduler_task: asyncio.Task | None = None


async def _run_crawl_cycle() -> None:
    """Execute one crawl + cleanup cycle (called by scheduler loop)."""
    from app.services.saramin_crawler import crawl_all_keywords, deactivate_expired_jobs

    try:
        logger.info("Starting scheduled Saramin crawl cycle…")
        count = await crawl_all_keywords()
        logger.info("Saramin crawl finished: %d jobs upserted", count)
    except Exception as e:
        logger.error("Saramin crawl cycle failed: %s", e)

    try:
        deactivated = await deactivate_expired_jobs()
        if deactivated:
            logger.info("Deactivated %d expired jobs", deactivated)
    except Exception as e:
        logger.error("Expired-job cleanup failed: %s", e)


async def _scheduler_loop() -> None:
    """Simple async loop that runs the crawl at a fixed interval.

    APScheduler is a heavier dependency; for a single periodic task an
    asyncio.sleep-based loop is lighter and fully sufficient.
    """
    interval_hours = settings.crawl_interval_hours
    interval_secs = interval_hours * 3600

    # Run immediately on startup, then repeat at interval
    await _run_crawl_cycle()

    while True:
        await asyncio.sleep(interval_secs)
        await _run_crawl_cycle()


@asynccontextmanager
async def lifespan(application: FastAPI):
    global _scheduler_task

    # Ensure tables exist on startup
    from app.db import models  # noqa: F401 – registers ORM models
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # Launch background crawl scheduler if enabled
    if settings.crawl_enabled:
        logger.info(
            "Saramin crawl scheduler enabled (interval=%dh)",
            settings.crawl_interval_hours,
        )
        _scheduler_task = asyncio.create_task(_scheduler_loop())
    else:
        logger.info("Saramin crawl scheduler is disabled (CRAWL_ENABLED=false)")

    yield

    # Cancel background scheduler on shutdown
    if _scheduler_task is not None:
        _scheduler_task.cancel()
        try:
            await _scheduler_task
        except asyncio.CancelledError:
            pass

    await engine.dispose()


app = FastAPI(
    title="Portfolio Job Recommender API",
    description="포트폴리오 기반 채용 공고 추천 + 면접 시뮬레이션",
    version="0.1.0",
    lifespan=lifespan,
)

# CORS middleware for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API routers
app.include_router(auth.router)
app.include_router(portfolio.router)
app.include_router(jobs.router)
app.include_router(interview.router)
app.include_router(resume.router)
app.include_router(company.router)
app.include_router(company_candidates.router)


@app.get("/health")
async def health_check():
    return {"status": "ok"}


# ── Admin: manual crawl trigger & status ──────────────────────

@app.post("/api/admin/crawl/trigger")
async def trigger_crawl():
    """Manually trigger a Saramin crawl cycle (non-blocking)."""
    from app.services.saramin_crawler import crawl_all_keywords

    asyncio.create_task(crawl_all_keywords())
    return {"status": "crawl_started"}


@app.post("/api/admin/crawl/reset")
async def reset_and_crawl():
    """Delete ALL crawled jobs, then trigger a fresh crawl."""
    from sqlalchemy import text as sa_text
    from app.db.database import async_session as db_session
    from app.services.saramin_crawler import crawl_all_keywords

    async with db_session() as db:
        result = await db.execute(sa_text("DELETE FROM crawled_jobs"))
        deleted = result.rowcount
        await db.commit()

    asyncio.create_task(crawl_all_keywords())
    return {"deleted": deleted, "status": "crawl_started"}


@app.get("/api/admin/crawl/status")
async def crawl_status():
    """Return crawled job statistics."""
    from sqlalchemy import text as sa_text
    from app.db.database import async_session as db_session

    async with db_session() as db:
        row = await db.execute(sa_text(
            "SELECT COUNT(*) AS total, "
            "COUNT(*) FILTER (WHERE is_active = 1) AS active, "
            "MAX(crawled_at) AS last_crawled "
            "FROM crawled_jobs"
        ))
        r = row.one()
        return {
            "total_jobs": r.total,
            "active_jobs": r.active,
            "last_crawled_at": r.last_crawled.isoformat() if r.last_crawled else None,
            "scheduler_enabled": settings.crawl_enabled,
            "interval_hours": settings.crawl_interval_hours,
        }
