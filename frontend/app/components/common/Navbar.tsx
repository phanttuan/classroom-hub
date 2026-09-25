"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Search, Menu, X } from "lucide-react";

const NAV_LINKS = [
  { label: "Tổng quan", href: "#overview" },
  { label: "Quy trình", href: "#how-it-works" },
  { label: "Tính năng", href: "#features" },
  { label: "Vai trò", href: "#roles" },
];

export default function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

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

  // Nền trắng tinh khi scroll (không mờ, không blur) — chỉ fade opacity nên mượt, không giật
  const solid = scrolled || mobileMenuOpen;

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
        <div className="flex items-center justify-between h-16">
          {/* Logo — chỉ dùng logo.webp */}
          <Link href="/" className="flex items-center shrink-0" aria-label="EduHub trang chủ">
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

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center gap-8">
            {NAV_LINKS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`text-sm font-medium transition-colors duration-500 ${
                  solid ? "text-slate-600 hover:text-blue-600" : "text-white/85 hover:text-white"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          {/* Right Action buttons */}
          <div className="hidden md:flex items-center gap-2.5">
            <button
              type="button"
              title="Tìm kiếm"
              className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors duration-500 border ${
                solid
                  ? "text-slate-500 hover:text-blue-600 hover:bg-slate-100 border-slate-200/80"
                  : "text-white bg-white/15 hover:bg-white/25 border-white/25"
              }`}
            >
              <Search className="w-4 h-4" />
            </button>

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

            <Link
              href="/register"
              className="px-5 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-full transition-colors duration-500 shadow-md shadow-blue-600/30"
            >
              Đăng ký
            </Link>
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
            <Link
              href="/login"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full text-center py-2.5 text-sm font-semibold text-slate-700 border border-slate-200 rounded-full"
            >
              Đăng nhập
            </Link>
            <Link
              href="/register"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full text-center py-2.5 text-sm font-semibold text-white bg-blue-600 rounded-full shadow-sm shadow-blue-500/30"
            >
              Đăng ký
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
