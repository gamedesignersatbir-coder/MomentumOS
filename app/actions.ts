"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import {
  addFocusBlock,
  addLearningEntry,
  addPriority,
  addQuickTask,
  saveReflection,
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
