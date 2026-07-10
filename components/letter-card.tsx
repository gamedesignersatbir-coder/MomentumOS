'use client';

import { useState, useTransition } from 'react';
import { generateLetter } from '@/app/actions';

export function LetterCard({ monthLabel, text }: { monthLabel: string; text: string | null }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <section className="mt-10 rounded-xl bg-accent-soft p-5">
      <h2 className="label">Your {monthLabel} letter</h2>
      {text ? (
        <div className="mt-2 space-y-3 text-[15px] leading-relaxed">
          {text.split(/\n\s*\n/).map((para, i) => (
            <p key={i}>{para}</p>
          ))}
        </div>
      ) : (
        <div className="mt-2">
          <p className="text-sm text-muted">A month of evening lines is ready to be read back to you.</p>
          <button
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const result = await generateLetter();
                setError(result.error ?? null);
              })
            }
            className="mt-3 rounded-full bg-accent px-4 py-1.5 text-sm font-semibold text-bg disabled:opacity-60"
          >
            {pending ? 'Writing…' : 'Read it'}
          </button>
          {error && <p className="mt-2 text-sm text-danger">{error}</p>}
        </div>
      )}
    </section>
  );
}
