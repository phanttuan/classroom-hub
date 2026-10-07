"use client";

import { useState } from "react";
import Modal from "./Modal";
import type {
  PendingAssignment,
  ScheduleEvent,
  TeacherClass,
  TeacherNotification,
} from "@/lib/types/teacher";

/* ---------- Tạo / Sửa lớp học ---------- */
function CreateClassForm({
  initial,
  onSubmit,
  onClose,
}: {
  initial?: TeacherClass | null;
  onClose: () => void;
  onSubmit: (v: { name: string; description?: string; code?: string; status?: TeacherClass["status"] }) => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [error, setError] = useState("");
  const isArchived = initial?.status === "archived";

  const submit = () => {
    if (name.trim().length < 1) {
      setError("Tên lớp học không được để trống.");
      return;
    }
    if (name.trim().length > 255) {
      setError("Tên lớp học không được vượt quá 255 ký tự.");
      return;
    }
    if (description.length > 2000) {
      setError("Mô tả lớp học không được vượt quá 2000 ký tự.");
      return;
    }
    onSubmit({
      name: name.trim(),
      description: description.trim() || undefined,
      code: initial?.code,
      status: initial?.status ?? "active",
    });
  };

  return (
    <div className="space-y-3.5">
      {isArchived && (
        <div className="rounded-lg bg-amber-50 p-3 text-[13px] text-amber-700">
          Lớp học này đã lưu trữ (chỉ đọc). Bạn không thể chỉnh sửa thông tin cho đến khi khôi phục lớp.
        </div>
      )}

      <div>
        <label className="mb-1.5 block text-[13px] font-semibold text-slate-700">
          Tên lớp học *
        </label>
        <input
          disabled={isArchived}
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            if (error) setError("");
          }}
          placeholder="VD: Lập trình Web nâng cao"
          className="h-11 w-full rounded-lg border border-slate-200 px-3.5 text-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100 disabled:bg-slate-100 disabled:text-slate-500"
        />
      </div>

      <div>
        <label className="mb-1.5 block text-[13px] font-semibold text-slate-700">
          Mô tả lớp học
        </label>
        <textarea
          disabled={isArchived}
          value={description}
          onChange={(e) => {
            setDescription(e.target.value);
            if (error) setError("");
          }}
          rows={3}
          placeholder="Giới thiệu mục tiêu môn học, tài liệu hoặc ghi chú cho sinh viên..."
          className="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100 disabled:bg-slate-100 disabled:text-slate-500"
        />
      </div>

      {initial ? (
        <div className="rounded-lg bg-slate-50 p-3 text-[13px] text-slate-600">
          <span className="font-semibold text-slate-700">Mã lớp:</span>{" "}
          <span className="font-mono font-bold text-blue-600">{initial.code}</span>{" "}
          <span className="text-xs text-slate-400">(Mã do hệ thống cấp phát cố định)</span>
        </div>
      ) : (
        <p className="text-xs text-slate-500">
          * Mã lớp học (8 ký tự duy nhất) sẽ được hệ thống sinh tự động sau khi tạo.
        </p>
      )}

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-[13px] text-red-600">{error}</p>
      )}

      <div className="flex justify-end gap-2 pt-1">
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-100"
        >
          Hủy
        </button>
        <button
          type="button"
          disabled={isArchived}
          onClick={submit}
          className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm shadow-blue-600/30 transition hover:bg-blue-700 disabled:opacity-50"
        >
          {initial ? "Lưu thay đổi" : "Tạo lớp"}
        </button>
      </div>
    </div>
  );
}

export function CreateClassModal({
  open,
  initial,
  onClose,
  onSubmit,
}: {
  open: boolean;
  initial?: TeacherClass | null;
  onClose: () => void;
  onSubmit: (v: { name: string; description?: string; code?: string; status?: TeacherClass["status"] }) => void;
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={initial ? "Chỉnh sửa lớp học" : "Tạo lớp học mới"}
    >
      {/* key để reset form mỗi lần mở / đổi lớp sửa — tránh setState trong effect */}
      <CreateClassForm
        key={initial ? `edit-${initial.id}` : `create-${String(open)}`}
        initial={initial}
        onClose={onClose}
        onSubmit={onSubmit}
      />
    </Modal>
  );
}

