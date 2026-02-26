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

  // Redirect: login if not authenticated, company dashboard if company role
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push("/login");
    } else if (user.role === "company") {
      router.replace("/company/dashboard");
    }
  }, [authLoading, user, router]);

  // Fetch dashboard data
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
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <main className="max-w-6xl mx-auto px-4 py-12 text-center">
          <p className="text-gray-500">로딩 중...</p>
          <p className="text-xs text-gray-400 mt-1">서버가 절전 모드일 경우 최초 요청 시 30~60초가 소요될 수 있습니다.</p>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
            {user.name}님의 대시보드
          </h1>
          <p className="text-sm sm:text-base text-gray-500 mt-1">포트폴리오, 이력서, 면접 기록을 관리하세요.</p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm border border-red-200 mb-6">
            {error}
          </div>
        )}

        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-500">데이터를 불러오는 중...</p>
            <p className="text-xs text-gray-400 mt-1">서버 상태에 따라 최대 1분 정도 소요될 수 있습니다.</p>
          </div>
        ) : (
          <div className="space-y-10">
            {/* ── Portfolios ─────────────────────────────── */}
            <section>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                <h2 className="text-base sm:text-lg font-semibold text-gray-800">내 포트폴리오</h2>
                <Link
                  href="/portfolio"
                  className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                >
                  + 새 포트폴리오 추가
                </Link>
              </div>
              {portfolios.length === 0 ? (
                <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-500">
                  등록된 포트폴리오가 없습니다.
                  <br />
                  <Link href="/portfolio" className="text-primary-600 hover:underline mt-2 inline-block">
                    포트폴리오를 입력해보세요
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

            {/* ── Resumes ─────────────────────────────────── */}
            <section>
              <h2 className="text-lg font-semibold text-gray-800 mb-4">내 맞춤 이력서</h2>
              {resumes.length === 0 ? (
                <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-500">
                  생성된 이력서가 없습니다.
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {resumes.map((r) => (
                    <ResumeCard key={r.id} resume={r} />
                  ))}
                </div>
              )}
            </section>

            {/* ── Interview Sessions ──────────────────────── */}
            <section>
              <h2 className="text-lg font-semibold text-gray-800 mb-4">면접 기록</h2>
              {interviews.length === 0 ? (
                <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-500">
                  면접 기록이 없습니다.
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

// ── Sub-components ────────────────────────────────────────────

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
    <div className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-semibold text-gray-900">{pf.name || "이름 없음"}</h3>
          {pf.summary && (
            <p className="text-sm text-gray-500 mt-1 line-clamp-2">{pf.summary}</p>
          )}
        </div>
        {/* Visibility toggle */}
        <button
          onClick={() => onToggleVisibility(portfolio.id)}
          className={`shrink-0 ml-2 text-xs px-2 py-1 rounded-full font-medium transition-colors ${
            portfolio.is_public
              ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
              : "bg-gray-100 text-gray-500 hover:bg-gray-200"
          }`}
          title={portfolio.is_public ? "기업에 공개 중" : "비공개 상태"}
        >
          {portfolio.is_public ? "공개" : "비공개"}
        </button>
      </div>

      {skills.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          {skills.map((s) => (
            <span
              key={s}
              className="px-2 py-0.5 bg-primary-50 text-primary-700 text-xs rounded-full"
            >
              {s}
            </span>
          ))}
          {pf.skills.length > 6 && (
            <span className="px-2 py-0.5 bg-gray-100 text-gray-500 text-xs rounded-full">
              +{pf.skills.length - 6}
            </span>
          )}
        </div>
      )}

      <div className="flex gap-2 flex-wrap">
        <Link
          href={`/jobs?portfolio_id=${portfolio.id}`}
          className="text-xs px-3 py-1.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
        >
          채용 추천
        </Link>
        <Link
          href={`/interview?portfolio_id=${portfolio.id}`}
          className="text-xs px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
        >
          면접 연습
        </Link>
        <button
          onClick={() => onDelete(portfolio.id)}
          className="text-xs px-3 py-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors ml-auto"
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
    <div className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow">
      <div className="mb-3">
        <h3 className="font-semibold text-gray-900">
          {resume.company_name || "이력서"}
        </h3>
        <p className="text-xs text-gray-400 mt-1">{date}</p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={`text-xs px-2 py-0.5 rounded-full ${
            resume.crawl_success
              ? "bg-green-50 text-green-700"
              : "bg-yellow-50 text-yellow-700"
          }`}
        >
          {resume.crawl_success ? "기업정보 반영" : "기본 생성"}
        </span>
        <div className="flex gap-2 ml-auto">
          <button
            onClick={handleDownload}
            className="text-xs px-3 py-1.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            PDF
          </button>
          <Link
            href={`/resume?resume_id=${resume.id}`}
            className="text-xs px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
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
    <div className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-2">
        <div>
          <h3 className="font-semibold text-gray-900">{typeLabel}</h3>
          <p className="text-xs text-gray-400 mt-0.5">{date}</p>
        </div>
        {session.score != null && (
          <span className="text-lg font-bold text-primary-600">
            {session.score.toFixed(0)}점
          </span>
        )}
      </div>
      {session.overall_feedback && (
        <p className="text-sm text-gray-600 line-clamp-3 mb-3">
          {session.overall_feedback}
        </p>
      )}
      <div className="flex items-center gap-2">
        <span
          className={`text-xs px-2 py-0.5 rounded-full ${
            session.finished_at
              ? "bg-green-50 text-green-700"
              : "bg-yellow-50 text-yellow-700"
          }`}
        >
          {session.finished_at ? "완료" : "진행중"}
        </span>
      </div>
    </div>
  );
}
