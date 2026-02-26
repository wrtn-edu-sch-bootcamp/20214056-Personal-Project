"""Portfolio upload / parse endpoints."""

from __future__ import annotations

import uuid
from fastapi import APIRouter, HTTPException, UploadFile, File

from app.models.schemas import (
    PortfolioTextRequest,
    PortfolioUrlRequest,
    PortfolioGitHubRequest,
    PortfolioResponse,
    PortfolioUpdateRequest,
)
from app.services.portfolio_parser import PortfolioParserService

router = APIRouter(prefix="/api/portfolio", tags=["portfolio"])

# In-memory store (replaced by DB in production)
_store: dict[str, PortfolioResponse] = {}
_parser = PortfolioParserService()


@router.post("/upload", response_model=PortfolioResponse)
async def upload_pdf(file: UploadFile = File(...)):
    """Parse an uploaded PDF portfolio."""
    content = await file.read()
    raw_text = _parser.extract_text_from_pdf(content)
    portfolio = await _parser.structure_with_llm(raw_text)
    pid = str(uuid.uuid4())
    resp = PortfolioResponse(id=pid, portfolio=portfolio, raw_text=raw_text)
    _store[pid] = resp
    return resp


@router.post("/parse-url", response_model=PortfolioResponse)
async def parse_url(req: PortfolioUrlRequest):
    """Crawl a portfolio website and extract structured data."""
    raw_text = await _parser.extract_text_from_url(req.url)
    portfolio = await _parser.structure_with_llm(raw_text)
    pid = str(uuid.uuid4())
    resp = PortfolioResponse(id=pid, portfolio=portfolio, raw_text=raw_text)
    _store[pid] = resp
    return resp


@router.post("/parse-github", response_model=PortfolioResponse)
async def parse_github(req: PortfolioGitHubRequest):
    """Analyse a GitHub profile and extract structured data."""
    import httpx as _httpx
    try:
        raw_text = await _parser.extract_text_from_github(req.username)
    except (ValueError, _httpx.HTTPStatusError) as e:
        # Surface user-facing errors (rate limit, invalid username, etc.) as 400
        raise HTTPException(status_code=400, detail=str(e))
    portfolio = await _parser.structure_with_llm(raw_text)
    pid = str(uuid.uuid4())
    resp = PortfolioResponse(id=pid, portfolio=portfolio, raw_text=raw_text)
    _store[pid] = resp
    return resp


@router.post("/manual", response_model=PortfolioResponse)
async def manual_input(req: PortfolioTextRequest):
    """Accept free-form text and extract structured data."""
    portfolio = await _parser.structure_with_llm(req.text)
    pid = str(uuid.uuid4())
    resp = PortfolioResponse(id=pid, portfolio=portfolio, raw_text=req.text)
    _store[pid] = resp
    return resp


@router.put("/{portfolio_id}", response_model=PortfolioResponse)
async def update_portfolio(portfolio_id: str, req: PortfolioUpdateRequest):
    """User confirms / edits the extracted portfolio."""
    existing = _store.get(portfolio_id)
    raw = existing.raw_text if existing else None
    resp = PortfolioResponse(id=portfolio_id, portfolio=req.portfolio, raw_text=raw)
    _store[portfolio_id] = resp
    return resp


@router.get("/{portfolio_id}", response_model=PortfolioResponse)
async def get_portfolio(portfolio_id: str):
    """Retrieve a previously parsed portfolio."""
    resp = _store.get(portfolio_id)
    if resp is None:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Portfolio not found")
    return resp
