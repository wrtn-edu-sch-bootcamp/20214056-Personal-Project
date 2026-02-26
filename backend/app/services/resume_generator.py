"""Tailored resume generation service.

Takes a PortfolioSchema + JobPosting + optional CompanyInfo and produces
a well-structured markdown resume customised for the target position.

Uses OpenAI gpt-4o-mini for generation.
"""

from __future__ import annotations

import logging

from openai import AsyncOpenAI

from app.config import get_settings
from app.models.schemas import CompanyInfo, JobPosting, PortfolioSchema

logger = logging.getLogger(__name__)

_SYSTEM_PROMPT = """\
You are an expert career consultant and resume writer.
Given a candidate's portfolio data, a target job posting, and optionally
information about the hiring company's culture / talent profile, produce
a polished, professional resume in **Markdown** format.

## Resume Structure (use these headings)
1. **인적사항** — name, contact (email, phone, links)
2. **자기소개** — 3-5 sentences tailored to the specific job & company
3. **핵심역량** — bullet list of 4-6 competencies most relevant to the job
4. **경력사항** — reverse-chronological, emphasise duties relevant to the job
5. **프로젝트** — pick the most relevant projects, highlight tech stack overlap
6. **기술스택** — grouped by category if possible
7. **학력** — degrees, institution, period
8. **자격증** — if any

## Rules
- Emphasise experiences and skills that match the job requirements / preferred qualifications.
- If company culture info is provided, align the tone and keywords of the self-introduction.
- Quantify achievements whenever possible (e.g. "처리 속도 40% 개선").
- Write in Korean. Technical terms may stay in English.
- Output ONLY the markdown resume — no extra commentary before or after.
"""


class ResumeGeneratorService:
    """Generates tailored markdown resumes via OpenAI LLM."""

    def __init__(self) -> None:
        settings = get_settings()
        self._client = AsyncOpenAI(api_key=settings.openai_api_key)
        self._model = settings.openai_model

    async def generate(
        self,
        portfolio: PortfolioSchema,
        job: JobPosting,
        company_info: CompanyInfo | None = None,
    ) -> str:
        """Generate a tailored markdown resume.

        Returns the raw markdown string.
        """
        # Build context sections
        portfolio_json = portfolio.model_dump_json(indent=2, exclude_none=True)
        job_json = job.model_dump_json(indent=2, exclude_none=True)

        user_parts: list[str] = [
            "--- 후보자 포트폴리오 ---",
            portfolio_json,
            "\n--- 대상 채용공고 ---",
            job_json,
        ]

        if company_info:
            company_json = company_info.model_dump_json(
                indent=2, exclude={"raw_text"}, exclude_none=True
            )
            user_parts.append("\n--- 채용 기업 정보 (인재상 · 핵심가치) ---")
            user_parts.append(company_json)
        else:
            user_parts.append(
                "\n(기업 인재상 정보를 수집하지 못했습니다. "
                "채용공고 정보만으로 이력서를 작성해 주세요.)"
            )

        user_content = "\n".join(user_parts)

        response = await self._client.chat.completions.create(
            model=self._model,
            messages=[
                {"role": "system", "content": _SYSTEM_PROMPT},
                {"role": "user", "content": user_content},
            ],
            temperature=0.4,
            max_tokens=4096,
        )

        markdown = (response.choices[0].message.content or "").strip()
        # Strip potential markdown code fences wrapping
        if markdown.startswith("```"):
            first_nl = markdown.index("\n")
            markdown = markdown[first_nl + 1:]
        if markdown.endswith("```"):
            markdown = markdown[:-3].rstrip()

        logger.info(
            "Resume generated: %d chars for job '%s' at '%s'",
            len(markdown), job.title, job.company,
        )
        return markdown
