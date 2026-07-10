import { Suspense } from 'react';
import Link from 'next/link';
import { dayKey, dateHeading, briefingWindow, previousMonthKey, monthName } from '@/lib/dates';
import {
  getSettings, getTasksForDay, getCarryover, getReflection, getDueReview,
  getLatestOpenSession, getCurricula, getCurriculum, getLetter, getReflectionsForMonth,
} from '@/lib/data';
import { getOrBuildBriefing } from '@/lib/briefing';
import { TodayTasks } from '@/components/today-tasks';
import { BriefingList } from '@/components/briefing-list';
import { ReviewLine } from '@/components/review-line';
import { Tonight } from '@/components/tonight';
import { LetterCard } from '@/components/letter-card';

export const dynamic = 'force-dynamic';

export default async function TodayPage() {
  const settings = await getSettings();
  const tz = settings.timezone;
  const today = dayKey(tz);

  const [tasks, carryover, reflection, dueReview, openSession, curricula] = await Promise.all([
    getTasksForDay(today),
    getCarryover(today),
    getReflection(today),
    getDueReview(today),
    getLatestOpenSession(),
    getCurricula(),
  ]);

  const openCurriculum = openSession ? await getCurriculum(openSession.curriculum_id) : null;
  const continueTarget = openSession && openCurriculum
    ? {
        href: `/learn/${openCurriculum.id}/session?m=${openSession.module_index}`,
        module: openCurriculum.modules[openSession.module_index]?.title ?? 'Session',
        curriculum: openCurriculum.title,
      }
    : null;

  // The monthly letter surfaces during the first days of a new month.
  const prevMonth = previousMonthKey(tz);
  const inLetterWindow = Number(today.slice(8, 10)) <= 10;
  let letter: { month: string; text: string | null; canGenerate: boolean } | null = null;
  if (inLetterWindow) {
    const existing = await getLetter(prevMonth);
    if (existing) {
      letter = { month: prevMonth, text: existing, canGenerate: false };
    } else {
      const count = (await getReflectionsForMonth(prevMonth)).length;
      if (count >= 3) letter = { month: prevMonth, text: null, canGenerate: true };
    }
  }

  return (
    <main>
      <p className="mt-6 text-[11px] uppercase tracking-[0.14em] text-muted">{dateHeading(tz)}</p>

      {/* ── Today ── */}
      <section className="mt-6">
        <h2 className="label">Today — 3 max</h2>
        <TodayTasks tasks={tasks} carryover={carryover} />
      </section>

      {dueReview && dueReview.curriculum && (
        <ReviewLine
          curriculumId={dueReview.curriculum_id}
          moduleIndex={dueReview.module_index}
          moduleTitle={dueReview.curriculum.modules[dueReview.module_index]?.title ?? 'Module'}
          curriculumTitle={dueReview.curriculum.title}
        />
      )}

      {/* ── Briefing ── */}
      <section className="mt-10">
        <Suspense
          fallback={
            <div>
              <h2 className="label">Briefing</h2>
              <p className="mt-3 text-sm text-muted">Gathering today&rsquo;s items…</p>
            </div>
          }
        >
          <BriefingSection tz={tz} />
        </Suspense>
      </section>

      {/* ── Learn ── */}
      <section className="mt-10">
        <h2 className="label">Learn</h2>
        {continueTarget ? (
          <div className="mt-3 rounded-xl bg-accent-soft p-4">
            <p className="font-semibold">{continueTarget.curriculum}</p>
            <p className="mt-0.5 text-sm text-muted">{continueTarget.module} · your tutor remembers where you left off</p>
            <Link
              href={continueTarget.href}
              className="mt-3 inline-block rounded-full bg-accent px-4 py-1.5 text-sm font-semibold text-bg no-underline"
            >
              Continue →
            </Link>
          </div>
        ) : curricula.length > 0 ? (
          <div className="mt-3 space-y-2">
            {curricula.slice(0, 3).map((c) => (
              <Link
                key={c.id}
                href={`/learn/${c.id}`}
                className="block rounded-xl border border-line p-4 no-underline hover:border-accent"
              >
                <p className="font-semibold text-ink">{c.title}</p>
                <p className="mt-0.5 text-sm text-muted">{c.modules.length} modules</p>
              </Link>
            ))}
          </div>
        ) : (
          <p className="mt-3 text-sm text-muted">Nothing yet. Start with a goal.</p>
        )}
        <Link href="/learn/new" className="mt-3 inline-block text-sm text-accent">
          + new curriculum
        </Link>
      </section>

      {/* ── Tonight ── */}
      <section className="mt-10">
        <h2 className="label">Tonight — optional, always</h2>
        <Tonight existing={reflection?.text ?? null} />
      </section>

      {letter && <LetterCard monthLabel={monthName(letter.month)} text={letter.text} />}
    </main>
  );
}

async function BriefingSection({ tz }: { tz: string }) {
  const window = briefingWindow(tz);
  let items: Awaited<ReturnType<typeof getOrBuildBriefing>> = [];
  let failed = false;
  try {
    items = await getOrBuildBriefing(window.key);
  } catch {
    failed = true;
  }

  return (
    <div>
      <h2 className="label">
        Briefing
        {items.length > 0 && (
          <span className="ml-2 font-normal normal-case tracking-normal text-muted">
            {items.length} items · updates 8am &amp; 6pm
          </span>
        )}
      </h2>
      {failed ? (
        <p className="mt-3 text-sm text-muted">The briefing couldn&rsquo;t load — it&rsquo;ll try again next visit.</p>
      ) : items.length === 0 ? (
        <p className="mt-3 text-sm text-muted">Quiet out there. Nothing new from your sources.</p>
      ) : (
        <BriefingList items={items} />
      )}
      {!failed && (
        <p className="mt-4 text-center text-sm italic text-faint">
          That&rsquo;s all. Next briefing at {window.nextLabel}.
        </p>
      )}
    </div>
  );
}
