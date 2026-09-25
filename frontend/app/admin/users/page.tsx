"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  BookOpen,
  Cake,
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  Download,
  Filter,
  GraduationCap,
  Mail,
  MoreVertical,
  Phone,
  Search,
  User,
  Users,
  VenusAndMars,
  X,
  IdCard,
  Lock,
  LockOpen,
} from "lucide-react";
import AdminShell, { Toast } from "../components/AdminShell";
import AdminStatCards, {
  RoleBadge,
  StatusBadge,
  avatarUrl,
} from "../components/admin-shared";
import {
  adminUserSortOptions,
  adminUserStats,
  adminUsers,
} from "@/lib/mock/admin";
import type { AdminUser } from "@/lib/types/admin";

function parseDate(s: string) {
  const [d, m, y] = s.split("/").map(Number);
  return new Date(y, m - 1, d).getTime();
}

function DetailRow({
  icon: Icon,
  label,
  value,
  valueClass = "text-slate-800",
}: {
  icon: React.ElementType;
  label: string;
  value: React.ReactNode;
  valueClass?: string;
}) {
  return (
    <div className="flex items-start gap-3 py-2">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
      <span className="w-[104px] shrink-0 text-[13px] text-slate-500">{label}</span>
      <span className={`min-w-0 flex-1 break-words text-[13px] font-medium ${valueClass}`}>{value}</span>
    </div>
  );
}

