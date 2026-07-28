"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getSubmissionsAsync, incrementLikeAsync, decrementLikeAsync } from "@/lib/storage";
import { getFeedbacks, addFeedback, type Feedback } from "@/lib/feedback";
import { getOrCreateTopicForSubmission } from "@/lib/topics";
import { Linkify } from "@/components/ui/linkify";
import { InlineFilterDropdown } from "@/components/ui/inline-filter-dropdown";
import type { Submission } from "@/types/submission";
import { EmptyState } from "@/components/ui/empty-state";
import { StarRating } from "@/components/ui/star-rating";
import { DepartmentSelector } from "@/components/department-selector";
import { Search, ThumbsUp, Clock, MapPin, User, ChevronRight, Check, Sparkles, X, SlidersHorizontal, MessageSquareHeart, Quote, Send, MessagesSquare, CircleSlash } from "lucide-react";

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

type SortOption = "newest" | "oldest" | "likes";

const ANNOYANCE_ORDER = [
  "已經麻痺，每天都這樣",
  "很煩，希望優先處理",
  "有點煩，改善會很有感",
  "還好，但可以優化",
];

const ANNOYANCE_STYLE: Record<string, { bar: string; badge: string; text: string; border: string; labelBg: string; labelText: string; icon: string; sectionBg: string }> = {
  "已經麻痺，每天都這樣": { bar: "bg-[#AE1914]", badge: "bg-[#EBCDCC]", text: "text-[#8C1915]", border: "border-[#AE1914]/25", labelBg: "bg-[#EBCDCC]", labelText: "text-[#8C1915]", icon: "🔥", sectionBg: "bg-[#FDF4F4]" },
  "很煩，希望優先處理":   { bar: "bg-[#FFAE00]", badge: "bg-[#FFF3CD]", text: "text-[#92400e]", border: "border-[#FFAE00]/35", labelBg: "bg-[#FFF3CD]", labelText: "text-[#92400e]", icon: "😤", sectionBg: "bg-[#FDFAF0]" },
  "有點煩，改善會很有感": { bar: "bg-[#007A87]", badge: "bg-[#B5E1E5]/40", text: "text-[#00555E]", border: "border-[#007A87]/20", labelBg: "bg-[#B5E1E5]/40", labelText: "text-[#00555E]", icon: "😑", sectionBg: "bg-[#EFF7F8]" },
  "還好，但可以優化":     { bar: "bg-[#BDBDBD]", badge: "bg-[#F0F4F4]", text: "text-[#616161]", border: "border-[#BDBDBD]/30", labelBg: "bg-[#F0F4F4]", labelText: "text-[#616161]", icon: "🤔", sectionBg: "bg-[#F8F8F8]" },
};

const BOARD_STATUS_STYLE: Record<string, { bg: string; text: string }> = {
  "已收到":     { bg: "#F5EDE2", text: "#8C6A3F" },
  "整理中":     { bg: "#EDDDCA", text: "#7A5A30" },
  "評估中":     { bg: "#E3CBB0", text: "#6A4A20" },
  "尋找工具中": { bg: "#D6B892", text: "#5A3A10" },
  "測試中":     { bg: "#C8A070", text: "#ffffff" },
  "已導入":     { bg: "#BE8B55", text: "#ffffff" },
  "暫不處理":   { bg: "#E0E0E0", text: "#9E9E9E" },
};

function BoardStatusTag({ status }: { status: string }) {
  const s = BOARD_STATUS_STYLE[status] ?? { bg: "#E0E0E0", text: "#9E9E9E" };
  return <span className="inline-flex items-center text-xs px-2 py-0.5 rounded-full font-semibold" style={{ backgroundColor: s.bg, color: s.text }}>{status}</span>;
}

function getDisplayName(s: Submission) {
  return s.shareMode === "願意分享（公開內容、部門、姓名）" ? s.name : "匿名同仁";
}
function getDisplayDept(s: Submission) {
  return s.shareMode === "願意分享（公開內容、部門、姓名）" ? s.departmentFullPath : null;
}

