"""Interview simulation endpoints."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db
from app.db import crud
from app.db.models import InterviewSession as InterviewSessionModel, User
from app.models.schemas import (
    InterviewStartRequest,
    InterviewStartResponse,
    InterviewAnswerRequest,
    InterviewAnswerResponse,
    InterviewEndRequest,
    InterviewEndResponse,
    InterviewHistoryResponse,
    InterviewMessage,
    InterviewSessionListItem,
    PortfolioSchema,
)
from app.services.auth import get_current_user, get_optional_user
from app.services.interview_agent import InterviewAgentService

router = APIRouter(prefix="/api/interview", tags=["interview"])

_agent = InterviewAgentService()


@router.get("/list", response_model=list[InterviewSessionListItem])
async def list_sessions(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Return all interview sessions belonging to the authenticated user."""
    result = await db.execute(
        select(InterviewSessionModel)
        .where(InterviewSessionModel.user_id == current_user.id)
        .order_by(InterviewSessionModel.created_at.desc())
    )
    rows = list(result.scalars().all())
    return [
        InterviewSessionListItem(
            id=r.id,
            job_id=r.job_id,
            interview_type=r.interview_type or "technical",
            score=r.score,
            overall_feedback=r.overall_feedback,
            created_at=r.created_at.isoformat() if r.created_at else "",
            finished_at=r.finished_at.isoformat() if r.finished_at else None,
        )
        for r in rows
    ]


@router.post("/start", response_model=InterviewStartResponse)
async def start_interview(
    req: InterviewStartRequest,
    db: AsyncSession = Depends(get_db),
    user: User | None = Depends(get_optional_user),
):
    """Begin a new interview session."""
    row = await crud.get_portfolio(db, req.portfolio_id)
    if row is None:
        raise HTTPException(status_code=404, detail="Portfolio not found")
    portfolio = PortfolioSchema.model_validate(row.portfolio_json)

    job = None
    if req.job_id:
        from app.services.job_matcher import JobMatcherService
        matcher = JobMatcherService()
        job = matcher.get_by_id(req.job_id)

    session = await _agent.start_session(
        portfolio=portfolio, job=job, interview_type=req.interview_type,
    )

    db_session = InterviewSessionModel(
        id=session.session_id,
        portfolio_id=req.portfolio_id,
        user_id=user.id if user else None,
        job_id=req.job_id,
        interview_type=req.interview_type,
    )
    db.add(db_session)
    await db.commit()

    await crud.add_interview_message(
        db, session.session_id, 1, "interviewer", session.first_question,
    )

    return session


@router.post("/answer", response_model=InterviewAnswerResponse)
async def submit_answer(
    req: InterviewAnswerRequest,
    db: AsyncSession = Depends(get_db),
):
    """Submit a candidate answer and receive feedback + next question."""
    result = await _agent.process_answer(req.session_id, req.answer)
    if result is None:
        raise HTTPException(status_code=404, detail="Session not found")

    existing = await crud.get_interview_messages(db, req.session_id)
    seq = len(existing) + 1
    await crud.add_interview_message(db, req.session_id, seq, "candidate", req.answer)
    if result.next_question:
        await crud.add_interview_message(
            db, req.session_id, seq + 1, "interviewer",
            f"{result.feedback}\n\n{result.next_question}",
        )

    return result


@router.post("/end", response_model=InterviewEndResponse)
async def end_interview(
    req: InterviewEndRequest,
    db: AsyncSession = Depends(get_db),
):
    """End the interview and get overall evaluation."""
    result = await _agent.end_session(req.session_id)
    if result is None:
        raise HTTPException(status_code=404, detail="Session not found")

    await crud.finish_interview_session(
        db, req.session_id,
        result.overall_feedback, result.score,
        result.strengths, result.improvements,
    )

    return result


@router.get("/{session_id}/history", response_model=InterviewHistoryResponse)
async def get_history(
    session_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Retrieve full conversation history for a session."""
    history = _agent.get_history(session_id)
    if history is not None:
        return history

    rows = await crud.get_interview_messages(db, session_id)
    if not rows:
        raise HTTPException(status_code=404, detail="Session not found")
    messages = [InterviewMessage(role=r.role, content=r.content) for r in rows]
    return InterviewHistoryResponse(session_id=session_id, messages=messages)
