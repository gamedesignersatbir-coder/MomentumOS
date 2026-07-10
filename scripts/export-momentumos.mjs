#!/usr/bin/env node
/**
 * Export the old MomentumOS SQLite database to aaj-export.json.
 *
 * Run this ON THE MAC MINI, in the old MomentumOS folder (Node 22.13+,
 * the version the old app already needs):
 *
 *     node scripts/export-momentumos.mjs
 *
 * It reads momentum-os.db in the current folder and writes aaj-export.json
 * next to it. Then upload that file in AAJ → Settings → Import.
 *
 * The export includes EVERYTHING (a full readable backup), including
 * old learning sprints and prompts that AAJ doesn't import — so this file
 * is also your permanent archive of the old app.
 */
import { DatabaseSync } from 'node:sqlite';
import { writeFileSync, existsSync } from 'node:fs';

const DB_PATH = process.argv[2] ?? 'momentum-os.db';
if (!existsSync(DB_PATH)) {
  console.error(`Cannot find ${DB_PATH}. Run this in the MomentumOS folder on the Mac Mini.`);
  process.exit(1);
}

const db = new DatabaseSync(DB_PATH, { readOnly: true });
const all = (sql) => {
  try {
    return db.prepare(sql).all();
  } catch {
    return [];
  }
};

const priorities = all('SELECT * FROM priorities');
const quickTasks = all('SELECT * FROM quick_tasks');
const reflections = all('SELECT * FROM reflections');
const curricula = all('SELECT * FROM curricula');
const sessions = all('SELECT * FROM learning_sessions');
const savedStories = all('SELECT * FROM saved_stories');
const profile = all('SELECT * FROM user_profile')[0] ?? {};
const firstUse = all('SELECT MIN(shown_at) AS first FROM greeting_history')[0]?.first ?? null;

// deferred → active on their original day: they surface once in AAJ's
// carry / let-go flow instead of being silently dropped.
const mapStatus = (s) => (s === 'done' ? 'done' : s === 'deferred' ? 'active' : s === 'active' ? 'active' : 'done');
const dayOf = (v) => (typeof v === 'string' ? v.slice(0, 10) : null);

const tasks = [
  ...priorities.map((p) => ({
    title: p.title + (p.detail ? ` — ${p.detail}` : ''),
    status: mapStatus(p.status),
    day: dayOf(p.created_at),
    done_at: null,
  })),
  ...quickTasks.map((t) => ({
    title: t.title,
    status: t.status === 'done' ? 'done' : 'active',
    day: dayOf(t.created_at),
    done_at: null,
  })),
].filter((t) => t.title && t.day);

const output = {
  exported_at: new Date().toISOString(),
  settings: {
    display_name: profile.display_name ?? 'Satbir',
    timezone: profile.timezone ?? 'Asia/Kolkata',
    first_used_at: firstUse ? new Date(firstUse.replace(' ', 'T') + 'Z').toISOString() : undefined,
  },
  tasks,
  reflections: reflections
    .map((r) => ({
      day: dayOf(r.created_at),
      text: [r.energy_win, r.learning_edge, r.family_note].filter(Boolean).join(' · '),
    }))
    .filter((r) => r.day && r.text),
  curricula: curricula.map((c) => ({
    old_id: c.id,
    title: c.title,
    goal: c.goal_statement ?? '',
    modules: JSON.parse(c.modules_json ?? '[]'),
    created_at: c.created_at,
  })),
  sessions: sessions.map((s) => ({
    old_curriculum_id: s.curriculum_id,
    module_index: s.module_index,
    messages: JSON.parse(s.chat_history_json ?? '[]'),
    fuzzy: s.whats_fuzzy ?? null,
    completed_at: s.completed_at ? new Date(s.completed_at.replace(' ', 'T') + 'Z').toISOString() : null,
    created_at: s.created_at,
  })),
  saved_items: savedStories.map((s) => ({
    title: s.title,
    url: s.url,
    source: s.source ?? null,
    saved_at: s.saved_at,
  })),
  // Archive-only — not imported by AAJ, kept so nothing is ever lost:
  archive: {
    learning_entries: all('SELECT * FROM learning_entries'),
    focus_blocks: all('SELECT * FROM focus_blocks'),
    prompts: all('SELECT * FROM prompts'),
    milestones: all('SELECT * FROM milestones'),
    monthly_narratives: all('SELECT * FROM monthly_narratives'),
    full_reflections: reflections,
  },
};

writeFileSync('aaj-export.json', JSON.stringify(output, null, 2));
console.log(
  `Exported: ${tasks.length} tasks, ${output.reflections.length} reflections, ` +
    `${curricula.length} curricula, ${sessions.length} sessions, ${savedStories.length} saved items.`
);
console.log('Wrote aaj-export.json — upload it in AAJ → Settings → Import.');
