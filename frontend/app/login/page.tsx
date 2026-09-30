"use client";

import React, { useState, Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  AlertCircle,
  X,
  KeyRound,
  CheckCircle2,
} from "lucide-react";
import Navbar from "../components/common/Navbar";

function LoginFormContent() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Modal Quên mật khẩu
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotSubmitted, setForgotSubmitted] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);

  // Xử lý đăng nhập
  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      setErrorMessage("Vui lòng nhập địa chỉ email.");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      setErrorMessage("Địa chỉ email không hợp lệ.");
      return;
    }

    if (!password) {
      setErrorMessage("Vui lòng nhập mật khẩu.");
      return;
    }

    if (password.length < 6) {
      setErrorMessage("Mật khẩu không chính xác. Vui lòng thử lại.");
      return;
    }

    setIsLoading(true);

    // Xác định vai trò dựa vào tài khoản để điều hướng phù hợp
    let redirectUrl = "/teacher";
    if (trimmedEmail.toLowerCase().includes("admin")) {
      redirectUrl = "/admin";
    } else if (
      trimmedEmail.toLowerCase().includes("student") ||
      trimmedEmail.toLowerCase().includes("st") ||
      trimmedEmail.toLowerCase().includes("hocsinh") ||
      trimmedEmail.toLowerCase().includes("sinhvien")
    ) {
      redirectUrl = "/student";
    }

    setTimeout(() => {
      setIsLoading(false);
      router.push(redirectUrl);
    }, 900);
  };

  const handleForgotSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail.trim()) return;
    setForgotLoading(true);
    setTimeout(() => {
      setForgotLoading(false);
      setForgotSubmitted(true);
    }, 800);
  };

  return (
    <div className="relative min-h-screen flex flex-col justify-between selection:bg-blue-600 selection:text-white">
      {/* 1. Header dùng chung với trang chủ */}
      <Navbar forceSolid={true} />

      {/* 2. Ảnh nền background_login.webp toàn trang */}
      <div className="fixed inset-0 z-0">
        <Image
          src="/images/background_login.webp"
          alt="EduHub Background"
          fill
          priority
          quality={100}
          className="object-cover object-center"
        />
        {/* Lớp phủ gradient nhẹ để tôn card đăng nhập */}
        <div className="absolute inset-0 bg-slate-900/35 backdrop-blur-[2px]" />
      </div>

      {/* 3. Card Đăng nhập căn giữa màn hình */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-4 sm:px-6 pt-24 pb-12">
        <div className="w-full max-w-[580px] bg-white/95 backdrop-blur-xl rounded-3xl shadow-[0_20px_60px_rgba(15,23,42,0.25)] border border-white/80 p-8 sm:p-10 lg:p-11 transition-all duration-300">
          {/* Logo & Tiêu đề */}
          <div className="text-center space-y-2 mb-8">
            <div className="inline-flex justify-center mb-1">
              <Image
                src="/images/logo.webp"
                alt="EduHub"
                width={150}
                height={38}
                priority
                className="h-8 w-auto object-contain"
              />
            </div>
            <h1 className="text-2xl sm:text-[26px] font-bold text-slate-900 tracking-tight">
              Đăng nhập tài khoản
            </h1>
            <p className="text-sm text-slate-500">
              Chào mừng bạn quay trở lại với nền tảng EduHub
            </p>
          </div>

          {/* Thông báo lỗi nếu có */}
          {errorMessage && (
            <div className="mb-6 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <div className="text-xs sm:text-sm">{errorMessage}</div>
            </div>
          )}

          {/* Form đăng nhập */}
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            {/* Field Email */}
            <div className="space-y-1.5">
              <label
                htmlFor="email"
                className="block text-xs font-semibold text-slate-700 uppercase tracking-wide"
              >
                Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  autoComplete="email"
                  required
                  className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-50/70 hover:bg-slate-50 focus:bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all placeholder:text-slate-400 text-slate-800"
                />
              </div>
            </div>

            {/* Field Mật khẩu */}
            <div className="space-y-1.5">
              <label
                htmlFor="password"
                className="block text-xs font-semibold text-slate-700 uppercase tracking-wide"
              >
                Mật khẩu
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Nhập mật khẩu"
                  autoComplete="current-password"
                  required
                  className="w-full pl-10 pr-11 py-2.5 text-sm bg-slate-50/70 hover:bg-slate-50 focus:bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all placeholder:text-slate-400 text-slate-800"
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                  aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Remember Me & Quên mật khẩu (Cùng một hàng) */}
            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 transition-colors"
                />
                <span className="text-xs text-slate-600">Ghi nhớ đăng nhập</span>
              </label>
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setShowForgotModal(true)}
                className="text-xs font-medium text-blue-600 hover:text-blue-700 hover:underline"
              >
                Quên mật khẩu?
              </button>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm shadow-md shadow-blue-600/25 hover:shadow-lg hover:shadow-blue-600/35 transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed mt-2 active:scale-[0.99]"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Đang đăng nhập...</span>
                </>
              ) : (
                <>
                  <span>Đăng nhập</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="relative flex items-center justify-center my-6">
            <div className="border-t border-slate-200 w-full" />
            <span className="bg-white/95 px-3 text-xs text-slate-400 uppercase tracking-wider absolute">
              Hoặc
            </span>
          </div>

          {/* Đăng nhập bằng Google */}
          <div>
            <button
              type="button"
              onClick={() => {
                setIsLoading(true);
                setTimeout(() => {
                  setIsLoading(false);
                  router.push("/teacher");
                }, 800);
              }}
              className="w-full py-2.5 px-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold text-sm transition-all duration-200 flex items-center justify-center gap-3 cursor-pointer"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.65v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.14z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.34 24 12 24z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.28 14.27a7.17 7.17 0 0 1 0-4.54V6.58H1.25a11.96 11.96 0 0 0 0 10.84l4.03-3.15z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                />
              </svg>
              <span>Đăng nhập với Google</span>
            </button>
          </div>

          {/* Chuyển sang Đăng ký */}
          <div className="mt-8 pt-4 border-t border-slate-100 text-center text-sm text-slate-500">
            Chưa có tài khoản?{" "}
            <Link
              href="/register"
              className="font-semibold text-blue-600 hover:text-blue-700 hover:underline"
            >
              Đăng ký ngay
            </Link>
          </div>
        </div>
      </main>

      {/* Modal Quên mật khẩu */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-100 relative">
            <button
              onClick={() => {
                setShowForgotModal(false);
                setForgotSubmitted(false);
              }}
              className="absolute top-5 right-5 p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {!forgotSubmitted ? (
              <form onSubmit={handleForgotSubmit} className="space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-2">
                  <KeyRound className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-xl font-bold text-slate-900">Quên mật khẩu?</h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Nhập địa chỉ email tài khoản của bạn để nhận liên kết khôi phục mật khẩu.
                  </p>
                </div>

                <div className="space-y-1.5 pt-2">
                  <label className="block text-xs font-semibold text-slate-700 uppercase">Email đã đăng ký</label>
                  <input
                    type="email"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    placeholder="name@example.com"
                    required
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>

                <div className="flex gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowForgotModal(false)}
                    className="w-1/2 py-2.5 text-sm font-semibold rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    disabled={forgotLoading}
                    className="w-1/2 py-2.5 text-sm font-semibold rounded-xl bg-blue-600 text-white hover:bg-blue-700 flex items-center justify-center gap-2"
                  >
                    {forgotLoading ? "Đang gửi..." : "Gửi liên kết"}
                  </button>
                </div>
              </form>
            ) : (
              <div className="text-center py-4 space-y-4">
                <div className="w-14 h-14 rounded-full bg-emerald-50 text-emerald-600 mx-auto flex items-center justify-center">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-lg font-bold text-slate-900">Đã gửi email khôi phục</h3>
                  <p className="text-xs text-slate-500 leading-relaxed max-w-xs mx-auto">
                    Vui lòng kiểm tra hộp thư đến của <span className="font-semibold text-slate-700">{forgotEmail}</span> để tạo lại mật khẩu mới.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowForgotModal(false);
                    setForgotSubmitted(false);
                  }}
                  className="w-full py-2.5 text-sm font-semibold rounded-xl bg-blue-600 text-white hover:bg-blue-700"
                >
                  Xác nhận
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 4. Footer gọn gàng */}
      <footer className="relative z-10 py-4 text-center text-xs text-white/75 drop-shadow-sm">
        © 2026 EduHub · Nền tảng hỗ trợ giáo viên xây dựng và tổ chức đào tạo trực tuyến
      </footer>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-900">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <LoginFormContent />
    </Suspense>
  );
}
