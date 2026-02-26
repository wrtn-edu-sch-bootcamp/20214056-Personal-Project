"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Navigation from "@/components/Navigation";
import AuthGuard from "@/components/AuthGuard";
import {
  getInterviewHistory,
  type InterviewHistoryMessage,
  type InterviewSessionListItem,
  listInterviewSessions,
} from "@/lib/api";

export default function InterviewDetailPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.id as string;

  const [messages, setMessages] = useState<InterviewHistoryMessage[]>([]);
  const [session, setSession] = useState<InterviewSessionListItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [historyRes, sessions] = await Promise.all([
          getInterviewHistory(sessionId),
          listInterviewSessions().catch(() => []),
        ]);
        setMessages(historyRes.messages);
        const found = sessions.find((s) => s.id === sessionId);
        if (found) setSession(found);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "대화 기록을 불러올 수 없습니다.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [sessionId]);

  const typeLabel = session
    ? session.interview_type === "technical"
      ? "기술 면접"
      : session.interview_type === "behavioral"
      ? "인성 면접"
      : "일반 면접"
    : "면접";

  const date = session?.created_at
    ? new Date(session.created_at).toLocaleDateString("ko-KR")
    : "";

  return (
    <AuthGuard>
      <div className="min-h-screen bg-slate-50">
        <Navigation />
        <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <button
              onClick={() => router.back()}
              className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-600 hover:border-slate-300 transition-all"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div>
              <h1 className="text-xl font-bold text-slate-900">{typeLabel} 기록</h1>
              {date && <p className="text-sm text-slate-500">{date}</p>}
            </div>
          </div>

          {/* Score card */}
          {session?.score != null && (
            <div className="card-premium p-6 mb-6">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-bold text-slate-800 flex items-center gap-2">
                  <svg className="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                  </svg>
                  평가 결과
                </h2>
                <div className="text-right">
                  <span className="text-3xl font-bold text-indigo-600">{session.score.toFixed(0)}</span>
                  <span className="text-sm text-slate-400 ml-1">점</span>
                </div>
              </div>
              {session.overall_feedback && (
                <p className="text-sm text-slate-600 leading-relaxed">{session.overall_feedback}</p>
              )}
            </div>
          )}

          {/* Loading / Error */}
          {loading && (
            <div className="text-center py-16">
              <div className="spinner w-8 h-8 text-indigo-600 mx-auto" />
              <p className="mt-4 text-sm text-slate-500">대화 기록 불러오는 중...</p>
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

          {/* Chat messages */}
          {!loading && !error && (
            <div className="space-y-4">
              {messages.length === 0 ? (
                <div className="text-center py-16 text-slate-400">
                  대화 기록이 없습니다.
                </div>
              ) : (
                messages
                  .filter((m) => m.content.trim() !== "면접을 시작해 주세요. 첫 번째 질문을 해 주세요.")
                  .map((msg, idx) => (
                    <div
                      key={idx}
                      className={`flex ${msg.role === "candidate" ? "justify-end" : "justify-start"}`}
                    >
                      {msg.role !== "candidate" && (
                        <div className="w-8 h-8 rounded-xl bg-slate-900 flex items-center justify-center shrink-0 mr-2 mt-1">
                          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                        </div>
                      )}
                      <div
                        className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                          msg.role === "candidate"
                            ? "bg-indigo-600 text-white rounded-br-md shadow-sm shadow-indigo-600/20"
                            : "bg-white border border-slate-200 text-slate-700 rounded-bl-md shadow-sm"
                        }`}
                      >
                        <p className={`text-xs font-semibold mb-1 ${
                          msg.role === "candidate" ? "text-indigo-200" : "text-slate-400"
                        }`}>
                          {msg.role === "candidate" ? "나" : "면접관"}
                        </p>
                        <div className="whitespace-pre-wrap">{msg.content}</div>
                      </div>
                    </div>
                  ))
              )}
            </div>
          )}

          {/* Bottom link */}
          <div className="mt-10 text-center">
            <Link
              href="/dashboard"
              className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
            >
              ← MY 페이지로 돌아가기
            </Link>
          </div>
        </main>
      </div>
    </AuthGuard>
  );
}
