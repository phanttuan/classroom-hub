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
  AlertCircle,
  X,
  KeyRound,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import Navbar from "../components/common/Navbar";
import { toast } from "../components/common/Toast";
import { saveAuthSession } from "@/lib/auth";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api/v1";

function LoginFormContent() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  // Lỗi hiển thị
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{
    email?: string;
    password?: string;
  }>({});

  // Modal Quên mật khẩu
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotSubmitted, setForgotSubmitted] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);

  // Thông báo tính năng Google đang phát triển
  const [showGoogleNotice, setShowGoogleNotice] = useState(false);

  // Xóa lỗi từng trường khi người dùng gõ
  const handleEmailChange = (val: string) => {
    setEmail(val);
    if (fieldErrors.email) {
      setFieldErrors((prev) => ({ ...prev, email: undefined }));
    }
    setErrorMessage(null);
  };

  const handlePasswordChange = (val: string) => {
    setPassword(val);
    if (fieldErrors.password) {
      setFieldErrors((prev) => ({ ...prev, password: undefined }));
    }
    setErrorMessage(null);
  };

  // Xử lý đăng nhập thực tế kết nối Backend NestJS
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const errors: { email?: string; password?: string } = {};
    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      errors.email = "Vui lòng nhập địa chỉ email.";
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(trimmedEmail)) {
        errors.email = "Email không đúng định dạng (vd:\u00A0name@domain.com).";
      }
    }

    if (!password) {
      errors.password = "Vui lòng nhập mật khẩu.";
    } else if (password.length < 6) {
      errors.password = "Mật khẩu phải có tối\u00A0thiểu 6\u00A0ký\u00A0tự.";
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setFieldErrors({});
    setIsLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include", // Quan trọng: lưu HttpOnly cookie tự động vào trình duyệt
        body: JSON.stringify({
          email: trimmedEmail,
          password,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        if (result.errors && typeof result.errors === "object") {
          setFieldErrors(result.errors);
        }
        const msg =
          result.message || "Email hoặc mật khẩu không chính xác. Vui lòng thử lại.";
        setErrorMessage(msg);
        toast.error("Đăng nhập không thành công", msg);
        setIsLoading(false);
        return;
      }

      // Đăng nhập thành công -> Lưu session để Next.js proxy và client-side nhận diện
      saveAuthSession(result.data?.tokens, result.data?.user);

      // Điều hướng đúng role của user
      const user = result.data?.user;
      let targetPath = "/teacher";
      let roleLabel = "Giảng viên";

      if (user?.role === "ADMIN") {
        targetPath = "/admin";
        roleLabel = "Quản trị viên";
      } else if (user?.role === "STUDENT") {
        targetPath = "/student";
        roleLabel = "Học sinh";
      } else if (user?.role === "TEACHER") {
        targetPath = "/teacher";
        roleLabel = "Giảng viên";
      }

      // Kích hoạt flash toast hiển thị trên trang đích
      toast.flash(
        "success",
        "Đăng nhập thành công!",
        `Chào mừng ${user?.fullName || "bạn"} quay trở lại với EduHub.`,
        { icon: "login", badge: roleLabel },
      );

      router.push(targetPath);
    } catch {
      const networkError =
        "Không thể kết nối đến máy chủ. Vui lòng kiểm tra lại kết nối mạng hoặc thử lại sau.";
      setErrorMessage(networkError);
      toast.error("Lỗi kết nối", networkError);
      setIsLoading(false);
    }
  };

  const handleForgotSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail) return;
    setForgotLoading(true);
    setTimeout(() => {
      setForgotLoading(false);
      setForgotSubmitted(true);
      toast.success(
        "Đã gửi email khôi phục",
        `Vui lòng kiểm tra hộp thư đến của ${forgotEmail}`,
      );
    }, 1200);
  };

  return (
    <div className="relative min-h-screen flex flex-col pt-16 selection:bg-blue-600 selection:text-white">
      {/* 1. Header chung với trang chủ */}
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
        <div className="absolute inset-0 bg-slate-900/35 backdrop-blur-[2px]" />
      </div>

      {/* 3. Card Đăng nhập căn giữa hoàn hảo (Khoảng cách trên và dưới bằng nhau tuyệt đối) */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-4 sm:px-6 py-4">
        <div className="w-full max-w-[530px] bg-white/95 backdrop-blur-xl rounded-3xl shadow-[0_20px_50px_rgba(15,23,42,0.2)] border border-white/80 px-8 py-7 sm:px-11 sm:py-8 transition-all duration-300">
          {/* Logo & Tiêu đề */}
          <div className="text-center mb-4 sm:mb-5">
            <div className="flex justify-center mb-2">
              <Link href="/" className="inline-block transition-transform hover:scale-105 duration-200" title="EduHub Trang chủ">
                <Image
                  src="/images/logo.webp"
                  alt="EduHub"
                  width={140}
                  height={36}
                  priority
                  className="h-8 sm:h-8.5 w-auto object-contain"
                />
              </Link>
            </div>
            <h1 className="text-2xl sm:text-[26px] font-bold text-slate-900 tracking-tight leading-tight">
              Đăng nhập tài khoản
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Chào mừng bạn quay trở lại với nền tảng EduHub
            </p>
          </div>

          {/* Thông báo lỗi tổng quát */}
          {errorMessage && (
            <div className="mb-3.5 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs sm:text-sm flex items-start gap-2.5 animate-fadeIn">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
              <div className="leading-relaxed">{errorMessage}</div>
            </div>
          )}

          {/* Thông báo tính năng Google đang phát triển */}
          {showGoogleNotice && (
            <div className="mb-3.5 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs sm:text-sm flex items-center justify-between gap-2 animate-fadeIn">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 shrink-0 text-amber-600" />
                <span>
                  Tính năng <strong>Đăng nhập với Google</strong> đang được phát triển theo lộ trình của hệ thống.
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowGoogleNotice(false)}
                className="text-amber-600 hover:text-amber-800 p-0.5 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Form đăng nhập */}
          <form onSubmit={handleLoginSubmit} noValidate className="space-y-3.5 sm:space-y-4">
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
                  onChange={(e) => handleEmailChange(e.target.value)}
                  placeholder="name@example.com"
                  autoComplete="email"
                  className={`w-full pl-10 pr-4 py-2.5 sm:py-3 text-sm rounded-xl focus:outline-none transition-all placeholder:text-slate-400 text-slate-800 ${
                    fieldErrors.email
                      ? "bg-rose-50/30 border border-rose-300 focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                      : "bg-slate-50/70 hover:bg-slate-50 focus:bg-white border border-slate-200 focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                  }`}
                />
              </div>
              {/* Lỗi chữ đỏ bên dưới trường */}
              {fieldErrors.email && (
                <p className="text-xs text-rose-600 pl-0.5 flex items-start gap-1.5 leading-snug animate-fadeIn">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-rose-500" />
                  <span className="[text-wrap:pretty]">{fieldErrors.email}</span>
                </p>
              )}
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
                  onChange={(e) => handlePasswordChange(e.target.value)}
                  placeholder="Nhập mật khẩu của bạn"
                  autoComplete="current-password"
                  className={`w-full pl-10 pr-10 py-2.5 sm:py-3 text-sm rounded-xl focus:outline-none transition-all placeholder:text-slate-400 text-slate-800 ${
                    fieldErrors.password
                      ? "bg-rose-50/30 border border-rose-300 focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                      : "bg-slate-50/70 hover:bg-slate-50 focus:bg-white border border-slate-200 focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                  }`}
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
              {/* Lỗi chữ đỏ bên dưới trường */}
              {fieldErrors.password && (
                <p className="text-xs text-rose-600 pl-0.5 flex items-start gap-1.5 leading-snug animate-fadeIn">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-rose-500" />
                  <span className="[text-wrap:pretty]">{fieldErrors.password}</span>
                </p>
              )}
            </div>

            {/* Remember Me & Quên mật khẩu */}
            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 transition-colors cursor-pointer"
                />
                <span className="text-xs sm:text-sm text-slate-600">Ghi nhớ đăng nhập</span>
              </label>
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setShowForgotModal(true)}
                className="text-xs sm:text-sm font-medium text-blue-600 hover:text-blue-700 hover:underline cursor-pointer"
              >
                Quên mật khẩu?
              </button>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 sm:py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm sm:text-base shadow-md shadow-blue-600/25 transition-all duration-200 flex items-center justify-center cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed mt-2 active:scale-[0.99]"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                  <span>Đang đăng nhập...</span>
                </>
              ) : (
                <span>Đăng nhập</span>
              )}
            </button>
          </form>

          {/* Phân cách Hoặc: Sử dụng Flexbox thuần không bị vệt nền trắng */}
          <div className="flex items-center my-3.5 sm:my-4">
            <div className="flex-1 border-t border-slate-200" />
            <span className="px-3.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Hoặc
            </span>
            <div className="flex-1 border-t border-slate-200" />
          </div>

          {/* Đăng nhập bằng Google */}
          <div>
            <button
              type="button"
              onClick={() => setShowGoogleNotice(true)}
              className="w-full py-2.5 sm:py-3 px-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold text-xs sm:text-sm transition-all duration-200 flex items-center justify-center gap-2.5 cursor-pointer"
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
          <div className="mt-3.5 pt-2.5 border-t border-slate-100 text-center text-xs sm:text-sm text-slate-500">
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
