'use client';

import { useActionState } from 'react';
import { login } from '@/app/actions';

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(login, {});

  return (
    <main className="flex min-h-[70vh] items-center justify-center">
      <form action={formAction} className="w-full max-w-xs text-center">
        <h1 className="serif text-3xl font-semibold">Aaj</h1>
        <p className="mt-1 mb-6 text-sm text-muted">One page for today.</p>
        <input
          type="password"
          name="passcode"
          placeholder="Passcode"
          autoFocus
          className="w-full rounded-lg border border-line px-4 py-2.5 text-center"
        />
        {state.error && <p className="mt-3 text-sm text-danger">{state.error}</p>}
        <button
          type="submit"
          disabled={pending}
          className="mt-4 w-full rounded-lg bg-accent px-4 py-2.5 font-semibold text-bg disabled:opacity-60"
        >
          {pending ? 'Checking…' : 'Enter'}
        </button>
      </form>
    </main>
  );
}
