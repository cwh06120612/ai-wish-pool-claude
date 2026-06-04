"use client";
import { useState, useEffect, useRef } from "react";
import { X, CornerDownRight, Send, Pencil, Trash2, MessageSquare } from "lucide-react";
import { getDiscussions, addDiscussion, markRead, Discussion } from "@/lib/discussions";
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

const avatarColor = (name: string) => name === "管理者" ? "#007A87" : "#BE8B55";
const avatarChar = (name: string) => name === "管理者" ? "管" : name.charAt(0);

// Parse adminNote into Discussion-like objects
function parseAdminNotes(adminNote: string): Array<{id: string; author: string; datetime: string; content: string; raw: string}> {
  if (!adminNote?.trim()) return [];
  return adminNote.split(/(?=\[.+? \d{4}\/\d{2}\/\d{2}.+?\] )/).filter(Boolean).map((line, i) => {
    const match = line.match(/^\[(.+?) (\d{4}\/\d{2}\/\d{2}.+?)\] ([\s\S]+)$/);
    if (!match) return { id: `note-${i}`, author: '?', datetime: '', content: line.trim(), raw: line };
    return { id: `note-${i}`, author: match[1], datetime: match[2], content: match[3].trim(), raw: line };
  });
}

export function DiscussionDrawer({ submission: s, author, onClose, onAdminNoteChange }: Props) {
  const [messages, setMessages] = useState<Discussion[]>([]);
  const [input, setInput] = useState("");
  const [replyTo, setReplyTo] = useState<{id?: string; author: string; content: string} | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingVal, setEditingVal] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editNoteIdx, setEditNoteIdx] = useState<number | null>(null);
  const [editNoteVal, setEditNoteVal] = useState("");
  const [deleteNoteIdx, setDeleteNoteIdx] = useState<number | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  async function load() {
    const msgs = await getDiscussions(s.id);
    setMessages(msgs);
    const unread = msgs.filter(m => !m.readBy.includes(author)).map(m => m.id);
    if (unread.length > 0) await markRead(unread, author);
  }

  useEffect(() => { load(); }, [s.id]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  async function handleSend() {
    if (!input.trim()) return;
    await addDiscussion({ submissionId: s.id, author, content: input.trim(), replyTo: replyTo?.id });
    setInput(""); setReplyTo(null);
    await load();
  }

  const noteItems = parseAdminNotes(s.adminNote || "");
  const topLevel = messages.filter(m => !m.replyTo);
  const repliesOf = (id: string) => messages.filter(m => m.replyTo === id);

  // Bubble component
  function Bubble({ msg, isReply }: { msg: Discussion; isReply?: boolean }) {
    const isMe = msg.author === author;
    const canEdit = msg.author === author;
    const replyTarget = msg.replyTo ? messages.find(m => m.id === msg.replyTo) : null;
    return (
      <div className={`flex gap-2 items-end ${isReply ? "ml-7 mt-1" : "mt-3"} ${isMe ? "flex-row-reverse" : ""}`}>
        {!isMe && !isReply && (
          <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
            style={{ backgroundColor: avatarColor(msg.author) }}>
            {avatarChar(msg.author)}
          </div>
        )}
        {!isMe && isReply && <div className="w-7 flex-shrink-0" />}
        <div className={`flex flex-col max-w-[75%] ${isMe ? "items-end" : "items-start"}`}>
          {!isMe && !isReply && <span className="text-[10px] font-medium text-[#6B7280] mb-0.5 ml-1">{msg.author}</span>}
          {/* Edit mode */}
          {editingId === msg.id ? (
            <div className="w-full space-y-1.5">
              <textarea rows={2} value={editingVal} onChange={e => setEditingVal(e.target.value)}
                className="w-full text-xs border border-[#007A87] rounded-xl px-3 py-2 resize-none focus:outline-none" />
              <div className="flex gap-1.5">
                <button onClick={async () => {
                  if (!editingVal.trim()) return;
                  // Update in discussions table - for now we use a workaround
                  // We'll rebuild the note content approach
                  setEditingId(null);
                }} className="px-2 py-1 bg-[#007A87] text-white text-xs rounded-lg">儲存</button>
                <button onClick={() => setEditingId(null)} className="px-2 py-1 bg-white border border-[#E0E0E0] text-xs rounded-lg">取消</button>
              </div>
            </div>
          ) : deletingId === msg.id ? (
            <div className="bg-[#FDF2F2] border border-[#EBCDCC] rounded-xl px-3 py-2 text-xs">
              <p className="text-[#AE1914] mb-2">確定要刪除？</p>
              <div className="flex gap-2">
                <button onClick={async () => { setDeletingId(null); }} className="px-2 py-1 bg-[#AE1914] text-white text-xs rounded-lg">確定</button>
                <button onClick={() => setDeletingId(null)} className="px-2 py-1 border border-[#E0E0E0] text-xs rounded-lg">取消</button>
              </div>
            </div>
          ) : (
            <div className={`relative px-3 py-2 rounded-2xl text-xs leading-relaxed inline-block ${
              isMe ? "bg-[#007A87] text-white rounded-br-sm" : "bg-[#F3F4F6] text-[#424242] rounded-bl-sm"
            }`}>
              {replyTarget && (
                <div className={`text-[9px] mb-1 opacity-70 border-l-2 pl-1.5 ${isMe ? "border-white/50" : "border-[#9CA3AF]"}`}>
                  <span className="font-medium">{replyTarget.author}</span>：{replyTarget.content.slice(0,30)}{replyTarget.content.length>30?"…":""}
                </div>
              )}
              <span className="whitespace-pre-wrap">{msg.content}</span>
            </div>
          )}
          {/* Actions */}
          {editingId !== msg.id && deletingId !== msg.id && (
            <div className={`flex items-center gap-2 mt-0.5 ${isMe ? "flex-row-reverse" : ""}`}>
              <span className="text-[9px] text-[#9CA3AF]">{formatTime(msg.createdAt)}</span>
              <button onClick={() => setReplyTo({id: msg.id, author: msg.author, content: msg.content})}
                className="text-[9px] text-[#9CA3AF] hover:text-[#007A87] flex items-center gap-0.5 transition-colors">
                <CornerDownRight size={9} />回覆
              </button>
              {canEdit && <>
                <button onClick={() => { setEditingId(msg.id); setEditingVal(msg.content); }}
                  className="text-[9px] text-[#9CA3AF] hover:text-[#007A87] transition-colors"><Pencil size={9} /></button>
                <button onClick={() => setDeletingId(msg.id)}
                  className="text-[9px] text-[#9CA3AF] hover:text-[#AE1914] transition-colors"><Trash2 size={9} /></button>
              </>}
            </div>
          )}
        </div>
        {isMe && (
          <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
            style={{ backgroundColor: avatarColor(msg.author) }}>
            {avatarChar(msg.author)}
          </div>
        )}
      </div>
    );
  }

  // Note bubble (same style as Bubble but for adminNote)
  function NoteBubble({ item, idx, total }: { item: ReturnType<typeof parseAdminNotes>[0]; idx: number; total: number }) {
    const isMe = item.author === author;
    const canEdit = item.author === author;
    const prevAuthor = idx > 0 ? noteItems[idx-1].author : null;
    const showAvatar = !isMe && prevAuthor !== item.author;
    return (
      <div className={`flex gap-2 items-end mt-2 ${isMe ? "flex-row-reverse" : ""}`}>
        {!isMe && (
          showAvatar
            ? <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0" style={{backgroundColor: avatarColor(item.author)}}>{avatarChar(item.author)}</div>
            : <div className="w-7 flex-shrink-0" />
        )}
        <div className={`flex flex-col max-w-[75%] ${isMe ? "items-end" : "items-start"}`}>
          {showAvatar && !isMe && <span className="text-[10px] font-medium text-[#6B7280] mb-0.5 ml-1">{item.author}</span>}
          {deleteNoteIdx === idx ? (
            <div className="bg-[#FDF2F2] border border-[#EBCDCC] rounded-xl px-3 py-2 text-xs">
              <p className="text-[#AE1914] mb-2">確定要刪除？</p>
              <div className="flex gap-2">
                <button onClick={async () => {
                  const newNote = noteItems.filter((_,j) => j !== idx).map(n => n.raw).join("\n");
                  setDeleteNoteIdx(null);
                  onAdminNoteChange?.(newNote);
                  await updateSubmissionAsync(s.id, { adminNote: newNote });
                }} className="px-2 py-1 bg-[#AE1914] text-white text-xs rounded-lg">確定</button>
                <button onClick={() => setDeleteNoteIdx(null)} className="px-2 py-1 border border-[#E0E0E0] text-xs rounded-lg">取消</button>
              </div>
            </div>
          ) : editNoteIdx === idx ? (
            <div className="space-y-1.5 w-full">
              <textarea rows={2} value={editNoteVal} onChange={e => setEditNoteVal(e.target.value)}
                className="w-full text-xs border border-[#007A87] rounded-xl px-3 py-2 resize-none focus:outline-none" />
              <div className="flex gap-1.5">
                <button onClick={async () => {
                  const newLine = `[${item.author} ${item.datetime}] ${editNoteVal.trim()}`;
                  const items = noteItems.slice(); items[idx] = {...items[idx], raw: newLine};
                  const newNote = items.map(n => n.raw).join("\n");
                  setEditNoteIdx(null);
                  onAdminNoteChange?.(newNote);
                  await updateSubmissionAsync(s.id, { adminNote: newNote });
                }} className="px-2 py-1 bg-[#007A87] text-white text-xs rounded-lg">儲存</button>
                <button onClick={() => setEditNoteIdx(null)} className="px-2 py-1 border border-[#E0E0E0] text-xs rounded-lg">取消</button>
              </div>
            </div>
          ) : (
            <div className={`px-3 py-2 rounded-2xl text-xs leading-relaxed inline-block ${
              isMe ? "bg-[#007A87] text-white rounded-br-sm" : "bg-[#F3F4F6] text-[#424242] rounded-bl-sm"
            }`}>
              <span className="whitespace-pre-wrap">{item.content}</span>
            </div>
          )}
          {editNoteIdx !== idx && deleteNoteIdx !== idx && (
            <div className={`flex items-center gap-2 mt-0.5 ${isMe ? "flex-row-reverse" : ""}`}>
              {item.datetime && <span className="text-[9px] text-[#9CA3AF]">{item.datetime}</span>}
              {canEdit && <>
                <button onClick={() => { setEditNoteIdx(idx); setEditNoteVal(item.content); }}
                  className="text-[9px] text-[#9CA3AF] hover:text-[#007A87] transition-colors"><Pencil size={9} /></button>
                <button onClick={() => setDeleteNoteIdx(idx)}
                  className="text-[9px] text-[#9CA3AF] hover:text-[#AE1914] transition-colors"><Trash2 size={9} /></button>
              </>}
            </div>
          )}
        </div>
        {isMe && (
          <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0" style={{backgroundColor: avatarColor(item.author)}}>{avatarChar(item.author)}</div>
        )}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/30" onClick={onClose} />
      <div className="w-full max-w-lg bg-white h-full flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between px-5 py-4 border-b border-[#E5E7EB]">
          <div className="flex-1 min-w-0 pr-4">
            <div className="text-[10px] text-[#9E9E9E] mb-0.5">{s.departmentFullPath}</div>
            <div className="text-sm font-semibold text-[#1F2937] leading-snug">{s.problemTitle}</div>
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#F3F4F6] text-[#6B7280]">{s.annoyanceLevel}</span>
              {(Array.isArray(s.assignee) ? s.assignee : [s.assignee]).filter(a => a && a !== "未指定").map((a, i) => (
                <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-[#B5E1E5]/30 text-[#007A87]">{a}</span>
              ))}
            </div>
          </div>
          <button onClick={onClose} className="text-[#9E9E9E] hover:text-[#424242]"><X size={18} /></button>
        </div>

        {/* Info collapsible */}
        <details className="border-b border-[#E5E7EB]">
          <summary className="px-5 py-2.5 text-xs font-medium text-[#6B7280] cursor-pointer hover:bg-[#F9FAFB]">
            困擾詳情（點擊展開）
          </summary>
          <div className="px-5 py-3 space-y-2 bg-[#F9FAFB] text-xs">
            {s.painPoints?.length > 0 && <div><span className="text-[#9CA3AF] font-medium">痛點：</span>{s.painPoints.join("、")}</div>}
            {s.aiNeeds?.length > 0 && <div><span className="text-[#9CA3AF] font-medium">AI需求：</span>{s.aiNeeds.join("、")}</div>}
            {s.freeText && <div><span className="text-[#9CA3AF] font-medium">補充：</span>{s.freeText}</div>}
          </div>
        </details>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-5 py-3">
          {/* adminNote items */}
          {noteItems.map((item, idx) => (
            <NoteBubble key={item.id} item={item} idx={idx} total={noteItems.length} />
          ))}
          {/* discussions */}
          {topLevel.length === 0 && noteItems.length === 0 && (
            <div className="text-center text-xs text-[#9CA3AF] py-8">還沒有討論，來發起第一則吧！</div>
          )}
          {topLevel.map(msg => (
            <div key={msg.id}>
              <Bubble msg={msg} />
              {repliesOf(msg.id).map(reply => <Bubble key={reply.id} msg={reply} isReply />)}
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        {/* Reply indicator */}
        {replyTo && (
          <div className="px-5 py-2 bg-[#F3F4F6] border-t border-[#E5E7EB] flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs text-[#6B7280]">
              <CornerDownRight size={12} />
              <span>回覆 <span className="font-medium text-[#007A87]">{replyTo.author}</span>：{replyTo.content.slice(0,30)}{replyTo.content.length>30?"…":""}</span>
            </div>
            <button onClick={() => setReplyTo(null)} className="text-[#9CA3AF] hover:text-[#424242]"><X size={13} /></button>
          </div>
        )}

        {/* Input */}
        <div className="px-5 py-3 border-t border-[#E5E7EB] flex gap-2 items-end">
          <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
            style={{ backgroundColor: avatarColor(author) }}>
            {avatarChar(author)}
          </div>
          <textarea rows={1} value={input} onChange={e => setInput(e.target.value)}
            placeholder="輸入訊息... (Enter 送出，Shift+Enter 換行)"
            onKeyDown={async e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); await handleSend(); } }}
            className="flex-1 text-sm border border-[#E0E0E0] rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#007A87]/40 resize-none" />
          <button onClick={handleSend}
            className="p-2 bg-[#007A87] text-white rounded-xl hover:bg-[#00555E] transition-colors flex-shrink-0">
            <Send size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}
