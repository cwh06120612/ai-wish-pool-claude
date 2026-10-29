"use client";

import React, { useEffect, useState, useCallback } from "react";
import { getTopicPosts, addTopicPost, updateTopicPost, deleteTopicPost, getMyPostIds, type Topic, type TopicPost } from "@/lib/topics";
import { supabase } from "@/lib/supabase";
import { deptLast, identityIsSet, type Identity } from "@/lib/identity";
import { IdentityBar } from "@/components/topics/identity-bar";
import { MessageSquare, ArrowLeft, Clock, User, Send, Crown, Link2, Pencil, ImagePlus, Trash2 } from "lucide-react";
import { Linkify } from "@/components/ui/linkify";
import { Hint } from "@/components/ui/hint";
import { PostImages, PendingImages } from "@/components/topics/post-images";
import { toPendingImages, revokePending, uploadTopicImages, MAX_IMAGES_PER_POST, type PendingImage } from "@/lib/topic-images";

function StaffBadge() {
  return <span className="inline-flex items-center gap-0.5 text-xs font-medium text-[#00555E] bg-[#B5E1E5]/40 px-1.5 py-0.5 rounded-full"><Crown size={10} />數位創新處</span>;
}

// 作者顯示：官方顯示「人員 + 數位創新處」，一般同仁顯示「姓名．部門」
function PostAuthor({ p }: { p: TopicPost }) {
  if (p.isStaff) {
    return (
      <span className="inline-flex items-center gap-1">
        <span className="inline-flex items-center justify-center w-4 h-4 rounded-full border border-[#BDBDBD] flex-shrink-0"><User size={9} className="text-[#9E9E9E]" /></span>
        <span className="font-semibold text-[#007A87]">{p.authorName && p.authorName !== "數位創新處" ? p.authorName : "管理者"}</span>
        <StaffBadge />
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1">
      <span className="inline-flex items-center justify-center w-4 h-4 rounded-full border border-[#BDBDBD] flex-shrink-0"><User size={9} className="text-[#9E9E9E]" /></span>
      <span className="font-semibold text-[#2D2D2D]">{p.authorName}</span>
      {p.authorDept && <span className="text-xs px-1.5 py-0.5 rounded-full bg-[#F0F4F4] text-[#616161] border border-[#E0E0E0]">{deptLast(p.authorDept)}</span>}
    </span>
  );
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleString("zh-TW", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function ThreadView({ topic, identity, staff, onIdentityChange, onBack }: {
  topic: Topic;
  identity: Identity;
  staff: { isStaff: boolean; name: string };
  onIdentityChange: (id: Identity) => void;
  onBack: () => void;
}) {
  const [posts, setPosts] = useState<TopicPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [composing, setComposing] = useState(false);
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [replyBusy, setReplyBusy] = useState<string | null>(null);
  const [composingReplyId, setComposingReplyId] = useState<string | null>(null);
  // localStorage 只能在瀏覽器端讀；留言是載入後才顯示，伺服器端先給空集合不會造成畫面不一致
  const [myPostIds, setMyPostIds] = useState<Set<string>>(() => (typeof window === "undefined" ? new Set() : getMyPostIds()));
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState("");
  const [editBusy, setEditBusy] = useState(false);
  const [editError, setEditError] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  // 待上傳的附圖：key 為 "main"（主留言框）或被回覆留言的 id
  const [pendingImages, setPendingImages] = useState<Record<string, PendingImage[]>>({});
  const [replyErrors, setReplyErrors] = useState<Record<string, string>>({});

  const canPost = staff.isStaff || identityIsSet(identity);

  const reload = useCallback(async () => {
    setPosts(await getTopicPosts(topic.id));
    setLoading(false);
  }, [topic.id]);

  useEffect(() => {
    reload();
    // 後援輪詢（若未開啟 Realtime 仍會更新）
    const timer = setInterval(reload, 20000);
    // 即時訂閱：此主題有新增／修改留言就立刻重抓
    const channel = supabase
      .channel(`topic_posts:${topic.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "topic_posts", filter: `topic_id=eq.${topic.id}` }, () => { reload(); })
      .subscribe();
    return () => { clearInterval(timer); supabase.removeChannel(channel); };
  }, [reload, topic.id]);

  async function handleSubmit() {
    if (composing) return;
    if (!canPost) { setError("請先在上方設定你的部門與姓名"); return; }
    const images = pendingImages.main ?? [];
    if (!content.trim() && images.length === 0) { setError("留言不能是空的喔"); return; }
    setSubmitting(true);
    setError("");
    let imageUrls: string[] = [];
    try {
      imageUrls = await uploadTopicImages(topic.id, images);
    } catch {
      setSubmitting(false);
      setError("圖片上傳失敗，請稍後再試（可能是圖片儲存空間尚未設定）");
      return;
    }
    const created = await addTopicPost({
      topicId: topic.id,
      content,
      imageUrls,
      isStaff: staff.isStaff,
      authorName: staff.isStaff ? staff.name : identity.name.trim(),
      authorDept: staff.isStaff ? "" : identity.deptPath.join(" > "),
    });
    setSubmitting(false);
    if (!created) { setError("送出失敗，請稍後再試（可能是資料表尚未建立）"); return; }
    setPosts((prev) => [...prev, created]);
    setMyPostIds((prev) => new Set(prev).add(created.id));
    setContent("");
    clearImages("main");
  }

  async function submitReply(parentId: string) {
    if (composingReplyId === parentId) return;
    if (!canPost) return;
    const text = (replyDrafts[parentId] ?? "").trim();
    const images = pendingImages[parentId] ?? [];
    if (!text && images.length === 0) return;
    setReplyBusy(parentId);
    setReplyError(parentId, "");
    let imageUrls: string[] = [];
    try {
      imageUrls = await uploadTopicImages(topic.id, images);
    } catch {
      setReplyBusy(null);
      setReplyError(parentId, "圖片上傳失敗，請稍後再試");
      return;
    }
    const created = await addTopicPost({
      topicId: topic.id,
      content: text,
      imageUrls,
      parentId,
      isStaff: staff.isStaff,
      authorName: staff.isStaff ? staff.name : identity.name.trim(),
      authorDept: staff.isStaff ? "" : identity.deptPath.join(" > "),
    });
    setReplyBusy(null);
    if (!created) { setReplyError(parentId, "送出失敗，請稍後再試"); return; }
    setPosts((prev) => [...prev, created]);
    setMyPostIds((prev) => new Set(prev).add(created.id));
    setReplyDrafts((prev) => ({ ...prev, [parentId]: "" }));
    clearImages(parentId);
  }

  function setReplyError(parentId: string, msg: string) {
    setReplyErrors((prev) => ({ ...prev, [parentId]: msg }));
  }

  // 加入附圖（選檔或貼上），超過張數上限的部分不收
  function addImages(key: string, files: File[]) {
    const incoming = toPendingImages(files);
    if (incoming.length === 0) return;
    const current = pendingImages[key] ?? [];
    const room = Math.max(MAX_IMAGES_PER_POST - current.length, 0);
    const accepted = incoming.slice(0, room);
    revokePending(incoming.slice(room));
    const msg = accepted.length < incoming.length ? `每則最多 ${MAX_IMAGES_PER_POST} 張圖片` : "";
    if (key === "main") setError(msg); else setReplyError(key, msg);
    if (accepted.length > 0) setPendingImages((prev) => ({ ...prev, [key]: [...(prev[key] ?? []), ...accepted] }));
  }

  function removeImage(key: string, id: string) {
    const target = (pendingImages[key] ?? []).find((img) => img.id === id);
    if (target) revokePending([target]);
    setPendingImages((prev) => ({ ...prev, [key]: (prev[key] ?? []).filter((img) => img.id !== id) }));
  }

  function clearImages(key: string) {
    revokePending(pendingImages[key] ?? []);
    setPendingImages((prev) => ({ ...prev, [key]: [] }));
  }

  // 在輸入框貼上截圖時直接當附圖
  function handlePaste(key: string, e: React.ClipboardEvent<HTMLTextAreaElement>) {
    const files = Array.from(e.clipboardData.files);
    if (files.some((f) => f.type.startsWith("image/"))) {
      e.preventDefault();
      addImages(key, files);
    }
  }

  // 選圖按鈕（label 包住隱藏的 file input）
  function renderImagePicker(key: string, small?: boolean) {
    const full = (pendingImages[key] ?? []).length >= MAX_IMAGES_PER_POST;
    return (
      <Hint text={full ? `每則最多 ${MAX_IMAGES_PER_POST} 張圖片` : "附加圖片（也可以直接貼上截圖）"} className="flex-shrink-0 flex">
      <label
        className={`flex items-center gap-1 rounded-lg border border-[#E0E0E0] text-[#616161] transition-colors ${small ? "text-xs px-2.5 py-2" : "text-sm px-3 py-2"} ${!canPost || full ? "opacity-40 pointer-events-none" : "cursor-pointer hover:border-[#BE8B55]/60 hover:text-[#8C6A3F]"}`}>
        <ImagePlus size={small ? 13 : 14} />{!small && "圖片"}
        <input type="file" accept="image/*" multiple className="hidden" disabled={!canPost || full}
          onChange={(e) => { addImages(key, Array.from(e.target.files ?? [])); e.target.value = ""; }} />
      </label>
      </Hint>
    );
  }

  function startEdit(p: TopicPost) {
    setEditingId(p.id);
    setEditDraft(p.content);
    setEditError("");
  }

  async function saveEdit() {
    if (!editingId) return;
    const editing = posts.find((p) => p.id === editingId);
    if (editing && clearsText(editing)) return;
    setEditBusy(true);
    setEditError("");
    try {
      const updated = await updateTopicPost(editingId, editDraft);
      setPosts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
      setEditingId(null);
    } catch {
      setEditError("儲存失敗，請稍後再試");
    } finally {
      setEditBusy(false);
    }
  }

  async function confirmDelete(id: string) {
    setDeleteBusy(true);
    setDeleteError("");
    try {
      await deleteTopicPost(id);
      setPosts((prev) => prev.filter((p) => p.id !== id && p.parentId !== id));
      setConfirmDeleteId(null);
    } catch {
      setDeleteError("刪除失敗，請稍後再試");
    } finally {
      setDeleteBusy(false);
    }
  }

  function closeDeleteDialog() {
    if (!deleteBusy) setConfirmDeleteId(null);
  }

  // 刪除確認視窗開著時，按 Esc 關閉
  useEffect(() => {
    if (!confirmDeleteId) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape" && !deleteBusy) setConfirmDeleteId(null); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [confirmDeleteId, deleteBusy]);

  // 編輯時不能把文字清空；只有原本就是純圖片的留言，文字可以維持空白
  function clearsText(p: TopicPost) {
    return !editDraft.trim() && (p.content.trim() !== "" || p.imageUrls.length === 0);
  }

  // 時間＋「已編輯」標記＋自己留言的「編輯」「刪除」按鈕
  function renderMeta(p: TopicPost) {
    // 不能刪的情況：
    // - 主留言已有回覆：刪掉時底下別人的回覆會一起被刪
    // - 回覆只有一層，後面的回覆可能是在回這一則，所以只有最新一則回覆能刪
    const blockedReason = !p.parentId
      ? (posts.some((x) => x.parentId === p.id) ? "已有人回覆，無法刪除" : "")
      : (posts.some((x) => x.parentId === p.parentId && x.createdAt > p.createdAt) ? "後面已有新的回覆，只能刪除最新一則" : "");
    return (
      <span className="ml-auto flex items-center gap-2">
        {myPostIds.has(p.id) && editingId !== p.id && (
            <>
              {/* 只放圖示，滑過顯示文字提示 */}
              <Hint text="編輯" className="flex">
                <button type="button" onClick={() => startEdit(p)} aria-label="編輯"
                  className="grid place-items-center w-6 h-6 rounded-md border border-[#007A87]/30 bg-[#EFF7F8] text-[#007A87] hover:bg-[#B5E1E5]/50 hover:text-[#00555E] transition-colors">
                  <Pencil size={12} />
                </button>
              </Hint>
              {blockedReason ? (
                <Hint text={blockedReason} className="grid place-items-center w-6 h-6 rounded-md border border-[#E0E0E0] bg-[#F5F5F5] text-[#BDBDBD] cursor-not-allowed">
                  <Trash2 size={12} />
                </Hint>
              ) : (
                <Hint text="刪除" className="flex">
                  <button type="button" onClick={() => { setConfirmDeleteId(p.id); setDeleteError(""); }} aria-label="刪除"
                    className="grid place-items-center w-6 h-6 rounded-md border border-[#AE1914]/30 bg-[#EBCDCC]/30 text-[#AE1914] hover:bg-[#EBCDCC]/60 transition-colors">
                    <Trash2 size={12} />
                  </button>
                </Hint>
              )}
            </>
        )}
        <span className="flex items-center gap-1"><Clock size={10} />{fmtTime(p.createdAt)}{p.updatedAt && <Hint text={`修改於 ${fmtTime(p.updatedAt)}`}>・已編輯</Hint>}</span>
      </span>
    );
  }

  // 內文；編輯中改成輸入框。Enter 只換行、要按「儲存」才會送出，避免又不小心送出
  function renderContent(p: TopicPost) {
    if (editingId !== p.id) {
      return (
        <>
          {p.content && <p className="text-sm text-[#2D2D2D] leading-relaxed whitespace-pre-wrap"><Linkify text={p.content} /></p>}
          <PostImages urls={p.imageUrls} />
        </>
      );
    }
    return (
      <div>
        <textarea rows={3} value={editDraft} autoFocus
          onChange={(e) => { setEditDraft(e.target.value); if (editError) setEditError(""); }}
          onKeyDown={(e) => { if (e.key === "Escape") setEditingId(null); }}
          className="w-full text-sm border border-[#E0E0E0] rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#007A87]/30 resize-none" />
        <div className="flex items-center justify-end gap-2 mt-1.5">
          <span className="mr-auto text-xs text-[#AE1914]">{clearsText(p) ? "留言內容不能清空" : editError}</span>
          <button type="button" onClick={() => setEditingId(null)} disabled={editBusy}
            className="text-xs px-3 py-1.5 rounded-lg border border-[#E0E0E0] text-[#616161] hover:bg-[#F5F5F5]">
            取消
          </button>
          <button type="button" onClick={saveEdit} disabled={editBusy || clearsText(p)}
            className="text-xs px-3 py-1.5 rounded-lg bg-[#007A87] text-white font-semibold hover:bg-[#00555E] disabled:opacity-40">
            儲存
          </button>
        </div>
        <PostImages urls={p.imageUrls} />
      </div>
    );
  }

  const topLevel = posts.filter((p) => !p.parentId);
  const deleteTarget = confirmDeleteId ? posts.find((p) => p.id === confirmDeleteId) ?? null : null;
  const repliesByParent = posts.reduce<Record<string, TopicPost[]>>((acc, p) => {
    if (p.parentId) (acc[p.parentId] = acc[p.parentId] ?? []).push(p);
    return acc;
  }, {});

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <button type="button" onClick={onBack}
          className="flex items-center gap-1.5 text-sm text-[#007A87] font-medium hover:text-[#00555E]">
          <ArrowLeft size={15} />返回主題列表
        </button>
        <IdentityBar identity={identity} staff={staff} onChange={onIdentityChange} />
      </div>

      {/* 主題標頭 — 主色框（主題不可修改） */}
      <div className="bg-[#EFF7F8] border border-[#007A87]/40 rounded-2xl p-5 mb-4">
        {topic.submissionId && (
          <div className="mb-2">
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#00555E] bg-[#B5E1E5]/50 px-2 py-0.5 rounded-full"><Link2 size={11} />來自公告欄需求</span>
          </div>
        )}
        <h1 className="text-lg font-bold text-[#007A87] leading-snug">{topic.title}</h1>
        {topic.description && <p className="text-sm text-[#616161] mt-1.5 leading-relaxed whitespace-pre-wrap"><Linkify text={topic.description} /></p>}
        <div className="flex items-center gap-x-3 gap-y-1 mt-3 text-xs text-[#9E9E9E] flex-wrap">
          <span className="flex items-center gap-1">
            <span className="inline-flex items-center justify-center w-4 h-4 rounded-full border border-[#BDBDBD] flex-shrink-0"><User size={9} className="text-[#9E9E9E]" /></span>
            <span className={topic.isStaff ? "font-semibold text-[#007A87]" : ""}>{topic.isStaff ? (topic.authorName && topic.authorName !== "數位創新處" ? topic.authorName : "管理者") : topic.authorName}</span>
            {!topic.isStaff && topic.authorDept && <span className="text-xs px-1.5 py-0.5 rounded-full bg-[#F0F4F4] text-[#616161] border border-[#E0E0E0]">{deptLast(topic.authorDept)}</span>}
            {topic.isStaff && <span className="inline-flex items-center gap-0.5 text-xs font-medium text-[#00555E] bg-[#B5E1E5]/40 px-1.5 py-0.5 rounded-full whitespace-nowrap"><Crown size={10} />數位創新處</span>}
          </span>
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
                  {renderMeta(p)}
                </div>
                {renderContent(p)}

                {/* 回覆串 */}
                {replies.length > 0 && (
                  <div className="mt-3 pl-3 border-l-2 border-[#E0E0E0] space-y-3">
                    {replies.map((r) => (
                      <div key={r.id}>
                        <div className="flex items-center gap-2 mb-1 text-xs text-[#9E9E9E]">
                          <PostAuthor p={r} />
                          {renderMeta(r)}
                        </div>
                        {renderContent(r)}
                      </div>
                    ))}
                  </div>
                )}

                {/* 回覆框（直接顯示；身分用上方設定的統一身分）*/}
                <div className="mt-3 pl-3 border-l-2 border-[#BE8B55]/60">
                  <PendingImages images={pendingImages[p.id] ?? []} onRemove={(id) => removeImage(p.id, id)} />
                  <div className="flex items-end gap-2">
                    <textarea rows={1} value={replyDrafts[p.id] ?? ""} disabled={!canPost}
                      onChange={(e) => setReplyDrafts((prev) => ({ ...prev, [p.id]: e.target.value }))}
                      onCompositionStart={() => setComposingReplyId(p.id)}
                      onCompositionEnd={(e) => { setComposingReplyId(null); const v = e.currentTarget.value; setReplyDrafts((prev) => ({ ...prev, [p.id]: v })); }}
                      onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && composingReplyId !== p.id && !e.nativeEvent.isComposing) { e.preventDefault(); submitReply(p.id); } }}
                      onPaste={(e) => handlePaste(p.id, e)}
                      placeholder={!canPost ? "請先在上方設定身分" : staff.isStaff ? "以數位創新處身分回覆…（Enter 送出）" : "回覆這則留言…（Enter 送出）"}
                      className="flex-1 text-sm border border-[#E0E0E0] rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#BE8B55]/40 resize-none disabled:bg-[#F5F5F5]" />
                    {renderImagePicker(p.id, true)}
                    <button type="button" onClick={() => submitReply(p.id)} disabled={replyBusy === p.id || (!(replyDrafts[p.id] ?? "").trim() && !(pendingImages[p.id] ?? []).length) || !canPost}
                      className="flex-shrink-0 flex items-center gap-1 text-xs px-3 py-2 rounded-lg bg-[#BE8B55] text-white font-semibold hover:bg-[#8C6A3F] disabled:opacity-40 transition-colors">
                      <Send size={12} />送出
                    </button>
                  </div>
                  {replyErrors[p.id] && <p className="text-xs text-[#AE1914] mt-1">{replyErrors[p.id]}</p>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 留言表單 — 白底 + 副色棕色框 */}
      <div className="bg-white border border-[#BE8B55]/60 rounded-2xl p-4 mt-5">
        <div className="flex items-center gap-1.5 mb-2">
          <Send size={13} className="text-[#BE8B55]" />
          <p className="text-xs font-bold text-[#8C6A3F] uppercase tracking-wider">在這個主題留言</p>
        </div>
        <textarea rows={3} value={content} disabled={!canPost}
          onChange={(e) => { setContent(e.target.value); if (error) setError(""); }}
          onCompositionStart={() => setComposing(true)}
          onCompositionEnd={(e) => { setComposing(false); setContent(e.currentTarget.value); }}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && !composing && !e.nativeEvent.isComposing) { e.preventDefault(); handleSubmit(); } }}
          onPaste={(e) => handlePaste("main", e)}
          placeholder={!canPost ? "請先在上方設定你的部門與姓名，即可留言" : "分享你在使用上的問題、心得或建議…（Enter 送出、Shift+Enter 換行，可直接貼上截圖）"}
          className="w-full text-sm border border-[#E0E0E0] rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#BE8B55]/40 resize-none mb-2 disabled:bg-[#F5F5F5]" />
        <PendingImages images={pendingImages.main ?? []} onRemove={(id) => removeImage("main", id)} />
        <div className="flex items-center gap-2">
          <span className="mr-auto text-xs text-[#AE1914]">{error}</span>
          {renderImagePicker("main")}
          <button type="button" onClick={handleSubmit} disabled={submitting || composing || !canPost}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold bg-[#BE8B55] text-white hover:bg-[#8C6A3F] transition-colors disabled:opacity-50">
            <Send size={13} />送出留言
          </button>
        </div>
      </div>

      {/* 刪除確認視窗 */}
      {deleteTarget && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center px-4" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={closeDeleteDialog} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <div className="flex items-start gap-3 mb-4">
              <span className="grid place-items-center w-9 h-9 rounded-full bg-[#EBCDCC]/50 text-[#AE1914] flex-shrink-0"><Trash2 size={16} /></span>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-bold text-[#2D2D2D]">確定刪除這則留言？</h3>
                <p className="text-xs text-[#9E9E9E] mt-1">刪除後無法復原，附的圖片也會一起刪除。</p>
              </div>
            </div>
            {(deleteTarget.content || deleteTarget.imageUrls.length > 0) && (
              <div className="text-xs text-[#616161] bg-[#F5F5F5] rounded-lg px-3 py-2 mb-4 line-clamp-3 whitespace-pre-wrap">
                {deleteTarget.content || `（${deleteTarget.imageUrls.length} 張圖片）`}
              </div>
            )}
            {deleteError && <p className="text-xs text-[#AE1914] mb-3">{deleteError}</p>}
            <div className="flex justify-end gap-2">
              <button type="button" onClick={closeDeleteDialog} disabled={deleteBusy}
                className="text-sm px-4 py-2 rounded-lg border border-[#E0E0E0] text-[#616161] hover:bg-[#F5F5F5] disabled:opacity-50 transition-colors">
                取消
              </button>
              <button type="button" onClick={() => confirmDelete(deleteTarget.id)} disabled={deleteBusy}
                className="text-sm px-4 py-2 rounded-lg bg-[#AE1914] text-white font-semibold hover:bg-[#8C1915] disabled:opacity-50 transition-colors">
                刪除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
