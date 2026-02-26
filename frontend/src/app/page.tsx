"use client";

import Link from "next/link";
import Navigation from "@/components/Navigation";

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
    title: "면접 시뮬레이션",
    description:
      "추천된 채용공고에 맞춘 AI 면접관이 실전과 같은 면접 연습을 제공합니다.",
    icon: "💬",
    href: "/interview",
  },
];

export default function HomePage() {
  return (
    <div className="min-h-screen">
      <Navigation />

      {/* Hero */}
      <section className="bg-gradient-to-br from-primary-600 to-primary-800 text-white">
        <div className="max-w-6xl mx-auto px-4 py-24 text-center">
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight">
            포트폴리오 기반
            <br />
            채용 추천 &amp; 면접 시뮬레이션
          </h1>
          <p className="mt-6 text-lg text-primary-100 max-w-2xl mx-auto">
            포트폴리오를 업로드하면 AI가 분석하여 최적의 채용공고를 추천하고,
            맞춤형 면접 연습까지 제공합니다.
          </p>
          <div className="mt-10 flex justify-center gap-4">
            <Link
              href="/portfolio"
              className="px-8 py-3 bg-white text-primary-700 font-semibold rounded-lg shadow hover:bg-primary-50 transition"
            >
              시작하기
            </Link>
            <Link
              href="/jobs"
              className="px-8 py-3 border-2 border-white/50 text-white font-semibold rounded-lg hover:bg-white/10 transition"
            >
              채용공고 보기
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-4 py-20">
        <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
          주요 기능
        </h2>
        <div className="grid md:grid-cols-3 gap-8">
          {FEATURES.map((f) => (
            <Link
              key={f.href}
              href={f.href}
              className="group block p-8 bg-white rounded-2xl shadow-sm border border-gray-100 hover:shadow-md hover:border-primary-200 transition"
            >
              <div className="text-4xl mb-4">{f.icon}</div>
              <h3 className="text-xl font-semibold text-gray-900 group-hover:text-primary-600 transition">
                {f.title}
              </h3>
              <p className="mt-3 text-gray-600 leading-relaxed">
                {f.description}
              </p>
            </Link>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="bg-gray-100 py-20">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            이용 방법
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { step: "1", title: "포트폴리오 등록", desc: "PDF, URL, GitHub, 직접 입력 중 편한 방식으로 등록" },
              { step: "2", title: "채용공고 추천 확인", desc: "AI가 분석한 결과 기반으로 맞춤 채용공고 확인" },
              { step: "3", title: "면접 연습 시작", desc: "원하는 채용공고를 선택하고 AI 면접관과 연습" },
            ].map((item) => (
              <div key={item.step} className="text-center">
                <div className="w-12 h-12 rounded-full bg-primary-600 text-white text-xl font-bold flex items-center justify-center mx-auto">
                  {item.step}
                </div>
                <h3 className="mt-4 text-lg font-semibold text-gray-900">
                  {item.title}
                </h3>
                <p className="mt-2 text-gray-600">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 py-8">
        <p className="text-center text-sm text-gray-500">
          &copy; 2026 JobFit AI. Portfolio-based Job Recommendation System.
        </p>
      </footer>
    </div>
  );
}
