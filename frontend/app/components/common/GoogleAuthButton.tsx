'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { toast } from '@/app/components/common/Toast';
import { saveAuthSession } from '@/lib/auth';
import {
  Sparkles,
  X,
  GraduationCap,
  BookOpenCheck,
  CheckCircle2,
  ShieldCheck,
} from 'lucide-react';

declare global {
  interface Window {
    google?: {
      accounts: {
        id?: {
          initialize: (config: any) => void;
          prompt: () => void;
        };
        oauth2?: {
          initTokenClient: (config: any) => {
            requestAccessToken: (overrideConfig?: any) => void;
          };
        };
      };
    };
  }
}

interface GoogleAuthButtonProps {
  mode: 'login' | 'register';
  role?: 'TEACHER' | 'STUDENT';
  onError?: (errorMsg: string, isNotRegistered?: boolean, isLocalAccount?: boolean) => void;
  onSuccess?: (userData: { fullName: string; email: string; role: 'TEACHER' | 'STUDENT' }) => void;
  onLoading?: (loading: boolean) => void;
  className?: string;
}

interface GoogleUserProfile {
  name?: string;
  email?: string;
  picture?: string;
}

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

export function GoogleAuthButton({
  mode,
  role = 'STUDENT',
  onError,
  onSuccess,
  onLoading,
  className = '',
}: GoogleAuthButtonProps) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [, setScriptLoaded] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Modal chọn vai trò khi Đăng ký bằng Google
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [selectedRole, setSelectedRole] = useState<'TEACHER' | 'STUDENT'>(role);
  const [pendingToken, setPendingToken] = useState<string>('');
  const [pendingProfile, setPendingProfile] = useState<GoogleUserProfile | null>(null);

  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';

  // Đảm bảo client mount trước khi dùng createPortal
  useEffect(() => {
    setMounted(true);
  }, []);

  // Đồng bộ role khi prop từ cha thay đổi
  useEffect(() => {
    setSelectedRole(role);
  }, [role]);

  // 1. Tải Google Identity Services SDK
  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (window.google?.accounts) {
      setScriptLoaded(true);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => {
      setScriptLoaded(true);
    };
    script.onerror = () => {
      console.warn('Không thể tải Google Identity Services SDK.');
    };
    document.body.appendChild(script);
  }, []);

  // 2. Gửi Token xác thực lên Backend
  const sendTokenToBackend = async (token: string, targetRole?: 'TEACHER' | 'STUDENT') => {
    setIsProcessing(true);
    onLoading?.(true);

    try {
      const endpoint =
        mode === 'register'
          ? `${API_BASE_URL}/auth/google/register`
          : `${API_BASE_URL}/auth/google/login`;

      const bodyData =
        mode === 'register'
          ? { idToken: token, role: targetRole || selectedRole }
          : { idToken: token };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Tự động nhận HttpOnly cookie từ Backend
        body: JSON.stringify(bodyData),
      });

      const result = await res.json();

      if (!res.ok || !result.success) {
        const errorMsg =
          result.message || 'Xác thực Google không thành công. Vui lòng thử lại.';

        // Phân loại lỗi chính xác theo yêu cầu người dùng
        const isNotRegistered =
          res.status === 404 || errorMsg.includes('chưa được đăng ký');

        const isLocalAccount =
          errorMsg.includes('Mật khẩu thông thường') || errorMsg.includes('mật khẩu');

        const isAlreadyRegistered =
          res.status === 409 ||
          errorMsg.includes('đã được sử dụng') ||
          errorMsg.includes('đã được đăng ký') ||
          errorMsg.includes('đã tồn tại');

        const toastTitle =
          mode === 'register'
            ? 'Đăng ký không thành công'
            : 'Đăng nhập không thành công';

        toast.error(toastTitle, errorMsg);
        onError?.(errorMsg, isNotRegistered, isLocalAccount);
        setShowRoleModal(false);
        setIsProcessing(false);
        onLoading?.(false);
        return;
      }

      // Đăng nhập / Đăng ký thành công -> Lưu session
      setShowRoleModal(false);
      const user = result.data?.user;
      saveAuthSession(result.data?.tokens, user);

      if (mode === 'register' && onSuccess) {
        onSuccess({
          fullName: user?.fullName || pendingProfile?.name || 'Người dùng',
          email: user?.email || pendingProfile?.email || '',
          role: (user?.role || targetRole || selectedRole) as 'TEACHER' | 'STUDENT',
        });
        return;
      }

      let targetPath = '/student';
      let roleLabel = 'Học sinh';

      if (user?.role === 'ADMIN') {
        targetPath = '/admin';
        roleLabel = 'Quản trị viên';
      } else if (user?.role === 'TEACHER') {
        targetPath = '/teacher';
        roleLabel = 'Giảng viên';
      }

      toast.flash(
        'success',
        mode === 'register' ? 'Đăng ký thành công!' : 'Đăng nhập thành công!',
        `Chào mừng ${user?.fullName || 'bạn'} đến với EduHub qua Google.`,
        { icon: 'login', badge: roleLabel },
      );

      let destination = targetPath;
      if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search);
        const cb = params.get('callbackUrl');
        if (cb && cb.startsWith('/')) {
          destination = cb;
        }
      }

      window.location.href = destination;

    } catch {
      const networkMsg =
        'Không thể kết nối đến máy chủ xác thực. Vui lòng kiểm tra lại mạng.';
      toast.error('Lỗi kết nối', networkMsg);
      onError?.(networkMsg);
      setShowRoleModal(false);
    } finally {
      setIsProcessing(false);
      onLoading?.(false);
    }
  };

  // 3. Xử lý khi người dùng bấm nút Google
  const handleButtonClick = () => {
    // Nếu chưa cấu hình Google Client ID -> Mở modal hướng dẫn
    if (!googleClientId) {
      setShowConfigModal(true);
      return;
    }

    if (typeof window === 'undefined' || !window.google?.accounts?.oauth2) {
      toast.info('Đang kết nối Google...', 'Vui lòng thử lại sau vài giây.');
      return;
    }

    try {
      // Mở Google OAuth 2.0 Account Picker Popup trực tiếp
      const tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: googleClientId,
        scope: 'email profile openid',
        callback: async (tokenResponse: any) => {
          if (tokenResponse.error) {
            if (tokenResponse.error !== 'popup_closed_by_user') {
              toast.error(
                'Lỗi xác thực Google',
                tokenResponse.error_description || tokenResponse.error,
              );
            }
            return;
          }

          if (tokenResponse.access_token) {
            if (mode === 'register') {
              // Khi Đăng ký: Lấy thông tin tài khoản Google để hiển thị xác nhận vai trò chuyên nghiệp
              setIsProcessing(true);
              let profile: GoogleUserProfile | null = null;
              try {
                const profileRes = await fetch(
                  'https://www.googleapis.com/oauth2/v3/userinfo',
                  {
                    headers: {
                      Authorization: `Bearer ${tokenResponse.access_token}`,
                    },
                  },
                );
                if (profileRes.ok) {
                  profile = await profileRes.json();
                }
              } catch (e) {
                console.warn('Could not fetch Google profile directly:', e);
              }

              setPendingToken(tokenResponse.access_token);
              setPendingProfile(profile);
              setSelectedRole(role); // Khởi tạo theo vai trò đã chọn trên trang
              setIsProcessing(false);
              setShowRoleModal(true);
            } else {
              // Khi Đăng nhập: Gửi thẳng Token lên Backend xác thực
              await sendTokenToBackend(tokenResponse.access_token);
            }
          }
        },
      });

      tokenClient.requestAccessToken({ prompt: 'select_account' });
    } catch (err: any) {
      console.error('Google Auth Error:', err);
      toast.error('Không thể mở popup Google', 'Vui lòng kiểm tra lại cấu hình Client ID.');
    }
  };

  // Xác nhận tạo tài khoản với vai trò đã chọn
  const handleConfirmRegister = async () => {
    if (!pendingToken) return;
    await sendTokenToBackend(pendingToken, selectedRole);
  };

  return (
    <>
      {/* Nút bấm chuẩn duy nhất 1 khung, toàn chiều rộng, sạch sẽ, chuẩn Google */}
      <button
        type="button"
        onClick={handleButtonClick}
        disabled={isProcessing}
        className={`w-full py-2.2 sm:py-2.5 px-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold text-xs sm:text-sm transition-all duration-200 flex items-center justify-center gap-2.5 cursor-pointer shadow-xs hover:shadow-sm disabled:opacity-60 active:scale-[0.99] ${className}`}
      >
        {isProcessing && !showRoleModal ? (
          <>
            <div className="w-4 h-4 border-2 border-slate-300 border-t-blue-600 rounded-full animate-spin shrink-0" />
            <span>Đang xử lý...</span>
          </>
        ) : (
          <>
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
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
            <span>
              {mode === 'register' ? 'Đăng ký với Google' : 'Đăng nhập với Google'}
            </span>
          </>
        )}
      </button>

      {/* ========================================================================= */}
      {/* MODAL XÁC NHẬN VAI TRÒ KHI ĐĂNG KÝ BẰNG GOOGLE (PORTAL RA BODY)            */}
      {/* ========================================================================= */}
      {showRoleModal && mounted && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          {/* Lớp nền mờ click ngoài để đóng */}
          <div
            className="absolute inset-0"
            onClick={() => !isProcessing && setShowRoleModal(false)}
          />

          <div className="bg-white rounded-[28px] max-w-md w-full p-6 sm:p-7 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.3)] border border-slate-100 relative z-10 space-y-5 animate-scaleUp">
            {/* Nút X đóng góc trên bên phải */}
            <button
              type="button"
              onClick={() => setShowRoleModal(false)}
              disabled={isProcessing}
              className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors cursor-pointer disabled:opacity-40"
              aria-label="Đóng"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Header: Thông tin tài khoản Google trích xuất được */}
            <div className="text-center space-y-2 pt-1">
              <div className="relative inline-block mx-auto">
                {pendingProfile?.picture ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={pendingProfile.picture}
                    alt={pendingProfile.name || 'Google User'}
                    className="w-16 h-16 rounded-full border-2 border-white shadow-md mx-auto object-cover"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xl mx-auto shadow-md border-2 border-white">
                    {pendingProfile?.name ? pendingProfile.name.charAt(0).toUpperCase() : 'G'}
                  </div>
                )}
                {/* Google badge icon góc avatar */}
                <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-white shadow-sm border border-slate-200 flex items-center justify-center">
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
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
                </div>
              </div>

              <div>
                <h3 className="font-bold text-slate-900 text-lg">
                  {pendingProfile?.name || 'Tài khoản Google'}
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  {pendingProfile?.email || 'Đã liên kết Google'}
                </p>
              </div>

              <div className="pt-1">
                <p className="text-xs sm:text-sm text-slate-600 font-semibold">
                  Chọn vai trò của bạn trong EduHub:
                </p>
              </div>
            </div>

            {/* Thẻ chọn vai trò */}
            <div className="grid grid-cols-1 gap-2.5">
              {/* Thẻ Giảng viên */}
              <button
                type="button"
                onClick={() => setSelectedRole('TEACHER')}
                className={`w-full p-3.5 rounded-2xl border text-left transition-all flex items-start gap-3.5 cursor-pointer ${
                  selectedRole === 'TEACHER'
                    ? 'border-blue-600 bg-blue-50/70 shadow-sm ring-2 ring-blue-600/20'
                    : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/60'
                }`}
              >
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                    selectedRole === 'TEACHER'
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  <GraduationCap className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-slate-900">
                      Giảng viên / Giáo viên
                    </span>
                    {selectedRole === 'TEACHER' && (
                      <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5 leading-snug">
                    Tạo khóa học, đăng tài liệu, giao bài tập và chấm điểm sinh viên.
                  </p>
                </div>
              </button>

              {/* Thẻ Học sinh */}
              <button
                type="button"
                onClick={() => setSelectedRole('STUDENT')}
                className={`w-full p-3.5 rounded-2xl border text-left transition-all flex items-start gap-3.5 cursor-pointer ${
                  selectedRole === 'STUDENT'
                    ? 'border-blue-600 bg-blue-50/70 shadow-sm ring-2 ring-blue-600/20'
                    : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/60'
                }`}
              >
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                    selectedRole === 'STUDENT'
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  <BookOpenCheck className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-slate-900">
                      Học sinh / Sinh viên
                    </span>
                    {selectedRole === 'STUDENT' && (
                      <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5 leading-snug">
                    Tham gia khóa học, làm bài tập và theo dõi tiến độ học tập.
                  </p>
                </div>
              </button>
            </div>

            {/* Footer hành động: 2 nút đối xứng toàn chiều rộng, rộng rãi, chuẩn cao cấp */}
            <div className="pt-3 border-t border-slate-100">
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setShowRoleModal(false)}
                  disabled={isProcessing}
                  className="w-full py-2.5 sm:py-3 px-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:bg-slate-100 text-slate-700 font-semibold text-xs sm:text-sm transition-all duration-200 flex items-center justify-center cursor-pointer shadow-xs active:scale-[0.98] disabled:opacity-50"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={handleConfirmRegister}
                  disabled={isProcessing}
                  className="w-full py-2.5 sm:py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs sm:text-sm transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-blue-600/25 hover:shadow-lg hover:shadow-blue-600/30 active:scale-[0.98] disabled:opacity-60"
                >
                  {isProcessing ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin shrink-0" />
                      <span>Đang tạo...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4 shrink-0" />
                      <span>Hoàn tất đăng ký</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Modal hướng dẫn khi chưa điền CLIENT_ID */}
      {showConfigModal && mounted && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div
            className="absolute inset-0"
            onClick={() => setShowConfigModal(false)}
          />
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 relative z-10 space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2 text-blue-600">
                <Sparkles className="w-5 h-5 shrink-0" />
                <h3 className="font-bold text-slate-900 text-base">Cấu hình Google OAuth 2.0</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowConfigModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Tính năng <strong>Google Sign-In</strong> đã sẵn sàng! Bạn chỉ cần điền mã Client ID lấy từ Google Cloud Console vào 2 file môi trường:
            </p>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs font-mono space-y-2 text-slate-700">
              <div>
                <div className="text-slate-500 font-sans font-medium mb-1">1. File frontend/.env.local:</div>
                <div className="text-blue-700 select-all bg-white p-1.5 rounded border border-slate-200">
                  NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_client_id.apps.googleusercontent.com
                </div>
              </div>
              <div>
                <div className="text-slate-500 font-sans font-medium mb-1">2. File backend/.env:</div>
                <div className="text-blue-700 select-all bg-white p-1.5 rounded border border-slate-200">
                  GOOGLE_CLIENT_ID=your_client_id.apps.googleusercontent.com
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={() => setShowConfigModal(false)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs sm:text-sm font-semibold cursor-pointer transition-all"
              >
                Đã hiểu
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
