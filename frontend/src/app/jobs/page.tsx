"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Navigation from "@/components/Navigation";
import {
  getRecommendedJobs,
  searchJobs,
  type JobPosting,
} from "@/lib/api";

export default function JobsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50" />}>
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

  // Fetch recommended jobs when portfolio_id is present
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
      const resp = await getRecommendedJobs(portfolioId);
      setJobs(resp.jobs);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "추천 로딩 실패");
    } finally {
      setLoading(false);
    }
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
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <div className="max-w-6xl mx-auto px-4 py-10">
        <h1 className="text-3xl font-bold text-gray-900">채용 공고 추천</h1>
        <p className="mt-2 text-gray-600">
          {portfolioId
            ? "포트폴리오 기반으로 추천된 채용공고입니다."
            : "포트폴리오를 먼저 입력하면 맞춤 추천을 받을 수 있습니다."}
        </p>

        {/* Search bar */}
        <div className="mt-6 flex gap-3">
          <input
            type="text"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="키워드로 검색 (예: Python, 프론트엔드)"
            className="flex-1 border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
          <button
            onClick={handleSearch}
            className="px-6 py-3 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 transition"
          >
            검색
          </button>
          {portfolioId && (
            <button
              onClick={() => { setMode("recommend"); loadRecommendations(); }}
              className="px-6 py-3 border border-primary-300 text-primary-600 font-medium rounded-lg hover:bg-primary-50 transition"
            >
              추천 보기
            </button>
          )}
        </div>

        {!portfolioId && (
          <div className="mt-4 p-4 bg-primary-50 rounded-lg text-sm text-primary-700">
            맞춤 추천을 받으려면{" "}
            <button
              onClick={() => router.push("/portfolio")}
              className="underline font-medium"
            >
              포트폴리오를 먼저 등록
            </button>
            해 주세요.
          </div>
        )}

        {error && (
          <p className="mt-4 text-sm text-red-600 bg-red-50 p-3 rounded-lg">
            {error}
          </p>
        )}

        {loading && (
          <div className="mt-10 text-center text-gray-500">
            <div className="inline-block w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
            <p className="mt-3">채용공고를 분석하고 있습니다...</p>
          </div>
        )}

        {/* Job cards */}
        {!loading && jobs.length > 0 && (
          <div className="mt-8 space-y-4">
            {jobs.map((job) => (
              <div
                key={job.id}
                className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:border-primary-200 transition"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {job.title}
                      </h3>
                      {job.similarity_score != null && (
                        <span className="px-2 py-0.5 bg-green-50 text-green-700 text-xs font-medium rounded-full">
                          매칭 {(job.similarity_score * 100).toFixed(0)}%
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      {job.company}
                      {job.location && ` · ${job.location}`}
                    </p>
                    {job.description && (
                      <p className="text-sm text-gray-600 mt-3 line-clamp-2">
                        {job.description}
                      </p>
                    )}
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {job.requirements.map((r, i) => (
                        <span
                          key={i}
                          className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded"
                        >
                          {r}
                        </span>
                      ))}
                      {job.preferred.map((p, i) => (
                        <span
                          key={`p-${i}`}
                          className="text-xs bg-primary-50 text-primary-600 px-2 py-0.5 rounded"
                        >
                          {p}
                        </span>
                      ))}
                    </div>
                    {job.salary && (
                      <p className="text-sm text-gray-500 mt-2">
                        {job.salary}
                      </p>
                    )}
                  </div>
                  <div className="ml-4 flex flex-col gap-2">
                    {portfolioId && (
                      <>
                        <button
                          onClick={() => generateResume(job.id)}
                          className="px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 transition whitespace-nowrap"
                        >
                          맞춤 이력서
                        </button>
                        <button
                          onClick={() => startInterview(job.id)}
                          className="px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 transition whitespace-nowrap"
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
                        className="px-4 py-2 border border-gray-300 text-gray-600 text-sm font-medium rounded-lg hover:bg-gray-50 transition text-center"
                      >
                        공고 보기
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && jobs.length === 0 && !error && (
          <div className="mt-16 text-center text-gray-400">
            <p className="text-lg">검색 결과가 없습니다.</p>
          </div>
        )}
      </div>
    </div>
  );
}
