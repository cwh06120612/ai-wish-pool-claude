"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sparkles, Menu, X } from "lucide-react";
import { useState } from "react";

const navLinks = [
  { href: "/", label: "首頁" },
  { href: "/wish", label: "我要許願" },
  { href: "/board", label: "公告欄" },
  { href: "/admin", label: "管理員專區" },
];

export function SiteNav() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-[#E0E0E0]/60 shadow-sm">
      <div className="max-w-[860px] mx-auto px-6 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#007A87] to-[#00555E] flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
            <Sparkles size={14} className="text-white" />
          </div>
          <span className="font-bold text-[#2D2D2D] text-sm tracking-tight">AI 許願池</span>
        </Link>

        <nav className="hidden md:flex items-center gap-0.5">
          {navLinks.map((link) => (
            <Link key={link.href} href={link.href}
              className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all ${
                pathname === link.href
                  ? "bg-[#007A87] text-white shadow-sm"
                  : "text-[#616161] hover:text-[#2D2D2D] hover:bg-[#F0F4F4]"
              }`}>
              {link.label}
            </Link>
          ))}
        </nav>

        <button className="md:hidden p-2 rounded-lg hover:bg-[#F0F4F4]" onClick={() => setMobileOpen(v => !v)}>
          {mobileOpen ? <X size={18} className="text-[#2D2D2D]" /> : <Menu size={18} className="text-[#2D2D2D]" />}
        </button>
      </div>

      {mobileOpen && (
        <div className="md:hidden border-t border-[#E0E0E0]/60 bg-white px-4 py-2">
          {navLinks.map((link) => (
            <Link key={link.href} href={link.href} onClick={() => setMobileOpen(false)}
              className={`block px-3 py-2.5 rounded-lg text-sm mb-0.5 font-medium transition-all ${
                pathname === link.href
                  ? "bg-[#007A87] text-white"
                  : "text-[#616161] hover:text-[#2D2D2D] hover:bg-[#F0F4F4]"
              }`}>
              {link.label}
            </Link>
          ))}
        </div>
      )}
    </header>
  );
}
