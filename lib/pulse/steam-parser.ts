import type { FeedItem } from './types';

function makeId(url: string): string {
  let hash = 0;
  for (let i = 0; i < url.length; i++) {
    hash = (hash * 31 + url.charCodeAt(i)) >>> 0;
  }
  return hash.toString(36);
}

function stripBBCode(text: string): string {
  return text
    .replace(/\[\/?(b|i|u|s|h[1-6]|code|list|url|img|table|th|td|tr|noparse|strike|spoiler)[^\]]*\]/gi, '')
    .replace(/\[url=[^\]]+\]/gi, '')
    .replace(/<[^>]*>/g, '')
    .replace(/&[a-z#0-9]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

interface SteamNewsItem {
  gid: string;
  title: string;
  url: string;
  contents: string;
  author: string;
  date: number;
  appid: number;
}

interface SteamNewsResponse {
  appnews?: { newsitems?: SteamNewsItem[] };
}

const TRACKED_GAMES: { appId: number; name: string }[] = [
  { appId: 730,     name: 'Counter-Strike 2' },
  { appId: 570,     name: 'Dota 2' },
  { appId: 1086940, name: "Baldur's Gate 3" },
  { appId: 1245620, name: 'Elden Ring' },
  { appId: 1145360, name: 'Hades II' },
  { appId: 367520,  name: 'Hollow Knight' },
  { appId: 588650,  name: 'Dead Cells' },
];

async function fetchGameNews(appId: number, gameName: string): Promise<FeedItem[]> {
  const url = `https://api.steampowered.com/ISteamNews/GetNewsForApp/v2/?appid=${appId}&count=5&maxlength=600&format=json`;
  const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) return [];
  const json = (await res.json()) as SteamNewsResponse;
  const items = json.appnews?.newsitems ?? [];

  return items.map((item) => ({
    id: makeId(item.url || item.gid),
    title: item.title.trim(),
    summary: stripBBCode(item.contents).slice(0, 300),
    url: item.url || `https://store.steampowered.com/news/app/${appId}`,
    source: `Steam · ${gameName}`,
    sourceType: 'steam' as const,
    category: 'gaming' as const,
    publishedAt: new Date(item.date * 1000).toISOString(),
    author: item.author || undefined,
    engagement: {},
    dramaScore: 0,
    dramaLevel: 'none' as const,
    isBreaking: false,
    tags: [gameName],
  })).filter((item) => item.url && item.title);
}

export async function fetchSteamNews(): Promise<FeedItem[]> {
  try {
    const results = await Promise.allSettled(
      TRACKED_GAMES.map((g) => fetchGameNews(g.appId, g.name))
    );
    return results.flatMap((r) => r.status === 'fulfilled' ? r.value : []);
  } catch {
    return [];
  }
}
