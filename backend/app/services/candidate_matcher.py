"""Candidate matching service — ranks public portfolios against a job posting.

Uses the same Gemini Embedding + cosine similarity approach as JobMatcherService,
but in the reverse direction (job → portfolio ranking).
"""

from __future__ import annotations

import logging
from typing import TYPE_CHECKING

import numpy as np
from google import genai

from app.config import get_settings
from app.models.schemas import CandidateMatchItem, PortfolioSchema

if TYPE_CHECKING:
    from app.db.models import CompanyJobPosting, Portfolio

logger = logging.getLogger(__name__)


def _cosine_similarity(a: list[float], b: list[float]) -> float:
    va, vb = np.array(a), np.array(b)
    denom = np.linalg.norm(va) * np.linalg.norm(vb)
    if denom == 0:
        return 0.0
    return float(np.dot(va, vb) / denom)


class CandidateMatcherService:
    """Ranks public portfolios by similarity to a given company job posting."""

    def __init__(self) -> None:
        settings = get_settings()
        self._client = genai.Client(api_key=settings.gemini_api_key)
        self._embed_model = settings.gemini_embedding_model

    async def _embed(self, text: str) -> list[float]:
        resp = await self._client.aio.models.embed_content(
            model=self._embed_model,
            contents=text,
        )
        return resp.embeddings[0].values

    def _job_to_text(self, job: CompanyJobPosting) -> str:
        parts = [job.title]
        if job.description:
            parts.append(job.description)
        reqs = job.requirements_json or []
        if reqs:
            parts.append("Requirements: " + ", ".join(reqs))
        prefs = job.preferred_json or []
        if prefs:
            parts.append("Preferred: " + ", ".join(prefs))
        if job.location:
            parts.append(f"Location: {job.location}")
        return "\n".join(parts)

    def _portfolio_to_text(self, pf_json: dict) -> str:
        parts: list[str] = []
        if pf_json.get("summary"):
            parts.append(pf_json["summary"])
        skills = pf_json.get("skills", [])
        if skills:
            parts.append("Skills: " + ", ".join(s.get("name", "") for s in skills))
        for exp in pf_json.get("experiences", []):
            parts.append(f"{exp.get('company', '')} - {exp.get('role', '')}: {exp.get('description', '')}")
        for proj in pf_json.get("projects", []):
            ts = ", ".join(proj.get("tech_stack", []))
            parts.append(f"Project {proj.get('name', '')}: {proj.get('description', '')} [{ts}]")
        kws = pf_json.get("keywords", [])
        if kws:
            parts.append("Keywords: " + ", ".join(kws))
        return "\n".join(parts)

    async def match(
        self,
        job: CompanyJobPosting,
        portfolios: list[Portfolio],
        limit: int = 20,
    ) -> list[CandidateMatchItem]:
        """Rank portfolios by cosine similarity to the job posting."""
        if not portfolios:
            return []

        settings = get_settings()

        # Without Gemini key, return unranked list
        if not settings.gemini_api_key:
            logger.warning("GEMINI_API_KEY not set — returning unranked candidate list")
            items = []
            for i, pf in enumerate(portfolios[:limit]):
                pj = pf.portfolio_json or {}
                items.append(CandidateMatchItem(
                    rank=i + 1,
                    portfolio_id=pf.id,
                    user_name=pj.get("name"),
                    summary=pj.get("summary"),
                    skills=[s.get("name", "") for s in pj.get("skills", [])][:10],
                    similarity_score=0.0,
                ))
            return items

        job_text = self._job_to_text(job)
        job_emb = await self._embed(job_text)

        scored: list[tuple[float, Portfolio]] = []
        for pf in portfolios:
            pj = pf.portfolio_json or {}
            pf_text = self._portfolio_to_text(pj)
            if not pf_text.strip():
                continue
            pf_emb = await self._embed(pf_text)
            score = _cosine_similarity(job_emb, pf_emb)
            scored.append((score, pf))

        scored.sort(key=lambda x: x[0], reverse=True)

        results: list[CandidateMatchItem] = []
        for rank, (score, pf) in enumerate(scored[:limit], start=1):
            pj = pf.portfolio_json or {}
            results.append(CandidateMatchItem(
                rank=rank,
                portfolio_id=pf.id,
                user_name=pj.get("name"),
                summary=pj.get("summary"),
                skills=[s.get("name", "") for s in pj.get("skills", [])][:10],
                similarity_score=round(score, 4),
            ))
        return results
