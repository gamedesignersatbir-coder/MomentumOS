// components/soft-close-modal.tsx
'use client';

import { useState, useTransition } from 'react';
import { softCloseAction } from '@/app/actions';
import type { Priority } from '@/lib/one-thing';

interface Props {
  priorities: Priority[];
  onClose: () => void;
}

type ItemState = 'keep' | 'defer' | 'archive';

export function SoftCloseModal({ priorities, onClose }: Props) {
  const activePriorities = priorities.filter((p) => p.status === 'active');
  const [itemStates, setItemStates] = useState<Record<number, ItemState>>(
    Object.fromEntries(activePriorities.map((p) => [p.id, 'keep']))
  );
  const [tomorrowSeed, setTomorrowSeed] = useState('');
  const [isPending, startTransition] = useTransition();

  function setItemState(id: number, state: ItemState) {
    setItemStates((prev) => ({ ...prev, [id]: state }));
  }

  function handleSubmit() {
    const deferIds = Object.entries(itemStates)
      .filter(([, s]) => s === 'defer')
      .map(([id]) => Number(id));
    const archiveIds = Object.entries(itemStates)
      .filter(([, s]) => s === 'archive')
      .map(([id]) => Number(id));

    startTransition(async () => {
      await softCloseAction({ deferIds, archiveIds, tomorrowSeed });
      onClose();
    });
  }

  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-header">
          <h2 className="modal-title">How did today go?</h2>
          <p className="modal-subtitle">60 seconds to close the day cleanly.</p>
        </div>

        {activePriorities.length > 0 && (
          <div className="soft-close-list">
            <p className="soft-close-section-label">Uncompleted items:</p>
            {activePriorities.map((p) => (
              <div key={p.id} className="soft-close-item">
                <span className="soft-close-item-title">{p.title}</span>
                <div className="soft-close-item-actions">
                  {(['keep', 'defer', 'archive'] as ItemState[]).map(
                    (state) => (
                      <button
                        key={state}
                        className={`btn-small ${
                          itemStates[p.id] === state
                            ? 'btn-selected'
                            : 'btn-ghost'
                        }`}
                        onClick={() => setItemState(p.id, state)}
                      >
                        {state === 'keep'
                          ? 'Carry forward'
                          : state === 'defer'
                          ? 'Defer'
                          : 'Archive'}
                      </button>
                    )
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="soft-close-tomorrow">
          <label className="soft-close-label" htmlFor="tomorrow-seed">
            What&apos;s the one thing for tomorrow?
          </label>
          <input
            id="tomorrow-seed"
            className="input"
            value={tomorrowSeed}
            onChange={(e) => setTomorrowSeed(e.target.value)}
            placeholder="e.g. Finish the boss telegraph pass"
          />
        </div>

        <div className="modal-footer">
          <button
            className="btn-primary"
            onClick={handleSubmit}
            disabled={isPending}
          >
            {isPending ? 'Saving...' : 'Close the day'}
          </button>
          <button className="btn-ghost" onClick={onClose}>
            Skip for now
          </button>
        </div>
      </div>
    </div>
  );
}
