"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";

interface SearchableSelectProps {
  label: string;
  options: string[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  emptyMessage?: string;
  /** 차트 하단 등 인라인 배치용 */
  variant?: "default" | "compact";
  /** compact 모드에서 선택값 왼쪽 강조색 */
  accentColor?: string;
  onOpenChange?: (open: boolean) => void;
  className?: string;
}

interface MenuPosition {
  top: number;
  left: number;
  width: number;
}

export function SearchableSelect({
  label,
  options,
  value,
  onChange,
  placeholder = "선택 또는 검색",
  disabled,
  emptyMessage = "항목 없음",
  variant = "default",
  accentColor,
  onOpenChange,
  className,
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState(value);
  const [menuPosition, setMenuPosition] = useState<MenuPosition | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const setOpenState = useCallback(
    (next: boolean) => {
      setOpen(next);
      onOpenChange?.(next);
    },
    [onOpenChange]
  );

  useEffect(() => {
    setSearch(value);
  }, [value]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.toLowerCase().includes(q));
  }, [options, search]);

  const updateMenuPosition = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setMenuPosition({
      top: rect.bottom + 6,
      left: rect.left,
      width: rect.width,
    });
  }, []);

  useEffect(() => {
    if (!open) {
      setMenuPosition(null);
      return;
    }
    updateMenuPosition();
    window.addEventListener("scroll", updateMenuPosition, true);
    window.addEventListener("resize", updateMenuPosition);
    return () => {
      window.removeEventListener("scroll", updateMenuPosition, true);
      window.removeEventListener("resize", updateMenuPosition);
    };
  }, [open, updateMenuPosition]);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (containerRef.current?.contains(target)) return;
      const portal = document.getElementById("searchable-select-menu-portal");
      if (portal?.contains(target)) return;
      setOpenState(false);
      setSearch(value);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [value, setOpenState]);

  const pick = (opt: string) => {
    onChange(opt);
    setSearch(opt);
    setOpenState(false);
  };

  const toggleOpen = () => {
    if (disabled) return;
    if (open) {
      setOpenState(false);
      setSearch(value);
      return;
    }
    setOpenState(true);
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const isCompact = variant === "compact";

  const menu =
    open && !disabled && menuPosition && typeof document !== "undefined"
      ? createPortal(
          <div
            id="searchable-select-menu-portal"
            className="fixed z-[9999] overflow-hidden rounded-lg border-2 border-slate-200 bg-white shadow-2xl"
            style={{
              top: menuPosition.top,
              left: menuPosition.left,
              width: menuPosition.width,
            }}
          >
            <div className="border-b border-slate-200 bg-slate-50 px-3 py-2 text-[11px] font-medium text-slate-600">
              {filtered.length} / {options.length}개
              {search.trim() ? " · 검색 결과" : " · 스크롤하여 선택"}
            </div>
            <div className="max-h-60 overflow-y-auto overscroll-contain bg-white">
              {filtered.length === 0 ? (
                <div className="px-3 py-4 text-xs text-muted-foreground">
                  {emptyMessage}
                </div>
              ) : (
                filtered.map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    className={cn(
                      "w-full text-left px-3 py-2.5 text-xs sm:text-sm font-mono",
                      "border-b border-slate-100 last:border-0 hover:bg-slate-100",
                      opt === value && "bg-blue-50 font-semibold text-blue-950"
                    )}
                    title={opt}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      pick(opt);
                    }}
                  >
                    {opt}
                  </button>
                ))
              )}
            </div>
          </div>,
          document.body
        )
      : null;

  return (
    <div
      className={cn(isCompact ? "min-w-[280px] max-w-full" : "space-y-2", className)}
      ref={containerRef}
    >
      {!isCompact && <Label>{label}</Label>}
      <div className="relative">
        <div
          className={cn(
            "flex items-center rounded-md border border-input bg-white shadow-sm",
            isCompact && "border-slate-300",
            open && "ring-2 ring-blue-500/30 border-blue-300",
            disabled && "opacity-50"
          )}
        >
          {isCompact && accentColor && (
            <span
              className="ml-3 inline-block h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: accentColor }}
              aria-hidden
            />
          )}
          {isCompact && (
            <span className="pl-2 pr-1 text-xs font-medium text-slate-600 shrink-0">
              {label}
            </span>
          )}
          <Search className="ml-2 h-4 w-4 shrink-0 text-muted-foreground pointer-events-none" />
          <input
            ref={inputRef}
            type="text"
            className={cn(
              "min-w-0 flex-1 bg-white py-2 pl-2 pr-1 text-sm font-mono",
              "placeholder:text-muted-foreground focus-visible:outline-none",
              isCompact && "py-2.5 text-xs sm:text-sm",
              disabled && "cursor-not-allowed"
            )}
            value={search}
            placeholder={placeholder}
            disabled={disabled}
            onFocus={() => setOpenState(true)}
            onChange={(e) => {
              setSearch(e.target.value);
              setOpenState(true);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && filtered.length === 1) {
                pick(filtered[0]);
              }
              if (e.key === "Escape") {
                setOpenState(false);
                setSearch(value);
              }
              if (e.key === "ArrowDown" && !open) {
                setOpenState(true);
              }
            }}
          />
          <button
            type="button"
            className="px-2.5 py-2 text-muted-foreground hover:text-foreground disabled:pointer-events-none"
            disabled={disabled}
            onClick={toggleOpen}
            aria-label={`${label} 목록 ${open ? "닫기" : "열기"}`}
            aria-expanded={open}
          >
            <ChevronDown
              className={cn(
                "h-4 w-4 transition-transform",
                open && "rotate-180"
              )}
            />
          </button>
        </div>
        {menu}
      </div>
    </div>
  );
}
