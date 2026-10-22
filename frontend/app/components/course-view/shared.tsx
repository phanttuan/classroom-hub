"use client";

import { ChevronLeft, ChevronRight, type LucideIcon } from "lucide-react";

/** Thẻ trắng dùng chung cho các khối nội dung trong trang hoạt động */
export function Card({
  title,
  icon: Icon,
  children,
  className = "",
  aside,
  centerTitle,
}: {
  title?: string;
  icon?: LucideIcon;
  children: React.ReactNode;
  className?: string;
  aside?: React.ReactNode;
  centerTitle?: boolean;
}) {
  return (
    <section className={`rounded-2xl border border-slate-200/90 bg-white shadow-xs ${className}`}>
      {title && (
        <h2
          className={`flex items-center gap-2 border-b border-slate-100 px-5 py-3.5 text-[14px] font-bold text-slate-800 ${
            centerTitle ? "justify-center" : ""
          }`}
        >
          {Icon && <Icon className="h-4 w-4 text-[#0f6cbf]" />}
          {title}
          {aside && <span className="ml-auto">{aside}</span>}
        </h2>
      )}
      {children}
    </section>
  );
}

export function InfoRow({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 px-5 py-2.5">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
      <span className="w-28 shrink-0 text-[13px] text-slate-500">{label}</span>
      <span className="min-w-0 flex-1 text-pretty break-words text-[13.5px] font-medium tabular-nums text-slate-800">{value}</span>
    </div>
  );
}

export type TileTone = "slate" | "emerald" | "amber" | "red" | "sky" | "violet";

export function StatTile({ label, value, tone }: { label: string; value: React.ReactNode; tone: TileTone }) {
  const cls: Record<TileTone, string> = {
    slate: "bg-slate-50 text-slate-700",
    emerald: "bg-emerald-50 text-emerald-700",
    amber: "bg-amber-50 text-amber-700",
    red: "bg-red-50 text-red-700",
    sky: "bg-sky-50 text-sky-700",
    violet: "bg-violet-50 text-violet-700",
  };
  return (
    <div className={`rounded-xl px-4 py-3 text-center ${cls[tone]}`}>
      <p className="text-[22px] font-extrabold leading-none">{value}</p>
      <p className="mt-1 text-[12px] font-medium opacity-80">{label}</p>
    </div>
  );
}

/** Số dòng mỗi trang cho bảng theo sinh viên */
export const PAGE_SIZE = 10;

function pageNumbers(current: number, count: number): (number | "…")[] {
  if (count <= 7) return Array.from({ length: count }, (_, i) => i + 1);
  const pages = new Set([1, count, current - 1, current, current + 1].filter((p) => p >= 1 && p <= count));
  const sorted = [...pages].sort((a, b) => a - b);
  const out: (number | "…")[] = [];
  sorted.forEach((p, i) => {
    if (i > 0 && p - sorted[i - 1] > 1) out.push("…");
    out.push(p);
  });
  return out;
}

export function Pagination({
  page,
  pageCount,
  from,
  to,
  total,
  unit = "sinh viên",
  onChange,
}: {
  page: number;
  pageCount: number;
  from: number;
  to: number;
  total: number;
  unit?: string;
  onChange: (page: number) => void;
}) {
  const btn =
    "grid h-8 min-w-8 place-items-center rounded-lg px-2 text-[12.5px] font-semibold transition disabled:cursor-not-allowed disabled:opacity-40";
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-5 py-3">
      <p className="text-[12.5px] text-slate-500">
        Hiển thị <b className="text-slate-700">{from}–{to}</b> trong <b className="text-slate-700">{total}</b> {unit}
      </p>
      <div className="flex items-center gap-1">
        <button type="button" disabled={page <= 1} onClick={() => onChange(page - 1)} aria-label="Trang trước" className={`${btn} text-slate-600 hover:bg-slate-100`}>
          <ChevronLeft className="h-4 w-4" />
        </button>
        {pageNumbers(page, pageCount).map((p, i) =>
          p === "…" ? (
            <span key={`gap-${i}`} className="px-1 text-slate-400">…</span>
          ) : (
            <button
              key={p}
              type="button"
              onClick={() => onChange(p)}
              aria-current={p === page ? "page" : undefined}
              className={`${btn} ${p === page ? "bg-[#0f6cbf] text-white" : "text-slate-600 hover:bg-slate-100"}`}
            >
              {p}
            </button>
          ),
        )}
        <button type="button" disabled={page >= pageCount} onClick={() => onChange(page + 1)} aria-label="Trang sau" className={`${btn} text-slate-600 hover:bg-slate-100`}>
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export type BadgeTone = "neutral" | "success" | "warning" | "danger" | "info";

export const BADGE_TONE: Record<BadgeTone, string> = {
  neutral: "border-slate-200 bg-slate-100 text-slate-600",
  success: "border-emerald-200 bg-emerald-50 text-emerald-700",
  warning: "border-amber-200 bg-amber-50 text-amber-800",
  danger: "border-red-200 bg-red-50 text-red-700",
  info: "border-sky-200 bg-sky-50 text-sky-700",
};

export function Badge({ tone, children, fixed }: { tone: BadgeTone; children: React.ReactNode; fixed?: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 text-[12px] font-semibold ${BADGE_TONE[tone]} ${
        fixed ? "w-[148px] justify-center" : ""
      }`}
    >
      {children}
    </span>
  );
}
