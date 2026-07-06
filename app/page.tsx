"use client";

import Link from "next/link";
import { Search, Users, ClipboardList, BarChart2, FileText, Presentation, ArrowRight, Sparkles, Lightbulb } from "lucide-react";
import { useState } from "react";

const situations = [
  { icon: Search, label: "找資料翻很久", color: "bg-[#B5E1E5]/50 text-[#007A87]" },
  { icon: Users, label: "找人要繞一圈", color: "bg-[#E0C8AE]/50 text-[#765530]" },
  { icon: ClipboardList, label: "會議紀錄很花時間", color: "bg-[#EDE9FE]/70 text-[#5b21b6]" },
  { icon: BarChart2, label: "Excel 報表一直重做", color: "bg-[#FFF3CD]/70 text-[#92400e]" },
  { icon: FileText, label: "文件整理很吃力", color: "bg-[#EBCDCC]/50 text-[#8C1915]" },
  { icon: Presentation, label: "簡報報告很花時間", color: "bg-[#91EFA6]/40 text-[#198754]" },
];

function CoinButton({ href, children }: { href: string; children: React.ReactNode }) {
  const [throwing, setThrowing] = useState(false);
  function handleClick(e: React.MouseEvent) {
    if (throwing) return;
    e.preventDefault();
    setThrowing(true);
    setTimeout(() => { window.location.href = href; }, 700);
  }
  return (
    <a href={href} onClick={handleClick}
      className="relative inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold bg-[#007A87] text-white shadow-md transition-colors hover:bg-[#00555E] overflow-visible select-none">
      {throwing && (
        <span className="absolute -top-1 left-1/2 -translate-x-1/2 text-xl animate-coin pointer-events-none z-10">🪙</span>
      )}
      <Sparkles size={15} />
      {children}
      <ArrowRight size={15} />
      <style>{`@keyframes coinThrow{0%{transform:translate(-50%,0) scale(1) rotate(0deg);opacity:1}40%{transform:translate(-50%,-48px) scale(1.3) rotate(180deg);opacity:1}100%{transform:translate(-50%,-24px) scale(0.6) rotate(360deg);opacity:0}}.animate-coin{animation:coinThrow 0.65s cubic-bezier(0.2,0.8,0.4,1) forwards}`}</style>
    </a>
  );
}

export default function HomePage() {
  return (
    <div className="max-w-[860px] mx-auto px-6 py-12">

      {/* Hero — wrapped in full-width card to anchor visual width */}
      <div className="mb-12 text-center">
        <div className="inline-flex items-center gap-2 bg-[#007A87]/10 text-[#007A87] text-xs font-semibold px-4 py-1.5 rounded-full mb-6 border border-[#007A87]/20">
          <Sparkles size={12} />
          數位創新處 · AI 需求收集計畫
        </div>
        <h1 className="text-4xl font-bold text-[#2D2D2D] mb-4 leading-tight tracking-tight">
          有些工作，<span className="text-[#007A87]">不用每次都自己做</span>
        </h1>
        <p className="text-[#616161] text-base leading-relaxed mb-8">
          找資料找很久、報表一直重做、會議紀錄很花時間⋯<br />
          把你最有感的困擾留下來，我們來想辦法。
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <CoinButton href="/wish">許個願</CoinButton>
          <Link href="/board"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold bg-white text-[#007A87] border border-[#007A87]/60 transition-colors hover:bg-[#B5E1E5]/20">
            看大家的困擾
          </Link>
        </div>
      </div>

      {/* Situation cards */}
      <div className="mb-10">
        <p className="text-xs text-[#9E9E9E] text-center mb-4 uppercase tracking-widest font-semibold">
          你有沒有這些感受？
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {situations.map(({ icon: Icon, label, color }) => (
            <div key={label} className="bg-white border border-[#E0E0E0]/80 rounded-xl p-4 flex items-center gap-3 cursor-default">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
                <Icon size={16} />
              </div>
              <span className="text-sm text-[#2D2D2D] font-medium leading-tight">{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* How it works */}
      <div className="bg-white border border-[#E0E0E0]/80 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-5">
          <Lightbulb size={15} className="text-[#FFAE00]" />
          <h2 className="text-sm font-bold text-[#2D2D2D]">怎麼運作的？</h2>
        </div>
        <div className="space-y-4">
          {[
            { emoji: "🪙", title: "說出你的困擾", desc: "描述工作上讓你頭痛的事，不用很完整，有感受就夠了。" },
            { emoji: "🔍", title: "我們來整理分析", desc: "數位創新處會歸類大家的回饋，找出最多人有感的問題優先處理。" },
            { emoji: "🚀", title: "逐步導入解法", desc: "從最有感的問題開始，規劃工具或流程，並在公告欄更新進度。" },
          ].map(item => (
            <div key={item.title} className="flex items-start gap-4">
              <div className="flex-shrink-0 w-9 h-9 rounded-xl bg-[#F0F4F4] flex items-center justify-center text-lg">{item.emoji}</div>
              <div>
                <p className="text-sm font-semibold text-[#2D2D2D]">{item.title}</p>
                <p className="text-sm text-[#616161] mt-0.5 leading-relaxed">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
