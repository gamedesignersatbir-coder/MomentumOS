import { supabase } from './supabase';
import type { ChatMessage, CurriculumModule } from './types';

/**
 * Imports the JSON produced by scripts/export-momentumos.mjs (run on the
 * Mac Mini against the old SQLite database). Old deferred items come in as
 * active tasks on their original day, so they surface once in the
 * carry / let-go flow instead of being silently lost.
 */

interface ExportFile {
  settings?: { display_name?: string; timezone?: string; first_used_at?: string };
  tasks?: Array<{ title: string; status: string; day: string; url?: string | null; done_at?: string | null }>;
  reflections?: Array<{ day: string; text: string }>;
  curricula?: Array<{ old_id: number; title: string; goal: string; modules: CurriculumModule[]; created_at?: string }>;
  sessions?: Array<{
    old_curriculum_id: number; module_index: number; messages: ChatMessage[];
    fuzzy?: string | null; completed_at?: string | null; created_at?: string;
  }>;
  saved_items?: Array<{ title: string; url: string; source?: string | null; saved_at?: string }>;
}

export interface ImportResult {
  tasks: number;
  reflections: number;
  curricula: number;
  sessions: number;
  saved: number;
}

const DAY_PATTERN = /^\d{4}-\d{2}-\d{2}/;

export async function importExportFile(raw: string): Promise<ImportResult> {
  const data = JSON.parse(raw) as ExportFile;
  const db = supabase();
  const result: ImportResult = { tasks: 0, reflections: 0, curricula: 0, sessions: 0, saved: 0 };

  if (data.settings) {
    const patch: Record<string, string> = {};
    if (data.settings.display_name) patch.display_name = data.settings.display_name;
    if (data.settings.timezone) patch.timezone = data.settings.timezone;
    if (data.settings.first_used_at) patch.first_used_at = data.settings.first_used_at;
    if (Object.keys(patch).length > 0) {
      const { error } = await db.from('settings').update(patch).eq('id', 1);
      if (error) throw new Error(`settings: ${error.message}`);
    }
  }

  const tasks = (data.tasks ?? [])
    .filter((t) => t.title && DAY_PATTERN.test(t.day ?? ''))
    .map((t) => ({
      title: String(t.title).slice(0, 300),
      url: t.url ?? null,
      status: t.status === 'done' ? 'done' : t.status === 'dropped' ? 'dropped' : 'active',
      day: t.day.slice(0, 10),
      done_at: t.done_at ?? null,
    }));
  if (tasks.length > 0) {
    const { error } = await db.from('tasks').insert(tasks);
    if (error) throw new Error(`tasks: ${error.message}`);
    result.tasks = tasks.length;
  }

  for (const r of data.reflections ?? []) {
    if (!r.text || !DAY_PATTERN.test(r.day ?? '')) continue;
    const { error } = await db
      .from('reflections')
      .upsert({ day: r.day.slice(0, 10), text: String(r.text).slice(0, 2000) }, { onConflict: 'day' });
    if (error) throw new Error(`reflections: ${error.message}`);
    result.reflections++;
  }

  const idMap = new Map<number, number>();
  for (const c of data.curricula ?? []) {
    if (!c.title || !Array.isArray(c.modules)) continue;
    const { data: inserted, error } = await db
      .from('curricula')
      .insert({ title: c.title, goal: c.goal ?? '', modules: c.modules })
      .select('id').single();
    if (error) throw new Error(`curricula: ${error.message}`);
    idMap.set(c.old_id, inserted.id as number);
    result.curricula++;
  }

  for (const s of data.sessions ?? []) {
    const newId = idMap.get(s.old_curriculum_id);
    if (!newId) continue;
    const { error } = await db.from('sessions').insert({
      curriculum_id: newId,
      module_index: s.module_index ?? 0,
      messages: Array.isArray(s.messages) ? s.messages : [],
      fuzzy: s.fuzzy ?? null,
      completed_at: s.completed_at ?? null,
    });
    if (error) throw new Error(`sessions: ${error.message}`);
    result.sessions++;
  }

  for (const item of data.saved_items ?? []) {
    if (!item.title || !item.url) continue;
    const { error } = await db
      .from('saved_items')
      .upsert({ title: item.title, url: item.url, source: item.source ?? null }, { onConflict: 'url' });
    if (error) throw new Error(`saved: ${error.message}`);
    result.saved++;
  }

  return result;
}
