"""External job platform fetcher.

Integrates two sources:
  1. Saramin Open API  – https://oapi.saramin.co.kr/job-search
  2. WorkNet Open API  – https://openapi.work.go.kr  (공공데이터포털 워크넷)

Both sources are fetched concurrently and merged into a unified JobPosting list.
Falls back to mock data when API keys are missing or requests fail.
"""

from __future__ import annotations

import logging
import uuid
import xml.etree.ElementTree as ET
from typing import Any

import httpx

from app.config import get_settings
from app.models.schemas import JobPosting

logger = logging.getLogger(__name__)


# ── Saramin ───────────────────────────────────────────────────

SARAMIN_BASE = "https://oapi.saramin.co.kr/job-search"


def _parse_saramin(data: dict[str, Any]) -> list[JobPosting]:
    """Parse Saramin JSON response into JobPosting objects."""
    jobs: list[JobPosting] = []

    # Saramin wraps results under data.jobs.job (list or single dict)
    try:
        raw_jobs = data.get("jobs", {}).get("job", [])
    except AttributeError:
        return jobs

    if isinstance(raw_jobs, dict):
        raw_jobs = [raw_jobs]

    for item in raw_jobs:
        try:
            position = item.get("position", {})
            salary = item.get("salary", {})
            company = item.get("company", {})

            # Build requirements from experience / education
            requirements: list[str] = []
            exp = position.get("experience", {}).get("name", "")
            edu = position.get("education-level", {}).get("name", "")
            if exp:
                requirements.append(f"경력: {exp}")
            if edu:
                requirements.append(f"학력: {edu}")

            # Preferred from job-type and industry
            preferred: list[str] = []
            job_type = position.get("job-type", {}).get("name", "")
            industry = position.get("industry", {}).get("name", "")
            if job_type:
                preferred.append(job_type)
            if industry:
                preferred.append(industry)

            jobs.append(
                JobPosting(
                    id=f"saramin-{item.get('id', uuid.uuid4().hex[:8])}",
                    title=position.get("title", ""),
                    company=company.get("detail", {}).get("name", ""),
                    location=position.get("location", {}).get("name", ""),
                    description=position.get("job-code", {}).get("name", ""),
                    requirements=requirements,
                    preferred=preferred,
                    salary=salary.get("name", None),
                    url=item.get("url", None),
                )
            )
        except Exception as e:
            logger.warning("Failed to parse Saramin job item: %s", e)

    return jobs


async def fetch_saramin(
    keywords: str = "",
    count: int = 20,
) -> list[JobPosting]:
    """Fetch job postings from Saramin Open API."""
    settings = get_settings()
    if not settings.saramin_api_key:
        logger.warning("SARAMIN_API_KEY not set – skipping Saramin fetch")
        return []

    params: dict[str, Any] = {
        "access-key": settings.saramin_api_key,
        "count": count,
        "sort": "pd",          # latest first
        "fields": "posting-date,expiration-date,keyword-code,count",
    }
    if keywords:
        params["keywords"] = keywords

    try:
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.get(
                SARAMIN_BASE,
                params=params,
                headers={"Accept": "application/json"},
            )
            resp.raise_for_status()
            return _parse_saramin(resp.json())
    except httpx.HTTPStatusError as e:
        logger.error("Saramin API HTTP error %s: %s", e.response.status_code, e.response.text)
        return []
    except Exception as e:
        logger.error("Saramin API error: %s", e)
        return []


# ── WorkNet 공채속보 (고용24) ──────────────────────────────────

# 고용24 공채속보 목록 API (개인 인증키로 접근 가능)
WORKNET_OPEN_NOTICE_URL = (
    "https://www.work24.go.kr/cm/openApi/call/wk/callOpenApiSvcInfo210L21.do"
)
# 공채속보 상세 API
WORKNET_OPEN_NOTICE_DETAIL_URL = (
    "https://www.work24.go.kr/cm/openApi/call/wk/callOpenApiSvcInfo210D21.do"
)


def _xml_text(element: ET.Element | None, tag: str, default: str = "") -> str:
    """Safely extract text from an XML child element."""
    if element is None:
        return default
    child = element.find(tag)
    return (child.text or default).strip() if child is not None else default


