"use client";

import Image from "next/image";
import Link from "next/link";
import {
  Bell,
  BookOpen,
  CalendarDays,
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  GraduationCap,
  Home,
  NotebookPen,
  Users,
  User,
  type LucideIcon,
} from "lucide-react";

type NavIcon = "home" | "classes" | "content" | "assignment" | "quiz" | "gradebook" | "bell" | "calendar" | "profile";

const NAV: { id: string; label: string; icon: NavIcon; href: string }[] = [
  { id: "home", label: "Tổng quan", icon: "home", href: "/student" },
  { id: "classes", label: "Môn học", icon: "classes", href: "/student/courses" },
  { id: "content", label: "Nội dung học tập", icon: "content", href: "/student/content" },
  { id: "assignments", label: "Bài tập", icon: "assignment", href: "/student/assignments" },
  { id: "quizzes", label: "Kiểm tra trắc nghiệm", icon: "quiz", href: "/student/quizzes" },
  { id: "grades", label: "Sổ điểm", icon: "gradebook", href: "/student/grades" },
  { id: "notifs", label: "Thông báo", icon: "bell", href: "/student/notifications" },
  { id: "schedule", label: "Lịch", icon: "calendar", href: "/student/schedule" },
];

const ICON_MAP: Record<NavIcon, LucideIcon> = {
  home: Home,
  classes: Users,
  content: NotebookPen,
  assignment: ClipboardList,
  quiz: CheckSquare,
  gradebook: BookOpen,
  bell: Bell,
  calendar: CalendarDays,
  profile: User,
};

function Logo({ collapsed }: { collapsed?: boolean }) {
  if (collapsed) {
    return (
      <Link
        href="/"
        aria-label="Về trang chủ"
        className="flex items-center justify-center p-0.5 rounded-xl transition-transform hover:scale-105 active:scale-95 duration-200"
        title="Về trang chủ EduHub"
      >
        <Image
          src="/images/favicon.png"
          alt="EduHub"
          width={40}
          height={40}
          priority
          className="h-10 w-10 object-contain drop-shadow-sm"
        />
      </Link>
    );
  }
  return (
    <Link href="/" aria-label="Về trang chủ" className="inline-block px-1 py-1">
      <Image
        src="/images/logo.webp"
        alt="EduHub"
        width={160}
        height={44}
        priority
        className="h-9 w-auto object-contain"
      />
    </Link>
  );
}

export default function StudentSidebar({
  mobileOpen,
  onClose,
  activeId = "home",
  collapsed = false,
  onToggleCollapse,
}: {
  mobileOpen: boolean;
  onClose: () => void;
  activeId?: string;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}) {
  return (
    <>
      {mobileOpen && (
        <button
          aria-label="Đóng menu"
          onClick={onClose}
          className="fixed inset-0 z-40 bg-slate-900/40 lg:hidden"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex flex-col border-r border-slate-200/80 bg-white transition-all duration-300 ease-in-out ${
          collapsed ? "lg:w-[72px]" : "lg:w-[248px]"
        } ${mobileOpen ? "w-[248px] translate-x-0" : "max-lg:-translate-x-full lg:translate-x-0"}`}
      >
        {/* Nút tròn nổi viền (floating toggle) thu gọn / mở rộng (<>) đặt ngay chính giữa chiều cao sidebar */}
        {onToggleCollapse && (
          <button
            type="button"
            onClick={onToggleCollapse}
            aria-label={collapsed ? "Mở rộng menu (>)" : "Thu gọn menu (<)"}
            title={collapsed ? "Mở rộng menu (>)" : "Thu gọn menu (<)"}
            className="hidden lg:flex absolute -right-3.5 top-1/2 -translate-y-1/2 z-50 h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-md hover:border-blue-400 hover:text-blue-600 hover:scale-110 active:scale-95 transition-all cursor-pointer"
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </button>
        )}

        {/* Header logo */}
        <div
          className={`flex items-center pt-5 pb-3 border-b border-slate-100/70 transition-all ${
            collapsed ? "justify-center px-2" : "px-4"
          }`}
        >
          <Logo collapsed={collapsed} />
        </div>

        <nav className={`flex-1 overflow-y-auto pb-4 pt-3 ${collapsed ? "px-2" : "px-3"}`}>
          <ul className="space-y-1.5">
            {NAV.map((item) => {
              const Icon = ICON_MAP[item.icon];
              const active = activeId === item.id;

              if (collapsed) {
                return (
                  <li key={item.id} className="relative group">
                    <Link
                      href={item.href}
                      onClick={onClose}
                      className={`flex h-11 w-11 mx-auto items-center justify-center rounded-xl transition ${
                        active
                          ? "bg-blue-50 text-blue-600 font-semibold"
                          : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                      <span className="pointer-events-none absolute left-full ml-3 z-50 hidden rounded-md bg-slate-900 px-2.5 py-1 text-xs font-medium text-white shadow-xl whitespace-nowrap group-hover:block">
                        {item.label}
                      </span>
                    </Link>
                  </li>
                );
              }

              return (
                <li key={item.id}>
                  <Link
                    href={item.href}
                    onClick={onClose}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-[15px] font-medium transition ${
                      active
                        ? "border-l-[3px] border-blue-600 bg-blue-50 text-blue-600"
                        : "text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    <Icon className={`h-5 w-5 ${active ? "text-blue-600" : "text-slate-500"}`} />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>

          <div className="my-4 border-t border-slate-100" />

          {collapsed ? (
            <div className="relative group">
              <Link
                href="/student/profile"
                onClick={onClose}
                className={`flex h-11 w-11 mx-auto items-center justify-center rounded-xl transition ${
                  activeId === "profile"
                    ? "bg-blue-50 text-blue-600 font-semibold"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                <User className="h-5 w-5" />
                <span className="pointer-events-none absolute left-full ml-3 z-50 hidden rounded-md bg-slate-900 px-2.5 py-1 text-xs font-medium text-white shadow-xl whitespace-nowrap group-hover:block">
                  Hồ sơ cá nhân
                </span>
              </Link>
            </div>
          ) : (
            <Link
              href="/student/profile"
              onClick={onClose}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-[15px] font-medium transition ${
                activeId === "profile"
                  ? "border-l-[3px] border-blue-600 bg-blue-50 text-blue-600"
                  : "text-slate-700 hover:bg-slate-100"
              }`}
            >
              <User className={`h-5 w-5 ${activeId === "profile" ? "text-blue-600" : "text-slate-500"}`} />
              Hồ sơ cá nhân
            </Link>
          )}
        </nav>
      </aside>
    </>
  );
}
