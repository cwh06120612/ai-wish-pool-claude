import { supabase } from "./supabase";

export interface Feedback {
  id: string;
  submissionId: string | null;
  authorName: string;
  authorDept: string;
  rating: number;
  content: string;
  isVisible: boolean;
  createdAt: string;
}

function fromDb(row: Record<string, unknown>): Feedback {
  return {
    id: row.id as string,
    submissionId: (row.submission_id as string) ?? null,
    authorName: (row.author_name as string) ?? "匿名同仁",
    authorDept: (row.author_dept as string) ?? "",
    rating: (row.rating as number) ?? 5,
    content: (row.content as string) ?? "",
    isVisible: (row.is_visible as boolean) ?? true,
    createdAt: row.created_at as string,
  };
}

// 取得單一需求的回饋（依時間新到舊）
export async function getFeedbacks(submissionId: string): Promise<Feedback[]> {
  const { data, error } = await supabase
    .from("feedbacks")
    .select("*")
    .eq("submission_id", submissionId)
    .order("created_at", { ascending: false });
  if (error) {
    // 資料表尚未建立或查詢失敗時，靜默回傳空陣列，避免整頁壞掉
    console.error("[feedback.getFeedbacks]", error);
    return [];
  }
  return (data ?? []).map(fromDb);
}

// 取得所有公開回饋（成果看板用）
export async function getAllFeedbacks(): Promise<Feedback[]> {
  const { data, error } = await supabase
    .from("feedbacks")
    .select("*")
    .eq("is_visible", true)
    .order("created_at", { ascending: false });
  if (error) {
    console.error("[feedback.getAllFeedbacks]", error);
    return [];
  }
  return (data ?? []).map(fromDb);
}

export async function addFeedback(params: {
  submissionId?: string | null;
  authorName?: string;
  authorDept?: string;
  rating: number;
  content: string;
}): Promise<Feedback | null> {
  const id = Math.random().toString(36).slice(2) + Date.now().toString(36);
  const insertData = {
    id,
    submission_id: params.submissionId ?? null,
    author_name: params.authorName?.trim() || "匿名同仁",
    author_dept: params.authorDept?.trim() || "",
    rating: Math.min(5, Math.max(1, params.rating)),
    content: params.content.trim(),
    is_visible: true,
  };
  const { data, error } = await supabase.from("feedbacks").insert(insertData).select().single();
  if (error) {
    console.error("[feedback.addFeedback] insert error", {
      error: { code: error.code, message: error.message, details: error.details, hint: error.hint },
      insertData,
    });
    return null;
  }
  return data ? fromDb(data) : null;
}
