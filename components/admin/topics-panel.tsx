"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
  getTopics, getTopicStats, getTopicPosts, deleteTopic, deleteTopicPost,
  type Topic, type TopicPost, type TopicStat,
} from "@/lib/topics";
import { Trash2, ChevronDown, ChevronRight, MessagesSquare, MessageSquare, Clock, CornerDownRight, Crown } from "lucide-react";

function fmtTime(iso: string) {
  return new Date(iso).toLocaleString("zh-TW", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" });
}
function displayDept(dept: string) {
  return dept ? dept.split(" > ").slice(-1)[0] : "";
}

export function TopicsPanel({ canEdit }: { canEdit: boolean }) {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [stats, setStats] = useState<Record<string, TopicStat>>({});
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [postsByTopic, setPostsByTopic] = useState<Record<string, TopicPost[]>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [confirmTopic, setConfirmTopic] = useState<string | null>(null);
  const [confirmPost, setConfirmPost] = useState<string | null>(null);
  const [actionError, setActionError] = useState("");

  const reload = useCallback(async () => {
    const [ts, st] = await Promise.all([getTopics(), getTopicStats()]);
    setTopics(ts);
    setStats(st);
    setLoading(false);
  }, []);

  useEffect(() => { reload(); }, [reload]);

  async function toggleExpand(id: string) {
    if (expanded === id) { setExpanded(null); return; }
    setExpanded(id);
    if (!postsByTopic[id]) {
      const posts = await getTopicPosts(id);
      setPostsByTopic((prev) => ({ ...prev, [id]: posts }));
    }
  }

  async function removeTopic(id: string) {
    setBusy(id);
    setActionError("");
    try {
      await deleteTopic(id);
      setTopics((prev) => prev.filter((t) => t.id !== id));
      if (expanded === id) setExpanded(null);
    } catch {
      setActionError("刪除主題失敗，請確認 Supabase 已建立 topics 的 delete 權限（policy）。");
    } finally { setBusy(null); setConfirmTopic(null); }
  }

  async function removePost(topicId: string, postId: string) {
    setBusy(postId);
    setActionError("");
    try {
      await deleteTopicPost(postId);
      // 同時移除其底下的回覆（DB 會 cascade，本地也一併移除）
      setPostsByTopic((prev) => ({
        ...prev,
        [topicId]: (prev[topicId] ?? []).filter((p) => p.id !== postId && p.parentId !== postId),
      }));
      reload();
    } catch {
      setActionError("刪除留言失敗，請確認 Supabase 已建立 topic_posts 的 delete 權限（policy）。");
    } finally { setBusy(null); setConfirmPost(null); }
  }

  if (loading) return <div className="py-16 text-center text-sm text-[#9E9E9E]">載入中…</div>;

  if (topics.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
        <div className="w-12 h-12 rounded-full bg-[#F5F5F5] flex items-center justify-center mb-4">
          <MessagesSquare size={20} className="text-[#9E9E9E]" />
        </div>
        <h3 className="text-sm font-medium text-[#424242]">還沒有任何主題</h3>
        <p className="mt-1 text-sm text-[#9E9E9E] whitespace-nowrap">同仁在「主題討論」開主題後，會顯示在這裡。</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-4 text-sm text-[#9E9E9E]">
        <MessagesSquare size={15} className="text-[#007A87]" />
        共 <span className="font-bold text-[#2D2D2D]">{topics.length}</span> 個主題
      </div>

      {actionError && (
        <div className="mb-3 text-sm text-[#AE1914] bg-[#EBCDCC]/30 border border-[#AE1914]/30 rounded-xl px-4 py-2.5">{actionError}</div>
      )}

      <div className="space-y-3">
        {topics.map((t) => {
          const st = stats[t.id];
          const isOpen = expanded === t.id;
          const posts = postsByTopic[t.id] ?? [];
          return (
            <div key={t.id} className="border border-[#E0E0E0]/80 rounded-xl bg-white overflow-hidden">
              <div className="flex items-start gap-3 p-4">
                <button type="button" onClick={() => toggleExpand(t.id)} className="flex-1 min-w-0 text-left flex items-start gap-2">
                  {isOpen ? <ChevronDown size={16} className="text-[#9E9E9E] flex-shrink-0 mt-0.5" /> : <ChevronRight size={16} className="text-[#9E9E9E] flex-shrink-0 mt-0.5" />}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[#2D2D2D] leading-snug">{t.title}</p>
                    {t.description && <p className="text-xs text-[#616161] mt-0.5 line-clamp-1">{t.description}</p>}
                    <div className="flex items-center gap-x-3 mt-1 text-[11px] text-[#9E9E9E] flex-wrap">
                      <span className="inline-flex items-center gap-1">
                        {t.authorName}{!t.isStaff && t.authorDept ? ` · ${displayDept(t.authorDept)}` : ""}
                        {t.isStaff && <span className="inline-flex items-center gap-0.5 text-[#9E9E9E] font-medium"><Crown size={10} className="text-[#FFAE00]" />數位創新處</span>}
                      </span>
                      <span className="flex items-center gap-1"><MessageSquare size={10} />{st?.count ?? 0} 則留言</span>
                      <span className="flex items-center gap-1"><Clock size={10} />{fmtTime(t.createdAt)} 發起</span>
                    </div>
                  </div>
                </button>
                {canEdit && (
                  confirmTopic === t.id ? (
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button type="button" onClick={() => removeTopic(t.id)} disabled={busy === t.id}
                        className="text-xs px-2 py-1.5 rounded-lg bg-[#AE1914] text-white hover:bg-[#8C1915] disabled:opacity-50 transition-colors">刪主題</button>
                      <button type="button" onClick={() => setConfirmTopic(null)}
                        className="text-xs px-2 py-1.5 rounded-lg border border-[#E0E0E0] text-[#616161] hover:bg-[#F0F4F4] transition-colors">取消</button>
                    </div>
                  ) : (
                    <button type="button" onClick={() => setConfirmTopic(t.id)}
                      className="p-1.5 rounded-lg border border-[#E0E0E0] text-[#616161] hover:border-[#AE1914]/50 hover:text-[#AE1914] hover:bg-[#EBCDCC]/20 transition-colors flex-shrink-0">
                      <Trash2 size={14} />
                    </button>
                  )
                )}
              </div>

              {isOpen && (
                <div className="border-t border-[#F0F4F4] px-4 py-3 bg-[#FBFBFA]">
                  {posts.length === 0 ? (
                    <p className="text-xs text-[#9E9E9E] py-2 text-center">此主題還沒有留言</p>
                  ) : (
                    <div className="space-y-2.5">
                      {posts.map((p) => (
                        <div key={p.id} className={`flex items-start gap-2 ${p.parentId ? "pl-5" : ""}`}>
                          {p.parentId && <CornerDownRight size={12} className="text-[#BDBDBD] flex-shrink-0 mt-1" />}
                          <div className="flex-1 min-w-0 bg-white border border-[#E0E0E0]/70 rounded-lg px-3 py-2">
                            <div className="flex items-center gap-2 mb-0.5 text-[11px] text-[#9E9E9E]">
                              <span className={`font-semibold ${p.isStaff ? "text-[#007A87]" : "text-[#2D2D2D]"}`}>{p.authorName}</span>
                              {p.isStaff && <span className="inline-flex items-center gap-0.5 text-[9px] font-medium text-[#9E9E9E]"><Crown size={10} className="text-[#FFAE00]" />數位創新處</span>}
                              <span className="ml-auto">{fmtTime(p.createdAt)}</span>
                            </div>
                            <p className="text-sm text-[#2D2D2D] leading-relaxed whitespace-pre-wrap">{p.content}</p>
                          </div>
                          {canEdit && (
                            confirmPost === p.id ? (
                              <div className="flex flex-col gap-1 flex-shrink-0">
                                <button type="button" onClick={() => removePost(t.id, p.id)} disabled={busy === p.id}
                                  className="text-[11px] px-2 py-1 rounded-lg bg-[#AE1914] text-white hover:bg-[#8C1915] disabled:opacity-50 transition-colors">刪除</button>
                                <button type="button" onClick={() => setConfirmPost(null)}
                                  className="text-[11px] px-2 py-1 rounded-lg border border-[#E0E0E0] text-[#616161] hover:bg-[#F0F4F4] transition-colors">取消</button>
                              </div>
                            ) : (
                              <button type="button" onClick={() => setConfirmPost(p.id)}
                                className="p-1.5 rounded-lg border border-[#E0E0E0] text-[#616161] hover:border-[#AE1914]/50 hover:text-[#AE1914] hover:bg-[#EBCDCC]/20 transition-colors flex-shrink-0">
                                <Trash2 size={13} />
                              </button>
                            )
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
