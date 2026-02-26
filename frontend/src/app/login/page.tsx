"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
      let loggedInUser;
      if (tab === "login") {
        loggedInUser = await login(email, password);
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

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <main className="max-w-md mx-auto px-4 sm:px-6 py-10 sm:py-16">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          {/* Tab header */}
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => { setTab("login"); setError(null); }}
              className={`flex-1 py-4 text-sm font-semibold transition-colors ${
                tab === "login"
                  ? "text-primary-700 border-b-2 border-primary-600 bg-primary-50/50"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              로그인
            </button>
            <button
              onClick={() => { setTab("register"); setError(null); }}
              className={`flex-1 py-4 text-sm font-semibold transition-colors ${
                tab === "register"
                  ? "text-primary-700 border-b-2 border-primary-600 bg-primary-50/50"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              회원가입
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            {/* Role selection — register only */}
            {tab === "register" && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">가입 유형</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setRole("candidate")}
                    className={`p-3 rounded-lg border-2 text-center transition ${
                      role === "candidate"
                        ? "border-primary-500 bg-primary-50 text-primary-700"
                        : "border-gray-200 text-gray-600 hover:border-gray-300"
                    }`}
                  >
                    <div className="text-lg mb-1">👤</div>
                    <div className="text-sm font-semibold">구직자</div>
                    <div className="text-xs text-gray-500 mt-0.5">포트폴리오 등록 및 채용 추천</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setRole("company")}
                    className={`p-3 rounded-lg border-2 text-center transition ${
                      role === "company"
                        ? "border-primary-500 bg-primary-50 text-primary-700"
                        : "border-gray-200 text-gray-600 hover:border-gray-300"
                    }`}
                  >
                    <div className="text-lg mb-1">🏢</div>
                    <div className="text-sm font-semibold">기업</div>
                    <div className="text-xs text-gray-500 mt-0.5">공고 등록 및 인재 매칭</div>
                  </button>
                </div>
              </div>
            )}

            {tab === "register" && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  {role === "company" ? "담당자 이름" : "이름"}
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                  placeholder={role === "company" ? "김채용" : "홍길동"}
                  required
                />
              </div>
            )}

            {/* Company name — company role only */}
            {tab === "register" && role === "company" && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">회사명</label>
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                  placeholder="주식회사 테크스타트업"
                  required
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">이메일</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                placeholder="email@example.com"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">비밀번호</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                placeholder="••••••••"
                minLength={6}
                required
              />
            </div>

            {error && (
              <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm border border-red-200">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading
                ? "처리 중..."
                : tab === "login"
                ? "로그인"
                : role === "company"
                ? "기업 회원가입"
                : "회원가입"}
            </button>
            {loading && (
              <p className="text-xs text-gray-400 text-center mt-2">
                서버가 절전 모드일 경우 최초 요청 시 30~60초가 소요될 수 있습니다.
              </p>
            )}
          </form>
        </div>
      </main>
    </div>
  );
}
