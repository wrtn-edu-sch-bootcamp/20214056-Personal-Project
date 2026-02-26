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

const TABS: { key: TabKey; label: string }[] = [
  { key: "text", label: "직접 입력" },
  { key: "pdf", label: "PDF 업로드" },
  { key: "url", label: "웹사이트 URL" },
  { key: "github", label: "GitHub" },
];

export default function PortfolioPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabKey>("text");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Input states
  const [text, setText] = useState("");
  const [url, setUrl] = useState("");
  const [github, setGithub] = useState("");
  const [pdfFile, setPdfFile] = useState<File | null>(null);

  // Result state
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
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">포트폴리오 입력</h1>
        <p className="mt-2 text-sm sm:text-base text-gray-600">
          아래 방식 중 하나로 포트폴리오를 입력하면 AI가 자동으로 분석합니다.
        </p>

        {/* Tabs — horizontally scrollable on mobile */}
        <div className="mt-6 sm:mt-8 flex overflow-x-auto border-b border-gray-200 -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-hide">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => { setActiveTab(tab.key); setResult(null); setError(null); }}
              className={`px-4 sm:px-5 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition ${
                activeTab === tab.key
                  ? "border-primary-600 text-primary-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Input area */}
        <div className="mt-6 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          {activeTab === "text" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                경력, 기술스택, 프로젝트 등을 자유롭게 작성해 주세요
              </label>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={12}
                placeholder={`예시:\n이름: 홍길동\n경력: 3년차 백엔드 개발자\n기술스택: Python, FastAPI, PostgreSQL, Docker\n\n프로젝트:\n1. 커머스 플랫폼 백엔드 (2023) - FastAPI 기반 REST API 설계 및 구현\n2. 데이터 파이프라인 (2022) - Airflow + Spark 기반 ETL 파이프라인 구축`}
                className="w-full border border-gray-300 rounded-lg p-4 text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-y"
              />
            </div>
          )}

          {activeTab === "pdf" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                PDF 파일 선택
              </label>
              <input
                type="file"
                accept=".pdf"
                onChange={(e) => setPdfFile(e.target.files?.[0] || null)}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100"
              />
              {pdfFile && (
                <p className="mt-2 text-sm text-gray-600">
                  선택된 파일: {pdfFile.name} ({(pdfFile.size / 1024).toFixed(1)} KB)
                </p>
              )}
            </div>
          )}

          {activeTab === "url" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                포트폴리오 웹사이트 URL
              </label>
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://your-portfolio.com"
                className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
          )}

          {activeTab === "github" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                GitHub 사용자명
              </label>
              <p className="text-xs text-gray-500 mb-3">
                GitHub 프로필 URL에서 사용자명만 입력하거나,{" "}
                <code className="bg-gray-100 px-1 rounded">github.com/your-username</code>{" "}
                에서 <strong>your-username</strong> 부분만 입력하세요.
              </p>
              <input
                type="text"
                value={github}
                onChange={(e) => {
                  // Auto-strip URL prefix if user pastes full URL
                  const val = e.target.value
                    .replace(/^https?:\/\/(www\.)?github\.com\//i, "")
                    .replace(/\/.*$/, "") // remove trailing path (e.g. /repos)
                    .trim();
                  setGithub(val);
                }}
                placeholder="username"
                className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
              <p className="mt-2 text-xs text-gray-400">
                전체 URL(https://github.com/username)을 붙여 넣어도 자동으로 추출됩니다.
              </p>
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="mt-6 w-full py-3 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {loading ? "분석 중..." : "포트폴리오 분석하기"}
          </button>
          {loading && (
            <p className="text-xs text-gray-400 text-center mt-2">
              서버 상태에 따라 최대 1분 정도 소요될 수 있습니다.
            </p>
          )}

          {error && (
            <p className="mt-4 text-sm text-red-600 bg-red-50 p-3 rounded-lg">
              {error}
            </p>
          )}
        </div>

        {/* Result preview */}
        {result && <PortfolioPreview data={result} onNext={goToJobs} />}
      </div>
    </div>
    </AuthGuard>
  );
}

function PortfolioPreview({
  data,
  onNext,
}: {
  data: PortfolioResponse;
  onNext: () => void;
}) {
  const p: PortfolioSchema = data.portfolio;

  return (
    <div className="mt-8 sm:mt-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900">분석 결과</h2>
        <button
          onClick={onNext}
          className="px-6 py-2 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 transition text-sm sm:text-base w-full sm:w-auto"
        >
          채용 추천 받기 &rarr;
        </button>
      </div>

      <div className="space-y-6">
        {/* Basic info */}
        {p.name && (
          <Card title="기본 정보">
            <p className="text-lg font-semibold">{p.name}</p>
            {p.summary && <p className="mt-1 text-gray-600">{p.summary}</p>}
          </Card>
        )}

        {/* Skills */}
        {p.skills.length > 0 && (
          <Card title="기술 스택">
            <div className="flex flex-wrap gap-2">
              {p.skills.map((s, i) => (
                <span
                  key={i}
                  className="inline-block px-3 py-1 bg-primary-50 text-primary-700 rounded-full text-sm font-medium"
                >
                  {s.name}
                  {s.proficiency && (
                    <span className="text-primary-400 ml-1">({s.proficiency})</span>
                  )}
                </span>
              ))}
            </div>
          </Card>
        )}

        {/* Experiences */}
        {p.experiences.length > 0 && (
          <Card title="경력">
            <div className="space-y-3">
              {p.experiences.map((exp, i) => (
                <div key={i} className="border-l-4 border-primary-300 pl-4">
                  <p className="font-semibold">
                    {exp.company} &mdash; {exp.role}
                  </p>
                  {exp.period && (
                    <p className="text-sm text-gray-500">{exp.period}</p>
                  )}
                  {exp.description && (
                    <p className="text-sm text-gray-600 mt-1">
                      {exp.description}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Projects */}
        {p.projects.length > 0 && (
          <Card title="프로젝트">
            <div className="space-y-4">
              {p.projects.map((proj, i) => (
                <div key={i} className="bg-gray-50 p-4 rounded-lg">
                  <p className="font-semibold text-gray-900">{proj.name}</p>
                  {proj.description && (
                    <p className="text-sm text-gray-600 mt-1">
                      {proj.description}
                    </p>
                  )}
                  {proj.tech_stack.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {proj.tech_stack.map((t, j) => (
                        <span
                          key={j}
                          className="text-xs bg-gray-200 text-gray-700 px-2 py-0.5 rounded"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Keywords */}
        {p.keywords.length > 0 && (
          <Card title="핵심 키워드">
            <div className="flex flex-wrap gap-2">
              {p.keywords.map((kw, i) => (
                <span
                  key={i}
                  className="text-sm bg-gray-100 text-gray-700 px-3 py-1 rounded-full"
                >
                  {kw}
                </span>
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}

function Card({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
      {children}
    </div>
  );
}
