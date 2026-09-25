"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  Code2,
  Database,
  Filter,
  GraduationCap,
  MoreVertical,
  Palette,
  Search,
  Terminal,
  Users,
  X,
} from "lucide-react";
import AdminShell, { Toast } from "../components/AdminShell";
import AdminStatCards, { ClassStatusBadge, avatarUrl } from "../components/admin-shared";
import {
  adminClassSortOptions,
  adminClassStats,
  adminClasses,
  adminTeacherOptions,
  adminUsers,
} from "@/lib/mock/admin";
import type { AdminClass } from "@/lib/types/admin";

const TONE_BG: Record<string, string> = {
  blue: "bg-blue-50 text-blue-600",
  orange: "bg-orange-50 text-orange-500",
  purple: "bg-purple-50 text-purple-600",
  green: "bg-green-50 text-green-600",
  red: "bg-red-50 text-red-500",
  teal: "bg-teal-50 text-teal-600",
};

function ClassIcon({ code, tone, size = "md" }: { code: string; tone: string; size?: "md" | "lg" }) {
  const Icon = code.startsWith("WEB") || code.startsWith("MOB")
    ? Code2
    : code.startsWith("PY") || code.startsWith("AI") || code.startsWith("ML")
      ? Terminal
      : code.startsWith("DB")
        ? Database
        : code.startsWith("UI")
          ? Palette
          : code.startsWith("DSA")
            ? BarChart3
            : BookOpen;
  const box = size === "lg" ? "h-12 w-12" : "h-9 w-9";
  return (
    <span className={`grid ${box} shrink-0 place-items-center rounded-xl ${TONE_BG[tone] ?? "bg-blue-50 text-blue-600"}`}>
      <Icon className={size === "lg" ? "h-6 w-6" : "h-[18px] w-[18px]"} />
    </span>
  );
}

function parseDate(s: string) {
  const [d, m, y] = s.split("/").map(Number);
  return new Date(y, m - 1, d).getTime();
}

const STATUS_LABEL: Record<string, string> = {
  "Tất cả": "all",
  "Đang hoạt động": "active",
  "Tạm ngưng": "paused",
  "Không hoạt động": "inactive",
};

