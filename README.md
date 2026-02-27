<div align="center">

# JobFit AI

**포트폴리오 기반 AI 채용 매칭 플랫폼**

구직자: 포트폴리오 업로드 한 번으로 채용 추천 · 맞춤 이력서 생성 · 면접 시뮬레이션까지
기업: 채용 공고 업로드 한 번으로 적합한 인재 맞춤 추천

https://job-fit-ai-taupe.vercel.app/

[![Deploy - Frontend](https://img.shields.io/badge/Frontend-Vercel-000000?logo=vercel)](https://job-fit-ai-taupe.vercel.app)
[![Deploy - Backend](https://img.shields.io/badge/Backend-Render-46E3B7?logo=render)](https://jobfit-ai-eps3.onrender.com)

</div>

> 이 문서는 **사전 지식 없는 사람도 문서만으로 프로젝트를 완벽히 재현**할 수 있도록 구성되어 있다. 문제 정의부터 해결까지의 로드맵, 범위·일정·우선순위(MVP), 단계별 재현 가이드, 그리고 **전체 워크플로우의 재현·확장 가능성 및 도구 간 연계 최적화** 내용을 포함합니다.

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

### 문제 정의 → 해결 전체 로드맵

```mermaid
flowchart LR
    subgraph 문제["Problem"]
        P1[수동 탐색]
        P2[문서 비효율]
        P3[면접 한계]
        P4[단절된 프로세스]
    end
    subgraph 해결["Solution Pipeline"]
        S1[① 포트폴리오 분석]
        S2[② AI 채용 매칭]
        S3[③ 맞춤 이력서]
        S4[④ 면접 시뮬레이션]
    end
    P1 & P2 & P3 & P4 --> S1
    S1 --> S2 --> S3 --> S4
```

| 단계 | 문제(Input) | 해결(Output) |
|------|-------------|----------------|
| ① | 비정형 포트폴리오(PDF/URL/GitHub/텍스트) | LLM 구조화 → JSON(기술스택·경력·프로젝트) |
| ② | 수동 공고 탐색·적합도 불명 | 임베딩 유사도 + 경력/지역 필터 → 추천 랭킹 |
| ③ | 공고별 이력서 수동 작성 | 기업 크롤링 + 인재상 추출 → 맞춤 이력서·PDF |
| ④ | 외부 피드백 없는 면접 준비 | 포트폴리오·공고 맥락 반영 멀티턴 면접 + 종합 평가 |

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

### 사용 도구 (Tools Used)

본 프로젝트 기획·개발·문서화 전 과정에서 아래 도구를 연계 활용하였다. 도구 간 역할 분담을 명확히 하여 재현·확장 가능한 워크플로우를 구성하였다.

| 도구 | 용도 | 연계 포인트 |
|------|------|-------------|
| **Cursor** | IDE 기반 코드 생성·리팩토링·디버깅, 프로젝트 구조 탐색, 규칙 기반 일관성 유지 | 개발 전 과정, Git 커밋 전 검증 |
| **GPT** (OpenAI) | API 설계·스키마 검토, 프롬프트 초안 작성, 문서 초안 검수 | 기획·문서 단계 |
| **Claude** | 장문 문서 요약·구조화, HANDOVER/README 초안, 복잡 로직 설명문 작성 | 문서화·인수인계 자료 |
| **Gemini** (Google) | 포트폴리오 파싱·임베딩·이력서 생성·면접 에이전트 등 런타임 LLM 호출 | 백엔드 API 연동 (실제 서비스) |
| **Genspark** | 시장 조사·기존 서비스 비교, 기술 스택 선정 참고 | 기획·조사 단계 |
| **MCP** (Model Context Protocol) | 브라우저 자동화·배포 URL 검증, 외부 리소스 fetch 등 에이전트 확장 | E2E 검증·문서 보강 |

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

---

## 범위 · 일정 · 우선순위 (MVP)

### 범위 (Scope)

| 구분 | 포함 | 제외(추후) |
|------|------|------------|
| **구직자** | 포트폴리오 4종 입력, AI 분석, 채용 추천, 맞춤 이력서, 면접 시뮬레이션, 대시보드 | OAuth, 음성 면접, 역량 갭 리포트 |
| **기업** | 공고 CRUD, 인재 자동 매칭, 키워드 검색 | 결제·구독, 대량 공고 배치 |
| **인프라** | Vercel + Render + Neon, CI/CD 자동 배포 | pgvector, Alembic 마이그레이션 |

### 일정 (Schedule)

| Phase | 기간 | 산출물 |
|-------|------|--------|
| 기획·설계 | 1주 | 문제 정의, 아키텍처, API 스펙, DB 스키마 |
| MVP 개발 | 3~4주 | 구직자 플로우(포트폴리오→추천→이력서→면접) + 기업 공고·매칭 |
| 연동·배포 | 1주 | 고용24/사람인 연동, Vercel/Render/Neon 배포, 도메인·환경변수 |
| 문서·안정화 | 1주 | README, HANDOVER, 에러·로딩 UX, 데모 검증 |

### 우선순위 (MVP)

| 우선순위 | 기능 | 이유 |
|----------|------|------|
| **P0** | 포트폴리오 입력·파싱, 채용 추천, JWT 인증 | 핵심 가치(매칭) 제공 |
| **P0** | 맞춤 이력서 생성·PDF 다운로드 | 구직 플로우 완결 |
| **P0** | 면접 시뮬레이션(기술/인성/종합) + 종합 평가 | 차별화 기능 |
| **P1** | 기업 공고 등록·인재 매칭 | 양면 플랫폼 완성 |
| **P2** | 대시보드, 경력/지역 필터, 공고 검색 | UX·운영 보강 |

---

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

---

## 재현 가이드 (단계별 설명서)

사전 지식이 없는 경우에도 아래 순서대로 진행하면 로컬에서 서비스 전체를 재현할 수 있다. 각 단계는 이 문서만으로 완료 가능하다.

### 1단계: 사전 요구사항 준비

| 항목 | 확인 방법 | 비고 |
|------|------------|------|
| Python 3.11+ | `python --version` | [python.org](https://www.python.org/downloads/) |
| Node.js 18+ | `node --version` | [nodejs.org](https://nodejs.org/) |
| PostgreSQL 17 | `psql --version` 또는 Neon 가입 | 로컬 설치 또는 [Neon](https://neon.tech) 무료 DB |
| Gemini API 키 | [Google AI Studio](https://aistudio.google.com)에서 발급 | 필수 |

### 2단계: 저장소 및 디렉터리 구조

```bash
git clone https://github.com/ihyonoo/JobFit-AI.git
cd JobFit-AI
# 루트에 frontend/, backend/ 존재 확인
```

### 3단계: 백엔드 실행

```bash
cd backend
python -m venv venv
# Windows: venv\Scripts\activate
# macOS/Linux: source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# .env에 GEMINI_API_KEY, DATABASE_URL, JWT_SECRET 반드시 설정
uvicorn app.main:app --reload --port 8000
```

- `http://localhost:8000/docs` 에서 Swagger UI로 API 동작 확인.

### 4단계: 프론트엔드 실행

```bash
# 프로젝트 루트에서
cd frontend
npm install
cp .env.local.example .env.local
# .env.local에 NEXT_PUBLIC_API_URL=http://localhost:8000 설정 (로컬 백엔드)
npm run dev
```

- `http://localhost:3000` 접속. Next.js rewrite로 `/api/*` 요청이 백엔드로 프록시됨.

### 5단계: 동작 검증 순서

1. 회원가입 → 로그인 (구직자)
2. 포트폴리오: 텍스트 직접 입력 또는 PDF 업로드 → 저장 후 대시보드에서 구조화 결과 확인
3. 채용 추천: 경력/지역 설정 후 추천 목록 확인
4. 이력서: 추천 공고 중 하나 선택 → 생성 → PDF 다운로드
5. 면접: 기술/인성/종합 중 선택 → 2~3회 Q&A → 종합 평가 확인
6. (선택) 기업 계정으로 가입 → 공고 등록 → 인재 매칭 확인

### 6단계: 배포 재현 (선택)

- **Frontend**: Vercel 연결 후 저장소 `frontend` 루트 지정, 빌드 커맨드 `npm run build`, 출력 디렉터리 `out` 또는 Next 기본값.
- **Backend**: Render에서 Web Service 생성, 루트 `backend`, 시작 커맨드 `uvicorn app.main:app --host 0.0.0.0 --port $PORT`.
- **DB**: Neon 프로젝트 생성 후 `DATABASE_URL`을 백엔드 환경변수에 설정.

문서만으로 완전 재현을 위해 위 단계에서 필요한 모든 설정은 `.env.example` / `.env.local.example`에 주석으로 명시되어 있다.

---

## 워크플로우 및 도구 연계

전체 워크플로우는 **재현·확장 가능**하도록 설계되었으며, **도구 간 연계**가 명확히 정의되어 있다.

### 개발 → 배포 → 운영 흐름

```
[개발] Cursor + Git/GitHub → 코드·커밋 컨벤션 (feat:/fix:/chore:)
         ↓ git push
[배포] Vercel (Frontend) + Render (Backend) + Neon (DB) 자동 빌드·배포
         ↓
[운영] Gemini API(파싱·임베딩·생성) + 고용24/웹 크롤링 → 사용자 요청 처리
```

### 데이터 파이프라인 연계 (도구 간 입출력)

| 단계 | 입력 | 처리 도구/API | 출력 → 다음 단계 |
|------|------|----------------|------------------|
| 포트폴리오 파싱 | PDF/URL/GitHub/텍스트 | Gemini LLM | 구조화 JSON → 임베딩·이력서·면접 입력 |
| 채용 매칭 | 포트폴리오 텍스트 + 공고 DB | Gemini Embedding + 코사인 유사도 | 추천 랭킹 → 이력서 생성 시 공고 선택 |
| 이력서 생성 | 포트폴리오 + 공고 + 기업 크롤링 | Gemini LLM + fpdf2 | 마크다운·PDF → 다운로드 |
| 면접 시뮬레이션 | 포트폴리오 + 공고 + 대화 히스토리 | Gemini LLM 멀티턴 | 질문·피드백·종합 평가 |

각 단계의 **출력이 다음 단계의 입력**이 되므로, 사용자 입력 1회(포트폴리오 등록)로 7단계 자동화 파이프라인이 연쇄 실행된다. 신규 공고 소스·새 LLM·새 필터 로직을 추가해도 기존 파이프라인 인터페이스만 유지하면 **확장**이 가능하다.

---

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
