"use client";

import React from "react";

interface HorizontalBarChartProps {
  data: { label: string; count: number }[];
  maxItems?: number;
  color?: string;
  yAxisWidth?: number;
}

// Pure CSS bar chart — left-aligned labels, no text overflow, thin bars
export function HorizontalBarChart({
  data, maxItems = 8, color = "#007A87", yAxisWidth = 140,
}: HorizontalBarChartProps) {
  const items = data.slice(0, maxItems);
  if (items.length === 0) return <p className="text-sm text-[#9E9E9E] text-center py-6">無資料</p>;
  const maxCount = Math.max(...items.map(d => d.count), 1);

  return (
    <div className="space-y-3">
      {items.map((item, i) => (
        <div key={i}>
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs text-[#616161] truncate flex-1 mr-2" title={item.label} style={{ maxWidth: `${yAxisWidth}px` }}>
              {item.label}
            </span>
            <span className="text-xs font-bold text-[#2D2D2D] flex-shrink-0">{item.count}</span>
          </div>
          <div className="h-2.5 bg-[#F0F4F4] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${(item.count / maxCount) * 100}%`,
                backgroundColor: color,
                opacity: 1 - i * (0.45 / items.length),
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
