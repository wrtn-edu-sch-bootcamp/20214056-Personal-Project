"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Navigation from "@/components/Navigation";
import AuthGuard from "@/components/AuthGuard";
import {
  submitPortfolioText,
  submitPortfolioUrl,
  submitPortfolioGitHub,
  uploadPortfolioPdf,
  type PortfolioResponse,
  type PortfolioSchema,
} from "@/lib/api";

type TabKey = "text" | "pdf" | "url" | "github";

const TABS: { key: TabKey; label: string; icon: React.ReactNode }[] = [
  {
    key: "text",
    label: "직접 입력",
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
      </svg>
    ),
  },
  {
    key: "pdf",
    label: "PDF 업로드",
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    key: "url",
    label: "웹사이트 URL",
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
      </svg>
    ),
  },
  {
    key: "github",
    label: "GitHub",
    icon: (
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
      </svg>
    ),
  },
];

export default function PortfolioPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabKey>("text");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [text, setText] = useState("");
  const [url, setUrl] = useState("");
  const [github, setGithub] = useState("");
  const [pdfFile, setPdfFile] = useState<File | null>(null);

  const [result, setResult] = useState<PortfolioResponse | null>(null);

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    try {
      let resp: PortfolioResponse;
      switch (activeTab) {
        case "text":
          if (!text.trim()) throw new Error("텍스트를 입력해 주세요.");
          resp = await submitPortfolioText(text);
          break;
        case "pdf":
          if (!pdfFile) throw new Error("PDF 파일을 선택해 주세요.");
          resp = await uploadPortfolioPdf(pdfFile);
          break;
        case "url":
          if (!url.trim()) throw new Error("URL을 입력해 주세요.");
          resp = await submitPortfolioUrl(url);
          break;
        case "github":
          if (!github.trim()) throw new Error("GitHub 사용자명을 입력해 주세요.");
          resp = await submitPortfolioGitHub(github);
          break;
      }
      setResult(resp!);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "알 수 없는 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const goToJobs = () => {
    if (result) {
      router.push(`/jobs?portfolio_id=${result.id}`);
    }
  };

  return (
    <AuthGuard>
      <div className="min-h-screen bg-slate-50">
        <Navigation />
        <div className="page-container py-8 sm:py-10">
          <div className="max-w-4xl mx-auto">
            {/* Header */}
            <div className="mb-8">
              <h1 className="section-title">포트폴리오 입력</h1>
              <p className="section-subtitle">
                아래 방식 중 하나로 포트폴리오를 입력하면 AI가 자동으로 분석합니다.
              </p>
            </div>

            {/* Tabs */}
            <div className="flex overflow-x-auto gap-2 mb-6 scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0">
              {TABS.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => { setActiveTab(tab.key); setResult(null); setError(null); }}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all duration-200 ${
                    activeTab === tab.key
                      ? "bg-indigo-600 text-white shadow-sm shadow-indigo-600/25"
                      : "bg-white text-slate-500 border border-slate-200 hover:border-slate-300 hover:text-slate-700"
                  }`}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Input area */}
            <div className="card-premium p-6 sm:p-8">
              {activeTab === "text" && (
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    경력, 기술스택, 프로젝트 등을 자유롭게 작성해 주세요
                  </label>
                  <textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    rows={12}
                    placeholder={`예시:\n이름: 홍길동\n경력: 3년차 백엔드 개발자\n기술스택: Python, FastAPI, PostgreSQL, Docker\n\n프로젝트:\n1. 커머스 플랫폼 백엔드 (2023) - FastAPI 기반 REST API 설계 및 구현\n2. 데이터 파이프라인 (2022) - Airflow + Spark 기반 ETL 파이프라인 구축`}
                    className="input-field resize-y min-h-[200px]"
                  />
                </div>
              )}

              {activeTab === "pdf" && (
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-3">
                    PDF 파일 선택
                  </label>
                  <div className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center hover:border-indigo-300 transition-colors">
                    <svg className="w-10 h-10 text-slate-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    <input
                      type="file"
                      accept=".pdf"
                      onChange={(e) => setPdfFile(e.target.files?.[0] || null)}
                      className="block w-full text-sm text-slate-500 file:mr-4 file:py-2.5 file:px-5 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 file:transition-colors file:cursor-pointer"
                    />
                    {pdfFile && (
                      <p className="mt-3 text-sm text-slate-600 font-medium">
                        {pdfFile.name} ({(pdfFile.size / 1024).toFixed(1)} KB)
                      </p>
                    )}
                  </div>
                </div>
              )}

              {activeTab === "url" && (
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    포트폴리오 웹사이트 URL
                  </label>
                  <input
                    type="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://your-portfolio.com"
                    className="input-field"
                  />
                </div>
              )}

              {activeTab === "github" && (
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    GitHub 사용자명
                  </label>
                  <p className="text-xs text-slate-400 mb-3">
                    GitHub 프로필 URL에서 사용자명만 입력하세요. 전체 URL을 붙여 넣어도 자동 추출됩니다.
                  </p>
                  <input
                    type="text"
                    value={github}
                    onChange={(e) => {
                      const val = e.target.value
                        .replace(/^https?:\/\/(www\.)?github\.com\//i, "")
                        .replace(/\/.*$/, "")
                        .trim();
                      setGithub(val);
                    }}
                    placeholder="username"
                    className="input-field"
                  />
                </div>
              )}

              <button
                onClick={handleSubmit}
                disabled={loading}
                className="mt-6 w-full py-3.5 btn-primary text-sm"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="spinner w-4 h-4" />
                    분석 중...
                  </span>
                ) : "포트폴리오 분석하기"}
              </button>
              {loading && (
                <p className="text-xs text-slate-400 text-center mt-3">
                  서버 상태에 따라 최대 1분 정도 소요될 수 있습니다.
                </p>
              )}

              {error && (
                <div className="flex items-start gap-2 mt-4 bg-red-50 text-red-700 px-4 py-3 rounded-xl text-sm border border-red-100">
                  <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {error}
                </div>
              )}
            </div>

            {/* Result preview */}
            {result && <PortfolioPreview data={result} onNext={goToJobs} />}
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}

function PortfolioPreview({ data, onNext }: { data: PortfolioResponse; onNext: () => void }) {
  const p: PortfolioSchema = data.portfolio;

  return (
    <div className="mt-10 animate-fade-in-up">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <h2 className="section-title text-xl sm:text-2xl flex items-center gap-2">
          <svg className="w-6 h-6 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          분석 결과
        </h2>
        <button onClick={onNext} className="btn-primary w-full sm:w-auto">
          채용 추천 받기
          <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      <div className="space-y-4">
        {p.name && (
          <div className="card-premium p-6">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">기본 정보</h3>
            <p className="text-lg font-bold text-slate-900">{p.name}</p>
            {p.summary && <p className="mt-2 text-slate-600 leading-relaxed">{p.summary}</p>}
          </div>
        )}

        {p.skills.length > 0 && (
          <div className="card-premium p-6">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">기술 스택</h3>
            <div className="flex flex-wrap gap-2">
              {p.skills.map((s, i) => (
                <span key={i} className="inline-flex items-center px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-lg text-sm font-medium ring-1 ring-inset ring-indigo-600/10">
                  {s.name}
                  {s.proficiency && (
                    <span className="text-indigo-400 ml-1.5 text-xs">({s.proficiency})</span>
                  )}
                </span>
              ))}
            </div>
          </div>
        )}

        {p.experiences.length > 0 && (
          <div className="card-premium p-6">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">경력</h3>
            <div className="space-y-4">
              {p.experiences.map((exp, i) => (
                <div key={i} className="border-l-2 border-indigo-200 pl-4">
                  <p className="font-semibold text-slate-900">
                    {exp.company} — {exp.role}
                  </p>
                  {exp.period && <p className="text-sm text-slate-500 mt-0.5">{exp.period}</p>}
                  {exp.description && <p className="text-sm text-slate-600 mt-1 leading-relaxed">{exp.description}</p>}
                </div>
              ))}
            </div>
          </div>
        )}

        {p.projects.length > 0 && (
          <div className="card-premium p-6">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">프로젝트</h3>
            <div className="space-y-4">
              {p.projects.map((proj, i) => (
                <div key={i} className="bg-slate-50 p-4 rounded-xl">
                  <p className="font-semibold text-slate-900">{proj.name}</p>
                  {proj.description && (
                    <p className="text-sm text-slate-600 mt-1 leading-relaxed">{proj.description}</p>
                  )}
                  {proj.tech_stack.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {proj.tech_stack.map((t, j) => (
                        <span key={j} className="badge-neutral text-[11px]">{t}</span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {p.keywords.length > 0 && (
          <div className="card-premium p-6">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">핵심 키워드</h3>
            <div className="flex flex-wrap gap-2">
              {p.keywords.map((kw, i) => (
                <span key={i} className="badge-neutral">{kw}</span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
