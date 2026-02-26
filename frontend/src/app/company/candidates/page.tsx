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
    <Suspense fallback={<div className="min-h-screen bg-gray-50" />}>
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

  // Search
  const [searchMode, setSearchMode] = useState<"match" | "search">("match");
  const [keyword, setKeyword] = useState("");

  // Detail view
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
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <main className="max-w-6xl mx-auto px-4 py-12 text-center text-gray-500">로딩 중...</main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-6">인재 매칭</h1>

        {/* Job selector + search */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">공고 선택</label>
              <select
                value={selectedJobId}
                onChange={(e) => setSelectedJobId(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
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
              <label className="block text-sm font-medium text-gray-700 mb-1">키워드 검색</label>
              <input
                type="text"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
                placeholder="스킬, 이름 등으로 검색"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => handleMatch()}
              disabled={!selectedJobId || loading}
              className="px-5 py-2.5 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition"
            >
              매칭 분석
            </button>
            <button
              onClick={handleSearch}
              disabled={!keyword.trim() || loading}
              className="px-5 py-2.5 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 disabled:opacity-50 transition"
            >
              검색
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm border border-red-200 mb-6">{error}</div>
        )}

        {loading && (
          <div className="text-center py-10">
            <div className="inline-block w-8 h-8 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
            <p className="mt-3 text-gray-500 text-sm">후보자를 분석하고 있습니다...</p>
          </div>
        )}

        {/* Results */}
        {!loading && candidates.length > 0 && (
          <div className="space-y-3">
            <p className="text-sm text-gray-500">
              {searchMode === "match" ? "매칭 순위" : "검색 결과"}: {candidates.length}명
            </p>
            {candidates.map((c) => (
              <div
                key={c.portfolio_id}
                className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <span className="w-7 h-7 rounded-full bg-primary-100 text-primary-700 text-xs font-bold flex items-center justify-center">
                        {c.rank}
                      </span>
                      <h3 className="font-semibold text-gray-900">
                        {c.user_name || "이름 미공개"}
                      </h3>
                      {searchMode === "match" && c.similarity_score > 0 && (
                        <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-xs font-medium rounded-full">
                          적합도 {(c.similarity_score * 100).toFixed(0)}%
                        </span>
                      )}
                    </div>
                    {c.summary && (
                      <p className="text-sm text-gray-600 line-clamp-2 mt-1">{c.summary}</p>
                    )}
                    {c.skills.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {c.skills.map((s, i) => (
                          <span key={i} className="text-xs bg-primary-50 text-primary-700 px-2 py-0.5 rounded-full">
                            {s}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => viewPortfolio(c.portfolio_id)}
                    className="shrink-0 ml-3 px-3 py-1.5 text-xs bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    상세 보기
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && candidates.length === 0 && !error && (
          <div className="text-center text-gray-400 py-16">
            <p className="text-lg">공고를 선택하고 매칭 분석을 시작하세요.</p>
            <p className="text-sm mt-1">공개 설정된 구직자 포트폴리오를 기반으로 적합도를 분석합니다.</p>
          </div>
        )}

        {/* Detail modal */}
        {detailPf && (
          <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50 sm:p-4">
            <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-xl max-w-2xl w-full p-6 sm:p-8 max-h-[85vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900">
                  {detailPf.portfolio.name || "포트폴리오"}
                </h2>
                <button
                  onClick={() => setDetailPf(null)}
                  className="text-gray-400 hover:text-gray-600 text-xl"
                >
                  &times;
                </button>
              </div>

              {detailPf.portfolio.summary && (
                <p className="text-sm text-gray-600 mb-4">{detailPf.portfolio.summary}</p>
              )}

              {detailPf.portfolio.skills.length > 0 && (
                <div className="mb-4">
                  <h3 className="text-sm font-semibold text-gray-800 mb-2">기술 스택</h3>
                  <div className="flex flex-wrap gap-1.5">
                    {detailPf.portfolio.skills.map((s, i) => (
                      <span key={i} className="px-2 py-1 bg-primary-50 text-primary-700 text-xs rounded-full">
                        {s.name}
                        {s.proficiency && <span className="text-primary-400 ml-1">({s.proficiency})</span>}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {detailPf.portfolio.experiences.length > 0 && (
                <div className="mb-4">
                  <h3 className="text-sm font-semibold text-gray-800 mb-2">경력</h3>
                  <div className="space-y-2">
                    {detailPf.portfolio.experiences.map((exp, i) => (
                      <div key={i} className="border-l-4 border-primary-300 pl-3">
                        <p className="text-sm font-medium">{exp.company} - {exp.role}</p>
                        {exp.period && <p className="text-xs text-gray-500">{exp.period}</p>}
                        {exp.description && <p className="text-xs text-gray-600 mt-0.5">{exp.description}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {detailPf.portfolio.projects.length > 0 && (
                <div className="mb-4">
                  <h3 className="text-sm font-semibold text-gray-800 mb-2">프로젝트</h3>
                  <div className="space-y-2">
                    {detailPf.portfolio.projects.map((proj, i) => (
                      <div key={i} className="bg-gray-50 p-3 rounded-lg">
                        <p className="text-sm font-medium">{proj.name}</p>
                        {proj.description && <p className="text-xs text-gray-600 mt-0.5">{proj.description}</p>}
                        {proj.tech_stack.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {proj.tech_stack.map((t, j) => (
                              <span key={j} className="text-xs bg-gray-200 text-gray-700 px-1.5 py-0.5 rounded">{t}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <button
                onClick={() => setDetailPf(null)}
                className="w-full py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition mt-2"
              >
                닫기
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
