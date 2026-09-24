"use client";

import React from "react";
import {
  Presentation,
  FileText,
  ClipboardList,
  UploadCloud,
  CheckSquare,
  BarChart3,
  CalendarDays,
} from "lucide-react";
import ScrollReveal from "../common/ScrollReveal";

interface WorkflowStep {
  step: string;
  title: string;
  desc: string;
  icon: React.ReactNode;
  color: string;
  numColor: string;
  shadowColor: string;
  xPercent: number;
  yPx: number;
}

const steps: WorkflowStep[] = [
  {
    step: "01",
    title: "Tạo lớp học",
    desc: "Khởi tạo và quản lý lớp học",
    icon: <Presentation className="w-5 h-5 sm:w-6 sm:h-6 text-white" />,
    color: "bg-blue-600",
    numColor: "text-blue-600",
    shadowColor: "shadow-blue-500/25",
    xPercent: 5.83, // 70 / 1200
    yPx: 110,
  },
  {
    step: "02",
    title: "Xây dựng nội dung",
    desc: "Tạo bài giảng, tài liệu",
    icon: <FileText className="w-5 h-5 sm:w-6 sm:h-6 text-white" />,
    color: "bg-emerald-500",
    numColor: "text-emerald-500",
    shadowColor: "shadow-emerald-500/25",
    xPercent: 20.58, // 247 / 1200
    yPx: 55,
  },
  {
    step: "03",
    title: "Giao bài / Quiz",
    desc: "Tạo bài tập và kiểm tra",
    icon: <ClipboardList className="w-5 h-5 sm:w-6 sm:h-6 text-white" />,
    color: "bg-amber-500",
    numColor: "text-amber-500",
    shadowColor: "shadow-amber-500/25",
    xPercent: 35.25, // 423 / 1200
    yPx: 115,
  },
  {
    step: "04",
    title: "Nộp bài / Làm bài",
    desc: "Học sinh tham gia và nộp bài",
    icon: <UploadCloud className="w-5 h-5 sm:w-6 sm:h-6 text-white" />,
    color: "bg-purple-600",
    numColor: "text-purple-600",
    shadowColor: "shadow-purple-500/25",
    xPercent: 50.0, // 600 / 1200 (Đỉnh cao chính giữa)
    yPx: 50,
  },
  {
    step: "05",
    title: "Chấm điểm",
    desc: "Thủ công hoặc tự động",
    icon: <CheckSquare className="w-5 h-5 sm:w-6 sm:h-6 text-white" />,
    color: "bg-rose-500",
    numColor: "text-rose-500",
    shadowColor: "shadow-rose-500/25",
    xPercent: 64.75, // 777 / 1200
    yPx: 115,
  },
  {
    step: "06",
    title: "Bảng điểm",
    desc: "Tổng hợp và theo dõi kết quả",
    icon: <BarChart3 className="w-5 h-5 sm:w-6 sm:h-6 text-white" />,
    color: "bg-sky-500",
    numColor: "text-sky-500",
    shadowColor: "shadow-sky-500/25",
    xPercent: 79.42, // 953 / 1200
    yPx: 55,
  },
  {
    step: "07",
    title: "Thông báo & Lịch",
    desc: "Cập nhật deadline và sự kiện",
    icon: <CalendarDays className="w-5 h-5 sm:w-6 sm:h-6 text-white" />,
    color: "bg-teal-500",
    numColor: "text-teal-500",
    shadowColor: "shadow-teal-500/25",
    xPercent: 94.17, // 1130 / 1200
    yPx: 110,
  },
];

