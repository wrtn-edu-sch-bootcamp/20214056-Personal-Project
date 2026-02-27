"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Navigation from "@/components/Navigation";
import AuthGuard from "@/components/AuthGuard";
import { getRecommendedJobs, searchJobs, getPortfolio, type JobPosting } from "@/lib/api";

const EXPERIENCE_LEVELS = ["신입", "1~3년", "3~5년", "5~10년", "10년 이상"] as const;
const LOCATION_OPTIONS = [
  "서울", "경기", "인천", "부산", "대구", "대전", "광주", "울산", "세종",
  "강원", "충북", "충남", "전북", "전남", "경북", "경남", "제주", "원격근무",
] as const;

export default function JobsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50" />}>
      <JobsContent />
    </Suspense>
  );
}

function JobsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const portfolioId = searchParams.get("portfolio_id");

  const [jobs, setJobs] = useState<JobPosting[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [keyword, setKeyword] = useState("");
  const [mode, setMode] = useState<"recommend" | "search">(
    portfolioId ? "recommend" : "search"
  );

  // Experience / location filter state
  const [expFilter, setExpFilter] = useState<string>("");
  const [locFilter, setLocFilter] = useState<string[]>([]);
  const [showFilterPanel, setShowFilterPanel] = useState(false);

  // Load portfolio's saved filters on mount
  useEffect(() => {
    if (!portfolioId) return;
    (async () => {
      try {
        const pf = await getPortfolio(portfolioId);
        if (pf.portfolio.experience_level) setExpFilter(pf.portfolio.experience_level);
        if (pf.portfolio.preferred_locations?.length) setLocFilter(pf.portfolio.preferred_locations);
      } catch { /* non-critical */ }
    })();
  }, [portfolioId]);

  useEffect(() => {
    if (portfolioId && mode === "recommend") {
      loadRecommendations();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [portfolioId, mode]);

  const loadRecommendations = async () => {
    if (!portfolioId) return;
    setLoading(true);
    setError(null);
    try {
      const resp = await getRecommendedJobs(
        portfolioId, 30,
        expFilter || undefined,
        locFilter.length > 0 ? locFilter : undefined,
      );
      setJobs(resp.jobs);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "추천 로딩 실패");
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    setShowFilterPanel(false);
    if (portfolioId && mode === "recommend") {
      loadRecommendations();
    }
  };

  const toggleLocFilter = (loc: string) => {
    setLocFilter((prev) =>
      prev.includes(loc) ? prev.filter((l) => l !== loc) : [...prev, loc]
    );
  };

  const clearFilters = () => {
    setExpFilter("");
    setLocFilter([]);
    setShowFilterPanel(false);
    // Reload with no filters after state update
    setTimeout(() => {
      if (portfolioId && mode === "recommend") loadRecommendations();
    }, 0);
  };

  const handleSearch = async () => {
    if (!keyword.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const resp = await searchJobs(keyword);
      setJobs(resp.jobs);
      setMode("search");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "검색 실패");
    } finally {
      setLoading(false);
    }
  };

  const startInterview = (jobId: string) => {
    const params = new URLSearchParams();
    if (portfolioId) params.set("portfolio_id", portfolioId);
    params.set("job_id", jobId);
    router.push(`/interview?${params.toString()}`);
  };

  const generateResume = (jobId: string) => {
    const params = new URLSearchParams();
    if (portfolioId) params.set("portfolio_id", portfolioId);
    params.set("job_id", jobId);
    router.push(`/resume?${params.toString()}`);
  };

  return (
    <AuthGuard>
      <div className="min-h-screen bg-slate-50">
        <Navigation />
        <div className="page-container py-8 sm:py-10">
          {/* Header */}
          <div className="mb-8">
            <h1 className="section-title">채용 공고 추천</h1>
            <p className="section-subtitle">
              {portfolioId
                ? "포트폴리오 기반으로 추천된 채용공고입니다."
                : "포트폴리오를 먼저 입력하면 맞춤 추천을 받을 수 있습니다."}
            </p>
          </div>

          {/* Search bar */}
          <div className="card-premium p-4 sm:p-5 mb-6">
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
              <div className="flex-1 relative">
                <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  placeholder="키워드로 검색 (예: Python, 프론트엔드)"
                  className="input-field pl-10"
                />
              </div>
              <div className="flex gap-2">
                <button onClick={handleSearch} className="btn-primary flex-1 sm:flex-none">
                  검색
                </button>
                {portfolioId && (
                  <button
                    onClick={() => { setMode("recommend"); loadRecommendations(); }}
                    className="btn-secondary flex-1 sm:flex-none text-indigo-600 border-indigo-200 hover:border-indigo-300 hover:bg-indigo-50"
                  >
                    AI 추천 보기
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Active filter badges + filter toggle */}
          {portfolioId && mode === "recommend" && (
            <div className="mb-4">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => setShowFilterPanel(!showFilterPanel)}
                  className="btn-secondary text-xs px-3 py-1.5 flex items-center gap-1.5"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                  </svg>
                  필터 {showFilterPanel ? "닫기" : "설정"}
                </button>
                {expFilter && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-lg text-xs font-medium ring-1 ring-inset ring-indigo-600/10">
                    경력: {expFilter}
                    <button onClick={() => { setExpFilter(""); setTimeout(loadRecommendations, 0); }} className="hover:text-indigo-900">&times;</button>
                  </span>
                )}
                {locFilter.map((loc) => (
                  <span key={loc} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-lg text-xs font-medium ring-1 ring-inset ring-emerald-600/10">
                    {loc}
                    <button onClick={() => { toggleLocFilter(loc); setTimeout(loadRecommendations, 0); }} className="hover:text-emerald-900">&times;</button>
                  </span>
                ))}
                {(expFilter || locFilter.length > 0) && (
                  <button onClick={clearFilters} className="text-xs text-slate-400 hover:text-red-500 font-medium">
                    전체 해제
                  </button>
                )}
              </div>

              {/* Filter panel */}
              {showFilterPanel && (
                <div className="card-premium p-5 mt-3 animate-fade-in-down space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">경력 연차</label>
                    <div className="flex flex-wrap gap-2">
                      {EXPERIENCE_LEVELS.map((level) => (
                        <button
                          key={level}
                          onClick={() => setExpFilter(expFilter === level ? "" : level)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                            expFilter === level
                              ? "bg-indigo-600 text-white shadow-sm"
                              : "bg-white text-slate-500 border border-slate-200 hover:border-indigo-300"
                          }`}
                        >
                          {level}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">희망 근무 지역</label>
                    <div className="flex flex-wrap gap-2">
                      {LOCATION_OPTIONS.map((loc) => (
                        <button
                          key={loc}
                          onClick={() => toggleLocFilter(loc)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                            locFilter.includes(loc)
                              ? "bg-emerald-600 text-white shadow-sm"
                              : "bg-white text-slate-500 border border-slate-200 hover:border-emerald-300"
                          }`}
                        >
                          {loc}
                        </button>
                      ))}
                    </div>
                  </div>
                  <button onClick={applyFilters} className="btn-primary text-sm w-full">
                    필터 적용하기
                  </button>
                </div>
              )}
            </div>
          )}

          {!portfolioId && (
            <div className="flex items-start gap-3 p-4 bg-indigo-50/60 rounded-xl text-sm text-indigo-700 border border-indigo-100 mb-6">
              <svg className="w-5 h-5 shrink-0 mt-0.5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>
                맞춤 추천을 받으려면{" "}
                <button onClick={() => router.push("/portfolio")} className="underline font-semibold">
                  포트폴리오를 먼저 등록
                </button>해 주세요.
              </span>
            </div>
          )}

          {error && (
            <div className="flex items-start gap-2 bg-red-50 text-red-700 px-4 py-3 rounded-xl text-sm border border-red-100 mb-6">
              <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {error}
            </div>
          )}

          {loading && (
            <div className="text-center py-16">
              <div className="spinner w-8 h-8 text-indigo-600 mx-auto" />
              <p className="mt-4 text-slate-500">채용공고를 분석하고 있습니다...</p>
              <p className="mt-1 text-xs text-slate-400">서버 상태에 따라 최대 1분 정도 소요될 수 있습니다.</p>
            </div>
          )}

          {/* Job cards */}
          {!loading && jobs.length > 0 && (
            <div className="space-y-3">
              {jobs.map((job) => (
                <div key={job.id} className="card-premium p-5 sm:p-6">
                  <div className="flex flex-wrap items-start gap-2">
                    <h3 className="text-base sm:text-lg font-bold text-slate-900 flex-1 min-w-0">
                      {job.title}
                    </h3>
                    {job.similarity_score != null && (
                      <span className="badge-success whitespace-nowrap">
                        매칭 {(job.similarity_score * 100).toFixed(0)}%
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-slate-500 mt-1">
                    {job.company}
                    {job.location && <span className="text-slate-300 mx-1.5">·</span>}
                    {job.location}
                  </p>
                  {job.description && (
                    <p className="text-sm text-slate-600 mt-2 line-clamp-2 leading-relaxed">{job.description}</p>
                  )}
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {job.requirements.map((r, i) => (
                      <span key={i} className="badge-neutral text-[11px]">{r}</span>
                    ))}
                    {job.preferred.map((p, i) => (
                      <span key={`p-${i}`} className="badge-primary text-[11px]">{p}</span>
                    ))}
                  </div>
                  {job.salary && (
                    <p className="text-sm text-slate-500 mt-2 font-medium">{job.salary}</p>
                  )}

                  <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-slate-100">
                    {portfolioId && (
                      <>
                        <button
                          onClick={() => generateResume(job.id)}
                          className="inline-flex items-center justify-center px-4 py-2 bg-emerald-600 text-white font-semibold text-xs sm:text-sm rounded-xl shadow-sm shadow-emerald-600/25 hover:bg-emerald-700 transition-all duration-200"
                        >
                          맞춤 이력서
                        </button>
                        <button
                          onClick={() => startInterview(job.id)}
                          className="btn-primary text-xs sm:text-sm"
                        >
                          면접 연습
                        </button>
                      </>
                    )}
                    {job.url && (
                      <a
                        href={job.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-secondary text-xs sm:text-sm"
                      >
                        공고 보기
                        <svg className="w-3.5 h-3.5 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {!loading && jobs.length === 0 && !error && (
            <div className="text-center py-20">
              <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <p className="text-lg font-medium text-slate-400">검색 결과가 없습니다.</p>
            </div>
          )}
        </div>
      </div>
    </AuthGuard>
  );
}
