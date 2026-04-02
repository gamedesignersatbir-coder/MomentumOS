import Link from 'next/link';
import { Plus } from 'lucide-react';
import { getCurricula, getCurriculumSessionCount, getSRItemsDueCount, getSRItemsDue, getSRItemWithContext } from '@/lib/db';
import { CurriculumCard } from '@/components/curriculum-card';
import { SRReviewCard } from '@/components/sr-review-card';

export const dynamic = 'force-dynamic';

export default function LearnPage() {
  const curricula = getCurricula();
  const srDueCount = getSRItemsDueCount();

  return (
    <main className="page-wrapper">
      <div style={{ paddingTop: 'var(--space-8)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 'var(--space-6)' }}>
          <div>
            <h1 style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 'var(--space-1)' }}>
              Learning Coach
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              Structured paths through topics you care about.
            </p>
          </div>
          <Link href="/learn/new" className="btn-primary" style={{ textDecoration: 'none', display: 'inline-block' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
              <Plus size={14} />
              New curriculum
            </span>
          </Link>
        </div>

        {srDueCount > 0 && (
          <div className="overload-prompt" style={{ marginBottom: 'var(--space-6)' }}>
            <span>
              {srDueCount} {srDueCount === 1 ? 'review' : 'reviews'} due today —
            </span>
            <Link href="#reviews" className="btn-link" style={{ marginLeft: 'var(--space-1)' }}>
              review now
            </Link>
          </div>
        )}

        {curricula.length === 0 ? (
          <div style={{
            textAlign: 'center', padding: 'var(--space-16)',
            border: '1px dashed var(--border)', borderRadius: 'var(--radius-lg)',
            color: 'var(--text-muted)',
          }}>
            <p style={{ fontSize: '1rem', marginBottom: 'var(--space-3)' }}>No curricula yet.</p>
            <Link href="/learn/new" className="btn-ghost">Start your first curriculum</Link>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            {curricula.map((c) => (
              <CurriculumCard
                key={c.id}
                id={c.id}
                title={c.title}
                goalStatement={c.goalStatement}
                domain={c.domain}
                modulesJson={c.modulesJson}
                completedSessions={getCurriculumSessionCount(c.id)}
              />
            ))}
          </div>
        )}

        {srDueCount > 0 && (
          <SRReviewSection id="reviews" />
        )}
      </div>
    </main>
  );
}

function SRReviewSection({ id }: { id: string }) {
  const dueItems = getSRItemsDue();
  const itemsWithContext = dueItems
    .map((item) => getSRItemWithContext(item.id))
    .filter((item): item is NonNullable<typeof item> => item !== null);

  if (itemsWithContext.length === 0) return null;

  return (
    <div id={id} style={{ marginTop: 'var(--space-10)' }}>
      <h2 style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: 'var(--space-4)', color: 'var(--text-primary)' }}>
        Reviews due
      </h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
        {itemsWithContext.map((item) => {
          const modules = (() => {
            try { return JSON.parse(item.modulesJson) as Array<{ title: string }>; } catch { return []; }
          })();
          const moduleTitle = modules[item.moduleIndex]?.title ?? `Module ${item.moduleIndex + 1}`;
          return (
            <SRReviewCard
              key={item.id}
              srItemId={item.id}
              curriculumTitle={item.curriculumTitle}
              moduleTitle={moduleTitle}
              whatsFuzzy={item.whatsFuzzy}
              nextAction={item.nextAction}
            />
          );
        })}
      </div>
    </div>
  );
}
