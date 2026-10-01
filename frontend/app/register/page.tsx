"use client";

import React, { useState, useEffect, useRef, Suspense, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  User,
  GraduationCap,
  BookOpenCheck,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Sparkles,
  X,
  ShieldCheck,
  Clock,
  ArrowLeft,
} from "lucide-react";
import Navbar from "../components/common/Navbar";
import { toast } from "../components/common/Toast";
import { saveAuthSession } from "@/lib/auth";

type RoleKey = "TEACHER" | "STUDENT";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api/v1";

function RegisterFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Nhận vai trò ban đầu từ URL param
  const initialRoleParam = searchParams.get("role")?.toUpperCase();
  const [role, setRole] = useState<RoleKey>(
    initialRoleParam === "STUDENT" ? "STUDENT" : "TEACHER",
  );

  // Trạng thái Form & Bước (form | otp)
  const [step, setStep] = useState<"form" | "otp">("form");

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(true);

  // Trạng thái Lỗi hiển thị
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{
    fullName?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
    acceptTerms?: string;
  }>({});

  const [isLoading, setIsLoading] = useState(false);

  // Trạng thái OTP
  const [otpDigits, setOtpDigits] = useState(["", "", "", "", "", ""]);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(60);
  const [expirySeconds, setExpirySeconds] = useState(300); // 5 phút
  const [isResending, setIsResending] = useState(false);
  const [successModalOpen, setSuccessModalOpen] = useState(false);
  const [showGoogleNotice, setShowGoogleNotice] = useState(false);

  // Refs cho 6 ô input OTP
  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Đếm ngược Resend Cooldown và Hạn OTP
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (step === "otp") {
      timer = setInterval(() => {
        setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
        setExpirySeconds((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [step]);

  // Focus ô OTP đầu tiên khi chuyển sang bước OTP
  useEffect(() => {
    if (step === "otp") {
      setTimeout(() => {
        otpInputRefs.current[0]?.focus();
      }, 200);
    }
  }, [step]);

  // Tính toán độ mạnh mật khẩu tự nhiên
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

  // Xóa lỗi trường khi người dùng gõ
  const handleFieldChange = (field: keyof typeof fieldErrors, value: any) => {
    if (fieldErrors[field]) {
      setFieldErrors((prev) => ({ ...prev, [field]: undefined }));
    }
    setErrorMessage(null);
  };

  // Định dạng thời gian đếm ngược dạng mm:ss
  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remSecs = secs % 60;
    return `${mins.toString().padStart(2, "0")}:${remSecs.toString().padStart(2, "0")}`;
  };

  // BƯỚC 1: Xử lý submit thông tin đăng ký -> Gửi OTP
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const errors: typeof fieldErrors = {};
    const trimmedName = fullName.trim();
    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedName || trimmedName.length < 2) {
      errors.fullName = "Vui lòng nhập họ và tên đầy đủ (tối thiểu 2 ký tự).";
    }

    if (!trimmedEmail) {
      errors.email = "Vui lòng nhập địa chỉ email.";
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(trimmedEmail)) {
        errors.email = "Địa chỉ email không đúng định dạng (vd: user@example.com).";
      }
    }

    if (!password) {
      errors.password = "Vui lòng nhập mật khẩu.";
    } else if (password.length < 8) {
      errors.password = "Mật khẩu phải chứa ít nhất 8 ký tự.";
    } else if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
      errors.password = "Mật khẩu cần có ít nhất một chữ hoa, chữ thường và chữ số.";
    }

    if (!confirmPassword) {
      errors.confirmPassword = "Vui lòng xác nhận lại mật khẩu.";
    } else if (password !== confirmPassword) {
      errors.confirmPassword = "Mật khẩu xác nhận không khớp.";
    }

    if (!acceptTerms) {
      errors.acceptTerms = "Vui lòng đồng ý với Điều khoản dịch vụ để tiếp tục.";
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setFieldErrors({});
    setIsLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fullName: trimmedName,
          email: trimmedEmail,
          password,
          role,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        if (result.errors && typeof result.errors === "object") {
          setFieldErrors(result.errors);
        }
        const msg =
          result.message || "Không thể thực hiện đăng ký. Vui lòng thử lại.";
        setErrorMessage(msg);
        toast.error("Đăng ký không thành công", msg);
        setIsLoading(false);
        return;
      }

      // Gửi OTP thành công -> Chuyển sang giao diện xác thực OTP
      setIsLoading(false);
      setStep("otp");
      setResendCooldown(result.data?.cooldownSeconds || 60);
      setExpirySeconds(result.data?.expiresInSeconds || 300);
      setOtpError(null);
      toast.info(
        "Đã gửi mã xác thực",
        `Mã OTP gồm 6 chữ số đã được gửi tới email ${email}. Vui lòng kiểm tra hộp thư.`,
      );
    } catch {
      const networkError =
        "Không thể kết nối đến máy chủ. Vui lòng kiểm tra lại kết nối mạng hoặc thử lại sau.";
      setErrorMessage(networkError);
      toast.error("Lỗi kết nối", networkError);
      setIsLoading(false);
    }
  };

  // BƯỚC 2: Xử lý nhập ô OTP (hỗ trợ nhập từng số, backspace và paste 6 số)
  const handleOtpDigitChange = (index: number, val: string) => {
    setOtpError(null);

    // Nếu người dùng paste chuỗi 6 số
    if (val.length > 1) {
      const pasted = val.replace(/\D/g, "").slice(0, 6);
      if (pasted) {
        const newDigits = [...otpDigits];
        for (let i = 0; i < 6; i++) {
          newDigits[i] = pasted[i] || "";
        }
        setOtpDigits(newDigits);
        const nextIndex = Math.min(pasted.length, 5);
        otpInputRefs.current[nextIndex]?.focus();
        // Không tự động xác thực khi paste — để người dùng chủ động kiểm tra và bấm nút
        return;
      }
    }

    const singleDigit = val.replace(/\D/g, "").slice(-1);
    const newDigits = [...otpDigits];
    newDigits[index] = singleDigit;
    setOtpDigits(newDigits);

    // Tự động nhảy sang ô tiếp theo khi gõ từng số
    if (singleDigit && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>,
  ) => {
    if (e.key === "Backspace" && !otpDigits[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  // Xác thực mã OTP qua API
  const triggerVerifyOtp = async (codeToVerify?: string) => {
    const code = codeToVerify || otpDigits.join("");
    if (code.length !== 6) {
      setOtpError("Vui lòng nhập đủ 6 chữ số mã OTP.");
      return;
    }

    if (expirySeconds === 0) {
      setOtpError("Mã OTP đã hết hạn. Vui lòng bấm gửi lại mã mới.");
      return;
    }

    setIsVerifyingOtp(true);
    setOtpError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/auth/verify-otp`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include", // Tự động lưu HttpOnly cookie vào trình duyệt
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          otp: code,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        const msg = result.message || "Mã OTP không chính xác. Vui lòng thử lại.";
        setOtpError(msg);
        toast.error("Xác thực OTP thất bại", msg);
        setIsVerifyingOtp(false);
        return;
      }

      // Lưu phiên xác thực (tokens & user) để Next.js proxy và các trang /teacher, /student nhận diện ngay
      saveAuthSession(result.data?.tokens, result.data?.user);

      // Xác thực thành công!
      setIsVerifyingOtp(false);
      setSuccessModalOpen(true);
      toast.registerSuccess(fullName);
    } catch {
      const networkError = "Lỗi kết nối máy chủ khi xác thực OTP. Vui lòng thử lại.";
      setOtpError(networkError);
      toast.error("Lỗi kết nối", networkError);
      setIsVerifyingOtp(false);
    }
  };

  // Gửi lại mã OTP
  const handleResendOtp = async () => {
    if (resendCooldown > 0 || isResending) return;

    setIsResending(true);
    setOtpError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/auth/resend-otp`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        const msg = result.message || "Không thể gửi lại mã OTP.";
        setOtpError(msg);
        toast.error("Lỗi gửi mã OTP", msg);
        setIsResending(false);
        return;
      }

      setResendCooldown(result.data?.cooldownSeconds || 60);
      toast.success(
        "Đã gửi lại OTP",
        "Mã xác thực 6 số mới đã được gửi tới email của bạn.",
      );
      setIsResending(false);
    } catch {
      const err = "Lỗi kết nối khi gửi lại OTP.";
      setOtpError(err);
      toast.error("Lỗi gửi mã OTP", err);
      setIsResending(false);
    }
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

      {/* 3. Card Đăng ký căn giữa hoàn hảo (Khoảng cách trên và dưới bằng nhau tuyệt đối) */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-4 sm:px-6 py-2.5 sm:py-3">
        <div className="w-full max-w-[800px] bg-white/95 backdrop-blur-xl rounded-3xl shadow-[0_20px_50px_rgba(15,23,42,0.2)] border border-white/80 px-8 py-5.5 sm:px-11 sm:py-6.5 transition-all duration-300">
          {/* ========================================================================= */}
          {/* GIAO DIỆN BƯỚC 1: FORM ĐIỀN THÔNG TIN ĐĂNG KÝ                           */}
          {/* ========================================================================= */}
          {step === "form" && (
            <>
              {/* Logo & Tiêu đề */}
              <div className="text-center mb-3 sm:mb-3.5">
                <div className="flex justify-center mb-1.5">
                  <Link href="/" className="inline-block transition-transform hover:scale-105 duration-200" title="EduHub Trang chủ">
                    <Image
                      src="/images/logo.webp"
                      alt="EduHub"
                      width={140}
                      height={36}
                      priority
                      className="h-7.5 sm:h-8 w-auto object-contain"
                    />
                  </Link>
                </div>
                <h1 className="text-2xl sm:text-[25px] font-bold text-slate-900 tracking-tight leading-snug">
                  Tạo tài khoản mới
                </h1>
                <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                  Bắt đầu trải nghiệm học tập và giảng dạy trên EduHub
                </p>
              </div>

              {/* Thông báo lỗi tổng quát */}
              {errorMessage && (
                <div className="mb-3 p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs sm:text-sm flex items-start gap-2 animate-fadeIn">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
                  <div className="leading-relaxed">{errorMessage}</div>
                </div>
              )}

              {/* Thông báo tính năng Google đang phát triển */}
              {showGoogleNotice && (
                <div className="mb-3 p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs sm:text-sm flex items-center justify-between gap-2 animate-fadeIn">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-3.5 h-3.5 shrink-0 text-amber-600" />
                    <span>
                      Tính năng <strong>Đăng ký nhanh với Google</strong> đang được phát triển theo lộ trình của hệ thống.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowGoogleNotice(false)}
                    className="text-amber-600 hover:text-amber-800 p-0.5 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Chọn vai trò (Giáo viên / Học sinh) */}
              <div className="mb-2.5 sm:mb-3">
                <div className="grid grid-cols-2 gap-1.5 p-1.5 bg-slate-100/90 rounded-2xl">
                  <button
                    type="button"
                    onClick={() => setRole("TEACHER")}
                    className={`py-1.5 sm:py-2 px-3 rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer whitespace-nowrap ${role === "TEACHER"
                      ? "bg-white text-blue-600 shadow-sm"
                      : "text-slate-600 hover:text-slate-900"
                      }`}
                  >
                    <GraduationCap className="w-4 h-4 shrink-0" />
                    <span>Giảng viên / Giáo viên</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setRole("STUDENT")}
                    className={`py-1.5 sm:py-2 px-3 rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer whitespace-nowrap ${role === "STUDENT"
                      ? "bg-white text-blue-600 shadow-sm"
                      : "text-slate-600 hover:text-slate-900"
                      }`}
                  >
                    <BookOpenCheck className="w-4 h-4 shrink-0" />
                    <span>Học sinh / Sinh viên</span>
                  </button>
                </div>
              </div>

              {/* Form nhập thông tin */}
              <form onSubmit={handleRegisterSubmit} noValidate className="space-y-2.5 sm:space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-2 sm:gap-y-2.5">
                  {/* Họ và tên */}
                  <div className="space-y-1">
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
                        onChange={(e) => {
                          setFullName(e.target.value);
                          handleFieldChange("fullName", e.target.value);
                        }}
                        placeholder={role === "TEACHER" ? "Nguyễn Văn Teacher" : "Nguyễn Thị Student"}
                        autoComplete="name"
                        className={`w-full pl-10 pr-3.5 py-2 sm:py-2.2 text-sm rounded-xl focus:outline-none transition-all placeholder:text-slate-400 text-slate-800 ${fieldErrors.fullName
                          ? "bg-rose-50/30 border border-rose-300 focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                          : "bg-slate-50/70 hover:bg-slate-50 focus:bg-white border border-slate-200 focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                          }`}
                      />
                    </div>
                    {fieldErrors.fullName && (
                      <p className="text-xs text-rose-600 pl-0.5 flex items-center gap-1 animate-fadeIn">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>{fieldErrors.fullName}</span>
                      </p>
                    )}
                  </div>

                  {/* Email */}
                  <div className="space-y-1">
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
                        onChange={(e) => {
                          setEmail(e.target.value);
                          handleFieldChange("email", e.target.value);
                        }}
                        placeholder="name@example.com"
                        autoComplete="email"
                        className={`w-full pl-10 pr-3.5 py-2 sm:py-2.2 text-sm rounded-xl focus:outline-none transition-all placeholder:text-slate-400 text-slate-800 ${fieldErrors.email
                          ? "bg-rose-50/30 border border-rose-300 focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                          : "bg-slate-50/70 hover:bg-slate-50 focus:bg-white border border-slate-200 focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                          }`}
                      />
                    </div>
                    {fieldErrors.email && (
                      <p className="text-xs text-rose-600 pl-0.5 flex items-center gap-1 animate-fadeIn">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>{fieldErrors.email}</span>
                      </p>
                    )}
                  </div>

                  {/* Mật khẩu */}
                  <div className="space-y-1">
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
                        onChange={(e) => {
                          setPassword(e.target.value);
                          handleFieldChange("password", e.target.value);
                        }}
                        placeholder="Tối thiểu 8 ký tự"
                        autoComplete="new-password"
                        className={`w-full pl-10 pr-10 py-2 sm:py-2.2 text-sm rounded-xl focus:outline-none transition-all placeholder:text-slate-400 text-slate-800 ${fieldErrors.password
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

                    {fieldErrors.password ? (
                      <p className="text-xs text-rose-600 pl-0.5 flex items-center gap-1 animate-fadeIn">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>{fieldErrors.password}</span>
                      </p>
                    ) : password ? (
                      <div className="flex items-center gap-2 pt-0.5">
                        <div className="flex-1 grid grid-cols-4 gap-1 h-1.5">
                          {[1, 2, 3, 4].map((stepIdx) => (
                            <div
                              key={stepIdx}
                              className={`rounded-full h-full transition-colors ${stepIdx <= passwordStrength.score ? passwordStrength.color : "bg-slate-200"
                                }`}
                            />
                          ))}
                        </div>
                        <span className="text-[11px] text-slate-500 font-medium shrink-0">{passwordStrength.label}</span>
                      </div>
                    ) : null}
                  </div>

                  {/* Xác nhận mật khẩu */}
                  <div className="space-y-1">
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
                        onChange={(e) => {
                          setConfirmPassword(e.target.value);
                          handleFieldChange("confirmPassword", e.target.value);
                        }}
                        placeholder="Nhập lại mật khẩu"
                        autoComplete="new-password"
                        className={`w-full pl-10 pr-10 py-2 sm:py-2.2 text-sm rounded-xl focus:outline-none transition-all placeholder:text-slate-400 text-slate-800 ${fieldErrors.confirmPassword
                          ? "bg-rose-50/30 border border-rose-300 focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                          : "bg-slate-50/70 hover:bg-slate-50 focus:bg-white border border-slate-200 focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                          }`}
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
                    {fieldErrors.confirmPassword && (
                      <p className="text-xs text-rose-600 pl-0.5 flex items-center gap-1 animate-fadeIn">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>{fieldErrors.confirmPassword}</span>
                      </p>
                    )}
                  </div>
                </div>

                {/* Điều khoản */}
                <div className="pt-0.5">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={acceptTerms}
                      onChange={(e) => {
                        setAcceptTerms(e.target.checked);
                        handleFieldChange("acceptTerms", e.target.checked);
                      }}
                      className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 transition-colors cursor-pointer"
                    />
                    <span className="text-xs sm:text-[13px] text-slate-600 leading-normal">
                      Tôi đồng ý với{" "}
                      <span className="font-medium text-blue-600 hover:underline">Điều khoản dịch vụ</span>{" "}
                      và{" "}
                      <span className="font-medium text-blue-600 hover:underline">Chính sách quyền riêng tư</span>.
                    </span>
                  </label>
                  {fieldErrors.acceptTerms && (
                    <p className="text-xs text-rose-600 mt-0.5 pl-0.5 flex items-center gap-1 animate-fadeIn">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{fieldErrors.acceptTerms}</span>
                    </p>
                  )}
                </div>

                {/* Nút Đăng ký */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-2.2 sm:py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm sm:text-base shadow-md shadow-blue-600/25 transition-all duration-200 flex items-center justify-center cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed mt-1.5 active:scale-[0.99]"
                >
                  {isLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                      <span>Đang xử lý...</span>
                    </>
                  ) : (
                    <span>Đăng ký</span>
                  )}
                </button>
              </form>

              {/* Phân cách Hoặc: Sử dụng Flexbox thuần không bị vệt nền trắng */}
              <div className="flex items-center my-2.5 sm:my-3">
                <div className="flex-1 border-t border-slate-200" />
                <span className="px-3.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Hoặc
                </span>
                <div className="flex-1 border-t border-slate-200" />
              </div>

              {/* Đăng ký với Google */}
              <div>
                <button
                  type="button"
                  onClick={() => setShowGoogleNotice(true)}
                  className="w-full py-2 sm:py-2.5 px-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold text-xs sm:text-sm transition-all duration-200 flex items-center justify-center gap-2.5 cursor-pointer"
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
              <div className="mt-2.5 pt-2 border-t border-slate-100 text-center text-xs sm:text-sm text-slate-500">
                Đã có tài khoản?{" "}
                <Link
                  href="/login"
                  className="font-semibold text-blue-600 hover:text-blue-700 hover:underline"
                >
                  Đăng nhập
                </Link>
              </div>
            </>
          )}

          {/* ========================================================================= */}
          {/* GIAO DIỆN BƯỚC 2: XÁC THỰC MÃ OTP QUA EMAIL                             */}
          {/* ========================================================================= */}
          {step === "otp" && (
            <div className="max-w-[480px] mx-auto space-y-4 animate-fadeIn py-1">
              {/* Nút quay lại bước điền form */}
              <button
                type="button"
                onClick={() => setStep("form")}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Quay lại</span>
              </button>

              <div className="text-center space-y-1.5">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 mx-auto flex items-center justify-center">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
                  Xác thực tài khoản
                </h2>
                <p className="text-xs sm:text-sm text-slate-600 max-w-sm mx-auto leading-relaxed">
                  Vui lòng nhập mã xác thực gồm 6 chữ số đã được gửi tới{" "}
                  <strong className="text-slate-900">{email}</strong>
                </p>
              </div>

              {/* Thông báo lỗi OTP */}
              {otpError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs sm:text-sm flex items-start gap-2 animate-fadeIn">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
                  <div className="leading-relaxed">{otpError}</div>
                </div>
              )}

              {/* 6 Ô nhập mã OTP */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-center gap-2 sm:gap-3">
                  {otpDigits.map((digit, index) => (
                    <input
                      key={index}
                      ref={(el) => {
                        otpInputRefs.current[index] = el;
                      }}
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      value={digit}
                      onChange={(e) => handleOtpDigitChange(index, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(index, e)}
                      className={`w-11 h-13 sm:w-12 sm:h-14 text-center text-xl sm:text-2xl font-extrabold rounded-xl border transition-all focus:outline-none ${otpError
                        ? "border-rose-300 bg-rose-50/20 text-rose-900 focus:ring-2 focus:ring-rose-400"
                        : digit
                          ? "border-blue-600 bg-blue-50/30 text-blue-900 ring-2 ring-blue-500/20"
                          : "border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-600 focus:border-transparent text-slate-900"
                        }`}
                    />
                  ))}
                </div>

                {/* Hạn hiệu lực của mã */}
                <div className="flex items-center justify-center gap-1.5 text-xs text-slate-500">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <span>
                    Mã có hiệu lực trong:{" "}
                    <strong className={expirySeconds < 60 ? "text-rose-600" : "text-blue-600"}>
                      {formatTime(expirySeconds)}
                    </strong>
                  </span>
                </div>
              </div>

              {/* Nút bấm xác nhận */}
              <button
                type="button"
                onClick={() => triggerVerifyOtp()}
                disabled={isVerifyingOtp || otpDigits.join("").length !== 6 || expirySeconds === 0}
                className="w-full py-2.5 sm:py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm sm:text-base shadow-md shadow-blue-600/25 transition-all duration-200 flex items-center justify-center cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.99]"
              >
                {isVerifyingOtp ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                    <span>Đang xác thực...</span>
                  </>
                ) : (
                  <span>Xác nhận</span>
                )}
              </button>

              {/* Hàng gửi lại mã */}
              <div className="pt-1 text-center text-xs text-slate-600 flex items-center justify-center gap-1">
                <span>Chưa nhận được mã?</span>
                {resendCooldown > 0 ? (
                  <span className="text-slate-400 font-medium">
                    Gửi lại sau <strong>{resendCooldown}s</strong>
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={isResending}
                    className="font-semibold text-blue-600 hover:text-blue-700 hover:underline flex items-center gap-1 cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3 h-3 ${isResending ? "animate-spin" : ""}`} />
                    <span>{isResending ? "Đang gửi..." : "Gửi lại mã"}</span>
                  </button>
                )}
              </div>

              {/* Gợi ý kiểm tra hộp thư spam */}
              <p className="text-center text-[11px] text-slate-400 leading-relaxed pt-1">
                Không thấy email? Hãy kiểm tra thêm mục Thư rác (Spam) hoặc Quảng cáo.
              </p>
            </div>
          )}
        </div>
      </main>

      {/* Modal Chúc mừng tạo tài khoản thành công */}
      {successModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-[560px] bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-100 text-center space-y-5">
            <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 mx-auto flex items-center justify-center">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div className="space-y-1.5">
              <h3 className="text-xl font-bold text-slate-900">
                Đăng ký thành công!
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 leading-relaxed px-1">
                <span className="sm:whitespace-nowrap">
                  Tài khoản <strong className="text-slate-800">{email}</strong> với vai trò{" "}
                  <span className="font-semibold text-blue-600">
                    {role === "TEACHER" ? "Giáo viên / Giảng viên" : "Học sinh / Sinh viên"}
                  </span>
                </span>
                <br className="hidden sm:block" />
                <span className="sm:whitespace-nowrap">
                  {" "}đã được kích hoạt thành công trên hệ thống.
                </span>
              </p>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => {
                  toast.flash(
                    "success",
                    "Chào mừng bạn đến với EduHub!",
                    `Tài khoản ${fullName} đã sẵn sàng bắt đầu hành trình.`,
                    {
                      icon: "register",
                      badge: role === "TEACHER" ? "Giảng viên" : "Học sinh",
                    },
                  );
                  router.push(role === "TEACHER" ? "/teacher" : "/student");
                }}
                className="w-full py-3 px-4 text-sm font-semibold rounded-xl bg-blue-600 text-white hover:bg-blue-700 shadow-md shadow-blue-600/25 flex items-center justify-center gap-2 cursor-pointer transition-all hover:shadow-lg hover:shadow-blue-600/30"
              >
                <span>Tiếp tục khám phá</span>
              </button>
            </div>
          </div>
        </div>
      )}

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