export default function WorkflowSection() {
  return (
    <section
      id="how-it-works"
      className="scroll-mt-16 sm:scroll-mt-20 lg:scroll-mt-24 py-10 sm:py-12 lg:py-14 bg-[#EFF6FF] relative overflow-hidden"
    >
      {/* Container chuẩn max-w-[1320px] đồng bộ 100% với ProblemSection */}
      <div className="max-w-[1320px] mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Header cân đối, khoảng cách vừa phải không bị trống */}
        <div className="text-center max-w-3xl mx-auto mb-6 sm:mb-8">
          <ScrollReveal variant="fade-up" delay={60} duration={800}>
            <h2 className="text-3xl sm:text-4xl lg:text-[40px] font-extrabold text-[#0B132B] tracking-tight leading-tight">
              Từ lớp học đến kết quả,{" "}
              <span className="text-blue-600">tất cả liền mạch</span>
            </h2>
          </ScrollReveal>

          <ScrollReveal variant="fade-up" delay={160} duration={800}>
            <p className="mt-2.5 text-base sm:text-lg text-slate-600">
              Một quy trình hoàn chỉnh, kết nối tất cả các hoạt động dạy và học.
            </p>
          </ScrollReveal>
        </div>

        {/* 7-Step Stepper with Organic Balanced Flow Curve */}
        <div className="overflow-x-auto lg:overflow-visible pt-1 scrollbar-none">
          <div className="min-w-[1040px] lg:min-w-0 relative h-[250px]">
            {/* SVG Connecting Flow Curve & Decorative Dots */}
            <svg
              className="absolute inset-0 w-full h-full pointer-events-none"
              viewBox="0 0 1200 250"
              preserveAspectRatio="none"
              fill="none"
            >
              <defs>
                <linearGradient
                  id="workflowWaveGradient"
                  x1="0%"
                  y1="0%"
                  x2="100%"
                  y2="0%"
                >
                  <stop offset="5.83%" stopColor="#2563EB" />
                  <stop offset="20.58%" stopColor="#10B981" />
                  <stop offset="35.25%" stopColor="#F59E0B" />
                  <stop offset="50.00%" stopColor="#8B5CF6" />
                  <stop offset="64.75%" stopColor="#F43F5E" />
                  <stop offset="79.42%" stopColor="#0EA5E9" />
                  <stop offset="94.17%" stopColor="#10B981" />
                </linearGradient>
              </defs>

              {/* Main Winding Wave Path: Uốn lượn nhấp nhô lượn sóng rõ nét, dốc cong mềm mại */}
              <path
                d="M 30,115 C 45,115 55,110 70,110 C 150,110 167,55 247,55 C 327,55 343,115 423,115 C 503,115 520,50 600,50 C 680,50 697,115 777,115 C 857,115 873,55 953,55 C 1033,55 1050,110 1130,110 C 1145,110 1155,115 1170,115"
                stroke="url(#workflowWaveGradient)"
                strokeWidth="2.5"
                strokeLinecap="round"
              />

              {/* Decorative Colorful Dots Along the Curve */}
              {/* Between Step 1 & 2 */}
              <circle cx="158" cy="82" r="3.5" fill="#3B82F6" opacity="0.8" />
              {/* Between Step 2 & 3 */}
              <circle cx="335" cy="85" r="3.5" fill="#10B981" opacity="0.8" />
              {/* Between Step 3 & 4 */}
              <circle cx="511" cy="82" r="3.5" fill="#F59E0B" opacity="0.8" />
              {/* Between Step 4 & 5 */}
              <circle cx="688" cy="82" r="3.5" fill="#8B5CF6" opacity="0.8" />
              {/* Between Step 5 & 6 */}
              <circle cx="865" cy="85" r="3.5" fill="#F43F5E" opacity="0.8" />
              {/* Between Step 6 & 7 */}
              <circle cx="1042" cy="82" r="3.5" fill="#0EA5E9" opacity="0.8" />
            </svg>

            {/* The 7 Interactive Step Nodes */}
            {steps.map((item, idx) => (
              <div
                key={item.step}
                className="absolute z-10 -translate-x-1/2 flex flex-col items-center text-center group cursor-default"
                style={{
                  left: `${item.xPercent}%`,
                  top: `${item.yPx - 26}px`,
                }}
              >
                <ScrollReveal
                  variant="zoom-in"
                  delay={80 + idx * 80}
                  duration={600}
                >
                  <div className="flex flex-col items-center">
                    {/* Circle Node on the Wave */}
                    <div
                      className={`w-13 h-13 sm:w-14 sm:h-14 rounded-full ${item.color} ${item.shadowColor} shadow-md ring-4 ring-[#EFF6FF] flex items-center justify-center transition-transform duration-300 group-hover:scale-110 mb-2`}
                    >
                      {item.icon}
                    </div>

                    {/* Step Number */}
                    <span
                      className={`text-xs sm:text-sm font-extrabold font-mono tracking-wider ${item.numColor}`}
                    >
                      {item.step}
                    </span>

                    {/* Step Title */}
                    <h4 className="text-xs sm:text-[13px] font-bold text-slate-900 mt-0.5 whitespace-nowrap group-hover:text-blue-600 transition-colors">
                      {item.title}
                    </h4>

                    {/* Step Description */}
                    <p className="mt-0.5 text-[11px] sm:text-xs text-slate-500 leading-snug max-w-[135px] mx-auto">
                      {item.desc}
                    </p>
                  </div>
                </ScrollReveal>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}


