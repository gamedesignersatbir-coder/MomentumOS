'use client';

import { useState, useTransition, useRef, useEffect } from 'react';
import { sendMessageAction, savePostSessionAction, startSessionWithIntroAction } from '@/app/learn/actions';
import type { ChatMessage } from '@/lib/curriculum-types';
import { Send } from 'lucide-react';

function MarkdownContent({ text }: { text: string }) {
  const lines = text.split('\n');
  return (
    <div style={{ lineHeight: 1.6 }}>
      {lines.map((line, i) => {
        // Render inline markdown: **bold**, *italic*, `code`
        const renderInline = (s: string) => {
          const parts: React.ReactNode[] = [];
          const re = /(\*\*(.+?)\*\*|\*(.+?)\*|`(.+?)`)/g;
          let last = 0, m: RegExpExecArray | null;
          while ((m = re.exec(s)) !== null) {
            if (m.index > last) parts.push(s.slice(last, m.index));
            if (m[2]) parts.push(<strong key={m.index}>{m[2]}</strong>);
            else if (m[3]) parts.push(<em key={m.index}>{m[3]}</em>);
            else if (m[4]) parts.push(<code key={m.index} style={{ background: 'rgba(255,255,255,0.08)', borderRadius: 3, padding: '1px 5px', fontSize: '0.85em', fontFamily: 'monospace' }}>{m[4]}</code>);
            last = m.index + m[0].length;
          }
          if (last < s.length) parts.push(s.slice(last));
          return parts;
        };

        if (line.startsWith('### ')) return <h3 key={i} style={{ fontWeight: 700, marginTop: '0.75em', marginBottom: '0.25em', fontSize: '1em' }}>{line.slice(4)}</h3>;
        if (line.startsWith('## ')) return <h2 key={i} style={{ fontWeight: 700, marginTop: '0.75em', marginBottom: '0.25em', fontSize: '1.05em' }}>{line.slice(3)}</h2>;
        if (line.startsWith('# ')) return <h1 key={i} style={{ fontWeight: 700, marginTop: '0.75em', marginBottom: '0.25em', fontSize: '1.1em' }}>{line.slice(2)}</h1>;
        if (/^(\d+)\. /.test(line)) return <div key={i} style={{ marginLeft: '1.2em' }}>{renderInline(line)}</div>;
        if (line.startsWith('- ') || line.startsWith('* ')) return <div key={i} style={{ marginLeft: '1.2em' }}>• {renderInline(line.slice(2))}</div>;
        if (line.trim() === '') return <div key={i} style={{ height: '0.6em' }} />;
        return <div key={i}>{renderInline(line)}</div>;
      })}
    </div>
  );
}

interface Props {
  curriculumId: number;
  moduleIndex: number;
  priorFuzzy: string | null;
  initialSessionId: number | null; // null = no active session yet
  initialHistory: ChatMessage[];
}

