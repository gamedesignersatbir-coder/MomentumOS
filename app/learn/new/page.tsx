import { NewCurriculumForm } from '@/components/new-curriculum-form';

export default async function NewCurriculumPage({
  searchParams,
}: {
  searchParams: Promise<{ goal?: string }>;
}) {
  const { goal } = await searchParams;

  return (
    <main className="mt-8">
      <h1 className="serif text-2xl font-semibold">New curriculum</h1>
      <p className="mt-1 text-sm text-muted">
        One goal in, 5–7 modules out. Your tutor takes it from there.
      </p>
      <NewCurriculumForm initialGoal={goal ?? ''} />
    </main>
  );
}
