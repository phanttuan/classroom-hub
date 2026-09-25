"use client";

import Image from "next/image";
import { Bell, ChevronDown, Menu, Search } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { TeacherNotification, TeacherProfile } from "@/lib/types/teacher";

const DEFAULT_MENU = [
  { label: "Hồ sơ cá nhân", href: "/teacher/profile" },
  { label: "Cài đặt", href: "/teacher/settings" },
  { label: "Đăng xuất", href: "/login" },
];

export default function TeacherTopbar({
  profile,
  notifications,
  searchQuery,
  onSearchChange,
  onMenu,
  onOpenNotifications,
  placeholder = "Tìm kiếm lớp học, bài học, sinh viên...",
  menuItems = DEFAULT_MENU,
}: {
  profile: TeacherProfile;
  notifications: TeacherNotification[];
  searchQuery: string;
  onSearchChange: (v: string) => void;
  onMenu: () => void;
  onOpenNotifications: () => void;
  placeholder?: string;
  /** Menu dropdown avatar — cho phép tùy biến theo role (student dùng chung topbar này) */
  menuItems?: { label: string; href: string }[];
}) {
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const unread = notifications.filter((n) => n.unread).length || notifications.length;

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setProfileOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/70 bg-white/90 backdrop-blur">
      <div className="flex h-[68px] items-center gap-3 px-4 sm:px-6">
        <button
          onClick={onMenu}
          aria-label="Mở menu"
          className="grid h-10 w-10 place-items-center rounded-lg text-slate-600 hover:bg-slate-100 lg:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Search */}
        <div className="relative w-full max-w-[560px]">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-slate-400" />
          <input
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={placeholder}
            className="h-11 w-full rounded-lg border border-transparent bg-slate-100/90 pl-11 pr-4 text-[14px] text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-blue-300 focus:bg-white focus:ring-4 focus:ring-blue-100"
          />
        </div>

        <div className="ml-auto flex items-center gap-2 sm:gap-4">
          {/* Bell */}
          <button
            onClick={onOpenNotifications}
            aria-label="Thông báo"
            className="relative grid h-10 w-10 place-items-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
          >
            <Bell className="h-5 w-5" />
            {unread > 0 && (
              <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white" />
            )}
          </button>

          {/* Profile */}
          <div ref={profileRef} className="relative">
            <button
              onClick={() => setProfileOpen((v) => !v)}
              className="flex items-center gap-2.5 rounded-full py-1 pl-1 pr-1 transition hover:bg-slate-100 sm:pr-2"
            >
              <span className="relative h-10 w-10 overflow-hidden rounded-full bg-slate-200">
                <Image
                  src={profile.avatarUrl}
                  alt={profile.fullName}
                  width={80}
                  height={80}
                  className="h-full w-full object-cover"
                />
              </span>
              <span className="hidden text-left sm:block">
                <span className="block text-[14px] font-bold leading-tight text-slate-900">
                  {profile.fullName}
                </span>
                <span className="block text-[12px] leading-tight text-slate-500">
                  {profile.role}
                </span>
              </span>
              <ChevronDown className="hidden h-4 w-4 text-slate-400 sm:block" />
            </button>

            {profileOpen && (
              <div className="absolute right-0 top-[calc(100%+8px)] w-56 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-xl shadow-slate-900/10">
                {menuItems.map((i) => (
                  <a
                    key={i.label}
                    href={i.href}
                    className="block px-4 py-2.5 text-sm text-slate-600 transition last:text-red-600 hover:bg-slate-50"
                  >
                    {i.label}
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
