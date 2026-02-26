"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Navigation from "@/components/Navigation";
import { useAuth } from "@/lib/auth";
import {
  listPortfolios,
  deletePortfolio,
  listResumes,
  listInterviewSessions,
  downloadResumePdf,
  togglePortfolioVisibility,
  type PortfolioResponse,
  type ResumeListItem,
  type InterviewSessionListItem,
} from "@/lib/api";

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [portfolios, setPortfolios] = useState<PortfolioResponse[]>([]);
  const [resumes, setResumes] = useState<ResumeListItem[]>([]);
  const [interviews, setInterviews] = useState<InterviewSessionListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push("/login");
    } else if (user.role === "company") {
      router.replace("/company/dashboard");
    }
  }, [authLoading, user, router]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    async function fetchData() {
      setLoading(true);
      setError(null);
      try {
        const [pfRes, resumeRes, interviewRes] = await Promise.all([
          listPortfolios(),
          listResumes().catch(() => []),
          listInterviewSessions().catch(() => []),
        ]);
        if (cancelled) return;
        setPortfolios(pfRes.portfolios);
        setResumes(resumeRes);
        setInterviews(interviewRes);
      } catch (err: any) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchData();
    return () => { cancelled = true; };
  }, [user]);

  const handleDeletePortfolio = async (id: string) => {
    if (!confirm("이 포트폴리오를 삭제하시겠습니까? 관련 이력서와 면접 기록도 함께 삭제됩니다.")) return;
    try {
      await deletePortfolio(id);
      setPortfolios((prev) => prev.filter((p) => p.id !== id));
    } catch (err: any) {
      alert(err.message || "삭제 실패");
    }
  };

  const handleToggleVisibility = async (id: string) => {
    try {
      const result = await togglePortfolioVisibility(id);
      setPortfolios((prev) =>
        prev.map((p) => (p.id === id ? { ...p, is_public: result.is_public } : p))
      );
    } catch (err: any) {
      alert(err.message || "공개 설정 변경 실패");
    }
  };

  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Navigation />
        <main className="page-container py-20 text-center">
          <div className="spinner w-8 h-8 text-indigo-600 mx-auto" />
          <p className="text-slate-500 mt-4">로딩 중...</p>
          <p className="text-xs text-slate-400 mt-1">서버가 절전 모드일 경우 최초 요청 시 30~60초가 소요될 수 있습니다.</p>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Navigation />
      <main className="page-container py-8 sm:py-10">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm shadow-sm shadow-indigo-500/25">
              {user.name.charAt(0)}
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
                {user.name}님의 대시보드
              </h1>
              <p className="text-sm text-slate-500">포트폴리오, 이력서, 면접 기록을 관리하세요.</p>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="card-premium p-5 text-center">
            <div className="text-2xl font-bold text-indigo-600">{portfolios.length}</div>
            <div className="text-xs text-slate-500 mt-1 font-medium">포트폴리오</div>
          </div>
          <div className="card-premium p-5 text-center">
            <div className="text-2xl font-bold text-emerald-600">{resumes.length}</div>
            <div className="text-xs text-slate-500 mt-1 font-medium">이력서</div>
          </div>
          <div className="card-premium p-5 text-center">
            <div className="text-2xl font-bold text-purple-600">{interviews.length}</div>
            <div className="text-xs text-slate-500 mt-1 font-medium">면접 기록</div>
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

        {loading ? (
          <div className="text-center py-16">
            <div className="spinner w-8 h-8 text-indigo-600 mx-auto" />
            <p className="text-slate-500 mt-4">데이터를 불러오는 중...</p>
            <p className="text-xs text-slate-400 mt-1">서버 상태에 따라 최대 1분 정도 소요될 수 있습니다.</p>
          </div>
        ) : (
          <div className="space-y-10">
            {/* Portfolios */}
            <section>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <svg className="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                  내 포트폴리오
                </h2>
                <Link href="/portfolio" className="btn-primary text-xs px-4 py-2">
                  + 새 포트폴리오
                </Link>
              </div>
              {portfolios.length === 0 ? (
                <div className="card-premium p-10 text-center">
                  <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
                    <svg className="w-7 h-7 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <p className="text-slate-500 text-sm mb-3">등록된 포트폴리오가 없습니다.</p>
                  <Link href="/portfolio" className="text-sm text-indigo-600 font-medium hover:text-indigo-700">
                    포트폴리오를 입력해보세요 →
                  </Link>
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  {portfolios.map((pf) => (
                    <PortfolioCard
                      key={pf.id}
                      portfolio={pf}
                      onDelete={handleDeletePortfolio}
                      onToggleVisibility={handleToggleVisibility}
                    />
                  ))}
                </div>
              )}
            </section>

            {/* Resumes */}
            <section>
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2 mb-5">
                <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                내 맞춤 이력서
              </h2>
              {resumes.length === 0 ? (
                <div className="card-premium p-10 text-center">
                  <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
                    <svg className="w-7 h-7 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </div>
                  <p className="text-slate-500 text-sm">생성된 이력서가 없습니다.</p>
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {resumes.map((r) => (
                    <ResumeCard key={r.id} resume={r} />
                  ))}
                </div>
              )}
            </section>

            {/* Interview Sessions */}
            <section>
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2 mb-5">
                <svg className="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                면접 기록
              </h2>
              {interviews.length === 0 ? (
                <div className="card-premium p-10 text-center">
                  <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
                    <svg className="w-7 h-7 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                  </div>
                  <p className="text-slate-500 text-sm">면접 기록이 없습니다.</p>
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {interviews.map((s) => (
                    <InterviewCard key={s.id} session={s} />
                  ))}
                </div>
              )}
            </section>
          </div>
        )}
      </main>
    </div>
  );
}

