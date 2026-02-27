<div align="center">

# JobFit AI

**포트폴리오 기반 AI 채용 매칭 플랫폼**

포트폴리오 업로드 한 번으로 채용 추천 · 맞춤 이력서 생성 · 면접 시뮬레이션까지

[![Deploy - Frontend](https://img.shields.io/badge/Frontend-Vercel-000000?logo=vercel)](https://job-fit-ai-taupe.vercel.app)
[![Deploy - Backend](https://img.shields.io/badge/Backend-Render-46E3B7?logo=render)](https://jobfit-ai-eps3.onrender.com)

</div>

---

## Problem

기존 구직 프로세스는 다음과 같은 구조적 한계를 가지고 있습니다.

| # | 문제 | 설명 |
|---|------|------|
| 1 | **채용공고 수동 탐색** | 구직자가 공고의 요구역량과 자신의 포트폴리오를 수동 대조하여 기업을 탐색합니다. 비정형 텍스트 기반 비교에 의존하며, 체계적인 적합도 분석이 어렵습니다. |
| 2 | **문서 준비의 비효율** | 공고별로 별도 지원 전략 없이 이력서·자기소개서를 독자적으로 작성합니다. 공고 요구사항과 경험 근거 간 정합성이 충분히 검증되지 않습니다. |
| 3 | **면접 준비의 한계** | 외부 피드백이나 구조화된 평가 체계 없이 개별적으로 수행합니다. 공고 맥락을 반영한 질문 대응 훈련이 부재합니다. |
| 4 | **단절된 프로세스** | 위 과정이 상호 연결되지 않은 채 분리·반복되며, 데이터 축적 및 피드백 기반 개선이 이루어지지 않습니다. |

> 그 결과 지원 타겟팅의 정밀도가 낮고, 공고 맞춤형 준비로 수렴하지 못하며, 역량 갭이 해소되지 않은 상태로 면접에 임하게 됩니다. 이는 전체 지원 효율과 품질을 저하시켜 합격 확률 하락으로 이어집니다.

**JobFit AI**는 이 문제를 포트폴리오 분석 → 채용 매칭 → 이력서 생성 → 면접 시뮬레이션을 **하나의 데이터 파이프라인**으로 통합하여 해결합니다.

---

## Overview

JobFit AI는 구직자와 기업을 AI로 연결하는 풀스택 SaaS 플랫폼입니다.

- **구직자**: 포트폴리오 → 분석(AI) → 채용 추천(AI) → 맞춤 이력서(AI) → 면접 연습(AI) → 피드백(AI)
- **기업**: 공고 등록 → 공개 포트폴리오 기반반 인재 자동 매칭(AI)

## Architecture

```mermaid
flowchart TB
    subgraph Client ["Frontend · Next.js 14"]
        A[Landing Page] --> B[Portfolio Input]
        B --> C[Job Recommendations]
        C --> D[Resume Generator]
        C --> E[Interview Simulator]
        A --> F[Company Dashboard]
    end

    subgraph Server ["Backend · FastAPI"]
        G[Auth API] --> H[JWT + bcrypt]
        I[Portfolio API] --> J[Gemini LLM Parser]
        K[Jobs API] --> L[Embedding Matcher]
        K --> M[WorkNet Crawler]
        N[Resume API] --> O[Company Crawler + LLM]
        P[Interview API] --> Q[Multi-turn Agent]
        R[Company API] --> S[Candidate Matcher]
    end

    subgraph Data ["Database · PostgreSQL"]
        T[(Users)]
        U[(Portfolios)]
        V[(Resumes)]
        W[(Interviews)]
        X[(Company Jobs)]
    end

    Client <-->|REST API| Server
    Server <--> Data
```

## Tech Stack

| Layer | Technologies |
|-------|-------------|
| **Frontend** | ![Next.js](https://img.shields.io/badge/Next.js_14-000000?logo=next.js&logoColor=white) ![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white) ![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-06B6D4?logo=tailwindcss&logoColor=white) |
| **Backend** | ![Python](https://img.shields.io/badge/Python_3.11-3776AB?logo=python&logoColor=white) ![FastAPI](https://img.shields.io/badge/FastAPI-009688?logo=fastapi&logoColor=white) ![SQLAlchemy](https://img.shields.io/badge/SQLAlchemy-D71F00?logo=sqlalchemy&logoColor=white) |
| **AI / LLM** | ![Google Gemini](https://img.shields.io/badge/Gemini_API-4285F4?logo=google&logoColor=white) ![OpenAI](https://img.shields.io/badge/Embeddings-412991?logo=openai&logoColor=white) |
| **Database** | ![PostgreSQL](https://img.shields.io/badge/PostgreSQL_17-4169E1?logo=postgresql&logoColor=white) ![Neon](https://img.shields.io/badge/Neon-00E5A0?logo=neon&logoColor=black) |
| **Infra** | ![Vercel](https://img.shields.io/badge/Vercel-000000?logo=vercel&logoColor=white) ![Render](https://img.shields.io/badge/Render-46E3B7?logo=render&logoColor=white) |

## Features

### 구직자

| 기능 | 설명 |
|------|------|
| **포트폴리오 분석** | PDF · URL · GitHub · 텍스트 입력 → Gemini LLM이 기술스택 · 경력 · 프로젝트 자동 구조화 |
| **경력/지역 필터** | 경력 연차(필수) · 희망 근무 지역 선택 → 추천 시 사전 필터링 적용 |
| **채용 추천** | 벡터 임베딩 코사인 유사도 매칭 + 경력/지역 pre-filter + 고용24 API 연동 |
| **맞춤 이력서** | 선택한 공고의 기업 홈페이지 자동 크롤링 → 인재상 반영 이력서 생성 · PDF 다운로드 |
| **면접 시뮬레이션** | 기술/인성/종합 면접 유형 선택 → 실시간 피드백 → 종합 평가(점수 · 강점 · 개선점) |
| **대시보드** | 포트폴리오 상세 보기 · 공개/비공개 토글 · 이력서 · 면접 기록 통합 관리 |

### 기업

| 기능 | 설명 |
|------|------|
| **공고 관리** | 채용 공고 등록 · 상태 변경(게시/마감) · 삭제 |
| **인재 매칭** | 등록 공고 기반 공개 포트폴리오 자동 매칭 (유사도 점수 랭킹) |
| **인재 검색** | 키워드 기반 공개 포트폴리오 탐색 |

## Quick Start

### Prerequisites

- Python 3.11+ · Node.js 18+ · PostgreSQL 17
- [Google Gemini API Key](https://aistudio.google.com)

### Backend

```bash
cd backend
python -m venv venv && venv\Scripts\activate   # macOS/Linux: source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env                            # API 키 설정
uvicorn app.main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install && npm run dev
```

> http://localhost:3000 접속 · 백엔드 API는 Next.js rewrite로 자동 프록시

### Environment Variables

```env
GEMINI_API_KEY=your-gemini-api-key
DATABASE_URL=postgresql+asyncpg://user:pass@host:5432/dbname
JWT_SECRET=your-secret-key
WORKNET_API_KEY=your-worknet-key          # optional
SARAMIN_API_KEY=your-saramin-key          # optional
GITHUB_TOKEN=your-github-token            # optional
```

## API Endpoints

<details>
<summary><b>구직자 API</b></summary>

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/auth/register` | 회원가입 |
| `POST` | `/api/auth/login` | 로그인 |
| `POST` | `/api/portfolio/upload` | PDF 업로드 |
| `POST` | `/api/portfolio/parse-url` | URL 파싱 |
| `POST` | `/api/portfolio/parse-github` | GitHub 분석 |
| `POST` | `/api/portfolio/manual` | 텍스트 입력 |
| `GET` | `/api/jobs/recommend` | 채용 추천 (경력/지역 필터 지원) |
| `GET` | `/api/jobs/search` | 키워드 검색 |
| `POST` | `/api/resume/generate` | 맞춤 이력서 생성 |
| `GET` | `/api/resume/{id}/pdf` | PDF 다운로드 |
| `POST` | `/api/interview/start` | 면접 시작 |
| `POST` | `/api/interview/answer` | 답변 제출 |
| `POST` | `/api/interview/end` | 면접 종료 · 평가 |

</details>

<details>
<summary><b>기업 API</b></summary>

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/company/jobs` | 공고 등록 |
| `GET` | `/api/company/jobs` | 공고 목록 |
| `PATCH` | `/api/company/jobs/{id}/status` | 상태 변경 |
| `DELETE` | `/api/company/jobs/{id}` | 공고 삭제 |
| `GET` | `/api/company/candidates/match` | 인재 매칭 |
| `GET` | `/api/company/candidates/search` | 인재 검색 |

</details>

## License

MIT License
