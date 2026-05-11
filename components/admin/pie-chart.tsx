"use client";

import React from "react";
import {
  PieChart as RechartsPie,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

interface PieChartProps {
  data: { label: string; count: number; color: string }[];
}

export function PieChart({ data }: PieChartProps) {
  const filtered = data.filter((d) => d.count > 0);
  const total = filtered.reduce((s, d) => s + d.count, 0);

  if (total === 0) {
    return <p className="text-sm text-[#9E9E9E] text-center py-6">無資料</p>;
  }

  const chartData = filtered.map((d) => ({ name: d.label, value: d.count, color: d.color }));

  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ name: string; value: number }> }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white border border-[#E0E0E0] rounded-lg px-3 py-2 shadow-md text-xs">
          <p className="font-medium text-[#424242]">{payload[0].name}</p>
          <p className="text-[#007A87]">
            {payload[0].value} 筆（{Math.round((payload[0].value / total) * 100)}%）
          </p>
        </div>
      );
    }
    return null;
  };

  const renderCustomLabel = (props: {
    cx?: number; cy?: number; midAngle?: number;
    innerRadius?: number; outerRadius?: number; percent?: number;
  }) => {
    const { cx = 0, cy = 0, midAngle = 0, innerRadius = 0, outerRadius = 0, percent = 0 } = props;
    if (percent < 0.08) return null;
    const RADIAN = Math.PI / 180;
    const r = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + r * Math.cos(-midAngle * RADIAN);
    const y = cy + r * Math.sin(-midAngle * RADIAN);
    return (
      <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight="600">
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  return (
    <div>
      <ResponsiveContainer width="100%" height={200}>
        <RechartsPie>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={55}
            outerRadius={90}
            paddingAngle={2}
            dataKey="value"
            labelLine={false}
            label={renderCustomLabel}
          >
            {chartData.map((entry, i) => (
              <Cell key={i} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
        </RechartsPie>
      </ResponsiveContainer>
      {/* Legend */}
      <div className="flex flex-col gap-1.5 mt-2">
        {chartData.map((d, i) => (
          <div key={i} className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: d.color }} />
              <span className="text-[#757575]">{d.name}</span>
            </div>
            <span className="font-semibold text-[#424242]">
              {d.value}
              <span className="text-[#9E9E9E] font-normal ml-1">
                ({Math.round((d.value / total) * 100)}%)
              </span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
