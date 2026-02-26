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

  // Form state
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
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">채용 공고 관리</h1>
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-5 py-2.5 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 transition"
          >
            {showForm ? "취소" : "+ 새 공고 등록"}
          </button>
        </div>

        {error && (
          <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm border border-red-200 mb-6">{error}</div>
        )}

        {/* Create form */}
        {showForm && (
          <form onSubmit={handleCreate} className="bg-white rounded-xl border border-gray-200 p-6 mb-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">공고 제목 *</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="예: 백엔드 개발자 (Python/FastAPI)"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">공고 설명</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-y"
                placeholder="담당 업무, 근무 조건 등을 자유롭게 작성하세요."
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">자격 요건 (줄바꿈 구분)</label>
                <textarea
                  value={requirementsText}
                  onChange={(e) => setRequirementsText(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-y"
                  placeholder={"Python 3년 이상\nREST API 경험\nRDBMS 실무"}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">우대 사항 (줄바꿈 구분)</label>
                <textarea
                  value={preferredText}
                  onChange={(e) => setPreferredText(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-y"
                  placeholder={"FastAPI\nDocker\nAWS"}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">근무 지역</label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="서울 강남구"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">급여</label>
                <input
                  type="text"
                  value={salary}
                  onChange={(e) => setSalary(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="5,000만~7,000만 원"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 bg-primary-600 text-white font-semibold rounded-lg hover:bg-primary-700 disabled:opacity-50 transition"
            >
              {submitting ? "등록 중..." : "공고 등록"}
            </button>
          </form>
        )}

        {/* Jobs list */}
        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-500">불러오는 중...</p>
            <p className="text-xs text-gray-400 mt-1">서버 상태에 따라 최대 1분 정도 소요될 수 있습니다.</p>
          </div>
        ) : jobs.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-500">
            등록된 공고가 없습니다.
          </div>
        ) : (
          <div className="space-y-4">
            {jobs.map((job) => (
              <div key={job.id} className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="font-semibold text-gray-900">{job.title}</h3>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {job.location || "미지정"}
                      {job.salary && ` · ${job.salary}`}
                    </p>
                  </div>
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

                {job.description && (
                  <p className="text-sm text-gray-600 line-clamp-2 mb-3">{job.description}</p>
                )}

                {(job.requirements.length > 0 || job.preferred.length > 0) && (
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {job.requirements.map((r, i) => (
                      <span key={i} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">{r}</span>
                    ))}
                    {job.preferred.map((p, i) => (
                      <span key={`p-${i}`} className="text-xs bg-primary-50 text-primary-600 px-2 py-0.5 rounded">{p}</span>
                    ))}
                  </div>
                )}

                <div className="flex flex-wrap gap-2 pt-3 border-t border-gray-100">
                  <Link
                    href={`/company/candidates?job_id=${job.id}`}
                    className="text-xs px-3 py-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
                  >
                    매칭 후보자
                  </Link>
                  {job.status === "published" ? (
                    <button
                      onClick={() => handleStatusChange(job.id, "closed")}
                      className="text-xs px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                      마감
                    </button>
                  ) : (
                    <button
                      onClick={() => handleStatusChange(job.id, "published")}
                      className="text-xs px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-lg hover:bg-emerald-100 transition-colors"
                    >
                      게시
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(job.id)}
                    className="text-xs px-3 py-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors ml-auto"
                  >
                    삭제
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
