"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowRight, Eye, MoreVertical, Pencil, Plus, Trash2 } from "lucide-react";
import type { TeacherClass } from "@/lib/types/teacher";

export default function ClassList({
  classes,
  onCreate,
  onView,
  onEdit,
  onDelete,
}: {
  classes: TeacherClass[];
  onCreate: () => void;
  onView: (c: TeacherClass) => void;
  onEdit: (c: TeacherClass) => void;
  onDelete: (c: TeacherClass) => void;
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
          <a href="/teacher/classes" className="text-[13px] font-medium text-blue-600 hover:text-blue-700">
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
          <p className="rounded-lg bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
            Không tìm thấy lớp học nào. Thử từ khóa khác hoặc tạo lớp mới.
          </p>
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
                {c.courseCount} khóa học <span className="mx-1 text-slate-300">|</span> Cập
                nhật: {c.updatedAt}
              </p>
            </div>

            <span
              className={`hidden shrink-0 whitespace-nowrap rounded-full px-3.5 py-1.5 text-[12px] font-medium sm:inline-block ${
                c.status === "active"
                  ? "bg-green-100/80 text-green-700"
                  : "bg-slate-100 text-slate-500"
              }`}
            >
              {c.status === "active" ? "Đang hoạt động" : "Đã đóng"}
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
                <div className="absolute right-0 top-[calc(100%+4px)] z-20 w-44 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-xl shadow-slate-900/10">
                  <button
                    onClick={() => {
                      setOpenMenuId(null);
                      onView(c);
                    }}
                    className="flex w-full items-center gap-2 px-3.5 py-2 text-left text-[13px] text-slate-600 hover:bg-slate-50"
                  >
                    <Eye className="h-4 w-4" /> Xem chi tiết
                  </button>
                  <button
                    onClick={() => {
                      setOpenMenuId(null);
                      onEdit(c);
                    }}
                    className="flex w-full items-center gap-2 px-3.5 py-2 text-left text-[13px] text-slate-600 hover:bg-slate-50"
                  >
                    <Pencil className="h-4 w-4" /> Chỉnh sửa
                  </button>
                  <button
                    onClick={() => {
                      setOpenMenuId(null);
                      onDelete(c);
                    }}
                    className="flex w-full items-center gap-2 px-3.5 py-2 text-left text-[13px] text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" /> Xóa lớp
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
