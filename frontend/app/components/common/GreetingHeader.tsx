"use client";

import { CalendarDays } from "lucide-react";

/**
 * Khối chào mừng đầu trang dùng chung cho cả 3 role
 * (student / teacher / admin): tiêu đề + mô tả bên trái,
 * hộp ngày "Hôm nay" bên phải.
 */
export default function GreetingHeader({
  name,
  subtitle,
  dateLabel,
}: {
  name: string;
  subtitle: string;
  dateLabel: string;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="text-[24px] font-extrabold tracking-tight sm:text-[28px]">
          Xin chào, {name} <span aria-hidden>👋</span>
        </h1>
        <p className="mt-1 text-[14px] text-slate-500">{subtitle}</p>
      </div>
      <div className="flex items-center gap-3 rounded-xl border border-slate-200/70 bg-white px-4 py-3">
        <span className="grid h-10 w-10 place-items-center rounded-lg bg-blue-50 text-blue-600">
          <CalendarDays className="h-5 w-5" />
        </span>
        <span>
          <span className="block text-[12px] text-slate-400">Hôm nay</span>
          <span className="block text-[14px] font-bold text-slate-900">{dateLabel}</span>
        </span>
      </div>
    </div>
  );
}
