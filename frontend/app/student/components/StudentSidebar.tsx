"use client";

import Image from "next/image";
import Link from "next/link";
import {
  Bell,
  BookOpen,
  CalendarDays,
  CheckSquare,
  ClipboardList,
  Home,
  NotebookPen,
  Users,
  User,
  type LucideIcon,
} from "lucide-react";

type NavIcon = "home" | "classes" | "content" | "assignment" | "quiz" | "gradebook" | "bell" | "calendar" | "profile";

const NAV: { id: string; label: string; icon: NavIcon; href: string }[] = [
  { id: "home", label: "Tổng quan", icon: "home", href: "/student" },
  { id: "classes", label: "Lớp học", icon: "classes", href: "/student/classes" },
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

export default function StudentSidebar({
  mobileOpen,
  onClose,
  activeId = "home",
}: {
  mobileOpen: boolean;
  onClose: () => void;
  activeId?: string;
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
        className={`fixed inset-y-0 left-0 z-50 flex w-[248px] flex-col border-r border-slate-200/80 bg-white transition-transform duration-300 lg:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="px-4 pt-5 pb-3">
          <Link href="/" aria-label="Về trang chủ" className="inline-block px-2 py-1">
            <Image
              src="/images/logo.webp"
              alt="EduLearn"
              width={180}
              height={48}
              priority
              className="h-10 w-auto object-contain"
            />
          </Link>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 pb-4 pt-2">
          <ul className="space-y-1">
            {NAV.map((item) => {
              const Icon = ICON_MAP[item.icon];
              const active = activeId === item.id;
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
        </nav>
      </aside>
    </>
  );
}
