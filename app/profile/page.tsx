import { getUserProfile } from '@/lib/db';
import { ProfileForm } from '@/components/profile-form';

export const dynamic = 'force-dynamic';

export default function ProfilePage() {
  const profile = getUserProfile();
  const domains: string[] = (() => {
    try { return JSON.parse(profile?.domains_json ?? '[]'); } catch { return []; }
  })();

  return (
    <main className="page-wrapper">
      <div style={{ maxWidth: 560, paddingTop: 'var(--space-8)' }}>
        <h1 style={{ fontSize: '1.8rem', fontWeight: 700, marginBottom: 'var(--space-2)', color: 'var(--text-primary)' }}>
          Profile
        </h1>
        <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-8)', fontSize: '0.9rem' }}>
          This context is injected into AI prompts. Keep it current.
        </p>

        <ProfileForm profile={profile} currentDomains={domains} />
      </div>
    </main>
  );
}
