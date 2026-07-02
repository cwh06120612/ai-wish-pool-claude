"use client";

import React, { useEffect, useMemo, useState, useCallback } from "react";
import {
  getTopics, getTopicStats, getTopicPosts, addTopic, addTopicPost,
  type Topic, type TopicPost, type TopicStat,
} from "@/lib/topics";
import { DepartmentSelector } from "@/components/department-selector";
import { EmptyState } from "@/components/ui/empty-state";
import {
  MessagesSquare, MessageSquare, Plus, ArrowLeft, Clock, User,
  Send, X, ChevronRight,
} from "lucide-react";

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

function fmtTime(iso: string) {
  return new Date(iso).toLocaleString("zh-TW", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

// ─── 開新主題 Modal ─────────────────────────────────────────────────────────────
function NewTopicModal({ onClose, onCreated }: { onClose: () => void; onCreated: (t: Topic) => void }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [name, setName] = useState(() => getPersonalInfo().name);
  const [deptPath, setDeptPath] = useState<string[]>(() => getPersonalInfo().deptPath);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [composing, setComposing] = useState(false);

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", h);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", h); document.body.style.overflow = ""; };
  }, [onClose]);

  async function handleSubmit() {
    if (composing) return;
    if (!title.trim()) { setError("請填一下主題名稱"); return; }
    setSubmitting(true);
    setError("");
    const created = await addTopic({ title, description, authorName: name, authorDept: deptPath.join(" > ") });
    setSubmitting(false);
    if (!created) { setError("建立失敗，請稍後再試（可能是資料表尚未建立）"); return; }
    onCreated(created);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-0 sm:px-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between gap-3 px-5 pt-4 pb-3 flex-shrink-0">
          <div className="flex items-center gap-1.5">
            <MessagesSquare size={16} className="text-[#007A87]" />
            <h2 className="text-base font-bold text-[#2D2D2D]">開一個新主題</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[#F0F4F4]"><X size={16} className="text-[#9E9E9E]" /></button>
        </div>
        <div className="border-t border-[#F0F4F4]" />
        <div className="overflow-y-auto px-5 py-4 space-y-4 flex-1">
          <div>
            <label className="block text-xs font-bold text-[#9E9E9E] uppercase tracking-wider mb-2">主題名稱</label>
            <input type="text" value={title} onChange={(e) => { setTitle(e.target.value); if (error) setError(""); }}
              placeholder="例如：BPM 簽核系統、豐譽 GPT、差勤系統…"
              className="w-full text-sm border border-[#E0E0E0] rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#007A87]/40" />
          </div>
          <div>
            <label className="block text-xs font-bold text-[#9E9E9E] uppercase tracking-wider mb-2">主題說明（選填）</label>
            <textarea rows={2} value={description}
              onChange={(e) => setDescription(e.target.value)}
              onCompositionStart={() => setComposing(true)}
              onCompositionEnd={(e) => { setComposing(false); setDescription(e.currentTarget.value); }}
              placeholder="這個主題想討論什麼？"
              className="w-full text-sm border border-[#E0E0E0] rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#007A87]/40 resize-none" />
          </div>
          <div>
            <label className="block text-xs font-bold text-[#9E9E9E] uppercase tracking-wider mb-2">你的部門（選填）</label>
            <DepartmentSelector value={deptPath} onChange={setDeptPath} portal />
          </div>
          <div>
            <label className="block text-xs font-bold text-[#9E9E9E] uppercase tracking-wider mb-2">你的姓名（選填）</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)}
              placeholder="不填顯示為匿名同仁"
              className="w-full text-sm border border-[#E0E0E0] rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#007A87]/40" />
          </div>
          {error && <p className="text-xs text-[#AE1914]">{error}</p>}
          <button type="button" onClick={handleSubmit} disabled={submitting || composing}
            className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-semibold bg-[#007A87] text-white hover:bg-[#00555E] transition-colors disabled:opacity-50">
            <Plus size={14} />{submitting ? "建立中…" : "建立主題"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── 討論串 ─────────────────────────────────────────────────────────────────────
function ThreadView({ topic, onBack }: { topic: Topic; onBack: () => void }) {
  const [posts, setPosts] = useState<TopicPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState("");
  const [name, setName] = useState(() => getPersonalInfo().name);
  const [deptPath, setDeptPath] = useState<string[]>(() => getPersonalInfo().deptPath);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [composing, setComposing] = useState(false);

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
    if (!content.trim()) { setError("留言不能是空的喔"); return; }
    setSubmitting(true);
    setError("");
    const created = await addTopicPost({ topicId: topic.id, content, authorName: name, authorDept: deptPath.join(" > ") });
    setSubmitting(false);
    if (!created) { setError("送出失敗，請稍後再試（可能是資料表尚未建立）"); return; }
    setPosts((prev) => [...prev, created]);
    setContent("");
  }

  return (
    <div>
      <button type="button" onClick={onBack}
        className="flex items-center gap-1.5 text-sm text-[#007A87] font-medium hover:underline mb-4">
        <ArrowLeft size={15} />返回主題列表
      </button>

      {/* 主題標頭 */}
      <div className="bg-white border border-[#E0E0E0]/80 rounded-2xl p-5 mb-4">
        <h1 className="text-lg font-bold text-[#2D2D2D] leading-snug">{topic.title}</h1>
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
          {posts.map((p) => (
            <div key={p.id} className="bg-white border border-[#E0E0E0]/80 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-1.5 text-xs text-[#9E9E9E]">
                <span className="font-semibold text-[#2D2D2D]">{p.authorName}</span>
                {p.authorDept && <span>· {displayDept(p.authorDept)}</span>}
                <span className="ml-auto flex items-center gap-1"><Clock size={10} />{fmtTime(p.createdAt)}</span>
              </div>
              <p className="text-sm text-[#2D2D2D] leading-relaxed whitespace-pre-wrap">{p.content}</p>
            </div>
          ))}
        </div>
      )}

      {/* 留言表單 */}
      <div className="bg-white border border-[#E0E0E0]/80 rounded-2xl p-4">
        <p className="text-xs font-bold text-[#9E9E9E] uppercase tracking-wider mb-2">在這個主題留言</p>
        <textarea rows={3} value={content}
          onChange={(e) => { setContent(e.target.value); if (error) setError(""); }}
          onCompositionStart={() => setComposing(true)}
          onCompositionEnd={(e) => { setComposing(false); setContent(e.currentTarget.value); }}
          placeholder="分享你在使用上的問題、心得或建議…"
          className="w-full text-sm border border-[#E0E0E0] rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#007A87]/40 resize-none mb-2" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2">
          <div>
            <span className="block text-xs text-[#616161] mb-1">部門（選填）</span>
            <DepartmentSelector value={deptPath} onChange={setDeptPath} />
          </div>
          <div>
            <span className="block text-xs text-[#616161] mb-1">姓名（選填）</span>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)}
              placeholder="不填顯示為匿名同仁"
              className="w-full text-sm border border-[#E0E0E0] rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#007A87]/40" />
          </div>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-[#AE1914]">{error}</span>
          <button type="button" onClick={handleSubmit} disabled={submitting || composing}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold bg-[#007A87] text-white hover:bg-[#00555E] transition-colors disabled:opacity-50">
            <Send size={13} />{submitting ? "送出中…" : "送出留言"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── 主頁 ─────────────────────────────────────────────────────────────────────
export default function TopicsPage() {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [stats, setStats] = useState<Record<string, TopicStat>>({});
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Topic | null>(null);
  const [showNew, setShowNew] = useState(false);

  const reload = useCallback(async () => {
    const [ts, st] = await Promise.all([getTopics(), getTopicStats()]);
    setTopics(ts);
    setStats(st);
    setLoading(false);
  }, []);

  useEffect(() => {
    reload();
    const timer = setInterval(reload, 30000);
    return () => clearInterval(timer);
  }, [reload]);

  // 依「最後活動時間」排序（有留言的排前面，越新越前）
  const sortedTopics = useMemo(() => {
    return [...topics].sort((a, b) => {
      const la = stats[a.id]?.lastAt ?? a.createdAt;
      const lb = stats[b.id]?.lastAt ?? b.createdAt;
      return lb.localeCompare(la);
    });
  }, [topics, stats]);

  if (selected) {
    return (
      <div className="max-w-[860px] mx-auto px-6 py-8">
        <ThreadView topic={selected} onBack={() => { setSelected(null); reload(); }} />
      </div>
    );
  }

  return (
    <div className="max-w-[860px] mx-auto px-6 py-8">
      <div className="flex items-center justify-between gap-3 mb-2">
        <div className="flex items-center gap-2">
          <MessagesSquare size={20} className="text-[#007A87]" />
          <h1 className="text-2xl font-bold text-[#2D2D2D]">主題討論</h1>
        </div>
        <button type="button" onClick={() => setShowNew(true)}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold bg-[#007A87] text-white hover:bg-[#00555E] transition-colors flex-shrink-0">
          <Plus size={15} />開新主題
        </button>
      </div>
      <p className="text-sm text-[#9E9E9E] mb-5">依主題（例如某個系統）開討論串，在裡面留下使用上的問題、心得或建議。</p>

      {loading ? (
        <div className="py-16 text-center text-sm text-[#9E9E9E]">載入中…</div>
      ) : sortedTopics.length === 0 ? (
        <EmptyState
          title="還沒有任何主題"
          description="開一個主題，開始跟大家討論吧。"
          icon={<MessagesSquare size={20} className="text-[#9E9E9E]" />}
          action={<button type="button" onClick={() => setShowNew(true)} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-[#007A87] text-white hover:bg-[#00555E] transition-colors"><Plus size={14} />開新主題</button>}
        />
      ) : (
        <div className="space-y-3">
          {sortedTopics.map((t) => {
            const st = stats[t.id];
            return (
              <button key={t.id} type="button" onClick={() => setSelected(t)}
                className="w-full text-left bg-white border border-[#E0E0E0]/80 rounded-2xl p-4 hover:shadow-md hover:-translate-y-0.5 transition-all group flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#B5E1E5]/40 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <MessageSquare size={16} className="text-[#007A87]" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-[#2D2D2D] leading-snug group-hover:text-[#007A87] transition-colors">{t.title}</h3>
                  {t.description && <p className="text-xs text-[#616161] mt-0.5 line-clamp-1">{t.description}</p>}
                  <div className="flex items-center gap-x-3 gap-y-1 mt-1.5 text-[11px] text-[#9E9E9E] flex-wrap">
                    <span className="flex items-center gap-1"><User size={10} />{t.authorName}{t.authorDept ? ` · ${displayDept(t.authorDept)}` : ""}</span>
                    <span className="flex items-center gap-1"><MessageSquare size={10} />{st?.count ?? 0} 則留言</span>
                    {st?.lastAt && <span className="flex items-center gap-1"><Clock size={10} />最後活動 {fmtTime(st.lastAt)}</span>}
                  </div>
                </div>
                <ChevronRight size={16} className="text-[#BDBDBD] group-hover:text-[#007A87] transition-colors flex-shrink-0 mt-1" />
              </button>
            );
          })}
        </div>
      )}

      {showNew && (
        <NewTopicModal
          onClose={() => setShowNew(false)}
          onCreated={(t) => { setShowNew(false); setTopics((prev) => [t, ...prev]); setSelected(t); }}
        />
      )}
    </div>
  );
}
