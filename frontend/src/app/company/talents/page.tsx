"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import Navigation from "@/components/Navigation";
import AuthGuard from "@/components/AuthGuard";
import { browsePublicPortfolios, type PublicPortfolioItem } from "@/lib/api";

export default function TalentsPage() {
  const [items, setItems] = useState<PublicPortfolioItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const pageSize = 20;

  const loadData = useCallback(async (q: string, p: number) => {
    setLoading(true);
    setError(null);
    try {
      const res = await browsePublicPortfolios(q, p, pageSize);
      setItems(res.items);
      setTotal(res.total);
      setPage(p);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "데이터를 불러올 수 없습니다.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData(query, 1);
  }, [query, loadData]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setQuery(searchInput.trim());
  };

  const totalPages = Math.ceil(total / pageSize);

  return (
    <AuthGuard>
      <div className="min-h-screen bg-slate-50">
        <Navigation />
        <main className="page-container py-8 sm:py-10">
          {/* Header */}
          <div className="mb-8">
            <h1 className="section-title text-xl sm:text-2xl">인재 탐색</h1>
            <p className="section-subtitle text-sm">
              구직자가 공개한 포트폴리오를 검색하고 확인할 수 있습니다.
            </p>
          </div>

          {/* Search */}
          <form onSubmit={handleSearch} className="card-premium p-4 sm:p-5 mb-6">
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="기술스택, 키워드, 이름으로 검색..."
                  className="input-field pl-10"
                />
              </div>
              <button type="submit" className="inline-flex items-center justify-center px-5 py-2.5 bg-emerald-600 text-white font-semibold text-sm rounded-xl shadow-sm shadow-emerald-600/25 hover:bg-emerald-700 transition-all duration-200 shrink-0">
                검색
              </button>
              {query && (
                <button
                  type="button"
                  onClick={() => { setSearchInput(""); setQuery(""); }}
                  className="btn-secondary shrink-0"
                >
                  초기화
                </button>
              )}
            </div>
          </form>

          {/* Result count */}
          {!loading && (
            <p className="text-sm text-slate-500 mb-4">
              {query ? (
                <>
                  <span className="font-medium text-slate-700">&quot;{query}&quot;</span> 검색 결과{" "}
                </>
              ) : (
                "전체 공개 포트폴리오 "
              )}
              <span className="font-bold text-slate-800">{total}</span>건
            </p>
          )}

          {/* Error */}
          {error && (
            <div className="flex items-start gap-2 bg-red-50 text-red-700 px-4 py-3 rounded-xl text-sm border border-red-100 mb-6">
              <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {error}
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div className="text-center py-16">
              <div className="spinner w-8 h-8 text-emerald-600 mx-auto" />
              <p className="mt-4 text-sm text-slate-500">불러오는 중...</p>
            </div>
          )}

          {/* Empty */}
          {!loading && !error && items.length === 0 && (
            <div className="text-center py-20">
              <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <p className="text-lg font-medium text-slate-400">
                {query ? "검색 결과가 없습니다." : "공개된 포트폴리오가 없습니다."}
              </p>
            </div>
          )}

          {/* Portfolio cards */}
          {!loading && !error && items.length > 0 && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((item) => (
                <PortfolioCard key={item.portfolio_id} item={item} />
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-2 mt-8">
              <button
                onClick={() => loadData(query, page - 1)}
                disabled={page <= 1}
                className="btn-secondary text-xs px-4 py-2 disabled:opacity-40"
              >
                이전
              </button>
              <span className="text-sm text-slate-600 px-4 font-medium">
                {page} / {totalPages}
              </span>
              <button
                onClick={() => loadData(query, page + 1)}
                disabled={page >= totalPages}
                className="btn-secondary text-xs px-4 py-2 disabled:opacity-40"
              >
                다음
              </button>
            </div>
          )}
        </main>
      </div>
    </AuthGuard>
  );
}

function PortfolioCard({ item }: { item: PublicPortfolioItem }) {
  const date = item.updated_at
    ? new Date(item.updated_at).toLocaleDateString("ko-KR")
    : null;

  return (
    <Link
      href={`/company/talents/${item.portfolio_id}`}
      className="block card-premium p-5 sm:p-6"
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white text-xs font-bold">
            {(item.user_name || "?").charAt(0)}
          </div>
          <h3 className="font-bold text-slate-900 text-base">
            {item.user_name || "이름 미공개"}
          </h3>
        </div>
        {date && <span className="text-[11px] text-slate-400 shrink-0">{date}</span>}
      </div>

      {item.summary && (
        <p className="text-sm text-slate-500 line-clamp-2 mb-3 leading-relaxed">{item.summary}</p>
      )}

      {item.skills.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {item.skills.slice(0, 6).map((skill) => (
            <span key={skill} className="badge-success text-[11px]">{skill}</span>
          ))}
          {item.skills.length > 6 && (
            <span className="text-xs text-slate-400 font-medium">+{item.skills.length - 6}</span>
          )}
        </div>
      )}

      {item.keywords.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {item.keywords.slice(0, 4).map((kw) => (
            <span key={kw} className="badge-neutral text-[10px]">{kw}</span>
          ))}
        </div>
      )}

      <p className="text-xs text-indigo-500 font-medium mt-3">상세 보기 →</p>
    </Link>
  );
}
