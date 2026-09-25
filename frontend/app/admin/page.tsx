"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  BarChart3,
  Code2,
  Database,
  FileText,
  Lock,
  Palette,
  Terminal,
  UserPlus,
  GraduationCap,
} from "lucide-react";
import GreetingHeader from "../components/common/GreetingHeader";
import AdminShell, { Toast } from "./components/AdminShell";
import AdminStatCards, {
  IssueBadge,
  RoleBadge,
  StatusBadge,
  avatarUrl,
} from "./components/admin-shared";
import {
  adminActivities,
  adminDashboardStats,
  adminFlaggedAccounts,
  adminGreetingDateLabel,
  adminProfile,
  adminRecentClasses,
  adminRecentUsers,
} from "@/lib/mock/admin";

function ClassIcon({ code, tone }: { code: string; tone: string }) {
  const bg =
    tone === "blue"
      ? "bg-blue-50 text-blue-600"
      : tone === "orange"
        ? "bg-orange-50 text-orange-500"
        : tone === "purple"
          ? "bg-purple-50 text-purple-600"
          : tone === "green"
            ? "bg-green-50 text-green-600"
            : "bg-red-50 text-red-500";
  const Icon = code.startsWith("WEB")
    ? Code2
    : code.startsWith("PY")
      ? Terminal
      : code.startsWith("DB")
        ? Database
        : code.startsWith("UI")
          ? Palette
          : BarChart3;
  return (
    <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${bg}`}>
      <Icon className="h-[18px] w-[18px]" />
    </span>
  );
}

export default function AdminDashboardPage() {
  const [topSearch, setTopSearch] = useState("");
  const [toast, setToast] = useState("");

  const showToast = (msg: string) => {
    setToast(msg);
    window.clearTimeout((showToast as unknown as { t?: number }).t);
    (showToast as unknown as { t?: number }).t = window.setTimeout(() => setToast(""), 2600);
  };

  const q = topSearch.trim().toLowerCase();
  const recentUsers = useMemo(() => {
    if (!q) return adminRecentUsers;
    return adminRecentUsers.filter(
      (u) => u.fullName.toLowerCase().includes(q) || u.code.toLowerCase().includes(q),
    );
  }, [q]);
  const recentClasses = useMemo(() => {
    if (!q) return adminRecentClasses;
    return adminRecentClasses.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.code.toLowerCase().includes(q) ||
        c.teacherName.toLowerCase().includes(q),
    );
  }, [q]);

  return (
    <AdminShell
      activeId="home"
      searchPlaceholder="Tìm kiếm người dùng, lớp học..."
      searchValue={topSearch}
      onSearchChange={setTopSearch}
    >
      {/* ===== Greeting (dùng chung 3 role) ===== */}
      <GreetingHeader
        name={adminProfile.fullName}
        subtitle="Đây là tổng quan hoạt động của hệ thống EduLearn."
        dateLabel={adminGreetingDateLabel}
      />

      <AdminStatCards stats={adminDashboardStats} />

      {/* ===== Hàng 1: Tài khoản gần đây + Lớp học gần đây ===== */}
      <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        {/* Tài khoản gần đây */}
        <section className="min-w-0 rounded-xl border border-slate-200/70 bg-white p-4 sm:p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-[16px] font-extrabold text-slate-900">
              <span className="text-blue-600">
                <UserPlus className="h-5 w-5" />
              </span>
              Tài khoản gần đây
            </h2>
            <Link
              href="/admin/users"
              className="inline-flex items-center gap-1 text-[13px] font-medium text-blue-600 hover:text-blue-700"
            >
              Xem tất cả <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-left text-[13px]">
              <thead>
                <tr className="text-[12px] font-medium text-slate-500">
                  <th className="rounded-l-lg bg-slate-50 px-3 py-2.5 font-medium">#</th>
                  <th className="whitespace-nowrap bg-slate-50 px-3 py-2.5 font-medium">Họ và tên</th>
                  <th className="whitespace-nowrap bg-slate-50 px-3 py-2.5 text-center font-medium">Vai trò</th>
                  <th className="whitespace-nowrap bg-slate-50 px-3 py-2.5 text-center font-medium">Trạng thái</th>
                  <th className="whitespace-nowrap rounded-r-lg bg-slate-50 px-3 py-2.5 font-medium">Thời gian tạo</th>
                </tr>
              </thead>
              <tbody>
                {recentUsers.map((u, i) => (
                  <tr
                    key={u.id}
                    onClick={() => showToast(`Xem hồ sơ ${u.fullName} (demo)`)}
                    className="cursor-pointer border-b border-slate-50 transition last:border-0 hover:bg-blue-50/40"
                  >
                    <td className="px-3 py-3 text-slate-500">{i + 1}</td>
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
                    <td className="px-3 py-3 text-center">
                      <RoleBadge role={u.role} />
                    </td>
                    <td className="px-3 py-3 text-center">
                      <StatusBadge status={u.status} />
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 text-slate-500">{u.createdAt}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {recentUsers.length === 0 && (
              <p className="py-6 text-center text-sm text-slate-400">
                Không tìm thấy tài khoản phù hợp “{topSearch}”.
              </p>
            )}
          </div>
        </section>

        {/* Lớp học gần đây */}
        <section className="min-w-0 rounded-xl border border-slate-200/70 bg-white p-4 sm:p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-[16px] font-extrabold text-slate-900">
              <span className="text-blue-600">
                <GraduationCap className="h-5 w-5" />
              </span>
              Lớp học gần đây
            </h2>
            <Link
              href="/admin/classes"
              className="inline-flex items-center gap-1 text-[13px] font-medium text-blue-600 hover:text-blue-700"
            >
              Xem tất cả <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px] text-left text-[13px]">
              <thead>
                <tr className="text-[12px] font-medium text-slate-500">
                  <th className="rounded-l-lg bg-slate-50 px-3 py-2.5 font-medium">#</th>
                  <th className="whitespace-nowrap bg-slate-50 px-3 py-2.5 font-medium">Tên lớp học</th>
                  <th className="whitespace-nowrap bg-slate-50 px-3 py-2.5 font-medium">Giảng viên</th>
                  <th className="whitespace-nowrap bg-slate-50 px-3 py-2.5 text-center font-medium">Số thành viên</th>
                  <th className="whitespace-nowrap rounded-r-lg bg-slate-50 px-3 py-2.5 font-medium">Ngày tạo</th>
                </tr>
              </thead>
              <tbody>
                {recentClasses.map((c, i) => (
                  <tr
                    key={c.id}
                    onClick={() => showToast(`Xem lớp ${c.code} (demo)`)}
                    className="cursor-pointer border-b border-slate-50 transition last:border-0 hover:bg-blue-50/40"
                  >
                    <td className="px-3 py-3 text-slate-500">{i + 1}</td>
                    <td className="px-3 py-3">
                      <span className="flex items-center gap-2.5">
                        <ClassIcon code={c.code} tone={c.iconTone} />
                        <span>
                          <span className="block font-medium leading-snug text-slate-800">
                            {c.name}
                          </span>
                          <span className="block text-[12px] text-slate-400">({c.code})</span>
                        </span>
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <span className="flex items-center gap-2">
                        <span className="h-7 w-7 shrink-0 overflow-hidden rounded-full bg-slate-200">
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
                    <td className="whitespace-nowrap px-3 py-3 text-slate-500">{c.createdAt}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {recentClasses.length === 0 && (
              <p className="py-6 text-center text-sm text-slate-400">
                Không tìm thấy lớp học phù hợp “{topSearch}”.
              </p>
            )}
          </div>
        </section>
      </div>

      {/* ===== Hàng 2: Cần chú ý + Hoạt động hệ thống ===== */}
      <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-2">
        <section className="min-w-0 rounded-xl border border-slate-200/70 bg-white p-4 sm:p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-[16px] font-extrabold text-slate-900">
              <span className="grid h-6 w-6 place-items-center rounded-full bg-red-500 text-white">
                <span className="text-[14px] font-bold leading-none">!</span>
              </span>
              Tài khoản cần chú ý
            </h2>
            <Link
              href="/admin/users"
              className="inline-flex items-center gap-1 text-[13px] font-medium text-blue-600 hover:text-blue-700"
            >
              Xem tất cả <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-left text-[13px]">
              <thead>
                <tr className="text-[12px] font-medium text-slate-500">
                  <th className="rounded-l-lg bg-slate-50 px-3 py-2.5 font-medium">#</th>
                  <th className="whitespace-nowrap bg-slate-50 px-3 py-2.5 font-medium">Họ và tên</th>
                  <th className="whitespace-nowrap bg-slate-50 px-3 py-2.5 text-center font-medium">Vai trò</th>
                  <th className="whitespace-nowrap bg-slate-50 px-3 py-2.5 text-center font-medium">Vấn đề</th>
                  <th className="whitespace-nowrap rounded-r-lg bg-slate-50 px-3 py-2.5 font-medium">Thời gian</th>
                </tr>
              </thead>
              <tbody>
                {adminFlaggedAccounts.map((f, i) => (
                  <tr
                    key={f.id}
                    onClick={() => showToast(`Xem cảnh báo: ${f.fullName} (demo)`)}
                    className="cursor-pointer border-b border-slate-50 transition last:border-0 hover:bg-red-50/40"
                  >
                    <td className="px-3 py-3 text-slate-500">{i + 1}</td>
                    <td className="px-3 py-3">
                      <span className="flex items-center gap-2.5">
                        <span className="h-8 w-8 shrink-0 overflow-hidden rounded-full bg-slate-200">
                          <Image
                            src={avatarUrl(f.avatarImg)}
                            alt={f.fullName}
                            width={64}
                            height={64}
                            className="h-full w-full object-cover"
                            unoptimized
                          />
                        </span>
                        <span className="whitespace-nowrap font-medium text-slate-800">{f.fullName}</span>
                      </span>
                    </td>
                    <td className="px-3 py-3 text-center">
                      <RoleBadge role={f.role} />
                    </td>
                    <td className="px-3 py-3 text-center">
                      <IssueBadge label={f.issue} />
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 text-slate-500">{f.timeAgo}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Hoạt động hệ thống */}
        <section className="min-w-0 rounded-xl border border-slate-200/70 bg-white p-4 sm:p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-[16px] font-extrabold text-slate-900">
              <span className="text-blue-600">
                <FileText className="h-5 w-5" />
              </span>
              Hoạt động hệ thống gần đây
            </h2>
            <button
              onClick={() => showToast("Xem toàn bộ nhật ký hệ thống (demo)")}
              className="inline-flex items-center gap-1 text-[13px] font-medium text-blue-600 hover:text-blue-700"
            >
              Xem tất cả <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
          <ol className="relative space-y-5 border-l border-slate-100 pl-0 pt-1">
            {adminActivities.map((a) => (
              <li key={a.id} className="relative flex gap-3 pl-6">
                <span
                  className={`absolute -left-[5px] top-1.5 h-2.5 w-2.5 rounded-full ring-4 ring-white ${
                    a.kind === "locked" ? "bg-red-500" : a.kind === "class-created" ? "bg-green-500" : "bg-blue-600"
                  }`}
                />
                <span
                  className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${
                    a.kind === "locked"
                      ? "bg-red-50 text-red-500"
                      : a.kind === "class-created"
                        ? "bg-green-50 text-green-600"
                        : a.kind === "teacher-create"
                          ? "bg-blue-50 text-blue-600"
                          : "bg-blue-50 text-blue-600"
                  }`}
                >
                  {a.kind === "locked" ? (
                    <Lock className="h-4 w-4" />
                  ) : a.kind === "class-created" || a.kind === "teacher-create" ? (
                    <GraduationCap className="h-4 w-4" />
                  ) : (
                    <UserPlus className="h-4 w-4" />
                  )}
                </span>
                <span>
                  <span className="block text-[13.5px] text-slate-700">{a.text}</span>
                  <span className="mt-0.5 block text-[12px] text-slate-400">{a.timeAgo}</span>
                </span>
              </li>
            ))}
          </ol>
          <div className="mt-4 flex items-center gap-2 rounded-xl bg-slate-50 px-4 py-3 text-[12.5px] text-slate-500">
            <AlertCircle className="h-4 w-4 shrink-0 text-slate-400" />
            Tìm kiếm phía trên sẽ lọc nhanh cả hai bảng “Tài khoản” và “Lớp học”.
          </div>
        </section>
      </div>

      <Toast message={toast} />
    </AdminShell>
  );
}
