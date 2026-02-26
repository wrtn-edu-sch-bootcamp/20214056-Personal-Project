"""Company profile and job posting management endpoints."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db
from app.db.models import Company, CompanyJobPosting, User
from app.models.schemas import (
    CompanyResponse,
    CompanyUpdateRequest,
    CompanyJobPostingCreate,
    CompanyJobPostingUpdate,
    CompanyJobPostingResponse,
)
from app.services.auth import get_current_user, require_role

router = APIRouter(prefix="/api/company", tags=["company"])

# Dependency: current user must have role='company'
_company_user = require_role("company")


def _company_resp(c: Company) -> CompanyResponse:
    return CompanyResponse(
        id=c.id,
        name=c.name,
        description=c.description,
        website=c.website,
        industry=c.industry,
        size=c.size,
        logo_url=c.logo_url,
    )


def _job_resp(j: CompanyJobPosting, company_name: str | None = None) -> CompanyJobPostingResponse:
    return CompanyJobPostingResponse(
        id=j.id,
        company_id=j.company_id,
        company_name=company_name,
        title=j.title,
        description=j.description,
        requirements=j.requirements_json or [],
        preferred=j.preferred_json or [],
        location=j.location,
        salary=j.salary,
        status=j.status,
        created_at=j.created_at.isoformat() if j.created_at else "",
        updated_at=j.updated_at.isoformat() if j.updated_at else None,
    )


async def _get_company(db: AsyncSession, user: User) -> Company:
    """Fetch the Company linked to this user, or 404."""
    result = await db.execute(select(Company).where(Company.user_id == user.id))
    company = result.scalar_one_or_none()
    if company is None:
        raise HTTPException(status_code=404, detail="Company profile not found")
    return company


# ── Company Profile ──────────────────────────────────────────

@router.get("/me", response_model=CompanyResponse)
async def get_my_company(
    user: User = Depends(_company_user),
    db: AsyncSession = Depends(get_db),
):
    company = await _get_company(db, user)
    return _company_resp(company)


@router.put("/me", response_model=CompanyResponse)
async def update_my_company(
    req: CompanyUpdateRequest,
    user: User = Depends(_company_user),
    db: AsyncSession = Depends(get_db),
):
    company = await _get_company(db, user)
    for field in ("name", "description", "website", "industry", "size"):
        val = getattr(req, field, None)
        if val is not None:
            setattr(company, field, val)
    await db.commit()
    await db.refresh(company)
    return _company_resp(company)


# ── Job Postings CRUD ────────────────────────────────────────

@router.post("/jobs", response_model=CompanyJobPostingResponse, status_code=201)
async def create_job(
    req: CompanyJobPostingCreate,
    user: User = Depends(_company_user),
    db: AsyncSession = Depends(get_db),
):
    company = await _get_company(db, user)
    job = CompanyJobPosting(
        company_id=company.id,
        title=req.title,
        description=req.description,
        requirements_json=req.requirements,
        preferred_json=req.preferred,
        location=req.location,
        salary=req.salary,
        status=req.status,
    )
    db.add(job)
    await db.commit()
    await db.refresh(job)
    return _job_resp(job, company.name)


@router.get("/jobs", response_model=list[CompanyJobPostingResponse])
async def list_my_jobs(
    user: User = Depends(_company_user),
    db: AsyncSession = Depends(get_db),
):
    company = await _get_company(db, user)
    result = await db.execute(
        select(CompanyJobPosting)
        .where(CompanyJobPosting.company_id == company.id)
        .order_by(CompanyJobPosting.created_at.desc())
    )
    return [_job_resp(j, company.name) for j in result.scalars().all()]


@router.get("/jobs/{job_id}", response_model=CompanyJobPostingResponse)
async def get_my_job(
    job_id: str,
    user: User = Depends(_company_user),
    db: AsyncSession = Depends(get_db),
):
    company = await _get_company(db, user)
    job = await db.get(CompanyJobPosting, job_id)
    if job is None or job.company_id != company.id:
        raise HTTPException(status_code=404, detail="Job posting not found")
    return _job_resp(job, company.name)


@router.put("/jobs/{job_id}", response_model=CompanyJobPostingResponse)
async def update_job(
    job_id: str,
    req: CompanyJobPostingUpdate,
    user: User = Depends(_company_user),
    db: AsyncSession = Depends(get_db),
):
    company = await _get_company(db, user)
    job = await db.get(CompanyJobPosting, job_id)
    if job is None or job.company_id != company.id:
        raise HTTPException(status_code=404, detail="Job posting not found")

    if req.title is not None:
        job.title = req.title
    if req.description is not None:
        job.description = req.description
    if req.requirements is not None:
        job.requirements_json = req.requirements
    if req.preferred is not None:
        job.preferred_json = req.preferred
    if req.location is not None:
        job.location = req.location
    if req.salary is not None:
        job.salary = req.salary

    await db.commit()
    await db.refresh(job)
    return _job_resp(job, company.name)


@router.delete("/jobs/{job_id}", status_code=204)
async def delete_job(
    job_id: str,
    user: User = Depends(_company_user),
    db: AsyncSession = Depends(get_db),
):
    company = await _get_company(db, user)
    job = await db.get(CompanyJobPosting, job_id)
    if job is None or job.company_id != company.id:
        raise HTTPException(status_code=404, detail="Job posting not found")
    await db.delete(job)
    await db.commit()


@router.patch("/jobs/{job_id}/status", response_model=CompanyJobPostingResponse)
async def change_job_status(
    job_id: str,
    new_status: str = Query(..., description="draft | published | closed"),
    user: User = Depends(_company_user),
    db: AsyncSession = Depends(get_db),
):
    if new_status not in ("draft", "published", "closed"):
        raise HTTPException(status_code=400, detail="status must be draft, published, or closed")
    company = await _get_company(db, user)
    job = await db.get(CompanyJobPosting, job_id)
    if job is None or job.company_id != company.id:
        raise HTTPException(status_code=404, detail="Job posting not found")
    job.status = new_status
    await db.commit()
    await db.refresh(job)
    return _job_resp(job, company.name)
