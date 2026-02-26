"""Resume generation endpoints."""

from __future__ import annotations

import logging
import uuid

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db
from app.db import crud
from app.db.models import Resume as ResumeModel, User
from app.models.schemas import (
    CompanyInfo,
    PortfolioSchema,
    ResumeGenerateRequest,
    ResumeResponse,
    ResumeListItem,
)
from app.services.auth import get_current_user, get_optional_user
from app.services.company_crawler import CompanyCrawlerService
from app.services.resume_generator import ResumeGeneratorService
from app.services.pdf_converter import markdown_to_pdf

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/resume", tags=["resume"])

_crawler = CompanyCrawlerService()
_generator = ResumeGeneratorService()


@router.get("/list", response_model=list[ResumeListItem])
async def list_resumes(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Return all resumes belonging to the authenticated user."""
    result = await db.execute(
        select(ResumeModel)
        .where(ResumeModel.user_id == current_user.id)
        .order_by(ResumeModel.created_at.desc())
    )
    rows = list(result.scalars().all())
    items = []
    for r in rows:
        ci = r.company_info_json or {}
        items.append(ResumeListItem(
            id=r.id,
            job_id=r.job_id,
            company_name=ci.get("name"),
            crawl_success=bool(r.crawl_success),
            created_at=r.created_at.isoformat() if r.created_at else "",
        ))
    return items


@router.post("/generate", response_model=ResumeResponse)
async def generate_resume(
    req: ResumeGenerateRequest,
    db: AsyncSession = Depends(get_db),
    user: User | None = Depends(get_optional_user),
):
    """Generate a tailored resume for a specific job posting."""
    pf_row = await crud.get_portfolio(db, req.portfolio_id)
    if pf_row is None:
        raise HTTPException(status_code=404, detail="Portfolio not found")
    portfolio = PortfolioSchema.model_validate(pf_row.portfolio_json)

    from app.services.job_matcher import JobMatcherService
    matcher = JobMatcherService()
    job = matcher.get_by_id(req.job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="Job not found")

    company_url = req.company_url or job.url
    company_info = None
    crawl_success = False
    try:
        company_info, crawl_success = await _crawler.crawl_company(
            company_name=job.company, company_url=company_url
        )
    except Exception as e:
        logger.warning("Company crawl failed for '%s': %s", job.company, e)

    try:
        markdown = await _generator.generate(
            portfolio=portfolio, job=job, company_info=company_info
        )
    except Exception as e:
        logger.error("Resume generation failed: %s", e)
        raise HTTPException(status_code=500, detail=f"Resume generation failed: {e}")

    resume_id = uuid.uuid4().hex
    ci_json = company_info.model_dump() if company_info else None

    row = ResumeModel(
        id=resume_id,
        portfolio_id=req.portfolio_id,
        user_id=user.id if user else None,
        job_id=req.job_id,
        markdown_content=markdown,
        company_info_json=ci_json,
        crawl_success=1 if crawl_success else 0,
    )
    db.add(row)
    await db.commit()
    await db.refresh(row)

    return ResumeResponse(
        id=resume_id,
        markdown_content=markdown,
        company_info=company_info,
        crawl_success=crawl_success,
    )


@router.get("/{resume_id}", response_model=ResumeResponse)
async def get_resume(resume_id: str, db: AsyncSession = Depends(get_db)):
    """Retrieve a previously generated resume."""
    row = await crud.get_resume(db, resume_id)
    if row is None:
        raise HTTPException(status_code=404, detail="Resume not found")
    ci = CompanyInfo.model_validate(row.company_info_json) if row.company_info_json else None
    return ResumeResponse(
        id=row.id,
        markdown_content=row.markdown_content,
        company_info=ci,
        crawl_success=bool(row.crawl_success),
    )


@router.get("/{resume_id}/pdf")
async def download_resume_pdf(resume_id: str, db: AsyncSession = Depends(get_db)):
    """Download a generated resume as PDF."""
    row = await crud.get_resume(db, resume_id)
    if row is None:
        raise HTTPException(status_code=404, detail="Resume not found")
    try:
        pdf_bytes = markdown_to_pdf(row.markdown_content)
    except Exception as e:
        logger.error("PDF conversion failed: %s", e)
        raise HTTPException(status_code=500, detail=f"PDF conversion failed: {e}")
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="resume_{resume_id[:8]}.pdf"'},
    )
