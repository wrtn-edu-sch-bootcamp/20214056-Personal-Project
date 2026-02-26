"use client";

import { useEffect, useState, useCallback } from "react";
import Navigation from "@/components/Navigation";
import AuthGuard from "@/components/AuthGuard";
import { browseJobs, type JobPosting } from "@/lib/api";

export default function ExplorePage() {
  const [jobs, setJobs] = useState<JobPosting[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [keyword, setKeyword] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const PAGE_SIZE = 20;

  const loadJobs = useCallback(async (q: string, p: number) => {
    setLoading(true);
    setError(null);
    try {
      const resp = await browseJobs(q, p, PAGE_SIZE);
      setJobs(resp.jobs);
      setTotal(resp.total);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "채용공고 조회에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadJobs(keyword, page);
  }, [keyword, page, loadJobs]);

  const handleSearch = () => {
    setKeyword(searchInput.trim());
    setPage(1);
  };

  const handleReset = () => {
    setSearchInput("");
    setKeyword("");
    setPage(1);
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <AuthGuard>
      <div className="min-h-screen bg-slate-50">
        <Navigation />
        <div className="page-container py-8 sm:py-10">
          {/* Header */}
          <div className="mb-8">
            <h1 className="section-title">채용공고 탐색</h1>
            <p className="section-subtitle">
              사람인에서 수집한 최신 IT 채용공고를 확인하세요.
              <span className="ml-2 badge-neutral">{total}건</span>
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
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  placeholder="직무, 기업명, 기술 스택으로 검색"
                  className="input-field pl-10"
                />
              </div>
              <div className="flex gap-2">
                <button onClick={handleSearch} className="btn-primary flex-1 sm:flex-none">
                  검색
                </button>
                {keyword && (
                  <button onClick={handleReset} className="btn-secondary flex-1 sm:flex-none">
                    초기화
                  </button>
                )}
              </div>
            </div>
            {keyword && (
              <div className="mt-3 text-sm text-slate-500">
                &ldquo;<span className="font-medium text-slate-700">{keyword}</span>&rdquo; 검색 결과: <span className="font-semibold">{total}</span>건
              </div>
            )}
          </div>

          {error && (
            <div className="flex items-start gap-2 bg-red-50 text-red-700 px-4 py-3 rounded-xl text-sm border border-red-100 mb-6">
              <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {error}
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div className="text-center py-16">
              <div className="spinner w-8 h-8 text-indigo-600 mx-auto" />
              <p className="mt-4 text-slate-500">채용공고를 불러오는 중...</p>
              <p className="mt-1 text-xs text-slate-400">
                서버 상태에 따라 최대 1분 정도 소요될 수 있습니다.
              </p>
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
                  </div>
                  <p className="text-sm text-slate-500 mt-1">
                    {job.company}
                    {job.location && <span className="text-slate-300 mx-1.5">·</span>}
                    {job.location}
                  </p>
                  {job.description && (
                    <p className="text-sm text-slate-600 mt-2 line-clamp-2 leading-relaxed">
                      {job.description}
                    </p>
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
                    {job.url && (
                      <a
                        href={job.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-primary text-xs"
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

          {/* Empty state */}
          {!loading && jobs.length === 0 && !error && (
            <div className="text-center py-20">
              <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <p className="text-lg font-medium text-slate-400">
                {keyword ? "검색 결과가 없습니다." : "등록된 채용공고가 없습니다."}
              </p>
            </div>
          )}

          {/* Pagination */}
          {!loading && totalPages > 1 && (
            <div className="mt-8 flex justify-center items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="btn-secondary text-xs px-4 py-2 disabled:opacity-40"
              >
                이전
              </button>
              <span className="text-sm text-slate-600 px-4 font-medium">
                {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="btn-secondary text-xs px-4 py-2 disabled:opacity-40"
              >
                다음
              </button>
            </div>
          )}
        </div>
      </div>
    </AuthGuard>
  );
}
