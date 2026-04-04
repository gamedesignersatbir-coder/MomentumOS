// lib/time-mode.ts

export type TimeMode =
  | 'quiet-morning'    // pre work-start — morning sadhana
  | 'morning-brief'   // work-start to work-start+60
  | 'focus'           // morning-brief end to afternoon sadhana start
  | 'quiet-afternoon' // afternoon sadhana window
  | 'lunch'           // sadhana end to sadhana end+30
  | 'afternoon'       // lunch end to work end
  | 'transition'      // work end to work end+30
  | 'evening'         // transition end to reflection start (work end+90)
  | 'reflection'      // after evening

export interface UserSchedule {
  /** minutes since midnight, e.g. 480 = 08:00 */
  sadhana_morning_end: number;
  sadhana_afternoon_start: number;
  sadhana_afternoon_end: number;
  work_start: number;
  work_end: number;
}

export const DEFAULT_SCHEDULE: UserSchedule = {
  sadhana_morning_end: 480,      // 08:00
  sadhana_afternoon_start: 840,  // 14:00
  sadhana_afternoon_end: 900,    // 15:00
  work_start: 480,               // 08:00
  work_end: 1110,                // 18:30
};

export function getTimeMode(
  date: Date = new Date(),
  schedule: UserSchedule = DEFAULT_SCHEDULE
): TimeMode {
  const h = date.getHours();
  const m = date.getMinutes();
  const t = h * 60 + m;

  const {
    sadhana_morning_end,
    sadhana_afternoon_start,
    sadhana_afternoon_end,
    work_start,
    work_end,
  } = schedule;

  // Morning sadhana: midnight → morning sadhana ends
  if (t < sadhana_morning_end) return 'quiet-morning';

  // Morning brief: sadhana ends → work officially starts (1 hr window, min 30 min)
  // NOTE: morningBriefEnd must be < sadhana_afternoon_start for quiet-afternoon to be
  // reachable. The default schedule satisfies this (09:00 < 14:00). Unusual schedules
  // (very late work_start + early sadhana_afternoon_start) may skip quiet-afternoon.
  const morningBriefEnd = Math.max(sadhana_morning_end + 30, work_start + 60);
  if (t < morningBriefEnd) return 'morning-brief';

  // Focus: morning brief ends → afternoon sadhana starts
  if (t < sadhana_afternoon_start) return 'focus';

  // Afternoon sadhana
  if (t < sadhana_afternoon_end) return 'quiet-afternoon';

  // Lunch: sadhana ends → sadhana ends + 30 min
  const lunchEnd = sadhana_afternoon_end + 30;
  if (t < lunchEnd) return 'lunch';

  // Afternoon work: lunch ends → work day ends
  if (t < work_end) return 'afternoon';

  // Transition: work ends → work ends + 30 min
  const transitionEnd = work_end + 30;
  if (t < transitionEnd) return 'transition';

  // Evening: transition → work end + 90 min (≈ 2 hrs after end of day)
  const eveningEnd = work_end + 90;
  if (t < eveningEnd) return 'evening';

  return 'reflection';
}

export const QUIET_MODES: TimeMode[] = ['quiet-morning', 'quiet-afternoon'];

export function isQuietMode(mode: TimeMode): boolean {
  return QUIET_MODES.includes(mode);
}
