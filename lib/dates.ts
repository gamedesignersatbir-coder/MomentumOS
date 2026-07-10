/**
 * All day/window math happens in the user's timezone (default Asia/Kolkata),
 * never the server's — the old app's dayKey used server-local time, which
 * only worked because the Mac Mini's clock was set to IST.
 */

export const DEFAULT_TZ = 'Asia/Kolkata';

/** YYYY-MM-DD in the given timezone. */
export function dayKey(tz: string, d: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
}

/** Hour of day (0–23) in the given timezone. */
export function hourIn(tz: string, d: Date = new Date()): number {
  return Number(
    new Intl.DateTimeFormat('en-GB', { timeZone: tz, hour: '2-digit', hour12: false }).format(d)
  );
}

/** Shift a YYYY-MM-DD key by whole days (timezone-independent). */
export function addDays(key: string, days: number): string {
  const [y, m, d] = key.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return dt.toISOString().slice(0, 10);
}

/**
 * Briefing windows: morning (08:00–17:59) and evening (18:00 onward).
 * Before 08:00 you see the previous evening's briefing — news can wait
 * for the morning; the app never demands attention at 6am.
 */
export function briefingWindow(tz: string, d: Date = new Date()): { key: string; nextLabel: string } {
  const day = dayKey(tz, d);
  const hour = hourIn(tz, d);
  if (hour < 8) return { key: `${addDays(day, -1)}-pm`, nextLabel: '8am' };
  if (hour < 18) return { key: `${day}-am`, nextLabel: '6pm' };
  return { key: `${day}-pm`, nextLabel: '8am tomorrow' };
}

/** 'YYYY-MM' for the month before the current one, in tz. */
export function previousMonthKey(tz: string, d: Date = new Date()): string {
  const [y, m] = dayKey(tz, d).split('-').map(Number);
  const py = m === 1 ? y - 1 : y;
  const pm = m === 1 ? 12 : m - 1;
  return `${py}-${String(pm).padStart(2, '0')}`;
}

export function monthName(monthKey: string): string {
  const [y, m] = monthKey.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleString('en-GB', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

/** Human date heading, e.g. "Friday · 10 July". */
export function dateHeading(tz: string, d: Date = new Date()): string {
  const weekday = new Intl.DateTimeFormat('en-GB', { timeZone: tz, weekday: 'long' }).format(d);
  const dayMonth = new Intl.DateTimeFormat('en-GB', { timeZone: tz, day: 'numeric', month: 'long' }).format(d);
  return `${weekday} · ${dayMonth}`;
}

export function timeAgo(iso: string): string {
  const mins = Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 60) return `${mins}m`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.round(hours / 24)}d`;
}
