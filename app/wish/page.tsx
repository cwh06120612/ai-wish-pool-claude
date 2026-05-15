"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { SectionHeader } from "@/components/ui/section-header";
import { FormField, TextInput } from "@/components/ui/form-field";
import { OptionCard } from "@/components/ui/option-card";
import { DepartmentSelector } from "@/components/department-selector";
import { addSubmissionAsync, generateId } from "@/lib/storage";
import { autoClassify } from "@/lib/auto-classify";
import { isLeafNode } from "@/lib/department-utils";
import { departments } from "@/data/departments";
import type { Submission, ShareMode } from "@/types/submission";
import { CheckCircle2, AlertCircle, Plus, Trash2, Sparkles } from "lucide-react";

const PAIN_POINTS = [
  "花時間","重複性太高","容易出錯","不易整理","常找不到資料",
  "每次都要重做","溝通很多但還是搞不清楚","不知道用什麼工具","現有系統不好用","其他",
];
const CURRENT_METHODS = [
  "手動處理（自己慢慢做）","用 Excel / 表格整理","用既有系統（SPS / NAS / HR 等）",
  "問同事 / 問主管","在 LINE / 群組詢問","上網找資料（Google / YouTube）",
  "參考舊資料再修改","每次重新做一次","邊做邊試（沒有固定方法）","其他",
];
const DATA_SOURCES = [
  "Excel / 表格","Word / 文件","PDF","圖片 / 照片","錄音 / 語音",
  "Email","LINE / 群組","SPS","NAS","HR 系統","紙本","不固定 / 很分散","其他",
];
const FREQUENCY = ["每天","每週","每月","每個專案都會遇到","偶爾遇到","不確定","其他"];
const ANNOYANCE = [
  { label: "還好，但可以優化",    icon: "🤔" },
  { label: "有點煩，改善會很有感", icon: "😑" },
  { label: "很煩，希望優先處理",   icon: "😤" },
  { label: "已經麻痺，每天都這樣", icon: "🔥" },
];
const AI_NEEDS = [
  "整理資料（文件、紀錄）","找資料（快速搜尋）","分類資料（照片、文件）",
  "撰寫 / 修改內容（公文、報告、信件）","整理重點（摘要）","分析數據（Excel、報表）",
  "製作圖表（視覺化）","會議紀錄（逐字稿、整理）","簡報製作（大綱、生成、修改）",
  "SOP / 流程整理","自動化作業（填資料、重複工作）","查詢歷史資料","資料比對 / 查核",
  "AI 學習（工具、課程）","不確定怎麼用，只是想了解","其他",
];
const SHARE_MODES: ShareMode[] = [
  "願意分享（公開內容、部門、姓名）",
  "匿名分享（公開內容，但不顯示部門姓名）",
  "不公開（只給數位創新處後台查看）",
];

const PERSONAL_INFO_KEY = "ai-wish-personal-info";
const MAX_PROBLEMS = 5;

type ProblemBlock = {
  id: string;
  problemTitle: string;
  painPoints: string[]; painPointsOther: string;
  currentMethods: string[]; currentMethodsOther: string;
  dataSources: string[]; dataSourcesOther: string;
  frequency: string; frequencyOther: string;
  annoyanceLevel: string;
};

type FormState = {
  departmentPath: string[];
  name: string;
  problems: ProblemBlock[];
  aiNeeds: string[]; aiNeedsOther: string;
  shareMode: ShareMode | "";
  freeText: string;
};

function newProblem(): ProblemBlock {
  return {
    id: Math.random().toString(36).slice(2),
    problemTitle: "",
    painPoints: [], painPointsOther: "",
    currentMethods: [], currentMethodsOther: "",
    dataSources: [], dataSourcesOther: "",
    frequency: "", frequencyOther: "",
    annoyanceLevel: "",
  };
}

const blankForm: FormState = {
  departmentPath: [], name: "",
  problems: [newProblem()],
  aiNeeds: [], aiNeedsOther: "",
  shareMode: "", freeText: "",
};

