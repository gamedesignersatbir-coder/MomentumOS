import Link from 'next/link';
import { getSettings, getSources } from '@/lib/data';
import { updateSettings, logout } from '@/app/actions';
import { TIMEZONES } from '@/lib/timezones';
import { SourcesManager } from '@/components/sources-manager';
import { ImportForm } from '@/components/import-form';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const [settings, sources] = await Promise.all([getSettings(), getSources()]);

  return (
    <main className="mt-8">
      <h1 className="serif text-2xl font-semibold">Settings</h1>

      <section className="mt-6">
        <h2 className="label">You</h2>
        <form action={updateSettings} className="mt-3 space-y-3">
          <input
            name="display_name"
            defaultValue={settings.display_name}
            maxLength={60}
            className="w-full rounded-lg border border-line px-4 py-2.5"
            placeholder="Name"
          />
          <select
            name="timezone"
            defaultValue={settings.timezone}
            className="w-full rounded-lg border border-line px-4 py-2.5"
          >
            {TIMEZONES.map((tz) => (
              <option key={tz.value} value={tz.value}>{tz.label}</option>
            ))}
          </select>
          <button className="rounded-full bg-accent px-4 py-1.5 text-sm font-semibold text-bg">Save</button>
        </form>
      </section>

      <section className="mt-10">
        <h2 className="label">Briefing sources</h2>
        <p className="mt-1 text-sm text-muted">
          Small on purpose. Every item in your briefing comes from a name on this list — nothing else, ever.
        </p>
        <SourcesManager sources={sources} />
      </section>

      <section className="mt-10">
        <h2 className="label">Import from MomentumOS</h2>
        <p className="mt-1 text-sm text-muted">
          On the Mac Mini, run <code className="rounded bg-accent-soft px-1.5 py-0.5 text-xs">node scripts/export-momentumos.mjs</code> in
          the old app folder, then upload the <code className="rounded bg-accent-soft px-1.5 py-0.5 text-xs">aaj-export.json</code> it produces.
          Reflections, tutor transcripts, curricula, tasks and bookmarks all come across.
        </p>
        <ImportForm />
      </section>

      <section className="mt-10 flex items-center justify-between border-t border-line pt-6">
        <Link href="/" className="text-sm text-muted no-underline hover:text-ink">← today</Link>
        <form action={logout}>
          <button className="text-sm text-faint hover:text-danger hover:underline">sign out</button>
        </form>
      </section>
    </main>
  );
}
