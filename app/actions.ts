'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { z } from 'zod';
import { isCorrectPasscode, sessionToken, SESSION_COOKIE } from '@/lib/auth';
import { dayKey, previousMonthKey, monthName } from '@/lib/dates';
import {
  getSettings, updateSettings as dbUpdateSettings,
  addTask as dbAddTask, setTaskStatus, carryTask as dbCarryTask,
  saveReflection as dbSaveReflection,
  saveItem as dbSaveItem, removeSavedItem as dbRemoveSavedItem,
  setSourceEnabled, addSource as dbAddSource, removeSource as dbRemoveSource,
  createCurriculum, createSession, getSession, getCurriculum,
  saveSessionMessages, completeSession as dbCompleteSession, saveSessionFuzzy,
  upsertReview, advanceReview as dbAdvanceReview, dismissReview as dbDismissReview,
  getPriorFuzzy, getReflectionsForMonth, getLetter, saveLetter,
  countTasksDoneInMonth, archiveCurriculum as dbArchiveCurriculum,
} from '@/lib/data';
import {
  chatCompletion, buildCurriculumPrompt, buildSessionPrompt,
  buildModuleIntroPrompt, buildLetterPrompt, OpenRouterError,
} from '@/lib/openrouter';
import type { ChatMessage, CurriculumModule } from '@/lib/types';

async function tz(): Promise<string> {
  return (await getSettings()).timezone;
}

function aiErrorMessage(error: unknown): string {
  if (error instanceof OpenRouterError && error.statusCode === 0 && error.message.includes('configured')) {
    return 'The AI key is not set up yet — add OPENROUTER_API_KEY in Settings on the host.';
  }
  return 'The AI call failed. Try again in a moment.';
}

// ── Auth ────────────────────────────────────────────────────────────────────

export async function login(_prev: { error?: string }, formData: FormData): Promise<{ error?: string }> {
  const passcode = String(formData.get('passcode') ?? '');
  if (!isCorrectPasscode(passcode)) {
    await new Promise((r) => setTimeout(r, 800)); // slow down guessing
    return { error: 'That passcode is not right.' };
  }
  const jar = await cookies();
  jar.set(SESSION_COOKIE, await sessionToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 180,
    path: '/',
  });
  redirect('/');
}

export async function logout(): Promise<void> {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
  redirect('/login');
}

// ── Tasks ───────────────────────────────────────────────────────────────────

const taskSchema = z.object({ title: z.string().trim().min(1).max(300) });

export async function addTask(formData: FormData): Promise<{ landed: string } | { error: string }> {
  const parsed = taskSchema.safeParse({ title: formData.get('title') });
  if (!parsed.success) return { error: 'Give the task a name.' };
  const today = dayKey(await tz());
  const landed = await dbAddTask(parsed.data.title, today);
  revalidatePath('/');
  return { landed: landed === today ? 'today' : 'tomorrow' };
}

export async function toggleTask(id: number, done: boolean): Promise<void> {
  await setTaskStatus(id, done ? 'done' : 'active');
  revalidatePath('/');
}

export async function carryTask(id: number): Promise<void> {
  await dbCarryTask(id, dayKey(await tz()));
  revalidatePath('/');
}

export async function letGoTask(id: number): Promise<void> {
  await setTaskStatus(id, 'dropped');
  revalidatePath('/');
}

// ── Briefing item actions ───────────────────────────────────────────────────

export async function saveBriefingItem(item: { title: string; url: string; source: string }): Promise<void> {
  await dbSaveItem(item);
}

export async function taskFromItem(item: { title: string; url: string }): Promise<{ landed: string }> {
  const today = dayKey(await tz());
  const landed = await dbAddTask(item.title, today, item.url);
  revalidatePath('/');
  return { landed: landed === today ? 'today' : 'tomorrow' };
}

export async function removeSaved(id: number): Promise<void> {
  await dbRemoveSavedItem(id);
  revalidatePath('/saved');
}

// ── Reflection ──────────────────────────────────────────────────────────────

export async function saveReflection(text: string): Promise<{ error?: string }> {
  const trimmed = text.trim().slice(0, 500);
  if (!trimmed) return { error: 'Nothing to save.' };
  await dbSaveReflection(dayKey(await tz()), trimmed);
  revalidatePath('/');
  return {};
}

