# JobFit AI

포트폴리오 기반 채용 공고 추천 시스템 + 맞춤 이력서 생성 + 면접 시뮬레이션 에이전트

## 주요 기능

### 1. 포트폴리오 분석
- PDF, 웹사이트 URL, GitHub 프로필, 텍스트 직접 입력 등 다양한 입력 방식 지원
- Google Gemini LLM 기반 비정형 포트폴리오 → 구조화 JSON 자동 변환
- 기술스택, 경력, 프로젝트, 학력, 자격증 등 자동 추출

### 2. 채용 공고 추천
- 포트폴리오 벡터 임베딩 기반 코사인 유사도 매칭
- 고용24(WorkNet) 공채속보 API 실시간 연동
- 사람인 API 연동 지원 (API 키 필요)
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

## 기술 스택

| 구분 | 기술 |
|------|------|
| Backend | Python 3.11+, FastAPI, Pydantic |
| Frontend | Next.js 14, TypeScript, Tailwind CSS |
| LLM | Google Gemini API (gemini-2.5-flash-lite) |
| Embedding | Gemini Embedding (gemini-embedding-001) |
| 채용 API | 고용24 공채속보 API, 사람인 API |
| PDF 생성 | fpdf2 (한글 지원) |
| Database | PostgreSQL + pgvector (확장 예정) |

## 프로젝트 구조

```
project/
├── backend/
│   ├── app/
│   │   ├── main.py                    # FastAPI entry point
│   │   ├── config.py                  # Environment config
│   │   ├── api/
│   │   │   ├── portfolio.py           # 포트폴리오 업로드/파싱
│   │   │   ├── jobs.py                # 채용 추천/검색
│   │   │   ├── resume.py              # 맞춤 이력서 생성/PDF
│   │   │   └── interview.py           # 면접 시뮬레이션
│   │   ├── services/
│   │   │   ├── portfolio_parser.py    # PDF/URL/GitHub/텍스트 파싱 + LLM 구조화
│   │   │   ├── job_matcher.py         # 임베딩 기반 매칭
│   │   │   ├── job_fetcher.py         # 고용24/사람인 API 연동
│   │   │   ├── company_crawler.py     # 기업 홈페이지 크롤링
│   │   │   ├── resume_generator.py    # LLM 맞춤 이력서 생성
│   │   │   ├── pdf_converter.py       # 마크다운 → PDF 변환
│   │   │   └── interview_agent.py     # 면접 에이전트
│   │   └── models/
│   │       └── schemas.py             # Pydantic 스키마
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx               # 랜딩 페이지
│   │   │   ├── portfolio/page.tsx     # 포트폴리오 입력
│   │   │   ├── jobs/page.tsx          # 채용 추천
│   │   │   ├── resume/page.tsx        # 맞춤 이력서
│   │   │   └── interview/page.tsx     # 면접 시뮬레이션
│   │   ├── components/
│   │   │   └── Navigation.tsx
│   │   └── lib/
│   │       └── api.ts                 # API 클라이언트
│   └── package.json
├── docker-compose.yml
└── README.md
```

## 실행 방법

### 사전 요구사항

- Python 3.11+
- Node.js 18+
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
WORKNET_API_KEY=your-worknet-api-key      # 선택
SARAMIN_API_KEY=your-saramin-api-key      # 선택
GITHUB_TOKEN=your-github-token            # 선택 (GitHub 포트폴리오 파싱 시 rate limit 해제)
```

## API 엔드포인트

| Method | Path | 설명 |
|--------|------|------|
| POST | `/api/portfolio/upload` | PDF 업로드 |
| POST | `/api/portfolio/parse-url` | 웹사이트 URL 파싱 |
| POST | `/api/portfolio/parse-github` | GitHub 프로필 분석 |
| POST | `/api/portfolio/manual` | 텍스트 직접 입력 |
| GET | `/api/jobs/recommend` | 포트폴리오 기반 추천 |
| GET | `/api/jobs/search` | 키워드 검색 |
| POST | `/api/resume/generate` | 맞춤 이력서 생성 |
| GET | `/api/resume/{id}/pdf` | 이력서 PDF 다운로드 |
| POST | `/api/interview/start` | 면접 시작 |
| POST | `/api/interview/answer` | 답변 제출 |
| POST | `/api/interview/end` | 면접 종료 + 종합 평가 |

## 사용 흐름

1. **포트폴리오 입력** → 텍스트/PDF/URL/GitHub 중 선택하여 포트폴리오 등록
2. **AI 분석** → LLM이 포트폴리오를 구조화하여 기술스택, 경력, 프로젝트 등 추출
3. **채용 추천** → 벡터 유사도 기반으로 적합한 채용공고 추천
4. **맞춤 이력서** → 원하는 채용공고 선택 → 기업 정보 크롤링 → 맞춤형 이력서 자동 생성
5. **면접 연습** → 채용공고 기반 모의 면접 진행 및 피드백

## 라이선스

MIT License
