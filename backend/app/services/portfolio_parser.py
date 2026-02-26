"""Portfolio parsing service.

Pipeline:
  1. Extract raw text from the input source (PDF / URL / GitHub / plain text).
  2. Send raw text to Gemini with a strict JSON schema to produce a
     unified PortfolioSchema.
  3. Return the structured result for user review.
"""

from __future__ import annotations

import io
import json
import logging
from typing import Any

import httpx
import pdfplumber
from bs4 import BeautifulSoup
from google import genai
from google.genai import types

from app.config import get_settings
from app.models.schemas import PortfolioSchema

logger = logging.getLogger(__name__)

# JSON schema that Gemini must follow (controlled generation)
_PORTFOLIO_JSON_SCHEMA: dict[str, Any] = {
    "type": "object",
    "properties": {
        "name": {"type": "string", "nullable": True},
        "contact": {
            "type": "object",
            "properties": {
                "email":    {"type": "string", "nullable": True},
                "phone":    {"type": "string", "nullable": True},
                "linkedin": {"type": "string", "nullable": True},
                "website":  {"type": "string", "nullable": True},
            },
        },
        "summary": {"type": "string", "nullable": True},
        "skills": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "name":        {"type": "string"},
                    "category":    {"type": "string", "nullable": True},
                    "proficiency": {"type": "string", "nullable": True},
                },
            },
        },
        "experiences": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "company":     {"type": "string"},
                    "role":        {"type": "string"},
                    "period":      {"type": "string", "nullable": True},
                    "description": {"type": "string", "nullable": True},
                },
            },
        },
        "projects": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "name":        {"type": "string"},
                    "description": {"type": "string", "nullable": True},
                    "tech_stack":  {"type": "array", "items": {"type": "string"}},
                    "role":        {"type": "string", "nullable": True},
                    "highlights":  {"type": "array", "items": {"type": "string"}},
                },
            },
        },
        "education": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "institution": {"type": "string"},
                    "degree":      {"type": "string", "nullable": True},
                    "major":       {"type": "string", "nullable": True},
                    "period":      {"type": "string", "nullable": True},
                },
            },
        },
        "certifications": {"type": "array", "items": {"type": "string"}},
        "keywords":       {"type": "array", "items": {"type": "string"}},
    },
    "required": [
        "name", "contact", "summary", "skills", "experiences",
        "projects", "education", "certifications", "keywords",
    ],
}

_SYSTEM_PROMPT = """\
You are a professional resume/portfolio analyst.
Given raw text extracted from a portfolio (resume, personal website, GitHub profile, etc.),
produce a structured JSON object following the provided schema.

Rules:
- Extract every piece of information you can find.
- If information for a field is not present, use null or an empty array as appropriate.
- Infer implicit skills from project descriptions (e.g. "Built a REST API with FastAPI" -> add FastAPI, Python).
- The 'keywords' field should contain the most important terms for job matching (technologies, domains, roles).
- Always respond in the same language as the input text.
"""


