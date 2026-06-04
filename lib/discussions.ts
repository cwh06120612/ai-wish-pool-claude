import { supabase } from "./supabase";

export interface Discussion {
  id: string;
  submissionId: string;
  author: string;
  content: string;
  createdAt: string;
  replyTo: string | null;
  readBy: string[];
}

function fromDb(row: Record<string, unknown>): Discussion {
  return {
    id: row.id as string,
    submissionId: row.submission_id as string,
    author: row.author as string,
    content: row.content as string,
    createdAt: row.created_at as string,
    replyTo: row.reply_to as string | null,
    readBy: (row.read_by as string[]) ?? [],
  };
}

export async function getDiscussions(submissionId: string): Promise<Discussion[]> {
  const { data } = await supabase
    .from("discussions")
    .select("*")
    .eq("submission_id", submissionId)
    .order("created_at", { ascending: true });
  return (data ?? []).map(fromDb);
}

export async function addDiscussion(params: {
  submissionId: string;
  author: string;
  content: string;
  replyTo?: string | null;
}): Promise<Discussion | null> {
  const id = Math.random().toString(36).slice(2) + Date.now().toString(36);
  const { data } = await supabase.from("discussions").insert({
    id,
    submission_id: params.submissionId,
    author: params.author,
    content: params.content,
    reply_to: params.replyTo ?? null,
    read_by: [params.author],
  }).select().single();
  return data ? fromDb(data) : null;
}

export async function markRead(discussionIds: string[], person: string): Promise<void> {
  for (const id of discussionIds) {
    const { data } = await supabase.from("discussions").select("read_by").eq("id", id).single();
    if (!data) continue;
    const readBy: string[] = data.read_by ?? [];
    if (readBy.includes(person)) continue;
    await supabase.from("discussions").update({ read_by: [...readBy, person] }).eq("id", id);
  }
}

export async function getUnreadCount(submissionIds: string[], person: string): Promise<Record<string, number>> {
  const { data } = await supabase
    .from("discussions")
    .select("submission_id, read_by")
    .in("submission_id", submissionIds);
  const counts: Record<string, number> = {};
  for (const row of data ?? []) {
    const readBy: string[] = row.read_by ?? [];
    if (!readBy.includes(person)) {
      counts[row.submission_id] = (counts[row.submission_id] ?? 0) + 1;
    }
  }
  return counts;
}

export async function deleteDiscussion(id: string): Promise<void> {
  await supabase.from("discussions").delete().eq("id", id);
}

export async function editDiscussion(id: string, content: string): Promise<void> {
  await supabase.from("discussions").update({ content }).eq("id", id);
}
