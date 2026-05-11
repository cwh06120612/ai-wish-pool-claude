import React from "react";
import { Inbox } from "lucide-react";

interface EmptyStateProps {
  title?: string;
  description?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
}

export function EmptyState({
  title = "目前沒有資料",
  description,
  icon,
  action,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="w-12 h-12 rounded-full bg-[#F5F5F5] flex items-center justify-center mb-4">
        {icon || <Inbox size={20} className="text-[#9E9E9E]" />}
      </div>
      <h3 className="text-sm font-medium text-[#424242]">{title}</h3>
      {description && (
        <p className="mt-1 text-sm text-[#9E9E9E] max-w-xs">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