/* ---------- Chi tiết lớp ---------- */
export function ClassDetailModal({
  classInfo,
  onClose,
}: {
  classInfo: TeacherClass | null;
  onClose: () => void;
}) {
  return (
    <Modal open={!!classInfo} onClose={onClose} title="Chi tiết lớp học">
      {classInfo && (
        <div className="space-y-3">
          <div className={`grid place-items-center rounded-xl bg-gradient-to-br py-8 text-5xl ${classInfo.coverGradient}`}>
            <span>{classInfo.coverEmoji}</span>
          </div>
          <h4 className="text-[16px] font-bold text-slate-900">{classInfo.name}</h4>
          {classInfo.description && (
            <p className="text-[13px] leading-relaxed text-slate-600">{classInfo.description}</p>
          )}
          <dl className="grid grid-cols-2 gap-2 text-sm">
            <div className="rounded-lg bg-slate-50 p-3">
              <dt className="text-xs text-slate-500">Mã lớp</dt>
              <dd className="font-bold text-slate-900">{classInfo.code}</dd>
            </div>
            <div className="rounded-lg bg-slate-50 p-3">
              <dt className="text-xs text-slate-500">Trạng thái</dt>
              <dd className="font-bold text-slate-900">
                {classInfo.status === "active"
                  ? "Đang hoạt động"
                  : classInfo.status === "closed"
                  ? "Đã đóng"
                  : "Đã lưu trữ"}
              </dd>
            </div>
            <div className="rounded-lg bg-slate-50 p-3">
              <dt className="text-xs text-slate-500">Sinh viên</dt>
              <dd className="font-bold text-slate-900">{classInfo.studentCount}</dd>
            </div>
            <div className="rounded-lg bg-slate-50 p-3">
              <dt className="text-xs text-slate-500">Cập nhật</dt>
              <dd className="font-bold text-slate-900">{classInfo.updatedAt}</dd>
            </div>
          </dl>
          <button
            onClick={onClose}
            className="w-full rounded-lg bg-slate-900 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700"
          >
            Đóng
          </button>
        </div>
      )}
    </Modal>
  );
}

/* ---------- Modal Chuyển trạng thái lớp học (Đóng / Lưu trữ / Khôi phục) ---------- */
export function ConfirmStatusChangeModal({
  classInfo,
  targetStatus,
  onClose,
  onConfirm,
}: {
  classInfo: TeacherClass | null;
  targetStatus: "active" | "closed" | "archived" | null;
  onClose: () => void;
  onConfirm: () => void;
}) {
  if (!classInfo || !targetStatus) return null;

  const config = {
    closed: {
      title: "Đóng lớp học?",
      message: `Bạn có chắc muốn đóng lớp "${classInfo.name}" (${classInfo.code})? Lớp sẽ ngừng tiếp nhận học sinh mới và không tạo thêm hoạt động mới.`,
      btnText: "Đóng lớp",
      btnClass: "bg-amber-600 hover:bg-amber-700 text-white",
    },
    archived: {
      title: "Lưu trữ lớp học?",
      message: `Bạn có chắc muốn lưu trữ lớp "${classInfo.name}" (${classInfo.code})? Lớp học sẽ chuyển sang chế độ chỉ đọc. Toàn bộ tài liệu và kết quả học tập sẽ được bảo toàn.`,
      btnText: "Lưu trữ lớp",
      btnClass: "bg-slate-700 hover:bg-slate-800 text-white",
    },
    active: {
      title: "Khôi phục lớp học?",
      message: `Bạn có chắc muốn mở lại hoạt động cho lớp "${classInfo.name}" (${classInfo.code})?`,
      btnText: "Khôi phục hoạt động",
      btnClass: "bg-blue-600 hover:bg-blue-700 text-white",
    },
  }[targetStatus];

  return (
    <Modal open={true} onClose={onClose} title={config.title} widthClass="max-w-[440px]">
      <div className="space-y-4">
        <p className="text-sm leading-relaxed text-slate-600">{config.message}</p>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`rounded-lg px-5 py-2.5 text-sm font-semibold shadow-sm ${config.btnClass}`}
          >
            {config.btnText}
          </button>
        </div>
      </div>
    </Modal>
  );
}

