/**
 * API client utilities for communicating with the FastAPI backend.
 * In production, NEXT_PUBLIC_API_URL points directly to the Render backend.
 * In local dev, Next.js rewrites proxy /api to localhost:8000.
 */

import { getAuthHeaders } from "./auth";

const BACKEND = process.env.NEXT_PUBLIC_API_URL || "";
const BASE = `${BACKEND}/api`;

async function request<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const authHeaders = getAuthHeaders();
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...authHeaders,
      ...(options?.headers as Record<string, string>),
    },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`API ${res.status}: ${body}`);
  }
  return res.json();
}

// ── Portfolio ───────────────────────────────────────────────

export interface ContactInfo {
  email?: string | null;
  phone?: string | null;
  linkedin?: string | null;
  website?: string | null;
}

export interface SkillItem {
  name: string;
  category?: string | null;
  proficiency?: string | null;
}

export interface Experience {
  company: string;
  role: string;
  period?: string | null;
  description?: string | null;
}

export interface Project {
  name: string;
  description?: string | null;
  tech_stack: string[];
  role?: string | null;
  highlights: string[];
}

export interface Education {
  institution: string;
  degree?: string | null;
  major?: string | null;
  period?: string | null;
}

export interface PortfolioSchema {
  name?: string | null;
  contact: ContactInfo;
  summary?: string | null;
  skills: SkillItem[];
  experiences: Experience[];
  projects: Project[];
  education: Education[];
  certifications: string[];
  keywords: string[];
}

export interface PortfolioResponse {
  id: string;
  portfolio: PortfolioSchema;
  raw_text?: string | null;
  is_public?: boolean;
}

export interface PortfolioListResponse {
  portfolios: PortfolioResponse[];
  total: number;
}

export async function submitPortfolioText(text: string): Promise<PortfolioResponse> {
  return request<PortfolioResponse>("/portfolio/manual", {
    method: "POST",
    body: JSON.stringify({ text }),
  });
}

export async function submitPortfolioUrl(url: string): Promise<PortfolioResponse> {
  return request<PortfolioResponse>("/portfolio/parse-url", {
    method: "POST",
    body: JSON.stringify({ url }),
  });
}

export async function submitPortfolioGitHub(username: string): Promise<PortfolioResponse> {
  return request<PortfolioResponse>("/portfolio/parse-github", {
    method: "POST",
    body: JSON.stringify({ username }),
  });
}

export async function uploadPortfolioPdf(file: File): Promise<PortfolioResponse> {
  const authHeaders = getAuthHeaders();
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch(`${BASE}/portfolio/upload`, {
    method: "POST",
    body: formData,
    headers: authHeaders,
  });
  if (!res.ok) throw new Error(`API ${res.status}: ${await res.text()}`);
  return res.json();
}

export async function updatePortfolio(
  id: string,
  portfolio: PortfolioSchema
): Promise<PortfolioResponse> {
  return request<PortfolioResponse>(`/portfolio/${id}`, {
    method: "PUT",
    body: JSON.stringify({ portfolio }),
  });
}

export async function getPortfolio(id: string): Promise<PortfolioResponse> {
  return request<PortfolioResponse>(`/portfolio/${id}`);
}

export async function listPortfolios(): Promise<PortfolioListResponse> {
  return request<PortfolioListResponse>("/portfolio");
}

export async function deletePortfolio(id: string): Promise<void> {
  const authHeaders = getAuthHeaders();
  const res = await fetch(`${BASE}/portfolio/${id}`, {
    method: "DELETE",
    headers: authHeaders,
  });
  if (!res.ok) throw new Error(`API ${res.status}: ${await res.text()}`);
}

// ── Jobs ────────────────────────────────────────────────────

export interface JobPosting {
  id: string;
  title: string;
  company: string;
  location?: string | null;
  description?: string | null;
  requirements: string[];
  preferred: string[];
  salary?: string | null;
  url?: string | null;
  similarity_score?: number | null;
}

export interface JobRecommendationResponse {
  jobs: JobPosting[];
  total: number;
}

export async function getRecommendedJobs(
  portfolioId: string,
  limit = 10
): Promise<JobRecommendationResponse> {
  return request<JobRecommendationResponse>(
    `/jobs/recommend?portfolio_id=${portfolioId}&limit=${limit}`
  );
}

export async function searchJobs(
  keyword: string,
  limit = 10
): Promise<JobRecommendationResponse> {
  return request<JobRecommendationResponse>(
    `/jobs/search?q=${encodeURIComponent(keyword)}&limit=${limit}`
  );
}

// ── Interview ───────────────────────────────────────────────

export interface InterviewStartResponse {
  session_id: string;
  first_question: string;
}

export interface InterviewAnswerResponse {
  feedback: string;
  next_question?: string | null;
  is_finished: boolean;
}

export interface InterviewEndResponse {
  session_id: string;
  overall_feedback: string;
  score?: number | null;
  strengths: string[];
  improvements: string[];
}

export interface InterviewMessage {
  role: "interviewer" | "candidate";
  content: string;
}

export interface InterviewSessionListItem {
  id: string;
  job_id?: string | null;
  interview_type: string;
  score?: number | null;
  overall_feedback?: string | null;
  created_at: string;
  finished_at?: string | null;
}

export async function startInterview(
  portfolioId: string,
  jobId?: string,
  interviewType = "technical"
): Promise<InterviewStartResponse> {
  return request<InterviewStartResponse>("/interview/start", {
    method: "POST",
    body: JSON.stringify({
      portfolio_id: portfolioId,
      job_id: jobId || null,
      interview_type: interviewType,
    }),
  });
}

