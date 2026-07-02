"use client";

import React, { useState } from "react";
import { DepartmentSelector } from "@/components/department-selector";
import { saveIdentity, identityIsSet, deptLast, type Identity } from "@/lib/identity";
import { Crown, User, Check } from "lucide-react";

// 側欄用的留言身分卡片：設定一次，之後所有主題自動帶入
export function IdentityBar({ identity, staff, onChange }: {
  identity: Identity;
  staff: { isStaff: boolean; name: string };
  onChange: (id: Identity) => void;
}) {
  const set = identityIsSet(identity);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(identity.name);
  const [deptPath, setDeptPath] = useState<string[]>(identity.deptPath);

  const cardClass = "bg-white border border-[#E0E0E0]/80 rounded-xl p-3";

  // 官方身分（負責人員/管理員）
  if (staff.isStaff) {
    return (
      <div className={cardClass}>
        <p className="text-[11px] font-semibold text-[#9E9E9E] mb-1.5">你的留言身分</p>
        <div className="flex flex-wrap items-center gap-1.5 text-sm">
          <span className="font-semibold text-[#007A87]">{staff.name}</span>
          <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-[#00555E] bg-[#B5E1E5]/40 px-1.5 py-0.5 rounded-full"><Crown size={10} />數位創新處</span>
        </div>
      </div>
    );
  }

  // 已設定且非編輯中
  if (set && !editing) {
    return (
      <div className={cardClass}>
        <p className="text-[11px] font-semibold text-[#9E9E9E] mb-1.5">你的留言身分</p>
        <div className="flex items-center gap-1.5 text-sm mb-2">
          <span className="inline-flex items-center justify-center w-4 h-4 rounded-full border border-[#BDBDBD] flex-shrink-0"><User size={9} className="text-[#9E9E9E]" /></span>
          <span className="font-medium text-[#2D2D2D]">{identity.name}</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#F0F4F4] text-[#616161]">{deptLast(identity.deptPath.join(" > "))}</span>
        </div>
        <button type="button" onClick={() => { setName(identity.name); setDeptPath(identity.deptPath); setEditing(true); }}
          className="text-xs text-[#007A87] hover:text-[#00555E] font-medium transition-colors">修改</button>
      </div>
    );
  }

  // 尚未設定或編輯中：直式表單
  return (
    <div className={cardClass}>
      <p className="text-[11px] font-semibold text-[#9E9E9E] mb-2">設定留言身分</p>
      <input type="text" value={name} onChange={(e) => setName(e.target.value)}
        placeholder="姓名"
        className="w-full mb-2 text-sm border border-[#E0E0E0] rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#007A87]/40" />
      <div className="mb-2"><DepartmentSelector value={deptPath} onChange={setDeptPath} hidePath /></div>
      <div className="flex items-center gap-2">
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
    </div>
  );
}
