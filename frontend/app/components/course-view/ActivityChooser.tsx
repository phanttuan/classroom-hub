"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { CHOOSER_ITEMS, type ChooserItem } from "@/lib/lesson-types";
import type { LessonTypeKey } from "@/lib/types/learning-content";

const TABS = [
  { id: "all", label: "Tất cả" },
  { id: "activity", label: "Hoạt động" },
  { id: "resource", label: "Tài nguyên" },
] as const;

/** Bộ chọn "Thêm hoạt động hoặc tài nguyên" — theo activity chooser của Moodle */
export default function ActivityChooser({ onSelect }: { onSelect: (type: LessonTypeKey) => void }) {
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("all");
  const [query, setQuery] = useState("");
  const [info, setInfo] = useState<ChooserItem | null>(null);

  const q = query.trim().toLowerCase();
  const items = CHOOSER_ITEMS.filter(
    (i) =>
      (tab === "all" || i.category === tab) &&
      (!q || i.label.toLowerCase().includes(q) || i.summary.toLowerCase().includes(q))
  );

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 pt-4">
        <div className="flex gap-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`border-b-2 px-3 pb-3 text-[14px] font-semibold transition ${
                tab === t.id ? "border-[#0f6cbf] text-[#0f6cbf]" : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="relative mb-3 w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Tìm kiếm"
            className="h-9 w-full rounded-lg border border-slate-300 pl-9 pr-3 text-sm outline-none focus:border-[#0f6cbf]"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 p-5 sm:grid-cols-3 lg:grid-cols-4">
        {items.map((item) => {
          const Icon = item.icon;
          const disabled = !item.type;
          return (
            <div
              key={item.key}
              className={`group relative flex flex-col items-center rounded-xl border p-4 text-center transition ${
                disabled
                  ? "cursor-not-allowed border-slate-100 bg-slate-50/60"
                  : "cursor-pointer border-slate-200 hover:border-[#0f6cbf] hover:shadow-md"
              }`}
              onClick={() => item.type && onSelect(item.type)}
              role={disabled ? undefined : "button"}
              tabIndex={disabled ? -1 : 0}
              onKeyDown={(e) => {
                if (item.type && (e.key === "Enter" || e.key === " ")) {
                  e.preventDefault();
                  onSelect(item.type);
                }
              }}
            >
              <div className={`grid h-14 w-14 place-items-center rounded-2xl ${item.iconClass} ${disabled ? "opacity-50" : ""}`}>
                <Icon className="h-7 w-7" />
              </div>
              <p className={`mt-3 text-[14px] font-semibold ${disabled ? "text-slate-400" : "text-slate-800 group-hover:text-[#0f6cbf]"}`}>
                {item.label}
              </p>
              {disabled && (
                <span className="mt-1 rounded-full bg-slate-200/80 px-2 py-0.5 text-[10.5px] font-semibold text-slate-500">
                  Sắp ra mắt
                </span>
              )}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setInfo(info?.key === item.key ? null : item);
                }}
                className="mt-2 text-[12px] font-medium text-slate-400 hover:text-[#0f6cbf]"
              >
                Thông tin
              </button>
            </div>
          );
        })}
        {items.length === 0 && (
          <p className="col-span-full py-8 text-center text-sm text-slate-500">Không tìm thấy kết quả phù hợp.</p>
        )}
      </div>

      {info && (
        <div className="mx-5 mb-5 flex items-start gap-3 rounded-xl border border-blue-100 bg-blue-50/60 p-4">
          <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${info.iconClass}`}>
            <info.icon className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-slate-900">{info.label}</p>
            <p className="mt-0.5 text-[13.5px] leading-relaxed text-slate-600">{info.summary}</p>
            {info.type ? (
              <button
                onClick={() => onSelect(info.type!)}
                className="mt-2.5 rounded-lg bg-[#0f6cbf] px-4 py-1.5 text-[13px] font-semibold text-white hover:bg-[#0c599e]"
              >
                Thêm
              </button>
            ) : (
              <p className="mt-2 text-[12.5px] font-medium text-slate-500">Chức năng này đang được phát triển.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
