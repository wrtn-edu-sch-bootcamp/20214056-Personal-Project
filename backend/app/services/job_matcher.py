"""Job matching service.

Provides:
- Job postings exclusively from DB crawled data
- Embedding-based similarity matching between portfolio and job descriptions
- Keyword search

Uses OpenAI text-embedding-3-small for embeddings.
"""

from __future__ import annotations

import logging

import numpy as np
from openai import AsyncOpenAI
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.models.schemas import PortfolioSchema, JobPosting
from app.services.job_fetcher import fetch_all_jobs

logger = logging.getLogger(__name__)

# Runtime lookup cache for job detail pages / interview linkage
_JOBS_BY_ID: dict[str, JobPosting] = {}


def _cosine_similarity(a: list[float], b: list[float]) -> float:
    va, vb = np.array(a), np.array(b)
    denom = np.linalg.norm(va) * np.linalg.norm(vb)
    if denom == 0:
        return 0.0
    return float(np.dot(va, vb) / denom)


class JobMatcherService:
    """Matches portfolios to jobs via embedding cosine similarity."""

    def __init__(self) -> None:
        settings = get_settings()
        self._client = AsyncOpenAI(api_key=settings.openai_api_key)
        self._embed_model = settings.openai_embedding_model

    async def _embed(self, text: str) -> list[float]:
        """Embed a single text string."""
        resp = await self._client.embeddings.create(
            model=self._embed_model,
            input=text,
        )
        return resp.data[0].embedding

    async def _embed_batch(self, texts: list[str]) -> list[list[float]]:
        """Embed multiple texts in a single API call (batch)."""
        if not texts:
            return []
        resp = await self._client.embeddings.create(
            model=self._embed_model,
            input=texts,
        )
        # OpenAI returns embeddings sorted by index
        return [item.embedding for item in sorted(resp.data, key=lambda x: x.index)]

    def _portfolio_to_text(self, portfolio: PortfolioSchema) -> str:
        """Flatten portfolio into a single text blob for embedding."""
        parts: list[str] = []
        if portfolio.summary:
            parts.append(portfolio.summary)
        if portfolio.skills:
            parts.append("Skills: " + ", ".join(s.name for s in portfolio.skills))
        for exp in portfolio.experiences:
            parts.append(f"{exp.company} - {exp.role}: {exp.description or ''}")
        for proj in portfolio.projects:
            parts.append(
                f"Project {proj.name}: {proj.description or ''} "
                f"[{', '.join(proj.tech_stack)}]"
            )
        if portfolio.keywords:
            parts.append("Keywords: " + ", ".join(portfolio.keywords))
        return "\n".join(parts)

    def _job_to_text(self, job: JobPosting) -> str:
        parts = [job.title, job.company]
        if job.description:
            parts.append(job.description)
        if job.requirements:
            parts.append("Requirements: " + ", ".join(job.requirements))
        if job.preferred:
            parts.append("Preferred: " + ", ".join(job.preferred))
        return "\n".join(parts)

    async def _get_job_pool(
        self,
        keywords: str = "",
        db: AsyncSession | None = None,
        experience: str | None = None,
        locations: list[str] | None = None,
    ) -> list[JobPosting]:
        """Fetch jobs from crawled DB with optional experience/location filters."""
        jobs = await fetch_all_jobs(
            keywords=keywords, count_each=50, db=db,
            experience=experience, locations=locations,
        )

        # Register in lookup cache
        for job in jobs:
            _JOBS_BY_ID[job.id] = job

        return jobs

    async def recommend(
        self,
        portfolio: PortfolioSchema,
        limit: int = 10,
        db: AsyncSession | None = None,
        experience_level: str | None = None,
        preferred_locations: list[str] | None = None,
    ) -> list[JobPosting]:
        """Rank jobs by cosine similarity to the portfolio embedding.

        Applies experience/location pre-filtering when provided.
        Falls back to unfiltered pool if filtered results are too few (<5).
        """
        settings = get_settings()

        # Resolve filters: explicit params override portfolio fields
        exp = experience_level or portfolio.experience_level
        locs = preferred_locations if preferred_locations else (portfolio.preferred_locations or None)

        # Try filtered pool first
        pool = await self._get_job_pool(keywords="", db=db, experience=exp, locations=locs)

        # Fallback: if filtered pool is too small, relax filters progressively
        if len(pool) < 5:
            if exp and locs:
                # Try location-only
                pool = await self._get_job_pool(keywords="", db=db, locations=locs)
            if len(pool) < 5:
                # Fully unfiltered fallback
                pool = await self._get_job_pool(keywords="", db=db)
                logger.info("Filter fallback: using unfiltered pool (%d jobs)", len(pool))

        if not pool:
            logger.warning("No crawled jobs available for recommendation")
            return []

        # Without API key, return pool as-is (no embedding ranking)
        if not settings.openai_api_key:
            logger.warning("OPENAI_API_KEY not set — returning unranked job list")
            return pool[:limit]

        portfolio_text = self._portfolio_to_text(portfolio)

        # Build all texts: portfolio + all jobs → single batch embedding call
        job_texts = [self._job_to_text(job) for job in pool]
        all_texts = [portfolio_text] + job_texts

        try:
            all_embeddings = await self._embed_batch(all_texts)
        except Exception as e:
            logger.error("Batch embedding failed: %s", e)
            return pool[:limit]

        portfolio_emb = all_embeddings[0]
        job_embeddings = all_embeddings[1:]

        scored: list[tuple[float, JobPosting]] = []
        for job, job_emb in zip(pool, job_embeddings):
            score = _cosine_similarity(portfolio_emb, job_emb)
            scored.append((score, job))

        scored.sort(key=lambda x: x[0], reverse=True)

        results: list[JobPosting] = []
        for score, job in scored[:limit]:
            results.append(job.model_copy(update={"similarity_score": round(score, 4)}))
        return results

    async def search(
        self,
        keyword: str,
        limit: int = 10,
        db: AsyncSession | None = None,
    ) -> list[JobPosting]:
        """Keyword search: queries crawled DB only."""
        pool = await fetch_all_jobs(keywords=keyword, count_each=20, db=db)

        # Register in lookup cache
        for job in pool:
            _JOBS_BY_ID[job.id] = job

        if not pool:
            return []

        kw = keyword.lower()
        matched = [
            j for j in pool
            if kw in j.title.lower()
            or kw in (j.description or "").lower()
            or any(kw in r.lower() for r in j.requirements)
            or any(kw in p.lower() for p in j.preferred)
        ] or pool

        return matched[:limit]

    def get_by_id(self, job_id: str) -> JobPosting | None:
        return _JOBS_BY_ID.get(job_id)
