import type { FeedItem, FeedCategory } from './types';

function makeId(url: string): string {
  let hash = 0;
  for (let i = 0; i < url.length; i++) {
    hash = (hash * 31 + url.charCodeAt(i)) >>> 0;
  }
  return hash.toString(36);
}

interface BSkyPost {
  uri: string;
  cid: string;
  author: { handle: string; displayName?: string };
  record: { text: string; createdAt: string };
  likeCount?: number;
  repostCount?: number;
  replyCount?: number;
  embed?: { external?: { uri?: string; title?: string; description?: string }; images?: Array<{ thumb?: string }> };
}

interface BSkySearchResult {
  posts: BSkyPost[];
}

async function searchBluesky(query: string, category: FeedCategory): Promise<FeedItem[]> {
  const url = `https://public.api.bsky.app/xrpc/app.bsky.feed.searchPosts?q=${encodeURIComponent(query)}&limit=15`;
  const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) return [];
  const json = (await res.json()) as BSkySearchResult;

  return json.posts
    .filter((post) => {
      const text = post.record?.text ?? '';
      const engagementScore = (post.likeCount ?? 0) + (post.repostCount ?? 0);
      return text.length >= 10 && engagementScore >= 2;
    })
    .map((post) => {
      const external = post.embed?.external;
      const postUrl = external?.uri ?? `https://bsky.app/profile/${post.author.handle}/post/${post.uri.split('/').pop()}`;
      const title = external?.title ?? post.record.text.slice(0, 120).trim();
      const summary = external?.description ?? post.record.text.slice(0, 300);
      const imageUrl = post.embed?.images?.[0]?.thumb ?? undefined;

      return {
        id: makeId(postUrl),
        title,
        summary,
        url: postUrl,
        source: 'Bluesky',
        sourceType: 'bluesky' as const,
        category,
        publishedAt: new Date(post.record.createdAt).toISOString(),
        imageUrl,
        author: post.author.displayName ?? post.author.handle,
        engagement: {
          likes: post.likeCount,
          retweets: post.repostCount,
          comments: post.replyCount,
        },
        dramaScore: 0,
        dramaLevel: 'none' as const,
        isBreaking: false,
        tags: [],
      };
    })
    .filter((item) => item.url && item.title);
}

export async function fetchBluesky(): Promise<FeedItem[]> {
  try {
    const [aiItems, gamingItems] = await Promise.allSettled([
      searchBluesky('#AI OR #LLM OR #MachineLearning', 'ai'),
      searchBluesky('#gaming OR #gamedev OR #indiegames', 'gaming'),
    ]);
    return [
      ...(aiItems.status === 'fulfilled' ? aiItems.value : []),
      ...(gamingItems.status === 'fulfilled' ? gamingItems.value : []),
    ];
  } catch {
    return [];
  }
}
