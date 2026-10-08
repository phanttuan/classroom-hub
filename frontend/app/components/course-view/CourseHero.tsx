import Image from "next/image";
import Link from "next/link";
import { GraduationCap, type LucideIcon } from "lucide-react";

export type HeroDot = "sky" | "amber" | "emerald" | "violet" | "rose" | "slate";
export type HeroStatusTone = "emerald" | "amber" | "slate" | "sky";

export interface HeroStat {
  label: React.ReactNode;
  dot?: HeroDot;
  /** Dùng icon thay cho chấm màu (vd. dấu tích hoàn thành) */
  icon?: LucideIcon;
  highlight?: boolean;
}

const DOT_CLASS: Record<HeroDot, string> = {
  sky: "bg-sky-400 shadow-sky-400",
  amber: "bg-amber-400 shadow-amber-400",
  emerald: "bg-emerald-400 shadow-emerald-400",
  violet: "bg-violet-400 shadow-violet-400",
  rose: "bg-rose-400 shadow-rose-400",
  slate: "bg-slate-400 shadow-slate-400",
};

const STATUS_DOT: Record<HeroStatusTone, string> = {
  emerald: "bg-emerald-400 shadow-emerald-400 animate-pulse",
  amber: "bg-amber-400 shadow-amber-400",
  slate: "bg-slate-400 shadow-slate-400",
  sky: "bg-sky-400 shadow-sky-400 animate-pulse",
};

interface CourseHeroProps {
  /** Dòng nhỏ phía trên tiêu đề */
  /** Đường dẫn phía trên tiêu đề; có href thì bấm được để di chuyển */
  eyebrow: {
    icon?: LucideIcon;
    primary: React.ReactNode;
    primaryHref?: string;
    secondary?: React.ReactNode;
    secondaryHref?: string;
    secondaryMono?: boolean;
  };
  title: React.ReactNode;
  stats?: HeroStat[];
  /** Nhãn cạnh logo EduHub (vd. KHÓA HỌC, TRANG, TỆP) */
  brandTag: string;
  status?: { caption: string; label: string; tone: HeroStatusTone };
  /** Nút thao tác hiển thị dưới hàng thống kê */
  actions?: React.ReactNode;
  /** Chặn điều hướng của đường dẫn (vd. hỏi xác nhận khi còn thay đổi chưa lưu) */
  onNavigate?: (href: string) => void;
}

/** Một phần của đường dẫn trên banner: có href → link, rê chuột hiện nền sáng (không gạch chân) */
function Crumb({
  href,
  className,
  onNavigate,
  children,
}: {
  href?: string;
  className: string;
  onNavigate?: (href: string) => void;
  children: React.ReactNode;
}) {
  if (!href) return <span className={className}>{children}</span>;
  return (
    <Link
      href={href}
      onClick={(e) => {
        if (!onNavigate) return;
        e.preventDefault();
        onNavigate(href);
      }}
      className={`-mx-1.5 rounded-md px-1.5 py-0.5 transition-colors hover:bg-white/15 hover:text-white focus-visible:bg-white/15 focus-visible:outline-none ${className}`}
    >
      {children}
    </Link>
  );
}

