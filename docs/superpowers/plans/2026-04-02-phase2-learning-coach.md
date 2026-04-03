# Phase 2: Learning Coach Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an AI-powered Learning Coach with OpenRouter curriculum generation, conversational session chat, SM-2 spaced repetition, and a User Profile page that feeds AI context.

**Architecture:** Four new routes (`/learn`, `/learn/new`, `/learn/[id]`, `/learn/[id]/session`, `/profile`), a typed async OpenRouter client, a pure SM-2 engine, and three new DB tables (`curricula`, `learning_sessions`, `sr_items`). All AI calls happen in Server Actions. The daily dashboard surfaces SR review reminders in morning-brief mode via a new `srDueCount` prop.

**Tech Stack:** Next.js 16 App Router, SQLite (`node:sqlite` `DatabaseSync` — synchronous only, no async/await in DB layer), OpenRouter API (model `anthropic/claude-sonnet-4-5`), Zod v3 validation, `node:test` + `node:assert/strict`, tests run with `npx tsx --test`.

**Working directory:** All paths are relative to the repo root. Branch: `feature/phase2-learning-coach` (new worktree at `.worktrees/phase2-learning-coach`).

**Task ordering note:** `SRReviewCard` (Task 10) is imported by the Learn page (Task 8). Complete Task 10 before running tsc on Task 8. Suggested execution order: 1→2→3→4→5→6→7→10→8→9→11→12.

**Environment:** Create `.env.local` at repo root with:
```
OPENROUTER_API_KEY=sk-or-your-key-here
```

---

## File Map

**New files:**
- `lib/sm2.ts` — Pure SM-2 algorithm (no deps, fully testable)
- `lib/curriculum-types.ts` — TypeScript interfaces for curriculum data
- `lib/openrouter.ts` — Async OpenRouter API client
- `app/learn/actions.ts` — All Learning Coach server actions
- `app/profile/page.tsx` — User Profile editor
- `app/learn/page.tsx` — Learning Coach home (list curricula + SR due count)
- `app/learn/new/page.tsx` — Curriculum builder (goal → AI → preview → save)
- `app/learn/[id]/page.tsx` — Curriculum detail (module list + progress)
- `app/learn/[id]/session/page.tsx` — Learning session (pre-session + chat + post-loop)
- `components/nav.tsx` — Top navigation bar (Client Component)
- `components/curriculum-card.tsx` — Curriculum summary card
- `components/session-chat.tsx` — Chat interface (Client Component)
- `components/sr-review-card.tsx` — SR review prompt with 3-button rating
- `tests/sm2.test.mjs` — SM-2 algorithm unit tests

**Modified files:**
- `lib/db.ts` — Add 3 new tables + query functions
- `lib/types.ts` — No changes needed (UserProfile already defined)
- `app/layout.tsx` — Add `<Nav />` inside layout
- `app/page.tsx` — Pass `srDueCount` to dashboard
- `components/momentum-dashboard.tsx` — Show SR reminder in morning-brief mode

---

## Task 1: SM-2 Algorithm

**Files:**
- Create: `lib/sm2.ts`
- Create: `tests/sm2.test.mjs`

- [ ] **Step 1: Write the failing tests**

Create `tests/sm2.test.mjs`:
```js
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

const { sm2Update, initialSRState } = await import('../lib/sm2.ts');

describe('initialSRState', () => {
  it('returns n=0, ef=2.5, intervalDays=1', () => {
    const s = initialSRState();
    assert.equal(s.n, 0);
    assert.equal(s.ef, 2.5);
    assert.equal(s.intervalDays, 1);
  });
});

describe('sm2Update', () => {
  it('first review quality=5: n→1, interval stays 1 day, EF increases', () => {
    const s = initialSRState();
    const r = sm2Update(s, 5);
    assert.equal(r.n, 1);
    assert.equal(r.intervalDays, 1);
    assert.ok(r.ef > 2.5, `EF should increase, got ${r.ef}`);
  });

  it('second review quality=5: n→2, interval becomes 6 days', () => {
    const s = { n: 1, ef: 2.6, intervalDays: 1 };
    const r = sm2Update(s, 5);
    assert.equal(r.n, 2);
    assert.equal(r.intervalDays, 6);
  });

  it('third review quality=5: interval = round(6 * newEf)', () => {
    const s = { n: 2, ef: 2.6, intervalDays: 6 };
    const r = sm2Update(s, 5);
    assert.equal(r.n, 3);
    const expectedEf = Math.max(1.3, 2.6 + 0.1 - (5 - 5) * (0.08 + (5 - 5) * 0.02));
    assert.equal(r.intervalDays, Math.round(6 * expectedEf));
  });

  it('quality=3 (Somewhat): n advances, EF decreases slightly', () => {
    const s = { n: 1, ef: 2.5, intervalDays: 1 };
    const r = sm2Update(s, 3);
    assert.equal(r.n, 2);
    assert.equal(r.intervalDays, 6);
    assert.ok(r.ef < 2.5, `EF should decrease, got ${r.ef}`);
  });

  it('quality=2 (Not really): n resets to 0, interval resets to 1', () => {
    const s = { n: 3, ef: 2.5, intervalDays: 15 };
    const r = sm2Update(s, 2);
    assert.equal(r.n, 0);
    assert.equal(r.intervalDays, 1);
  });

  it('EF floor: never drops below 1.3 even after many failures', () => {
    let s = initialSRState();
    for (let i = 0; i < 20; i++) s = sm2Update(s, 2);
    assert.ok(s.ef >= 1.3, `EF must be >= 1.3, got ${s.ef}`);
  });

  it('EF floor applies on quality=2 result', () => {
    // Start with EF just above floor
    const s = { n: 0, ef: 1.31, intervalDays: 1 };
    const r = sm2Update(s, 2);
    assert.ok(r.ef >= 1.3, `EF must be >= 1.3, got ${r.ef}`);
  });
});
```

- [ ] **Step 2: Run tests — expect failure (module not found)**
```
npx tsx --test tests/sm2.test.mjs
```
Expected: error `Cannot find module '../lib/sm2.ts'`

- [ ] **Step 3: Implement `lib/sm2.ts`**

```typescript
export interface SRState {
  n: number;           // successful review count (resets to 0 on quality < 3)
  ef: number;          // ease factor, starts at 2.5, floor 1.3
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
```

- [ ] **Step 4: Run tests — expect all 7 passing**
```
npx tsx --test tests/sm2.test.mjs
```
Expected: `7 passing`

- [ ] **Step 5: Commit**
```bash
git add lib/sm2.ts tests/sm2.test.mjs
git commit -m "feat: add SM-2 spaced repetition algorithm with tests"
```

---

## Task 2: DB Schema — New Tables + Queries

**Files:**
- Modify: `lib/db.ts`

The existing `initializeDatabase()` function runs `database.exec(...)` with all CREATE TABLE statements. Add the three new tables to that exec call, then add query functions after `recordGreetingShown()`.

- [ ] **Step 1: Add tables to `initializeDatabase()`**

In `lib/db.ts`, inside the `initializeDatabase(database)` function, append to the existing `database.exec(...)` call (before the closing backtick of the template literal):

```sql
    CREATE TABLE IF NOT EXISTS curricula (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      goal_statement TEXT NOT NULL,
      domain TEXT NOT NULL,
      modules_json TEXT NOT NULL DEFAULT '[]',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS learning_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      curriculum_id INTEGER NOT NULL REFERENCES curricula(id),
      module_index INTEGER NOT NULL DEFAULT 0,
      chat_history_json TEXT NOT NULL DEFAULT '[]',
      what_landed TEXT NOT NULL DEFAULT '',
      whats_fuzzy TEXT NOT NULL DEFAULT '',
      confidence INTEGER NOT NULL DEFAULT 0,
      next_action TEXT NOT NULL DEFAULT '',
      completed_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS sr_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      item_type TEXT NOT NULL DEFAULT 'learning_session',
      item_id INTEGER NOT NULL,
      n INTEGER NOT NULL DEFAULT 0,
      ef REAL NOT NULL DEFAULT 2.5,
      interval_days INTEGER NOT NULL DEFAULT 1,
      next_review_date TEXT NOT NULL,
      last_shown_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
```

- [ ] **Step 2: Add query functions**

Add these functions to `lib/db.ts` after `recordGreetingShown()`:

