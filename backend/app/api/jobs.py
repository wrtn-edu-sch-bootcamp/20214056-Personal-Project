"""Job recommendation endpoints.

Returns both external API jobs and company-registered jobs in a unified format.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.db.database import get_db
from app.db import crud
from app.db.models import CompanyJobPosting, Company
from app.models.schemas import (
    JobRecommendationResponse,
    JobPosting,
    PortfolioSchema,
)
from app.services.job_matcher import JobMatcherService

router = APIRouter(prefix="/api/jobs", tags=["jobs"])
_matcher = JobMatcherService()


async def _fetch_company_jobs(db: AsyncSession, keyword: str = "") -> list[JobPosting]:
    """Convert published CompanyJobPostings from DB into JobPosting schema."""
    query = (
        select(CompanyJobPosting)
        .where(CompanyJobPosting.status == "published")
        .options(selectinload(CompanyJobPosting.company))
    )
    result = await db.execute(query)
    rows = list(result.scalars().all())

    jobs: list[JobPosting] = []
    kw = keyword.lower()
    for r in rows:
        company_name = r.company.name if r.company else "Unknown"
        reqs = r.requirements_json or []
        prefs = r.preferred_json or []

        # Apply keyword filter if present
        if kw:
            searchable = f"{r.title} {r.description or ''} {' '.join(reqs)} {' '.join(prefs)}".lower()
            if kw not in searchable:
                continue

        jobs.append(JobPosting(
            id=f"cjp-{r.id}",  # prefix to distinguish from external jobs
            title=r.title,
            company=company_name,
            location=r.location,
            description=r.description,
            requirements=reqs,
            preferred=prefs,
            salary=r.salary,
            url=None,
        ))
    return jobs


@router.get("/recommend", response_model=JobRecommendationResponse)
async def recommend_jobs(
    portfolio_id: str = Query(..., description="ID of the parsed portfolio"),
    limit: int = Query(10, ge=1, le=50),
    db: AsyncSession = Depends(get_db),
):
    """Return job postings ranked by similarity to the portfolio.

    Merges external API jobs with company-registered postings.
    """
    row = await crud.get_portfolio(db, portfolio_id)
    if row is None:
        raise HTTPException(status_code=404, detail="Portfolio not found")

    portfolio = PortfolioSchema.model_validate(row.portfolio_json)

    # Get external + mock jobs via matcher
    external_jobs = await _matcher.recommend(portfolio, limit=limit)

    # Get company DB jobs (unranked, embedding done separately if needed)
    company_jobs = await _fetch_company_jobs(db)

    # Merge: external (already ranked) first, then company jobs at the end
    merged = external_jobs + company_jobs
    return JobRecommendationResponse(jobs=merged[:limit], total=len(merged))


@router.get("/search", response_model=JobRecommendationResponse)
async def search_jobs(
    q: str = Query(..., description="Search keyword"),
    limit: int = Query(10, ge=1, le=50),
    db: AsyncSession = Depends(get_db),
):
    """Keyword-based job search across external APIs and company postings."""
    # External/mock search
    external = await _matcher.search(q, limit=limit)

    # Company DB search
    company_results = await _fetch_company_jobs(db, keyword=q)

    merged = external + company_results
    return JobRecommendationResponse(jobs=merged[:limit], total=len(merged))


@router.get("/{job_id}", response_model=JobPosting)
async def get_job(job_id: str, db: AsyncSession = Depends(get_db)):
    """Get a single job posting detail (external or company-registered)."""
    # Check company DB first
    if job_id.startswith("cjp-"):
        real_id = job_id[4:]
        result = await db.execute(
            select(CompanyJobPosting)
            .where(CompanyJobPosting.id == real_id)
            .options(selectinload(CompanyJobPosting.company))
        )
        r = result.scalar_one_or_none()
        if r:
            return JobPosting(
                id=job_id,
                title=r.title,
                company=r.company.name if r.company else "Unknown",
                location=r.location,
                description=r.description,
                requirements=r.requirements_json or [],
                preferred=r.preferred_json or [],
                salary=r.salary,
                url=None,
            )

    # Fall back to external/mock
    job = _matcher.get_by_id(job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="Job not found")
    return job
