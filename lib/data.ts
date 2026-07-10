import { supabase } from './supabase';
import type {
  Settings, Task, Reflection, Curriculum, Session, Review,
  Briefing, BriefingItem, SavedItem, Source, ChatMessage,
} from './types';
import { addDays } from './dates';

function fail(context: string, error: { message: string } | null): never {
  throw new Error(`${context}: ${error?.message ?? 'unknown error'}`);
}

// ── Settings ────────────────────────────────────────────────────────────────

export async function getSettings(): Promise<Settings> {
  const { data, error } = await supabase().from('settings').select('*').eq('id', 1).single();
  if (error) fail('load settings', error);
  return data as Settings;
}

export async function updateSettings(patch: { display_name?: string; timezone?: string }): Promise<void> {
  const { error } = await supabase().from('settings').update(patch).eq('id', 1);
  if (error) fail('update settings', error);
}

// ── Tasks ───────────────────────────────────────────────────────────────────

export async function getTasksForDay(day: string): Promise<Task[]> {
  const { data, error } = await supabase()
    .from('tasks').select('*').eq('day', day).neq('status', 'dropped')
    .order('created_at', { ascending: true });
  if (error) fail('load tasks', error);
  return data as Task[];
}

/** Active tasks left over from previous days — offered for carry / let go. */
export async function getCarryover(today: string): Promise<Task[]> {
  const { data, error } = await supabase()
    .from('tasks').select('*').eq('status', 'active').lt('day', today)
    .order('day', { ascending: true }).limit(10);
  if (error) fail('load carryover', error);
  return data as Task[];
}

/**
 * Adds a task. Today holds at most 3 active tasks — beyond that the task
 * quietly lands on tomorrow. Returns the day it landed on.
 */
export async function addTask(title: string, today: string, url?: string): Promise<string> {
  const { count, error: countError } = await supabase()
    .from('tasks').select('*', { count: 'exact', head: true })
    .eq('day', today).eq('status', 'active');
  if (countError) fail('count tasks', countError);
  const day = (count ?? 0) >= 3 ? addDays(today, 1) : today;
  const { error } = await supabase().from('tasks').insert({ title, day, url: url ?? null });
  if (error) fail('add task', error);
  return day;
}

export async function setTaskStatus(id: number, status: Task['status']): Promise<void> {
  const patch: Record<string, unknown> = { status };
  patch.done_at = status === 'done' ? new Date().toISOString() : null;
  const { error } = await supabase().from('tasks').update(patch).eq('id', id);
  if (error) fail('update task', error);
}

export async function carryTask(id: number, today: string): Promise<void> {
  const { error } = await supabase().from('tasks').update({ day: today }).eq('id', id);
  if (error) fail('carry task', error);
}

// ── Reflections ─────────────────────────────────────────────────────────────

export async function getReflection(day: string): Promise<Reflection | null> {
  const { data, error } = await supabase().from('reflections').select('*').eq('day', day).maybeSingle();
  if (error) fail('load reflection', error);
  return data as Reflection | null;
}

export async function saveReflection(day: string, text: string): Promise<void> {
  const { error } = await supabase()
    .from('reflections').upsert({ day, text }, { onConflict: 'day' });
  if (error) fail('save reflection', error);
}

export async function getReflectionsForMonth(monthKey: string): Promise<Reflection[]> {
  const { data, error } = await supabase()
    .from('reflections').select('*')
    .gte('day', `${monthKey}-01`).lte('day', `${monthKey}-31`)
    .order('day', { ascending: true });
  if (error) fail('load month reflections', error);
  return data as Reflection[];
}

// ── Monthly letters ─────────────────────────────────────────────────────────

export async function getLetter(monthKey: string): Promise<string | null> {
  const { data, error } = await supabase().from('letters').select('text').eq('month', monthKey).maybeSingle();
  if (error) fail('load letter', error);
  return data?.text ?? null;
}

export async function saveLetter(monthKey: string, text: string): Promise<void> {
  const { error } = await supabase().from('letters').upsert({ month: monthKey, text });
  if (error) fail('save letter', error);
}

