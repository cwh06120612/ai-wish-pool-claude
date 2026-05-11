import React from "react";

interface FormFieldProps {
  label: string;
  required?: boolean;
  error?: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}

export function FormField({
  label,
  required,
  error,
  hint,
  children,
  className = "",
}: FormFieldProps) {
  return (
    <div className={`space-y-1.5 ${className}`}>
      <label className="block text-sm font-medium text-[#424242]">
        {label}
        {required && <span className="text-[#AE1914] ml-0.5">*</span>}
      </label>
      {hint && <p className="text-xs text-[#757575]">{hint}</p>}
      {children}
      {error && <p className="text-xs text-[#AE1914] mt-1">{error}</p>}
    </div>
  );
}

interface TextInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

export function TextInput({ error, className = "", ...props }: TextInputProps) {
  return (
    <input
      className={`
        w-full px-3 py-2 text-sm rounded-lg border
        focus:outline-none focus:ring-2 focus:ring-[#007A87]/40
        placeholder:text-[#BDBDBD] text-[#424242]
        ${error ? "border-[#AE1914]" : "border-[#E0E0E0] focus:border-[#007A87]"}
        ${className}
      `}
      {...props}
    />
  );
}
