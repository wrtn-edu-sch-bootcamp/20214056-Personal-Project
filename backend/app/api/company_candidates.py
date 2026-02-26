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


@router.get("/browse")
async def browse_public_portfolios(
    q: str = Query("", description="Optional keyword filter"),
    page: int = Query(1, ge=1, description="Page number"),
    size: int = Query(20, ge=1, le=100, description="Page size"),
    user: User = Depends(_company_user),
    db: AsyncSession = Depends(get_db),
):
    """Browse all public portfolios with optional keyword filter and pagination."""
    from sqlalchemy import func

    base_query = select(Portfolio).where(Portfolio.is_public == 1)

    # Optional keyword filter across name, summary, skills
    if q.strip():
        kw = q.strip().lower()
        # Filter in Python after fetch (simpler than JSONB queries)
        count_result = await db.execute(
            select(func.count()).select_from(Portfolio).where(Portfolio.is_public == 1)
        )
        all_result = await db.execute(
            base_query.order_by(Portfolio.updated_at.desc())
        )
        all_portfolios = list(all_result.scalars().all())

        filtered = []
        for pf in all_portfolios:
            pj = pf.portfolio_json or {}
            name = (pj.get("name") or "").lower()
            summary = (pj.get("summary") or "").lower()
            skills_text = " ".join(s.get("name", "") for s in pj.get("skills", [])).lower()
            keywords_text = " ".join(pj.get("keywords", [])).lower()
            if kw in name or kw in summary or kw in skills_text or kw in keywords_text:
                filtered.append(pf)

        total = len(filtered)
        offset = (page - 1) * size
        page_items = filtered[offset:offset + size]
    else:
        count_result = await db.execute(
            select(func.count()).select_from(Portfolio).where(Portfolio.is_public == 1)
        )
        total = count_result.scalar() or 0

        offset = (page - 1) * size
        result = await db.execute(
            base_query.order_by(Portfolio.updated_at.desc()).offset(offset).limit(size)
        )
        page_items = list(result.scalars().all())

    items = []
    for pf in page_items:
        pj = pf.portfolio_json or {}
        items.append({
            "portfolio_id": pf.id,
            "user_name": pj.get("name"),
            "summary": pj.get("summary"),
            "skills": [s.get("name", "") for s in pj.get("skills", [])][:10],
            "keywords": pj.get("keywords", [])[:8],
            "updated_at": pf.updated_at.isoformat() if pf.updated_at else None,
        })

    return {"items": items, "total": total, "page": page, "size": size}


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
