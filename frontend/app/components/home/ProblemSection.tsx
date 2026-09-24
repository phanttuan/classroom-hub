"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Check } from "lucide-react";
import ScrollReveal from "../common/ScrollReveal";

const BENEFITS = [
  "Tất cả trong một",
  "Kết nối liền mạch",
  "Dễ dàng quản lý",
  "Tập trung vào điều quan trọng",
];

export default function ProblemSection() {
  return (
    <section
      id="problem"
      className="scroll-mt-16 sm:scroll-mt-20 lg:scroll-mt-24 pt-16 sm:pt-20 lg:pt-24 pb-10 sm:pb-12 lg:pb-14 bg-[#EFF6FF] relative overflow-hidden"
    >
      {/* Container chuẩn max-w-[1320px] cân đối, mở rộng nhẹ nhàng */}
      <div className="max-w-[1320px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 xl:gap-12 items-center">
          {/* Cột trái: Tiêu đề, mô tả căn đều 2 bên (text-justify), nút Khám phá giải pháp */}
          <div className="lg:col-span-5 flex flex-col space-y-6 max-w-[460px]">
            {/* Title */}
            <ScrollReveal variant="fade-up" delay={120} duration={1000}>
              <h2 className="text-3xl sm:text-4xl lg:text-[44px] font-extrabold text-[#0B132B] tracking-tight leading-[1.16]">
                Dạy học không nên <br />
                <span className="text-blue-600">bị phân tán</span>
              </h2>
            </ScrollReveal>

            {/* Description: Căn đều 2 bên (text-justify), giới hạn độ rộng ngang chữ 'nên' của tiêu đề */}
            <ScrollReveal variant="fade-up" delay={240} duration={1000}>
              <p className="text-slate-600 text-[15px] sm:text-base leading-relaxed text-justify max-w-[395px]">
                Giáo viên và học sinh thường phải sử dụng nhiều công cụ khác
                nhau để quản lý lớp học, tài liệu, bài tập, điểm số và lịch
                học. Điều này gây tốn thời gian và dễ bỏ sót thông tin quan
                trọng.
              </p>
            </ScrollReveal>

            {/* Outlined Action Button theo chuẩn mẫu */}
            <ScrollReveal variant="fade-up" delay={360} duration={1000}>
              <div>
                <Link
                  href="#features"
                  className="inline-flex items-center gap-2.5 px-6 py-2.5 rounded-xl border border-blue-500 bg-white hover:bg-blue-50/70 text-blue-600 font-semibold text-[15px] shadow-xs transition-all hover:shadow-md group"
                >
                  <span>Khám phá giải pháp</span>
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </Link>
              </div>
            </ScrollReveal>
          </div>

          {/* Cột phải: Mạng lưới ứng dụng bố cục nhịp sóng đều tăm tắp + Card EduHub */}
          <div className="lg:col-span-7 flex justify-center lg:justify-end w-full">
            <ScrollReveal variant="zoom-in" delay={150} duration={1100} className="w-full flex justify-center lg:justify-end">
              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-end gap-5 sm:gap-6 pb-12 sm:pb-14">
                {/* 1. Mạng lưới các ứng dụng: Chiều cao đồng bộ với card, mũi tên nằm ngay giữa trọng tâm */}
                <div className="relative w-[410px] h-[245px] shrink-0">
                  {/* Chữ ghi chú viết tay bên trái: Xích lên cao thoáng đãng, không đè vào icon */}
                  <div className="absolute -top-4 sm:-top-5 left-22 sm:left-24 select-none pointer-events-none z-10">
                    <p className="font-handwriting font-bold text-blue-600 text-[19px] sm:text-[21px] leading-[1.18] -rotate-[4deg] tracking-wide whitespace-nowrap">
                      Quá nhiều công cụ
                      <br />
                      Quá nhiều rắc rối?
                    </p>
                  </div>

                  {/* SVG đường nối đứt nét: Đường sóng sin toán học mượt mà qua các tâm icon */}
                  <svg
                    className="absolute inset-0 w-full h-full pointer-events-none"
                    viewBox="0 0 410 245"
                    fill="none"
                  >
                    <path
                      d="M 34 78 C 54 78, 76 168, 96 168 C 116 168, 138 78, 158 78 C 178 78, 200 168, 220 168 C 240 168, 262 78, 282 78 C 302 78, 324 168, 344 168 C 364 168, 380 135, 392 122.5"
                      stroke="#93c5fa"
                      strokeWidth="2"
                      strokeDasharray="5 5"
                      strokeLinecap="round"
                    />
                  </svg>

                  {/* 1. Google Drive (Đỉnh 1: x = 10px, y = 54px) */}
                  <div className="absolute top-13.5 left-2.5 w-12 h-12 rounded-2xl bg-white border border-white shadow-md shadow-blue-900/6 flex items-center justify-center hover:scale-110 transition-transform">
                    <svg viewBox="0 0 87 75" className="w-7 h-7">
                      <path d="M29 0l-29 50.2 14.5 24.8 29-50.2L29 0z" fill="#0066DA" />
                      <path d="M58 0H29l29 50.2h29L58 0z" fill="#00AC47" />
                      <path d="M87 50.2H29l-14.5 24.8h58L87 50.2z" fill="#FFBA00" />
                    </svg>
                  </div>

                  {/* 2. Microsoft Excel (Đáy 1: x = 72px, y = 144px) */}
                  <div className="absolute top-36 left-18 w-12 h-12 rounded-2xl bg-white border border-white shadow-md shadow-blue-900/6 flex items-center justify-center hover:scale-110 transition-transform">
                    <svg viewBox="0 0 32 32" className="w-7.5 h-7.5">
                      <rect x="10" y="4" width="18" height="24" rx="2" fill="#107C41" />
                      <path d="M15 9h9v2h-9zm0 4h9v2h-9zm0 4h9v2h-9zm0 4h9v2h-9z" fill="#33C481" opacity="0.6" />
                      <path d="M19 8v16h1.5V8z" fill="#33C481" opacity="0.6" />
                      <rect x="4" y="6" width="15" height="20" rx="3" fill="#185A37" />
                      <path d="M8.2 21.5l2.4-4.5-2.2-4.5h2.3l1.1 2.6 1.1-2.6h2.2l-2.2 4.5 2.4 4.5h-2.3l-1.3-3-1.3 3H8.2z" fill="#ffffff" />
                    </svg>
                  </div>

                  {/* 3. Google Gmail (Đỉnh 2: x = 134px, y = 54px) */}
                  <div className="absolute top-13.5 left-33.5 w-12 h-12 rounded-2xl bg-white border border-white shadow-md shadow-blue-900/6 flex items-center justify-center hover:scale-110 transition-transform">
                    <svg viewBox="0 0 64 48" className="w-7 h-7">
                      <path d="M6 48h10V22L0 14.5v27.5C0 45.3 2.7 48 6 48z" fill="#4285F4" />
                      <path d="M58 48c3.3 0 6-2.7 6-6V14.5L48 22v26h10z" fill="#34A853" />
                      <path d="M48 6.5V22L32 10 16 22V6.5l14-10.5c1.2-.9 2.8-.9 4 0L48 6.5z" fill="#EA4335" />
                      <path d="M0 14.5L16 22V6.5L9.6 1.7C5.8-1.2 0 1.5 0 6.3v8.2z" fill="#FBBC04" />
                      <path d="M64 14.5L48 22V6.5l6.4-4.8c3.8-2.9 9.6-.2 9.6 4.6v8.2z" fill="#C5221F" />
                    </svg>
                  </div>

                  {/* 4. Google Meet (Đáy 2: x = 196px, y = 144px) */}
                  <div className="absolute top-36 left-49 w-12 h-12 rounded-2xl bg-white border border-white shadow-md shadow-blue-900/6 flex items-center justify-center hover:scale-110 transition-transform">
                    <svg viewBox="0 0 24 24" className="w-6.5 h-6.5">
                      <path fill="#00832d" d="M15 8v8l5 3.5V4.5L15 8z" />
                      <rect width="13" height="12" x="2" y="6" fill="#00ac47" rx="2.5" />
                      <path fill="#2684fc" d="M2 8.5C2 7.1 3.1 6 4.5 6H15v3H2V8.5z" />
                      <path fill="#ea4335" d="M2 15.5C2 16.9 3.1 18 4.5 18H15v-3H2v.5z" />
                      <path fill="#ffba00" d="M15 9.5l5-3.5v3l-5 3.5v-3z" />
                    </svg>
                  </div>

                  {/* 5. Zoom Meetings (Đỉnh 3: x = 258px, y = 54px) */}
                  <div className="absolute top-13.5 left-64.5 w-12 h-12 rounded-2xl bg-white border border-white shadow-md shadow-blue-900/6 flex items-center justify-center hover:scale-110 transition-transform">
                    <svg viewBox="0 0 48 48" className="w-7.5 h-7.5">
                      <rect width="48" height="48" rx="12" fill="#2D8CFF"/>
                      <path fill="#ffffff" d="M11 18.5c0-1.4 1.1-2.5 2.5-2.5h14c1.4 0 2.5 1.1 2.5 2.5v11c0 1.4-1.1 2.5-2.5 2.5h-14c-1.4 0-2.5-1.1-2.5-2.5v-11zm20 3.2l6.8-4.4c.7-.4 1.6.1 1.6.9v11.6c0 .8-.9 1.3-1.6.9L31 26.3v-4.6z"/>
                    </svg>
                  </div>

                  {/* 6. Google Calendar (Đáy 3: x = 320px, y = 144px) */}
                  <div className="absolute top-36 left-80 w-12 h-12 rounded-2xl bg-white border border-white shadow-md shadow-blue-900/6 flex items-center justify-center hover:scale-110 transition-transform">
                    <svg viewBox="0 0 48 48" className="w-7.5 h-7.5">
                      <rect x="4" y="6" width="40" height="36" rx="8" fill="#ffffff" stroke="#cbd5e1" strokeWidth="1.5" />
                      <path d="M4 14c0-4.4 3.6-8 8-8h24c4.4 0 8 3.6 8 8v4H4v-4z" fill="#1A73E8" />
                      <circle cx="15" cy="10" r="2" fill="#ffffff" />
                      <circle cx="33" cy="10" r="2" fill="#ffffff" />
                      <text x="24" y="35" textAnchor="middle" fontFamily="system-ui, sans-serif" fontSize="16" fontWeight="800" fill="#1A73E8">31</text>
                    </svg>
                  </div>

                  {/* Mũi tên dẫn hướng: Nằm ở chính giữa trọng tâm (y = 50%), trỏ thẳng vào đúng tâm giữa của ô EduHub bên phải */}
                  <div className="absolute top-1/2 -translate-y-1/2 right-1.5 w-7.5 h-7.5 rounded-full bg-blue-500 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
                    <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                  </div>
                </div>

                {/* 2. Card giải pháp EduHub & Chữ ghi chú viết tay dưới card */}
                <div className="relative shrink-0 w-[260px] sm:w-[270px]">
                  {/* Card EduHub trắng sang trọng nổi bật trên nền xanh nhạt */}
                  <div className="w-full rounded-[22px] bg-white border border-blue-100 shadow-[0_12px_36px_rgba(37,99,235,0.08)] p-5.5 transition-all hover:shadow-[0_16px_42px_rgba(37,99,235,0.12)]">
                    {/* Header EduHub: Chuẩn logo hệ thống */}
                    <div className="flex items-center pb-3 mb-3.5 border-b border-slate-100">
                      <Image
                        src="/images/logo.webp"
                        alt="EduHub"
                        width={130}
                        height={36}
                        priority
                        className="h-7.5 w-auto object-contain"
                      />
                    </div>

                    {/* Danh sách lợi ích: Toàn bộ dấu tick màu xanh lá */}
                    <ul className="space-y-3 text-[13.5px] sm:text-[14px] font-semibold text-slate-800">
                      {BENEFITS.map((text) => (
                        <li key={text} className="flex items-center gap-2.5">
                          <span className="w-4 h-4 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                            <Check className="w-2.5 h-2.5 stroke-[3]" />
                          </span>
                          <span>{text}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Chữ ghi chú viết tay phần bên phải: Nằm ngay dưới card phía trên */}
                  <div className="absolute top-full mt-3 left-1/2 -translate-x-1/2 w-full text-center select-none pointer-events-none">
                    <p className="font-handwriting font-bold text-blue-600 text-[19px] sm:text-[21px] leading-[1.18] -rotate-[2deg] tracking-wide text-center whitespace-nowrap">
                      Đơn giản hơn,
                      <br />
                      hiệu quả hơn!
                    </p>
                  </div>
                </div>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </div>
    </section>
  );
}
