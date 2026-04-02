// components/quick-capture.tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import { quickCaptureAction } from '@/app/actions';

export function QuickCapture() {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      // 'c' key opens capture (not when typing in another input)
      if (
        e.key === 'c' &&
        !e.metaKey &&
        !e.ctrlKey &&
        document.activeElement?.tagName !== 'INPUT' &&
        document.activeElement?.tagName !== 'TEXTAREA' &&
        document.activeElement?.tagName !== 'SELECT'
      ) {
        e.preventDefault();
        setOpen(true);
      }
      if (e.key === 'Escape') setOpen(false);
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!value.trim()) return;
    await quickCaptureAction(value.trim());
    setValue('');
    setOpen(false);
  }

  if (!open) return null;

  return (
    <div className="quick-capture-overlay" onClick={() => setOpen(false)}>
      <form
        className="quick-capture-form"
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
      >
        <label className="quick-capture-label">Capture a thought</label>
        <input
          ref={inputRef}
          className="quick-capture-input"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="What's on your mind?"
        />
        <div className="quick-capture-hint">Enter to save · Esc to cancel</div>
      </form>
    </div>
  );
}
