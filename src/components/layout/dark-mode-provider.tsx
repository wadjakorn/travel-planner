"use client";

import { useEffect } from "react";
import { useTripStore } from "@/stores/trip-store";

/**
 * Syncs dark mode preference with the DOM and system preference.
 * Must render inside the Zustand provider tree (i.e. inside the app, not
 * in the root layout before hydration). The `suppressHydrationWarning` on
 * <html> prevents a mismatch flash.
 */
export function DarkModeProvider({ children }: { children: React.ReactNode }) {
  const { darkMode, setDarkMode } = useTripStore();

  // On mount, check system preference and apply
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");

    // Only adopt system preference if the user has never manually set it
    // (persisted value in localStorage via Zustand persist)
    const stored = localStorage.getItem("trip-ui");
    if (!stored) {
      setDarkMode(mq.matches);
    }

    const handler = (e: MediaQueryListEvent) => {
      const stored = localStorage.getItem("trip-ui");
      if (!stored) setDarkMode(e.matches);
    };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [setDarkMode]);

  // Apply / remove .dark class on <html>
  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
  }, [darkMode]);

  return <>{children}</>;
}
