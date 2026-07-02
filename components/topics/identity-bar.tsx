"use client";

import React, { useState } from "react";
import { DepartmentSelector } from "@/components/department-selector";
import { saveIdentity, identityIsSet, deptLast, type Identity } from "@/lib/identity";
import { Crown, User, Check } from "lucide-react";

// 專區頂端的發言身分列：設定一次，之後所有主題自動帶入
export function IdentityBar({ identity, staff, onChange }: {
  identity: Identity;
  staff: { isStaff: boolean; name: string };
  onChange: (id: Identity) => void;
}) {
  const set = identityIsSet(identity);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(identity.name);
  const [deptPath, setDeptPath] = useState<string[]>(identity.deptPath);

  // 官方身分（負責人員/管理員）：直接顯示，不需設定
  if (staff.isStaff) {
    return (
      <div className="mb-4 flex items-center gap-1.5 text-xs text-[#9E9E9E]">
        <Crown size={12} className="text-[#007A87] flex-shrink-0" />
        目前以 <b className="text-[#007A87] font-medium">{staff.name}</b>（數位創新處）發言
      </div>
    );
  }

  // 已設定且非編輯中：低調一行 + 修改連結
  if (set && !editing) {
    return (
      <div className="mb-4 flex items-center gap-1.5 text-xs text-[#9E9E9E]">
        <User size={12} className="text-[#BDBDBD] flex-shrink-0" />
        <span>目前以 <b className="text-[#616161] font-medium">{identity.name}．{deptLast(identity.deptPath.join(" > "))}</b> 發言</span>
        <button type="button" onClick={() => { setName(identity.name); setDeptPath(identity.deptPath); setEditing(true); }}
          className="text-[#007A87] hover:text-[#00555E] transition-colors flex-shrink-0">修改</button>
        <span className="text-[#E0E0E0]">|</span>
        <button type="button" onClick={() => { const empty = { name: "", deptPath: [] }; saveIdentity(empty); onChange(empty); setName(""); setDeptPath([]); setEditing(false); }}
          className="text-[#AE1914] hover:text-[#8C1915] transition-colors flex-shrink-0">清除</button>
      </div>
    );
  }

  // 尚未設定或編輯中：乾淨的小卡片
  return (
    <div className="mb-4 bg-white border border-[#E0E0E0]/80 rounded-xl p-3">
      <div className="flex items-center gap-1.5 mb-2">
        <User size={13} className="text-[#007A87]" />
        <span className="text-xs font-semibold text-[#2D2D2D]">設定發言身分</span>
        <span className="text-[11px] text-[#9E9E9E]">設定一次，之後所有主題自動帶入</span>
      </div>
      <div className="flex flex-col sm:flex-row gap-2 sm:items-start">
        <input type="text" value={name} onChange={(e) => setName(e.target.value)}
          placeholder="姓名"
          className="sm:w-32 text-sm border border-[#E0E0E0] rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#007A87]/40" />
        <div className="flex-1 min-w-0"><DepartmentSelector value={deptPath} onChange={setDeptPath} /></div>
        <button type="button" disabled={!name.trim() || deptPath.length === 0}
          onClick={() => { const id = { name: name.trim(), deptPath }; saveIdentity(id); onChange(id); setEditing(false); }}
          className="flex items-center justify-center gap-1 px-4 py-2 rounded-lg text-sm font-semibold bg-[#007A87] text-white hover:bg-[#00555E] disabled:opacity-40 transition-colors flex-shrink-0">
          <Check size={14} />儲存
        </button>
      </div>
    </div>
  );
}
