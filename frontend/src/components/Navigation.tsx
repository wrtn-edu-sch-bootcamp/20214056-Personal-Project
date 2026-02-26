"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth";

const CANDIDATE_NAV = [
  { href: "/", label: "홈" },
  { href: "/portfolio", label: "포트폴리오" },
  { href: "/jobs", label: "채용 추천" },
  { href: "/resume", label: "이력서" },
  { href: "/interview", label: "면접" },
];

const COMPANY_NAV = [
  { href: "/", label: "홈" },
  { href: "/company/dashboard", label: "대시보드" },
  { href: "/company/jobs", label: "공고 관리" },
  { href: "/company/candidates", label: "인재 매칭" },
];

export default function Navigation() {
  const pathname = usePathname();
  const { user, logout, loading } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const closeMobile = () => setMobileOpen(false);

  const isCompany = user?.role === "company";
  const navItems = isCompany ? COMPANY_NAV : CANDIDATE_NAV;
  const dashboardHref = isCompany ? "/company/dashboard" : "/dashboard";

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 sm:h-16">
          <Link href="/" className="text-lg sm:text-xl font-bold text-primary-600 shrink-0">
            JobFit AI
          </Link>

          {/* Desktop */}
          <div className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    active
                      ? "bg-primary-50 text-primary-700"
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}

            <div className="ml-3 pl-3 border-l border-gray-200 flex items-center gap-2">
              {loading ? (
                <span className="text-xs text-gray-400">...</span>
              ) : user ? (
                <>
                  {isCompany && (
                    <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-xs font-medium rounded-full">
                      기업
                    </span>
                  )}
                  <Link
                    href={dashboardHref}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      pathname === dashboardHref
                        ? "bg-primary-50 text-primary-700"
                        : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                    }`}
                  >
                    {user.name}
                  </Link>
                  <button
                    onClick={logout}
                    className="px-3 py-2 rounded-lg text-sm font-medium text-gray-500 hover:bg-gray-50 hover:text-gray-900 transition-colors"
                  >
                    로그아웃
                  </button>
                </>
              ) : (
                <Link
                  href="/login"
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-semibold hover:bg-primary-700 transition-colors"
                >
                  로그인
                </Link>
              )}
            </div>
          </div>

          {/* Mobile hamburger */}
          <div className="flex items-center gap-2 md:hidden">
            {!loading && !user && (
              <Link
                href="/login"
                className="px-3 py-1.5 bg-primary-600 text-white rounded-lg text-xs font-semibold hover:bg-primary-700 transition-colors"
              >
                로그인
              </Link>
            )}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="p-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
              aria-label="메뉴"
            >
              {mobileOpen ? (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile dropdown */}
      {mobileOpen && (
        <div className="md:hidden border-t border-gray-100 bg-white">
          <div className="px-4 py-3 space-y-1">
            {navItems.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={closeMobile}
                  className={`block px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    active
                      ? "bg-primary-50 text-primary-700"
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
            <div className="pt-2 mt-2 border-t border-gray-100">
              {loading ? null : user ? (
                <>
                  {isCompany && (
                    <span className="inline-block ml-3 mb-2 px-2 py-0.5 bg-emerald-50 text-emerald-700 text-xs font-medium rounded-full">
                      기업 계정
                    </span>
                  )}
                  <Link
                    href={dashboardHref}
                    onClick={closeMobile}
                    className="block px-3 py-2.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors"
                  >
                    {user.name}님 대시보드
                  </Link>
                  <button
                    onClick={() => { logout(); closeMobile(); }}
                    className="w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium text-gray-500 hover:bg-gray-50 hover:text-gray-900 transition-colors"
                  >
                    로그아웃
                  </button>
                </>
              ) : (
                <Link
                  href="/login"
                  onClick={closeMobile}
                  className="block px-3 py-2.5 rounded-lg text-sm font-semibold text-primary-600 hover:bg-primary-50 transition-colors"
                >
                  로그인 / 회원가입
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
