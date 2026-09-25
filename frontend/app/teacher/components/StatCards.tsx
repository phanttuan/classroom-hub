"use client";

import { ClipboardCheck, FileText, Users, BookOpenCheck } from "lucide-react";
import type { DashboardStat } from "@/lib/types/teacher";

const TONE: Record<DashboardStat["tone"], { bg: string; text: string }> = {
  blue: { bg: "bg-blue-50", text: "text-blue-600" },
  green: { bg: "bg-green-50", text: "text-green-600" },
  purple: { bg: "bg-purple-50", text: "text-purple-600" },
  orange: { bg: "bg-orange-50", text: "text-orange-500" },
};

const ICON = {
  classes: Users,
  students: Users,
  assignments: FileText,
  quizzes: ClipboardCheck,
} as const;

export default function StatCards({ stats }: { stats: DashboardStat[] }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {stats.map((s) => {
        const Icon = s.icon === "quizzes" ? BookOpenCheck : ICON[s.icon];
        const tone = TONE[s.tone];
        return (
          <div
            key={s.id}
            className="rounded-xl border border-slate-200/70 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.05)]"
          >
            <div className="flex items-start gap-3">
              <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl ${tone.bg} ${tone.text}`}>
                <Icon className="h-6 w-6" />
              </span>
              <div className="min-w-0">
                <p className="line-clamp-2 min-h-[36px] text-[13px] font-medium leading-snug text-slate-500">{s.label}</p>
                <p className="mt-0.5 text-[26px] font-extrabold leading-none text-slate-900">
                  {s.value}
                </p>
              </div>
            </div>
            <a
              href={s.detailHref}
              className="mt-3 block text-right text-[13px] font-medium text-blue-600 hover:text-blue-700"
            >
              Xem chi tiết <span aria-hidden>→</span>
            </a>
          </div>
        );
      })}
    </div>
  );
}
