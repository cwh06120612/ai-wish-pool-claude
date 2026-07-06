"use client";

import Link from "next/link";
import { ArrowRight, Sparkles, Lightbulb, Megaphone, MessagesSquare, Rocket } from "lucide-react";
import { useState } from "react";

// 四大功能入口
const entries = [
  {
    href: "/wish",
    icon: Sparkles,
    title: "我要許願",
    desc: "說出工作中最麻煩的事，讓數位創新處幫你想辦法。",
    iconBg: "bg-[#B5E1E5]/50 text-[#007A87]",
    hover: "hover:border-[#007A87]/50",
  },
  {
    href: "/board",
    icon: Megaphone,
    title: "公告欄",
    desc: "看看大家的需求，以及我們的處理進度。",
    iconBg: "bg-[#F5EDE2] text-[#BE8B55]",
    hover: "hover:border-[#BE8B55]/50",
  },
  {
    href: "/topics",
    icon: MessagesSquare,
    title: "主題討論",
    desc: "針對各系統開討論串，交流使用上的問題與建議。",
    iconBg: "bg-[#EDE9FE] text-[#5b21b6]",
    hover: "hover:border-[#5b21b6]/40",
  },
  {
    href: "/impact",
    icon: Rocket,
    title: "成果看板",
    desc: "看看已經落地的成果，以及同仁的真實回饋。",
    iconBg: "bg-[#EAF7EE] text-[#198754]",
    hover: "hover:border-[#198754]/40",
  },
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

      {/* Hero */}
      <div className="mb-10 text-center">
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

      {/* 功能入口 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
        {entries.map(({ href, icon: Icon, title, desc, iconBg, hover }) => (
          <Link key={href} href={href}
            className={`group bg-white border border-[#E0E0E0]/80 rounded-2xl p-6 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5 ${hover} flex flex-col`}>
            <div className="flex items-center gap-4 mb-3">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 ${iconBg}`}>
                <Icon size={26} />
              </div>
              <h2 className="text-xl font-bold text-[#2D2D2D] group-hover:text-[#007A87] transition-colors">{title}</h2>
            </div>
            <p className="text-sm text-[#616161] leading-relaxed flex-1">{desc}</p>
            <div className="flex items-center gap-1 text-sm font-semibold text-[#007A87] mt-4">
              進入<ArrowRight size={15} className="group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>
        ))}
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
