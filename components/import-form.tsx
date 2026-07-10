'use client';

import { useState, useTransition } from 'react';
import { importData } from '@/app/actions';

export function ImportForm() {
  const [message, setMessage] = useState<{ text: string; isError: boolean } | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <form
      action={(formData) =>
        startTransition(async () => {
          const result = await importData(formData);
          if (result.error) setMessage({ text: result.error, isError: true });
          else setMessage({ text: result.summary ?? 'Imported.', isError: false });
        })
      }
      className="mt-3"
    >
      <div className="flex flex-wrap items-center gap-3">
        <input type="file" name="file" accept="application/json,.json" className="text-sm" />
        <button
          disabled={pending}
          className="rounded-full bg-accent px-4 py-1.5 text-sm font-semibold text-bg disabled:opacity-60"
        >
          {pending ? 'Importing…' : 'Import'}
        </button>
      </div>
      {message && (
        <p className={`mt-2 text-sm ${message.isError ? 'text-danger' : 'text-accent'}`}>{message.text}</p>
      )}
    </form>
  );
}
