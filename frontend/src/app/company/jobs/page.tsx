"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Navigation from "@/components/Navigation";
import { useAuth } from "@/lib/auth";
import {
  listCompanyJobs,
  createCompanyJob,
  deleteCompanyJob,
  changeJobStatus,
  type CompanyJobPosting,
} from "@/lib/api";

export default function CompanyJobsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [jobs, setJobs] = useState<CompanyJobPosting[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [requirementsText, setRequirementsText] = useState("");
  const [preferredText, setPreferredText] = useState("");
  const [location, setLocation] = useState("");
  const [salary, setSalary] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!authLoading && (!user || user.role !== "company")) {
      router.push("/login");
    }
  }, [authLoading, user, router]);

  useEffect(() => {
    if (!user || user.role !== "company") return;
    loadJobs();
  }, [user]);

  const loadJobs = async () => {
    setLoading(true);
    try {
      const data = await listCompanyJobs();
      setJobs(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const newJob = await createCompanyJob({
        title: title.trim(),
        description: description.trim() || undefined,
        requirements: requirementsText.split("\n").map((s) => s.trim()).filter(Boolean),
        preferred: preferredText.split("\n").map((s) => s.trim()).filter(Boolean),
        location: location.trim() || undefined,
        salary: salary.trim() || undefined,
      });
      setJobs((prev) => [newJob, ...prev]);
      setShowForm(false);
      setTitle(""); setDescription(""); setRequirementsText(""); setPreferredText(""); setLocation(""); setSalary("");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("이 공고를 삭제하시겠습니까?")) return;
    try {
      await deleteCompanyJob(id);
      setJobs((prev) => prev.filter((j) => j.id !== id));
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleStatusChange = async (id: string, status: string) => {
    try {
      const updated = await changeJobStatus(id, status);
      setJobs((prev) => prev.map((j) => (j.id === id ? updated : j)));
    } catch (err: any) {
      alert(err.message);
    }
  };

  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Navigation />
        <main className="page-container py-20 text-center">
          <div className="spinner w-8 h-8 text-emerald-600 mx-auto" />
          <p className="text-slate-500 mt-4">로딩 중...</p>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Navigation />
      <main className="page-container py-8 sm:py-10">
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-8">
            <h1 className="section-title text-xl sm:text-2xl">채용 공고 관리</h1>
            <button
              onClick={() => setShowForm(!showForm)}
              className={showForm ? "btn-secondary" : "btn-primary"}
            >
              {showForm ? "취소" : "+ 새 공고 등록"}
            </button>
          </div>

          {error && (
            <div className="flex items-start gap-2 bg-red-50 text-red-700 px-4 py-3 rounded-xl text-sm border border-red-100 mb-6">
              <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {error}
            </div>
          )}

          {/* Create form */}
          {showForm && (
            <form onSubmit={handleCreate} className="card-premium p-6 sm:p-8 mb-6 space-y-5 animate-fade-in-down">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">공고 제목 *</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="input-field"
                  placeholder="예: 백엔드 개발자 (Python/FastAPI)"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">공고 설명</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  className="input-field resize-y"
                  placeholder="담당 업무, 근무 조건 등을 자유롭게 작성하세요."
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">자격 요건 (줄바꿈 구분)</label>
                  <textarea
                    value={requirementsText}
                    onChange={(e) => setRequirementsText(e.target.value)}
                    rows={3}
                    className="input-field resize-y"
                    placeholder={"Python 3년 이상\nREST API 경험\nRDBMS 실무"}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">우대 사항 (줄바꿈 구분)</label>
                  <textarea
                    value={preferredText}
                    onChange={(e) => setPreferredText(e.target.value)}
                    rows={3}
                    className="input-field resize-y"
                    placeholder={"FastAPI\nDocker\nAWS"}
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">근무 지역</label>
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="input-field"
                    placeholder="서울 강남구"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">급여</label>
                  <input
                    type="text"
                    value={salary}
                    onChange={(e) => setSalary(e.target.value)}
                    className="input-field"
                    placeholder="5,000만~7,000만 원"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3.5 btn-primary text-sm"
              >
                {submitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="spinner w-4 h-4" />
                    등록 중...
                  </span>
                ) : "공고 등록"}
              </button>
            </form>
          )}

          {/* Jobs list */}
          {loading ? (
            <div className="text-center py-16">
              <div className="spinner w-8 h-8 text-emerald-600 mx-auto" />
              <p className="text-slate-500 mt-4">불러오는 중...</p>
            </div>
          ) : jobs.length === 0 ? (
            <div className="card-premium p-10 text-center">
              <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
                <svg className="w-7 h-7 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <p className="text-slate-500 text-sm">등록된 공고가 없습니다.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {jobs.map((job) => (
                <div key={job.id} className="card-premium p-5 sm:p-6">
                  <div className="flex items-start justify-between mb-2">
                    <div className="min-w-0 flex-1">
                      <h3 className="font-bold text-slate-900">{job.title}</h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {job.location || "미지정"}
                        {job.salary && <span className="text-slate-300 mx-1.5">·</span>}
                        {job.salary}
                      </p>
                    </div>
                    <span className={
                      job.status === "published" ? "badge-success" :
                      job.status === "closed" ? "badge-neutral" : "badge-warning"
                    }>
                      {job.status === "published" ? "게시중" : job.status === "closed" ? "마감" : "초안"}
                    </span>
                  </div>

                  {job.description && (
                    <p className="text-sm text-slate-600 line-clamp-2 mb-3 leading-relaxed">{job.description}</p>
                  )}

                  {(job.requirements.length > 0 || job.preferred.length > 0) && (
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {job.requirements.map((r, i) => (
                        <span key={i} className="badge-neutral text-[11px]">{r}</span>
                      ))}
                      {job.preferred.map((p, i) => (
                        <span key={`p-${i}`} className="badge-primary text-[11px]">{p}</span>
                      ))}
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2 pt-3 border-t border-slate-100">
                    <Link
                      href={`/company/candidates?job_id=${job.id}`}
                      className="inline-flex items-center justify-center px-3 py-1.5 bg-emerald-600 text-white font-semibold text-xs rounded-xl shadow-sm shadow-emerald-600/25 hover:bg-emerald-700 transition-all duration-200"
                    >
                      매칭 후보자
                    </Link>
                    {job.status === "published" ? (
                      <button
                        onClick={() => handleStatusChange(job.id, "closed")}
                        className="btn-ghost text-xs text-slate-500"
                      >
                        마감
                      </button>
                    ) : (
                      <button
                        onClick={() => handleStatusChange(job.id, "published")}
                        className="btn-ghost text-xs text-emerald-600"
                      >
                        게시
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(job.id)}
                      className="text-xs px-3 py-1.5 text-red-500 hover:bg-red-50 rounded-xl transition-all ml-auto font-medium"
                    >
                      삭제
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