/** Banner đầu trang dùng chung cho trang khóa học, trang hoạt động / tài nguyên và trang soạn thảo */
export default function CourseHero({ eyebrow, title, stats = [], brandTag, status, actions, onNavigate }: CourseHeroProps) {
  const EyebrowIcon = eyebrow.icon ?? GraduationCap;
  return (
    <div className="relative overflow-hidden rounded-3xl border border-blue-400/25 bg-slate-900 p-6 text-white shadow-xl sm:p-8 lg:p-9">
      <div
        className="absolute inset-0 bg-cover bg-center opacity-90"
        style={{ backgroundImage: `url('/images/course-banner-bg.jpg')` }}
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-slate-950/92 via-blue-950/80 to-blue-900/45" />
      <div className="pointer-events-none absolute right-0 top-0 h-full w-1/2 bg-[radial-gradient(ellipse_at_top_right,rgba(56,189,248,0.22),transparent_70%)]" />

      <div className="relative z-10 flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
        <div className="min-w-0 max-w-4xl space-y-3.5">
          <div className="flex flex-wrap items-center gap-2 text-[13px] font-medium text-sky-200/90">
            <EyebrowIcon className="h-4 w-4 shrink-0 text-sky-300" />
            <Crumb href={eyebrow.primaryHref} onNavigate={onNavigate} className="font-bold tracking-wide text-white">
              {eyebrow.primary}
            </Crumb>
            {eyebrow.secondary && (
              <>
                <span className="text-white/40">•</span>
                <Crumb href={eyebrow.secondaryHref} onNavigate={onNavigate} className={eyebrow.secondaryMono ? "font-mono text-sky-200" : "text-sky-200"}>
                  {eyebrow.secondary}
                </Crumb>
              </>
            )}
          </div>

          <h1 className="text-2xl font-black leading-tight tracking-tight text-white drop-shadow-md sm:text-3xl lg:text-4xl">
            {title}
          </h1>

          {stats.length > 0 && (
            <div className="flex flex-wrap items-center gap-x-3.5 gap-y-2 pt-1 text-[13.5px] font-medium text-blue-100">
              {stats.map((s, i) => {
                const Icon = s.icon;
                return (
                  <div key={i} className="flex items-center gap-3.5">
                    {i > 0 && <span className="text-white/30">•</span>}
                    <div className={`flex items-center gap-2 ${s.highlight ? "font-semibold text-emerald-300" : ""}`}>
                      {Icon ? (
                        <Icon className="h-4 w-4" />
                      ) : (
                        <span className={`h-2.5 w-2.5 rounded-full shadow-sm ${DOT_CLASS[s.dot ?? "sky"]}`} />
                      )}
                      <span>{s.label}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {actions && <div className="flex flex-wrap items-center gap-2.5 pt-2">{actions}</div>}
        </div>

        <div className="hidden shrink-0 flex-row items-start justify-between gap-3 sm:flex lg:flex-col lg:items-end">
          <div className="flex items-center gap-2.5 opacity-90">
            <Image
              src="/images/logo.webp"
              alt="EduHub Logo"
              width={110}
              height={30}
              className="h-6.5 w-auto object-contain brightness-0 invert drop-shadow-sm"
              priority
            />
            <span className="border-l border-white/25 pl-2.5 text-[11px] font-bold uppercase tracking-wider text-sky-200/80">
              {brandTag}
            </span>
          </div>
          {status && (
            <div className="text-right">
              <p className="text-[11px] font-medium text-sky-200/75">{status.caption}</p>
              <div className="mt-0.5 flex items-center justify-end gap-1.5 text-[13px] font-bold text-white">
                <span className={`h-2 w-2 rounded-full shadow-sm ${STATUS_DOT[status.tone]}`} />
                <span>{status.label}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/** Nút đặt trên nền banner tối */
export function HeroButton({
  children,
  onClick,
  href,
  variant = "glass",
  disabled,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  href?: string;
  variant?: "glass" | "solid" | "success";
  disabled?: boolean;
}) {
  const cls = `inline-flex items-center gap-2 rounded-xl px-4 py-2 text-[13.5px] font-semibold transition disabled:opacity-60 ${
    variant === "solid"
      ? "bg-white text-[#0f3c78] shadow-md hover:bg-blue-50"
      : variant === "success"
        ? "border border-emerald-300/50 bg-emerald-400/20 text-emerald-100 hover:bg-emerald-400/30"
        : "border border-white/25 bg-white/10 text-white backdrop-blur-md hover:bg-white/20"
  }`;
  if (href) {
    return (
      <Link href={href} className={cls}>
        {children}
      </Link>
    );
  }
  return (
    <button type="button" onClick={onClick} disabled={disabled} className={cls}>
      {children}
    </button>
  );
}
