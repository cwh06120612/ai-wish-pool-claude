"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { getSubmissionsAsync, updateSubmissionAsync } from "@/lib/storage";
import { exportToCsv } from "@/lib/csv";
import { isClosedStatus, type Submission, type Status, type Priority, type Category } from "@/types/submission";
import { StatusBadge, Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Dashboard } from "@/components/admin/dashboard";
import { FeedbackPanel } from "@/components/admin/feedback-panel";
import { TopicsPanel } from "@/components/admin/topics-panel";
import { AdminAuth, useAdminRole, ASSIGNEE_OPTIONS } from "@/components/admin/admin-auth";
import { DiscussionDrawer, type DiscussionChangePayload } from "@/components/admin/discussion-drawer";
import { getUnreadCount, getDiscussions } from "@/lib/discussions";
const ASSIGNEE_EDIT_OPTIONS = ["未指定", ...ASSIGNEE_OPTIONS];
import {
  LayoutDashboard, ListFilter, Download, SlidersHorizontal, Search,
  Eye, EyeOff, ChevronDown, ChevronRight,
  X, Save, Check, LogOut, ThumbsUp, MessageSquare, MessageSquareHeart, MessagesSquare,
} from "lucide-react";

const STATUS_OPTIONS: Status[] = [
  "已收到","整理中","評估中","尋找工具中","測試中","已導入","不予處理",
];
const PRIORITY_OPTIONS: Priority[] = ["高優先","中優先","低優先","待評估"];
const CATEGORY_OPTIONS: Category[] = [
  "找資料 / 知識查詢","會議紀錄","Excel / 報表","文件整理",
  "簡報 / 報告","自動化作業","AI 學習","AI 應用","豐譽 GPT","BPM","其他","未分類",
];

type Tab = "dashboard" | "list" | "feedback" | "topics";

function formatMutationError(error: unknown) {
  if (typeof error === "object" && error !== null) {
    const err = error as { message?: string; code?: string; details?: string; hint?: string };
    return {
      message: err.message,
      code: err.code,
      details: err.details,
      hint: err.hint,
    };
  }
  return {
    message: String(error),
    code: undefined,
    details: undefined,
    hint: undefined,
  };
}

