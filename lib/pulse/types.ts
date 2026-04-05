export type FeedCategory = "ai" | "gaming" | "drama" | "breaking" | "social" | "general";

export type FeedSource =
  | "rss"
  | "reddit"
  | "twitter"
  | "hackernews"
  | "bluesky"
  | "github"
  | "steam";

export type TrendVelocity = "rising" | "stable" | "falling" | "new";

export type DramaLevel = "none" | "mild" | "spicy" | "nuclear";

export interface EngagementMetrics {
  score?: number;
  comments?: number;
  upvotes?: number;
  retweets?: number;
  likes?: number;
}

export interface FeedItem {
  id: string;
  title: string;
  summary: string;
  url: string;
  source: string;
  sourceType: FeedSource;
  category: FeedCategory;
  publishedAt: string; // ISO string
  imageUrl?: string;
  author?: string;
  redditUrl?: string; // Reddit/HN discussion link
  engagement: EngagementMetrics;
  dramaScore: number; // 0-100
  dramaLevel: DramaLevel;
  isBreaking: boolean;
  tags: string[];
  aiSummary?: string;
}

export interface FeedSourceConfig {
  id: string;
  name: string;
  url: string;
  type: FeedSource;
  category: FeedCategory;
  icon: string;
  color: string;
  enabled: boolean;
}

export type SortOrder = "importance" | "recent" | "engagement" | "drama";

export interface FilterState {
  categories: FeedCategory[];
  sources: FeedSource[];
  minDramaScore: number;
  breakingOnly: boolean;
  bookmarksOnly: boolean;
  searchQuery: string;
  sortOrder: SortOrder;
}

export interface TrendingTopic {
  topic: string;
  mentions: number;
  category: FeedCategory;
  dramaLevel: DramaLevel;
  relatedItems: string[]; // FeedItem IDs
  velocity: TrendVelocity;
  previousMentions: number;
}

export interface AppState {
  items: FeedItem[];
  trending: TrendingTopic[];
  filters: FilterState;
  isLoading: boolean;
  lastUpdated: string | null;
  autoRefresh: boolean;
  refreshInterval: number; // seconds
}

// Kept for internal parser use
export interface FeedSourceDef {
  name: string;
  url: string;
  category: FeedCategory;
  type: FeedSource;
}
