"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth";

const CANDIDATE_NAV = [
  { href: "/", label: "홈" },
  { href: "/explore", label: "채용공고" },
  { href: "/dashboard", label: "MY 페이지" },
];

const COMPANY_NAV = [
  { href: "/", label: "홈" },
  { href: "/company/talents", label: "인재 탐색" },
  { href: "/company/dashboard", label: "MY 페이지" },
  { href: "/company/jobs", label: "공고 관리" },
  { href: "/company/candidates", label: "인재 매칭" },
];

export default function Navigation() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const closeMobile = () => setMobileOpen(false);

  const isCompany = user?.role === "company";
  const navItems = isCompany ? COMPANY_NAV : CANDIDATE_NAV;
  const dashboardHref = isCompany ? "/company/dashboard" : "/dashboard";

  // Track scroll for nav background change
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <nav
      className={`sticky top-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-white/80 backdrop-blur-xl border-b border-slate-200/60 shadow-sm"
          : "bg-white/60 backdrop-blur-md border-b border-transparent"
      }`}
    >
      <div className="page-container">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 shrink-0 group">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-sm shadow-indigo-500/25 group-hover:shadow-md group-hover:shadow-indigo-500/30 transition-all duration-200">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <span className="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600">
              JobFit AI
            </span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`relative px-3.5 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    active
                      ? "text-indigo-700 bg-indigo-50/80"
                      : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
                  }`}
                >
                  {item.label}
                  {active && (
                    <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-0.5 bg-indigo-600 rounded-full" />
                  )}
                </Link>
              );
            })}

            <div className="ml-2 pl-3 border-l border-slate-200/60 flex items-center gap-2">
              {user ? (
                <>
                  {isCompany && (
                    <span className="badge-success">기업</span>
                  )}
                  <Link
                    href={dashboardHref}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-all"
                  >
                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-[10px] font-bold text-white">
                      {user.name.charAt(0)}
                    </div>
                    {user.name}
                  </Link>
                  <button
                    onClick={logout}
                    className="btn-ghost text-xs text-slate-400 hover:text-slate-600"
                  >
                    로그아웃
                  </button>
                </>
              ) : (
                <Link href="/login" className="btn-primary text-xs px-4 py-2">
                  시작하기
                </Link>
              )}
            </div>
          </div>

          {/* Mobile hamburger */}
          <div className="flex items-center gap-2 md:hidden">
            {!user && (
              <Link href="/login" className="btn-primary text-xs px-3 py-1.5">
                시작하기
              </Link>
            )}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors"
              aria-label="메뉴"
            >
              {mobileOpen ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile dropdown */}
      {mobileOpen && (
        <div className="md:hidden border-t border-slate-100 bg-white/95 backdrop-blur-xl animate-fade-in-down">
          <div className="px-4 py-3 space-y-1">
            {navItems.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={closeMobile}
                  className={`block px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                    active
                      ? "bg-indigo-50 text-indigo-700"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
            <div className="pt-3 mt-3 border-t border-slate-100">
              {user ? (
                <>
                  {isCompany && (
                    <span className="inline-block ml-4 mb-2 badge-success">
                      기업 계정
                    </span>
                  )}
                  <Link
                    href={dashboardHref}
                    onClick={closeMobile}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 transition-all"
                  >
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-xs font-bold text-white">
                      {user.name.charAt(0)}
                    </div>
                    {user.name}님 MY 페이지
                  </Link>
                  <button
                    onClick={() => { logout(); closeMobile(); }}
                    className="w-full text-left px-4 py-3 rounded-xl text-sm font-medium text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition-all"
                  >
                    로그아웃
                  </button>
                </>
              ) : (
                <Link
                  href="/login"
                  onClick={closeMobile}
                  className="block px-4 py-3 rounded-xl text-sm font-semibold text-indigo-600 hover:bg-indigo-50 transition-all"
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
