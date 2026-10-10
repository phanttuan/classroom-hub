'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ShieldAlert, Home, LogIn, LayoutDashboard } from 'lucide-react';

export interface AccessDeniedProps {
  title?: string;
  message?: string;
  backHref?: string;
  backLabel?: string;
  showHomeButton?: boolean;
}

export default function AccessDenied({
  title = '403 – Quyền truy cập bị từ chối',
  message = 'Bạn không có quyền truy cập vào tài nguyên hoặc khóa học này. Có thể bạn chưa tham gia khóa học, tài khoản đã bị gỡ khỏi danh sách, hoặc liên kết không chính xác.',
  backHref,
  backLabel,
  showHomeButton = true,
}: AccessDeniedProps) {
  const [currentUser, setCurrentUser] = useState<{ role?: string } | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('user');
      if (raw) {
        setCurrentUser(JSON.parse(raw));
      }
    } catch {
      // Bỏ qua lỗi parse
    }
  }, []);

  // Xác định đường dẫn dashboard theo vai trò của người dùng
  let dashboardHref = '/student';
  if (currentUser?.role === 'ADMIN') {
    dashboardHref = '/admin';
  } else if (currentUser?.role === 'TEACHER') {
    dashboardHref = '/teacher';
  }

  // 1. Nếu đã đăng nhập:
  //    - Nút 1: "Về trang của tôi" (vào dashboard tương ứng)
  //    - Nút 2: "Trang chủ"
  // 2. Nếu chưa đăng nhập:
  //    - Nút 1: "Đăng nhập"
  //    - Nút 2: "Trang chủ"
  const isAuth = !!currentUser;
  const primaryHref = isAuth ? (backHref || dashboardHref) : '/login';
  const primaryLabel = isAuth ? (backLabel || 'Về trang của tôi') : 'Đăng nhập';

  return (
    <div className="w-full max-w-xl mx-auto bg-white rounded-3xl border border-slate-200/90 shadow-[0_20px_60px_rgba(15,23,42,0.08)] p-7 sm:p-10 text-center animate-in fade-in zoom-in-95 duration-300">
      {/* Biểu tượng khiên cảnh báo đỏ cao cấp */}
      <div className="w-20 h-20 bg-gradient-to-b from-rose-50 to-rose-100/70 border border-rose-200/80 rounded-3xl flex items-center justify-center mx-auto mb-6 text-rose-600 shadow-lg shadow-rose-500/10">
        <ShieldAlert className="w-10 h-10" />
      </div>

      {/* Tiêu đề lỗi màu đỏ trên 1 dòng duy nhất */}
      <h1 className="text-xl sm:text-2xl lg:text-[26px] font-bold text-rose-600 tracking-tight mb-3 whitespace-nowrap">
        {title}
      </h1>

      {/* Mô tả chi tiết */}
      <p className="text-xs sm:text-sm md:text-base text-slate-600 mb-8 leading-relaxed max-w-lg mx-auto [text-wrap:pretty]">
        {message}
      </p>

      {/* Các nút điều hướng */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
        {/* Nút chính: "Về trang của tôi" (nếu đã đăng nhập) HOẶC "Đăng nhập" (nếu chưa) */}
        <Link
          href={primaryHref}
          className="w-full sm:flex-1 inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white transition-all shadow-md shadow-blue-600/25 hover:shadow-lg hover:shadow-blue-600/30 cursor-pointer active:scale-[0.98]"
        >
          {isAuth ? (
            <>
              <LayoutDashboard className="w-4 h-4 shrink-0" />
              <span>{primaryLabel}</span>
            </>
          ) : (
            <>
              <LogIn className="w-4 h-4 shrink-0" />
              <span>{primaryLabel}</span>
            </>
          )}
        </Link>

        {/* Nút phụ: "Trang chủ" */}
        {showHomeButton && (
          <Link
            href="/"
            className="w-full sm:flex-1 inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 text-slate-700 transition-all shadow-xs cursor-pointer active:scale-[0.98]"
          >
            <Home className="w-4 h-4 shrink-0" />
            <span>Trang chủ</span>
          </Link>
        )}
      </div>
    </div>
  );
}
