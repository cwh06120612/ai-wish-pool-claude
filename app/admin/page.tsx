"use client";

import React, { useState, useEffect } from "react";
import { getSubmissionsAsync, updateSubmissionAsync } from "@/lib/storage";
import { exportToCsv } from "@/lib/csv";
import type { Submission, Status, Priority, Category } from "@/types/submission";
import { StatusBadge, Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Dashboard } from "@/components/admin/dashboard";
import { AdminAuth, useAdminRole, ASSIGNEE_OPTIONS } from "@/components/admin/admin-auth";
import { DiscussionDrawer } from "@/components/admin/discussion-drawer";
import { getUnreadCount } from "@/lib/discussions";
const ASSIGNEE_EDIT_OPTIONS = ["未指定", ...ASSIGNEE_OPTIONS];
import {
  LayoutDashboard, ListFilter, Download, FileText, SlidersHorizontal, Search,
  Eye, EyeOff, ChevronDown, ChevronUp, ChevronRight,
  X, Save, Check, LogOut, ThumbsUp, MessageSquare,
} from "lucide-react";

const STATUS_OPTIONS: Status[] = [
  "已收到","整理中","評估中","尋找工具中","測試中","已導入","暫不處理",
];
const PRIORITY_OPTIONS: Priority[] = ["高優先","中優先","低優先","待評估"];
const CATEGORY_OPTIONS: Category[] = [
  "找資料 / 知識查詢","會議紀錄","Excel / 報表","文件整理",
  "簡報 / 報告","自動化作業","AI 學習","AI 應用","豐譽 GPT","BPM","其他","未分類",
];

type Tab = "dashboard" | "list";

