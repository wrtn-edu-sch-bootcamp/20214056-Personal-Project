"""Interview simulation endpoints."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException

from app.models.schemas import (
    InterviewStartRequest,
    InterviewStartResponse,
    InterviewAnswerRequest,
    InterviewAnswerResponse,
    InterviewEndRequest,
    InterviewEndResponse,
    InterviewHistoryResponse,
)
from app.services.interview_agent import InterviewAgentService

router = APIRouter(prefix="/api/interview", tags=["interview"])

_agent = InterviewAgentService()


@router.post("/start", response_model=InterviewStartResponse)
async def start_interview(req: InterviewStartRequest):
    """Begin a new interview session."""
    # Fetch portfolio from in-memory store
    from app.api.portfolio import _store as portfolio_store
    portfolio_resp = portfolio_store.get(req.portfolio_id)
    if portfolio_resp is None:
        raise HTTPException(status_code=404, detail="Portfolio not found")

    # Optionally fetch the target job posting
    job = None
    if req.job_id:
        from app.services.job_matcher import JobMatcherService
        matcher = JobMatcherService()
        job = matcher.get_by_id(req.job_id)

    session = await _agent.start_session(
        portfolio=portfolio_resp.portfolio,
        job=job,
        interview_type=req.interview_type,
    )
    return session


@router.post("/answer", response_model=InterviewAnswerResponse)
async def submit_answer(req: InterviewAnswerRequest):
    """Submit a candidate answer and receive feedback + next question."""
    result = await _agent.process_answer(req.session_id, req.answer)
    if result is None:
        raise HTTPException(status_code=404, detail="Session not found")
    return result


@router.post("/end", response_model=InterviewEndResponse)
async def end_interview(req: InterviewEndRequest):
    """End the interview and get overall evaluation."""
    result = await _agent.end_session(req.session_id)
    if result is None:
        raise HTTPException(status_code=404, detail="Session not found")
    return result


@router.get("/{session_id}/history", response_model=InterviewHistoryResponse)
async def get_history(session_id: str):
    """Retrieve full conversation history for a session."""
    history = _agent.get_history(session_id)
    if history is None:
        raise HTTPException(status_code=404, detail="Session not found")
    return history
