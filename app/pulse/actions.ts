'use server';

import { revalidatePath } from 'next/cache';
import { saveStory, unsaveStory } from '@/lib/db';

interface StoryInput {
  title: string;
  url: string;
  source: string;
  category: string;
  summary: string;
}

export async function saveStoryAction(story: StoryInput): Promise<{ ok: boolean }> {
  try {
    saveStory(story);
    revalidatePath('/pulse');
    return { ok: true };
  } catch {
    return { ok: false };
  }
}

export async function unsaveStoryAction(url: string): Promise<{ ok: boolean }> {
  try {
    unsaveStory(url);
    revalidatePath('/pulse');
    return { ok: true };
  } catch {
    return { ok: false };
  }
}
