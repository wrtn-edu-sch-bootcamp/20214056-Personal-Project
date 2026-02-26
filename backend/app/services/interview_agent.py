"""Interview simulation agent.

Manages multi-turn interview sessions powered by Gemini 2.0 Flash.
Each session maintains its own conversation history so the model can ask
follow-up questions that probe deeper into the candidate's answers.

Gemini uses a different multi-turn format from OpenAI:
  - roles are "user" / "model" (not "assistant")
  - system instruction is passed separately via GenerateContentConfig
  - history is passed as a list of Content objects
"""

from __future__ import annotations

import json
import logging
import uuid
from dataclasses import dataclass, field
from typing import Any

from google import genai
from google.genai import types

from app.config import get_settings
from app.models.schemas import (
    InterviewStartResponse,
    InterviewAnswerResponse,
    InterviewEndResponse,
    InterviewHistoryResponse,
    InterviewMessage,
    JobPosting,
    PortfolioSchema,
)

logger = logging.getLogger(__name__)


def _build_system_instruction(
    portfolio: PortfolioSchema,
    job: JobPosting | None,
    interview_type: str,
) -> str:
    """Construct a rich system instruction with all available context."""

    skills_str = ", ".join(s.name for s in portfolio.skills) if portfolio.skills else "N/A"
    projects_str = "\n".join(
        f"- {p.name}: {p.description or ''} [{', '.join(p.tech_stack)}]"
        for p in portfolio.projects
    ) or "N/A"
    experiences_str = "\n".join(
        f"- {e.company} / {e.role} ({e.period or ''}): {e.description or ''}"
        for e in portfolio.experiences
    ) or "N/A"

    job_section = ""
    if job:
        job_section = f"""
## Target Job Posting
- Title: {job.title}
- Company: {job.company}
- Description: {job.description or 'N/A'}
- Requirements: {', '.join(job.requirements)}
- Preferred: {', '.join(job.preferred)}
"""

    type_instructions = {
        "technical": (
            "Focus on technical depth: ask about system design, algorithms, "
            "specific technologies the candidate has used, debugging scenarios, "
            "and architecture decisions in their projects."
        ),
        "behavioral": (
            "Focus on behavioral/situational questions: teamwork, conflict resolution, "
            "leadership, handling pressure, communication, and past work situations."
        ),
        "general": (
            "Mix technical and behavioral questions. Start with general questions "
            "and gradually increase depth based on the candidate's responses."
        ),
    }

    return f"""\
You are a professional Korean tech interviewer conducting a {interview_type} interview.

## Candidate Portfolio
- Name: {portfolio.name or 'N/A'}
- Summary: {portfolio.summary or 'N/A'}
- Skills: {skills_str}
- Experiences:
{experiences_str}
- Projects:
{projects_str}
{job_section}

## Interview Instructions
{type_instructions.get(interview_type, type_instructions['general'])}

Rules:
1. Ask ONE question at a time.
2. After the candidate answers, provide brief constructive feedback, then ask the next question.
3. Tailor questions to the candidate's actual experience and the target job requirements.
4. Be professional but friendly. Conduct the interview in Korean.
5. Progressively increase question difficulty.
6. Cover 5-8 questions in a full interview session.
7. When providing feedback on an answer, note both strengths and areas for improvement.
"""


# JSON schema for structured evaluation (Gemini controlled generation format)
_EVALUATION_SCHEMA: dict[str, Any] = {
    "type": "object",
    "properties": {
        "overall_feedback": {"type": "string"},
        "score":            {"type": "number"},
        "strengths":        {"type": "array", "items": {"type": "string"}},
        "improvements":     {"type": "array", "items": {"type": "string"}},
    },
    "required": ["overall_feedback", "score", "strengths", "improvements"],
}


def _make_content(role: str, text: str) -> types.Content:
    """Create a Gemini Content object."""
    return types.Content(role=role, parts=[types.Part(text=text)])


@dataclass
class _Session:
    """Internal state for a single interview session."""
    session_id: str
    portfolio: PortfolioSchema
    job: JobPosting | None
    interview_type: str
    system_instruction: str
    # Gemini history: list of Content(role="user"|"model", parts=[Part(text=...)])
    history: list[types.Content] = field(default_factory=list)
    question_count: int = 0
    max_questions: int = 7


