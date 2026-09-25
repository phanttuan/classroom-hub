"use client";

import Image from "next/image";
import Link from "next/link";
import { GraduationCap, Home, Users } from "lucide-react";
import { adminSidebarNav } from "@/lib/mock/admin";

const ICONS = {
  home: Home,
  users: Users,
  classes: GraduationCap,
} as const;

export default function AdminSidebar({
  mobileOpen,
  onClose,
  activeId,
}: {
  mobileOpen: boolean;
  onClose: () => void;
  activeId: string;
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
        {/* Logo — dùng đúng logo.webp như header trang chủ, bấm về trang chủ */}
        <div className="px-5 pb-3 pt-5">
          <Link href="/" aria-label="Về trang chủ" className="inline-block">
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

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 pb-4 pt-3">
          <ul className="space-y-1">
            {adminSidebarNav.map((item) => {
              const Icon = ICONS[item.icon];
              const active = activeId === item.id;
              return (
                <li key={item.id}>
                  <Link
                    href={item.href}
                    onClick={onClose}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-[15px] font-medium transition ${
                      active
                        ? "border-l-[3px] border-blue-600 bg-blue-50 text-blue-600"
                        : "border-l-[3px] border-transparent text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    <Icon
                      className={`h-5 w-5 ${active ? "text-blue-600" : "text-slate-500"}`}
                    />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </aside>
    </>
  );
}
