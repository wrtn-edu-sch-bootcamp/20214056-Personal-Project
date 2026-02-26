"use client";

import Link from "next/link";
import Navigation from "@/components/Navigation";
import { useAuth } from "@/lib/auth";

/* ── Candidate feature cards ── */
const CANDIDATE_FEATURES = [
  {
    title: "포트폴리오 분석",
    description:
      "PDF, 웹사이트, GitHub 등 다양한 형식의 포트폴리오를 AI가 자동으로 분석하고 구조화합니다.",
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
    href: "/portfolio",
    bgColor: "bg-blue-50",
    textColor: "text-blue-600",
  },
  {
    title: "맞춤형 채용 추천",
    description:
      "분석된 포트폴리오와 채용공고를 벡터 유사도로 매칭하여 최적의 공고를 추천합니다.",
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
    href: "/jobs",
    bgColor: "bg-emerald-50",
    textColor: "text-emerald-600",
  },
  {
    title: "맞춤 이력서 생성",
    description:
      "추천된 기업의 인재상을 분석하여 맞춤형 이력서를 AI가 자동으로 작성합니다.",
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
      </svg>
    ),
    href: "/resume",
    bgColor: "bg-amber-50",
    textColor: "text-amber-600",
  },
  {
    title: "면접 시뮬레이션",
    description:
      "추천된 채용공고에 맞춘 AI 면접관이 실전과 같은 면접 연습을 제공합니다.",
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
      </svg>
    ),
    href: "/interview",
    bgColor: "bg-purple-50",
    textColor: "text-purple-600",
  },
];

/* ── Company feature cards ── */
const COMPANY_FEATURES = [
  {
    title: "채용공고 관리",
    description:
      "채용공고를 등록·관리하고, AI가 구직자 포트폴리오와 자동 매칭합니다.",
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
      </svg>
    ),
    href: "/company/jobs",
    bgColor: "bg-emerald-50",
    textColor: "text-emerald-600",
  },
  {
    title: "AI 인재 매칭",
    description:
      "등록된 채용공고에 최적의 후보자를 벡터 유사도 기반으로 자동 매칭합니다.",
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
    href: "/company/candidates",
    bgColor: "bg-blue-50",
    textColor: "text-blue-600",
  },
  {
    title: "인재 탐색",
    description:
      "공개된 포트폴리오를 검색하여 우수 인재를 직접 발굴하고 상세 프로필을 확인합니다.",
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
    ),
    href: "/company/talents",
    bgColor: "bg-amber-50",
    textColor: "text-amber-600",
  },
  {
    title: "채용 대시보드",
    description:
      "채용 현황, 후보자 통계, 공고 성과를 한눈에 파악할 수 있는 종합 대시보드입니다.",
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
    href: "/company/dashboard",
    bgColor: "bg-purple-50",
    textColor: "text-purple-600",
  },
];

/* ── Candidate process steps ── */
const CANDIDATE_STEPS = [
  {
    step: "01",
    title: "회원가입",
    desc: "간편하게 계정을 생성하고 시작하세요",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    ),
  },
  {
    step: "02",
    title: "포트폴리오 등록",
    desc: "PDF, URL, GitHub, 직접 입력 중 선택",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
      </svg>
    ),
  },
  {
    step: "03",
    title: "AI 분석 & 추천",
    desc: "포트폴리오를 분석하여 최적 공고 매칭",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
      </svg>
    ),
  },
  {
    step: "04",
    title: "이력서 & 면접",
    desc: "맞춤 이력서 생성 및 AI 면접 연습",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
];

/* ── Company process steps ── */
const COMPANY_STEPS = [
  {
    step: "01",
    title: "기업 계정 생성",
    desc: "기업 정보를 등록하고 시작하세요",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
      </svg>
    ),
  },
  {
    step: "02",
    title: "채용공고 등록",
    desc: "직무, 기술 스택, 요구사항을 입력",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
      </svg>
    ),
  },
  {
    step: "03",
    title: "AI 인재 매칭",
    desc: "적합한 후보자를 자동으로 추천",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
      </svg>
    ),
  },
  {
    step: "04",
    title: "인재 확보",
    desc: "상세 프로필 확인 및 채용 진행",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
];