def _parse_worknet_open_notice(xml_bytes: bytes) -> list[JobPosting]:
    """Parse 고용24 공채속보 XML response into JobPosting objects.

    Actual response tags (confirmed from live API):
      empSeqno, empWantedTitle, empBusiNm, coClcdNm,
      empWantedStdt, empWantedEndt, empWantedTypeNm,
      empWantedHomepgDetail
    """
    jobs: list[JobPosting] = []
    try:
        root = ET.fromstring(xml_bytes)
        items = root.findall(".//dhsOpenEmpInfo")
    except ET.ParseError as e:
        logger.error("WorkNet XML parse error: %s", e)
        return jobs

    for item in items:
        try:
            title = _xml_text(item, "empWantedTitle")
            company = _xml_text(item, "empBusiNm")
            company_type = _xml_text(item, "coClcdNm")   # 기업구분명 (중견기업 등)
            emp_type = _xml_text(item, "empWantedTypeNm")  # 정규직/비정규직 등
            start_dt = _xml_text(item, "empWantedStdt")
            end_dt = _xml_text(item, "empWantedEndt")
            detail_url = _xml_text(item, "empWantedHomepgDetail") or None
            job_id = _xml_text(item, "empSeqno") or uuid.uuid4().hex[:8]

            # Build human-readable period string
            period = f"{start_dt} ~ {end_dt}" if start_dt and end_dt else None

            requirements: list[str] = [x for x in [emp_type, period] if x]
            preferred: list[str] = [company_type] if company_type else []

            jobs.append(
                JobPosting(
                    id=f"worknet-{job_id}",
                    title=title,
                    company=company,
                    location=None,
                    description=f"[공채속보] {company_type} {emp_type}".strip() or None,
                    requirements=requirements,
                    preferred=preferred,
                    salary=None,
                    url=detail_url,
                )
            )
        except Exception as e:
            logger.warning("Failed to parse WorkNet open-notice item: %s", e)

    return jobs


async def fetch_worknet(
    keywords: str = "",
    count: int = 20,
) -> list[JobPosting]:
    """Fetch job postings from 고용24 공채속보 API.

    Accessible with personal member API key.
    Supports keyword filtering via empWantedTitle parameter.
    """
    settings = get_settings()
    if not settings.worknet_api_key:
        logger.warning("WORKNET_API_KEY not set – skipping WorkNet fetch")
        return []

    params: dict[str, Any] = {
        "authKey": settings.worknet_api_key,
        "callTp": "L",
        "returnType": "XML",
        "startPage": "1",
        "display": str(min(count, 100)),  # max 100 per request
    }
    if keywords:
        # empWantedTitle: 채용제목 키워드 검색
        params["empWantedTitle"] = keywords

    try:
        async with httpx.AsyncClient(timeout=15, follow_redirects=True) as client:
            resp = await client.get(WORKNET_OPEN_NOTICE_URL, params=params)
            resp.raise_for_status()
            return _parse_worknet_open_notice(resp.content)
    except httpx.HTTPStatusError as e:
        logger.error(
            "WorkNet API HTTP error %s: %s",
            e.response.status_code,
            e.response.text[:300],
        )
        return []
    except Exception as e:
        logger.error("WorkNet API error: %s", e)
        return []


# ── Combined fetcher ──────────────────────────────────────────

import asyncio


async def fetch_all_jobs(keywords: str = "", count_each: int = 20) -> list[JobPosting]:
    """Fetch from all available sources concurrently and merge results."""
    saramin_jobs, worknet_jobs = await asyncio.gather(
        fetch_saramin(keywords=keywords, count=count_each),
        fetch_worknet(keywords=keywords, count=count_each),
        return_exceptions=False,
    )
    merged = saramin_jobs + worknet_jobs  # type: ignore[operator]
    logger.info(
        "Fetched %d jobs (saramin=%d, worknet=%d)",
        len(merged), len(saramin_jobs), len(worknet_jobs),  # type: ignore[arg-type]
    )
    return merged
