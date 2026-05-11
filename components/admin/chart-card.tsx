import React from "react";

interface ChartCardProps {
  title: string;
  children: React.ReactNode;
  className?: string;
}

export function ChartCard({ title, children, className = "" }: ChartCardProps) {
  return (
    <div
      className={`bg-white border border-[#E0E0E0] rounded-xl p-5 ${className}`}
    >
      <h3 className="text-sm font-semibold text-[#424242] mb-4">{title}</h3>
      {children}
    </div>
  );
}
