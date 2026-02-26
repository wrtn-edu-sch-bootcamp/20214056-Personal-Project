"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import Navigation from "@/components/Navigation";

type Tab = "login" | "register";
type Role = "candidate" | "company";

export default function LoginPage() {
  const [tab, setTab] = useState<Tab>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<Role>("candidate");
  const [companyName, setCompanyName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const { login, register } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      let loggedInUser: { role: string };
      if (tab === "login") {
        loggedInUser = await login(email, password);
        if (loggedInUser.role !== role) {
          const label = loggedInUser.role === "company" ? "기업" : "구직자";
          const dest = loggedInUser.role === "company" ? "/company/dashboard" : "/dashboard";
          setError(`이 계정은 ${label} 계정입니다. ${label} 대시보드로 이동합니다.`);
          setTimeout(() => { router.push(dest); }, 1500);
          return;
        }
      } else {
        if (!name.trim()) {
          setError("이름을 입력하세요.");
          setLoading(false);
          return;
        }
        if (role === "company" && !companyName.trim()) {
          setError("회사명을 입력하세요.");
          setLoading(false);
          return;
        }
        loggedInUser = await register(email, password, name, role, role === "company" ? companyName : undefined);
      }
      router.push(loggedInUser.role === "company" ? "/company/dashboard" : "/dashboard");
    } catch (err: any) {
      setError(err.message || "오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const roleSelector = (
    <div>
      <label className="block text-sm font-semibold text-slate-700 mb-3">
        {tab === "login" ? "로그인 유형" : "가입 유형"}
      </label>
      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => setRole("candidate")}
          className={`relative p-4 rounded-xl border-2 text-center transition-all duration-200 ${
            role === "candidate"
              ? "border-indigo-500 bg-indigo-50/50 shadow-sm shadow-indigo-500/10"
              : "border-slate-200 hover:border-slate-300 bg-white"
          }`}
        >
          <div className={`w-10 h-10 rounded-xl mx-auto mb-2 flex items-center justify-center ${
            role === "candidate" ? "bg-indigo-100" : "bg-slate-100"
          }`}>
            <svg className={`w-5 h-5 ${role === "candidate" ? "text-indigo-600" : "text-slate-400"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <div className={`text-sm font-semibold ${role === "candidate" ? "text-indigo-700" : "text-slate-700"}`}>구직자</div>
          <div className="text-[11px] text-slate-400 mt-0.5 leading-tight">
            {tab === "login" ? "포트폴리오 · 채용 · 면접" : "포트폴리오 등록 및 채용 추천"}
          </div>
          {role === "candidate" && (
            <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-indigo-600 flex items-center justify-center">
              <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          )}
        </button>
        <button
          type="button"
          onClick={() => setRole("company")}
          className={`relative p-4 rounded-xl border-2 text-center transition-all duration-200 ${
            role === "company"
              ? "border-emerald-500 bg-emerald-50/50 shadow-sm shadow-emerald-500/10"
              : "border-slate-200 hover:border-slate-300 bg-white"
          }`}
        >
          <div className={`w-10 h-10 rounded-xl mx-auto mb-2 flex items-center justify-center ${
            role === "company" ? "bg-emerald-100" : "bg-slate-100"
          }`}>
            <svg className={`w-5 h-5 ${role === "company" ? "text-emerald-600" : "text-slate-400"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <div className={`text-sm font-semibold ${role === "company" ? "text-emerald-700" : "text-slate-700"}`}>기업</div>
          <div className="text-[11px] text-slate-400 mt-0.5 leading-tight">
            {tab === "login" ? "공고 관리 · 인재 매칭" : "공고 등록 및 인재 매칭"}
          </div>
          {role === "company" && (
            <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-emerald-600 flex items-center justify-center">
              <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          )}
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50">
      <Navigation />

      <main className="flex items-center justify-center px-4 sm:px-6 py-10 sm:py-16">
        <div className="w-full max-w-md">
          {/* Header text */}
          <div className="text-center mb-8">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-indigo-500/25">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-slate-900">
              {tab === "login" ? "다시 만나서 반갑습니다" : "새 계정 만들기"}
            </h1>
            <p className="text-sm text-slate-500 mt-2">
              {tab === "login"
                ? "계정에 로그인하여 서비스를 이용하세요."
                : "간편하게 가입하고 AI 채용 서비스를 시작하세요."}
            </p>
          </div>

          {/* Card */}
          <div className="card-premium overflow-hidden">
            {/* Tab header */}
            <div className="flex border-b border-slate-100">
              <button
                onClick={() => { setTab("login"); setError(null); }}
                className={`flex-1 py-3.5 text-sm font-semibold transition-all relative ${
                  tab === "login"
                    ? "text-indigo-700"
                    : "text-slate-400 hover:text-slate-600"
                }`}
              >
                로그인
                {tab === "login" && (
                  <span className="absolute bottom-0 left-1/4 right-1/4 h-0.5 bg-indigo-600 rounded-full" />
                )}
              </button>
              <button
                onClick={() => { setTab("register"); setError(null); }}
                className={`flex-1 py-3.5 text-sm font-semibold transition-all relative ${
                  tab === "register"
                    ? "text-indigo-700"
                    : "text-slate-400 hover:text-slate-600"
                }`}
              >
                회원가입
                {tab === "register" && (
                  <span className="absolute bottom-0 left-1/4 right-1/4 h-0.5 bg-indigo-600 rounded-full" />
                )}
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-6 sm:p-7 space-y-5">
              {roleSelector}

              {tab === "register" && (
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                    {role === "company" ? "담당자 이름" : "이름"}
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="input-field"
                    placeholder={role === "company" ? "김채용" : "홍길동"}
                    required
                  />
                </div>
              )}

              {tab === "register" && role === "company" && (
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">회사명</label>
                  <input
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="input-field"
                    placeholder="주식회사 테크스타트업"
                    required
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">이메일</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input-field"
                  placeholder="email@example.com"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">비밀번호</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-field"
                  placeholder="••••••••"
                  minLength={6}
                  required
                />
              </div>

              {error && (
                <div className="flex items-start gap-2 bg-red-50 text-red-700 px-4 py-3 rounded-xl text-sm border border-red-100">
                  <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className={`w-full py-3 text-white rounded-xl font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-sm ${
                  role === "company"
                    ? "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/25 hover:shadow-md hover:shadow-emerald-600/30"
                    : "bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/25 hover:shadow-md hover:shadow-indigo-600/30"
                }`}
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="spinner w-4 h-4" />
                    처리 중...
                  </span>
                ) : tab === "login"
                  ? role === "company" ? "기업 로그인" : "구직자 로그인"
                  : role === "company" ? "기업 회원가입" : "회원가입"}
              </button>

              {loading && (
                <p className="text-xs text-slate-400 text-center">
                  서버가 절전 모드일 경우 최초 요청 시 30~60초가 소요될 수 있습니다.
                </p>
              )}
            </form>
          </div>

          {/* Bottom link */}
          <p className="text-center text-xs text-slate-400 mt-6">
            {tab === "login" ? "계정이 없으신가요?" : "이미 계정이 있으신가요?"}{" "}
            <button
              onClick={() => { setTab(tab === "login" ? "register" : "login"); setError(null); }}
              className="text-indigo-600 font-medium hover:text-indigo-700"
            >
              {tab === "login" ? "회원가입" : "로그인"}
            </button>
          </p>
        </div>
      </main>
    </div>
  );
}