type ProblemErrors = Partial<Record<keyof ProblemBlock, string>>;
type Errors = {
  departmentPath?: string;
  name?: string;
  problems?: ProblemErrors[];
  aiNeeds?: string; aiNeedsOther?: string;
  shareMode?: string;
};

function toggleItem(arr: string[], item: string): string[] {
  return arr.includes(item) ? arr.filter(v => v !== item) : [...arr, item];
}
function resolveMulti(arr: string[], other: string): string[] {
  if (!arr.includes("其他") || !other.trim()) return arr;
  return [...arr.filter(v => v !== "其他"), `其他：${other.trim()}`];
}
function resolveSingle(val: string, other: string): string {
  if (val !== "其他" || !other.trim()) return val;
  return `其他：${other.trim()}`;
}

function OtherInput({ value, onChange, placeholder = "說說看是什麼？" }: {
  value: string; onChange: (v: string) => void; placeholder?: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => { ref.current?.focus(); }, []);
  return (
    <div className="mt-2">
      <input ref={ref} type="text" value={value} onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 text-sm rounded-lg border border-[#007A87] bg-[#B5E1E5]/10 focus:outline-none focus:ring-2 focus:ring-[#007A87]/40 placeholder:text-[#BDBDBD] text-[#424242]" />
    </div>
  );
}

// ─── Sub-question label ───────────────────────────────────────────────────────
// Secondary color steps for sub-question labels (1→6)
function SubQ({ num, label, hint }: { num: string; label: string; hint?: string }) {
  return (
    <div className="mb-3">
      <div className="inline-flex items-center gap-1.5 mb-1">
        <span className="h-5 px-1.5 rounded-md text-[10px] font-bold flex items-center bg-[#EDDDCA] text-[#7A5A30]">
          {num}
        </span>
      </div>
      <p className="text-sm font-semibold text-[#2D2D2D]">{label}</p>
      {hint && <p className="text-xs text-[#9E9E9E] mt-0.5">{hint}</p>}
    </div>
  );
}

// ─── Problem block ────────────────────────────────────────────────────────────
function ProblemBlockForm({ index, total, problem, errors, onChange, onRemove }: {
  index: number; total: number; problem: ProblemBlock; errors: ProblemErrors;
  onChange: (u: ProblemBlock) => void; onRemove: () => void;
}) {
  function set(updates: Partial<ProblemBlock>) { onChange({ ...problem, ...updates }); }
  const base = `${index + 1}`;

  return (
    <div className="bg-white border border-[#E0E0E0] rounded-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 bg-[#F5F5F5] border-b border-[#E0E0E0]">
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-[#BE8B55] text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
            {index + 1}
          </span>
          <span className="text-sm font-semibold text-[#424242]">
            {problem.problemTitle || `困擾 ${index + 1}`}
          </span>
        </div>
        {total > 1 && (
          <button type="button" onClick={onRemove}
            className="flex items-center gap-1 text-xs text-[#9E9E9E] hover:text-[#AE1914] transition-colors px-2 py-1 rounded">
            <Trash2 size={13} />移除
          </button>
        )}
      </div>

      <div className="p-5 space-y-6">

        {/* Q_1 問題描述 */}
        <div>
          <SubQ num={`${base}-1`} label="最近讓你覺得「又來了…」的工作是什麼？"
            hint="簡單敘述即可" />
          <TextInput placeholder="XXX又來了！！！" value={problem.problemTitle} error={!!errors.problemTitle}
            onChange={e => set({ problemTitle: e.target.value })} />
          {errors.problemTitle && <p className="text-xs text-[#AE1914] mt-1 flex items-center gap-1"><AlertCircle size={12} />{errors.problemTitle}</p>}
        </div>

        {/* Q_2 痛點 */}
        <div>
          <SubQ num={`${base}-2`} label="這件事哪裡最讓你頭痛？"
            hint="可多選" />
          <div className="grid grid-cols-2 gap-2">
            {PAIN_POINTS.map(opt => (
              <OptionCard key={opt} label={opt} selected={problem.painPoints.includes(opt)}
                onClick={() => set({ painPoints: toggleItem(problem.painPoints, opt) })} />
            ))}
          </div>
          {problem.painPoints.includes("其他") && (
            <OtherInput value={problem.painPointsOther} onChange={v => set({ painPointsOther: v })} />
          )}
          {(errors.painPoints || errors.painPointsOther) && (
            <p className="text-xs text-[#AE1914] mt-2 flex items-center gap-1"><AlertCircle size={12} />{errors.painPoints || errors.painPointsOther}</p>
          )}
        </div>

        {/* Q_3 現在怎麼處理 */}
        <div>
          <SubQ num={`${base}-3`} label="目前你都怎麼應付這件事？"
            hint="可多選" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {CURRENT_METHODS.map(opt => (
              <OptionCard key={opt} label={opt} selected={problem.currentMethods.includes(opt)}
                onClick={() => set({ currentMethods: toggleItem(problem.currentMethods, opt) })} />
            ))}
          </div>
          {problem.currentMethods.includes("其他") && (
            <OtherInput value={problem.currentMethodsOther} onChange={v => set({ currentMethodsOther: v })} />
          )}
          {(errors.currentMethods || errors.currentMethodsOther) && (
            <p className="text-xs text-[#AE1914] mt-2 flex items-center gap-1"><AlertCircle size={12} />{errors.currentMethods || errors.currentMethodsOther}</p>
          )}
        </div>

        {/* Q_4 資料在哪 */}
        <div>
          <SubQ num={`${base}-4`} label="跟這件事相關的資料，通常放在哪？"
            hint="可多選" />
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {DATA_SOURCES.map(opt => (
              <OptionCard key={opt} label={opt} selected={problem.dataSources.includes(opt)}
                onClick={() => set({ dataSources: toggleItem(problem.dataSources, opt) })} />
            ))}
          </div>
          {problem.dataSources.includes("其他") && (
            <OtherInput value={problem.dataSourcesOther} onChange={v => set({ dataSourcesOther: v })} />
          )}
          {(errors.dataSources || errors.dataSourcesOther) && (
            <p className="text-xs text-[#AE1914] mt-2 flex items-center gap-1"><AlertCircle size={12} />{errors.dataSources || errors.dataSourcesOther}</p>
          )}
        </div>

        {/* Q_5 頻率 */}
        <div>
          <SubQ num={`${base}-5`} label="這件事大概多久會遇到一次？" />
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {FREQUENCY.map(opt => (
              <OptionCard key={opt} label={opt} selected={problem.frequency === opt}
                onClick={() => set({ frequency: opt, frequencyOther: "" })} />
            ))}
          </div>
          {problem.frequency === "其他" && (
            <OtherInput value={problem.frequencyOther} placeholder="大概多久？" onChange={v => set({ frequencyOther: v })} />
          )}
          {(errors.frequency || errors.frequencyOther) && (
            <p className="text-xs text-[#AE1914] mt-2 flex items-center gap-1"><AlertCircle size={12} />{errors.frequency || errors.frequencyOther}</p>
          )}
        </div>

        {/* Q_6 煩人程度 */}
        <div>
          <SubQ num={`${base}-6`} label="說真的，這件事有多煩？" />
          <div className="grid grid-cols-1 gap-2">
            {ANNOYANCE.map(({ label, icon }) => (
              <OptionCard key={label} label={`${icon} ${label}`} selected={problem.annoyanceLevel === label}
                onClick={() => set({ annoyanceLevel: label })} />
            ))}
          </div>
          {errors.annoyanceLevel && (
            <p className="text-xs text-[#AE1914] mt-2 flex items-center gap-1"><AlertCircle size={12} />{errors.annoyanceLevel}</p>
          )}
        </div>
      </div>
    </div>
  );
}


// ─── Coin submit button (no animation - fires only on real success) ───────────
function CoinSubmitButton({ count }: { count: number }) {
  return (
    <button type="submit"
      className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold bg-[#007A87] text-white shadow-md hover:bg-[#00555E] transition-colors focus:outline-none focus:ring-2 focus:ring-[#007A87]/40">
      <Sparkles size={15} />
      {count > 1 ? `送出 ${count} 個困擾` : "送出"}
    </button>
  );
}

// ─── Full-screen success splash ────────────────────────────────────────────────
function SuccessSplash({ count, onDone }: { count: number; onDone: () => void }) {
  const [phase, setPhase] = useState<"splash"|"content">("splash");

  useEffect(() => {
    const t1 = setTimeout(() => setPhase("content"), 800);
    return () => clearTimeout(t1);
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#007A87]">
      {/* Ripple circles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[0,1,2,3].map(i => (
          <div key={i} className="absolute rounded-full border-2 border-white/20"
            style={{
              width: `${120 + i * 160}px`, height: `${120 + i * 160}px`,
              left: "50%", top: "50%",
              transform: "translate(-50%, -50%)",
              animation: `ripple 1.2s ease-out ${i * 0.15}s forwards`,
            }} />
        ))}
        {/* Splash droplets */}
        {Array.from({length: 12}).map((_, i) => {
          const angle = (i / 12) * 360;
          const dist = 80 + Math.random() * 60;
          return (
            <div key={i} className="absolute text-lg"
              style={{
                left: "50%", top: "50%",
                animation: `droplet 0.8s ease-out ${i * 0.04}s forwards`,
                "--angle": `${angle}deg`,
                "--dist": `${dist}px`,
              } as React.CSSProperties}>
              💧
            </div>
          );
        })}
      </div>

      {/* Coin drop */}
      <div className="relative z-10 text-center">
        <div className="text-6xl mb-2" style={{ animation: "coinDrop 0.6s cubic-bezier(0.2,1.4,0.4,1) forwards" }}>
          🪙
        </div>
        {phase === "content" && (
          <div style={{ animation: "fadeUp 0.4s ease-out forwards" }}>
            <p className="text-white text-2xl font-bold mb-1">願望許成了！</p>
            <p className="text-white/80 text-sm mb-6">
              {count > 1 ? `${count} 個困擾都收到了` : "已收到你的困擾"}
            </p>
            <div className="flex gap-3 justify-center">
              <button onClick={onDone}
                className="px-5 py-2 bg-white text-[#007A87] rounded-xl text-sm font-semibold hover:bg-white/90 transition-colors">
                再填一次
              </button>
              <a href="/board"
                className="px-5 py-2 bg-white/20 text-white rounded-xl text-sm font-semibold hover:bg-white/30 transition-colors border border-white/30">
                看公告欄
              </a>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes ripple {
          0%   { opacity: 0.6; transform: translate(-50%,-50%) scale(0.3); }
          100% { opacity: 0; transform: translate(-50%,-50%) scale(1); }
        }
        @keyframes droplet {
          0%   { opacity: 1; transform: translate(-50%,-50%) translate(0,0) scale(1); }
          100% { opacity: 0; transform: translate(-50%,-50%) translate(
            calc(cos(var(--angle)) * var(--dist)),
            calc(sin(var(--angle)) * var(--dist))
          ) scale(0.3); }
        }
        @keyframes coinDrop {
          0%   { transform: translateY(-60px) scale(0.5) rotate(-30deg); opacity: 0; }
          70%  { transform: translateY(8px) scale(1.15) rotate(10deg); opacity: 1; }
          100% { transform: translateY(0) scale(1) rotate(0deg); opacity: 1; }
        }
        @keyframes fadeUp {
          0%   { opacity: 0; transform: translateY(16px); }
          100% { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}


// ─── Sidebar TOC — floats outside container ───────────────────────────────────
function SidebarTOC({ problems }: { problems: { id: string; problemTitle: string }[] }) {
  const top = [
    { id: "q1", label: "單位 / 部門", step: "Q1" },
    { id: "q2", label: "姓名", step: "Q2" },
  ];
  const bottom = [
    { id: "q3", label: "AI 需求", step: "Q3" },
    { id: "q4", label: "分享方式", step: "Q4" },
    { id: "q5", label: "補充說明", step: "Q5" },
  ];
  function scrollTo(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }
  return (
    <div className="hidden xl:block fixed left-[max(0px,calc(50%-430px-176px))] top-[70px] w-40 bg-white/40 backdrop-blur-sm border border-[#E0E0E0]/40 rounded-xl p-2 shadow-sm space-y-1">
      <p className="text-xs font-bold text-[#9E9E9E] uppercase tracking-wider mb-2 px-2">快速跳轉</p>
      {top.map(s => (
        <button key={s.id} type="button" onClick={() => scrollTo(s.id)}
          className="w-full flex items-center gap-2 px-2 py-2 rounded-lg text-left hover:bg-white hover:shadow-sm transition-all group">
          <span className="text-[10px] font-bold text-[#007A87] bg-[#B5E1E5]/50 px-1.5 py-0.5 rounded flex-shrink-0">{s.step}</span>
          <p className="text-xs font-medium text-[#616161] group-hover:text-[#2D2D2D] truncate">{s.label}</p>
        </button>
      ))}

      {/* Individual problems */}
      <div className="border-t border-[#E0E0E0]/40 pt-1 mt-1">
        <p className="text-[10px] text-[#9E9E9E] px-2 pb-1">困擾</p>
        {problems.map((p, i) => (
          <button key={p.id} type="button"
            onClick={() => document.getElementById(`problem-${p.id}`)?.scrollIntoView({ behavior: "smooth", block: "start" })}
            className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left hover:bg-white hover:shadow-sm transition-all group">
            <span className="text-[10px] font-bold text-[#BE8B55] bg-[#EDDDCA] px-1.5 py-0.5 rounded flex-shrink-0">{i + 1}</span>
            <p className="text-xs font-medium text-[#616161] group-hover:text-[#2D2D2D] truncate">
              {p.problemTitle || `困擾 ${i + 1}`}
            </p>
          </button>
        ))}
      </div>

      <div className="border-t border-[#E0E0E0]/40 pt-1 mt-1">
        {bottom.map(s => (
          <button key={s.id} type="button" onClick={() => scrollTo(s.id)}
            className="w-full flex items-center gap-2 px-2 py-2 rounded-lg text-left hover:bg-white hover:shadow-sm transition-all group">
            <span className="text-[10px] font-bold text-[#007A87] bg-[#B5E1E5]/50 px-1.5 py-0.5 rounded flex-shrink-0">{s.step}</span>
            <p className="text-xs font-medium text-[#616161] group-hover:text-[#2D2D2D] truncate">{s.label}</p>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function WishPage() {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(blankForm);
  const [errors, setErrors] = useState<Errors>({});
  const [submitted, setSubmitted] = useState(false);
  const [aiNeedsWarning, setAiNeedsWarning] = useState(false);
  const [savedPersonal, setSavedPersonal] = useState<{ departmentPath: string[]; name: string } | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(PERSONAL_INFO_KEY);
      if (raw) {
        const info = JSON.parse(raw);
        setSavedPersonal(info);
        setForm(f => ({ ...f, departmentPath: info.departmentPath, name: info.name }));
      }
    } catch {}
  }, []);

  function updateProblem(i: number, updated: ProblemBlock) {
    setForm(f => { const p = [...f.problems]; p[i] = updated; return { ...f, problems: p }; });
    setErrors(e => { const pe = [...(e.problems ?? [])]; pe[i] = {}; return { ...e, problems: pe }; });
  }

  function addProblem() {
    if (form.problems.length >= MAX_PROBLEMS) return;
    setForm(f => ({ ...f, problems: [...f.problems, newProblem()] }));
  }

  function removeProblem(i: number) {
    setForm(f => ({ ...f, problems: f.problems.filter((_, idx) => idx !== i) }));
    setErrors(e => ({ ...e, problems: (e.problems ?? []).filter((_, idx) => idx !== i) }));
  }

  function validate(): boolean {
    const e: Errors = {};
    if (form.departmentPath.length === 0) e.departmentPath = "請選擇你的部門";
    else if (!isLeafNode(departments, form.departmentPath)) e.departmentPath = "請選到最末層的單位";
    if (!form.name.trim()) e.name = "請填上你的名字";

    const pe: ProblemErrors[] = form.problems.map(p => {
      const err: ProblemErrors = {};
      if (!p.problemTitle.trim()) err.problemTitle = "這題要填喔";
      if (p.painPoints.length === 0) err.painPoints = "至少選一個";
      if (p.painPoints.includes("其他") && !p.painPointsOther.trim()) err.painPointsOther = "請說明一下";
      if (p.currentMethods.length === 0) err.currentMethods = "至少選一個";
      if (p.currentMethods.includes("其他") && !p.currentMethodsOther.trim()) err.currentMethodsOther = "請說明一下";
      if (p.dataSources.length === 0) err.dataSources = "至少選一個";
      if (p.dataSources.includes("其他") && !p.dataSourcesOther.trim()) err.dataSourcesOther = "請說明一下";
      if (!p.frequency) err.frequency = "選一個最接近的";
      if (p.frequency === "其他" && !p.frequencyOther.trim()) err.frequencyOther = "請說明一下";
      if (!p.annoyanceLevel) err.annoyanceLevel = "選一個最接近的";
      return err;
    });

    if (pe.some(p => Object.keys(p).length > 0)) e.problems = pe;
    if (form.aiNeeds.length === 0) e.aiNeeds = "至少選一個方向";
    if (form.aiNeeds.includes("其他") && !form.aiNeedsOther.trim()) e.aiNeedsOther = "請說明一下";
    if (!form.shareMode) e.shareMode = "請選一個";
    setErrors(e);

    if (Object.keys(e).length > 0) {
      setTimeout(() => document.querySelector("[data-error]")?.scrollIntoView({ behavior: "smooth", block: "center" }), 50);
      return false;
    }
    return true;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    const isVisible = form.shareMode === "願意分享（公開內容、部門、姓名）" || form.shareMode === "匿名分享（公開內容，但不顯示部門姓名）";
    const saves = form.problems.map(p => {
      const sub = {
        id: generateId(),
        createdAt: new Date().toISOString(),
        departmentPath: form.departmentPath,
        departmentFullPath: form.departmentPath.join(" > "),
        name: form.name,
        problemTitle: p.problemTitle,
        painPoints: resolveMulti(p.painPoints, p.painPointsOther),
        currentMethods: resolveMulti(p.currentMethods, p.currentMethodsOther),
        dataSources: resolveMulti(p.dataSources, p.dataSourcesOther),
        frequency: resolveSingle(p.frequency, p.frequencyOther),
        annoyanceLevel: p.annoyanceLevel,
        aiNeeds: resolveMulti(form.aiNeeds, form.aiNeedsOther),
        shareMode: form.shareMode as ShareMode,
        freeText: form.freeText,
        status: "已收到", priority: "待評估", category: "未分類",
        adminNote: "", publicSummary: "", isVisible, likeCount: 0,
      };
      return addSubmissionAsync({ ...sub, category: autoClassify(sub as Record<string, unknown>) } as import("@/types/submission").Submission);
    });
    await Promise.all(saves);
    try { localStorage.setItem(PERSONAL_INFO_KEY, JSON.stringify({ departmentPath: form.departmentPath, name: form.name })); } catch {}
    setSavedPersonal({ departmentPath: form.departmentPath, name: form.name });
    setSubmitted(true);
  }

  function handleRefill() {
    setForm({ ...blankForm, problems: [newProblem()], departmentPath: savedPersonal?.departmentPath ?? [], name: savedPersonal?.name ?? "" });
    setErrors({});
    setSubmitted(false);
  }

  if (submitted) {
    return (
      <SuccessSplash count={form.problems.length} onDone={handleRefill} />
    );
  }

  return (
    <div className="max-w-[860px] mx-auto px-6 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[#424242]">許個願吧</h1>
        <p className="text-[#757575] mt-1 text-sm">把工作上讓你有感的困擾說出來，一次可以說好幾個 ~~</p>
        {savedPersonal && (
          <div className="mt-3 inline-flex items-center gap-2 text-xs text-[#007A87] bg-[#B5E1E5]/30 border border-[#B5E1E5] px-3 py-1.5 rounded-full">
            <CheckCircle2 size={12} />已帶入你上次的部門與姓名
          </div>
        )}
      </div>

      <div className="relative">
      <SidebarTOC problems={form.problems} />
      <form onSubmit={handleSubmit} noValidate>
        <div className="space-y-6">

          {/* Q1 */}
          <section id="q1" className="bg-white border border-[#E0E0E0] rounded-lg p-5 scroll-mt-20">
            <SectionHeader step="Q1" title="單位 / 部門"
              description="搜尋或一層層選到你的部門 / 工地" />
            <div data-error={errors.departmentPath ? true : undefined}>
              <DepartmentSelector value={form.departmentPath}
                onChange={path => { setForm(f => ({ ...f, departmentPath: path })); setErrors(e => ({ ...e, departmentPath: undefined })); }}
                error={errors.departmentPath} />
            </div>
          </section>

          {/* Q2 */}
          <section id="q2" className="bg-white border border-[#E0E0E0] rounded-lg p-5 scroll-mt-20">
            <SectionHeader step="Q2" title="姓名"
              description="若選擇匿名或不公開，名字只有後台看得到。" />
            <div data-error={errors.name ? true : undefined}>
              <TextInput placeholder="你的姓名" value={form.name} error={!!errors.name}
                onChange={e => { setForm(f => ({ ...f, name: e.target.value })); setErrors(er => ({ ...er, name: undefined })); }} />
              {errors.name && <p className="text-xs text-[#AE1914] mt-1 flex items-center gap-1"><AlertCircle size={12} />{errors.name}</p>}
            </div>
          </section>

          {/* Q3–Q8 問題區塊 */}
          <div id="problems" className="scroll-mt-20">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="text-base font-semibold text-[#424242]">你的困擾</h2>
                <p className="text-xs text-[#9E9E9E] mt-0.5">有幾個就填幾個，最多 {MAX_PROBLEMS} 個</p>
              </div>
              <span className="inline-flex items-center text-xs text-[#9E9E9E] bg-white border border-[#E0E0E0] px-2 py-1 rounded-lg">{form.problems.length} / {MAX_PROBLEMS}</span>
            </div>

            <div className="space-y-4">
              {form.problems.map((p, i) => (
                <div key={p.id} id={`problem-${p.id}`} className="scroll-mt-20" data-error={errors.problems?.[i] && Object.keys(errors.problems[i]).length > 0 ? true : undefined}>
                  <ProblemBlockForm index={i} total={form.problems.length} problem={p}
                    errors={errors.problems?.[i] ?? {}}
                    onChange={updated => updateProblem(i, updated)}
                    onRemove={() => removeProblem(i)} />
                </div>
              ))}
            </div>

            {form.problems.length < MAX_PROBLEMS && (
              <button type="button" onClick={addProblem}
                className="mt-3 w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 border-dashed border-[#E0E0E0] text-sm text-[#9E9E9E] hover:border-[#007A87] hover:text-[#007A87] hover:bg-[#B5E1E5]/10 transition-colors">
                <Plus size={16} />還有另一個困擾？點這裡新增
              </button>
            )}
          </div>

          {/* Q9 AI 需求 */}
          <section id="q3" className="bg-white border border-[#E0E0E0] rounded-lg p-5 scroll-mt-20">
            <SectionHeader step="Q3" title="如果有工具可以幫你，你最希望它能做什麼？"
              description="最多可選 5 項" />
            <div data-error={(errors.aiNeeds || errors.aiNeedsOther) ? true : undefined}>
              {aiNeedsWarning && (
                <div className="mb-2 px-3 py-2 bg-[#FFF3CD] border border-[#FFAE00]/30 rounded-lg text-xs text-[#92400e] flex items-center gap-1.5">
                  <AlertCircle size={12} />已達上限，先挑最有感的 5 個就好。
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {AI_NEEDS.map(opt => {
                  const selected = form.aiNeeds.includes(opt);
                  const maxReached = form.aiNeeds.length >= 5 && !selected;
                  return (
                    <OptionCard key={opt} label={opt} selected={selected} disabled={maxReached}
                      onClick={() => {
                        if (maxReached) { setAiNeedsWarning(true); setTimeout(() => setAiNeedsWarning(false), 3000); return; }
                        setForm(f => ({ ...f, aiNeeds: toggleItem(f.aiNeeds, opt) }));
                        setAiNeedsWarning(false);
                        setErrors(e => ({ ...e, aiNeeds: undefined }));
                      }} />
                  );
                })}
              </div>
              {form.aiNeeds.includes("其他") && (
                <OtherInput value={form.aiNeedsOther} onChange={v => { setForm(f => ({ ...f, aiNeedsOther: v })); setErrors(e => ({ ...e, aiNeedsOther: undefined })); }} />
              )}
              <p className="text-xs text-[#9E9E9E] mt-2">已選 {form.aiNeeds.length} / 5</p>
              {(errors.aiNeeds || errors.aiNeedsOther) && (
                <p className="text-xs text-[#AE1914] mt-1 flex items-center gap-1"><AlertCircle size={12} />{errors.aiNeeds || errors.aiNeedsOther}</p>
              )}
            </div>
          </section>

          {/* Q10 分享方式 */}
          <section id="q4" className="bg-white border border-[#E0E0E0] rounded-lg p-5 scroll-mt-20">
            <SectionHeader step="Q4" title="這些內容，你希望怎麼被看到？"
              description="如果內容比較敏感，數位創新處會先整理過再公開，不會直接貼出來。" />
            <div data-error={errors.shareMode ? true : undefined}>
              <div className="grid grid-cols-1 gap-2">
                {SHARE_MODES.map(opt => (
                  <OptionCard key={opt} label={opt} selected={form.shareMode === opt}
                    onClick={() => { setForm(f => ({ ...f, shareMode: opt })); setErrors(e => ({ ...e, shareMode: undefined })); }} />
                ))}
              </div>
              {errors.shareMode && <p className="text-xs text-[#AE1914] mt-2 flex items-center gap-1"><AlertCircle size={12} />{errors.shareMode}</p>}
            </div>
          </section>

          {/* Q11 自由填寫 */}
          <section id="q5" className="bg-white border border-[#E0E0E0] rounded-lg p-5 scroll-mt-20">
            <SectionHeader step="Q5" title="還有什麼想補充的嗎？（選填）"
              description="比如你在 AI 工具上遇到的困難、對數位創新處有什麼期待，或任何想說的話。" />
            <textarea rows={4} placeholder="隨意寫，不用太正式…" value={form.freeText}
              onChange={e => setForm(f => ({ ...f, freeText: e.target.value }))}
              className="w-full px-3 py-2.5 text-sm rounded-lg border border-[#E0E0E0] focus:outline-none focus:ring-2 focus:ring-[#007A87]/40 focus:border-[#007A87] placeholder:text-[#BDBDBD] text-[#424242] resize-none" />
          </section>

          <div className="flex justify-end pb-8">
            <CoinSubmitButton count={form.problems.length} />
          </div>
        </div>
      </form>
      </div>
    </div>
  );
}