```typescript
// --- Curriculum queries ---

export function getCurricula(): Array<{
  id: number; title: string; goalStatement: string; domain: string;
  modulesJson: string; createdAt: string;
}> {
  return toPlainObject(
    db.prepare(
      'SELECT id, title, goal_statement as goalStatement, domain, modules_json as modulesJson, created_at as createdAt FROM curricula ORDER BY id DESC'
    ).all()
  ) as ReturnType<typeof getCurricula>;
}

export function getCurriculumById(id: number): {
  id: number; title: string; goalStatement: string; domain: string;
  modulesJson: string; createdAt: string;
} | null {
  const row = db.prepare(
    'SELECT id, title, goal_statement as goalStatement, domain, modules_json as modulesJson, created_at as createdAt FROM curricula WHERE id = ?'
  ).get(id);
  return row ? toPlainObject(row) as ReturnType<typeof getCurriculumById> : null;
}

export function saveCurriculum(input: {
  title: string; goalStatement: string; domain: string; modulesJson: string;
}): number {
  const result = db.prepare(
    'INSERT INTO curricula (title, goal_statement, domain, modules_json) VALUES (?, ?, ?, ?)'
  ).run(input.title, input.goalStatement, input.domain, input.modulesJson);
  return Number(result.lastInsertRowid);
}

export function getCurriculumSessionCount(curriculumId: number): number {
  const row = db.prepare(
    "SELECT COUNT(*) as count FROM learning_sessions WHERE curriculum_id = ? AND completed_at IS NOT NULL"
  ).get(curriculumId) as { count: number };
  return row.count;
}

// --- Learning session queries ---

export function getSessionsForCurriculum(curriculumId: number): Array<{
  id: number; curriculumId: number; moduleIndex: number; chatHistoryJson: string;
  whatLanded: string; whatsFuzzy: string; confidence: number;
  nextAction: string; completedAt: string | null; createdAt: string;
}> {
  return toPlainObject(
    db.prepare(
      'SELECT id, curriculum_id as curriculumId, module_index as moduleIndex, chat_history_json as chatHistoryJson, what_landed as whatLanded, whats_fuzzy as whatsFuzzy, confidence, next_action as nextAction, completed_at as completedAt, created_at as createdAt FROM learning_sessions WHERE curriculum_id = ? ORDER BY id DESC'
    ).all(curriculumId)
  ) as ReturnType<typeof getSessionsForCurriculum>;
}

export function getLatestCompletedSession(curriculumId: number, moduleIndex: number): {
  id: number; whatsFuzzy: string; nextAction: string; completedAt: string;
} | null {
  const row = db.prepare(
    'SELECT id, whats_fuzzy as whatsFuzzy, next_action as nextAction, completed_at as completedAt FROM learning_sessions WHERE curriculum_id = ? AND module_index = ? AND completed_at IS NOT NULL ORDER BY id DESC LIMIT 1'
  ).get(curriculumId, moduleIndex);
  return row ? toPlainObject(row) as ReturnType<typeof getLatestCompletedSession> : null;
}

export function createSession(curriculumId: number, moduleIndex: number): number {
  const result = db.prepare(
    'INSERT INTO learning_sessions (curriculum_id, module_index) VALUES (?, ?)'
  ).run(curriculumId, moduleIndex);
  return Number(result.lastInsertRowid);
}

export function updateSessionChat(sessionId: number, chatHistoryJson: string): void {
  db.prepare('UPDATE learning_sessions SET chat_history_json = ? WHERE id = ?').run(chatHistoryJson, sessionId);
}

export function completeSession(sessionId: number, input: {
  whatLanded: string; whatsFuzzy: string; confidence: number; nextAction: string;
}): void {
  db.prepare(
    "UPDATE learning_sessions SET what_landed = ?, whats_fuzzy = ?, confidence = ?, next_action = ?, completed_at = datetime('now') WHERE id = ?"
  ).run(input.whatLanded, input.whatsFuzzy, input.confidence, input.nextAction, sessionId);
}

// --- SR item queries ---

export function getSRItemsDueCount(asOfDate?: string): number {
  const date = asOfDate ?? new Date().toISOString().slice(0, 10);
  const row = db.prepare(
    "SELECT COUNT(*) as count FROM sr_items WHERE next_review_date <= ?"
  ).get(date) as { count: number };
  return row.count;
}

export function getSRItemsDue(asOfDate?: string): Array<{
  id: number; itemType: string; itemId: number; n: number; ef: number;
  intervalDays: number; nextReviewDate: string; lastShownAt: string | null;
}> {
  const date = asOfDate ?? new Date().toISOString().slice(0, 10);
  return toPlainObject(
    db.prepare(
      'SELECT id, item_type as itemType, item_id as itemId, n, ef, interval_days as intervalDays, next_review_date as nextReviewDate, last_shown_at as lastShownAt FROM sr_items WHERE next_review_date <= ? ORDER BY next_review_date ASC'
    ).all(date)
  ) as ReturnType<typeof getSRItemsDue>;
}

export function createSRItem(itemType: string, itemId: number, nextReviewDate: string): number {
  const result = db.prepare(
    'INSERT INTO sr_items (item_type, item_id, next_review_date) VALUES (?, ?, ?)'
  ).run(itemType, itemId, nextReviewDate);
  return Number(result.lastInsertRowid);
}

export function updateSRItem(id: number, n: number, ef: number, intervalDays: number, nextReviewDate: string): void {
  db.prepare(
    "UPDATE sr_items SET n = ?, ef = ?, interval_days = ?, next_review_date = ?, last_shown_at = datetime('now') WHERE id = ?"
  ).run(n, ef, intervalDays, nextReviewDate, id);
}

export function getSRItemForSession(sessionId: number): {
  id: number; n: number; ef: number; intervalDays: number; nextReviewDate: string;
} | null {
  const row = db.prepare(
    "SELECT id, n, ef, interval_days as intervalDays, next_review_date as nextReviewDate FROM sr_items WHERE item_type = 'learning_session' AND item_id = ?"
  ).get(sessionId);
  return row ? toPlainObject(row) as ReturnType<typeof getSRItemForSession> : null;
}

export function getSRItemWithContext(srItemId: number): {
  id: number; n: number; ef: number; intervalDays: number; nextReviewDate: string;
  whatsFuzzy: string; nextAction: string; curriculumTitle: string; moduleIndex: number;
  modulesJson: string;
} | null {
  const row = db.prepare(`
    SELECT s.id, s.n, s.ef, s.interval_days as intervalDays, s.next_review_date as nextReviewDate,
           ls.whats_fuzzy as whatsFuzzy, ls.next_action as nextAction, ls.module_index as moduleIndex,
           c.title as curriculumTitle, c.modules_json as modulesJson
    FROM sr_items s
    JOIN learning_sessions ls ON ls.id = s.item_id
    JOIN curricula c ON c.id = ls.curriculum_id
    WHERE s.id = ?
  `).get(srItemId);
  return row ? toPlainObject(row) as ReturnType<typeof getSRItemWithContext> : null;
}
```

- [ ] **Step 3: Type-check**
```
npx tsc --noEmit
```
Expected: no output (clean)

- [ ] **Step 4: Confirm existing tests still pass**
```
npx tsx --test tests/sm2.test.mjs tests/time-mode.test.mjs tests/one-thing.test.mjs tests/greeting.test.mjs
```
Expected: all tests pass

- [ ] **Step 5: Commit**
```bash
git add lib/db.ts
git commit -m "feat: add curricula, learning_sessions, sr_items DB tables and query functions"
```

---

## Task 3: TypeScript Types

**Files:**
- Create: `lib/curriculum-types.ts`

- [ ] **Step 1: Create `lib/curriculum-types.ts`**

```typescript
/** A single module within a curriculum */
export interface CurriculumModule {
  id: string;                    // e.g. "m1", "m2"
  title: string;
  description: string;
  estimatedMinutes: number;
  prerequisiteIds: string[];
  learningObjectives: string[];
}

/** Raw row shape returned by getCurriculumById / getCurricula */
export interface CurriculumRow {
  id: number;
  title: string;
  goalStatement: string;
  domain: string;
  modulesJson: string;           // JSON-serialised CurriculumModule[]
  createdAt: string;
}

/** Curriculum with modules parsed from JSON */
export interface Curriculum extends Omit<CurriculumRow, 'modulesJson'> {
  modules: CurriculumModule[];
}

/** Chat message stored in learning_sessions.chat_history_json */
export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;             // ISO timestamp added client-side before saving
}

/** Raw row from learning_sessions */
export interface LearningSessionRow {
  id: number;
  curriculumId: number;
  moduleIndex: number;
  chatHistoryJson: string;       // JSON-serialised ChatMessage[]
  whatLanded: string;
  whatsFuzzy: string;
  confidence: number;
  nextAction: string;
  completedAt: string | null;
  createdAt: string;
}

/** Parsed domain options */
export const DOMAINS = [
  'AI',
  'game design',
  'gaming',
  'tech',
  'programming',
] as const;
export type Domain = (typeof DOMAINS)[number];

/** Parse CurriculumRow.modulesJson safely */
export function parseModules(modulesJson: string): CurriculumModule[] {
  try {
    const parsed = JSON.parse(modulesJson);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/** Parse LearningSessionRow.chatHistoryJson safely */
export function parseChatHistory(chatHistoryJson: string): ChatMessage[] {
  try {
    const parsed = JSON.parse(chatHistoryJson);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/** Convert minutes-since-midnight integer to HH:MM string */
export function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60).toString().padStart(2, '0');
  const m = (minutes % 60).toString().padStart(2, '0');
  return `${h}:${m}`;
}

/** Convert HH:MM string to minutes-since-midnight integer */
export function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}
```

