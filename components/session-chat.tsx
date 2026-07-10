'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import Link from 'next/link';
import { startSessionIntro, sendMessage, endSession, saveFuzzy } from '@/app/actions';
import { renderMarkdown } from '@/lib/markdown';
import type { ChatMessage } from '@/lib/types';

type Phase = 'intro-pending' | 'intro-failed' | 'chatting' | 'ended';

export function SessionChat(props: {
  sessionId: number;
  curriculumId: number;
  initialMessages: ChatMessage[];
  alreadyCompleted: boolean;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>(props.initialMessages);
  const [phase, setPhase] = useState<Phase>(
    props.alreadyCompleted ? 'ended' : props.initialMessages.length === 0 ? 'intro-pending' : 'chatting'
  );
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [waiting, setWaiting] = useState(false);
  const [fuzzy, setFuzzy] = useState('');
  const [fuzzySaved, setFuzzySaved] = useState(false);
  const [, startTransition] = useTransition();
  const bottomRef = useRef<HTMLDivElement>(null);
  const introFired = useRef(false);

  function runIntro() {
    setPhase('intro-pending');
    setError(null);
    startTransition(async () => {
      const result = await startSessionIntro(props.sessionId);
      if (result.error) {
        setError(result.error);
        setPhase('intro-failed');
      } else {
        if (result.intro) setMessages([{ role: 'assistant', content: result.intro }]);
        setPhase('chatting');
      }
    });
  }

  useEffect(() => {
    if (phase === 'intro-pending' && !introFired.current) {
      introFired.current = true;
      runIntro();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, waiting]);

  function handleSend() {
    const text = draft.trim();
    if (!text || waiting || phase !== 'chatting') return;
    setDraft('');
    setError(null);
    setMessages((prev) => [...prev, { role: 'user', content: text }]);
    setWaiting(true);
    startTransition(async () => {
      const result = await sendMessage(props.sessionId, text);
      setWaiting(false);
      if (result.error) {
        setError(result.error);
      } else if (result.reply) {
        setMessages((prev) => [...prev, { role: 'assistant', content: result.reply! }]);
      }
    });
  }

  function handleEnd() {
    startTransition(async () => {
      const result = await endSession(props.sessionId);
      if (result.error) setError(result.error);
      else setPhase('ended');
    });
  }

  return (
    <div className="mt-4">
      <div className="space-y-4">
        {messages.map((message, index) =>
          message.role === 'assistant' ? (
            <div key={index} className="text-[15px]">{renderMarkdown(message.content)}</div>
          ) : (
            <div key={index} className="ml-8 rounded-xl bg-accent-soft px-4 py-2.5 text-[15px]">
              {message.content}
            </div>
          )
        )}

        {phase === 'intro-pending' && <p className="text-sm text-muted">Your tutor is preparing the session…</p>}
        {waiting && <p className="text-sm text-muted">Thinking…</p>}
        {error && (
          <p className="text-sm text-danger">
            {error}{' '}
            {phase === 'intro-failed' && (
              <button onClick={runIntro} className="text-accent hover:underline">retry</button>
            )}
          </p>
        )}
      </div>

      {phase === 'chatting' && (
        <div className="sticky bottom-0 mt-6 border-t border-line bg-bg pb-4 pt-3">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            rows={2}
            maxLength={4000}
            placeholder="Reply… (Enter to send)"
            className="w-full rounded-lg border border-line px-4 py-2.5 text-[15px]"
          />
          <div className="mt-2 flex items-center justify-between">
            <button
              onClick={handleEnd}
              className="text-sm text-muted hover:text-ink hover:underline"
            >
              End session — one tap, nothing required
            </button>
            <button
              onClick={handleSend}
              disabled={waiting || !draft.trim()}
              className="rounded-full bg-accent px-4 py-1.5 text-sm font-semibold text-bg disabled:opacity-50"
            >
              Send
            </button>
          </div>
        </div>
      )}

      {phase === 'ended' && (
        <div className="mt-6 rounded-xl border border-line p-4">
          <p className="text-sm font-semibold">Session closed.</p>
          {!fuzzySaved ? (
            <>
              <p className="mt-1 text-sm text-muted">
                Anything still fuzzy? One line, optional — your tutor reads it next time.
              </p>
              <div className="mt-2 flex gap-2">
                <input
                  value={fuzzy}
                  onChange={(e) => setFuzzy(e.target.value)}
                  maxLength={400}
                  placeholder="Still fuzzy…"
                  className="flex-1 rounded-lg border border-line px-3 py-2 text-sm"
                />
                <button
                  onClick={() =>
                    startTransition(async () => {
                      await saveFuzzy(props.sessionId, fuzzy);
                      setFuzzySaved(true);
                    })
                  }
                  disabled={!fuzzy.trim()}
                  className="rounded-full bg-accent px-4 py-1.5 text-sm font-semibold text-bg disabled:opacity-50"
                >
                  Keep
                </button>
              </div>
            </>
          ) : (
            <p className="mt-1 text-sm text-muted">Noted — your tutor will pick it up next session.</p>
          )}
          <Link href="/" className="mt-3 inline-block text-sm text-accent no-underline hover:underline">
            ← back to today
          </Link>
        </div>
      )}
    </div>
  );
}
