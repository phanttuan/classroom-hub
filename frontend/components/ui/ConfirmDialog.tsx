"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { AlertTriangle, HelpCircle, Trash2, X, type LucideIcon } from "lucide-react";

export type ConfirmTone = "danger" | "warning" | "primary";

export interface ConfirmOptions {
  title: string;
  /** Nội dung giải thích; chuỗi hoặc JSX (vd. in đậm tên đối tượng) */
  message?: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  tone?: ConfirmTone;
  icon?: LucideIcon;
}

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

const TONES: Record<ConfirmTone, { icon: LucideIcon; iconBox: string; button: string }> = {
  danger: {
    icon: Trash2,
    iconBox: "bg-red-50 text-red-600 ring-8 ring-red-50/60",
    button: "bg-red-600 hover:bg-red-700 focus-visible:ring-red-200 shadow-red-600/20",
  },
  warning: {
    icon: AlertTriangle,
    iconBox: "bg-amber-50 text-amber-600 ring-8 ring-amber-50/60",
    button: "bg-amber-500 hover:bg-amber-600 focus-visible:ring-amber-200 shadow-amber-500/20",
  },
  primary: {
    icon: HelpCircle,
    iconBox: "bg-blue-50 text-blue-600 ring-8 ring-blue-50/60",
    button: "bg-[#0f6cbf] hover:bg-[#0c599e] focus-visible:ring-blue-200 shadow-blue-600/20",
  },
};

/**
 * Hộp xác nhận dùng chung thay cho window.confirm():
 *   const confirm = useConfirm();
 *   if (!(await confirm({ title: "Xóa topic?", tone: "danger" }))) return;
 * Đóng (= Hủy) khi bấm ra ngoài, nút X hoặc phím Esc; Enter để đồng ý.
 */
export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const resolverRef = useRef<((value: boolean) => void) | null>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);

  const confirm = useCallback<ConfirmFn>((opts) => {
    // Hộp cũ chưa trả lời → coi như Hủy
    resolverRef.current?.(false);
    setOptions(opts);
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
    });
  }, []);

  const close = useCallback((result: boolean) => {
    resolverRef.current?.(result);
    resolverRef.current = null;
    setOptions(null);
  }, []);

  useEffect(() => {
    if (!options) return;
    // Thao tác nguy hiểm: focus nút Hủy để Enter vô tình không xóa dữ liệu
    (options.tone === "danger" ? cancelRef : confirmRef).current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        close(false);
      }
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [options, close]);

  const tone = TONES[options?.tone ?? "primary"];
  const Icon = options?.icon ?? tone.icon;

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {options && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <button
            type="button"
            aria-label="Đóng"
            tabIndex={-1}
            onClick={() => close(false)}
            className="animate-[confirmFade_150ms_ease-out] absolute inset-0 cursor-default bg-slate-900/50 backdrop-blur-[3px]"
          />
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="confirm-title"
            aria-describedby={options.message ? "confirm-message" : undefined}
            className="animate-[confirmPop_180ms_cubic-bezier(0.16,1,0.3,1)] relative w-full max-w-[420px] rounded-2xl bg-white p-6 shadow-2xl shadow-slate-900/25"
          >
            <button
              type="button"
              onClick={() => close(false)}
              aria-label="Đóng"
              className="absolute right-3.5 top-3.5 grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="flex flex-col items-center text-center">
              <div className={`grid h-14 w-14 place-items-center rounded-full ${tone.iconBox}`}>
                <Icon className="h-6 w-6" />
              </div>
              <h2 id="confirm-title" className="mt-5 text-[18px] font-bold leading-snug text-slate-900">
                {options.title}
              </h2>
              {options.message && (
                <div id="confirm-message" className="mt-2 text-[14px] leading-relaxed text-slate-500">
                  {options.message}
                </div>
              )}
            </div>

            <div className="mt-6 flex flex-col-reverse gap-2.5 sm:flex-row">
              <button
                ref={cancelRef}
                type="button"
                onClick={() => close(false)}
                className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-[14px] font-semibold text-slate-700 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-slate-100"
              >
                {options.cancelText ?? "Hủy"}
              </button>
              <button
                ref={confirmRef}
                type="button"
                onClick={() => close(true)}
                className={`flex-1 rounded-xl px-4 py-2.5 text-[14px] font-semibold text-white shadow-md transition focus-visible:outline-none focus-visible:ring-4 ${tone.button}`}
              >
                {options.confirmText ?? "Đồng ý"}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error("useConfirm phải dùng bên trong <ConfirmProvider>");
  return ctx;
}
