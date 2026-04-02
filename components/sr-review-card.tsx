'use client';

import { useState, useTransition } from 'react';
import { submitSRReviewAction } from '@/app/learn/actions';

interface Props {
  srItemId: number;
  curriculumTitle: string;
  moduleTitle: string;
  whatsFuzzy: string;
  nextAction: string;
}

export function SRReviewCard({ srItemId, curriculumTitle, moduleTitle, whatsFuzzy, nextAction }: Props) {
  const [isPending, startTransition] = useTransition();
  const [done, setDone] = useState(false);

  function submit(quality: 2 | 3 | 5) {
    startTransition(async () => {
      await submitSRReviewAction(srItemId, quality);
      setDone(true);
    });
  }

  if (done) {
    return (
      <div style={{
        background: 'var(--bg-surface)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius-md)', padding: 'var(--space-4)',
        color: 'var(--text-muted)', fontSize: '0.875rem',
      }}>
        ✓ Review recorded
      </div>
    );
  }

  return (
    <div style={{
      background: 'var(--bg-surface)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-md)',
      padding: 'var(--space-5)',
    }}>
      <p style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--accent-muted)', marginBottom: 'var(--space-2)' }}>
        {curriculumTitle} · {moduleTitle}
      </p>
      <p style={{ fontSize: '0.9rem', color: 'var(--text-primary)', marginBottom: 'var(--space-2)', fontStyle: 'italic' }}>
        "{whatsFuzzy || nextAction}"
      </p>
      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 'var(--space-4)' }}>
        Does this still feel relevant / understood?
      </p>
      <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
        <button
          className="btn-small btn-ghost"
          onClick={() => submit(2)}
          disabled={isPending}
        >
          Not really
        </button>
        <button
          className="btn-small btn-ghost"
          onClick={() => submit(3)}
          disabled={isPending}
        >
          Somewhat
        </button>
        <button
          className="btn-small btn-selected"
          onClick={() => submit(5)}
          disabled={isPending}
        >
          Yes, clearly
        </button>
      </div>
    </div>
  );
}
