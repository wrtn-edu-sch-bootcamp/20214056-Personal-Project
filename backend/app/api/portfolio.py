"""Portfolio upload / parse endpoints."""

from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db
from app.db import crud
from app.db.models import Portfolio, User
from app.models.schemas import (
    PortfolioTextRequest,
    PortfolioUrlRequest,
    PortfolioGitHubRequest,
    PortfolioResponse,
    PortfolioSchema,
    PortfolioUpdateRequest,
    PortfolioListResponse,
)
from app.services.auth import get_current_user, get_optional_user
from app.services.portfolio_parser import PortfolioParserService

router = APIRouter(prefix="/api/portfolio", tags=["portfolio"])
_parser = PortfolioParserService()


def _to_response(row) -> PortfolioResponse:
    """Convert a DB Portfolio row to the API response model."""
    return PortfolioResponse(
        id=row.id,
        portfolio=PortfolioSchema.model_validate(row.portfolio_json),
        raw_text=row.raw_text,
    )


async def _save_portfolio(
    db: AsyncSession, portfolio: PortfolioSchema, raw_text: str | None, user: User | None = None
) -> PortfolioResponse:
    pid = uuid.uuid4().hex
    row = Portfolio(
        id=pid,
        user_id=user.id if user else None,
        portfolio_json=portfolio.model_dump(),
        raw_text=raw_text,
    )
    db.add(row)
    await db.commit()
    await db.refresh(row)
    return _to_response(row)


# ── List & Delete (require authentication) ────────────────────

@router.get("", response_model=PortfolioListResponse)
async def list_portfolios(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Return all portfolios belonging to the authenticated user."""
    result = await db.execute(
        select(Portfolio)
        .where(Portfolio.user_id == current_user.id)
        .order_by(Portfolio.created_at.desc())
    )
    rows = list(result.scalars().all())
    return PortfolioListResponse(
        portfolios=[_to_response(r) for r in rows],
        total=len(rows),
    )


@router.delete("/{portfolio_id}", status_code=204)
async def delete_portfolio(
    portfolio_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete a portfolio owned by the authenticated user."""
    row = await crud.get_portfolio(db, portfolio_id)
    if row is None:
        raise HTTPException(status_code=404, detail="Portfolio not found")
    if row.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not your portfolio")
    await db.delete(row)
    await db.commit()


# ── Upload / Parse (optional auth — binds user_id when logged in) ──

@router.post("/upload", response_model=PortfolioResponse)
async def upload_pdf(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    user: User | None = Depends(get_optional_user),
):
    """Parse an uploaded PDF portfolio."""
    content = await file.read()
    raw_text = _parser.extract_text_from_pdf(content)
    portfolio = await _parser.structure_with_llm(raw_text)
    return await _save_portfolio(db, portfolio, raw_text, user)


@router.post("/parse-url", response_model=PortfolioResponse)
async def parse_url(
    req: PortfolioUrlRequest,
    db: AsyncSession = Depends(get_db),
    user: User | None = Depends(get_optional_user),
):
    """Crawl a portfolio website and extract structured data."""
    raw_text = await _parser.extract_text_from_url(req.url)
    portfolio = await _parser.structure_with_llm(raw_text)
    return await _save_portfolio(db, portfolio, raw_text, user)


@router.post("/parse-github", response_model=PortfolioResponse)
async def parse_github(
    req: PortfolioGitHubRequest,
    db: AsyncSession = Depends(get_db),
    user: User | None = Depends(get_optional_user),
):
    """Analyse a GitHub profile and extract structured data."""
    import httpx as _httpx
    try:
        raw_text = await _parser.extract_text_from_github(req.username)
    except (ValueError, _httpx.HTTPStatusError) as e:
        raise HTTPException(status_code=400, detail=str(e))
    portfolio = await _parser.structure_with_llm(raw_text)
    return await _save_portfolio(db, portfolio, raw_text, user)


@router.post("/manual", response_model=PortfolioResponse)
async def manual_input(
    req: PortfolioTextRequest,
    db: AsyncSession = Depends(get_db),
    user: User | None = Depends(get_optional_user),
):
    """Accept free-form text and extract structured data."""
    portfolio = await _parser.structure_with_llm(req.text)
    return await _save_portfolio(db, portfolio, req.text, user)


@router.put("/{portfolio_id}", response_model=PortfolioResponse)
async def update_portfolio(
    portfolio_id: str,
    req: PortfolioUpdateRequest,
    db: AsyncSession = Depends(get_db),
):
    """User confirms / edits the extracted portfolio."""
    row = await crud.update_portfolio(db, portfolio_id, req.portfolio.model_dump())
    if row is None:
        raise HTTPException(status_code=404, detail="Portfolio not found")
    return _to_response(row)


@router.get("/{portfolio_id}", response_model=PortfolioResponse)
async def get_portfolio(
    portfolio_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Retrieve a previously parsed portfolio."""
    row = await crud.get_portfolio(db, portfolio_id)
    if row is None:
        raise HTTPException(status_code=404, detail="Portfolio not found")
    return _to_response(row)
