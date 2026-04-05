"use client";

import { Sun, Moon } from "lucide-react";

interface ThemeToggleProps {
  resolvedTheme: "light" | "dark";
  onToggle: () => void;
}

export default function PulseThemeToggle({ resolvedTheme, onToggle }: ThemeToggleProps) {
  const isDark = resolvedTheme === "dark";

  return (
    <button
      onClick={onToggle}
      className={`px-2 py-1.5 rounded-lg text-xs font-medium transition-all ${
        isDark
          ? "bg-amber-500/10 border border-amber-500/20 text-amber-400"
          : "bg-amber-500/10 border border-amber-500/20 text-amber-600"
      }`}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
    >
      {isDark ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5" />}
    </button>
  );
}
