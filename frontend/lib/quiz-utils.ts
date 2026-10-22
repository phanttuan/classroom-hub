import type { AttemptBlockReason, AttemptGradingMethod, AttemptStatus, AttemptSummaryDto } from './types/quiz';

export const ATTEMPT_GRADING_OPTIONS: { value: AttemptGradingMethod; label: string; hint: string }[] = [
  { value: 'HIGHEST', label: 'Điểm cao nhất', hint: 'Lấy lượt có điểm cao nhất trong các lượt đã nộp.' },
  { value: 'LATEST', label: 'Lượt làm gần nhất', hint: 'Chỉ tính lượt nộp sau cùng, kể cả khi thấp hơn lượt trước.' },
  { value: 'AVERAGE', label: 'Trung bình các lượt', hint: 'Điểm trung bình cộng của tất cả lượt đã nộp.' },
];

export const ATTEMPT_GRADING_LABEL: Record<AttemptGradingMethod, string> = Object.fromEntries(
  ATTEMPT_GRADING_OPTIONS.map((o) => [o.value, o.label]),
) as Record<AttemptGradingMethod, string>;

export const ATTEMPT_BLOCK_TEXT: Record<AttemptBlockReason, string> = {
  DRAFT: 'Đề kiểm tra chưa được xuất bản.',
  CLOSED: 'Giáo viên đã đóng đề kiểm tra.',
  NOT_OPEN: 'Đề kiểm tra chưa đến thời gian mở.',
  PAST_DUE: 'Đã quá hạn làm bài.',
  COURSE_ARCHIVED: 'Khóa học đã lưu trữ (chỉ đọc).',
  NO_QUESTIONS: 'Đề kiểm tra chưa có câu hỏi.',
  NO_ATTEMPTS_LEFT: 'Bạn đã dùng hết số lượt làm bài.',
};

export const ATTEMPT_STATUS_LABEL: Record<AttemptStatus, { label: string; tone: 'neutral' | 'success' | 'warning' | 'info' }> = {
  IN_PROGRESS: { label: 'Đang làm', tone: 'warning' },
  SUBMITTED: { label: 'Đã nộp', tone: 'success' },
  GRADED: { label: 'Đã chấm', tone: 'info' },
};

/** "12:05" hoặc "1:02:30" — đếm ngược thời gian còn lại */
export function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

/** "12 phút", "1 giờ 30 phút" */
export function formatMinutes(minutes?: number | null): string {
  if (!minutes) return 'Không giới hạn';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h && m) return `${h} giờ ${m} phút`;
  if (h) return `${h} giờ`;
  return `${m} phút`;
}

/** Thời gian làm bài thực tế của một lượt đã nộp */
export function attemptDuration(a: Pick<AttemptSummaryDto, 'startedAt' | 'submittedAt'>): string {
  if (!a.startedAt || !a.submittedAt) return '—';
  const ms = new Date(a.submittedAt).getTime() - new Date(a.startedAt).getTime();
  if (ms < 60_000) return `${Math.max(1, Math.round(ms / 1000))} giây`;
  return `${Math.round(ms / 60_000)} phút`;
}

/** Lớp màu chữ theo tỉ lệ điểm: ≥80% xanh lá, ≥50% vàng, còn lại đỏ; chưa có điểm → xám */
export function scoreToneClass(score?: string | number | null, max?: string | number | null): string {
  const r = scoreRatio(score, max);
  if (r === null) return 'text-slate-800';
  if (r >= 0.8) return 'text-emerald-700';
  if (r >= 0.5) return 'text-amber-700';
  return 'text-red-600';
}

/** Tỉ lệ điểm 0..1 dùng để tô màu */
export function scoreRatio(score?: string | number | null, max?: string | number | null): number | null {
  const s = Number(score);
  const m = Number(max);
  if (!Number.isFinite(s) || !Number.isFinite(m) || m <= 0) return null;
  return Math.min(1, Math.max(0, s / m));
}
