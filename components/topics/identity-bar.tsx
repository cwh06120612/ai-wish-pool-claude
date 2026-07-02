"use client";

import React, { useState } from "react";
import { DepartmentSelector } from "@/components/department-selector";
import { saveIdentity, identityIsSet, deptLast, type Identity } from "@/lib/identity";
import { Crown, User, Check, X } from "lucide-react";

// 頁首的留言身分控制項
export function IdentityBar({ identity, staff, onChange }: {
  identity: Identity;
  staff: { isStaff: boolean; name: string };
  onChange: (id: Identity) => void;
}) {
  const set = identityIsSet(identity);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(identity.name);
  const [deptPath, setDeptPath] = useState<string[]>(identity.deptPath);

  function open() { setName(identity.name); setDeptPath(identity.deptPath); setEditing(true); }

  // 官方身分：與其他人相同排版（圓形 icon + 姓名 + 標籤），不可修改
  if (staff.isStaff) {
    return (
      <div className="flex items-center gap-1.5 text-xs">
        <span className="inline-flex items-center justify-center w-4 h-4 rounded-full border border-[#BDBDBD] flex-shrink-0"><User size={9} className="text-[#9E9E9E]" /></span>
        <span className="font-semibold text-[#2D2D2D]">{staff.name}</span>
        <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-[#00555E] bg-[#B5E1E5]/40 px-1.5 py-0.5 rounded-full"><Crown size={10} />數位創新處</span>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* 觸發器 */}
      {set ? (
        <div className="flex items-center gap-1.5 text-xs">
          <span className="inline-flex items-center justify-center w-4 h-4 rounded-full border border-[#BDBDBD] flex-shrink-0"><User size={9} className="text-[#9E9E9E]" /></span>
          <span className="font-semibold text-[#2D2D2D]">{identity.name}</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#F0F4F4] text-[#616161]">{deptLast(identity.deptPath.join(" > "))}</span>
          <button type="button" onClick={open} className="text-[#007A87] hover:text-[#00555E] font-medium transition-colors">修改</button>
        </div>
      ) : (
        <button type="button" onClick={open}
          className="flex items-center gap-1 text-xs font-medium text-[#007A87] border border-[#007A87]/40 rounded-lg px-3 py-1.5 hover:bg-[#B5E1E5]/20 transition-colors">
          <User size={12} />設定留言身分
        </button>
      )}

      {/* 編輯浮層：絕對定位，不推擠其他內容 */}
      {editing && (
        <div className="absolute right-0 top-full mt-2 z-40 flex flex-wrap items-center gap-2 border border-[#E0E0E0] bg-white rounded-xl shadow-lg px-3 py-2">
          <input type="text" value={name} onChange={(e) => setName(e.target.value)}
            placeholder="姓名"
            className="w-32 text-sm border border-[#E0E0E0] rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#007A87]/40" />
          <div className="w-44"><DepartmentSelector value={deptPath} onChange={setDeptPath} hidePath /></div>
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
          <button type="button" onClick={() => setEditing(false)} className="p-1 rounded-lg hover:bg-[#F0F4F4]"><X size={14} className="text-[#9E9E9E]" /></button>
        </div>
      )}
    </div>
  );
}
