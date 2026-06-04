"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { X, CornerDownRight, Send, Pencil, Trash2, User } from "lucide-react";
import { getDiscussions, addDiscussion, markRead, deleteDiscussion, editDiscussion, Discussion } from "@/lib/discussions";
import { updateSubmissionAsync } from "@/lib/storage";
import { getCurrentUserDisplayInfo, CurrentUserInfo } from "@/lib/user";
import { useImeInput } from "@/lib/use-ime-input";
import type { AdminRole } from "@/components/admin/admin-auth";
import type { Submission } from "@/types/submission";

interface Props {
  submission: Submission;
  author: string;
  role: AdminRole;
  personKey: string;
  onClose: () => void;
  onAdminNoteChange?: (newNote: string) => void;
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleString("zh-TW", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
}
const getAvatarColor = (n?: string) => n === "管理者" ? "#007A87" : n ? "#BE8B55" : "#9E9E9E";

function parseNotes(note: string) {
  if (!note?.trim()) return [];
  return note.split(/(?=\[.+? \d{4}\/\d{2}\/\d{2}.+?\] )/).filter(Boolean).map((line, i) => {
    const m = line.match(/^\[(.+?) (\d{4}\/\d{2}\/\d{2}.+?)\] ([\s\S]+)$/);
    if (!m) return { id: `n${i}`, author: "", datetime: "", content: line.trim(), raw: line };
    return { id: `n${i}`, author: m[1], datetime: m[2], content: m[3].trim(), raw: line };
  });
}

function getAvatarText(name?: string) {
  const trimmed = name?.trim();
  if (!trimmed || trimmed === "?") return undefined;
  if (trimmed === "管理者") return "管";
  const chineseChars = Array.from(trimmed).filter(ch => /[\u4e00-\u9fff]/.test(ch));
  if (chineseChars.length > 0) {
    return chineseChars.length >= 2 ? chineseChars.slice(-2).join("") : chineseChars[0];
  }
  const normalized = trimmed.includes("@") ? trimmed.split("@")[0] : trimmed;
  const words = normalized.split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return normalized.slice(0, 2).toUpperCase();
}

function getDisplayName(name?: string, email?: string) {
  const trimmed = name?.trim();
  if (trimmed && trimmed !== "?") return trimmed;
  if (email?.trim()) return email.trim().split("@")[0];
  return "未綁定帳號";
}

function getDiscussionAuthor(info: { author?: string; authorName?: string; authorEmail?: string; avatarText?: string; authorRole?: string }) {
  if (info.authorRole === "admin") {
    return {
      rawAuthor: "",
      displayName: "管理者",
      avatarText: "管",
    };
  }

  const rawAuthor = info.author?.trim();
  const candidateName = [info.authorName?.trim(), rawAuthor, info.authorEmail?.trim()?.split("@")[0]].find(v => v && v !== "?") ?? "";
  const displayName = candidateName || "未綁定帳號";
  const avatarText = info.avatarText || getAvatarText(candidateName || info.authorEmail);
  if (!candidateName) {
    console.warn("[DiscussionDrawer] discussion item missing authorName/author/authorEmail metadata");
  }
  return {
    rawAuthor: rawAuthor || "",
    displayName,
    avatarText,
  };
}

export function DiscussionDrawer({ submission: s, author, role, personKey, onClose, onAdminNoteChange }: Props) {
  const [msgs, setMsgs] = useState<Discussion[]>([]);
  const [notes, setNotes] = useState(() => parseNotes(s.adminNote || ""));
  const inputIme = useImeInput("");
  const [replyTo, setReplyTo] = useState<{ id: string; author: string; content: string } | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [editVal, setEditVal] = useState("");
  const [delId, setDelId] = useState<string | null>(null);
  const [editNoteI, setEditNoteI] = useState<number | null>(null);
  const [editNoteVal, setEditNoteVal] = useState("");
  const [delNoteI, setDelNoteI] = useState<number | null>(null);
  const [currentUser, setCurrentUser] = useState<CurrentUserInfo | null>(null);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    const data = await getDiscussions(s.id);
    setMsgs(data);
    const unread = data.filter(m => !m.readBy.includes(personKey)).map(m => m.id);
    if (unread.length) await markRead(unread, personKey);
  }, [s.id, personKey]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100); }, [msgs]);

  useEffect(() => {
    let mounted = true;
    getCurrentUserDisplayInfo()
      .then(user => { if (mounted) setCurrentUser(user); })
      .catch(error => { console.error("[DiscussionDrawer] failed to load user info", error); });
    return () => { mounted = false; };
  }, []);

  async function send() {
    const t = inputIme.value.trim();
    if (!t) return;
    const isAdmin = role === "editor";
    const isOwner = role === "team";
    if (!isAdmin && !isOwner) {
      setSendError("無法確認目前身份，請重新登入");
      return;
    }
    setSending(true);
    setSendError("");
    const rid = replyTo?.id ?? null;
    const authorName = isAdmin ? "管理者" : author;
    const authorAvatarText = isAdmin ? "管" : getAvatarText(author);
    const authorRole = isAdmin ? "admin" : "owner";
    try {
      const result = await addDiscussion({
        submissionId: s.id,
        author: authorName,
        authorId: isOwner ? currentUser?.userId : undefined,
        authorName,
        authorEmail: isOwner ? currentUser?.email : undefined,
        avatarText: authorAvatarText,
        authorRole,
        content: t,
        replyTo: rid,
        parentId: rid,
        createdAt: new Date().toISOString(),
        isEdited: false,
        readBy: [authorName],
      });
      if (!result) {
        setSendError("留言送出失敗：伺服器回應錯誤，請稍後再試");
        return;
      }
      inputIme.syncValue("");
      setReplyTo(null);
      await load();
    } catch (error) {
      console.error("[DiscussionDrawer] send failed", error);
      setSendError(error instanceof Error ? `留言送出失敗：${error.message}` : "留言送出失敗：未知錯誤");
    } finally {
      setSending(false);
    }
  }

  async function saveEdit(id: string) {
    const t = editVal.trim();
    if (!t) return;
    setMsgs(p => p.map(m => m.id === id ? { ...m, content: t } : m));
    setEditId(null); setEditVal("");
    await editDiscussion(id, t);
  }

  async function doDelete(id: string) {
    setMsgs(p => p.filter(m => m.id !== id && m.replyTo !== id));
    setDelId(null);
    await deleteDiscussion(id);
  }

  async function saveNoteEdit(idx: number) {
    const t = editNoteVal.trim();
    if (!t) return;
    const arr = [...notes];
    const item = arr[idx];
    const raw = `[${item.author} ${item.datetime}] ${t}`;
    arr[idx] = { ...item, content: t, raw };
    const newNote = arr.map(n => n.raw).join("\n");
    setNotes(arr); setEditNoteI(null); setEditNoteVal("");
    onAdminNoteChange?.(newNote);
    await updateSubmissionAsync(s.id, { adminNote: newNote });
  }

  async function doDeleteNote(idx: number) {
    const arr = notes.filter((_, j) => j !== idx);
    const newNote = arr.map(n => n.raw).join("\n");
    setNotes(arr); setDelNoteI(null);
    onAdminNoteChange?.(newNote);
    await updateSubmissionAsync(s.id, { adminNote: newNote });
  }

  function Av({ name, avatarText }: { name?: string; avatarText?: string }) {
    return (
      <div className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0 mt-0.5"
        style={{ backgroundColor: getAvatarColor(name) }}>
        {avatarText ? avatarText : <User size={12} className="text-white" />}
      </div>
    );
  }

  function Actions({ isMe, canEdit, onReply, onEdit, onDelete }: {
    isMe: boolean; canEdit: boolean;
    onReply: () => void; onEdit: () => void; onDelete: () => void;
  }) {
    return (
      <div className={`flex items-center gap-2 mt-0.5 px-1 ${isMe ? "flex-row-reverse" : ""}`}>
        <button onClick={onReply} className="text-[9px] text-[#9CA3AF] hover:text-[#007A87] flex items-center gap-0.5 transition-colors">
          <CornerDownRight size={9} />回覆
        </button>
        {canEdit && <>
          <button onClick={onEdit} className="text-[9px] text-[#9CA3AF] hover:text-[#007A87] transition-colors"><Pencil size={9} /></button>
          <button onClick={onDelete} className="text-[9px] text-[#9CA3AF] hover:text-[#AE1914] transition-colors"><Trash2 size={9} /></button>
        </>}
      </div>
    );
  }

  function ConfirmDelete({ onConfirm, onCancel, label }: { onConfirm: () => void; onCancel: () => void; label?: string }) {
    return (
      <div className="bg-[#FDF2F2] border border-[#EBCDCC] rounded-2xl px-3 py-2.5 text-xs">
        <p className="text-[#AE1914] mb-2">{label || "確定刪除？"}</p>
        <div className="flex gap-2">
          <button onClick={onConfirm} className="px-3 py-1 bg-[#AE1914] text-white rounded-lg hover:bg-[#8B1410]">確定</button>
          <button onClick={onCancel} className="px-3 py-1 border border-[#E0E0E0] rounded-lg hover:bg-[#F5F5F5]">取消</button>
        </div>
      </div>
    );
  }

  function EditInput({ val, setVal, onSave, onCancel, editKey }: { val: string; setVal: (v: string) => void; onSave: () => void; onCancel: () => void; editKey: string }) {
    const editIme = useImeInput(val);

    const handleSave = () => {
      setVal(editIme.value);
      onSave();
    };

    return (
      <div className="space-y-1.5 w-full">
        <textarea key={editKey} rows={2}
          value={editIme.draft}
          onChange={editIme.inputProps.onChange}
          onCompositionStart={editIme.inputProps.onCompositionStart}
          onCompositionEnd={editIme.inputProps.onCompositionEnd}
          onKeyDown={e => {
            if (editIme.isComposing(e)) return;
            if (e.key === "Enter") {
              e.preventDefault();
              handleSave();
            }
          }}
          className="w-full text-xs border border-[#007A87] rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#007A87]/30 resize-none bg-white"
          autoFocus
          onFocus={e => { const len = e.target.value.length; e.target.setSelectionRange(len, len); }}
        />
        <div className="flex gap-1.5">
          <button onClick={handleSave} className="px-3 py-1 bg-[#007A87] text-white text-[11px] rounded-lg hover:bg-[#00555E]">儲存</button>
          <button onClick={onCancel} className="px-3 py-1 border border-[#E0E0E0] text-[11px] rounded-lg hover:bg-[#F5F5F5]">取消</button>
        </div>
      </div>
    );
  }

  function Bubble({ content, isMe, replyTarget }: { content: string; isMe: boolean; replyTarget?: { author: string; content: string } | null }) {
    return (
      <div className={`px-3.5 py-2 rounded-2xl text-xs leading-relaxed w-fit max-w-full ${isMe ? "bg-[#007A87] text-white rounded-br-sm" : "bg-[#F3F4F6] text-[#2D2D2D] rounded-bl-sm"}`} style={{wordBreak:"break-word", overflowWrap:"anywhere"}}>
        {replyTarget && (
          <div className={`text-[10px] mb-1.5 pb-1.5 border-b flex items-start gap-1 opacity-80 ${isMe ? "border-white/30" : "border-[#D1D5DB]"}`}>
            <CornerDownRight size={10} className="mt-0.5 flex-shrink-0" />
            <span><span className="font-medium">{replyTarget.author}</span>：{replyTarget.content.slice(0, 40)}{replyTarget.content.length > 40 ? "…" : ""}</span>
          </div>
        )}
        <span className="whitespace-pre-wrap">{content}</span>
      </div>
    );
  }

  const topLevel = msgs.filter(m => !m.replyTo);
  const repliesOf = (id: string) => msgs.filter(m => m.replyTo === id);
  // Latest message for "newest" label
  const allSorted = [...msgs].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const latestId = allSorted[0]?.id;
  const currentActorName = role === "editor" ? "管理者" : author;
  const currentActorAvatarText = role === "editor" ? "管" : getAvatarText(author);

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/40" onClick={onClose} />
      <div className="w-full max-w-md bg-white h-full flex flex-col shadow-2xl border-l border-[#E5E7EB]">

        {/* Header */}
        <div className="px-5 py-3.5 border-b border-[#E5E7EB]">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-[10px] text-[#9CA3AF] truncate mb-0.5">{s.departmentFullPath}</p>
              <p className="text-sm font-semibold text-[#1F2937] leading-snug line-clamp-2">{s.problemTitle}</p>
            </div>
            <button onClick={onClose} className="p-1 rounded-lg hover:bg-[#F3F4F6] text-[#9CA3AF] hover:text-[#424242] transition-colors flex-shrink-0">
              <X size={16} />
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5 mt-2">
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#F3F4F6] text-[#6B7280]">{s.annoyanceLevel}</span>
            {(Array.isArray(s.assignee) ? s.assignee : [s.assignee]).filter(a => a && a !== "未指定").map((a, i) => (
              <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-[#B5E1E5]/30 text-[#007A87] font-medium">{a}</span>
            ))}
          </div>
        </div>

        {/* Collapsible detail */}
        <details className="border-b border-[#E5E7EB] group">
          <summary className="px-5 py-2.5 text-xs font-semibold text-[#424242] cursor-pointer hover:bg-[#F0F4F4] select-none flex items-center justify-between bg-[#F9FAFB]">
            <span>困擾詳情</span>
            <span className="text-[10px] text-[#007A87] font-medium">點擊展開 ▾</span>
          </summary>
          <div className="px-5 py-3 bg-[#F9FAFB] text-xs text-[#6B7280] space-y-1.5 border-t border-[#E5E7EB]">
            {s.painPoints?.length > 0 && <p><span className="font-medium text-[#9CA3AF]">痛點：</span>{s.painPoints.join("、")}</p>}
            {s.aiNeeds?.length > 0 && <p><span className="font-medium text-[#9CA3AF]">AI需求：</span>{s.aiNeeds.join("、")}</p>}
            {s.freeText && <p><span className="font-medium text-[#9CA3AF]">補充：</span>{s.freeText}</p>}
          </div>
        </details>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-3">
          {notes.length === 0 && msgs.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <p className="text-sm text-[#9CA3AF]">還沒有討論</p>
              <p className="text-xs text-[#D1D5DB] mt-0.5">來發起第一則吧！</p>
            </div>
          )}

          {/* Old notes */}
          {notes.map((item, idx) => {
            const displayName = getDisplayName(item.author);
            const isMe = item.author === author;
            const canEdit = item.author === author;
            return (
              <div key={item.id} className={`flex gap-2 mt-3 ${isMe ? "flex-row-reverse" : ""}`}>
                <Av name={displayName} avatarText={getAvatarText(item.author)} />
                <div className={`flex flex-col max-w-[72%] ${isMe ? "items-end" : "items-start"}`}>
                  {!isMe && <span className="text-[10px] text-[#9CA3AF] font-medium ml-1 mb-0.5">{displayName}</span>}
                  {delNoteI === idx
                    ? <ConfirmDelete onConfirm={() => doDeleteNote(idx)} onCancel={() => setDelNoteI(null)} />
                    : editNoteI === idx
                    ? <EditInput val={editNoteVal} setVal={setEditNoteVal} onSave={() => saveNoteEdit(idx)} onCancel={() => { setEditNoteI(null); setEditNoteVal(""); }} editKey={`note-${idx}`} />
                    : <Bubble content={item.content} isMe={isMe} />
                  }
                  {editNoteI !== idx && delNoteI !== idx && (
                    <div className={`flex items-center gap-2 mt-0.5 px-1 ${isMe ? "flex-row-reverse" : ""}`}>
                      {item.datetime && <span className="text-[9px] text-[#9CA3AF]">{item.datetime}</span>}
                      <button onClick={() => setReplyTo({ id: item.id, author: getDisplayName(item.author), content: item.content })}
                        className="text-[9px] text-[#9CA3AF] hover:text-[#007A87] flex items-center gap-0.5 transition-colors">
                        <CornerDownRight size={9} />回覆
                      </button>
                      {canEdit && <>
                        <button onClick={() => { setEditNoteI(idx); setEditNoteVal(item.content); }} className="text-[9px] text-[#9CA3AF] hover:text-[#007A87] transition-colors"><Pencil size={9} /></button>
                        <button onClick={() => setDelNoteI(idx)} className="text-[9px] text-[#9CA3AF] hover:text-[#AE1914] transition-colors"><Trash2 size={9} /></button>
                      </>}
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {/* New discussions */}
          {topLevel.map(msg => {
            const authorInfo = getDiscussionAuthor(msg);
            const isMe = msg.author === currentActorName || msg.authorName === currentActorName;
            const canEdit = msg.author === currentActorName || msg.authorName === currentActorName;
            const replyTarget = msg.replyTo ? msgs.find(m => m.id === msg.replyTo) : null;
            const isLatest = msg.id === latestId;

            return (
              <div key={msg.id}>
                {isLatest && (
                  <div className="flex items-center gap-2 my-2">
                    <div className="flex-1 h-px bg-[#E5E7EB]" />
                    <span className="text-[9px] text-[#007A87] font-medium px-2 py-0.5 bg-[#EAF5F6] rounded-full">最新</span>
                    <div className="flex-1 h-px bg-[#E5E7EB]" />
                  </div>
                )}
                <div className={`flex gap-2 mt-3 ${isMe ? "flex-row-reverse" : ""}`}>
                  <Av name={authorInfo.displayName} avatarText={authorInfo.avatarText} />
                  <div className={`flex flex-col max-w-[72%] ${isMe ? "items-end" : "items-start"}`}>
                    {!isMe && <span className="text-[10px] text-[#9CA3AF] font-medium ml-1 mb-0.5">{authorInfo.displayName}</span>}
                    {delId === msg.id
                      ? <ConfirmDelete onConfirm={() => doDelete(msg.id)} onCancel={() => setDelId(null)} />
                      : editId === msg.id
                      ? <EditInput val={editVal} setVal={setEditVal} onSave={() => saveEdit(msg.id)} onCancel={() => { setEditId(null); setEditVal(""); }} editKey={`msg-${msg.id}`} />
                      : <Bubble content={msg.content} isMe={isMe} replyTarget={replyTarget ? { author: getDiscussionAuthor(replyTarget).displayName, content: replyTarget.content } : null} />
                    }
                    {editId !== msg.id && delId !== msg.id && (
                      <div className={`flex items-center gap-2 mt-0.5 px-1 ${isMe ? "flex-row-reverse" : ""}`}>
                        <span className="text-[9px] text-[#9CA3AF]">{formatTime(msg.createdAt)}</span>
                        <button onClick={() => setReplyTo({ id: msg.id, author: getDiscussionAuthor(msg).displayName, content: msg.content })}
                          className="text-[9px] text-[#9CA3AF] hover:text-[#007A87] flex items-center gap-0.5 transition-colors">
                          <CornerDownRight size={9} />回覆
                        </button>
                        {canEdit && <>
                          <button onClick={() => { setEditId(msg.id); setEditVal(msg.content); }} className="text-[9px] text-[#9CA3AF] hover:text-[#007A87] transition-colors"><Pencil size={9} /></button>
                          <button onClick={() => setDelId(msg.id)} className="text-[9px] text-[#9CA3AF] hover:text-[#AE1914] transition-colors"><Trash2 size={9} /></button>
                        </>}
                      </div>
                    )}
                  </div>
                </div>
                {/* Replies */}
                {repliesOf(msg.id).map(reply => {
                  const replyAuthorInfo = getDiscussionAuthor(reply);
                  const rIsMe = reply.author === currentActorName || reply.authorName === currentActorName;
                  const rCanEdit = reply.author === currentActorName || reply.authorName === currentActorName;
                  const rTarget = msgs.find(m => m.id === reply.replyTo);
                  return (
                    <div key={reply.id} className={`flex gap-2 mt-2 ml-9 ${rIsMe ? "flex-row-reverse" : ""}`}>
                      <Av name={replyAuthorInfo.displayName} avatarText={replyAuthorInfo.avatarText} />
                      <div className={`flex flex-col max-w-[72%] ${rIsMe ? "items-end" : "items-start"}`}>
                        {!rIsMe && <span className="text-[10px] text-[#9CA3AF] font-medium ml-1 mb-0.5">{replyAuthorInfo.displayName}</span>}
                        {delId === reply.id
                          ? <ConfirmDelete onConfirm={() => doDelete(reply.id)} onCancel={() => setDelId(null)} />
                          : editId === reply.id
                          ? <EditInput val={editVal} setVal={setEditVal} onSave={() => saveEdit(reply.id)} onCancel={() => { setEditId(null); setEditVal(""); }} editKey={`reply-${reply.id}`} />
                          : <Bubble content={reply.content} isMe={rIsMe} replyTarget={rTarget ? { author: getDiscussionAuthor(rTarget).displayName, content: rTarget.content } : null} />
                        }
                        {editId !== reply.id && delId !== reply.id && (
                          <div className={`flex items-center gap-2 mt-0.5 px-1 ${rIsMe ? "flex-row-reverse" : ""}`}>
                            <span className="text-[9px] text-[#9CA3AF]">{formatTime(reply.createdAt)}</span>
                            <button onClick={() => setReplyTo({ id: reply.id, author: getDiscussionAuthor(reply).displayName, content: reply.content })}
                              className="text-[9px] text-[#9CA3AF] hover:text-[#007A87] flex items-center gap-0.5 transition-colors">
                              <CornerDownRight size={9} />回覆
                            </button>
                            {rCanEdit && <>
                              <button onClick={() => { setEditId(reply.id); setEditVal(reply.content); }} className="text-[9px] text-[#9CA3AF] hover:text-[#007A87] transition-colors"><Pencil size={9} /></button>
                              <button onClick={() => setDelId(reply.id)} className="text-[9px] text-[#9CA3AF] hover:text-[#AE1914] transition-colors"><Trash2 size={9} /></button>
                            </>}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
          <div ref={bottomRef} className="h-2" />
        </div>

        {/* Reply indicator */}
        {replyTo && (
          <div className="mx-4 mb-1 px-3 py-2 bg-[#EAF5F6] border border-[#B5E1E5] rounded-xl flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-xs text-[#007A87] min-w-0">
              <CornerDownRight size={11} className="flex-shrink-0" />
              <span className="truncate">回覆 <span className="font-semibold">{replyTo.author}</span>：{replyTo.content.slice(0, 35)}{replyTo.content.length > 35 ? "…" : ""}</span>
            </div>
            <button onClick={() => setReplyTo(null)} className="text-[#9CA3AF] hover:text-[#424242] flex-shrink-0"><X size={12} /></button>
          </div>
        )}

        {/* Input */}
        <div className="px-4 py-3 border-t border-[#E5E7EB]">
          <div className="flex gap-2 items-end">
            <Av name={currentActorName} avatarText={currentActorAvatarText} />
            <textarea rows={1}
              value={inputIme.draft}
              onChange={inputIme.inputProps.onChange}
              onCompositionStart={inputIme.inputProps.onCompositionStart}
              onCompositionEnd={inputIme.inputProps.onCompositionEnd}
              onKeyDown={async e => {
                if (inputIme.isComposing(e)) return;
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  await send();
                }
              }}
              placeholder="輸入訊息... (Enter 送出)"
              disabled={sending}
              className="flex-1 text-sm border border-[#E0E0E0] rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#007A87]/30 focus:border-[#007A87] resize-none disabled:cursor-not-allowed disabled:opacity-50" />
            <button onClick={send} disabled={sending || !inputIme.value.trim()}
              className="p-2.5 bg-[#007A87] text-white rounded-xl hover:bg-[#00555E] disabled:opacity-40 transition-colors flex-shrink-0">
              <Send size={15} />
            </button>
          </div>
          {sendError && <p className="mt-2 text-xs text-[#AE1914]">{sendError}</p>}
          {sending && <p className="mt-2 text-xs text-[#6B7280]">留言送出中...</p>}
        </div>
      </div>
    </div>
  );
}
