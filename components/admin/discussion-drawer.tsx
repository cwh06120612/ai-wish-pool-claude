"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { X, CornerDownRight, Send, Pencil, Trash2 } from "lucide-react";
import { getDiscussions, addDiscussion, markRead, deleteDiscussion, editDiscussion, Discussion } from "@/lib/discussions";
import { updateSubmissionAsync } from "@/lib/storage";
import type { Submission } from "@/types/submission";

interface Props {
  submission: Submission;
  author: string;
  onClose: () => void;
  onAdminNoteChange?: (newNote: string) => void;
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleString("zh-TW", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
}

const getAvatarColor = (name: string) => name === "管理者" ? "#007A87" : "#BE8B55";
const getAvatarChar = (name: string) => name === "管理者" ? "管" : name.charAt(0);

function parseAdminNotes(adminNote: string) {
  if (!adminNote?.trim()) return [];
  return adminNote.split(/(?=\[.+? \d{4}\/\d{2}\/\d{2}.+?\] )/).filter(Boolean).map((line, i) => {
    const match = line.match(/^\[(.+?) (\d{4}\/\d{2}\/\d{2}.+?)\] ([\s\S]+)$/);
    if (!match) return { id: `note-${i}`, author: "?", datetime: "", content: line.trim(), raw: line };
    return { id: `note-${i}`, author: match[1], datetime: match[2], content: match[3].trim(), raw: line };
  });
}

export function DiscussionDrawer({ submission: s, author, onClose, onAdminNoteChange }: Props) {
  const [messages, setMessages] = useState<Discussion[]>([]);
  const [input, setInput] = useState("");
  const [replyTo, setReplyTo] = useState<{ id: string; author: string; content: string } | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingVal, setEditingVal] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [editNoteIdx, setEditNoteIdx] = useState<number | null>(null);
  const [editNoteVal, setEditNoteVal] = useState("");
  const [confirmDeleteNoteIdx, setConfirmDeleteNoteIdx] = useState<number | null>(null);
  const [noteItems, setNoteItems] = useState(parseAdminNotes(s.adminNote || ""));
  const bottomRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    const msgs = await getDiscussions(s.id);
    setMessages(msgs);
    const unread = msgs.filter(m => !m.readBy.includes(author)).map(m => m.id);
    if (unread.length > 0) await markRead(unread, author);
  }, [s.id, author]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100); }, [messages]);

  async function handleSend() {
    const text = input.trim();
    if (!text) return;
    setInput("");
    await addDiscussion({ submissionId: s.id, author, content: text, replyTo: replyTo?.id });
    setReplyTo(null);
    await load();
  }

  async function handleEdit(id: string) {
    const text = editingVal.trim();
    if (!text) return;
    await editDiscussion(id, text);
    setEditingId(null);
    setEditingVal("");
    await load();
  }

  async function handleDelete(id: string) {
    await deleteDiscussion(id);
    setConfirmDeleteId(null);
    await load();
  }

  async function handleNoteEdit(idx: number) {
    const text = editNoteVal.trim();
    if (!text) return;
    const items = [...noteItems];
    const item = items[idx];
    const newLine = `[${item.author} ${item.datetime}] ${text}`;
    items[idx] = { ...item, content: text, raw: newLine };
    const newNote = items.map(n => n.raw).join("\n");
    setNoteItems(items);
    setEditNoteIdx(null);
    setEditNoteVal("");
    onAdminNoteChange?.(newNote);
    await updateSubmissionAsync(s.id, { adminNote: newNote });
  }

  async function handleNoteDelete(idx: number) {
    const items = noteItems.filter((_, j) => j !== idx);
    const newNote = items.map(n => n.raw).join("\n");
    setNoteItems(items);
    setConfirmDeleteNoteIdx(null);
    onAdminNoteChange?.(newNote);
    await updateSubmissionAsync(s.id, { adminNote: newNote });
  }

  const topLevel = messages.filter(m => !m.replyTo);
  const repliesOf = (id: string) => messages.filter(m => m.replyTo === id);

  function Avatar({ name }: { name: string }) {
    return (
      <div className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0"
        style={{ backgroundColor: getAvatarColor(name) }}>
        {getAvatarChar(name)}
      </div>
    );
  }

  function MsgBubble({ msg, isReply }: { msg: Discussion; isReply?: boolean }) {
    const isMe = msg.author === author;
    const canEdit = msg.author === author;
    const replyTarget = msg.replyTo ? messages.find(m => m.id === msg.replyTo) : null;
    const isEditing = editingId === msg.id;
    const isDeleting = confirmDeleteId === msg.id;

    return (
      <div className={`flex gap-2 ${isReply ? "ml-9 mt-1.5" : "mt-3"} ${isMe ? "flex-row-reverse" : "flex-row"}`}>
        {!isReply && !isMe && <Avatar name={msg.author} />}
        {!isReply && isMe && <Avatar name={msg.author} />}
        {isReply && <div className="w-7 flex-shrink-0" />}

        <div className={`flex flex-col gap-0.5 max-w-[72%] ${isMe ? "items-end" : "items-start"}`}>
          {!isMe && !isReply && (
            <span className="text-[10px] text-[#9CA3AF] font-medium ml-1">{msg.author}</span>
          )}

          {isDeleting ? (
            <div className="bg-[#FDF2F2] border border-[#EBCDCC] rounded-2xl px-3 py-2.5">
              <p className="text-xs text-[#AE1914] mb-2">確定刪除這則訊息？</p>
              <div className="flex gap-2">
                <button onClick={() => handleDelete(msg.id)}
                  className="px-3 py-1 bg-[#AE1914] text-white text-[11px] rounded-lg hover:bg-[#8B1410]">確定</button>
                <button onClick={() => setConfirmDeleteId(null)}
                  className="px-3 py-1 border border-[#E0E0E0] text-[11px] rounded-lg hover:bg-[#F5F5F5]">取消</button>
              </div>
            </div>
          ) : isEditing ? (
            <div className="w-full space-y-1.5">
              <textarea
                className="w-full text-xs border border-[#007A87] rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#007A87]/30 resize-none bg-white"
                rows={2}
                defaultValue={editingVal}
                onChange={e => setEditingVal(e.target.value)}
                autoFocus
              />
              <div className="flex gap-1.5">
                <button onClick={() => handleEdit(msg.id)}
                  className="px-3 py-1 bg-[#007A87] text-white text-[11px] rounded-lg hover:bg-[#00555E]">儲存</button>
                <button onClick={() => { setEditingId(null); setEditingVal(""); }}
                  className="px-3 py-1 border border-[#E0E0E0] text-[11px] rounded-lg hover:bg-[#F5F5F5]">取消</button>
              </div>
            </div>
          ) : (
            <div className={`px-3.5 py-2 rounded-2xl text-xs leading-relaxed break-words ${
              isMe
                ? "bg-[#007A87] text-white rounded-br-sm"
                : "bg-[#F3F4F6] text-[#2D2D2D] rounded-bl-sm"
            }`}>
              {replyTarget && (
                <div className={`text-[10px] mb-1.5 pb-1.5 border-b opacity-80 flex items-start gap-1 ${isMe ? "border-white/30" : "border-[#D1D5DB]"}`}>
                  <CornerDownRight size={10} className="mt-0.5 flex-shrink-0" />
                  <span><span className="font-medium">{replyTarget.author}</span>：{replyTarget.content.slice(0, 40)}{replyTarget.content.length > 40 ? "…" : ""}</span>
                </div>
              )}
              <span className="whitespace-pre-wrap">{msg.content}</span>
            </div>
          )}

          {!isEditing && !isDeleting && (
            <div className={`flex items-center gap-2 px-1 ${isMe ? "flex-row-reverse" : ""}`}>
              <span className="text-[9px] text-[#9CA3AF]">{formatTime(msg.createdAt)}</span>
              <button onClick={() => setReplyTo({ id: msg.id, author: msg.author, content: msg.content })}
                className="text-[9px] text-[#9CA3AF] hover:text-[#007A87] flex items-center gap-0.5 transition-colors">
                <CornerDownRight size={9} />回覆
              </button>
              {canEdit && (
                <>
                  <button onClick={() => { setEditingId(msg.id); setEditingVal(msg.content); }}
                    className="text-[9px] text-[#9CA3AF] hover:text-[#007A87] transition-colors">
                    <Pencil size={9} />
                  </button>
                  <button onClick={() => setConfirmDeleteId(msg.id)}
                    className="text-[9px] text-[#9CA3AF] hover:text-[#AE1914] transition-colors">
                    <Trash2 size={9} />
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  function NoteBubble({ item, idx }: { item: ReturnType<typeof parseAdminNotes>[0]; idx: number }) {
    const isMe = item.author === author;
    const canEdit = item.author === author;
    const isEditing = editNoteIdx === idx;
    const isDeleting = confirmDeleteNoteIdx === idx;

    return (
      <div className={`flex gap-2 mt-3 ${isMe ? "flex-row-reverse" : "flex-row"}`}>
        <Avatar name={item.author} />
        <div className={`flex flex-col gap-0.5 max-w-[72%] ${isMe ? "items-end" : "items-start"}`}>
          {!isMe && <span className="text-[10px] text-[#9CA3AF] font-medium ml-1">{item.author}</span>}

          {isDeleting ? (
            <div className="bg-[#FDF2F2] border border-[#EBCDCC] rounded-2xl px-3 py-2.5">
              <p className="text-xs text-[#AE1914] mb-2">確定刪除這則備註？</p>
              <div className="flex gap-2">
                <button onClick={() => handleNoteDelete(idx)}
                  className="px-3 py-1 bg-[#AE1914] text-white text-[11px] rounded-lg">確定</button>
                <button onClick={() => setConfirmDeleteNoteIdx(null)}
                  className="px-3 py-1 border border-[#E0E0E0] text-[11px] rounded-lg">取消</button>
              </div>
            </div>
          ) : isEditing ? (
            <div className="w-full space-y-1.5">
              <textarea
                className="w-full text-xs border border-[#007A87] rounded-xl px-3 py-2 focus:outline-none resize-none bg-white"
                rows={2}
                defaultValue={editNoteVal}
                onChange={e => setEditNoteVal(e.target.value)}
                autoFocus
              />
              <div className="flex gap-1.5">
                <button onClick={() => handleNoteEdit(idx)}
                  className="px-3 py-1 bg-[#007A87] text-white text-[11px] rounded-lg">儲存</button>
                <button onClick={() => { setEditNoteIdx(null); setEditNoteVal(""); }}
                  className="px-3 py-1 border border-[#E0E0E0] text-[11px] rounded-lg">取消</button>
              </div>
            </div>
          ) : (
            <div className={`px-3.5 py-2 rounded-2xl text-xs leading-relaxed break-words ${
              isMe
                ? "bg-[#007A87] text-white rounded-br-sm"
                : "bg-[#F3F4F6] text-[#2D2D2D] rounded-bl-sm"
            }`}>
              <span className="whitespace-pre-wrap">{item.content}</span>
            </div>
          )}

          {!isEditing && !isDeleting && (
            <div className={`flex items-center gap-2 px-1 ${isMe ? "flex-row-reverse" : ""}`}>
              {item.datetime && <span className="text-[9px] text-[#9CA3AF]">{item.datetime}</span>}
              {canEdit && (
                <>
                  <button onClick={() => { setEditNoteIdx(idx); setEditNoteVal(item.content); }}
                    className="text-[9px] text-[#9CA3AF] hover:text-[#007A87] transition-colors">
                    <Pencil size={9} />
                  </button>
                  <button onClick={() => setConfirmDeleteNoteIdx(idx)}
                    className="text-[9px] text-[#9CA3AF] hover:text-[#AE1914] transition-colors">
                    <Trash2 size={9} />
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/40" onClick={onClose} />
      <div className="w-full max-w-md bg-white h-full flex flex-col shadow-2xl border-l border-[#E5E7EB]">

        {/* Header */}
        <div className="px-5 py-4 border-b border-[#E5E7EB] bg-white">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-[10px] text-[#9CA3AF] mb-0.5 truncate">{s.departmentFullPath}</p>
              <p className="text-sm font-semibold text-[#1F2937] leading-snug line-clamp-2">{s.problemTitle}</p>
            </div>
            <button onClick={onClose} className="text-[#9CA3AF] hover:text-[#424242] flex-shrink-0 p-1 rounded-lg hover:bg-[#F3F4F6] transition-colors">
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

        {/* Info collapsible */}
        <details className="border-b border-[#E5E7EB]">
          <summary className="px-5 py-2.5 text-xs text-[#6B7280] cursor-pointer hover:bg-[#F9FAFB] select-none flex items-center justify-between">
            <span className="font-medium">困擾詳情</span>
            <span className="text-[10px] text-[#9CA3AF]">點擊展開</span>
          </summary>
          <div className="px-5 py-3 bg-[#F9FAFB] text-xs text-[#6B7280] space-y-1.5 border-t border-[#E5E7EB]">
            {s.painPoints?.length > 0 && <p><span className="font-medium text-[#9CA3AF]">痛點：</span>{s.painPoints.join("、")}</p>}
            {s.aiNeeds?.length > 0 && <p><span className="font-medium text-[#9CA3AF]">AI需求：</span>{s.aiNeeds.join("、")}</p>}
            {s.freeText && <p><span className="font-medium text-[#9CA3AF]">補充：</span>{s.freeText}</p>}
          </div>
        </details>

        {/* Messages area */}
        <div className="flex-1 overflow-y-auto px-4 py-3">
          {noteItems.length === 0 && messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="w-12 h-12 rounded-full bg-[#F3F4F6] flex items-center justify-center mb-3">
                <CornerDownRight size={20} className="text-[#9CA3AF]" />
              </div>
              <p className="text-sm text-[#9CA3AF]">還沒有討論</p>
              <p className="text-xs text-[#D1D5DB] mt-0.5">來發起第一則吧！</p>
            </div>
          )}

          {/* Old notes */}
          {noteItems.map((item, idx) => (
            <NoteBubble key={item.id} item={item} idx={idx} />
          ))}

          {/* New discussions */}
          {topLevel.map(msg => (
            <div key={msg.id}>
              <MsgBubble msg={msg} />
              {repliesOf(msg.id).map(reply => <MsgBubble key={reply.id} msg={reply} isReply />)}
            </div>
          ))}
          <div ref={bottomRef} className="h-2" />
        </div>

        {/* Reply indicator */}
        {replyTo && (
          <div className="mx-4 mb-1 px-3 py-2 bg-[#EAF5F6] border border-[#B5E1E5] rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs text-[#007A87] min-w-0">
              <CornerDownRight size={11} className="flex-shrink-0" />
              <span className="truncate">回覆 <span className="font-semibold">{replyTo.author}</span>：{replyTo.content.slice(0, 35)}{replyTo.content.length > 35 ? "…" : ""}</span>
            </div>
            <button onClick={() => setReplyTo(null)} className="text-[#9CA3AF] hover:text-[#424242] flex-shrink-0 ml-2">
              <X size={12} />
            </button>
          </div>
        )}

        {/* Input */}
        <div className="px-4 py-3 border-t border-[#E5E7EB] bg-white flex gap-2 items-end">
          <Avatar name={author} />
          <textarea
            rows={1}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={async e => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                await handleSend();
              }
            }}
            placeholder="輸入訊息... (Enter 送出，Shift+Enter 換行)"
            className="flex-1 text-sm border border-[#E0E0E0] rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#007A87]/30 focus:border-[#007A87] resize-none leading-relaxed"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim()}
            className="p-2.5 bg-[#007A87] text-white rounded-xl hover:bg-[#00555E] disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex-shrink-0">
            <Send size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}
