"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

interface SidebarContextType {
  collapsed: boolean;
  toggleCollapse: () => void;
  setCollapsed: (v: boolean) => void;
}

const SidebarContext = createContext<SidebarContextType>({
  collapsed: false,
  toggleCollapse: () => {},
  setCollapsed: () => {},
});

export function SidebarProvider({
  defaultCollapsed = false,
  children,
}: {
  defaultCollapsed?: boolean;
  children: React.ReactNode;
}) {
  const [collapsed, setCollapsedState] = useState(defaultCollapsed);

  useEffect(() => {
    try {
      const match = document.cookie.match(/(^| )sidebar_collapsed=([^;]+)/);
      if (match) {
        setCollapsedState(match[2] === "true");
      } else {
        const local = localStorage.getItem("sidebar_collapsed");
        if (local !== null) {
          setCollapsedState(local === "true");
        }
      }
    } catch {}
  }, []);

  const toggleCollapse = () => {
    setCollapsedState((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("sidebar_collapsed", String(next));
        document.cookie = `sidebar_collapsed=${next}; path=/; max-age=31536000; SameSite=Lax`;
      } catch {}
      return next;
    });
  };

  const setCollapsed = (v: boolean) => {
    setCollapsedState(v);
    try {
      localStorage.setItem("sidebar_collapsed", String(v));
      document.cookie = `sidebar_collapsed=${v}; path=/; max-age=31536000; SameSite=Lax`;
    } catch {}
  };

  return (
    <SidebarContext.Provider value={{ collapsed, toggleCollapse, setCollapsed }}>
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  return useContext(SidebarContext);
}
