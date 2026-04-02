// components/quiet-mode.tsx
import type { GreetingMessage } from '@/lib/greetings-library';

interface Props {
  greeting: GreetingMessage;
}

export function QuietMode({ greeting }: Props) {
  return (
    <div className="quiet-mode-overlay">
      <div className="quiet-mode-content">
        <div className="quiet-mode-icon" aria-hidden="true">◦</div>
        <p className="quiet-mode-text">{greeting.text}</p>
      </div>
    </div>
  );
}
