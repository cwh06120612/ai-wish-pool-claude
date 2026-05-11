"use client";

import React from "react";
import { Check } from "lucide-react";

interface OptionCardProps {
  label: string;
  selected: boolean;
  onClick: () => void;
  disabled?: boolean;
}

export function OptionCard({ label, selected, onClick, disabled }: OptionCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`
        relative w-full text-left px-3 py-2 rounded-lg border text-sm transition-colors
        min-h-[40px] flex items-center
        focus:outline-none focus:ring-2 focus:ring-[#007A87]/30
        ${disabled
          ? "opacity-30 cursor-not-allowed border-[#E0E0E0] bg-white text-[#2D2D2D]"
          : selected
            ? "border-[#007A87] bg-[#B5E1E5]/25 text-[#00555E] font-semibold"
            : "border-[#E0E0E0] bg-white text-[#2D2D2D] hover:bg-[#F0F4F4] hover:border-[#007A87]/40"
        }
      `}
    >
      <span className="flex items-center justify-between gap-2 w-full">
        <span className="leading-snug">{label}</span>
        {selected && !disabled && <Check size={13} className="text-[#007A87] flex-shrink-0" />}
      </span>
    </button>
  );
}
