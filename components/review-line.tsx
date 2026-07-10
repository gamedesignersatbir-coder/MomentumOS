'use client';

import { useTransition } from 'react';
import Link from 'next/link';
import { reviewGotIt, reviewNeverAgain } from '@/app/actions';

export function ReviewLine(props: {
  curriculumId: number;
  moduleIndex: number;
  moduleTitle: string;
  curriculumTitle: string;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="mt-6 flex flex-wrap items-baseline gap-x-4 gap-y-1 rounded-lg border border-line px-4 py-3 text-sm">
      <span className="text-muted">
        Worth another look: <span className="text-ink">{props.moduleTitle}</span> · {props.curriculumTitle}
      </span>
      <span className="flex gap-4 text-xs">
        <Link
          href={`/learn/${props.curriculumId}/session?m=${props.moduleIndex}`}
          className="text-accent no-underline hover:underline"
        >
          revisit
        </Link>
        <button
          disabled={pending}
          onClick={() => startTransition(() => reviewGotIt(props.curriculumId, props.moduleIndex))}
          className="text-accent hover:underline"
        >
          got it
        </button>
        <button
          disabled={pending}
          onClick={() => startTransition(() => reviewNeverAgain(props.curriculumId, props.moduleIndex))}
          className="text-faint hover:text-danger hover:underline"
        >
          never again
        </button>
      </span>
    </div>
  );
}
