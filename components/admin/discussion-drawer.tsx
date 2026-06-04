"use client";
import { useState, useEffect, useRef } from "react";
import { X, CornerDownRight, Send } from "lucide-react";
import { getDiscussions, addDiscussion, markRead, Discussion } from "@/lib/discussions";
import { updateSubmissionAsync } from "@/lib/storage";
import type { Submission } from "@/types/submission";

interface Props {
  submission: Submission;
  author: string;
  onClose: () => void;
  onAdminNoteChange?: (newNote: string) => void;
}

export function DiscussionDrawer({ submission: s, author, onClose, onAdminNoteChange }: Props) {
  const [messages, setMessages] = useState<Discussion[]>([]);
  const [input, setInput] = useState("");
  const [replyTo, setReplyTo] = useState<Discussion | null>(null);
  const [editNoteIdx, setEditNoteIdx] = useState<number | null>(null);
  const [editNoteVal, setEditNoteVal] = useState("");
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
    setInput("");
    setReplyTo(null);
    await load();
  }

  // Group messages with their replies
  const topLevel = messages.filter(m => !m.replyTo);
  const repliesOf = (id: string) => messages.filter(m => m.replyTo === id);

  function formatTime(iso: string) {
    return new Date(iso).toLocaleString("zh-TW", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
  }

  const avatarColor = (name: string) => name === "管理者" ? "#007A87" : "#BE8B55";
  const avatarChar = (name: string) => name === "管理者" ? "管" : name.charAt(0);

  function MsgBubble({ msg, isReply }: { msg: Discussion; isReply?: boolean }) {
    const isMe = msg.author === author;
    return (
      <div className={`flex gap-2 items-start ${isReply ? "ml-8 mt-1" : "mt-2"}`}>
        {!isMe && (
          <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0 mt-0.5"
            style={{ backgroundColor: avatarColor(msg.author) }}>
            {avatarChar(msg.author)}
          </div>
        )}
        <div className={`flex-1 ${isMe ? "flex flex-col items-end" : ""}`}>
          {!isMe && (
            <div className="flex items-baseline gap-1.5 mb-0.5">
              <span className="text-[10px] font-medium text-[#424242]">{msg.author}</span>
              <span className="text-[9px] text-[#9E9E9E]">{formatTime(msg.createdAt)}</span>
            </div>
          )}
          {isMe && <span className="text-[9px] text-[#9E9E9E] mb-0.5">{formatTime(msg.createdAt)}</span>}
          <div className={`relative px-3 py-1.5 rounded-xl text-xs leading-relaxed max-w-[85%] ${
            isMe ? "bg-[#007A87] text-white rounded-tr-sm" : "bg-[#F3F4F6] text-[#424242] rounded-tl-sm"
          }`}>
            {isReply && (
              <div className={`text-[9px] mb-1 opacity-70 flex items-center gap-0.5`}>
                <CornerDownRight size={9} />
                {msg.replyTo && messages.find(m => m.id === msg.replyTo)?.author}
              </div>
            )}
            <span className="whitespace-pre-wrap">{msg.content}</span>
          </div>
          {!isReply && (
            <button type="button" onClick={() => setReplyTo(msg)}
              className="text-[9px] text-[#9E9E9E] hover:text-[#007A87] mt-0.5 flex items-center gap-0.5">
              <CornerDownRight size={9} />回覆
            </button>
          )}
        </div>
        {isMe && (
          <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0 mt-0.5"
            style={{ backgroundColor: avatarColor(msg.author) }}>
            {avatarChar(msg.author)}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div className="flex-1 bg-black/30" onClick={onClose} />
      {/* Drawer */}
      <div className="w-full max-w-2xl bg-white h-full flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between px-5 py-4 border-b border-[#E5E7EB]">
          <div className="flex-1 min-w-0 pr-4">
            <div className="text-xs text-[#9E9E9E] mb-0.5">{s.departmentFullPath}</div>
            <div className="text-sm font-semibold text-[#1F2937] leading-snug">{s.problemTitle}</div>
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#F3F4F6] text-[#6B7280]">{s.annoyanceLevel}</span>
              {(Array.isArray(s.assignee) ? s.assignee : [s.assignee]).filter(a => a && a !== "未指定").map((a, i) => (
                <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-[#B5E1E5]/30 text-[#007A87]">{a}</span>
              ))}
            </div>
          </div>
          <button onClick={onClose} className="text-[#9E9E9E] hover:text-[#424242] flex-shrink-0">
            <X size={18} />
          </button>
        </div>

        {/* Info panel (collapsible) */}
        <details className="border-b border-[#E5E7EB]">
          <summary className="px-5 py-2.5 text-xs font-medium text-[#6B7280] cursor-pointer hover:bg-[#F9FAFB] flex items-center gap-1.5">
            <span>困擾詳情</span>
            <span className="text-[10px] text-[#9CA3AF]">（點擊展開）</span>
          </summary>
          <div className="px-5 py-3 space-y-2.5 bg-[#F9FAFB]">
            {s.painPoints?.length > 0 && (
              <div>
                <div className="text-[10px] font-medium text-[#9CA3AF] mb-1">痛點</div>
                <div className="flex flex-wrap gap-1">{s.painPoints.map((p,i) => <span key={i} className="text-[10px] px-2 py-0.5 bg-white border border-[#E5E7EB] rounded-full text-[#6B7280]">{p}</span>)}</div>
              </div>
            )}
            {s.aiNeeds?.length > 0 && (
              <div>
                <div className="text-[10px] font-medium text-[#9CA3AF] mb-1">AI 需求</div>
                <div className="flex flex-wrap gap-1">{s.aiNeeds.map((n,i) => <span key={i} className="text-[10px] px-2 py-0.5 bg-white border border-[#E5E7EB] rounded-full text-[#6B7280]">{n}</span>)}</div>
              </div>
            )}
            {s.freeText && (
              <div>
                <div className="text-[10px] font-medium text-[#9CA3AF] mb-1">補充說明</div>
                <div className="text-xs text-[#6B7280] leading-relaxed">{s.freeText}</div>
              </div>
            )}
          </div>
        </details>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-5 py-3">
          {/* Existing adminNote messages */}
        {s.adminNote && s.adminNote.trim() && (
          <div className="mb-2 pb-2 border-b border-[#E5E7EB]">
            <p className="text-[9px] text-[#9CA3AF] mb-1.5 px-1">舊備註記錄</p>
            {s.adminNote.split(/(?=\[.+? \d{4}\/\d{2}\/\d{2}.+?\] )/).filter(Boolean).map((line, i, arr) => {
              const match = line.match(/^\[(.+?) (\d{4}\/\d{2}\/\d{2}.+?)\] ([\s\S]+)$/);
              if (!match) return <div key={i} className="text-xs text-[#9CA3AF] px-2 py-1 bg-[#F9FAFB] rounded-lg mb-1">{line}</div>;
              const [, noteAuthor, noteDatetime, noteContent] = match;
              const isMe = noteAuthor === author;
              const avatarColor = noteAuthor === '管理者' ? '#007A87' : '#BE8B55';
              const prevMatch = i > 0 ? arr[i-1].match(/^\[(.+?) /) : null;
              const isContinued = prevMatch && prevMatch[1] === noteAuthor;
              const canEdit = noteAuthor === author;
              return (
                <div key={i} className={`flex gap-2 items-start mb-1 ${isMe ? "flex-row-reverse" : ""}`}>
                  {!isContinued
                    ? <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0" style={{backgroundColor: avatarColor}}>{noteAuthor === '管理者' ? '管' : noteAuthor.charAt(0)}</div>
                    : <div className="w-6 flex-shrink-0" />
                  }
                  <div className="flex-1">
                    {!isContinued && <div className={`flex items-baseline gap-1.5 mb-0.5 ${isMe ? "justify-end" : ""}`}><span className="text-[10px] font-medium text-[#424242]">{noteAuthor}</span><span className="text-[9px] text-[#9CA3AF]">{noteDatetime}</span>{canEdit && editNoteIdx !== i && <span className="flex gap-1"><button type="button" onClick={() => { setEditNoteIdx(i); setEditNoteVal(noteContent); }} className="text-[9px] text-[#9CA3AF] hover:text-[#007A87]">編輯</button><button type="button" onClick={async () => { setEditNoteIdx(i); setEditNoteVal("__delete__"); }} className="text-[9px] text-[#9CA3AF] hover:text-[#AE1914]">刪除</button></span>}</div>}
                    {editNoteIdx === i && editNoteVal === "__delete__" ? (
                      <div className="bg-[#FDF2F2] border border-[#EBCDCC] rounded-xl px-3 py-2 text-xs">
                        <p className="text-[#AE1914] mb-2">確定要刪除？</p>
                        <div className="flex gap-2">
                          <button type="button" className="px-3 py-1 bg-[#AE1914] text-white text-xs rounded-lg" onClick={async () => { const lines = arr.filter((_,j) => j !== i); const newNote = lines.join("\n"); setEditNoteIdx(null); onAdminNoteChange?.(newNote); await updateSubmissionAsync(s.id, { adminNote: newNote }); }}>確定</button>
                          <button type="button" className="px-3 py-1 bg-white border border-[#E0E0E0] text-xs rounded-lg" onClick={() => setEditNoteIdx(null)}>取消</button>
                        </div>
                      </div>
                    ) : editNoteIdx === i ? (
                      <div className="space-y-1">
                        <textarea rows={2} value={editNoteVal} onChange={e => setEditNoteVal(e.target.value)} className="w-full text-xs border border-[#007A87] rounded-xl px-2 py-1.5 resize-none focus:outline-none" />
                        <div className="flex gap-1.5">
                          <button type="button" className="px-2 py-1 bg-[#007A87] text-white text-xs rounded-lg" onClick={async () => { const newLine = `[${noteAuthor} ${noteDatetime}] ${editNoteVal.trim()}`; const lines = arr.slice(); lines[i] = newLine; const newNote = lines.join("\n"); setEditNoteIdx(null); onAdminNoteChange?.(newNote); await updateSubmissionAsync(s.id, { adminNote: newNote }); }}>儲存</button>
                          <button type="button" className="px-2 py-1 bg-white border border-[#E0E0E0] text-xs rounded-lg" onClick={() => setEditNoteIdx(null)}>取消</button>
                        </div>
                      </div>
                    ) : (
                      <div className={`px-3 py-1.5 rounded-xl text-xs leading-relaxed ${isMe ? "bg-[#007A87] text-white rounded-tr-sm" : "bg-[#F3F4F6] text-[#424242] rounded-tl-sm"}`}>{noteContent}</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {messages.length === 0 && !s.adminNote?.trim() && (
            <div className="text-center text-xs text-[#9CA3AF] py-8">還沒有討論，來發起第一則吧！</div>
          )}
          {topLevel.map(msg => (
            <div key={msg.id}>
              <MsgBubble msg={msg} />
              {repliesOf(msg.id).map(reply => (
                <MsgBubble key={reply.id} msg={reply} isReply />
              ))}
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        {/* Reply indicator */}
        {replyTo && (
          <div className="px-5 py-2 bg-[#F3F4F6] border-t border-[#E5E7EB] flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs text-[#6B7280]">
              <CornerDownRight size={12} />
              <span>回覆 <span className="font-medium text-[#007A87]">{replyTo.author}</span>：{replyTo.content.slice(0, 30)}{replyTo.content.length > 30 ? "…" : ""}</span>
            </div>
            <button onClick={() => setReplyTo(null)} className="text-[#9CA3AF] hover:text-[#424242]"><X size={13} /></button>
          </div>
        )}

        {/* Input */}
        <div className="px-5 py-3 border-t border-[#E5E7EB] flex gap-2 items-end">
          <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0"
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
