"use client";

import { useEffect } from "react";

export default function SmoothScrollHandler() {
  useEffect(() => {
    function handleAnchorClick(e: MouseEvent) {
      const anchor = (e.target as HTMLElement).closest('a[href*="#"]');
      if (!anchor) return;

      const rawHref = anchor.getAttribute("href");
      if (!rawHref) return;

      // Extract the hash part (supports both "#section" and "/#section")
      const hashIndex = rawHref.indexOf("#");
      if (hashIndex === -1) return;

      const hash = rawHref.slice(hashIndex);
      if (hash === "#" || hash.length <= 1) return;

      let targetId = hash.slice(1);
      // Fallback alias: #about points to #problem if #about doesn't exist
      if (targetId === "about" && !document.getElementById("about")) {
        targetId = "problem";
      }

      const targetElement = document.getElementById(targetId);
      if (!targetElement) return;

      // Prevent immediate abrupt jump
      e.preventDefault();
      e.stopPropagation();

      // Fixed navbar offset
      const navbarOffset = 76;
      const targetY =
        targetElement.getBoundingClientRect().top + window.pageYOffset - navbarOffset;
      const startY = window.pageYOffset;
      const distance = targetY - startY;

      if (Math.abs(distance) < 4) return;

      // Calculate smooth duration based on distance (650ms to 950ms)
      const duration = Math.min(Math.max(Math.abs(distance) * 0.45, 650), 950);
      const startTime = performance.now();

      function step(currentTime: number) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);

        // easeInOutCubic: gentle acceleration, smooth glide, gentle deceleration
        const ease =
          progress < 0.5
            ? 4 * progress * progress * progress
            : 1 - Math.pow(-2 * progress + 2, 3) / 2;

        window.scrollTo(0, startY + distance * ease);

        if (progress < 1) {
          requestAnimationFrame(step);
        } else {
          // Update URL hash cleanly without jumping
          window.history.pushState(null, "", hash);
        }
      }

      requestAnimationFrame(step);
    }

    // Capture click in capture phase to override default link behaviors
    document.addEventListener("click", handleAnchorClick, { capture: true });
    return () => {
      document.removeEventListener("click", handleAnchorClick, { capture: true });
    };
  }, []);

  return null;
}
