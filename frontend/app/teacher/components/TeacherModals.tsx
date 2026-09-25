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
  onSubmit: (v: { name: string; code: string; status: TeacherClass["status"] }) => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [code, setCode] = useState(initial?.code ?? "");
  const [status, setStatus] = useState<TeacherClass["status"]>(initial?.status ?? "active");
  const [error, setError] = useState("");

  const submit = () => {
    if (name.trim().length < 3) {
      setError("Tên lớp phải có ít nhất 3 ký tự.");
      return;
    }
    if (!/^[A-Za-z0-9]{3,10}$/.test(code.trim())) {
      setError("Mã lớp 3–10 ký tự, chỉ gồm chữ và số (VD: WEB302).");
      return;
    }
    onSubmit({ name: name.trim(), code: code.trim().toUpperCase(), status });
  };

  return (
    <div className="space-y-3.5">
        <div>
          <label className="mb-1.5 block text-[13px] font-semibold text-slate-700">
            Tên lớp học *
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="VD: Lập trình Web nâng cao"
            className="h-11 w-full rounded-lg border border-slate-200 px-3.5 text-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1.5 block text-[13px] font-semibold text-slate-700">
              Mã lớp *
            </label>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="VD: WEB302"
              className="h-11 w-full rounded-lg border border-slate-200 px-3.5 text-sm uppercase outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-[13px] font-semibold text-slate-700">
              Trạng thái
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as TeacherClass["status"])}
              className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-400"
            >
              <option value="active">Đang hoạt động</option>
              <option value="closed">Đã đóng</option>
            </select>
          </div>
        </div>

        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-[13px] text-red-600">{error}</p>
        )}

        <div className="flex justify-end gap-2 pt-1">
          <button
            onClick={onClose}
            className="rounded-lg px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-100"
          >
            Hủy
          </button>
          <button
            onClick={submit}
            className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm shadow-blue-600/30 transition hover:bg-blue-700"
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
  onSubmit: (v: { name: string; code: string; status: TeacherClass["status"] }) => void;
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
          <dl className="grid grid-cols-2 gap-2 text-sm">
            <div className="rounded-lg bg-slate-50 p-3">
              <dt className="text-xs text-slate-500">Mã lớp</dt>
              <dd className="font-bold text-slate-900">{classInfo.code}</dd>
            </div>
            <div className="rounded-lg bg-slate-50 p-3">
              <dt className="text-xs text-slate-500">Trạng thái</dt>
              <dd className="font-bold text-slate-900">
                {classInfo.status === "active" ? "Đang hoạt động" : "Đã đóng"}
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

/* ---------- Xác nhận xóa ---------- */
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
    <Modal open={!!classInfo} onClose={onClose} title="Xóa lớp học?" widthClass="max-w-[420px]">
      {classInfo && (
        <div className="space-y-4">
          <p className="text-sm leading-relaxed text-slate-600">
            Bạn chắc chắn muốn xóa lớp <b className="text-slate-900">{classInfo.name}</b> (
            {classInfo.code})? Hành động này không thể hoàn tác.
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
              className="rounded-lg bg-red-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-red-700"
            >
              Xóa lớp
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
