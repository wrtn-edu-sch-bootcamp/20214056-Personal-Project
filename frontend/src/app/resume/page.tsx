"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import Navigation from "@/components/Navigation";
import AuthGuard from "@/components/AuthGuard";
import {
  generateResume,
  downloadResumePdf,
  getResume,
  type ResumeResponse,
} from "@/lib/api";

export default function ResumePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50" />}>
      <ResumeContent />
    </Suspense>
  );
}

function ResumeContent() {
  const searchParams = useSearchParams();
  const portfolioId = searchParams.get("portfolio_id");
  const jobId = searchParams.get("job_id");
  const resumeId = searchParams.get("resume_id");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ResumeResponse | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);

  useEffect(() => {
    if (resumeId && !result) {
      loadExistingResume();
    } else if (portfolioId && jobId && !result) {
      handleGenerate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [portfolioId, jobId, resumeId]);

  const loadExistingResume = async () => {
    if (!resumeId) return;
    setLoading(true);
    setError(null);
    try {
      const resp = await getResume(resumeId);
      setResult(resp);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "이력서 조회에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    if (!portfolioId || !jobId) return;
    setLoading(true);
    setError(null);
    try {
      const resp = await generateResume(portfolioId, jobId);
      setResult(resp);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "이력서 생성에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const handlePdfDownload = async () => {
    if (!result) return;
    setPdfLoading(true);
    try {
      await downloadResumePdf(result.id);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "PDF 다운로드에 실패했습니다.");
    } finally {
      setPdfLoading(false);
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
              <h1 className="section-title">맞춤 이력서 생성</h1>
              <p className="section-subtitle">
                선택한 채용공고에 최적화된 이력서를 AI가 자동으로 작성합니다.
              </p>
            </div>

            {/* Missing params warning */}
            {(!portfolioId || !jobId) && !resumeId && (
              <div className="flex items-start gap-3 p-4 bg-amber-50/60 rounded-xl text-sm text-amber-700 border border-amber-100 mb-6">
                <svg className="w-5 h-5 shrink-0 mt-0.5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span>
                  포트폴리오와 채용공고 정보가 필요합니다. 채용 추천 페이지에서 &quot;맞춤 이력서&quot; 버튼을 클릭해 주세요.
                </span>
              </div>
            )}

            {/* Loading state */}
            {loading && (
              <div className="text-center py-16">
                <div className="spinner w-10 h-10 text-emerald-600 mx-auto" />
                <p className="mt-4 text-slate-600 font-medium">
                  기업 정보를 분석하고 맞춤 이력서를 생성하고 있습니다...
                </p>
                <p className="mt-2 text-sm text-slate-400">최대 30초 정도 소요될 수 있습니다.</p>
                <p className="mt-1 text-xs text-slate-400">서버가 절전 모드인 경우 추가로 30~60초가 소요될 수 있습니다.</p>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="flex items-start gap-2 bg-red-50 text-red-700 px-4 py-3 rounded-xl text-sm border border-red-100 mb-6">
                <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {error}
              </div>
            )}

            {/* Result */}
            {result && (
              <div className="space-y-5 animate-fade-in-up">
                {/* Crawl status */}
                {!result.crawl_success && (
                  <div className="flex items-start gap-3 p-4 bg-amber-50/60 rounded-xl text-sm text-amber-700 border border-amber-100">
                    <svg className="w-5 h-5 shrink-0 mt-0.5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>기업 홈페이지에서 인재상 정보를 수집하지 못했습니다. 포트폴리오와 채용공고 정보만으로 이력서를 작성했습니다.</span>
                  </div>
                )}

                {result.crawl_success && result.company_info && (
                  <div className="card-premium p-5 border-emerald-200/60 bg-emerald-50/30">
                    <h3 className="text-sm font-bold text-emerald-800 mb-2 flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      수집된 기업 정보
                    </h3>
                    {result.company_info.talent_profile && (
                      <p className="text-sm text-emerald-700 mb-2">
                        <span className="font-semibold">인재상:</span> {result.company_info.talent_profile}
                      </p>
                    )}
                    {result.company_info.core_values.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {result.company_info.core_values.map((v, i) => (
                          <span key={i} className="badge-success text-[11px]">{v}</span>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Action buttons */}
                <div className="flex flex-wrap gap-2 sm:gap-3">
                  <button
                    onClick={handlePdfDownload}
                    disabled={pdfLoading}
                    className="flex-1 sm:flex-none inline-flex items-center justify-center px-5 py-3 bg-emerald-600 text-white font-semibold text-sm rounded-xl shadow-sm shadow-emerald-600/25 hover:bg-emerald-700 disabled:opacity-50 transition-all duration-200"
                  >
                    {pdfLoading ? (
                      <span className="flex items-center gap-2">
                        <span className="spinner w-4 h-4" />
                        변환 중...
                      </span>
                    ) : (
                      <>
                        <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        PDF 다운로드
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => {
                      if (result) navigator.clipboard.writeText(result.markdown_content);
                    }}
                    className="btn-secondary flex-1 sm:flex-none"
                  >
                    <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                    </svg>
                    텍스트 복사
                  </button>
                  <button
                    onClick={handleGenerate}
                    disabled={loading}
                    className="w-full sm:w-auto btn-ghost text-emerald-700 hover:bg-emerald-50"
                  >
                    다시 생성
                  </button>
                </div>

                {/* Markdown preview */}
                <div className="card-premium p-6 sm:p-10">
                  <div className="prose prose-sm max-w-none prose-headings:text-slate-900 prose-p:text-slate-700 prose-li:text-slate-700 prose-strong:text-slate-900 prose-a:text-indigo-600">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {result.markdown_content}
                    </ReactMarkdown>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}
