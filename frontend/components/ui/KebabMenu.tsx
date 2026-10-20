"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { MoreVertical, type LucideIcon } from "lucide-react";

export type KebabMenuTone = "default" | "danger" | "warning" | "success";

export interface KebabMenuItem {
  label: string;
  icon?: LucideIcon;
  onClick: () => void;
  /** @deprecated dùng tone: "danger" */
  danger?: boolean;
  tone?: KebabMenuTone;
  hidden?: boolean;
}

interface KebabMenuProps {
  items: KebabMenuItem[];
  label?: string;
  /** Thay kiểu nút ⋮ (vd. nút trong suốt trên ảnh banner) */
  triggerClassName?: string;
}

/** Chiều cao ước tính mỗi mục / phần đệm của menu (px) — dùng để quyết định mở lên hay xuống */
const ITEM_HEIGHT = 37;
const MENU_PADDING = 12;
const GAP = 4;
const VIEWPORT_GAP = 8;

const TONE_CLASS: Record<KebabMenuTone, { item: string; icon: string }> = {
  default: { item: "text-slate-700 hover:bg-slate-50", icon: "text-slate-500" },
  danger: { item: "text-red-600 hover:bg-red-50", icon: "text-red-500" },
  warning: { item: "text-amber-700 hover:bg-amber-50", icon: "text-amber-600" },
  success: { item: "text-emerald-700 hover:bg-emerald-50", icon: "text-emerald-600" },
};

type MenuPosition = { right: number; top?: number; bottom?: number; dropUp: boolean };

/**
 * Nút 3 chấm dọc mở menu thao tác (Chỉnh sửa, Xóa, ...).
 * Menu được render qua portal với vị trí cố định nên không bị phần tử cha có overflow-hidden cắt mất;
 * tự mở lên trên khi sát mép dưới màn hình, đóng khi cuộn / đổi kích thước cửa sổ.
 */
export default function KebabMenu({ items, label = "Thao tác", triggerClassName }: KebabMenuProps) {
  const [position, setPosition] = useState<MenuPosition | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const visible = items.filter((i) => !i.hidden);
  const open = position !== null;

  useEffect(() => {
    if (!open) return;
    const close = () => setPosition(null);
    const onDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (menuRef.current?.contains(target) || triggerRef.current?.contains(target)) return;
      close();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        close();
        triggerRef.current?.focus();
      }
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    // Vị trí cố định theo nút ⋮ → cuộn / đổi kích thước thì đóng thay vì để menu lơ lửng sai chỗ
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [open]);

  if (!visible.length) return null;

  const toggle = (e: React.MouseEvent<HTMLButtonElement>) => {
    // Nút ⋮ thường nằm trong thẻ bấm được (vd. thẻ lớp học) → không để cú bấm lan ra thẻ
    e.stopPropagation();
    if (open) {
      setPosition(null);
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const menuHeight = visible.length * ITEM_HEIGHT + MENU_PADDING;
    const spaceBelow = window.innerHeight - rect.bottom - VIEWPORT_GAP;
    const spaceAbove = rect.top - VIEWPORT_GAP;
    const dropUp = spaceBelow < menuHeight && spaceAbove > spaceBelow;
    setPosition({
      right: Math.max(VIEWPORT_GAP, window.innerWidth - rect.right),
      ...(dropUp ? { bottom: window.innerHeight - rect.top + GAP } : { top: rect.bottom + GAP }),
      dropUp,
    });
  };

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        title={label}
        onClick={toggle}
        className={
          triggerClassName ??
          `grid h-8 w-8 place-items-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 ${
            open ? "bg-slate-100 text-slate-800" : ""
          }`
        }
      >
        <MoreVertical className="h-4 w-4" />
      </button>
      {position &&
        createPortal(
          <div
            ref={menuRef}
            role="menu"
            // Sự kiện trong portal vẫn nổi lên cây React của component cha → chặn để không kích hoạt thẻ bên dưới
            onClick={(e) => e.stopPropagation()}
            style={{ position: "fixed", right: position.right, top: position.top, bottom: position.bottom }}
            className={`z-[150] min-w-48 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-xl ${
              position.dropUp ? "origin-bottom-right" : "origin-top-right"
            }`}
          >
            {visible.map((item) => {
              const Icon = item.icon;
              const tone = TONE_CLASS[item.tone ?? (item.danger ? "danger" : "default")];
              return (
                <button
                  key={item.label}
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setPosition(null);
                    item.onClick();
                  }}
                  className={`flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-[13px] transition ${tone.item}`}
                >
                  {Icon && <Icon className={`h-4 w-4 ${tone.icon}`} />}
                  {item.label}
                </button>
              );
            })}
          </div>,
          document.body
        )}
    </>
  );
}
