import { supabase } from "./supabase";
import type { Status } from "@/types/submission";

export interface Topic {
  id: string;
  submissionId: string | null; // 有值 = 由公告欄某則需求衍生的討論串
  title: string;
  description: string;
  authorName: string;
  authorDept: string;
  isStaff: boolean;
  createdAt: string;
}

export interface TopicPost {
  id: string;
  topicId: string;
  parentId: string | null;
  authorName: string;
  authorDept: string;
  isStaff: boolean;
  content: string;
  createdAt: string;
}

export interface TopicStat {
  count: number;
  lastAt: string | null;
}

function topicFromDb(row: Record<string, unknown>): Topic {
  return {
    id: row.id as string,
    submissionId: (row.submission_id as string) ?? null,
    title: (row.title as string) ?? "",
    description: (row.description as string) ?? "",
    authorName: (row.author_name as string) ?? "匿名同仁",
    authorDept: (row.author_dept as string) ?? "",
    isStaff: (row.is_staff as boolean) ?? false,
    createdAt: row.created_at as string,
  };
}

function postFromDb(row: Record<string, unknown>): TopicPost {
  return {
    id: row.id as string,
    topicId: row.topic_id as string,
    parentId: (row.parent_id as string) ?? null,
    authorName: (row.author_name as string) ?? "匿名同仁",
    authorDept: (row.author_dept as string) ?? "",
    isStaff: (row.is_staff as boolean) ?? false,
    content: (row.content as string) ?? "",
    createdAt: row.created_at as string,
  };
}

export async function getTopics(): Promise<Topic[]> {
  const { data, error } = await supabase.from("topics").select("*").order("created_at", { ascending: false });
  if (error) { console.error("[topics.getTopics]", error); return []; }
  return (data ?? []).map(topicFromDb);
}

export async function getTopic(id: string): Promise<Topic | null> {
  const { data, error } = await supabase.from("topics").select("*").eq("id", id).maybeSingle();
  if (error) { console.error("[topics.getTopic]", error); return null; }
  return data ? topicFromDb(data) : null;
}

// 每個主題的留言數與最後活動時間（列表用）
export async function getTopicStats(): Promise<Record<string, TopicStat>> {
  const { data, error } = await supabase.from("topic_posts").select("topic_id, created_at");
  if (error) { console.error("[topics.getTopicStats]", error); return {}; }
  const stats: Record<string, TopicStat> = {};
  for (const row of data ?? []) {
    const id = row.topic_id as string;
    const at = row.created_at as string;
    const cur = stats[id] ?? { count: 0, lastAt: null };
    cur.count += 1;
    if (!cur.lastAt || at > cur.lastAt) cur.lastAt = at;
    stats[id] = cur;
  }
  return stats;
}

export async function getTopicPosts(topicId: string): Promise<TopicPost[]> {
  const { data, error } = await supabase
    .from("topic_posts")
    .select("*")
    .eq("topic_id", topicId)
    .order("created_at", { ascending: true });
  if (error) { console.error("[topics.getTopicPosts]", error); return []; }
  return (data ?? []).map(postFromDb);
}

export async function addTopic(params: {
  title: string;
  description?: string;
  authorName?: string;
  authorDept?: string;
  isStaff?: boolean;
}): Promise<Topic | null> {
  const id = Math.random().toString(36).slice(2) + Date.now().toString(36);
  const insertData = {
    id,
    title: params.title.trim(),
    description: params.description?.trim() ?? "",
    author_name: params.authorName?.trim() || "匿名同仁",
    author_dept: params.authorDept?.trim() || "",
    is_staff: params.isStaff ?? false,
  };
  const { data, error } = await supabase.from("topics").insert(insertData).select().single();
  if (error) { console.error("[topics.addTopic]", error); return null; }
  return data ? topicFromDb(data) : null;
}

// 取得或建立「某則需求」對應的討論串：
// 公告欄未導入需求想討論時呼叫——已存在就回傳、還沒有就用需求標題自動建立。
// 以 submission_id 去重（DB 端有 partial unique index 擋並發重複）。
export async function getOrCreateTopicForSubmission(sub: {
  id: string;
  title: string;
  summary?: string;
  status?: Status;
}): Promise<Topic | null> {
  const existing = await supabase.from("topics").select("*").eq("submission_id", sub.id).maybeSingle();
  if (existing.error) { console.error("[topics.getOrCreateTopicForSubmission] lookup", existing.error); }
  if (existing.data) return topicFromDb(existing.data);

  const id = Math.random().toString(36).slice(2) + Date.now().toString(36);
  // 不予處理已經結案，別再說「還在處理中」
  const fallbackDescription = sub.status === "不予處理"
    ? "這則需求評估後不予處理、已結案。若情況有變或有新的想法，歡迎在這裡補充。"
    : "這則需求還在處理中，一起討論、補充想法吧。";
  const insertData = {
    id,
    submission_id: sub.id,
    title: sub.title.trim() || "需求討論",
    description: sub.summary?.trim() || fallbackDescription,
    author_name: "數位創新處",
    author_dept: "",
    is_staff: true,
  };
  const { data, error } = await supabase.from("topics").insert(insertData).select().single();
  if (error) {
    // 並發下可能已被別人建立（撞 unique）→ 再查一次拿回既有的
    const retry = await supabase.from("topics").select("*").eq("submission_id", sub.id).maybeSingle();
    if (retry.data) return topicFromDb(retry.data);
    console.error("[topics.getOrCreateTopicForSubmission] insert", error);
    return null;
  }
  return data ? topicFromDb(data) : null;
}

// 刪除並確認真的刪掉（RLS 擋刪時不會回 error，只會 0 筆，故用 select 驗證）
export async function deleteTopic(id: string): Promise<void> {
  const { data, error } = await supabase.from("topics").delete().eq("id", id).select("id");
  if (error) { console.error("[topics.deleteTopic]", error); throw error; }
  if (!data || data.length === 0) throw new Error("刪除未生效（可能是刪除權限未開）");
}

export async function deleteTopicPost(id: string): Promise<void> {
  const { data, error } = await supabase.from("topic_posts").delete().eq("id", id).select("id");
  if (error) { console.error("[topics.deleteTopicPost]", error); throw error; }
  if (!data || data.length === 0) throw new Error("刪除未生效（可能是刪除權限未開）");
}

export async function addTopicPost(params: {
  topicId: string;
  content: string;
  parentId?: string | null;
  isStaff?: boolean;
  authorName?: string;
  authorDept?: string;
}): Promise<TopicPost | null> {
  const id = Math.random().toString(36).slice(2) + Date.now().toString(36);
  const insertData = {
    id,
    topic_id: params.topicId,
    parent_id: params.parentId ?? null,
    is_staff: params.isStaff ?? false,
    content: params.content.trim(),
    author_name: params.authorName?.trim() || "匿名同仁",
    author_dept: params.authorDept?.trim() || "",
  };
  const { data, error } = await supabase.from("topic_posts").insert(insertData).select().single();
  if (error) { console.error("[topics.addTopicPost]", error); return null; }
  return data ? postFromDb(data) : null;
}
