"use client";

import React from "react";
import type { Submission } from "@/types/submission";
import { StatusBadge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { SubmissionTrendChart } from "@/components/admin/submission-trend-chart";
import { HorizontalBarChart } from "@/components/admin/horizontal-bar-chart";
import {
  countByField, getTopN, getThisWeekCount,
  getHighAnnoyanceCount, getHighPriorityCandidates, getDepartmentCounts,
} from "@/lib/analytics";
import { ThumbsUp, ChevronRight, X, Clock, MapPin, User } from "lucide-react";
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis,
  ResponsiveContainer, Tooltip,
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
} from "recharts";

// ─── KPI Card ─────────────────────────────────────────────────────
function Kpi({ label, value, sub, color = "#007A87" }: {
  label: string; value: number | string; sub?: string; color?: string;
}) {
  return (
    <div className="bg-white border border-[#E0E0E0]/80 rounded-2xl p-4">
      <div className="text-2xl font-bold" style={{ color }}>{value}</div>
      <div className="text-xs font-semibold text-[#2D2D2D] mt-0.5">{label}</div>
      {sub && <div className="text-xs text-[#9E9E9E] mt-0.5">{sub}</div>}
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-xs font-bold text-[#9E9E9E] uppercase tracking-widest mb-3">{children}</h3>
  );
}

// ─── Radar ────────────────────────────────────────────────────────
function AiNeedsRadar({ data }: { data: { label: string; count: number }[] }) {
  if (data.length === 0) return <p className="text-xs text-[#9E9E9E]">無資料</p>;
  const radarData = data.slice(0, 7).map(d => ({ subject: d.label, value: d.count }));

  // Custom tick that wraps long labels and adjusts anchor by position
  const CustomTick = (props: { x?: number; y?: number; payload?: { value: string }; cx?: number; cy?: number }) => {
    const { x = 0, y = 0, payload, cx = 0, cy = 0 } = props;
    if (!payload) return null;
    const label = payload.value;
    // Remove parenthetical notes to shorten
    const short = label.replace(/（[^）]+）/g, "").replace(/\/[^、]*/g, "").trim();
    // Split by 4 chars per line max
    const lines: string[] = [];
    let cur = short;
    while (cur.length > 5) { lines.push(cur.slice(0, 5)); cur = cur.slice(5); }
    if (cur) lines.push(cur);

    const dx = x - cx;
    const anchor = Math.abs(dx) < 8 ? "middle" : dx > 0 ? "start" : "end";
    const dy = y < cy ? -2 : 12;

    return (
      <text x={x} y={y} textAnchor={anchor} fontSize={9} fill="#9E9E9E">
        {lines.map((l, i) => (
          <tspan key={i} x={x} dy={i === 0 ? dy : 11}>{l}</tspan>
        ))}
      </text>
    );
  };

  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ payload: { subject: string }; value: number }> }) => {
    if (active && payload?.length) {
      return (
        <div className="bg-white border border-[#E0E0E0] rounded-lg px-3 py-2 shadow-md text-xs">
          <p className="font-medium text-[#2D2D2D] mb-0.5">{payload[0].payload.subject}</p>
          <p className="text-[#007A87]">需求數：<span className="font-bold">{payload[0].value}</span></p>
        </div>
      );
    }
    return null;
  };

  return (
    <ResponsiveContainer width="100%" height={240}>
      <RadarChart data={radarData} margin={{ top: 28, right: 50, bottom: 28, left: 50 }}>
        <PolarGrid stroke="#E0E0E0" />
        <PolarAngleAxis dataKey="subject" tick={<CustomTick />} />
        <Radar dataKey="value" stroke="#007A87" fill="#007A87" fillOpacity={0.15} strokeWidth={2} dot={{ fill: "#007A87", r: 3 }} />
        <Tooltip content={<CustomTooltip />} />
      </RadarChart>
    </ResponsiveContainer>
  );
}


