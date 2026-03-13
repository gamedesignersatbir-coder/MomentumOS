import type { TimeMode } from './time-mode';

// Matches the priorities table row
export interface Priority {
  id: number;
  title: string;
  detail: string;
  status: 'active' | 'done' | 'deferred';
  rank: number;
  intensity: 'Deep' | 'Steady' | 'Light' | null;
  created_at: string;
  updated_at: string;
}

/**
 * Returns the single most important active priority for the current time mode.
 *
 * In focus mode (9am–2pm): Light tasks are excluded from consideration
 *   (only excluded, not penalised — if Light is the only task, it still wins).
 * In afternoon mode (3:30–6:30pm): tasks sorted by intensity first
 *   (Steady → Light → Deep), then rank, then oldest updated_at.
 * All other modes: sort by rank ASC, tiebreak by oldest updated_at.
 */
export function getOneThing(
  priorities: Priority[],
  mode: TimeMode
): Priority | null {
  let candidates = priorities.filter((p) => p.status === 'active');
  if (!candidates.length) return null;

  // Focus mode: exclude Light tasks if non-Light alternatives exist
  if (mode === 'focus') {
    const nonLight = candidates.filter((p) => p.intensity !== 'Light');
    if (nonLight.length) candidates = nonLight;
    // else: all tasks are Light — fall through with full set
  }

  // Afternoon mode: intensity-first sort (Steady=0, Light=1, Deep=2, null=3)
  if (mode === 'afternoon') {
    const intensityOrder = { Steady: 0, Light: 1, Deep: 2 };
    return candidates.sort((a, b) => {
      const ia = intensityOrder[a.intensity ?? ''] ?? 3;
      const ib = intensityOrder[b.intensity ?? ''] ?? 3;
      if (ia !== ib) return ia - ib;
      if (a.rank !== b.rank) return a.rank - b.rank;
      return new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime();
    })[0];
  }

  // Default: rank ASC, tiebreak by oldest updated_at
  return candidates.sort((a, b) => {
    if (a.rank !== b.rank) return a.rank - b.rank;
    return new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime();
  })[0];
}
