"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Navigation from "@/components/Navigation";
import { useAuth } from "@/lib/auth";
import {
  getMyCompany,
  listCompanyJobs,
  type CompanyProfile,
  type CompanyJobPosting,
} from "@/lib/api";

export default function CompanyDashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [company, setCompany] = useState<CompanyProfile | null>(null);
  const [jobs, setJobs] = useState<CompanyJobPosting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && (!user || user.role !== "company")) {
      router.push("/login");
    }
  }, [authLoading, user, router]);

  useEffect(() => {
    if (!user || user.role !== "company") return;
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const [c, j] = await Promise.all([getMyCompany(), listCompanyJobs()]);
        if (cancelled) return;
        setCompany(c);
        setJobs(j);
      } catch (err: any) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [user]);

  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Navigation />
        <main className="page-container py-20 text-center">
          <div className="spinner w-8 h-8 text-emerald-600 mx-auto" />
          <p className="text-slate-500 mt-4">로딩 중...</p>
          <p className="text-xs text-slate-400 mt-1">서버가 절전 모드일 경우 최초 요청 시 30~60초가 소요될 수 있습니다.</p>
        </main>
      </div>
    );
  }

  const published = jobs.filter((j) => j.status === "published").length;
  const closed = jobs.filter((j) => j.status === "closed").length;

  return (
    <div className="min-h-screen bg-slate-50">
      <Navigation />
      <main className="page-container py-8 sm:py-10">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white font-bold text-sm shadow-sm shadow-emerald-500/25">
              {(company?.name || user.name).charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
                  {company?.name || user.name}
                </h1>
                <span className="badge-success">기업</span>
              </div>
              <p className="text-sm text-slate-500">채용 공고와 인재 매칭을 관리하세요.</p>
            </div>
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
            <div className="spinner w-8 h-8 text-emerald-600 mx-auto" />
            <p className="text-slate-500 mt-4">데이터를 불러오는 중...</p>
            <p className="text-xs text-slate-400 mt-1">서버 상태에 따라 최대 1분 정도 소요될 수 있습니다.</p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <StatCard label="전체 공고" value={jobs.length} icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              } />
              <StatCard label="게시 중" value={published} color="emerald" icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 13l4 4L19 7" />
                </svg>
              } />
              <StatCard label="마감" value={closed} color="slate" icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              } />
              <StatCard label="인재풀" value="-" color="indigo" icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              } />
            </div>

            {/* Quick Actions */}
            <div className="flex flex-wrap gap-3">
              <Link href="/company/jobs" className="btn-primary">
                <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                공고 관리
              </Link>
              <Link href="/company/candidates" className="inline-flex items-center justify-center px-5 py-2.5 bg-emerald-600 text-white font-semibold text-sm rounded-xl shadow-sm shadow-emerald-600/25 hover:bg-emerald-700 transition-all duration-200">
                <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                인재 매칭
              </Link>
              <Link href="/company/talents" className="btn-secondary">
                인재 탐색
              </Link>
            </div>

            {/* Recent Jobs */}
            <section>
              <h2 className="text-lg font-bold text-slate-900 mb-5 flex items-center gap-2">
                <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                </svg>
                최근 공고
              </h2>
              {jobs.length === 0 ? (
                <div className="card-premium p-10 text-center">
                  <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
                    <svg className="w-7 h-7 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <p className="text-slate-500 text-sm mb-3">등록된 공고가 없습니다.</p>
                  <Link href="/company/jobs" className="text-sm text-emerald-600 font-medium hover:text-emerald-700">
                    첫 공고를 등록해보세요 →
                  </Link>
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  {jobs.slice(0, 4).map((job) => (
                    <div key={job.id} className="card-premium p-5 sm:p-6">
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-bold text-slate-900 text-sm">{job.title}</h3>
                        <span className={
                          job.status === "published" ? "badge-success" :
                          job.status === "closed" ? "badge-neutral" : "badge-warning"
                        }>
                          {job.status === "published" ? "게시중" : job.status === "closed" ? "마감" : "초안"}
                        </span>
                      </div>
                      {job.location && <p className="text-xs text-slate-500">{job.location}</p>}
                      <div className="mt-3 pt-3 border-t border-slate-100">
                        <Link
                          href={`/company/candidates?job_id=${job.id}`}
                          className="text-xs text-emerald-600 hover:text-emerald-700 font-semibold"
                        >
                          매칭 후보자 보기 →
                        </Link>
                      </div>
                    </div>
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

function StatCard({ label, value, color = "slate", icon }: { label: string; value: number | string; color?: string; icon: React.ReactNode }) {
  const colorMap: Record<string, { bg: string; text: string; icon: string }> = {
    slate: { bg: "bg-slate-50", text: "text-slate-900", icon: "text-slate-400" },
    emerald: { bg: "bg-emerald-50", text: "text-emerald-700", icon: "text-emerald-500" },
    indigo: { bg: "bg-indigo-50", text: "text-indigo-700", icon: "text-indigo-500" },
  };
  const c = colorMap[color] || colorMap.slate;

  return (
    <div className={`card-premium p-5 ${c.bg}`}>
      <div className={`${c.icon} mb-2`}>{icon}</div>
      <div className={`text-2xl font-bold ${c.text}`}>{value}</div>
      <div className="text-xs text-slate-500 mt-1 font-medium">{label}</div>
    </div>
  );
}
