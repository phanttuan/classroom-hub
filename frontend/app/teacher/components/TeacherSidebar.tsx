"use client";

import Image from "next/image";
import Link from "next/link";
import {
  Bell,
  BookOpen,
  CalendarDays,
  CheckSquare,
  ChevronDown,
  ClipboardList,
  FileText,
  Home,
  NotebookPen,
  Users,
  User,
  type LucideIcon,
} from "lucide-react";
import { useState } from "react";
import type { SidebarItem } from "@/lib/types/teacher";
import { teacherSidebarNav } from "@/lib/mock/teacher-dashboard";

const ICON_MAP: Record<SidebarItem["icon"], LucideIcon> = {
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

function Logo() {
  return (
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
  );
}

export default function TeacherSidebar({
  mobileOpen,
  onClose,
  activeId = "home",
  activeHref,
}: {
  mobileOpen: boolean;
  onClose: () => void;
  /** id menu đang active: home | classes | content | ... */
  activeId?: string;
  /** href con đang active (vd /teacher/content/courses) để highlight */
  activeHref?: string;
}) {
  // "Nội dung học tập" mở sẵn khi đang ở các tab con
  const defaultExpanded =
    activeId === "content" || activeHref?.startsWith("/teacher/content")
      ? ["content"]
      : ["content"];
  const [expanded, setExpanded] = useState<string[]>(defaultExpanded);

  const toggle = (id: string) =>
    setExpanded((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );

  return (
    <>
      {/* overlay mobile */}
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
          <Logo />
        </div>

        <nav className="flex-1 overflow-y-auto px-3 pb-4 pt-2">
          <ul className="space-y-1">
            {teacherSidebarNav.slice(0, 8).map((item) => {
              const Icon = ICON_MAP[item.icon] ?? FileText;
              const isOpen = expanded.includes(item.id);
              if (item.expandable) {
                const parentActive = activeId === item.id;
                return (
                  <li key={item.id}>
                    <button
                      onClick={() => toggle(item.id)}
                      className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-[15px] font-medium transition ${
                        parentActive
                          ? "border-l-[3px] border-blue-600 bg-blue-50 text-blue-600"
                          : "text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      <Icon className={`h-5 w-5 ${parentActive ? "text-blue-600" : "text-slate-500"}`} />
                      <span className="flex-1 text-left">{item.label}</span>
                      <ChevronDown
                        className={`h-4 w-4 text-slate-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
                      />
                    </button>
                    {isOpen && (
                      <ul className="mt-1 space-y-1 pl-11 pr-2">
                        {item.children?.map((c) => {
                          const childActive = activeHref === c.href;
                          return (
                            <li key={c.label}>
                              <Link
                                href={c.href}
                                onClick={onClose}
                                className={`block rounded-md px-2 py-1.5 text-[14px] transition ${
                                  childActive
                                    ? "bg-blue-50 font-semibold text-blue-600"
                                    : "text-slate-500 hover:bg-blue-50 hover:text-blue-600"
                                }`}
                              >
                                {c.label}
                              </Link>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </li>
                );
              }
              return (
                <li key={item.id}>
                  <Link
                    href={item.href}
                    onClick={onClose}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-[15px] font-medium transition ${
                      activeId === item.id
                        ? "border-l-[3px] border-blue-600 bg-blue-50 text-blue-600"
                        : "text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    <Icon
                      className={`h-5 w-5 ${activeId === item.id ? "text-blue-600" : "text-slate-500"}`}
                    />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>

          <div className="my-4 border-t border-slate-100" />

          <Link
            href="/teacher/profile"
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
