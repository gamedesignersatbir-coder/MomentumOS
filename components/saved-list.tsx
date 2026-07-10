'use client';

import { useTransition } from 'react';
import { removeSaved } from '@/app/actions';
import type { SavedItem } from '@/lib/types';

export function SavedList({ items }: { items: SavedItem[] }) {
  const [, startTransition] = useTransition();

  return (
    <ul className="mt-4">
      {items.map((item) => (
        <li key={item.id} className="flex items-baseline gap-3 border-b border-line py-3 last:border-0">
          <div className="flex-1">
            {item.source && <p className="text-xs text-muted">{item.source}</p>}
            <a href={item.url} target="_blank" rel="noreferrer" className="text-ink no-underline hover:text-accent">
              {item.title}
            </a>
          </div>
          <button
            onClick={() => startTransition(() => removeSaved(item.id))}
            className="text-xs text-faint hover:text-danger hover:underline"
          >
            remove
          </button>
        </li>
      ))}
    </ul>
  );
}
