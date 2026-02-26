"""Database CRUD operations for all entities."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import (
    InterviewMessage as InterviewMessageModel,
    InterviewSession,
    Portfolio,
    Resume,
)


# ── Portfolio ────────────────────────────────────────────────

async def create_portfolio(
    db: AsyncSession,
    portfolio_id: str,
    portfolio_json: dict[str, Any],
    raw_text: str | None,
) -> Portfolio:
    row = Portfolio(id=portfolio_id, portfolio_json=portfolio_json, raw_text=raw_text)
    db.add(row)
    await db.commit()
    await db.refresh(row)
    return row


async def get_portfolio(db: AsyncSession, portfolio_id: str) -> Portfolio | None:
    return await db.get(Portfolio, portfolio_id)


async def update_portfolio(
    db: AsyncSession,
    portfolio_id: str,
    portfolio_json: dict[str, Any],
) -> Portfolio | None:
    row = await db.get(Portfolio, portfolio_id)
    if row is None:
        return None
    row.portfolio_json = portfolio_json
    row.updated_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(row)
    return row


# ── Resume ───────────────────────────────────────────────────

async def create_resume(
    db: AsyncSession,
    resume_id: str,
    portfolio_id: str,
    job_id: str,
    markdown_content: str,
    company_info_json: dict[str, Any] | None,
    crawl_success: bool,
) -> Resume:
    row = Resume(
        id=resume_id,
        portfolio_id=portfolio_id,
        job_id=job_id,
        markdown_content=markdown_content,
        company_info_json=company_info_json,
        crawl_success=1 if crawl_success else 0,
    )
    db.add(row)
    await db.commit()
    await db.refresh(row)
    return row


async def get_resume(db: AsyncSession, resume_id: str) -> Resume | None:
    return await db.get(Resume, resume_id)


# ── Interview ────────────────────────────────────────────────

async def create_interview_session(
    db: AsyncSession,
    session_id: str,
    portfolio_id: str,
    job_id: str | None,
    interview_type: str,
) -> InterviewSession:
    row = InterviewSession(
        id=session_id,
        portfolio_id=portfolio_id,
        job_id=job_id,
        interview_type=interview_type,
    )
    db.add(row)
    await db.commit()
    await db.refresh(row)
    return row


async def get_interview_session(db: AsyncSession, session_id: str) -> InterviewSession | None:
    return await db.get(InterviewSession, session_id)


async def finish_interview_session(
    db: AsyncSession,
    session_id: str,
    overall_feedback: str,
    score: float | None,
    strengths: list[str],
    improvements: list[str],
) -> InterviewSession | None:
    row = await db.get(InterviewSession, session_id)
    if row is None:
        return None
    row.overall_feedback = overall_feedback
    row.score = score
    row.strengths_json = strengths
    row.improvements_json = improvements
    row.finished_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(row)
    return row


async def add_interview_message(
    db: AsyncSession,
    session_id: str,
    seq: int,
    role: str,
    content: str,
) -> InterviewMessageModel:
    row = InterviewMessageModel(
        session_id=session_id,
        seq=seq,
        role=role,
        content=content,
    )
    db.add(row)
    await db.commit()
    return row


async def get_interview_messages(
    db: AsyncSession, session_id: str
) -> list[InterviewMessageModel]:
    result = await db.execute(
        select(InterviewMessageModel)
        .where(InterviewMessageModel.session_id == session_id)
        .order_by(InterviewMessageModel.seq)
    )
    return list(result.scalars().all())
