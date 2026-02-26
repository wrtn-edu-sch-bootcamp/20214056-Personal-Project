"use client";

import Link from "next/link";
import Navigation from "@/components/Navigation";
import { useAuth } from "@/lib/auth";

const FEATURES = [
  {
    title: "포트폴리오 분석",
    description:
      "PDF, 웹사이트, GitHub 등 다양한 형식의 포트폴리오를 AI가 자동으로 분석하고 구조화합니다.",
    icon: "📄",
    href: "/portfolio",
  },
  {
    title: "맞춤형 채용 추천",
    description:
      "분석된 포트폴리오와 채용공고를 벡터 유사도로 매칭하여 최적의 공고를 추천합니다.",
    icon: "🎯",
    href: "/jobs",
  },
  {
    title: "맞춤 이력서 생성",
    description:
      "추천된 기업의 인재상을 분석하여 맞춤형 이력서를 AI가 자동으로 작성합니다.",
    icon: "📝",
    href: "/resume",
  },
  {
    title: "면접 시뮬레이션",
    description:
      "추천된 채용공고에 맞춘 AI 면접관이 실전과 같은 면접 연습을 제공합니다.",
    icon: "💬",
    href: "/interview",
  },
];

export default function HomePage() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen">
      <Navigation />

      {/* Hero */}
      <section className="bg-gradient-to-br from-primary-600 to-primary-800 text-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-24 text-center">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight leading-tight">
            포트폴리오 기반
            <br />
            채용 추천 &amp; 면접 시뮬레이션
          </h1>
          <p className="mt-4 sm:mt-6 text-base sm:text-lg text-primary-100 max-w-2xl mx-auto px-2">
            포트폴리오를 업로드하면 AI가 분석하여 최적의 채용공고를 추천하고,
            맞춤형 이력서 생성과 면접 연습까지 제공합니다.
          </p>
          <div className="mt-8 sm:mt-10 flex flex-col sm:flex-row justify-center gap-3 sm:gap-4 px-4 sm:px-0">
            {user ? (
              <>
                <Link
                  href={user.role === "company" ? "/company/dashboard" : "/dashboard"}
                  className="px-8 py-3 bg-white text-primary-700 font-semibold rounded-lg shadow hover:bg-primary-50 transition text-center"
                >
                  대시보드
                </Link>
                <Link
                  href={user.role === "company" ? "/company/jobs" : "/portfolio"}
                  className="px-8 py-3 border-2 border-white/50 text-white font-semibold rounded-lg hover:bg-white/10 transition text-center"
                >
                  {user.role === "company" ? "공고 관리" : "포트폴리오 등록"}
                </Link>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="px-8 py-3 bg-white text-primary-700 font-semibold rounded-lg shadow hover:bg-primary-50 transition text-center"
                >
                  시작하기
                </Link>
                <Link
                  href="/login"
                  className="px-8 py-3 border-2 border-white/50 text-white font-semibold rounded-lg hover:bg-white/10 transition text-center"
                >
                  로그인
                </Link>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-14 sm:py-20">
        <h2 className="text-2xl sm:text-3xl font-bold text-center text-gray-900 mb-8 sm:mb-12">
          주요 기능
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-8">
          {FEATURES.map((f) => (
            <Link
              key={f.href}
              href={user ? f.href : "/login"}
              className="group block p-6 sm:p-8 bg-white rounded-2xl shadow-sm border border-gray-100 hover:shadow-md hover:border-primary-200 transition"
            >
              <div className="text-3xl sm:text-4xl mb-3 sm:mb-4">{f.icon}</div>
              <h3 className="text-lg sm:text-xl font-semibold text-gray-900 group-hover:text-primary-600 transition">
                {f.title}
              </h3>
              <p className="mt-2 sm:mt-3 text-sm sm:text-base text-gray-600 leading-relaxed">
                {f.description}
              </p>
            </Link>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="bg-gray-100 py-14 sm:py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <h2 className="text-2xl sm:text-3xl font-bold text-center text-gray-900 mb-8 sm:mb-12">
            이용 방법
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8">
            {[
              { step: "1", title: "회원가입/로그인", desc: "간편하게 계정을 만들고 로그인" },
              { step: "2", title: "포트폴리오 등록", desc: "PDF, URL, GitHub, 직접 입력" },
              { step: "3", title: "채용공고 추천", desc: "AI 기반 맞춤 채용공고 확인" },
              { step: "4", title: "이력서 & 면접", desc: "맞춤 이력서 생성 및 AI 면접" },
            ].map((item) => (
              <div key={item.step} className="text-center">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-primary-600 text-white text-lg sm:text-xl font-bold flex items-center justify-center mx-auto">
                  {item.step}
                </div>
                <h3 className="mt-3 sm:mt-4 text-sm sm:text-lg font-semibold text-gray-900">
                  {item.title}
                </h3>
                <p className="mt-1 sm:mt-2 text-xs sm:text-sm text-gray-600">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 py-6 sm:py-8">
        <p className="text-center text-xs sm:text-sm text-gray-500 px-4">
          &copy; 2026 JobFit AI. Portfolio-based Job Recommendation System.
        </p>
      </footer>
    </div>
  );
}
