import { CurriculumBuilderForm } from '@/components/curriculum-builder-form';

export default function NewCurriculumPage() {
  return (
    <main className="page-wrapper">
      <div style={{ maxWidth: 560, paddingTop: 'var(--space-8)' }}>
        <h1 style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 'var(--space-2)' }}>
          New Curriculum
        </h1>
        <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-8)', fontSize: '0.9rem' }}>
          Describe what you want to learn. The AI builds a structured path.
        </p>
        <CurriculumBuilderForm />
      </div>
    </main>
  );
}
