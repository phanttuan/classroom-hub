"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  Eye,
  LayoutGrid,
  List,
  MoreVertical,
  Pencil,
  Plus,
  Search,
  Trash2,
  AlertCircle,
  Loader2,
  X,
} from "lucide-react";
import TeacherShell from "../../components/TeacherShell";
import { fetchTeacherClasses } from "@/lib/api/class-api";
import {
  fetchCoursesByClass,
  createCourse,
  updateCourse,
  deleteCourse,
} from "@/lib/api/learning-content-api";
import type { TeacherClass } from "@/lib/types/teacher";
import type { CourseDto } from "@/lib/types/learning-content";
import { mapClassroomDtoToTeacherClass } from "@/lib/types/class";

const GRADIENTS = [
  "from-blue-600 via-indigo-600 to-sky-700",
  "from-emerald-600 via-teal-600 to-cyan-700",
  "from-purple-600 via-violet-600 to-indigo-700",
  "from-amber-600 via-orange-600 to-rose-700",
];

export default function TeacherCoursesPage() {
  const router = useRouter();
  const [topSearch, setTopSearch] = useState("");
  const [query, setQuery] = useState("");
  const [selectedClassId, setSelectedClassId] = useState<string>("all");
  const [sort, setSort] = useState("Sort by course name");
  const [view, setView] = useState<"grid" | "list">("grid");

  const [classes, setClasses] = useState<TeacherClass[]>([]);
  const [courses, setCourses] = useState<CourseDto[]>([]);
  const [loading, setLoading] = useState(true);

  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<CourseDto | null>(null);
  const [courseTitleInput, setCourseTitleInput] = useState("");
  const [targetClassInput, setTargetClassInput] = useState("");
  const [modalError, setModalError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [toastMessage, setToastMessage] = useState("");
  const timer = useRef<number | undefined>(undefined);
  const showToast = (m: string) => {
    setToastMessage(m);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setToastMessage(""), 2500);
  };

  const handleOpenCreateModal = () => {
    setEditing(null);
    setCourseTitleInput("");
    setTargetClassInput(classes[0]?.id ? String(classes[0].id) : "");
    setModalError(null);
    setCreateOpen(true);
  };

  const handleOpenEditModal = (course: CourseDto) => {
    setEditing(course);
    setCourseTitleInput(course.title);
    setTargetClassInput(String(course.classId));
    setModalError(null);
    setCreateOpen(true);
  };

  // Tải danh sách lớp học và khóa học thật từ Backend
  useEffect(() => {
    let isActive = true;

    async function fetchData() {
      setLoading(true);
      try {
        const classRes = await fetchTeacherClasses({ limit: 50 });
        if (!isActive) return;
        if (classRes?.items && classRes.items.length > 0) {
          const mapped = classRes.items.map(mapClassroomDtoToTeacherClass);
          setClasses(mapped);

          const allFetchedCourses: CourseDto[] = [];
          for (const c of mapped) {
            try {
              const list = await fetchCoursesByClass(c.id);
              if (Array.isArray(list) && list.length > 0) {
                allFetchedCourses.push(
                  ...list.map((item) => ({
                    ...item,
                    classroom: {
                      id: c.id,
                      name: c.name,
                      classCode: c.code,
                      status: c.status,
                    },
                  }))
                );
              }
            } catch {}
          }

          if (!isActive) return;
          setCourses(allFetchedCourses);
        } else {
          setClasses([]);
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

    fetchData();

    return () => {
      isActive = false;
    };
  }, []);

  const refreshData = async () => {
    try {
      const classRes = await fetchTeacherClasses({ limit: 50 });
      if (classRes?.items && classRes.items.length > 0) {
        const mapped = classRes.items.map(mapClassroomDtoToTeacherClass);
        setClasses(mapped);

        const allFetchedCourses: CourseDto[] = [];
        for (const c of mapped) {
          try {
            const list = await fetchCoursesByClass(c.id);
            if (Array.isArray(list) && list.length > 0) {
              allFetchedCourses.push(
                ...list.map((item) => ({
                  ...item,
                  classroom: {
                    id: c.id,
                    name: c.name,
                    classCode: c.code,
                    status: c.status,
                  },
                }))
              );
            }
          } catch {}
        }

        setCourses(allFetchedCourses);
      } else {
        setClasses([]);
        setCourses([]);
      }
    } catch {
      showToast("Không thể tải lại danh sách khóa học");
    }
  };

  // Bộ lọc khóa học
  const filtered = useMemo(() => {
    const q = (query || topSearch).trim().toLowerCase();
    let list = [...courses];
    if (selectedClassId !== "all") {
      list = list.filter((c) => String(c.classId) === selectedClassId);
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
    } else if (sort === "Mới nhất") {
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
    return list;
  }, [courses, query, topSearch, selectedClassId, sort]);

  // Lưu tạo mới hoặc chỉnh sửa khóa học
  const handleSaveCourse = async () => {
    const title = courseTitleInput.trim();
    if (!title) {
      setModalError("Vui lòng nhập tên khóa học");
      return;
    }

    const classId = targetClassInput || (classes[0]?.id ? String(classes[0].id) : "");
    if (!editing && !classId) {
      setModalError("Vui lòng chọn lớp học tương ứng cho khóa học");
      return;
    }

    setIsSaving(true);
    setModalError(null);
    try {
      if (editing) {
        await updateCourse(editing.id, title);
        showToast("Đã cập nhật khóa học");
      } else {
        await createCourse(classId, title);
        showToast("Đã tạo khóa học mới thành công!");
      }
      setCreateOpen(false);
      setEditing(null);
      await refreshData();
    } catch (err: unknown) {
      const error = err as { message?: string };
      const msg = error?.message || (editing ? "Cập nhật khóa học thất bại" : "Tạo khóa học mới thất bại");
      setModalError(msg);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteCourse = async (courseId: string) => {
    if (!confirm("Bạn có chắc chắn muốn xóa khóa học này cùng toàn bộ bài học bên trong?")) return;
    try {
      await deleteCourse(courseId);
      showToast("Đã xóa khóa học");
      await refreshData();
    } catch {
      showToast("Xóa khóa học thất bại");
    }
  };

  return (
    <TeacherShell
      activeId="content"
      activeHref="/teacher/content/courses"
      searchPlaceholder="Tìm kiếm khóa học..."
      searchValue={topSearch}
      onSearchChange={setTopSearch}
    >
      <div className="mx-auto max-w-7xl">
        {toastMessage && (
          <div className="fixed bottom-6 right-6 z-[100] flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-[13.5px] font-medium text-white shadow-2xl">
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Breadcrumb & Tiêu đề */}
        <p className="text-[13px] text-slate-500">
          <ChevronLeft className="inline h-3.5 w-3.5" /> Nội dung học tập{" "}
          <span className="mx-1">›</span>{" "}
          <span className="font-medium text-slate-700">Khóa học</span>
        </p>

        <div className="mt-1 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-[26px] font-black tracking-tight text-slate-900">
              Các khoá học của tôi
            </h1>
            <p className="mt-0.5 text-[14px] text-slate-500">
              Tổng quan về các khóa học bạn đang phụ trách và giảng dạy
            </p>
          </div>
          <button
            onClick={handleOpenCreateModal}
            className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-5 py-2.5 text-[14px] font-bold text-white shadow-md shadow-blue-600/20 transition hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" /> Tạo khoá học mới
          </button>
        </div>

        {/* Thanh công cụ lọc và sắp xếp (Ảnh 1: UTEx LMS my/courses.php) */}
        <div className="mt-6 rounded-2xl border border-slate-200/90 bg-white p-4 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-[16px] font-bold text-slate-800">
              Tổng quan về khóa học
            </h2>
            <div className="text-[12px] text-slate-500">
              Hiển thị <span className="font-bold text-slate-800">{filtered.length}</span> khóa học
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-3">
            {/* Filter Lớp học */}
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-[13px] font-semibold text-slate-700 outline-none focus:border-blue-500"
            >
              <option value="all">All (Tất cả lớp)</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.code})
                </option>
              ))}
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
              <option value="Mới nhất">Mới nhất</option>
            </select>

            {/* Dạng hiển thị Card / List */}
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
              📚
            </div>
            <h3 className="mt-4 text-lg font-bold text-slate-800">Không có khóa học nào</h3>
            <p className="mt-1 max-w-sm text-sm text-slate-500">
              {query || selectedClassId !== "all"
                ? "Không tìm thấy khóa học phù hợp với bộ lọc hiện tại."
                : "Chưa có khóa học nào được tạo. Hãy tạo khóa học đầu tiên để bắt đầu xây dựng bài học."}
            </p>
            <button
              onClick={handleOpenCreateModal}
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-blue-500/20 hover:bg-blue-700"
            >
              <Plus className="h-4 w-4" /> Tạo khóa học mới
            </button>
          </div>
        ) : view === "grid" ? (
          <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((course, idx) => {
              const gradient = GRADIENTS[idx % GRADIENTS.length];
              return (
                <div
                  key={course.id}
                  className="group relative flex flex-col overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-xs transition-all duration-200 hover:-translate-y-1 hover:shadow-xl"
                >
                  {/* Banner Card lớn với ảnh avatar mặc định chuẩn logo EduHub */}
                  <div
                    onClick={() => router.push(`/teacher/content/courses/${course.id}`)}
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

                        {/* Nút 3 chấm menu */}
                        <div
                          className="relative"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            onClick={() =>
                              setOpenMenuId(openMenuId === course.id ? null : course.id)
                            }
                            className="grid h-8 w-8 place-items-center rounded-lg bg-black/20 text-white backdrop-blur-md hover:bg-black/40"
                          >
                            <MoreVertical className="h-4 w-4" />
                          </button>

                          {openMenuId === course.id && (
                            <div className="absolute right-0 top-full z-30 mt-1 w-44 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 text-slate-700 shadow-2xl">
                              <button
                                onClick={() => {
                                  setOpenMenuId(null);
                                  router.push(`/teacher/content/courses/${course.id}`);
                                }}
                                className="flex w-full items-center gap-2 px-3.5 py-2 text-[13px] hover:bg-slate-50"
                              >
                                <Eye className="h-4 w-4 text-blue-600" /> Vào khóa học
                              </button>
                              <button
                                onClick={() => {
                                  setOpenMenuId(null);
                                  handleOpenEditModal(course);
                                }}
                                className="flex w-full items-center gap-2 px-3.5 py-2 text-[13px] hover:bg-slate-50"
                              >
                                <Pencil className="h-4 w-4 text-slate-600" /> Đổi tên
                              </button>
                              <button
                                onClick={() => {
                                  setOpenMenuId(null);
                                  handleDeleteCourse(course.id);
                                }}
                                className="flex w-full items-center gap-2 px-3.5 py-2 text-[13px] text-red-600 hover:bg-red-50"
                              >
                                <Trash2 className="h-4 w-4" /> Xóa
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="text-right text-xs opacity-70">
                        {course.moduleCount || course.modules?.length || 0} module
                      </div>
                    </div>
                  </div>

                  {/* Thông tin bên dưới Card */}
                  <div className="flex flex-1 flex-col justify-between p-4">
                    <div>
                      <Link
                        href={`/teacher/content/courses/${course.id}`}
                        className="block text-[15.5px] font-black text-slate-900 transition hover:text-blue-600 line-clamp-2"
                      >
                        {course.title}
                      </Link>
                      <p className="mt-1 text-[12.5px] text-slate-500 line-clamp-1">
                        {course.classroom?.name || "Lớp học"}
                      </p>
                    </div>

                    <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
                      <span className="text-[12px] text-slate-400">
                        {course.totalLessons || 0} bài học
                      </span>
                      <Link
                        href={`/teacher/content/courses/${course.id}`}
                        className="flex items-center gap-1 text-[13px] font-bold text-blue-600 hover:underline"
                      >
                        Truy cập <span>→</span>
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
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
                      href={`/teacher/content/courses/${course.id}`}
                      className="text-[15px] font-bold text-slate-900 hover:text-blue-600"
                    >
                      {course.title}
                    </Link>
                    <p className="text-[12.5px] text-slate-500">
                      {course.classroom?.name} ({course.classroom?.classCode})
                    </p>
                  </div>
                </div>
                <Link
                  href={`/teacher/content/courses/${course.id}`}
                  className="rounded-lg bg-blue-50 px-3.5 py-1.5 text-[13px] font-semibold text-blue-600 hover:bg-blue-100"
                >
                  Vào khóa học
                </Link>
              </div>
            ))}
          </div>
        )}

        {/* Modal tạo / sửa khóa học */}
        {createOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
              <div className="flex items-center justify-between">
                <h3 className="text-[18px] font-bold text-slate-900">
                  {editing ? "Đổi tên khóa học" : "Tạo khóa học mới"}
                </h3>
                <button
                  type="button"
                  onClick={() => {
                    setCreateOpen(false);
                    setModalError(null);
                  }}
                  className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Thông báo lỗi nằm trực tiếp trên popup */}
              {modalError && (
                <div className="mt-3.5 flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3 text-[13px] text-red-700">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
                  <div className="flex-1 font-medium leading-relaxed">{modalError}</div>
                </div>
              )}

              <div className="mt-4 space-y-3.5">
                <div>
                  <label className="mb-1.5 block text-[13px] font-semibold text-slate-700">
                    Tên khóa học *
                  </label>
                  <input
                    type="text"
                    value={courseTitleInput}
                    onChange={(e) => {
                      setCourseTitleInput(e.target.value);
                      if (modalError) setModalError(null);
                    }}
                    placeholder="VD: Lập trình Web nâng cao..."
                    className="h-11 w-full rounded-lg border border-slate-300 px-3.5 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                  />
                </div>

                {!editing && (
                  <div>
                    <label className="mb-1.5 block text-[13px] font-semibold text-slate-700">
                      Thuộc lớp học
                    </label>
                    <select
                      value={targetClassInput}
                      onChange={(e) => {
                        setTargetClassInput(e.target.value);
                        if (modalError) setModalError(null);
                      }}
                      className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-blue-500"
                    >
                      {classes.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} ({c.code})
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div className="mt-6 flex justify-end gap-2.5">
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={() => {
                    setCreateOpen(false);
                    setModalError(null);
                  }}
                  className="rounded-lg px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 disabled:opacity-50"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={handleSaveCourse}
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white shadow-xs hover:bg-blue-700 disabled:opacity-60 transition"
                >
                  {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                  <span>{isSaving ? "Đang lưu..." : "Lưu"}</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </TeacherShell>
  );
}