function AdminContent() {
  const [tab, setTab] = useState<Tab>("dashboard");
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
  const [adminFilterNote, setAdminFilterNote] = useState("");
  const [adminFilterUnread, setAdminFilterUnread] = useState(false);
  const [adminShowFilters, setAdminShowFilters] = useState(false);
  const [adminSort, setAdminSort] = useState<"newest"|"oldest"|"likes">("newest");
  const [editingNoteIdx, setEditingNoteIdx] = useState<number | null>(null);
  const [drawerSub, setDrawerSub] = useState<Submission | null>(null);
  const [unreadMap, setUnreadMap] = useState<Record<string, number>>({});
  const [showUnreadAlert, setShowUnreadAlert] = useState(false);
  const [editingNoteVal, setEditingNoteVal] = useState("");

  const reload = React.useCallback(async () => {
    const data = await getSubmissionsAsync();
    setSubmissions(data);
  }, []);

  useEffect(() => {
    reload();
    const timer = setInterval(reload, 30000);
    return () => clearInterval(timer);
  }, [reload]);

  useEffect(() => {
    if (!isTeam || !myName || submissions.length === 0) return;
    const myIds = submissions
      .filter(s => (Array.isArray(s.assignee) ? s.assignee : [s.assignee]).includes(myName))
      .map(s => s.id);
    if (myIds.length === 0) return;
    getUnreadCount(myIds, myName).then(map => {
      setUnreadMap(map);
      if (Object.values(map).reduce((a, b) => a + b, 0) > 0) setShowUnreadAlert(true);
    });
  }, [submissions.length, myName, isTeam]);

  function handleEdit(id: string) {
    const s = submissions.find((s) => s.id === id);
    if (!s) return;
    setModalId(id);
    setEditState({
      category: s.category,
      status: s.status,
      priority: s.priority,
      publicSummary: s.publicSummary,
      isVisible: s.isVisible,
      adminNote: s.adminNote,
      isExample: s.isExample ?? false,
      shareMode: s.shareMode,
      assignee: s.assignee ?? ["未指定"],
    });
  }

  async function handleSave(id: string) {
    await updateSubmissionAsync(id, { ...editState, isExample: editState.isExample });
    reload();
    setModalId(null);
    setEditState({});
  }

  // List tab
  const adminHasFilters = !!adminFilterStatus || !!adminFilterPriority || !!adminFilterVisible || !!adminFilterCategory || adminFilterAssignee.length > 0 || !!adminFilterNote || adminFilterUnread;
  const visibleSubmissions = submissions;
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
      if (adminFilterStatus && s.status !== adminFilterStatus) return false;
      if (adminFilterPriority && s.priority !== adminFilterPriority) return false;
      if (adminFilterVisible === "shown" && !s.isVisible) return false;
      if (adminFilterVisible === "hidden" && s.isVisible) return false;
      if (adminFilterCategory && !(Array.isArray(s.category) ? s.category : [s.category]).includes(adminFilterCategory as Category)) return false;
      if (adminFilterAssignee.length > 0) { const sa = Array.isArray(s.assignee) ? s.assignee : [s.assignee]; if (!adminFilterAssignee.some(f => sa.includes(f))) return false; }
      if (adminFilterNote === "有備註" && !s.adminNote?.trim()) return false;
      if (adminFilterNote === "無備註" && !!s.adminNote?.trim()) return false;
      if (adminFilterUnread && !unreadMap[s.id]) return false;
      return true;
    })
    .sort((a, b) =>
      adminSort === "likes" ? b.likeCount - a.likeCount :
      adminSort === "oldest" ? new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime() :
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

  return (
    <div className="max-w-[860px] mx-auto px-6 py-8">
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
          ] as const
        ).map(({ id, label, icon: Icon }) => (
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
                  options={[{ value: "", label: "全部狀態" }, ...STATUS_OPTIONS.map(o => ({ value: o, label: o }))]}
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
                  label="備註"
                  value={adminFilterNote}
                  options={[
                    { value: "", label: "全部" },
                    { value: "有備註", label: "有備註" },
                    { value: "無備註", label: "無備註" },
                  ]}
                  onChange={setAdminFilterNote}
                />
                <button type="button"
                  onClick={() => setAdminFilterUnread(v => !v)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs transition-colors ${
                    adminFilterUnread
                      ? "bg-[#AE1914] text-white border-[#AE1914]"
                      : "bg-white text-[#616161] border-[#E0E0E0] hover:border-[#AE1914]/50"
                  }`}>
                  <MessageSquare size={11} />有新回覆
                </button>
                <AdminInlineDropdown
                  label="分類"
                  value={adminFilterCategory}
                  options={[{ value: "", label: "全部分類" }, ...CATEGORY_OPTIONS.map(o => ({ value: o, label: o }))]}
                  onChange={setAdminFilterCategory}
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
                  <button onClick={() => { setAdminFilterStatus(""); setAdminFilterPriority(""); setAdminFilterVisible(""); setAdminFilterCategory(""); setAdminFilterAssignee([]); setAdminFilterNote(""); setAdminFilterUnread(false); }}
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
                <button onClick={() => setModalId(null)} className="p-1.5 rounded-lg hover:bg-[#F0F4F4] flex-shrink-0">
                  <X size={16} className="text-[#9E9E9E]" />
                </button>
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
                      <textarea rows={2} value={editState.publicSummary || ""}
                        onChange={e => setEditState(st => ({ ...st, publicSummary: e.target.value }))}
                        placeholder="填寫後公告欄會顯示此回覆"
                        className="w-full text-sm border border-[#E0E0E0] rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#007A87]/40 resize-none" />
                    </div>
                    <div className="sm:col-span-2">
                      <button type="button"
                          onClick={() => { setDrawerSub(s); }}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-[#007A87] text-white text-xs font-medium rounded-xl hover:bg-[#00555E] transition-colors mb-2">
                          <MessageSquare size={13} />
                          <span>開啟討論區</span>
                          {unreadMap[s.id] > 0 && <span className="px-1.5 py-0.5 bg-white text-[#AE1914] text-[9px] rounded-full font-bold">{unreadMap[s.id]}</span>}
                        </button>
                      {/* Comment list */}
                      {editState.adminNote && (
                        <div className="mb-3 space-y-2 max-h-40 overflow-y-auto">
                          {editState.adminNote.split(/(?=\[.+? \d{4}\/\d{2}\/\d{2}.+?\] )/).filter(Boolean).map((line, i, arr) => {
                            const match = line.match(/^\[(.+?) (\d{4}\/\d{2}\/\d{2}.+?)\] ([\s\S]+)$/);
                            if (!match) return (
                              <div key={i} className="text-xs text-[#616161] bg-[#F5F5F5] rounded-xl px-3 py-2 leading-relaxed">{line}</div>
                            );
                            const [, author, datetime, content] = match;
                            const avatar = author === '管理者' ? '管' : author.charAt(0);
                            const avatarColor = author === '管理者' ? '#007A87' : '#BE8B55';
                            const canEdit = author === (adminRole === 'editor' ? '管理者' : myName);
                            const isEditing = editingNoteIdx === i;
                            const prevMatch = i > 0 ? arr[i-1].match(/^\[(.+?) \d{4}\/\d{2}\/\d{2}.+?\]/) : null;
                            const prevAuthor = prevMatch ? prevMatch[1] : null;
                            const isContinued = prevAuthor === author;
                            return (
                              <div key={i} className="flex gap-2 items-start">
                                {isContinued
                                  ? <div className="w-7 flex-shrink-0" />
                                  : <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0" style={{backgroundColor: avatarColor}}>{avatar}</div>
                                }
                                <div className="flex-1">
                                  {!isContinued && (
                                  <div className="flex items-baseline gap-2 mb-0.5">
                                    <span className="text-xs font-medium text-[#424242]">{author}</span>
                                    <span className="text-[10px] text-[#9E9E9E]">{datetime}</span>
                                    {canEdit && !isEditing && (
                                      <span className="flex items-center gap-1 ml-1">
                                        <button type="button"
                                          className="text-[10px] text-[#9E9E9E] hover:text-[#007A87] px-1.5 py-0.5 rounded hover:bg-[#007A87]/10 transition-colors"
                                          onClick={() => { setEditingNoteIdx(i); setEditingNoteVal(content); }}>
                                          編輯
                                        </button>
                                        <span className="text-[#E0E0E0]">·</span>
                                        <button type="button"
                                          className="text-[10px] text-[#9E9E9E] hover:text-[#AE1914] px-1.5 py-0.5 rounded hover:bg-[#AE1914]/10 transition-colors"
                                          onClick={async () => { setEditingNoteIdx(i); setEditingNoteVal("__delete__"); }}>
                                          刪除
                                        </button>
                                      </span>
                                    )}
                                  </div>
                                  )}
                                  {isContinued && canEdit && !isEditing && (
                                    <div className="flex items-center gap-1 mb-0.5">
                                      <span className="text-[10px] text-[#9E9E9E]">{datetime}</span>
                                      <button type="button"
                                        className="text-[10px] text-[#9E9E9E] hover:text-[#007A87] px-1.5 py-0.5 rounded hover:bg-[#007A87]/10 transition-colors"
                                        onClick={() => { setEditingNoteIdx(i); setEditingNoteVal(content); }}>編輯</button>
                                      <span className="text-[#E0E0E0]">·</span>
                                      <button type="button"
                                        className="text-[10px] text-[#9E9E9E] hover:text-[#AE1914] px-1.5 py-0.5 rounded hover:bg-[#AE1914]/10 transition-colors"
                                        onClick={() => { setEditingNoteIdx(i); setEditingNoteVal("__delete__"); }}>刪除</button>
                                    </div>
                                  )}
                                  {isEditing && editingNoteVal === "__delete__" ? (
                                    <div className="bg-[#FDF2F2] border border-[#EBCDCC] rounded-xl px-3 py-2 text-xs">
                                      <p className="text-[#AE1914] mb-2">確定要刪除這則備註嗎？</p>
                                      <div className="flex gap-2">
                                        <button type="button"
                                          className="px-3 py-1 bg-[#AE1914] text-white text-xs rounded-lg hover:bg-[#8B1410] transition-colors"
                                          onClick={async () => {
                                            const lines = arr.filter((_, j) => j !== i);
                                            const newNote = lines.join("\n");
                                            setEditState(st => ({ ...st, adminNote: newNote }));
                                            setEditingNoteIdx(null);
                                            await updateSubmissionAsync(s.id, { adminNote: newNote });
                                            await reload();
                                          }}>確定刪除</button>
                                        <button type="button"
                                          className="px-3 py-1 bg-white border border-[#E0E0E0] text-[#616161] text-xs rounded-lg hover:bg-[#F5F5F5] transition-colors"
                                          onClick={() => setEditingNoteIdx(null)}>取消</button>
                                      </div>
                                    </div>
                                  ) : isEditing ? (
                                    <div className="space-y-1.5">
                                      <textarea rows={2} value={editingNoteVal}
                                        onChange={e => setEditingNoteVal(e.target.value)}
                                        className="w-full text-xs border border-[#007A87] rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#007A87]/40 resize-none" />
                                      <div className="flex gap-2">
                                        <button type="button"
                                          className="px-3 py-1 bg-[#007A87] text-white text-xs rounded-lg hover:bg-[#00555E] transition-colors"
                                          onClick={async () => {
                                            if (!editingNoteVal.trim()) return;
                                            const newLine = `[${author} ${datetime}] ${editingNoteVal.trim()}`;
                                            const lines = arr.slice(); lines[i] = newLine;
                                            const newNote = lines.join("\n");
                                            setEditState(st => ({ ...st, adminNote: newNote }));
                                            setEditingNoteIdx(null);
                                            await updateSubmissionAsync(s.id, { adminNote: newNote });
                                            await reload();
                                          }}>儲存</button>
                                        <button type="button"
                                          className="px-3 py-1 bg-white border border-[#E0E0E0] text-[#616161] text-xs rounded-lg hover:bg-[#F5F5F5] transition-colors"
                                          onClick={() => setEditingNoteIdx(null)}>取消</button>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="bg-[#F5F5F5] rounded-xl rounded-tl-sm px-3 py-1.5 text-xs text-[#424242] leading-relaxed">{content}</div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                      {/* New note input */}
                      <div className="flex gap-2 items-end">
                        <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0" style={{backgroundColor: adminRole === 'editor' ? '#007A87' : '#BE8B55'}}>
                          {adminRole === 'editor' ? '管' : myName.charAt(0)}
                        </div>
                        <textarea rows={1} id="newNoteInput"
                          placeholder="新增備註... (Enter 送出，Shift+Enter 換行)"
                          onKeyDown={async (e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              const input = e.currentTarget;
                              if (!input.value.trim()) return;
                              const author = adminRole === 'editor' ? '管理者' : myName;
                              const now = new Date().toLocaleString('zh-TW', { year:'numeric', month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit' });
                              const stamp = `[${author} ${now}] ${input.value.trim()}`;
                              const prev = editState.adminNote?.trim();
                              const newNote = prev ? prev + '\n' + stamp : stamp;
                              setEditState(st => ({ ...st, adminNote: newNote }));
                              input.value = '';
                              await updateSubmissionAsync(s.id, { adminNote: newNote });
                              await reload();
                            }
                          }}
                          className="flex-1 text-sm border border-[#E0E0E0] rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#007A87]/40 resize-none" />
                        <button type="button"
                          onClick={async () => {
                            const input = document.getElementById('newNoteInput') as HTMLTextAreaElement;
                            if (!input?.value.trim()) return;
                            const author = adminRole === 'editor' ? '管理者' : myName;
                            const now = new Date().toLocaleString('zh-TW', { year:'numeric', month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit' });
                            const stamp = `[${author} ${now}] ${input.value.trim()}`;
                            const prev = editState.adminNote?.trim();
                            const newNote = prev ? prev + '\n' + stamp : stamp;
                            setEditState(st => ({ ...st, adminNote: newNote }));
                            input.value = '';
                            await updateSubmissionAsync(s.id, { adminNote: newNote });
                            await reload();
                          }}
                          className="px-3 py-2 text-xs font-medium bg-[#007A87] text-white rounded-xl hover:bg-[#00555E] transition-colors whitespace-nowrap">
                          送出
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              {/* Footer */}
              <div className="border-t border-[#F0F4F4] px-5 py-3 flex justify-end gap-2 flex-shrink-0">
                <Button variant="tertiary" size="sm" onClick={() => setModalId(null)}>取消</Button>
                <Button variant="primary" size="sm" onClick={() => handleSave(s.id)} disabled={!canEdit && !(isTeam && isMyItem(s))}>
                  <Save size={13} />儲存
                </Button>
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

      {/* Unread notification modal */}
      {showUnreadAlert && isTeam && Object.values(unreadMap).reduce((a,b) => a+b, 0) > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/30" onClick={() => setShowUnreadAlert(false)} />
          <div className="relative bg-white rounded-2xl shadow-xl p-6 w-80 text-center">
            <div className="w-12 h-12 rounded-full bg-[#B5E1E5]/40 flex items-center justify-center mx-auto mb-4">
              <MessageSquare size={22} className="text-[#007A87]" />
            </div>
            <h3 className="text-base font-bold text-[#1F2937] mb-1">你有新回覆</h3>
            <p className="text-sm text-[#6B7280] mb-4">
              共 <span className="font-bold text-[#007A87]">{Object.values(unreadMap).reduce((a,b) => a+b, 0)}</span> 則未讀訊息
            </p>
            <button onClick={() => { setShowUnreadAlert(false); setTeamTab("mine"); setAdminShowFilters(true); setAdminFilterUnread(true); }}
              className="w-full py-2.5 bg-[#007A87] text-white text-sm font-medium rounded-xl hover:bg-[#00555E] transition-colors">
              前往查看
            </button>
            <button onClick={() => setShowUnreadAlert(false)}
              className="mt-2 w-full py-2 text-sm text-[#9E9E9E] hover:text-[#616161] transition-colors">
              稍後再看
            </button>
          </div>
        </div>
      )}

      {/* Discussion drawer */}
      {drawerSub && (
        <DiscussionDrawer
          submission={drawerSub}
          author={adminRole === "editor" ? "管理者" : myName}
          onClose={() => setDrawerSub(null)}
          onAdminNoteChange={async (newNote) => {
            setDrawerSub(prev => prev ? { ...prev, adminNote: newNote } : prev);
            await reload();
          }}
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
