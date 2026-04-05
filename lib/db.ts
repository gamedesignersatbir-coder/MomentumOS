import { DatabaseSync } from "node:sqlite";
import path from "node:path";

import { format, subDays } from "date-fns";

import { buildNextDaySuggestion } from "@/lib/reflection";
import type { DashboardData, MilestoneData, ResurfacedReflection, UserProfile } from "@/lib/types";

const databasePath = path.join(process.cwd(), "momentum-os.db");

declare global {
  var momentumDatabase: DatabaseSync | undefined;
}

const db = globalThis.momentumDatabase ?? new DatabaseSync(databasePath);

if (!globalThis.momentumDatabase) {
  initializeDatabase(db);
  seedIfNeeded();
  globalThis.momentumDatabase = db;
}

function nowIso() {
  return new Date().toISOString();
}

function dayKey(date: Date) {
  return format(date, "yyyy-MM-dd");
}

function initializeDatabase(database: DatabaseSync) {
  database.exec(`PRAGMA busy_timeout=5000;`);
  database.exec(`PRAGMA journal_mode=WAL;`);
  database.exec(`
    CREATE TABLE IF NOT EXISTS priorities (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      detail TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      rank INTEGER NOT NULL,
      intensity TEXT CHECK(intensity IN ('Deep','Steady','Light')) DEFAULT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS focus_blocks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      label TEXT NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      intensity TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS quick_tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS learning_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      topic TEXT NOT NULL,
      minutes INTEGER NOT NULL,
      notes TEXT NOT NULL,
      confidence INTEGER NOT NULL,
      next_action TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS prompts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      tags TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS reflections (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      energy_win TEXT NOT NULL,
      learning_edge TEXT NOT NULL,
      family_note TEXT NOT NULL,
      suggestion TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
  `);
  // Migration: add resurfaced_at if missing (safe to run every startup)
  try {
    database.exec(`ALTER TABLE reflections ADD COLUMN resurfaced_at TEXT`);
  } catch {
    // Column already exists — expected on subsequent runs
  }
  database.exec(`
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
    CREATE TABLE IF NOT EXISTS greeting_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      message_id TEXT NOT NULL,
      shown_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TRIGGER IF NOT EXISTS priorities_updated_at
    AFTER UPDATE ON priorities
    BEGIN
      UPDATE priorities SET updated_at = datetime('now') WHERE id = NEW.id;
    END;

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

    CREATE TABLE IF NOT EXISTS saved_stories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      url TEXT NOT NULL UNIQUE,
      source TEXT NOT NULL,
      category TEXT NOT NULL,
      summary TEXT NOT NULL DEFAULT '',
      saved_at TEXT NOT NULL
    );
  `);
  database.exec(`
    CREATE TABLE IF NOT EXISTS milestones (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      day_number INTEGER NOT NULL UNIQUE,
      narrative_text TEXT NOT NULL,
      generated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);
}

function toPlainObject<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function seedIfNeeded() {
  const existing = db.prepare("SELECT COUNT(*) as count FROM priorities").get() as { count: number };
  if (existing.count > 0) {
    return;
  }

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

  const priorities = [
    ["Tune boss telegraph timings", "Tighten readability in Satbir's arena combat prototype.", 1, "done", subDays(new Date(), 0)],
    ["Complete 45-minute agentic AI study", "Extract one pattern worth testing inside the design workflow.", 2, "active", subDays(new Date(), 0)],
    ["Lock in family dinner and school pickup plan", "Preserve the evening window before any extra work spills over.", 3, "active", subDays(new Date(), 0)]
  ];

  for (const [title, detail, rank, status, date] of priorities) {
    db.prepare(
      "INSERT INTO priorities (title, detail, rank, status, created_at) VALUES (?, ?, ?, ?, ?)"
    ).run(title, detail, rank, status, dayKey(date as Date));
  }

  const focusBlocks = [
    ["Combat feel iteration", "09:00", "10:30", "Deep", "done"],
    ["AI notes distillation", "14:00", "14:45", "Steady", "active"]
  ];

  for (const [label, start, end, intensity, status] of focusBlocks) {
    db.prepare(
      "INSERT INTO focus_blocks (label, start_time, end_time, intensity, status, created_at) VALUES (?, ?, ?, ?, ?, ?)"
    ).run(label, start, end, intensity, status, dayKey(new Date()));
  }

  for (const task of ["Message composer about adaptive soundtrack pass", "Book Saturday park time with family", "Refine AI prompt taxonomy"]) {
    db.prepare("INSERT INTO quick_tasks (title, status, created_at) VALUES (?, 'active', ?)").run(task, dayKey(new Date()));
  }

  const learningEntries = [
    [
      "Agent loops for NPC prototyping",
      35,
      "Compared planning-first versus tool-first flows. Tool-first is faster, but it drifts unless the output target is concrete.",
      4,
      "Prototype a two-step encounter-brief generator tomorrow.",
      subDays(new Date(), 1)
    ],
    [
      "Juice in action game feedback",
      25,
      "Screen shake and anticipation frames matter most when paired with readable recovery windows.",
      3,
      "Record before/after clips for the current boss fight.",
      new Date()
    ]
  ];

  for (const [topic, minutes, notes, confidence, nextAction, date] of learningEntries) {
    db.prepare(
      "INSERT INTO learning_entries (topic, minutes, notes, confidence, next_action, created_at) VALUES (?, ?, ?, ?, ?, ?)"
    ).run(topic, minutes, notes, confidence, nextAction, dayKey(date as Date));
  }

  const prompts = [
    [
      "Boss Encounter Tension Pass",
      "Review this boss encounter and propose three changes that increase tension without adding mechanical complexity. Include telegraphing, pacing, and recovery windows.",
      "game-design,balance,bosses"
    ],
    [
      "AI Learning Synthesis",
      "Summarize the strongest idea from today's AI reading, one weakness in my understanding, and one experiment I can run in under 30 minutes.",
      "ai-learning,study,experiments"
    ],
    [
      "Family Calendar Buffer Check",
      "Look at tomorrow's commitments and suggest the safest work block that protects family obligations, commute time, and recovery margin.",
      "family,planning,routines"
    ]
  ];

  for (const [title, content, tags] of prompts) {
    db.prepare("INSERT INTO prompts (title, content, tags, created_at) VALUES (?, ?, ?, ?)").run(
      title,
      content,
      tags,
      dayKey(new Date())
    );
  }

  const seededSuggestion = buildNextDaySuggestion({
    energyWin: "Early deep work on combat feel created momentum.",
    learningEdge: "Need one more pass on AI workflow constraints.",
    familyNote: "Dinner stayed calm because the evening was protected.",
    outstandingPriorities: 2,
    learningConfidenceAverage: 3.5
  });

  db.prepare(
    "INSERT INTO reflections (energy_win, learning_edge, family_note, suggestion, created_at) VALUES (?, ?, ?, ?, ?)"
  ).run(
    "Early deep work on combat feel created momentum.",
    "Need one more pass on AI workflow constraints.",
    "Dinner stayed calm because the evening was protected.",
    seededSuggestion,
    dayKey(subDays(new Date(), 1))
  );
}

export function getDashboardData(): DashboardData {
  const priorities = toPlainObject(
    db.prepare("SELECT id, title, detail, status, rank, intensity, updated_at FROM priorities ORDER BY rank ASC, id ASC").all()
  ) as DashboardData["priorities"];
  const focusBlocks = toPlainObject(
    db
      .prepare(
        "SELECT id, label, start_time as startTime, end_time as endTime, intensity, status FROM focus_blocks ORDER BY start_time ASC"
      )
      .all()
  ) as DashboardData["focusBlocks"];
  const quickTasks = toPlainObject(
    db.prepare("SELECT id, title, status FROM quick_tasks ORDER BY id DESC").all()
  ) as DashboardData["quickTasks"];
  const learningEntries = toPlainObject(
    db
      .prepare(
        "SELECT id, topic, minutes, notes, confidence, next_action as nextAction FROM learning_entries ORDER BY id DESC LIMIT 5"
      )
      .all()
  ) as DashboardData["learningEntries"];
  const prompts = (
    toPlainObject(db.prepare("SELECT id, title, content, tags FROM prompts ORDER BY id DESC").all()) as Array<{
      id: number;
      title: string;
      content: string;
      tags: string;
    }>
  ).map((prompt) => ({ ...prompt, tags: prompt.tags.split(",") }));

  const completedPriorities = priorities.filter((item) => item.status === "done").length;
  const activePriorityCount = priorities.filter((item) => item.status !== "deferred").length;
  const completedFocusBlocks = focusBlocks.filter((item) => item.status === "done").length;
  const completedQuickTasks = quickTasks.filter((item) => item.status === "done").length;
  const learningMinutesWeek = (
    db
      .prepare("SELECT COALESCE(SUM(minutes), 0) as total FROM learning_entries WHERE created_at >= ?")
      .get(dayKey(subDays(new Date(), 6))) as { total: number }
  ).total;

  const weeklyTrend = Array.from({ length: 7 }, (_, index) => {
    const date = subDays(new Date(), 6 - index);
    const key = dayKey(date);
    const priorityDone = (
      db.prepare("SELECT COUNT(*) as count FROM priorities WHERE created_at = ? AND status = 'done'").get(key) as {
        count: number;
      }
    ).count;
    const priorityTotal = (
      db.prepare("SELECT COUNT(*) as count FROM priorities WHERE created_at = ?").get(key) as { count: number }
    ).count;
    const sprintMinutes = (
      db.prepare("SELECT COALESCE(SUM(minutes), 0) as total FROM learning_entries WHERE created_at = ?").get(key) as {
        total: number;
      }
    ).total;
    const completionRate = Math.min(
      100,
      Math.round((priorityDone / Math.max(priorityTotal, 1)) * 70 + Math.min(sprintMinutes, 60) * 0.5)
    );

    return {
      date: key,
      label: format(date, "EEE"),
      completionRate
    };
  });

  const activeDates = new Set<string>();
  for (const table of ["priorities", "learning_entries", "reflections"]) {
    const rows = db
      .prepare(`SELECT DISTINCT created_at as createdAt FROM ${table} ORDER BY created_at DESC LIMIT 14`)
      .all() as Array<{ createdAt: string }>;
    rows.forEach((row) => activeDates.add(row.createdAt));
  }

  let streakDays = 0;
  for (let offset = 0; offset < 14; offset += 1) {
    const date = dayKey(subDays(new Date(), offset));
    if (activeDates.has(date)) {
      streakDays += 1;
      continue;
    }
    break;
  }

  const confidenceAverage =
    learningEntries.reduce((sum, item) => sum + item.confidence, 0) / Math.max(learningEntries.length, 1);
  const latestReflection = db
    .prepare("SELECT suggestion FROM reflections ORDER BY id DESC LIMIT 1")
    .get() as { suggestion?: string } | undefined;

  const daysSinceStart = getDaysSinceStart();
  const milestoneDay = daysSinceStart === 30 ? 30 : daysSinceStart === 100 ? 100 : null;
  const milestone: MilestoneData | null = milestoneDay
    ? { day: milestoneDay as 30 | 100, narrative: getMilestoneNarrative(milestoneDay) }
    : null;

  return {
    priorities,
    focusBlocks,
    quickTasks,
    learningEntries,
    prompts,
    tags: [...new Set(prompts.flatMap((prompt) => prompt.tags))].sort(),
    weeklyTrend,
    summary: {
      completedPriorities,
      completedToday: completedPriorities + completedFocusBlocks + completedQuickTasks,
      learningMinutesWeek,
      streakDays,
      momentumScore: Math.min(
        100,
        Math.round(
          ((completedPriorities / Math.max(activePriorityCount, 1)) * 45 +
            (completedFocusBlocks / Math.max(focusBlocks.length, 1)) * 25 +
            (completedQuickTasks / Math.max(quickTasks.length, 1)) * 15 +
            Math.min(learningMinutesWeek, 90) * 0.17)
        )
      ),
      nextReviewCue:
        latestReflection?.suggestion ??
        "Protect one deep block before noon and close with a five-minute review.",
      learningConfidenceAverage: Number.isFinite(confidenceAverage) ? Number(confidenceAverage.toFixed(1)) : 0
    },
    resurfacedReflection: getResurfaceableReflection(),
    milestone,
  };
}

export function addPriority(input: { title: string; detail: string }) {
  const rank = (
    db.prepare("SELECT COALESCE(MAX(rank), 0) as maxRank FROM priorities").get() as { maxRank: number }
  ).maxRank + 1;
  db.prepare("INSERT INTO priorities (title, detail, status, rank, created_at) VALUES (?, ?, 'active', ?, ?)")
    .run(input.title, input.detail, Math.min(rank, 3), dayKey(new Date()));
}

export function togglePriority(id: number) {
  db.prepare(
    "UPDATE priorities SET status = CASE WHEN status = 'done' THEN 'active' ELSE 'done' END WHERE id = ?"
  ).run(id);
}

export function addQuickTask(input: { title: string }) {
  db.prepare("INSERT INTO quick_tasks (title, status, created_at) VALUES (?, 'active', ?)").run(
    input.title,
    dayKey(new Date())
  );
}

export function toggleQuickTask(id: number) {
  db.prepare(
    "UPDATE quick_tasks SET status = CASE WHEN status = 'done' THEN 'active' ELSE 'done' END WHERE id = ?"
  ).run(id);
}

export function addQuickTaskInbox(title: string): void {
  db.prepare(
    "INSERT INTO quick_tasks (title, status, created_at) VALUES (?, 'inbox', ?)"
  ).run(title, dayKey(new Date()));
}

export function deferTask(id: number, type: 'priority' | 'quick_task'): void {
  // Runtime guard — table name cannot be parameterised in SQLite.
  if (type !== 'priority' && type !== 'quick_task') {
    throw new Error(`deferTask: invalid type "${type}"`);
  }
  const table = type === 'priority' ? 'priorities' : 'quick_tasks';
  db.prepare(`UPDATE ${table} SET status = 'deferred' WHERE id = ?`).run(id);
}

export function restoreTask(id: number, type: 'priority' | 'quick_task'): void {
  if (type !== 'priority' && type !== 'quick_task') {
    throw new Error(`restoreTask: invalid type "${type}"`);
  }
  const table = type === 'priority' ? 'priorities' : 'quick_tasks';
  db.prepare(`UPDATE ${table} SET status = 'active' WHERE id = ?`).run(id);
}

export function addFocusBlock(input: {
  label: string;
  startTime: string;
  endTime: string;
  intensity: string;
}) {
  db.prepare(
    "INSERT INTO focus_blocks (label, start_time, end_time, intensity, status, created_at) VALUES (?, ?, ?, ?, 'active', ?)"
  ).run(input.label, input.startTime, input.endTime, input.intensity, dayKey(new Date()));
}

export function toggleFocusBlock(id: number) {
  db.prepare(
    "UPDATE focus_blocks SET status = CASE WHEN status = 'done' THEN 'active' ELSE 'done' END WHERE id = ?"
  ).run(id);
}

export function addLearningEntry(input: {
  topic: string;
  minutes: number;
  notes: string;
  confidence: number;
  nextAction: string;
}) {
  db.prepare(
    "INSERT INTO learning_entries (topic, minutes, notes, confidence, next_action, created_at) VALUES (?, ?, ?, ?, ?, ?)"
  ).run(input.topic, input.minutes, input.notes, input.confidence, input.nextAction, dayKey(new Date()));
}

export function saveReflection(input: {
  energyWin: string;
  learningEdge: string;
  familyNote: string;
}) {
  const dashboard = getDashboardData();
  const suggestion = buildNextDaySuggestion({
    energyWin: input.energyWin,
    learningEdge: input.learningEdge,
    familyNote: input.familyNote,
    outstandingPriorities: dashboard.priorities.filter((item) => item.status !== "done").length,
    learningConfidenceAverage: dashboard.summary.learningConfidenceAverage
  });

  db.prepare(
    "INSERT INTO reflections (energy_win, learning_edge, family_note, suggestion, created_at) VALUES (?, ?, ?, ?, ?)"
  ).run(input.energyWin, input.learningEdge, input.familyNote, suggestion, dayKey(new Date()));

  return suggestion;
}

export function getResurfaceableReflection(): ResurfacedReflection | null {
  const row = db.prepare(`
    SELECT *,
      CAST(julianday('now') - julianday(created_at) AS INTEGER) as days_ago
    FROM reflections
    WHERE resurfaced_at IS NULL AND (
      created_at BETWEEN date('now', '-8 days') AND date('now', '-6 days')
      OR created_at BETWEEN date('now', '-32 days') AND date('now', '-28 days')
      OR created_at BETWEEN date('now', '-93 days') AND date('now', '-87 days')
    )
    ORDER BY created_at DESC
    LIMIT 1
  `).get() as ResurfacedReflection | undefined;
  return row ?? null;
}

export function markReflectionResurfaced(id: number): void {
  db.prepare(
    `UPDATE reflections SET resurfaced_at = datetime('now') WHERE id = ?`
  ).run(id);
}

// --- User Profile ---

export function getUserProfile(): UserProfile | null {
  const row = db
    .prepare('SELECT * FROM user_profile WHERE id = 1')
    .get() as UserProfile | null;
  return row ? toPlainObject(row) : null;
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

// --- Soft Close helpers ---

export function archivePriority(id: number): void {
  db.prepare("UPDATE priorities SET status = 'done' WHERE id = ?").run(id);
}

export function seedTomorrowPriority(title: string): void {
  db.prepare(
    `UPDATE priorities SET rank = rank + 1 WHERE status = 'active'`
  ).run();
  db.prepare(`
    INSERT INTO priorities (title, detail, status, rank, created_at)
    VALUES (?, '', 'active', 1, ?)
  `).run(title.trim(), dayKey(new Date()));
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

export function isUserAbsent(absentAfterDays = 3): boolean {
  if (!Number.isInteger(absentAfterDays) || absentAfterDays < 1) {
    throw new Error(`isUserAbsent: absentAfterDays must be a positive integer, got ${absentAfterDays}`);
  }
  const { cnt } = db.prepare(
    'SELECT COUNT(*) as cnt FROM greeting_history'
  ).get() as { cnt: number };
  if (cnt === 0) return false; // first ever visit — not absent
  // shown_at is stored as UTC via datetime('now') — consistent with this comparison.
  // Uses >= so a session recorded exactly N days ago does NOT count as absent (correct).
  const { cnt: recent } = db.prepare(
    `SELECT COUNT(*) as cnt FROM greeting_history WHERE shown_at >= datetime('now', '-' || ? || ' days')`
  ).get(absentAfterDays) as { cnt: number };
  return recent === 0;
}

export function recordGreetingShown(messageId: string): void {
  db.prepare(
    'INSERT INTO greeting_history (message_id) VALUES (?)'
  ).run(messageId);
}

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
  return row ? (toPlainObject(row) as ReturnType<typeof getCurriculumById>) : null;
}

export function saveCurriculum(input: {
  title: string; goalStatement: string; domain: string; modulesJson: string;
}): number {
  const result = db.prepare(
    'INSERT INTO curricula (title, goal_statement, domain, modules_json) VALUES (?, ?, ?, ?)'
  ).run(input.title, input.goalStatement, input.domain, input.modulesJson) as { lastInsertRowid: number | bigint };
  return Number(result.lastInsertRowid);
}

export function deleteCurriculum(id: number): void {
  db.prepare('DELETE FROM sr_items WHERE item_type = ? AND item_id IN (SELECT id FROM learning_sessions WHERE curriculum_id = ?)').run('learning_session', id);
  db.prepare('DELETE FROM learning_sessions WHERE curriculum_id = ?').run(id);
  db.prepare('DELETE FROM curricula WHERE id = ?').run(id);
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
  return row ? (toPlainObject(row) as ReturnType<typeof getLatestCompletedSession>) : null;
}

export function createSession(curriculumId: number, moduleIndex: number): number {
  const result = db.prepare(
    'INSERT INTO learning_sessions (curriculum_id, module_index) VALUES (?, ?)'
  ).run(curriculumId, moduleIndex) as { lastInsertRowid: number | bigint };
  return Number(result.lastInsertRowid);
}

export function getSessionById(id: number): {
  id: number; curriculumId: number; moduleIndex: number; chatHistoryJson: string;
} | null {
  const row = db.prepare(
    'SELECT id, curriculum_id as curriculumId, module_index as moduleIndex, chat_history_json as chatHistoryJson FROM learning_sessions WHERE id = ?'
  ).get(id);
  return row ? (toPlainObject(row) as ReturnType<typeof getSessionById>) : null;
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
  ).run(itemType, itemId, nextReviewDate) as { lastInsertRowid: number | bigint };
  return Number(result.lastInsertRowid);
}

export function updateSRItem(id: number, n: number, ef: number, intervalDays: number, nextReviewDate: string): void {
  db.prepare(
    "UPDATE sr_items SET n = ?, ef = ?, interval_days = ?, next_review_date = ?, last_shown_at = datetime('now') WHERE id = ?"
  ).run(n, ef, intervalDays, nextReviewDate, id);
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
  return row ? (toPlainObject(row) as ReturnType<typeof getSRItemWithContext>) : null;
}

// --- Saved stories ---

export interface SavedStory {
  id: number;
  title: string;
  url: string;
  source: string;
  category: string;
  summary: string;
  savedAt: string;
}

export function getSavedStories(): SavedStory[] {
  return toPlainObject(
    db.prepare('SELECT id, title, url, source, category, summary, saved_at as savedAt FROM saved_stories ORDER BY saved_at DESC').all()
  ) as SavedStory[];
}

export function saveStory(item: { title: string; url: string; source: string; category: string; summary: string }): void {
  db.prepare(
    'INSERT OR IGNORE INTO saved_stories (title, url, source, category, summary, saved_at) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(item.title, item.url, item.source, item.category, item.summary, nowIso());
}

export function unsaveStory(url: string): void {
  db.prepare('DELETE FROM saved_stories WHERE url = ?').run(url);
}

export function isSaved(url: string): boolean {
  const row = db.prepare('SELECT 1 FROM saved_stories WHERE url = ?').get(url);
  return row != null;
}

// --- Milestone functions ---

export function getDaysSinceStart(): number | null {
  const row = db.prepare(
    `SELECT MIN(shown_at) as first_day FROM greeting_history`
  ).get() as { first_day: string | null };
  if (!row.first_day) return null;
  const diffMs = Date.now() - new Date(row.first_day).getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

export function getMilestoneNarrative(day: number): string | null {
  const row = db.prepare(
    `SELECT narrative_text FROM milestones WHERE day_number = ?`
  ).get(day) as { narrative_text: string } | undefined;
  return row?.narrative_text ?? null;
}

export function saveMilestoneNarrative(day: number, text: string): void {
  db.prepare(
    `INSERT OR REPLACE INTO milestones (day_number, narrative_text, generated_at) VALUES (?, ?, datetime('now'))`
  ).run(day, text);
}

export function getActivitySummary(): {
  completedTasks: number;
  totalSessions: number;
  domainsStudied: string[];
  reflectionCount: number;
} {
  const { cnt: completedTasks } = db.prepare(
    `SELECT COUNT(*) as cnt FROM priorities WHERE status = 'done'`
  ).get() as { cnt: number };
  const { cnt: totalSessions } = db.prepare(
    `SELECT COUNT(*) as cnt FROM learning_sessions WHERE completed_at IS NOT NULL`
  ).get() as { cnt: number };
  const domains = db.prepare(
    `SELECT DISTINCT domain FROM curricula`
  ).all() as { domain: string }[];
  const { cnt: reflectionCount } = db.prepare(
    `SELECT COUNT(*) as cnt FROM reflections`
  ).get() as { cnt: number };
  return {
    completedTasks,
    totalSessions,
    domainsStudied: domains.map(d => d.domain),
    reflectionCount,
  };
}