/* ---------- Xác nhận xóa (fallback) ---------- */
export function ConfirmDeleteModal({
  classInfo,
  onClose,
  onConfirm,
}: {
  classInfo: TeacherClass | null;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <Modal open={!!classInfo} onClose={onClose} title="Lưu trữ lớp học?" widthClass="max-w-[420px]">
      {classInfo && (
        <div className="space-y-4">
          <p className="text-sm leading-relaxed text-slate-600">
            Theo chính sách hệ thống, lớp học không xóa vĩnh viễn để bảo tồn kết quả của sinh viên.
            Bạn có muốn chuyển lớp <b className="text-slate-900">{classInfo.name}</b> sang trạng thái lưu trữ?
          </p>
          <div className="flex justify-end gap-2">
            <button
              onClick={onClose}
              className="rounded-lg px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100"
            >
              Hủy
            </button>
            <button
              onClick={onConfirm}
              className="rounded-lg bg-slate-800 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-900"
            >
              Lưu trữ
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}

/* ---------- Chấm điểm ---------- */
function GradeForm({
  assignment,
  onClose,
  onSubmit,
}: {
  assignment: PendingAssignment;
  onClose: () => void;
  onSubmit: (scoreNote: string) => void;
}) {
  const [note, setNote] = useState("");

  return (
    <div className="space-y-3">
          <div className="rounded-xl bg-slate-50 p-3.5 text-sm">
            <p className="font-bold text-slate-900">{assignment.title}</p>
            <p className="mt-0.5 text-slate-500">
              Lớp: {assignment.classCode} • Đã nộp {assignment.submitted}/{assignment.total}
            </p>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200">
              <div
                className="h-full rounded-full bg-blue-600"
                style={{ width: `${Math.round((assignment.submitted / assignment.total) * 100)}%` }}
              />
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-[13px] font-semibold text-slate-700">
              Nhận xét nhanh (demo)
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              placeholder="VD: Đã chấm 12/12 bài, đa số làm tốt phần layout..."
              className="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              onClick={onClose}
              className="rounded-lg px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100"
            >
              Để sau
            </button>
            <button
              onClick={() => onSubmit(note)}
              className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
            >
              Mở sổ điểm
            </button>
          </div>
        </div>
  );
}

export function GradeModal({
  assignment,
  onClose,
  onSubmit,
}: {
  assignment: PendingAssignment | null;
  onClose: () => void;
  onSubmit: (scoreNote: string) => void;
}) {
  return (
    <Modal open={!!assignment} onClose={onClose} title="Chấm điểm bài tập">
      {assignment && (
        <GradeForm
          key={assignment.id}
          assignment={assignment}
          onClose={onClose}
          onSubmit={onSubmit}
        />
      )}
    </Modal>
  );
}

/* ---------- Chi tiết sự kiện lịch ---------- */
export function EventDetailModal({
  event,
  onClose,
}: {
  event: ScheduleEvent | null;
  onClose: () => void;
}) {
  return (
    <Modal open={!!event} onClose={onClose} title="Chi tiết lịch">
      {event && (
        <div className="space-y-2.5 text-sm">
          <p className="text-[16px] font-bold text-slate-900">{event.title}</p>
          <p className="text-slate-500">{event.className}</p>
          <div className="grid grid-cols-2 gap-2 pt-1">
            <div className="rounded-lg bg-slate-50 p-3">
              <p className="text-xs text-slate-500">Ngày</p>
              <p className="font-bold">15/09/2026</p>
            </div>
            <div className="rounded-lg bg-slate-50 p-3">
              <p className="text-xs text-slate-500">Giờ</p>
              <p className="font-bold">
                {event.startTime} - {event.endTime}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-full rounded-lg bg-slate-900 py-2.5 text-sm font-semibold text-white hover:bg-slate-700"
          >
            Đóng
          </button>
        </div>
      )}
    </Modal>
  );
}

/* ---------- Chi tiết / tất cả thông báo ---------- */
export function NotificationModal({
  notification,
  all,
  onClose,
}: {
  notification: TeacherNotification | null;
  all: TeacherNotification[];
  onClose: () => void;
}) {
  const showingAll = !notification;
  return (
    <Modal
      open={notification !== undefined}
      onClose={onClose}
      title={notification ? notification.title : "Tất cả thông báo"}
      widthClass="max-w-[480px]"
    >
      {notification ? (
        <div className="space-y-2 text-sm">
          <p className="text-xs text-slate-400">{notification.timeAgo}</p>
          <p className="leading-relaxed text-slate-600">{notification.description}</p>
        </div>
      ) : (
        showingAll && (
          <ul className="max-h-[50vh] space-y-3 overflow-y-auto pr-1">
            {all.map((n) => (
              <li key={n.id} className="rounded-xl bg-slate-50 p-3 text-sm">
                <p className="font-bold text-slate-900">{n.title}</p>
                <p className="mt-0.5 text-slate-500">{n.description}</p>
                <p className="mt-1 text-[11px] text-slate-400">{n.timeAgo}</p>
              </li>
            ))}
          </ul>
        )
      )}
    </Modal>
  );
}
