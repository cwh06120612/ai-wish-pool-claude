import React from "react";
import type { Status } from "@/types/submission";

interface BadgeProps {
  children: React.ReactNode;
  variant?: "default" | "primary" | "secondary" | "accent" | "alert" | "grey";
  className?: string;
}

const badgeVariants = {
  default:   "bg-[#F0F4F4] text-[#616161]",
  primary:   "bg-[#B5E1E5] text-[#00555E]",
  secondary: "bg-[#E0C8AE] text-[#765530]",
  accent:    "bg-[#91EFA6] text-[#198754]",
  alert:     "bg-[#EBCDCC] text-[#8C1915]",
  grey:      "bg-[#E0E0E0] text-[#616161]",
};

export function Badge({ children, variant = "default", className = "" }: BadgeProps) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${badgeVariants[variant]} ${className}`}>
      {children}
    </span>
  );
}

// 狀態標籤：副色系（棕金）漸層，淺→深，最後一個灰色
// 已收到(最淺) → 整理中 → 評估中 → 尋找工具中 → 測試中 → 已導入(最深) → 暫不處理(灰)
const statusConfig: Record<Status, { bg: string; text: string }> = {
  已收到:     { bg: "#F5EDE3", text: "#A0724A" },
  整理中:     { bg: "#EAD9C4", text: "#8C5E35" },
  評估中:     { bg: "#DEC5A5", text: "#7A4F28" },
  尋找工具中: { bg: "#CFB080", text: "#ffffff" },
  測試中:     { bg: "#BE9A60", text: "#ffffff" },
  已導入:     { bg: "#9A7340", text: "#ffffff" },
  暫不處理:   { bg: "#E0E0E0", text: "#9E9E9E" },
};

interface StatusBadgeProps {
  status: Status;
  className?: string;
}

export function StatusBadge({ status, className = "" }: StatusBadgeProps) {
  const config = statusConfig[status] ?? { bg: "#E0E0E0", text: "#9E9E9E" };
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${className}`}
      style={{ backgroundColor: config.bg, color: config.text }}
    >
      {status}
    </span>
  );
}