- [ ] **Step 2: Type-check**
```
npx tsc --noEmit
```
Expected: no output

- [ ] **Step 3: Commit**
```bash
git add lib/curriculum-types.ts
git commit -m "feat: add curriculum TypeScript types and helper functions"
```

---

## Task 4: OpenRouter Client

**Files:**
- Create: `lib/openrouter.ts`

- [ ] **Step 1: Confirm `.env.local` exists**

Create `.env.local` at the repo root (never commit this file — it's in `.gitignore`):
```
OPENROUTER_API_KEY=sk-or-your-key-here
```

Verify `.gitignore` contains `.env.local` (it should already — Next.js adds it by default). If not, add it.

- [ ] **Step 2: Create `lib/openrouter.ts`**

```typescript
export interface OpenRouterMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

const BASE_URL = 'https://openrouter.ai/api/v1';
export const DEFAULT_MODEL = 'anthropic/claude-sonnet-4-5';

export class OpenRouterError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string
  ) {
    super(message);
    this.name = 'OpenRouterError';
  }
}

/**
 * Send a chat completion request to OpenRouter.
 * Throws OpenRouterError on API failure or missing key.
 * Caller is responsible for retries and user-facing error messages.
 */
export async function chatCompletion(
  messages: OpenRouterMessage[],
  model = DEFAULT_MODEL
): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new OpenRouterError(
      0,
      'OPENROUTER_API_KEY is not configured. Add it to .env.local and restart the dev server.'
    );
  }

  const response = await fetch(`${BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000',
      'X-Title': 'MomentumOS',
    },
    body: JSON.stringify({ model, messages, temperature: 0.7 }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new OpenRouterError(
      response.status,
      `OpenRouter API error ${response.status}: ${body.slice(0, 200)}`
    );
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string | null } }>;
  };
  const content = data.choices?.[0]?.message?.content;
  if (typeof content !== 'string' || !content.trim()) {
    throw new OpenRouterError(0, 'OpenRouter returned an empty response.');
  }
  return content;
}

/** Build the system prompt for curriculum generation. */
export function buildCurriculumPrompt(input: {
  goalStatement: string;
  domain: string;
  aboutMe: string;
  domains: string[];
}): OpenRouterMessage[] {
  const domainsStr = input.domains.join(', ') || 'AI, game design, gaming, tech';
  return [
    {
      role: 'system',
      content: `You are a learning curriculum designer. Generate a focused, structured curriculum.

User: Satbir — ${input.aboutMe || 'game designer and AI enthusiast, India-based, experienced in game design, new to programming'}.
User's domains of interest: ${domainsStr}.

Return ONLY a valid JSON object — no markdown fences, no explanation, just the JSON:
{
  "title": "Concise curriculum title",
  "modules": [
    {
      "id": "m1",
      "title": "Module title",
      "description": "What this module covers in one sentence",
      "estimatedMinutes": 45,
      "prerequisiteIds": [],
      "learningObjectives": ["Objective 1", "Objective 2", "Objective 3"]
    }
  ]
}

Rules:
- 4 to 7 modules
- Each module completable in 30–60 minutes
- Start simple, build progressively
- Connect to Satbir's domains where possible (game design examples, AI tools)
- No prerequisites for the first module`,
    },
    {
      role: 'user',
      content: `Goal: ${input.goalStatement}\nDomain: ${input.domain}`,
    },
  ];
}

/** Build the system prompt for a learning session chat. */
export function buildSessionPrompt(input: {
  curriculumTitle: string;
  moduleTitle: string;
  moduleDescription: string;
  learningObjectives: string[];
  priorFuzzy: string | null;
  aboutMe: string;
}): OpenRouterMessage {
  const objectives = input.learningObjectives.map((o) => `- ${o}`).join('\n');
  const priorContext = input.priorFuzzy
    ? `\nLast session note: "${input.priorFuzzy}" — keep this in mind.`
    : '';
  return {
    role: 'system',
    content: `You are a knowledgeable learning coach for Satbir — ${input.aboutMe || 'a game designer curious about AI and technology'}.

Curriculum: ${input.curriculumTitle}
Module: ${input.moduleTitle}
What this covers: ${input.moduleDescription}
Learning objectives:
${objectives}
${priorContext}

Guidelines:
- Answer clearly and concisely (2–3 paragraphs maximum unless more is genuinely needed)
- Connect concepts to game design or AI when it helps understanding
- If a question is vague, ask one clarifying question before answering
- Don't pad responses or add unnecessary caveats
- When the user seems to understand a concept, suggest they try the next objective`,
  };
}
```

- [ ] **Step 3: Type-check**
```
npx tsc --noEmit
```
Expected: no output

- [ ] **Step 4: Commit**
```bash
git add lib/openrouter.ts .gitignore
git commit -m "feat: add OpenRouter async client with curriculum and session prompt builders"
```

---

## Task 5: Learning Server Actions

**Files:**
- Create: `app/learn/actions.ts`
- Modify: `app/actions.ts` (add `updateProfileAction`)

- [ ] **Step 1: Create `app/learn/actions.ts`**

```typescript
'use server';

import { revalidatePath } from 'next/cache';
import { z, type ZodError } from 'zod';

import {
  completeSession,
  createSession,
  createSRItem,
  getCurriculumById,
  getSRItemWithContext,
  getLatestCompletedSession,
  getSessionById,
  saveCurriculum,
  updateSessionChat,
  updateSRItem,
} from '@/lib/db';
import { chatCompletion, buildCurriculumPrompt, buildSessionPrompt } from '@/lib/openrouter';
import { parseChatHistory, parseModules, type ChatMessage } from '@/lib/curriculum-types';
import { sm2Update, addDays, initialSRState } from '@/lib/sm2';
import { getUserProfile } from '@/lib/db';

// ─── Zod schemas ───────────────────────────────────────────────

const FIELD_LABELS: Record<string, string> = {
  goalStatement: 'Goal', domain: 'Domain', moduleIndex: 'Module',
  whatLanded: 'What landed', whatsFuzzy: "What's fuzzy",
  confidence: 'Confidence', nextAction: 'Next action',
};

function friendlyError(err: ZodError): string {
  const issue = err.issues[0];
  const key = String(issue.path[0] ?? '');
  const name = FIELD_LABELS[key] ?? (key || 'Input');
  if (issue.code === 'too_small') return `${name} can't be blank.`;
  return `${name}: ${issue.message}`;
}

function field(formData: FormData, key: string): string {
  return String(formData.get(key) ?? '');
}

// ─── Actions ───────────────────────────────────────────────────

/**
 * Generate a curriculum JSON from a user goal via OpenRouter,
 * save it to the DB, and return the new curriculum id.
 */
export async function generateCurriculumAction(formData: FormData): Promise<
  { ok: true; id: number } | { ok: false; message: string }
> {
  const schema = z.object({
    goalStatement: z.string().min(10).max(400),
    domain: z.string().min(1).max(60),
  });
  const parsed = schema.safeParse({
    goalStatement: field(formData, 'goalStatement'),
    domain: field(formData, 'domain'),
  });
  if (!parsed.success) return { ok: false, message: friendlyError(parsed.error) };

  const { goalStatement, domain } = parsed.data;
  const profile = getUserProfile();
  const aboutMe = profile?.about_me ?? '';
  const domainsArr: string[] = (() => {
    try { return JSON.parse(profile?.domains_json ?? '[]'); } catch { return []; }
  })();

  let rawJson: string;
  try {
    rawJson = await chatCompletion(buildCurriculumPrompt({ goalStatement, domain, aboutMe, domains: domainsArr }));
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'AI unavailable.';
    return { ok: false, message: msg };
  }

  // Parse and validate the JSON returned by the AI
  let modulesJson: string;
  try {
    const parsed = JSON.parse(rawJson) as { title?: string; modules?: unknown };
    if (!parsed.title || !Array.isArray(parsed.modules)) {
      throw new Error('Unexpected shape');
    }
    modulesJson = JSON.stringify(parsed.modules);
    const id = saveCurriculum({
      title: String(parsed.title),
      goalStatement,
      domain,
      modulesJson,
    });
    revalidatePath('/learn');
    return { ok: true, id };
  } catch {
    return { ok: false, message: "Couldn't parse the AI's response. Try again." };
  }
}

