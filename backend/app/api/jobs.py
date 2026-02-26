"""Job recommendation endpoints."""

from __future__ import annotations

from fastapi import APIRouter, Query

from app.models.schemas import JobRecommendationResponse, JobPosting
from app.services.job_matcher import JobMatcherService

router = APIRouter(prefix="/api/jobs", tags=["jobs"])

_matcher = JobMatcherService()


@router.get("/recommend", response_model=JobRecommendationResponse)
async def recommend_jobs(
    portfolio_id: str = Query(..., description="ID of the parsed portfolio"),
    limit: int = Query(10, ge=1, le=50),
):
    """Return job postings ranked by similarity to the portfolio."""
    # Retrieve portfolio from in-memory store (shared with portfolio router)
    from app.api.portfolio import _store as portfolio_store
    portfolio_resp = portfolio_store.get(portfolio_id)
    if portfolio_resp is None:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Portfolio not found")

    jobs = await _matcher.recommend(portfolio_resp.portfolio, limit=limit)
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
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Job not found")
    return job
