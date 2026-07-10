'use client';

import { useState, useTransition } from 'react';
import { saveReflection } from '@/app/actions';

export function Tonight({ existing }: { existing: string | null }) {
  const [text, setText] = useState(existing ?? '');
  const [saved, setSaved] = useState(Boolean(existing));
  const [pending, startTransition] = useTransition();

  function save() {
    if (!text.trim()) return;
    startTransition(async () => {
      const result = await saveReflection(text);
      if (!result.error) setSaved(true);
    });
  }

  return (
    <div className="mt-3">
      <input
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          setSaved(false);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') save();
        }}
        onBlur={save}
        placeholder="One line about today…"
        maxLength={500}
        className="w-full rounded-lg border border-line px-4 py-2.5 text-[15px]"
      />
      <p className="mt-1 h-4 text-xs text-muted">
        {pending ? 'Saving…' : saved && text.trim() ? 'Kept. It feeds your monthly letter.' : ''}
      </p>
    </div>
  );
}
