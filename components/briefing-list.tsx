'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { saveBriefingItem, taskFromItem } from '@/app/actions';
import { timeAgo } from '@/lib/dates';
import type { BriefingItem } from '@/lib/types';

export function BriefingList({ items }: { items: BriefingItem[] }) {
  const [done, setDone] = useState<Record<string, string>>({});
  const [, startTransition] = useTransition();

  function mark(url: string, note: string) {
    setDone((prev) => ({ ...prev, [url]: note }));
  }

  return (
    <ul className="mt-2">
      {items.map((item) => (
        <li key={item.url} className="border-b border-line py-3 last:border-0">
          <p className="flex gap-2 text-xs text-muted">
            <span>{item.source}</span>
            <span>·</span>
            <span>{timeAgo(item.publishedAt)}</span>
          </p>
          <a
            href={item.url}
            target="_blank"
            rel="noreferrer"
            className="mt-0.5 block leading-snug text-ink no-underline hover:text-accent"
          >
            {item.title}
          </a>
          <p className="mt-1.5 flex gap-4 text-xs">
            {done[item.url] ? (
              <span className="text-muted">{done[item.url]}</span>
            ) : (
              <>
                <button
                  className="text-accent hover:underline"
                  onClick={() =>
                    startTransition(async () => {
                      await saveBriefingItem(item);
                      mark(item.url, 'saved');
                    })
                  }
                >
                  save
                </button>
                <Link
                  href={`/learn/new?goal=${encodeURIComponent(`Understand deeply and be able to apply: ${item.title} (context: ${item.url})`)}`}
                  className="text-accent no-underline hover:underline"
                >
                  → learn
                </Link>
                <button
                  className="text-accent hover:underline"
                  onClick={() =>
                    startTransition(async () => {
                      const result = await taskFromItem({ title: item.title, url: item.url });
                      mark(item.url, result.landed === 'tomorrow' ? 'task · tomorrow' : 'task · today');
                    })
                  }
                >
                  → task
                </button>
              </>
            )}
          </p>
        </li>
      ))}
    </ul>
  );
}
