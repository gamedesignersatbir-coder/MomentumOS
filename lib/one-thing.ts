import type { TimeMode } from './time-mode';
import type { EnergyPattern } from './types';

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
 * Returns the single most important active priority for the current time mode,
 * optionally boosted by historical energy patterns.
 *
 * Energy boost: if patterns show a preferred intensity for the current hour
 * (at least 2 completed blocks, highest completion rate), tasks matching that
 * intensity are sorted before tasks that don't — as a tiebreaker after rank.
 *
 * In focus mode (9am–2pm): Light tasks are excluded from consideration
 *   (only excluded, not penalised — if Light is the only task, it still wins).
 * In afternoon mode (3:30–6:30pm): tasks sorted by intensity first
 *   (Steady → Light → Deep), then rank, then oldest updated_at.
 * All other modes: sort by rank ASC, tiebreak by oldest updated_at.
 */
export function getOneThing(
  priorities: Priority[],
  mode: TimeMode,
  energyPatterns?: EnergyPattern[]
): Priority | null {
  let candidates = priorities.filter((p) => p.status === 'active');
  if (!candidates.length) return null;

  // Focus mode: exclude Light tasks if non-Light alternatives exist
  if (mode === 'focus') {
    const nonLight = candidates.filter((p) => p.intensity !== 'Light');
    if (nonLight.length) candidates = nonLight;
    // else: all tasks are Light — fall through with full set
  }

  // Derive preferred intensity for this hour from historical patterns
  let preferredIntensity: 'Deep' | 'Steady' | 'Light' | null = null;
  if (energyPatterns?.length) {
    const currentHour = new Date().getHours();
    const hourPatterns = energyPatterns
      .filter((p) => p.hour === currentHour && p.count >= 2)
      .sort((a, b) => b.completionRate - a.completionRate);
    if (hourPatterns.length > 0) preferredIntensity = hourPatterns[0].intensity;
  }

  // Afternoon mode: intensity-first sort (Steady=0, Light=1, Deep=2, null=3)
  if (mode === 'afternoon') {
    const intensityOrder: Record<string, number> = { Steady: 0, Light: 1, Deep: 2 };
    return candidates.sort((a, b) => {
      const ia = intensityOrder[a.intensity ?? ''] ?? 3;
      const ib = intensityOrder[b.intensity ?? ''] ?? 3;
      if (ia !== ib) return ia - ib;
      // Energy boost as tiebreaker within same intensity tier
      if (preferredIntensity) {
        const am = a.intensity === preferredIntensity ? 0 : 1;
        const bm = b.intensity === preferredIntensity ? 0 : 1;
        if (am !== bm) return am - bm;
      }
      if (a.rank !== b.rank) return a.rank - b.rank;
      return new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime();
    })[0];
  }

  // Default: rank ASC, energy boost as tiebreaker, then oldest updated_at
  return candidates.sort((a, b) => {
    if (a.rank !== b.rank) return a.rank - b.rank;
    if (preferredIntensity) {
      const am = a.intensity === preferredIntensity ? 0 : 1;
      const bm = b.intensity === preferredIntensity ? 0 : 1;
      if (am !== bm) return am - bm;
    }
    return new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime();
  })[0];
}
