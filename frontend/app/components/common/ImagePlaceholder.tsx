"use client";

import React from "react";
import { Image as ImageIcon, Sparkles, UploadCloud } from "lucide-react";

interface ImagePlaceholderProps {
  title: string;
  subtitle?: string;
  recommendedSize?: string;
  className?: string;
  heightClass?: string;
  aspectRatio?: string;
  icon?: React.ReactNode;
  tag?: string;
  imageSrc?: string;
  alt?: string;
}

export default function ImagePlaceholder({
  title,
  subtitle = "Khu vực chờ ảnh - Bạn có thể gen ảnh và chèn vào đây",
  recommendedSize = "Khuyên dùng: 16:9 hoặc tỷ lệ theo khung",
  className = "",
  heightClass = "min-h-[340px]",
  tag = "Image Placeholder",
  imageSrc,
  alt = "Placeholder image",
}: ImagePlaceholderProps) {
  if (imageSrc) {
    return (
      <div className={`relative overflow-hidden rounded-2xl shadow-xl border border-slate-100 ${className}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={imageSrc} alt={alt} className="w-full h-full object-cover" />
      </div>
    );
  }

  return (
    <div
      className={`group relative flex flex-col items-center justify-center rounded-3xl border-2 border-dashed border-sky-300/70 bg-white p-6 text-center shadow-xs transition-all duration-300 hover:border-blue-500 hover:shadow-md ${heightClass} ${className}`}
    >
      {/* Decorative top-right tag */}
      <div className="absolute top-3.5 right-3.5 flex items-center gap-1.5 rounded-full bg-blue-100/80 px-2.5 py-1 text-[11px] font-medium text-blue-700 backdrop-blur-xs">
        <Sparkles className="w-3 h-3 text-blue-600 animate-pulse" />
        <span>{tag}</span>
      </div>

      {/* Center Icon Box */}
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white shadow-md shadow-blue-100/50 ring-1 ring-blue-100 transition-transform duration-300 group-hover:scale-105">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm">
          <ImageIcon className="w-6 h-6" />
        </div>
      </div>

      {/* Title & Guidelines */}
      <h4 className="text-base font-semibold text-slate-800 tracking-tight group-hover:text-blue-700 transition-colors">
        {title}
      </h4>
      <p className="mt-1 max-w-sm text-xs text-slate-500 leading-relaxed">
        {subtitle}
      </p>

      {/* Suggested spec */}
      <div className="mt-4 flex items-center gap-2 rounded-lg bg-white/80 px-3 py-1.5 text-[11px] font-mono text-slate-600 border border-slate-200/60 shadow-2xs">
        <UploadCloud className="w-3.5 h-3.5 text-blue-500" />
        <span>{recommendedSize}</span>
      </div>
    </div>
  );
}
