/**
 * Mock cho trang Sổ điểm.
 * 8 sinh viên WEB301 đầu khớp ảnh mẫu; còn lại sinh tự động
 * đủ sĩ số 42/56/30 để demo tìm kiếm + phân trang.
 */
import type { GradebookStudent, GradeWeight } from "@/lib/types/teacher";

export const gradeWeightDefault: GradeWeight = { assignment: 40, quiz: 60 };

export const gradeClasses = [
  { code: "WEB301", name: "Lập trình Web nâng cao", studentCount: 42 },
  { code: "PY101", name: "Lập trình Python cơ bản", studentCount: 56 },
  { code: "CS201", name: "Cấu trúc dữ liệu và giải thuật", studentCount: 30 },
];

export const gradeCourseOptions = [
  "Tất cả khóa học",
  "Lập trình Web nâng cao",
  "Lập trình Python cơ bản",
];

export interface GradebookStudentWithCourse extends GradebookStudent {
  courseName: string;
}

const COURSE_BY_CLASS: Record<string, string> = {
  WEB301: "Lập trình Web nâng cao",
  PY101: "Lập trình Python cơ bản",
  CS201: "Cấu trúc dữ liệu và giải thuật",
};

interface BaseStudent {
  name: string;
  mssv: string;
  avatarImg: number;
  aAvg: number | null;
  qAvg: number | null;
  aScores: (number | null)[];
  qScores: (number | null)[];
}

const BT_NAMES = ["Bài tập 1: HTML & CSS", "Bài tập 2: JavaScript cơ bản", "Bài tập 3: Giao diện web"];
const BT_MAX = [10, 10, 20];
const QZ_NAMES = ["Kiểm tra 1: HTML Basics", "Kiểm tra 2: JavaScript"];
const QZ_MAX = [10, 10];

function toStudent(
  id: string,
  classCode: string,
  b: BaseStudent,
): GradebookStudentWithCourse {
  const aTotal = Math.round((b.aAvg ?? 0) * 4);
  const qTotal = Math.round((b.qAvg ?? 0) * 6);
  return {
    id,
    name: b.name,
    mssv: b.mssv,
    classCode,
    courseName: COURSE_BY_CLASS[classCode] ?? "",
    avatarImg: b.avatarImg,
    assignmentAvg: b.aAvg,
    assignmentTotal: aTotal,
    assignmentMax: 40,
    quizAvg: b.qAvg,
    quizTotal: qTotal,
    quizMax: 60,
    items: [
      ...b.aScores.map((s, i) => ({
        itemId: `${id}-bt${i + 1}`,
        itemName: BT_NAMES[i],
        kind: "assignment" as const,
        score: s,
        maxScore: BT_MAX[i],
      })),
      ...b.qScores.map((s, i) => ({
        itemId: `${id}-qz${i + 1}`,
        itemName: QZ_NAMES[i],
        kind: "quiz" as const,
        score: s,
        maxScore: QZ_MAX[i],
      })),
    ],
  };
}

const WEB301_BASE: BaseStudent[] = [
  { name: "Trần Minh Anh", mssv: "23110001", avatarImg: 12, aAvg: 8.5, qAvg: 8.0, aScores: [8.0, 9.0, 17], qScores: [8.0, 8.0] },
  { name: "Lê Hoàng Bảo", mssv: "23110002", avatarImg: 13, aAvg: 7.0, qAvg: 6.5, aScores: [7.0, 7.5, 13.5], qScores: [6.0, 7.0] },
  { name: "Nguyễn Thảo Chi", mssv: "23110003", avatarImg: 47, aAvg: 9.0, qAvg: 9.5, aScores: [8.0, 9.0, 8.5], qScores: [9.0, 10] },
  { name: "Đặng Quốc Duy", mssv: "23110004", avatarImg: 59, aAvg: 6.5, qAvg: 7.0, aScores: [6.0, 7.0, 13], qScores: [7.0, 7.0] },
  { name: "Phạm Gia Linh", mssv: "23110005", avatarImg: 15, aAvg: 8.0, qAvg: 8.0, aScores: [8.0, 8.0, 16], qScores: [8.0, 8.0] },
  { name: "Vũ Minh Long", mssv: "23110006", avatarImg: 53, aAvg: 5.0, qAvg: 6.0, aScores: [5.0, 5.5, 9.5], qScores: [6.0, 6.0] },
  { name: "Ngô Thị Mai", mssv: "23110007", avatarImg: 44, aAvg: null, qAvg: null, aScores: [null, null, null], qScores: [null, null] },
  { name: "Hoàng Đức Nam", mssv: "23110008", avatarImg: 61, aAvg: 7.5, qAvg: 8.5, aScores: [7.5, 8.0, 14.5], qScores: [8.0, 9.0] },
];

