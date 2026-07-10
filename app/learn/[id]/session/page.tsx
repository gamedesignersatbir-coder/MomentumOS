import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getCurriculum, getOpenSession, createSession, getSession } from '@/lib/data';
import { SessionChat } from '@/components/session-chat';

export const dynamic = 'force-dynamic';

export default async function SessionPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ m?: string }>;
}) {
  const { id } = await params;
  const { m } = await searchParams;
  const curriculumId = Number(id);
  const moduleIndex = Number(m ?? 0);
  if (!Number.isInteger(curriculumId) || !Number.isInteger(moduleIndex)) notFound();

  const curriculum = await getCurriculum(curriculumId);
  if (!curriculum || !curriculum.modules[moduleIndex]) notFound();
  const module = curriculum.modules[moduleIndex];

  // Resume the open session for this module, or start a fresh one.
  let session = await getOpenSession(curriculumId, moduleIndex);
  if (!session) {
    const sessionId = await createSession(curriculumId, moduleIndex);
    session = await getSession(sessionId);
    if (!session) notFound();
  }

  return (
    <main className="mt-6">
      <div className="flex items-baseline justify-between gap-3">
        <div>
          <p className="text-xs text-muted">
            <Link href={`/learn/${curriculumId}`} className="text-muted no-underline hover:text-ink">
              {curriculum.title}
            </Link>
            {' · '}module {moduleIndex + 1} of {curriculum.modules.length}
          </p>
          <h1 className="serif mt-0.5 text-xl font-semibold">{module.title}</h1>
        </div>
      </div>
      <SessionChat
        sessionId={session.id}
        curriculumId={curriculumId}
        initialMessages={session.messages}
        alreadyCompleted={Boolean(session.completed_at)}
      />
    </main>
  );
}
