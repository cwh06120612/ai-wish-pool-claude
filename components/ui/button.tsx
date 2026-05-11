"use client";

import React from "react";

type ButtonVariant = "primary" | "secondary" | "tertiary" | "alert" | "accent";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  children: React.ReactNode;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:   "bg-[#007A87] text-white hover:bg-[#00555E] shadow-sm hover:shadow-md border border-transparent",
  secondary: "bg-white text-[#007A87] border border-[#007A87]/60 hover:bg-[#B5E1E5]/20 hover:border-[#007A87]",
  tertiary:  "bg-transparent text-[#616161] border border-[#E0E0E0] hover:bg-[#F0F4F4]",
  alert:     "bg-[#AE1914] text-white hover:bg-[#8C1915] shadow-sm border border-transparent",
  accent:    "bg-[#28A745] text-white hover:bg-[#198754] shadow-sm border border-transparent",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "text-xs px-3 py-1.5 rounded-lg",
  md: "text-sm px-4 py-2 rounded-xl",
  lg: "text-sm px-6 py-3 rounded-xl font-semibold",
};

export function Button({ variant = "primary", size = "md", className = "", disabled, children, ...props }: ButtonProps) {
  return (
    <button
      className={`
        inline-flex items-center justify-center gap-2 font-medium transition-all
        focus:outline-none focus:ring-2 focus:ring-[#007A87]/40
        disabled:opacity-50 disabled:cursor-not-allowed
        ${variantClasses[variant]} ${sizeClasses[size]} ${className}
      `}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
}
