"""Job matching service.

Provides:
- Job postings from DB crawled data, Saramin/WorkNet APIs (with mock fallback)
- Embedding-based similarity matching between portfolio and job descriptions
- Keyword search
"""

from __future__ import annotations

import logging

import numpy as np
from google import genai
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.models.schemas import PortfolioSchema, JobPosting
from app.services.job_fetcher import fetch_all_jobs

logger = logging.getLogger(__name__)

# ── Mock data for MVP ──────────────────────────────────────────

MOCK_JOBS: list[JobPosting] = [
    JobPosting(
        id="job-001",
        title="백엔드 개발자 (Python/FastAPI)",
        company="테크스타트업 A",
        location="서울 강남구",
        description="Python 기반 백엔드 서비스를 설계·운영할 백엔드 개발자를 찾습니다. "
                    "FastAPI, SQLAlchemy, PostgreSQL 경험자 우대.",
        requirements=["Python 3년 이상", "REST API 설계 경험", "RDBMS 실무 경험"],
        preferred=["FastAPI", "Docker", "AWS", "CI/CD"],
        salary="5,000만~7,000만 원",
        url="https://example.com/jobs/001",
    ),
    JobPosting(
        id="job-002",
        title="프론트엔드 개발자 (React/Next.js)",
        company="커머스 플랫폼 B",
        location="서울 성수동",
        description="React 및 Next.js 기반 웹 애플리케이션을 개발할 프론트엔드 개발자를 모집합니다.",
        requirements=["React 2년 이상", "TypeScript", "상태관리 라이브러리 경험"],
        preferred=["Next.js", "Tailwind CSS", "Storybook", "테스트 자동화"],
        salary="4,500만~6,500만 원",
        url="https://example.com/jobs/002",
    ),
    JobPosting(
        id="job-003",
        title="풀스택 개발자",
        company="핀테크 스타트업 C",
        location="서울 여의도",
        description="금융 서비스 플랫폼의 프론트엔드와 백엔드를 모두 담당할 풀스택 개발자를 찾습니다.",
        requirements=["Python 또는 Node.js", "React 또는 Vue.js", "DB 설계 경험"],
        preferred=["금융 도메인 경험", "MSA", "Kubernetes"],
        salary="6,000만~8,000만 원",
        url="https://example.com/jobs/003",
    ),
    JobPosting(
        id="job-004",
        title="ML 엔지니어",
        company="AI 리서치 D",
        location="판교",
        description="추천 시스템 및 NLP 모델 개발·서빙을 담당할 ML 엔지니어를 모집합니다.",
        requirements=["Python", "PyTorch 또는 TensorFlow", "ML 파이프라인 구축 경험"],
        preferred=["NLP", "추천 시스템", "MLOps", "LLM fine-tuning"],
        salary="6,000만~9,000만 원",
        url="https://example.com/jobs/004",
    ),
    JobPosting(
        id="job-005",
        title="DevOps 엔지니어",
        company="클라우드 서비스 E",
        location="서울 강남구",
        description="인프라 자동화 및 CI/CD 파이프라인을 구축·운영할 DevOps 엔지니어를 찾습니다.",
        requirements=["AWS 또는 GCP 실무 경험", "Docker/Kubernetes", "IaC (Terraform 등)"],
        preferred=["모니터링 (Prometheus/Grafana)", "GitOps", "보안 자동화"],
        salary="5,500만~8,000만 원",
        url="https://example.com/jobs/005",
    ),
    JobPosting(
        id="job-006",
        title="데이터 엔지니어",
        company="데이터 플랫폼 F",
        location="서울 삼성동",
        description="대규모 데이터 파이프라인 설계 및 운영을 담당할 데이터 엔지니어를 모집합니다.",
        requirements=["Python/Scala", "Apache Spark", "SQL 고급"],
        preferred=["Airflow", "Kafka", "데이터 레이크 설계", "dbt"],
        salary="5,500만~7,500만 원",
        url="https://example.com/jobs/006",
    ),
    JobPosting(
        id="job-007",
        title="iOS 개발자 (Swift)",
        company="헬스케어 스타트업 G",
        location="서울 강남구",
        description="건강 관리 앱을 개발할 iOS 개발자를 찾습니다.",
        requirements=["Swift 2년 이상", "UIKit 또는 SwiftUI", "앱 출시 경험"],
        preferred=["HealthKit", "Core Data", "CI/CD"],
        salary="5,000만~7,000만 원",
        url="https://example.com/jobs/007",
    ),
    JobPosting(
        id="job-008",
        title="Android 개발자 (Kotlin)",
        company="모빌리티 서비스 H",
        location="서울 서초구",
        description="Kotlin 기반 Android 앱을 개발할 엔지니어를 모집합니다.",
        requirements=["Kotlin 2년 이상", "Jetpack Compose", "MVVM 패턴"],
        preferred=["Google Maps SDK", "BLE", "멀티모듈 아키텍처"],
        salary="5,000만~7,000만 원",
        url="https://example.com/jobs/008",
    ),
    JobPosting(
        id="job-009",
        title="보안 엔지니어",
        company="보안 솔루션 I",
        location="판교",
        description="클라우드 보안 및 취약점 분석을 담당할 보안 엔지니어를 찾습니다.",
        requirements=["정보보안 2년 이상", "네트워크 보안 이해", "취약점 진단 경험"],
        preferred=["CISSP/CISA", "AWS Security", "침투 테스트"],
        salary="5,500만~8,500만 원",
        url="https://example.com/jobs/009",
    ),
    JobPosting(
        id="job-010",
        title="QA 엔지니어",
        company="게임 회사 J",
        location="서울 구로구",
        description="게임 품질 보증 및 자동화 테스트를 담당할 QA 엔지니어를 모집합니다.",
        requirements=["QA 2년 이상", "테스트 계획 수립 경험", "버그 트래킹 도구 사용"],
        preferred=["Selenium/Appium", "Python 자동화", "게임 도메인 경험"],
        salary="4,000만~6,000만 원",
        url="https://example.com/jobs/010",
    ),
]

