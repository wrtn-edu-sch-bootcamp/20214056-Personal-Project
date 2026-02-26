# JobFit AI

포트폴리오 기반 채용 공고 추천 시스템 + 맞춤 이력서 생성 + 면접 시뮬레이션 에이전트

## 주요 기능

### 1. 포트폴리오 분석
- PDF, 웹사이트 URL, GitHub 프로필, 텍스트 직접 입력 등 다양한 입력 방식 지원
- Google Gemini LLM 기반 비정형 포트폴리오 → 구조화 JSON 자동 변환
- 기술스택, 경력, 프로젝트, 학력, 자격증 등 자동 추출
- 포트폴리오 공개/비공개 설정 (기업에 노출 여부 선택)

### 2. 채용 공고 추천
- 포트폴리오 벡터 임베딩 기반 코사인 유사도 매칭
- 고용24(WorkNet) 공채속보 API 실시간 연동
- 사람인 API 연동 지원 (API 키 필요)
- **기업 직접 등록 공고** 통합 검색 및 추천
- 키워드 검색 기능

### 3. 맞춤 이력서 자동 생성
- 추천된 채용공고 선택 시 해당 기업 홈페이지 자동 크롤링
- 기업 인재상, 핵심가치, 문화 키워드 LLM 구조화 추출
- 포트폴리오 + 채용공고 + 기업 정보를 결합한 맞춤형 이력서 생성
- 웹 미리보기(마크다운 렌더링) + PDF 다운로드 지원

### 4. 면접 시뮬레이션
- 포트폴리오 + 채용공고 기반 맞춤형 면접 질문 생성
- 기술면접 / 인성면접 / 종합면접 유형 선택
- 실시간 피드백 및 후속 질문
- 면접 종료 시 종합 평가 (점수, 강점, 개선점)

### 5. 사용자 인증 및 포트폴리오 관리
- JWT 기반 이메일/비밀번호 회원가입 및 로그인
- 역할 기반 접근 제어 (구직자 / 기업)
- 개인 대시보드: 포트폴리오, 이력서, 면접 기록 통합 관리
- 인증되지 않은 사용자는 로그인 페이지로 자동 리다이렉트

### 6. 기업 계정 기능
- 기업 전용 회원가입 (회사명 포함)
- 기업 프로필 관리 (설명, 웹사이트, 업종, 규모 등)
- **채용 공고 등록/관리**: 공고 생성, 상태 변경(게시/마감), 삭제
- **인재 매칭**: 등록한 공고 기반으로 공개 포트폴리오 구직자 자동 매칭 (유사도 점수 랭킹)
- **인재 검색**: 키워드 기반 공개 포트폴리오 검색
- 기업 전용 대시보드 및 네비게이션

### 7. 반응형 웹 디자인
- 모바일, 태블릿, 데스크톱 환경 대응
- Tailwind CSS 반응형 유틸리티 활용
- 모바일 햄버거 메뉴 및 적응형 레이아웃

## 기술 스택

| 구분 | 기술 |
|------|------|
| Backend | Python 3.11+, FastAPI, Pydantic, SQLAlchemy (AsyncIO) |
| Frontend | Next.js 14, TypeScript, Tailwind CSS |
| LLM | Google Gemini API (gemini-2.5-flash-lite) |
| Embedding | Gemini Embedding (gemini-embedding-001) |
| Database | PostgreSQL 17 |
| Authentication | JWT (python-jose), bcrypt (passlib) |
| 채용 API | 고용24 공채속보 API, 사람인 API |
| PDF 생성 | fpdf2 (한글 지원) |
| Web Scraping | httpx, BeautifulSoup4 |

## 프로젝트 구조

```
project/
├── backend/
│   ├── app/
│   │   ├── main.py                    # FastAPI entry point
│   │   ├── config.py                  # Environment config
│   │   ├── api/
│   │   │   ├── auth.py               # 회원가입/로그인 API
│   │   │   ├── portfolio.py           # 포트폴리오 업로드/파싱
│   │   │   ├── jobs.py                # 채용 추천/검색
│   │   │   ├── resume.py              # 맞춤 이력서 생성/PDF
│   │   │   ├── interview.py           # 면접 시뮬레이션
│   │   │   ├── company.py             # 기업 프로필/공고 관리
│   │   │   └── company_candidates.py  # 인재 매칭/검색
│   │   ├── services/
│   │   │   ├── auth.py                # JWT 인증 서비스
│   │   │   ├── portfolio_parser.py    # PDF/URL/GitHub/텍스트 파싱 + LLM 구조화
│   │   │   ├── job_matcher.py         # 임베딩 기반 매칭
│   │   │   ├── job_fetcher.py         # 고용24/사람인 API 연동
│   │   │   ├── company_crawler.py     # 기업 홈페이지 크롤링
│   │   │   ├── resume_generator.py    # LLM 맞춤 이력서 생성
│   │   │   ├── pdf_converter.py       # 마크다운 → PDF 변환
│   │   │   ├── interview_agent.py     # 면접 에이전트
│   │   │   └── candidate_matcher.py   # 기업용 인재 매칭 서비스
│   │   ├── db/
│   │   │   ├── database.py            # DB 연결 설정
│   │   │   ├── models.py              # SQLAlchemy ORM 모델
│   │   │   └── crud.py                # 데이터 액세스
│   │   └── models/
│   │       └── schemas.py             # Pydantic 스키마
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx               # 랜딩 페이지
│   │   │   ├── login/page.tsx         # 로그인/회원가입
│   │   │   ├── dashboard/page.tsx     # 구직자 대시보드
│   │   │   ├── portfolio/page.tsx     # 포트폴리오 입력
│   │   │   ├── jobs/page.tsx          # 채용 추천
│   │   │   ├── resume/page.tsx        # 맞춤 이력서
│   │   │   ├── interview/page.tsx     # 면접 시뮬레이션
│   │   │   └── company/
│   │   │       ├── dashboard/page.tsx # 기업 대시보드
│   │   │       ├── jobs/page.tsx      # 공고 관리
│   │   │       └── candidates/page.tsx # 인재 매칭
│   │   ├── components/
│   │   │   ├── Navigation.tsx         # 역할별 네비게이션
│   │   │   └── AuthGuard.tsx          # 인증 가드
│   │   └── lib/
│   │       ├── api.ts                 # API 클라이언트
│   │       └── auth.tsx               # 인증 상태 관리
│   └── package.json
├── docker-compose.yml
└── README.md
```

