from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    """Application-wide configuration loaded from environment variables."""

    openai_api_key: str = ""
    openai_model: str = "gpt-4o-mini"
    openai_embedding_model: str = "text-embedding-3-small"

    database_url: str = "postgresql+asyncpg://postgres:postgres@localhost:5433/portfolio_recommender"

    github_token: str = ""
    saramin_api_key: str = ""
    worknet_api_key: str = ""   # 공공데이터포털 발급 인증키 (워크넷 채용정보)

    # JWT authentication
    jwt_secret_key: str = "change-me-in-production-use-long-random-string"
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 1440  # 24 hours

    # Saramin crawling configuration
    crawl_enabled: bool = True          # Set CRAWL_ENABLED=false to disable scheduler
    crawl_interval_hours: int = 6       # Batch interval in hours (default: every 6h)
    crawl_keywords: str = "백엔드,프론트엔드,풀스택,데이터엔지니어,AI,머신러닝,DevOps,iOS,Android,QA"

    # CORS origins allowed by the backend (comma-separated in env var)
    cors_origins: list[str] = ["http://localhost:3000"]
    # Render deployment: set CORS_ORIGINS="https://your-app.vercel.app,http://localhost:3000"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


@lru_cache()
def get_settings() -> Settings:
    return Settings()
