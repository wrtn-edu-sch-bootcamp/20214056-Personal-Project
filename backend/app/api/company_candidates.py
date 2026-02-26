"""Company-side candidate matching and search endpoints."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db
from app.db.models import Company, CompanyJobPosting, Portfolio, User
from app.models.schemas import (
    CandidateMatchResponse,
    CompanyJobPostingResponse,
    PortfolioResponse,
    PortfolioSchema,
)
from app.services.auth import require_role
from app.services.candidate_matcher import CandidateMatcherService

router = APIRouter(prefix="/api/company/candidates", tags=["company-candidates"])

_company_user = require_role("company")
_matcher = CandidateMatcherService()


async def _get_company(db: AsyncSession, user: User) -> Company:
    result = await db.execute(select(Company).where(Company.user_id == user.id))
    company = result.scalar_one_or_none()
    if company is None:
        raise HTTPException(status_code=404, detail="Company profile not found")
    return company


@router.get("/match", response_model=CandidateMatchResponse)
async def match_candidates(
    job_id: str = Query(..., description="ID of the company job posting"),
    limit: int = Query(20, ge=1, le=100),
    user: User = Depends(_company_user),
    db: AsyncSession = Depends(get_db),
):
    """Return public portfolios ranked by similarity to the given job posting."""
    company = await _get_company(db, user)
    job = await db.get(CompanyJobPosting, job_id)
    if job is None or job.company_id != company.id:
        raise HTTPException(status_code=404, detail="Job posting not found")

    # Fetch all public portfolios
    result = await db.execute(
        select(Portfolio).where(Portfolio.is_public == 1)
    )
    portfolios = list(result.scalars().all())

    candidates = await _matcher.match(job, portfolios, limit=limit)
    return CandidateMatchResponse(
        job_id=job_id,
        candidates=candidates,
        total=len(candidates),
    )


@router.get("/search")
async def search_candidates(
    q: str = Query(..., description="Keyword to search in public portfolios"),
    limit: int = Query(20, ge=1, le=100),
    user: User = Depends(_company_user),
    db: AsyncSession = Depends(get_db),
):
    """Keyword search across public portfolios."""
    result = await db.execute(
        select(Portfolio).where(Portfolio.is_public == 1)
    )
    portfolios = list(result.scalars().all())

    kw = q.lower()
    matched = []
    for pf in portfolios:
        raw = (pf.raw_text or "").lower()
        pj = pf.portfolio_json or {}
        skills_text = " ".join(s.get("name", "") for s in pj.get("skills", [])).lower()
        summary = (pj.get("summary") or "").lower()
        name = (pj.get("name") or "").lower()

        if kw in raw or kw in skills_text or kw in summary or kw in name:
            matched.append({
                "portfolio_id": pf.id,
                "user_name": pj.get("name"),
                "summary": pj.get("summary"),
                "skills": [s.get("name", "") for s in pj.get("skills", [])][:10],
            })
        if len(matched) >= limit:
            break

    return {"results": matched, "total": len(matched)}


@router.get("/{portfolio_id}")
async def get_public_portfolio(
    portfolio_id: str,
    user: User = Depends(_company_user),
    db: AsyncSession = Depends(get_db),
):
    """View a specific public portfolio (company access)."""
    pf = await db.get(Portfolio, portfolio_id)
    if pf is None or pf.is_public != 1:
        raise HTTPException(status_code=404, detail="Portfolio not found or not public")

    portfolio = PortfolioSchema.model_validate(pf.portfolio_json)
    return PortfolioResponse(id=pf.id, portfolio=portfolio, raw_text=None)
