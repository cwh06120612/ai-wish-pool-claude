import { supabase } from "./supabase";
import type { Submission } from "@/types/submission";

// ─── 型別轉換（DB 欄位 snake_case ↔ JS camelCase）────────────────────────────
function toDb(s: Submission) {
  return {
    id: s.id,
    created_at: s.createdAt,
    department_path: s.departmentPath,
    department_full_path: s.departmentFullPath,
    name: s.name,
    problem_title: s.problemTitle,
    pain_points: s.painPoints,
    current_methods: s.currentMethods,
    data_sources: s.dataSources,
    frequency: s.frequency,
    annoyance_level: s.annoyanceLevel,
    ai_needs: s.aiNeeds,
    share_mode: s.shareMode,
    free_text: s.freeText,
    status: s.status,
    priority: s.priority,
    category: s.category,
    admin_note: s.adminNote,
    public_summary: s.publicSummary,
    is_visible: s.isVisible,
    like_count: s.likeCount,
  };
}

function fromDb(row: Record<string, unknown>): Submission {
  return {
    id: row.id as string,
    createdAt: row.created_at as string,
    departmentPath: (row.department_path as string[]) ?? [],
    departmentFullPath: (row.department_full_path as string) ?? "",
    name: (row.name as string) ?? "",
    problemTitle: (row.problem_title as string) ?? "",
    painPoints: (row.pain_points as string[]) ?? [],
    currentMethods: (row.current_methods as string[]) ?? [],
    dataSources: (row.data_sources as string[]) ?? [],
    frequency: (row.frequency as string) ?? "",
    annoyanceLevel: (row.annoyance_level as string) ?? "",
    aiNeeds: (row.ai_needs as string[]) ?? [],
    shareMode: (row.share_mode as Submission["shareMode"]) ?? "不公開（只給數位創新處後台查看）",
    freeText: (row.free_text as string) ?? "",
    status: (row.status as Submission["status"]) ?? "已收到",
    priority: (row.priority as Submission["priority"]) ?? "待評估",
    category: (row.category as Submission["category"]) ?? "未分類",
    adminNote: (row.admin_note as string) ?? "",
    publicSummary: (row.public_summary as string) ?? "",
    isVisible: (row.is_visible as boolean) ?? true,
    likeCount: (row.like_count as number) ?? 0,
  };
}

// ─── API ──────────────────────────────────────────────────────────────────────
export async function getSubmissionsAsync(): Promise<Submission[]> {
  const { data, error } = await supabase
    .from("submissions")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) { console.error(error); return []; }
  return (data ?? []).map(fromDb);
}

export async function addSubmissionAsync(s: Submission): Promise<void> {
  const { error } = await supabase.from("submissions").insert(toDb(s));
  if (error) console.error(error);
}

export async function updateSubmissionAsync(id: string, updates: Partial<Submission>): Promise<void> {
  const dbUpdates: Record<string, unknown> = {};
  if (updates.status !== undefined) dbUpdates.status = updates.status;
  if (updates.priority !== undefined) dbUpdates.priority = updates.priority;
  if (updates.category !== undefined) dbUpdates.category = updates.category;
  if (updates.adminNote !== undefined) dbUpdates.admin_note = updates.adminNote;
  if (updates.publicSummary !== undefined) dbUpdates.public_summary = updates.publicSummary;
  if (updates.isVisible !== undefined) dbUpdates.is_visible = updates.isVisible;
  if (updates.likeCount !== undefined) dbUpdates.like_count = updates.likeCount;
  const { error } = await supabase.from("submissions").update(dbUpdates).eq("id", id);
  if (error) console.error(error);
}

export async function incrementLikeAsync(id: string): Promise<void> {
  const { data } = await supabase.from("submissions").select("like_count").eq("id", id).single();
  if (data) {
    await supabase.from("submissions").update({ like_count: (data.like_count ?? 0) + 1 }).eq("id", id);
  }
}

// ─── 舊的同步 API 保留相容性（部分頁面還在用）────────────────────────────────
export function generateId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

// 以下同步版本保留給尚未改寫的頁面，會在 migrate 後移除
export function getSubmissions(): Submission[] { return []; }
export function addSubmission(_s: Submission): void {}
export function updateSubmission(_id: string, _updates: Partial<Submission>): void {}
export function incrementLike(_id: string): void {}
