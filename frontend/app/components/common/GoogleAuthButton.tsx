'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from '@/app/components/common/Toast';
import { saveAuthSession } from '@/lib/auth';
import { Sparkles, X } from 'lucide-react';

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
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';

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
  const sendTokenToBackend = async (token: string) => {
    setIsProcessing(true);
    onLoading?.(true);

    try {
      const endpoint =
        mode === 'register'
          ? `${API_BASE_URL}/auth/google/register`
          : `${API_BASE_URL}/auth/google/login`;

      const bodyData =
        mode === 'register' ? { idToken: token, role } : { idToken: token };

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

        toast.error('Thông báo xác thực', errorMsg);
        onError?.(errorMsg, isNotRegistered, isLocalAccount);
        setIsProcessing(false);
        onLoading?.(false);
        return;
      }

      // Đăng nhập / Đăng ký thành công -> Lưu session và chuyển trang
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

  // 3. Xử lý khi người dùng bấm nút
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
            await sendTokenToBackend(tokenResponse.access_token);
          }
        },
      });

      tokenClient.requestAccessToken({ prompt: 'select_account' });
    } catch (err: any) {
      console.error('Google Auth Error:', err);
      toast.error('Không thể mở popup Google', 'Vui lòng kiểm tra lại cấu hình Client ID.');
    }
  };

  return (
    <>
      {/* Nút bấm chuẩn duy nhất 1 khung, toàn chiều rộng, đồng bộ thẩm mỹ cao cấp */}
      <button
        type="button"
        onClick={handleButtonClick}
        disabled={isProcessing}
        className={`w-full py-2.2 sm:py-2.5 px-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold text-xs sm:text-sm transition-all duration-200 flex items-center justify-center gap-2.5 cursor-pointer shadow-xs hover:shadow-sm disabled:opacity-60 active:scale-[0.99] ${className}`}
      >
        {isProcessing ? (
          <>
            <div className="w-4 h-4 border-2 border-slate-300 border-t-blue-600 rounded-full animate-spin shrink-0" />
            <span>Đang xác thực Google...</span>
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
            {mode === 'register' ? (
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span>Đăng ký với Google</span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[11px] font-bold border border-blue-200/80">
                  {role === 'TEACHER' ? '🎓 Giảng viên' : '📖 Học sinh'}
                </span>
              </div>
            ) : (
              <span>Đăng nhập với Google</span>
            )}
          </>
        )}
      </button>

      {/* Dòng chú thích minh bạch cho người dùng khi Đăng ký Google */}
      {mode === 'register' && (
        <p className="text-[11px] text-slate-500 mt-1.5 text-center flex items-center justify-center gap-1.5">
          <span>✓ Tự động lấy Họ tên & Email từ Google</span>
          <span className="text-slate-300">•</span>
          <span>
            Vai trò: <strong className="text-blue-600 font-semibold">{role === 'TEACHER' ? 'Giảng viên' : 'Học sinh'}</strong>
          </span>
        </p>
      )}

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
        </div>
      )}
    </>
  );
}
