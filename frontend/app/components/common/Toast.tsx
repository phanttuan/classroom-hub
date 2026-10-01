"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import {
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Info,
  X,
  ShieldCheck,
  Sparkles,
  LogOut,
} from "lucide-react";

export type ToastType = "success" | "error" | "warning" | "info";

export interface ToastItem {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
  badge?: string;
  icon?: "default" | "login" | "logout" | "register" | "shield";
}

interface ToastContextType {
  toasts: ToastItem[];
  showToast: (toast: Omit<ToastItem, "id">) => string;
  removeToast: (id: string) => void;
  clearAll: () => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

// Khóa lưu flash toast giữa các lần điều hướng trang (Route transition / Redirect)
const FLASH_STORAGE_KEY = "eduhub_flash_toast";

// Event listener cho phép gọi toast từ bất kỳ đâu (kể cả ngoài React Component)
const TOAST_EVENT = "eduhub-show-toast";

/**
 * Dispatcher toàn cục — có thể gọi ở bất kỳ file nào mà không cần hook:
 * Ví dụ:
 * toast.success("Thành công", "Đã lưu thay đổi.");
 * toast.loginSuccess("Nguyễn Văn A");
 * toast.logoutSuccess();
 * toast.flash("success", "Đăng nhập thành công!");
 */
export const toast = {
  show: (options: Omit<ToastItem, "id">) => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent(TOAST_EVENT, { detail: options }),
      );
    }
  },

  success: (title: string, message?: string, duration = 4000) => {
    toast.show({ type: "success", title, message, duration });
  },

  error: (title: string, message?: string, duration = 5000) => {
    toast.show({ type: "error", title, message, duration });
  },

  warning: (title: string, message?: string, duration = 4500) => {
    toast.show({ type: "warning", title, message, duration });
  },

  info: (title: string, message?: string, duration = 4000) => {
    toast.show({ type: "info", title, message, duration });
  },

  /** Custom Preset: Thông báo Đăng nhập thành công */
  loginSuccess: (userName?: string, roleLabel?: string) => {
    toast.show({
      type: "success",
      icon: "login",
      badge: roleLabel || "Đã xác thực",
      title: "Đăng nhập thành công!",
      message: userName
        ? `Chào mừng ${userName} quay trở lại với EduHub.`
        : "Chào mừng bạn quay trở lại với hệ thống EduHub.",
      duration: 4500,
    });
  },

  /** Custom Preset: Thông báo Đăng xuất an toàn */
  logoutSuccess: () => {
    toast.show({
      type: "info",
      icon: "logout",
      title: "Đăng xuất thành công",
      message: "Phiên làm việc và thông tin đăng nhập đã được đóng an toàn.",
      duration: 4000,
    });
  },

  /** Custom Preset: Thông báo Đăng ký thành công */
  registerSuccess: (userName?: string) => {
    toast.show({
      type: "success",
      icon: "register",
      badge: "Tài khoản mới",
      title: "Kích hoạt tài khoản thành công!",
      message: userName
        ? `Chào mừng ${userName} gia nhập cộng đồng giáo dục EduHub.`
        : "Chào mừng bạn đã gia nhập hệ sinh thái giáo dục EduHub.",
      duration: 5000,
    });
  },

  /**
   * Flash Toast: Lưu vào sessionStorage để hiển thị ngay sau khi redirect trang mới
   * (Ví dụ: Đăng nhập ở /login xong redirect sang /teacher thì /teacher mới hiển thị toast)
   */
  flash: (
    type: ToastType,
    title: string,
    message?: string,
    extra?: Partial<Omit<ToastItem, "id" | "type" | "title" | "message">>,
  ) => {
    if (typeof window !== "undefined") {
      try {
        sessionStorage.setItem(
          FLASH_STORAGE_KEY,
          JSON.stringify({ type, title, message, ...extra }),
        );
      } catch {
        // Fallback hiển thị ngay nếu storage bị chặn
        toast.show({ type, title, message, ...extra });
      }
    }
  },
};

