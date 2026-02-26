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
    <Suspense fallback={<div className="min-h-screen bg-gray-50" />}>
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
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">맞춤 이력서 생성</h1>
        <p className="mt-2 text-sm sm:text-base text-gray-600">
          선택한 채용공고에 최적화된 이력서를 AI가 자동으로 작성합니다.
        </p>

        {/* Missing params warning */}
        {(!portfolioId || !jobId) && (
          <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
            포트폴리오와 채용공고 정보가 필요합니다. 채용 추천 페이지에서
            &quot;맞춤 이력서&quot; 버튼을 클릭해 주세요.
          </div>
        )}

        {/* Loading state */}
        {loading && (
          <div className="mt-10 text-center">
            <div className="inline-block w-10 h-10 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
            <p className="mt-4 text-gray-600">
              기업 정보를 분석하고 맞춤 이력서를 생성하고 있습니다...
            </p>
            <p className="mt-1 text-sm text-gray-400">
              최대 30초 정도 소요될 수 있습니다.
            </p>
            <p className="mt-1 text-xs text-gray-400">
              서버가 절전 모드인 경우 추가로 30~60초가 소요될 수 있습니다.
            </p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Result */}
        {result && (
          <div className="mt-8 space-y-6">
            {/* Crawl status banner */}
            {!result.crawl_success && (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
                기업 홈페이지에서 인재상 정보를 수집하지 못했습니다.
                포트폴리오와 채용공고 정보만으로 이력서를 작성했습니다.
              </div>
            )}

            {result.crawl_success && result.company_info && (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
                <h3 className="text-sm font-semibold text-emerald-800 mb-2">
                  수집된 기업 정보
                </h3>
                {result.company_info.talent_profile && (
                  <p className="text-sm text-emerald-700 mb-2">
                    <span className="font-medium">인재상:</span>{" "}
                    {result.company_info.talent_profile}
                  </p>
                )}
                {result.company_info.core_values.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {result.company_info.core_values.map((v, i) => (
                      <span
                        key={i}
                        className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full"
                      >
                        {v}
                      </span>
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
                className="flex-1 sm:flex-none px-4 sm:px-6 py-2.5 sm:py-3 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition"
              >
                {pdfLoading ? "변환 중..." : "PDF 다운로드"}
              </button>
              <button
                onClick={() => {
                  if (result) {
                    navigator.clipboard.writeText(result.markdown_content);
                  }
                }}
                className="flex-1 sm:flex-none px-4 sm:px-6 py-2.5 sm:py-3 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition"
              >
                텍스트 복사
              </button>
              <button
                onClick={handleGenerate}
                disabled={loading}
                className="w-full sm:w-auto px-4 sm:px-6 py-2.5 sm:py-3 border border-emerald-300 text-emerald-700 text-sm font-medium rounded-lg hover:bg-emerald-50 transition"
              >
                다시 생성
              </button>
            </div>

            {/* Markdown preview */}
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-4 sm:p-8">
              <div className="prose prose-sm max-w-none prose-headings:text-gray-900 prose-p:text-gray-700 prose-li:text-gray-700 prose-strong:text-gray-900">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {result.markdown_content}
                </ReactMarkdown>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
    </AuthGuard>
  );
}
