"use client";

import { ArrowRight, FileText } from "lucide-react";
import type { PendingAssignment, RecentResult } from "@/lib/types/teacher";

const TONE_BG: Record<string, string> = {
  red: "bg-red-50 text-red-500",
  orange: "bg-orange-50 text-orange-500",
  blue: "bg-blue-50 text-blue-600",
  purple: "bg-purple-50 text-purple-600",
  green: "bg-green-50 text-green-600",
};

export function PendingAssignments({
  items,
  onGrade,
}: {
  items: PendingAssignment[];
  onGrade: (a: PendingAssignment) => void;
}) {
  return (
    <section className="flex h-full flex-col rounded-xl border border-slate-200/70 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.05)]">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-[16px] font-bold text-slate-900">Bài tập cần chấm</h2>
        <a href="/teacher/assignments" className="text-[13px] font-medium text-blue-600 hover:text-blue-700">
          Xem tất cả <ArrowRight className="inline h-3.5 w-3.5" />
        </a>
      </div>
      <ul className="flex-1 space-y-3">
        {items.map((a) => (
          <li
            key={a.id}
            className="flex items-center gap-3 rounded-xl bg-slate-50/70 p-3"
          >
            <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-lg ${TONE_BG[a.tone]}`}>
              <FileText className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13.5px] font-bold text-slate-900">{a.title}</p>
              <p className="text-[12.5px] text-slate-500">Lớp: {a.classCode}</p>
            </div>
            <div className="shrink-0 text-center">
              <p className="text-[14px] font-extrabold text-slate-900">
                {a.submitted}/{a.total}
              </p>
              <p className="text-[11.5px] text-slate-500">đã nộp</p>
            </div>
            <button
              onClick={() => onGrade(a)}
              className="shrink-0 rounded-lg bg-blue-600 px-3 py-2 text-[12.5px] font-semibold text-white transition hover:bg-blue-700"
            >
              Chấm điểm
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function RecentResults({ items }: { items: RecentResult[] }) {
  return (
    <section className="flex h-full flex-col rounded-xl border border-slate-200/70 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.05)]">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-[16px] font-bold text-slate-900">Kết quả gần đây</h2>
        <a href="/teacher/grades" className="text-[13px] font-medium text-blue-600 hover:text-blue-700">
          Xem tất cả <ArrowRight className="inline h-3.5 w-3.5" />
        </a>
      </div>
      <ul className="flex flex-1 flex-col justify-between gap-4">
        {items.map((r) => (
          <li key={r.id} className="flex items-center gap-3">
            <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-lg ${TONE_BG[r.tone]}`}>
              <FileText className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13.5px] font-bold text-slate-900">{r.title}</p>
              <p className="text-[12.5px] text-slate-500">Lớp: {r.classCode}</p>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-[12.5px] text-slate-500">{r.submissionCount} bài làm</p>
              <p className="mt-0.5 text-[12.5px] font-medium text-green-600">{r.statusLabel}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
