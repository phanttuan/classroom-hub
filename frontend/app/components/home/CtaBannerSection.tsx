"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import ScrollReveal from "../common/ScrollReveal";

export default function CtaBannerSection() {
  return (
    <section
      id="cta"
      className="scroll-mt-16 sm:scroll-mt-20 lg:scroll-mt-24 w-full relative overflow-hidden bg-sky-100 min-h-[360px] sm:min-h-[380px] lg:min-h-[400px] mb-16 sm:mb-20 lg:mb-24 flex items-center justify-center"
    >
      {/* 1. Panoramic Background Image - Trải ngang hẳn ra 2 bên (Edge-to-Edge), vuông góc 100% */}
      <div className="absolute inset-0 w-full h-full z-0 select-none pointer-events-none">
        <Image
          src="/images/background_contact.webp"
          alt="EduHub Banner Background"
          fill
          priority
          unoptimized
          className="object-cover object-center lg:object-[center_35%]"
        />
        {/* Subtle sunny glow in the center to ensure clear text contrast */}
        <div className="absolute inset-0 bg-radial from-white/75 via-white/25 to-transparent pointer-events-none" />
      </div>

      {/* 2. Content Container - Cân đối theo bố cục ảnh mẫu: Học sinh bên trái, nội dung ở giữa, chữ viết tay bên phải */}
      <div className="max-w-[1320px] mx-auto px-4 sm:px-6 lg:px-8 w-full relative z-10 py-10 sm:py-12 lg:py-14">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-8 lg:gap-4">
          
          {/* Spacer cột trái (để lộ rõ hình nhân vật sinh viên đeo balo trong ảnh nền) */}
          <div className="hidden lg:block lg:w-[280px] xl:w-[320px] shrink-0 pointer-events-none" />

          {/* Cột giữa: Tiêu đề, mô tả và 2 nút hành động (Đã bỏ badge bo góc phía trên theo yêu cầu) */}
          <div className="flex-1 max-w-[620px] w-full flex flex-col items-center text-center">
            <ScrollReveal variant="fade-up" delay={80} duration={800}>
              {/* Tiêu đề chính đậm nét, rõ ràng */}
              <h2 className="text-3xl sm:text-4xl lg:text-[40px] font-extrabold text-[#0B132B] tracking-tight leading-[1.2] mb-3 sm:mb-4">
                Sẵn sàng tạo nên <br />
                <span>trải nghiệm dạy và học tốt hơn?</span>
              </h2>
            </ScrollReveal>

            <ScrollReveal variant="fade-up" delay={160} duration={800}>
              {/* Mô tả phụ */}
              <p className="text-slate-700 text-sm sm:text-base max-w-lg mx-auto font-normal leading-relaxed mb-6 sm:mb-8">
                Tham gia EduHub miễn phí và khám phá một nền tảng giáo dục hiện đại,
                được thiết kế dành riêng cho bạn.
              </p>
            </ScrollReveal>

            <ScrollReveal variant="fade-up" delay={240} duration={800}>
              {/* 2 Nút hành động chuẩn theo mẫu */}
              <div className="flex flex-wrap items-center justify-center gap-3.5 sm:gap-4">
                <Link
                  href="/register"
                  className="inline-flex items-center gap-2 px-6 sm:px-7 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm sm:text-base shadow-md shadow-blue-600/25 transition-all hover:translate-y-[-1px] group"
                >
                  <span>Đăng ký miễn phí</span>
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </Link>

                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 px-6 sm:px-7 py-3 rounded-xl bg-white/95 hover:bg-white text-blue-600 font-semibold text-sm sm:text-base border border-blue-200/90 shadow-xs transition-all hover:translate-y-[-1px]"
                >
                  <span>Đăng nhập</span>
                </Link>
              </div>
            </ScrollReveal>
          </div>

          {/* Cột phải: Dòng chữ viết tay uốn lượn + hình vẽ máy bay giấy origami theo đúng ảnh mẫu */}
          <div className="w-full lg:w-[280px] xl:w-[320px] shrink-0 flex justify-center lg:justify-end">
            <ScrollReveal variant="fade-up" delay={300} duration={800}>
              <div className="relative select-none text-blue-600 font-handwriting py-2">
                {/* Máy bay giấy phía trên với đường bay lượn */}
                <div className="absolute -top-7 -right-2 flex flex-col items-center pointer-events-none">
                  <svg
                    className="w-7 h-7 sm:w-8 sm:h-8 text-blue-500 drop-shadow-xs -rotate-12 transition-transform duration-300 hover:scale-110"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="m22 2-7 20-4-9-9-4Z" />
                    <path d="M22 2 11 13" />
                  </svg>
                </div>

                {/* Đường nét đứt uốn lượn phía trên máy bay */}
                <svg
                  className="absolute -top-5 right-7 w-16 h-10 text-blue-400/80 pointer-events-none"
                  viewBox="0 0 70 40"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeDasharray="3 3"
                >
                  <path d="M5,35 Q25,5 65,10" />
                </svg>

                {/* Chữ viết tay theo ảnh mẫu */}
                <p className="text-xl sm:text-2xl lg:text-[25px] font-bold tracking-wide leading-tight -rotate-[4deg] text-center lg:text-right drop-shadow-xs">
                  Cùng nhau <br />
                  vì một thế hệ tương lai <br />
                  vững mạnh hơn
                </p>

                {/* Máy bay giấy nhỏ phía dưới với vệt xoắn */}
                <div className="absolute -bottom-8 right-6 pointer-events-none flex items-center">
                  <svg
                    className="w-5 h-5 sm:w-6 sm:h-6 text-blue-500 drop-shadow-xs rotate-45"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="m22 2-7 20-4-9-9-4Z" />
                    <path d="M22 2 11 13" />
                  </svg>
                </div>

                <svg
                  className="absolute -bottom-6 right-12 w-14 h-8 text-blue-400/70 pointer-events-none"
                  viewBox="0 0 60 30"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.4"
                  strokeDasharray="2.5 2.5"
                >
                  <path d="M5,5 Q35,28 55,10" />
                </svg>
              </div>
            </ScrollReveal>
          </div>

        </div>
      </div>
    </section>
  );
}