export default function HomePage() {
  const { user } = useAuth();
  const isCompany = user?.role === "company";

  const features = isCompany ? COMPANY_FEATURES : CANDIDATE_FEATURES;
  const steps = isCompany ? COMPANY_STEPS : CANDIDATE_STEPS;

  return (
    <div className="min-h-screen bg-slate-50">
      <Navigation />

      {/* Company mode indicator bar */}
      {isCompany && (
        <div className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white">
          <div className="page-container flex items-center justify-between py-2 px-4">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              <span className="text-sm font-semibold">기업 관리자 모드</span>
              <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">{user?.name}</span>
            </div>
            <Link href="/company/dashboard" className="text-xs font-medium hover:underline underline-offset-2">
              대시보드 →
            </Link>
          </div>
        </div>
      )}

      {/* Hero Section */}
      <section className={`relative overflow-hidden ${isCompany ? "bg-slate-900" : "bg-slate-50"}`}>
        {/* Background decoration */}
        <div className="absolute inset-0 bg-grid-pattern opacity-30" />
        {isCompany ? (
          <>
            <div className="absolute top-[-10%] left-[5%] w-[500px] h-[500px] bg-emerald-500/20 rounded-full blur-[120px]" />
            <div className="absolute bottom-[10%] right-[5%] w-[450px] h-[450px] bg-teal-500/15 rounded-full blur-[120px]" />
            <div className="absolute top-[20%] right-[25%] w-[300px] h-[300px] bg-cyan-400/10 rounded-full blur-[100px]" />
          </>
        ) : (
          <>
            <div className="absolute top-[-10%] left-[5%] w-[500px] h-[500px] bg-indigo-200/50 rounded-full blur-[120px]" />
            <div className="absolute bottom-[10%] right-[5%] w-[450px] h-[450px] bg-purple-200/40 rounded-full blur-[120px]" />
            <div className="absolute top-[20%] right-[25%] w-[300px] h-[300px] bg-pink-100/40 rounded-full blur-[100px]" />
          </>
        )}

        <div className="relative page-container py-20 sm:py-28 lg:py-36 text-center">
          <div className="animate-fade-in-up">
            {/* Badge */}
            {isCompany ? (
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-400/30 shadow-sm backdrop-blur-sm mb-8">
                <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                <span className="text-sm text-emerald-400 font-medium">기업용 AI 채용 관리 플랫폼</span>
              </div>
            ) : (
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/80 border border-indigo-100 shadow-sm backdrop-blur-sm mb-8">
                <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                <span className="text-sm text-indigo-600 font-medium">AI 기반 채용 매칭 플랫폼</span>
              </div>
            )}

            <h1 className={`text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.1] ${isCompany ? "text-white" : "text-slate-900"}`}>
              {isCompany ? (
                <>
                  AI로 찾는
                  <br />
                  <span className="bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400">
                    최적의 인재
                  </span>
                </>
              ) : (
                <>
                  포트폴리오 한 번으로
                  <br />
                  <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500">
                    채용의 모든 것을
                  </span>
                </>
              )}
            </h1>

            <p className={`mt-6 sm:mt-8 text-lg sm:text-xl max-w-2xl mx-auto leading-relaxed px-4 ${isCompany ? "text-slate-400" : "text-slate-500"}`}>
              {isCompany
                ? "채용공고를 등록하면 AI가 포트폴리오를 분석하여 최적의 후보자를 자동 매칭합니다."
                : "포트폴리오를 업로드하면 AI가 분석하여 최적의 채용공고를 추천하고, 맞춤형 이력서 생성과 면접 연습까지 제공합니다."
              }
            </p>

            <div className="mt-10 sm:mt-12 flex flex-col sm:flex-row justify-center gap-3 sm:gap-4 px-4 sm:px-0">
              {user ? (
                isCompany ? (
                  <>
                    <Link
                      href="/company/dashboard"
                      className="px-8 py-3.5 bg-emerald-500 text-white font-semibold rounded-xl shadow-lg shadow-emerald-500/25 hover:bg-emerald-600 hover:shadow-xl hover:shadow-emerald-500/30 hover:-translate-y-0.5 transition-all duration-200 text-center"
                    >
                      채용 대시보드
                    </Link>
                    <Link
                      href="/company/jobs"
                      className="px-8 py-3.5 bg-white/10 text-white font-semibold rounded-xl border border-white/20 backdrop-blur-sm hover:bg-white/20 hover:-translate-y-0.5 transition-all duration-200 text-center"
                    >
                      공고 관리
                    </Link>
                    <Link
                      href="/company/talents"
                      className="px-8 py-3.5 bg-white/10 text-white font-semibold rounded-xl border border-white/20 backdrop-blur-sm hover:bg-white/20 hover:-translate-y-0.5 transition-all duration-200 text-center"
                    >
                      인재 탐색
                    </Link>
                  </>
                ) : (
                  <>
                    <Link
                      href="/dashboard"
                      className="px-8 py-3.5 bg-indigo-600 text-white font-semibold rounded-xl shadow-lg shadow-indigo-600/25 hover:bg-indigo-700 hover:shadow-xl hover:shadow-indigo-600/30 hover:-translate-y-0.5 transition-all duration-200 text-center"
                    >
                      MY 페이지
                    </Link>
                    <Link
                      href="/portfolio"
                      className="px-8 py-3.5 bg-white text-slate-700 font-semibold rounded-xl border border-slate-200 shadow-sm hover:border-slate-300 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 text-center"
                    >
                      포트폴리오 등록
                    </Link>
                  </>
                )
              ) : (
                <>
                  <Link
                    href="/login"
                    className="px-8 py-3.5 bg-indigo-600 text-white font-semibold rounded-xl shadow-lg shadow-indigo-600/25 hover:bg-indigo-700 hover:shadow-xl hover:shadow-indigo-600/30 hover:-translate-y-0.5 transition-all duration-200 text-center"
                  >
                    무료로 시작하기
                  </Link>
                  <Link
                    href="/login"
                    className="px-8 py-3.5 bg-white text-slate-700 font-semibold rounded-xl border border-slate-200 shadow-sm hover:border-slate-300 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 text-center"
                  >
                    로그인
                  </Link>
                </>
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="mt-16 sm:mt-20 grid grid-cols-3 gap-6 max-w-lg mx-auto animate-fade-in-up delay-300" style={{ opacity: 0 }}>
            {(isCompany
              ? [
                  { label: "AI 매칭 정확도", value: "95%" },
                  { label: "평균 매칭 시간", value: "30초" },
                  { label: "등록 인재", value: "500+" },
                ]
              : [
                  { label: "AI 분석 정확도", value: "95%" },
                  { label: "평균 매칭 시간", value: "30초" },
                  { label: "지원 포맷", value: "4종" },
                ]
            ).map((stat) => (
              <div
                key={stat.label}
                className={`text-center rounded-2xl px-4 py-4 border shadow-sm ${
                  isCompany
                    ? "bg-white/5 backdrop-blur-sm border-white/10"
                    : "bg-white/60 backdrop-blur-sm border-white/80"
                }`}
              >
                <div className={`text-2xl sm:text-3xl font-bold ${isCompany ? "text-emerald-400" : "text-gradient"}`}>{stat.value}</div>
                <div className={`text-xs sm:text-sm mt-1 font-medium ${isCompany ? "text-slate-400" : "text-slate-500"}`}>{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 sm:py-28 bg-slate-50">
        <div className="page-container">
          <div className="text-center mb-12 sm:mb-16">
            <span className={`${isCompany ? "bg-emerald-50 text-emerald-700 border-emerald-200" : ""} badge-primary mb-4 inline-block`}>
              {isCompany ? "기업 전용 기능" : "핵심 기능"}
            </span>
            <h2 className="section-title">
              {isCompany ? "AI 기반 인재 채용 솔루션" : "하나의 플랫폼에서 채용 준비 완료"}
            </h2>
            <p className="section-subtitle max-w-2xl mx-auto">
              {isCompany
                ? "채용공고 등록부터 인재 매칭, 후보자 탐색까지 한 곳에서 관리하세요."
                : "포트폴리오 분석부터 면접 연습까지, 취업 준비에 필요한 모든 것을 제공합니다."
              }
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 lg:gap-6">
            {features.map((f, idx) => (
              <Link
                key={f.href}
                href={user ? f.href : "/login"}
                className="group card-premium p-6 sm:p-7"
                style={{ animationDelay: `${idx * 100}ms` }}
              >
                <div className={`w-12 h-12 rounded-xl ${f.bgColor} flex items-center justify-center ${f.textColor} mb-5 group-hover:scale-110 transition-transform duration-300`}>
                  {f.icon}
                </div>
                <h3 className="text-lg font-bold text-slate-900 group-hover:text-indigo-600 transition-colors mb-2">
                  {f.title}
                </h3>
                <p className="text-sm text-slate-500 leading-relaxed">
                  {f.description}
                </p>
                <div className={`mt-4 flex items-center text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-300 ${isCompany ? "text-emerald-600" : "text-indigo-600"}`}>
                  자세히 보기
                  <svg className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* How it Works Section */}
      <section className="py-20 sm:py-28 bg-slate-50">
        <div className="page-container">
          <div className="text-center mb-12 sm:mb-16">
            <span className={`${isCompany ? "bg-emerald-50 text-emerald-700 border-emerald-200" : ""} badge-primary mb-4 inline-block`}>프로세스</span>
            <h2 className="section-title">
              {isCompany ? "간단한 4단계로 인재를 확보하세요" : "간단한 4단계로 시작"}
            </h2>
            <p className="section-subtitle max-w-2xl mx-auto">
              {isCompany
                ? "채용공고 등록부터 최적 인재 확보까지, 복잡한 채용 과정을 단순화했습니다."
                : "복잡한 채용 준비 과정을 직관적인 흐름으로 단순화했습니다."
              }
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8 max-w-4xl mx-auto">
            {steps.map((item, idx) => (
              <div key={item.step} className="text-center group">
                <div className="relative mx-auto mb-5">
                  <div className={`w-16 h-16 rounded-2xl text-white flex items-center justify-center mx-auto shadow-lg group-hover:shadow-xl group-hover:-translate-y-1 transition-all duration-300 ${
                    isCompany
                      ? "bg-gradient-to-br from-emerald-500 to-teal-600 shadow-emerald-500/25 group-hover:shadow-emerald-500/35"
                      : "bg-gradient-to-br from-indigo-500 to-purple-600 shadow-indigo-500/25 group-hover:shadow-indigo-500/35"
                  }`}>
                    {item.icon}
                  </div>
                  <span className={`absolute -top-2 -right-2 w-6 h-6 rounded-full text-white text-[10px] font-bold flex items-center justify-center shadow-sm ${
                    isCompany ? "bg-emerald-600" : "bg-indigo-600"
                  }`}>
                    {item.step}
                  </span>
                </div>
                <h3 className="text-sm sm:text-base font-bold text-slate-900 mb-1">
                  {item.title}
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">{item.desc}</p>

                {idx < 3 && (
                  <div className="hidden md:block absolute top-8 left-[calc(50%+2rem)] w-[calc(100%-4rem)] h-[1px] bg-slate-200" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 sm:py-28 bg-slate-50">
        <div className="page-container">
          <div className={`relative overflow-hidden rounded-3xl p-10 sm:p-16 text-center ${
            isCompany
              ? "bg-gradient-to-br from-emerald-600 via-teal-600 to-emerald-700"
              : "bg-gradient-to-br from-indigo-600 via-purple-600 to-indigo-700"
          }`}>
            <div className="absolute inset-0 bg-grid-pattern opacity-10" />
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-[80px]" />
            <div className={`absolute bottom-0 left-0 w-64 h-64 rounded-full blur-[80px] ${isCompany ? "bg-teal-400/20" : "bg-purple-400/20"}`} />

            <div className="relative">
              <h2 className="text-2xl sm:text-4xl font-bold text-white tracking-tight">
                {isCompany
                  ? "지금 바로 최적의 인재를 찾아보세요"
                  : "지금 바로 취업 준비를 시작하세요"
                }
              </h2>
              <p className={`mt-4 text-base sm:text-lg max-w-xl mx-auto ${isCompany ? "text-emerald-100" : "text-indigo-100"}`}>
                {isCompany
                  ? "AI 매칭으로 채용 효율을 높이고, 우수 인재를 빠르게 확보하세요."
                  : "AI가 분석한 맞춤 추천으로 취업 성공률을 높여보세요."
                }
              </p>
              <div className="mt-8 flex flex-col sm:flex-row justify-center gap-3">
                <Link
                  href={user ? (isCompany ? "/company/dashboard" : "/dashboard") : "/login"}
                  className={`px-8 py-3.5 bg-white font-semibold rounded-xl shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200 ${
                    isCompany ? "text-emerald-700" : "text-indigo-700"
                  }`}
                >
                  {user
                    ? (isCompany ? "채용 대시보드로 이동" : "대시보드로 이동")
                    : "무료로 시작하기"
                  }
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-50 border-t border-slate-200/60 py-8 sm:py-10">
        <div className="page-container flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <span className="text-sm font-semibold text-slate-600">JobFit AI</span>
          </div>
          <p className="text-xs text-slate-400">
            &copy; 2026 JobFit AI. Portfolio-based Job Recommendation System.
          </p>
        </div>
      </footer>
    </div>
  );
}
