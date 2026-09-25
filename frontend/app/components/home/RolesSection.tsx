"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  GraduationCap,
  BookOpenCheck,
  CheckCircle2,
  ArrowRight,
  ChevronRight,
} from "lucide-react";
import ScrollReveal from "../common/ScrollReveal";

type RoleKey = "teacher" | "student";

interface RoleContent {
  title: string;
  badge: string;
  checkpoints: string[];
  buttonText: string;
  buttonHref: string;
  imageSrc: string;
}

const roleData: Record<RoleKey, RoleContent> = {
  teacher: {
    title: "Dành cho giáo viên, quản lý dễ dàng hơn",
    badge: "Dành cho giáo viên",
    checkpoints: [
      "Tạo và quản lý lớp học linh hoạt với mã Class Code",
      "Xây dựng cấu trúc bài giảng và tài liệu khóa học",
      "Giao bài tập đa dạng, tổ chức Quiz tự động chấm",
      "Chấm điểm trực quan, quản lý sổ điểm tập trung",
      "Theo dõi tiến độ và mức độ chuyên cần của học sinh",
    ],
    buttonText: "Khám phá cho Giáo viên",
    buttonHref: "/register?role=teacher",
    imageSrc: "/images/teacher.webp",
  },
  student: {
    title: "Dành cho học sinh, chủ động học tập hiệu quả",
    badge: "Dành cho học sinh",
    checkpoints: [
      "Gia nhập lớp học nhanh chóng chỉ với một mã code",
      "Truy cập bài giảng và tải tài liệu học tập mọi lúc",
      "Nộp bài tập trực tuyến, làm Quiz nhận điểm tức thì",
      "Theo dõi điểm số cá nhân và nhận xét từ thầy cô",
      "Nhận thông báo bài học mới và lịch thi đúng hạn",
    ],
    buttonText: "Bắt đầu học ngay",
    buttonHref: "/register?role=student",
    imageSrc: "/images/student.webp",
  },
};

