import React from "react";
import { LucideIcon } from "lucide-react";

interface DashboardSummaryCardProps {
  label: string;
  value: number | string;
  icon: LucideIcon;
  color?: "primary" | "secondary" | "accent" | "alert" | "orange";
}

const colorMap = {
  primary: "bg-[#B5E1E5] text-[#007A87]",
  secondary: "bg-[#E0C8AE] text-[#765530]",
  accent: "bg-[#91EFA6] text-[#198754]",
  alert: "bg-[#EBCDCC] text-[#AE1914]",
  orange: "bg-[#FFF3CD] text-[#92400e]",
};

export function DashboardSummaryCard({
  label,
  value,
  icon: Icon,
  color = "primary",
}: DashboardSummaryCardProps) {
  return (
    <div className="bg-white border border-[#E0E0E0] rounded-xl p-4 flex items-center gap-3">
      <div
        className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${colorMap[color]}`}
      >
        <Icon size={18} />
      </div>
      <div>
        <div className="text-2xl font-bold text-[#424242]">{value}</div>
        <div className="text-xs text-[#757575]">{label}</div>
      </div>
    </div>
  );
}
