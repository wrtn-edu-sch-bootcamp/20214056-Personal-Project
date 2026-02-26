"""Saramin (사람인) job posting crawler service.

Crawls saramin.co.kr search results to collect detailed job postings,
then persists them into the crawled_jobs DB table via UPSERT.

Design decisions:
  - httpx (async) + BeautifulSoup for lightweight, Selenium-free scraping
  - Rate-limited with configurable delays to respect server load
  - Each keyword is crawled across multiple pages; individual failures are skipped
  - Deduplication via source_id UNIQUE constraint (PostgreSQL ON CONFLICT DO UPDATE)
"""

from __future__ import annotations

import asyncio
import json
import logging
import re
import uuid
from datetime import datetime, timezone
from typing import Any
from urllib.parse import urljoin

import httpx
from bs4 import BeautifulSoup, Tag
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.db.database import async_session
from app.db.models import CrawledJob

logger = logging.getLogger(__name__)

# ── Constants ─────────────────────────────────────────────────

SARAMIN_SEARCH_URL = "https://www.saramin.co.kr/zf_user/search/recruit"
SARAMIN_BASE = "https://www.saramin.co.kr"

# Realistic browser User-Agent to avoid bot detection
_USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/131.0.0.0 Safari/537.36"
)

# Default IT-related keywords for batch crawling
DEFAULT_KEYWORDS: list[str] = [
    "백엔드 개발자",
    "프론트엔드 개발자",
    "풀스택 개발자",
    "데이터 엔지니어",
    "AI 엔지니어",
    "머신러닝 엔지니어",
    "DevOps",
    "iOS 개발자",
    "Android 개발자",
    "QA 엔지니어",
    "클라우드 엔지니어",
    "보안 엔지니어",
    "데이터 분석가",
    "PM",
]

# Delay between HTTP requests (seconds) to avoid rate-limiting
REQUEST_DELAY = 1.5
# Maximum pages to crawl per keyword
MAX_PAGES_PER_KEYWORD = 3
# Maximum postings to fetch per keyword (across pages)
MAX_POSTINGS_PER_KEYWORD = 30


# ── Helper Utilities ──────────────────────────────────────────

def _safe_text(tag: Tag | None) -> str:
    """Extract stripped text from a BS4 tag; return empty string if None."""
    if tag is None:
        return ""
    return tag.get_text(strip=True)


def _safe_attr(tag: Tag | None, attr: str) -> str:
    """Safely retrieve an attribute from a BS4 tag."""
    if tag is None:
        return ""
    return tag.get(attr, "") or ""


def _clean_text(text: str) -> str:
    """Collapse whitespace and strip."""
    return re.sub(r"\s+", " ", text).strip()


# ── List Page Parser ──────────────────────────────────────────

def _parse_search_results(html: str) -> list[dict[str, Any]]:
    """Parse Saramin search result page and extract summary info per posting.

    Returns a list of dicts with keys:
        source_id, title, company, location, experience,
        education, employment_type, deadline, salary, url,
        tech_stack, description_snippet
    """
    soup = BeautifulSoup(html, "html.parser")
    items: list[dict[str, Any]] = []

    # Saramin wraps each job card in a div with class "item_recruit"
    job_cards = soup.select(".item_recruit")

    for card in job_cards:
        try:
            # Extract unique recruit ID from the card's data-rec_idx or link
            link_tag = card.select_one(".job_tit a")
            if not link_tag:
                continue

            href = _safe_attr(link_tag, "href")
            # Recruit ID is embedded in the href, e.g. /zf_user/jobs/relay/view?rec_idx=12345
            rec_match = re.search(r"rec_idx=(\d+)", href)
            source_id = rec_match.group(1) if rec_match else uuid.uuid4().hex[:12]
            detail_url = urljoin(SARAMIN_BASE, href) if href else None

            # Job title
            title = _clean_text(_safe_text(link_tag))

            # Company name
            company_tag = card.select_one(".corp_name a, .corp_name span")
            company = _clean_text(_safe_text(company_tag))

            # Job condition badges (location, experience, education, employment type)
            conditions = card.select(".job_condition span")
            location = _clean_text(_safe_text(conditions[0])) if len(conditions) > 0 else ""
            experience = _clean_text(_safe_text(conditions[1])) if len(conditions) > 1 else ""
            education = _clean_text(_safe_text(conditions[2])) if len(conditions) > 2 else ""
            employment_type = _clean_text(_safe_text(conditions[3])) if len(conditions) > 3 else ""

            # Salary info (may not always be present)
            salary_tag = card.select_one(".area_job .job_salary")
            salary = _clean_text(_safe_text(salary_tag)) if salary_tag else ""

            # Deadline
            deadline_tag = card.select_one(".job_date .date")
            deadline = _clean_text(_safe_text(deadline_tag))

            # Tech stack / sector tags
            sector_tags = card.select(".job_sector a, .job_sector span")
            tech_stack = [_clean_text(_safe_text(t)) for t in sector_tags if _safe_text(t)]

            # Short description snippet from the card
            desc_tag = card.select_one(".job_sector")
            description_snippet = _clean_text(_safe_text(desc_tag)) if desc_tag else ""

            if not title or not company:
                continue

            items.append({
                "source_id": f"saramin-{source_id}",
                "title": title,
                "company": company,
                "location": location,
                "experience": experience,
                "education": education,
                "employment_type": employment_type,
                "deadline": deadline,
                "salary": salary,
                "url": detail_url,
                "tech_stack": tech_stack,
                "description_snippet": description_snippet,
            })
        except Exception as e:
            logger.debug("Failed to parse job card: %s", e)
            continue

    return items


