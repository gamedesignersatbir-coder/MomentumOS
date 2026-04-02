// components/stuck-overlay.tsx
'use client';

import { useState } from 'react';
import type { Priority } from '@/lib/one-thing';

interface Props {
  oneThing: Priority | null;
  onStart: (id: number) => void;
  onShowAll: () => void;
}

export function StuckOverlay({ oneThing, onStart, onShowAll }: Props) {
  const [open, setOpen] = useState(false);

  function handleShowAll() {
    setOpen(false);
    onShowAll();
  }

  return (
    <>
      {/* The button — always visible, unobtrusive */}
      <button
        className="stuck-button"
        onClick={() => setOpen(true)}
        title="Help me focus"
        aria-label="I'm stuck — help me focus"
      >
        ↓ focus
      </button>

      {/* The overlay */}
      {open && (
        <div className="stuck-overlay" onClick={() => setOpen(false)}>
          <div
            className="stuck-overlay-content"
            onClick={(e) => e.stopPropagation()}
          >
            {oneThing ? (
              <>
                <p className="stuck-overlay-label">
                  The one thing that would make today feel complete:
                </p>
                <h2 className="stuck-overlay-title">{oneThing.title}</h2>
                <div className="stuck-overlay-actions">
                  <button
                    className="btn-primary"
                    onClick={() => {
                      onStart(oneThing.id);
                      setOpen(false);
                    }}
                  >
                    Start it
                  </button>
                  <button className="btn-ghost" onClick={handleShowAll}>
                    Show me everything
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="stuck-overlay-label">
                  Your task list is clear.
                </p>
                <p className="stuck-overlay-subtitle">
                  Nothing is stuck. That means you get to choose what&apos;s next.
                </p>
                <button className="btn-ghost" onClick={() => setOpen(false)}>
                  Back
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