// ─── Coin button ──────────────────────────────────────────────────────────────
function CoinButton({ href }: { href: string }) {
  const [throwing, setThrowing] = useState(false);
  function handleClick(e: React.MouseEvent) {
    if (throwing) return;
    e.preventDefault();
    setThrowing(true);
    setTimeout(() => { window.location.href = href; }, 700);
  }
  return (
    <a href={href} onClick={handleClick}
      className="relative inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold bg-[#007A87] text-white shadow-md hover:bg-[#00555E] transition-colors overflow-visible">
      {throwing && <span className="absolute -top-1 left-1/2 -translate-x-1/2 text-xl pointer-events-none z-10" style={{ animation: "coinThrow 0.65s cubic-bezier(0.2,0.8,0.4,1) forwards" }}>🪙</span>}
      <Sparkles size={15} />許個願
      <style>{`@keyframes coinThrow{0%{transform:translate(-50%,0) scale(1) rotate(0deg);opacity:1}40%{transform:translate(-50%,-48px) scale(1.3) rotate(180deg);opacity:1}100%{transform:translate(-50%,-24px) scale(0.6) rotate(360deg);opacity:0}}`}</style>
    </a>
  );
}

// ─── Feedback section（僅「已導入」需求顯示）──────────────────────────────────
function FeedbackSection({ submissionId }: { submissionId: string }) {
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [rating, setRating] = useState(0);
  const [content, setContent] = useState("");
  const [name, setName] = useState(() => getPersonalInfo().name);
  const [deptPath, setDeptPath] = useState<string[]>(() => getPersonalInfo().deptPath);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const [composing, setComposing] = useState(false);

  useEffect(() => {
    let alive = true;
    getFeedbacks(submissionId).then((fbs) => { if (alive) setFeedbacks(fbs); });
    return () => { alive = false; };
  }, [submissionId]);

  async function handleSubmit() {
    if (composing) return;
    if (deptPath.length === 0) { setError("請選一下你的部門"); return; }
    if (rating === 0) { setError("幫我們選一下幾顆星吧"); return; }
    setSubmitting(true);
    setError("");
    const created = await addFeedback({ submissionId, authorName: name, authorDept: deptPath.join(" > "), rating, content });
    setSubmitting(false);
    if (!created) { setError("送出失敗，請稍後再試"); return; }
    setFeedbacks((prev) => [created, ...prev]);
    setDone(true);
    setRating(0);
    setContent("");
  }

  return (
    <div className="border-t border-[#F0F4F4] px-5 py-4 bg-[#FBFBFA]">
      <div className="flex items-center gap-1.5 mb-3">
        <MessageSquareHeart size={14} className="text-[#AE1914]" />
        <p className="text-xs font-bold text-[#2D2D2D] uppercase tracking-wider">這個解法有幫到你嗎？</p>
      </div>

      {done ? (
        <div className="flex items-center gap-2 text-sm text-[#198754] bg-[#EAF7EE] border border-[#B7E1C4] rounded-xl px-4 py-3 mb-3">
          <Check size={15} />謝謝你的評論！這會出現在成果看板上，鼓勵我們繼續做下去。
        </div>
      ) : (
        <div className="bg-white border border-[#E0E0E0]/80 rounded-xl p-3 mb-3">
          <div className="mb-2">
            <span className="block text-xs text-[#616161] mb-1">你的部門：</span>
            <DepartmentSelector value={deptPath} onChange={(p) => { setDeptPath(p); if (error) setError(""); }} portal />
          </div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs text-[#616161] flex-shrink-0">你的姓名：</span>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)}
              placeholder="選填，不填顯示為匿名同仁"
              className="flex-1 min-w-0 text-sm border border-[#E0E0E0] rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#007A87]/40" />
          </div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs text-[#616161]">你的評價：</span>
            <StarRating value={rating} onChange={(v) => { setRating(v); if (error) setError(""); }} size={20} />
          </div>
          <textarea
            rows={2}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onCompositionStart={() => setComposing(true)}
            onCompositionEnd={(e) => { setComposing(false); setContent(e.currentTarget.value); }}
            placeholder="說說哪裡幫到你、省了多少時間…（選填）"
            className="w-full text-sm border border-[#E0E0E0] rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#007A87]/40 resize-none"
          />
          <div className="flex items-center justify-between mt-2">
            <span className="text-xs text-[#AE1914]">{error}</span>
            <button type="button" onClick={handleSubmit} disabled={submitting || composing}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-[#007A87] text-white hover:bg-[#00555E] transition-colors disabled:opacity-50">
              <Send size={12} />{submitting ? "送出中…" : "送出評論"}
            </button>
          </div>
        </div>
      )}

      {feedbacks.length > 0 && (
        <div className="space-y-2.5">
          {feedbacks.map((fb) => (
            <div key={fb.id} className="bg-white border border-[#E0E0E0]/70 rounded-xl px-3.5 py-2.5">
              <div className="flex items-center justify-between mb-1">
                <StarRating value={fb.rating} readOnly size={12} />
                <span className="text-[11px] text-[#9E9E9E]">{new Date(fb.createdAt).toLocaleDateString("zh-TW")}</span>
              </div>
              {fb.content && (
                <p className="text-sm text-[#2D2D2D] leading-relaxed flex items-start gap-1.5">
                  <Quote size={12} className="text-[#BE8B55] flex-shrink-0 mt-1" /><span className="whitespace-pre-wrap"><Linkify text={fb.content} /></span>
                </p>
              )}
              <p className="text-[11px] text-[#9E9E9E] mt-1">
                — {fb.authorName}{fb.authorDept ? ` · ${fb.authorDept.split(" > ").slice(-1)[0]}` : ""}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── 討論這則需求（未導入需求用）──────────────────────────────────────────────
// 取得或自動建立這則需求對應的討論串，然後導到主題討論，讓使用者直接留言。
function DiscussNeedButton({ item }: { item: Submission }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  async function go() {
    if (busy) return;
    setBusy(true);
    const topic = await getOrCreateTopicForSubmission({
      id: item.id,
      title: item.problemTitle,
      summary: item.publicSummary,
      status: item.status,
    });
    if (topic) router.push(`/topics/${topic.id}`);
    else setBusy(false);
  }
  return (
    <button type="button" onClick={go} disabled={busy}
      className="inline-flex items-center gap-1.5 mt-2.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-[#007A87] text-white hover:bg-[#00555E] transition-colors disabled:opacity-50">
      <MessagesSquare size={13} />{busy ? "開啟討論中…" : "討論這則需求"}
    </button>
  );
}

// ─── Detail Modal ─────────────────────────────────────────────────────────────
function DetailModal({ item, isLiked, onLike, onClose }: { item: Submission; isLiked: boolean; onLike: () => void; onClose: () => void }) {
  const st = ANNOYANCE_STYLE[item.annoyanceLevel] ?? ANNOYANCE_STYLE["還好，但可以優化"];
  const displayName = getDisplayName(item);
  const displayDept = getDisplayDept(item);
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", h);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", h); document.body.style.overflow = ""; };
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-0 sm:px-4" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white w-full sm:max-w-xl sm:rounded-2xl rounded-t-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        <div className="flex items-start justify-between gap-3 px-5 pt-4 pb-3 flex-shrink-0">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-[#2D2D2D] leading-snug flex-1">{item.problemTitle}</h2>
              
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-xs text-[#9E9E9E]">
              <span className="flex items-center gap-1"><User size={11} />{displayName}</span>
              {displayDept && <span className="flex items-center gap-1"><MapPin size={11} /><span className="truncate max-w-[280px]">{displayDept.split(" > ").slice(-3).join(" · ")}</span></span>}
              <span className="flex items-center gap-1"><Clock size={11} />{new Date(item.createdAt).toLocaleDateString("zh-TW")}</span>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[#F0F4F4] flex-shrink-0"><X size={16} className="text-[#9E9E9E]" /></button>
        </div>
        <div className="flex flex-wrap gap-2 px-5 pb-3 flex-shrink-0">
          <span className={`inline-flex items-center text-xs px-2.5 py-1 rounded-full font-semibold ${st.badge} ${st.text}`}>{item.annoyanceLevel}</span>
          <span className="inline-flex items-center text-xs px-2.5 py-1 rounded-full bg-[#F0F4F4] text-[#616161]">{item.frequency}</span>
          <BoardStatusTag status={item.status} />
        </div>
        <div className="border-t border-[#F0F4F4]" />
        <div className="overflow-y-auto px-5 py-4 space-y-4 flex-1">
          {item.publicSummary && item.publicSummary !== item.problemTitle && (
            <div>
              <p className="text-xs font-bold text-[#BE8B55] uppercase tracking-wider mb-2">數位創新處回覆</p>
              <p className="text-sm text-[#2D2D2D] leading-relaxed bg-[#F5EDE2]/60 border border-[#E0C8AE] rounded-lg px-4 py-3 whitespace-pre-wrap"><Linkify text={item.publicSummary} /></p>
            </div>
          )}
          {item.painPoints.length > 0 && (
            <div>
              <p className="text-xs font-bold text-[#9E9E9E] uppercase tracking-wider mb-2">痛點</p>
              <div className="flex flex-wrap gap-1.5">{item.painPoints.map(p => <span key={p} className="text-xs px-2.5 py-1 rounded-full bg-[#B5E1E5]/30 text-[#00555E] font-medium">{p}</span>)}</div>
            </div>
          )}
          {item.currentMethods.length > 0 && (
            <div>
              <p className="text-xs font-bold text-[#9E9E9E] uppercase tracking-wider mb-2">目前處理方式</p>
              <div className="flex flex-wrap gap-1.5">{item.currentMethods.map(m => <span key={m} className="text-xs px-2.5 py-1 rounded-full bg-[#F0F4F4] text-[#616161]">{m}</span>)}</div>
            </div>
          )}
          {item.aiNeeds.length > 0 && (
            <div>
              <p className="text-xs font-bold text-[#9E9E9E] uppercase tracking-wider mb-2">希望 AI 能做的事</p>
              <div className="flex flex-wrap gap-1.5">{item.aiNeeds.map(a => <span key={a} className="text-xs px-2.5 py-1 rounded-full bg-[#007A87]/10 text-[#007A87] font-medium">{a}</span>)}</div>
            </div>
          )}
          {item.freeText && (
            <div>
              <p className="text-xs font-bold text-[#9E9E9E] uppercase tracking-wider mb-2">其他補充</p>
              <p className="text-sm text-[#2D2D2D] leading-relaxed bg-[#F7F7F5] rounded-lg px-4 py-3 whitespace-pre-wrap"><Linkify text={item.freeText} /></p>
            </div>
          )}
          {item.status === "已導入" ? (
            <div className="-mx-5 -mb-4"><FeedbackSection submissionId={item.id} /></div>
          ) : item.status === "暫不處理" ? (
            // 暫不處理也是結案的一種：不算「處理中」，但仍可繼續討論，有新資訊就重新評估
            <div className="-mx-5 -mb-4 border-t border-[#F0F4F4] px-5 py-4 bg-[#FBFBFA]">
              <div className="flex items-start gap-2.5">
                <CircleSlash size={16} className="text-[#9E9E9E] flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[#2D2D2D]">這則需求評估後暫不處理，已先結案</p>
                  <p className="text-xs text-[#616161] mt-0.5 leading-relaxed">
                    暫不處理不代表不重要。若情況有變或你有新的資訊，歡迎到討論串補充，我們會重新評估、必要時重新開案。
                  </p>
                  <DiscussNeedButton item={item} />
                </div>
              </div>
            </div>
          ) : (
            <div className="-mx-5 -mb-4 border-t border-[#F0F4F4] px-5 py-4 bg-[#FBFBFA]">
              <div className="flex items-start gap-2.5">
                <MessagesSquare size={16} className="text-[#007A87] flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[#2D2D2D]">這則需求還在處理中</p>
                  <p className="text-xs text-[#616161] mt-0.5 leading-relaxed">
                    想補充或討論？點下面進到討論串留言即可，導入完成後才開放評論評分。
                  </p>
                  <DiscussNeedButton item={item} />
                </div>
              </div>
            </div>
          )}
        </div>
        <div className="border-t border-[#F0F4F4] px-5 py-3 flex-shrink-0">
          <button onClick={onLike}
            className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-semibold text-sm transition-all ${isLiked ? "bg-[#007A87] text-white hover:bg-[#00555E]" : "bg-[#F0F4F4] text-[#616161] hover:bg-[#B5E1E5]/40 hover:text-[#007A87]"}`}>
            <ThumbsUp size={15} />
            {isLiked ? "已認同・點此取消" : "我也有這個困擾"}
            <span className={`text-xs font-bold ${isLiked ? "text-white/80" : "text-[#2D2D2D]"}`}>{item.likeCount}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Board Card ───────────────────────────────────────────────────────────────
function BoardCard({ item, isLiked, onClick }: { item: Submission; isLiked: boolean; onClick: () => void }) {
  const st = ANNOYANCE_STYLE[item.annoyanceLevel] ?? ANNOYANCE_STYLE["還好，但可以優化"];
  const displayName = getDisplayName(item);
  return (
    <button type="button" onClick={onClick}
      className="bg-white border border-[#E0E0E0]/80 rounded-xl overflow-hidden text-left hover:shadow-md hover:-translate-y-0.5 transition-all w-full group flex flex-col">
      <div className="p-4 flex flex-col flex-1">
        <div className="mb-2.5 min-h-[40px]">
          <h3 className="text-sm font-semibold text-[#2D2D2D] leading-snug line-clamp-2 group-hover:text-[#007A87] transition-colors">
            {/* 煩人程度用色點標記，滑過看說明 */}
            <span className={`inline-block w-2 h-2 rounded-full mr-1.5 align-middle ${st.bar}`} title={item.annoyanceLevel} />
            {item.problemTitle}
          </h3>
        </div>
        <div className="flex flex-wrap gap-1.5 mb-3">
          <BoardStatusTag status={item.status} />
        </div>
        {/* 痛點不在卡片上顯示，點開詳情視窗才列出（卡片保持精簡）*/}
        <div className="flex items-center justify-between pt-2 border-t border-[#F0F4F4] mt-auto">
          <div className="flex items-center gap-2 text-[11px] text-[#BDBDBD]">
            <span className="flex items-center gap-1"><User size={10} />{displayName}</span>
            <span className="flex items-center gap-1"><Clock size={10} />{new Date(item.createdAt).toLocaleDateString("zh-TW", { month: "numeric", day: "numeric" })}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className={`flex items-center gap-1 text-xs font-semibold ${isLiked ? "text-[#007A87]" : "text-[#BDBDBD]"}`}><ThumbsUp size={11} />{item.likeCount}</span>
            <ChevronRight size={13} className="text-[#BDBDBD] group-hover:text-[#007A87] transition-colors" />
          </div>
        </div>
      </div>
    </button>
  );
}



// ─── Main Page ────────────────────────────────────────────────────────────────
// /board?id=<需求 id> 會直接打開該需求的詳情（成果看板的清單就是這樣跳進來的）
function BoardContent() {
  const searchParams = useSearchParams();
  const focusId = searchParams.get("id");
  const [allItems, setAllItems] = useState<Submission[]>([]);
  const [query, setQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const [showFilters, setShowFilters] = useState(false);
  // 只存 id，內容一律從 allItems 取，認同數更新才不用同步兩份資料
  const [selectedId, setSelectedId] = useState<string | null>(() => focusId);
  const selected = allItems.find(s => s.id === selectedId) ?? null;
  // Default: open the top 2 most serious sections
  const [activeLevel, setActiveLevel] = useState<string>("");

  useEffect(() => {
    async function load() {
      const subs = await getSubmissionsAsync();
      setAllItems(subs.filter(s => s.isVisible));
    }
    load();
    try {
      const raw = localStorage.getItem("ai-wish-liked");
      if (raw) setLikedIds(new Set(JSON.parse(raw)));
    } catch {}
    // Auto-refresh every 30 seconds
    const timer = setInterval(load, 30000);
    return () => clearInterval(timer);
  }, []);

  const statuses = [...new Set(allItems.map(s => s.status))].filter(Boolean);
  const statusOptions = [{ value: "", label: "全部狀態" }, ...statuses.map(s => ({ value: s, label: s }))];
  const sortOptions = [{ value: "newest", label: "由新至舊" }, { value: "oldest", label: "由舊至新" }, { value: "likes", label: "最多認同" }];
  const hasFilters = !!filterStatus;

  const filtered = allItems
    .filter(s => {
      if (query) {
        const hay = [s.problemTitle, s.publicSummary, ...s.painPoints, ...s.aiNeeds].join(" ").toLowerCase();
        if (!hay.includes(query.toLowerCase())) return false;
      }
      if (filterStatus && s.status !== filterStatus) return false;
      return true;
    })
    .sort((a, b) =>
      sortBy === "likes" ? b.likeCount - a.likeCount :
      sortBy === "oldest" ? new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime() :
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

  const visibleLevels = ANNOYANCE_ORDER.filter(level => filtered.some(s => s.annoyanceLevel === level));

  function handleLike(id: string) {
    const isLiked = likedIds.has(id);
    if (isLiked) {
      const { name } = getPersonalInfo();
      decrementLikeAsync(id, name || undefined);
      const next = new Set(likedIds);
      next.delete(id);
      setLikedIds(next);
      localStorage.setItem("ai-wish-liked", JSON.stringify([...next]));
      setAllItems(prev => prev.map(s => s.id === id ? { ...s, likeCount: Math.max(0, s.likeCount - 1) } : s));
    } else {
      const { name, dept } = getPersonalInfo();
      const liker = name ? { name, dept } : undefined;
      incrementLikeAsync(id, liker);
      const next = new Set(likedIds).add(id);
      setLikedIds(next);
      localStorage.setItem("ai-wish-liked", JSON.stringify([...next]));
      setAllItems(prev => prev.map(s => s.id === id ? { ...s, likeCount: s.likeCount + 1 } : s));
    }
  }

  // 關掉詳情時把 ?id= 清掉，重新整理才不會又跳出同一則
  function closeDetail() {
    setSelectedId(null);
    if (focusId) window.history.replaceState(null, "", "/board");
  }

  return (
    <div className="max-w-[1120px] mx-auto px-6 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold text-[#2D2D2D]">公告欄</h1>
          <p className="text-sm text-[#9E9E9E] mt-0.5">{allItems.length} 則需求{filtered.length !== allItems.length && `，顯示 ${filtered.length} 則`}</p>
        </div>
        <CoinButton href="/wish" />
      </div>

      {/* Search row */}
      <div className="flex gap-2 mb-4">
        <div className="flex-1 flex items-center gap-2 px-3 py-2.5 bg-white border border-[#E0E0E0]/80 rounded-xl shadow-sm">
          <Search size={14} className="text-[#BDBDBD] flex-shrink-0" />
          <input type="text" placeholder="搜尋問題、痛點、需求方向…" value={query} onChange={e => setQuery(e.target.value)}
            className="flex-1 text-sm text-[#2D2D2D] placeholder:text-[#BDBDBD] outline-none bg-transparent" />
          {query && <button onClick={() => setQuery("")}><X size={12} className="text-[#BDBDBD]" /></button>}
        </div>
        <InlineFilterDropdown label="排序" value={sortBy} options={sortOptions} onChange={v => setSortBy(v as SortOption)} />
        <InlineFilterDropdown label="狀態" value={filterStatus} options={statusOptions} onChange={setFilterStatus} />
        {hasFilters && (
          <button onClick={() => setFilterStatus("")} className="flex items-center gap-1 text-xs text-[#AE1914] px-2 rounded-lg hover:bg-[#EBCDCC]/20 transition-colors">
            <X size={11} />清除
          </button>
        )}
      </div>

      {/* Content */}
      {filtered.length === 0 ? (
        <EmptyState title="沒有符合條件的需求" description="試試調整搜尋關鍵字或篩選條件" />
      ) : (
        <div>
          {/* Tab strip */}
          {visibleLevels.length > 1 && (
            <div className="flex gap-2 mb-5 flex-wrap">
              <button type="button"
                onClick={() => setActiveLevel("")}
                className={`flex items-center gap-1.5 px-3 py-2.5 rounded-xl border text-sm font-medium transition-all ${
                  activeLevel === ""
                    ? "border-[#007A87] bg-white shadow-sm text-[#007A87]"
                    : "border-[#E0E0E0]/60 bg-white/60 text-[#9E9E9E] hover:bg-white hover:text-[#2D2D2D]"
                }`}>
                全部
                <span className="inline-flex items-center text-xs font-bold px-1.5 py-0.5 rounded-full bg-[#F0F4F4] text-[#616161]">{filtered.length}</span>
              </button>
              {visibleLevels.map(level => {
                const st = ANNOYANCE_STYLE[level] ?? ANNOYANCE_STYLE["還好，但可以優化"];
                const count = filtered.filter(s => s.annoyanceLevel === level).length;
                const isActive = activeLevel === level;
                return (
                  <button key={level} type="button"
                    onClick={() => setActiveLevel(level)}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-medium transition-all ${
                      isActive
                        ? `${st.border} bg-white shadow-sm text-[#2D2D2D]`
                        : "border-[#E0E0E0]/60 bg-white/60 text-[#9E9E9E] hover:bg-white hover:text-[#2D2D2D]"
                    }`}>
                    <span className="text-base leading-none">{st.icon}</span>
                    <span className="whitespace-nowrap">{level.split("，")[0]}</span>
                    <span className={`inline-flex items-center text-xs font-bold px-1.5 py-0.5 rounded-full ${st.labelBg} ${st.labelText}`}>{count}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Content — 「全部」不分煩人程度區塊，直接依排序一次列出；選特定程度才用該色系區塊 */}
          {activeLevel === "" ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {filtered.map(item => (
                <BoardCard key={item.id} item={item} isLiked={likedIds.has(item.id)} onClick={() => setSelectedId(item.id)} />
              ))}
            </div>
          ) : (
            <div className={`mb-8 rounded-2xl p-4 ${(ANNOYANCE_STYLE[activeLevel] ?? ANNOYANCE_STYLE["還好，但可以優化"]).sectionBg}`}>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {filtered.filter(s => s.annoyanceLevel === activeLevel).map(item => (
                  <BoardCard key={item.id} item={item} isLiked={likedIds.has(item.id)} onClick={() => setSelectedId(item.id)} />
                ))}
              </div>
            </div>
          )}
      </div>
      )}

      {selected && (
        <DetailModal item={selected} isLiked={likedIds.has(selected.id)}
          onLike={() => handleLike(selected.id)} onClose={closeDetail} />
      )}

    </div>
  );
}

// useSearchParams 需要 Suspense 邊界（靜態預渲染的頁面沒包會 build 失敗）
export default function BoardPage() {
  return (
    <Suspense fallback={<div className="max-w-[1120px] mx-auto px-6 py-16 text-center text-sm text-[#9E9E9E]">載入中…</div>}>
      <BoardContent />
    </Suspense>
  );
}
