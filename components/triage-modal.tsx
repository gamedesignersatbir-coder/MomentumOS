// components/triage-modal.tsx
'use client';

import { useTransition } from 'react';
import { deferTaskAction } from '@/app/actions';
import type { Priority } from '@/lib/one-thing';

interface QuickTask {
  id: number;
  title: string;
  status: string;
}

interface Props {
  priorities: Priority[];
  quickTasks: QuickTask[];
  onClose: () => void;
}

export function TriageModal({ priorities, quickTasks, onClose }: Props) {
  const [isPending, startTransition] = useTransition();

  const activeCount =
    priorities.filter((p) => p.status === 'active').length +
    quickTasks.filter((t) => t.status === 'active').length;

  function handleDefer(id: number, type: 'priority' | 'quick_task') {
    startTransition(async () => {
      await deferTaskAction(id, type);
    });
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Quick Triage</h2>
          <p className="modal-subtitle">
            {activeCount} active items. Keep what matters, defer the rest.
          </p>
        </div>

        <div className="triage-list">
          {priorities
            .filter((p) => p.status === 'active')
            .map((p) => (
              <div key={`p-${p.id}`} className="triage-item">
                <span className="triage-item-title">{p.title}</span>
                <div className="triage-item-actions">
                  <span className="triage-keep-label">Keep</span>
                  <button
                    className="btn-ghost btn-small"
                    onClick={() => handleDefer(p.id, 'priority')}
                    disabled={isPending}
                  >
                    Defer
                  </button>
                </div>
              </div>
            ))}
          {quickTasks
            .filter((t) => t.status === 'active')
            .map((t) => (
              <div key={`t-${t.id}`} className="triage-item">
                <span className="triage-item-title">{t.title}</span>
                <div className="triage-item-actions">
                  <span className="triage-keep-label">Keep</span>
                  <button
                    className="btn-ghost btn-small"
                    onClick={() => handleDefer(t.id, 'quick_task')}
                    disabled={isPending}
                  >
                    Defer
                  </button>
                </div>
              </div>
            ))}
        </div>

        <div className="modal-footer">
          <button className="btn-primary" onClick={onClose}>
            Done
          </button>
          <p className="modal-footnote">
            Deferred items are saved — not deleted. Find them in history.
          </p>
        </div>
      </div>
    </div>
  );
}
