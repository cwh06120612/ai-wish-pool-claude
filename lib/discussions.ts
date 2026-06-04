import { supabase } from "./supabase";

function formatSupabaseError(error: unknown) {
  if (typeof error === "object" && error !== null) {
    const err = error as { message?: string; code?: string; details?: string; hint?: string };
    return {
      message: err.message,
      code: err.code,
      details: err.details,
      hint: err.hint,
    };
  }
  return {
    message: String(error),
    code: undefined,
    details: undefined,
    hint: undefined,
  };
}

function logMutationError(context: string, params: { table: string; targetId: string; updatePayload: Record<string, unknown>; error: unknown }) {
  console.error(context, {
    table: params.table,
    targetId: params.targetId,
    updatePayload: params.updatePayload,
    error: formatSupabaseError(params.error),
  });
}

export interface Discussion {
  id: string;
  submissionId: string;
  author: string;
  authorId?: string;
  authorName?: string;
  authorEmail?: string;
  avatarText?: string;
  authorRole?: string;
  content: string;
  createdAt: string;
  replyTo: string | null;
  parentId?: string | null;
  isEdited?: boolean;
  readBy: string[];
}

function fromDb(row: Record<string, unknown>): Discussion {
  return {
    id: row.id as string,
    submissionId: row.submission_id as string,
    author: row.author as string,
    authorId: row.author_id as string | undefined,
    authorName: row.author_name as string | undefined,
    authorEmail: row.author_email as string | undefined,
    avatarText: row.avatar_text as string | undefined,
    authorRole: row.author_role as string | undefined,
    content: row.content as string,
    createdAt: row.created_at as string,
    replyTo: row.reply_to as string | null,
    parentId: row.parent_id as string | null,
    isEdited: row.is_edited as boolean | undefined,
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
  authorId?: string;
  content: string;
  replyTo?: string | null;
  parentId?: string | null;
  authorName?: string;
  authorEmail?: string;
  avatarText?: string;
  authorRole?: string;
  createdAt?: string;
  isEdited?: boolean;
  readBy?: string[];
}): Promise<Discussion | null> {
  const id = Math.random().toString(36).slice(2) + Date.now().toString(36);
  const insertData: Record<string, unknown> = {
    id,
    submission_id: params.submissionId,
    author: params.author,
    content: params.content,
    reply_to: params.replyTo ?? null,
    read_by: params.readBy ?? [params.author],
    is_edited: params.isEdited ?? false,
  };
  if (params.authorId) insertData.author_id = params.authorId;
  if (params.authorName) insertData.author_name = params.authorName;
  if (params.authorEmail) insertData.author_email = params.authorEmail;
  if (params.avatarText) insertData.avatar_text = params.avatarText;
  if (params.authorRole) insertData.author_role = params.authorRole;
  if (params.parentId !== undefined) insertData.parent_id = params.parentId;
  if (params.createdAt) insertData.created_at = params.createdAt;
  const { data, error } = await supabase.from("discussions").insert(insertData).select().single();
  if (error) {
    console.error("[discussions.addDiscussion] insert error", {
      error: {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
      },
      insertData,
    });
    return null;
  }
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
  const updatePayload = { content, is_edited: true };
  if (!id) {
    const error = new Error("Missing discussion id for update");
    logMutationError("[discussions.editDiscussion] invalid update", {
      table: "discussions",
      targetId: id,
      updatePayload,
      error,
    });
    throw error;
  }

  const { error } = await supabase
    .from("discussions")
    .update(updatePayload)
    .eq("id", id)
    .select("id")
    .single();
  if (error) {
    logMutationError("[discussions.editDiscussion] update error", {
      table: "discussions",
      targetId: id,
      updatePayload,
      error,
    });
    throw error;
  }
}
