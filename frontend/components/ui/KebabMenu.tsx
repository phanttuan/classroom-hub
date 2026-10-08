"use client";

import { useEffect, useRef, useState } from "react";
import { MoreVertical, type LucideIcon } from "lucide-react";

export interface KebabMenuItem {
  label: string;
  icon?: LucideIcon;
  onClick: () => void;
  danger?: boolean;
  hidden?: boolean;
}

/** Chiều cao ước tính mỗi mục / phần đệm của menu (px) — dùng để quyết định mở lên hay xuống */
const ITEM_HEIGHT = 37;
const MENU_PADDING = 12;
const VIEWPORT_GAP = 8;

/** Nút 3 chấm dọc mở menu thao tác (Chỉnh sửa, Xóa, ...). Tự mở lên trên khi sát mép dưới màn hình */
export default function KebabMenu({ items, label = "Thao tác" }: { items: KebabMenuItem[]; label?: string }) {
  const [open, setOpen] = useState(false);
  const [dropUp, setDropUp] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const visible = items.filter((i) => !i.hidden);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    const onResize = () => setOpen(false);
    document.addEventListener("keydown", onKey);
    window.addEventListener("resize", onResize);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onResize);
    };
  }, [open]);

  if (!visible.length) return null;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        title={label}
        onClick={(e) => {
          if (!open) {
            const rect = e.currentTarget.getBoundingClientRect();
            const menuHeight = visible.length * ITEM_HEIGHT + MENU_PADDING;
            const spaceBelow = window.innerHeight - rect.bottom - VIEWPORT_GAP;
            const spaceAbove = rect.top - VIEWPORT_GAP;
            setDropUp(spaceBelow < menuHeight && spaceAbove > spaceBelow);
          }
          setOpen((o) => !o);
        }}
        className={`grid h-8 w-8 place-items-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 ${
          open ? "bg-slate-100 text-slate-800" : ""
        }`}
      >
        <MoreVertical className="h-4 w-4" />
      </button>
      {open && (
        <div
          role="menu"
          className={`absolute right-0 z-30 min-w-44 ${dropUp ? "bottom-full mb-1 origin-bottom-right" : "top-full mt-1 origin-top-right"} overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-xl`}
        >
          {visible.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.label}
                type="button"
                role="menuitem"
                onClick={() => {
                  setOpen(false);
                  item.onClick();
                }}
                className={`flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-[13px] transition ${
                  item.danger ? "text-red-600 hover:bg-red-50" : "text-slate-700 hover:bg-slate-50"
                }`}
              >
                {Icon && <Icon className={`h-4 w-4 ${item.danger ? "text-red-500" : "text-slate-500"}`} />}
                {item.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
