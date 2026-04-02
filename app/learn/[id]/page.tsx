import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getCurriculumById, getSessionsForCurriculum } from '@/lib/db';
import { parseModules } from '@/lib/curriculum-types';
import { CheckCircle2, Circle, Clock } from 'lucide-react';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function CurriculumPage({ params }: Props) {
  const { id } = await params;
  const curriculum = getCurriculumById(Number(id));
  if (!curriculum) notFound();

  const modules = parseModules(curriculum.modulesJson);
  const sessions = getSessionsForCurriculum(curriculum.id);

  // Determine completion status per module: has at least one completed session
  const completedModuleIndices = new Set(
    sessions.filter((s) => s.completedAt !== null).map((s) => s.moduleIndex)
  );

  return (
    <main className="page-wrapper">
      <div style={{ maxWidth: 720, paddingTop: 'var(--space-8)' }}>
        <div style={{ marginBottom: 'var(--space-6)' }}>
          <Link href="/learn" style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            ← Learning Coach
          </Link>
        </div>

        <div style={{ marginBottom: 'var(--space-8)' }}>
          <p style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--accent-muted)', marginBottom: 'var(--space-2)' }}>
            {curriculum.domain}
          </p>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 'var(--space-2)' }}>
            {curriculum.title}
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            {curriculum.goalStatement}
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {modules.map((mod, index) => {
            const done = completedModuleIndices.has(index);
            return (
              <div
                key={mod.id}
                style={{
                  background: 'var(--bg-surface)',
                  border: `1px solid ${done ? 'rgba(76,175,125,0.3)' : 'var(--border)'}`,
                  borderRadius: 'var(--radius-md)',
                  padding: 'var(--space-5)',
                  display: 'flex',
                  gap: 'var(--space-4)',
                  alignItems: 'flex-start',
                }}
              >
                <div style={{ marginTop: 2, flexShrink: 0 }}>
                  {done
                    ? <CheckCircle2 size={18} style={{ color: 'var(--success)' }} />
                    : <Circle size={18} style={{ color: 'var(--text-muted)' }} />
                  }
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: 'var(--space-1)' }}>
                    {index + 1}. {mod.title}
                  </p>
                  <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: 'var(--space-3)' }}>
                    {mod.description}
                  </p>
                  <div style={{ display: 'flex', gap: 'var(--space-4)', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Clock size={12} /> {mod.estimatedMinutes} min
                    </span>
                    <Link
                      href={`/learn/${curriculum.id}/session?module=${index}`}
                      className="btn-small btn-ghost"
                      style={{ textDecoration: 'none' }}
                    >
                      {done ? 'Review again' : 'Start session'}
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}