/**
 * Create a new learning session for curriculum+module, return sessionId.
 */
export async function startSessionAction(
  curriculumId: number,
  moduleIndex: number
): Promise<{ ok: true; sessionId: number } | { ok: false; message: string }> {
  try {
    const sessionId = createSession(curriculumId, moduleIndex);
    return { ok: true, sessionId };
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : 'Failed to start session.' };
  }
}

/**
 * Send a user message in a session, get AI reply, persist both.
 * Returns the assistant reply text.
 */
export async function sendMessageAction(
  sessionId: number,
  curriculumId: number,
  moduleIndex: number,
  userContent: string
): Promise<{ ok: true; reply: string } | { ok: false; message: string }> {
  if (!userContent.trim()) return { ok: false, message: 'Message cannot be blank.' };

  const curriculum = getCurriculumById(curriculumId);
  if (!curriculum) return { ok: false, message: 'Curriculum not found.' };
  const modules = parseModules(curriculum.modulesJson);
  const mod = modules[moduleIndex];
  if (!mod) return { ok: false, message: 'Module not found.' };

  const profile = getUserProfile();
  const priorSession = getLatestCompletedSession(curriculumId, moduleIndex);

  // Build system prompt
  const systemMsg = buildSessionPrompt({
    curriculumTitle: curriculum.title,
    moduleTitle: mod.title,
    moduleDescription: mod.description,
    learningObjectives: mod.learningObjectives,
    priorFuzzy: priorSession?.whatsFuzzy ?? null,
    aboutMe: profile?.about_me ?? '',
  });

  // Load current chat history from DB
  const sessionRow = getSessionById(sessionId);
  const existingHistory: ChatMessage[] = parseChatHistory(sessionRow?.chatHistoryJson ?? '[]');
  const now = new Date().toISOString();

  const newUserMsg: ChatMessage = { role: 'user', content: userContent, createdAt: now };
  const history: ChatMessage[] = [...existingHistory, newUserMsg];

  // Call OpenRouter with system prompt + full history
  let replyText: string;
  try {
    replyText = await chatCompletion([
      systemMsg,
      ...history.map(({ role, content }) => ({ role, content })),
    ]);
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : 'AI unavailable.' };
  }

  const assistantMsg: ChatMessage = { role: 'assistant', content: replyText, createdAt: new Date().toISOString() };
  const updatedHistory = [...history, assistantMsg];

  updateSessionChat(sessionId, JSON.stringify(updatedHistory));
  revalidatePath(`/learn/${curriculumId}/session`);

  return { ok: true, reply: replyText };
}

/**
 * Complete a session: save post-loop data and create/update SR item.
 */
export async function savePostSessionAction(formData: FormData): Promise<
  { ok: true } | { ok: false; message: string }
> {
  const schema = z.object({
    sessionId: z.coerce.number().int().positive(),
    curriculumId: z.coerce.number().int().positive(),
    whatLanded: z.string().min(1).max(400),
    whatsFuzzy: z.string().max(400).default(''),
    confidence: z.coerce.number().int().min(1).max(5),
    nextAction: z.string().min(1).max(200),
  });
  const result = schema.safeParse({
    sessionId: field(formData, 'sessionId'),
    curriculumId: field(formData, 'curriculumId'),
    whatLanded: field(formData, 'whatLanded'),
    whatsFuzzy: field(formData, 'whatsFuzzy'),
    confidence: field(formData, 'confidence'),
    nextAction: field(formData, 'nextAction'),
  });
  if (!result.success) return { ok: false, message: friendlyError(result.error) };

  const { sessionId, curriculumId, whatLanded, whatsFuzzy, confidence, nextAction } = result.data;

  completeSession(sessionId, { whatLanded, whatsFuzzy, confidence, nextAction });

  // Create SR item for this session (next review = tomorrow)
  const today = new Date().toISOString().slice(0, 10);
  const nextReviewDate = addDays(today, 1);
  createSRItem('learning_session', sessionId, nextReviewDate);

  revalidatePath('/learn');
  revalidatePath(`/learn/${curriculumId}`);
  return { ok: true };
}

/**
 * Submit an SR review: update SM-2 state.
 * quality: 2 = Not really, 3 = Somewhat, 5 = Yes clearly
 */
export async function submitSRReviewAction(
  srItemId: number,
  quality: 2 | 3 | 5
): Promise<{ ok: true } | { ok: false; message: string }> {
  const item = getSRItemWithContext(srItemId);
  if (!item) return { ok: false, message: 'SR item not found.' };

  const newState = sm2Update({ n: item.n, ef: item.ef, intervalDays: item.intervalDays }, quality);
  const today = new Date().toISOString().slice(0, 10);
  const nextDate = addDays(today, newState.intervalDays);
  updateSRItem(srItemId, newState.n, newState.ef, newState.intervalDays, nextDate);

  revalidatePath('/learn');
  revalidatePath('/');
  return { ok: true };
}
```

> **Note:** `getSessionById` must be added to `lib/db.ts` (Task 2 Step 2 covers this — it's included in the DB query additions).

- [ ] **Step 2: Add `updateProfileAction` to `app/actions.ts`**

Append to `app/actions.ts`:

```typescript
import { updateUserProfile } from '@/lib/db';
import { timeToMinutes } from '@/lib/curriculum-types';

const profileSchema = z.object({
  display_name: z.string().min(1).max(60),
  about_me: z.string().max(500).default(''),
  domains: z.string().default('[]'),
  sadhana_morning_end: z.string().min(1),
  sadhana_afternoon_start: z.string().min(1),
  sadhana_afternoon_end: z.string().min(1),
  work_start: z.string().min(1),
  work_end: z.string().min(1),
});

export async function updateProfileAction(formData: FormData): Promise<
  { ok: true; message: string } | { ok: false; message: string }
> {
  const result = profileSchema.safeParse({
    display_name: field(formData, 'display_name'),
    about_me: field(formData, 'about_me'),
    domains: field(formData, 'domains'),
    sadhana_morning_end: field(formData, 'sadhana_morning_end'),
    sadhana_afternoon_start: field(formData, 'sadhana_afternoon_start'),
    sadhana_afternoon_end: field(formData, 'sadhana_afternoon_end'),
    work_start: field(formData, 'work_start'),
    work_end: field(formData, 'work_end'),
  });
  if (!result.success) return { ok: false, message: friendlyError(result.error) };

  const d = result.data;
  updateUserProfile({
    display_name: d.display_name,
    about_me: d.about_me,
    domains_json: d.domains,
    sadhana_morning_end: timeToMinutes(d.sadhana_morning_end),
    sadhana_afternoon_start: timeToMinutes(d.sadhana_afternoon_start),
    sadhana_afternoon_end: timeToMinutes(d.sadhana_afternoon_end),
    work_start: timeToMinutes(d.work_start),
    work_end: timeToMinutes(d.work_end),
  });
  revalidatePath('/profile');
  revalidatePath('/');
  return { ok: true, message: 'Profile saved.' };
}
```

Note: `friendlyError` and `field` are already defined in `app/actions.ts` — do not re-define them.

- [ ] **Step 3: Type-check**
```
npx tsc --noEmit
```
Expected: no output

- [ ] **Step 4: Commit**
```bash
git add app/learn/actions.ts app/actions.ts lib/db.ts
git commit -m "feat: add learning server actions (curriculum generation, chat, post-session, SR review, profile)"
```

---

## Task 6: Navigation + Layout

**Files:**
- Create: `components/nav.tsx`
- Modify: `app/layout.tsx`

- [ ] **Step 1: Create `components/nav.tsx`**

```tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BookOpen, LayoutDashboard, User } from 'lucide-react';
import { cx } from '@/lib/utils';

const LINKS = [
  { href: '/', label: 'Daily OS', icon: LayoutDashboard },
  { href: '/learn', label: 'Learn', icon: BookOpen },
  { href: '/profile', label: 'Profile', icon: User },
];

