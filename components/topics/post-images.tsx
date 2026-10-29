"use client";

import React from "react";
import { X } from "lucide-react";
import type { PendingImage } from "@/lib/topic-images";

// 留言裡的附圖：縮圖排列，點了開新分頁看原圖
export function PostImages({ urls }: { urls: string[] }) {
  if (urls.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-2 mt-2">
      {urls.map((url) => (
        <a key={url} href={url} target="_blank" rel="noopener noreferrer"
          className="block rounded-lg overflow-hidden border border-[#E0E0E0] hover:border-[#007A87]/60 transition-colors">
          {/* eslint-disable-next-line @next/next/no-img-element -- 使用者上傳的外部圖片，不經 next/image */}
          <img src={url} alt="留言附圖" loading="lazy" className="h-28 max-w-[220px] object-cover" />
        </a>
      ))}
    </div>
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
