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
import { sm2Update, addDays } from '@/lib/sm2';
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
  // Strip markdown fences if the model wrapped its response
  const cleanedJson = rawJson.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  let modulesJson: string;
  try {
    const parsed = JSON.parse(cleanedJson) as { title?: string; modules?: unknown };
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
