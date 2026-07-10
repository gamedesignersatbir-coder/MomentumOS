'use client';

import { useRef, useState, useTransition } from 'react';
import { toggleSource, addSource, removeSource } from '@/app/actions';
import type { Source } from '@/lib/types';

export function SourcesManager({ sources }: { sources: Source[] }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <div className="mt-3">
      <ul className="space-y-1">
        {sources.map((source) => (
          <li key={source.id} className="flex items-center gap-3 py-1.5 text-sm">
            <input
              type="checkbox"
              id={`source-${source.id}`}
              checked={source.enabled}
              onChange={(e) => startTransition(() => toggleSource(source.id, e.target.checked))}
              className="h-4 w-4 accent-[var(--accent)]"
            />
            <label htmlFor={`source-${source.id}`} className={`flex-1 ${source.enabled ? '' : 'text-muted'}`}>
              {source.name}
            </label>
            <button
              onClick={() => startTransition(() => removeSource(source.id))}
              className="text-xs text-faint hover:text-danger hover:underline"
            >
              remove
            </button>
          </li>
        ))}
      </ul>

      <form
        ref={formRef}
        action={(formData) =>
          startTransition(async () => {
            const result = await addSource(formData);
            setError(result.error ?? null);
            if (!result.error) formRef.current?.reset();
          })
        }
        className="mt-4 flex flex-wrap gap-2"
      >
        <input name="name" placeholder="Name" maxLength={60} className="w-36 rounded-lg border border-line px-3 py-2 text-sm" />
        <input name="url" placeholder="RSS / Atom feed URL" maxLength={500} className="min-w-0 flex-1 rounded-lg border border-line px-3 py-2 text-sm" />
        <button disabled={pending} className="rounded-full bg-accent px-4 py-1.5 text-sm font-semibold text-bg disabled:opacity-60">
          Add
        </button>
      </form>
      {error && <p className="mt-2 text-sm text-danger">{error}</p>}
    </div>
  );
}
