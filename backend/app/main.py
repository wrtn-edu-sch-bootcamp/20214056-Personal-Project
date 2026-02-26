"""FastAPI application entry point."""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.api import auth, portfolio, jobs, interview, resume
from app.db.database import engine, Base

settings = get_settings()


@asynccontextmanager
async def lifespan(application: FastAPI):
    # Ensure tables exist on startup
    from app.db import models  # noqa: F401 – registers ORM models
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    await engine.dispose()


app = FastAPI(
    title="Portfolio Job Recommender API",
    description="포트폴리오 기반 채용 공고 추천 + 면접 시뮬레이션",
    version="0.1.0",
    lifespan=lifespan,
)

# CORS middleware for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API routers
app.include_router(auth.router)
app.include_router(portfolio.router)
app.include_router(jobs.router)
app.include_router(interview.router)
app.include_router(resume.router)


@app.get("/health")
async def health_check():
    return {"status": "ok"}
