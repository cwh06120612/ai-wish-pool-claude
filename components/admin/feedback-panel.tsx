"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { getAllFeedbacks, setFeedbackVisibility, deleteFeedback, type Feedback } from "@/lib/feedback";
import type { Submission } from "@/types/submission";
import { StarRating } from "@/components/ui/star-rating";
import { Eye, EyeOff, Trash2, Quote, MessageSquareHeart } from "lucide-react";

// 自訂 hover 提示（取代瀏覽器預設 title 灰框）
function IconTip({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <span className="relative group inline-flex">
      {children}
      <span className="pointer-events-none absolute bottom-full left-1/2 mb-1.5 -translate-x-1/2 whitespace-nowrap rounded-md bg-[#2D2D2D] px-2 py-1 text-[10px] font-medium text-white opacity-0 group-hover:opacity-100 transition-opacity z-20 shadow-md">
        {label}
      </span>
    </span>
  );
}

export function FeedbackPanel({ submissions, canEdit }: { submissions: Submission[]; canEdit: boolean }) {
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setFeedbacks(await getAllFeedbacks(true));
    setLoading(false);
  }, []);

  useEffect(() => { reload(); }, [reload]);

  const titleById = useMemo(() => {
    const m: Record<string, string> = {};
    submissions.forEach((s) => { m[s.id] = s.problemTitle || s.publicSummary; });
    return m;
  }, [submissions]);

  async function toggle(fb: Feedback) {
    setBusyId(fb.id);
    try {
      await setFeedbackVisibility(fb.id, !fb.isVisible);
      setFeedbacks((prev) => prev.map((f) => (f.id === fb.id ? { ...f, isVisible: !f.isVisible } : f)));
    } catch { /* 已在 lib 記錄錯誤 */ } finally { setBusyId(null); }
  }

  async function remove(id: string) {
    setBusyId(id);
    try {
      await deleteFeedback(id);
      setFeedbacks((prev) => prev.filter((f) => f.id !== id));
    } catch { /* noop */ } finally { setBusyId(null); setConfirmId(null); }
  }

  if (loading) return <div className="py-16 text-center text-sm text-[#9E9E9E]">載入中…</div>;

  const visibleCount = feedbacks.filter((f) => f.isVisible).length;

  if (feedbacks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
        <div className="w-12 h-12 rounded-full bg-[#F5F5F5] flex items-center justify-center mb-4">
          <MessageSquareHeart size={20} className="text-[#9E9E9E]" />
        </div>
        <h3 className="text-sm font-medium text-[#424242]">還沒有任何回饋</h3>
        <p className="mt-1 text-sm text-[#9E9E9E] whitespace-nowrap">同仁在公告欄或成果看板留下回饋後，會顯示在這裡。</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-4 text-sm text-[#9E9E9E]">
        <MessageSquareHeart size={15} className="text-[#AE1914]" />
        共 <span className="font-bold text-[#2D2D2D]">{feedbacks.length}</span> 則回饋，公開中 <span className="font-bold text-[#007A87]">{visibleCount}</span> 則
      </div>

      <div className="space-y-3">
        {feedbacks.map((fb) => (
          <div key={fb.id} className={`border rounded-xl p-4 ${fb.isVisible ? "bg-white border-[#E0E0E0]/80" : "bg-[#F7F7F5] border-dashed border-[#D0D0D0]"}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1.5">
                  <StarRating value={fb.rating} readOnly size={14} />
                  {!fb.isVisible && <span className="text-[10px] font-bold text-[#9E9E9E] bg-[#EDEDED] px-2 py-0.5 rounded-full">已隱藏</span>}
                  <span className="text-[11px] text-[#9E9E9E]">{new Date(fb.createdAt).toLocaleDateString("zh-TW")}</span>
                </div>
                {fb.content && (
                  <p className="text-sm text-[#2D2D2D] leading-relaxed flex items-start gap-1.5">
                    <Quote size={13} className="text-[#BE8B55] flex-shrink-0 mt-1" />{fb.content}
                  </p>
                )}
                <p className="text-[11px] text-[#9E9E9E] mt-1.5">
                  — {fb.authorName}{fb.authorDept ? ` · ${fb.authorDept.split(" > ").slice(-1)[0]}` : ""}
                  {fb.submissionId && titleById[fb.submissionId] && (
                    <span className="ml-1">・回饋於「{titleById[fb.submissionId]}」</span>
                  )}
                  {!fb.submissionId && <span className="ml-1">・整體回饋</span>}
                </p>
              </div>

              {canEdit && (
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <IconTip label={fb.isVisible ? "隱藏（不在看板顯示）" : "顯示"}>
                    <button type="button" onClick={() => toggle(fb)} disabled={busyId === fb.id}
                      className="p-1.5 rounded-lg border border-[#E0E0E0] text-[#616161] hover:bg-[#F0F4F4] disabled:opacity-50 transition-colors">
                      {fb.isVisible ? <Eye size={14} className="text-[#007A87]" /> : <EyeOff size={14} className="text-[#BDBDBD]" />}
                    </button>
                  </IconTip>
                  {confirmId === fb.id ? (
                    <div className="flex items-center gap-1">
                      <button type="button" onClick={() => remove(fb.id)} disabled={busyId === fb.id}
                        className="text-xs px-2 py-1.5 rounded-lg bg-[#AE1914] text-white hover:bg-[#8C1915] disabled:opacity-50 transition-colors">確定刪除</button>
                      <button type="button" onClick={() => setConfirmId(null)}
                        className="text-xs px-2 py-1.5 rounded-lg border border-[#E0E0E0] text-[#616161] hover:bg-[#F0F4F4] transition-colors">取消</button>
                    </div>
                  ) : (
                    <IconTip label="刪除">
                      <button type="button" onClick={() => setConfirmId(fb.id)}
                        className="p-1.5 rounded-lg border border-[#E0E0E0] text-[#616161] hover:border-[#AE1914]/50 hover:text-[#AE1914] hover:bg-[#EBCDCC]/20 transition-colors">
                        <Trash2 size={14} />
                      </button>
                    </IconTip>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
