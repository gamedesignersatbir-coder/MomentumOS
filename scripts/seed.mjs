import { existsSync, unlinkSync } from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

const databasePath = path.join(process.cwd(), "momentum-os.db");

if (existsSync(databasePath)) {
  unlinkSync(databasePath);
}

const db = new DatabaseSync(databasePath);

db.exec(`
  CREATE TABLE priorities (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, detail TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'active', rank INTEGER NOT NULL, created_at TEXT NOT NULL);
  CREATE TABLE focus_blocks (id INTEGER PRIMARY KEY AUTOINCREMENT, label TEXT NOT NULL, start_time TEXT NOT NULL, end_time TEXT NOT NULL, intensity TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'active', created_at TEXT NOT NULL);
  CREATE TABLE quick_tasks (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'active', created_at TEXT NOT NULL);
  CREATE TABLE learning_entries (id INTEGER PRIMARY KEY AUTOINCREMENT, topic TEXT NOT NULL, minutes INTEGER NOT NULL, notes TEXT NOT NULL, confidence INTEGER NOT NULL, next_action TEXT NOT NULL, created_at TEXT NOT NULL);
  CREATE TABLE prompts (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, content TEXT NOT NULL, tags TEXT NOT NULL, created_at TEXT NOT NULL);
  CREATE TABLE reflections (id INTEGER PRIMARY KEY AUTOINCREMENT, energy_win TEXT NOT NULL, learning_edge TEXT NOT NULL, family_note TEXT NOT NULL, suggestion TEXT NOT NULL, created_at TEXT NOT NULL);
`);

const today = new Date().toISOString().slice(0, 10);
const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

[
  ["Tune boss telegraph timings", "Tighten readability in Satbir's arena combat prototype.", "done", 1, today],
  ["Complete 45-minute agentic AI study", "Extract one pattern worth testing inside the design workflow.", "active", 2, today],
  ["Lock in family dinner and school pickup plan", "Preserve the evening window before any extra work spills over.", "active", 3, today]
].forEach((row) =>
  db.prepare("INSERT INTO priorities (title, detail, status, rank, created_at) VALUES (?, ?, ?, ?, ?)").run(...row)
);

[
  ["Combat feel iteration", "09:00", "10:30", "Deep", "done", today],
  ["AI notes distillation", "14:00", "14:45", "Steady", "active", today]
].forEach((row) =>
  db.prepare("INSERT INTO focus_blocks (label, start_time, end_time, intensity, status, created_at) VALUES (?, ?, ?, ?, ?, ?)").run(...row)
);

[
  ["Message composer about adaptive soundtrack pass", "active", today],
  ["Book Saturday park time with family", "active", today],
  ["Refine AI prompt taxonomy", "active", today]
].forEach((row) => db.prepare("INSERT INTO quick_tasks (title, status, created_at) VALUES (?, ?, ?)").run(...row));

[
  [
    "Agent loops for NPC prototyping",
    35,
    "Compared planning-first versus tool-first flows. Tool-first is faster, but it drifts unless the output target is concrete.",
    4,
    "Prototype a two-step encounter-brief generator tomorrow.",
    yesterday
  ],
  [
    "Juice in action game feedback",
    25,
    "Screen shake and anticipation frames matter most when paired with readable recovery windows.",
    3,
    "Record before/after clips for the current boss fight.",
    today
  ]
].forEach((row) =>
  db.prepare("INSERT INTO learning_entries (topic, minutes, notes, confidence, next_action, created_at) VALUES (?, ?, ?, ?, ?, ?)").run(...row)
);

[
  [
    "Boss Encounter Tension Pass",
    "Review this boss encounter and propose three changes that increase tension without adding mechanical complexity. Include telegraphing, pacing, and recovery windows.",
    "game-design,balance,bosses",
    today
  ],
  [
    "AI Learning Synthesis",
    "Summarize the strongest idea from today's AI reading, one weakness in my understanding, and one experiment I can run in under 30 minutes.",
    "ai-learning,study,experiments",
    today
  ],
  [
    "Family Calendar Buffer Check",
    "Look at tomorrow's commitments and suggest the safest work block that protects family obligations, commute time, and recovery margin.",
    "family,planning,routines",
    today
  ]
].forEach((row) => db.prepare("INSERT INTO prompts (title, content, tags, created_at) VALUES (?, ?, ?, ?)").run(...row));

db.prepare(
  "INSERT INTO reflections (energy_win, learning_edge, family_note, suggestion, created_at) VALUES (?, ?, ?, ?, ?)"
).run(
  "Early deep work on combat feel created momentum.",
  "Need one more pass on AI workflow constraints.",
  "Dinner stayed calm because the evening was protected.",
  "Start with the unfinished priority that removes the most drag. Reserve a 30-minute AI learning block with one concrete experiment. Protect the family window on the calendar before adding extra work. Repeat the same early deep-work setup that worked today.",
  yesterday
);

console.log(`Seeded Momentum OS database at ${databasePath}`);
