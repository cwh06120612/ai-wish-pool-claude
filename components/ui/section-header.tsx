import React from "react";

interface SectionHeaderProps {
  step?: number | string;
  title: string;
  description?: string;
  className?: string;
}

export function SectionHeader({
  step,
  title,
  description,
  className = "",
}: SectionHeaderProps) {
  return (
    <div className={`mb-4 ${className}`}>
      {step !== undefined && (
        <div className="inline-flex items-center gap-2 mb-1.5">
          <span className="w-5 h-5 rounded-full bg-[#007A87] text-white text-[10px] font-bold flex items-center justify-center">
            {step}
          </span>
        </div>
      )}
      <h3 className="text-sm font-semibold text-[#2D2D2D] text-left">{title}</h3>
      {description && (
        <p className="mt-1 text-xs text-[#9E9E9E] text-left">{description}</p>
      )}
    </div>
  );
}
