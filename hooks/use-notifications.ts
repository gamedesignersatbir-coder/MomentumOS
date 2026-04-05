"use client";

import { useEffect, useRef } from "react";
import { FeedItem } from "@/lib/pulse/types";

function playBeep() {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 880;
    gain.gain.value = 0.3;
    osc.start();
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
    osc.stop(ctx.currentTime + 0.3);
  } catch {
    // AudioContext not available — silently ignore
  }
}

export function useNotifications(
  items: FeedItem[],
  enabled: boolean,
  soundEnabled: boolean
) {
  const previousItemIds = useRef<Set<string>>(new Set());
  const isFirstLoad = useRef(true);

  useEffect(() => {
    if (!enabled) return;

    if (isFirstLoad.current) {
      previousItemIds.current = new Set(items.map((i) => i.id));
      isFirstLoad.current = false;
      return;
    }

    if (previousItemIds.current.size === 0) {
      previousItemIds.current = new Set(items.map((i) => i.id));
      return;
    }

    const newItems = items.filter((i) => !previousItemIds.current.has(i.id));
    const newBreaking = newItems.filter((i) => i.isBreaking);
    const newNuclear = newItems.filter((i) => i.dramaLevel === "nuclear");
    const alertItems = [...newBreaking, ...newNuclear];

    if (alertItems.length > 0) {
      if (soundEnabled) {
        playBeep();
      }

      if (typeof Notification !== "undefined" && Notification.permission === "granted") {
        const top = alertItems[0];
        const breaking = top.isBreaking;
        const title = breaking
          ? `🚨 Breaking: ${top.title}`
          : `🔥 Drama Alert: ${top.title}`;

        try {
          new Notification(title, {
            body: `${top.source} · ${alertItems.length > 1 ? `+${alertItems.length - 1} more` : ""}`,
            icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>📡</text></svg>",
            tag: "pulsefeed-alert",
            silent: true,
          });
        } catch {
          // Notification API unavailable
        }
      }
    }

    previousItemIds.current = new Set(items.map((i) => i.id));
  }, [items, enabled, soundEnabled]);
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (typeof Notification === "undefined") return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;

  const result = await Notification.requestPermission();
  return result === "granted";
}