/* ── Sub-components ──────────────────────────── */

function PortfolioCard({
  portfolio,
  onDelete,
  onToggleVisibility,
}: {
  portfolio: PortfolioResponse;
  onDelete: (id: string) => void;
  onToggleVisibility: (id: string) => void;
}) {
  const pf = portfolio.portfolio;
  const skills = pf.skills.slice(0, 6).map((s) => s.name);

  return (
    <div className="card-premium p-5 sm:p-6">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-slate-900 truncate">{pf.name || "이름 없음"}</h3>
          {pf.summary && (
            <p className="text-sm text-slate-500 mt-1 line-clamp-2">{pf.summary}</p>
          )}
        </div>
        <button
          onClick={() => onToggleVisibility(portfolio.id)}
          className="shrink-0 ml-3 flex items-center gap-2 group"
          title={portfolio.is_public ? "클릭하여 비공개로 전환" : "클릭하여 공개로 전환"}
          aria-label={portfolio.is_public ? "공개 상태 — 클릭하여 비공개로 전환" : "비공개 상태 — 클릭하여 공개로 전환"}
        >
          <span className={`text-xs font-semibold transition-colors duration-200 ${
            portfolio.is_public ? "text-emerald-600" : "text-slate-400"
          }`}>
            {portfolio.is_public ? "공개" : "비공개"}
          </span>
          {/* Toggle track */}
          <span className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-200 ${
            portfolio.is_public
              ? "bg-emerald-500"
              : "bg-slate-300"
          }`}>
            {/* Toggle knob */}
            <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow-sm transform transition-transform duration-200 ${
              portfolio.is_public ? "translate-x-[18px]" : "translate-x-[3px]"
            }`} />
          </span>
        </button>
      </div>

      {skills.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          {skills.map((s) => (
            <span key={s} className="badge-primary text-[11px]">
              {s}
            </span>
          ))}
          {pf.skills.length > 6 && (
            <span className="badge-neutral text-[11px]">
              +{pf.skills.length - 6}
            </span>
          )}
        </div>
      )}

      <div className="flex gap-2 flex-wrap pt-3 border-t border-slate-100">
        <Link
          href={`/jobs?portfolio_id=${portfolio.id}`}
          className="btn-primary text-xs px-3 py-1.5"
        >
          채용 추천
        </Link>
        <Link
          href={`/interview?portfolio_id=${portfolio.id}`}
          className="inline-flex items-center justify-center px-3 py-1.5 bg-emerald-600 text-white font-semibold text-xs rounded-xl shadow-sm shadow-emerald-600/25 hover:bg-emerald-700 transition-all duration-200"
        >
          면접 연습
        </Link>
        <button
          onClick={() => onDelete(portfolio.id)}
          className="text-xs px-3 py-1.5 text-red-500 hover:bg-red-50 rounded-xl transition-all ml-auto font-medium"
        >
          삭제
        </button>
      </div>
    </div>
  );
}

function ResumeCard({ resume }: { resume: ResumeListItem }) {
  const handleDownload = async () => {
    try {
      await downloadResumePdf(resume.id);
    } catch (err: any) {
      alert(err.message || "다운로드 실패");
    }
  };

  const date = resume.created_at
    ? new Date(resume.created_at).toLocaleDateString("ko-KR")
    : "";

  return (
    <div className="card-premium p-5 sm:p-6">
      <div className="mb-3">
        <h3 className="font-bold text-slate-900">
          {resume.company_name || "이력서"}
        </h3>
        <p className="text-xs text-slate-400 mt-1">{date}</p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className={resume.crawl_success ? "badge-success" : "badge-warning"}>
          {resume.crawl_success ? "기업정보 반영" : "기본 생성"}
        </span>
        <div className="flex gap-2 ml-auto">
          <button
            onClick={handleDownload}
            className="btn-primary text-xs px-3 py-1.5"
          >
            PDF
          </button>
          <Link
            href={`/resume?resume_id=${resume.id}`}
            className="btn-secondary text-xs px-3 py-1.5"
          >
            보기
          </Link>
        </div>
      </div>
    </div>
  );
}

function InterviewCard({ session }: { session: InterviewSessionListItem }) {
  const date = session.created_at
    ? new Date(session.created_at).toLocaleDateString("ko-KR")
    : "";
  const typeLabel =
    session.interview_type === "technical"
      ? "기술 면접"
      : session.interview_type === "behavioral"
      ? "인성 면접"
      : "일반 면접";

  return (
    <Link
      href={`/interview/${session.id}`}
      className="block card-premium p-5 sm:p-6"
    >
      <div className="flex items-start justify-between mb-2">
        <div>
          <h3 className="font-bold text-slate-900">{typeLabel}</h3>
          <p className="text-xs text-slate-400 mt-0.5">{date}</p>
        </div>
        {session.score != null && (
          <div className="text-right">
            <span className="text-2xl font-bold text-indigo-600">
              {session.score.toFixed(0)}
            </span>
            <span className="text-xs text-slate-400 ml-0.5">점</span>
          </div>
        )}
      </div>
      {session.overall_feedback && (
        <p className="text-sm text-slate-500 line-clamp-2 mb-3 leading-relaxed">
          {session.overall_feedback}
        </p>
      )}
      <div className="flex items-center justify-between pt-3 border-t border-slate-100">
        <span className={session.finished_at ? "badge-success" : "badge-warning"}>
          {session.finished_at ? "완료" : "진행중"}
        </span>
        <span className="text-xs text-slate-400 font-medium">대화 내용 보기 →</span>
      </div>
    </Link>
  );
}
