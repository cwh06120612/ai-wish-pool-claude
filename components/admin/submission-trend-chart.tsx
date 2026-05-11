"use client";

import React from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Area,
  AreaChart,
} from "recharts";
import type { Submission } from "@/types/submission";

interface SubmissionTrendChartProps {
  submissions: Submission[];
}

export function SubmissionTrendChart({ submissions }: SubmissionTrendChartProps) {
  if (submissions.length === 0) {
    return <p className="text-sm text-[#9E9E9E] text-center py-6">無資料</p>;
  }

  // Group by date (last 30 days)
  const now = new Date();
  const days: { date: string; count: number }[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const key = d.toLocaleDateString("zh-TW", { month: "numeric", day: "numeric" });
    const dateStr = d.toISOString().split("T")[0];
    const count = submissions.filter((s) => s.createdAt.startsWith(dateStr)).length;
    days.push({ date: key, count });
  }

  // Only show every 5th label to avoid crowding
  const CustomXAxisTick = ({ x, y, payload, index }: { x?: number; y?: number; payload?: { value: string }; index?: number }) => {
    if ((index ?? 0) % 5 !== 0) return null;
    return (
      <text x={x} y={(y ?? 0) + 12} textAnchor="middle" fontSize={10} fill="#BDBDBD">
        {payload?.value}
      </text>
    );
  };

  const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number }>; label?: string }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white border border-[#E0E0E0] rounded-lg px-3 py-2 shadow-md text-xs">
          <p className="text-[#757575]">{label}</p>
          <p className="font-semibold text-[#007A87]">{payload[0].value} 筆</p>
        </div>
      );
    }
    return null;
  };

  return (
    <ResponsiveContainer width="100%" height={120}>
      <AreaChart data={days} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#007A87" stopOpacity={0.15} />
            <stop offset="95%" stopColor="#007A87" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#F5F5F5" vertical={false} />
        <XAxis dataKey="date" tick={<CustomXAxisTick />} axisLine={false} tickLine={false} />
        <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: "#BDBDBD" }} axisLine={false} tickLine={false} width={24} />
        <Tooltip content={<CustomTooltip />} />
        <Area
          type="monotone"
          dataKey="count"
          stroke="#007A87"
          strokeWidth={2}
          fill="url(#trendGradient)"
          dot={false}
          activeDot={{ r: 4, fill: "#007A87" }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