const LAST = ["Nguyễn", "Trần", "Lê", "Phạm", "Hoàng", "Đặng", "Vũ", "Bùi", "Đỗ", "Ngô", "Phan", "Dương", "Trịnh", "Đinh"];
const FIRST = ["Minh", "Anh", "Bảo", "Chi", "Duy", "Linh", "Long", "Hà", "Nam", "Kiên", "Tuấn", "Hương", "Phúc", "Quân", "Thảo", "Vy", "Hải", "Sơn", "Trang", "Đạt"];

/** Sinh thêm học sinh demo (xác định — không random) cho đủ sĩ số lớp. */
function genMore(
  classCode: string,
  prefix: string,
  startIdx: number,
  count: number,
  idPrefix: string,
): GradebookStudentWithCourse[] {
  const out: GradebookStudentWithCourse[] = [];
  for (let k = 0; k < count; k++) {
    const i = startIdx + k;
    const name = `${LAST[(i * 5 + 1) % LAST.length]} ${FIRST[(i * 7 + 2) % FIRST.length]} ${FIRST[(i * 3 + 5) % FIRST.length]}`;
    const missing = i % 11 === 0;
    const aAvg = missing ? null : Math.round((5 + ((i * 7) % 45) / 10) * 10) / 10;
    const qAvg = missing ? null : Math.round((5.5 + ((i * 11) % 40) / 10) * 10) / 10;
    out.push(
      toStudent(`${idPrefix}-${i}`, classCode, {
        name,
        mssv: `${prefix}${String(i).padStart(4, "0")}`,
        avatarImg: ((i * 13) % 70) + 1,
        aAvg,
        qAvg,
        aScores: missing ? [null, null, null] : [aAvg, aAvg, aAvg !== null ? Math.round(aAvg * 2 * 10) / 10 : null],
        qScores: missing ? [null, null] : [qAvg, qAvg],
      }),
    );
  }
  return out;
}

function buildAll(): GradebookStudentWithCourse[] {
  const web301 = [
    ...WEB301_BASE.map((b, i) => toStudent(`st-00${i + 1}`, "WEB301", b)),
    ...genMore("WEB301", "2311", 9, 34, "st-w"),
  ];
  const py101 = [
    toStudent("st-101", "PY101", { name: "Bùi Anh Tuấn", mssv: "23110101", avatarImg: 22, aAvg: 8.0, qAvg: 7.5, aScores: [8.0, 8.0, 16], qScores: [7.0, 8.0] }),
    toStudent("st-102", "PY101", { name: "Đỗ Thu Hà", mssv: "23110102", avatarImg: 45, aAvg: null, qAvg: 6.0, aScores: [null, null, null], qScores: [6.0, 6.0] }),
    ...genMore("PY101", "2311", 103, 54, "st-p"),
  ];
  const cs201 = [
    toStudent("st-201", "CS201", { name: "Ngô Văn Kiên", mssv: "23110201", avatarImg: 33, aAvg: 9.0, qAvg: 8.5, aScores: [9.0, 9.0, 18], qScores: [8.0, 9.0] }),
    ...genMore("CS201", "2311", 202, 29, "st-c"),
  ];
  return [...web301, ...py101, ...cs201];
}

export const gradebookStudents: GradebookStudentWithCourse[] = buildAll();

export const gradeStatusOptions = ["Tất cả", "Đã có điểm", "Chưa có điểm"];
export const gradePageSizeOptions = [8, 16];
