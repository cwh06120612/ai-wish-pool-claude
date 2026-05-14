"use client";

import React, { useState, useEffect, useRef } from "react";
import { getSubmissionsAsync, incrementLikeAsync, decrementLikeAsync } from "@/lib/storage";
import type { Submission } from "@/types/submission";
import { EmptyState } from "@/components/ui/empty-state";
import { Search, ThumbsUp, Clock, MapPin, User, ChevronRight, Check, ChevronDown, Sparkles, X, SlidersHorizontal } from "lucide-react";
import Link from "next/link";

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

// ─── Inline filter dropdown ───────────────────────────────────────────────────
function InlineFilterDropdown({ label, value, options, onChange }: {
  label: string; value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const activeLabel = options.find(o => o.value === value)?.label;
  const isFiltered = !!value && value !== options[0]?.value;
  useEffect(() => {
    function h(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); }
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen(v => !v)}
        className={`flex items-center gap-1.5 px-3 py-2.5 rounded-xl border text-sm transition-all ${isFiltered ? "border-[#007A87] bg-[#B5E1E5]/20 text-[#007A87] font-semibold" : open ? "border-[#007A87] bg-white text-[#2D2D2D]" : "border-[#E0E0E0]/80 bg-white text-[#616161] hover:bg-[#F0F4F4] shadow-sm"}`}>
        <span className="whitespace-nowrap">{isFiltered ? activeLabel : label}</span>
        <ChevronDown size={13} className={`flex-shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-1 z-30 bg-white border border-[#E0E0E0]/80 rounded-xl shadow-lg overflow-hidden min-w-[160px]">
          <div className="px-3 py-2 border-b border-[#F0F4F4]">
            <p className="text-xs font-bold text-[#9E9E9E] uppercase tracking-wider">{label}</p>
          </div>
          <div className="p-1.5 space-y-0.5 max-h-64 overflow-y-auto">
            {options.map(opt => (
              <button key={opt.value} type="button" onClick={() => { onChange(opt.value); setOpen(false); }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${value === opt.value ? "bg-[#B5E1E5]/25 text-[#00555E] font-semibold" : "text-[#2D2D2D] hover:bg-[#F0F4F4]"}`}>
                <span className="whitespace-nowrap">{opt.label}</span>
                {value === opt.value && <Check size={12} className="text-[#007A87] flex-shrink-0 ml-2" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
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
              <p className="text-sm text-[#2D2D2D] leading-relaxed bg-[#F5EDE2]/60 border border-[#E0C8AE] rounded-lg px-4 py-3">{item.publicSummary}</p>
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
              <p className="text-sm text-[#2D2D2D] leading-relaxed bg-[#F7F7F5] rounded-lg px-4 py-3">{item.freeText}</p>
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
          <h3 className="text-sm font-semibold text-[#2D2D2D] leading-snug line-clamp-2 group-hover:text-[#007A87] transition-colors">{item.problemTitle}</h3>
        </div>
        <div className="flex flex-wrap gap-1.5 mb-3">
          <BoardStatusTag status={item.status} />
        </div>
        {item.painPoints.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {item.painPoints.slice(0, 3).map(p => <span key={p} className="text-[11px] px-2 py-0.5 rounded-full bg-[#B5E1E5]/30 text-[#00555E] font-medium">{p}</span>)}
            {item.painPoints.length > 3 && <span className="inline-flex items-center text-[11px] px-2 py-0.5 rounded-full bg-[#F0F4F4] text-[#9E9E9E]">+{item.painPoints.length - 3}</span>}
          </div>
        )}
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
export default function BoardPage() {
  const [allItems, setAllItems] = useState<Submission[]>([]);
  const [query, setQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const [showFilters, setShowFilters] = useState(false);
  const [selected, setSelected] = useState<Submission | null>(null);
  // Default: open the top 2 most serious sections
  const [activeLevel, setActiveLevel] = useState<string>("");

  useEffect(() => {
    async function load() {
      const subs = await getSubmissionsAsync();
      setAllItems(subs.filter(s => s.shareMode !== "不公開（只給數位創新處後台查看）" && s.isVisible));
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

  function getPersonalInfo() {
    try {
      const raw = localStorage.getItem("ai-wish-personal-info");
      if (raw) {
        const info = JSON.parse(raw);
        return {
          name: info.name ?? "",
          dept: info.departmentPath ? info.departmentPath.join(" > ") : "",
        };
      }
    } catch {}
    return { name: "", dept: "" };
  }

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
      if (selected?.id === id) setSelected(prev => prev ? { ...prev, likeCount: Math.max(0, prev.likeCount - 1) } : null);
    } else {
      const { name, dept } = getPersonalInfo();
      const liker = name ? { name, dept } : undefined;
      incrementLikeAsync(id, liker);
      const next = new Set(likedIds).add(id);
      setLikedIds(next);
      localStorage.setItem("ai-wish-liked", JSON.stringify([...next]));
      setAllItems(prev => prev.map(s => s.id === id ? { ...s, likeCount: s.likeCount + 1 } : s));
      if (selected?.id === id) setSelected(prev => prev ? { ...prev, likeCount: prev.likeCount + 1 } : null);
    }
  }

  return (
    <div className="max-w-[860px] mx-auto px-6 py-8">
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

          {/* Content — show selected tab or all */}
          {(activeLevel === "" ? visibleLevels : [activeLevel]).map(level => {
            const items = filtered.filter(s => s.annoyanceLevel === level);
            if (items.length === 0) return null;
            const st = ANNOYANCE_STYLE[level] ?? ANNOYANCE_STYLE["還好，但可以優化"];
            return (
              <div key={level} className={`mb-8 rounded-2xl p-4 ${st.sectionBg}`}>
                {activeLevel === "" && (
                  <div className={`flex items-center gap-3 mb-4 pb-3 border-b-2 ${st.border}`}>
                    <h2 className={`text-sm font-bold flex-1 ${st.text}`}>{level}</h2>
                    <span className={`inline-flex items-center text-xs font-bold px-2.5 py-1 rounded-full ${st.labelBg} ${st.labelText}`}>{items.length} 則</span>
                  </div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {items.map(item => (
                    <BoardCard key={item.id} item={item} isLiked={likedIds.has(item.id)} onClick={() => setSelected(item)} />
                  ))}
                </div>
              </div>
            );
          })}
      </div>
      )}

      {selected && (
        <DetailModal item={selected} isLiked={likedIds.has(selected.id)}
          onLike={() => handleLike(selected.id)} onClose={() => setSelected(null)} />
      )}

    </div>
  );
}
