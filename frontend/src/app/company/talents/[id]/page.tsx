"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Navigation from "@/components/Navigation";
import AuthGuard from "@/components/AuthGuard";
import { getPublicPortfolio, type PortfolioResponse } from "@/lib/api";

export default function TalentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const portfolioId = params.id as string;

  const [data, setData] = useState<PortfolioResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const res = await getPublicPortfolio(portfolioId);
        setData(res);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "포트폴리오를 불러올 수 없습니다.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [portfolioId]);

  const pf = data?.portfolio;

  return (
    <AuthGuard>
      <div className="min-h-screen bg-slate-50">
        <Navigation />
        <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
          {/* Back button */}
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 mb-6 transition-colors font-medium"
          >
            <div className="w-7 h-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center hover:border-slate-300 transition-all">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </div>
            인재 목록으로
          </button>

          {/* Loading */}
          {loading && (
            <div className="text-center py-16">
              <div className="spinner w-8 h-8 text-emerald-600 mx-auto" />
              <p className="mt-4 text-sm text-slate-500">불러오는 중...</p>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="flex items-start gap-2 bg-red-50 text-red-700 px-4 py-3 rounded-xl text-sm border border-red-100">
              <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {error}
            </div>
          )}

          {/* Portfolio content */}
          {!loading && !error && pf && (
            <div className="space-y-5 animate-fade-in-up">
              {/* Header */}
              <div className="card-premium p-6 sm:p-8">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white font-bold text-lg shadow-sm shadow-emerald-500/25">
                    {(pf.name || "?").charAt(0)}
                  </div>
                  <div>
                    <h1 className="text-xl font-bold text-slate-900">{pf.name || "이름 미공개"}</h1>
                  </div>
                </div>
                {pf.summary && (
                  <p className="text-sm text-slate-600 leading-relaxed">{pf.summary}</p>
                )}

                {pf.contact && (
                  <div className="flex flex-wrap gap-3 mt-4 pt-4 border-t border-slate-100 text-xs text-slate-500">
                    {pf.contact.email && (
                      <span className="flex items-center gap-1">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                        {pf.contact.email}
                      </span>
                    )}
                    {pf.contact.phone && (
                      <span className="flex items-center gap-1">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                        </svg>
                        {pf.contact.phone}
                      </span>
                    )}
                    {pf.contact.linkedin && (
                      <a href={pf.contact.linkedin} target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline font-medium">LinkedIn</a>
                    )}
                    {pf.contact.website && (
                      <a href={pf.contact.website} target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline font-medium">Website</a>
                    )}
                  </div>
                )}
              </div>

              {/* Skills */}
              {pf.skills && pf.skills.length > 0 && (
                <div className="card-premium p-6">
                  <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">기술 스택</h2>
                  <div className="flex flex-wrap gap-2">
                    {pf.skills.map((s) => (
                      <span key={s.name} className="inline-flex items-center px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-lg text-sm font-medium ring-1 ring-inset ring-emerald-600/10">
                        {s.name}
                        {s.proficiency && <span className="ml-1.5 text-xs text-emerald-500">({s.proficiency})</span>}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Experiences */}
              {pf.experiences && pf.experiences.length > 0 && (
                <div className="card-premium p-6">
                  <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">경력</h2>
                  <div className="space-y-4">
                    {pf.experiences.map((exp, i) => (
                      <div key={i} className="border-l-2 border-emerald-200 pl-4">
                        <div className="flex items-baseline justify-between">
                          <h3 className="font-semibold text-slate-900">{exp.company} — {exp.role}</h3>
                          {exp.period && <span className="text-xs text-slate-400 shrink-0 ml-2">{exp.period}</span>}
                        </div>
                        {exp.description && <p className="text-sm text-slate-600 mt-1 leading-relaxed">{exp.description}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Projects */}
              {pf.projects && pf.projects.length > 0 && (
                <div className="card-premium p-6">
                  <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">프로젝트</h2>
                  <div className="space-y-4">
                    {pf.projects.map((proj, i) => (
                      <div key={i} className="border-l-2 border-indigo-200 pl-4">
                        <h3 className="font-semibold text-slate-900">{proj.name}</h3>
                        {proj.description && <p className="text-sm text-slate-600 mt-1 leading-relaxed">{proj.description}</p>}
                        {proj.tech_stack.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {proj.tech_stack.map((t) => (
                              <span key={t} className="badge-neutral text-[11px]">{t}</span>
                            ))}
                          </div>
                        )}
                        {proj.highlights && proj.highlights.length > 0 && (
                          <ul className="mt-2 space-y-1">
                            {proj.highlights.map((h, j) => (
                              <li key={j} className="text-sm text-slate-600 flex items-start gap-1.5">
                                <span className="text-indigo-500 mt-1 text-xs">●</span>{h}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Education */}
              {pf.education && pf.education.length > 0 && (
                <div className="card-premium p-6">
                  <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">학력</h2>
                  <div className="space-y-2">
                    {pf.education.map((edu, i) => (
                      <div key={i} className="flex items-baseline justify-between">
                        <div>
                          <span className="font-semibold text-slate-900">{edu.institution}</span>
                          {edu.major && <span className="text-sm text-slate-500 ml-2">{edu.major}</span>}
                          {edu.degree && <span className="text-sm text-slate-400 ml-1">({edu.degree})</span>}
                        </div>
                        {edu.period && <span className="text-xs text-slate-400">{edu.period}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Certifications */}
              {pf.certifications && pf.certifications.length > 0 && (
                <div className="card-premium p-6">
                  <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">자격증</h2>
                  <div className="flex flex-wrap gap-2">
                    {pf.certifications.map((cert) => (
                      <span key={cert} className="badge-warning">{cert}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Keywords */}
              {pf.keywords && pf.keywords.length > 0 && (
                <div className="card-premium p-6">
                  <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">매칭 키워드</h2>
                  <div className="flex flex-wrap gap-2">
                    {pf.keywords.map((kw) => (
                      <span key={kw} className="badge-neutral">{kw}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Bottom link */}
          <div className="mt-10 text-center">
            <Link
              href="/company/talents"
              className="text-sm text-emerald-600 hover:text-emerald-700 font-medium"
            >
              ← 인재 목록으로 돌아가기
            </Link>
          </div>
        </main>
      </div>
    </AuthGuard>
  );
}
