"use client";

import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

// 滑過顯示的說明小框，取代瀏覽器預設的 title 提示。
// 畫在 body 底下（fixed 定位），不會被卡片的 overflow-hidden 或 line-clamp 切掉。
export function Hint({ text, children, className, style }: {
  text: string;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);

  function show() {
    const r = ref.current?.getBoundingClientRect();
    if (r) setPos({ x: r.left + r.width / 2, y: r.top });
  }

  // 顯示中捲動頁面，位置會跑掉，直接收起來
  useEffect(() => {
    if (!pos) return;
    const hide = () => setPos(null);
    window.addEventListener("scroll", hide, true);
    return () => window.removeEventListener("scroll", hide, true);
  }, [pos]);

  return (
    <span ref={ref} className={className} style={style}
      onMouseEnter={show} onMouseLeave={() => setPos(null)}
      onFocus={show} onBlur={() => setPos(null)}
      onClick={() => setPos(null)}>
      {children}
      {pos && createPortal(
        <span role="tooltip" style={{ left: pos.x, top: pos.y - 6 }}
          className="fixed z-[100] -translate-x-1/2 -translate-y-full pointer-events-none whitespace-nowrap bg-white border border-[#E0E0E0] rounded-lg px-2.5 py-1.5 shadow-md text-xs text-[#616161]">
          {text}
        </span>,
        document.body,
      )}
    </span>
  );
}
