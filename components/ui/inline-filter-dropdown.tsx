"use client";

import React, { useState, useRef, useEffect } from "react";
import { ChevronDown, Check } from "lucide-react";

// 共用的行內篩選下拉選單（公告欄、主題討論的排序／狀態等共用）。
// value 等於第一個選項時，按鈕顯示 label（未篩選狀態）；否則顯示已選項目並高亮。
export function InlineFilterDropdown({ label, value, options, onChange }: {
  label: string;
  value: string;
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