export default function AdminClassesPage() {
  const [topSearch, setTopSearch] = useState("");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("Tất cả");
  const [teacher, setTeacher] = useState("Tất cả");
  const [sort, setSort] = useState(adminClassSortOptions[0]);

  const [classes, setClasses] = useState<AdminClass[]>(adminClasses);
  const [selectedId, setSelectedId] = useState<string | null>("c-web301");
  const [detailTab, setDetailTab] = useState<"info" | "students" | "history">("info");
  const [checked, setChecked] = useState<string[]>([]);
  const [showAllMembers, setShowAllMembers] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [toast, setToast] = useState("");
  const menuRef = useRef<HTMLDivElement>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    window.clearTimeout((showToast as unknown as { t?: number }).t);
    (showToast as unknown as { t?: number }).t = window.setTimeout(() => setToast(""), 2600);
  };

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpenMenuId(null);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const filtered = useMemo(() => {
    const q = (query || topSearch).trim().toLowerCase();
    let list = [...classes];
    if (status !== "Tất cả") list = list.filter((c) => c.status === STATUS_LABEL[status]);
    if (teacher !== "Tất cả") list = list.filter((c) => c.teacherName === teacher);
    if (q)
      list = list.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.code.toLowerCase().includes(q) ||
          c.teacherName.toLowerCase().includes(q),
      );
    if (sort === "Ngày tạo (mới nhất)") list.sort((a, b) => parseDate(b.createdAt) - parseDate(a.createdAt));
    if (sort === "Ngày tạo (cũ nhất)") list.sort((a, b) => parseDate(a.createdAt) - parseDate(b.createdAt));
    if (sort === "Tên A-Z") list.sort((a, b) => a.name.localeCompare(b.name, "vi"));
    if (sort === "Đông thành viên nhất") list.sort((a, b) => b.memberCount - a.memberCount);
    return list;
  }, [classes, query, topSearch, status, teacher, sort]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageRows = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);
  const start = filtered.length === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const end = Math.min(safePage * pageSize, filtered.length);

  /** Reset về trang 1 mỗi khi filter thay đổi (gọi trực tiếp trong handler) */
  const resetPage = () => {
    setPage(1);
    setChecked([]);
  };

  const handleTopSearch = (v: string) => {
    setTopSearch(v);
    resetPage();
  };

  const selected = classes.find((c) => c.id === selectedId) ?? null;

  // Sinh viên hiển thị trong drawer: ưu tiên recentMembers, nếu rỗng thì lấy demo từ danh sách users
  const drawerMembers = useMemo(() => {
    if (!selected) return [];
    if (selected.recentMembers && selected.recentMembers.length > 0) return selected.recentMembers;
    return adminUsers.slice(0, 3).map((u) => ({
      id: u.id,
      fullName: u.fullName,
      code: u.code,
      avatarImg: u.avatarImg,
      joinedAt: selected.createdAt,
    }));
  }, [selected]);

  const visibleMembers = showAllMembers ? drawerMembers : drawerMembers.slice(0, 5);

  const setClassStatus = (id: string, s: AdminClass["status"]) => {
    setClasses((prev) => prev.map((c) => (c.id === id ? { ...c, status: s } : c)));
    const c = classes.find((x) => x.id === id);
    const label = s === "active" ? "kích hoạt" : s === "paused" ? "tạm ngưng" : "vô hiệu hóa";
    showToast(`Đã ${label} lớp ${c?.code ?? ""}`);
    setOpenMenuId(null);
  };

  return (
    <AdminShell
      activeId="classes"
      searchPlaceholder="Tìm kiếm lớp học, giảng viên, mã lớp..."
      searchValue={topSearch}
      onSearchChange={handleTopSearch}
    >
      <div className={`grid grid-cols-1 gap-5 ${selected ? "xl:grid-cols-[minmax(0,1fr)_380px]" : ""}`}>
        {/* ===== Cột trái ===== */}
        <div className="min-w-0">
          <div className="mb-4">
            <h1 className="text-[26px] font-extrabold tracking-tight sm:text-[30px]">
              Giám sát lớp học
            </h1>
            <p className="mt-1 text-[14px] text-slate-500">
              Xem danh sách lớp học trong hệ thống và theo dõi tình trạng hoạt động.
            </p>
          </div>

          <AdminStatCards stats={adminClassStats} compact={selected !== null} />

          <div className="mt-4 rounded-xl border border-slate-200/70 bg-white p-4">
            {/* Filter */}
            <div className="flex flex-wrap items-end gap-3">
              <div className="relative min-w-[220px] flex-1">
                <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    resetPage();
                  }}
                  placeholder="Tìm kiếm theo tên lớp, mã lớp, giảng viên..."
                  className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50/60 pl-10 pr-3 text-[13px] outline-none placeholder:text-slate-400 focus:border-blue-300 focus:bg-white focus:ring-4 focus:ring-blue-100"
                />
              </div>
              <label className="block">
                <span className="mb-1 block text-[12px] font-medium text-slate-500">Trạng thái</span>
                <span className="inline-flex h-10 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 text-[13px] text-slate-700">
                  <select value={status} onChange={(e) => { setStatus(e.target.value); resetPage(); }} className="max-w-[150px] bg-transparent outline-none">
                    {Object.keys(STATUS_LABEL).map((o) => (
                      <option key={o}>{o}</option>
                    ))}
                  </select>
                  <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
                </span>
              </label>
              <label className="block">
                <span className="mb-1 block text-[12px] font-medium text-slate-500">Giảng viên</span>
                <span className="inline-flex h-10 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 text-[13px] text-slate-700">
                  <select value={teacher} onChange={(e) => { setTeacher(e.target.value); resetPage(); }} className="max-w-[150px] bg-transparent outline-none">
                    {adminTeacherOptions().map((o) => (
                      <option key={o}>{o}</option>
                    ))}
                  </select>
                  <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
                </span>
              </label>
              <label className="block">
                <span className="mb-1 block text-[12px] font-medium text-slate-500">Sắp xếp</span>
                <span className="inline-flex h-10 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 text-[13px] text-slate-700">
                  <select value={sort} onChange={(e) => { setSort(e.target.value); resetPage(); }} className="max-w-[170px] bg-transparent outline-none">
                    {adminClassSortOptions.map((o) => (
                      <option key={o}>{o}</option>
                    ))}
                  </select>
                  <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
                </span>
              </label>
              <button
                onClick={() => showToast(`Đã lọc: ${filtered.length} lớp học`)}
                className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-blue-50 px-4 text-[13px] font-semibold text-blue-600 transition hover:bg-blue-100"
              >
                <Filter className="h-4 w-4" /> Lọc
              </button>
            </div>

            {/* Table */}
            <div className="mt-4 overflow-x-auto rounded-xl border border-slate-100">
              <table className="w-full min-w-[880px] text-left text-[13px]">
                <thead>
                  <tr className="bg-slate-50/80 text-[12px] font-medium text-slate-500">
                    <th className="px-3 py-3">
                      <input
                        type="checkbox"
                        checked={pageRows.length > 0 && pageRows.every((r) => checked.includes(r.id))}
                        onChange={() => {
                          const ids = pageRows.map((r) => r.id);
                          const all = ids.every((id) => checked.includes(id));
                          setChecked((p) => (all ? p.filter((x) => !ids.includes(x)) : [...new Set([...p, ...ids])]));
                        }}
                        aria-label="Chọn tất cả"
                        className="h-4 w-4 rounded border-slate-300 accent-blue-600"
                      />
                    </th>
                    <th className="px-2 py-3 font-medium">#</th>
                    <th className="whitespace-nowrap px-3 py-3 font-medium">Tên lớp học</th>
                    <th className="whitespace-nowrap px-3 py-3 font-medium">Mã lớp</th>
                    <th className="whitespace-nowrap px-3 py-3 font-medium">Giảng viên</th>
                    <th className="whitespace-nowrap px-3 py-3 text-center font-medium">Số thành viên</th>
                    <th className="whitespace-nowrap px-3 py-3 font-medium">Trạng thái</th>
                    <th className="whitespace-nowrap px-3 py-3 font-medium">Ngày tạo</th>
                    <th className="whitespace-nowrap px-3 py-3 text-right font-medium">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map((c, i) => (
                    <tr
                      key={c.id}
                      onClick={() => {
                        setSelectedId(c.id);
                        setDetailTab("info");
                        setShowAllMembers(false);
                      }}
                      className={`cursor-pointer border-t border-slate-100 transition hover:bg-blue-50/50 ${
                        selectedId === c.id ? "bg-blue-50/70" : ""
                      }`}
                    >
                      <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={checked.includes(c.id)}
                          onChange={() =>
                            setChecked((p) => (p.includes(c.id) ? p.filter((x) => x !== c.id) : [...p, c.id]))
                          }
                          aria-label={`Chọn ${c.name}`}
                          className="h-4 w-4 rounded border-slate-300 accent-blue-600"
                        />
                      </td>
                      <td className="px-2 py-3 text-slate-500">{(safePage - 1) * pageSize + i + 1}</td>
                      <td className="px-3 py-3">
                        <span className="flex items-center gap-2.5">
                          <ClassIcon code={c.code} tone={c.iconTone} />
                          <span className="max-w-[220px] font-medium leading-snug text-slate-800">{c.name}</span>
                        </span>
                      </td>
                      <td className="px-3 py-3 font-semibold text-slate-700">{c.code}</td>
                      <td className="px-3 py-3">
                        <span className="flex items-center gap-2">
                          <span className="h-7 w-7 overflow-hidden rounded-full bg-slate-200">
                            <Image
                              src={avatarUrl(c.teacherAvatarImg)}
                              alt={c.teacherName}
                              width={56}
                              height={56}
                              className="h-full w-full object-cover"
                              unoptimized
                            />
                          </span>
                          <span className="whitespace-nowrap text-slate-700">{c.teacherName}</span>
                        </span>
                      </td>
                      <td className="px-3 py-3 text-center text-slate-700">{c.memberCount}</td>
                      <td className="px-3 py-3">
                        <ClassStatusBadge status={c.status} />
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 text-slate-500">{c.createdAt}</td>
                      <td className="px-3 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => setOpenMenuId(openMenuId === c.id ? null : c.id)}
                          aria-label={`Thao tác ${c.name}`}
                          className="inline-grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </button>
                        {openMenuId === c.id && (
                          <span
                            ref={menuRef}
                            className="absolute z-20 mt-1 w-48 -translate-x-40 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 text-left shadow-xl"
                          >
                            <button
                              onClick={() => {
                                setSelectedId(c.id);
                                setDetailTab("students");
                                setOpenMenuId(null);
                              }}
                              className="block w-full px-3.5 py-2 text-[13px] text-slate-600 hover:bg-slate-50"
                            >
                              Xem sinh viên
                            </button>
                            <button
                              onClick={() => setClassStatus(c.id, "active")}
                              className="block w-full px-3.5 py-2 text-left text-[13px] text-green-700 hover:bg-green-50"
                            >
                              Kích hoạt lớp
                            </button>
                            <button
                              onClick={() => setClassStatus(c.id, "paused")}
                              className="block w-full px-3.5 py-2 text-left text-[13px] text-orange-600 hover:bg-orange-50"
                            >
                              Tạm ngưng lớp
                            </button>
                            <button
                              onClick={() => setClassStatus(c.id, "inactive")}
                              className="block w-full px-3.5 py-2 text-left text-[13px] text-red-600 hover:bg-red-50"
                            >
                              Vô hiệu hóa
                            </button>
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {pageRows.length === 0 && (
                <p className="px-4 py-10 text-center text-sm text-slate-500">
                  Không tìm thấy lớp học nào. Thử đổi từ khóa hoặc bộ lọc.
                </p>
              )}
            </div>

            {/* Pagination */}
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-[13px] text-slate-500">
              <span>
                Hiển thị {start} - {end} của {filtered.length} lớp học
                <span className="hidden sm:inline"> (tổng 48)</span>
                {checked.length > 0 && <span className="ml-2 font-semibold text-blue-600">• Đã chọn {checked.length}</span>}
              </span>
              <span className="flex flex-wrap items-center gap-1.5">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={safePage <= 1}
                  aria-label="Trang trước"
                  className="grid h-8 w-8 place-items-center rounded-lg border border-slate-200 text-slate-500 transition enabled:hover:bg-slate-50 disabled:opacity-40"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
                  <button
                    key={n}
                    onClick={() => setPage(n)}
                    className={`grid h-8 w-8 place-items-center rounded-lg text-[13px] font-semibold transition ${
                      n === safePage ? "bg-blue-600 text-white" : "text-slate-500 hover:bg-slate-100"
                    }`}
                  >
                    {n}
                  </button>
                ))}
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={safePage >= totalPages}
                  aria-label="Trang sau"
                  className="grid h-8 w-8 place-items-center rounded-lg border border-slate-200 text-slate-500 transition enabled:hover:bg-slate-50 disabled:opacity-40"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
                <span className="ml-2 hidden items-center gap-2 sm:inline-flex">
                  Số dòng mỗi trang
                  <span className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-200 px-2">
                    <select
                      value={pageSize}
                      onChange={(e) => {
                        setPageSize(Number(e.target.value));
                        resetPage();
                      }}
                      className="bg-transparent text-slate-600 outline-none"
                    >
                      {[5, 10, 20].map((n) => (
                        <option key={n} value={n}>
                          {n}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
                  </span>
                </span>
              </span>
            </div>
          </div>
        </div>

        {/* ===== Drawer chi tiết ===== */}
        {selected && (
          <aside className="min-w-0 rounded-xl border border-slate-200/70 bg-white p-5 lg:sticky lg:top-[88px] lg:self-start">
            <div className="flex items-start justify-between gap-2">
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <ClassIcon code={selected.code} tone={selected.iconTone} size="lg" />
                <span className="min-w-0">
                  <span className="block text-[16px] font-extrabold leading-snug text-slate-900">
                    {selected.name}
                  </span>
                  <span className="mt-0.5 block text-[13px] text-slate-500">{selected.code}</span>
                </span>
              </div>
              <span className="flex shrink-0 items-center gap-2">
                <ClassStatusBadge status={selected.status} />
                <button
                  onClick={() => setSelectedId(null)}
                  aria-label="Đóng chi tiết"
                  className="grid h-7 w-7 place-items-center rounded-lg text-slate-400 hover:bg-slate-100"
                >
                  <X className="h-4 w-4" />
                </button>
              </span>
            </div>

            <div className="mt-4 flex gap-5 border-b border-slate-100 text-[13.5px]">
              {(
                [
                  { id: "info", label: "Thông tin" },
                  { id: "students", label: `Sinh viên (${selected.memberCount})` },
                  { id: "history", label: "Lịch sử hoạt động" },
                ] as const
              ).map((t) => (
                <button
                  key={t.id}
                  onClick={() => setDetailTab(t.id)}
                  className={`relative whitespace-nowrap pb-2.5 font-medium transition ${
                    detailTab === t.id ? "text-blue-600" : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  {t.label}
                  {detailTab === t.id && (
                    <span className="absolute inset-x-0 -bottom-px h-[2.5px] rounded-full bg-blue-600" />
                  )}
                </button>
              ))}
            </div>

            {detailTab === "info" && (
              <div className="mt-3 space-y-0 text-[13px]">
                {[
                  { icon: BookOpen, label: "Tên lớp học", value: selected.name },
                  { icon: GraduationCap, label: "Mã lớp", value: selected.code },
                  {
                    icon: Users,
                    label: "Giảng viên",
                    value: (
                      <span className="inline-flex items-center gap-2">
                        <span className="h-6 w-6 overflow-hidden rounded-full bg-slate-200">
                          <Image
                            src={avatarUrl(selected.teacherAvatarImg)}
                            alt={selected.teacherName}
                            width={48}
                            height={48}
                            className="h-full w-full object-cover"
                            unoptimized
                          />
                        </span>
                        {selected.teacherName}
                      </span>
                    ),
                  },
                  { icon: Users, label: "Số thành viên", value: `${selected.memberCount} sinh viên` },
                  {
                    icon: CalendarDays,
                    label: "Ngày tạo",
                    value: `${selected.createdAt}${selected.createdTime ? ` ${selected.createdTime}` : ""}`,
                  },
                  {
                    icon: Clock,
                    label: "Trạng thái",
                    value: <ClassStatusBadge status={selected.status} />,
                  },
                ].map((r, i) => (
                  <div key={i} className="flex items-start gap-3 border-b border-slate-50 py-2.5 last:border-0">
                    <r.icon className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                    <span className="w-[104px] shrink-0 text-slate-500">{r.label}</span>
                    <span className="min-w-0 flex-1 font-medium text-slate-800">{r.value}</span>
                  </div>
                ))}
                <div className="flex items-start gap-3 py-2.5">
                  <BookOpen className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                  <span className="w-[104px] shrink-0 text-slate-500">Mô tả</span>
                  <span className="min-w-0 flex-1 leading-relaxed text-slate-600">
                    {selected.description ?? "—"}
                  </span>
                </div>
              </div>
            )}

            {(detailTab === "info" || detailTab === "students") && (
              <div className={detailTab === "students" ? "mt-3" : "mt-4 border-t border-slate-100 pt-4"}>
                <div className="mb-2 flex items-center justify-between">
                  <p className="flex items-center gap-1.5 text-[13.5px] font-bold text-slate-900">
                    <Users className="h-4 w-4 text-blue-600" />
                    Thành viên gần đây
                  </p>
                  <button
                    onClick={() => {
                      setDetailTab("students");
                      showToast("Đã mở tab Sinh viên (demo)");
                    }}
                    className="inline-flex items-center gap-1 text-[12.5px] font-medium text-blue-600 hover:text-blue-700"
                  >
                    Xem tất cả <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
                <ul className="space-y-2.5">
                  {visibleMembers.map((m) => (
                    <li key={m.id} className="flex items-center gap-3">
                      <span className="h-9 w-9 shrink-0 overflow-hidden rounded-full bg-slate-200">
                        <Image
                          src={avatarUrl(m.avatarImg)}
                          alt={m.fullName}
                          width={72}
                          height={72}
                          className="h-full w-full object-cover"
                          unoptimized
                        />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13px] font-semibold text-slate-800">
                          {m.fullName}
                        </span>
                        <span className="block text-[12px] text-slate-400">{m.code}</span>
                      </span>
                      <span className="shrink-0 text-right text-[12px] leading-tight text-slate-400">
                        Tham gia
                        <span className="block">{m.joinedAt}</span>
                      </span>
                    </li>
                  ))}
                  {visibleMembers.length === 0 && (
                    <p className="rounded-xl bg-slate-50 px-3 py-3 text-[12.5px] text-slate-400">
                      Chưa có thành viên nào.
                    </p>
                  )}
                </ul>
                {detailTab === "students" && drawerMembers.length > 5 && !showAllMembers && (
                  <button
                    onClick={() => setShowAllMembers(true)}
                    className="mt-3 w-full rounded-lg bg-blue-50 py-2.5 text-[13px] font-semibold text-blue-600 transition hover:bg-blue-100"
                  >
                    Xem thêm {drawerMembers.length - 5} sinh viên
                  </button>
                )}
                <button
                  onClick={() => showToast(`Danh sách ${selected.memberCount} sinh viên lớp ${selected.code} (demo)`)}
                  className="mt-3 w-full rounded-lg bg-blue-50 py-2.5 text-[13px] font-semibold text-blue-600 transition hover:bg-blue-100"
                >
                  Xem danh sách tất cả sinh viên
                </button>
              </div>
            )}

            {detailTab === "history" && (
              <ul className="mt-3 space-y-2.5">
                {[
                  { text: `Lớp ${selected.code} được tạo`, time: `${selected.createdAt} 08:30` },
                  { text: `${selected.teacherName} được phân công giảng dạy`, time: `${selected.createdAt} 09:00` },
                  { text: "5 sinh viên mới tham gia", time: "24/09/2026 08:32" },
                ].map((h, i) => (
                  <li key={i} className="flex gap-3 rounded-xl bg-slate-50/80 px-3 py-2.5">
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-blue-50 text-blue-600">
                      <Clock className="h-4 w-4" />
                    </span>
                    <span>
                      <span className="block text-[13px] font-medium text-slate-800">{h.text}</span>
                      <span className="block text-[12px] text-slate-400">{h.time}</span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </aside>
        )}
      </div>

      <Toast message={toast} />
    </AdminShell>
  );
}
