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
  toggleQuickTask
} from "@/lib/db";

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

const FIELD_LABELS: Record<string, string> = {
  title: "Title", label: "Label", topic: "Topic", notes: "Notes",
  nextAction: "Next action", energyWin: "Energy win",
  learningEdge: "Learning edge", familyNote: "Family note",
  minutes: "Minutes", startTime: "Start time", endTime: "End time",
};

function friendlyError(err: ZodError): string {
  const issue = err.issues[0];
  const fieldKey = String(issue.path[0] ?? "");
  const name = FIELD_LABELS[fieldKey] ?? (fieldKey || "Input");
  if (issue.code === "too_small") return `${name} can't be blank.`;
  if (issue.code === "too_big") return `${name} is too long.`;
  return `${name}: ${issue.message}`;
}

export async function addPriorityAction(formData: FormData) {
  const result = prioritySchema.safeParse({
    title: field(formData, "title"),
    detail: field(formData, "detail")
  });
  if (!result.success) return { ok: false, message: friendlyError(result.error) };
  addPriority(result.data);
  revalidatePath("/");
  return { ok: true, message: "Priority added." };
}

export async function togglePriorityAction(id: number) {
  togglePriority(id);
  revalidatePath("/");
  return { ok: true, message: "Priority updated." };
}

export async function addQuickTaskAction(formData: FormData) {
  const result = quickTaskSchema.safeParse({ title: field(formData, "title") });
  if (!result.success) return { ok: false, message: friendlyError(result.error) };
  addQuickTask(result.data);
  revalidatePath("/");
  return { ok: true, message: "Quick task captured." };
}

export async function toggleQuickTaskAction(id: number) {
  toggleQuickTask(id);
  revalidatePath("/");
  return { ok: true, message: "Quick task updated." };
}

export async function addFocusBlockAction(formData: FormData) {
  const result = focusBlockSchema.safeParse({
    label: field(formData, "label"),
    startTime: field(formData, "startTime"),
    endTime: field(formData, "endTime"),
    intensity: field(formData, "intensity")
  });
  if (!result.success) return { ok: false, message: friendlyError(result.error) };
  addFocusBlock(result.data);
  revalidatePath("/");
  return { ok: true, message: "Focus block scheduled." };
}

export async function toggleFocusBlockAction(id: number) {
  toggleFocusBlock(id);
  revalidatePath("/");
  return { ok: true, message: "Focus block updated." };
}

export async function addLearningEntryAction(formData: FormData) {
  const result = learningSchema.safeParse({
    topic: field(formData, "topic"),
    minutes: field(formData, "minutes"),
    notes: field(formData, "notes"),
    confidence: field(formData, "confidence"),
    nextAction: field(formData, "nextAction")
  });
  if (!result.success) return { ok: false, message: friendlyError(result.error) };
  addLearningEntry(result.data);
  revalidatePath("/");
  return { ok: true, message: "Learning sprint saved." };
}

export async function saveReflectionAction(formData: FormData) {
  const result = reflectionSchema.safeParse({
    energyWin: field(formData, "energyWin"),
    learningEdge: field(formData, "learningEdge"),
    familyNote: field(formData, "familyNote")
  });
  if (!result.success) return { ok: false, message: friendlyError(result.error) };
  const suggestion = saveReflection(result.data);
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
