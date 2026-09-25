"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  Users,
  BookOpen,
  FileCheck2,
  HelpCircle,
  BarChart3,
  BellRing,
  Calendar,
} from "lucide-react";
import ScrollReveal from "../common/ScrollReveal";

interface RadarFeature {
  id: string;
  name: string;
  desc: React.ReactNode;
  icon: React.ReactNode;
  sliceColor: string;
  badgeColor: string;
  badgeShadow: string;
  labelPosClass: string;
  alignClass: string;
}

const radarFeatures: RadarFeature[] = [
  {
    id: "class",
    name: "Quản lý lớp học",
    desc: (
      <>
        Tạo và vận hành lớp học
        <br />
        dễ dàng
      </>
    ),
    icon: <Users className="w-4.5 h-4.5 text-white" />,
    sliceColor: "#E0F7F6", // Pastel teal
    badgeColor: "#00B4B4",
    badgeShadow: "shadow-teal-500/25",
    labelPosClass: "bottom-[99%] left-1/2 -translate-x-1/2 w-48 mb-2.5",
    alignClass: "text-center",
  },
  {
    id: "content",
    name: "Nội dung học tập",
    desc: (
      <>
        Tổ chức bài giảng,
        <br />
        tài liệu theo cấu trúc rõ ràng
      </>
    ),
    icon: <BookOpen className="w-4.5 h-4.5 text-white" />,
    sliceColor: "#E6F9EE", // Pastel mint
    badgeColor: "#10B981",
    badgeShadow: "shadow-emerald-500/25",
    // Each label follows the wheel's outer edge with a consistent clear space.
    labelPosClass: "top-[20%] -translate-y-1/2 left-[87%] w-48 sm:w-52",
    alignClass: "text-center",
  },
  {
    id: "assignment",
    name: "Bài tập",
    desc: (
      <>
        Giao bài, nhận bài
        <br />
        và chấm điểm
      </>
    ),
    icon: <FileCheck2 className="w-4.5 h-4.5 text-white" />,
    sliceColor: "#FFF4DE", // Pastel amber
    badgeColor: "#F59E0B",
    badgeShadow: "shadow-amber-500/25",
    labelPosClass: "top-[61%] -translate-y-1/2 left-[86%] w-44 sm:w-48",
    alignClass: "text-center",
  },
  {
    id: "quiz",
    name: "Quiz",
    desc: (
      <>
        Ngân hàng câu hỏi,
        <br />
        tổ chức và tự động chấm điểm
      </>
    ),
    icon: <HelpCircle className="w-4.5 h-4.5 text-white" />,
    sliceColor: "#EFE9FC", // Pastel lavender
    badgeColor: "#8B5CF6",
    badgeShadow: "shadow-purple-500/25",
    labelPosClass: "top-[98%] left-[79%] -translate-x-1/2 w-48 sm:w-52",
    alignClass: "text-center",
  },
  {
    id: "gradebook",
    name: "Bảng điểm",
    desc: (
      <>
        Theo dõi kết quả
        <br />
        học tập
      </>
    ),
    icon: <BarChart3 className="w-4.5 h-4.5 text-white" />,
    sliceColor: "#FFE9EE", // Pastel rose
    badgeColor: "#F43F5E",
    badgeShadow: "shadow-rose-500/25",
    labelPosClass: "top-[98%] left-[18%] -translate-x-1/2 w-44 sm:w-48",
    alignClass: "text-center",
  },
  {
    id: "notification",
    name: "Thông báo",
    desc: (
      <>
        Nhận thông báo
        <br />
        thời gian thực
      </>
    ),
    icon: <BellRing className="w-4.5 h-4.5 text-white" />,
    sliceColor: "#E5F2FF", // Pastel soft blue
    badgeColor: "#3B82F6",
    badgeShadow: "shadow-blue-500/25",
    labelPosClass: "top-[61%] -translate-y-1/2 right-[88%] w-44 sm:w-48",
    alignClass: "text-center",
  },
  {
    id: "calendar",
    name: "Lịch",
    desc: (
      <>
        Quản lý deadline
        <br />
        và sự kiện
      </>
    ),
    icon: <Calendar className="w-4.5 h-4.5 text-white" />,
    sliceColor: "#E0F2FE", // Pastel sky
    badgeColor: "#0EA5E9",
    badgeShadow: "shadow-sky-500/25",
    labelPosClass: "top-[18%] -translate-y-1/2 right-[80%] w-44 sm:w-48",
    alignClass: "text-center",
  },
];

