'use client';

import { useEffect, useState } from 'react';
import type { GreetingMessage } from '@/lib/greetings-library';

interface Props {
  initialGreeting: GreetingMessage;
  onShown: (id: string) => Promise<void>;
}

export function GreetingBar({ initialGreeting, onShown }: Props) {
  const [greeting] = useState(initialGreeting);

  useEffect(() => {
    // Record that this greeting was shown.
    // onShown is a Server Action reference — stable across renders.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    onShown(greeting.id).catch(console.error);
  }, [greeting.id]); // onShown intentionally omitted — Server Actions are stable

  return (
    <div className="greeting-bar">
      <p className="greeting-text">{greeting.text}</p>
    </div>
  );
}
