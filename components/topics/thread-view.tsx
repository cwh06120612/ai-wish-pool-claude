"use client";

import React, { useEffect, useState, useCallback } from "react";
import { getTopicPosts, addTopicPost, type Topic, type TopicPost } from "@/lib/topics";
import { DepartmentSelector } from "@/components/department-selector";
import { MessageSquare, ArrowLeft, Clock, User, Send, Crown } from "lucide-react";

function getPersonalInfo() {
  try {
    const raw = localStorage.getItem("ai-wish-personal-info");
    if (raw) {
      const info = JSON.parse(raw);
      const deptPath = Array.isArray(info.departmentPath) ? (info.departmentPath as string[]) : [];
      return { name: (info.name as string) ?? "", deptPath, dept: deptPath.join(" > ") };
    }
  } catch {}
  return { name: "", deptPath: [] as string[], dept: "" };
}

function displayDept(dept: string) {
  return dept ? dept.split(" > ").slice(-1)[0] : "";
}

// 從後台登入狀態判斷是否為負責人員（數位創新處）
function getStaffInfo(): { isStaff: boolean; name: string } {
  try {
    const role = sessionStorage.getItem("ai-wish-admin-auth");
    if (role === "editor") return { isStaff: true, name: "管理員" };
    if (role === "team") return { isStaff: true, name: sessionStorage.getItem("ai-wish-admin-assignee") || "負責人員" };
  } catch {}
  return { isStaff: false, name: "" };
}

function StaffBadge() {
  return <span className="inline-flex items-center gap-1 text-[10px] font-bold text-white bg-[#007A87] px-1.5 py-0.5 rounded-full"><Crown size={10} />數位創新處</span>;
}

