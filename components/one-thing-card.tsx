// components/one-thing-card.tsx
'use client';

import type { Priority } from '@/lib/one-thing';

interface Props {
  priority: Priority | null;
  onComplete: (id: number) => void;
  onDismiss: () => void;
  dismissedUntil: number | null; // timestamp
}

export function OneThingCard({ priority, onComplete, onDismiss, dismissedUntil }: Props) {
  const isDismissed =
    dismissedUntil !== null && Date.now() < dismissedUntil;

  if (!priority || isDismissed) return null;

  return (
    <div className="one-thing-card" role="region" aria-label="Your one thing">
      <p className="one-thing-label">Right now</p>
      <h2 className="one-thing-title">{priority.title}</h2>
      {priority.detail && (
        <p className="one-thing-detail">{priority.detail}</p>
      )}
      <div className="one-thing-actions">
        <button
          className="btn-primary"
          onClick={() => onComplete(priority.id)}
        >
          Done
        </button>
        <button
          className="btn-ghost"
          onClick={onDismiss}
          title="Hide for 1 hour"
        >
          Not now
        </button>
      </div>
    </div>
  );
}
