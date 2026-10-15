"use client";

import React, { useState } from "react";
import { AlertCircle, ChevronDown, ChevronRight } from "lucide-react";

/** Nhóm trường có thể thu gọn — giống fieldset trong form của Moodle */
export function Fieldset({
  title,
  children,
  defaultOpen = true,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className="border-b border-slate-100 last:border-b-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2 px-6 py-4 text-left text-[16px] font-bold text-slate-900 hover:text-[#0f6cbf]"
      >
        {open ? (
          <ChevronDown className="h-5 w-5 text-[#0f6cbf]" />
        ) : (
          <ChevronRight className="h-5 w-5 text-[#0f6cbf]" />
        )}
        {title}
      </button>
      {open && <div className="space-y-5 px-6 pb-6 sm:pl-[52px]">{children}</div>}
    </section>
  );
}

export function Field({
  label,
  required,
  hint,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-2 lg:grid-cols-[200px_1fr] lg:gap-6">
      <label className="pt-2 text-[14px] font-medium text-slate-700">
        {label}
        {required && (
          <span className="ml-1 text-red-600" title="Bắt buộc">
            *
          </span>
        )}
      </label>
      <div className="min-w-0">
        {children}
        {hint && !error && <p className="mt-1.5 text-[12.5px] text-slate-500">{hint}</p>}
        {error && (
          <p className="mt-1.5 flex items-center gap-1 text-[12.5px] font-medium text-red-600">
            <AlertCircle className="h-3.5 w-3.5" /> {error}
          </p>
        )}
      </div>
    </div>
  );
}

export function Checkbox({
  checked,
  onChange,
  label,
  hint,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  /** Giải thích ngắn dưới nhãn */
  hint?: string;
  disabled?: boolean;
}) {
  return (
    <label className={`flex items-start gap-2.5 text-[14px] text-slate-700 ${disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`}>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-4 w-4 rounded border-slate-300 text-[#0f6cbf] focus:ring-[#0f6cbf]"
      />
      <span>
        {label}
        {hint && <span className="mt-0.5 block text-[12.5px] text-slate-500">{hint}</span>}
      </span>
    </label>
  );
}
