export interface SRState {
  n: number;            // successful review count (resets to 0 on quality < 3)
  ef: number;           // ease factor, starts at 2.5, floor 1.3
  intervalDays: number; // current review interval in days
}

/**
 * Simplified quality scale used in the UI:
 *   2 = "Not really"  (incorrect recall — resets sequence)
 *   3 = "Somewhat"    (correct but difficult)
 *   5 = "Yes clearly" (perfect recall)
 */
export function sm2Update(state: SRState, quality: 2 | 3 | 5): SRState {
  const { n, ef, intervalDays } = state;

  // EF update formula (standard SM-2)
  const newEf = Math.max(1.3, ef + 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));

  let newN: number;
  let newInterval: number;

  if (quality < 3) {
    // Incorrect — restart sequence
    newN = 0;
    newInterval = 1;
  } else {
    newN = n + 1;
    if (newN === 1) {
      newInterval = 1;
    } else if (newN === 2) {
      newInterval = 6;
    } else {
      newInterval = Math.round(intervalDays * newEf);
    }
  }

  return { n: newN, ef: newEf, intervalDays: newInterval };
}

export function initialSRState(): SRState {
  return { n: 0, ef: 2.5, intervalDays: 1 };
}

/** Add intervalDays to a YYYY-MM-DD date string and return the new date string. */
export function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
