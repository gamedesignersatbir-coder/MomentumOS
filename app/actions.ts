"use server";

import { revalidatePath } from "next/cache";
import { z, type ZodError } from "zod";

import {
  addFocusBlock,
  addLearningEntry,
  addPriority,
  addQuickTask,
  addQuickTaskInbox,
  archivePriority,
  deferTask,
  recordGreetingShown,
  saveReflection,
  seedTomorrowPriority,
  toggleFocusBlock,
  togglePriority,
  toggleQuickTask,
  updateUserProfile,
} from "@/lib/db";
import { timeToMinutes } from '@/lib/curriculum-types';

const prioritySchema = z.object({
  title: z.string().min(3).max(80),
  detail: z.string().max(180).optional().default("")
});

const quickTaskSchema = z.object({
  title: z.string().min(2).max(80)
});

const focusBlockSchema = z.object({
  label: z.string().min(3).max(80),
  startTime: z.string().min(1),
  endTime: z.string().min(1),
  intensity: z.enum(["Deep", "Steady", "Light"])
});

const learningSchema = z.object({
  topic: z.string().min(3).max(80),
  minutes: z.coerce.number().int().min(5).max(240),
  notes: z.string().min(5).max(280),
  confidence: z.coerce.number().int().min(1).max(5),
  nextAction: z.string().min(3).max(140)
});

const reflectionSchema = z.object({
  energyWin: z.string().min(3).max(200),
  learningEdge: z.string().min(3).max(200),
  familyNote: z.string().min(3).max(200)
});

function field<K extends string>(formData: FormData, key: K) {
  return String(formData.get(key) ?? "");
}

export async function addPriorityAction(formData: FormData) {
  const input = prioritySchema.parse({
    title: field(formData, "title"),
    detail: field(formData, "detail")
  });
  addPriority(input);
  revalidatePath("/");
  return { ok: true, message: "Priority added." };
}

export async function togglePriorityAction(id: number) {
  togglePriority(id);
  revalidatePath("/");
  return { ok: true, message: "Priority updated." };
}

export async function addQuickTaskAction(formData: FormData) {
  const input = quickTaskSchema.parse({ title: field(formData, "title") });
  addQuickTask(input);
  revalidatePath("/");
  return { ok: true, message: "Quick task captured." };
}

export async function toggleQuickTaskAction(id: number) {
  toggleQuickTask(id);
  revalidatePath("/");
  return { ok: true, message: "Quick task updated." };
}

export async function addFocusBlockAction(formData: FormData) {
  const input = focusBlockSchema.parse({
    label: field(formData, "label"),
    startTime: field(formData, "startTime"),
    endTime: field(formData, "endTime"),
    intensity: field(formData, "intensity")
  });
  addFocusBlock(input);
  revalidatePath("/");
  return { ok: true, message: "Focus block scheduled." };
}

export async function toggleFocusBlockAction(id: number) {
  toggleFocusBlock(id);
  revalidatePath("/");
  return { ok: true, message: "Focus block updated." };
}

export async function addLearningEntryAction(formData: FormData) {
  const input = learningSchema.parse({
    topic: field(formData, "topic"),
    minutes: field(formData, "minutes"),
    notes: field(formData, "notes"),
    confidence: field(formData, "confidence"),
    nextAction: field(formData, "nextAction")
  });
  addLearningEntry(input);
  revalidatePath("/");
  return { ok: true, message: "Learning sprint saved." };
}

export async function saveReflectionAction(formData: FormData) {
  const input = reflectionSchema.parse({
    energyWin: field(formData, "energyWin"),
    learningEdge: field(formData, "learningEdge"),
    familyNote: field(formData, "familyNote")
  });
  const suggestion = saveReflection(input);
  revalidatePath("/");
  return { ok: true, message: "Reflection captured.", suggestion };
}

export async function recordGreetingAction(messageId: string): Promise<void> {
  recordGreetingShown(messageId);
}

export async function quickCaptureAction(title: string): Promise<void> {
  const parsed = z.string().min(1).max(200).safeParse(title);
  if (!parsed.success) return;
  // Insert with status='inbox' — inbox items require explicit triage/promotion
  addQuickTaskInbox(parsed.data);
  revalidatePath('/');
}

export async function deferTaskAction(
  id: number,
  type: 'priority' | 'quick_task'
): Promise<void> {
  deferTask(id, type);
  revalidatePath('/');
}

export async function softCloseAction(formData: {
  deferIds: number[];
  archiveIds: number[];
  tomorrowSeed: string;
}): Promise<void> {
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
    archivePriority(id);
  }

  // Seed tomorrow's top priority if provided.
  // Increment all existing active priority ranks first so the seed lands at rank 1.
  if (tomorrowSeed.trim()) {
    seedTomorrowPriority(tomorrowSeed.trim());
  }

  revalidatePath('/');
}

// ─── Profile helpers ────────────────────────────────────────────

const PROFILE_FIELD_LABELS: Record<string, string> = {
  display_name: 'Display name',
  about_me: 'About me',
  domains: 'Domains',
  sadhana_morning_end: 'Sadhana morning end',
  sadhana_afternoon_start: 'Sadhana afternoon start',
  sadhana_afternoon_end: 'Sadhana afternoon end',
  work_start: 'Work start',
  work_end: 'Work end',
};

function friendlyError(err: ZodError): string {
  const issue = err.issues[0];
  const key = String(issue.path[0] ?? '');
  const name = PROFILE_FIELD_LABELS[key] ?? (key || 'Input');
  if (issue.code === 'too_small') return `${name} can't be blank.`;
  return `${name}: ${issue.message}`;
}

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
  const timezone = (formData.get('timezone') as string) || 'Asia/Kolkata';

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
    timezone,
  });
  revalidatePath('/profile');
  revalidatePath('/');
  return { ok: true, message: 'Profile saved.' };
}
