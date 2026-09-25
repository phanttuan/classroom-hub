import {
  Users,
  UserCheck,
  GraduationCap,
  UserX,
  type LucideIcon,
} from "lucide-react";
import type { AdminStat } from "@/lib/types/admin";

const TONE_BG: Record<AdminStat["tone"], string> = {
  blue: "bg-blue-50 text-blue-600",
  green: "bg-green-50 text-green-600",
  purple: "bg-purple-50 text-purple-600",
  orange: "bg-orange-50 text-orange-500",
  red: "bg-red-50 text-red-500",
};

const ICONS: Record<AdminStat["icon"], LucideIcon> = {
  students: Users,
  teachers: UserCheck,
  classes: GraduationCap,
  users: Users,
  inactive: UserX,
};

export function RoleBadge({ role }: { role: "student" | "teacher" }) {
  return role === "student" ? (
    <span className="inline-block whitespace-nowrap rounded-md bg-blue-50 px-2.5 py-1 text-[12px] font-medium text-blue-600">
      Sinh viên
    </span>
  ) : (
    <span className="inline-block whitespace-nowrap rounded-md bg-purple-50 px-2.5 py-1 text-[12px] font-medium text-purple-600">
      Giảng viên
    </span>
  );
}

export function StatusBadge({ status }: { status: "active" | "locked" }) {
  return status === "active" ? (
    <span className="inline-block whitespace-nowrap rounded-md bg-green-50 px-2.5 py-1 text-[12px] font-medium text-green-700">
      Hoạt động
    </span>
  ) : (
    <span className="inline-block whitespace-nowrap rounded-md bg-red-50 px-2.5 py-1 text-[12px] font-medium text-red-500">
      Bị khóa
    </span>
  );
}

export function ClassStatusBadge({ status }: { status: "active" | "paused" | "inactive" }) {
  if (status === "active")
    return (
      <span className="inline-block whitespace-nowrap rounded-md bg-green-50 px-2.5 py-1 text-[12px] font-medium text-green-700">
        Đang hoạt động
      </span>
    );
  if (status === "paused")
    return (
      <span className="inline-block whitespace-nowrap rounded-md bg-orange-50 px-2.5 py-1 text-[12px] font-medium text-orange-500">
        Tạm ngưng
      </span>
    );
  return (
    <span className="inline-block whitespace-nowrap rounded-md bg-red-50 px-2.5 py-1 text-[12px] font-medium text-red-500">
      Không hoạt động
    </span>
  );
}

export function IssueBadge({ label }: { label: string }) {
  return (
    <span className="inline-block whitespace-nowrap rounded-md bg-red-50/70 px-2.5 py-1 text-[12px] font-medium text-red-500">
      {label}
    </span>
  );
}

export default function AdminStatCards({
  stats,
  compact = false,
}: {
  stats: AdminStat[];
  /** true khi drawer chi tiết đang mở (cột chính bị hẹp) → chỉ dàn tối đa 2 cột để không tràn chữ */
  compact?: boolean;
}) {
  return (
    <div
      className={`grid grid-cols-1 gap-4 sm:grid-cols-2 ${
        compact ? "" : stats.length === 4 ? "xl:grid-cols-4" : "xl:grid-cols-3"
      }`}
    >
      {stats.map((s) => {
        const Icon = ICONS[s.icon];
        return (
          <div
            key={s.id}
            className="flex min-w-0 items-center gap-4 overflow-hidden rounded-xl border border-slate-200/70 bg-white p-5"
          >
            <span className={`grid h-14 w-14 shrink-0 place-items-center rounded-xl ${TONE_BG[s.tone]}`}>
              <Icon className="h-7 w-7" />
            </span>
            <span className="min-w-0">
              <span className="block text-[13px] leading-snug text-slate-500">{s.label}</span>
              <span className="block text-[26px] font-extrabold leading-tight tracking-tight">
                {s.value}
              </span>
              <span className="mt-0.5 flex items-center gap-1.5 whitespace-nowrap text-[12.5px]">
                <span className={`font-bold ${s.deltaUp ? "text-green-600" : "text-red-500"}`}>
                  {s.deltaUp ? "↑" : "↓"} {s.delta}
                </span>
                <span className="text-slate-400">{s.deltaNote}</span>
              </span>
            </span>
          </div>
        );
      })}
    </div>
  );
}

export function avatarUrl(img: number) {
  return `https://i.pravatar.cc/80?img=${img}`;
}
