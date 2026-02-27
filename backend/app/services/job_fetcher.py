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


def _keyword_filter(keywords: str):
    """Build an ILIKE OR clause for keyword filtering."""
    pattern = f"%{keywords}%"
    return or_(
        CrawledJob.title.ilike(pattern),
        CrawledJob.description.ilike(pattern),
        CrawledJob.company.ilike(pattern),
    )


# Maps portfolio experience_level to ranges of years for matching against job postings
_EXP_YEAR_RANGES: dict[str, tuple[int, int]] = {
    "신입": (0, 1),
    "1~3년": (1, 3),
    "3~5년": (3, 5),
    "5~10년": (5, 10),
    "10년 이상": (10, 99),
}


def _experience_filter(experience_level: str):
    """Build filter that matches CrawledJob.experience against the given level.

    Job postings store experience as free text like "경력무관", "신입", "3년 이상", etc.
    We use ILIKE patterns to match broadly.
    """
    if experience_level == "신입":
        return or_(
            CrawledJob.experience.ilike("%신입%"),
            CrawledJob.experience.ilike("%무관%"),
            CrawledJob.experience.ilike("%경력무관%"),
            CrawledJob.experience == None,  # noqa: E711
        )

    year_range = _EXP_YEAR_RANGES.get(experience_level)
    if not year_range:
        return True  # no filter

    lo, hi = year_range
    # Match "무관" (any experience OK) plus patterns containing relevant year numbers
    clauses = [
        CrawledJob.experience.ilike("%무관%"),
        CrawledJob.experience.ilike("%경력무관%"),
    ]
    for y in range(lo, min(hi + 1, 16)):
        clauses.append(CrawledJob.experience.ilike(f"%{y}년%"))
    if experience_level == "신입":
        clauses.append(CrawledJob.experience.ilike("%신입%"))

    return or_(*clauses)


def _location_filter(locations: list[str]):
    """Build OR clause matching any of the given location keywords."""
    clauses = []
    for loc in locations:
        loc = loc.strip()
        if loc:
            clauses.append(CrawledJob.location.ilike(f"%{loc}%"))
    if not clauses:
        return True
    return or_(*clauses)


async def fetch_crawled_jobs(
    db: AsyncSession,
    keywords: str = "",
    limit: int = 50,
    offset: int = 0,
    experience: str | None = None,
    locations: list[str] | None = None,
) -> list[JobPosting]:
    """Query active crawled jobs from DB with optional keyword/experience/location filters.

    Uses ILIKE on title/description/company for broad keyword matching.
    experience: e.g. "신입", "1~3년" — matches against CrawledJob.experience column.
    locations: e.g. ["서울", "경기"] — OR-matched against CrawledJob.location column.
    """
    query = (
        select(CrawledJob)
        .where(CrawledJob.is_active == 1)
        .order_by(CrawledJob.crawled_at.desc())
    )

    if keywords:
        query = query.where(_keyword_filter(keywords))

    if experience:
        query = query.where(_experience_filter(experience))

    if locations:
        query = query.where(_location_filter(locations))

    query = query.offset(offset).limit(limit)

    result = await db.execute(query)
    rows = result.scalars().all()
    return [_crawled_to_posting(r) for r in rows]


async def count_active_crawled_jobs(db: AsyncSession, keywords: str = "") -> int:
    """Return the total number of active crawled jobs in DB."""
    query = select(func.count()).select_from(CrawledJob).where(CrawledJob.is_active == 1)
    if keywords:
        query = query.where(_keyword_filter(keywords))
    result = await db.execute(query)
    return result.scalar() or 0


# ── Combined fetcher ──────────────────────────────────────────


async def fetch_all_jobs(
    keywords: str = "",
    count_each: int = 20,
    db: AsyncSession | None = None,
    experience: str | None = None,
    locations: list[str] | None = None,
) -> list[JobPosting]:
    """Fetch jobs from the crawled DB exclusively.

    Returns whatever crawled jobs are available — no external API fallback.
    Supports optional experience/location pre-filtering at DB level.
    """
    if db is None:
        logger.warning("No DB session provided; returning empty job list")
        return []

    try:
        jobs = await fetch_crawled_jobs(
            db, keywords=keywords, limit=count_each * 2,
            experience=experience, locations=locations,
        )
        logger.info("Returning %d crawled jobs from DB (exp=%s, loc=%s)", len(jobs), experience, locations)
        return jobs
    except Exception as e:
        logger.error("Failed to query crawled jobs: %s", e)
        return []
