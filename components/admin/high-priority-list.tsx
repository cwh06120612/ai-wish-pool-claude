import React from "react";
import type { Submission } from "@/types/submission";
import { StatusBadge } from "@/components/ui/badge";
import { ThumbsUp, Zap } from "lucide-react";

interface HighPriorityListProps {
  items: Submission[];
}

export function HighPriorityList({ items }: HighPriorityListProps) {
  if (items.length === 0) {
    return (
      <p className="text-sm text-[#9E9E9E] text-center py-4">
        目前沒有符合條件的高優先需求
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {items.map((item) => (
        <div
          key={item.id}
          className="flex items-start gap-3 p-3 rounded-lg bg-[#FFFBF0] border border-[#FFF3CD]"
        >
          <Zap size={14} className="text-[#FFAE00] mt-0.5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-[#424242] truncate">
              {item.problemTitle}
            </p>
            <p className="text-xs text-[#757575] mt-0.5">
              {item.departmentFullPath || "未知部門"} ·{" "}
              {item.annoyanceLevel}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <StatusBadge status={item.status} />
            <span className="flex items-center gap-0.5 text-xs text-[#9E9E9E]">
              <ThumbsUp size={11} />
              {item.likeCount}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