## 실행 방법

### 사전 요구사항

- Python 3.11+
- Node.js 18+
- PostgreSQL 17
- Google Gemini API 키 ([aistudio.google.com](https://aistudio.google.com))
- 고용24 API 키 (선택, [고용24 OpenAPI](https://www.work24.go.kr))

### 백엔드

```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env            # .env 파일에 API 키 설정
uvicorn app.main:app --reload --port 8000
```

### 프론트엔드

```bash
cd frontend
npm install
npm run dev
```

접속: http://localhost:3000

### 환경 변수 (.env)

```env
GEMINI_API_KEY=your-gemini-api-key
DATABASE_URL=postgresql+asyncpg://user:pass@localhost:5432/jobfit_db
WORKNET_API_KEY=your-worknet-api-key      # 선택
SARAMIN_API_KEY=your-saramin-api-key      # 선택
GITHUB_TOKEN=your-github-token            # 선택 (GitHub 포트폴리오 파싱 시 rate limit 해제)
JWT_SECRET=your-secret-key
```

## API 엔드포인트

### 인증

| Method | Path | 설명 |
|--------|------|------|
| POST | `/api/auth/register` | 회원가입 (구직자/기업) |
| POST | `/api/auth/login` | 로그인 |
| GET | `/api/auth/me` | 현재 사용자 정보 |

### 구직자

| Method | Path | 설명 |
|--------|------|------|
| POST | `/api/portfolio/upload` | PDF 업로드 |
| POST | `/api/portfolio/parse-url` | 웹사이트 URL 파싱 |
| POST | `/api/portfolio/parse-github` | GitHub 프로필 분석 |
| POST | `/api/portfolio/manual` | 텍스트 직접 입력 |
| GET | `/api/portfolio/mine` | 내 포트폴리오 목록 |
| PATCH | `/api/portfolio/{id}/visibility` | 공개/비공개 전환 |
| GET | `/api/jobs/recommend` | 포트폴리오 기반 추천 |
| GET | `/api/jobs/search` | 키워드 검색 |
| POST | `/api/resume/generate` | 맞춤 이력서 생성 |
| GET | `/api/resume/{id}/pdf` | 이력서 PDF 다운로드 |
| POST | `/api/interview/start` | 면접 시작 |
| POST | `/api/interview/answer` | 답변 제출 |
| POST | `/api/interview/end` | 면접 종료 + 종합 평가 |

### 기업

| Method | Path | 설명 |
|--------|------|------|
| GET | `/api/company/me` | 기업 프로필 조회 |
| PUT | `/api/company/me` | 기업 프로필 수정 |
| POST | `/api/company/jobs` | 채용 공고 등록 |
| GET | `/api/company/jobs` | 내 공고 목록 |
| PATCH | `/api/company/jobs/{id}/status` | 공고 상태 변경 |
| DELETE | `/api/company/jobs/{id}` | 공고 삭제 |
| GET | `/api/company/candidates/match` | 공고 기반 인재 매칭 |
| GET | `/api/company/candidates/search` | 키워드 인재 검색 |
| GET | `/api/company/candidates/{portfolio_id}` | 공개 포트폴리오 상세 |

## 사용 흐름

### 구직자
1. **회원가입/로그인** → 구직자 계정 생성
2. **포트폴리오 입력** → 텍스트/PDF/URL/GitHub 중 선택하여 포트폴리오 등록
3. **AI 분석** → LLM이 포트폴리오를 구조화하여 기술스택, 경력, 프로젝트 등 추출
4. **채용 추천** → 벡터 유사도 기반으로 적합한 채용공고 추천 (외부 API + 기업 등록 공고 통합)
5. **맞춤 이력서** → 원하는 채용공고 선택 → 기업 정보 크롤링 → 맞춤형 이력서 자동 생성
6. **면접 연습** → 채용공고 기반 모의 면접 진행 및 피드백
7. **대시보드** → 포트폴리오, 이력서, 면접 기록 통합 관리

### 기업
1. **회원가입** → 기업 계정 생성 (회사명 입력)
2. **기업 프로필 설정** → 회사 설명, 웹사이트, 업종 등 입력
3. **채용 공고 등록** → 직무, 요구사항, 우대사항 등 입력하여 공고 게시
4. **인재 매칭** → 등록 공고 기반 공개 포트폴리오 구직자 자동 매칭 (유사도 점수 랭킹)
5. **인재 검색** → 키워드 기반 공개 포트폴리오 직접 탐색

## 라이선스

MIT License
