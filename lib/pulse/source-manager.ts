"use client";

import { FeedSourceConfig } from "@/lib/pulse/types";

const STORAGE_KEY = "pulsefeed_custom_sources_v1";
const DISABLED_KEY = "pulsefeed_disabled_sources_v1";

// ── Custom RSS sources (user-added) ──

export function loadCustomSources(): FeedSourceConfig[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveCustomSources(sources: FeedSourceConfig[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sources));
  } catch {}
}

export function addCustomSource(source: FeedSourceConfig): void {
  const existing = loadCustomSources();
  existing.push(source);
  saveCustomSources(existing);
}

export function removeCustomSource(id: string): void {
  const existing = loadCustomSources();
  saveCustomSources(existing.filter((s) => s.id !== id));
}

// ── Disabled source IDs (built-in sources the user turned off) ──

export function loadDisabledSourceIds(): Set<string> {
  try {
    const raw = localStorage.getItem(DISABLED_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

export function saveDisabledSourceIds(ids: Set<string>): void {
  try {
    localStorage.setItem(DISABLED_KEY, JSON.stringify(Array.from(ids)));
  } catch {}
}

export function toggleSourceEnabled(id: string): void {
  const disabled = loadDisabledSourceIds();
  if (disabled.has(id)) {
    disabled.delete(id);
  } else {
    disabled.add(id);
  }
  saveDisabledSourceIds(disabled);
}

export function isSourceEnabled(id: string, defaultEnabled: boolean): boolean {
  const disabled = loadDisabledSourceIds();
  if (disabled.has(id)) return false;
  return defaultEnabled;
}
