"""Job recommendation endpoints."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db
from app.db import crud
from app.models.schemas import (
    JobRecommendationResponse,
    JobPosting,
    PortfolioSchema,
)
from app.services.job_matcher import JobMatcherService

router = APIRouter(prefix="/api/jobs", tags=["jobs"])
_matcher = JobMatcherService()


@router.get("/recommend", response_model=JobRecommendationResponse)
async def recommend_jobs(
    portfolio_id: str = Query(..., description="ID of the parsed portfolio"),
    limit: int = Query(10, ge=1, le=50),
    db: AsyncSession = Depends(get_db),
):
    """Return job postings ranked by similarity to the portfolio."""
    row = await crud.get_portfolio(db, portfolio_id)
    if row is None:
        raise HTTPException(status_code=404, detail="Portfolio not found")

    portfolio = PortfolioSchema.model_validate(row.portfolio_json)
    jobs = await _matcher.recommend(portfolio, limit=limit)
    return JobRecommendationResponse(jobs=jobs, total=len(jobs))


@router.get("/search", response_model=JobRecommendationResponse)
async def search_jobs(
    q: str = Query(..., description="Search keyword"),
    limit: int = Query(10, ge=1, le=50),
):
    """Keyword-based job search."""
    jobs = await _matcher.search(q, limit=limit)
    return JobRecommendationResponse(jobs=jobs, total=len(jobs))


@router.get("/{job_id}", response_model=JobPosting)
async def get_job(job_id: str):
    """Get a single job posting detail."""
    job = _matcher.get_by_id(job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="Job not found")
    return job