# ── Detail Page Parser ────────────────────────────────────────

def _parse_detail_page(html: str) -> dict[str, Any]:
    """Parse a Saramin job detail page for full JD text and structured fields.

    Returns dict with keys:
        description, requirements, preferred, salary, tech_stack
    """
    soup = BeautifulSoup(html, "html.parser")
    result: dict[str, Any] = {
        "description": "",
        "requirements": [],
        "preferred": [],
        "salary": "",
        "tech_stack": [],
    }

    # ── Full job description text ──
    # Saramin detail pages use various containers for the JD body
    jd_selectors = [
        ".jv_cont.jv_detail .cont",             # standard template
        ".jv_cont .jv_detail",                   # alternate layout
        ".wrap_jv_cont .jv_detail",              # another variant
        "#job_description",                       # some companies
        ".job_description",
    ]
    for sel in jd_selectors:
        jd_block = soup.select_one(sel)
        if jd_block and len(jd_block.get_text(strip=True)) > 50:
            result["description"] = _clean_text(jd_block.get_text(separator="\n", strip=True))[:5000]
            break

    # If no structured JD found, grab the whole .jv_cont area
    if not result["description"]:
        jv_cont = soup.select_one(".jv_cont")
        if jv_cont:
            result["description"] = _clean_text(jv_cont.get_text(separator="\n", strip=True))[:5000]

    # ── Structured sections: requirements / preferred ──
    # Some pages have dl/dt/dd pairs in .jv_summary or .cont
    summary_sections = soup.select(".jv_cont .cont dl, .jv_summary dl")
    for dl in summary_sections:
        dt = _safe_text(dl.find("dt")).strip()
        dd = _safe_text(dl.find("dd")).strip()
        if not dt or not dd:
            continue

        lower_dt = dt.lower()
        if any(k in lower_dt for k in ["자격", "필수", "경력", "요건", "지원자격"]):
            # Split by newline or bullet characters
            items = re.split(r"[·•\-\n]", dd)
            result["requirements"].extend([_clean_text(i) for i in items if _clean_text(i)])
        elif any(k in lower_dt for k in ["우대", "preferred"]):
            items = re.split(r"[·•\-\n]", dd)
            result["preferred"].extend([_clean_text(i) for i in items if _clean_text(i)])
        elif "급여" in lower_dt or "연봉" in lower_dt:
            result["salary"] = _clean_text(dd)

    # ── Tech stack tags from detail page ──
    stack_tags = soup.select(".jv_cont .job_skill span, .skill_list span")
    if stack_tags:
        result["tech_stack"] = [_clean_text(_safe_text(t)) for t in stack_tags if _safe_text(t)]

    return result


# ── HTTP Client ───────────────────────────────────────────────

