'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { generateCurriculumAction } from '@/app/learn/actions';
import { DOMAINS } from '@/lib/curriculum-types';

export function CurriculumBuilderForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await generateCurriculumAction(formData);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      router.push(`/learn/${result.id}`);
    });
  }

  return (
    <form action={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
      <div>
        <label className="soft-close-label">What do you want to learn?</label>
        <textarea
          name="goalStatement"
          className="textarea"
          rows={4}
          placeholder="I want to understand programming basics so I can guide AI tools more precisely in my game design workflow."
          required
        />
        <p style={{ marginTop: 'var(--space-2)', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          Be specific — the more context, the better the curriculum.
        </p>
      </div>

      <div>
        <label className="soft-close-label">Domain</label>
        <select name="domain" className="input" defaultValue="AI">
          {DOMAINS.map((d) => (
            <option key={d} value={d}>{d}</option>
          ))}
          <option value="other">Other</option>
        </select>
      </div>

      {error && (
        <p style={{ fontSize: '0.875rem', color: 'var(--error)', padding: 'var(--space-3)', background: 'rgba(224,92,92,0.08)', borderRadius: 'var(--radius-sm)' }}>
          {error}
        </p>
      )}

      <button type="submit" className="btn-primary" disabled={isPending}>
        {isPending ? 'Generating curriculum…' : 'Generate curriculum'}
      </button>

      {isPending && (
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textAlign: 'center' }}>
          Asking the AI to design your path. This takes about 10 seconds.
        </p>
      )}
    </form>
  );
}
