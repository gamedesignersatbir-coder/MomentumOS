import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getCurriculumById, getSessionsForCurriculum } from '@/lib/db';
import { parseModules } from '@/lib/curriculum-types';
import { ModuleCard } from '@/components/module-card';

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

  const completedModuleIndices = new Set(
    sessions.filter((s) => s.completedAt !== null).map((s) => s.moduleIndex)
  );

  const completedCount = completedModuleIndices.size;
  const totalCount = modules.length;
  const progressPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <main className="page-wrapper">
      <div style={{ maxWidth: 720, paddingTop: 'var(--space-8)' }}>
        <div style={{ marginBottom: 'var(--space-6)' }}>
          <Link href="/learn" style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textDecoration: 'none' }}>
            ← Learning Coach
          </Link>
        </div>

        <div style={{ marginBottom: 'var(--space-6)' }}>
          <p style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--accent-muted)', marginBottom: 'var(--space-2)' }}>
            {curriculum.domain}
          </p>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 'var(--space-2)' }}>
            {curriculum.title}
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: 'var(--space-5)' }}>
            {curriculum.goalStatement}
          </p>

          {/* Progress bar */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 'var(--space-2)' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                {completedCount === 0
                  ? 'Not started'
                  : completedCount === totalCount
                    ? 'Complete'
                    : `${completedCount} of ${totalCount} modules complete`}
              </span>
              {completedCount > 0 && (
                <span style={{ fontSize: '0.75rem', color: 'var(--accent-muted)', fontWeight: 600 }}>
                  {progressPct}%
                </span>
              )}
            </div>
            <div style={{
              height: 3,
              background: 'rgba(255,255,255,0.06)',
              borderRadius: 99,
              overflow: 'hidden',
            }}>
              <div style={{
                height: '100%',
                width: `${progressPct}%`,
                background: completedCount === totalCount ? 'var(--success)' : 'var(--accent)',
                borderRadius: 99,
                transition: 'width 0.4s ease',
              }} />
            </div>
          </div>
        </div>

        {/* Module map */}
        <div>
          {modules.map((mod, index) => (
            <ModuleCard
              key={mod.id}
              index={index}
              curriculumId={curriculum.id}
              title={mod.title}
              description={mod.description}
              estimatedMinutes={mod.estimatedMinutes}
              learningObjectives={mod.learningObjectives}
              done={completedModuleIndices.has(index)}
              isLast={index === modules.length - 1}
            />
          ))}
        </div>
      </div>
    </main>
  );
}
