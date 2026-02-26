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
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <main className="max-w-6xl mx-auto px-4 py-12 text-center">
          <p className="text-gray-500">로딩 중...</p>
          <p className="text-xs text-gray-400 mt-1">서버가 절전 모드일 경우 최초 요청 시 30~60초가 소요될 수 있습니다.</p>
        </main>
      </div>
    );
  }

  const published = jobs.filter((j) => j.status === "published").length;
  const closed = jobs.filter((j) => j.status === "closed").length;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <div className="flex items-center gap-3">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
              {company?.name || user.name}
            </h1>
            <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-xs font-medium rounded-full">
              기업
            </span>
          </div>
          <p className="text-sm text-gray-500 mt-1">채용 공고와 인재 매칭을 관리하세요.</p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm border border-red-200 mb-6">{error}</div>
        )}

        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-500">데이터를 불러오는 중...</p>
            <p className="text-xs text-gray-400 mt-1">서버 상태에 따라 최대 1분 정도 소요될 수 있습니다.</p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <StatCard label="전체 공고" value={jobs.length} />
              <StatCard label="게시 중" value={published} color="emerald" />
              <StatCard label="마감" value={closed} color="gray" />
              <StatCard label="인재풀" value="-" color="primary" />
            </div>

            {/* Quick Actions */}
            <div className="flex flex-wrap gap-3">
              <Link
                href="/company/jobs"
                className="px-5 py-2.5 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 transition"
              >
                공고 관리
              </Link>
              <Link
                href="/company/candidates"
                className="px-5 py-2.5 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 transition"
              >
                인재 매칭
              </Link>
            </div>

            {/* Recent Jobs */}
            <section>
              <h2 className="text-base sm:text-lg font-semibold text-gray-800 mb-4">최근 공고</h2>
              {jobs.length === 0 ? (
                <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-500">
                  등록된 공고가 없습니다.
                  <br />
                  <Link href="/company/jobs" className="text-primary-600 hover:underline mt-2 inline-block">
                    첫 공고를 등록해보세요
                  </Link>
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  {jobs.slice(0, 4).map((job) => (
                    <div key={job.id} className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-semibold text-gray-900 text-sm">{job.title}</h3>
                        <span
                          className={`shrink-0 text-xs px-2 py-0.5 rounded-full ${
                            job.status === "published"
                              ? "bg-emerald-50 text-emerald-700"
                              : job.status === "closed"
                              ? "bg-gray-100 text-gray-500"
                              : "bg-yellow-50 text-yellow-700"
                          }`}
                        >
                          {job.status === "published" ? "게시중" : job.status === "closed" ? "마감" : "초안"}
                        </span>
                      </div>
                      {job.location && <p className="text-xs text-gray-500">{job.location}</p>}
                      <div className="mt-3">
                        <Link
                          href={`/company/candidates?job_id=${job.id}`}
                          className="text-xs text-primary-600 hover:underline font-medium"
                        >
                          매칭 후보자 보기
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

function StatCard({ label, value, color = "gray" }: { label: string; value: number | string; color?: string }) {
  const colorMap: Record<string, string> = {
    gray: "bg-gray-50 text-gray-900",
    emerald: "bg-emerald-50 text-emerald-700",
    primary: "bg-primary-50 text-primary-700",
  };
  return (
    <div className={`rounded-xl p-4 ${colorMap[color] || colorMap.gray}`}>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs text-gray-500 mt-1">{label}</div>
    </div>
  );
}
