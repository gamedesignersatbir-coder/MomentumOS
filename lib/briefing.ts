import Parser from 'rss-parser';
import { getBriefing, saveBriefing, getSources } from './data';
import type { BriefingItem } from './types';

/**
 * The briefing: at most 10 items, at most 2 per source, newest first,
 * built once per window (morning / evening) and cached in the database.
 * No scores, no categories, no tickers — the feed ends.
 */

const MAX_ITEMS = 10;
const PER_SOURCE_CAP = 2;
const FRESH_HOURS = 48;
const FETCH_TIMEOUT_MS = 6000;

const parser = new Parser({ timeout: FETCH_TIMEOUT_MS });

async function fetchSource(name: string, url: string): Promise<BriefingItem[]> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { 'user-agent': 'AAJ personal briefing (single user)' },
    });
    if (!response.ok) return [];
    const xml = await response.text();
    const feed = await parser.parseString(xml);
    return (feed.items ?? [])
      .filter((item) => item.title && item.link)
      .map((item) => ({
        title: item.title!.trim(),
        url: item.link!,
        source: name,
        publishedAt: item.isoDate ?? item.pubDate ?? new Date().toISOString(),
      }));
  } catch {
    return []; // one bad feed never breaks the briefing
  } finally {
    clearTimeout(timer);
  }
}

function pickItems(all: BriefingItem[]): BriefingItem[] {
  const now = Date.now();
  const seen = new Set<string>();
  const fresh = all
    .filter((item) => {
      const age = now - new Date(item.publishedAt).getTime();
      return Number.isFinite(age) && age >= 0 && age < FRESH_HOURS * 3600_000;
    })
    .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());

  // If the last 48h were quiet, fall back to the newest of whatever exists.
  const pool = fresh.length >= 3
    ? fresh
    : all.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());

  const perSource = new Map<string, number>();
  const picked: BriefingItem[] = [];
  for (const item of pool) {
    if (picked.length >= MAX_ITEMS) break;
    if (seen.has(item.url)) continue;
    const used = perSource.get(item.source) ?? 0;
    if (used >= PER_SOURCE_CAP) continue;
    seen.add(item.url);
    perSource.set(item.source, used + 1);
    picked.push(item);
  }
  return picked;
}

/** Returns the briefing for the window, building and caching it if needed. */
export async function getOrBuildBriefing(windowKey: string): Promise<BriefingItem[]> {
  const cached = await getBriefing(windowKey);
  if (cached) return cached.items;

  const sources = await getSources(true);
  const results = await Promise.all(sources.map((s) => fetchSource(s.name, s.url)));
  const items = pickItems(results.flat());
  await saveBriefing(windowKey, items);
  return items;
}
