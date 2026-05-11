import type { Submission } from "@/types/submission";

const STORAGE_KEY = "ai-wish-submissions";

export function getSubmissions(): Submission[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveSubmissions(submissions: Submission[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(submissions));
}

export function addSubmission(submission: Submission): void {
  const submissions = getSubmissions();
  submissions.unshift(submission);
  saveSubmissions(submissions);
}

export function updateSubmission(
  id: string,
  updates: Partial<Submission>
): void {
  const submissions = getSubmissions();
  const idx = submissions.findIndex((s) => s.id === id);
  if (idx !== -1) {
    submissions[idx] = { ...submissions[idx], ...updates };
    saveSubmissions(submissions);
  }
}

export function incrementLike(id: string): void {
  const submissions = getSubmissions();
  const idx = submissions.findIndex((s) => s.id === id);
  if (idx !== -1) {
    submissions[idx].likeCount = (submissions[idx].likeCount || 0) + 1;
    saveSubmissions(submissions);
  }
}

export function generateId(): string {
  return `wish-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
