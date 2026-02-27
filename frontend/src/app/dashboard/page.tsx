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
  const [expanded, setExpanded] = useState(false);
  const pf = portfolio.portfolio;
  const skills = pf.skills.slice(0, 6).map((s) => s.name);

  return (
    <div className="card-premium p-5 sm:p-6">
      {/* Header: name + summary + visibility toggle */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-slate-900 truncate">{pf.name || "이름 없음"}</h3>
          {pf.summary && (
            <p className={`text-sm text-slate-500 mt-1 ${expanded ? "" : "line-clamp-2"}`}>{pf.summary}</p>
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
          <span className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-200 ${
            portfolio.is_public ? "bg-emerald-500" : "bg-slate-300"
          }`}>
            <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow-sm transform transition-transform duration-200 ${
              portfolio.is_public ? "translate-x-[18px]" : "translate-x-[3px]"
            }`} />
          </span>
        </button>
      </div>

      {/* Skills (collapsed: top 6, expanded: all) */}
      {pf.skills.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          {(expanded ? pf.skills : pf.skills.slice(0, 6)).map((s, i) => (
            <span key={i} className="badge-primary text-[11px]">
              {s.name}
              {expanded && s.proficiency && (
                <span className="text-indigo-400 ml-1">({s.proficiency})</span>
              )}
            </span>
          ))}
          {!expanded && pf.skills.length > 6 && (
            <span className="badge-neutral text-[11px]">
              +{pf.skills.length - 6}
            </span>
          )}
        </div>
      )}

      {/* Experience & location badges */}
      {(pf.experience_level || (pf.preferred_locations && pf.preferred_locations.length > 0)) && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          {pf.experience_level && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-md text-[11px] font-medium ring-1 ring-inset ring-indigo-600/10">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              {pf.experience_level}
            </span>
          )}
          {pf.preferred_locations?.map((loc) => (
            <span key={loc} className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-md text-[11px] font-medium ring-1 ring-inset ring-emerald-600/10">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              {loc}
            </span>
          ))}
        </div>
      )}

      {/* Expanded detail sections */}
      {expanded && (
        <div className="space-y-4 mb-4 animate-fade-in">
          {/* Contact */}
          {pf.contact && (pf.contact.email || pf.contact.phone || pf.contact.github || pf.contact.blog) && (
            <div className="bg-slate-50 rounded-xl p-4">
              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">연락처</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-sm text-slate-600">
                {pf.contact.email && (
                  <div className="flex items-center gap-2">
                    <svg className="w-3.5 h-3.5 text-slate-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    <span className="truncate">{pf.contact.email}</span>
                  </div>
                )}
                {pf.contact.phone && (
                  <div className="flex items-center gap-2">
                    <svg className="w-3.5 h-3.5 text-slate-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    <span>{pf.contact.phone}</span>
                  </div>
                )}
                {pf.contact.github && (
                  <div className="flex items-center gap-2">
                    <svg className="w-3.5 h-3.5 text-slate-400 shrink-0" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                    </svg>
                    <a href={`https://github.com/${pf.contact.github}`} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline truncate">
                      {pf.contact.github}
                    </a>
                  </div>
                )}
                {pf.contact.blog && (
                  <div className="flex items-center gap-2">
                    <svg className="w-3.5 h-3.5 text-slate-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                    </svg>
                    <a href={pf.contact.blog} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline truncate">
                      {pf.contact.blog}
                    </a>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Experiences */}
          {pf.experiences.length > 0 && (
            <div className="bg-slate-50 rounded-xl p-4">
              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">경력</h4>
              <div className="space-y-3">
                {pf.experiences.map((exp, i) => (
                  <div key={i} className="border-l-2 border-indigo-200 pl-3">
                    <p className="font-semibold text-sm text-slate-900">{exp.company} — {exp.role}</p>
                    {exp.period && <p className="text-xs text-slate-400 mt-0.5">{exp.period}</p>}
                    {exp.description && <p className="text-xs text-slate-600 mt-1 leading-relaxed">{exp.description}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Projects */}
          {pf.projects.length > 0 && (
            <div className="bg-slate-50 rounded-xl p-4">
              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">프로젝트</h4>
              <div className="space-y-3">
                {pf.projects.map((proj, i) => (
                  <div key={i} className="bg-white rounded-lg p-3 ring-1 ring-slate-100">
                    <p className="font-semibold text-sm text-slate-900">{proj.name}</p>
                    {proj.description && <p className="text-xs text-slate-600 mt-1 leading-relaxed">{proj.description}</p>}
                    {proj.tech_stack.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {proj.tech_stack.map((t, j) => (
                          <span key={j} className="badge-neutral text-[10px]">{t}</span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Education */}
          {pf.education.length > 0 && (
            <div className="bg-slate-50 rounded-xl p-4">
              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">학력</h4>
              <div className="space-y-2">
                {pf.education.map((edu, i) => (
                  <div key={i} className="text-sm">
                    <p className="font-semibold text-slate-900">{edu.institution || "미상"}</p>
                    <p className="text-xs text-slate-500">
                      {edu.major}{edu.degree ? ` · ${edu.degree}` : ""}{edu.period ? ` · ${edu.period}` : ""}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Certifications */}
          {pf.certifications.length > 0 && (
            <div className="bg-slate-50 rounded-xl p-4">
              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">자격증</h4>
              <div className="flex flex-wrap gap-1.5">
                {pf.certifications.map((cert, i) => (
                  <span key={i} className="badge-neutral text-[11px]">{cert}</span>
                ))}
              </div>
            </div>
          )}

          {/* Keywords */}
          {pf.keywords.length > 0 && (
            <div className="bg-slate-50 rounded-xl p-4">
              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">핵심 키워드</h4>
              <div className="flex flex-wrap gap-1.5">
                {pf.keywords.map((kw, i) => (
                  <span key={i} className="inline-flex items-center px-2.5 py-1 bg-amber-50 text-amber-700 rounded-md text-[11px] font-medium ring-1 ring-inset ring-amber-600/10">{kw}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Expand/collapse toggle */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-center gap-1.5 py-2 text-xs font-medium text-slate-400 hover:text-indigo-600 transition-colors mb-3"
      >
        <span>{expanded ? "접기" : "자세히 보기"}</span>
        <svg className={`w-3.5 h-3.5 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Action buttons */}
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
