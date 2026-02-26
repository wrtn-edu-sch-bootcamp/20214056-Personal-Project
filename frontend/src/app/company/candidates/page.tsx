"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Navigation from "@/components/Navigation";
import { useAuth } from "@/lib/auth";
import {
  listCompanyJobs,
  matchCandidates,
  searchCandidates,
  getPublicPortfolio,
  type CompanyJobPosting,
  type CandidateMatchItem,
  type PortfolioResponse,
} from "@/lib/api";

export default function CandidatesPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50" />}>
      <CandidatesContent />
    </Suspense>
  );
}

function CandidatesContent() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedJobId = searchParams.get("job_id");

  const [jobs, setJobs] = useState<CompanyJobPosting[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string>(preselectedJobId || "");
  const [candidates, setCandidates] = useState<CandidateMatchItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [searchMode, setSearchMode] = useState<"match" | "search">("match");
  const [keyword, setKeyword] = useState("");

  const [detailPf, setDetailPf] = useState<PortfolioResponse | null>(null);

  useEffect(() => {
    if (!authLoading && (!user || user.role !== "company")) {
      router.push("/login");
    }
  }, [authLoading, user, router]);

  useEffect(() => {
    if (!user || user.role !== "company") return;
    listCompanyJobs().then(setJobs).catch(() => {});
  }, [user]);

  useEffect(() => {
    if (preselectedJobId && jobs.length > 0) {
      setSelectedJobId(preselectedJobId);
      handleMatch(preselectedJobId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preselectedJobId, jobs]);

  const handleMatch = async (jobId?: string) => {
    const jid = jobId || selectedJobId;
    if (!jid) return;
    setLoading(true);
    setError(null);
    setSearchMode("match");
    try {
      const resp = await matchCandidates(jid);
      setCandidates(resp.candidates);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!keyword.trim()) return;
    setLoading(true);
    setError(null);
    setSearchMode("search");
    try {
      const resp = await searchCandidates(keyword);
      setCandidates(
        (resp.results || []).map((r: any, i: number) => ({
          rank: i + 1,
          portfolio_id: r.portfolio_id,
          user_name: r.user_name,
          summary: r.summary,
          skills: r.skills || [],
          similarity_score: 0,
        }))
      );
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const viewPortfolio = async (pfId: string) => {
    try {
      const pf = await getPublicPortfolio(pfId);
      setDetailPf(pf);
    } catch (err: any) {
      alert(err.message || "포트폴리오 조회 실패");
    }
  };

  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Navigation />
        <main className="page-container py-20 text-center">
          <div className="spinner w-8 h-8 text-emerald-600 mx-auto" />
          <p className="text-slate-500 mt-4">로딩 중...</p>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Navigation />
      <main className="page-container py-8 sm:py-10">
        <div className="mb-8">
          <h1 className="section-title text-xl sm:text-2xl">인재 매칭</h1>
        </div>

        {/* Job selector + search */}
        <div className="card-premium p-5 sm:p-6 mb-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">공고 선택</label>
              <select
                value={selectedJobId}
                onChange={(e) => setSelectedJobId(e.target.value)}
                className="input-field"
              >
                <option value="">공고를 선택하세요</option>
                {jobs.map((j) => (
                  <option key={j.id} value={j.id}>
                    {j.title} ({j.status === "published" ? "게시중" : "마감"})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">키워드 검색</label>
              <input
                type="text"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                className="input-field"
                placeholder="스킬, 이름 등으로 검색"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => handleMatch()}
              disabled={!selectedJobId || loading}
              className="inline-flex items-center justify-center px-5 py-2.5 bg-emerald-600 text-white font-semibold text-sm rounded-xl shadow-sm shadow-emerald-600/25 hover:bg-emerald-700 disabled:opacity-50 transition-all duration-200"
            >
              매칭 분석
            </button>
            <button
              onClick={handleSearch}
              disabled={!keyword.trim() || loading}
              className="btn-primary"
            >
              검색
            </button>
          </div>
        </div>

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
            <div className="spinner w-8 h-8 text-emerald-600 mx-auto" />
            <p className="mt-4 text-slate-500 text-sm">후보자를 분석하고 있습니다...</p>
            <p className="mt-1 text-xs text-slate-400">서버 상태에 따라 최대 1분 정도 소요될 수 있습니다.</p>
          </div>
        )}

        {/* Results */}
        {!loading && candidates.length > 0 && (
          <div className="space-y-3">
            <p className="text-sm text-slate-500 font-medium mb-3">
              {searchMode === "match" ? "매칭 순위" : "검색 결과"}: <span className="font-bold text-slate-700">{candidates.length}</span>명
            </p>
            {candidates.map((c) => (
              <div key={c.portfolio_id} className="card-premium p-5 sm:p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <span className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white text-xs font-bold flex items-center justify-center shadow-sm shadow-indigo-500/25">
                        {c.rank}
                      </span>
                      <h3 className="font-bold text-slate-900">{c.user_name || "이름 미공개"}</h3>
                      {searchMode === "match" && c.similarity_score > 0 && (
                        <span className="badge-success">
                          적합도 {(c.similarity_score * 100).toFixed(0)}%
                        </span>
                      )}
                    </div>
                    {c.summary && (
                      <p className="text-sm text-slate-500 line-clamp-2 mt-1 leading-relaxed">{c.summary}</p>
                    )}
                    {c.skills.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {c.skills.map((s, i) => (
                          <span key={i} className="badge-primary text-[11px]">{s}</span>
                        ))}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => viewPortfolio(c.portfolio_id)}
                    className="btn-secondary text-xs shrink-0 ml-3"
                  >
                    상세 보기
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && candidates.length === 0 && !error && (
          <div className="text-center py-20">
            <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <p className="text-lg font-medium text-slate-400">공고를 선택하고 매칭 분석을 시작하세요.</p>
            <p className="text-sm text-slate-400 mt-1">공개 설정된 구직자 포트폴리오를 기반으로 적합도를 분석합니다.</p>
          </div>
        )}

        {/* Detail modal */}
        {detailPf && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 sm:p-4">
            <div className="bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl max-w-2xl w-full p-6 sm:p-8 max-h-[85vh] overflow-y-auto animate-slide-up sm:animate-scale-in">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-xl font-bold text-slate-900">
                  {detailPf.portfolio.name || "포트폴리오"}
                </h2>
                <button
                  onClick={() => setDetailPf(null)}
                  className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-all"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {detailPf.portfolio.summary && (
                <p className="text-sm text-slate-600 mb-4 leading-relaxed">{detailPf.portfolio.summary}</p>
              )}

              {detailPf.portfolio.skills.length > 0 && (
                <div className="mb-5">
                  <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">기술 스택</h3>
                  <div className="flex flex-wrap gap-1.5">
                    {detailPf.portfolio.skills.map((s, i) => (
                      <span key={i} className="badge-primary">
                        {s.name}
                        {s.proficiency && <span className="text-indigo-400 ml-1">({s.proficiency})</span>}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {detailPf.portfolio.experiences.length > 0 && (
                <div className="mb-5">
                  <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">경력</h3>
                  <div className="space-y-3">
                    {detailPf.portfolio.experiences.map((exp, i) => (
                      <div key={i} className="border-l-2 border-indigo-200 pl-3">
                        <p className="text-sm font-semibold text-slate-900">{exp.company} — {exp.role}</p>
                        {exp.period && <p className="text-xs text-slate-500">{exp.period}</p>}
                        {exp.description && <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">{exp.description}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {detailPf.portfolio.projects.length > 0 && (
                <div className="mb-5">
                  <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">프로젝트</h3>
                  <div className="space-y-3">
                    {detailPf.portfolio.projects.map((proj, i) => (
                      <div key={i} className="bg-slate-50 p-3 rounded-xl">
                        <p className="text-sm font-semibold text-slate-900">{proj.name}</p>
                        {proj.description && <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">{proj.description}</p>}
                        {proj.tech_stack.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
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

              <button onClick={() => setDetailPf(null)} className="w-full btn-primary py-3 mt-2">
                닫기
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