class PortfolioParserService:
    """Handles multi-source portfolio text extraction and LLM structuring."""

    def __init__(self) -> None:
        settings = get_settings()
        self._client = genai.Client(api_key=settings.gemini_api_key)
        self._model = settings.gemini_model

    # ── 1. Text extraction per source ──────────────────────────

    def extract_text_from_pdf(self, pdf_bytes: bytes) -> str:
        """Extract text content from PDF bytes using pdfplumber."""
        text_parts: list[str] = []
        with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
            for page in pdf.pages:
                page_text = page.extract_text()
                if page_text:
                    text_parts.append(page_text)

                # Also extract tables and convert to readable text
                for table in page.extract_tables():
                    for row in table:
                        cells = [c or "" for c in row]
                        text_parts.append(" | ".join(cells))

        return "\n\n".join(text_parts)

    async def extract_text_from_url(self, url: str) -> str:
        """Crawl a portfolio website and extract main content."""
        async with httpx.AsyncClient(follow_redirects=True, timeout=30) as client:
            resp = await client.get(url)
            resp.raise_for_status()

        soup = BeautifulSoup(resp.text, "html.parser")

        # Remove noise elements
        for tag in soup.find_all(["nav", "footer", "header", "script", "style", "noscript"]):
            tag.decompose()

        # Prefer main content areas
        main = soup.find("main") or soup.find("article") or soup.find("body")
        if main is None:
            return soup.get_text(separator="\n", strip=True)

        return main.get_text(separator="\n", strip=True)

    async def extract_text_from_github(self, username: str, max_repos: int = 10) -> str:
        """Pull profile bio, top repositories, READMEs, and language stats.

        Falls back gracefully when unauthenticated rate limit (60 req/hr) is hit.
        Set GITHUB_TOKEN env var to raise the limit to 5000 req/hr.
        """
        settings = get_settings()
        headers: dict[str, str] = {"Accept": "application/vnd.github+json"}
        if settings.github_token:
            headers["Authorization"] = f"Bearer {settings.github_token}"

        parts: list[str] = []

        async with httpx.AsyncClient(base_url="https://api.github.com", headers=headers, timeout=30) as gh:
            # User profile
            user_resp = await gh.get(f"/users/{username}")
            if user_resp.status_code == 401:
                raise ValueError(
                    "GitHub API 인증 실패입니다. GITHUB_TOKEN 환경변수를 설정해 주세요. "
                    "https://github.com/settings/tokens 에서 토큰 발급 후 "
                    "backend/.env 의 GITHUB_TOKEN 항목에 추가하면 됩니다."
                )
            if user_resp.status_code == 403:
                remaining = user_resp.headers.get("X-RateLimit-Remaining", "?")
                raise ValueError(
                    f"GitHub API rate limit 초과(남은 횟수: {remaining}). "
                    "잠시 후 재시도하거나 GITHUB_TOKEN을 설정해 주세요."
                )
            if user_resp.status_code == 404:
                raise ValueError(
                    f"GitHub 사용자 '{username}'을(를) 찾을 수 없습니다. "
                    "사용자명(username)만 입력했는지 확인해 주세요."
                )
            user_resp.raise_for_status()

            user = user_resp.json()
            parts.append(f"Name: {user.get('name', username)}")
            if user.get("bio"):
                parts.append(f"Bio: {user['bio']}")
            if user.get("company"):
                parts.append(f"Company: {user['company']}")
            if user.get("blog"):
                parts.append(f"Blog: {user['blog']}")
            if user.get("location"):
                parts.append(f"Location: {user['location']}")
            if user.get("public_repos"):
                parts.append(f"Public repos: {user['public_repos']}")

            # Repositories sorted by stars
            repos_resp = await gh.get(
                f"/users/{username}/repos",
                params={"sort": "stars", "direction": "desc", "per_page": max_repos},
            )
            repos = repos_resp.json() if repos_resp.status_code == 200 else []

            for repo in repos:
                if repo.get("fork"):
                    continue
                entry = f"\n## Repository: {repo['name']}"
                if repo.get("description"):
                    entry += f"\nDescription: {repo['description']}"
                if repo.get("language"):
                    entry += f"\nPrimary language: {repo['language']}"
                entry += f"\nStars: {repo.get('stargazers_count', 0)}"

                # Fetch languages breakdown
                lang_resp = await gh.get(f"/repos/{username}/{repo['name']}/languages")
                if lang_resp.status_code == 200:
                    langs = lang_resp.json()
                    if langs:
                        entry += f"\nLanguages: {', '.join(langs.keys())}"

                # Fetch README (first 2000 chars)
                readme_resp = await gh.get(
                    f"/repos/{username}/{repo['name']}/readme",
                    headers={"Accept": "application/vnd.github.raw+json"},
                )
                if readme_resp.status_code == 200:
                    readme_text = readme_resp.text[:2000]
                    entry += f"\nREADME:\n{readme_text}"

                parts.append(entry)

        return "\n".join(parts)

    # ── 2. LLM structuring ────────────────────────────────────

    async def structure_with_llm(self, raw_text: str) -> PortfolioSchema:
        """Send raw text to Gemini and get a structured PortfolioSchema.

        Uses Gemini controlled generation (response_schema) to guarantee
        the output matches PortfolioSchema exactly.
        """
        prompt = f"{_SYSTEM_PROMPT}\n\n---\n\n{raw_text}"

        response = await self._client.aio.models.generate_content(
            model=self._model,
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=_PORTFOLIO_JSON_SCHEMA,
                temperature=0.1,
            ),
        )

        data = json.loads(response.text)
        return PortfolioSchema.model_validate(data)