export default function AdminUsersPage() {
  const [topSearch, setTopSearch] = useState("");
  const [query, setQuery] = useState("");
  const [role, setRole] = useState("Tất cả");
  const [status, setStatus] = useState("Tất cả");
  const [sort, setSort] = useState(adminUserSortOptions[0]);

  const [users, setUsers] = useState<AdminUser[]>(adminUsers);
  const [selectedId, setSelectedId] = useState<string | null>("u-thao-chi");
  const [detailTab, setDetailTab] = useState<"info" | "activity">("info");
  const [checked, setChecked] = useState<string[]>([]);
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
    let list = [...users];
    if (role === "Sinh viên") list = list.filter((u) => u.role === "student");
    if (role === "Giảng viên") list = list.filter((u) => u.role === "teacher");
    if (status === "Hoạt động") list = list.filter((u) => u.status === "active");
    if (status === "Bị khóa") list = list.filter((u) => u.status === "locked");
    if (q)
      list = list.filter(
        (u) =>
          u.fullName.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q) ||
          u.code.toLowerCase().includes(q),
      );
    if (sort === "Ngày tạo (mới nhất)") list.sort((a, b) => parseDate(b.createdAt) - parseDate(a.createdAt));
    if (sort === "Ngày tạo (cũ nhất)") list.sort((a, b) => parseDate(a.createdAt) - parseDate(b.createdAt));
    if (sort === "Tên A-Z") list.sort((a, b) => a.fullName.localeCompare(b.fullName, "vi"));
    if (sort === "Tên Z-A") list.sort((a, b) => b.fullName.localeCompare(a.fullName, "vi"));
    return list;
  }, [users, query, topSearch, role, status, sort]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageRows = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);
  const start = filtered.length === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const end = Math.min(safePage * pageSize, filtered.length);

  /** Reset về trang 1 mỗi khi filter thay đổi (gọi trực tiếp trong handler, tránh set-state-in-effect) */
  const resetPage = () => {
    setPage(1);
    setChecked([]);
  };

  const handleTopSearch = (v: string) => {
    setTopSearch(v);
    resetPage();
  };

  const selected = users.find((u) => u.id === selectedId) ?? null;

  const toggleCheck = (id: string) =>
    setChecked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  const toggleAll = () => {
    const ids = pageRows.map((r) => r.id);
    const allChecked = ids.every((id) => checked.includes(id));
    setChecked((p) => (allChecked ? p.filter((x) => !ids.includes(x)) : [...new Set([...p, ...ids])]));
  };

  const setLock = (id: string, lock: boolean) => {
    setUsers((prev) =>
      prev.map((u) => (u.id === id ? { ...u, status: lock ? ("locked" as const) : ("active" as const) } : u)),
    );
    const u = users.find((x) => x.id === id);
    showToast(lock ? `Đã khóa tài khoản ${u?.fullName ?? ""}` : `Đã mở khóa tài khoản ${u?.fullName ?? ""}`);
    setOpenMenuId(null);
  };

  const exportCsv = () => {
    const rows = [
      ["Ho va ten", "MSSV/Ma GV", "Email", "Vai tro", "Trang thai", "Ngay tao"],
      ...filtered.map((u) => [
        u.fullName,
        u.code,
        u.email,
        u.role === "student" ? "Sinh vien" : "Giang vien",
        u.status === "active" ? "Hoat dong" : "Bi khoa",
        u.createdAt,
      ]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "danh-sach-nguoi-dung.csv";
    a.click();
    URL.revokeObjectURL(url);
    showToast(`Đã xuất ${filtered.length} người dùng ra CSV`);
  };

  const pageNumbers = useMemo(() => {
    // Hiển thị gọn: 1 2 3 ... N (demo với mock nhỏ)
    const arr: (number | "...")[] = [];
    for (let i = 1; i <= totalPages; i++) {
      if (i <= 4 || i === totalPages) arr.push(i);
      else if (arr[arr.length - 1] !== "...") arr.push("...");
    }
    return arr;
  }, [totalPages]);

  return (
    <AdminShell
      activeId="users"
      searchPlaceholder="Tìm kiếm người dùng, lớp học..."
      searchValue={topSearch}
      onSearchChange={handleTopSearch}
    >
      <div className={`grid grid-cols-1 gap-5 ${selected ? "xl:grid-cols-[minmax(0,1fr)_360px]" : ""}`}>
        {/* ===== Cột trái ===== */}
        <div className="min-w-0">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-[26px] font-extrabold tracking-tight sm:text-[30px]">
                Quản lý người dùng
              </h1>
              <p className="mt-1 text-[14px] text-slate-500">
                Xem, tìm kiếm và quản lý tài khoản sinh viên, giảng viên trong hệ thống.
              </p>
            </div>
            <button
              onClick={exportCsv}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-[14px] font-semibold text-white shadow-sm shadow-blue-600/30 transition hover:bg-blue-700"
            >
              <Download className="h-4 w-4" /> Xuất danh sách
              <Download className="h-4 w-4" />
            </button>
          </div>

          <AdminStatCards stats={adminUserStats} compact={selected !== null} />

          {/* Filter */}
          <div className="mt-4 rounded-xl border border-slate-200/70 bg-white p-4">
            <div className="flex flex-wrap items-end gap-3">
              <div className="relative min-w-[220px] flex-1">
                <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    resetPage();
                  }}
                  placeholder="Tìm kiếm theo tên, email, MSSV, vai trò..."
                  className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50/60 pl-10 pr-3 text-[13px] outline-none placeholder:text-slate-400 focus:border-blue-300 focus:bg-white focus:ring-4 focus:ring-blue-100"
                />
              </div>
              {[
                { label: "Vai trò", value: role, set: (v: string) => { setRole(v); resetPage(); }, opts: ["Tất cả", "Sinh viên", "Giảng viên"] },
                { label: "Trạng thái", value: status, set: (v: string) => { setStatus(v); resetPage(); }, opts: ["Tất cả", "Hoạt động", "Bị khóa"] },
                { label: "Sắp xếp", value: sort, set: (v: string) => { setSort(v); resetPage(); }, opts: adminUserSortOptions },
              ].map((f) => (
                <label key={f.label} className="block">
                  <span className="mb-1 block text-[12px] font-medium text-slate-500">{f.label}</span>
                  <span className="inline-flex h-10 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 text-[13px] text-slate-700">
                    <select
                      value={f.value}
                      onChange={(e) => f.set(e.target.value)}
                      className="max-w-[170px] bg-transparent outline-none"
                    >
                      {f.opts.map((o) => (
                        <option key={o}>{o}</option>
                      ))}
                    </select>
                    <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
                  </span>
                </label>
              ))}
              <button
                onClick={() => showToast(`Đã lọc: ${filtered.length} kết quả`)}
                className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-blue-50 px-4 text-[13px] font-semibold text-blue-600 transition hover:bg-blue-100"
              >
                <Filter className="h-4 w-4" /> Lọc
              </button>
            </div>

            {/* Table */}
            <div className="mt-4 overflow-x-auto rounded-xl border border-slate-100">
              <table className="w-full min-w-[860px] text-left text-[13px]">
                <thead>
                  <tr className="bg-slate-50/80 text-[12px] font-medium text-slate-500">
                    <th className="px-3 py-3">
                      <input
                        type="checkbox"
                        checked={pageRows.length > 0 && pageRows.every((r) => checked.includes(r.id))}
                        onChange={toggleAll}
                        aria-label="Chọn tất cả"
                        className="h-4 w-4 rounded border-slate-300 accent-blue-600"
                      />
                    </th>
                    <th className="px-2 py-3 font-medium">#</th>
                    <th className="whitespace-nowrap px-3 py-3 font-medium">Họ và tên</th>
                    <th className="whitespace-nowrap px-3 py-3 font-medium">MSSV/Mã GV</th>
                    <th className="whitespace-nowrap px-3 py-3 font-medium">Email</th>
                    <th className="whitespace-nowrap px-3 py-3 text-center font-medium">Vai trò</th>
                    <th className="whitespace-nowrap px-3 py-3 text-center font-medium">Trạng thái</th>
                    <th className="whitespace-nowrap px-3 py-3 font-medium">Ngày tạo</th>
                    <th className="whitespace-nowrap px-3 py-3 text-right font-medium">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map((u, i) => (
                    <tr
                      key={u.id}
                      onClick={() => {
                        setSelectedId(u.id);
                        setDetailTab("info");
                      }}
                      className={`cursor-pointer border-t border-slate-100 transition hover:bg-blue-50/50 ${
                        selectedId === u.id ? "bg-blue-50/70" : ""
                      }`}
                    >
                      <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={checked.includes(u.id)}
                          onChange={() => toggleCheck(u.id)}
                          aria-label={`Chọn ${u.fullName}`}
                          className="h-4 w-4 rounded border-slate-300 accent-blue-600"
                        />
                      </td>
                      <td className="px-2 py-3 text-slate-500">{(safePage - 1) * pageSize + i + 1}</td>
                      <td className="px-3 py-3">
                        <span className="flex items-center gap-2.5">
                          <span className="h-8 w-8 shrink-0 overflow-hidden rounded-full bg-slate-200">
                            <Image
                              src={avatarUrl(u.avatarImg)}
                              alt={u.fullName}
                              width={64}
                              height={64}
                              className="h-full w-full object-cover"
                              unoptimized
                            />
                          </span>
                          <span className="whitespace-nowrap font-medium text-slate-800">{u.fullName}</span>
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 font-medium text-slate-700">{u.code}</td>
                      <td className="max-w-[220px] truncate whitespace-nowrap px-3 py-3 text-slate-500">{u.email}</td>
                      <td className="px-3 py-3 text-center">
                        <RoleBadge role={u.role} />
                      </td>
                      <td className="px-3 py-3 text-center">
                        <StatusBadge status={u.status} />
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 text-slate-500">{u.createdAt}</td>
                      <td className="px-3 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => setOpenMenuId(openMenuId === u.id ? null : u.id)}
                          aria-label={`Thao tác ${u.fullName}`}
                          className="inline-grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </button>
                        {openMenuId === u.id && (
                          <span
                            ref={menuRef}
                            className="absolute z-20 mt-1 w-48 -translate-x-40 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 text-left shadow-xl"
                          >
                            <button
                              onClick={() => {
                                setSelectedId(u.id);
                                setDetailTab("info");
                                setOpenMenuId(null);
                              }}
                              className="block w-full px-3.5 py-2 text-[13px] text-slate-600 hover:bg-slate-50"
                            >
                              Xem chi tiết
                            </button>
                            <button
                              onClick={() => {
                                try {
                                  navigator.clipboard.writeText(u.email);
                                } catch { /* ignore */ }
                                showToast(`Đã sao chép email ${u.email}`);
                                setOpenMenuId(null);
                              }}
                              className="block w-full px-3.5 py-2 text-[13px] text-slate-600 hover:bg-slate-50"
                            >
                              Sao chép email
                            </button>
                            {u.status === "active" ? (
                              <button
                                onClick={() => setLock(u.id, true)}
                                className="block w-full px-3.5 py-2 text-left text-[13px] text-red-600 hover:bg-red-50"
                              >
                                Khóa tài khoản
                              </button>
                            ) : (
                              <button
                                onClick={() => setLock(u.id, false)}
                                className="block w-full px-3.5 py-2 text-left text-[13px] text-blue-600 hover:bg-blue-50"
                              >
                                Mở khóa tài khoản
                              </button>
                            )}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {pageRows.length === 0 && (
                <p className="px-4 py-10 text-center text-sm text-slate-500">
                  Không tìm thấy người dùng nào. Thử đổi từ khóa hoặc bộ lọc.
                </p>
              )}
            </div>

            {/* Pagination */}
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-[13px] text-slate-500">
              <span>
                Hiển thị {start} - {end} của {filtered.length} người dùng
                <span className="hidden sm:inline"> (tổng 1,304)</span>
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
                {pageNumbers.map((n, idx) =>
                  n === "..." ? (
                    <span key={`e-${idx}`} className="px-1 text-slate-400">
                      ...
                    </span>
                  ) : (
                    <button
                      key={n}
                      onClick={() => setPage(n)}
                      className={`grid h-8 w-8 place-items-center rounded-lg text-[13px] font-semibold transition ${
                        n === safePage ? "bg-blue-600 text-white" : "text-slate-500 hover:bg-slate-100"
                      }`}
                    >
                      {n}
                    </button>
                  ),
                )}
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
                <span className="h-14 w-14 shrink-0 overflow-hidden rounded-full bg-slate-200">
                  <Image
                    src={avatarUrl(selected.avatarImg)}
                    alt={selected.fullName}
                    width={112}
                    height={112}
                    className="h-full w-full object-cover"
                    unoptimized
                  />
                </span>
                <span className="min-w-0">
                  <span className="block text-[16px] font-extrabold leading-snug text-slate-900">
                    {selected.fullName}
                  </span>
                  <span className="mt-0.5 block text-[13px] text-slate-500">
                    {selected.role === "student" ? "Sinh viên" : "Giảng viên"}
                  </span>
                </span>
              </div>
              <span className="flex shrink-0 items-center gap-2">
                <StatusBadge status={selected.status} />
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
                  { id: "activity", label: "Lịch sử hoạt động" },
                ] as const
              ).map((t) => (
                <button
                  key={t.id}
                  onClick={() => setDetailTab(t.id)}
                  className={`relative pb-2.5 font-medium transition ${
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

            {detailTab === "info" ? (
              <div className="mt-2 divide-y divide-slate-50">
                <DetailRow icon={IdCard} label="MSSV" value={selected.code} />
                <DetailRow icon={User} label="Họ và tên" value={selected.fullName} />
                <DetailRow icon={Cake} label="Ngày sinh" value={selected.birthDate ?? "—"} />
                <DetailRow icon={VenusAndMars} label="Giới tính" value={selected.gender ?? "—"} />
                <DetailRow icon={Mail} label="Email" value={selected.email} />
                <DetailRow icon={Phone} label="Số điện thoại" value={selected.phone ?? "—"} />
                <DetailRow
                  icon={CalendarDays}
                  label="Ngày tạo"
                  value={`${selected.createdAt}${selected.createdTime ? ` ${selected.createdTime}` : ""}`}
                />
                <div className="flex items-start gap-3 py-2">
                  <Clock className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                  <span className="w-[104px] shrink-0 text-[13px] text-slate-500">Trạng thái</span>
                  <StatusBadge status={selected.status} />
                </div>

                <div className="pt-3">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="flex items-center gap-1.5 text-[13.5px] font-bold text-slate-900">
                      <BookOpen className="h-4 w-4" />
                      Lớp học đang tham gia ({selected.enrolled?.length ?? 0})
                    </p>
                    <button
                      onClick={() => showToast("Xem tất cả lớp đang tham gia (demo)")}
                      className="text-[12.5px] font-medium text-blue-600 hover:text-blue-700"
                    >
                      Xem tất cả
                    </button>
                  </div>
                  <div className="space-y-2">
                    {(selected.enrolled ?? []).map((c) => (
                      <div key={c.code} className="flex items-center gap-3 rounded-xl bg-slate-50/80 px-3 py-2.5">
                        <span className="grid h-9 w-9 place-items-center rounded-lg bg-blue-50 text-blue-600">
                          <GraduationCap className="h-4 w-4" />
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate text-[13px] font-semibold text-slate-800">
                            {c.code} - {c.name}
                          </span>
                          <span className="block truncate text-[12px] text-slate-500">
                            Giảng viên: {c.teacherName}
                          </span>
                        </span>
                      </div>
                    ))}
                    {(selected.enrolled ?? []).length === 0 && (
                      <p className="rounded-xl bg-slate-50 px-3 py-3 text-[12.5px] text-slate-400">
                        Chưa tham gia lớp học nào.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <ul className="mt-3 space-y-2.5">
                {(selected.activity ?? [{ text: "Tạo tài khoản mới", time: selected.createdAt }]).map((a, i) => (
                  <li key={i} className="flex gap-3 rounded-xl bg-slate-50/80 px-3 py-2.5">
                    <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-blue-50 text-blue-600">
                      <Users className="h-4 w-4" />
                    </span>
                    <span>
                      <span className="block text-[13px] font-medium text-slate-800">{a.text}</span>
                      <span className="block text-[12px] text-slate-400">{a.time}</span>
                    </span>
                  </li>
                ))}
              </ul>
            )}

            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                onClick={() => setLock(selected.id, true)}
                className="inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-lg bg-red-50 px-3 py-2.5 text-[13px] font-semibold text-red-600 transition hover:bg-red-100"
              >
                <Lock className="h-4 w-4 shrink-0" /> Khóa tài khoản
              </button>
              <button
                onClick={() => setLock(selected.id, false)}
                className="inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-lg bg-blue-50 px-3 py-2.5 text-[13px] font-semibold text-blue-600 transition hover:bg-blue-100"
              >
                <LockOpen className="h-4 w-4 shrink-0" /> Mở khóa tài khoản
              </button>
            </div>
          </aside>
        )}
      </div>

      <Toast message={toast} />
    </AdminShell>
  );
}