export async function countTasksDoneInMonth(monthKey: string): Promise<number> {
  const { count, error } = await supabase()
    .from('tasks').select('*', { count: 'exact', head: true })
    .eq('status', 'done').gte('day', `${monthKey}-01`).lte('day', `${monthKey}-31`);
  if (error) fail('count month tasks', error);
  return count ?? 0;
}

// ── Curricula & sessions ────────────────────────────────────────────────────

export async function getCurricula(): Promise<Curriculum[]> {
  const { data, error } = await supabase()
    .from('curricula').select('*').eq('archived', false)
    .order('created_at', { ascending: false });
  if (error) fail('load curricula', error);
  return data as Curriculum[];
}

export async function getCurriculum(id: number): Promise<Curriculum | null> {
  const { data, error } = await supabase().from('curricula').select('*').eq('id', id).maybeSingle();
  if (error) fail('load curriculum', error);
  return data as Curriculum | null;
}

export async function createCurriculum(input: {
  title: string; goal: string; modules: Curriculum['modules'];
}): Promise<number> {
  const { data, error } = await supabase()
    .from('curricula').insert(input).select('id').single();
  if (error) fail('create curriculum', error);
  return data.id as number;
}

export async function archiveCurriculum(id: number): Promise<void> {
  const { error } = await supabase().from('curricula').update({ archived: true }).eq('id', id);
  if (error) fail('archive curriculum', error);
}

export async function getSessionsForCurriculum(curriculumId: number): Promise<Session[]> {
  const { data, error } = await supabase()
    .from('sessions').select('*').eq('curriculum_id', curriculumId)
    .order('created_at', { ascending: true });
  if (error) fail('load sessions', error);
  return data as Session[];
}

export async function getSession(id: number): Promise<Session | null> {
  const { data, error } = await supabase().from('sessions').select('*').eq('id', id).maybeSingle();
  if (error) fail('load session', error);
  return data as Session | null;
}

export async function getOpenSession(curriculumId: number, moduleIndex: number): Promise<Session | null> {
  const { data, error } = await supabase()
    .from('sessions').select('*')
    .eq('curriculum_id', curriculumId).eq('module_index', moduleIndex)
    .is('completed_at', null)
    .order('created_at', { ascending: false }).limit(1).maybeSingle();
  if (error) fail('load open session', error);
  return data as Session | null;
}

/** Most recent open session across all curricula — powers "Continue". */
export async function getLatestOpenSession(): Promise<Session | null> {
  const { data, error } = await supabase()
    .from('sessions').select('*').is('completed_at', null)
    .order('created_at', { ascending: false }).limit(1).maybeSingle();
  if (error) fail('load latest session', error);
  return data as Session | null;
}

export async function createSession(curriculumId: number, moduleIndex: number): Promise<number> {
  const { data, error } = await supabase()
    .from('sessions').insert({ curriculum_id: curriculumId, module_index: moduleIndex })
    .select('id').single();
  if (error) fail('create session', error);
  return data.id as number;
}

export async function saveSessionMessages(id: number, messages: ChatMessage[]): Promise<void> {
  const { error } = await supabase().from('sessions').update({ messages }).eq('id', id);
  if (error) fail('save messages', error);
}

export async function completeSession(id: number): Promise<void> {
  const { error } = await supabase()
    .from('sessions').update({ completed_at: new Date().toISOString() }).eq('id', id);
  if (error) fail('complete session', error);
}

export async function saveSessionFuzzy(id: number, fuzzy: string): Promise<void> {
  const { error } = await supabase().from('sessions').update({ fuzzy }).eq('id', id);
  if (error) fail('save fuzzy note', error);
}

/** The fuzzy note from the most recent completed session of this curriculum. */
export async function getPriorFuzzy(curriculumId: number): Promise<string | null> {
  const { data, error } = await supabase()
    .from('sessions').select('fuzzy').eq('curriculum_id', curriculumId)
    .not('completed_at', 'is', null).not('fuzzy', 'is', null)
    .order('completed_at', { ascending: false }).limit(1).maybeSingle();
  if (error) fail('load prior fuzzy', error);
  return data?.fuzzy ?? null;
}

// ── Reviews (one per module, gentle ladder) ─────────────────────────────────

