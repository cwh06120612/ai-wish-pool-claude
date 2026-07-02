"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { ChevronRight, Search, X, Check, ChevronLeft, Building2 } from "lucide-react";
import { departments } from "@/data/departments";
import {
  searchDepartments,
  getChildrenAtPath,
  isLeafNode,
} from "@/lib/department-utils";

interface DepartmentSelectorProps {
  value: string[];
  onChange: (path: string[]) => void;
  error?: string;
  /** 在 Modal 等有 overflow 的容器內使用時開啟，選單會以 fixed 定位到 body，避免被裁切 */
  portal?: boolean;
  /** 精簡模式：隱藏觸發器下方的完整路徑麵包屑（觸發器已顯示所選部門）*/
  hidePath?: boolean;
}

export function DepartmentSelector({ value, onChange, error, portal = false, hidePath = false }: DepartmentSelectorProps) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [browsePath, setBrowsePath] = useState<string[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [coords, setCoords] = useState<{ top: number; left: number; width: number; placement: "down" | "up" } | null>(null);

  // Close on outside click（portal 時選單在 body，需一併排除）
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      const t = e.target as Node;
      if (containerRef.current?.contains(t)) return;
      if (menuRef.current?.contains(t)) return;
      setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // portal 模式：計算選單位置，並在捲動/縮放時跟隨
  useEffect(() => {
    if (!portal || !open) return;
    function compute() {
      const el = containerRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const menuH = 360;
      const spaceBelow = window.innerHeight - r.bottom;
      const placement: "down" | "up" = spaceBelow < menuH && r.top > spaceBelow ? "up" : "down";
      setCoords({
        top: placement === "down" ? r.bottom + 4 : r.top - 4,
        left: r.left,
        width: r.width,
        placement,
      });
    }
    compute();
    window.addEventListener("resize", compute);
    window.addEventListener("scroll", compute, true);
    return () => {
      window.removeEventListener("resize", compute);
      window.removeEventListener("scroll", compute, true);
    };
  }, [portal, open]);

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const searchResults = useMemo(
    () => (query.trim().length >= 1 ? searchDepartments(departments, query) : []),
    [query]
  );

  const browseChildren = useMemo(
    () => getChildrenAtPath(departments, browsePath),
    [browsePath]
  );

  const selectedIsLeaf = value.length > 0 && isLeafNode(departments, value);
  const displayLabel = value.length > 0 ? value[value.length - 1] : "";

  function handleOpen() {
    setOpen(true);
    setBrowsePath([]);
    setQuery("");
  }

  function handleClear(e: React.MouseEvent) {
    e.stopPropagation();
    onChange([]);
    setBrowsePath([]);
    setQuery("");
  }

  function handleSelectSearch(path: string[]) {
    onChange(path);
    setQuery("");
    setOpen(false);
  }

  function handleBrowseClick(label: string, hasChildren: boolean) {
    const newPath = [...browsePath, label];
    if (!hasChildren) {
      onChange(newPath);
      setOpen(false);
      setBrowsePath([]);
    } else {
      setBrowsePath(newPath);
      setQuery("");
    }
  }

  function handleBack() {
    setBrowsePath((p) => p.slice(0, -1));
  }

  const showSearch = query.trim().length > 0;

  return (
    <div ref={containerRef} className="relative">
      {/* Trigger — use div to avoid button-in-button */}
      <div
        role="button"
        tabIndex={0}
        onClick={handleOpen}
        onKeyDown={e => { if (e.key === "Enter" || e.key === " ") handleOpen(); }}
        className={`
          w-full flex items-center gap-2 px-3 py-2.5 rounded-lg border text-sm text-left cursor-pointer
          focus:outline-none focus:ring-2 focus:ring-[#007A87]/40 bg-white transition-colors
          ${error ? "border-[#AE1914]" : "border-[#E0E0E0] hover:border-[#007A87]/60"}
          ${open ? "border-[#007A87]" : ""}
        `}
      >
        <Building2 size={15} className="text-[#9E9E9E] flex-shrink-0" />
        <span className={`flex-1 truncate ${value.length > 0 ? "text-[#424242]" : "text-[#BDBDBD]"}`}>
          {value.length > 0 ? displayLabel : "請輸入關鍵字搜尋，或點此瀏覽"}
        </span>
        {value.length > 0 && (
          <button
            type="button"
            onClick={handleClear}
            className="p-0.5 hover:bg-[#F5F5F5] rounded flex-shrink-0"
          >
            <X size={13} className="text-[#9E9E9E]" />
          </button>
        )}
      </div>

      {/* Selected path display */}
      {!hidePath && value.length > 0 && (
        <div className="mt-1.5 flex flex-wrap items-center gap-x-1 gap-y-0.5 text-xs px-1">
          {value.map((seg, i) => (
            <React.Fragment key={i}>
              {i > 0 && <ChevronRight size={10} className="text-[#BDBDBD]" />}
              <span className={i === value.length - 1 ? "text-[#007A87] font-medium" : "text-[#9E9E9E]"}>
                {seg}
              </span>
            </React.Fragment>
          ))}
          {selectedIsLeaf && <Check size={11} className="text-[#28A745] ml-0.5" />}
        </div>
      )}

      {/* Dropdown */}
      {open && (() => {
        const menu = (
        <div
          ref={menuRef}
          className={`bg-white border border-[#E0E0E0] rounded-xl shadow-lg overflow-hidden ${portal ? "" : "absolute left-0 right-0 top-full mt-1 z-50"}`}
          style={
            portal
              ? { position: "fixed", top: coords?.top ?? 0, left: coords?.left ?? 0, width: Math.max(coords?.width ?? 320, 320), zIndex: 100, transform: coords?.placement === "up" ? "translateY(-100%)" : undefined }
              : { minWidth: "320px" }
          }
        >
          {/* Search bar */}
          <div className="p-2 border-b border-[#F5F5F5]">
            <div className="flex items-center gap-2 px-2.5 py-2 bg-[#F5F5F5] rounded-lg">
              <Search size={14} className="text-[#9E9E9E] flex-shrink-0" />
              <input
                ref={inputRef}
                type="text"
                placeholder="輸入部門名稱搜尋..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="flex-1 bg-transparent text-sm text-[#424242] placeholder:text-[#BDBDBD] outline-none"
              />
              {query && (
                <button type="button" onClick={() => setQuery("")}>
                  <X size={12} className="text-[#9E9E9E]" />
                </button>
              )}
            </div>
          </div>

          <div className="max-h-72 overflow-y-auto">
            {showSearch ? (
              /* ── Search results ── */
              searchResults.length > 0 ? (
                <div className="p-1.5 space-y-0.5">
                  <p className="text-xs text-[#9E9E9E] px-2 py-1">
                    找到 {searchResults.length} 個結果
                  </p>
                  {searchResults.map((d, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => handleSelectSearch(d.path)}
                      className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-[#B5E1E5]/25 group transition-colors"
                    >
                      <div className="text-sm font-medium text-[#424242] group-hover:text-[#007A87]">
                        {d.label}
                      </div>
                      <div className="text-xs text-[#9E9E9E] mt-0.5 truncate">
                        {d.path.slice(0, -1).join(" › ")}
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="py-10 text-center text-sm text-[#9E9E9E]">
                  找不到「{query}」相關部門
                </div>
              )
            ) : (
              /* ── Browse mode ── */
              <div className="p-1.5">
                {/* Back button */}
                {browsePath.length > 0 && (
                  <button
                    type="button"
                    onClick={handleBack}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-[#007A87] hover:bg-[#B5E1E5]/20 mb-1 font-medium"
                  >
                    <ChevronLeft size={14} />
                    返回上一層
                  </button>
                )}

                {/* Breadcrumb */}
                {browsePath.length > 0 && (
                  <div className="px-3 py-1.5 mb-1 border-b border-[#F5F5F5]">
                    <div className="flex flex-wrap items-center gap-x-1 text-xs text-[#9E9E9E]">
                      {browsePath.map((seg, i) => (
                        <React.Fragment key={i}>
                          {i > 0 && <ChevronRight size={9} />}
                          <span className={i === browsePath.length - 1 ? "text-[#424242] font-medium" : ""}>
                            {seg}
                          </span>
                        </React.Fragment>
                      ))}
                    </div>
                  </div>
                )}

                {/* Children list */}
                {browseChildren.length === 0 ? (
                  <div className="py-6 text-center text-sm text-[#9E9E9E]">
                    沒有子項目
                  </div>
                ) : (
                  <div className="space-y-0.5">
                    {browseChildren.map((node, i) => {
                      const hasChildren = !!(node.children && node.children.length > 0);
                      return (
                        <button
                          key={i}
                          type="button"
                          onClick={() => handleBrowseClick(node.label, hasChildren)}
                          className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm hover:bg-[#B5E1E5]/20 text-[#424242] group transition-colors"
                        >
                          <span className="text-left group-hover:text-[#007A87]">{node.label}</span>
                          {hasChildren ? (
                            <ChevronRight size={14} className="text-[#BDBDBD] flex-shrink-0" />
                          ) : (
                            <span className="text-xs text-[#007A87] bg-[#B5E1E5]/50 px-2 py-0.5 rounded-full flex-shrink-0">
                              選擇
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

        </div>
        );
        return portal ? createPortal(menu, document.body) : menu;
      })()}

      {error && <p className="mt-1.5 text-xs text-[#AE1914] flex items-center gap-1">{error}</p>}
    </div>
  );
}
