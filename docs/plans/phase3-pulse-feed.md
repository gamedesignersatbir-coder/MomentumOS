# Phase 3: Pulse Feed Integration

## Context

Phase 2 (Learning Coach) is complete. Phase 3 brings the Pulse Feed into MomentumOS — a curated news surface for gaming + AI stories, redesigned from the standalone `pulse-feed` repo into a focused, personal feed.

The standalone repo (`github.com/gamedesignersatbir-coder/pulse-feed`) has all the hard parsing logic: RSS, Reddit, HN, deduplication, scoring. We reuse that logic (adapted into `lib/pulse/`) but replace the client-side-only architecture with a proper Next.js API route + SQLite-backed saved stories.

**Design decisions:**
- **20-story cap** — curated signal, not a firehose
- **No drama meter** — removed per vision; categorize by topic (gaming vs AI) not by controversy
- **No AI summaries** — use raw RSS descriptions (faster load, no extra API calls)
- **Ephemeral feed** — stories fetch live on page load / manual refresh; not cached to DB
- **Saved stories** — user can save a story to SQLite (persists); only saved items hit the DB
- **News-to-action bridge** — "→ Learn" on any story pre-fills the curriculum builder goal
- **New sources added**: Game Developer, 80 Level, Hugging Face Blog, Simon Willison's Blog, The Decoder
- **Sources excluded for now**: Bluesky (auth complexity), Steam (game news not design news), GitHub trending (not relevant), Twitter (not implemented in original)

---

## Architecture

```
/app/api/pulse/route.ts     — GET handler: aggregates all sources, deduplicates, returns top 20
/app/pulse/page.tsx         — Server Component shell (minimal — just passes saved count)
/app/pulse/actions.ts       — Server Actions: saveStory, unsaveStory
/components/pulse-feed.tsx  — Client Component: fetches /api/pulse, shows stories + filter tabs
/components/story-card.tsx  — Individual story card with save + learn actions
/lib/pulse/types.ts         — FeedItem, FeedSource TypeScript interfaces
/lib/pulse/sources.ts       — All source definitions (RSS URLs, Reddit subs, categories)
/lib/pulse/rss-parser.ts    — RSS + Reddit + HN fetchers (adapted from pulse-feed repo)
/lib/pulse/aggregator.ts    — Combines sources, deduplicates, scores by recency, caps at 20
```

**Modified files:**
- `lib/db.ts` — add `saved_stories` table + 3 query functions
- `components/nav.tsx` — add Pulse link (Rss icon)
- `app/globals.css` — minor utility additions if needed

---

## Data Model

### `saved_stories` table (new)
```sql
CREATE TABLE IF NOT EXISTS saved_stories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  url TEXT NOT NULL UNIQUE,
  source TEXT NOT NULL,
  category TEXT NOT NULL,       -- 'gaming' | 'ai' | 'general'
  summary TEXT NOT NULL DEFAULT '',
  saved_at TEXT NOT NULL        -- ISO timestamp
);
```

### `FeedItem` type (TypeScript)
```typescript
interface FeedItem {
  id: string;           // hash of url
  title: string;
  summary: string;      // from RSS description or HN/Reddit snippet
  url: string;
  source: string;       // "IGN", "Hugging Face Blog", etc.
  sourceType: 'rss' | 'reddit' | 'hackernews';
  category: 'gaming' | 'ai' | 'general';
  publishedAt: string;  // ISO string
  score?: number;       // Reddit/HN upvotes (shown as social signal)
  isSaved?: boolean;    // populated from DB on server render
}
```

---

## Sources

### Gaming RSS
| Source | RSS URL |
|--------|---------|
| IGN | https://feeds.feedburner.com/ign/games-all |
| Eurogamer | https://www.eurogamer.net/?format=rss |
| PC Gamer | https://www.pcgamer.com/rss/ |
| Rock Paper Shotgun | https://www.rockpapershotgun.com/feed |
| Game Developer | https://www.gamedeveloper.com/rss.xml |
| 80 Level | https://80.lv/feed/ |

### AI / Tech RSS
| Source | RSS URL |
|--------|---------|
| The Verge (AI tag) | https://www.theverge.com/ai-artificial-intelligence/rss/index.xml |
| Wired | https://www.wired.com/feed/rss |
| Hugging Face Blog | https://huggingface.co/blog/feed.xml |
| Simon Willison's Blog | https://simonwillison.net/atom/entries/ |
| The Decoder | https://the-decoder.com/feed/ |
| VentureBeat AI | https://venturebeat.com/category/ai/feed/ |

### Reddit (via JSON API — no auth needed)
| Subreddit | Category |
|-----------|---------|
| r/games | gaming |
| r/gamedev | gaming |
| r/artificial | ai |
| r/LocalLLaMA | ai |
| r/MachineLearning | ai |

### Hacker News (Algolia API)
- Query: `"AI" OR "LLM" OR "game design"` — top stories past 24h

---

## Tasks

### Task 1: Install `rss-parser`
```bash
npm install rss-parser
npm install --save-dev @types/rss-parser
```

