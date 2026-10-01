'use client';

import React from 'react';
import Link from 'next/link';
import { ShieldAlert, ArrowLeft, Home } from 'lucide-react';

export interface AccessDeniedProps {
  title?: string;
  message?: string;
  backHref?: string;
  backLabel?: string;
  showHomeButton?: boolean;
}

export default function AccessDenied({
  title = '403 - Quyền truy cập bị từ chối',
  message = 'Bạn không có quyền truy cập vào tài nguyên hoặc lớp học này. Có thể bạn chưa tham gia lớp, tài khoản đã bị gỡ khỏi danh sách, hoặc liên kết không chính xác.',
  backHref = '/student',
  backLabel = 'Về danh sách lớp học',
  showHomeButton = true,
}: AccessDeniedProps) {
  return (
    <div className="w-full max-w-lg mx-auto bg-white rounded-3xl border border-blue-100 shadow-[0_20px_50px_rgba(37,99,235,0.08)] p-8 sm:p-10 text-center animate-in fade-in zoom-in-95 duration-300">
      {/* Badge cảnh báo */}
      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-50 border border-rose-200 text-rose-700 mb-6">
        <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
        Truy cập bị giới hạn
      </div>

      {/* Biểu tượng khiên cảnh báo */}
      <div className="w-20 h-20 bg-rose-50 border-2 border-rose-100 rounded-3xl flex items-center justify-center mx-auto mb-6 text-rose-600 shadow-inner">
        <ShieldAlert className="w-10 h-10" />
      </div>

      {/* Tiêu đề lỗi */}
      <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mb-3">
        {title}
      </h1>

      {/* Mô tả chi tiết */}
      <p className="text-sm sm:text-base text-slate-600 mb-8 leading-relaxed max-w-md mx-auto">
        {message}
      </p>

      {/* Các nút điều hướng */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
        <Link
          href={backHref}
          className="w-full sm:flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white transition-all shadow-md shadow-blue-500/25 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          <ArrowLeft className="w-4 h-4" />
          {backLabel}
        </Link>

        {showHomeButton && (
          <Link
            href="/"
            className="w-full sm:flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition-all focus:outline-none focus:ring-2 focus:ring-slate-300"
          >
            <Home className="w-4 h-4" />
            Trang chủ
          </Link>
        )}
      </div>
    </div>
  );
}
