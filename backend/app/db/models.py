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


class User(Base):
    """Application user account."""

    __tablename__ = "users"

    id = Column(String(64), primary_key=True, default=_new_id)
    email = Column(String(255), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    name = Column(String(128), nullable=False)
    oauth_provider = Column(String(32), nullable=True)   # "google" | "github" | null
    oauth_id = Column(String(255), nullable=True)
    created_at = Column(DateTime(timezone=True), default=_utcnow)

    portfolios = relationship("Portfolio", back_populates="user", cascade="all, delete-orphan")


class Portfolio(Base):
    """Stores parsed portfolio data and raw text."""

    __tablename__ = "portfolios"

    id = Column(String(64), primary_key=True, default=_new_id)
    user_id = Column(String(64), ForeignKey("users.id"), nullable=True, index=True)
    portfolio_json = Column(JSONB, nullable=False)
    raw_text = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=_utcnow)
    updated_at = Column(DateTime(timezone=True), default=_utcnow, onupdate=_utcnow)

    user = relationship("User", back_populates="portfolios")
    resumes = relationship("Resume", back_populates="portfolio", cascade="all, delete-orphan")
    interview_sessions = relationship("InterviewSession", back_populates="portfolio", cascade="all, delete-orphan")


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