// 作者顯示：官方回覆顯示「人員 + 數位創新處」，一般同仁顯示「姓名 · 部門」
function PostAuthor({ p }: { p: TopicPost }) {
  if (p.isStaff) {
    const showName = p.authorName && p.authorName !== "數位創新處";
    return <>{showName && <span className="font-semibold text-[#007A87]">{p.authorName}</span>}<StaffBadge /></>;
  }
  return <><span className="font-semibold text-[#2D2D2D]">{p.authorName}</span>{p.authorDept && <span>· {displayDept(p.authorDept)}</span>}</>;
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleString("zh-TW", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function ThreadView({ topic, onBack }: { topic: Topic; onBack: () => void }) {
  const [posts, setPosts] = useState<TopicPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState("");
  const [name, setName] = useState(() => getPersonalInfo().name);
  const [deptPath, setDeptPath] = useState<string[]>(() => getPersonalInfo().deptPath);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [composing, setComposing] = useState(false);
  const [staff] = useState(() => getStaffInfo());
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState("");
  const [replySubmitting, setReplySubmitting] = useState(false);
  const [replyComposing, setReplyComposing] = useState(false);

  const reload = useCallback(async () => {
    setPosts(await getTopicPosts(topic.id));
    setLoading(false);
  }, [topic.id]);

  useEffect(() => {
    reload();
    const timer = setInterval(reload, 20000);
    return () => clearInterval(timer);
  }, [reload]);

  async function handleSubmit() {
    if (composing) return;
    if (!staff.isStaff) {
      if (deptPath.length === 0) { setError("請選一下你的部門"); return; }
      if (!name.trim()) { setError("請填一下你的姓名"); return; }
    }
    if (!content.trim()) { setError("留言不能是空的喔"); return; }
    setSubmitting(true);
    setError("");
    const created = await addTopicPost({
      topicId: topic.id,
      content,
      isStaff: staff.isStaff,
      authorName: staff.isStaff ? staff.name : name,
      authorDept: staff.isStaff ? "" : deptPath.join(" > "),
    });
    setSubmitting(false);
    if (!created) { setError("送出失敗，請稍後再試（可能是資料表尚未建立）"); return; }
    setPosts((prev) => [...prev, created]);
    setContent("");
  }

  async function submitReply(parentId: string) {
    if (replyComposing) return;
    if (!replyContent.trim()) return;
    setReplySubmitting(true);
    const personal = getPersonalInfo();
    const created = await addTopicPost({
      topicId: topic.id,
      content: replyContent,
      parentId,
      isStaff: staff.isStaff,
      authorName: staff.isStaff ? staff.name : personal.name,
      authorDept: staff.isStaff ? "" : personal.dept,
    });
    setReplySubmitting(false);
    if (!created) return;
    setPosts((prev) => [...prev, created]);
    setReplyContent("");
    setReplyingTo(null);
  }

  const topLevel = posts.filter((p) => !p.parentId);
  const repliesByParent = posts.reduce<Record<string, TopicPost[]>>((acc, p) => {
    if (p.parentId) (acc[p.parentId] = acc[p.parentId] ?? []).push(p);
    return acc;
  }, {});

  return (
    <div>
      <button type="button" onClick={onBack}
        className="flex items-center gap-1.5 text-sm text-[#007A87] font-medium hover:text-[#00555E] mb-4">
        <ArrowLeft size={15} />返回主題列表
      </button>

      {/* 主題標頭 — 主色框（主題不可修改） */}
      <div className="bg-[#EFF7F8] border border-[#007A87]/40 rounded-2xl p-5 mb-4">
        <h1 className="text-lg font-bold text-[#007A87] leading-snug">{topic.title}</h1>
        {topic.description && <p className="text-sm text-[#616161] mt-1.5 leading-relaxed whitespace-pre-wrap">{topic.description}</p>}
        <div className="flex items-center gap-x-3 gap-y-1 mt-3 text-xs text-[#9E9E9E] flex-wrap">
          <span className="flex items-center gap-1"><User size={11} />{topic.authorName}{topic.authorDept ? ` · ${displayDept(topic.authorDept)}` : ""}</span>
          <span className="flex items-center gap-1"><Clock size={11} />{fmtTime(topic.createdAt)} 發起</span>
          <span className="flex items-center gap-1"><MessageSquare size={11} />{posts.length} 則留言</span>
        </div>
      </div>

      {/* 留言列表 */}
      {loading ? (
        <div className="py-10 text-center text-sm text-[#9E9E9E]">載入中…</div>
      ) : posts.length === 0 ? (
        <div className="border border-[#E0E0E0]/80 rounded-2xl bg-white px-4 py-8 text-center text-sm text-[#9E9E9E] mb-4">
          還沒有人留言，成為第一個吧！
        </div>
      ) : (
        <div className="space-y-3 mb-4">
          {topLevel.map((p) => {
            const replies = repliesByParent[p.id] ?? [];
            return (
              <div key={p.id} className="bg-white border border-[#E0E0E0]/80 rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-1.5 text-xs text-[#9E9E9E]">
                  <PostAuthor p={p} />
                  <span className="ml-auto flex items-center gap-1"><Clock size={10} />{fmtTime(p.createdAt)}</span>
                </div>
                <p className="text-sm text-[#2D2D2D] leading-relaxed whitespace-pre-wrap">{p.content}</p>

                {/* 回覆串 */}
                {replies.length > 0 && (
                  <div className="mt-3 pl-3 border-l-2 border-[#E0E0E0] space-y-3">
                    {replies.map((r) => (
                      <div key={r.id}>
                        <div className="flex items-center gap-2 mb-1 text-xs text-[#9E9E9E]">
                          <PostAuthor p={r} />
                          <span className="ml-auto flex items-center gap-1"><Clock size={10} />{fmtTime(r.createdAt)}</span>
                        </div>
                        <p className="text-sm text-[#2D2D2D] leading-relaxed whitespace-pre-wrap">{r.content}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* 回覆動作 */}
                {replyingTo === p.id ? (
                  <div className="mt-3 pl-3 border-l-2 border-[#BE8B55]/60">
                    {staff.isStaff && (
                      <div className="flex items-center gap-1.5 mb-1.5 text-xs text-[#00555E]">
                        <StaffBadge />
                        <span>以 <b>{staff.name}</b> 身分回覆</span>
                      </div>
                    )}
                    <textarea rows={2} value={replyContent} autoFocus
                      onChange={(e) => setReplyContent(e.target.value)}
                      onCompositionStart={() => setReplyComposing(true)}
                      onCompositionEnd={(e) => { setReplyComposing(false); setReplyContent(e.currentTarget.value); }}
                      onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && !replyComposing && !e.nativeEvent.isComposing) { e.preventDefault(); submitReply(p.id); } }}
                      placeholder={staff.isStaff ? "以數位創新處身分回覆…（Enter 送出、Shift+Enter 換行）" : "回覆這則留言…（Enter 送出、Shift+Enter 換行）"}
                      className="w-full text-sm border border-[#E0E0E0] rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#BE8B55]/40 resize-none" />
                    <div className="flex items-center justify-end gap-2 mt-1.5">
                      <button type="button" onClick={() => { setReplyingTo(null); setReplyContent(""); }}
                        className="text-xs px-3 py-1.5 rounded-lg border border-[#E0E0E0] text-[#616161] hover:bg-[#F0F4F4] transition-colors">取消</button>
                      <button type="button" onClick={() => submitReply(p.id)} disabled={replySubmitting || replyComposing}
                        className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg bg-[#BE8B55] text-white font-semibold hover:bg-[#8C6A3F] disabled:opacity-50 transition-colors">
                        <Send size={11} />{replySubmitting ? "送出中…" : "送出回覆"}
                      </button>
                    </div>
                  </div>
                ) : (
                  <button type="button" onClick={() => { setReplyingTo(p.id); setReplyContent(""); }}
                    className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-[#616161] bg-[#F0F4F4] hover:bg-[#E4E7E7] hover:text-[#2D2D2D] px-2.5 py-1.5 rounded-lg transition-colors">
                    <MessageSquare size={12} />回覆{staff.isStaff && "（以數位創新處身分）"}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* 留言表單 — 白底 + 副色棕色框，與上方留言區隔 */}
      <div className="bg-white border border-[#BE8B55]/60 rounded-2xl p-4 mt-5">
        <div className="flex items-center gap-1.5 mb-2">
          <Send size={13} className="text-[#BE8B55]" />
          <p className="text-xs font-bold text-[#8C6A3F] uppercase tracking-wider">在這個主題留言</p>
        </div>
        {staff.isStaff && (
          <div className="flex items-center gap-1.5 mb-2 text-xs text-[#00555E]">
            <StaffBadge />
            <span>以 <b>{staff.name}</b> 身分留言</span>
          </div>
        )}
        <textarea rows={3} value={content}
          onChange={(e) => { setContent(e.target.value); if (error) setError(""); }}
          onCompositionStart={() => setComposing(true)}
          onCompositionEnd={(e) => { setComposing(false); setContent(e.currentTarget.value); }}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && !composing && !e.nativeEvent.isComposing) { e.preventDefault(); handleSubmit(); } }}
          placeholder="分享你在使用上的問題、心得或建議…（Enter 送出、Shift+Enter 換行）"
          className="w-full text-sm border border-[#E0E0E0] rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#BE8B55]/40 resize-none mb-2" />
        {!staff.isStaff && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2">
            <div>
              <span className="block text-xs text-[#616161] mb-1">部門</span>
              <DepartmentSelector value={deptPath} onChange={(p) => { setDeptPath(p); if (error) setError(""); }} />
            </div>
            <div>
              <span className="block text-xs text-[#616161] mb-1">姓名</span>
              <input type="text" value={name} onChange={(e) => { setName(e.target.value); if (error) setError(""); }}
                placeholder="請填你的姓名"
                className="w-full text-sm border border-[#E0E0E0] rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#BE8B55]/40" />
            </div>
          </div>
        )}
        <div className="flex items-center justify-between">
          <span className="text-xs text-[#AE1914]">{error}</span>
          <button type="button" onClick={handleSubmit} disabled={submitting || composing}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold bg-[#BE8B55] text-white hover:bg-[#8C6A3F] transition-colors disabled:opacity-50">
            <Send size={13} />{submitting ? "送出中…" : "送出留言"}
          </button>
        </div>
      </div>
    </div>
  );
}
