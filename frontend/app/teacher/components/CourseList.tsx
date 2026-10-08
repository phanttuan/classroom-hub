"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowRight, Eye, MoreVertical, Pencil, Plus, Archive, Lock, RotateCcw } from "lucide-react";
import type { TeacherClass } from "@/lib/types/teacher";

export default function CourseList({
  classes,
  onCreate,
  onView,
  onEdit,
  onDelete,
  onChangeStatus,
}: {
  classes: TeacherClass[];
  onCreate: () => void;
  onView: (c: TeacherClass) => void;
  onEdit: (c: TeacherClass) => void;
  onDelete?: (c: TeacherClass) => void;
  onChangeStatus?: (c: TeacherClass, targetStatus: "active" | "closed" | "archived") => void;
}) {
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpenMenuId(null);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <section className="rounded-xl border border-slate-200/70 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.05)]">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-[17px] font-bold text-slate-900">Lớp học của tôi</h2>
        <div className="flex items-center gap-4">
          <a href="/teacher/content/courses" className="text-[13px] font-medium text-blue-600 hover:text-blue-700">
            Xem tất cả <ArrowRight className="inline h-3.5 w-3.5" />
          </a>
          <button
            onClick={onCreate}
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-2 text-[13px] font-semibold text-white shadow-sm shadow-blue-600/30 transition hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" /> Tạo lớp học
          </button>
        </div>
      </div>

      <div ref={wrapRef} className="space-y-3">
        {classes.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 py-10 text-center">
            <p className="text-[14px] font-semibold text-slate-700">Chưa có lớp học nào</p>
            <p className="mt-1 max-w-[360px] text-[13px] text-slate-400">
              Hãy bấm nút &quot;Tạo lớp học&quot; để bắt đầu giảng dạy và chia sẻ mã lớp cho sinh viên.
            </p>
            <button
              onClick={onCreate}
              className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-[13px] font-semibold text-white shadow-sm transition hover:bg-blue-700"
            >
              <Plus className="h-4 w-4" /> Tạo lớp học ngay
            </button>
          </div>
        )}
        {classes.map((c) => (
          <div
            key={c.id}
            className="flex items-center gap-4 rounded-xl border border-slate-200/70 p-3 transition hover:border-blue-200 hover:shadow-md hover:shadow-blue-100"
          >
            {/* Thumb */}
            <div
              className={`grid h-[68px] w-[88px] shrink-0 place-items-center overflow-hidden rounded-lg bg-gradient-to-br text-3xl ${c.coverGradient}`}
              aria-hidden
            >
              <span>{c.coverEmoji}</span>
            </div>

            <div className="min-w-0 flex-1">
              <p className="truncate text-[15px] font-bold text-slate-900">{c.name}</p>
              <p className="mt-0.5 text-[13px] text-slate-500">Mã lớp: {c.code}</p>
              <p className="mt-1 truncate text-[13px] text-slate-500">
                {c.studentCount} sinh viên <span className="mx-1 text-slate-300">|</span>{" "}
                {c.courseCount} topic <span className="mx-1 text-slate-300">|</span> Cập
                nhật: {c.updatedAt}
              </p>
            </div>

            <span
              className={`hidden shrink-0 whitespace-nowrap rounded-full px-3 py-1 text-[11.5px] font-semibold sm:inline-flex items-center gap-1.5 border shadow-xs ${
                c.status === "active"
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : c.status === "closed"
                  ? "bg-slate-50 text-slate-600 border-slate-200"
                  : "bg-amber-50 text-amber-700 border-amber-200"
              }`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  c.status === "active"
                    ? "bg-emerald-500 animate-pulse"
                    : c.status === "closed"
                    ? "bg-slate-400"
                    : "bg-amber-500"
                }`}
              />
              {c.status === "active"
                ? "Đang hoạt động"
                : c.status === "closed"
                ? "Đã đóng"
                : "Đã lưu trữ"}
            </span>

            {/* ⋮ menu */}
            <div className="relative shrink-0">
              <button
                onClick={() => setOpenMenuId(openMenuId === c.id ? null : c.id)}
                aria-label={`Tùy chọn lớp ${c.name}`}
                className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
              >
                <MoreVertical className="h-5 w-5" />
              </button>
              {openMenuId === c.id && (
                <div className="absolute right-0 top-[calc(100%+4px)] z-20 w-48 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-xl shadow-slate-900/10">
                  <button
                    onClick={() => {
                      setOpenMenuId(null);
                      onView(c);
                    }}
                    className="flex w-full items-center gap-2 px-3.5 py-2 text-left text-[13px] text-slate-600 hover:bg-slate-50"
                  >
                    <Eye className="h-4 w-4" /> Xem chi tiết
                  </button>
                  {c.status !== "archived" && (
                    <button
                      onClick={() => {
                        setOpenMenuId(null);
                        onEdit(c);
                      }}
                      className="flex w-full items-center gap-2 px-3.5 py-2 text-left text-[13px] text-slate-600 hover:bg-slate-50"
                    >
                      <Pencil className="h-4 w-4" /> Chỉnh sửa
                    </button>
                  )}
                  {c.status === "active" && (
                    <button
                      onClick={() => {
                        setOpenMenuId(null);
                        if (onChangeStatus) onChangeStatus(c, "closed");
                      }}
                      className="flex w-full items-center gap-2 px-3.5 py-2 text-left text-[13px] text-amber-600 hover:bg-amber-50"
                    >
                      <Lock className="h-4 w-4" /> Đóng lớp học
                    </button>
                  )}
                  {c.status === "closed" && (
                    <button
                      onClick={() => {
                        setOpenMenuId(null);
                        if (onChangeStatus) onChangeStatus(c, "active");
                      }}
                      className="flex w-full items-center gap-2 px-3.5 py-2 text-left text-[13px] text-blue-600 hover:bg-blue-50"
                    >
                      <RotateCcw className="h-4 w-4" /> Mở lại lớp học
                    </button>
                  )}
                  {c.status !== "archived" && (
                    <button
                      onClick={() => {
                        setOpenMenuId(null);
                        if (onChangeStatus) onChangeStatus(c, "archived");
                        else if (onDelete) onDelete(c);
                      }}
                      className="flex w-full items-center gap-2 px-3.5 py-2 text-left text-[13px] text-slate-600 hover:bg-slate-50"
                    >
                      <Archive className="h-4 w-4" /> Lưu trữ lớp học
                    </button>
                  )}
                  {c.status === "archived" && (
                    <button
                      onClick={() => {
                        setOpenMenuId(null);
                        if (onChangeStatus) onChangeStatus(c, "active");
                      }}
                      className="flex w-full items-center gap-2 px-3.5 py-2 text-left text-[13px] text-blue-600 hover:bg-blue-50"
                    >
                      <RotateCcw className="h-4 w-4" /> Khôi phục lớp học
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