// Helper to calculate SVG donut slice path with fixed precision to avoid SSR hydration mismatch
function getDonutSlicePath(
  cx: number,
  cy: number,
  rInner: number,
  rOuter: number,
  startAngleDeg: number,
  endAngleDeg: number
) {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const a1 = toRad(startAngleDeg);
  const a2 = toRad(endAngleDeg);

  const round = (val: number) => Math.round(val * 100) / 100;

  const x1 = round(cx + rOuter * Math.cos(a1));
  const y1 = round(cy + rOuter * Math.sin(a1));
  const x2 = round(cx + rOuter * Math.cos(a2));
  const y2 = round(cy + rOuter * Math.sin(a2));

  const x3 = round(cx + rInner * Math.cos(a2));
  const y3 = round(cy + rInner * Math.sin(a2));
  const x4 = round(cx + rInner * Math.cos(a1));
  const y4 = round(cy + rInner * Math.sin(a1));

  return `M ${x1} ${y1} A ${rOuter} ${rOuter} 0 0 1 ${x2} ${y2} L ${x3} ${y3} A ${rInner} ${rInner} 0 0 0 ${x4} ${y4} Z`;
}

export default function FeaturesRadarSection() {
  const [hoveredFeature, setHoveredFeature] = useState<string | null>(null);
  const [isLogoHovered, setIsLogoHovered] = useState(false);

  const total = radarFeatures.length;
  const anglePerSlice = 360 / total;

  return (
    <section
      id="features"
      className="scroll-mt-16 sm:scroll-mt-20 lg:scroll-mt-24 py-10 sm:py-12 lg:py-14 bg-[#EFF6FF] relative overflow-hidden"
    >
      {/* Container chuẩn max-w-[1320px] đồng bộ 100% với ProblemSection */}
      <div className="max-w-[1320px] mx-auto px-4 sm:px-6 lg:px-8 relative z-10 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center">
          {/* Left Column: Heading, Subtitle, CTA and Handwriting Doodle */}
          <div className="lg:col-span-5 flex flex-col space-y-5 max-w-[480px]">
            {/* Title đồng bộ với ProblemSection & WorkflowSection, kèm hiệu ứng nhá xanh khi lia vào logo */}
            <ScrollReveal variant="fade-up" delay={80} duration={800}>
              <h2
                className={`text-3xl sm:text-4xl lg:text-[40px] font-extrabold tracking-tight leading-[1.18] transition-all duration-300 ${
                  isLogoHovered ? "scale-[1.015]" : ""
                }`}
              >
                <span
                  className={`transition-colors duration-300 ${
                    isLogoHovered ? "text-blue-600" : "text-[#0B132B]"
                  }`}
                >
                  Được thiết kế cho
                </span>{" "}
                <br />
                <span
                  className={`transition-all duration-300 ${
                    isLogoHovered
                      ? "text-blue-500 drop-shadow-[0_2px_14px_rgba(37,99,235,0.35)]"
                      : "text-blue-600"
                  }`}
                >
                  trải nghiệm dạy và học hiện đại
                </span>
              </h2>
            </ScrollReveal>

            {/* Description */}
            <ScrollReveal variant="fade-up" delay={180} duration={800}>
              <p className="text-slate-600 text-[15px] sm:text-base leading-relaxed">
                Những tính năng cốt lõi giúp giáo viên dễ dàng tổ chức dạy học và
                học sinh học tập hiệu quả hơn.
              </p>
            </ScrollReveal>

            {/* Action Button */}
            <ScrollReveal variant="fade-up" delay={280} duration={800}>
              <div>
                <Link
                  href="#roles"
                  className="inline-flex items-center gap-2.5 px-6 py-2.5 sm:py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-[15px] shadow-md shadow-blue-500/20 transition-all hover:translate-y-[-1px] group"
                >
                  <span>Khám phá tất cả tính năng</span>
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </Link>
              </div>
            </ScrollReveal>

            {/* Handwriting Annotation with Curved Doodle Arrow pointing to wheel */}
            <ScrollReveal variant="fade-up" delay={380} duration={800}>
              <div className="pt-1 select-none pointer-events-none">
                <div className="inline-flex items-center gap-2 -rotate-[5deg]">
                  <p className="font-handwriting font-bold text-blue-600 text-lg sm:text-[20px] leading-tight tracking-wide whitespace-nowrap drop-shadow-xs">
                    Mọi thứ bạn cần,
                    <br />
                    trong tầm tay!
                  </p>
                  {/* Curved hand-drawn arrow */}
                  <svg
                    className="w-9 h-9 text-blue-500 -mt-1.5 ml-1"
                    viewBox="0 0 40 40"
                    fill="none"
                  >
                    <path
                      d="M 5,28 C 14,28 22,24 28,15 C 31,10 33,5 34,2"
                      stroke="#2563EB"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                    <path
                      d="M 27,2 L 34,2 L 34,9"
                      stroke="#2563EB"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
              </div>
            </ScrollReveal>
          </div>

          {/* Right Column: Segmented Circular Wheel with outer labels */}
          <div className="lg:col-span-7 flex justify-center items-center pt-14 pb-14 overflow-visible">
            {/* Desktop & Tablet Interactive Wheel */}
            <div className="relative w-[320px] h-[320px] sm:w-[340px] sm:h-[340px] flex items-center justify-center scale-[0.85] sm:scale-100 origin-center transition-transform">
              {/* Circular Donut Slices SVG */}
              <svg
                viewBox="0 0 340 340"
                className="w-full h-full drop-shadow-md"
                suppressHydrationWarning
              >
                {radarFeatures.map((item, idx) => {
                  const centerAngle = -90 + idx * anglePerSlice;
                  const startAngle = centerAngle - anglePerSlice / 2;
                  const endAngle = centerAngle + anglePerSlice / 2;
                  const path = getDonutSlicePath(
                    170,
                    170,
                    88,
                    162,
                    startAngle,
                    endAngle
                  );
                  const isHovered = hoveredFeature === item.id;

                  return (
                    <path
                      key={item.id}
                      d={path}
                      fill={item.sliceColor}
                      stroke="#FFFFFF"
                      strokeWidth="3"
                      className="transition-all duration-200 cursor-pointer"
                      onMouseEnter={() => setHoveredFeature(item.id)}
                      onMouseLeave={() => setHoveredFeature(null)}
                      style={{
                        filter: isHovered ? "brightness(0.95)" : "none",
                      }}
                    />
                  );
                })}

                {/* Inner Concentric Rings */}
                <circle
                  cx="170"
                  cy="170"
                  r="85"
                  fill="#F8FAFC"
                  stroke="#FFFFFF"
                  strokeWidth="2"
                />
                <circle
                  cx="170"
                  cy="170"
                  r="68"
                  fill="#FFFFFF"
                  className="filter drop-shadow-xs"
                />
              </svg>

              {/* Center Hub: Chuẩn logo hệ thống EduHub giống trên Header, lia vào logo thì tiêu đề nhá xanh */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30">
                <div
                  onMouseEnter={() => setIsLogoHovered(true)}
                  onMouseLeave={() => setIsLogoHovered(false)}
                  className={`pointer-events-auto cursor-pointer flex items-center justify-center px-3.5 py-1.5 rounded-full transition-all duration-300 ${
                    isLogoHovered
                      ? "scale-110 shadow-lg shadow-blue-500/25 bg-blue-50/80 ring-2 ring-blue-500/35"
                      : "hover:scale-105"
                  }`}
                  title="EduHub"
                >
                  <Image
                    src="/images/logo.webp"
                    alt="EduHub"
                    width={110}
                    height={34}
                    priority
                    className="h-7 sm:h-7.5 w-auto object-contain drop-shadow-xs"
                  />
                </div>
              </div>

              {/* The 7 Feature Badges (Positioned in the middle of each wedge) */}
              {radarFeatures.map((item, idx) => {
                const centerAngle = -90 + idx * anglePerSlice;
                const rad = (centerAngle * Math.PI) / 180;
                const bx = Math.round((170 + 125 * Math.cos(rad)) * 100) / 100;
                const by = Math.round((170 + 125 * Math.sin(rad)) * 100) / 100;

                const isHovered = hoveredFeature === item.id;

                return (
                  <button
                    key={item.id}
                    onMouseEnter={() => setHoveredFeature(item.id)}
                    onMouseLeave={() => setHoveredFeature(null)}
                    style={{
                      left: `${(bx / 340) * 100}%`,
                      top: `${(by / 340) * 100}%`,
                      transform: "translate(-50%, -50%)",
                      backgroundColor: item.badgeColor,
                    }}
                    className={`absolute z-20 w-9 h-9 sm:w-9.5 sm:h-9.5 rounded-[12px] flex items-center justify-center text-white shadow-md ${item.badgeShadow} transition-all duration-200 cursor-pointer ${
                      isHovered ? "scale-110 shadow-lg ring-2 ring-white" : ""
                    }`}
                    title={item.name}
                  >
                    {item.icon}
                  </button>
                );
              })}

              {/* Surrounding Labels (7 Feature Title & Descriptions exactly placed) */}
              {radarFeatures.map((item) => {
                const isHovered = hoveredFeature === item.id;

                return (
                  <div
                    key={item.id}
                    className={`absolute z-20 flex min-h-[48px] flex-col justify-center ${item.labelPosClass} ${item.alignClass} transition-all duration-200 cursor-pointer group`}
                    onMouseEnter={() => setHoveredFeature(item.id)}
                    onMouseLeave={() => setHoveredFeature(null)}
                  >
                    <h4
                      className="text-xs sm:text-sm font-bold leading-tight transition-colors duration-200"
                      style={{
                        color: isHovered ? item.badgeColor : "#0F172A",
                      }}
                    >
                      {item.name}
                    </h4>
                    <p
                      className={`text-[11px] sm:text-xs mt-0.5 leading-snug transition-colors duration-200 ${
                        isHovered ? "text-slate-800 font-medium" : "text-slate-500"
                      }`}
                    >
                      {item.desc}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
