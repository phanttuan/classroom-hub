"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, MoreVertical } from "lucide-react";
import type { WorkStatus } from "@/lib/types/teacher";

/* Badge trạng thái dùng chung cho Bài tập / Kiểm tra */
export function WorkStatusBadge({ status }: { status: WorkStatus }) {
  if (status === "open")
    return (
      <span className="inline-block shrink-0 whitespace-nowrap rounded-lg bg-green-100/80 px-3 py-1 text-[12.5px] font-medium text-green-700">
        Đang mở
      </span>
    );
  if (status === "due-soon")
    return (
      <span className="inline-block shrink-0 whitespace-nowrap rounded-lg bg-orange-100/80 px-3 py-1 text-[12.5px] font-medium text-orange-600">
        Sắp đến hạn
      </span>
    );
  return (
    <span className="inline-block shrink-0 whitespace-nowrap rounded-lg bg-slate-100 px-3 py-1 text-[12.5px] font-medium text-slate-500">
      Đã đóng
    </span>
  );
}

/* Tiến độ nộp / làm bài */
export function SubmitProgress({ done, total, label }: { done: number; total: number; label: string }) {
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);
  return (
    <span className="block w-[150px] shrink-0">
      <span className="block text-[12px] text-slate-500">{label}</span>
      <span className="block text-[13px] font-extrabold text-slate-900">
        {done}/{total}
      </span>
      <span className="mt-1 flex items-center gap-1.5">
        <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
          <span className="block h-full rounded-full bg-blue-600" style={{ width: `${pct}%` }} />
        </span>
        <span className="w-8 shrink-0 text-right text-[11.5px] text-slate-400">{pct}%</span>
      </span>
    </span>
  );
}

/* Menu ⋮ dùng chung: tự quản lý đóng/mở */
export function RowMenu({ items }: { items: { label: string; danger?: boolean; onClick: () => void }[] }) {
  const [open, setOpen] = useState(false);
  return (
    <span className="relative inline-block">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Tùy chọn"
        className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 text-slate-400 transition hover:bg-slate-50 hover:text-slate-600"
      >
        <MoreVertical className="h-4 w-4" />
      </button>
      {open && (
        <>
          <button aria-label="Đóng menu" onClick={() => setOpen(false)} className="fixed inset-0 z-10 cursor-default" />
          <span className="absolute right-0 top-[calc(100%+6px)] z-20 w-44 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-xl">
            {items.map((it) => (
              <button
                key={it.label}
                onClick={() => {
                  setOpen(false);
                  it.onClick();
                }}
                className={`block w-full px-3.5 py-2 text-left text-[13px] transition hover:bg-slate-50 ${
                  it.danger ? "text-red-600 hover:bg-red-50" : "text-slate-600"
                }`}
              >
                {it.label}
              </button>
            ))}
          </span>
        </>
      )}
    </span>
  );
}

/* Select có nhãn phía trên như ảnh mẫu */
export function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  return (
    <label className="block text-[12.5px] text-slate-500">
      <span className="mb-1 block">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-[13px] text-slate-700 outline-none focus:border-blue-300"
      >
        {options.map((o) => (
          <option key={o}>{o}</option>
        ))}
      </select>
    </label>
  );
}

export function Pagination({
  page,
  totalPages,
  onChange,
}: {
  page: number;
  totalPages: number;
  onChange: (p: number) => void;
}) {
  if (totalPages <= 1) {
    return (
      <span className="flex items-center gap-1.5">
        <span className="grid h-8 w-8 place-items-center rounded-lg border border-slate-200 text-slate-300">
          <ChevronLeft className="h-4 w-4" />
        </span>
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-blue-600 text-[13px] font-bold text-white">1</span>
        <span className="grid h-8 w-8 place-items-center rounded-lg border border-slate-200 text-slate-300">
          <ChevronRight className="h-4 w-4" />
        </span>
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1.5">
      <button
        onClick={() => onChange(Math.max(1, page - 1))}
        aria-label="Trang trước"
        disabled={page === 1}
        className="grid h-8 w-8 place-items-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-50 disabled:opacity-30"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>
      {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
        <button
          key={p}
          onClick={() => onChange(p)}
          className={`grid h-8 w-8 place-items-center rounded-lg text-[13px] font-semibold transition ${
            p === page ? "bg-blue-600 text-white" : "border border-slate-200 text-slate-500 hover:bg-slate-50"
          }`}
        >
          {p}
        </button>
      ))}
      <button
        onClick={() => onChange(Math.min(totalPages, page + 1))}
        aria-label="Trang sau"
        disabled={page === totalPages}
        className="grid h-8 w-8 place-items-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-50 disabled:opacity-30"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </span>
  );
}

/* Map tone -> class màu icon box */
export const TONE_BOX: Record<string, string> = {
  red: "bg-red-50 text-red-500",
  orange: "bg-orange-50 text-orange-500",
  blue: "bg-blue-50 text-blue-600",
  green: "bg-green-50 text-green-600",
  purple: "bg-purple-50 text-purple-600",
};
