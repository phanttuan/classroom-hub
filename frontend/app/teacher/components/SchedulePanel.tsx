"use client";

import { useMemo, useState } from "react";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import type { ScheduleEvent } from "@/lib/types/teacher";
import { calendarMeta } from "@/lib/mock/teacher-dashboard";

const DOT: Record<ScheduleEvent["type"], string> = {
  deadline: "bg-red-500",
  quiz: "bg-blue-500",
  live: "bg-green-600",
};

/** Dựng lưới 30 ngày T9/2026, ngày 1 rơi vào Thứ 3 (cột T3) như ảnh mẫu */
function buildGrid(): (number | null)[] {
  const cells: (number | null)[] = [null, 1, 2, 3, 4, 5, 6];
  for (let d = 7; d <= 30; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

export default function SchedulePanel({
  events,
  onSelectEvent,
  onViewAll,
}: {
  events: ScheduleEvent[];
  onSelectEvent: (e: ScheduleEvent) => void;
  onViewAll: () => void;
}) {
  const [selectedDay, setSelectedDay] = useState(calendarMeta.selectedDay);
  const [monthOffset, setMonthOffset] = useState(0);
  const grid = useMemo(() => buildGrid(), []);

  const filtered = events.filter((e) => Number(e.date.slice(8, 10)) === selectedDay);

  return (
    <section className="rounded-xl border border-slate-200/70 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.05)]">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-[16px] font-bold text-slate-900">Lịch của tôi</h2>
        <button onClick={onViewAll} className="text-[13px] font-medium text-blue-600 hover:text-blue-700">
          Xem tất cả <ArrowRight className="inline h-3.5 w-3.5" />
        </button>
      </div>

      {/* Month nav */}
      <div className="mb-2 flex items-center justify-between">
        <button
          aria-label="Tháng trước"
          onClick={() => setMonthOffset((v) => v - 1)}
          className="grid h-7 w-7 place-items-center rounded-lg text-slate-400 hover:bg-slate-100"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <p className="text-[14px] font-bold text-slate-900">
          {monthOffset === 0 ? calendarMeta.monthLabel : `Tháng ${9 + monthOffset}, 2026`}
        </p>
        <button
          aria-label="Tháng sau"
          onClick={() => setMonthOffset((v) => v + 1)}
          className="grid h-7 w-7 place-items-center rounded-lg text-slate-400 hover:bg-slate-100"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Week header */}
      <div className="grid grid-cols-7 text-center text-[11.5px] font-medium text-slate-400">
        {calendarMeta.weekDays.map((w) => (
          <span key={w} className="py-1.5">
            {w}
          </span>
        ))}
      </div>
      {/* Days */}
      <div className="grid grid-cols-7 text-center text-[13px]">
        {grid.map((d, i) =>
          d === null ? (
            <span key={`e-${i}`} />
          ) : (
            <button
              key={d}
              onClick={() => setSelectedDay(d)}
              className={`relative mx-auto grid h-8 w-8 place-items-center rounded-lg transition ${
                d === selectedDay
                  ? "bg-blue-600 font-bold text-white shadow-sm shadow-blue-600/40"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              {d}
              {calendarMeta.dottedDays.includes(d) && d !== selectedDay && (
                <span className="absolute bottom-1 h-1 w-1 rounded-full bg-orange-400" />
              )}
            </button>
          ),
        )}
      </div>

      {/* Events of selected day */}
      <ul className="mt-4 divide-y divide-slate-100 border-t border-slate-100">
        {(filtered.length > 0 ? filtered : events).map((e) => (
          <li key={e.id}>
            <button
              onClick={() => onSelectEvent(e)}
              className="group flex w-full items-center gap-3 py-3 text-left"
            >
              <span className={`mt-1 h-2.5 w-2.5 shrink-0 self-start rounded-full ${DOT[e.type]}`} />
              <span className="min-w-0 flex-1">
                <span className="block text-[12px] text-slate-500">
                  {e.startTime} - {e.endTime}
                </span>
                <span className="block truncate text-[14px] font-bold text-slate-900 group-hover:text-blue-700">
                  {e.title}
                </span>
                <span className="block truncate text-[12.5px] text-slate-500">{e.className}</span>
              </span>
              <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
