import type { AssignmentDto } from './types/assignment';
import type { SubmissionBlockReason, SubmissionDto, SubmissionWindowDto } from './types/submission';

const pad = (n: number) => String(n).padStart(2, '0');

/** "15/10/2026 23:59" */
export function formatDateTime(iso?: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** "Thứ Năm, 15/10/2026, 23:59" — dùng cho bảng trạng thái (giống Moodle) */
export function formatDateTimeLong(iso?: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const weekday = d.toLocaleDateString('vi-VN', { weekday: 'long' });
  return `${weekday.charAt(0).toUpperCase()}${weekday.slice(1)}, ${formatDateTime(iso)}`;
}

/** Khoảng thời gian dễ đọc: "2 ngày 3 giờ", "45 phút" */
export function formatDuration(ms: number): string {
  const abs = Math.abs(ms);
  const minutes = Math.floor(abs / 60_000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  if (days >= 1) return hours % 24 ? `${days} ngày ${hours % 24} giờ` : `${days} ngày`;
  if (hours >= 1) return minutes % 60 ? `${hours} giờ ${minutes % 60} phút` : `${hours} giờ`;
  return `${Math.max(1, minutes)} phút`;
}

/**
 * Dòng "Thời gian còn lại" trong bảng trạng thái nộp bài (theo Moodle):
 * - chưa nộp, còn hạn → "Còn 2 ngày 3 giờ"
 * - chưa nộp, quá hạn → "Bài tập đã quá hạn 1 ngày"
 * - đã nộp đúng hạn → "Nộp sớm 2 giờ"
 * - đã nộp trễ → "Nộp trễ 1 ngày 2 giờ"
 */
export function timeRemainingLabel(dueAt: string, submission: SubmissionDto | null, now = Date.now()) {
  const due = new Date(dueAt).getTime();
  if (submission) {
    const diff = new Date(submission.submittedAt).getTime() - due;
    return diff > 0
      ? { text: `Nộp trễ ${formatDuration(diff)}`, tone: 'danger' as const }
      : { text: `Nộp sớm ${formatDuration(diff)}`, tone: 'success' as const };
  }
  const diff = due - now;
  if (diff < 0) return { text: `Bài tập đã quá hạn ${formatDuration(diff)}`, tone: 'danger' as const };
  if (diff < 24 * 60 * 60 * 1000) return { text: `Còn ${formatDuration(diff)}`, tone: 'warning' as const };
  return { text: `Còn ${formatDuration(diff)}`, tone: 'neutral' as const };
}

export type SubmissionStateTone = 'neutral' | 'success' | 'warning' | 'danger' | 'info';

/** Nhãn trạng thái nộp bài hiển thị cho sinh viên và giáo viên */
export function submissionStateLabel(
  submission: Pick<SubmissionDto, 'status' | 'isLate'> | null | undefined,
  window?: Pick<SubmissionWindowDto, 'isPastDue'> | null,
): { label: string; tone: SubmissionStateTone } {
  if (!submission) {
    return window?.isPastDue
      ? { label: 'Chưa nộp (quá hạn)', tone: 'danger' }
      : { label: 'Chưa nộp', tone: 'neutral' };
  }
  if (submission.status === 'GRADED') {
    return submission.isLate ? { label: 'Đã chấm · Nộp trễ', tone: 'info' } : { label: 'Đã chấm', tone: 'info' };
  }
  return submission.isLate ? { label: 'Đã nộp · Nộp trễ', tone: 'warning' } : { label: 'Đã nộp', tone: 'success' };
}

export const BLOCK_REASON_TEXT: Record<SubmissionBlockReason, string> = {
  DRAFT: 'Bài tập chưa được xuất bản.',
  CLOSED: 'Giáo viên đã đóng bài tập, không nhận bài nộp nữa.',
  NOT_OPEN: 'Bài tập chưa đến thời gian mở nộp bài.',
  PAST_DUE: 'Đã quá hạn nộp bài và bài tập này không cho phép nộp trễ.',
  COURSE_ARCHIVED: 'Khóa học đã lưu trữ (chỉ đọc), không thể nộp bài.',
  GRADED: 'Bài nộp đã được chấm điểm nên không thể thay đổi.',
};

/** Mô tả ngắn hình thức nộp bài giáo viên cho phép */
export function submissionTypesLabel(a: Pick<AssignmentDto, 'allowTextSubmission' | 'allowFileSubmission'>): string {
  if (a.allowTextSubmission && a.allowFileSubmission) return 'Bài làm văn bản và tệp đính kèm';
  if (a.allowTextSubmission) return 'Chỉ bài làm văn bản';
  if (a.allowFileSubmission) return 'Chỉ tệp đính kèm';
  return 'Không nhận bài nộp';
}

/** Số hiển thị gọn: "10", "15.5" thay vì "10.00" */
export function formatScore(score?: string | number | null): string {
  if (score === null || score === undefined || score === '') return '—';
  const n = Number(score);
  return Number.isFinite(n) ? String(Number(n.toFixed(2))) : String(score);
}
