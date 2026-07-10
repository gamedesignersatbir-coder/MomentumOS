'use client';

import { useState, useTransition } from 'react';
import { archiveCurriculum } from '@/app/actions';

export function ArchiveCurriculumButton({ id }: { id: number }) {
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();

  if (!confirming) {
    return (
      <button
        onClick={() => setConfirming(true)}
        className="text-xs text-faint hover:text-danger hover:underline"
      >
        archive this curriculum
      </button>
    );
  }
  return (
    <span className="text-xs">
      <span className="text-muted">Sure? It disappears from Today. </span>
      <button
        disabled={pending}
        onClick={() => startTransition(() => archiveCurriculum(id))}
        className="text-danger hover:underline"
      >
        yes, archive
      </button>
      <button onClick={() => setConfirming(false)} className="ml-3 text-muted hover:underline">
        keep it
      </button>
    </span>
  );
}
