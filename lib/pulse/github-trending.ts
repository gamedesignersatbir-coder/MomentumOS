import type { FeedItem, FeedCategory } from './types';

function makeId(url: string): string {
  let hash = 0;
  for (let i = 0; i < url.length; i++) {
    hash = (hash * 31 + url.charCodeAt(i)) >>> 0;
  }
  return hash.toString(36);
}

interface GHRepo {
  full_name: string;
  html_url: string;
  description: string | null;
  stargazers_count: number;
  forks_count: number;
  language: string | null;
  topics: string[];
  owner: { login: string; avatar_url: string };
  pushed_at: string;
}

interface GHSearchResult {
  items: GHRepo[];
}

const sevenDaysAgo = () => {
  const d = new Date();
  d.setDate(d.getDate() - 7);
  return d.toISOString().split('T')[0];
};

async function searchRepos(query: string, category: FeedCategory, limit: number): Promise<FeedItem[]> {
  const since = sevenDaysAgo();
  const q = encodeURIComponent(`${query} pushed:>${since}`);
  const url = `https://api.github.com/search/repositories?q=${q}&sort=stars&order=desc&per_page=${limit}`;
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'MomentumOS/1.0',
      'Accept': 'application/vnd.github.v3+json',
    },
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) return [];
  const json = (await res.json()) as GHSearchResult;

  return json.items.map((repo) => ({
    id: makeId(repo.html_url),
    title: repo.full_name,
    summary: repo.description ?? '',
    url: repo.html_url,
    source: 'GitHub Trending',
    sourceType: 'github' as const,
    category,
    publishedAt: new Date(repo.pushed_at).toISOString(),
    imageUrl: repo.owner.avatar_url,
    author: repo.owner.login,
    engagement: {
      score: repo.stargazers_count,
    },
    dramaScore: 0,
    dramaLevel: 'none' as const,
    isBreaking: false,
    tags: repo.topics.slice(0, 4),
  }));
}

export async function fetchGithubTrending(): Promise<FeedItem[]> {
  try {
    const [aiItems, gamingItems] = await Promise.allSettled([
      searchRepos('artificial intelligence OR LLM OR machine-learning', 'ai', 10),
      searchRepos('game engine OR game development OR gamedev', 'gaming', 8),
    ]);
    const all = [
      ...(aiItems.status === 'fulfilled' ? aiItems.value : []),
      ...(gamingItems.status === 'fulfilled' ? gamingItems.value : []),
    ];
    const seen = new Set<string>();
    return all.filter((item) => {
      if (seen.has(item.url)) return false;
      seen.add(item.url);
      return true;
    });
  } catch {
    return [];
  }
}
