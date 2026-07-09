"use client";

import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { getTopics, getTopicStats, addTopic, type Topic, type TopicStat } from "@/lib/topics";
import { getIdentity, saveIdentity, getStaffInfo, identityIsSet, deptLast, type Identity } from "@/lib/identity";
import { DepartmentSelector } from "@/components/department-selector";
import { IdentityBar } from "@/components/topics/identity-bar";
import { EmptyState } from "@/components/ui/empty-state";
import {
  MessagesSquare, MessageSquare, Plus, Clock, User,
  X, ChevronRight, Search, Crown,
} from "lucide-react";
import { InlineFilterDropdown } from "@/components/ui/inline-filter-dropdown";

function fmtTime(iso: string) {
  return new Date(iso).toLocaleString("zh-TW", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

// ─── 開新主題 Modal ─────────────────────────────────────────────────────────────
function NewTopicModal({ identity, staff, onClose, onCreated, onIdentityChange }: {
  identity: Identity;
  staff: { isStaff: boolean; name: string };
  onClose: () => void;
  onCreated: (t: Topic) => void;
  onIdentityChange: (id: Identity) => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [name, setName] = useState(identity.name);
  const [deptPath, setDeptPath] = useState<string[]>(identity.deptPath);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [composing, setComposing] = useState(false);

  const identitySet = identityIsSet(identity);
  const needFields = !staff.isStaff && !identitySet; // 尚未設定身分才在此填

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", h);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", h); document.body.style.overflow = ""; };
  }, [onClose]);

  async function handleSubmit() {
    if (composing) return;
    if (!title.trim()) { setError("請填一下主題名稱"); return; }
    if (!description.trim()) { setError("請填一下主題說明"); return; }

    let authorName = "";
    let authorDept = "";
    if (staff.isStaff) {
      authorName = staff.name;
    } else if (identitySet) {
      authorName = identity.name;
      authorDept = identity.deptPath.join(" > ");
    } else {
      if (deptPath.length === 0) { setError("請選一下你的部門"); return; }
      if (!name.trim()) { setError("請填一下你的姓名"); return; }
      const id = { name: name.trim(), deptPath };
      saveIdentity(id);
      onIdentityChange(id);
      authorName = id.name;
      authorDept = id.deptPath.join(" > ");
    }

    setSubmitting(true);
    setError("");
    const created = await addTopic({ title, description, authorName, authorDept, isStaff: staff.isStaff });
    setSubmitting(false);
    if (!created) { setError("建立失敗，請稍後再試（可能是資料表尚未建立）"); return; }
    onCreated(created);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-0 sm:px-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between gap-3 px-5 pt-4 pb-3 flex-shrink-0">
          <div className="flex items-center gap-1.5">
            <MessagesSquare size={16} className="text-[#007A87]" />
            <h2 className="text-base font-bold text-[#2D2D2D]">開一個新主題</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[#F0F4F4]"><X size={16} className="text-[#9E9E9E]" /></button>
        </div>
        <div className="border-t border-[#F0F4F4]" />
        <div className="overflow-y-auto px-5 py-4 space-y-4 flex-1">
          <div>
            <label className="block text-xs font-bold text-[#9E9E9E] uppercase tracking-wider mb-2">主題名稱</label>
            <input type="text" value={title} onChange={(e) => { setTitle(e.target.value); if (error) setError(""); }}
              placeholder="例如：BPM 簽核系統、豐譽 GPT、差勤系統…"
              className="w-full text-sm border border-[#E0E0E0] rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#007A87]/40" />
          </div>
          <div>
            <label className="block text-xs font-bold text-[#9E9E9E] uppercase tracking-wider mb-2">主題說明</label>
            <textarea rows={2} value={description}
              onChange={(e) => { setDescription(e.target.value); if (error) setError(""); }}
              onCompositionStart={() => setComposing(true)}
              onCompositionEnd={(e) => { setComposing(false); setDescription(e.currentTarget.value); }}
              placeholder="這個主題想討論什麼？"
              className="w-full text-sm border border-[#E0E0E0] rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#007A87]/40 resize-none" />
          </div>
          {staff.isStaff ? (
            <div className="flex items-center gap-1 text-xs text-[#9E9E9E]">
              <span>以</span>
              <span className="font-semibold text-[#007A87]">{staff.name}</span>
              <span className="inline-flex items-center gap-0.5 text-xs font-medium text-[#00555E] bg-[#B5E1E5]/40 px-1.5 py-0.5 rounded-full"><Crown size={10} />數位創新處</span>
              <span>身分開主題</span>
            </div>
          ) : identitySet ? (
            <div className="flex items-center gap-1.5 text-xs text-[#616161]">
              <User size={12} className="text-[#9E9E9E]" />
              以 <b className="text-[#2D2D2D]">{identity.name}．{deptLast(identity.deptPath.join(" > "))}</b> 開主題
            </div>
          ) : (
            <>
              <div>
                <label className="block text-xs font-bold text-[#9E9E9E] uppercase tracking-wider mb-2">你的部門</label>
                <DepartmentSelector value={deptPath} onChange={(p) => { setDeptPath(p); if (error) setError(""); }} portal />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#9E9E9E] uppercase tracking-wider mb-2">你的姓名</label>
                <input type="text" value={name} onChange={(e) => { setName(e.target.value); if (error) setError(""); }}
                  placeholder="請填你的姓名"
                  className="w-full text-sm border border-[#E0E0E0] rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#007A87]/40" />
              </div>
            </>
          )}
          {needFields && <p className="text-[11px] text-[#9E9E9E]">設定後會記住，之後所有主題自動帶入。</p>}
          {error && <p className="text-xs text-[#AE1914]">{error}</p>}
          <button type="button" onClick={handleSubmit} disabled={submitting || composing}
            className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-semibold bg-[#007A87] text-white hover:bg-[#00555E] transition-colors disabled:opacity-50">
            <Plus size={14} />{submitting ? "建立中…" : "建立主題"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── 主頁（主題列表）─────────────────────────────────────────────────────────────
export default function TopicsPage() {
  const router = useRouter();
  const [topics, setTopics] = useState<Topic[]>([]);
  const [stats, setStats] = useState<Record<string, TopicStat>>({});
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [query, setQuery] = useState("");
  const [filterNeeds, setFilterNeeds] = useState(false);
  const [sortNewest, setSortNewest] = useState(true); // true = 由新至舊、false = 由舊至新（依建立時間）
  const [identity, setIdentity] = useState<Identity>({ name: "", deptPath: [] });
  const [staff, setStaff] = useState<{ isStaff: boolean; name: string }>({ isStaff: false, name: "" });

  useEffect(() => {
    setIdentity(getIdentity());
    setStaff(getStaffInfo());
  }, []);

  const reload = useCallback(async () => {
    const [ts, st] = await Promise.all([getTopics(), getTopicStats()]);
    setTopics(ts);
    setStats(st);
    setLoading(false);
  }, []);

  useEffect(() => {
    reload();
    const timer = setInterval(reload, 30000);
    return () => clearInterval(timer);
  }, [reload]);

  const sortedTopics = useMemo(() => {
    return [...topics].sort((a, b) => {
      const cmp = b.createdAt.localeCompare(a.createdAt); // 由新至舊
      return sortNewest ? cmp : -cmp;
    });
  }, [topics, sortNewest]);

  const hasNeeds = useMemo(() => topics.some((t) => !!t.submissionId), [topics]);

  // 先套用搜尋（不含分類），供分類數量徽章與最終清單共用
  const searchedTopics = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return sortedTopics;
    return sortedTopics.filter((t) => `${t.title} ${t.description}`.toLowerCase().includes(q));
  }, [sortedTopics, query]);

  const needsCount = useMemo(() => searchedTopics.filter((t) => !!t.submissionId).length, [searchedTopics]);

  const filteredTopics = useMemo(
    () => (filterNeeds ? searchedTopics.filter((t) => !!t.submissionId) : searchedTopics),
    [searchedTopics, filterNeeds]
  );

  return (
    <div className="max-w-[1120px] mx-auto px-6 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
        <div className="flex items-center gap-2">
          <MessagesSquare size={20} className="text-[#007A87]" />
          <h1 className="text-2xl font-bold text-[#2D2D2D]">主題討論</h1>
        </div>
        <IdentityBar identity={identity} staff={staff} onChange={setIdentity} />
      </div>
      <div className="mb-5">
        <p className="text-sm text-[#9E9E9E]">依主題（例如某個系統）開討論串，在裡面留下使用上的問題、心得或建議。</p>
        <p className="text-xs text-[#8C6A3F] mt-1">※ 本專區請使用真實部門與姓名，以利追蹤問題並聯絡相關人員。</p>
      </div>

      {loading ? (
        <div className="py-16 text-center text-sm text-[#9E9E9E]">載入中…</div>
      ) : sortedTopics.length === 0 ? (
        <EmptyState
          title="還沒有任何主題"
          description="開一個主題，開始跟大家討論吧。"
          icon={<MessagesSquare size={20} className="text-[#9E9E9E]" />}
          action={<button type="button" onClick={() => setShowNew(true)} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-[#007A87] text-white hover:bg-[#00555E] transition-colors"><Plus size={14} />開新主題</button>}
        />
      ) : (
        <>
          <div className="flex flex-wrap gap-2 mb-4">
            <div className="flex-1 min-w-[180px] flex items-center gap-2 px-3 py-2.5 bg-white border border-[#E0E0E0]/80 rounded-xl shadow-sm">
              <Search size={14} className="text-[#BDBDBD] flex-shrink-0" />
              <input type="text" placeholder="搜尋主題，開新主題前先找找有沒有重複…" value={query} onChange={(e) => setQuery(e.target.value)}
                className="flex-1 text-sm text-[#2D2D2D] placeholder:text-[#BDBDBD] outline-none bg-transparent" />
              {query && <button onClick={() => setQuery("")}><X size={13} className="text-[#BDBDBD]" /></button>}
            </div>
            <div className="flex-shrink-0">
              <InlineFilterDropdown
                label="排序"
                value={sortNewest ? "newest" : "oldest"}
                options={[{ value: "newest", label: "由新至舊" }, { value: "oldest", label: "由舊至新" }]}
                onChange={(v) => setSortNewest(v === "newest")}
              />
            </div>
            <button type="button" onClick={() => setShowNew(true)}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold bg-[#007A87] text-white hover:bg-[#00555E] transition-colors flex-shrink-0">
              <Plus size={15} />開新主題
            </button>
          </div>
          {hasNeeds && (
            <div className="flex flex-wrap gap-2 mb-4">
              <button type="button" onClick={() => setFilterNeeds(false)}
                className={`flex items-center gap-1.5 px-3 py-2.5 rounded-xl border text-sm font-medium transition-all ${
                  !filterNeeds
                    ? "border-[#007A87] bg-white shadow-sm text-[#007A87]"
                    : "border-[#E0E0E0]/60 bg-white/60 text-[#9E9E9E] hover:bg-white hover:text-[#2D2D2D]"
                }`}>
                全部
                <span className="inline-flex items-center text-xs font-bold px-1.5 py-0.5 rounded-full bg-[#F0F4F4] text-[#616161]">{searchedTopics.length}</span>
              </button>
              <button type="button" onClick={() => setFilterNeeds(true)}
                className={`flex items-center gap-1.5 px-3 py-2.5 rounded-xl border text-sm font-medium transition-all ${
                  filterNeeds
                    ? "border-[#BE8B55] bg-white shadow-sm text-[#8C6A3F]"
                    : "border-[#E0E0E0]/60 bg-white/60 text-[#9E9E9E] hover:bg-white hover:text-[#2D2D2D]"
                }`}>
                需求討論
                <span className="inline-flex items-center text-xs font-bold px-1.5 py-0.5 rounded-full bg-[#BE8B55]/15 text-[#8C6A3F]">{needsCount}</span>
              </button>
            </div>
          )}
          {filteredTopics.length === 0 ? (
            <p className="py-12 text-center text-sm text-[#9E9E9E]">
              {filterNeeds && !query.trim()
                ? "目前還沒有來自需求的討論串。"
                : <>找不到符合「{query}」的主題，可以<button type="button" onClick={() => setShowNew(true)} className="text-[#007A87] font-medium hover:text-[#00555E]">開一個新主題</button>。</>}
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredTopics.map((t) => {
                const st = stats[t.id];
                return (
                  <button key={t.id} type="button" onClick={() => router.push(`/topics/${t.id}`)}
                    className="w-full text-left bg-white border border-[#E0E0E0]/80 rounded-2xl px-4 py-3 hover:shadow-md hover:-translate-y-0.5 transition-all group flex items-start gap-2.5">
                    <div className="flex flex-col items-center gap-1 flex-shrink-0 mt-0.5">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${t.submissionId ? "bg-[#BE8B55]/15" : "bg-[#B5E1E5]/40"}`}>
                        <MessageSquare size={15} className={t.submissionId ? "text-[#BE8B55]" : "text-[#007A87]"} />
                      </div>
                      {t.submissionId && <span className="inline-flex items-center text-[10px] font-medium text-[#8C6A3F] bg-[#BE8B55]/15 px-1.5 py-0.5 rounded-full whitespace-nowrap">需求討論</span>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-semibold text-[#2D2D2D] leading-snug group-hover:text-[#007A87] transition-colors line-clamp-2">{t.title}</h3>
                      {t.description && <p className="text-xs text-[#616161] mt-0.5 line-clamp-1">{t.description}</p>}
                      <div className="flex items-center gap-x-3 gap-y-1 mt-1.5 text-[11px] text-[#9E9E9E] flex-wrap">
                        <span className="flex items-center gap-1">
                          <span className="inline-flex items-center justify-center w-4 h-4 rounded-full border border-[#BDBDBD] flex-shrink-0"><User size={9} className="text-[#9E9E9E]" /></span>
                          <span className={t.isStaff ? "font-semibold text-[#007A87]" : ""}>{t.isStaff ? (t.authorName && t.authorName !== "數位創新處" ? t.authorName : "管理者") : t.authorName}</span>
                          {!t.isStaff && t.authorDept && <span className="text-xs px-1.5 py-0.5 rounded-full bg-[#F0F4F4] text-[#616161] border border-[#E0E0E0]">{deptLast(t.authorDept)}</span>}
                          {t.isStaff && <span className="inline-flex items-center gap-0.5 text-xs font-medium text-[#00555E] bg-[#B5E1E5]/40 px-1.5 py-0.5 rounded-full whitespace-nowrap"><Crown size={10} />數位創新處</span>}
                        </span>
                        <span className="flex items-center gap-1"><MessageSquare size={10} />{st?.count ?? 0} 則留言</span>
                        {st?.lastAt && <span className="flex items-center gap-1"><Clock size={10} />最後活動 {fmtTime(st.lastAt)}</span>}
                      </div>
                    </div>
                    <ChevronRight size={16} className="text-[#BDBDBD] group-hover:text-[#007A87] transition-colors flex-shrink-0 mt-1" />
                  </button>
                );
              })}
            </div>
          )}
        </>
      )}

      {showNew && (
        <NewTopicModal
          identity={identity}
          staff={staff}
          onClose={() => setShowNew(false)}
          onCreated={(t) => { setShowNew(false); router.push(`/topics/${t.id}`); }}
          onIdentityChange={setIdentity}
        />
      )}
    </div>
  );
}