export function SessionChat({ curriculumId, moduleIndex, priorFuzzy, initialSessionId, initialHistory }: Props) {
  const [sessionId, setSessionId] = useState<number | null>(initialSessionId);
  const [messages, setMessages] = useState<ChatMessage[]>(initialHistory);
  const [inputValue, setInputValue] = useState('');
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [showPostLoop, setShowPostLoop] = useState(false);
  const [postDone, setPostDone] = useState(false);
  const [postError, setPostError] = useState<string | null>(null);
  const [postPending, startPostTransition] = useTransition();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Auto-fire opening message when session has no history yet
  useEffect(() => {
    if (initialHistory.length > 0 || initialSessionId !== null) return;
    startTransition(async () => {
      const result = await startSessionWithIntroAction(curriculumId, moduleIndex);
      if (!result.ok) { setError(result.message); return; }
      setSessionId(result.sessionId);
      setMessages([{ role: 'assistant', content: result.intro, createdAt: new Date().toISOString() }]);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleSend() {
    const content = inputValue.trim();
    if (!content || isPending) return;
    setInputValue('');
    setError(null);

    startTransition(async () => {
      if (sessionId === null) return; // session is created by intro action
      const result = await sendMessageAction(sessionId, curriculumId, moduleIndex, content);
      if (!result.ok) { setError(result.message); return; }

      const now = new Date().toISOString();
      setMessages((prev) => [
        ...prev,
        { role: 'user', content, createdAt: now },
        { role: 'assistant', content: result.reply, createdAt: new Date().toISOString() },
      ]);
    });
  }

  function handlePostSubmit(formData: FormData) {
    if (sessionId === null) return;
    formData.set('sessionId', String(sessionId));
    formData.set('curriculumId', String(curriculumId));
    setPostError(null);
    startPostTransition(async () => {
      const result = await savePostSessionAction(formData);
      if (!result.ok) { setPostError(result.message); return; }
      setPostDone(true);
    });
  }

  if (postDone) {
    return (
      <div style={{ textAlign: 'center', padding: 'var(--space-12)', color: 'var(--text-secondary)' }}>
        <p style={{ fontSize: '1.1rem', marginBottom: 'var(--space-4)' }}>Session saved. Review scheduled.</p>
        <a href={`/learn/${curriculumId}`} className="btn-ghost" style={{ textDecoration: 'none', display: 'inline-block' }}>
          Back to curriculum
        </a>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 120px)', maxWidth: 720, margin: '0 auto' }}>
      {/* Pre-session context */}
      {priorFuzzy && messages.length === 0 && (
        <div style={{
          background: 'var(--accent-subtle)', border: '1px solid rgba(232,169,69,0.15)',
          borderRadius: 'var(--radius-sm)', padding: 'var(--space-4)',
          fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: 'var(--space-4)',
        }}>
          <strong style={{ color: 'var(--accent-muted)' }}>Last session: </strong>
          {priorFuzzy}
        </div>
      )}

      {/* Message list */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', paddingBottom: 'var(--space-4)' }}>
        {messages.length === 0 && (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', textAlign: 'center', paddingTop: 'var(--space-8)' }}>
            Ask your first question to start the session.
          </p>
        )}
        {messages.map((msg, i) => (
          <div
            key={i}
            style={{
              alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
              maxWidth: '80%',
              background: msg.role === 'user' ? 'var(--accent-subtle)' : 'var(--bg-elevated)',
              border: `1px solid ${msg.role === 'user' ? 'rgba(232,169,69,0.2)' : 'var(--border)'}`,
              borderRadius: 'var(--radius-md)',
              padding: 'var(--space-3) var(--space-4)',
              fontSize: '0.9rem',
              lineHeight: 1.6,
              color: 'var(--text-primary)',
            }}
          >
            {msg.role === 'assistant' ? <MarkdownContent text={msg.content} /> : msg.content}
          </div>
        ))}
        {isPending && (
          <div style={{
            alignSelf: 'flex-start',
            background: 'var(--bg-elevated)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)', padding: 'var(--space-3) var(--space-4)',
            color: 'var(--text-muted)', fontSize: '0.875rem',
          }}>
            Thinking…
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Error */}
      {error && (
        <p style={{ fontSize: '0.875rem', color: 'var(--error)', marginBottom: 'var(--space-3)' }}>{error}</p>
      )}

      {/* Input */}
      {!showPostLoop && (
        <div style={{ display: 'flex', gap: 'var(--space-2)', borderTop: '1px solid var(--border)', paddingTop: 'var(--space-4)' }}>
          <textarea
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
            }}
            placeholder="Ask a question… (Enter to send, Shift+Enter for new line)"
            className="textarea"
            style={{ flex: 1, minHeight: 48, maxHeight: 120, resize: 'none' }}
            disabled={isPending}
          />
          <button
            type="button"
            onClick={handleSend}
            disabled={isPending || !inputValue.trim()}
            className="btn-primary"
            aria-label="Send"
          >
            <Send size={16} />
          </button>
        </div>
      )}

      {/* "I'm done learning" → post-session form */}
      {!showPostLoop && messages.length > 0 && (
        <button
          type="button"
          className="btn-ghost"
          style={{ marginTop: 'var(--space-3)', fontSize: '0.85rem' }}
          onClick={() => setShowPostLoop(true)}
        >
          I&apos;m done for this session →
        </button>
      )}

      {/* Post-session loop */}
      {showPostLoop && (
        <form
          action={handlePostSubmit}
          style={{ borderTop: '1px solid var(--border)', paddingTop: 'var(--space-6)', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}
        >
          <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>Session wrap-up</h3>
          <div>
            <label className="soft-close-label">What landed?</label>
            <textarea name="whatLanded" className="textarea" rows={2} placeholder="The main insight or technique that clicked." required />
          </div>
          <div>
            <label className="soft-close-label">What&apos;s still fuzzy?</label>
            <textarea name="whatsFuzzy" className="textarea" rows={2} placeholder="What still feels unclear or needs more time." />
          </div>
          <div>
            <label className="soft-close-label">Confidence (1–5)</label>
            <select name="confidence" className="input" defaultValue="3">
              {[1, 2, 3, 4, 5].map((v) => (
                <option key={v} value={v}>{v} — {['', 'Very shaky', 'Shaky', 'Getting there', 'Solid', 'Confident'][v]}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="soft-close-label">Next action</label>
            <input name="nextAction" className="input" placeholder="The one thing to try or read next." required />
          </div>
          {postError && (
            <p style={{ fontSize: '0.875rem', color: 'var(--error)' }}>{postError}</p>
          )}
          <button type="submit" className="btn-primary" disabled={postPending}>
            {postPending ? 'Saving…' : 'Save session'}
          </button>
        </form>
      )}
    </div>
  );
}
