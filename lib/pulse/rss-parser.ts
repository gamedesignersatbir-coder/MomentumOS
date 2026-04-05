import Parser from 'rss-parser';
import type { FeedItem, FeedSourceDef } from './types';

type RSSItem = {
  title?: string;
  link?: string;
  guid?: string;
  pubDate?: string;
  contentSnippet?: string;
  content?: string;
  summary?: string;
  categories?: string[];
  creator?: string;
  author?: string;
  enclosure?: { url?: string };
  'media:thumbnail'?: { $?: { url?: string } };
  'media:content'?: { $?: { url?: string } };
};

const parser = new Parser<Record<string, unknown>, RSSItem>({
  timeout: 8000,
  customFields: {
    item: [
      ['media:thumbnail', 'media:thumbnail'],
      ['media:content', 'media:content'],
    ],
  },
});

function makeId(url: string): string {
  let hash = 0;
  for (let i = 0; i < url.length; i++) {
    hash = (hash * 31 + url.charCodeAt(i)) >>> 0;
  }
  return hash.toString(36);
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').replace(/&[a-z#0-9]+;/gi, ' ').replace(/\s+/g, ' ').trim();
}

export async function fetchRSSFeed(source: FeedSourceDef): Promise<FeedItem[]> {
  try {
    const feed = await parser.parseURL(source.url);
    return (feed.items ?? []).slice(0, 10).map((item) => {
      const url = item.link ?? item.guid ?? '';
      const rawSummary = item.contentSnippet ?? item.content ?? item.summary ?? '';
      const imageUrl =
        item.enclosure?.url ??
        item['media:thumbnail']?.$?.url ??
        item['media:content']?.$?.url ??
        undefined;
      return {
        id: makeId(url),
        title: (item.title ?? '').trim(),
        summary: stripHtml(rawSummary).slice(0, 300),
        url,
        source: source.name,
        sourceType: 'rss' as const,
        category: source.category,
        publishedAt: item.pubDate ? new Date(item.pubDate).toISOString() : new Date().toISOString(),
        imageUrl,
        author: item.creator ?? item.author ?? undefined,
        engagement: {},
        dramaScore: 0,
        dramaLevel: 'none' as const,
        isBreaking: false,
        tags: [],
      };
    }).filter((item) => item.url && item.title);
  } catch {
    return [];
  }
}

interface RedditListing {
  data: {
    children: Array<{
      data: {
        title: string;
        url: string;
        selftext: string;
        score: number;
        num_comments: number;
        created_utc: number;
        author: string;
        permalink: string;
      };
    }>;
  };
}

export async function fetchRedditFeed(source: FeedSourceDef): Promise<FeedItem[]> {
  try {
    const sub = source.url.split('/r/')[1];
    const res = await fetch(`https://www.reddit.com/r/${sub}.json?limit=10`, {
      headers: { 'User-Agent': 'MomentumOS/1.0' },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return [];
    const json = (await res.json()) as RedditListing;
    return json.data.children
      .map(({ data }) => ({
        id: makeId(data.url),
        title: data.title.trim(),
        summary: data.selftext.slice(0, 300),
        url: data.url,
        source: source.name,
        sourceType: 'reddit' as const,
        category: source.category,
        publishedAt: new Date(data.created_utc * 1000).toISOString(),
        author: data.author,
        redditUrl: `https://www.reddit.com${data.permalink}`,
        engagement: {
          upvotes: data.score,
          comments: data.num_comments,
        },
        dramaScore: 0,
        dramaLevel: 'none' as const,
        isBreaking: false,
        tags: [],
      }))
      .filter((item) => item.engagement.upvotes! >= 10 && item.url && item.title);
  } catch {
    return [];
  }
}

interface HNHit {
  title: string;
  url?: string;
  story_text?: string;
  points: number;
  num_comments: number;
  author: string;
  created_at: string;
  objectID: string;
}

interface HNSearchResult {
  hits: HNHit[];
}

export async function fetchHackerNews(): Promise<FeedItem[]> {
  try {
    const since = Math.floor(Date.now() / 1000) - 86400;
    const query = encodeURIComponent('"AI" OR "LLM" OR "game design"');
    const url = `https://hn.algolia.com/api/v1/search?query=${query}&tags=story&numericFilters=created_at_i>${since}&hitsPerPage=10`;
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return [];
    const json = (await res.json()) as HNSearchResult;
    return json.hits
      .filter((hit) => hit.url)
      .map((hit) => ({
        id: makeId(hit.url ?? hit.objectID),
        title: hit.title.trim(),
        summary: hit.story_text ? stripHtml(hit.story_text).slice(0, 300) : '',
        url: hit.url ?? `https://news.ycombinator.com/item?id=${hit.objectID}`,
        source: 'Hacker News',
        sourceType: 'hackernews' as const,
        category: 'ai' as const,
        publishedAt: new Date(hit.created_at).toISOString(),
        author: hit.author,
        redditUrl: `https://news.ycombinator.com/item?id=${hit.objectID}`,
        engagement: {
          score: hit.points,
          comments: hit.num_comments,
        },
        dramaScore: 0,
        dramaLevel: 'none' as const,
        isBreaking: false,
        tags: [],
      }));
  } catch {
    return [];
  }
}