// ── Monthly letter ──────────────────────────────────────────────────────────

export async function generateLetter(): Promise<{ error?: string }> {
  const timezone = await tz();
  const month = previousMonthKey(timezone);
  if (await getLetter(month)) return {};
  const reflections = await getReflectionsForMonth(month);
  if (reflections.length < 3) return { error: 'Not enough reflections last month for a letter.' };
  const tasksDone = await countTasksDoneInMonth(month);
  try {
    const text = await chatCompletion(
      buildLetterPrompt({
        monthLabel: monthName(month),
        reflections: reflections.map((r) => ({ day: r.day, text: r.text })),
        tasksDone,
        sessionsDone: 0,
      })
    );
    await saveLetter(month, text.trim());
    revalidatePath('/');
    return {};
  } catch (error) {
    return { error: aiErrorMessage(error) };
  }
}

// ── Curriculum + sessions ───────────────────────────────────────────────────

const goalSchema = z.string().trim().min(10).max(2000);

function parseCurriculumJson(raw: string): { title: string; modules: CurriculumModule[] } {
  const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim();
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start === -1 || end === -1) throw new Error('no JSON object found');
  const parsed = JSON.parse(cleaned.slice(start, end + 1));
  if (!parsed.title || !Array.isArray(parsed.modules) || parsed.modules.length === 0) {
    throw new Error('missing title or modules');
  }
  return parsed;
}

export async function generateCurriculum(
  _prev: { error?: string },
  formData: FormData
): Promise<{ error?: string }> {
  const goal = goalSchema.safeParse(formData.get('goal'));
  if (!goal.success) return { error: 'Describe the goal in at least a sentence.' };

  let curriculum: { title: string; modules: CurriculumModule[] };
  try {
    const raw = await chatCompletion(buildCurriculumPrompt(goal.data));
    curriculum = parseCurriculumJson(raw);
  } catch (error) {
    return { error: aiErrorMessage(error) };
  }

  const id = await createCurriculum({
    title: curriculum.title,
    goal: goal.data,
    modules: curriculum.modules,
  });
  redirect(`/learn/${id}`);
}

export async function archiveCurriculum(id: number): Promise<void> {
  await dbArchiveCurriculum(id);
  revalidatePath('/');
  redirect('/');
}

/**
 * Generates the module intro for a fresh session. Retryable: if the AI call
 * fails, the session stays empty and this action can simply run again —
 * the old app's unrecoverable blank-session bug is gone.
 */
export async function startSessionIntro(sessionId: number): Promise<{ intro?: string; error?: string }> {
  const session = await getSession(sessionId);
  if (!session) return { error: 'Session not found.' };
  if (session.messages.length > 0) return { intro: undefined }; // already started
  const curriculum = await getCurriculum(session.curriculum_id);
  if (!curriculum) return { error: 'Curriculum not found.' };
  const module = curriculum.modules[session.module_index];
  const priorFuzzy = await getPriorFuzzy(curriculum.id);

  try {
    const intro = await chatCompletion([
      buildSessionPrompt({
        curriculumTitle: curriculum.title,
        moduleTitle: module.title,
        moduleDescription: module.description,
        learningObjectives: module.learningObjectives,
        coreConceptsToMaster: module.coreConceptsToMaster,
        practicalExercise: module.practicalExercise,
        priorFuzzy,
      }),
      {
        role: 'user',
        content: buildModuleIntroPrompt({
          curriculumTitle: curriculum.title,
          moduleTitle: module.title,
          moduleDescription: module.description,
          learningObjectives: module.learningObjectives,
          practicalExercise: module.practicalExercise,
          moduleIndex: session.module_index,
          totalModules: curriculum.modules.length,
          priorFuzzy,
        }),
      },
    ]);
    const messages: ChatMessage[] = [{ role: 'assistant', content: intro }];
    await saveSessionMessages(sessionId, messages);
    return { intro };
  } catch (error) {
    return { error: aiErrorMessage(error) };
  }
}

const messageSchema = z.string().trim().min(1).max(4000);

