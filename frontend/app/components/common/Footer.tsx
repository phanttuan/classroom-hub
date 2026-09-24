import React from "react";
import Link from "next/link";
import Image from "next/image";

export default function Footer() {
  return (
    <footer className="bg-[#0B1528] border-t border-blue-900/40 pt-16 pb-12 text-slate-300">
      <div className="max-w-[1320px] mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Main 4-column Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 pb-12 border-b border-slate-800">
          
          {/* Col 1: Brand & Slogan (2 cols) - Logo lấy đúng chuẩn như trên Header */}
          <div className="lg:col-span-2 space-y-4">
            <Link
              href="/"
              className="inline-flex items-center px-3.5 py-1.5 rounded-xl bg-white hover:bg-slate-100 transition-all shadow-sm w-fit"
              aria-label="EduHub trang chủ"
            >
              <Image
                src="/images/logo.webp"
                alt="EduHub"
                width={140}
                height={36}
                priority
                className="h-7.5 w-auto object-contain"
              />
            </Link>

            <p className="text-sm text-slate-300 max-w-sm leading-relaxed">
              Nền tảng hỗ trợ giáo viên xây dựng, cung cấp bài giảng và tổ chức đào tạo trực tuyến toàn diện, gắn kết người dạy và người học.
            </p>

            <p className="text-xs text-sky-400 font-semibold tracking-wide">
              Kết nối tri thức, kiến tạo tương lai.
            </p>
          </div>

          {/* Col 2: Sản phẩm */}
          <div>
            <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-4">
              Sản phẩm
            </h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link href="#overview" className="hover:text-white transition-colors">
                  Tổng quan
                </Link>
              </li>
              <li>
                <Link href="#how-it-works" className="hover:text-white transition-colors">
                  Quy trình
                </Link>
              </li>
              <li>
                <Link href="#features" className="hover:text-white transition-colors">
                  Tính năng
                </Link>
              </li>
              <li>
                <Link href="#roles" className="hover:text-white transition-colors">
                  Vai trò
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 3: Tài nguyên */}
          <div>
            <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-4">
              Tài nguyên
            </h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link href="#" className="hover:text-white transition-colors">
                  Hướng dẫn sử dụng
                </Link>
              </li>
              <li>
                <Link href="#" className="hover:text-white transition-colors">
                  Blog giáo dục
                </Link>
              </li>
              <li>
                <Link href="#" className="hover:text-white transition-colors">
                  Câu hỏi thường gặp (FAQ)
                </Link>
              </li>
              <li>
                <Link href="#" className="hover:text-white transition-colors">
                  Tài liệu API & Kỹ thuật
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 4: Hỗ trợ */}
          <div>
            <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-4">
              Hỗ trợ
            </h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link href="#" className="hover:text-white transition-colors">
                  Liên hệ trợ giúp
                </Link>
              </li>
              <li>
                <Link href="#" className="hover:text-white transition-colors">
                  Chính sách bảo mật
                </Link>
              </li>
              <li>
                <Link href="#" className="hover:text-white transition-colors">
                  Điều khoản sử dụng
                </Link>
              </li>
              <li>
                <Link href="#" className="hover:text-white transition-colors">
                  Báo cáo sự cố
                </Link>
              </li>
            </ul>
          </div>

        </div>

        {/* Bottom Bar: Copyright & Socials */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <p>© 2026 EduHub. All rights reserved. Đồ án Tiểu Luận Chuyên Ngành (TLCN).</p>

          <div className="flex items-center gap-3">
            <a
              href="#"
              className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/15 border border-white/10 text-slate-300 hover:text-white flex items-center justify-center transition-all"
              title="Facebook"
            >
              <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
            </a>
            <a
              href="#"
              className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/15 border border-white/10 text-slate-300 hover:text-red-400 flex items-center justify-center transition-all"
              title="YouTube"
            >
              <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
            </a>
            <a
              href="#"
              className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/15 border border-white/10 text-slate-300 hover:text-white flex items-center justify-center transition-all"
              title="GitHub"
            >
              <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/></svg>
            </a>
            <a
              href="#"
              className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/15 border border-white/10 text-slate-300 hover:text-sky-400 flex items-center justify-center transition-all"
              title="LinkedIn"
            >
              <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg>
            </a>
          </div>
        </div>

      </div>
    </footer>
  );
}
