// lib/greeting.ts
import { GREETINGS, type GreetingMessage } from './greetings-library';
import type { TimeMode } from './time-mode';

export interface GreetingContext {
  mode: TimeMode;
  loadLevel: 'empty' | 'normal' | 'full' | 'overloaded';
  dayOfWeek: number;           // 0–6
  isAbsent: boolean;           // not opened in 3+ days
  milestone?: number;          // e.g. 30, 100
  recentlyShownIds: string[];  // IDs shown in last 30 days
}

/**
 * Selects the best greeting for the current context.
 * Priority: milestone > absent > specific mode+day > mode-only > load-level > generic
 * Never repeats a message within recentlyShownIds.
 */
export function selectGreeting(ctx: GreetingContext): GreetingMessage {
  const notRecent = (g: GreetingMessage) =>
    !ctx.recentlyShownIds.includes(g.id);

  // 1. Milestone (highest priority)
  if (ctx.milestone) {
    const m = GREETINGS.find(
      (g) => g.milestone === ctx.milestone && notRecent(g)
    );
    if (m) return m;
  }

  // 2. Absent
  if (ctx.isAbsent) {
    const pool = GREETINGS.filter((g) => g.isAbsent && notRecent(g));
    if (pool.length) return pickRandom(pool);
  }

  // 3. Mode + day of week (most specific)
  {
    const pool = GREETINGS.filter(
      (g) =>
        g.mode === ctx.mode &&
        g.dayOfWeek === ctx.dayOfWeek &&
        !g.loadLevel &&
        !g.isAbsent &&
        !g.milestone &&
        notRecent(g)
    );
    if (pool.length) return pickRandom(pool);
  }

  // 4. Mode only
  {
    const pool = GREETINGS.filter(
      (g) =>
        g.mode === ctx.mode &&
        g.dayOfWeek === undefined &&
        !g.loadLevel &&
        !g.isAbsent &&
        !g.milestone &&
        notRecent(g)
    );
    if (pool.length) return pickRandom(pool);
  }

  // 5. Load level
  {
    const pool = GREETINGS.filter(
      (g) => g.loadLevel === ctx.loadLevel && notRecent(g)
    );
    if (pool.length) return pickRandom(pool);
  }

  // 6. Generic fallback
  {
    const pool = GREETINGS.filter(
      (g) =>
        !g.mode &&
        !g.loadLevel &&
        !g.isAbsent &&
        !g.milestone &&
        !g.dayOfWeek &&
        notRecent(g)
    );
    if (pool.length) return pickRandom(pool);
  }

  // Last resort: ignore recency
  return pickRandom(GREETINGS);
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}
