import type { FeedItem } from './types';
import { RSS_SOURCES, REDDIT_SOURCES } from './feed-sources';
import { fetchRSSFeed, fetchRedditFeed, fetchHackerNews } from './rss-parser';
import { fetchBluesky } from './bluesky-parser';
import { fetchGithubTrending } from './github-trending';
import { fetchSteamNews } from './steam-parser';
import { calculateDramaScore, getDramaLevel, isBreakingNews, extractTags } from './scorer';

const STOP_WORDS = new Set([
  "a","an","the","in","on","at","to","for","of","and","or","but",
  "is","it","its","as","by","with","this","that","from","are","was",
  "has","have","be","been","will","how","why","what","when","who","new",
]);

function titleWords(title: string): Set<string> {
  return new Set(
    title.toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 2 && !STOP_WORDS.has(w))
  );
}

function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 1;
  const intersection = Array.from(a).filter((w) => b.has(w)).length;
  const union = new Set([...Array.from(a), ...Array.from(b)]).size;
  return intersection / union;
}

function deduplicateByTitle(items: FeedItem[]): FeedItem[] {
  const wordSets = items.map((item) => titleWords(item.title));
  const merged = new Set<number>();
  const result: FeedItem[] = [];

  for (let i = 0; i < items.length; i++) {
    if (merged.has(i)) continue;
    merged.add(i);

    for (let j = i + 1; j < items.length; j++) {
      if (merged.has(j)) continue;
      if (jaccardSimilarity(wordSets[i], wordSets[j]) >= 0.5) {
        merged.add(j);
      }
    }

    result.push(items[i]);
  }

  return result;
}

function applyScoring(items: FeedItem[]): FeedItem[] {
  return items.map((item) => {
    const dramaScore = calculateDramaScore(item);
    const dramaLevel = getDramaLevel(dramaScore);
    const breaking = isBreakingNews(item);
    const computedTags = item.tags.length > 0 ? item.tags : extractTags(item);
    return {
      ...item,
      dramaScore,
      dramaLevel,
      isBreaking: breaking,
      tags: computedTags,
    };
  });
}

export async function aggregateFeed(disabledIds: Set<string> = new Set()): Promise<FeedItem[]> {
  const enabledRss = RSS_SOURCES.filter((s) => s.enabled && !disabledIds.has(s.id));
  const enabledReddit = REDDIT_SOURCES.filter((s) => s.enabled && !disabledIds.has(s.id));

  const [rssResults, redditResults, hnResults, blueskyResults, githubResults, steamResults] =
    await Promise.all([
      Promise.all(enabledRss.map((source) => fetchRSSFeed(source))),
      Promise.all(enabledReddit.map((source) => fetchRedditFeed(source))),
      disabledIds.has("hackernews") ? Promise.resolve([]) : fetchHackerNews(),
      disabledIds.has("bluesky") ? Promise.resolve([]) : fetchBluesky(),
      disabledIds.has("github-trending") ? Promise.resolve([]) : fetchGithubTrending(),
      disabledIds.has("steam-news") ? Promise.resolve([]) : fetchSteamNews(),
    ]);

  const allItems: FeedItem[] = [
    ...rssResults.flat(),
    ...redditResults.flat(),
    ...hnResults,
    ...blueskyResults,
    ...githubResults,
    ...steamResults,
  ];

  // Deduplicate by exact URL
  const seen = new Set<string>();
  const urlDeduped = allItems.filter((item) => {
    if (seen.has(item.url)) return false;
    seen.add(item.url);
    return true;
  });

  // Apply scoring before sort (so we can sort by dramaScore / isBreaking)
  const scored = applyScoring(urlDeduped);

  // Sort by importance
  scored.sort((a, b) => {
    if (a.isBreaking && !b.isBreaking) return -1;
    if (!a.isBreaking && b.isBreaking) return 1;
    if (a.dramaScore >= 50 && b.dramaScore < 50) return -1;
    if (a.dramaScore < 50 && b.dramaScore >= 50) return 1;
    return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
  });

  return deduplicateByTitle(scored);
}
