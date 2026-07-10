'use client';

import { useActionState } from 'react';
import { generateCurriculum } from '@/app/actions';

export function NewCurriculumForm({ initialGoal }: { initialGoal: string }) {
  const [state, formAction, pending] = useActionState(generateCurriculum, {});

  return (
    <form action={formAction} className="mt-5">
      <textarea
        name="goal"
        defaultValue={initialGoal}
        rows={4}
        maxLength={2000}
        placeholder="What do you want to be able to do? e.g. “Design roguelite meta-progression systems that stay fun for 100 hours”"
        className="w-full rounded-lg border border-line px-4 py-3 text-[15px]"
      />
      {state.error && <p className="mt-2 text-sm text-danger">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="mt-3 rounded-full bg-accent px-5 py-2 text-sm font-semibold text-bg disabled:opacity-60"
      >
        {pending ? 'Designing your curriculum… ~15s' : 'Generate curriculum'}
      </button>
    </form>
  );
}