export default function RolesSection() {
  const [activeRole, setActiveRole] = useState<RoleKey>("teacher");

  const current = roleData[activeRole];

  return (
    <section
      id="roles"
      className="scroll-mt-16 sm:scroll-mt-20 lg:scroll-mt-24 pt-10 sm:pt-12 lg:pt-14 pb-16 sm:pb-20 lg:pb-24 bg-[#EFF6FF] relative overflow-hidden"
    >
      <div className="max-w-[1320px] mx-auto px-4 sm:px-6 lg:px-8">
        {/* Top Header: Dòng chữ kiểu nằm ngang giữa 2 dòng tiêu đề */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-12 sm:mb-14 gap-4">
          <ScrollReveal variant="fade-up" delay={60} duration={800}>
            <h2 className="text-3xl sm:text-4xl lg:text-[40px] font-extrabold text-[#0B132B] tracking-tight leading-[1.18]">
              Cùng nhau tạo nên <br className="hidden sm:inline" />
              <span className="text-blue-600">một môi trường học tập tốt hơn</span>
            </h2>
          </ScrollReveal>

          <ScrollReveal variant="fade-up" delay={160} duration={800}>
            <div className="select-none">
              <p className="font-handwriting font-bold text-blue-600 text-lg sm:text-xl lg:text-[22px] tracking-wide leading-tight -rotate-[2deg]">
                Giáo viên truyền cảm hứng · Học sinh kiến tạo tương lai
              </p>
            </div>
          </ScrollReveal>
        </div>

        {/* Roles Layout: 3 Parts trải rộng vừa vặn toàn bộ container max-w-[1320px] */}
        <div className="flex flex-col lg:flex-row items-center justify-between gap-6 lg:gap-6 xl:gap-8">
          {/* Column 1: Role Switcher Tabs - Kích thước gọn gàng, hiệu ứng chuyển đổi mượt mà */}
          <div className="w-full lg:w-[260px] xl:w-[275px] shrink-0 flex flex-col gap-3.5">
            <ScrollReveal variant="slide-left" delay={80} duration={800}>
              <button
                onClick={() => setActiveRole("teacher")}
                className={`w-full flex items-center justify-between p-4 sm:p-4.5 rounded-2xl text-left transition-all duration-400 cursor-pointer ${
                  activeRole === "teacher"
                    ? "bg-blue-600 text-white shadow-lg shadow-blue-500/25 ring-2 ring-blue-600 scale-[1.02]"
                    : "bg-white text-slate-700 hover:bg-slate-50 border border-slate-200/80 shadow-xs hover:border-blue-300 hover:translate-x-1.5"
                }`}
              >
                <div className="flex items-center gap-3.5">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all duration-400 ${
                      activeRole === "teacher"
                        ? "bg-white/20 text-white scale-105"
                        : "bg-blue-50 text-blue-600 shadow-2xs"
                    }`}
                  >
                    <GraduationCap className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-[15px] leading-tight">
                      Dành cho giáo viên
                    </h3>
                    <p
                      className={`text-xs mt-0.5 transition-colors duration-400 ${
                        activeRole === "teacher" ? "text-blue-100" : "text-slate-500"
                      }`}
                    >
                      Quản lý & giảng dạy
                    </p>
                  </div>
                </div>
                {/* Active indicator icon */}
                <ChevronRight
                  className={`w-4.5 h-4.5 shrink-0 transition-all duration-400 ${
                    activeRole === "teacher"
                      ? "text-white opacity-100 translate-x-0"
                      : "text-slate-400 opacity-0 -translate-x-1.5"
                  }`}
                />
              </button>
            </ScrollReveal>

            <ScrollReveal variant="slide-left" delay={160} duration={800}>
              <button
                onClick={() => setActiveRole("student")}
                className={`w-full flex items-center justify-between p-4 sm:p-4.5 rounded-2xl text-left transition-all duration-400 cursor-pointer ${
                  activeRole === "student"
                    ? "bg-blue-600 text-white shadow-lg shadow-blue-500/25 ring-2 ring-blue-600 scale-[1.02]"
                    : "bg-white text-slate-700 hover:bg-slate-50 border border-slate-200/80 shadow-xs hover:border-blue-300 hover:translate-x-1.5"
                }`}
              >
                <div className="flex items-center gap-3.5">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all duration-400 ${
                      activeRole === "student"
                        ? "bg-white/20 text-white scale-105"
                        : "bg-emerald-50 text-emerald-600 shadow-2xs"
                    }`}
                  >
                    <BookOpenCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-[15px] leading-tight">
                      Dành cho học sinh
                    </h3>
                    <p
                      className={`text-xs mt-0.5 transition-colors duration-400 ${
                        activeRole === "student" ? "text-blue-100" : "text-slate-500"
                      }`}
                    >
                      Chủ động học tập
                    </p>
                  </div>
                </div>
                {/* Active indicator icon */}
                <ChevronRight
                  className={`w-4.5 h-4.5 shrink-0 transition-all duration-400 ${
                    activeRole === "student"
                      ? "text-white opacity-100 translate-x-0"
                      : "text-slate-400 opacity-0 -translate-x-1.5"
                  }`}
                />
              </button>
            </ScrollReveal>
          </div>

          {/* Column 2: Role Detail Features Card - Căn giữa toàn bộ nội dung, khoảng cách gọn gàng vừa vặn */}
          <div className="w-full lg:w-[530px] xl:w-[560px] shrink-0">
            <ScrollReveal variant="fade-up" delay={200} duration={800} className="w-full">
              <div
                key={activeRole}
                className="animate-role-card flex flex-col items-center p-6 sm:py-7 sm:px-8 rounded-3xl bg-white border border-slate-200/80 shadow-xs w-full"
              >
                {/* Badge căn giữa */}
                <div className="flex justify-center mb-1.5">
                  <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">
                    {current.badge}
                  </span>
                </div>

                {/* Tiêu đề căn giữa, nằm gọn 1 hàng */}
                <h3 className="text-xl sm:text-[22px] font-bold text-slate-900 tracking-tight mb-2 text-center whitespace-nowrap">
                  {current.title}
                </h3>

                {/* Danh sách checklist căn giữa cân đối */}
                <div className="w-full flex justify-center my-4 sm:my-5">
                  <ul className="space-y-3 inline-flex flex-col">
                    {current.checkpoints.map((point, index) => (
                      <li
                        key={index}
                        className="flex items-center gap-2.5"
                        style={{
                          animation: `roleCardIn 0.5s cubic-bezier(0.16, 1, 0.3, 1) ${index * 65}ms both`,
                        }}
                      >
                        <CheckCircle2 className="w-4.5 h-4.5 text-emerald-500 shrink-0" />
                        <span className="text-[13.5px] sm:text-sm text-slate-700 leading-snug whitespace-nowrap">
                          {point}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Nút bấm căn giữa, khoảng cách vừa vặn với nội dung bên trên */}
                <div className="pt-2 sm:pt-2.5 flex justify-center">
                  <Link
                    href={current.buttonHref}
                    className="inline-flex items-center gap-2 px-7 py-2.5 sm:py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm shadow-md shadow-blue-500/20 transition-all hover:translate-y-[-1px] group"
                  >
                    <span>{current.buttonText}</span>
                    <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                  </Link>
                </div>
              </div>
            </ScrollReveal>
          </div>

          {/* Column 3: Role Illustration - Đẩy xích qua phải, căn phải mượt mà */}
          <div className="w-full lg:w-[340px] xl:w-[360px] shrink-0 flex items-center justify-center lg:justify-end">
            <ScrollReveal
              variant="slide-right"
              delay={260}
              duration={800}
              className="w-full flex items-center justify-center lg:justify-end"
            >
              <div
                key={activeRole}
                className="animate-role-image relative w-full max-w-[340px] sm:max-w-[360px] h-[360px] sm:h-[380px] flex items-center justify-center lg:justify-end"
              >
                {/* Soft ambient aura highlight */}
                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-[240px] h-[240px] sm:w-[280px] sm:h-[280px] bg-blue-400/20 rounded-full blur-3xl -z-10 pointer-events-none" />

                <Image
                  src={current.imageSrc}
                  alt={current.title}
                  fill
                  sizes="(max-width: 1024px) 100vw, 33vw"
                  priority
                  unoptimized
                  className="object-contain object-center lg:object-right drop-shadow-[0_20px_35px_rgba(0,0,0,0.14)] transition-transform duration-500 hover:scale-105 select-none"
                />
              </div>
            </ScrollReveal>
          </div>
        </div>
      </div>
    </section>
  );
}
