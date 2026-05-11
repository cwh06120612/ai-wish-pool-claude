"use client";

import React, { useState, useEffect } from "react";
import { Lock, Eye, EyeOff, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

const ADMIN_SESSION_KEY = "ai-wish-admin-auth";
const ADMIN_PASSWORD = "1234"; // 可修改

interface AdminAuthProps {
  children: React.ReactNode;
}

export function AdminAuth({ children }: AdminAuthProps) {
  const [authed, setAuthed] = useState(false);
  const [checked, setChecked] = useState(false);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [shake, setShake] = useState(false);

  useEffect(() => {
    try {
      const val = sessionStorage.getItem(ADMIN_SESSION_KEY);
      if (val === "ok") setAuthed(true);
    } catch {}
    setChecked(true);
  }, []);

  function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (password === ADMIN_PASSWORD) {
      try { sessionStorage.setItem(ADMIN_SESSION_KEY, "ok"); } catch {}
      setAuthed(true);
      setError("");
    } else {
      setError("密碼錯誤，請再試一次");
      setPassword("");
      setShake(true);
      setTimeout(() => setShake(false), 500);
    }
  }

  if (!checked) return null;

  if (authed) return <>{children}</>;

  return (
    <div className="min-h-[calc(100vh-56px)] flex items-center justify-center px-4">
      <div className={`bg-white border border-[#E0E0E0] rounded-2xl p-8 w-full max-w-sm shadow-sm ${shake ? "animate-shake" : ""}`}>
        {/* Icon */}
        <div className="w-12 h-12 rounded-xl bg-[#B5E1E5]/40 flex items-center justify-center mx-auto mb-5">
          <Lock size={20} className="text-[#007A87]" />
        </div>

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
            <button
              type="button"
              onClick={() => setShowPassword(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#BDBDBD] hover:text-[#757575]"
            >
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
