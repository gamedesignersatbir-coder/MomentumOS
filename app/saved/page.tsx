import Link from 'next/link';
import { getSavedItems } from '@/lib/data';
import { SavedList } from '@/components/saved-list';

export const dynamic = 'force-dynamic';

export default async function SavedPage() {
  const items = await getSavedItems();

  return (
    <main className="mt-8">
      <h1 className="serif text-2xl font-semibold">Saved</h1>
      <p className="mt-1 text-sm text-muted">Things you kept from the briefing.</p>
      {items.length === 0 ? (
        <p className="mt-6 text-sm text-muted">Nothing saved yet.</p>
      ) : (
        <SavedList items={items} />
      )}
      <Link href="/" className="mt-8 inline-block text-sm text-muted no-underline hover:text-ink">
        ← today
      </Link>
    </main>
  );
}