export function Nav() {
  const pathname = usePathname();
  return (
    <nav
      style={{
        background: 'var(--bg-surface)',
        borderBottom: '1px solid var(--border)',
        padding: '0 var(--space-6)',
        position: 'sticky',
        top: 0,
        zIndex: 40,
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-1)',
        height: '48px',
      }}
    >
      <span
        style={{
          fontSize: '0.75rem',
          fontWeight: 700,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: 'var(--accent)',
          marginRight: 'var(--space-6)',
        }}
      >
        MomentumOS
      </span>
      {LINKS.map(({ href, label, icon: Icon }) => {
        const active = href === '/' ? pathname === '/' : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={cx(
              'flex items-center gap-1.5 px-3 py-1.5 rounded text-sm transition-colors',
              active
                ? 'text-[var(--accent)] bg-[var(--accent-subtle)]'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            )}
          >
            <Icon size={14} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
```

- [ ] **Step 2: Update `app/layout.tsx`**

Replace the entire file:

```tsx
import type { Metadata } from 'next';
import { ToasterProvider } from '@/components/toaster';
import { Nav } from '@/components/nav';
import './globals.css';

export const metadata: Metadata = {
  title: 'MomentumOS',
  description: "A focused operating system for Satbir's priorities, learning, and reflection.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="app-shell">
        <ToasterProvider>
          <Nav />
          {children}
        </ToasterProvider>
      </body>
    </html>
  );
}
```

- [ ] **Step 3: Type-check**
```
npx tsc --noEmit
```

- [ ] **Step 4: Start dev server and verify nav appears**

Run `npm run dev`, open `http://localhost:3000`. You should see the sticky nav bar at the top with three links: Daily OS, Learn, Profile. Clicking Learn and Profile will 404 (pages not built yet — that's expected).

- [ ] **Step 5: Commit**
```bash
git add components/nav.tsx app/layout.tsx
git commit -m "feat: add sticky top navigation with Daily OS, Learn, and Profile links"
```

---

## Task 7: User Profile Page

**Files:**
- Create: `app/profile/page.tsx`

- [ ] **Step 1: Create `app/profile/page.tsx`**

```tsx
import { getUserProfile } from '@/lib/db';
import { updateProfileAction } from '@/app/actions';
import { minutesToTime, DOMAINS } from '@/lib/curriculum-types';

export const dynamic = 'force-dynamic';

export default function ProfilePage() {
  const profile = getUserProfile();
  const domains: string[] = (() => {
    try { return JSON.parse(profile?.domains_json ?? '[]'); } catch { return []; }
  })();

  return (
    <main className="page-wrapper">
      <div style={{ maxWidth: 560, paddingTop: 'var(--space-8)' }}>
        <h1 style={{ fontSize: '1.8rem', fontWeight: 700, marginBottom: 'var(--space-2)', color: 'var(--text-primary)' }}>
          Profile
        </h1>
        <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-8)', fontSize: '0.9rem' }}>
          This context is injected into AI prompts. Keep it current.
        </p>

        <ProfileForm profile={profile} currentDomains={domains} />
      </div>
    </main>
  );
}

// Client component for the form (needs useTransition for loading state)
import { ProfileForm } from '@/components/profile-form';
```

- [ ] **Step 2: Create `components/profile-form.tsx`**

```tsx
'use client';

import { useTransition } from 'react';
import { updateProfileAction } from '@/app/actions';
import { minutesToTime, DOMAINS } from '@/lib/curriculum-types';
import type { UserProfile } from '@/lib/types';

interface Props {
  profile: UserProfile | null;
  currentDomains: string[];
}

export function ProfileForm({ profile, currentDomains }: Props) {
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);

  function handleSubmit(formData: FormData) {
    // Collect checked domains into JSON string
    const checkedDomains = DOMAINS.filter(
      (d) => formData.get(`domain_${d}`) === 'on'
    );
    formData.set('domains', JSON.stringify(checkedDomains));

    startTransition(async () => {
      const result = await updateProfileAction(formData);
      setMessage({ text: result.message, ok: result.ok });
    });
  }

  const p = profile;
  return (
    <form action={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <div>
        <label className="soft-close-label">Display name</label>
        <input
          name="display_name"
          defaultValue={p?.display_name ?? 'Satbir'}
          className="input"
        />
      </div>

      <div>
        <label className="soft-close-label">About me (fed into AI prompts)</label>
        <textarea
          name="about_me"
          defaultValue={p?.about_me ?? ''}
          className="textarea"
          rows={4}
          placeholder="Game designer. Meditator. Curious about AI and game design."
        />
      </div>

      <div>
        <label className="soft-close-label">Domains of focus</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)', marginTop: 'var(--space-2)' }}>
          {DOMAINS.map((d) => (
            <label
              key={d}
              style={{
                display: 'flex', alignItems: 'center', gap: 'var(--space-2)',
                cursor: 'pointer', fontSize: '0.875rem', color: 'var(--text-secondary)',
              }}
            >
              <input
                type="checkbox"
                name={`domain_${d}`}
                defaultChecked={currentDomains.includes(d)}
              />
              {d}
            </label>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
        <div>
          <label className="soft-close-label">Morning sadhana ends</label>
          <input type="time" name="sadhana_morning_end" defaultValue={minutesToTime(p?.sadhana_morning_end ?? 480)} className="input" />
        </div>
        <div>
          <label className="soft-close-label">Work day starts</label>
          <input type="time" name="work_start" defaultValue={minutesToTime(p?.work_start ?? 480)} className="input" />
        </div>
        <div>
          <label className="soft-close-label">Afternoon sadhana starts</label>
          <input type="time" name="sadhana_afternoon_start" defaultValue={minutesToTime(p?.sadhana_afternoon_start ?? 840)} className="input" />
        </div>
        <div>
          <label className="soft-close-label">Afternoon sadhana ends</label>
          <input type="time" name="sadhana_afternoon_end" defaultValue={minutesToTime(p?.sadhana_afternoon_end ?? 900)} className="input" />
        </div>
        <div>
          <label className="soft-close-label">Work day ends</label>
          <input type="time" name="work_end" defaultValue={minutesToTime(p?.work_end ?? 1110)} className="input" />
        </div>
      </div>

      {message && (
        <p style={{ fontSize: '0.875rem', color: message.ok ? 'var(--success)' : 'var(--error)' }}>
          {message.text}
        </p>
      )}

      <button type="submit" className="btn-primary" disabled={isPending}>
        {isPending ? 'Saving…' : 'Save profile'}
      </button>
    </form>
  );
}

import { useState } from 'react';
```

> **Note on import order:** Move the `import { useState } from 'react'` to the top of the file. It's shown at the bottom here for readability but must be at the top in the actual file. Imports in `profile-form.tsx` should be:
```tsx
'use client';
import { useState, useTransition } from 'react';
import { updateProfileAction } from '@/app/actions';
import { minutesToTime, DOMAINS } from '@/lib/curriculum-types';
import type { UserProfile } from '@/lib/types';
```

- [ ] **Step 3: Type-check**
```
npx tsc --noEmit
```

- [ ] **Step 4: Verify in browser**

Open `http://localhost:3000/profile`. You should see the profile form with Satbir's defaults. Submit — the "Profile saved." message should appear.

- [ ] **Step 5: Commit**
```bash
git add app/profile/page.tsx components/profile-form.tsx
git commit -m "feat: add user profile page with domain, schedule, and about-me fields"
```

---

## Task 8: Learning Coach Home + Curriculum Card

**Files:**
- Create: `app/learn/page.tsx`
- Create: `components/curriculum-card.tsx`

- [ ] **Step 1: Create `components/curriculum-card.tsx`**

```tsx
import Link from 'next/link';
import { BookOpen, ChevronRight } from 'lucide-react';
import { parseModules } from '@/lib/curriculum-types';

interface Props {
  id: number;
  title: string;
  goalStatement: string;
  domain: string;
  modulesJson: string;
  completedSessions: number;
}

export function CurriculumCard({ id, title, goalStatement, domain, modulesJson, completedSessions }: Props) {
  const modules = parseModules(modulesJson);
  const progress = modules.length > 0
    ? `${Math.min(completedSessions, modules.length)}/${modules.length} modules`
    : 'No modules yet';

  return (
    <Link
      href={`/learn/${id}`}
      style={{
        display: 'block',
        background: 'var(--bg-surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        padding: 'var(--space-5)',
        transition: 'border-color 0.15s',
        textDecoration: 'none',
      }}
      className="hover:border-[var(--accent-muted)]"
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center', marginBottom: 'var(--space-2)' }}>
            <BookOpen size={14} style={{ color: 'var(--accent)' }} />
            <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--accent-muted)' }}>
              {domain}
            </span>
          </div>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 'var(--space-1)' }}>
            {title}
          </h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            {goalStatement}
          </p>
        </div>
        <ChevronRight size={16} style={{ color: 'var(--text-muted)', marginLeft: 'var(--space-4)', flexShrink: 0 }} />
      </div>
      <div style={{ marginTop: 'var(--space-4)', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
        {progress}
      </div>
    </Link>
  );
}
```

- [ ] **Step 2: Create `app/learn/page.tsx`**

```tsx
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { getCurricula, getCurriculumSessionCount, getSRItemsDueCount } from '@/lib/db';
import { CurriculumCard } from '@/components/curriculum-card';

export const dynamic = 'force-dynamic';

export default function LearnPage() {
  const curricula = getCurricula();
  const srDueCount = getSRItemsDueCount();

  return (
    <main className="page-wrapper">
      <div style={{ paddingTop: 'var(--space-8)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 'var(--space-6)' }}>
          <div>
            <h1 style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 'var(--space-1)' }}>
              Learning Coach
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              Structured paths through topics you care about.
            </p>
          </div>
          <Link href="/learn/new" className="btn-primary" style={{ textDecoration: 'none', display: 'inline-block' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
              <Plus size={14} />
              New curriculum
            </span>
          </Link>
        </div>

        {srDueCount > 0 && (
          <div className="overload-prompt" style={{ marginBottom: 'var(--space-6)' }}>
            <span>
              {srDueCount} {srDueCount === 1 ? 'review' : 'reviews'} due today —
            </span>
            <Link href="#reviews" className="btn-link" style={{ marginLeft: 'var(--space-1)' }}>
              review now
            </Link>
          </div>
        )}

        {curricula.length === 0 ? (
          <div style={{
            textAlign: 'center', padding: 'var(--space-16)',
            border: '1px dashed var(--border)', borderRadius: 'var(--radius-lg)',
            color: 'var(--text-muted)',
          }}>
            <p style={{ fontSize: '1rem', marginBottom: 'var(--space-3)' }}>No curricula yet.</p>
            <Link href="/learn/new" className="btn-ghost">Start your first curriculum</Link>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            {curricula.map((c) => (
              <CurriculumCard
                key={c.id}
                id={c.id}
                title={c.title}
                goalStatement={c.goalStatement}
                domain={c.domain}
                modulesJson={c.modulesJson}
                completedSessions={getCurriculumSessionCount(c.id)}
              />
            ))}
          </div>
        )}

        {srDueCount > 0 && (
          <SRReviewSection id="reviews" />
        )}
      </div>
    </main>
  );
}

// Inline SR section (renders due items server-side)
import { getSRItemsDue, getSRItemWithContext } from '@/lib/db';
import { SRReviewCard } from '@/components/sr-review-card';

function SRReviewSection({ id }: { id: string }) {
  const dueItems = getSRItemsDue();
  const itemsWithContext = dueItems
    .map((item) => getSRItemWithContext(item.id))
    .filter((item): item is NonNullable<typeof item> => item !== null);

  if (itemsWithContext.length === 0) return null;

  return (
    <div id={id} style={{ marginTop: 'var(--space-10)' }}>
      <h2 style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: 'var(--space-4)', color: 'var(--text-primary)' }}>
        Reviews due
      </h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
        {itemsWithContext.map((item) => {
          const modules = (() => {
            try { return JSON.parse(item.modulesJson) as Array<{ title: string }>; } catch { return []; }
          })();
          const moduleTitle = modules[item.moduleIndex]?.title ?? `Module ${item.moduleIndex + 1}`;
          return (
            <SRReviewCard
              key={item.id}
              srItemId={item.id}
              curriculumTitle={item.curriculumTitle}
              moduleTitle={moduleTitle}
              whatsFuzzy={item.whatsFuzzy}
              nextAction={item.nextAction}
            />
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Type-check and build check**
```
npx tsc --noEmit
```

- [ ] **Step 4: Verify in browser**

Open `http://localhost:3000/learn`. You should see the Learning Coach home page with an empty state and "New curriculum" button. The SR section is blank if no reviews are due.

- [ ] **Step 5: Commit**
```bash
git add app/learn/page.tsx components/curriculum-card.tsx
git commit -m "feat: add Learning Coach home page with curriculum list and SR review section"
```

---

## Task 9: Curriculum Builder + Detail Page

**Files:**
- Create: `app/learn/new/page.tsx`
- Create: `app/learn/[id]/page.tsx`

- [ ] **Step 1: Create `app/learn/new/page.tsx`**

```tsx
import { CurriculumBuilderForm } from '@/components/curriculum-builder-form';

export default function NewCurriculumPage() {
  return (
    <main className="page-wrapper">
      <div style={{ maxWidth: 640, paddingTop: 'var(--space-8)' }}>
        <h1 style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 'var(--space-2)' }}>
          New Curriculum
        </h1>
        <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-8)', fontSize: '0.9rem' }}>
          Describe what you want to learn. The AI builds a structured path.
        </p>
        <CurriculumBuilderForm />
      </div>
    </main>
  );
}
```

- [ ] **Step 2: Create `components/curriculum-builder-form.tsx`**

```tsx
'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { generateCurriculumAction } from '@/app/learn/actions';
import { DOMAINS, parseModules } from '@/lib/curriculum-types';
import type { CurriculumModule } from '@/lib/curriculum-types';

export function CurriculumBuilderForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await generateCurriculumAction(formData);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      router.push(`/learn/${result.id}`);
    });
  }

  return (
    <form action={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
      <div>
        <label className="soft-close-label">What do you want to learn?</label>
        <textarea
          name="goalStatement"
          className="textarea"
          rows={4}
          placeholder="I want to understand programming basics so I can guide AI tools more precisely in my game design workflow."
          required
        />
        <p style={{ marginTop: 'var(--space-2)', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          Be specific — the more context, the better the curriculum.
        </p>
      </div>

      <div>
        <label className="soft-close-label">Domain</label>
        <select name="domain" className="input" defaultValue="AI">
          {DOMAINS.map((d) => (
            <option key={d} value={d}>{d}</option>
          ))}
          <option value="other">Other</option>
        </select>
      </div>

      {error && (
        <p style={{ fontSize: '0.875rem', color: 'var(--error)', padding: 'var(--space-3)', background: 'rgba(224,92,92,0.08)', borderRadius: 'var(--radius-sm)' }}>
          {error}
        </p>
      )}

      <button type="submit" className="btn-primary" disabled={isPending}>
        {isPending ? 'Generating curriculum…' : 'Generate curriculum'}
      </button>

      {isPending && (
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textAlign: 'center' }}>
          Asking the AI to design your path. This takes about 10 seconds.
        </p>
      )}
    </form>
  );
}
```

- [ ] **Step 3: Create `app/learn/[id]/page.tsx`**

```tsx
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getCurriculumById, getSessionsForCurriculum } from '@/lib/db';
import { parseModules } from '@/lib/curriculum-types';
import { CheckCircle2, Circle, Clock } from 'lucide-react';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function CurriculumPage({ params }: Props) {
  const { id } = await params;
  const curriculum = getCurriculumById(Number(id));
  if (!curriculum) notFound();

  const modules = parseModules(curriculum.modulesJson);
  const sessions = getSessionsForCurriculum(curriculum.id);

  // Determine completion status per module: has at least one completed session
  const completedModuleIndices = new Set(
    sessions.filter((s) => s.completedAt !== null).map((s) => s.moduleIndex)
  );

  return (
    <main className="page-wrapper">
      <div style={{ maxWidth: 720, paddingTop: 'var(--space-8)' }}>
        <div style={{ marginBottom: 'var(--space-6)' }}>
          <Link href="/learn" style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            ← Learning Coach
          </Link>
        </div>

        <div style={{ marginBottom: 'var(--space-8)' }}>
          <p style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--accent-muted)', marginBottom: 'var(--space-2)' }}>
            {curriculum.domain}
          </p>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 'var(--space-2)' }}>
            {curriculum.title}
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            {curriculum.goalStatement}
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {modules.map((mod, index) => {
            const done = completedModuleIndices.has(index);
            return (
              <div
                key={mod.id}
                style={{
                  background: 'var(--bg-surface)',
                  border: `1px solid ${done ? 'rgba(76,175,125,0.3)' : 'var(--border)'}`,
                  borderRadius: 'var(--radius-md)',
                  padding: 'var(--space-5)',
                  display: 'flex',
                  gap: 'var(--space-4)',
                  alignItems: 'flex-start',
                }}
              >
                <div style={{ marginTop: 2, flexShrink: 0 }}>
                  {done
                    ? <CheckCircle2 size={18} style={{ color: 'var(--success)' }} />
                    : <Circle size={18} style={{ color: 'var(--text-muted)' }} />
                  }
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: 'var(--space-1)' }}>
                    {index + 1}. {mod.title}
                  </p>
                  <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: 'var(--space-3)' }}>
                    {mod.description}
                  </p>
                  <div style={{ display: 'flex', gap: 'var(--space-4)', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Clock size={12} /> {mod.estimatedMinutes} min
                    </span>
                    <Link
                      href={`/learn/${curriculum.id}/session?module=${index}`}
                      className="btn-small btn-ghost"
                      style={{ textDecoration: 'none' }}
                    >
                      {done ? 'Review again' : 'Start session'}
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}
```

- [ ] **Step 4: Type-check**
```
npx tsc --noEmit
```

- [ ] **Step 5: Test curriculum generation end-to-end**

1. Ensure `.env.local` has `OPENROUTER_API_KEY` set and dev server is running
2. Navigate to `http://localhost:3000/learn/new`
3. Enter a goal: "I want to understand how to write simple JavaScript functions so I can read and modify AI-generated code"
4. Select domain: "programming"
5. Click "Generate curriculum" — wait ~10 seconds
6. You should be redirected to `/learn/[id]` with 4–7 modules listed

- [ ] **Step 6: Commit**
```bash
git add app/learn/new/page.tsx components/curriculum-builder-form.tsx app/learn/[id]/page.tsx
git commit -m "feat: add curriculum builder and curriculum detail page"
```

---

## Task 10: SR Review Card

**Files:**
- Create: `components/sr-review-card.tsx`

This component is referenced in Task 8 (`LearnPage`) — it must exist before Task 8's `npm run build` passes. The task ordering is correct: Task 8's commit does NOT run a build check; this task fills the gap.

- [ ] **Step 1: Create `components/sr-review-card.tsx`**

```tsx
'use client';

import { useTransition } from 'react';
import { submitSRReviewAction } from '@/app/learn/actions';

interface Props {
  srItemId: number;
  curriculumTitle: string;
  moduleTitle: string;
  whatsFuzzy: string;
  nextAction: string;
}

export function SRReviewCard({ srItemId, curriculumTitle, moduleTitle, whatsFuzzy, nextAction }: Props) {
  const [isPending, startTransition] = useTransition();
  const [done, setDone] = useState(false);

  function submit(quality: 2 | 3 | 5) {
    startTransition(async () => {
      await submitSRReviewAction(srItemId, quality);
      setDone(true);
    });
  }

  if (done) {
    return (
      <div style={{
        background: 'var(--bg-surface)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius-md)', padding: 'var(--space-4)',
        color: 'var(--text-muted)', fontSize: '0.875rem',
      }}>
        ✓ Review recorded
      </div>
    );
  }

  return (
    <div style={{
      background: 'var(--bg-surface)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-md)',
      padding: 'var(--space-5)',
    }}>
      <p style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--accent-muted)', marginBottom: 'var(--space-2)' }}>
        {curriculumTitle} · {moduleTitle}
      </p>
      <p style={{ fontSize: '0.9rem', color: 'var(--text-primary)', marginBottom: 'var(--space-2)', fontStyle: 'italic' }}>
        "{whatsFuzzy || nextAction}"
      </p>
      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 'var(--space-4)' }}>
        Does this still feel relevant / understood?
      </p>
      <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
        <button
          className="btn-small btn-ghost"
          onClick={() => submit(2)}
          disabled={isPending}
        >
          Not really
        </button>
        <button
          className="btn-small btn-ghost"
          onClick={() => submit(3)}
          disabled={isPending}
        >
          Somewhat
        </button>
        <button
          className="btn-small btn-selected"
          onClick={() => submit(5)}
          disabled={isPending}
        >
          Yes, clearly
        </button>
      </div>
    </div>
  );
}

import { useState } from 'react';
```

> **Note:** Move `import { useState } from 'react'` to the top of the file.

- [ ] **Step 2: Type-check**
```
npx tsc --noEmit
```

- [ ] **Step 3: Commit**
```bash
git add components/sr-review-card.tsx
git commit -m "feat: add SR review card with three-quality rating buttons"
```

---

## Task 11: Learning Session UI

**Files:**
- Create: `app/learn/[id]/session/page.tsx`
- Create: `components/session-chat.tsx`

- [ ] **Step 1: Create `components/session-chat.tsx`**

```tsx
'use client';

import { useState, useTransition, useRef, useEffect } from 'react';
import { sendMessageAction, savePostSessionAction, startSessionAction } from '@/app/learn/actions';
import type { ChatMessage } from '@/lib/curriculum-types';
import { Send } from 'lucide-react';

interface Props {
  curriculumId: number;
  moduleIndex: number;
  priorFuzzy: string | null;
  initialSessionId: number | null; // null = no active session yet
  initialHistory: ChatMessage[];
}

export function SessionChat({ curriculumId, moduleIndex, priorFuzzy, initialSessionId, initialHistory }: Props) {
  const [sessionId, setSessionId] = useState<number | null>(initialSessionId);
  const [messages, setMessages] = useState<ChatMessage[]>(initialHistory);
  const [inputValue, setInputValue] = useState('');
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [showPostLoop, setShowPostLoop] = useState(false);
  const [postDone, setPostDone] = useState(false);
  const [postError, setPostError] = useState<string | null>(null);
  const [postPending, startPostTransition] = useTransition();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function ensureSession(): Promise<number | null> {
    if (sessionId !== null) return sessionId;
    const result = await startSessionAction(curriculumId, moduleIndex);
    if (!result.ok) { setError(result.message); return null; }
    setSessionId(result.sessionId);
    return result.sessionId;
  }

  function handleSend() {
    const content = inputValue.trim();
    if (!content || isPending) return;
    setInputValue('');
    setError(null);

    startTransition(async () => {
      const sid = await ensureSession();
      if (sid === null) return;

      const result = await sendMessageAction(sid, curriculumId, moduleIndex, content);
      if (!result.ok) { setError(result.message); return; }

      const now = new Date().toISOString();
      setMessages((prev) => [
        ...prev,
        { role: 'user', content, createdAt: now },
        { role: 'assistant', content: result.reply, createdAt: new Date().toISOString() },
      ]);
    });
  }

  function handlePostSubmit(formData: FormData) {
    if (sessionId === null) return;
    formData.set('sessionId', String(sessionId));
    formData.set('curriculumId', String(curriculumId));
    setPostError(null);
    startPostTransition(async () => {
      const result = await savePostSessionAction(formData);
      if (!result.ok) { setPostError(result.message); return; }
      setPostDone(true);
    });
  }

  if (postDone) {
    return (
      <div style={{ textAlign: 'center', padding: 'var(--space-12)', color: 'var(--text-secondary)' }}>
        <p style={{ fontSize: '1.1rem', marginBottom: 'var(--space-4)' }}>Session saved. Review scheduled.</p>
        <a href={`/learn/${curriculumId}`} className="btn-ghost" style={{ textDecoration: 'none', display: 'inline-block' }}>
          Back to curriculum
        </a>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 120px)', maxWidth: 720, margin: '0 auto' }}>
      {/* Pre-session context */}
      {priorFuzzy && messages.length === 0 && (
        <div style={{
          background: 'var(--accent-subtle)', border: '1px solid rgba(232,169,69,0.15)',
          borderRadius: 'var(--radius-sm)', padding: 'var(--space-4)',
          fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: 'var(--space-4)',
        }}>
          <strong style={{ color: 'var(--accent-muted)' }}>Last session: </strong>
          {priorFuzzy}
        </div>
      )}

      {/* Message list */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', paddingBottom: 'var(--space-4)' }}>
        {messages.length === 0 && (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', textAlign: 'center', paddingTop: 'var(--space-8)' }}>
            Ask your first question to start the session.
          </p>
        )}
        {messages.map((msg, i) => (
          <div
            key={i}
            style={{
              alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
              maxWidth: '80%',
              background: msg.role === 'user' ? 'var(--accent-subtle)' : 'var(--bg-elevated)',
              border: `1px solid ${msg.role === 'user' ? 'rgba(232,169,69,0.2)' : 'var(--border)'}`,
              borderRadius: 'var(--radius-md)',
              padding: 'var(--space-3) var(--space-4)',
              fontSize: '0.9rem',
              lineHeight: 1.6,
              color: 'var(--text-primary)',
              whiteSpace: 'pre-wrap',
            }}
          >
            {msg.content}
          </div>
        ))}
        {isPending && (
          <div style={{
            alignSelf: 'flex-start',
            background: 'var(--bg-elevated)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)', padding: 'var(--space-3) var(--space-4)',
            color: 'var(--text-muted)', fontSize: '0.875rem',
          }}>
            Thinking…
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Error */}
      {error && (
        <p style={{ fontSize: '0.875rem', color: 'var(--error)', marginBottom: 'var(--space-3)' }}>{error}</p>
      )}

      {/* Input */}
      {!showPostLoop && (
        <div style={{ display: 'flex', gap: 'var(--space-2)', borderTop: '1px solid var(--border)', paddingTop: 'var(--space-4)' }}>
          <textarea
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
            }}
            placeholder="Ask a question… (Enter to send, Shift+Enter for new line)"
            className="textarea"
            style={{ flex: 1, minHeight: 48, maxHeight: 120, resize: 'none' }}
            disabled={isPending}
          />
          <button
            type="button"
            onClick={handleSend}
            disabled={isPending || !inputValue.trim()}
            className="btn-primary"
            aria-label="Send"
          >
            <Send size={16} />
          </button>
        </div>
      )}

      {/* "I'm done learning" → post-session form */}
      {!showPostLoop && messages.length > 0 && (
        <button
          type="button"
          className="btn-ghost"
          style={{ marginTop: 'var(--space-3)', fontSize: '0.85rem' }}
          onClick={() => setShowPostLoop(true)}
        >
          I'm done for this session →
        </button>
      )}

      {/* Post-session loop */}
      {showPostLoop && (
        <form
          action={handlePostSubmit}
          style={{ borderTop: '1px solid var(--border)', paddingTop: 'var(--space-6)', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}
        >
          <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>Session wrap-up</h3>
          <div>
            <label className="soft-close-label">What landed?</label>
            <textarea name="whatLanded" className="textarea" rows={2} placeholder="The main insight or technique that clicked." required />
          </div>
          <div>
            <label className="soft-close-label">What's still fuzzy?</label>
            <textarea name="whatsFuzzy" className="textarea" rows={2} placeholder="What still feels unclear or needs more time." />
          </div>
          <div>
            <label className="soft-close-label">Confidence (1–5)</label>
            <select name="confidence" className="input" defaultValue="3">
              {[1, 2, 3, 4, 5].map((v) => (
                <option key={v} value={v}>{v} — {['', 'Very shaky', 'Shaky', 'Getting there', 'Solid', 'Confident'][v]}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="soft-close-label">Next action</label>
            <input name="nextAction" className="input" placeholder="The one thing to try or read next." required />
          </div>
          {postError && (
            <p style={{ fontSize: '0.875rem', color: 'var(--error)' }}>{postError}</p>
          )}
          <button type="submit" className="btn-primary" disabled={postPending}>
            {postPending ? 'Saving…' : 'Save session'}
          </button>
        </form>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Create `app/learn/[id]/session/page.tsx`**

```tsx
import { notFound } from 'next/navigation';
import { getCurriculumById, getLatestCompletedSession } from '@/lib/db';
import { parseModules, parseChatHistory } from '@/lib/curriculum-types';
import { SessionChat } from '@/components/session-chat';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ module?: string }>;
}

export default async function SessionPage({ params, searchParams }: Props) {
  const { id } = await params;
  const { module: moduleParam } = await searchParams;
  const moduleIndex = parseInt(moduleParam ?? '0', 10);

  const curriculum = getCurriculumById(Number(id));
  if (!curriculum) notFound();

  const modules = parseModules(curriculum.modulesJson);
  const mod = modules[moduleIndex];
  if (!mod) notFound();

  // Get prior session's "what's fuzzy" for pre-session context
  const priorSession = getLatestCompletedSession(curriculum.id, moduleIndex);

  return (
    <main className="page-wrapper" style={{ paddingTop: 'var(--space-6)' }}>
      <div style={{ marginBottom: 'var(--space-4)' }}>
        <a href={`/learn/${curriculum.id}`} style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textDecoration: 'none' }}>
          ← {curriculum.title}
        </a>
      </div>
      <div style={{ marginBottom: 'var(--space-5)' }}>
        <p style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--accent-muted)', marginBottom: 'var(--space-1)' }}>
          Module {moduleIndex + 1}
        </p>
        <h1 style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 'var(--space-1)' }}>
          {mod.title}
        </h1>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{mod.description}</p>
      </div>
      <SessionChat
        curriculumId={curriculum.id}
        moduleIndex={moduleIndex}
        priorFuzzy={priorSession?.whatsFuzzy ?? null}
        initialSessionId={null}
        initialHistory={[]}
      />
    </main>
  );
}
```

- [ ] **Step 3: Type-check**
```
npx tsc --noEmit
```

- [ ] **Step 4: End-to-end test of a session**

1. Create a curriculum (if not done in Task 9's test)
2. Click "Start session" on the first module
3. Ask: "What's the best way to start learning this?"
4. Verify AI responds in the chat
5. Click "I'm done for this session →"
6. Fill in post-session fields and save
7. Verify redirect to curriculum detail page with module showing checkmark
8. Navigate to `/learn` — verify SR count badge shows "1 review due"

- [ ] **Step 5: Commit**
```bash
git add app/learn/[id]/session/page.tsx components/session-chat.tsx
git commit -m "feat: add learning session UI with pre-session context, chat, and post-session loop"
```

---

## Task 12: SR Reminder in Dashboard + Final Verification

**Files:**
- Modify: `app/page.tsx`
- Modify: `components/momentum-dashboard.tsx`

- [ ] **Step 1: Update `app/page.tsx` to pass SR due count**

In `app/page.tsx`, add the import and query:

```typescript
import { getDashboardData, getUserProfile, getRecentGreetingIds, getSRItemsDueCount } from '@/lib/db';
```

Inside the `Home()` function, after `const recentIds = getRecentGreetingIds(30);`, add:

```typescript
const srDueCount = getSRItemsDueCount();
```

Update the `<MomentumDashboard>` JSX to pass the new prop:
```tsx
return (
  <MomentumDashboard
    data={data}
    greeting={greeting}
    currentMode={mode}
    userProfile={profile}
    srDueCount={srDueCount}
  />
);
```

- [ ] **Step 2: Update `MomentumDashboard` to accept and display `srDueCount`**

In `components/momentum-dashboard.tsx`:

Add `srDueCount: number` to the `Props` interface:
```typescript
interface Props {
  data: DashboardData;
  greeting: GreetingMessage;
  currentMode: TimeMode;
  userProfile: UserProfile | null;
  srDueCount: number;
}
```

Add `srDueCount` to the destructured props:
```typescript
export function MomentumDashboard({
  data,
  greeting,
  currentMode,
  userProfile: _userProfile,
  srDueCount,
}: Props) {
```

In the JSX, after `<GreetingBar .../>` and before `<OneThingCard .../>`, add:
```tsx
{currentMode === 'morning-brief' && srDueCount > 0 && (
  <div className="overload-prompt" style={{ marginBottom: 'var(--space-4)' }}>
    <span>
      {srDueCount} learning {srDueCount === 1 ? 'review' : 'reviews'} due today —
    </span>
    <a href="/learn#reviews" className="btn-link" style={{ marginLeft: 4 }}>
      review now
    </a>
  </div>
)}
```

- [ ] **Step 3: Run all tests**
```
npx tsx --test tests/sm2.test.mjs tests/time-mode.test.mjs tests/one-thing.test.mjs tests/greeting.test.mjs
```
Expected: all tests pass (7 SM-2 + 9 time-mode + 9 one-thing + 6 greeting = 31 tests)

- [ ] **Step 4: Type-check**
```
npx tsc --noEmit
```
Expected: no output

- [ ] **Step 5: Lint check**
```
npm run lint
```
Expected: no errors

- [ ] **Step 6: Build check**
```
npm run build
```
Expected: "Compiled successfully" with no errors

- [ ] **Step 7: Manual acceptance checklist**

- [ ] Navigate to `/profile`, update "About me", save — "Profile saved." appears
- [ ] Navigate to `/learn/new`, enter a goal, generate curriculum — redirects to `/learn/[id]` with modules listed
- [ ] Click "Start session" on Module 1 — session page loads with chat
- [ ] Send 2–3 messages — AI responds each time
- [ ] Click "I'm done" → fill post-loop → save → redirects to curriculum detail
- [ ] Module shows checkmark on curriculum detail page
- [ ] Navigate to `/learn` — shows "1 review due"
- [ ] Click "review now" — SR review card shows; click "Yes, clearly" — "Review recorded" appears
- [ ] Navigate to `/` — in morning-brief mode (or mock: temporarily change time check) — SR banner appears

- [ ] **Step 8: Commit**
```bash
git add app/page.tsx components/momentum-dashboard.tsx
git commit -m "feat: surface SR review reminder in morning-brief dashboard mode"
```

---

## Phase 2 Verification Summary

**All tests:** `npx tsx --test tests/sm2.test.mjs tests/time-mode.test.mjs tests/one-thing.test.mjs tests/greeting.test.mjs` → 31 passing

**Type-check:** `npx tsc --noEmit` → clean

**Build:** `npm run build` → clean

**New routes:**
- `/profile` — profile editor
- `/learn` — Learning Coach home
- `/learn/new` — curriculum builder
- `/learn/[id]` — curriculum detail + module list
- `/learn/[id]/session?module=N` — learning session

**New components:** `Nav`, `CurriculumCard`, `CurriculumBuilderForm`, `ProfileForm`, `SessionChat`, `SRReviewCard`

**New lib modules:** `lib/sm2.ts`, `lib/openrouter.ts`, `lib/curriculum-types.ts`

**DB additions:** 3 new tables, 15 new query functions