export async function submitAnswer(
  sessionId: string,
  answer: string
): Promise<InterviewAnswerResponse> {
  return request<InterviewAnswerResponse>("/interview/answer", {
    method: "POST",
    body: JSON.stringify({ session_id: sessionId, answer }),
  });
}

export async function endInterview(
  sessionId: string
): Promise<InterviewEndResponse> {
  return request<InterviewEndResponse>("/interview/end", {
    method: "POST",
    body: JSON.stringify({ session_id: sessionId }),
  });
}

export async function listInterviewSessions(): Promise<InterviewSessionListItem[]> {
  return request<InterviewSessionListItem[]>("/interview/list");
}

// ── Resume ─────────────────────────────────────────────────

export interface CompanyInfo {
  name: string;
  core_values: string[];
  talent_profile?: string | null;
  culture_keywords: string[];
}

export interface ResumeResponse {
  id: string;
  markdown_content: string;
  company_info?: CompanyInfo | null;
  crawl_success: boolean;
}

export interface ResumeListItem {
  id: string;
  job_id?: string | null;
  company_name?: string | null;
  crawl_success: boolean;
  created_at: string;
}

export async function generateResume(
  portfolioId: string,
  jobId: string,
  companyUrl?: string
): Promise<ResumeResponse> {
  return request<ResumeResponse>("/resume/generate", {
    method: "POST",
    body: JSON.stringify({
      portfolio_id: portfolioId,
      job_id: jobId,
      company_url: companyUrl || null,
    }),
  });
}

export async function getResume(resumeId: string): Promise<ResumeResponse> {
  return request<ResumeResponse>(`/resume/${resumeId}`);
}

export async function listResumes(): Promise<ResumeListItem[]> {
  return request<ResumeListItem[]>("/resume/list");
}

export async function downloadResumePdf(resumeId: string): Promise<void> {
  const authHeaders = getAuthHeaders();
  const res = await fetch(`${BASE}/resume/${resumeId}/pdf`, { headers: authHeaders });
  if (!res.ok) throw new Error(`PDF download failed: ${res.status}`);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `resume_${resumeId.slice(0, 8)}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ── Portfolio Visibility ────────────────────────────────────

export async function togglePortfolioVisibility(id: string): Promise<{ id: string; is_public: boolean }> {
  const authHeaders = getAuthHeaders();
  const res = await fetch(`${BASE}/portfolio/${id}/visibility`, {
    method: "PATCH",
    headers: authHeaders,
  });
  if (!res.ok) throw new Error(`API ${res.status}: ${await res.text()}`);
  return res.json();
}

// ── Company ─────────────────────────────────────────────────

export interface CompanyProfile {
  id: string;
  name: string;
  description?: string | null;
  website?: string | null;
  industry?: string | null;
  size?: string | null;
  logo_url?: string | null;
}

export async function getMyCompany(): Promise<CompanyProfile> {
  return request<CompanyProfile>("/company/me");
}

export async function updateMyCompany(data: Partial<CompanyProfile>): Promise<CompanyProfile> {
  return request<CompanyProfile>("/company/me", {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

// ── Company Job Postings ────────────────────────────────────

export interface CompanyJobPosting {
  id: string;
  company_id: string;
  company_name?: string | null;
  title: string;
  description?: string | null;
  requirements: string[];
  preferred: string[];
  location?: string | null;
  salary?: string | null;
  status: string;
  created_at: string;
  updated_at?: string | null;
}

export async function createCompanyJob(data: {
  title: string;
  description?: string;
  requirements?: string[];
  preferred?: string[];
  location?: string;
  salary?: string;
}): Promise<CompanyJobPosting> {
  return request<CompanyJobPosting>("/company/jobs", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function listCompanyJobs(): Promise<CompanyJobPosting[]> {
  return request<CompanyJobPosting[]>("/company/jobs");
}

export async function updateCompanyJob(id: string, data: Record<string, unknown>): Promise<CompanyJobPosting> {
  return request<CompanyJobPosting>(`/company/jobs/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function deleteCompanyJob(id: string): Promise<void> {
  const authHeaders = getAuthHeaders();
  const res = await fetch(`${BASE}/company/jobs/${id}`, { method: "DELETE", headers: authHeaders });
  if (!res.ok) throw new Error(`API ${res.status}: ${await res.text()}`);
}

export async function changeJobStatus(id: string, newStatus: string): Promise<CompanyJobPosting> {
  return request<CompanyJobPosting>(`/company/jobs/${id}/status?new_status=${newStatus}`, {
    method: "PATCH",
  });
}

// ── Candidate Matching (Company side) ───────────────────────

export interface CandidateMatchItem {
  rank: number;
  portfolio_id: string;
  user_name?: string | null;
  summary?: string | null;
  skills: string[];
  similarity_score: number;
}

export interface CandidateMatchResponse {
  job_id: string;
  candidates: CandidateMatchItem[];
  total: number;
}

export async function matchCandidates(jobId: string, limit = 20): Promise<CandidateMatchResponse> {
  return request<CandidateMatchResponse>(`/company/candidates/match?job_id=${jobId}&limit=${limit}`);
}

export async function searchCandidates(q: string, limit = 20): Promise<{ results: CandidateMatchItem[]; total: number }> {
  return request<{ results: CandidateMatchItem[]; total: number }>(`/company/candidates/search?q=${encodeURIComponent(q)}&limit=${limit}`);
}

export async function getPublicPortfolio(portfolioId: string): Promise<PortfolioResponse> {
  return request<PortfolioResponse>(`/company/candidates/${portfolioId}`);
}
