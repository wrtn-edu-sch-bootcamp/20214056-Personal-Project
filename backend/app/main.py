"""FastAPI application entry point."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.api import portfolio, jobs, interview, resume

settings = get_settings()

app = FastAPI(
    title="Portfolio Job Recommender API",
    description="포트폴리오 기반 채용 공고 추천 + 면접 시뮬레이션",
    version="0.1.0",
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
app.include_router(portfolio.router)
app.include_router(jobs.router)
app.include_router(interview.router)
app.include_router(resume.router)


@app.get("/health")
async def health_check():
    return {"status": "ok"}
