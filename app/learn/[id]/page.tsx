import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getCurriculum, getSessionsForCurriculum } from '@/lib/data';
import { ArchiveCurriculumButton } from '@/components/archive-curriculum-button';

export const dynamic = 'force-dynamic';

export default async function CurriculumPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const curriculumId = Number(id);
  if (!Number.isInteger(curriculumId)) notFound();

  const curriculum = await getCurriculum(curriculumId);
  if (!curriculum) notFound();

  const sessions = await getSessionsForCurriculum(curriculumId);
  const completedModules = new Set(
    sessions.filter((s) => s.completed_at).map((s) => s.module_index)
  );
  const openModules = new Set(
    sessions.filter((s) => !s.completed_at).map((s) => s.module_index)
  );

  return (
    <main className="mt-8">
      <h1 className="serif text-2xl font-semibold">{curriculum.title}</h1>
      <p className="mt-1 text-sm text-muted">{curriculum.goal}</p>

      <ol className="mt-6 space-y-2">
        {curriculum.modules.map((module, index) => {
          const done = completedModules.has(index);
          const open = openModules.has(index);
          return (
            <li key={module.id ?? index} className="rounded-xl border border-line p-4">
              <div className="flex items-baseline justify-between gap-3">
                <p className={`font-semibold ${done ? 'text-muted' : ''}`}>
                  <span className="mr-2 text-sm text-faint">{index + 1}</span>
                  {module.title}
                  {done && <span className="ml-2 text-xs text-accent">done</span>}
                </p>
                <Link
                  href={`/learn/${curriculum.id}/session?m=${index}`}
                  className="flex-none text-sm text-accent no-underline hover:underline"
                >
                  {open ? 'continue' : done ? 'revisit' : 'start'}
                </Link>
              </div>
              <p className="mt-1 text-sm text-muted">{module.description}</p>
              <p className="mt-1 text-xs text-faint">~{module.estimatedMinutes} min</p>
            </li>
          );
        })}
      </ol>

      <div className="mt-8 flex items-center justify-between">
        <Link href="/" className="text-sm text-muted no-underline hover:text-ink">← today</Link>
        <ArchiveCurriculumButton id={curriculum.id} />
      </div>
    </main>
  );
}