function AdminContent() {
  const [tab, setTab] = useState<Tab>("list");
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const { role: adminRole, assignee: myName } = useAdminRole();
  const canEdit = adminRole === "editor";
  const isTeam = adminRole === "team";
  const [modalId, setModalId] = useState<string | null>(null);
  const [likersModalId, setLikersModalId] = useState<string | null>(null);
  const [editState, setEditState] = useState<Partial<Submission>>({});
  const [search, setSearch] = useState("");
  const [teamTab, setTeamTab] = useState<"mine" | "all">("mine");
  const [adminFilterStatus, setAdminFilterStatus] = useState("");
  const [adminFilterPriority, setAdminFilterPriority] = useState("");
  const [adminFilterVisible, setAdminFilterVisible] = useState("");
  const [adminFilterCategory, setAdminFilterCategory] = useState("");
  const [adminFilterAssignee, setAdminFilterAssignee] = useState<string[]>([]);
  const [adminFilterUnread, setAdminFilterUnread] = useState("");
  const [adminShowFilters, setAdminShowFilters] = useState(false);
  const [adminSort, setAdminSort] = useState<"newest"|"oldest"|"likes">("newest");
  const [drawerSub, setDrawerSub] = useState<Submission | null>(null);
  const [unreadMap, setUnreadMap] = useState<Record<string, number>>({});
  const [showInitialUnreadDialog, setShowInitialUnreadDialog] = useState(false);
  const [showUnreadToast, setShowUnreadToast] = useState(false);
  const [toastUnreadCount, setToastUnreadCount] = useState(0);
  const [latestUnreadDiscussion, setLatestUnreadDiscussion] = useState<{
    submissionId: string;
    submissionTitle: string;
    author: string;
    content: string;
  } | null>(null);
  const initialUnreadCheckedRef = useRef(false);
  const initialDialogShownRef = useRef(false);
  const previousUnreadTotalRef = useRef(0);
  const [personKey, setPersonKey] = useState("");
  const [publicSummaryDraft, setPublicSummaryDraft] = useState("");
  const [isComposingPublicSummary, setIsComposingPublicSummary] = useState(false);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [saveError, setSaveError] = useState("");

  useEffect(() => {
    try {
      if (adminRole === "editor") {
        const stored = sessionStorage.getItem("ai-wish-admin-person-key");
        const key = stored || `editor-${Math.random().toString(36).slice(2)}-${Date.now().toString(36)}`;
        sessionStorage.setItem("ai-wish-admin-person-key", key);
        setPersonKey(key);
      } else if (adminRole === "team" && myName) {
        setPersonKey(myName);
      }
    } catch {
      setPersonKey(adminRole === "team" ? myName : "管理者");
    }
  }, [adminRole, myName]);

  const reload = React.useCallback(async () => {
    const data = await getSubmissionsAsync();
    setSubmissions(data);
  }, []);

  useEffect(() => {
    reload();
    const timer = setInterval(reload, 30000);
    return () => clearInterval(timer);
  }, [reload]);

  const refreshUnread = useCallback(async () => {
    if (!personKey || submissions.length === 0) {
      setUnreadMap({});
      return;
    }

    const ids =
      adminRole === "team"
        ? submissions
            .filter((s) =>
              (Array.isArray(s.assignee) ? s.assignee : [s.assignee]).includes(myName)
            )
            .map((s) => s.id)
        : submissions.map((s) => s.id);

    if (ids.length === 0) {
      setUnreadMap({});
      return;
    }

    const map = await getUnreadCount(ids, personKey);
    setUnreadMap(map);

    const unreadTotal = Object.values(map).reduce((a, b) => a + b, 0);

    if (!initialUnreadCheckedRef.current) {
      initialUnreadCheckedRef.current = true;
      previousUnreadTotalRef.current = unreadTotal;
      if (unreadTotal > 0 && !initialDialogShownRef.current) {
        setShowInitialUnreadDialog(true);
        initialDialogShownRef.current = true;
      }
      return;
    }

    if (unreadTotal > previousUnreadTotalRef.current) {
      setToastUnreadCount(unreadTotal);
      const unreadSubIds = Object.entries(map).filter(([, v]) => v > 0).map(([k]) => k);
      try {
        const allDiscussions = await Promise.all(unreadSubIds.map(id => getDiscussions(id)));
        let latestDisc: { submissionId: string; submissionTitle: string; author: string; content: string; createdAt: string } | null = null;
        unreadSubIds.forEach((subId, i) => {
          const unread = allDiscussions[i].filter(d => !d.readBy.includes(personKey));
          if (unread.length === 0) return;
          const latest = unread.reduce((a, b) => a.createdAt > b.createdAt ? a : b);
          const sub = submissions.find(s => s.id === subId);
          const title = sub?.problemTitle || sub?.publicSummary || subId;
          const author = latest.authorName || latest.author || "未顯示名稱";
          if (!latestDisc || latest.createdAt > latestDisc.createdAt) {
            latestDisc = { submissionId: subId, submissionTitle: title, author, content: latest.content, createdAt: latest.createdAt };
          }
        });
        if (latestDisc) {
          setLatestUnreadDiscussion(latestDisc);
          setShowUnreadToast(true);
        }
      } catch (e) {
        console.error("[refreshUnread] fetch discussions failed", e);
      }
    }
    previousUnreadTotalRef.current = unreadTotal;
  }, [personKey, submissions, adminRole, myName]);

  useEffect(() => {
    refreshUnread();
  }, [refreshUnread]);

  useEffect(() => {
    if (!showUnreadToast) return;
    const timer = setTimeout(() => setShowUnreadToast(false), 5000);
    return () => clearTimeout(timer);
  }, [showUnreadToast]);

  const handleDiscussionChange = useCallback((payload?: DiscussionChangePayload) => {
    if (
      payload?.source === "polling" &&
      payload.latestMessage &&
      !payload.latestMessage.readBy.includes(personKey)
    ) {
      const sub = submissions.find(s => s.id === payload.submissionId);
      const title = sub?.problemTitle || sub?.publicSummary || payload.submissionId;
      const author = payload.latestMessage.authorName || payload.latestMessage.author || "未顯示名稱";
      setLatestUnreadDiscussion({
        submissionId: payload.submissionId,
        submissionTitle: title,
        author,
        content: payload.latestMessage.content,
      });
      setShowUnreadToast(true);
    }
    refreshUnread().catch(console.error);
  }, [personKey, submissions, refreshUnread]);

  function handleViewUnreadDiscussions() {
    setShowInitialUnreadDialog(false);
    setShowUnreadToast(false);
    setAdminShowFilters(true);
    setAdminFilterUnread("有新回覆");
    setTab("list");
    if (adminRole === "team") setTeamTab("mine");
  }

  function handleEdit(id: string) {
    const s = submissions.find((s) => s.id === id);
    if (!s) return;
    setModalId(id);
    setSaveError("");
    setIsComposingPublicSummary(false);
    const pubSummary = s.publicSummary || "";
    setPublicSummaryDraft(pubSummary);
    setEditState({
      category: s.category,
      status: s.status,
      priority: s.priority,
      publicSummary: pubSummary,
      isVisible: s.isVisible,
      isExample: s.isExample ?? false,
      shareMode: s.shareMode,
      assignee: s.assignee ?? ["未指定"],
    });
  }

  async function handleSave(id: string) {
    if (isComposingPublicSummary) {
      setSaveError("請先完成中文選字再儲存");
      return;
    }

    const current = submissions.find((s) => s.id === id);
    if (!current) {
      const error = new Error("Missing submission before save");
      console.error("[AdminContent.handleSave] update target missing", {
        table: "submissions",
        targetId: id,
        updatePayload: {},
        error: formatMutationError(error),
      });
      setSaveError("儲存失敗，請稍後再試");
      return;
    }

    const updates: Partial<Submission> = {
      status: (editState.status as Status | undefined) ?? current.status,
      priority: (editState.priority as Priority | undefined) ?? current.priority,
      category: (editState.category as Category[] | undefined) ?? current.category,
      publicSummary: publicSummaryDraft,
    };

    if (canEdit) {
      updates.isVisible = editState.isVisible ?? current.isVisible;
      updates.isExample = editState.isExample ?? current.isExample ?? false;
      updates.shareMode = editState.shareMode ?? current.shareMode;
      updates.assignee = (editState.assignee as string[] | undefined) ?? current.assignee;
    }

    setIsSavingEdit(true);
    setSaveError("");
    try {
      await updateSubmissionAsync(id, updates);
      setSubmissions(prev => prev.map(item => item.id === id ? { ...item, ...updates } : item));
      await reload();
      setModalId(null);
      setEditState({});
      setPublicSummaryDraft("");
    } catch (error) {
      console.error("[AdminContent.handleSave] update failed", {
        table: "submissions",
        targetId: id,
        updatePayload: updates,
        error: formatMutationError(error),
      });
      setSaveError("儲存失敗，請稍後再試");
    } finally {
      setIsSavingEdit(false);
    }
  }

  // List tab
  const adminHasFilters = !!adminFilterStatus || !!adminFilterPriority || !!adminFilterVisible || !!adminFilterCategory || adminFilterAssignee.length > 0 || !!adminFilterUnread;
  const isMyItem = (s: Submission) => !isTeam || (Array.isArray(s.assignee) ? s.assignee : [s.assignee]).includes(myName);
  const filtered = submissions
    .filter((s: Submission) => {
      // Team tab filter
      if (isTeam && teamTab === "mine" && !(Array.isArray(s.assignee) ? s.assignee : [s.assignee]).includes(myName)) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const match = s.problemTitle.toLowerCase().includes(q) ||
          s.name.toLowerCase().includes(q) ||
          s.departmentFullPath.toLowerCase().includes(q);
        if (!match) return false;
      }
      // 狀態篩選另外提供「已結案（已導入＋不予處理）／未結案」兩個群組選項
      if (adminFilterStatus === "__closed__") { if (!isClosedStatus(s.status)) return false; }
      else if (adminFilterStatus === "__open__") { if (isClosedStatus(s.status)) return false; }
      else if (adminFilterStatus && s.status !== adminFilterStatus) return false;
      if (adminFilterPriority && s.priority !== adminFilterPriority) return false;
      if (adminFilterVisible === "shown" && !s.isVisible) return false;
      if (adminFilterVisible === "hidden" && s.isVisible) return false;
      if (adminFilterCategory && !(Array.isArray(s.category) ? s.category : [s.category]).includes(adminFilterCategory as Category)) return false;
      if (adminFilterAssignee.length > 0) { const sa = Array.isArray(s.assignee) ? s.assignee : [s.assignee]; if (!adminFilterAssignee.some(f => sa.includes(f))) return false; }
      if (adminFilterUnread === "有新回覆" && !unreadMap[s.id]) return false;
      if (adminFilterUnread === "無新回覆" && unreadMap[s.id]) return false;
      return true;
    })
    .sort((a, b) =>
      adminSort === "likes" ? b.likeCount - a.likeCount :
      adminSort === "oldest" ? new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime() :
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

  return (
    <div className="max-w-[1120px] mx-auto px-6 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-[#2D2D2D]">管理員專區</h1>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${canEdit ? "bg-[#B5E1E5]/40 text-[#00555E]" : "bg-[#F0F4F4] text-[#9E9E9E]"}`}>
                {canEdit ? "管理者" : `負責人：${myName}`}
              </span>
            </div>
            <p className="text-sm text-[#9E9E9E] mt-0.5">AI 許願池 · 數位創新處</p>
          </div>
          <button
            type="button"
            onClick={() => {
              try { sessionStorage.removeItem("ai-wish-admin-auth"); } catch {}
              window.location.reload();
            }}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-[#E0E0E0] text-xs text-[#9E9E9E] hover:border-[#AE1914]/50 hover:text-[#AE1914] hover:bg-[#EBCDCC]/20 transition-colors"
          >
            <LogOut size={13} />
            登出
          </button>
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => exportToCsv(submissions)}
          className="flex items-center gap-1.5"
        >
          <Download size={14} />
          匯出 CSV
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-white border border-[#E0E0E0] rounded-xl p-1 w-fit mb-6">
        {(
          [
            { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
            { id: "list", label: "所有困擾", icon: ListFilter },
            { id: "feedback", label: "評論", icon: MessageSquareHeart },
            { id: "topics", label: "主題", icon: MessagesSquare },
          ] as const
        )
          .filter((t) => canEdit || (t.id !== "feedback" && t.id !== "topics"))
          .map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === id
                ? "bg-[#007A87] text-white"
                : "text-[#757575] hover:text-[#424242] hover:bg-[#F5F5F5]"
            }`}
          >
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>

      {tab === "dashboard" && <Dashboard submissions={submissions} />}

      {tab === "feedback" && <FeedbackPanel submissions={submissions} canEdit={canEdit} />}

      {tab === "topics" && <TopicsPanel canEdit={canEdit} />}

      {tab === "list" && (
        <div>
          {/* Team tab */}
          {isTeam && (
            <div className="flex gap-2 mb-4">
              <button type="button" onClick={() => setTeamTab("mine")}
                className={`px-4 py-2 rounded-xl text-sm font-medium border transition-all ${
                  teamTab === "mine"
                    ? "bg-[#007A87] text-white border-[#007A87]"
                    : "bg-white text-[#616161] border-[#E0E0E0] hover:border-[#007A87]/50"
                }`}>
                我負責的困擾
              </button>
              <button type="button" onClick={() => setTeamTab("all")}
                className={`px-4 py-2 rounded-xl text-sm font-medium border transition-all ${
                  teamTab === "all"
                    ? "bg-[#007A87] text-white border-[#007A87]"
                    : "bg-white text-[#616161] border-[#E0E0E0] hover:border-[#007A87]/50"
                }`}>
                所有困擾
              </button>
            </div>
          )}

          {/* Search + Filter */}
          <div className="mb-4 space-y-2">
            <div className="flex gap-2">
              <div className="flex-1 flex items-center gap-2 px-3 py-2.5 bg-white border border-[#E0E0E0]/80 rounded-xl shadow-sm">
                <Search size={14} className="text-[#BDBDBD] flex-shrink-0" />
                <input type="text" placeholder="搜尋問題標題、姓名、部門..."
                  value={search} onChange={(e) => setSearch(e.target.value)}
                  className="flex-1 text-sm text-[#2D2D2D] placeholder:text-[#BDBDBD] outline-none bg-transparent" />
                {search && <button onClick={() => setSearch("")}><X size={12} className="text-[#BDBDBD]" /></button>}
              </div>
              {/* Sort — always visible */}
              <AdminInlineDropdown
                label="排序"
                value={adminSort}
                options={[
                  { value: "newest", label: "由新至舊" },
                  { value: "oldest", label: "由舊至新" },
                  { value: "likes", label: "最多認同" },
                ]}
                onChange={v => setAdminSort(v as "newest"|"oldest"|"likes")}
              />
              <button onClick={() => setAdminShowFilters(v => !v)}
                className={`flex items-center gap-1.5 px-3 py-2.5 rounded-xl border text-sm transition-all flex-shrink-0 ${
                  adminHasFilters || adminShowFilters
                    ? "border-[#007A87] bg-[#B5E1E5]/20 text-[#007A87] font-semibold"
                    : "border-[#E0E0E0] bg-white text-[#616161] hover:bg-[#F0F4F4]"
                }`}>
                <SlidersHorizontal size={14} />篩選{adminHasFilters && <span className="w-1.5 h-1.5 rounded-full bg-[#007A87]" />}
              </button>
            </div>
            {adminShowFilters && (
              <div className="flex gap-2 flex-wrap">
                <AdminInlineDropdown
                  label="狀態"
                  value={adminFilterStatus}
                  options={[
                    { value: "", label: "全部狀態" },
                    { value: "__open__", label: "未結案" },
                    { value: "__closed__", label: "已結案（已導入＋不予處理）" },
                    ...STATUS_OPTIONS.map(o => ({ value: o, label: o })),
                  ]}
                  onChange={setAdminFilterStatus}
                />
                <AdminInlineDropdown
                  label="優先級"
                  value={adminFilterPriority}
                  options={[{ value: "", label: "全部優先級" }, ...PRIORITY_OPTIONS.map(o => ({ value: o, label: o }))]}
                  onChange={setAdminFilterPriority}
                />
                <AdminInlineDropdown
                  label="顯示狀態"
                  value={adminFilterVisible}
                  options={[
                    { value: "", label: "全部" },
                    { value: "shown", label: "顯示中" },
                    { value: "hidden", label: "已隱藏" },
                  ]}
                  onChange={setAdminFilterVisible}
                />
                <AdminInlineDropdown
                  label="分類"
                  value={adminFilterCategory}
                  options={[{ value: "", label: "全部分類" }, ...CATEGORY_OPTIONS.map(o => ({ value: o, label: o }))]}
                  onChange={setAdminFilterCategory}
                />
                <AdminInlineDropdown
                  label="新討論"
                  value={adminFilterUnread}
                  options={[
                    { value: "", label: "全部" },
                    { value: "有新回覆", label: "有新討論" },
                    { value: "無新回覆", label: "無新討論" },
                  ]}
                  onChange={setAdminFilterUnread}
                />
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-xs text-[#757575] mr-1">負責人員</span>
                  {ASSIGNEE_EDIT_OPTIONS.map(name => {
                    const sel = adminFilterAssignee.includes(name);
                    return (
                      <button key={name} type="button"
                        onClick={() => setAdminFilterAssignee(prev => sel ? prev.filter(a => a !== name) : [...prev, name])}
                        className={`text-xs px-2 py-1 rounded-full border transition-colors ${
                          sel ? "bg-[#007A87] text-white border-[#007A87]" : "bg-white text-[#616161] border-[#E0E0E0] hover:border-[#007A87]/50"
                        }`}>
                        {name}
                      </button>
                    );
                  })}
                </div>
                {adminHasFilters && (
                  <button onClick={() => { setAdminFilterStatus(""); setAdminFilterPriority(""); setAdminFilterVisible(""); setAdminFilterCategory(""); setAdminFilterAssignee([]); setAdminFilterUnread(""); }}
                    className="flex items-center gap-1 text-xs text-[#AE1914] px-2 py-1.5 rounded-lg hover:bg-[#EBCDCC]/20 transition-colors self-start mt-0.5">
                    <X size={11} />清除篩選
                  </button>
                )}
              </div>
            )}
          </div>

          {filtered.length === 0 ? (
            <EmptyState title="沒有符合條件的資料" />
          ) : (
            <div className="space-y-3">
              {filtered.map((s) => {
                return (
                  <div
                    key={s.id}
                    className="bg-white border border-[#E0E0E0] rounded-xl overflow-hidden flex"
                  >
                    {/* Priority color bar */}
                    <div className={`w-1 flex-shrink-0 ${
                      s.priority === "高優先" ? "bg-[#AE1914]" :
                      s.priority === "中優先" ? "bg-[#FFAE00]" :
                      s.priority === "低優先" ? "bg-[#007A87]" :
                      "bg-[#E0E0E0]"
                    }`} />
                    <div className="flex-1 min-w-0">
                    {/* Row header */}
                    <div
                      className="flex items-start gap-3 p-4 cursor-pointer hover:bg-[#F5F5F5]/60"
                      onClick={() => handleEdit(s.id)}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <span className="text-sm font-medium text-[#424242]">
                            {s.problemTitle}
                          </span>
                          <StatusBadge status={s.status} />
                          {(Array.isArray(s.assignee) ? s.assignee : [s.assignee]).filter(a => a && a !== "未指定").map((a, i) => (
                            <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-[#B5E1E5]/30 text-[#00555E] font-medium">{a}</span>
                          ))}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-[#9E9E9E]">
                          <span>{new Date(s.createdAt).toLocaleDateString("zh-TW")}</span>
                          <span className="flex items-center gap-1"><ThumbsUp size={11} />{s.likeCount}</span>
                          {s.isVisible
                            ? <Eye size={13} className="text-[#007A87]" />
                            : <EyeOff size={13} className="text-[#BDBDBD]" />
                          }

                        </div>
                      </div>
                      <ChevronRight size={16} className="text-[#BDBDBD] flex-shrink-0 mt-0.5" />
                    </div>

                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Edit Modal */}
      {modalId && (() => {
        const s = submissions.find(sub => sub.id === modalId);
        if (!s) return null;
        return (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-0 sm:px-4"
            onClick={e => { if (e.target === e.currentTarget) setModalId(null); }}>
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setModalId(null)} />
            <div className="relative bg-white w-full sm:max-w-2xl sm:rounded-2xl rounded-t-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
              {/* Header */}
              <div className="flex items-start justify-between gap-3 px-5 pt-5 pb-3 flex-shrink-0">
                <div className="flex-1 min-w-0">
                  <h2 className="text-base font-bold text-[#2D2D2D] leading-snug">{s.problemTitle}</h2>
                  <p className="text-xs text-[#9E9E9E] mt-1.5">{s.departmentFullPath}</p>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-[#9E9E9E]">
                    <span>{s.name}</span>
                    <span>{new Date(s.createdAt).toLocaleDateString("zh-TW")}</span>
                    <span>{s.shareMode === "願意分享（公開內容、部門、姓名）" ? "公開" : s.shareMode === "匿名分享（公開內容，但不顯示部門姓名）" ? "匿名" : "不公開"}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <button type="button"
                    onClick={() => { setDrawerSub(s); }}
                    className="flex items-center gap-1.5 px-3 py-2 bg-[#007A87] text-white text-xs font-medium rounded-lg hover:bg-[#00555E] transition-colors">
                    <MessageSquare size={13} />
                    <span>討論</span>
                    {unreadMap[s.id] > 0 && <span className="px-1.5 py-0.5 bg-white text-[#AE1914] text-[9px] rounded-full font-bold">{unreadMap[s.id]}</span>}
                  </button>
                  <button onClick={() => setModalId(null)} className="p-1.5 rounded-lg hover:bg-[#F0F4F4]">
                    <X size={16} className="text-[#9E9E9E]" />
                  </button>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 px-5 pb-3 flex-shrink-0">
                <StatusBadge status={s.status} />
                <span className="inline-flex items-center text-xs px-2.5 py-1 rounded-full bg-[#F0F4F4] text-[#616161]">{s.annoyanceLevel}</span>
                <span className="inline-flex items-center text-xs px-2.5 py-1 rounded-full bg-[#F0F4F4] text-[#616161]">{s.frequency}</span>
                <button type="button" onClick={() => setLikersModalId(s.id)}
                  className="flex items-center gap-1.5 text-xs px-2 py-1 rounded-lg text-[#9E9E9E] hover:bg-[#F0F4F4] transition-colors">
                  <ThumbsUp size={11} />{s.likeCount}
                </button>
              </div>


              <div className="border-t border-[#F0F4F4]" />

              {/* Scrollable body */}
              <div className="overflow-y-auto px-5 py-4 space-y-4 flex-1">
                {/* Read-only info */}
                {s.painPoints.length > 0 && (
                  <div>
                    <p className="text-xs font-bold text-[#9E9E9E] uppercase tracking-wider mb-2">痛點</p>
                    <div className="flex flex-wrap gap-1.5">{s.painPoints.map(p => <Badge key={p} variant="grey">{p}</Badge>)}</div>
                  </div>
                )}
                {s.currentMethods.length > 0 && (
                  <div>
                    <p className="text-xs font-bold text-[#9E9E9E] uppercase tracking-wider mb-2">目前處理方式</p>
                    <div className="flex flex-wrap gap-1.5">{s.currentMethods.map(m => <Badge key={m} variant="grey">{m}</Badge>)}</div>
                  </div>
                )}
                {s.dataSources.length > 0 && (
                  <div>
                    <p className="text-xs font-bold text-[#9E9E9E] uppercase tracking-wider mb-2">資料來源</p>
                    <div className="flex flex-wrap gap-1.5">{s.dataSources.map(d => <Badge key={d} variant="grey">{d}</Badge>)}</div>
                  </div>
                )}
                {s.aiNeeds.length > 0 && (
                  <div>
                    <p className="text-xs font-bold text-[#9E9E9E] uppercase tracking-wider mb-2">AI 需求</p>
                    <div className="flex flex-wrap gap-1.5">{s.aiNeeds.map(a => <Badge key={a} variant="primary">{a}</Badge>)}</div>
                  </div>
                )}
                {s.freeText && (
                  <div>
                    <p className="text-xs font-bold text-[#9E9E9E] uppercase tracking-wider mb-2">補充說明</p>
                    <p className="text-sm text-[#2D2D2D] bg-[#F7F7F5] rounded-lg px-4 py-3">{s.freeText}</p>
                  </div>
                )}

                {/* Editable fields */}
                <div className="border-t border-[#F0F4F4] pt-4">
                  <p className="text-xs font-bold text-[#9E9E9E] uppercase tracking-wider mb-3">管理者欄位</p>
                  <div className={`grid grid-cols-1 sm:grid-cols-2 gap-4 ${(!canEdit && !(isTeam && isMyItem(s))) ? "opacity-60 pointer-events-none" : ""}`}>
                    <div>
                      <EditSelect label="狀態" value={editState.status || ""} options={STATUS_OPTIONS}
                        onChange={v => setEditState(e => ({ ...e, status: v as Status }))} />
                    </div>
                    <div>
                      <EditSelect label="優先級" value={editState.priority || ""} options={PRIORITY_OPTIONS}
                        onChange={v => setEditState(e => ({ ...e, priority: v as Priority }))} />
                    </div>
                    <div className={`sm:col-span-2 ${isTeam ? "opacity-60 pointer-events-none" : ""}`}>
                      <label className="block text-xs font-medium text-[#757575] mb-2">負責人員（可複選）</label>
                      <div className="flex flex-wrap gap-2">
                        {ASSIGNEE_OPTIONS.map(name => {
                          const arr: string[] = Array.isArray(editState.assignee) ? editState.assignee as string[] : [editState.assignee as unknown as string];
                          const selected = arr.includes(name);
                          return (
                            <button key={name} type="button"
                              onClick={() => {
                                const current = arr.filter((a: string) => a && a !== "未指定");
                                const next = selected
                                  ? current.filter((a: string) => a !== name)
                                  : [...current, name];
                                setEditState((e: any) => ({ ...e, assignee: next.length > 0 ? next : ["未指定"] }));
                              }}
                              className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                                selected
                                  ? "bg-[#007A87] text-white border-[#007A87]"
                                  : "bg-white text-[#616161] border-[#E0E0E0] hover:border-[#007A87]/50"
                              }`}>
                              {name}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-medium text-[#757575] mb-2">分類（可複選）</label>
                      <div className="flex flex-wrap gap-2">
                        {CATEGORY_OPTIONS.filter(c => c !== "未分類").map(cat => {
                          const selected = (Array.isArray(editState.category) ? editState.category : [editState.category] as unknown as Category[]).includes(cat as Category);
                          return (
                            <button key={cat} type="button"
                              onClick={() => {
                                const current = Array.isArray(editState.category) ? editState.category : [editState.category as unknown as Category];
                                const next: Category[] = selected
                                  ? current.filter(c => c !== cat)
                                  : [...current.filter(c => c !== "未分類" as Category), cat as Category];
                                setEditState(e => ({ ...e, category: (next.length > 0 ? next : ["未分類"]) as Category[] }));
                              }}
                              className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                                selected
                                  ? "bg-[#007A87] text-white border-[#007A87]"
                                  : "bg-white text-[#616161] border-[#E0E0E0] hover:border-[#007A87]/50"
                              }`}>
                              {cat}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    <div className={isTeam ? "opacity-60 pointer-events-none" : ""}>
                      <label className="block text-xs font-medium text-[#757575] mb-1">是否顯示</label>
                      <div className="flex items-center gap-2">
                        <button type="button" onClick={() => {
                          const newVisible = !editState.isVisible;
                          const updates: Partial<typeof editState> = { isVisible: newVisible };
                          // 從不公開改成顯示時，自動改成匿名分享
                          if (newVisible && editState.shareMode === "不公開（只給數位創新處後台查看）") {
                            updates.shareMode = "匿名分享（公開內容，但不顯示部門姓名）";
                          }
                          setEditState(e => ({ ...e, ...updates }));
                        }}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[#007A87]/40 ${editState.isVisible ? "bg-[#007A87]" : "bg-[#E0E0E0]"}`}>
                          <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${editState.isVisible ? "translate-x-6" : "translate-x-1"}`} />
                        </button>
                        <span className="text-xs text-[#616161]">{editState.isVisible ? "顯示中" : "已隱藏"}</span>
                      </div>
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-medium text-[#757575] mb-1">公開回覆</label>
                      <textarea rows={2} value={publicSummaryDraft}
                        onChange={e => {
                          setPublicSummaryDraft(e.target.value);
                          if (saveError) setSaveError("");
                        }}
                        onCompositionStart={() => setIsComposingPublicSummary(true)}
                        onCompositionEnd={(e) => {
                          setIsComposingPublicSummary(false);
                          const finalValue = e.currentTarget.value;
                          setPublicSummaryDraft(finalValue);
                        }}
                        placeholder="填寫後公告欄會顯示此回覆"
                        className="w-full text-sm border border-[#E0E0E0] rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#007A87]/40 resize-none" />
                    </div>

                  </div>
                </div>
              </div>
              {/* Footer */}
              <div className="border-t border-[#F0F4F4] px-5 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 flex-shrink-0">
                <div className="min-h-4">
                  {saveError && <p className="text-xs text-[#AE1914]">{saveError}</p>}
                </div>
                <div className="flex justify-end gap-2">
                <Button variant="tertiary" size="sm" onClick={() => setModalId(null)}>取消</Button>
                <Button variant="primary" size="sm" onClick={() => handleSave(s.id)} disabled={isSavingEdit || isComposingPublicSummary || (!canEdit && !(isTeam && isMyItem(s)))}>
                  <Save size={13} />儲存
                </Button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
      {/* Likers Modal */}
      {likersModalId && (() => {
        const s = submissions.find(sub => sub.id === likersModalId);
        if (!s) return null;
        const likers = s.likers ?? [];
        const named = likers.filter(l => l.name);
        const anonymous = s.likeCount - likers.length;
        return (
          <div className="fixed inset-0 z-[60] flex items-center justify-center px-4"
            onClick={e => { if (e.target === e.currentTarget) setLikersModalId(null); }}>
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setLikersModalId(null)} />
            <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-bold text-[#2D2D2D]">認同者</h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <p className="text-xs text-[#9E9E9E] line-clamp-1 flex-1">{s.problemTitle}</p>
                    <span className="flex items-center gap-1 text-xs flex-shrink-0">
                      <ThumbsUp size={11} className="text-[#007A87]" />
                      <span className="font-bold text-[#007A87]">{s.likeCount}</span>
                      <span className="text-[#9E9E9E]">人</span>
                    </span>
                  </div>
                </div>
                <button onClick={() => setLikersModalId(null)} className="p-1.5 rounded-lg hover:bg-[#F0F4F4] ml-2 flex-shrink-0">
                  <X size={15} className="text-[#9E9E9E]" />
                </button>
              </div>
              {named.length > 0 && (
                <div className="mb-3">
                  <div className="flex flex-wrap gap-1.5">
                    {named.map((l, i) => (
                      <span key={i} className="text-xs px-2.5 py-1 rounded-full bg-[#B5E1E5]/30 text-[#00555E] font-medium">
                        {l.name}{l.dept ? ` · ${l.dept.split(" > ").slice(-1)[0]}` : ""}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {anonymous > 0 && (
                <p className="text-xs text-[#9E9E9E]">另有 <span className="font-semibold text-[#2D2D2D]">{anonymous}</span> 人未留下資料</p>
              )}
              {s.likeCount === 0 && (
                <p className="text-xs text-[#9E9E9E] text-center py-2">尚未有人認同</p>
              )}
            </div>
          </div>
        );
      })()}

      {/* Initial unread dialog — shown once on login/entry */}
      {showInitialUnreadDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/30" onClick={() => setShowInitialUnreadDialog(false)} />
          <div className="relative bg-white rounded-2xl shadow-xl p-6 w-80 text-center">
            <div className="w-12 h-12 rounded-full bg-[#B5E1E5]/40 flex items-center justify-center mx-auto mb-4">
              <MessageSquare size={22} className="text-[#007A87]" />
            </div>
            <h3 className="text-base font-bold text-[#1F2937] mb-1">有新的討論</h3>
            <p className="text-sm text-[#6B7280] mb-4">
              {adminRole === "editor"
                ? `目前有 ${Object.values(unreadMap).filter(c => c > 0).length} 筆困擾有新討論。`
                : `你負責的困擾中，有 ${Object.values(unreadMap).filter(c => c > 0).length} 筆有新討論。`}
            </p>
            <button onClick={handleViewUnreadDiscussions}
              className="w-full py-2.5 bg-[#007A87] text-white text-sm font-medium rounded-xl hover:bg-[#00555E] transition-colors">
              查看新討論
            </button>
            <button onClick={() => setShowInitialUnreadDialog(false)}
              className="mt-2 w-full py-2 text-sm text-[#9E9E9E] hover:text-[#616161] transition-colors">
              稍後再看
            </button>
          </div>
        </div>
      )}

      {/* Real-time toast — shown when unread count increases while on page */}
      {showUnreadToast && (
        <div className="fixed bottom-4 right-4 z-[60] w-80 bg-white rounded-2xl shadow-lg border border-[#E5E7EB] p-4">
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="flex items-center gap-1.5">
              <div className="w-7 h-7 rounded-full bg-[#B5E1E5]/40 flex items-center justify-center flex-shrink-0">
                <MessageSquare size={13} className="text-[#007A87]" />
              </div>
              <p className="text-sm font-semibold text-[#1F2937]">有新的討論</p>
            </div>
            <button onClick={() => setShowUnreadToast(false)} className="text-[#9CA3AF] hover:text-[#424242] flex-shrink-0">
              <X size={14} />
            </button>
          </div>
          {latestUnreadDiscussion ? (
            <div className="space-y-1.5 text-xs mb-3">
              <p className="font-medium text-[#1F2937] leading-snug line-clamp-2">{latestUnreadDiscussion.submissionTitle}</p>
              <p className="text-[#6B7280]"><span className="text-[#9CA3AF]">傳送者：</span>{latestUnreadDiscussion.author}</p>
              <p className="bg-[#F9FAFB] rounded-lg px-2.5 py-1.5 text-[#424242] leading-relaxed">
                「{latestUnreadDiscussion.content.slice(0, 40)}{latestUnreadDiscussion.content.length > 40 ? "…" : ""}」
              </p>
              {Object.values(unreadMap).filter(c => c > 0).length > 1 && (
                <p className="text-[#9CA3AF]">另有 {Object.values(unreadMap).filter(c => c > 0).length - 1} 筆困擾有新討論</p>
              )}
            </div>
          ) : (
            <p className="text-xs text-[#6B7280] mb-3">
              目前有 {Object.values(unreadMap).filter(c => c > 0).length} 筆困擾有新討論。
            </p>
          )}
          <button
            onClick={() => {
              setShowUnreadToast(false);
              const sub = latestUnreadDiscussion ? submissions.find(s => s.id === latestUnreadDiscussion.submissionId) : null;
              if (sub) {
                setTab("list");
                setDrawerSub(sub);
              } else {
                handleViewUnreadDiscussions();
              }
            }}
            className="w-full py-2 bg-[#007A87] text-white text-xs font-medium rounded-xl hover:bg-[#00555E] transition-colors">
            查看
          </button>
        </div>
      )}

      {/* Discussion drawer */}
      {drawerSub && (
        <DiscussionDrawer
          submission={drawerSub}
          role={adminRole}
          author={adminRole === "editor" ? "管理者" : myName}
          personKey={personKey || (adminRole === "editor" ? "管理者" : myName)}
          onClose={() => setDrawerSub(null)}
          onAdminNoteChange={async (newNote) => {
            setDrawerSub(prev => prev ? { ...prev, adminNote: newNote } : prev);
            await reload();
          }}
          onDiscussionChange={handleDiscussionChange}
        />
      )}
    </div>
  );
}

export default function AdminPage() {
  return <AdminAuth><AdminContent /></AdminAuth>;
}

function DetailRow({
  label,
  value,
  children,
}: {
  label: string;
  value?: string;
  children?: React.ReactNode;
}) {
  return (
    <div>
      <p className="text-xs font-medium text-[#9E9E9E] mb-0.5">{label}</p>
      {children || (
        <p className="text-sm text-[#424242]">{value || "—"}</p>
      )}
    </div>
  );
}

function EditSelect({
  label, value, options, onChange,
}: {
  label: string; value: string; options: string[]; onChange: (v: string) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    function h(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); }
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  return (
    <div ref={ref}>
      <label className="block text-xs font-medium text-[#757575] mb-1">{label}</label>
      <div className="relative">
        <button type="button" onClick={() => setOpen(v => !v)}
          className={`w-full flex items-center justify-between px-3 py-2 rounded-xl border text-sm bg-white transition-colors ${open ? "border-[#007A87]" : "border-[#E0E0E0] hover:border-[#007A87]/60"}`}>
          <span className="text-[#2D2D2D] truncate">{value || "請選擇"}</span>
          <ChevronDown size={13} className={`text-[#9E9E9E] flex-shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
        </button>
        {open && (
          <div className="absolute left-0 right-0 top-full mt-1 z-30 bg-white border border-[#E0E0E0] rounded-xl shadow-lg overflow-hidden">
            <div className="max-h-52 overflow-y-auto p-1.5 space-y-0.5">
              {options.map(o => (
                <button key={o} type="button" onClick={() => { onChange(o); setOpen(false); }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${
                    value === o ? "bg-[#B5E1E5]/25 text-[#00555E] font-semibold" : "text-[#2D2D2D] hover:bg-[#F0F4F4]"
                  }`}>
                  <span>{o}</span>
                  {value === o && <Check size={12} className="text-[#007A87] flex-shrink-0" />}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function AdminInlineDropdown({ label, value, options, onChange }: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);
  const activeLabel = options.find(o => o.value === value)?.label;
  const isFiltered = !!value && value !== options[0]?.value;

  React.useEffect(() => {
    function h(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen(v => !v)}
        className={`flex items-center gap-1.5 px-3 py-2.5 rounded-xl border text-sm transition-all ${
          isFiltered
            ? "border-[#007A87] bg-[#B5E1E5]/20 text-[#007A87] font-semibold"
            : open
            ? "border-[#007A87] bg-white text-[#2D2D2D]"
            : "border-[#E0E0E0] bg-white text-[#616161] hover:bg-[#F0F4F4]"
        }`}>
        <span className="whitespace-nowrap">{isFiltered ? activeLabel : label}</span>
        <ChevronDown size={13} className={`flex-shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-1 z-30 bg-white border border-[#E0E0E0] rounded-xl shadow-lg overflow-hidden min-w-[140px]">
          <div className="px-3 py-2 border-b border-[#F0F4F4]">
            <p className="text-xs font-bold text-[#9E9E9E] uppercase tracking-wider">{label}</p>
          </div>
          <div className="p-1.5 space-y-0.5 max-h-60 overflow-y-auto">
            {options.map(opt => (
              <button key={opt.value} type="button"
                onClick={() => { onChange(opt.value); setOpen(false); }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${
                  value === opt.value
                    ? "bg-[#B5E1E5]/25 text-[#00555E] font-semibold"
                    : "text-[#2D2D2D] hover:bg-[#F0F4F4]"
                }`}>
                <span className="whitespace-nowrap">{opt.label}</span>
                {value === opt.value && <Check size={12} className="text-[#007A87] flex-shrink-0 ml-2" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
