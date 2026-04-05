"use client";

import { useState, useEffect, useCallback } from "react";

export type Theme = "light" | "dark" | "system";

const STORAGE_KEY = "pulsefeed_theme_v1";

function getSystemPreference(): boolean {
  if (typeof window === "undefined") return true;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>("dark");

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY) as Theme | null;
      if (stored && (stored === "light" || stored === "dark" || stored === "system")) {
        setThemeState(stored);
      }
    } catch {
      // localStorage not available
    }
  }, []);

  useEffect(() => {
    const isDark = theme === "dark" || (theme === "system" && getSystemPreference());
    document.documentElement.classList.toggle("dark", isDark);
  }, [theme]);

  useEffect(() => {
    if (theme !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e: MediaQueryListEvent) => {
      document.documentElement.classList.toggle("dark", e.matches);
    };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [theme]);

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t);
    try {
      localStorage.setItem(STORAGE_KEY, t);
    } catch {
      // localStorage not available
    }
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => {
      const isDark = prev === "dark" || (prev === "system" && getSystemPreference());
      const next: Theme = isDark ? "light" : "dark";
      try {
        localStorage.setItem(STORAGE_KEY, next);
      } catch {
        // localStorage not available
      }
      return next;
    });
  }, []);

  const resolvedTheme: "light" | "dark" =
    theme === "system" ? (getSystemPreference() ? "dark" : "light") : theme;

  return { theme, resolvedTheme, setTheme, toggleTheme };
}
