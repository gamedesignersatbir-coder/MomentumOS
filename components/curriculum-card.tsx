import Link from 'next/link';
import { BookOpen, ChevronRight } from 'lucide-react';
import { parseModules } from '@/lib/curriculum-types';

interface Props {
  id: number;
  title: string;
  goalStatement: string;
  domain: string;
  modulesJson: string;
  completedSessions: number;
}

export function CurriculumCard({ id, title, goalStatement, domain, modulesJson, completedSessions }: Props) {
  const modules = parseModules(modulesJson);
  const progress = modules.length > 0
    ? `${Math.min(completedSessions, modules.length)}/${modules.length} modules`
    : 'No modules yet';

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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center', marginBottom: 'var(--space-2)' }}>
            <BookOpen size={14} style={{ color: 'var(--accent)' }} />
            <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--accent-muted)' }}>
              {domain}
            </span>
          </div>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 'var(--space-1)' }}>
            {title}
          </h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            {goalStatement}
          </p>
        </div>
        <ChevronRight size={16} style={{ color: 'var(--text-muted)', marginLeft: 'var(--space-4)', flexShrink: 0 }} />
      </div>
      <div style={{ marginTop: 'var(--space-4)', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
        {progress}
      </div>
    </Link>
  );
}
