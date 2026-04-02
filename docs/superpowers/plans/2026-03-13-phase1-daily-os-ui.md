# Phase 1: Daily OS UI Redesign Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the existing MomentumOS into a beautiful, time-aware, calm personal OS that Satbir actually opens every day — with an adaptive UI, greeting personality, Today's One Thing focus, and anti-paralysis features.

**Architecture:** A logic-first approach — build and test all the core engines (time mode, greeting selection, one-thing algorithm) as pure TypeScript modules first, then wire them into new React components, then apply the full visual redesign pass last. The existing dashboard is refactored incrementally rather than rewritten.

**Tech Stack:** Next.js 16, React 19, TypeScript 5, Tailwind CSS 4, SQLite (node:sqlite DatabaseSync), Node built-in test runner (.test.mjs), date-fns, Lucide React icons.

**Spec reference:** `docs/superpowers/specs/2026-03-13-momentumos-unified-life-os-design.md`

**Phases 2–5** (Learning Coach, Pulse Feed, Deployment, Intelligence) have separate plans.

---

## File Structure

### New files to create
```
lib/
  time-mode.ts          # Time mode calculation — pure function, no side effects
  one-thing.ts          # Today's One Thing algorithm — pure function
  greeting.ts           # Greeting message selection logic
  greetings-library.ts  # The 40 hand-crafted greeting messages
  db-migrations.ts      # Schema migration runner (additive migrations only)

components/
  quiet-mode.tsx          # Full-screen sadhana overlay
  greeting-bar.tsx        # Top greeting message display
  one-thing-card.tsx      # The prominent single-task card
  stuck-overlay.tsx       # "I'm Stuck" button + collapse overlay
  triage-modal.tsx        # Anti-overwhelm triage (Keep/Defer)
  soft-close-modal.tsx    # Evening sweep + tomorrow seed
  quick-capture.tsx       # Keyboard-shortcut capture input

tests/
  time-mode.test.mjs      # Tests for getTimeMode()
  one-thing.test.mjs      # Tests for getOneThing()
  greeting.test.mjs       # Tests for selectGreeting()
```

### Files to modify
```
lib/db.ts                        # Add user_profile + greeting_history tables/queries
lib/types.ts                     # Add TimeMode, GreetingMessage, UserProfile types
app/actions.ts                   # Add deferTask, softClose, quickCapture actions
app/globals.css                  # Complete design token + typography redesign
components/momentum-dashboard.tsx # Integrate new components, wire time mode
app/page.tsx                     # Pass user_profile to dashboard
```

---

## Chunk 1: Core Logic Engines

*Pure TypeScript — no UI. Everything here is testable in isolation.*

---

### Task 1: Time Mode Engine

**Files:**
- Create: `lib/time-mode.ts`
- Create: `tests/time-mode.test.mjs`

- [ ] **Step 1: Create the test file**

```javascript
// tests/time-mode.test.mjs
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

// ESM import — compiled TypeScript runs via tsx in test script
const { getTimeMode } = await import('../lib/time-mode.ts');

function makeDate(hours, minutes = 0) {
  const d = new Date();
  d.setHours(hours, minutes, 0, 0);
  return d;
}

describe('getTimeMode', () => {
  it('returns quiet-morning before 8am', () => {
    assert.equal(getTimeMode(makeDate(7, 30)), 'quiet-morning');
    assert.equal(getTimeMode(makeDate(0, 0)), 'quiet-morning');
    assert.equal(getTimeMode(makeDate(7, 59)), 'quiet-morning');
  });

  it('returns morning-brief 8:00–8:59', () => {
    assert.equal(getTimeMode(makeDate(8, 0)), 'morning-brief');
    assert.equal(getTimeMode(makeDate(8, 30)), 'morning-brief');
    assert.equal(getTimeMode(makeDate(8, 59)), 'morning-brief');
  });

  it('returns focus 9:00–13:59', () => {
    assert.equal(getTimeMode(makeDate(9, 0)), 'focus');
    assert.equal(getTimeMode(makeDate(12, 0)), 'focus');
    assert.equal(getTimeMode(makeDate(13, 59)), 'focus');
  });

  it('returns quiet-afternoon 14:00–14:59', () => {
    assert.equal(getTimeMode(makeDate(14, 0)), 'quiet-afternoon');
    assert.equal(getTimeMode(makeDate(14, 59)), 'quiet-afternoon');
  });

  it('returns lunch 15:00–15:29', () => {
    assert.equal(getTimeMode(makeDate(15, 0)), 'lunch');
    assert.equal(getTimeMode(makeDate(15, 29)), 'lunch');
  });

  it('returns afternoon 15:30–18:29', () => {
    assert.equal(getTimeMode(makeDate(15, 30)), 'afternoon');
    assert.equal(getTimeMode(makeDate(18, 0)), 'afternoon');
    assert.equal(getTimeMode(makeDate(18, 29)), 'afternoon');
  });

  it('returns transition 18:30–18:59', () => {
    assert.equal(getTimeMode(makeDate(18, 30)), 'transition');
    assert.equal(getTimeMode(makeDate(18, 59)), 'transition');
  });

  it('returns evening 19:00–20:59', () => {
    assert.equal(getTimeMode(makeDate(19, 0)), 'evening');
    assert.equal(getTimeMode(makeDate(20, 59)), 'evening');
  });

  it('returns reflection 21:00+', () => {
    assert.equal(getTimeMode(makeDate(21, 0)), 'reflection');
    assert.equal(getTimeMode(makeDate(23, 59)), 'reflection');
  });
});
```

