"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Navigation from "@/components/Navigation";
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
    <Suspense fallback={<div className="min-h-screen bg-gray-50" />}>
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
      setError(e instanceof Error ? e.message : "면접 시작 실패");
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
      setMessages((prev) => [
        ...prev,
        { role: "interviewer", content: resp.feedback },
      ]);
      if (resp.is_finished) {
        setFinished(true);
      }
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

  // Pre-interview setup screen
  if (!sessionId) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="max-w-2xl mx-auto px-4 py-10">
          <h1 className="text-3xl font-bold text-gray-900">면접 시뮬레이션</h1>
          <p className="mt-2 text-gray-600">
            AI 면접관이 포트폴리오와 채용공고에 맞춰 면접을 진행합니다.
          </p>

          {!portfolioId && (
            <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
              포트폴리오가 등록되지 않았습니다.{" "}
              <button
                onClick={() => router.push("/portfolio")}
                className="underline font-medium"
              >
                포트폴리오 등록하기
              </button>
            </div>
          )}

          {portfolioId && (
            <div className="mt-8 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                면접 유형 선택
              </h2>
              <div className="grid grid-cols-3 gap-3">
                {(
                  [
                    { key: "technical", label: "기술 면접", desc: "기술적 깊이 질문" },
                    { key: "behavioral", label: "인성 면접", desc: "상황/행동 기반 질문" },
                    { key: "general", label: "종합 면접", desc: "기술 + 인성 혼합" },
                  ] as const
                ).map((t) => (
                  <button
                    key={t.key}
                    onClick={() => setInterviewType(t.key)}
                    className={`p-4 rounded-lg border-2 text-left transition ${
                      interviewType === t.key
                        ? "border-primary-500 bg-primary-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <p className="font-medium text-gray-900">{t.label}</p>
                    <p className="text-xs text-gray-500 mt-1">{t.desc}</p>
                  </button>
                ))}
              </div>

              <button
                onClick={handleStart}
                disabled={loading}
                className="mt-6 w-full py-3 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 disabled:opacity-50 transition"
              >
                {loading ? "면접 준비 중..." : "면접 시작하기"}
              </button>
            </div>
          )}

          {error && (
            <p className="mt-4 text-sm text-red-600 bg-red-50 p-3 rounded-lg">
              {error}
            </p>
          )}
        </div>
      </div>
    );
  }

  // Chat interface
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navigation />

      {/* Evaluation modal */}
      {evaluation && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-8 max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              면접 종합 평가
            </h2>
            {evaluation.score != null && (
              <div className="flex items-center gap-3 mb-4">
                <div className="text-4xl font-bold text-primary-600">
                  {evaluation.score}
                </div>
                <span className="text-gray-500">/ 100점</span>
              </div>
            )}
            <p className="text-gray-700 leading-relaxed mb-6">
              {evaluation.overall_feedback}
            </p>

            {evaluation.strengths.length > 0 && (
              <div className="mb-4">
                <h3 className="font-semibold text-green-700 mb-2">강점</h3>
                <ul className="space-y-1">
                  {evaluation.strengths.map((s, i) => (
                    <li key={i} className="text-sm text-gray-700 flex gap-2">
                      <span className="text-green-500">+</span> {s}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {evaluation.improvements.length > 0 && (
              <div className="mb-6">
                <h3 className="font-semibold text-orange-700 mb-2">개선점</h3>
                <ul className="space-y-1">
                  {evaluation.improvements.map((s, i) => (
                    <li key={i} className="text-sm text-gray-700 flex gap-2">
                      <span className="text-orange-500">-</span> {s}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <button
              onClick={() => setEvaluation(null)}
              className="w-full py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition"
            >
              닫기
            </button>
          </div>
        </div>
      )}

      {/* Chat area */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${
                msg.role === "candidate" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                  msg.role === "candidate"
                    ? "bg-primary-600 text-white rounded-br-md"
                    : "bg-white text-gray-800 border border-gray-200 rounded-bl-md shadow-sm"
                }`}
              >
                {msg.content}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-white border border-gray-200 px-4 py-3 rounded-2xl rounded-bl-md shadow-sm">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:0.1s]" />
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:0.2s]" />
                </div>
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>
      </div>

      {/* Input bar */}
      <div className="bg-white border-t border-gray-200 px-4 py-4">
        <div className="max-w-3xl mx-auto flex gap-3">
          {!finished ? (
            <>
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
                placeholder="답변을 입력하세요..."
                disabled={loading}
                className="flex-1 border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:opacity-50"
              />
              <button
                onClick={handleSend}
                disabled={loading || !input.trim()}
                className="px-6 py-3 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 disabled:opacity-50 transition"
              >
                전송
              </button>
              <button
                onClick={handleEnd}
                disabled={loading}
                className="px-4 py-3 border border-gray-300 text-gray-600 font-medium rounded-lg hover:bg-gray-50 transition"
              >
                종료
              </button>
            </>
          ) : (
            <div className="flex-1 flex gap-3">
              <button
                onClick={handleEnd}
                disabled={loading || !!evaluation}
                className="flex-1 py-3 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 disabled:opacity-50 transition"
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
                className="px-6 py-3 border border-gray-300 text-gray-600 font-medium rounded-lg hover:bg-gray-50 transition"
              >
                새 면접
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
