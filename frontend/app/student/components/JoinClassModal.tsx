"use client";

import { useState } from "react";
import { Loader2, KeyRound, AlertCircle, Sparkles } from "lucide-react";
import Modal from "../../teacher/components/Modal";
import { joinClass } from "@/lib/api/class-api";
import type { ClassroomDto } from "@/lib/types/class";

interface JoinClassModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (classroom: ClassroomDto, message: string) => void;
}

export default function JoinClassModal({
  open,
  onClose,
  onSuccess,
}: JoinClassModalProps) {
  const [classCode, setClassCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = classCode.trim().toUpperCase();

    if (!cleanCode) {
      setError("Vui lòng nhập mã lớp học");
      return;
    }

    if (cleanCode.length < 6 || cleanCode.length > 12) {
      setError("Mã lớp học phải có độ dài từ 6 đến 12 ký tự");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await joinClass(cleanCode);
      setClassCode("");
      setError(null);
      onSuccess(result.classroom, result.message);
      onClose();
    } catch (err: any) {
      setError(err?.message || "Không thể tham gia lớp học. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setClassCode("");
      setError(null);
      onClose();
    }
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Tham gia lớp học"
      widthClass="max-w-[480px]"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="text-[13.5px] text-slate-500">
          Nhập mã lớp học do giảng viên cung cấp để tham gia vào lớp và truy cập
          bài học, tài liệu học tập.
        </p>

        {error && (
          <div className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50/80 p-3 text-[13px] text-red-700">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span className="leading-snug">{error}</span>
          </div>
        )}

        <div>
          <label className="block text-[13px] font-semibold text-slate-700">
            Mã lớp học <span className="text-red-500">*</span>
          </label>
          <div className="relative mt-1.5">
            <KeyRound className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={classCode}
              onChange={(e) => {
                setClassCode(e.target.value.toUpperCase().replace(/\s+/g, ""));
                if (error) setError(null);
              }}
              placeholder="VD: CS101A9X"
              maxLength={12}
              autoFocus
              disabled={loading}
              className="h-11 w-full rounded-xl border border-slate-200 pl-10 pr-4 text-[14px] font-mono tracking-widest uppercase outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:bg-slate-50"
            />
          </div>
          <p className="mt-1.5 text-[11.5px] text-slate-400">
            Mã lớp gồm 6 - 12 ký tự chữ và số (không phân biệt hoa/thường).
          </p>
        </div>

        <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-3 text-[12px] text-blue-700">
          <div className="flex items-center gap-1.5 font-semibold">
            <Sparkles className="h-3.5 w-3.5" /> Lưu ý dành cho sinh viên:
          </div>
          <p className="mt-1 text-slate-600">
            Nếu bạn đã từng rời hoặc bị xóa khỏi lớp, việc tham gia lại bằng mã
            sẽ tự động khôi phục lịch sử học tập và điểm số trước đây của bạn.
          </p>
        </div>

        <div className="flex justify-end gap-2.5 pt-2">
          <button
            type="button"
            onClick={handleClose}
            disabled={loading}
            className="rounded-xl px-4 py-2.5 text-[13px] font-semibold text-slate-600 hover:bg-slate-100 disabled:opacity-50"
          >
            Hủy
          </button>
          <button
            type="submit"
            disabled={loading || !classCode.trim()}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-[13px] font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Đang kiểm tra mã...
              </>
            ) : (
              "Tham gia lớp"
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}

