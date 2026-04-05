"use client";

import { useState, useCallback } from "react";
import { useKeyboardShortcut } from "./use-auto-refresh";

interface KeyboardNavCallbacks {
  onOpen: (index: number) => void;
  onRefresh: () => void;
  onFocusSearch: () => void;
  onBookmark: (index: number) => void;
  onMarkAllRead: () => void;
  onToggleHelp: () => void;
}

export function useKeyboardNavigation(
  itemCount: number,
  callbacks: KeyboardNavCallbacks
) {
  const [focusedIndex, setFocusedIndex] = useState(-1);

  useKeyboardShortcut("j", () =>
    setFocusedIndex((i) => Math.min(i + 1, itemCount - 1))
  );

  useKeyboardShortcut("k", () =>
    setFocusedIndex((i) => Math.max(i - 1, 0))
  );

  useKeyboardShortcut("o", () => {
    if (focusedIndex >= 0) callbacks.onOpen(focusedIndex);
  });

  useKeyboardShortcut("/", () => callbacks.onFocusSearch());

  useKeyboardShortcut("r", () => callbacks.onRefresh());

  useKeyboardShortcut("b", () => {
    if (focusedIndex >= 0) callbacks.onBookmark(focusedIndex);
  });

  useKeyboardShortcut("m", () => callbacks.onMarkAllRead());

  useKeyboardShortcut("?", () => callbacks.onToggleHelp(), { shift: true });

  useKeyboardShortcut("Escape", () => setFocusedIndex(-1));

  const resetFocus = useCallback(() => setFocusedIndex(-1), []);

  return { focusedIndex, setFocusedIndex, resetFocus };
}
