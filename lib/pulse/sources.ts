import type { FeedSourceDef } from './types';

export const RSS_SOURCES: FeedSourceDef[] = [
  // Gaming
  { name: 'IGN',               url: 'https://feeds.feedburner.com/ign/games-all',                       category: 'gaming', type: 'rss' },
  { name: 'Eurogamer',         url: 'https://www.eurogamer.net/?format=rss',                             category: 'gaming', type: 'rss' },
  { name: 'PC Gamer',          url: 'https://www.pcgamer.com/rss/',                                      category: 'gaming', type: 'rss' },
  { name: 'Rock Paper Shotgun',url: 'https://www.rockpapershotgun.com/feed',                             category: 'gaming', type: 'rss' },
  { name: 'Game Developer',    url: 'https://www.gamedeveloper.com/rss.xml',                             category: 'gaming', type: 'rss' },
  { name: '80 Level',          url: 'https://80.lv/feed/',                                               category: 'gaming', type: 'rss' },
  // AI / Tech
  { name: 'The Verge AI',      url: 'https://www.theverge.com/ai-artificial-intelligence/rss/index.xml', category: 'ai',     type: 'rss' },
  { name: 'Wired',             url: 'https://www.wired.com/feed/rss',                                    category: 'ai',     type: 'rss' },
  { name: 'Hugging Face Blog', url: 'https://huggingface.co/blog/feed.xml',                              category: 'ai',     type: 'rss' },
  { name: "Simon Willison's Blog", url: 'https://simonwillison.net/atom/entries/',                       category: 'ai',     type: 'rss' },
  { name: 'The Decoder',       url: 'https://the-decoder.com/feed/',                                     category: 'ai',     type: 'rss' },
  { name: 'VentureBeat AI',    url: 'https://venturebeat.com/category/ai/feed/',                        category: 'ai',     type: 'rss' },
];

export const REDDIT_SOURCES: FeedSourceDef[] = [
  { name: 'r/games',           url: 'https://www.reddit.com/r/games',           category: 'gaming', type: 'reddit' },
  { name: 'r/gamedev',         url: 'https://www.reddit.com/r/gamedev',         category: 'gaming', type: 'reddit' },
  { name: 'r/artificial',      url: 'https://www.reddit.com/r/artificial',      category: 'ai',     type: 'reddit' },
  { name: 'r/LocalLLaMA',      url: 'https://www.reddit.com/r/LocalLLaMA',      category: 'ai',     type: 'reddit' },
  { name: 'r/MachineLearning', url: 'https://www.reddit.com/r/MachineLearning', category: 'ai',     type: 'reddit' },
];

// Special sources — no URL needed (fetched by their own parsers)
export const SPECIAL_SOURCES: FeedSourceDef[] = [
  { name: 'Bluesky',          url: '', category: 'general', type: 'bluesky' },
  { name: 'GitHub Trending',  url: '', category: 'general', type: 'github'  },
  { name: 'Steam',            url: '', category: 'gaming',  type: 'steam'   },
  { name: 'Hacker News',      url: '', category: 'ai',      type: 'hackernews' },
];

export const ALL_SOURCE_NAMES: string[] = [
  ...RSS_SOURCES.map((s) => s.name),
  ...REDDIT_SOURCES.map((s) => s.name),
  ...SPECIAL_SOURCES.map((s) => s.name),
];
