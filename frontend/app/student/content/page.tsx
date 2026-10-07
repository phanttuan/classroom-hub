"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  LayoutGrid,
  List,
  Search,
} from "lucide-react";
import StudentShell from "../components/StudentShell";
import type { CourseDto } from "@/lib/types/learning-content";
import { fetchStudentClasses } from "@/lib/api/class-api";
import { fetchCoursesByClass } from "@/lib/api/learning-content-api";

const GRADIENTS = [
  "from-blue-600 via-indigo-600 to-sky-700",
  "from-emerald-600 via-teal-600 to-cyan-700",
  "from-purple-600 via-violet-600 to-indigo-700",
  "from-amber-600 via-orange-600 to-rose-700",
];

export default function StudentContentPage() {
  const router = useRouter();
  const [topSearch, setTopSearch] = useState("");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sort, setSort] = useState("Sort by course name");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [courses, setCourses] = useState<CourseDto[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isActive = true;

    async function loadData() {
      setLoading(true);
      try {
        const classRes = await fetchStudentClasses({ limit: 50 });
        if (!isActive) return;

        if (classRes?.items && classRes.items.length > 0) {
          const allCourses: CourseDto[] = [];
          for (const c of classRes.items) {
            try {
              const list = await fetchCoursesByClass(String(c.id));
              if (Array.isArray(list) && list.length > 0) {
                allCourses.push(
                  ...list.map((item) => ({
                    ...item,
                    classroom: {
                      id: String(c.id),
                      name: c.name,
                      classCode: c.classCode,
                      status: c.status,
                    },
                  }))
                );
              }
            } catch {}
          }

          if (!isActive) return;
          setCourses(allCourses);
        } else {
          setCourses([]);
        }
      } catch {
        if (!isActive) return;
        setCourses([]);
      } finally {
        if (isActive) {
          setLoading(false);
        }
      }
    }

    loadData();

    return () => {
      isActive = false;
    };
  }, []);

  const filtered = useMemo(() => {
    const q = (query || topSearch).trim().toLowerCase();
    let list = [...courses];
    if (statusFilter === "in-progress") {
      list = list.filter((c) => (c.progressPercent || 0) < 100);
    } else if (statusFilter === "completed") {
      list = list.filter((c) => (c.progressPercent || 0) === 100);
    }
    if (q) {
      list = list.filter(
        (c) =>
          c.title.toLowerCase().includes(q) ||
          c.classroom?.name?.toLowerCase().includes(q) ||
          c.classroom?.classCode?.toLowerCase().includes(q)
      );
    }
    if (sort === "Sort by course name") {
      list.sort((a, b) => a.title.localeCompare(b.title, "vi"));
    } else if (sort === "Tiến độ cao nhất") {
      list.sort((a, b) => (b.progressPercent || 0) - (a.progressPercent || 0));
    }
    return list;
  }, [courses, query, topSearch, statusFilter, sort]);

  return (
    <StudentShell
      activeId="content"
      activeHref="/student/content"
      searchPlaceholder="Tìm kiếm khóa học..."
      searchValue={topSearch}
      onSearchChange={setTopSearch}
    >
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-[26px] font-black tracking-tight text-slate-900">
              Các khoá học của tôi
            </h1>
            <p className="mt-0.5 text-[14px] text-slate-500">
              Theo dõi và hoàn thành bài học trong các khóa học bạn đang tham gia
            </p>
          </div>
        </div>

        {/* Bảng điều khiển bộ lọc (Ảnh 1) */}
        <div className="mt-6 rounded-2xl border border-slate-200/90 bg-white p-4 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-[16px] font-bold text-slate-800">
              Tổng quan về khóa học
            </h2>
            <div className="text-[12px] text-slate-500">
              Bạn có <span className="font-bold text-slate-800">{filtered.length}</span> khóa học
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-3">
            {/* Filter trạng thái */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-[13px] font-semibold text-slate-700 outline-none focus:border-blue-500"
            >
              <option value="all">All (Tất cả khóa học)</option>
              <option value="in-progress">Đang học (Chưa hoàn thành)</option>
              <option value="completed">Đã hoàn thành 100%</option>
            </select>

            {/* Ô tìm kiếm */}
            <div className="relative min-w-[200px] flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Tìm kiếm..."
                className="h-10 w-full rounded-lg border border-slate-300 pl-9 pr-3 text-[13px] outline-none focus:border-blue-500"
              />
            </div>

            {/* Sắp xếp */}
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-[13px] text-slate-700 outline-none focus:border-blue-500"
            >
              <option value="Sort by course name">Sort by course name</option>
              <option value="Tiến độ cao nhất">Tiến độ cao nhất</option>
            </select>

            {/* Chuyển dạng View */}
            <div className="flex overflow-hidden rounded-lg border border-slate-300">
              <button
                onClick={() => setView("grid")}
                title="Dạng Card"
                className={`flex h-10 items-center gap-1.5 px-3 text-[13px] font-semibold ${
                  view === "grid"
                    ? "bg-blue-600 text-white"
                    : "bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                <LayoutGrid className="h-4 w-4" /> Card
              </button>
              <button
                onClick={() => setView("list")}
                title="Dạng Danh sách"
                className={`flex h-10 items-center gap-1.5 px-3 text-[13px] font-semibold ${
                  view === "list"
                    ? "bg-blue-600 text-white"
                    : "bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                <List className="h-4 w-4" /> List
              </button>
            </div>
          </div>
        </div>

        {/* Trạng thái tải dữ liệu */}
        {loading ? (
          <div className="mt-12 flex flex-col items-center justify-center py-12 text-center">
            <div className="h-9 w-9 animate-spin rounded-full border-3 border-blue-600 border-t-transparent" />
            <p className="mt-3 text-sm font-medium text-slate-500">Đang tải danh sách khóa học...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="mt-8 flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-white py-16 text-center">
            <div className="grid h-16 w-16 place-items-center rounded-2xl bg-blue-50 text-3xl">
              🎓
            </div>
            <h3 className="mt-4 text-lg font-bold text-slate-800">Không có khóa học nào</h3>
            <p className="mt-1 max-w-sm text-sm text-slate-500">
              {query || statusFilter !== "all"
                ? "Không tìm thấy khóa học phù hợp với bộ lọc hiện tại."
                : "Bạn chưa được ghi danh vào lớp học nào có khóa học đang hoạt động."}
            </p>
            <Link
              href="/student/classes"
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-blue-500/20 hover:bg-blue-700"
            >
              Xem danh sách lớp học
            </Link>
          </div>
        ) : view === "grid" ? (
          <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((course, idx) => {
              const gradient = GRADIENTS[idx % GRADIENTS.length];
              const pct = course.progressPercent || 0;
              return (
                <div
                  key={course.id}
                  className="group relative flex flex-col overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-xs transition-all duration-200 hover:-translate-y-1 hover:shadow-xl"
                >
                  {/* Banner Card với ảnh avatar mặc định chuẩn logo EduHub */}
                  <div
                    onClick={() => router.push(`/student/content/courses/${course.id}`)}
                    className="relative h-44 cursor-pointer overflow-hidden bg-slate-900 p-4 text-white transition-opacity group-hover:opacity-95"
                  >
                    {/* Ảnh avatar thương hiệu EduHub */}
                    <div
                      className="absolute inset-0 bg-cover bg-center transition-transform duration-500 ease-out group-hover:scale-105"
                      style={{ backgroundImage: `url('/images/course-default-avatar.jpg')` }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/25 to-slate-950/40" />

                    <div className="relative z-10 flex h-full flex-col justify-between">
                      <div className="flex items-start justify-between">
                        <span className="rounded-md bg-white/20 px-2.5 py-1 text-[11px] font-bold backdrop-blur-md">
                          {course.classroom?.classCode || "LỚP HỌC"}
                        </span>
                        {pct === 100 ? (
                          <span className="flex items-center gap-1 rounded-full bg-emerald-500/90 px-2.5 py-0.5 text-[11px] font-bold text-white shadow-xs">
                            <CheckCircle2 className="h-3.5 w-3.5" /> Hoàn thành
                          </span>
                        ) : (
                          <span className="rounded-full bg-black/30 px-2.5 py-0.5 text-[11px] font-bold text-white">
                            {pct}%
                          </span>
                        )}
                      </div>

                      <div className="text-right text-xs opacity-80">
                        {course.completedLessons || 0}/{course.totalLessons || 0} bài học
                      </div>
                    </div>
                  </div>

                  {/* Chi tiết bên dưới Card */}
                  <div className="flex flex-1 flex-col justify-between p-4">
                    <div>
                      <Link
                        href={`/student/content/courses/${course.id}`}
                        className="block text-[15.5px] font-black text-slate-900 transition hover:text-blue-600 line-clamp-2"
                      >
                        {course.title}
                      </Link>
                      <p className="mt-1 text-[12.5px] text-slate-500 line-clamp-1">
                        {course.classroom?.name}
                      </p>
                    </div>

                    <div className="mt-4 border-t border-slate-100 pt-3">
                      {/* Progress Bar */}
                      <div className="flex items-center justify-between text-[12px] mb-1.5">
                        <span className="text-slate-500">Tiến độ học tập</span>
                        <span className="font-bold text-blue-600">{pct}%</span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                        <div
                          className={`h-full transition-all duration-300 ${
                            pct === 100 ? "bg-emerald-500" : "bg-blue-600"
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>

                      <div className="mt-3 flex items-center justify-end">
                        <Link
                          href={`/student/content/courses/${course.id}`}
                          className="flex items-center gap-1 text-[13px] font-bold text-blue-600 hover:underline"
                        >
                          Vào học ngay <span>→</span>
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* View List */
          <div className="mt-6 divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
            {filtered.map((course) => (
              <div
                key={course.id}
                className="flex items-center justify-between p-4 hover:bg-slate-50 transition"
              >
                <div className="flex items-center gap-3.5">
                  <div
                    className="h-12 w-16 shrink-0 rounded-lg bg-cover bg-center border border-slate-200 shadow-2xs"
                    style={{ backgroundImage: `url('/images/course-default-avatar.jpg')` }}
                  />
                  <div>
                    <Link
                      href={`/student/content/courses/${course.id}`}
                      className="text-[15px] font-bold text-slate-900 hover:text-blue-600"
                    >
                      {course.title}
                    </Link>
                    <p className="text-[12.5px] text-slate-500">
                      {course.classroom?.name} ({course.classroom?.classCode}) • Tiến độ:{" "}
                      {course.progressPercent}%
                    </p>
                  </div>
                </div>
                <Link
                  href={`/student/content/courses/${course.id}`}
                  className="rounded-lg bg-blue-600 px-4 py-1.5 text-[13px] font-semibold text-white hover:bg-blue-700 shadow-xs"
                >
                  Vào học
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </StudentShell>
  );
}
