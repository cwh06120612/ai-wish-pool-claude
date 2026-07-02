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
      </div>
    );
  }

  // 尚未設定且未展開：預設收合成一行小提示
  if (!editing) {
    return (
      <div className="mb-4 flex items-center gap-1.5 text-xs text-[#9E9E9E]">
        <User size={12} className="text-[#BDBDBD] flex-shrink-0" />
        <span>留言前請先設定留言身分</span>
        <button type="button" onClick={() => { setName(identity.name); setDeptPath(identity.deptPath); setEditing(true); }}
          className="text-[#007A87] hover:text-[#00555E] font-medium transition-colors">設定</button>
      </div>
    );
  }

  // 編輯中：精簡一列
  return (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      <span className="flex items-center gap-1 text-xs text-[#616161] whitespace-nowrap"><User size={12} className="text-[#007A87]" />留言身分</span>
      <input type="text" value={name} onChange={(e) => setName(e.target.value)}
        placeholder="姓名"
        className="w-24 text-sm border border-[#E0E0E0] rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#007A87]/40" />
      <div className="w-48"><DepartmentSelector value={deptPath} onChange={setDeptPath} hidePath /></div>
      <button type="button" disabled={!name.trim() || deptPath.length === 0}
        onClick={() => { const id = { name: name.trim(), deptPath }; saveIdentity(id); onChange(id); setEditing(false); }}
        className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#007A87] text-white hover:bg-[#00555E] disabled:opacity-40 transition-colors">
        <Check size={13} />儲存
      </button>
      {set && (
        <button type="button"
          onClick={() => { const empty = { name: "", deptPath: [] }; saveIdentity(empty); onChange(empty); setName(""); setDeptPath([]); setEditing(false); }}
          className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-[#AE1914] hover:bg-[#EBCDCC]/30 transition-colors">清除</button>
      )}
    </div>
  );
}
