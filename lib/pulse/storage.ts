"use client";

import { FeedItem, FilterState } from "@/lib/pulse/types";

const PREFIX = "pulsefeed_";

const KEYS = {
  filters: `${PREFIX}filters_v1`,
  readItems: `${PREFIX}read_v1`,
  bookmarks: `${PREFIX}bookmarks_v1`,
  bookmarkedItems: `${PREFIX}bookmarked_items_v1`,
  settings: `${PREFIX}settings_v1`,
  trendingSnapshot: `${PREFIX}trending_snapshot_v1`,
} as const;

export interface UserSettings {
  autoRefresh: boolean;
  notificationsEnabled: boolean;
  soundEnabled: boolean;
}

const DEFAULT_SETTINGS: UserSettings = {
  autoRefresh: true,
  notificationsEnabled: false,
  soundEnabled: true,
};

// ── Generic helpers ──

function save<T>(key: string, data: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch {
    // Quota exceeded or unavailable — silently ignore
  }
}

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

// ── Filters ──

export function saveFilters(filters: FilterState): void {
  save(KEYS.filters, { ...filters, searchQuery: "" });
}

export function loadFilters(fallback: FilterState): FilterState {
  const stored = load<Partial<FilterState>>(KEYS.filters, {});
  return { ...fallback, ...stored };
}

// ── Read items (Set<string> stored as string[]) ──

export function loadReadItems(): Set<string> {
  const arr = load<string[]>(KEYS.readItems, []);
  return new Set(arr);
}

export function saveReadItems(ids: Set<string>): void {
  const arr = Array.from(ids).slice(-2000);
  save(KEYS.readItems, arr);
}

// ── Bookmarks (full FeedItem data, not just IDs) ──

export function loadBookmarkedItems(): FeedItem[] {
  return load<FeedItem[]>(KEYS.bookmarkedItems, []);
}

export function saveBookmarkedItems(items: FeedItem[]): void {
  save(KEYS.bookmarkedItems, items);
}

export function loadBookmarkIds(): Set<string> {
  const items = loadBookmarkedItems();
  return new Set(items.map((i) => i.id));
}

// ── User settings ──

export function loadSettings(): UserSettings {
  return load(KEYS.settings, DEFAULT_SETTINGS);
}

export function saveSettings(settings: UserSettings): void {
  save(KEYS.settings, settings);
}

// ── Trending snapshot (for velocity tracking) ──

export interface TrendingSnapshot {
  timestamp: string;
  topics: Record<string, number>; // topic → mention count
}

export function loadTrendingSnapshot(): TrendingSnapshot | null {
  return load<TrendingSnapshot | null>(KEYS.trendingSnapshot, null);
}

export function saveTrendingSnapshot(snapshot: TrendingSnapshot): void {
  save(KEYS.trendingSnapshot, snapshot);
}
