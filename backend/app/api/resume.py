"""Resume generation endpoints."""

from __future__ import annotations

import uuid
import logging

from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import Response

from app.models.schemas import (
    ResumeGenerateRequest,
    ResumeResponse,
)
from app.services.company_crawler import CompanyCrawlerService
from app.services.resume_generator import ResumeGeneratorService
from app.services.pdf_converter import markdown_to_pdf

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/resume", tags=["resume"])

_crawler = CompanyCrawlerService()
_generator = ResumeGeneratorService()

# In-memory store for generated resumes
_resume_store: dict[str, ResumeResponse] = {}


@router.post("/generate", response_model=ResumeResponse)
async def generate_resume(req: ResumeGenerateRequest):
    """Generate a tailored resume for a specific job posting.

    1. Fetch portfolio and job from in-memory stores
    2. Crawl company website for talent profile (best effort)
    3. Generate markdown resume via LLM
    4. Return the result
    """
    # Retrieve portfolio
    from app.api.portfolio import _store as portfolio_store
    portfolio_resp = portfolio_store.get(req.portfolio_id)
    if portfolio_resp is None:
        raise HTTPException(status_code=404, detail="Portfolio not found")

    # Retrieve job posting
    from app.services.job_matcher import JobMatcherService
    matcher = JobMatcherService()
    job = matcher.get_by_id(req.job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="Job not found")

    # Step 1: Crawl company info (best effort)
    company_url = req.company_url or job.url
    company_info = None
    crawl_success = False

    try:
        company_info, crawl_success = await _crawler.crawl_company(
            company_name=job.company,
            company_url=company_url,
        )
    except Exception as e:
        logger.warning("Company crawl failed for '%s': %s", job.company, e)

    # Step 2: Generate tailored resume
    try:
        markdown = await _generator.generate(
            portfolio=portfolio_resp.portfolio,
            job=job,
            company_info=company_info,
        )
    except Exception as e:
        logger.error("Resume generation failed: %s", e)
        raise HTTPException(status_code=500, detail=f"Resume generation failed: {e}")

    # Store and return
    resume_id = str(uuid.uuid4())
    resp = ResumeResponse(
        id=resume_id,
        markdown_content=markdown,
        company_info=company_info,
        crawl_success=crawl_success,
    )
    _resume_store[resume_id] = resp
    return resp


@router.get("/{resume_id}", response_model=ResumeResponse)
async def get_resume(resume_id: str):
    """Retrieve a previously generated resume."""
    resp = _resume_store.get(resume_id)
    if resp is None:
        raise HTTPException(status_code=404, detail="Resume not found")
    return resp


@router.get("/{resume_id}/pdf")
async def download_resume_pdf(resume_id: str):
    """Download a generated resume as PDF."""
    resp = _resume_store.get(resume_id)
    if resp is None:
        raise HTTPException(status_code=404, detail="Resume not found")

    try:
        pdf_bytes = markdown_to_pdf(resp.markdown_content)
    except Exception as e:
        logger.error("PDF conversion failed: %s", e)
        raise HTTPException(status_code=500, detail=f"PDF conversion failed: {e}")

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="resume_{resume_id[:8]}.pdf"'
        },
    )
