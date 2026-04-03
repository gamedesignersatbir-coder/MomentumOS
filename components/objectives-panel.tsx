'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

interface Props {
  objectives: string[];
  practicalExercise?: string;
}

export function ObjectivesPanel({ objectives, practicalExercise }: Props) {
  const [open, setOpen] = useState(false);

  if (objectives.length === 0 && !practicalExercise) return null;

  return (
    <div style={{
      background: 'rgba(232,169,69,0.04)',
      border: '1px solid rgba(232,169,69,0.12)',
      borderRadius: 'var(--radius-md)',
      marginBottom: 'var(--space-4)',
      overflow: 'hidden',
    }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: '100%',
          background: 'none',
          border: 'none',
          padding: 'var(--space-3) var(--space-4)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 'var(--space-2)',
        }}
      >
        <span style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--accent-muted)' }}>
          Session objectives
        </span>
        {open
          ? <ChevronDown size={13} style={{ color: 'var(--accent-muted)' }} />
          : <ChevronRight size={13} style={{ color: 'var(--accent-muted)' }} />
        }
      </button>

      {open && (
        <div style={{ padding: '0 var(--space-4) var(--space-4)', display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
          {objectives.map((obj, i) => (
            <div key={i} style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'flex-start' }}>
              <span style={{ color: 'var(--accent-muted)', fontSize: '0.65rem', marginTop: '3px', flexShrink: 0 }}>◆</span>
              <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>{obj}</span>
            </div>
          ))}
          {practicalExercise && (
            <div style={{
              marginTop: 'var(--space-2)',
              paddingTop: 'var(--space-3)',
              borderTop: '1px solid rgba(232,169,69,0.1)',
              display: 'flex', gap: 'var(--space-2)', alignItems: 'flex-start',
            }}>
              <span style={{ fontSize: '0.65rem', marginTop: 3, flexShrink: 0 }}>⚡</span>
              <div>
                <span style={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--accent-muted)', display: 'block', marginBottom: 2 }}>Exercise</span>
                <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>{practicalExercise}</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
