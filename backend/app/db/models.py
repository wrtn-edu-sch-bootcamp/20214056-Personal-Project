"""SQLAlchemy ORM models for persistent storage."""

from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy import (
    Column,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship

from app.db.database import Base


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _new_id() -> str:
    return uuid.uuid4().hex


# ── User ──────────────────────────────────────────────────────

class User(Base):
    """Application user account — either a candidate or a company."""

    __tablename__ = "users"

    id = Column(String(64), primary_key=True, default=_new_id)
    email = Column(String(255), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    name = Column(String(128), nullable=False)
    role = Column(String(16), nullable=False, default="candidate")  # "candidate" | "company"
    oauth_provider = Column(String(32), nullable=True)
    oauth_id = Column(String(255), nullable=True)
    created_at = Column(DateTime(timezone=True), default=_utcnow)

    portfolios = relationship("Portfolio", back_populates="user", cascade="all, delete-orphan")
    company = relationship("Company", back_populates="user", uselist=False, cascade="all, delete-orphan")


# ── Company (1:1 with User where role='company') ─────────────

class Company(Base):
    """Company profile linked to a company-role user account."""

    __tablename__ = "companies"

    id = Column(String(64), primary_key=True, default=_new_id)
    user_id = Column(String(64), ForeignKey("users.id"), unique=True, nullable=False)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    website = Column(String(512), nullable=True)
    industry = Column(String(128), nullable=True)
    size = Column(String(64), nullable=True)   # e.g. "1-50", "51-200", "201-1000", "1000+"
    logo_url = Column(String(512), nullable=True)
    created_at = Column(DateTime(timezone=True), default=_utcnow)

    user = relationship("User", back_populates="company")
    job_postings = relationship("CompanyJobPosting", back_populates="company", cascade="all, delete-orphan")


# ── Company Job Posting (DB-stored postings by companies) ────

class CompanyJobPosting(Base):
    """A job posting created directly by a company user."""

    __tablename__ = "company_job_postings"

    id = Column(String(64), primary_key=True, default=_new_id)
    company_id = Column(String(64), ForeignKey("companies.id"), nullable=False, index=True)
    title = Column(String(512), nullable=False)
    description = Column(Text, nullable=True)
    requirements_json = Column(JSONB, default=list)   # list[str]
    preferred_json = Column(JSONB, default=list)       # list[str]
    location = Column(String(255), nullable=True)
    salary = Column(String(255), nullable=True)
    status = Column(String(16), nullable=False, default="published")  # "draft" | "published" | "closed"
    created_at = Column(DateTime(timezone=True), default=_utcnow)
    updated_at = Column(DateTime(timezone=True), default=_utcnow, onupdate=_utcnow)

    company = relationship("Company", back_populates="job_postings")


# ── Crawled Job (externally scraped postings) ─────────────────

class CrawledJob(Base):
    """Job posting crawled from external platforms (e.g. Saramin)."""

    __tablename__ = "crawled_jobs"

    id = Column(String(64), primary_key=True, default=_new_id)
    # Source platform identifier: "saramin", "jobkorea", etc.
    source = Column(String(32), nullable=False, index=True)
    # Platform-specific unique ID to prevent duplicate inserts
    source_id = Column(String(128), nullable=False, unique=True)
    title = Column(String(512), nullable=False)
    company = Column(String(255), nullable=False)
    location = Column(String(255), nullable=True)
    # Full job description text for high-quality embedding matching
    description = Column(Text, nullable=True)
    requirements_json = Column(JSONB, default=list)   # list[str]
    preferred_json = Column(JSONB, default=list)       # list[str]
    salary = Column(String(255), nullable=True)
    url = Column(String(1024), nullable=True)
    experience = Column(String(128), nullable=True)    # e.g. "3년 이상"
    education = Column(String(128), nullable=True)     # e.g. "대졸 이상"
    employment_type = Column(String(64), nullable=True)  # e.g. "정규직"
    deadline = Column(String(64), nullable=True)       # e.g. "2026-03-31"
    # Extracted tech stack tags for keyword matching
    tech_stack_json = Column(JSONB, default=list)      # list[str]
    crawled_at = Column(DateTime(timezone=True), default=_utcnow)
    # 0=expired/inactive, 1=active
    is_active = Column(Integer, default=1, index=True)


# ── Portfolio ─────────────────────────────────────────────────

class Portfolio(Base):
    """Stores parsed portfolio data and raw text."""

    __tablename__ = "portfolios"

    id = Column(String(64), primary_key=True, default=_new_id)
    user_id = Column(String(64), ForeignKey("users.id"), nullable=True, index=True)
    portfolio_json = Column(JSONB, nullable=False)
    raw_text = Column(Text, nullable=True)
    is_public = Column(Integer, default=0)  # 0=private, 1=visible to companies
    created_at = Column(DateTime(timezone=True), default=_utcnow)
    updated_at = Column(DateTime(timezone=True), default=_utcnow, onupdate=_utcnow)

    user = relationship("User", back_populates="portfolios")
    resumes = relationship("Resume", back_populates="portfolio", cascade="all, delete-orphan")
    interview_sessions = relationship("InterviewSession", back_populates="portfolio", cascade="all, delete-orphan")


# ── Resume ────────────────────────────────────────────────────

class Resume(Base):
    """Stores generated tailored resumes."""

    __tablename__ = "resumes"

    id = Column(String(64), primary_key=True, default=_new_id)
    portfolio_id = Column(String(64), ForeignKey("portfolios.id"), nullable=False)
    user_id = Column(String(64), ForeignKey("users.id"), nullable=True, index=True)
    job_id = Column(String(128), nullable=True)
    markdown_content = Column(Text, nullable=False)
    company_info_json = Column(JSONB, nullable=True)
    crawl_success = Column(Integer, default=1)
    created_at = Column(DateTime(timezone=True), default=_utcnow)

    portfolio = relationship("Portfolio", back_populates="resumes")


# ── Interview ─────────────────────────────────────────────────

class InterviewSession(Base):
    """Stores interview simulation sessions."""

    __tablename__ = "interview_sessions"

    id = Column(String(64), primary_key=True, default=_new_id)
    portfolio_id = Column(String(64), ForeignKey("portfolios.id"), nullable=False)
    user_id = Column(String(64), ForeignKey("users.id"), nullable=True, index=True)
    job_id = Column(String(128), nullable=True)
    interview_type = Column(String(32), default="technical")
    overall_feedback = Column(Text, nullable=True)
    score = Column(Float, nullable=True)
    strengths_json = Column(JSONB, nullable=True)
    improvements_json = Column(JSONB, nullable=True)
    created_at = Column(DateTime(timezone=True), default=_utcnow)
    finished_at = Column(DateTime(timezone=True), nullable=True)

    portfolio = relationship("Portfolio", back_populates="interview_sessions")
    messages = relationship("InterviewMessage", back_populates="session", cascade="all, delete-orphan", order_by="InterviewMessage.seq")


class InterviewMessage(Base):
    """Individual messages within an interview session."""

    __tablename__ = "interview_messages"

    id = Column(Integer, primary_key=True, autoincrement=True)
    session_id = Column(String(64), ForeignKey("interview_sessions.id"), nullable=False)
    seq = Column(Integer, nullable=False)
    role = Column(String(16), nullable=False)
    content = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), default=_utcnow)

    session = relationship("InterviewSession", back_populates="messages")
