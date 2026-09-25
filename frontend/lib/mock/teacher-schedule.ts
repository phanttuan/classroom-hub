/**
 * Mock cho trang Lịch.
 * "Hôm nay" của demo = 15/09/2026 (khớp ảnh mẫu).
 */
import type { ScheduleItem } from "@/lib/types/teacher";

export const SCHEDULE_TODAY = "2026-09-15";

export const scheduleEvents: ScheduleItem[] = [
  { id: "ev-01", title: "Hạn nộp Bài tập 1: HTML & CSS", date: "2026-09-01", startTime: "23:59", kind: "assignment", classCode: "WEB301", className: "Lập trình Web nâng cao", courseName: "Lập trình Web nâng cao" },
  { id: "ev-02", title: "Kiểm tra 1: HTML cơ bản", date: "2026-09-03", startTime: "08:00", endTime: "09:00", kind: "quiz", classCode: "WEB301", className: "Lập trình Web nâng cao", courseName: "Lập trình Web nâng cao", location: "Phòng A101" },
  { id: "ev-03", title: "Buổi thảo luận lớp", date: "2026-09-05", startTime: "14:00", endTime: "15:30", kind: "class", classCode: "WEB301", className: "Lập trình Web nâng cao", courseName: "Lập trình Web nâng cao", location: "Google Meet" },
  { id: "ev-04", title: "Mở bài tập 2: JavaScript cơ bản", date: "2026-09-08", startTime: "08:00", kind: "other", classCode: "WEB301", className: "Lập trình Web nâng cao", courseName: "Lập trình Web nâng cao" },
  { id: "ev-05", title: "Hạn nộp Bài tập 1 (lớp PY101)", date: "2026-09-10", startTime: "23:59", kind: "assignment", classCode: "PY101", className: "Lập trình Python cơ bản", courseName: "Lập trình Python cơ bản" },
  { id: "ev-06", title: "Kiểm tra 2: JavaScript cơ bản", date: "2026-09-12", startTime: "08:00", endTime: "09:00", kind: "quiz", classCode: "WEB301", className: "Lập trình Web nâng cao", courseName: "Lập trình Web nâng cao", location: "Phòng A101" },
  { id: "ev-07", title: "Họp lớp", date: "2026-09-15", startTime: "10:00", endTime: "11:00", kind: "class", classCode: "WEB301", className: "Lập trình Web nâng cao", courseName: "Lập trình Web nâng cao", location: "Phòng A205" },
  { id: "ev-08", title: "Mở bài tập 2: JavaScript cơ bản", date: "2026-09-15", startTime: "08:00", kind: "other", classCode: "WEB301", className: "Lập trình Web nâng cao", courseName: "Lập trình Web nâng cao" },
  { id: "ev-09", title: "Hạn nộp Bài tập 2: JavaScript", date: "2026-09-18", startTime: "23:59", kind: "assignment", classCode: "WEB301", className: "Lập trình Web nâng cao", courseName: "Lập trình Web nâng cao" },
  { id: "ev-10", title: "Kiểm tra 3: Node.js", date: "2026-09-20", startTime: "13:00", endTime: "14:00", kind: "quiz", classCode: "PY101", className: "Lập trình Python cơ bản", courseName: "Lập trình Python cơ bản", location: "Phòng B102" },
  { id: "ev-11", title: "Mở bài tập 3: API", date: "2026-09-22", startTime: "08:00", kind: "other", classCode: "PY101", className: "Lập trình Python cơ bản", courseName: "Lập trình Python cơ bản" },
  { id: "ev-12", title: "Hạn nộp Bài tập 3", date: "2026-09-25", startTime: "23:59", kind: "assignment", classCode: "PY101", className: "Lập trình Python cơ bản", courseName: "Lập trình Python cơ bản" },
  { id: "ev-13", title: "Tư vấn học tập", date: "2026-09-27", startTime: "14:00", endTime: "15:00", kind: "class", classCode: "CS201", className: "Cấu trúc dữ liệu và giải thuật", courseName: "Cấu trúc dữ liệu và giải thuật", location: "Văn phòng khoa" },
  { id: "ev-14", title: "Kiểm tra 4: Cấu trúc dữ liệu", date: "2026-09-28", startTime: "08:00", endTime: "09:00", kind: "quiz", classCode: "CS201", className: "Cấu trúc dữ liệu và giải thuật", courseName: "Cấu trúc dữ liệu và giải thuật", location: "Phòng C301" },
  { id: "ev-15", title: "Hạn nộp Bài tập 4: Phân tích dữ liệu", date: "2026-09-29", startTime: "23:59", kind: "assignment", classCode: "CS201", className: "Cấu trúc dữ liệu và giải thuật", courseName: "Cấu trúc dữ liệu và giải thuật" },
];

export const scheduleClassOptions = [
  { code: "ALL", name: "Tất cả lớp học", desc: "" },
  { code: "WEB301", name: "Lập trình Web nâng cao", desc: "WEB301 • 42 học sinh" },
  { code: "PY101", name: "Lập trình Python cơ bản", desc: "PY101 • 56 học sinh" },
  { code: "CS201", name: "Cấu trúc dữ liệu và giải thuật", desc: "CS201 • 30 học sinh" },
];

export const scheduleCourseOptions = [
  "Tất cả khóa học",
  "Lập trình Web nâng cao",
  "Lập trình Python cơ bản",
  "Cấu trúc dữ liệu và giải thuật",
];

export const scheduleTypeOptions = [
  "Tất cả loại",
  "Bài tập",
  "Kiểm tra",
  "Hoạt động lớp học",
  "Sự kiện khác",
];

export const scheduleStatusOptions = ["Tất cả trạng thái", "Sắp diễn ra", "Đã kết thúc"];