### Task 2: `lib/pulse/types.ts`
- `FeedItem` interface (fields above)
- `FeedCategory` type: `'gaming' | 'ai' | 'general'`
- `FeedSourceDef` interface: `{ name, url, category, type }`

### Task 3: `lib/pulse/sources.ts`
- `RSS_SOURCES: FeedSourceDef[]` — all 12 RSS feeds above
- `REDDIT_SOURCES: FeedSourceDef[]` — 5 subreddits
- All sources typed, categories set correctly

### Task 4: `lib/pulse/rss-parser.ts`
- `fetchRSSFeed(source: FeedSourceDef): Promise<FeedItem[]>` — up to 10 items per source, normalizes to FeedItem
- `fetchRedditFeed(source: FeedSourceDef): Promise<FeedItem[]>` — uses Reddit JSON API (`subreddit.json?limit=10`), filters score < 10
- `fetchHackerNews(): Promise<FeedItem[]>` — Algolia HN API, top 10 AI/gamedev stories past 24h
- Each function handles errors gracefully (returns `[]` on failure — one broken source doesn't break the feed)

### Task 5: `lib/pulse/aggregator.ts`
- `aggregateFeed(): Promise<FeedItem[]>`
  1. Fetch all RSS + Reddit + HN in parallel (`Promise.allSettled`)
  2. Flatten into single array
  3. Deduplicate: exact URL, then title Jaccard similarity > 0.55
  4. Sort by `publishedAt` descending
  5. Cap at 20 stories
  6. Return

### Task 6: `/app/api/pulse/route.ts`
```typescript
export const dynamic = 'force-dynamic';
export async function GET() {
  const stories = await aggregateFeed();
  return Response.json(stories);
}
```
No auth needed — personal app on private network.

### Task 7: DB changes (`lib/db.ts`)
- Add `saved_stories` table creation in `initDB()`
- `getSavedStories(): SavedStory[]`
- `saveStory(item: Pick<FeedItem, 'title'|'url'|'source'|'category'|'summary'>): void`
- `unsaveStory(url: string): void`
- `isSaved(url: string): boolean`

### Task 8: `/app/pulse/actions.ts`
```typescript
'use server';
export async function saveStoryAction(story: {...}): Promise<{ ok: boolean }>
export async function unsaveStoryAction(url: string): Promise<{ ok: boolean }>
```
Both call `revalidatePath('/pulse')`.

### Task 9: `components/story-card.tsx` (Client Component)
- Title as link (opens in new tab)
- Source name + category badge (gaming = gold, ai = blue-grey)
- `publishedAt` as relative time ("2h ago")
- Reddit/HN score if present
- Two action buttons:
  - **Save** (bookmark icon) — calls `saveStoryAction`, toggles to saved state
  - **→ Learn** (external link icon) — `router.push('/learn?goal=' + encodeURIComponent(title))`
- Compact card, not bloated — just the essentials

### Task 10: `components/pulse-feed.tsx` (Client Component)
- On mount: `fetch('/api/pulse')` → sets stories state
- Loading state: skeleton cards (3 placeholder rows)
- Filter tabs: **All | Gaming | AI** — client-side filter of already-fetched stories
- Refresh button (top right) — re-fetches
- "X stories" count display
- Maps stories to `<StoryCard />`

### Task 11: `/app/pulse/page.tsx`
```typescript
import { getSavedStories } from '@/lib/db';
import { PulseFeed } from '@/components/pulse-feed';

export default function PulsePage() {
  const saved = getSavedStories();
  return (
    <main className="page-wrapper">
      <h1>Pulse</h1>
      <PulseFeed initialSaved={saved.map(s => s.url)} />
    </main>
  );
}
```
Passes saved URLs so story cards can render their initial saved state without waiting for client fetch.

### Task 12: Navigation update (`components/nav.tsx`)
- Add `{ href: '/pulse', label: 'Pulse', icon: Rss }` to LINKS array
- Import `Rss` from `lucide-react`

### Task 13: `/learn/new` — accept pre-filled goal from query param
**File**: `app/learn/new/page.tsx` (check if this accepts query params — read it first)
- If goal is passed as `?goal=...` query param, pre-fill the `goalStatement` textarea
- Simple: read `searchParams.goal` in the Server Component, pass as `defaultValue` to the form

---

## News-to-Action Flow

1. User reads a story on `/pulse`
2. Clicks "→ Learn" on a story card
3. Navigated to `/learn?goal=<story title>` (or `/learn/new` — check existing route)
4. The goal textarea is pre-filled with the story title
5. User can refine the goal and generate a curriculum

This is a one-tap bridge from news → structured learning.

---

## Verification

1. `npm run dev` → navigate to `/pulse` — feed loads with stories, no console errors
2. Filter tabs work: "Gaming" shows only gaming stories, "AI" shows only AI stories
3. Refresh button re-fetches (timestamp changes on stories)
4. Save button: saves a story → page reload still shows it saved
5. "→ Learn" on a story navigates to `/learn/new` (or `/learn`) with goal pre-filled
6. Saved stories page (optional: `/pulse/saved`) shows bookmarked items
7. `npx tsc --noEmit` — clean
8. `npm run build` — clean
9. Nav shows "Pulse" link, highlights correctly on `/pulse`
