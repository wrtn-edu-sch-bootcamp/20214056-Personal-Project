"""Pydantic schemas shared across the application."""

from __future__ import annotations
from pydantic import BaseModel, Field


# ── Portfolio ───────────────────────────────────────────────

class ContactInfo(BaseModel):
    email: str | None = None
    phone: str | None = None
    linkedin: str | None = None
    website: str | None = None


class SkillItem(BaseModel):
    name: str
    category: str | None = None          # e.g. "language", "framework", "tool"
    proficiency: str | None = None       # e.g. "expert", "intermediate", "beginner"


class Experience(BaseModel):
    company: str
    role: str
    period: str | None = None            # e.g. "2022.03 - 2024.01"
    description: str | None = None


class Project(BaseModel):
    name: str
    description: str | None = None
    tech_stack: list[str] = Field(default_factory=list)
    role: str | None = None
    highlights: list[str] = Field(default_factory=list)


class Education(BaseModel):
    institution: str
    degree: str | None = None
    major: str | None = None
    period: str | None = None


class PortfolioSchema(BaseModel):
    """Unified portfolio structure produced by the LLM extraction step."""
    name: str | None = None
    contact: ContactInfo = Field(default_factory=ContactInfo)
    summary: str | None = None
    skills: list[SkillItem] = Field(default_factory=list)
    experiences: list[Experience] = Field(default_factory=list)
    projects: list[Project] = Field(default_factory=list)
    education: list[Education] = Field(default_factory=list)
    certifications: list[str] = Field(default_factory=list)
    keywords: list[str] = Field(default_factory=list)


# ── Portfolio API request / response ────────────────────────

class PortfolioTextRequest(BaseModel):
    """Direct text input for portfolio."""
    text: str


class PortfolioUrlRequest(BaseModel):
    url: str


class PortfolioGitHubRequest(BaseModel):
    username: str


class PortfolioResponse(BaseModel):
    id: str
    portfolio: PortfolioSchema
    raw_text: str | None = None


class PortfolioUpdateRequest(BaseModel):
    """User-reviewed and corrected portfolio data."""
    portfolio: PortfolioSchema


# ── Jobs ────────────────────────────────────────────────────

class JobPosting(BaseModel):
    id: str
    title: str
    company: str
    location: str | None = None
    description: str | None = None
    requirements: list[str] = Field(default_factory=list)
    preferred: list[str] = Field(default_factory=list)
    salary: str | None = None
    url: str | None = None
    similarity_score: float | None = None


class JobRecommendationResponse(BaseModel):
    jobs: list[JobPosting]
    total: int


# ── Interview ───────────────────────────────────────────────

class InterviewStartRequest(BaseModel):
    portfolio_id: str
    job_id: str | None = None
    interview_type: str = "technical"    # "technical" | "behavioral" | "general"


class InterviewStartResponse(BaseModel):
    session_id: str
    first_question: str


class InterviewAnswerRequest(BaseModel):
    session_id: str
    answer: str


class InterviewAnswerResponse(BaseModel):
    feedback: str
    next_question: str | None = None
    is_finished: bool = False


class InterviewEndRequest(BaseModel):
    session_id: str


class InterviewEndResponse(BaseModel):
    session_id: str
    overall_feedback: str
    score: float | None = None
    strengths: list[str] = Field(default_factory=list)
    improvements: list[str] = Field(default_factory=list)


class InterviewMessage(BaseModel):
    role: str           # "interviewer" | "candidate"
    content: str


class InterviewHistoryResponse(BaseModel):
    session_id: str
    messages: list[InterviewMessage]


# ── Resume ─────────────────────────────────────────────────

class CompanyInfo(BaseModel):
    """Structured company info extracted from crawled web pages."""
    name: str
    core_values: list[str] = Field(default_factory=list)
    talent_profile: str | None = None
    culture_keywords: list[str] = Field(default_factory=list)
    raw_text: str | None = None


class ResumeGenerateRequest(BaseModel):
    portfolio_id: str
    job_id: str
    company_url: str | None = None


class ResumeResponse(BaseModel):
    id: str
    markdown_content: str
    company_info: CompanyInfo | None = None
    crawl_success: bool = True
