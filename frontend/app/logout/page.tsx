"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { logoutUser } from "@/lib/auth";

export default function LogoutPage() {
  const router = useRouter();

  useEffect(() => {
    let isMounted = true;

    async function performLogout() {
      try {
        await logoutUser();
      } finally {
        if (isMounted) {
          router.replace("/login");
        }
      }
    }

    performLogout();

    return () => {
      isMounted = false;
    };
  }, [router]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-900 text-white selection:bg-blue-600">
      <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4" />
      <p className="text-sm font-medium text-slate-300">
        Đang đăng xuất an toàn khỏi EduHub...
      </p>
    </div>
  );
}