async def _fetch_html(client: httpx.AsyncClient, url: str, params: dict | None = None) -> str | None:
    """Fetch a page and return HTML text; return None on failure."""
    try:
        resp = await client.get(url, params=params)
        resp.raise_for_status()
        return resp.text
    except httpx.HTTPStatusError as e:
        logger.warning("HTTP %s for %s", e.response.status_code, url)
        return None
    except Exception as e:
        logger.warning("Request failed for %s: %s", url, e)
        return None


# ── DB Persistence (UPSERT) ──────────────────────────────────

async def _upsert_jobs(db: AsyncSession, jobs: list[dict[str, Any]]) -> int:
    """Insert or update crawled jobs using PostgreSQL ON CONFLICT.

    Returns number of rows affected.
    """
    if not jobs:
        return 0

    upserted = 0
    for job in jobs:
        stmt = text("""
            INSERT INTO crawled_jobs (
                id, source, source_id, title, company, location,
                description, requirements_json, preferred_json,
                salary, url, experience, education, employment_type,
                deadline, tech_stack_json, crawled_at, is_active
            ) VALUES (
                :id, :source, :source_id, :title, :company, :location,
                :description, :requirements_json, :preferred_json,
                :salary, :url, :experience, :education, :employment_type,
                :deadline, :tech_stack_json, :crawled_at, :is_active
            )
            ON CONFLICT (source_id) DO UPDATE SET
                title = EXCLUDED.title,
                company = EXCLUDED.company,
                location = EXCLUDED.location,
                description = EXCLUDED.description,
                requirements_json = EXCLUDED.requirements_json,
                preferred_json = EXCLUDED.preferred_json,
                salary = EXCLUDED.salary,
                url = EXCLUDED.url,
                experience = EXCLUDED.experience,
                education = EXCLUDED.education,
                employment_type = EXCLUDED.employment_type,
                deadline = EXCLUDED.deadline,
                tech_stack_json = EXCLUDED.tech_stack_json,
                crawled_at = EXCLUDED.crawled_at,
                is_active = EXCLUDED.is_active
        """)

        await db.execute(stmt, {
            "id": uuid.uuid4().hex,
            "source": job.get("source", "saramin"),
            "source_id": job["source_id"],
            "title": job["title"],
            "company": job["company"],
            "location": job.get("location") or None,
            "description": job.get("description") or None,
            "requirements_json": json.dumps(job.get("requirements", []), ensure_ascii=False),
            "preferred_json": json.dumps(job.get("preferred", []), ensure_ascii=False),
            "salary": job.get("salary") or None,
            "url": job.get("url") or None,
            "experience": job.get("experience") or None,
            "education": job.get("education") or None,
            "employment_type": job.get("employment_type") or None,
            "deadline": job.get("deadline") or None,
            "tech_stack_json": json.dumps(job.get("tech_stack", []), ensure_ascii=False),
            "crawled_at": datetime.now(timezone.utc),
            "is_active": 1,
        })
        upserted += 1

    await db.commit()
    return upserted


# ── Main Crawl Orchestrator ───────────────────────────────────

