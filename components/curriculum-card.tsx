import Link from 'next/link';
import { BookOpen } from 'lucide-react';
import { parseModules } from '@/lib/curriculum-types';

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

  return (
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
      }}
      className="hover:border-[var(--accent-muted)]"
    >
      <div style={{ display: 'flex', gap: 'var(--space-4)', alignItems: 'center' }}>
        {/* Progress ring */}
        {modules.length > 0 && (
          <ProgressRing completed={completed} total={modules.length} />
        )}

        {/* Content */}
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
  );
}