export async function sendMessage(
  sessionId: number,
  text: string
): Promise<{ reply?: string; error?: string }> {
  const parsed = messageSchema.safeParse(text);
  if (!parsed.success) return { error: 'Message is empty or too long.' };

  const session = await getSession(sessionId);
  if (!session) return { error: 'Session not found.' };
  const curriculum = await getCurriculum(session.curriculum_id);
  if (!curriculum) return { error: 'Curriculum not found.' };
  const module = curriculum.modules[session.module_index];
  const priorFuzzy = await getPriorFuzzy(curriculum.id);

  const history: ChatMessage[] = [...session.messages, { role: 'user', content: parsed.data }];
  // Persist the user's message immediately — an AI failure never loses it.
  await saveSessionMessages(sessionId, history);

  try {
    const reply = await chatCompletion([
      buildSessionPrompt({
        curriculumTitle: curriculum.title,
        moduleTitle: module.title,
        moduleDescription: module.description,
        learningObjectives: module.learningObjectives,
        coreConceptsToMaster: module.coreConceptsToMaster,
        practicalExercise: module.practicalExercise,
        priorFuzzy,
      }),
      ...history,
    ]);
    await saveSessionMessages(sessionId, [...history, { role: 'assistant', content: reply }]);
    return { reply };
  } catch (error) {
    return { error: aiErrorMessage(error) };
  }
}

/** One tap. No required fields, ever. */
export async function endSession(sessionId: number): Promise<{ error?: string }> {
  const session = await getSession(sessionId);
  if (!session) return { error: 'Session not found.' };
  await dbCompleteSession(sessionId);
  await upsertReview(session.curriculum_id, session.module_index, dayKey(await tz()));
  revalidatePath('/');
  revalidatePath(`/learn/${session.curriculum_id}`);
  return {};
}

export async function saveFuzzy(sessionId: number, fuzzy: string): Promise<void> {
  const trimmed = fuzzy.trim().slice(0, 400);
  if (trimmed) await saveSessionFuzzy(sessionId, trimmed);
}

// ── Reviews ─────────────────────────────────────────────────────────────────

export async function reviewGotIt(curriculumId: number, moduleIndex: number): Promise<void> {
  await dbAdvanceReview(curriculumId, moduleIndex, dayKey(await tz()));
  revalidatePath('/');
}

export async function reviewNeverAgain(curriculumId: number, moduleIndex: number): Promise<void> {
  await dbDismissReview(curriculumId, moduleIndex);
  revalidatePath('/');
}

// ── Settings ────────────────────────────────────────────────────────────────

const settingsSchema = z.object({
  display_name: z.string().trim().min(1).max(60),
  timezone: z.string().trim().min(1).max(64),
});

export async function updateSettings(formData: FormData): Promise<void> {
  const parsed = settingsSchema.safeParse({
    display_name: formData.get('display_name'),
    timezone: formData.get('timezone'),
  });
  if (!parsed.success) return;
  await dbUpdateSettings(parsed.data);
  revalidatePath('/');
  revalidatePath('/settings');
}

export async function toggleSource(id: number, enabled: boolean): Promise<void> {
  await setSourceEnabled(id, enabled);
  revalidatePath('/settings');
}

const sourceSchema = z.object({
  name: z.string().trim().min(1).max(60),
  url: z.string().trim().url().max(500),
});

export async function addSource(formData: FormData): Promise<{ error?: string }> {
  const parsed = sourceSchema.safeParse({ name: formData.get('name'), url: formData.get('url') });
  if (!parsed.success) return { error: 'Needs a name and a valid feed URL.' };
  await dbAddSource(parsed.data.name, parsed.data.url);
  revalidatePath('/settings');
  return {};
}

export async function removeSource(id: number): Promise<void> {
  await dbRemoveSource(id);
  revalidatePath('/settings');
}

// ── Import from the old MomentumOS ──────────────────────────────────────────

export async function importData(formData: FormData): Promise<{ summary?: string; error?: string }> {
  const file = formData.get('file');
  if (!(file instanceof File) || file.size === 0) return { error: 'Choose the aaj-export.json file first.' };
  if (file.size > 50 * 1024 * 1024) return { error: 'File is too large.' };
  try {
    const { importExportFile } = await import('@/lib/import');
    const result = await importExportFile(await file.text());
    revalidatePath('/');
    return {
      summary: `Imported ${result.tasks} tasks, ${result.reflections} reflections, ${result.curricula} curricula, ${result.sessions} sessions, ${result.saved} saved items.`,
    };
  } catch (error) {
    return { error: `Import failed: ${error instanceof Error ? error.message : 'unreadable file'}` };
  }
}