export const REVIEW_LADDER = [2, 7, 21, 60]; // days

export async function upsertReview(curriculumId: number, moduleIndex: number, today: string): Promise<void> {
  const { error } = await supabase().from('reviews').upsert({
    curriculum_id: curriculumId,
    module_index: moduleIndex,
    stage: 0,
    due: addDays(today, REVIEW_LADDER[0]),
    dismissed: false,
  });
  if (error) fail('schedule review', error);
}

export async function getDueReview(today: string): Promise<(Review & { curriculum: Curriculum }) | null> {
  const { data, error } = await supabase()
    .from('reviews').select('*, curriculum:curricula(*)')
    .lte('due', today).eq('dismissed', false)
    .order('due', { ascending: true }).limit(1).maybeSingle();
  if (error) fail('load due review', error);
  return data as (Review & { curriculum: Curriculum }) | null;
}

/** "Got it" — move one rung up the ladder; past the top rung, retire it. */
export async function advanceReview(curriculumId: number, moduleIndex: number, today: string): Promise<void> {
  const { data, error } = await supabase()
    .from('reviews').select('stage')
    .eq('curriculum_id', curriculumId).eq('module_index', moduleIndex).single();
  if (error) fail('load review', error);
  const nextStage = data.stage + 1;
  const patch = nextStage >= REVIEW_LADDER.length
    ? { dismissed: true }
    : { stage: nextStage, due: addDays(today, REVIEW_LADDER[nextStage]) };
  const { error: updateError } = await supabase()
    .from('reviews').update(patch)
    .eq('curriculum_id', curriculumId).eq('module_index', moduleIndex);
  if (updateError) fail('advance review', updateError);
}

export async function dismissReview(curriculumId: number, moduleIndex: number): Promise<void> {
  const { error } = await supabase()
    .from('reviews').update({ dismissed: true })
    .eq('curriculum_id', curriculumId).eq('module_index', moduleIndex);
  if (error) fail('dismiss review', error);
}

// ── Briefings ───────────────────────────────────────────────────────────────

export async function getBriefing(windowKey: string): Promise<Briefing | null> {
  const { data, error } = await supabase()
    .from('briefings').select('*').eq('window_key', windowKey).maybeSingle();
  if (error) fail('load briefing', error);
  return data as Briefing | null;
}

export async function saveBriefing(windowKey: string, items: BriefingItem[]): Promise<void> {
  const { error } = await supabase().from('briefings').upsert({ window_key: windowKey, items });
  if (error) fail('save briefing', error);
}

// ── Saved items ─────────────────────────────────────────────────────────────

export async function getSavedItems(): Promise<SavedItem[]> {
  const { data, error } = await supabase()
    .from('saved_items').select('*').order('saved_at', { ascending: false }).limit(200);
  if (error) fail('load saved items', error);
  return data as SavedItem[];
}

export async function saveItem(item: { title: string; url: string; source?: string }): Promise<void> {
  const { error } = await supabase()
    .from('saved_items')
    .upsert({ title: item.title, url: item.url, source: item.source ?? null }, { onConflict: 'url' });
  if (error) fail('save item', error);
}

export async function removeSavedItem(id: number): Promise<void> {
  const { error } = await supabase().from('saved_items').delete().eq('id', id);
  if (error) fail('remove saved item', error);
}

// ── Sources ─────────────────────────────────────────────────────────────────

export async function getSources(enabledOnly = false): Promise<Source[]> {
  let query = supabase().from('sources').select('*').order('name');
  if (enabledOnly) query = query.eq('enabled', true);
  const { data, error } = await query;
  if (error) fail('load sources', error);
  return data as Source[];
}

export async function setSourceEnabled(id: number, enabled: boolean): Promise<void> {
  const { error } = await supabase().from('sources').update({ enabled }).eq('id', id);
  if (error) fail('toggle source', error);
}

export async function addSource(name: string, url: string): Promise<void> {
  const { error } = await supabase().from('sources').insert({ name, url });
  if (error) fail('add source', error);
}

export async function removeSource(id: number): Promise<void> {
  const { error } = await supabase().from('sources').delete().eq('id', id);
  if (error) fail('remove source', error);
}