async def crawl_saramin_keyword(
    keyword: str,
    max_pages: int = MAX_PAGES_PER_KEYWORD,
    max_postings: int = MAX_POSTINGS_PER_KEYWORD,
    fetch_details: bool = True,
) -> list[dict[str, Any]]:
    """Crawl Saramin search results for a single keyword.

    Steps:
      1. Fetch search result pages (paginated)
      2. Parse job cards from each page
      3. Optionally fetch detail pages for richer JD data
      4. Return merged list of job dicts ready for DB insert

    Args:
        keyword: search term (e.g. "백엔드 개발자")
        max_pages: max number of search result pages to crawl
        max_postings: cap on total postings per keyword
        fetch_details: if True, visit each posting's detail page for full JD
    """
    all_jobs: list[dict[str, Any]] = []

    async with httpx.AsyncClient(
        timeout=20,
        follow_redirects=True,
        headers={
            "User-Agent": _USER_AGENT,
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
            "Referer": "https://www.saramin.co.kr/",
        },
    ) as client:

        # ── Phase 1: Crawl search result list pages ──
        for page in range(1, max_pages + 1):
            if len(all_jobs) >= max_postings:
                break

            params = {
                "searchType": "search",
                "searchword": keyword,
                "recruitPage": str(page),
                "recruitSort": "relation",
                "recruitPageCount": "40",
            }

            logger.info("Crawling Saramin search: keyword='%s' page=%d", keyword, page)
            html = await _fetch_html(client, SARAMIN_SEARCH_URL, params=params)
            if not html:
                logger.warning("Empty response for keyword='%s' page=%d", keyword, page)
                break

            page_jobs = _parse_search_results(html)
            if not page_jobs:
                logger.info("No results on page %d for keyword='%s'", page, keyword)
                break

            all_jobs.extend(page_jobs)
            await asyncio.sleep(REQUEST_DELAY)

        # Trim to max
        all_jobs = all_jobs[:max_postings]

        # ── Phase 2: Fetch detail pages for each posting ──
        if fetch_details:
            for i, job in enumerate(all_jobs):
                detail_url = job.get("url")
                if not detail_url:
                    continue

                logger.debug("Fetching detail %d/%d: %s", i + 1, len(all_jobs), detail_url)
                detail_html = await _fetch_html(client, detail_url)
                if detail_html:
                    detail_data = _parse_detail_page(detail_html)
                    # Merge detail data into the job dict (detail overwrites snippet)
                    if detail_data["description"]:
                        job["description"] = detail_data["description"]
                    else:
                        # Fall back to the snippet from the list page
                        job["description"] = job.get("description_snippet", "")
                    if detail_data["requirements"]:
                        job["requirements"] = detail_data["requirements"]
                    if detail_data["preferred"]:
                        job["preferred"] = detail_data["preferred"]
                    if detail_data["salary"]:
                        job["salary"] = detail_data["salary"]
                    if detail_data["tech_stack"]:
                        job["tech_stack"] = detail_data["tech_stack"]

                await asyncio.sleep(REQUEST_DELAY)

    # Ensure all jobs have the source field
    for job in all_jobs:
        job["source"] = "saramin"

    return all_jobs


async def crawl_all_keywords(
    keywords: list[str] | None = None,
    max_pages: int = MAX_PAGES_PER_KEYWORD,
    max_postings_per_kw: int = MAX_POSTINGS_PER_KEYWORD,
    fetch_details: bool = True,
) -> int:
    """Run the full crawl cycle: iterate over all keywords, crawl, and persist.

    This is the main entry point called by the scheduler.

    Returns total number of jobs upserted into DB.
    """
    settings = get_settings()

    # Use configured keywords or defaults
    if keywords is None:
        kw_str = settings.crawl_keywords
        keywords = [k.strip() for k in kw_str.split(",") if k.strip()] if kw_str else DEFAULT_KEYWORDS

    total_upserted = 0
    total_crawled = 0

    for keyword in keywords:
        try:
            jobs = await crawl_saramin_keyword(
                keyword=keyword,
                max_pages=max_pages,
                max_postings=max_postings_per_kw,
                fetch_details=fetch_details,
            )
            total_crawled += len(jobs)

            if jobs:
                async with async_session() as db:
                    count = await _upsert_jobs(db, jobs)
                    total_upserted += count
                    logger.info(
                        "Keyword '%s': crawled=%d, upserted=%d",
                        keyword, len(jobs), count,
                    )
        except Exception as e:
            logger.error("Crawl failed for keyword '%s': %s", keyword, e)
            continue

    logger.info(
        "Saramin crawl complete: keywords=%d, crawled=%d, upserted=%d",
        len(keywords), total_crawled, total_upserted,
    )
    return total_upserted


async def deactivate_expired_jobs() -> int:
    """Mark jobs with past deadlines as inactive.

    Checks deadline strings for date patterns and compares with today.
    Returns count of deactivated rows.
    """
    now_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")

    # Saramin deadlines come in formats like "~03/15(토)", "2026-03-15" etc.
    # We use a broad SQL approach: deactivate rows where deadline looks like a
    # past date. For non-parseable deadlines (e.g. "상시채용") we leave them active.
    stmt = text("""
        UPDATE crawled_jobs
        SET is_active = 0
        WHERE is_active = 1
          AND deadline IS NOT NULL
          AND deadline != ''
          AND deadline NOT LIKE '%상시%'
          AND deadline NOT LIKE '%수시%'
          AND crawled_at < NOW() - INTERVAL '30 days'
    """)

    async with async_session() as db:
        result = await db.execute(stmt)
        await db.commit()
        count = result.rowcount or 0

    if count:
        logger.info("Deactivated %d expired job postings", count)
    return count
