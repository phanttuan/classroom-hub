"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import ScrollReveal from "../common/ScrollReveal";

export default function HeroSection() {
  return (
    <section
      id="overview"
      className="scroll-mt-16 sm:scroll-mt-20 lg:scroll-mt-24 relative flex min-h-[100svh] items-center overflow-hidden bg-slate-950 text-white lg:h-[100svh] lg:min-h-[700px] lg:max-h-[920px]"
    >
      {/* Background: góc bàn học bên cửa sổ (không laptop) */}
      <div className="absolute inset-0">
        <Image
          src="/images/herosection.webp"
          alt="Góc bàn học ấm áp bên cửa sổ"
          fill
          priority
          quality={100}
          sizes="100vw"
          className="object-cover object-center"
        />
      </div>

      {/* Lớp phủ mờ dần từ giữa sang trái (mức độ vừa phải, phong cách Dudi Software) */}
      <div className="absolute inset-0 bg-gradient-to-r from-[#060F22]/85 via-[#060F22]/50 via-48% to-transparent to-75% pointer-events-none" />
      <div
        className="absolute inset-y-0 left-0 w-full lg:w-[58%] backdrop-blur-[2.5px] pointer-events-none"
        style={{
          maskImage: "linear-gradient(to right, rgba(0,0,0,1) 0%, rgba(0,0,0,0.5) 60%, rgba(0,0,0,0) 100%)",
          WebkitMaskImage: "linear-gradient(to right, rgba(0,0,0,1) 0%, rgba(0,0,0,0.5) 60%, rgba(0,0,0,0) 100%)",
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-slate-950/40 via-transparent to-slate-950/50 pointer-events-none" />

      {/* Content 2 cột */}
      <div className="relative z-10 w-full max-w-[1320px] mx-auto px-4 sm:px-6 lg:px-8 pt-[104px] pb-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-6 items-center">
          {/* Cột trái: text */}
          <div className="lg:col-span-6 max-w-[600px] lg:-mt-8">
            {/* Main Title */}
            <ScrollReveal variant="fade-up" delay={120} duration={1000}>
              <h1 className="mt-2 text-[34px] sm:text-[44px] xl:text-[52px] font-extrabold tracking-tight leading-[1.18] drop-shadow-[0_2px_16px_rgba(0,0,0,0.45)]">
                Một nền tảng.
                <br />
                Toàn bộ quá trình
                <br />
                <span className="text-sky-300">dạy và học.</span>
              </h1>
            </ScrollReveal>

            {/* Subtitle */}
            <ScrollReveal variant="fade-up" delay={260} duration={1000}>
              <p className="mt-4 text-[15px] sm:text-base text-slate-200/90 max-w-[520px] font-normal leading-relaxed drop-shadow-[0_1px_8px_rgba(0,0,0,0.5)]">
                Tạo lớp học, xây dựng nội dung, giao bài, tổ chức Quiz, quản lý
                điểm và theo dõi lịch học trên cùng một nền tảng.
              </p>
            </ScrollReveal>

            {/* Action Button */}
            <ScrollReveal variant="fade-up" delay={400} duration={1000}>
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <Link
                  href="/register"
                  className="inline-flex items-center justify-center gap-2.5 px-7 py-3 rounded-full bg-blue-600 hover:bg-blue-500 text-white font-semibold text-[15px] shadow-lg shadow-blue-600/40 hover:shadow-blue-500/50 transition-all hover:-translate-y-0.5"
                >
                  <span>Bắt đầu miễn phí</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </ScrollReveal>

            {/* Stats */}
            <ScrollReveal variant="fade-up" delay={540} duration={1000}>
              <div className="mt-8 grid grid-cols-3 max-w-[500px] divide-x divide-white/20">
                <div className="pr-5">
                  <div className="text-[22px] sm:text-2xl font-extrabold text-white tracking-tight leading-none">
                    ...
                  </div>
                  <div className="text-[11px] sm:text-xs text-slate-300 mt-1.5 font-medium">
                    Giáo viên tin tưởng
                  </div>
                </div>
                <div className="px-5">
                  <div className="text-[22px] sm:text-2xl font-extrabold text-white tracking-tight leading-none">
                    ...
                  </div>
                  <div className="text-[11px] sm:text-xs text-slate-300 mt-1.5 font-medium">
                    Học sinh sử dụng
                  </div>
                </div>
                <div className="pl-5">
                  <div className="text-[22px] sm:text-2xl font-extrabold text-white tracking-tight leading-none">
                    ...
                  </div>
                  <div className="text-[11px] sm:text-xs text-slate-300 mt-1.5 font-medium">
                    Phản hồi tích cực
                  </div>
                </div>
              </div>
            </ScrollReveal>
          </div>

          {/* Cột phải: laptop ghép trên nền */}
          <div className="lg:col-span-6 relative flex flex-col items-center justify-end">
            {/* Laptop */}
            <ScrollReveal variant="zoom-in" delay={300} duration={1200} className="w-full flex justify-center">
              <div className="relative w-full max-w-[300px] sm:max-w-[440px] lg:max-w-[620px] mt-2 lg:mt-4 translate-y-3 lg:translate-y-12">
                {/* Ghi chú trái — xích qua phải thêm một chút theo ý người dùng */}
                <div
                  className="hidden sm:flex select-none absolute left-3 sm:left-2 lg:left-3 -top-11 sm:-top-14 lg:-top-16 z-20 flex-col items-center pointer-events-none"
                  aria-hidden="true"
                >
                  <p className="font-handwriting -rotate-[5deg] text-center text-[20px] sm:text-[23px] lg:text-[25px] font-bold leading-[1.18] text-amber-50 drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">
                    Học tập hôm nay
                    <br />
                    Kiến tạo ngày mai
                  </p>
                  <svg
                    className="w-15 h-11 sm:w-18 sm:h-13 lg:w-22 lg:h-15 text-white/90 drop-shadow-[0_2px_6px_rgba(0,0,0,0.6)]"
                    viewBox="0 0 90 60"
                    fill="none"
                  >
                    <path
                      d="M45 4 C 47 22, 60 40, 78 52 M78 52 l-9 -1 M78 52 l-2 -9"
                      stroke="currentColor"
                      strokeWidth="1.9"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>

                {/* Ghi chú phải — đặt chếch bên trên góc phải laptop, mũi tên từ tâm dưới chữ uốn cong chỉa đúng góc máy */}
                <div
                  className="hidden sm:flex select-none absolute -right-8 sm:-right-12 lg:-right-16 -top-20 sm:-top-24 lg:-top-28 z-20 flex-col items-center pointer-events-none"
                  aria-hidden="true"
                >
                  <p className="font-handwriting rotate-[4deg] text-center text-[20px] sm:text-[23px] lg:text-[25px] font-bold leading-[1.18] text-amber-50 drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">
                    Mọi lớp học
                    <br />
                    trong tầm tay
                  </p>
                  <svg
                    className="w-18 h-13 sm:w-22 sm:h-15 lg:w-26 lg:h-17 text-white/90 drop-shadow-[0_2px_6px_rgba(0,0,0,0.6)]"
                    viewBox="0 0 100 75"
                    fill="none"
                  >
                    <path
                      d="M50 4 C 47 28, 30 56, 4 72 M4 72 l12 -2 M4 72 l3 -12"
                      stroke="currentColor"
                      strokeWidth="1.9"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>

                {/* Quầng tối sau laptop để nổi khỏi nền cửa sổ sáng */}
                <div
                  aria-hidden="true"
                  className="absolute inset-[8%] bg-[radial-gradient(ellipse_at_center,rgba(6,15,34,0.4),transparent_70%)] blur-2xl"
                />
                <Image
                  src="/images/laptop.webp"
                  alt="Laptop hiển thị dashboard EduHub"
                  width={1536}
                  height={1024}
                  priority
                  sizes="(max-width: 1024px) 90vw, 50vw"
                  className="relative w-full h-auto object-contain drop-shadow-[0_32px_56px_rgba(0,0,0,0.55)]"
                />
                {/* Bóng đổ dưới chân laptop cho cảm giác đặt trên mặt bàn */}
                <div
                  aria-hidden="true"
                  className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-3/4 h-8 bg-slate-950/50 blur-2xl rounded-full"
                />
              </div>
            </ScrollReveal>
          </div>
        </div>
      </div>

      {/* Đáy thẳng ngang — không cong */}
    </section>
  );
}
