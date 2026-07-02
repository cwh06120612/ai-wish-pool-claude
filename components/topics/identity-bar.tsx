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
      <div className="mb-4 flex items-center gap-1.5 text-xs bg-[#EFF7F8] border border-[#007A87]/30 rounded-xl px-3 py-2 text-[#00555E]">
        <Crown size={12} className="text-[#007A87]" />
        你目前以 <b>{staff.name}</b>（數位創新處）身分發言
      </div>
    );
  }

  // 已設定且非編輯中：顯示身分 + 修改
  if (set && !editing) {
    return (
      <div className="mb-4 flex items-center gap-2 text-xs bg-white border border-[#E0E0E0]/80 rounded-xl px-3 py-2">
        <User size={12} className="text-[#9E9E9E] flex-shrink-0" />
        <span className="text-[#616161]">你目前以 <b className="text-[#2D2D2D]">{identity.name}．{deptLast(identity.deptPath.join(" > "))}</b> 發言</span>
        <button type="button" onClick={() => { setName(identity.name); setDeptPath(identity.deptPath); setEditing(true); }}
          className="ml-auto text-[#007A87] font-medium hover:text-[#00555E] transition-colors flex-shrink-0">修改</button>
      </div>
    );
  }

  // 尚未設定或編輯中：顯示設定表單
  return (
    <div className="mb-4 bg-[#FFFBF0] border border-[#FFE7A3] rounded-xl p-3">
      <p className="text-xs text-[#7A5A30] mb-2">留言前先設定你的<b>部門與姓名</b>，之後在所有主題都會自動帶入、不用再填。</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2">
        <input type="text" value={name} onChange={(e) => setName(e.target.value)}
          placeholder="你的姓名"
          className="text-sm border border-[#E0E0E0] rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#007A87]/40" />
        <DepartmentSelector value={deptPath} onChange={setDeptPath} />
      </div>
      <button type="button" disabled={!name.trim() || deptPath.length === 0}
        onClick={() => { const id = { name: name.trim(), deptPath }; saveIdentity(id); onChange(id); setEditing(false); }}
        className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold bg-[#007A87] text-white hover:bg-[#00555E] disabled:opacity-40 transition-colors">
        <Check size={14} />儲存身分
      </button>
    </div>
  );
}
