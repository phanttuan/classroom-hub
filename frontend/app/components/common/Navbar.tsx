"use client";

import React, { useEffect, useState, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  Menu,
  X,
  ChevronDown,
  LogOut,
  LayoutDashboard,
  User as UserIcon,
} from "lucide-react";
import { logoutUser } from "@/lib/auth";

const NAV_LINKS = [
  { label: "Tổng quan", href: "/#overview" },
  { label: "Quy trình", href: "/#how-it-works" },
  { label: "Tính năng", href: "/#features" },
  { label: "Vai trò", href: "/#roles" },
];

interface CurrentUser {
  id?: string | number;
  email?: string;
  fullName?: string;
  role?: string;
  avatarUrl?: string;
}

export default function Navbar({ forceSolid = false }: { forceSolid?: boolean } = {}) {
  const pathname = usePathname();
  const isAuthRoute =
    pathname === "/login" || pathname === "/register" || pathname === "/logout";

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  const shouldShowUser = !isAuthRoute && !!currentUser;

  // Lấy thông tin user đăng nhập từ localStorage (chỉ khi không phải trang xác thực auth)
  useEffect(() => {
    if (isAuthRoute) {
      setCurrentUser(null);
      return;
    }

    try {
      const hasToken =
        document.cookie.includes("auth_token=") ||
        document.cookie.includes("user_role=") ||
        !!localStorage.getItem("auth_token");

      const raw = localStorage.getItem("user");
      if (raw && hasToken) {
        setCurrentUser(JSON.parse(raw));
      } else {
        if (!hasToken) {
          localStorage.removeItem("user");
        }
        setCurrentUser(null);
      }
    } catch {
      setCurrentUser(null);
    }
  }, [isAuthRoute]);

  // Đóng dropdown khi click ra ngoài
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Scroll mượt, không giật: throttle bằng requestAnimationFrame + listener passive
  useEffect(() => {
    let ticking = false;
    const update = () => {
      ticking = false;
      setScrolled(window.scrollY > 16);
    };
    const onScroll = () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
      }
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Nền trắng tinh khi scroll hoặc khi được chỉ định forceSolid
  const solid = forceSolid || scrolled || mobileMenuOpen;

  // Xác định vai trò & đường dẫn dashboard tương ứng
  let roleLabel = "Học sinh";
  let dashboardHref = "/student";
  let profileHref = "/student/profile";

  if (currentUser?.role === "ADMIN") {
    roleLabel = "Quản trị viên";
    dashboardHref = "/admin";
    profileHref = "/admin/profile";
  } else if (currentUser?.role === "TEACHER") {
    roleLabel = "Giảng viên";
    dashboardHref = "/teacher";
    profileHref = "/teacher/profile";
  }

  return (
    <header className="fixed top-0 z-50 w-full border-0">
      {/* Lớp nền trắng tinh fade in/out — không border, chỉ shadow nhẹ nên không có lằn ngăn cách */}
      <div
        aria-hidden="true"
        className={`absolute inset-0 bg-white shadow-[0_8px_30px_rgba(2,6,23,0.08)] transition-opacity duration-500 ease-out will-change-[opacity] ${
          solid ? "opacity-100" : "opacity-0"
        }`}
      />

      <div className="relative max-w-[1320px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative flex items-center justify-between h-16">
          {/* Logo — chỉ dùng logo.webp */}
          <Link href="/" className="flex items-center shrink-0 z-10" aria-label="EduHub trang chủ">
            <Image
              src="/images/logo.webp"
              alt="EduHub"
              width={150}
              height={40}
              priority
              className={`h-8 w-auto object-contain transition-all duration-500 ${
                solid ? "" : "brightness-0 invert"
              }`}
            />
          </Link>

          {/* Desktop Nav Links — Căn chính xác giữa header tuyệt đối */}
          <nav className="hidden md:flex items-center gap-8 absolute left-1/2 -translate-x-1/2">
            {NAV_LINKS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`text-sm font-medium transition-colors duration-500 whitespace-nowrap ${
                  solid ? "text-slate-600 hover:text-blue-600" : "text-white/85 hover:text-white"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          {/* Right Action buttons: Nếu đã đăng nhập thì hiện Avatar & Tên & Dropdown */}
          <div className="hidden md:flex items-center gap-3 z-10">
            {shouldShowUser ? (
              <div ref={profileRef} className="relative">
                <button
                  type="button"
                  onClick={() => setProfileMenuOpen((prev) => !prev)}
                  className={`flex items-center gap-2 py-1 pl-1 pr-2.5 rounded-full border transition-all cursor-pointer shadow-xs ${
                    solid
                      ? "border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-800"
                      : "border-white/20 bg-white/10 hover:bg-white/20 text-white"
                  }`}
                >
                  {currentUser?.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={currentUser.avatarUrl}
                      alt={currentUser.fullName || "Avatar"}
                      className="w-7 h-7 rounded-full object-cover shrink-0 border border-slate-200"
                    />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-xs">
                      {currentUser?.fullName ? currentUser.fullName.charAt(0).toUpperCase() : "U"}
                    </div>
                  )}
                  <span className="text-xs sm:text-sm font-semibold max-w-[120px] sm:max-w-[160px] truncate">
                    {currentUser?.fullName || "Tài khoản"}
                  </span>
                  <ChevronDown
                    className={`w-3.5 h-3.5 transition-transform duration-200 ${
                      profileMenuOpen ? "rotate-180" : ""
                    } ${solid ? "text-slate-400" : "text-white/70"}`}
                  />
                </button>

                {/* Dropdown Menu — Căn chính giữa trọng tâm nút phía trên */}
                {profileMenuOpen && (
                  <div className="absolute left-1/2 -translate-x-1/2 top-[calc(100%+8px)] w-64 bg-white rounded-2xl border border-slate-200/90 shadow-xl shadow-slate-900/10 py-2 z-50 animate-in fade-in zoom-in-95 text-left">
                    {/* Header thông tin người dùng */}
                    <div className="px-4 py-2.5 border-b border-slate-100 flex items-center gap-3">
                      {currentUser?.avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={currentUser.avatarUrl}
                          alt={currentUser.fullName || "Avatar"}
                          className="w-10 h-10 rounded-full object-cover shrink-0 border border-slate-200"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-blue-600 text-white font-bold text-sm flex items-center justify-center shrink-0">
                          {currentUser?.fullName ? currentUser.fullName.charAt(0).toUpperCase() : "U"}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-bold text-slate-900 truncate">
                          {currentUser?.fullName || "Người dùng"}
                        </div>
                        <div className="text-xs text-slate-500 truncate">
                          {currentUser?.email || ""}
                        </div>
                        <div className="mt-1">
                          <span className="inline-block px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[10px] font-bold border border-blue-200/80">
                            {roleLabel}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Danh sách mục chuyển nhanh */}
                    <div className="py-1">
                      <Link
                        href={dashboardHref}
                        onClick={() => setProfileMenuOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2 text-xs sm:text-sm font-medium text-slate-700 hover:bg-slate-50 hover:text-blue-600 transition-colors"
                      >
                        <LayoutDashboard className="w-4 h-4 text-slate-400" />
                        <span>Trang tổng quan</span>
                      </Link>
                    </div>

                    {/* Nút Đăng xuất an toàn */}
                    <div className="pt-1 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={async () => {
                          await logoutUser();
                          setCurrentUser(null);
                          setProfileMenuOpen(false);
                          window.location.href = "/login";
                        }}
                        className="w-full flex items-center gap-2.5 px-4 py-2 text-xs sm:text-sm font-medium text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer text-left"
                      >
                        <LogOut className="w-4 h-4 text-rose-500" />
                        <span>Đăng xuất</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <>
                {pathname !== "/login" && (
                  <Link
                    href="/login"
                    className={`px-5 py-2 text-sm font-semibold rounded-full transition-colors duration-500 ${
                      solid
                        ? "text-slate-700 bg-white hover:bg-slate-50 border border-slate-200"
                        : "text-slate-900 bg-white hover:bg-slate-100"
                    }`}
                  >
                    Đăng nhập
                  </Link>
                )}

                {pathname !== "/register" && (
                  <Link
                    href="/register"
                    className="px-5 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-full transition-colors duration-500 shadow-md shadow-blue-600/30"
                  >
                    Đăng ký
                  </Link>
                )}
              </>
            )}
          </div>

          {/* Mobile menu trigger */}
          <div className="flex md:hidden items-center gap-2">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Mở menu"
              className={`p-2 rounded-lg transition-colors duration-500 ${
                solid ? "text-slate-600 hover:bg-slate-100" : "text-white hover:bg-white/15"
              }`}
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="relative md:hidden bg-white px-4 pt-2 pb-6 space-y-3 shadow-[0_16px_40px_rgba(2,6,23,0.12)]">
          <nav className="flex flex-col space-y-1">
            {NAV_LINKS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2.5 text-[15px] font-medium text-slate-700 hover:bg-blue-50 hover:text-blue-600 rounded-lg"
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="pt-4 border-t border-slate-100 flex flex-col gap-2">
            {shouldShowUser ? (
              <>
                <div className="flex items-center gap-3 px-3 py-2 bg-slate-50 rounded-xl mb-1">
                  {currentUser?.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={currentUser.avatarUrl}
                      alt={currentUser.fullName || "Avatar"}
                      className="w-9 h-9 rounded-full object-cover shrink-0 border border-slate-200"
                    />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                      {currentUser?.fullName ? currentUser.fullName.charAt(0).toUpperCase() : "U"}
                    </div>
                  )}
                  <div className="min-w-0 flex-1 text-left">
                    <div className="text-sm font-bold text-slate-900 truncate">
                      {currentUser?.fullName || "Người dùng"}
                    </div>
                    <div className="text-xs text-slate-500">
                      {roleLabel}
                    </div>
                  </div>
                </div>

                <Link
                  href={dashboardHref}
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full text-center py-2.5 text-sm font-semibold text-slate-700 border border-slate-200 rounded-full"
                >
                  Trang tổng quan
                </Link>

                <button
                  type="button"
                  onClick={async () => {
                    await logoutUser();
                    setCurrentUser(null);
                    setMobileMenuOpen(false);
                    window.location.href = "/login";
                  }}
                  className="w-full text-center py-2.5 text-sm font-semibold text-rose-600 border border-rose-200 hover:bg-rose-50 rounded-full cursor-pointer"
                >
                  Đăng xuất
                </button>
              </>
            ) : (
              <>
                {pathname !== "/login" && (
                  <Link
                    href="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="w-full text-center py-2.5 text-sm font-semibold text-slate-700 border border-slate-200 rounded-full"
                  >
                    Đăng nhập
                  </Link>
                )}
                {pathname !== "/register" && (
                  <Link
                    href="/register"
                    onClick={() => setMobileMenuOpen(false)}
                    className="w-full text-center py-2.5 text-sm font-semibold text-white bg-blue-600 rounded-full shadow-sm shadow-blue-500/30"
                  >
                    Đăng ký
                  </Link>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
