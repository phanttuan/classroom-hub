"use client";

import React, { useEffect, useRef, useState } from "react";

type RevealVariant =
  | "fade-up"
  | "fade-down"
  | "slide-left"
  | "slide-right"
  | "zoom-in"
  | "card-3d"
  | "flip-in";

interface ScrollRevealProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  variant?: RevealVariant;
  delay?: number;
  duration?: number;
  className?: string;
  threshold?: number;
  rootMargin?: string;
  once?: boolean; // false = bi-directional: re-triggers khi lướt lên/xuống (giống DUDI)
  as?: React.ElementType;
  style?: React.CSSProperties;
}

// Port từ DUDI ScrollReveal — IntersectionObserver + CSS classes trong globals.css.
// Positive rootMargin buffer tránh jitter/flicker ở mép viewport.
export default function ScrollReveal({
  children,
  variant = "fade-up",
  delay = 0,
  duration = 1000,
  className = "",
  threshold = 0,
  rootMargin = "60px 0px 60px 0px",
  once = false,
  as: Component = "div",
  style = {},
  ...restProps
}: ScrollRevealProps) {
  const [isRevealed, setIsRevealed] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (typeof window !== "undefined" && !("IntersectionObserver" in window)) {
      // Fallback: không có IntersectionObserver thì hiện luôn (async để tránh cascading render)
      const timer = setTimeout(() => setIsRevealed(true), 0);
      return () => clearTimeout(timer);
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsRevealed(true);
          if (once) {
            observer.unobserve(el);
          }
        } else if (!once) {
          setIsRevealed(false);
        }
      },
      {
        threshold,
        rootMargin,
      }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold, rootMargin, once]);

  const Tag = Component as React.ElementType;

  return (
    <Tag
      ref={ref}
      className={`reveal-init reveal-${variant} ${isRevealed ? "is-revealed" : ""} ${className}`}
      style={{
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ["--reveal-duration" as any]: `${duration}ms`,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ["--reveal-delay" as any]: `${delay}ms`,
        transitionDuration: `${duration}ms`,
        transitionDelay: `${delay}ms`,
        ...style,
      }}
      {...restProps}
    >
      {children}
    </Tag>
  );
}
