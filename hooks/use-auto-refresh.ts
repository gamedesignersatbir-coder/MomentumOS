"use client";

import { useEffect, useRef, useCallback, useState } from "react";

export function useAutoRefresh(
  callback: () => void,
  intervalMs: number,
  enabled: boolean
): { secondsUntilRefresh: number } {
  const savedCallback = useRef(callback);
  const nextRefreshRef = useRef<number>(Date.now() + intervalMs);
  const [secondsUntilRefresh, setSecondsUntilRefresh] = useState(
    Math.ceil(intervalMs / 1000)
  );

  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    if (!enabled) {
      setSecondsUntilRefresh(Math.ceil(intervalMs / 1000));
      return;
    }

    nextRefreshRef.current = Date.now() + intervalMs;

    const refreshId = setInterval(() => {
      nextRefreshRef.current = Date.now() + intervalMs;
      savedCallback.current();
    }, intervalMs);

    const tickId = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((nextRefreshRef.current - Date.now()) / 1000));
      setSecondsUntilRefresh(remaining);
    }, 1000);

    return () => {
      clearInterval(refreshId);
      clearInterval(tickId);
    };
  }, [intervalMs, enabled]);

  return { secondsUntilRefresh };
}

export function useKeyboardShortcut(
  key: string,
  callback: () => void,
  modifiers: { ctrl?: boolean; shift?: boolean; alt?: boolean } = {}
) {
  const handler = useCallback(
    (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        key.toLowerCase() !== "escape" &&
        (target instanceof HTMLInputElement ||
          target instanceof HTMLTextAreaElement ||
          target.isContentEditable)
      ) {
        return;
      }

      if (
        e.key.toLowerCase() === key.toLowerCase() &&
        (!modifiers.ctrl || e.ctrlKey || e.metaKey) &&
        (!modifiers.shift || e.shiftKey) &&
        (!modifiers.alt || e.altKey)
      ) {
        e.preventDefault();
        callback();
      }
    },
    [key, callback, modifiers.ctrl, modifiers.shift, modifiers.alt]
  );

  useEffect(() => {
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handler]);
}
