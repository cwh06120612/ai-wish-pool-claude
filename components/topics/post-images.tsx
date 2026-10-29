"use client";

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X, Download, ChevronLeft, ChevronRight } from "lucide-react";
import type { PendingImage } from "@/lib/topic-images";

// 留言裡的附圖：縮圖排列，點了開燈箱看大圖
export function PostImages({ urls }: { urls: string[] }) {
  const [open, setOpen] = useState<number | null>(null);
  if (urls.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-2 mt-2">
      {urls.map((url, i) => (
        <button key={url} type="button" onClick={() => setOpen(i)} aria-label={`放大第 ${i + 1} 張圖片`}
          className="block rounded-lg overflow-hidden border border-[#E0E0E0] hover:border-[#007A87]/60 transition-colors cursor-zoom-in">
          {/* eslint-disable-next-line @next/next/no-img-element -- 使用者上傳的外部圖片，不經 next/image */}
          <img src={url} alt="留言附圖" loading="lazy" className="h-28 max-w-[220px] object-cover" />
        </button>
      ))}
      {open !== null && <Lightbox urls={urls} index={open} onChange={setOpen} onClose={() => setOpen(null)} />}
    </div>
  );
}

// 圖片燈箱（樣式參考 AI 資源平台）：← → 翻頁、Esc 或點黑色背景關閉。
// 圖片本身與上方控制列擋下點擊，點圖是想看細節，不該一點就關掉。
function Lightbox({ urls, index, onChange, onClose }: {
  urls: string[];
  index: number;
  onChange: (i: number) => void;
  onClose: () => void;
}) {
  const step = (by: number) => onChange((index + by + urls.length) % urls.length);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight" && urls.length > 1) onChange((index + 1) % urls.length);
      else if (e.key === "ArrowLeft" && urls.length > 1) onChange((index - 1 + urls.length) % urls.length);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [index, urls.length, onChange, onClose]);

  return createPortal(
    <div className="fixed inset-0 z-[70] flex flex-col bg-black/80 p-4" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="flex items-center gap-3 text-sm text-white/80" onClick={(e) => e.stopPropagation()}>
        <span className="shrink-0 tabular-nums text-white/50">{index + 1} / {urls.length}</span>
        {/* Supabase Storage 公開網址加 ?download= 會直接下載而不是開啟 */}
        <a href={`${urls[index]}?download=`}
          className="ml-auto inline-flex shrink-0 items-center gap-1.5 rounded-full border border-white/30 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-white/10">
          <Download size={14} />下載
        </a>
        <button type="button" onClick={onClose} aria-label="關閉"
          className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-white/70 transition-colors hover:bg-white/10 hover:text-white">
          <X size={18} />
        </button>
      </div>

      {/* 圖片縮成內容大小（不撐滿整列），旁邊的黑色區域才點得到背景、能關閉。
          切換鈕釘在左右兩邊，換不同寬度的圖時按鈕位置不會跳。 */}
      <div className="relative flex min-h-0 flex-1 items-center justify-center">
        {/* eslint-disable-next-line @next/next/no-img-element -- 使用者上傳的外部圖片，不經 next/image */}
        <img src={urls[index]} alt={`留言附圖 ${index + 1}`} onClick={(e) => e.stopPropagation()}
          className="max-h-full min-h-0 max-w-full object-contain" />
        {urls.length > 1 && (
          <>
            <button type="button" onClick={(e) => { e.stopPropagation(); step(-1); }} aria-label="上一張"
              className="absolute left-2 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20">
              <ChevronLeft size={20} />
            </button>
            <button type="button" onClick={(e) => { e.stopPropagation(); step(1); }} aria-label="下一張"
              className="absolute right-2 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20">
              <ChevronRight size={20} />
            </button>
          </>
        )}
      </div>
    </div>,
    document.body,
  );
}

// 送出前的待上傳圖片預覽，右上角可移除
export function PendingImages({ images, onRemove }: { images: PendingImage[]; onRemove: (id: string) => void }) {
  if (images.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-2 mb-2">
      {images.map((img) => (
        <div key={img.id} className="relative rounded-lg overflow-hidden border border-[#E0E0E0]">
          {/* eslint-disable-next-line @next/next/no-img-element -- 本機預覽（blob 網址） */}
          <img src={img.preview} alt="待上傳圖片" className="h-16 w-16 object-cover" />
          <button type="button" onClick={() => onRemove(img.id)} aria-label="移除圖片"
            className="absolute top-0.5 right-0.5 w-5 h-5 flex items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80">
            <X size={11} />
          </button>
        </div>
      ))}
    </div>
  );
}
