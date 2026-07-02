import { supabase } from "./supabase";

export interface Topic {
  id: string;
  title: string;
  description: string;
  authorName: string;
  authorDept: string;
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
    title: (row.title as string) ?? "",
    description: (row.description as string) ?? "",
    authorName: (row.author_name as string) ?? "匿名同仁",
    authorDept: (row.author_dept as string) ?? "",
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
}): Promise<Topic | null> {
  const id = Math.random().toString(36).slice(2) + Date.now().toString(36);
  const insertData = {
    id,
    title: params.title.trim(),
    description: params.description?.trim() ?? "",
    author_name: params.authorName?.trim() || "匿名同仁",
    author_dept: params.authorDept?.trim() || "",
  };
  const { data, error } = await supabase.from("topics").insert(insertData).select().single();
  if (error) { console.error("[topics.addTopic]", error); return null; }
  return data ? topicFromDb(data) : null;
}

export async function deleteTopic(id: string): Promise<void> {
  const { error } = await supabase.from("topics").delete().eq("id", id);
  if (error) { console.error("[topics.deleteTopic]", error); throw error; }
}

export async function deleteTopicPost(id: string): Promise<void> {
  const { error } = await supabase.from("topic_posts").delete().eq("id", id);
  if (error) { console.error("[topics.deleteTopicPost]", error); throw error; }
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
