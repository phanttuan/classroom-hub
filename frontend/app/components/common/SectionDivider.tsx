"use client";

interface SectionDividerProps {
  className?: string;
}

// Port từ DUDI SectionDivider — custom tone xanh dương cho EduHub (#EFF6FF bg, blue-600 accent).
// Ký hiệu ngăn cách: 2 đường line mờ dần + hình thoi (diamond) ở giữa.
export default function SectionDivider({ className = "" }: SectionDividerProps) {
  return (
    <div
      className={`w-full h-4 flex items-center justify-center max-w-[280px] sm:max-w-[340px] mx-auto px-4 pointer-events-none select-none opacity-85 bg-[#EFF6FF] ${className}`}
      aria-hidden="true"
    >
      {/* Left fading line */}
      <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent via-[#93C5FD]/40 to-[#2563EB]/75" />

      {/* Center Diamond / Rhombus (SVG vector ensures complete top & bottom tips with 0 clipping) */}
      <svg
        viewBox="0 0 10 10"
        className="w-2 h-2 sm:w-2.5 sm:h-2.5 mx-2.5 sm:mx-3 shrink-0 fill-[#2563EB]"
      >
        <polygon points="5,0.8 9.2,5 5,9.2 0.8,5" />
      </svg>

      {/* Right fading line */}
      <div className="h-[1px] flex-1 bg-gradient-to-l from-transparent via-[#93C5FD]/40 to-[#2563EB]/75" />
    </div>
  );
}
