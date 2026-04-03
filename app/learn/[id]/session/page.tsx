import { notFound } from 'next/navigation';
import { getCurriculumById, getLatestCompletedSession } from '@/lib/db';
import { parseModules } from '@/lib/curriculum-types';
import { SessionChat } from '@/components/session-chat';
import { ObjectivesPanel } from '@/components/objectives-panel';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ module?: string }>;
}

export default async function SessionPage({ params, searchParams }: Props) {
  const { id } = await params;
  const { module: moduleParam } = await searchParams;
  const moduleIndex = parseInt(moduleParam ?? '0', 10);

  const curriculum = getCurriculumById(Number(id));
  if (!curriculum) notFound();

  const modules = parseModules(curriculum.modulesJson);
  const mod = modules[moduleIndex];
  if (!mod) notFound();

  const priorSession = getLatestCompletedSession(curriculum.id, moduleIndex);

  return (
    <main className="page-wrapper" style={{ paddingTop: 'var(--space-6)' }}>
      <div style={{ marginBottom: 'var(--space-4)' }}>
        <a href={`/learn/${curriculum.id}`} style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textDecoration: 'none' }}>
          ← {curriculum.title}
        </a>
      </div>
      <div style={{ marginBottom: 'var(--space-4)' }}>
        <p style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--accent-muted)', marginBottom: 'var(--space-1)' }}>
          Module {moduleIndex + 1}
        </p>
        <h1 style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 'var(--space-1)' }}>
          {mod.title}
        </h1>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{mod.description}</p>
      </div>

      <ObjectivesPanel objectives={mod.learningObjectives} practicalExercise={mod.practicalExercise} />

      <SessionChat
        curriculumId={curriculum.id}
        moduleIndex={moduleIndex}
        priorFuzzy={priorSession?.whatsFuzzy ?? null}
        initialSessionId={null}
        initialHistory={[]}
      />
    </main>
  );
}
