"use client";

import { useState } from "react";
import { Loader2, KeyRound, AlertCircle, Sparkles } from "lucide-react";
import Modal from "../../teacher/components/Modal";
import { joinCourse } from "@/lib/api/course-api";
import type { CourseDto } from "@/lib/types/course";

export interface JoinCourseModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (course: CourseDto, message: string) => void;
}

export default function JoinCourseModal({
  open,
  onClose,
  onSuccess,
}: JoinCourseModalProps) {
  const [courseCode, setCourseCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = courseCode.trim().toUpperCase();

    if (!cleanCode) {
      setError("Vui lòng nhập mã khóa học");
      return;
    }

    if (cleanCode.length < 6 || cleanCode.length > 12) {
      setError("Mã khóa học phải có độ dài từ 6 đến 12 ký tự");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await joinCourse(cleanCode);
      setCourseCode("");
      setError(null);
      onSuccess(result.course, result.message);
      onClose();
    } catch (err: any) {
      setError(err?.message || "Không thể tham gia khóa học. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setCourseCode("");
      setError(null);
      onClose();
    }
  };

  return (
    <Modal open={open} onClose={handleClose} title="Tham gia khóa học">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex items-start gap-3 rounded-xl border border-blue-100 bg-blue-50/70 p-3.5 text-[13px] text-blue-900">
          <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
          <p className="leading-relaxed">
            Nhập <strong>mã khóa học</strong> do giảng viên cung cấp (gồm 8 ký tự, ví dụ: <code className="rounded bg-blue-100/80 px-1 py-0.5 font-mono font-bold text-blue-700">TOAN12NC</code>) để tham gia khóa học.
          </p>
        </div>

        <div>
          <label htmlFor="course-code-input" className="mb-1.5 block text-[13px] font-semibold text-slate-700">
            Mã khóa học <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <KeyRound className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              id="course-code-input"
              type="text"
              value={courseCode}
              onChange={(e) => {
                setCourseCode(e.target.value.toUpperCase());
                if (error) setError(null);
              }}
              placeholder="VD: TOAN12NC"
              disabled={loading}
              maxLength={12}
              autoFocus
              className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3.5 font-mono text-base font-semibold tracking-wider text-slate-900 uppercase placeholder:text-xs placeholder:font-normal placeholder:tracking-normal placeholder:text-slate-400 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:bg-slate-100 disabled:text-slate-400"
            />
          </div>
          <p className="mt-1.5 text-xs text-slate-500">
            Mã không phân biệt chữ hoa, chữ thường và không chứa khoảng trắng.
          </p>
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-medium text-red-700">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
            <span>{error}</span>
          </div>
        )}

        <div className="flex items-center justify-end gap-2.5 pt-2">
          <button
            type="button"
            onClick={handleClose}
            disabled={loading}
            className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
          >
            Hủy
          </button>
          <button
            type="submit"
            disabled={loading || !courseCode.trim()}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm shadow-blue-600/30 transition hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Đang xử lý...</span>
              </>
            ) : (
              <span>Tham gia ngay</span>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}

