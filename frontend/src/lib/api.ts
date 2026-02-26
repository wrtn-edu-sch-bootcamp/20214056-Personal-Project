/**
 * API client utilities for communicating with the FastAPI backend.
 * All requests are proxied through Next.js rewrites → localhost:8000.
 */

const BASE = "/api";

async function request<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...(options?.headers as Record<string, string>) },
    ...options,
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
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch(`${BASE}/portfolio/upload`, { method: "POST", body: formData });
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

export async function downloadResumePdf(resumeId: string): Promise<void> {
  const res = await fetch(`${BASE}/resume/${resumeId}/pdf`);
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
