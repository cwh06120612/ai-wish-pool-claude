"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { getSubmissionsAsync } from "@/lib/storage";
import { getAllFeedbacks, addFeedback, type Feedback } from "@/lib/feedback";
import type { Submission } from "@/types/submission";
import { StarRating } from "@/components/ui/star-rating";
import { DepartmentSelector } from "@/components/department-selector";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Sparkles, Rocket, ThumbsUp, CheckCircle2, Clock, Quote,
  TrendingUp, MessageSquareHeart, ArrowRight, MapPin, X, Send, PenLine, Check,
} from "lucide-react";

function getPersonalInfo() {
  try {
    const raw = localStorage.getItem("ai-wish-personal-info");
    if (raw) {
      const info = JSON.parse(raw);
      const deptPath = Array.isArray(info.departmentPath) ? (info.departmentPath as string[]) : [];
      return {
        name: (info.name as string) ?? "",
        dept: deptPath.join(" > "),
        deptPath,
      };
    }
  } catch {}
  return { name: "", dept: "", deptPath: [] as string[] };
}

const IN_PROGRESS_STATUSES = ["整理中", "評估中", "尋找工具中", "測試中"];

// 尚無真實回饋時，用「明確標示為示意」的範例把版面撐起來。真回饋進來就自動取代。
const SAMPLE_FEEDBACKS = [
  { authorName: "示意範例", authorDept: "工務部", rating: 5, content: "以前每天要花快一小時整理資料，現在幾分鐘就好，真的有感！" },
  { authorName: "示意範例", authorDept: "管理部", rating: 5, content: "會議紀錄不用再自己聽打，省下很多時間可以做更重要的事。" },
  { authorName: "示意範例", authorDept: "業務部", rating: 4, content: "報表自動化之後錯誤變少，主管也比較放心，謝謝數創處。" },
];

function displayDept(dept: string) {
  if (!dept) return "";
  return dept.split(" > ").slice(-1)[0];
}

// ─── KPI 卡 ───────────────────────────────────────────────────────────────────
function Kpi({ icon, label, value, sub, color = "#007A87" }: {
  icon: React.ReactNode; label: string; value: number | string; sub?: string; color?: string;
}) {
  return (
    <div className="bg-white border border-[#E0E0E0]/80 rounded-2xl p-4 flex flex-col gap-1">
      <div className="flex items-center gap-1.5" style={{ color }}>
        {icon}
        <span className="text-2xl font-bold leading-none">{value}</span>
      </div>
      <div className="text-xs font-semibold text-[#2D2D2D] mt-1">{label}</div>
      {sub && <div className="text-[11px] text-[#9E9E9E]">{sub}</div>}
    </div>
  );
}

function SectionTitle({ icon, children, hint }: { icon?: React.ReactNode; children: React.ReactNode; hint?: string }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      {icon}
      <h2 className="text-sm font-bold text-[#2D2D2D]">{children}</h2>
      {hint && <span className="text-xs text-[#9E9E9E]">{hint}</span>}
    </div>
  );
}

