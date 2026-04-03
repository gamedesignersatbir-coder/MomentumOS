'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { BookOpen, Trash2 } from 'lucide-react';
import { parseModules } from '@/lib/curriculum-types';
import { deleteCurriculumAction } from '@/app/learn/actions';

interface Props {
  id: number;
  title: string;
  goalStatement: string;
  domain: string;
  modulesJson: string;
  completedSessions: number;
}

function ProgressRing({ completed, total }: { completed: number; total: number }) {
  const size = 44;
  const stroke = 3;
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const pct = total > 0 ? Math.min(completed / total, 1) : 0;
  const dash = pct * circ;

  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={stroke} />
        {pct > 0 && (
          <circle
            cx={size / 2} cy={size / 2} r={r} fill="none"
            stroke={pct === 1 ? 'var(--success)' : 'var(--accent)'}
            strokeWidth={stroke}
            strokeDasharray={`${dash} ${circ - dash}`}
            strokeLinecap="round"
          />
        )}
      </svg>
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        lineHeight: 1,
      }}>
        <span style={{ fontSize: '0.6rem', fontWeight: 700, color: pct === 1 ? 'var(--success)' : pct > 0 ? 'var(--accent)' : 'var(--text-muted)' }}>
          {completed}
        </span>
        <span style={{ fontSize: '0.5rem', color: 'var(--text-muted)' }}>/{total}</span>
      </div>
    </div>
  );
}

export function CurriculumCard({ id, title, goalStatement, domain, modulesJson, completedSessions }: Props) {
  const modules = parseModules(modulesJson);
  const completed = Math.min(completedSessions, modules.length);
  const [confirming, setConfirming] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleDelete(e: React.MouseEvent) {
    e.preventDefault();
    if (!confirming) { setConfirming(true); return; }
    startTransition(async () => {
      await deleteCurriculumAction(id);
    });
  }

  return (
    <div style={{ position: 'relative' }}>
      <Link
        href={`/learn/${id}`}
        style={{
          display: 'block',
          background: 'var(--bg-surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
          padding: 'var(--space-5)',
          transition: 'border-color 0.15s',
          textDecoration: 'none',
          paddingRight: 'var(--space-12)',
        }}
        className="hover:border-[var(--accent-muted)]"
      >
        <div style={{ display: 'flex', gap: 'var(--space-4)', alignItems: 'center' }}>
          {modules.length > 0 && (
            <ProgressRing completed={completed} total={modules.length} />
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center', marginBottom: 'var(--space-1)' }}>
              <BookOpen size={12} style={{ color: 'var(--accent)', flexShrink: 0 }} />
              <span style={{ fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--accent-muted)' }}>
                {domain}
              </span>
            </div>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 'var(--space-1)', lineHeight: 1.3 }}>
              {title}
            </h3>
            <p style={{
              fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.5,
              overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
            }}>
              {goalStatement}
            </p>
          </div>
        </div>
      </Link>

      {/* Delete button */}
      <div style={{ position: 'absolute', top: 'var(--space-4)', right: 'var(--space-4)', display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
        {confirming && (
          <span style={{ fontSize: '0.72rem', color: 'var(--error)', whiteSpace: 'nowrap' }}>
            Delete?
          </span>
        )}
        <button
          onClick={handleDelete}
          onBlur={() => setTimeout(() => setConfirming(false), 200)}
          disabled={isPending}
          title={confirming ? 'Confirm delete' : 'Delete curriculum'}
          style={{
            background: confirming ? 'rgba(224,92,92,0.15)' : 'none',
            border: confirming ? '1px solid rgba(224,92,92,0.3)' : '1px solid transparent',
            borderRadius: 'var(--radius-sm)',
            padding: '4px 6px',
            cursor: 'pointer',
            color: confirming ? 'var(--error)' : 'var(--text-muted)',
            display: 'flex',
            alignItems: 'center',
            transition: 'all 0.15s',
          }}
        >
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  );
}