- [ ] **Step 2: Run test — verify it fails** (module doesn't exist yet)

```bash
cd "E:\AI Data\ClaudeCode\MomentumOS"
npx tsx --test tests/time-mode.test.mjs 2>&1 | head -20
```
Expected: error — `Cannot find module '../lib/time-mode.ts'`

- [ ] **Step 3: Create `lib/time-mode.ts`**

```typescript
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
```

- [ ] **Step 4: Run test — verify it passes**

```bash
npx tsx --test tests/time-mode.test.mjs
```
Expected: all tests pass, `▶ getTimeMode` with subtests OK

- [ ] **Step 5: Commit**

```bash
git add lib/time-mode.ts tests/time-mode.test.mjs
git commit -m "feat: add time mode engine with full test coverage"
```

---

### Task 2: Today's One Thing Algorithm

**Files:**
- Create: `lib/one-thing.ts`
- Create: `tests/one-thing.test.mjs`
- Modify: `lib/types.ts` — add `TimeMode` re-export

- [ ] **Step 1: Add Priority type check — read existing types**

Open `lib/types.ts` and confirm the `Priority` interface fields. It should have: `id`, `title`, `detail`, `status` ('active' | 'done'), `rank`, `created_at`.

- [ ] **Step 2: Create the test file**

```javascript
// tests/one-thing.test.mjs
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

const { getOneThing } = await import('../lib/one-thing.ts');

function makePriority(overrides = {}) {
  return {
    id: Math.random(),
    title: 'Test task',
    detail: '',
    status: 'active',
    rank: 1,
    intensity: null,
    created_at: '2026-03-10T08:00:00Z',
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

describe('getOneThing', () => {
  it('returns null when no priorities', () => {
    assert.equal(getOneThing([], 'focus'), null);
  });

  it('returns null when all priorities are done', () => {
    const done = [makePriority({ status: 'done' })];
    assert.equal(getOneThing(done, 'focus'), null);
  });

  it('returns the lowest-rank active priority', () => {
    const p1 = makePriority({ rank: 2, title: 'Second' });
    const p2 = makePriority({ rank: 1, title: 'First' });
    const result = getOneThing([p1, p2], 'focus');
    assert.equal(result?.title, 'First');
  });

  it('tiebreaks by oldest updated_at (least recently touched)', () => {
    const older = makePriority({
      rank: 1,
      title: 'Not touched in a while',
      updated_at: '2026-03-01T08:00:00Z',
    });
    const newer = makePriority({
      rank: 1,
      title: 'Recently edited',
      updated_at: '2026-03-10T08:00:00Z',
    });
    const result = getOneThing([newer, older], 'focus');
    assert.equal(result?.title, 'Not touched in a while');
  });

  it('ignores done tasks', () => {
    const done = makePriority({ rank: 1, status: 'done', title: 'Done' });
    const active = makePriority({ rank: 2, status: 'active', title: 'Active' });
    const result = getOneThing([done, active], 'focus');
    assert.equal(result?.title, 'Active');
  });

  it('excludes Light tasks in focus mode', () => {
    const light = makePriority({ rank: 1, title: 'Light task', intensity: 'Light' });
    const deep  = makePriority({ rank: 2, title: 'Deep task',  intensity: 'Deep'  });
    const result = getOneThing([light, deep], 'focus');
    assert.equal(result?.title, 'Deep task');
  });

  it('returns Light task if it is the only task in focus mode', () => {
    const light = makePriority({ rank: 1, title: 'Only task', intensity: 'Light' });
    const result = getOneThing([light], 'focus');
    assert.equal(result?.title, 'Only task');
  });

  it('prefers Steady over Deep in afternoon mode', () => {
    const deep   = makePriority({ rank: 1, title: 'Deep task',   intensity: 'Deep'   });
    const steady = makePriority({ rank: 2, title: 'Steady task', intensity: 'Steady' });
    const result = getOneThing([deep, steady], 'afternoon');
    assert.equal(result?.title, 'Steady task');
  });

  it('returns the one thing in quiet modes ignoring intensity', () => {
    const p = makePriority({ rank: 1, title: 'Only task' });
    assert.equal(getOneThing([p], 'quiet-morning')?.title, 'Only task');
  });
});
```

- [ ] **Step 3: Run test — verify it fails**

```bash
npx tsx --test tests/one-thing.test.mjs 2>&1 | head -10
```
Expected: `Cannot find module '../lib/one-thing.ts'`

- [ ] **Step 4: Create `lib/one-thing.ts`**

Note: The existing `priorities` table does not have `intensity` or `updated_at` columns. Before creating this file, check `lib/db.ts` — if `updated_at` and `intensity` are absent from the CREATE TABLE statement for `priorities`, add them now:

```sql
-- Add to priorities CREATE TABLE if missing:
intensity TEXT CHECK(intensity IN ('Deep','Steady','Light')) DEFAULT NULL,
updated_at TEXT NOT NULL DEFAULT (datetime('now'))
```

Also add a DB trigger so `updated_at` stays current:

```sql
CREATE TRIGGER IF NOT EXISTS priorities_updated_at
AFTER UPDATE ON priorities
BEGIN
  UPDATE priorities SET updated_at = datetime('now') WHERE id = NEW.id;
END;
```

Then create the module:

```typescript
// lib/one-thing.ts
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
```

- [ ] **Step 5: Run test — verify it passes**

```bash
npx tsx --test tests/one-thing.test.mjs
```
Expected: all 9 tests pass

- [ ] **Step 6: Commit**

```bash
git add lib/one-thing.ts tests/one-thing.test.mjs
git commit -m "feat: add Today's One Thing algorithm with tests"
```

---

### Task 3: Greeting Message Library + Selection Logic

**Files:**
- Create: `lib/greetings-library.ts`
- Create: `lib/greeting.ts`
- Create: `tests/greeting.test.mjs`

- [ ] **Step 1: Create `lib/greetings-library.ts`** — the 40 hand-crafted messages

```typescript
// lib/greetings-library.ts

export interface GreetingMessage {
  id: string;
  text: string;
  // All context flags are optional — message matches if ALL provided flags match
  mode?: string;          // TimeMode value
  loadLevel?: string;     // 'empty' | 'normal' | 'full' | 'overloaded'
  dayOfWeek?: number;     // 0=Sun, 1=Mon ... 6=Sat
  isAbsent?: boolean;     // true = user hasn't opened in 3+ days
  milestone?: number;     // day number (30, 100, etc.)
}

export const GREETINGS: GreetingMessage[] = [
  // --- QUIET / SADHANA ---
  {
    id: 'quiet-1',
    text: "This is your reflection time. Everything here will wait.",
    mode: 'quiet-morning',
  },
  {
    id: 'quiet-2',
    text: "Morning practice. The tasks are patient.",
    mode: 'quiet-morning',
  },
  {
    id: 'quiet-3',
    text: "Your afternoon session. The world can wait fifteen more minutes.",
    mode: 'quiet-afternoon',
  },
  {
    id: 'quiet-4',
    text: "Second session. The to-do list has not run away.",
    mode: 'quiet-afternoon',
  },

  // --- MORNING BRIEF ---
  {
    id: 'morning-1',
    text: "Morning. Three things. One direction. Let's see what today is made of.",
    mode: 'morning-brief',
  },
  {
    id: 'morning-2',
    text: "The day has begun. It has opinions. So do you. Shall we negotiate?",
    mode: 'morning-brief',
  },
  {
    id: 'morning-3',
    text: "Good morning. The universe is prepared. Are you?",
    mode: 'morning-brief',
  },
  {
    id: 'morning-monday',
    text: "It's Monday. The universe is aware. So are you. Advantage: you.",
    mode: 'morning-brief',
    dayOfWeek: 1,
  },
  {
    id: 'morning-friday',
    text: "Friday morning. The finish line is visible. Don't look at it too long.",
    mode: 'morning-brief',
    dayOfWeek: 5,
  },

  // --- FOCUS MODE ---
  {
    id: 'focus-1',
    text: "Deep work window. The internet will still be there later. Probably.",
    mode: 'focus',
  },
  {
    id: 'focus-2',
    text: "This is your best time. Use it on the thing that deserves it.",
    mode: 'focus',
  },
  {
    id: 'focus-3',
    text: "Two hours of undivided attention is worth a day of half-attention. Begin.",
    mode: 'focus',
  },

  // --- LUNCH ---
  {
    id: 'lunch-1',
    text: "Lunch. The rare moment when being unproductive is, in fact, the most productive thing you can do.",
    mode: 'lunch',
  },
  {
    id: 'lunch-2',
    text: "Midday pause. Rest is not the opposite of work — it's the fuel.",
    mode: 'lunch',
  },

  // --- AFTERNOON ---
  {
    id: 'afternoon-1',
    text: "Afternoon session. Lighter work suits this hour. The brain knows.",
    mode: 'afternoon',
  },
  {
    id: 'afternoon-2',
    text: "Second wind. Use it wisely — it's more reliable than the first.",
    mode: 'afternoon',
  },
  {
    id: 'afternoon-3',
    text: "The day is gathering itself. What needs wrapping up?",
    mode: 'afternoon',
  },

  // --- EVENING ---
  {
    id: 'evening-1',
    text: "Home time. The work can wait. The people cannot.",
    mode: 'evening',
  },
  {
    id: 'evening-2',
    text: "Evening. The news is in. The family is better.",
    mode: 'evening',
  },
  {
    id: 'evening-3',
    text: "This hour belongs to you, not the job. Don't let it steal it.",
    mode: 'evening',
  },

  // --- REFLECTION ---
  {
    id: 'reflection-1',
    text: "End of day. What actually happened? Let's find out.",
    mode: 'reflection',
  },
  {
    id: 'reflection-2',
    text: "Night comes with questions. Tonight: what moved?",
    mode: 'reflection',
  },
  {
    id: 'reflection-3',
    text: "The day is closing its accounts. A few minutes to settle them.",
    mode: 'reflection',
  },

  // --- LOAD LEVEL: EMPTY ---
  {
    id: 'empty-1',
    text: "The to-do list is suspiciously empty. Either you've conquered everything, or you haven't started yet.",
    loadLevel: 'empty',
  },
  {
    id: 'empty-2',
    text: "Nothing here yet. The canvas is yours.",
    loadLevel: 'empty',
  },

  // --- LOAD LEVEL: OVERLOADED ---
  {
    id: 'full-1',
    text: "The to-do list has been training. It is in excellent shape. You, meanwhile, might want a triage.",
    loadLevel: 'overloaded',
  },
  {
    id: 'full-2',
    text: "There are more things here than hours. One of them is not the problem.",
    loadLevel: 'overloaded',
  },

  // --- ABSENT (3+ days away) ---
  {
    id: 'absent-1',
    text: "You're back. The app kept everything warm.",
    isAbsent: true,
  },
  {
    id: 'absent-2',
    text: "A few days away. Nothing burned down. Welcome back.",
    isAbsent: true,
  },

  // --- MILESTONE: DAY 30 ---
  {
    id: 'milestone-30',
    text: "Thirty days. The Stoics would be impressed. So would your future self.",
    milestone: 30,
  },

  // --- MILESTONE: DAY 100 ---
  {
    id: 'milestone-100',
    text: "One hundred days. That's not a habit — that's a life.",
    milestone: 100,
  },

  // --- GENERIC FALLBACKS (no context required) ---
  {
    id: 'generic-1',
    text: "Every good day starts with knowing what it's for.",
  },
  {
    id: 'generic-2',
    text: "One clear priority is worth three vague ones. Always.",
  },
  {
    id: 'generic-3',
    text: "The work is here when you're ready.",
  },
  {
    id: 'generic-4',
    text: "Progress, not perfection. The list will still be here tomorrow.",
  },
  {
    id: 'generic-5',
    text: "You know more than you think you do. Begin.",
  },
  {
    id: 'generic-6',
    text: "A day well-used is better than a day well-planned.",
  },
  {
    id: 'generic-7',
    text: "Curiosity is not distraction. It's just enthusiasm without direction yet.",
  },
  {
    id: 'generic-8',
    text: "Today is, technically, a new day. All evidence suggests it will cooperate.",
  },
];
```

Also add one more message to reach exactly 40 (add to the generic section):

```typescript
  {
    id: 'generic-9',
    text: "The sadhana is done. The mind is clear. Now — what deserves that clarity?",
  },
```

- [ ] **Step 2: Create `tests/greeting.test.mjs`** — write the test BEFORE the implementation

```javascript
// tests/greeting.test.mjs
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

const { selectGreeting } = await import('../lib/greeting.ts');

function baseCtx(overrides = {}) {
  return {
    mode: 'focus',
    loadLevel: 'normal',
    dayOfWeek: 2,
    isAbsent: false,
    recentlyShownIds: [],
    ...overrides,
  };
}

describe('selectGreeting', () => {
  it('always returns a greeting object with id and text', () => {
    const g = selectGreeting(baseCtx());
    assert.ok(g.id, 'should have id');
    assert.ok(g.text.length > 0, 'should have text');
  });

  it('returns milestone greeting when milestone matches', () => {
    const g = selectGreeting(baseCtx({ milestone: 30 }));
    assert.equal(g.milestone, 30);
  });

  it('returns absent greeting when isAbsent is true', () => {
    const g = selectGreeting(baseCtx({ isAbsent: true }));
    assert.equal(g.isAbsent, true);
  });

  it('returns mode-specific greeting for quiet modes', () => {
    const g = selectGreeting(baseCtx({ mode: 'quiet-morning' }));
    assert.equal(g.mode, 'quiet-morning');
  });

  it('avoids recently shown IDs', () => {
    const ctx = baseCtx({ mode: 'quiet-morning' });
    const allIds = new Set();
    for (let i = 0; i < 10; i++) {
      const g = selectGreeting({ ...ctx, recentlyShownIds: [] });
      allIds.add(g.id);
    }
    const ids = [...allIds];
    if (ids.length >= 2) {
      const excluded = ids[0];
      const g = selectGreeting({ ...ctx, recentlyShownIds: [excluded] });
      assert.notEqual(g.id, excluded);
    }
  });

  it('falls back to generic when all specific messages are recent', () => {
    const g = selectGreeting(
      baseCtx({
        mode: 'focus',
        recentlyShownIds: ['focus-1', 'focus-2', 'focus-3'],
      })
    );
    assert.ok(g.text.length > 0);
  });
});
```

- [ ] **Step 2a: Run test — verify it fails** (greeting.ts doesn't exist yet)

```bash
npx tsx --test tests/greeting.test.mjs 2>&1 | head -10
```
Expected: error — `Cannot find module '../lib/greeting.ts'`

- [ ] **Step 3: Create `lib/greeting.ts`** — selection logic

```typescript
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
```

- [ ] **Step 4: Run test — verify it passes**

```bash
npx tsx --test tests/greeting.test.mjs
```
Expected: all 5 tests pass

- [ ] **Step 5: Commit**

```bash
git add lib/greetings-library.ts lib/greeting.ts tests/greeting.test.mjs
git commit -m "feat: add greeting library (40 messages) and selection logic"
```

---

### Task 4: DB Schema — user_profile + greeting_history

**Files:**
- Modify: `lib/db.ts` — add two new tables and their query functions
- Modify: `lib/types.ts` — add `UserProfile` type

- [ ] **Step 1: Add `UserProfile` to `lib/types.ts`**

Open `lib/types.ts` and append:

```typescript
export interface UserProfile {
  id: number;
  display_name: string;
  timezone: string;                  // IANA timezone e.g. 'Asia/Kolkata'
  sadhana_morning_end: number;       // minutes since midnight, default 480 (8am)
  sadhana_afternoon_start: number;   // default 840 (2pm)
  sadhana_afternoon_end: number;     // default 900 (3pm)
  work_start: number;                // default 480 (8am)
  work_end: number;                  // default 1110 (6:30pm)
  domains_json: string;              // JSON array e.g. '["AI","game design","gaming"]'
  about_me: string;                  // injected into AI prompts
  created_at: string;
  updated_at: string;
}
```

- [ ] **Step 2: Add tables and queries to `lib/db.ts`**

Find the section where tables are created (the `db.exec(` block that creates the initial schema) and add after the existing table creation:

```typescript
// Add to the db.exec() schema creation block:
db.exec(`
  CREATE TABLE IF NOT EXISTS user_profile (
    id INTEGER PRIMARY KEY,
    display_name TEXT NOT NULL DEFAULT 'Satbir',
    timezone TEXT NOT NULL DEFAULT 'Asia/Kolkata',
    sadhana_morning_end INTEGER NOT NULL DEFAULT 480,
    sadhana_afternoon_start INTEGER NOT NULL DEFAULT 840,
    sadhana_afternoon_end INTEGER NOT NULL DEFAULT 900,
    work_start INTEGER NOT NULL DEFAULT 480,
    work_end INTEGER NOT NULL DEFAULT 1110,
    domains_json TEXT NOT NULL DEFAULT '["AI","game design","gaming","tech"]',
    about_me TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  -- Note: column is named message_id (not message_hash as in the spec schema).
  -- message_id stores the string ID from greetings-library.ts directly,
  -- which is more practical than hashing. The spec's message_hash is superseded here.
  CREATE TABLE IF NOT EXISTS greeting_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    message_id TEXT NOT NULL,
    shown_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

// Seed default profile if none exists
const profileCount = db.prepare(
  'SELECT COUNT(*) as count FROM user_profile'
).get() as { count: number };
if (profileCount.count === 0) {
  db.prepare(`
    INSERT INTO user_profile (id, display_name, timezone, about_me)
    VALUES (1, 'Satbir', 'Asia/Kolkata', 'Game designer. Meditator. Curious about AI and game design.')
  `).run();
}
```

Then add the query functions at the bottom of `lib/db.ts`:

```typescript
// --- User Profile ---

export function getUserProfile(): UserProfile | null {
  return db
    .prepare('SELECT * FROM user_profile WHERE id = 1')
    .get() as UserProfile | null;
}

export function updateUserProfile(updates: Partial<Omit<UserProfile, 'id' | 'created_at'>>): void {
  const fields = Object.keys(updates)
    .map((k) => `${k} = ?`)
    .join(', ');
  const values = [...Object.values(updates), new Date().toISOString()];
  db.prepare(
    `UPDATE user_profile SET ${fields}, updated_at = ? WHERE id = 1`
  ).run(...values);
}

// --- Greeting History ---

export function getRecentGreetingIds(withinDays = 30): string[] {
  const cutoff = new Date(Date.now() - withinDays * 86400 * 1000).toISOString();
  const rows = db
    .prepare(
      'SELECT message_id FROM greeting_history WHERE shown_at > ? ORDER BY shown_at DESC'
    )
    .all(cutoff) as { message_id: string }[];
  return rows.map((r) => r.message_id);
}

export function recordGreetingShown(messageId: string): void {
  db.prepare(
    'INSERT INTO greeting_history (message_id) VALUES (?)'
  ).run(messageId);
}
```

- [ ] **Step 3: Verify types and build**

```bash
npm run typecheck
```
Expected: zero TypeScript errors. If `typecheck` script is not in package.json, run `npx tsc --noEmit` instead. Fix any errors before proceeding. Then confirm the dev server still starts:

```bash
npm run dev
```
Expected: starts on `localhost:3000`, dashboard loads.

- [ ] **Step 4: Commit**

```bash
git add lib/db.ts lib/types.ts
git commit -m "feat: add user_profile and greeting_history DB tables with queries"
```

---

## Chunk 2: Core UI Components

*Build the new components that define the new interface. No visual redesign yet — just structure and wiring.*

---

### Task 5: Greeting Bar Component

**Files:**
- Create: `components/greeting-bar.tsx`
- Modify: `app/page.tsx` — fetch greeting data server-side
- Modify: `app/actions.ts` — add `recordGreetingAction`

- [ ] **Step 1: Create `components/greeting-bar.tsx`**

```tsx
// components/greeting-bar.tsx
'use client';

import { useEffect, useState } from 'react';
import type { GreetingMessage } from '@/lib/greetings-library';

interface Props {
  initialGreeting: GreetingMessage;
  onShown: (id: string) => Promise<void>;
}

export function GreetingBar({ initialGreeting, onShown }: Props) {
  const [greeting] = useState(initialGreeting);

  useEffect(() => {
    // Record that this greeting was shown.
    // onShown is a Server Action reference — stable across renders.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    onShown(greeting.id).catch(console.error);
  }, [greeting.id]); // onShown intentionally omitted — Server Actions are stable

  return (
    <div className="greeting-bar">
      <p className="greeting-text">{greeting.text}</p>
    </div>
  );
}
```

- [ ] **Step 2: Add `recordGreetingAction` to `app/actions.ts`**

Open `app/actions.ts` and add at the bottom:

```typescript
import { recordGreetingShown } from '@/lib/db';

export async function recordGreetingAction(messageId: string): Promise<void> {
  'use server';
  recordGreetingShown(messageId);
}
```

- [ ] **Step 3: Wire greeting into `app/page.tsx`**

Open `app/page.tsx`. It currently calls `getDashboardData()` and passes the result to the dashboard. Add greeting selection:

```typescript
// app/page.tsx
import { getDashboardData, getUserProfile, getRecentGreetingIds } from '@/lib/db';
import { getTimeMode } from '@/lib/time-mode';
import { selectGreeting } from '@/lib/greeting';
import MomentumDashboard from '@/components/momentum-dashboard';

export default function Home() {
  const data = getDashboardData();
  const profile = getUserProfile();
  const recentIds = getRecentGreetingIds(30);

  const mode = getTimeMode(); // uses server time — acceptable for IST
  // Note: this is an intentionally synchronous Server Component — all DB calls
  // use DatabaseSync from node:sqlite. Do NOT add async/await here.
  const activeCount =
    data.priorities.filter((p) => p.status === 'active').length +
    data.quickTasks.filter((t) => t.status === 'active').length;

  const loadLevel =
    activeCount === 0 ? 'empty'
    : activeCount > 8 ? 'overloaded'
    : activeCount > 5 ? 'full'
    : 'normal';

  const greeting = selectGreeting({
    mode,
    loadLevel,
    dayOfWeek: new Date().getDay(),
    isAbsent: false, // TODO Phase 5: detect from last_opened timestamp
    recentlyShownIds: recentIds,
  });

  return (
    <MomentumDashboard
      data={data}
      greeting={greeting}
      currentMode={mode}
      userProfile={profile}
    />
  );
}
```

- [ ] **Step 3b: Remove LIMIT cap from `getDashboardData()` in `lib/db.ts`**

Open `lib/db.ts`. Find the `getDashboardData` function. The priorities query has `LIMIT 3` — this silently breaks the One Thing algorithm (it can never see rank-4+ tasks) and makes the overload triage count inaccurate. Remove the LIMIT:

```sql
-- Change:
SELECT id, title, detail, status, rank FROM priorities ORDER BY rank ASC, id ASC LIMIT 3
-- To:
SELECT id, title, detail, status, rank, intensity, updated_at FROM priorities ORDER BY rank ASC, id ASC
```

Also update the quick_tasks query if it has a LIMIT cap, increasing it or removing it. The dashboard will now receive all active tasks; the Top-3 display cap is handled by the UI (Task 13), not the DB query.

- [ ] **Step 4: Update `MomentumDashboard` props signature**

Open `components/momentum-dashboard.tsx`. Find the `Props` interface at the top and add the new props:

```typescript
import type { TimeMode } from '@/lib/time-mode';
import type { GreetingMessage } from '@/lib/greetings-library';
import type { UserProfile } from '@/lib/types';

interface Props {
  data: DashboardData;
  greeting: GreetingMessage;         // NEW
  currentMode: TimeMode;             // NEW
  userProfile: UserProfile | null;   // NEW
}
```

Update the function signature to accept them. The existing dashboard can ignore them for now — they'll be wired into the UI in subsequent tasks.

- [ ] **Step 5: Verify build passes**

```bash
npm run build 2>&1 | tail -20
```
Expected: build succeeds. Fix any TypeScript errors before proceeding.

- [ ] **Step 6: Commit**

```bash
git add components/greeting-bar.tsx app/page.tsx app/actions.ts components/momentum-dashboard.tsx
git commit -m "feat: add greeting bar component and wire greeting into page"
```

---

### Task 6: Quiet Mode Overlay

**Files:**
- Create: `components/quiet-mode.tsx`
- Modify: `components/momentum-dashboard.tsx` — render quiet mode when appropriate

- [ ] **Step 1: Create `components/quiet-mode.tsx`**

```tsx
// components/quiet-mode.tsx
import type { GreetingMessage } from '@/lib/greetings-library';

interface Props {
  greeting: GreetingMessage;
}

export function QuietMode({ greeting }: Props) {
  return (
    <div className="quiet-mode-overlay">
      <div className="quiet-mode-content">
        <div className="quiet-mode-icon" aria-hidden="true">◦</div>
        <p className="quiet-mode-text">{greeting.text}</p>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Wire into `components/momentum-dashboard.tsx`**

At the top of the `MomentumDashboard` render return, add:

```tsx
import { isQuietMode } from '@/lib/time-mode';
import { QuietMode } from './quiet-mode';
import { GreetingBar } from './greeting-bar';
import { recordGreetingAction } from '@/app/actions';

// Inside the component, before the main return:
if (isQuietMode(currentMode)) {
  return <QuietMode greeting={greeting} />;
}

// At the top of the normal dashboard layout, add the GreetingBar:
<GreetingBar
  initialGreeting={greeting}
  onShown={recordGreetingAction}
/>
```

- [ ] **Step 3: Verify quiet mode renders**

Temporarily set the clock test: in `app/page.tsx`, temporarily pass a hardcoded quiet time:

```typescript
// TEMP TEST — remove after verifying
const mode = getTimeMode(new Date(new Date().setHours(7, 0, 0, 0)));
```

Reload the page — it should show the quiet mode overlay with the greeting. Then remove the temp override and commit.

- [ ] **Step 4: Commit**

```bash
git add components/quiet-mode.tsx components/momentum-dashboard.tsx
git commit -m "feat: add quiet mode overlay for sadhana windows"
```

---

### Task 7: Today's One Thing Card

**Files:**
- Create: `components/one-thing-card.tsx`
- Modify: `components/momentum-dashboard.tsx` — add One Thing at top

- [ ] **Step 1: Create `components/one-thing-card.tsx`**

```tsx
// components/one-thing-card.tsx
'use client';

import type { Priority } from '@/lib/one-thing';

interface Props {
  priority: Priority | null;
  onComplete: (id: number) => void;
  onDismiss: () => void;
  dismissedUntil: number | null; // timestamp
}

export function OneThingCard({ priority, onComplete, onDismiss, dismissedUntil }: Props) {
  const isDismissed =
    dismissedUntil !== null && Date.now() < dismissedUntil;

  if (!priority || isDismissed) return null;

  return (
    <div className="one-thing-card" role="region" aria-label="Your one thing">
      <p className="one-thing-label">Right now</p>
      <h2 className="one-thing-title">{priority.title}</h2>
      {priority.detail && (
        <p className="one-thing-detail">{priority.detail}</p>
      )}
      <div className="one-thing-actions">
        <button
          className="btn-primary"
          onClick={() => onComplete(priority.id)}
        >
          Done
        </button>
        <button
          className="btn-ghost"
          onClick={onDismiss}
          title="Hide for 1 hour"
        >
          Not now
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Wire into `components/momentum-dashboard.tsx`**

```tsx
import { getOneThing } from '@/lib/one-thing';
import { OneThingCard } from './one-thing-card';

// In the component state:
const [dismissedUntil, setDismissedUntil] = useState<number | null>(null);

// Compute in render:
const oneThing = getOneThing(data.priorities, currentMode);

// In JSX (after GreetingBar, before rest of dashboard):
<OneThingCard
  priority={oneThing}
  onComplete={(id) => {
    // Use the existing togglePriorityAction — toggles active→done.
    // The One Thing card only calls this on active tasks, so it always marks done.
    startTransition(() => togglePriorityAction(id));
  }}
  onDismiss={() => setDismissedUntil(Date.now() + 60 * 60 * 1000)}
  dismissedUntil={dismissedUntil}
/>
```

Find `togglePriorityAction` (or equivalent toggle) in `app/actions.ts` — it already exists. Import and use it. Do not create a wrapper.

- [ ] **Step 3: Verify One Thing renders in browser**

```bash
npm run dev
```
Open `localhost:3000`. The top-ranked active priority should appear above the existing dashboard content as a card.

- [ ] **Step 4: Commit**

```bash
git add components/one-thing-card.tsx components/momentum-dashboard.tsx
git commit -m "feat: add Today's One Thing card above dashboard"
```

---

## Chunk 3: Anti-Paralysis Features

---

### Task 8: Quick Capture (keyboard shortcut)

**Files:**
- Create: `components/quick-capture.tsx`
- Modify: `app/actions.ts` — add `quickCaptureAction`
- Modify: `components/momentum-dashboard.tsx` — wire keyboard shortcut

- [ ] **Step 1: Add `quickCaptureAction` to `app/actions.ts`**

```typescript
export async function quickCaptureAction(title: string): Promise<void> {
  'use server';
  const parsed = z.string().min(1).max(200).safeParse(title);
  if (!parsed.success) return;
  // Insert with status='inbox' per spec — inbox items are separate from
  // active tasks and require explicit triage/promotion to become active.
  // Use the existing db instance pattern from the top of actions.ts.
  db.prepare(
    "INSERT INTO quick_tasks (title, status) VALUES (?, 'inbox')"
  ).run(parsed.data);
  revalidatePath('/');
}
```

Check `app/actions.ts` for the existing import pattern for `db` and `revalidatePath` and follow it exactly.

- [ ] **Step 2: Create `components/quick-capture.tsx`**

```tsx
// components/quick-capture.tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import { quickCaptureAction } from '@/app/actions';

export function QuickCapture() {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      // 'c' key opens capture (not when typing in another input)
      if (
        e.key === 'c' &&
        !e.metaKey &&
        !e.ctrlKey &&
        document.activeElement?.tagName !== 'INPUT' &&
        document.activeElement?.tagName !== 'TEXTAREA'
      ) {
        e.preventDefault();
        setOpen(true);
      }
      if (e.key === 'Escape') setOpen(false);
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!value.trim()) return;
    await quickCaptureAction(value.trim());
    setValue('');
    setOpen(false);
  }

  if (!open) return null;

  return (
    <div className="quick-capture-overlay" onClick={() => setOpen(false)}>
      <form
        className="quick-capture-form"
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
      >
        <label className="quick-capture-label">Capture a thought</label>
        <input
          ref={inputRef}
          className="quick-capture-input"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="What's on your mind?"
        />
        <div className="quick-capture-hint">Enter to save · Esc to cancel</div>
      </form>
    </div>
  );
}
```

- [ ] **Step 3: Add `QuickCapture` to the dashboard**

In `components/momentum-dashboard.tsx`, import and add `<QuickCapture />` at the root level of the component (outside the main layout, so it's always available):

```tsx
import { QuickCapture } from './quick-capture';

// In JSX, at the very bottom of the return, after all other content:
<QuickCapture />
```

- [ ] **Step 4: Test in browser**

```bash
npm run dev
```
Open `localhost:3000`. Press `c` — the capture overlay should appear. Type something and press Enter. The item should appear in the quick tasks list. Press `c` again → type → press Esc → overlay closes, nothing saved.

- [ ] **Step 5: Commit**

```bash
git add components/quick-capture.tsx app/actions.ts components/momentum-dashboard.tsx
git commit -m "feat: add quick capture with 'c' keyboard shortcut"
```

---

### Task 9: "I'm Stuck" Button

**Files:**
- Create: `components/stuck-overlay.tsx`
- Modify: `components/momentum-dashboard.tsx` — add stuck button

- [ ] **Step 1: Create `components/stuck-overlay.tsx`**

```tsx
// components/stuck-overlay.tsx
'use client';

import { useState } from 'react';
import type { Priority } from '@/lib/one-thing';

interface Props {
  oneThing: Priority | null;
  onStart: (id: number) => void;
  onShowAll: () => void;
}

export function StuckOverlay({ oneThing, onStart, onShowAll }: Props) {
  const [open, setOpen] = useState(false);

  function handleShowAll() {
    setOpen(false);
    onShowAll();
  }

  return (
    <>
      {/* The button — always visible, unobtrusive */}
      <button
        className="stuck-button"
        onClick={() => setOpen(true)}
        title="Help me focus"
        aria-label="I'm stuck — help me focus"
      >
        ↓ focus
      </button>

      {/* The overlay */}
      {open && (
        <div className="stuck-overlay" onClick={() => setOpen(false)}>
          <div
            className="stuck-overlay-content"
            onClick={(e) => e.stopPropagation()}
          >
            {oneThing ? (
              <>
                <p className="stuck-overlay-label">
                  The one thing that would make today feel complete:
                </p>
                <h2 className="stuck-overlay-title">{oneThing.title}</h2>
                <div className="stuck-overlay-actions">
                  <button
                    className="btn-primary"
                    onClick={() => {
                      onStart(oneThing.id);
                      setOpen(false);
                    }}
                  >
                    Start it
                  </button>
                  <button className="btn-ghost" onClick={handleShowAll}>
                    Show me everything
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="stuck-overlay-label">
                  Your task list is clear.
                </p>
                <p className="stuck-overlay-subtitle">
                  Nothing is stuck. That means you get to choose what's next.
                </p>
                <button className="btn-ghost" onClick={() => setOpen(false)}>
                  Back
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
```

- [ ] **Step 2: Wire into the dashboard**

In `components/momentum-dashboard.tsx`:

```tsx
import { StuckOverlay } from './stuck-overlay';

// In JSX — render when NOT in quiet or reflection mode:
{!isQuietMode(currentMode) && currentMode !== 'reflection' && (
  <StuckOverlay
    oneThing={oneThing}
    onStart={(id) => {
      // Mark as active / in-progress — or just dismiss the overlay
      // For Phase 1, just dismiss dismissedUntil
      setDismissedUntil(null);
    }}
    onShowAll={() => {
      // For Phase 1: scroll to the priorities section
      document
        .getElementById('priorities-section')
        ?.scrollIntoView({ behavior: 'smooth' });
    }}
  />
)}
```

Add `id="priorities-section"` to the priorities section wrapper in the dashboard so the scroll target exists.

- [ ] **Step 3: Verify in browser**

```bash
npm run dev
```
The "↓ focus" button should appear. Click it — overlay shows with the One Thing. "Start it" closes the overlay. "Show me everything" scrolls to priorities.

- [ ] **Step 4: Commit**

```bash
git add components/stuck-overlay.tsx components/momentum-dashboard.tsx
git commit -m "feat: add I'm Stuck overlay for focus recovery"
```

---

### Task 10: Anti-Overwhelm Triage Modal

**Files:**
- Create: `components/triage-modal.tsx`
- Modify: `app/actions.ts` — add `deferTaskAction`
- Modify: `lib/db.ts` — add `deferTask` query
- Modify: `components/momentum-dashboard.tsx` — trigger triage when overloaded

- [ ] **Step 1: Add `deferred` status support to DB**

In `lib/db.ts`, add a migration to add the `deferred` status. SQLite's `CHECK` constraint on `quick_tasks.status` may need updating. Check the existing schema and add:

```sql
-- In the schema initialization block, ensure quick_tasks allows 'deferred':
-- The existing status check likely only allows 'active'/'done'
-- Add a migration if needed, or adjust the initial CREATE TABLE
```

If the column has `CHECK (status IN ('active', 'done'))`, update it to include `'deferred'`. If there's no constraint, it already works.

Add the query function:

```typescript
export function deferTask(id: number, type: 'priority' | 'quick_task'): void {
  // Runtime guard required — table name cannot be parameterised in SQLite.
  // This prevents SQL injection if type ever arrives from an untrusted source.
  if (type !== 'priority' && type !== 'quick_task') {
    throw new Error(`deferTask: invalid type "${type}"`);
  }
  const table = type === 'priority' ? 'priorities' : 'quick_tasks';
  db.prepare(`UPDATE ${table} SET status = 'deferred' WHERE id = ?`).run(id);
  // Note: deferred tasks have status='deferred', not 'active' or 'done'.
  // getOneThing() filters on status === 'active', so deferred tasks are
  // automatically excluded — no additional filter needed.
}
```

- [ ] **Step 2: Add `deferTaskAction` to `app/actions.ts`**

```typescript
import { deferTask } from '@/lib/db';

export async function deferTaskAction(
  id: number,
  type: 'priority' | 'quick_task'
): Promise<void> {
  'use server';
  deferTask(id, type);
  revalidatePath('/');
}
```

- [ ] **Step 3: Create `components/triage-modal.tsx`**

```tsx
// components/triage-modal.tsx
'use client';

import { useTransition } from 'react';
import { deferTaskAction } from '@/app/actions';
import type { Priority } from '@/lib/one-thing';

interface QuickTask {
  id: number;
  title: string;
  status: string;
}

interface Props {
  priorities: Priority[];
  quickTasks: QuickTask[];
  onClose: () => void;
}

export function TriageModal({ priorities, quickTasks, onClose }: Props) {
  const [isPending, startTransition] = useTransition();

  const activeCount =
    priorities.filter((p) => p.status === 'active').length +
    quickTasks.filter((t) => t.status === 'active').length;

  function handleDefer(id: number, type: 'priority' | 'quick_task') {
    startTransition(async () => {
      await deferTaskAction(id, type);
    });
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Quick Triage</h2>
          <p className="modal-subtitle">
            {activeCount} active items. Keep what matters, defer the rest.
          </p>
        </div>

        <div className="triage-list">
          {priorities
            .filter((p) => p.status === 'active')
            .map((p) => (
              <div key={`p-${p.id}`} className="triage-item">
                <span className="triage-item-title">{p.title}</span>
                <div className="triage-item-actions">
                  <span className="triage-keep-label">Keep</span>
                  <button
                    className="btn-ghost btn-small"
                    onClick={() => handleDefer(p.id, 'priority')}
                    disabled={isPending}
                  >
                    Defer
                  </button>
                </div>
              </div>
            ))}
          {quickTasks
            .filter((t) => t.status === 'active')
            .map((t) => (
              <div key={`t-${t.id}`} className="triage-item">
                <span className="triage-item-title">{t.title}</span>
                <div className="triage-item-actions">
                  <span className="triage-keep-label">Keep</span>
                  <button
                    className="btn-ghost btn-small"
                    onClick={() => handleDefer(t.id, 'quick_task')}
                    disabled={isPending}
                  >
                    Defer
                  </button>
                </div>
              </div>
            ))}
        </div>

        <div className="modal-footer">
          <button className="btn-primary" onClick={onClose}>
            Done
          </button>
          <p className="modal-footnote">
            Deferred items are saved — not deleted. Find them in history.
          </p>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Wire into the dashboard**

In `components/momentum-dashboard.tsx`:

```tsx
import { TriageModal } from './triage-modal';

// State:
const [triageOpen, setTriageOpen] = useState(false);

// Compute overload condition:
const totalActive =
  data.priorities.filter((p) => p.status === 'active').length +
  data.quickTasks.filter((t) => t.status === 'active').length;
const isOverloaded = totalActive > 8;

// Gentle prompt (shown in the greeting area or as a banner):
{isOverloaded && !triageOpen && (
  <div className="overload-prompt">
    <span>Things are getting full —</span>
    <button className="btn-link" onClick={() => setTriageOpen(true)}>
      quick triage?
    </button>
  </div>
)}

{triageOpen && (
  <TriageModal
    priorities={data.priorities}
    quickTasks={data.quickTasks}
    onClose={() => setTriageOpen(false)}
  />
)}
```

- [ ] **Step 5: Verify triage works**

```bash
npm run dev
```
To test: manually add 9+ active tasks (via the existing add forms), then verify the triage prompt appears. Open triage modal, defer a few items, confirm they disappear from the main list. Check that deferred items don't appear in the One Thing card.

- [ ] **Step 6: Commit**

```bash
git add components/triage-modal.tsx app/actions.ts lib/db.ts components/momentum-dashboard.tsx
git commit -m "feat: add anti-overwhelm triage modal with defer action"
```

---

## Chunk 4: Soft Close + Evening Log

---

### Task 11: Soft Close Modal (Evening Sweep)

**Files:**
- Create: `components/soft-close-modal.tsx`
- Modify: `app/actions.ts` — add `softCloseAction`
- Modify: `lib/db.ts` — add `seedTomorrowPriority` query
- Modify: `components/momentum-dashboard.tsx` — show prompt in reflection mode

- [ ] **Step 1: Add `softCloseAction` to `app/actions.ts`**

```typescript
export async function softCloseAction(formData: {
  deferIds: number[];
  archiveIds: number[];
  tomorrowSeed: string;
}): Promise<void> {
  'use server';

  const schema = z.object({
    deferIds: z.array(z.number()),
    archiveIds: z.array(z.number()),
    tomorrowSeed: z.string().max(200),
  });
  const parsed = schema.safeParse(formData);
  if (!parsed.success) return;

  const { deferIds, archiveIds, tomorrowSeed } = parsed.data;

  // Defer selected priorities
  for (const id of deferIds) {
    deferTask(id, 'priority');
  }

  // Archive selected priorities (set status = 'done')
  for (const id of archiveIds) {
    db.prepare("UPDATE priorities SET status = 'done' WHERE id = ?").run(id);
  }

  // Seed tomorrow's top priority if provided.
  // Increment all existing active priority ranks first so the seed lands at rank 1.
  if (tomorrowSeed.trim()) {
    db.prepare(
      `UPDATE priorities SET rank = rank + 1 WHERE status = 'active'`
    ).run();
    db.prepare(`
      INSERT INTO priorities (title, detail, status, rank)
      VALUES (?, '', 'active', 1)
    `).run(tomorrowSeed.trim());
  }

  revalidatePath('/');
}
```

*Note: import `deferTask` and `db` from `@/lib/db` using the patterns already in the file.*

- [ ] **Step 2: Create `components/soft-close-modal.tsx`**

```tsx
// components/soft-close-modal.tsx
'use client';

import { useState, useTransition } from 'react';
import { softCloseAction } from '@/app/actions';
import type { Priority } from '@/lib/one-thing';

interface Props {
  priorities: Priority[];
  onClose: () => void;
}

type ItemState = 'keep' | 'defer' | 'archive';

export function SoftCloseModal({ priorities, onClose }: Props) {
  const activePriorities = priorities.filter((p) => p.status === 'active');
  const [itemStates, setItemStates] = useState<Record<number, ItemState>>(
    Object.fromEntries(activePriorities.map((p) => [p.id, 'keep']))
  );
  const [tomorrowSeed, setTomorrowSeed] = useState('');
  const [isPending, startTransition] = useTransition();

  function setItemState(id: number, state: ItemState) {
    setItemStates((prev) => ({ ...prev, [id]: state }));
  }

  function handleSubmit() {
    const deferIds = Object.entries(itemStates)
      .filter(([, s]) => s === 'defer')
      .map(([id]) => Number(id));
    const archiveIds = Object.entries(itemStates)
      .filter(([, s]) => s === 'archive')
      .map(([id]) => Number(id));

    startTransition(async () => {
      await softCloseAction({ deferIds, archiveIds, tomorrowSeed });
      onClose();
    });
  }

  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-header">
          <h2 className="modal-title">How did today go?</h2>
          <p className="modal-subtitle">60 seconds to close the day cleanly.</p>
        </div>

        {activePriorities.length > 0 && (
          <div className="soft-close-list">
            <p className="soft-close-section-label">Uncompleted items:</p>
            {activePriorities.map((p) => (
              <div key={p.id} className="soft-close-item">
                <span className="soft-close-item-title">{p.title}</span>
                <div className="soft-close-item-actions">
                  {(['keep', 'defer', 'archive'] as ItemState[]).map(
                    (state) => (
                      <button
                        key={state}
                        className={`btn-small ${
                          itemStates[p.id] === state
                            ? 'btn-selected'
                            : 'btn-ghost'
                        }`}
                        onClick={() => setItemState(p.id, state)}
                      >
                        {state === 'keep'
                          ? 'Carry forward'
                          : state === 'defer'
                          ? 'Defer'
                          : 'Archive'}
                      </button>
                    )
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="soft-close-tomorrow">
          <label className="soft-close-label" htmlFor="tomorrow-seed">
            What's the one thing for tomorrow?
          </label>
          <input
            id="tomorrow-seed"
            className="input"
            value={tomorrowSeed}
            onChange={(e) => setTomorrowSeed(e.target.value)}
            placeholder="e.g. Finish the boss telegraph pass"
          />
        </div>

        <div className="modal-footer">
          <button
            className="btn-primary"
            onClick={handleSubmit}
            disabled={isPending}
          >
            {isPending ? 'Saving...' : 'Close the day'}
          </button>
          <button className="btn-ghost" onClick={onClose}>
            Skip for now
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Wire into the dashboard — show in reflection mode**

In `components/momentum-dashboard.tsx`:

```tsx
import { SoftCloseModal } from './soft-close-modal';

// State:
const [softCloseOpen, setSoftCloseOpen] = useState(false);

// Auto-prompt in reflection mode (once per session):
// Add a useEffect that triggers the soft close prompt when mode is 'reflection'
// and it hasn't been shown this session:
const [softCloseShownThisSession, setSoftCloseShownThisSession] = useState(false);

useEffect(() => {
  if (currentMode === 'reflection' && !softCloseShownThisSession) {
    // Small delay so the page loads first
    const t = setTimeout(() => {
      setSoftCloseOpen(true);
      setSoftCloseShownThisSession(true);
    }, 2000);
    return () => clearTimeout(t);
  }
}, [currentMode, softCloseShownThisSession]);

// Manual trigger button in the evening/reflection modes:
{(currentMode === 'reflection' || currentMode === 'evening') && (
  <button
    className="btn-ghost soft-close-trigger"
    onClick={() => setSoftCloseOpen(true)}
  >
    Close the day
  </button>
)}

{softCloseOpen && (
  <SoftCloseModal
    priorities={data.priorities}
    onClose={() => setSoftCloseOpen(false)}
  />
)}
```

- [ ] **Step 4: Verify soft close works**

```bash
npm run dev
```
Temporarily force reflection mode (as in Task 6) to test the modal appears. Test: carry-forward keeps items, defer hides them, archive marks done. A seeded tomorrow priority appears in the list after close.

- [ ] **Step 5: Commit**

```bash
git add components/soft-close-modal.tsx app/actions.ts lib/db.ts components/momentum-dashboard.tsx
git commit -m "feat: add soft close modal with evening sweep and tomorrow seed"
```

---

## Chunk 5: Visual Redesign

*The full design pass. This is where the app becomes beautiful. All functional components are built; now we make them look right.*

---

### Task 12: Design Token System + Typography

**Files:**
- Modify: `app/globals.css` — complete redesign of CSS variables and base styles

- [ ] **Step 1: Replace design tokens in `app/globals.css`**

Read the existing `app/globals.css` first to understand the current variables. Then replace the `:root` and base style section with:

```css
/* app/globals.css — complete design system */

@import "tailwindcss";

:root {
  /* --- Colour palette --- */
  /* Warm dark: feels personal, not corporate */
  --bg-base:        #0f0f12;    /* near-black with warmth */
  --bg-surface:     #17171d;    /* cards, panels */
  --bg-elevated:    #1f1f28;    /* modals, hover states */
  --bg-overlay:     rgba(15, 15, 18, 0.85); /* backdrop overlays */

  /* Accent: warm amber-gold (not cold cyan) */
  --accent:         #e8a945;    /* primary action, links */
  --accent-muted:   #9d7230;    /* secondary references to accent */
  --accent-subtle:  rgba(232, 169, 69, 0.08); /* gentle highlight bg */

  /* Text */
  --text-primary:   #f0ede8;    /* main readable text */
  --text-secondary: #8e8a84;    /* labels, metadata, hints */
  --text-muted:     #4d4a47;    /* placeholders, disabled */

  /* Borders */
  --border:         rgba(255, 255, 255, 0.07);
  --border-subtle:  rgba(255, 255, 255, 0.04);

  /* Status */
  --success:        #4caf7d;
  --warning:        #e8a945;    /* same as accent — intentional */
  --error:          #e05c5c;

  /* Spacing scale */
  --space-1:  4px;
  --space-2:  8px;
  --space-3:  12px;
  --space-4:  16px;
  --space-5:  20px;
  --space-6:  24px;
  --space-8:  32px;
  --space-10: 40px;
  --space-12: 48px;
  --space-16: 64px;

  /* Typography */
  --font-sans: 'Inter', system-ui, -apple-system, sans-serif;
  --font-mono: 'JetBrains Mono', 'Fira Code', monospace;

  /* Radius */
  --radius-sm:  6px;
  --radius-md:  10px;
  --radius-lg:  16px;
  --radius-xl:  24px;

  /* Shadows */
  --shadow-card:   0 1px 3px rgba(0,0,0,0.4), 0 4px 12px rgba(0,0,0,0.3);
  --shadow-modal:  0 8px 32px rgba(0,0,0,0.6), 0 2px 8px rgba(0,0,0,0.4);
  --shadow-glow:   0 0 20px rgba(232, 169, 69, 0.15);
}

/* --- Base --- */
*, *::before, *::after { box-sizing: border-box; }

html { font-size: 16px; }

body {
  background-color: var(--bg-base);
  color: var(--text-primary);
  font-family: var(--font-sans);
  font-size: 1rem;
  line-height: 1.6;
  -webkit-font-smoothing: antialiased;
  min-height: 100vh;
}

/* --- Layout primitives --- */
.page-wrapper {
  max-width: 720px;       /* Single column — not a grid */
  margin: 0 auto;
  padding: var(--space-8) var(--space-6);
}

.card {
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: var(--space-6);
  box-shadow: var(--shadow-card);
}

.section {
  margin-bottom: var(--space-8);
}

.section-label {
  font-size: 0.7rem;
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--text-muted);
  margin-bottom: var(--space-3);
}

/* --- Typography --- */
h1 { font-size: 2rem;   font-weight: 700; line-height: 1.2; }
h2 { font-size: 1.4rem; font-weight: 600; line-height: 1.3; }
h3 { font-size: 1.1rem; font-weight: 600; }

/* --- Buttons --- */
.btn-primary {
  background: var(--accent);
  color: #0f0f12;
  font-weight: 600;
  font-size: 0.875rem;
  padding: var(--space-2) var(--space-5);
  border: none;
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: opacity 0.15s;
}
.btn-primary:hover { opacity: 0.85; }
.btn-primary:disabled { opacity: 0.4; cursor: not-allowed; }

.btn-ghost {
  background: transparent;
  color: var(--text-secondary);
  font-size: 0.875rem;
  padding: var(--space-2) var(--space-4);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: color 0.15s, border-color 0.15s;
}
.btn-ghost:hover { color: var(--text-primary); border-color: var(--border); }

.btn-link {
  background: none;
  border: none;
  color: var(--accent);
  cursor: pointer;
  font-size: inherit;
  text-decoration: underline;
  text-underline-offset: 2px;
  padding: 0;
}

.btn-small {
  font-size: 0.75rem;
  padding: var(--space-1) var(--space-3);
}

.btn-selected {
  /* Self-contained — includes all base button styles so it can stand alone
     or be combined with .btn-ghost without style conflicts. */
  background: var(--accent-subtle);
  color: var(--accent);
  border: 1px solid var(--accent-muted);
  border-radius: var(--radius-sm);
  cursor: pointer;
  font-size: 0.875rem;
  padding: var(--space-2) var(--space-4);
}

.btn-small.btn-selected {
  /* Override .btn-selected's default font-size/padding when combined with .btn-small,
     so toggling selection state doesn't cause a size-shift. */
  font-size: 0.75rem;
  padding: var(--space-1) var(--space-3);
}

/* --- Input --- */
.input, .textarea {
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  color: var(--text-primary);
  font-size: 0.9rem;
  padding: var(--space-3) var(--space-4);
  width: 100%;
  outline: none;
  transition: border-color 0.15s;
}
.input:focus, .textarea:focus {
  border-color: var(--accent-muted);
}
.input::placeholder, .textarea::placeholder {
  color: var(--text-muted);
}

/* --- Greeting Bar --- */
.greeting-bar {
  margin-bottom: var(--space-6);
  padding-bottom: var(--space-6);
  border-bottom: 1px solid var(--border-subtle);
}
.greeting-text {
  font-size: 1rem;
  color: var(--text-secondary);
  font-style: italic;
  line-height: 1.5;
}

/* --- Quiet Mode --- */
.quiet-mode-overlay {
  position: fixed;
  inset: 0;
  background: var(--bg-base);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}
.quiet-mode-content {
  text-align: center;
  max-width: 400px;
  padding: var(--space-12);
}
.quiet-mode-icon {
  font-size: 2rem;
  color: var(--text-muted);
  margin-bottom: var(--space-6);
  animation: breathe 4s ease-in-out infinite;
}
.quiet-mode-text {
  font-size: 1.1rem;
  color: var(--text-secondary);
  font-style: italic;
  line-height: 1.7;
}
@keyframes breathe {
  0%, 100% { opacity: 0.4; transform: scale(1); }
  50%       { opacity: 0.9; transform: scale(1.05); }
}

/* --- One Thing Card --- */
.one-thing-card {
  background: linear-gradient(
    135deg,
    rgba(232, 169, 69, 0.06) 0%,
    var(--bg-surface) 100%
  );
  border: 1px solid rgba(232, 169, 69, 0.2);
  border-radius: var(--radius-lg);
  padding: var(--space-8);
  margin-bottom: var(--space-6);
  box-shadow: var(--shadow-glow);
}
.one-thing-label {
  font-size: 0.7rem;
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--accent-muted);
  margin-bottom: var(--space-2);
}
.one-thing-title {
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--text-primary);
  line-height: 1.3;
  margin-bottom: var(--space-2);
}
.one-thing-detail {
  font-size: 0.9rem;
  color: var(--text-secondary);
  margin-bottom: var(--space-5);
}
.one-thing-actions {
  display: flex;
  gap: var(--space-3);
  align-items: center;
}

/* --- Stuck Button --- */
.stuck-button {
  position: fixed;
  bottom: var(--space-6);
  right: var(--space-6);
  background: var(--bg-surface);
  border: 1px solid var(--border);
  color: var(--text-muted);
  font-size: 0.75rem;
  padding: var(--space-2) var(--space-4);
  border-radius: var(--radius-sm);
  cursor: pointer;
  z-index: 50;
  transition: color 0.15s, border-color 0.15s;
}
.stuck-button:hover { color: var(--text-secondary); border-color: var(--accent-muted); }

/* --- Stuck Overlay --- */
.stuck-overlay {
  position: fixed;
  inset: 0;
  background: var(--bg-overlay);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 90;
  backdrop-filter: blur(8px);
}
.stuck-overlay-content {
  max-width: 480px;
  width: 90%;
  text-align: center;
  padding: var(--space-12);
}
.stuck-overlay-label {
  font-size: 0.85rem;
  color: var(--text-secondary);
  margin-bottom: var(--space-4);
}
.stuck-overlay-title {
  font-size: 1.8rem;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: var(--space-8);
  line-height: 1.3;
}
.stuck-overlay-subtitle {
  color: var(--text-secondary);
  margin-bottom: var(--space-6);
}
.stuck-overlay-actions {
  display: flex;
  gap: var(--space-4);
  justify-content: center;
}

/* --- Quick Capture --- */
.quick-capture-overlay {
  position: fixed;
  inset: 0;
  background: var(--bg-overlay);
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding-top: 20vh;
  z-index: 95;
  backdrop-filter: blur(8px);
}
.quick-capture-form {
  width: 100%;
  max-width: 560px;
  padding: var(--space-6);
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-modal);
}
.quick-capture-label {
  display: block;
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--text-muted);
  margin-bottom: var(--space-3);
}
.quick-capture-input {
  background: transparent;
  border: none;
  font-size: 1.2rem;
  color: var(--text-primary);
  width: 100%;
  outline: none;
  padding: 0;
}
.quick-capture-input::placeholder { color: var(--text-muted); }
.quick-capture-hint {
  margin-top: var(--space-4);
  font-size: 0.75rem;
  color: var(--text-muted);
}

/* --- Modal --- */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: var(--bg-overlay);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 80;
  backdrop-filter: blur(6px);
  padding: var(--space-6);
}
.modal {
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-modal);
  max-width: 560px;
  width: 100%;
  max-height: 80vh;
  overflow-y: auto;
  padding: var(--space-8);
}
.modal-header { margin-bottom: var(--space-6); }
.modal-title { font-size: 1.3rem; font-weight: 600; margin-bottom: var(--space-1); }
.modal-subtitle { font-size: 0.9rem; color: var(--text-secondary); }
.modal-footer {
  margin-top: var(--space-8);
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}
.modal-footnote { font-size: 0.75rem; color: var(--text-muted); text-align: center; }

/* --- Triage --- */
.triage-list { display: flex; flex-direction: column; gap: var(--space-3); }
.triage-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
  padding: var(--space-3) 0;
  border-bottom: 1px solid var(--border-subtle);
}
.triage-item:last-child { border-bottom: none; }
.triage-item-title { font-size: 0.9rem; flex: 1; }
.triage-item-actions { display: flex; gap: var(--space-2); align-items: center; }
.triage-keep-label { font-size: 0.75rem; color: var(--text-muted); padding: 0 var(--space-2); }

/* --- Soft Close --- */
.soft-close-list { margin-bottom: var(--space-6); }
.soft-close-section-label {
  font-size: 0.75rem;
  color: var(--text-muted);
  margin-bottom: var(--space-3);
}
.soft-close-item {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  padding: var(--space-3) 0;
  border-bottom: 1px solid var(--border-subtle);
}
.soft-close-item:last-child { border-bottom: none; }
.soft-close-item-title { font-size: 0.9rem; }
.soft-close-item-actions { display: flex; gap: var(--space-2); }
.soft-close-tomorrow { margin-bottom: var(--space-6); }
.soft-close-label {
  display: block;
  font-size: 0.85rem;
  color: var(--text-secondary);
  margin-bottom: var(--space-3);
}

/* --- Overload prompt --- */
.overload-prompt {
  padding: var(--space-3) var(--space-4);
  background: var(--accent-subtle);
  border: 1px solid rgba(232, 169, 69, 0.15);
  border-radius: var(--radius-sm);
  font-size: 0.85rem;
  color: var(--text-secondary);
  margin-bottom: var(--space-4);
  display: flex;
  gap: var(--space-2);
  align-items: center;
}

/* --- Soft close trigger --- */
.soft-close-trigger {
  margin-top: var(--space-6);
}

/* --- Responsive --- */
@media (max-width: 640px) {
  .page-wrapper { padding: var(--space-4); }
  .one-thing-title { font-size: 1.2rem; }
  .stuck-button { bottom: var(--space-4); right: var(--space-4); }
}
```

- [ ] **Step 2: Verify the app looks right**

```bash
npm run dev
```
Open `localhost:3000`. The app should now render with the warm dark palette, amber accents, and clean typography. Check:
- Greeting bar is at the top, styled in italic secondary text
- One Thing card has the golden glow border
- Buttons use the amber accent for primary actions
- Modals (test by triggering triage or stuck) use backdrop blur

If anything looks broken, fix the CSS before moving on.

- [ ] **Step 3: Commit**

```bash
git add app/globals.css
git commit -m "design: complete visual redesign — warm dark palette, amber accent, single-column layout"
```

---

### Task 13: Dashboard Layout Restructure

**Files:**
- Modify: `components/momentum-dashboard.tsx` — restructure to single-column with new component order

- [ ] **Step 1: Restructure the dashboard layout**

Open `components/momentum-dashboard.tsx`. Find the top-level `return (` statement. The existing outer wrapper is most likely a `<div>` with a grid Tailwind class (e.g. `className="grid grid-cols-..."` or similar). Replace that outer wrapper with `<main className="page-wrapper">` and reorder the child sections as shown below. Keep all existing section `<div>` elements — just reorder and rewrap them; do not delete any functionality.

Target component order inside `<main className="page-wrapper">`:

```
<main className="page-wrapper">
  1. <GreetingBar />          ← new
  2. <OneThingCard />         ← new
  3. <section id="priorities-section"> Top 3 Priorities (existing)
  4. <section> Focus Blocks (existing, now collapsible in non-focus modes)
  5. <section> Quick Tasks (existing)
  6. <section> Learning Entries (existing)
  7. <section> Weekly Review (existing, reduced to minimal)
  8. <section> Prompt Library (existing, deprioritised)
  9. soft-close-trigger button (in evening/reflection modes)
  10. <StuckOverlay /> (fixed position)
  11. <QuickCapture />        ← new (fixed overlay)
  12. <TriageModal />         ← new (conditional)
  13. <SoftCloseModal />      ← new (conditional)
</main>
```

The existing sections keep their functionality but are now laid out in a single column. Sections that are less relevant for the current time mode should be collapsed/reduced — add a `data-mode-reduced` attribute or a simple CSS class to sections that should be visually subdued in certain modes.

For now, implement the basic restructure. Full mode-based section visibility is a Phase 5 enhancement.

- [ ] **Step 2: Add Top-3 cap to priorities display**

In the priorities section, change the render to only show the first 3 active priorities:

```tsx
const visiblePriorities = data.priorities
  .filter((p) => p.status === 'active')
  .slice(0, 3);

const hiddenCount = data.priorities.filter((p) => p.status === 'active').length - 3;

// In JSX:
{visiblePriorities.map((p) => <PriorityCard key={p.id} priority={p} />)}
{hiddenCount > 0 && (
  <button className="btn-ghost btn-small" onClick={() => setShowAllPriorities(true)}>
    and {hiddenCount} more...
  </button>
)}
```

Add `showAllPriorities` state and render all priorities when true.

- [ ] **Step 3: Verify layout**

```bash
npm run dev
```
The dashboard should now be a clean single column. Greeting at top, One Thing prominently below, then the rest of the sections. Check on a narrower browser window (simulate phone width) — it should still look good.

- [ ] **Step 4: Commit**

```bash
git add components/momentum-dashboard.tsx
git commit -m "refactor: restructure dashboard to single-column layout with new component order"
```

---

### Task 14: Final Phase 1 Verification

- [ ] **Step 1: Run all tests**

```bash
npx tsx --test tests/time-mode.test.mjs tests/one-thing.test.mjs tests/greeting.test.mjs
```
Expected: all tests pass

- [ ] **Step 2: Run TypeScript type check**

```bash
npm run typecheck
```
Expected: zero type errors. Fix any errors before proceeding.

- [ ] **Step 3: Run lint**

```bash
npm run lint
```
Expected: no errors. Fix any lint errors.

- [ ] **Step 4: Build production bundle**

```bash
npm run build
```
Expected: builds successfully with no errors.

- [ ] **Step 5: Manual acceptance test**

With `npm run dev` running, verify:
- [ ] Opening the app shows greeting bar with Pratchett-style text
- [ ] Today's One Thing card shows the top active priority
- [ ] Pressing `c` opens quick capture overlay, Enter saves, Esc closes
- [ ] Completing the One Thing (Done button) refreshes and shows next priority
- [ ] Temporarily setting time to 7:00 shows quiet mode overlay with breathing dot
- [ ] Temporarily setting time to 21:00 shows reflection mode and soft close appears after 2s
- [ ] Stuck button appears in corner; click shows overlay with one thing
- [ ] Adding 9+ active tasks shows overload prompt; triage modal works
- [ ] App looks correct at 1280px width; acceptable at 375px (mobile)
- [ ] Quick Capture: open a `<select>` element, press `c` — capture overlay should NOT open
- [ ] Load levels: with 0 tasks → greeting is from `empty` pool; with 6–8 tasks → `full` pool; with 9+ → `overloaded` pool (test by temporarily overriding `loadLevel` in page.tsx)
- [ ] Quick Capture saves with `status = 'inbox'`, visible in the inbox row separate from active tasks

- [ ] **Step 6: Final commit**

```bash
# Confirm .gitignore covers momentum-os.db before staging
grep "momentum-os.db" .gitignore
# Stage all tracked changes explicitly (not -A, to avoid accidentally staging the db file)
git add app/ components/ lib/ tests/ docs/
git commit -m "feat: complete Phase 1 — Daily OS UI redesign with all anti-paralysis features"
```

---

## Summary

**What Phase 1 delivers:**
- Time-aware adaptive interface with 9 daily modes
- Quiet/sadhana mode (pre-8am, 2–3pm) — app goes still
- Greeting bar with 40 Pratchett-style messages
- Today's One Thing — always-visible single priority
- "I'm Stuck" focus recovery overlay
- Quick Capture (`c` key)
- Anti-overwhelm triage modal (triggers at 9+ active items)
- Soft close modal with evening sweep and tomorrow seed
- Complete visual redesign — warm dark palette, amber accent, single-column
- Full test coverage on all logic modules

**What Phase 1 does NOT include:**
- Learning Coach (Phase 2)
- Pulse Feed (Phase 3)
- Mac Mini deployment (Phase 4)
- Spaced resurfacing / cross-section intelligence (Phase 5)

**Next plan:** `docs/superpowers/plans/2026-03-13-phase2-learning-coach.md`