class InterviewAgentService:
    """Manages interview sessions with Gemini 2.0 Flash."""

    def __init__(self) -> None:
        settings = get_settings()
        self._client = genai.Client(api_key=settings.gemini_api_key)
        self._model = settings.gemini_model
        self._sessions: dict[str, _Session] = {}

    async def _chat(
        self,
        session: _Session,
        user_text: str,
        json_schema: dict[str, Any] | None = None,
    ) -> str:
        """Send a message within a session and return the model reply."""
        # Append the new user turn to history
        session.history.append(_make_content("user", user_text))

        config = types.GenerateContentConfig(
            system_instruction=session.system_instruction,
            temperature=0.7,
        )
        if json_schema:
            config = types.GenerateContentConfig(
                system_instruction=session.system_instruction,
                response_mime_type="application/json",
                response_schema=json_schema,
                temperature=0.3,
            )

        response = await self._client.aio.models.generate_content(
            model=self._model,
            contents=session.history,
            config=config,
        )
        reply = response.text or ""

        # Append model reply to history for next turn
        session.history.append(_make_content("model", reply))
        return reply

    async def start_session(
        self,
        portfolio: PortfolioSchema,
        job: JobPosting | None,
        interview_type: str,
    ) -> InterviewStartResponse:
        """Create a new interview session and return the first question."""
        session_id = str(uuid.uuid4())
        system_instruction = _build_system_instruction(portfolio, job, interview_type)

        session = _Session(
            session_id=session_id,
            portfolio=portfolio,
            job=job,
            interview_type=interview_type,
            system_instruction=system_instruction,
            question_count=1,
        )
        self._sessions[session_id] = session

        first_question = await self._chat(session, "면접을 시작해 주세요. 첫 번째 질문을 해 주세요.")
        return InterviewStartResponse(
            session_id=session_id,
            first_question=first_question,
        )

    async def process_answer(
        self, session_id: str, answer: str
    ) -> InterviewAnswerResponse | None:
        """Process candidate answer, return feedback + next question."""
        session = self._sessions.get(session_id)
        if session is None:
            return None

        is_last = session.question_count >= session.max_questions

        user_text = answer
        if is_last:
            user_text += (
                "\n\n이것이 마지막 질문에 대한 답변입니다. "
                "답변에 대한 피드백만 제공하고, 면접이 종료되었음을 안내해 주세요."
            )

        reply = await self._chat(session, user_text)
        session.question_count += 1

        return InterviewAnswerResponse(
            feedback=reply,
            next_question=None if is_last else reply,
            is_finished=is_last,
        )

    async def end_session(self, session_id: str) -> InterviewEndResponse | None:
        """End the session and produce a structured evaluation."""
        session = self._sessions.get(session_id)
        if session is None:
            return None

        eval_prompt = (
            "면접이 종료되었습니다. 지금까지의 모든 질문과 답변을 종합하여 "
            "후보자에 대한 전체 평가를 작성해 주세요. "
            "100점 만점 기준 점수, 강점, 개선점을 포함해 주세요."
        )

        content = await self._chat(session, eval_prompt, json_schema=_EVALUATION_SCHEMA)
        evaluation = json.loads(content)

        return InterviewEndResponse(
            session_id=session_id,
            overall_feedback=evaluation.get("overall_feedback", ""),
            score=evaluation.get("score"),
            strengths=evaluation.get("strengths", []),
            improvements=evaluation.get("improvements", []),
        )

    def get_history(self, session_id: str) -> InterviewHistoryResponse | None:
        """Return the full conversation history for a session."""
        session = self._sessions.get(session_id)
        if session is None:
            return None

        messages: list[InterviewMessage] = []
        for content in session.history:
            role = "interviewer" if content.role == "model" else "candidate"
            text = content.parts[0].text if content.parts else ""
            messages.append(InterviewMessage(role=role, content=text))

        return InterviewHistoryResponse(
            session_id=session_id,
            messages=messages,
        )
