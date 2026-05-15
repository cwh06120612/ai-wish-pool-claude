"use client";

import React, { useState, useEffect, createContext, useContext } from "react";
import { Lock, Eye, EyeOff, AlertCircle, User } from "lucide-react";
import { Button } from "@/components/ui/button";

const ADMIN_SESSION_KEY = "ai-wish-admin-auth";
const ADMIN_ASSIGNEE_KEY = "ai-wish-admin-assignee";
const PASSWORD_TEAM = "DID2026";
const PASSWORD_EDITOR = "DID202605";

export const ASSIGNEE_OPTIONS = ["王惠民", "楊振宏", "蔣乃文", "陳宛榆", "卓宛萱", "林政宏", "施義承", "黃晨暐"];

export type AdminRole = "team" | "editor";

interface AdminContextValue {
  role: AdminRole;
  assignee: string;
}

export const AdminRoleContext = createContext<AdminContextValue>({ role: "team", assignee: "" });
export function useAdminRole() { return useContext(AdminRoleContext); }

interface AdminAuthProps {
  children: React.ReactNode;
}

export function AdminAuth({ children }: AdminAuthProps) {
  const [ctx, setCtx] = useState<AdminContextValue | null>(null);
  const [checked, setChecked] = useState(false);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [shake, setShake] = useState(false);
  const [pendingTeam, setPendingTeam] = useState(false);
  const [selectedName, setSelectedName] = useState("");

  useEffect(() => {
    try {
      const role = sessionStorage.getItem(ADMIN_SESSION_KEY);
      const assignee = sessionStorage.getItem(ADMIN_ASSIGNEE_KEY) ?? "";
      if (role === "editor") setCtx({ role: "editor", assignee: "" });
      else if (role === "team" && assignee) setCtx({ role: "team", assignee });
    } catch {}
    setChecked(true);
  }, []);

  function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (password === PASSWORD_EDITOR) {
      try { sessionStorage.setItem(ADMIN_SESSION_KEY, "editor"); } catch {}
      setCtx({ role: "editor", assignee: "" });
      setError("");
    } else if (password === PASSWORD_TEAM) {
      setPendingTeam(true);
      setError("");
    } else {
      setError("密碼錯誤，請再試一次");
      setPassword("");
      setShake(true);
      setTimeout(() => setShake(false), 500);
    }
  }

  function handlePickName() {
    if (!selectedName) return;
    try {
      sessionStorage.setItem(ADMIN_SESSION_KEY, "team");
      sessionStorage.setItem(ADMIN_ASSIGNEE_KEY, selectedName);
    } catch {}
    setCtx({ role: "team", assignee: selectedName });
  }

  if (!checked) return null;

  if (ctx) return (
    <AdminRoleContext.Provider value={ctx}>
      {children}
    </AdminRoleContext.Provider>
  );

  return (
    <div className="min-h-[calc(100vh-56px)] flex items-center justify-center px-4">
      <div className={`bg-white border border-[#E0E0E0] rounded-2xl p-8 w-full max-w-sm shadow-sm ${shake ? "animate-shake" : ""}`}>
        <div className="w-12 h-12 rounded-xl bg-[#B5E1E5]/40 flex items-center justify-center mx-auto mb-5">
          {pendingTeam ? <User size={20} className="text-[#007A87]" /> : <Lock size={20} className="text-[#007A87]" />}
        </div>

        {!pendingTeam ? (
          <>
            <h1 className="text-lg font-bold text-[#424242] text-center mb-1">管理員專區</h1>
            <p className="text-sm text-[#9E9E9E] text-center mb-6">請輸入密碼繼續</p>
            <form onSubmit={handleLogin}>
              <div className="relative mb-4">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={e => { setPassword(e.target.value); setError(""); }}
                  placeholder="請輸入密碼"
                  autoFocus
                  className={`w-full px-4 py-2.5 pr-10 text-sm rounded-lg border focus:outline-none focus:ring-2 focus:ring-[#007A87]/40 focus:border-[#007A87] placeholder:text-[#BDBDBD] text-[#424242] transition-colors ${
                    error ? "border-[#AE1914]" : "border-[#E0E0E0]"
                  }`}
                />
                <button type="button" onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#BDBDBD] hover:text-[#757575]">
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              {error && (
                <p className="text-xs text-[#AE1914] mb-3 flex items-center gap-1">
                  <AlertCircle size={12} />{error}
                </p>
              )}
              <Button type="submit" variant="primary" className="w-full">
                進入管理員專區
              </Button>
            </form>
          </>
        ) : (
          <>
            <h1 className="text-lg font-bold text-[#424242] text-center mb-1">請選擇你的名字</h1>
            <p className="text-sm text-[#9E9E9E] text-center mb-6">你只會看到分配給你的困擾</p>
            <div className="grid grid-cols-2 gap-2 mb-5">
              {ASSIGNEE_OPTIONS.map(name => (
                <button key={name} type="button" onClick={() => setSelectedName(name)}
                  className={`px-3 py-2.5 rounded-xl text-sm font-medium border transition-all ${
                    selectedName === name
                      ? "bg-[#007A87] text-white border-[#007A87]"
                      : "bg-white text-[#424242] border-[#E0E0E0] hover:border-[#007A87]/50"
                  }`}>
                  {name}
                </button>
              ))}
            </div>
            <Button variant="primary" className="w-full" onClick={handlePickName} disabled={!selectedName}>
              確認
            </Button>
          </>
        )}
      </div>
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20%, 60% { transform: translateX(-6px); }
          40%, 80% { transform: translateX(6px); }
        }
        .animate-shake { animation: shake 0.4s ease-in-out; }
      `}</style>
    </div>
  );
}
