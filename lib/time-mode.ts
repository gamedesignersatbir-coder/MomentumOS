// lib/time-mode.ts

export type TimeMode =
  | 'quiet-morning'    // pre-8am   — sadhana
  | 'morning-brief'   // 8:00–8:59 — day starts
  | 'focus'           // 9:00–13:59 — deep work
  | 'quiet-afternoon' // 14:00–14:59 — sadhana
  | 'lunch'           // 15:00–15:29 — lunch
  | 'afternoon'       // 15:30–18:29 — lighter work
  | 'transition'      // 18:30–18:59 — commute home
  | 'evening'         // 19:00–20:59 — family + news
  | 'reflection'      // 21:00+      — nightly reflection

export function getTimeMode(date: Date = new Date()): TimeMode {
  const h = date.getHours();
  const m = date.getMinutes();
  const t = h * 60 + m; // total minutes since midnight

  if (t < 8 * 60)           return 'quiet-morning';
  if (t < 9 * 60)           return 'morning-brief';
  if (t < 14 * 60)          return 'focus';
  if (t < 15 * 60)          return 'quiet-afternoon';
  if (t < 15 * 60 + 30)     return 'lunch';
  if (t < 18 * 60 + 30)     return 'afternoon';
  if (t < 19 * 60)          return 'transition';
  if (t < 21 * 60)          return 'evening';
  return 'reflection';
}

export const QUIET_MODES: TimeMode[] = ['quiet-morning', 'quiet-afternoon'];

export function isQuietMode(mode: TimeMode): boolean {
  return QUIET_MODES.includes(mode);
}