// ─── Annoyance bars ───────────────────────────────────────────────
const ANNOYANCE_COLORS: Record<string, string> = {
  "已經麻痺，每天都這樣": "#AE1914",
  "很煩，希望優先處理": "#FFAE00",
  "有點煩，改善會很有感": "#007A87",
  "還好，但可以優化": "#BDBDBD",
};
function AnnoyanceBars({ data }: { data: { label: string; count: number }[] }) {
  const max = Math.max(...data.map(d => d.count), 1);
  if (data.length === 0) return <p className="text-xs text-[#9E9E9E]">無資料</p>;
  return (
    <div className="space-y-3">
      {data.map((d, i) => (
        <div key={i}>
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs text-[#616161]">{d.label}</span>
            <span className="text-xs font-bold text-[#2D2D2D]">{d.count}</span>
          </div>
          <div className="h-2.5 bg-[#F0F4F4] rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all"
              style={{ width: `${(d.count / max) * 100}%`, backgroundColor: ANNOYANCE_COLORS[d.label] ?? "#BDBDBD" }} />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Status Pipeline ─────────────────────────────────────────────
const STATUS_ORDER = ["已收到","整理中","評估中","尋找工具中","測試中","已導入","暫不處理"];
// 漸層色：從主色 Primary Light → Primary Dark，最後一個用灰色表示「暫不處理」
const STATUS_COLORS = [
  "#D4EEF1", // 已收到 — primary lightest
  "#ADE0E6", // 整理中
  "#7DCDD5", // 評估中
  "#4EBAC4", // 尋找工具中
  "#2AA3AF", // 測試中
  "#007A87", // 已導入 — primary
  "#E0E0E0", // 暫不處理 — grey
];
const STATUS_TEXT = [
  "#00555E","#00555E","#00555E","#00555E","#ffffff","#ffffff","#9E9E9E",
];
function StatusPipeline({ submissions }: { submissions: Submission[] }) {
  const counts: Record<string, number> = {};
  submissions.forEach(s => { counts[s.status] = (counts[s.status] || 0) + 1; });
  return (
    <div className="flex items-start w-full">
      {STATUS_ORDER.map((s, i) => {
        const n = counts[s] || 0;
        const isLast = i === STATUS_ORDER.length - 1;
        return (
          <React.Fragment key={s}>
            <div className="flex flex-col items-center gap-2 flex-1 min-w-0">
              <div
                className="w-full rounded-xl flex items-center justify-center text-lg font-bold py-3 transition-all"
                style={{ backgroundColor: STATUS_COLORS[i], color: STATUS_TEXT[i], opacity: n === 0 ? 0.25 : 1 }}
              >
                {n}
              </div>
              <span className="text-[11px] font-semibold text-[#616161] text-center leading-tight w-full" style={{ wordBreak: "keep-all" }}>
                {s}
              </span>
            </div>
            {!isLast && (
              <div className="flex-shrink-0 flex items-start pt-3.5 px-0.5">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                  <path d="M3 8H13M13 8L9 4M13 8L9 12" stroke="#BDBDBD" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}


// ─── Admin Detail Modal ───────────────────────────────────────────
function AdminDetailModal({ item, onClose }: { item: Submission; onClose: () => void }) {
  React.useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", h);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", h); document.body.style.overflow = ""; };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-0 sm:px-4"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl shadow-2xl overflow-hidden max-h-[85vh] flex flex-col">
        <div className="h-1 w-full bg-[#FFAE00]" />
        <div className="flex items-start justify-between gap-3 px-5 pt-4 pb-3 flex-shrink-0">
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-bold text-[#2D2D2D] leading-snug">{item.problemTitle}</h2>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-xs text-[#9E9E9E]">
              <span className="flex items-center gap-1"><User size={11} />{item.name}</span>
              <span className="flex items-center gap-1"><Clock size={11} />{new Date(item.createdAt).toLocaleDateString("zh-TW")}</span>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[#F0F4F4] flex-shrink-0">
            <X size={16} className="text-[#9E9E9E]" />
          </button>
        </div>
        <div className="flex flex-wrap gap-2 px-5 pb-3 flex-shrink-0">
          <StatusBadge status={item.status} />
          <span className="text-xs px-2.5 py-1 rounded-full bg-[#FFF3CD] text-[#92400e] font-medium">{item.annoyanceLevel}</span>
          <span className="text-xs px-2.5 py-1 rounded-full bg-[#F0F4F4] text-[#616161]">{item.frequency}</span>
        </div>
        <div className="border-t border-[#F0F4F4]" />
        <div className="overflow-y-auto px-5 py-4 space-y-4 flex-1">
          {item.painPoints.length > 0 && (
            <div>
              <p className="text-xs font-bold text-[#9E9E9E] uppercase tracking-wider mb-2">痛點</p>
              <div className="flex flex-wrap gap-1.5">
                {item.painPoints.map(p => <span key={p} className="text-xs px-2.5 py-1 rounded-full bg-[#B5E1E5]/30 text-[#00555E] font-medium">{p}</span>)}
              </div>
            </div>
          )}
          {item.currentMethods.length > 0 && (
            <div>
              <p className="text-xs font-bold text-[#9E9E9E] uppercase tracking-wider mb-2">目前處理方式</p>
              <div className="flex flex-wrap gap-1.5">
                {item.currentMethods.map(m => <span key={m} className="text-xs px-2.5 py-1 rounded-full bg-[#F0F4F4] text-[#616161]">{m}</span>)}
              </div>
            </div>
          )}
          {item.aiNeeds.length > 0 && (
            <div>
              <p className="text-xs font-bold text-[#9E9E9E] uppercase tracking-wider mb-2">希望 AI 能做的事</p>
              <div className="flex flex-wrap gap-1.5">
                {item.aiNeeds.map(a => <span key={a} className="text-xs px-2.5 py-1 rounded-full bg-[#007A87]/10 text-[#007A87] font-medium">{a}</span>)}
              </div>
            </div>
          )}
          {item.freeText && (
            <div>
              <p className="text-xs font-bold text-[#9E9E9E] uppercase tracking-wider mb-2">其他補充</p>
              <p className="text-sm text-[#2D2D2D] leading-relaxed bg-[#F7F7F5] rounded-lg px-4 py-3">{item.freeText}</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────
export function Dashboard({ submissions: allSubmissions }: { submissions: Submission[] }) {
  const [detailItem, setDetailItem] = React.useState<Submission | null>(null);
  const submissions = allSubmissions.filter(s => !s.isExample);
  const total = submissions.length;
  const thisWeek = getThisWeekCount(submissions);
  const highAnnoyance = getHighAnnoyanceCount(submissions);
  const implemented = submissions.filter(s => s.status === "已導入").length;
  const pending = submissions.filter(s => s.priority === "待評估").length;
  const topLiked = [...submissions].sort((a, b) => b.likeCount - a.likeCount).slice(0, 3);

  const painCounts = getTopN(countByField(submissions, "painPoints"), 6);
  const aiNeedsCounts = getTopN(countByField(submissions, "aiNeeds"), 7);
  const freqCounts = getTopN(countByField(submissions, "frequency"), 7);
  const annoyanceCounts = getTopN(countByField(submissions, "annoyanceLevel"), 4);
  const deptCounts = getDepartmentCounts(submissions).slice(0, 6);
  const highPriority = getHighPriorityCandidates(submissions);

  if (total === 0) {
    return <EmptyState title="還沒有填答資料" description="分享許願表單連結，收集同仁的需求後就會在這裡顯示。" />;
  }

  return (
    <div className="space-y-8">

      {/* KPI */}
      <div>
        <SectionTitle>總覽</SectionTitle>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <Kpi label="總填答數" value={total} sub="累計" color="#007A87" />
          <Kpi label="本週新增" value={thisWeek} sub="近 7 天" color="#2D2D2D" />
          <Kpi label="高煩人需求" value={highAnnoyance} sub="很煩 + 已麻痺" color="#AE1914" />
          <Kpi label="已導入" value={implemented} sub="完成處理" color="#198754" />
          <Kpi label="待評估" value={pending} sub="尚未分類" color="#FFAE00" />
        </div>
      </div>

      {/* Trend */}
      <div>
        <SectionTitle>填答趨勢</SectionTitle>
        <div className="bg-white border border-[#E0E0E0]/80 rounded-2xl p-5 shadow-sm">
          <p className="text-sm font-semibold text-[#2D2D2D] mb-3 text-left">近 30 天填答數</p>
          <SubmissionTrendChart submissions={submissions} />
        </div>
      </div>

      {/* Status pipeline */}
      <div>
        <SectionTitle>狀態流程</SectionTitle>
        <div className="bg-white border border-[#E0E0E0]/80 rounded-2xl p-5 shadow-sm">
          <StatusPipeline submissions={submissions} />
        </div>
      </div>

      {/* Pain + Annoyance */}
      <div>
        <SectionTitle>痛點 · 煩人程度</SectionTitle>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white border border-[#E0E0E0]/80 rounded-2xl p-5 shadow-sm">
            <p className="text-sm font-semibold text-[#2D2D2D] mb-4">痛點排行（前 6）</p>
            <HorizontalBarChart data={painCounts} color="#BE8B55" />
          </div>
          <div className="bg-white border border-[#E0E0E0]/80 rounded-2xl p-5 shadow-sm">
            <p className="text-sm font-semibold text-[#2D2D2D] mb-4">煩人程度分布</p>
            <AnnoyanceBars data={annoyanceCounts} />
          </div>
        </div>
      </div>

      {/* AI needs + Freq */}
      <div>
        <SectionTitle>AI 需求 · 頻率</SectionTitle>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white border border-[#E0E0E0]/80 rounded-2xl p-5 shadow-sm">
            <p className="text-sm font-semibold text-[#2D2D2D] mb-2">AI / 工具需求雷達圖</p>
            <AiNeedsRadar data={aiNeedsCounts} />
          </div>
          <div className="bg-white border border-[#E0E0E0]/80 rounded-2xl p-5 shadow-sm">
            <p className="text-sm font-semibold text-[#2D2D2D] mb-4">頻率分布</p>
            <HorizontalBarChart data={freqCounts} color="#28A745" />
          </div>
        </div>
      </div>

      {/* Dept + Top liked */}
      <div>
        <SectionTitle>部門 · 最多認同</SectionTitle>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white border border-[#E0E0E0]/80 rounded-2xl p-5 shadow-sm">
            <p className="text-sm font-semibold text-[#2D2D2D] mb-4">部門需求排行</p>
            <HorizontalBarChart data={deptCounts} color="#A6AAFF" yAxisWidth={160} />
          </div>
          <div className="bg-white border border-[#E0E0E0]/80 rounded-2xl p-5 shadow-sm">
            <p className="text-sm font-semibold text-[#2D2D2D] mb-4">按讚數最高</p>
            {topLiked.length === 0 ? (
              <p className="text-xs text-[#9E9E9E]">無資料</p>
            ) : (
              <div className="space-y-3">
                {topLiked.map((s, i) => (
                  <div key={s.id} className="flex items-start gap-3">
                    <span className="text-sm font-bold text-[#BDBDBD] w-4 flex-shrink-0 mt-0.5">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-[#2D2D2D] truncate">{s.problemTitle}</p>
                      <p className="text-xs text-[#9E9E9E]">{new Date(s.createdAt).toLocaleDateString("zh-TW")}</p>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-[#007A87] font-bold flex-shrink-0">
                      <ThumbsUp size={11} />{s.likeCount}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* High priority */}
      {highPriority.length > 0 && (
        <div>
          <SectionTitle>⚡ 高優先候選需求</SectionTitle>
          <div className="bg-white border border-[#E0E0E0]/80 rounded-2xl p-5 shadow-sm">
            <div className="space-y-2">
              {highPriority.map(item => (
                <button key={item.id} type="button" onClick={() => setDetailItem(item)}
                  className="w-full flex items-center gap-3 p-3 rounded-xl bg-[#FFFBF0] border border-[#FFF3CD] hover:bg-[#FFF8E6] hover:border-[#FFAE00]/50 transition-colors text-left group">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#2D2D2D] truncate group-hover:text-[#007A87] transition-colors">{item.problemTitle}</p>
                    <p className="text-xs text-[#9E9E9E] mt-0.5">
                      {new Date(item.createdAt).toLocaleDateString("zh-TW")} · {item.annoyanceLevel}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <StatusBadge status={item.status} />
                    <span className="flex items-center gap-0.5 text-xs text-[#9E9E9E]"><ThumbsUp size={11} />{item.likeCount}</span>
                    <ChevronRight size={13} className="text-[#BDBDBD] group-hover:text-[#007A87] transition-colors" />
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Detail modal */}
      {detailItem && (
        <AdminDetailModal item={detailItem} onClose={() => setDetailItem(null)} />
      )}
    </div>
  );
}
