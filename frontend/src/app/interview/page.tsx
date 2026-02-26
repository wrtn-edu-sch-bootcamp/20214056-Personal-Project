"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Navigation from "@/components/Navigation";
import AuthGuard from "@/components/AuthGuard";
import {
  startInterview,
  submitAnswer,
  endInterview,
  type InterviewEndResponse,
} from "@/lib/api";

interface Message {
  role: "interviewer" | "candidate";
  content: string;
}

type InterviewType = "technical" | "behavioral" | "general";

export default function InterviewPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50" />}>
      <InterviewContent />
    </Suspense>
  );
}

function InterviewContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const portfolioId = searchParams.get("portfolio_id");
  const jobId = searchParams.get("job_id");

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [finished, setFinished] = useState(false);
  const [evaluation, setEvaluation] = useState<InterviewEndResponse | null>(null);
  const [interviewType, setInterviewType] = useState<InterviewType>("technical");
  const [error, setError] = useState<string | null>(null);

  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleStart = async () => {
    if (!portfolioId) {
      setError("포트폴리오 ID가 필요합니다. 포트폴리오를 먼저 등록해 주세요.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const resp = await startInterview(portfolioId, jobId || undefined, interviewType);
      setSessionId(resp.session_id);
      setMessages([{ role: "interviewer", content: resp.first_question }]);
      setFinished(false);
      setEvaluation(null);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "면접 시작 실패";
      if (msg.includes("429") || msg.includes("quota") || msg.includes("한도")) {
        setError("AI API 사용량 한도를 초과했습니다. 잠시 후(약 1~2분) 다시 시도해 주세요.");
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    if (!sessionId || !input.trim() || loading) return;

    const userMsg = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "candidate", content: userMsg }]);
    setLoading(true);

    try {
      const resp = await submitAnswer(sessionId, userMsg);
      setMessages((prev) => [...prev, { role: "interviewer", content: resp.feedback }]);
      if (resp.is_finished) setFinished(true);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "답변 전송 실패");
    } finally {
      setLoading(false);
    }
  };

  const handleEnd = async () => {
    if (!sessionId) return;
    setLoading(true);
    try {
      const resp = await endInterview(sessionId);
      setEvaluation(resp);
      setFinished(true);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "면접 종료 실패");
    } finally {
      setLoading(false);
    }
  };

  const INTERVIEW_TYPES = [
    {
      key: "technical" as const,
      label: "기술 면접",
      desc: "기술적 깊이 질문",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
        </svg>
      ),
    },
    {
      key: "behavioral" as const,
      label: "인성 면접",
      desc: "상황/행동 기반 질문",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
    },
    {
      key: "general" as const,
      label: "종합 면접",
      desc: "기술 + 인성 혼합",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
        </svg>
      ),
    },
  ];

  // Pre-interview setup
  if (!sessionId) {
    return (
      <AuthGuard>
        <div className="min-h-screen bg-slate-50">
          <Navigation />
          <div className="page-container py-8 sm:py-10">
            <div className="max-w-2xl mx-auto">
              <div className="mb-8">
                <h1 className="section-title">면접 시뮬레이션</h1>
                <p className="section-subtitle">
                  AI 면접관이 포트폴리오와 채용공고에 맞춰 면접을 진행합니다.
                </p>
              </div>

              {!portfolioId && (
                <div className="flex items-start gap-3 p-4 bg-amber-50/60 rounded-xl text-sm text-amber-700 border border-amber-100 mb-6">
                  <svg className="w-5 h-5 shrink-0 mt-0.5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <span>
                    포트폴리오가 등록되지 않았습니다.{" "}
                    <button onClick={() => router.push("/portfolio")} className="underline font-semibold">
                      포트폴리오 등록하기
                    </button>
                  </span>
                </div>
              )}

              {portfolioId && (
                <div className="card-premium p-6 sm:p-8">
                  <h2 className="text-lg font-bold text-slate-900 mb-5">면접 유형 선택</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {INTERVIEW_TYPES.map((t) => (
                      <button
                        key={t.key}
                        onClick={() => setInterviewType(t.key)}
                        className={`relative p-5 rounded-xl border-2 text-left transition-all duration-200 ${
                          interviewType === t.key
                            ? "border-indigo-500 bg-indigo-50/50 shadow-sm shadow-indigo-500/10"
                            : "border-slate-200 hover:border-slate-300 bg-white"
                        }`}
                      >
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${
                          interviewType === t.key ? "bg-indigo-100 text-indigo-600" : "bg-slate-100 text-slate-400"
                        }`}>
                          {t.icon}
                        </div>
                        <p className="font-semibold text-slate-900">{t.label}</p>
                        <p className="text-xs text-slate-500 mt-1">{t.desc}</p>
                        {interviewType === t.key && (
                          <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-indigo-600 flex items-center justify-center">
                            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                        )}
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={handleStart}
                    disabled={loading}
                    className="mt-6 w-full py-3.5 btn-primary text-sm"
                  >
                    {loading ? (
                      <span className="flex items-center justify-center gap-2">
                        <span className="spinner w-4 h-4" />
                        면접 준비 중...
                      </span>
                    ) : "면접 시작하기"}
                  </button>
                  {loading && (
                    <p className="text-xs text-slate-400 text-center mt-2">
                      서버 상태에 따라 최대 1분 정도 소요될 수 있습니다.
                    </p>
                  )}
                </div>
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
          </div>
        </div>
      </AuthGuard>
    );
  }

  // Chat interface
  return (
    <AuthGuard>
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <Navigation />

        {/* Evaluation modal */}
        {evaluation && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 sm:p-4">
            <div className="bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl max-w-lg w-full p-6 sm:p-8 max-h-[85vh] sm:max-h-[90vh] overflow-y-auto animate-slide-up sm:animate-scale-in">
              <div className="text-center mb-6">
                <div className="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                  </svg>
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900">면접 종합 평가</h2>
              </div>

              {evaluation.score != null && (
                <div className="flex items-center justify-center gap-2 mb-6">
                  <span className="text-5xl font-bold text-indigo-600">{evaluation.score}</span>
                  <span className="text-slate-400 text-lg">/ 100</span>
                </div>
              )}

              <p className="text-slate-600 leading-relaxed mb-6 text-sm">{evaluation.overall_feedback}</p>

              {evaluation.strengths.length > 0 && (
                <div className="mb-4">
                  <h3 className="font-bold text-emerald-700 text-sm mb-2 flex items-center gap-1.5">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    강점
                  </h3>
                  <ul className="space-y-1.5">
                    {evaluation.strengths.map((s, i) => (
                      <li key={i} className="text-sm text-slate-600 flex items-start gap-2">
                        <span className="text-emerald-500 mt-1 text-xs">●</span>{s}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {evaluation.improvements.length > 0 && (
                <div className="mb-6">
                  <h3 className="font-bold text-amber-700 text-sm mb-2 flex items-center gap-1.5">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                    개선점
                  </h3>
                  <ul className="space-y-1.5">
                    {evaluation.improvements.map((s, i) => (
                      <li key={i} className="text-sm text-slate-600 flex items-start gap-2">
                        <span className="text-amber-500 mt-1 text-xs">●</span>{s}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <button onClick={() => setEvaluation(null)} className="w-full btn-primary py-3">
                닫기
              </button>
            </div>
          </div>
        )}

        {/* Chat area */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <div className="max-w-3xl mx-auto px-3 sm:px-4 py-4 sm:py-6 space-y-3 sm:space-y-4">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === "candidate" ? "justify-end" : "justify-start"} animate-fade-in`}
              >
                {msg.role === "interviewer" && (
                  <div className="w-8 h-8 rounded-xl bg-slate-900 flex items-center justify-center shrink-0 mr-2 mt-1">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                )}
                <div
                  className={`max-w-[80%] sm:max-w-[75%] px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                    msg.role === "candidate"
                      ? "bg-indigo-600 text-white rounded-2xl rounded-br-md shadow-sm shadow-indigo-600/20"
                      : "bg-white text-slate-700 border border-slate-200 rounded-2xl rounded-bl-md shadow-sm"
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="w-8 h-8 rounded-xl bg-slate-900 flex items-center justify-center shrink-0 mr-2 mt-1">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <div className="bg-white border border-slate-200 px-4 py-3 rounded-2xl rounded-bl-md shadow-sm">
                  <div className="flex gap-1.5">
                    <span className="w-2 h-2 bg-slate-300 rounded-full animate-bounce" />
                    <span className="w-2 h-2 bg-slate-300 rounded-full animate-bounce [animation-delay:0.15s]" />
                    <span className="w-2 h-2 bg-slate-300 rounded-full animate-bounce [animation-delay:0.3s]" />
                  </div>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>
        </div>

        {/* Input bar */}
        <div className="bg-white/80 backdrop-blur-xl border-t border-slate-200/60 px-3 sm:px-4 py-3 sm:py-4">
          <div className="max-w-3xl mx-auto flex gap-2 sm:gap-3">
            {!finished ? (
              <>
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
                  placeholder="답변을 입력하세요..."
                  disabled={loading}
                  className="input-field flex-1 min-w-0"
                />
                <button
                  onClick={handleSend}
                  disabled={loading || !input.trim()}
                  className="btn-primary shrink-0"
                >
                  전송
                </button>
                <button
                  onClick={handleEnd}
                  disabled={loading}
                  className="btn-secondary shrink-0"
                >
                  종료
                </button>
              </>
            ) : (
              <div className="flex-1 flex gap-2 sm:gap-3">
                <button
                  onClick={handleEnd}
                  disabled={loading || !!evaluation}
                  className="flex-1 btn-primary py-3"
                >
                  {evaluation ? "평가 완료" : "종합 평가 받기"}
                </button>
                <button
                  onClick={() => {
                    setSessionId(null);
                    setMessages([]);
                    setFinished(false);
                    setEvaluation(null);
                  }}
                  className="btn-secondary shrink-0 px-6"
                >
                  새 면접
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}
