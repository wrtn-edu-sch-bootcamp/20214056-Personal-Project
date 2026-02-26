"""Job posting fetcher — crawled DB only.

All job postings come from the Saramin web crawler (saramin_crawler.py).
External API sources (Saramin Open API, 고용24 WorkNet) have been removed.
"""

from __future__ import annotations

import logging
from sqlalchemy import select, or_, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import CrawledJob
from app.models.schemas import JobPosting

logger = logging.getLogger(__name__)


# ── DB Crawled Jobs ───────────────────────────────────────────


def _crawled_to_posting(row: CrawledJob) -> JobPosting:
    """Convert a CrawledJob ORM row into a JobPosting schema."""
    return JobPosting(
        id=f"crawled-{row.source_id}",
        title=row.title,
        company=row.company,
        location=row.location,
        description=row.description,
        requirements=row.requirements_json or [],
        preferred=row.preferred_json or [],
        salary=row.salary,
        url=row.url,
    )


async def fetch_crawled_jobs(
    db: AsyncSession,
    keywords: str = "",
    limit: int = 50,
) -> list[JobPosting]:
    """Query active crawled jobs from DB, optionally filtering by keyword.

    Uses ILIKE on title/description/company for broad keyword matching.
    """
    query = (
        select(CrawledJob)
        .where(CrawledJob.is_active == 1)
        .order_by(CrawledJob.crawled_at.desc())
    )

    if keywords:
        pattern = f"%{keywords}%"
        query = query.where(
            or_(
                CrawledJob.title.ilike(pattern),
                CrawledJob.description.ilike(pattern),
                CrawledJob.company.ilike(pattern),
            )
        )

    query = query.limit(limit)

    result = await db.execute(query)
    rows = result.scalars().all()
    return [_crawled_to_posting(r) for r in rows]


async def count_active_crawled_jobs(db: AsyncSession) -> int:
    """Return the total number of active crawled jobs in DB."""
    result = await db.execute(
        select(func.count()).select_from(CrawledJob).where(CrawledJob.is_active == 1)
    )
    return result.scalar() or 0


# ── Combined fetcher ──────────────────────────────────────────


async def fetch_all_jobs(
    keywords: str = "",
    count_each: int = 20,
    db: AsyncSession | None = None,
) -> list[JobPosting]:
    """Fetch jobs from the crawled DB exclusively.

    Returns whatever crawled jobs are available — no external API fallback.
    """
    if db is None:
        logger.warning("No DB session provided; returning empty job list")
        return []

    try:
        jobs = await fetch_crawled_jobs(db, keywords=keywords, limit=count_each * 2)
        logger.info("Returning %d crawled jobs from DB", len(jobs))
        return jobs
    except Exception as e:
        logger.error("Failed to query crawled jobs: %s", e)
        return []