/**
 * Hook sử dụng bên trong React Component
 */
export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    return {
      toasts: [],
      showToast: toast.show,
      removeToast: () => {},
      clearAll: () => {},
      toast,
    };
  }
  return {
    ...context,
    toast,
  };
}

/**
 * Toast Provider & Container Component
 * Đặt vào RootLayout để hoạt động trên toàn bộ hệ thống
 */
export default function ToastProvider({
  children,
}: {
  children?: React.ReactNode;
}) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((item: Omit<ToastItem, "id">) => {
    const id = Math.random().toString(36).substring(2, 9) + Date.now();
    const newToast: ToastItem = { ...item, id };

    setToasts((prev) => {
      // Giữ tối đa 4 toast cùng lúc để không chiếm diện tích màn hình
      const updated = [newToast, ...prev];
      return updated.slice(0, 4);
    });

    return id;
  }, []);

  const clearAll = useCallback(() => {
    setToasts([]);
  }, []);

  // Lắng nghe sự kiện toàn cục & kiểm tra flash toast từ sessionStorage
  useEffect(() => {
    const handleCustomToast = (event: Event) => {
      const customEvent = event as CustomEvent<Omit<ToastItem, "id">>;
      if (customEvent.detail) {
        showToast(customEvent.detail);
      }
    };

    window.addEventListener(TOAST_EVENT, handleCustomToast);

    // Kiểm tra và kích hoạt flash toast (nếu có sau khi chuyển trang)
    try {
      const stored = sessionStorage.getItem(FLASH_STORAGE_KEY);
      if (stored) {
        sessionStorage.removeItem(FLASH_STORAGE_KEY);
        const parsed = JSON.parse(stored);
        // Delay nhẹ 200ms để hiệu ứng chuyển trang êm dịu trước khi toast trượt vào
        setTimeout(() => {
          showToast(parsed);
        }, 200);
      }
    } catch {
      // Bỏ qua nếu lỗi
    }

    return () => {
      window.removeEventListener(TOAST_EVENT, handleCustomToast);
    };
  }, [showToast]);

  return (
    <ToastContext.Provider value={{ toasts, showToast, removeToast, clearAll }}>
      {children}
      {/* Toast Render Viewport: Góc trên cùng bên phải */}
      <div
        aria-live="polite"
        className="fixed top-4 right-4 sm:top-6 sm:right-6 z-[99999] flex flex-col gap-2.5 max-w-sm sm:max-w-md w-full pointer-events-none px-3 sm:px-0"
      >
        {toasts.map((item) => (
          <SingleToast key={item.id} item={item} onDismiss={removeToast} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

/**
 * Thành phần Toast Card đơn lẻ với Micro-animation và Progress Bar
 */
function SingleToast({
  item,
  onDismiss,
}: {
  item: ToastItem;
  onDismiss: (id: string) => void;
}) {
  const [progress, setProgress] = useState(100);
  const [isPaused, setIsPaused] = useState(false);
  const duration = item.duration || 4500;
  const onDismissRef = useRef(onDismiss);
  onDismissRef.current = onDismiss;

  // Thanh đo thời gian tự động đóng
  useEffect(() => {
    if (isPaused) return;

    const intervalTime = 40;
    const step = (intervalTime / duration) * 100;

    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev <= step) {
          clearInterval(timer);
          // Đưa onDismiss ra ngoài vòng render của React để tránh lỗi setState trong lúc render
          setTimeout(() => {
            onDismissRef.current(item.id);
          }, 0);
          return 0;
        }
        return prev - step;
      });
    }, intervalTime);

    return () => clearInterval(timer);
  }, [duration, isPaused, item.id]);

  // Cấu hình style và icon theo từng loại toast
  const getTheme = () => {
    switch (item.type) {
      case "success":
        return {
          wrapperBorder: "border-emerald-200/90 shadow-[0_16px_36px_rgba(16,185,129,0.16)]",
          iconBg: "bg-emerald-500 text-white shadow-md shadow-emerald-500/30",
          progressColor: "bg-emerald-500",
          badgeBg: "bg-emerald-50 text-emerald-700 border-emerald-200",
          defaultIcon: <CheckCircle2 className="w-5 h-5" />,
        };
      case "error":
        return {
          wrapperBorder: "border-rose-200/90 shadow-[0_16px_36px_rgba(244,63,94,0.16)]",
          iconBg: "bg-rose-500 text-white shadow-md shadow-rose-500/30",
          progressColor: "bg-rose-500",
          badgeBg: "bg-rose-50 text-rose-700 border-rose-200",
          defaultIcon: <AlertCircle className="w-5 h-5" />,
        };
      case "warning":
        return {
          wrapperBorder: "border-amber-200/90 shadow-[0_16px_36px_rgba(245,158,11,0.16)]",
          iconBg: "bg-amber-500 text-white shadow-md shadow-amber-500/30",
          progressColor: "bg-amber-500",
          badgeBg: "bg-amber-50 text-amber-800 border-amber-200",
          defaultIcon: <AlertTriangle className="w-5 h-5" />,
        };
      case "info":
      default:
        return {
          wrapperBorder: "border-blue-200/90 shadow-[0_16px_36px_rgba(37,99,235,0.16)]",
          iconBg: "bg-blue-600 text-white shadow-md shadow-blue-600/30",
          progressColor: "bg-blue-600",
          badgeBg: "bg-blue-50 text-blue-700 border-blue-200",
          defaultIcon: <Info className="w-5 h-5" />,
        };
    }
  };

  const theme = getTheme();

  // Icon tùy biến cho các sự kiện Auth
  const renderIcon = () => {
    if (item.icon === "login") {
      return (
        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-blue-500/30">
          <Sparkles className="w-5 h-5" />
        </div>
      );
    }
    if (item.icon === "logout") {
      return (
        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-blue-500/25">
          <LogOut className="w-4.5 h-4.5" />
        </div>
      );
    }
    if (item.icon === "register") {
      return (
        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-emerald-500/30">
          <ShieldCheck className="w-5 h-5" />
        </div>
      );
    }

    return (
      <div
        className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${theme.iconBg}`}
      >
        {theme.defaultIcon}
      </div>
    );
  };

  return (
    <div
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      className={`pointer-events-auto w-full bg-white/95 backdrop-blur-xl border rounded-2xl p-4 transition-all duration-300 transform translate-y-0 opacity-100 flex items-start gap-3.5 relative overflow-hidden group hover:scale-[1.01] ${theme.wrapperBorder}`}
      style={{
        animation: "toastSlideIn 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards",
      }}
    >
      {/* Icon đại diện */}
      {renderIcon()}

      {/* Nội dung thông báo */}
      <div className="flex-1 pr-6 space-y-1">
        <div className="flex items-center gap-2 flex-wrap">
          <h4 className="text-[14px] font-bold text-slate-900 leading-snug">
            {item.title}
          </h4>
          {item.badge && (
            <span
              className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border ${theme.badgeBg}`}
            >
              {item.badge}
            </span>
          )}
        </div>
        {item.message && (
          <p className="text-[12.5px] text-slate-600 leading-relaxed">
            {item.message}
          </p>
        )}
      </div>

      {/* Nút đóng Toast */}
      <button
        type="button"
        onClick={() => onDismiss(item.id)}
        aria-label="Đóng thông báo"
        className="absolute top-3.5 right-3.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 p-1 rounded-lg transition-colors cursor-pointer"
      >
        <X className="w-4 h-4" />
      </button>

      {/* Thanh đo thời gian (Progress Bar) chạy ngầm phía đáy */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-slate-100">
        <div
          className={`h-full transition-all ease-linear ${theme.progressColor}`}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}
