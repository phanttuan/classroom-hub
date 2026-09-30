"use client";

import React, { useState, Suspense, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  User,
  ArrowRight,
  GraduationCap,
  BookOpenCheck,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import Navbar from "../components/common/Navbar";

type RoleKey = "teacher" | "student";

function RegisterFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Nhận vai trò từ URL param nếu có (?role=student hoặc ?role=teacher)
  const initialRoleParam = searchParams.get("role") as RoleKey | null;
  const [role, setRole] = useState<RoleKey>(
    initialRoleParam === "student" ? "student" : "teacher"
  );

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(true);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successModalOpen, setSuccessModalOpen] = useState(false);

  // Chỉ báo độ an toàn mật khẩu tự nhiên
  const passwordStrength = useMemo(() => {
    if (!password) return { score: 0, label: "", color: "bg-slate-200" };
    let score = 0;
    if (password.length >= 8) score += 1;
    if (/[A-Z]/.test(password)) score += 1;
    if (/[0-9]/.test(password)) score += 1;
    if (/[^A-Za-z0-9]/.test(password)) score += 1;

    switch (score) {
      case 1:
        return { score: 1, label: "Mật khẩu yếu", color: "bg-rose-500" };
      case 2:
        return { score: 2, label: "Mật khẩu trung bình", color: "bg-amber-500" };
      case 3:
        return { score: 3, label: "Mật khẩu khá mạnh", color: "bg-blue-500" };
      case 4:
        return { score: 4, label: "Mật khẩu mạnh & an toàn", color: "bg-emerald-500" };
      default:
        return { score: 1, label: "Mật khẩu yếu", color: "bg-rose-500" };
    }
  }, [password]);

  // Xử lý submit
  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!fullName.trim() || fullName.trim().length < 2) {
      setErrorMessage("Vui lòng nhập họ và tên của bạn.");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setErrorMessage("Địa chỉ email không đúng định dạng.");
      return;
    }

    if (password.length < 8) {
      setErrorMessage("Mật khẩu phải chứa ít nhất 8 ký tự.");
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage("Mật khẩu xác nhận không khớp.");
      return;
    }

    if (!acceptTerms) {
      setErrorMessage("Vui lòng đồng ý với Điều khoản dịch vụ để tiếp tục.");
      return;
    }

    setIsLoading(true);

    setTimeout(() => {
      setIsLoading(false);
      setSuccessModalOpen(true);
    }, 1000);
  };

  return (
    <div className="relative min-h-screen flex flex-col justify-between selection:bg-blue-600 selection:text-white">
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

      {/* 3. Card Đăng ký căn giữa */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-4 sm:px-6 pt-24 pb-12">
        <div className="w-full max-w-[580px] bg-white/95 backdrop-blur-xl rounded-3xl shadow-[0_20px_60px_rgba(15,23,42,0.25)] border border-white/80 p-8 sm:p-10 lg:p-11 transition-all duration-300">
          {/* Logo & Tiêu đề */}
          <div className="text-center space-y-2 mb-6">
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
              Tạo tài khoản mới
            </h1>
            <p className="text-sm text-slate-500">
              Bắt đầu trải nghiệm học tập và giảng dạy trên EduHub
            </p>
          </div>

          {/* Chọn vai trò (Giáo viên / Học sinh) */}
          <div className="mb-6">
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-2">
              Vai trò của bạn
            </label>
            <div className="grid grid-cols-2 gap-2.5 p-1.5 bg-slate-100/90 rounded-2xl">
              <button
                type="button"
                onClick={() => setRole("teacher")}
                className={`py-2.5 px-3 sm:px-4 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer whitespace-nowrap ${role === "teacher"
                    ? "bg-white text-blue-600 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                  }`}
              >
                <GraduationCap className="w-4 h-4 shrink-0" />
                <span className="truncate sm:overflow-visible">Giảng viên / Giáo viên</span>
              </button>
              <button
                type="button"
                onClick={() => setRole("student")}
                className={`py-2.5 px-3 sm:px-4 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer whitespace-nowrap ${role === "student"
                    ? "bg-white text-blue-600 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                  }`}
              >
                <BookOpenCheck className="w-4 h-4 shrink-0" />
                <span className="truncate sm:overflow-visible">Học sinh / Sinh viên</span>
              </button>
            </div>
          </div>

          {/* Thông báo lỗi nếu có */}
          {errorMessage && (
            <div className="mb-5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <div className="text-xs sm:text-sm">{errorMessage}</div>
            </div>
          )}

          {/* Form đăng ký */}
          <form onSubmit={handleRegisterSubmit} className="space-y-4">
            {/* Họ và tên */}
            <div className="space-y-1.5">
              <label
                htmlFor="fullname"
                className="block text-xs font-semibold text-slate-700 uppercase tracking-wide"
              >
                Họ và tên
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <User className="w-4 h-4" />
                </div>
                <input
                  id="fullname"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder={role === "teacher" ? "Nguyễn Văn A" : "Nguyễn Văn A"}
                  autoComplete="name"
                  required
                  className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-50/70 hover:bg-slate-50 focus:bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all placeholder:text-slate-400 text-slate-800"
                />
              </div>
            </div>

            {/* Email */}
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

            {/* Mật khẩu */}
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
                  placeholder="Tối thiểu 8 ký tự"
                  autoComplete="new-password"
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

              {/* Thước đo an toàn mật khẩu */}
              {password && (
                <div className="pt-1 space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-500">Độ bảo mật:</span>
                    <span className="font-semibold text-slate-700">{passwordStrength.label}</span>
                  </div>
                  <div className="grid grid-cols-4 gap-1.5 h-1.5">
                    {[1, 2, 3, 4].map((step) => (
                      <div
                        key={step}
                        className={`rounded-full h-full transition-colors ${step <= passwordStrength.score ? passwordStrength.color : "bg-slate-200"
                          }`}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Xác nhận mật khẩu */}
            <div className="space-y-1.5">
              <label
                htmlFor="confirm-password"
                className="block text-xs font-semibold text-slate-700 uppercase tracking-wide"
              >
                Xác nhận mật khẩu
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="confirm-password"
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Nhập lại mật khẩu"
                  autoComplete="new-password"
                  required
                  className="w-full pl-10 pr-11 py-2.5 text-sm bg-slate-50/70 hover:bg-slate-50 focus:bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all placeholder:text-slate-400 text-slate-800"
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                  aria-label={showConfirmPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Điều khoản */}
            <div className="pt-1">
              <label className="flex items-start gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={acceptTerms}
                  onChange={(e) => setAcceptTerms(e.target.checked)}
                  className="w-4 h-4 mt-0.5 rounded text-blue-600 focus:ring-blue-500 border-slate-300 transition-colors"
                />
                <span className="text-xs text-slate-600 leading-relaxed">
                  Tôi đồng ý với{" "}
                  <span className="font-medium text-blue-600 hover:underline">Điều khoản dịch vụ</span>{" "}
                  và{" "}
                  <span className="font-medium text-blue-600 hover:underline">Chính sách quyền riêng tư</span>.
                </span>
              </label>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm shadow-md shadow-blue-600/25 hover:shadow-lg hover:shadow-blue-600/35 transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed mt-3 active:scale-[0.99]"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Đang đăng ký tài khoản...</span>
                </>
              ) : (
                <>
                  <span>Đăng ký</span>
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

          {/* Đăng ký với Google */}
          <div>
            <button
              type="button"
              onClick={() => {
                setIsLoading(true);
                setTimeout(() => {
                  setIsLoading(false);
                  router.push(role === "teacher" ? "/teacher" : "/student");
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
              <span>Đăng ký với Google</span>
            </button>
          </div>

          {/* Chuyển sang Đăng nhập */}
          <div className="mt-8 pt-4 border-t border-slate-100 text-center text-sm text-slate-500">
            Đã có tài khoản?{" "}
            <Link
              href="/login"
              className="font-semibold text-blue-600 hover:text-blue-700 hover:underline"
            >
              Đăng nhập
            </Link>
          </div>
        </div>
      </main>

      {/* Modal Chúc mừng tạo tài khoản thành công */}
      {successModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-100 text-center space-y-5">
            <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 mx-auto flex items-center justify-center">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div className="space-y-1.5">
              <h3 className="text-xl font-bold text-slate-900">
                Đăng ký thành công!
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
                Tài khoản <span className="font-semibold text-slate-700">{email}</span> đã được tạo thành công trên hệ thống.
              </p>
            </div>

            <div className="flex flex-col gap-2 pt-2">
              <button
                type="button"
                onClick={() => router.push(role === "teacher" ? "/teacher" : "/student")}
                className="w-full py-3 px-4 text-sm font-semibold rounded-xl bg-blue-600 text-white hover:bg-blue-700 shadow-md shadow-blue-600/25 flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Vào trang làm việc ngay</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => router.push("/login")}
                className="w-full py-2.5 text-xs font-semibold rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                Đến trang Đăng nhập
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Footer */}
      <footer className="relative z-10 py-4 text-center text-xs text-white/75 drop-shadow-sm">
        © 2026 EduHub · Nền tảng hỗ trợ giáo viên xây dựng và tổ chức đào tạo trực tuyến
      </footer>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-900">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <RegisterFormContent />
    </Suspense>
  );
}
