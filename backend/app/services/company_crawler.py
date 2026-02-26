"""Company information crawler service.

Crawls a company's website (or job posting URL) to extract talent profile,
core values, and culture keywords. Falls back gracefully when crawling fails.

Uses OpenAI gpt-4o-mini for structured extraction.
"""

from __future__ import annotations

import json
import logging
from typing import Any
from urllib.parse import urlparse

import httpx
from bs4 import BeautifulSoup
from openai import AsyncOpenAI

from app.config import get_settings
from app.models.schemas import CompanyInfo

logger = logging.getLogger(__name__)

# JSON schema description for structured company info extraction
_COMPANY_INFO_SCHEMA: dict[str, Any] = {
    "type": "object",
    "properties": {
        "name":             {"type": "string"},
        "core_values":      {"type": "array", "items": {"type": "string"}},
        "talent_profile":   {"type": "string", "nullable": True},
        "culture_keywords": {"type": "array", "items": {"type": "string"}},
    },
    "required": ["name", "core_values", "talent_profile", "culture_keywords"],
}

_SYSTEM_PROMPT = f"""\
You are a corporate analyst. Given raw text crawled from a company's website,
extract structured information about the company's hiring culture.

Output a JSON object following this schema:
{json.dumps(_COMPANY_INFO_SCHEMA, indent=2)}

Rules:
- core_values: list of the company's explicitly stated core values or principles.
- talent_profile: a concise paragraph describing the ideal candidate profile the company seeks.
  If not explicitly found, infer from context (job requirements, company culture descriptions).
- culture_keywords: important keywords about company culture, work environment, benefits.
- If certain information is not available, use an empty list or null as appropriate.
- Always respond in Korean.
- Output ONLY valid JSON — no extra text.
"""


class CompanyCrawlerService:
    """Crawls company websites and extracts structured hiring-relevant info."""

    def __init__(self) -> None:
        settings = get_settings()
        self._client = AsyncOpenAI(api_key=settings.openai_api_key)
        self._model = settings.openai_model

    async def _fetch_page_text(self, url: str) -> str:
        """Fetch a URL and extract main text content via BeautifulSoup."""
        async with httpx.AsyncClient(
            follow_redirects=True,
            timeout=20,
            headers={
                "User-Agent": (
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                    "AppleWebKit/537.36 (KHTML, like Gecko) "
                    "Chrome/120.0.0.0 Safari/537.36"
                )
            },
        ) as client:
            resp = await client.get(url)
            resp.raise_for_status()

        soup = BeautifulSoup(resp.text, "html.parser")

        # Strip noisy elements
        for tag in soup.find_all(
            ["nav", "footer", "header", "script", "style", "noscript", "iframe"]
        ):
            tag.decompose()

        main = soup.find("main") or soup.find("article") or soup.find("body")
        text = main.get_text(separator="\n", strip=True) if main else ""
        # Truncate to avoid excessive token usage
        return text[:8000]

    async def _build_candidate_urls(
        self, company_name: str, company_url: str | None
    ) -> list[str]:
        """Build a list of URLs to try crawling for company info."""
        urls: list[str] = []

        if company_url:
            urls.append(company_url)
            # Try to find recruitment / about pages on the same domain
            parsed = urlparse(company_url)
            base = f"{parsed.scheme}://{parsed.netloc}"
            for path in ["/recruit", "/careers", "/about", "/company"]:
                urls.append(base + path)

        # Google search fallback URL (will redirect)
        search_query = f"{company_name} 인재상 채용"
        urls.append(
            f"https://www.google.com/search?q={search_query.replace(' ', '+')}"
        )
        return urls

    async def crawl_company(
        self, company_name: str, company_url: str | None = None
    ) -> tuple[CompanyInfo | None, bool]:
        """Crawl company info. Returns (CompanyInfo | None, crawl_success).

        Tries multiple candidate URLs; first successful crawl is used.
        If all crawls fail, returns (None, False).
        """
        candidate_urls = await self._build_candidate_urls(company_name, company_url)
        raw_text: str | None = None

        for url in candidate_urls:
            try:
                text = await self._fetch_page_text(url)
                if len(text.strip()) > 100:
                    raw_text = text
                    logger.info("Crawled company page: %s (%d chars)", url, len(text))
                    break
            except Exception as e:
                logger.debug("Failed to crawl %s: %s", url, e)
                continue

        if not raw_text:
            logger.warning(
                "Could not crawl any company info for '%s'", company_name
            )
            return None, False

        # Use LLM to structure the raw text
        try:
            info = await self._structure_with_llm(company_name, raw_text)
            return info, True
        except Exception as e:
            logger.error("LLM structuring failed for company '%s': %s", company_name, e)
            return None, False

    async def _structure_with_llm(
        self, company_name: str, raw_text: str
    ) -> CompanyInfo:
        """Send raw crawled text to OpenAI to extract structured CompanyInfo."""
        user_content = (
            f"회사명: {company_name}\n\n"
            f"--- Crawled Text ---\n{raw_text}"
        )

        response = await self._client.chat.completions.create(
            model=self._model,
            messages=[
                {"role": "system", "content": _SYSTEM_PROMPT},
                {"role": "user", "content": user_content},
            ],
            response_format={"type": "json_object"},
            temperature=0.1,
        )

        data = json.loads(response.choices[0].message.content or "{}")
        data["raw_text"] = raw_text[:3000]  # store truncated version
        return CompanyInfo.model_validate(data)
