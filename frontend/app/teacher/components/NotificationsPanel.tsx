"use client";

import { ArrowRight, CalendarCheck, Megaphone, Users } from "lucide-react";
import type { TeacherNotification } from "@/lib/types/teacher";

const KIND = {
  submission: { bg: "bg-blue-50 text-blue-600", Icon: Users },
  announcement: { bg: "bg-red-50 text-red-500", Icon: Megaphone },
  reminder: { bg: "bg-green-50 text-green-600", Icon: CalendarCheck },
} as const;

export default function NotificationsPanel({
  items,
  onViewAll,
  onOpen,
}: {
  items: TeacherNotification[];
  onViewAll: () => void;
  onOpen: (n: TeacherNotification) => void;
}) {
  return (
    <section className="rounded-xl border border-slate-200/70 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.05)]">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-[16px] font-bold text-slate-900">Thông báo mới</h2>
        <button onClick={onViewAll} className="text-[13px] font-medium text-blue-600 hover:text-blue-700">
          Xem tất cả <ArrowRight className="inline h-3.5 w-3.5" />
        </button>
      </div>
      <ul className="space-y-4">
        {items.map((n) => {
          const { bg, Icon } = KIND[n.kind];
          return (
            <li key={n.id}>
              <button onClick={() => onOpen(n)} className="flex w-full gap-3 text-left">
                <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-lg ${bg}`}>
                  <Icon className="h-5 w-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-start justify-between gap-2">
                    <span className="text-[13px] font-bold text-slate-900">{n.title}</span>
                    <span className="shrink-0 text-[11px] text-slate-400">{n.timeAgo}</span>
                  </span>
                  <span className="mt-0.5 line-clamp-2 block text-[12.5px] leading-relaxed text-slate-500">
                    {n.description}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