// ─── 回饋填寫 Modal ─────────────────────────────────────────────────────────────
function FeedbackModal({ submissions, preselectedId, onClose, onSubmitted }: {
  submissions: Submission[];
  preselectedId: string | null;
  onClose: () => void;
  onSubmitted: () => void;
}) {
  const [name, setName] = useState(() => getPersonalInfo().name);
  const [deptPath, setDeptPath] = useState<string[]>(() => getPersonalInfo().deptPath);
  const [rating, setRating] = useState(0);
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const [composing, setComposing] = useState(false);

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", h);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", h); document.body.style.overflow = ""; };
  }, [onClose]);

  const target = preselectedId ? submissions.find((s) => s.id === preselectedId) : undefined;

  async function handleSubmit() {
    if (composing) return;
    if (deptPath.length === 0) { setError("請選一下你的部門"); return; }
    if (rating === 0) { setError("幫我們選一下幾顆星吧"); return; }
    setSubmitting(true);
    setError("");
    const created = await addFeedback({ submissionId: preselectedId ?? null, authorName: name, authorDept: deptPath.join(" > "), rating, content });
    setSubmitting(false);
    if (!created) { setError("送出失敗，請稍後再試（可能是回饋資料表尚未建立）"); return; }
    setDone(true);
    onSubmitted();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-0 sm:px-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between gap-3 px-5 pt-4 pb-3 flex-shrink-0">
          <div className="flex items-center gap-1.5">
            <MessageSquareHeart size={16} className="text-[#AE1914]" />
            <h2 className="text-base font-bold text-[#2D2D2D]">分享你的回饋</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[#F0F4F4]"><X size={16} className="text-[#9E9E9E]" /></button>
        </div>
        <div className="border-t border-[#F0F4F4]" />

        {done ? (
          <div className="px-5 py-8 text-center flex flex-col items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-[#EAF7EE] flex items-center justify-center">
              <Check size={22} className="text-[#198754]" />
            </div>
            <p className="text-sm text-[#2D2D2D] font-semibold">謝謝你的回饋！</p>
            <p className="text-xs text-[#9E9E9E] leading-relaxed">你的回饋已顯示在下方的「同仁怎麼說」，鼓勵我們繼續做下去。</p>
            <button onClick={onClose} className="mt-2 px-5 py-2 rounded-xl text-sm font-semibold bg-[#007A87] text-white hover:bg-[#00555E] transition-colors">關閉</button>
          </div>
        ) : (
          <div className="overflow-y-auto px-5 py-4 space-y-4 flex-1">
            {/* 案例情境（從成功案例卡進來時顯示）*/}
            {target && (
              <div className="text-xs text-[#7A5A30] bg-[#F5EDE2]/60 border border-[#E0C8AE] rounded-lg px-3 py-2">
                回饋對象：<span className="font-semibold">{target.problemTitle}</span>
              </div>
            )}
            {/* 部門 */}
            <div>
              <label className="block text-xs font-bold text-[#9E9E9E] uppercase tracking-wider mb-2">你的部門</label>
              <DepartmentSelector value={deptPath} onChange={(p) => { setDeptPath(p); if (error) setError(""); }} portal />
            </div>
            {/* 姓名（選填）*/}
            <div>
              <label className="block text-xs font-bold text-[#9E9E9E] uppercase tracking-wider mb-2">你的姓名（選填）</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)}
                placeholder="不填顯示為匿名同仁"
                className="w-full text-sm border border-[#E0E0E0] rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#007A87]/40" />
            </div>
            {/* 星等 */}
            <div>
              <label className="block text-xs font-bold text-[#9E9E9E] uppercase tracking-wider mb-2">你的評價</label>
              <StarRating value={rating} onChange={(v) => { setRating(v); if (error) setError(""); }} size={26} />
            </div>
            {/* 內容 */}
            <div>
              <label className="block text-xs font-bold text-[#9E9E9E] uppercase tracking-wider mb-2">想說的話（選填）</label>
              <textarea rows={3} value={content}
                onChange={(e) => setContent(e.target.value)}
                onCompositionStart={() => setComposing(true)}
                onCompositionEnd={(e) => { setComposing(false); setContent(e.currentTarget.value); }}
                placeholder="說說哪裡幫到你、省了多少時間，或還有什麼期待…"
                className="w-full text-sm border border-[#E0E0E0] rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#007A87]/40 resize-none" />
            </div>
            {error && <p className="text-xs text-[#AE1914]">{error}</p>}
            <button type="button" onClick={handleSubmit} disabled={submitting || composing}
              className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-semibold bg-[#007A87] text-white hover:bg-[#00555E] transition-colors disabled:opacity-50">
              <Send size={13} />{submitting ? "送出中…" : "送出回饋"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── 回饋卡 ─────────────────────────────────────────────────────────────────────
function FeedbackCard({ fb, caseTitle, isSample }: { fb: { authorName: string; authorDept: string; rating: number; content: string }; caseTitle?: string; isSample?: boolean }) {
  return (
    <div className={`rounded-2xl p-4 flex flex-col ${isSample ? "bg-[#F7F7F5] border border-dashed border-[#D0D0D0]" : "bg-white border border-[#E0E0E0]/80 shadow-sm"}`}>
      <div className="flex items-center justify-between mb-2">
        <StarRating value={fb.rating} readOnly size={14} />
        {isSample && <span className="text-[10px] font-bold text-[#9E9E9E] bg-[#EDEDED] px-2 py-0.5 rounded-full">示意</span>}
      </div>
      <div className="flex-1">
        <Quote size={14} className="text-[#BE8B55] mb-1" />
        <p className="text-sm text-[#2D2D2D] leading-relaxed">{fb.content}</p>
      </div>
      <div className="mt-3 pt-2 border-t border-[#F0F4F4] text-[11px] text-[#9E9E9E]">
        <span className="font-semibold text-[#616161]">{fb.authorName}</span>
        {fb.authorDept && <span> · {displayDept(fb.authorDept)}</span>}
        {caseTitle && <p className="mt-0.5 truncate">回饋於「{caseTitle}」</p>}
      </div>
    </div>
  );
}

// ─── 主頁 ─────────────────────────────────────────────────────────────────────
export default function ImpactPage() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [feedbackFor, setFeedbackFor] = useState<{ id: string | null } | null>(null);

  useEffect(() => {
    async function load() {
      const [subs, fbs] = await Promise.all([getSubmissionsAsync(), getAllFeedbacks()]);
      // 統計要涵蓋全部需求（含不公開），清單/回饋牆才另外過濾成可公開的
      setSubmissions(subs);
      setFeedbacks(fbs);
      setLoaded(true);
    }
    load();
    const timer = setInterval(load, 30000);
    return () => clearInterval(timer);
  }, []);

  async function refreshFeedbacks() {
    setFeedbacks(await getAllFeedbacks());
  }

  // 統計：涵蓋全部需求（公開＋不公開）
  const stats = useMemo(() => {
    const total = submissions.length;
    const implemented = submissions.filter((s) => s.status === "已導入").length;
    const inProgress = submissions.filter((s) => IN_PROGRESS_STATUSES.includes(s.status)).length;
    const actionable = submissions.filter((s) => s.status !== "暫不處理").length;
    const completionRate = actionable > 0 ? Math.round((implemented / actionable) * 100) : 0;
    return { total, implemented, inProgress, completionRate };
  }, [submissions]);

  // 對外顯示（清單、回饋牆標題、回饋 Modal）只用可公開的需求，避免外洩不公開內容
  const visibleSubmissions = useMemo(() => submissions.filter((s) => s.isVisible), [submissions]);

  const deliveredCases = useMemo(
    () => visibleSubmissions.filter((s) => s.status === "已導入").sort((a, b) => b.likeCount - a.likeCount),
    [visibleSubmissions]
  );

  const titleById = useMemo(() => {
    const m: Record<string, string> = {};
    visibleSubmissions.forEach((s) => { m[s.id] = s.publicSummary || s.problemTitle; });
    return m;
  }, [visibleSubmissions]);

  const hasRealFeedback = feedbacks.length > 0;

  return (
    <div className="max-w-[900px] mx-auto px-6 py-10">
      {/* Hero */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-[#2D2D2D] mb-3 leading-tight tracking-tight">
          大家的需求，<span className="text-[#007A87]">我們處理到哪了</span>
        </h1>
        <p className="text-[#616161] text-sm leading-relaxed max-w-xl mx-auto">
          每一則需求我們都有收到、也在推進。
          <br />
          這裡即時呈現處理進度與已經落地的成果，讓你看得到——你說的，我們有在做。
        </p>
      </div>

      {!loaded ? (
        <div className="py-16 text-center text-sm text-[#9E9E9E]">載入中…</div>
      ) : stats.total === 0 ? (
        <EmptyState
          title="還沒有需求資料"
          description="等同仁開始許願、我們開始處理後，成果就會呈現在這裡。"
          action={<Link href="/wish" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-[#007A87] text-white hover:bg-[#00555E] transition-colors"><Sparkles size={14} />去許個願</Link>}
        />
      ) : (
        <div className="space-y-10">
          {/* KPI */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Kpi icon={<TrendingUp size={16} />} label="收到的需求" value={stats.total} sub="累計" color="#007A87" />
            <Kpi icon={<CheckCircle2 size={16} />} label="已導入落地" value={stats.implemented} sub="完成處理" color="#198754" />
            <Kpi icon={<Clock size={16} />} label="積極處理中" value={stats.inProgress} sub="評估到測試" color="#FFAE00" />
            <Kpi icon={<Rocket size={16} />} label="導入完成率" value={`${stats.completionRate}%`} sub="已導入" color="#BE8B55" />
          </div>

          {/* 已導入需求清單 */}
          <div>
            <SectionTitle
              icon={<Rocket size={15} className="text-[#BE8B55]" />}
              hint={stats.implemented > deliveredCases.length
                ? `共 ${stats.implemented} 個已導入，此處僅顯示 ${deliveredCases.length} 個公開項目`
                : `${deliveredCases.length} 個已導入・僅顯示公開項目`}
            >已經幫大家解決的事</SectionTitle>
            {deliveredCases.length === 0 ? (
              <div className="border border-[#E0E0E0]/80 rounded-2xl bg-white px-4 py-8 text-center text-sm text-[#9E9E9E]">
                {stats.implemented > 0
                  ? `目前已導入 ${stats.implemented} 個需求，但都尚未設為公開，所以這裡暫時不顯示內容。`
                  : "目前還沒有已導入的需求，處理完成後會陸續出現在這裡。"}
              </div>
            ) : (
              <div className="border border-[#E0E0E0]/80 rounded-2xl bg-white divide-y divide-[#F0F4F4] overflow-hidden">
                {deliveredCases.map((item) => {
                  const isPublic = item.shareMode === "願意分享（公開內容、部門、姓名）";
                  const dept = isPublic ? displayDept(item.departmentFullPath) : null;
                  return (
                    <div key={item.id} className="flex items-start gap-3 px-4 py-3">
                      <CheckCircle2 size={15} className="text-[#198754] flex-shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[#2D2D2D] leading-snug">{item.problemTitle}</p>
                        {item.publicSummary && <p className="text-xs text-[#7A5A30] mt-0.5 line-clamp-1">{item.publicSummary}</p>}
                        <div className="flex items-center gap-3 mt-1 text-[11px] text-[#9E9E9E]">
                          <span className="flex items-center gap-1">{dept ? <><MapPin size={10} />{dept}</> : "跨部門需求"}</span>
                          <span className="flex items-center gap-1 text-[#007A87] font-semibold"><ThumbsUp size={10} />{item.likeCount}</span>
                        </div>
                      </div>
                      <button type="button" onClick={() => setFeedbackFor({ id: item.id })}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold text-[#007A87] bg-[#007A87]/[0.08] hover:bg-[#007A87]/15 transition-colors flex-shrink-0">
                        <PenLine size={11} />留回饋
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* 真實回饋牆 */}
          <div>
            <div className="flex items-center justify-between gap-3 mb-3">
              <div className="flex items-center gap-2 min-w-0">
                <MessageSquareHeart size={15} className="text-[#AE1914] flex-shrink-0" />
                <h2 className="text-sm font-bold text-[#2D2D2D] flex-shrink-0">同仁怎麼說</h2>
                <span className="text-xs text-[#9E9E9E] truncate">{hasRealFeedback ? `${feedbacks.length} 則同仁回饋` : "尚無真實回饋"}</span>
              </div>
              <button type="button" onClick={() => setFeedbackFor({ id: null })}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-[#007A87] text-white hover:bg-[#00555E] transition-colors flex-shrink-0">
                <PenLine size={13} />我要留回饋
              </button>
            </div>
            {!hasRealFeedback && (
              <div className="mb-3 flex items-start gap-2 bg-[#FFF8E6] border border-[#FFE7A3] rounded-xl px-4 py-2.5">
                <Quote size={14} className="text-[#BE8B55] flex-shrink-0 mt-0.5" />
                <p className="text-xs text-[#7A5A30] leading-relaxed">
                  以下為<b>示意範例</b>，用來預覽版面。等同仁在「已導入」的需求下留下真實回饋後，這裡就會自動換成真實內容。
                </p>
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {hasRealFeedback
                ? feedbacks.slice(0, 6).map((fb) => (
                    <FeedbackCard key={fb.id} fb={fb} caseTitle={fb.submissionId ? titleById[fb.submissionId] : undefined} />
                  ))
                : SAMPLE_FEEDBACKS.map((fb, i) => <FeedbackCard key={i} fb={fb} isSample />)}
            </div>
          </div>

          {/* CTA */}
          <div className="bg-gradient-to-br from-[#007A87] to-[#00555E] rounded-2xl px-5 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-white">
            <div className="min-w-0">
              <h3 className="text-base font-bold">還有讓你頭痛的事嗎？</h3>
              <p className="text-xs text-white/85 mt-0.5">你說出來，就有機會變成下一個落地的成果。</p>
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <Link href="/wish" className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold bg-white text-[#007A87] hover:bg-[#F0F4F4] transition-colors">
                <Sparkles size={14} />許個願
              </Link>
              <Link href="/board" className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold bg-white/15 text-white border border-white/30 hover:bg-white/25 transition-colors">
                看大家的需求<ArrowRight size={14} />
              </Link>
            </div>
          </div>
        </div>
      )}

      {feedbackFor && (
        <FeedbackModal
          submissions={visibleSubmissions}
          preselectedId={feedbackFor.id}
          onClose={() => setFeedbackFor(null)}
          onSubmitted={refreshFeedbacks}
        />
      )}
    </div>
  );
}