# Index by ID for quick lookup
_JOBS_BY_ID: dict[str, JobPosting] = {j.id: j for j in MOCK_JOBS}


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
        self._client = genai.Client(api_key=settings.gemini_api_key)
        self._embed_model = settings.gemini_embedding_model

    async def _embed(self, text: str) -> list[float]:
        resp = await self._client.aio.models.embed_content(
            model=self._embed_model,
            contents=text,
        )
        return resp.embeddings[0].values

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
    ) -> list[JobPosting]:
        """Fetch jobs: DB crawled (priority) > API > mock data.

        When a DB session is provided, crawled jobs are queried first.
        API sources fill in when DB data is insufficient.
        Mock data serves as the ultimate fallback.
        """
        # Attempt DB + API fetch (fetch_all_jobs handles priority internally)
        live_jobs = await fetch_all_jobs(keywords=keywords, count_each=30, db=db)
        if live_jobs:
            # Merge with mock data so there is always a baseline set
            existing_ids = {j.id for j in live_jobs}
            extra_mock = [j for j in MOCK_JOBS if j.id not in existing_ids]
            return live_jobs + extra_mock

        # All sources returned empty → use mock only
        logger.info("No live or crawled jobs available; using mock data only")
        return list(MOCK_JOBS)

    async def recommend(
        self,
        portfolio: PortfolioSchema,
        limit: int = 10,
        db: AsyncSession | None = None,
    ) -> list[JobPosting]:
        """Rank jobs by cosine similarity to the portfolio embedding.

        Priority: DB crawled data > API data > mock data.
        Falls back to unranked list when Gemini key is absent.
        """
        settings = get_settings()

        # Derive keywords from portfolio for API/DB queries
        kw_hint = " ".join(portfolio.keywords[:5]) if portfolio.keywords else ""
        pool = await self._get_job_pool(keywords=kw_hint, db=db)

        # Without Gemini key, return pool as-is (no embedding ranking)
        if not settings.gemini_api_key:
            logger.warning("GEMINI_API_KEY not set – returning unranked job list")
            return pool[:limit]

        portfolio_text = self._portfolio_to_text(portfolio)
        portfolio_emb = await self._embed(portfolio_text)

        scored: list[tuple[float, JobPosting]] = []
        for job in pool:
            job_emb = await self._embed(self._job_to_text(job))
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
        """Keyword search: queries DB crawled data + APIs, then filters."""
        live_jobs = await fetch_all_jobs(keywords=keyword, count_each=20, db=db)
        pool = live_jobs if live_jobs else list(MOCK_JOBS)

        kw = keyword.lower()
        matched = [
            j for j in pool
            if kw in j.title.lower()
            or kw in (j.description or "").lower()
            or any(kw in r.lower() for r in j.requirements)
            or any(kw in p.lower() for p in j.preferred)
        ] or pool  # if no keyword match, return all fetched results

        # Register fetched jobs in lookup index for interview linkage
        for job in pool:
            _JOBS_BY_ID[job.id] = job

        return matched[:limit]

    def get_by_id(self, job_id: str) -> JobPosting | None:
        return _JOBS_BY_ID.get(job_id)
