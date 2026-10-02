'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from '@/app/components/common/Toast';
import { saveAuthSession } from '@/lib/auth';
import { Sparkles, Info, X } from 'lucide-react';

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: any) => void;
          renderButton: (parent: HTMLElement, options: any) => void;
          prompt: () => void;
        };
        oauth2: {
          initTokenClient: (config: any) => any;
        };
      };
    };
  }
}

interface GoogleAuthButtonProps {
  mode: 'login' | 'register';
  role?: 'TEACHER' | 'STUDENT';
  onError?: (errorMsg: string, isNotRegistered?: boolean, isLocalAccount?: boolean) => void;
  onLoading?: (loading: boolean) => void;
  className?: string;
}

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

export function GoogleAuthButton({
  mode,
  role = 'STUDENT',
  onError,
  onLoading,
  className = '',
}: GoogleAuthButtonProps) {
  const router = useRouter();
  const googleBtnContainerRef = useRef<HTMLDivElement>(null);
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';

  // 1. Tải Google Identity Services Script
  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (window.google?.accounts?.id) {
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

    return () => {
      // Giữ script trong cache trang
    };
  }, []);

  // 2. Khởi tạo và Render Button Google chuẩn
  useEffect(() => {
    if (!scriptLoaded || !googleClientId || !googleBtnContainerRef.current) return;
    if (!window.google?.accounts?.id) return;

    try {
      window.google.accounts.id.initialize({
        client_id: googleClientId,
        callback: handleGoogleCredentialResponse,
        auto_select: false,
        cancel_on_tap_outside: true,
      });

      googleBtnContainerRef.current.innerHTML = '';
      window.google.accounts.id.renderButton(googleBtnContainerRef.current, {
        type: 'standard',
        theme: 'outline',
        size: 'large',
        text: mode === 'register' ? 'signup_with' : 'signin_with',
        shape: 'rectangular',
        logo_alignment: 'left',
        width: 360,
        locale: 'vi',
      });
    } catch (err) {
      console.error('Lỗi khởi tạo Google Sign-in button:', err);
    }
  }, [scriptLoaded, googleClientId, mode, role]);

  // 3. Xử lý phản hồi mã ID Token từ Google
  const handleGoogleCredentialResponse = async (response: { credential?: string }) => {
    const idToken = response.credential;
    if (!idToken) {
      toast.error('Lỗi đăng nhập', 'Không nhận được mã xác thực từ Google.');
      onError?.('Không nhận được mã xác thực từ Google.');
      return;
    }

    setIsProcessing(true);
    onLoading?.(true);

    try {
      const endpoint =
        mode === 'register'
          ? `${API_BASE_URL}/auth/google/register`
          : `${API_BASE_URL}/auth/google/login`;

      const bodyData =
        mode === 'register' ? { idToken, role } : { idToken };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Nhận HttpOnly cookie từ máy chủ
        body: JSON.stringify(bodyData),
      });

      const result = await res.json();

      if (!res.ok || !result.success) {
        const errorMsg =
          result.message || 'Xác thực Google không thành công. Vui lòng thử lại.';

        // Trường hợp 1: Đăng nhập nhưng tài khoản chưa đăng ký (404)
        const isNotRegistered =
          res.status === 404 || errorMsg.includes('chưa được đăng ký');

        // Trường hợp 2: Tài khoản đã đăng ký bằng mật khẩu (400)
        const isLocalAccount =
          errorMsg.includes('Mật khẩu thông thường') || errorMsg.includes('mật khẩu');

        toast.error('Thông báo xác thực', errorMsg);
        onError?.(errorMsg, isNotRegistered, isLocalAccount);
        setIsProcessing(false);
        onLoading?.(false);
        return;
      }

      // Đăng nhập / Đăng ký thành công!
      const user = result.data?.user;
      saveAuthSession(result.data?.tokens, user);

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

      router.push(targetPath);
    } catch {
      const networkMsg =
        'Không thể kết nối đến máy chủ xác thực. Vui lòng kiểm tra lại mạng.';
      toast.error('Lỗi kết nối', networkMsg);
      onError?.(networkMsg);
    } finally {
      setIsProcessing(false);
      onLoading?.(false);
    }
  };

  // Nút dự phòng khi chưa cấu hình CLIENT_ID hoặc đang tải
  const handleFallbackClick = () => {
    if (!googleClientId) {
      setShowConfigModal(true);
      return;
    }

    if (window.google?.accounts?.id) {
      window.google.accounts.id.prompt();
    } else {
      toast.info('Đang kết nối Google...', 'Vui lòng đợi vài giây và bấm lại.');
    }
  };

  return (
    <>
      <div className={`w-full flex flex-col items-center justify-center ${className}`}>
        {/* Container cho Google Official Rendered Button (chuẩn hóa hiển thị tiếng Việt, độ rộng đầy đủ) */}
        {googleClientId && scriptLoaded ? (
          <div className="w-full flex justify-center overflow-hidden rounded-xl border border-slate-200/90 shadow-xs hover:shadow-sm transition-all duration-200">
            <div
              ref={googleBtnContainerRef}
              className="w-full flex justify-center py-0.5"
            />
          </div>
        ) : (
          <button
            type="button"
            onClick={handleFallbackClick}
            disabled={isProcessing}
            className="w-full py-2.5 sm:py-3 px-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold text-xs sm:text-sm transition-all duration-200 flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-60"
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
            <span>
              {isProcessing
                ? 'Đang xử lý...'
                : mode === 'register'
                  ? 'Đăng ký với Google'
                  : 'Đăng nhập với Google'}
            </span>
          </button>
        )}
      </div>

      {/* Modal hướng dẫn khi chưa điền CLIENT_ID */}
      {showConfigModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-slate-100 space-y-4">
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
              Tính năng <strong>Google Sign-In</strong> đã sẵn sàng về mặt mã nguồn! Bạn chỉ cần điền mã Client ID vào cấu hình để kích hoạt popup Google trực tiếp:
            </p>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs font-mono space-y-1.5 text-slate-700">
              <div className="text-slate-500 font-sans font-medium">1. File frontend/.env.local:</div>
              <div className="text-blue-700 select-all bg-white p-1.5 rounded border border-slate-200">
                NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_id.apps.googleusercontent.com
              </div>
              <div className="text-slate-500 font-sans font-medium pt-1">2. File backend/.env:</div>
              <div className="text-blue-700 select-all bg-white p-1.5 rounded border border-slate-200">
                GOOGLE_CLIENT_ID=your_id.apps.googleusercontent.com
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
        </div>
      )}
    </>
  );
}
