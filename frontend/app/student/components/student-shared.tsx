"use client";

/** UI dùng chung cho khu vực học sinh: stat, tiêu đề khối, progress, donut. */

export function StatCard({
  icon,
  iconCls,
  value,
  label,
}: {
  icon: React.ReactNode;
  iconCls: string;
  value: string;
  label: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-slate-200/70 bg-white p-4">
      <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl ${iconCls}`}>
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block text-[22px] font-extrabold leading-tight">{value}</span>
        <span className="block min-h-[36px] line-clamp-2 text-[13px] leading-snug text-slate-500">{label}</span>
      </span>
    </div>
  );
}

export function SectionHead({
  title,
  actionLabel = "Xem tất cả →",
  onAction,
}: {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="mb-3 flex items-center justify-between gap-2">
      <h2 className="text-[16px] font-extrabold tracking-tight">{title}</h2>
      {onAction && (
        <button
          onClick={onAction}
          className="shrink-0 text-[13px] font-medium text-blue-600 hover:text-blue-700"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}

export function Progress({ value, barCls = "bg-blue-600" }: { value: number; barCls?: string }) {
  return (
    <span className="flex items-center gap-2">
      <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
        <span className={`block h-full rounded-full ${barCls}`} style={{ width: `${Math.min(100, value)}%` }} />
      </span>
      <span className="text-[12px] font-medium text-slate-500">{value}%</span>
    </span>
  );
}

/** Vòng donut tiến độ (SVG thuần, không cần lib chart) */
export function Donut({
  pct,
  centerTop,
  centerBottom,
  size = 150,
}: {
  pct: number;
  centerTop: string;
  centerBottom: string;
  size?: number;
}) {
  const r = 60;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative mx-auto" style={{ width: size, height: size }}>
      <svg viewBox="0 0 150 150" width={size} height={size} className="-rotate-90">
        <circle cx="75" cy="75" r={r} fill="none" stroke="#e2e8f0" strokeWidth="16" />
        <circle
          cx="75" cy="75" r={r} fill="none"
          stroke="url(#stDonut)" strokeWidth="16" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c - (c * pct) / 100}
        />
        <defs>
          <linearGradient id="stDonut" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#2563eb" />
            <stop offset="100%" stopColor="#22c55e" />
          </linearGradient>
        </defs>
      </svg>
      <span className="absolute inset-0 flex flex-col items-center justify-center">
        <b className="text-[24px] font-extrabold leading-none">{centerTop}</b>
        <span className="mt-1 text-[12px] text-slate-400">{centerBottom}</span>
      </span>
    </div>
  );
}

export const TONE_BOX: Record<string, string> = {
  red: "bg-red-50 text-red-500",
  orange: "bg-orange-50 text-orange-500",
  blue: "bg-blue-50 text-blue-600",
  green: "bg-green-50 text-green-600",
  purple: "bg-purple-50 text-purple-600",
  yellow: "bg-yellow-50 text-yellow-600",
  sky: "bg-sky-50 text-sky-600",
};
