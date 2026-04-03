'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Clock, ChevronDown, ChevronRight } from 'lucide-react';

interface Props {
  index: number;
  curriculumId: number;
  title: string;
  description: string;
  estimatedMinutes: number;
  learningObjectives: string[];
  done: boolean;
  isLast: boolean;
}

export function ModuleCard({ index, curriculumId, title, description, estimatedMinutes, learningObjectives, done, isLast }: Props) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div style={{ display: 'flex', gap: 0 }}>
      {/* Left: step track */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginRight: 'var(--space-4)', flexShrink: 0 }}>
        {/* Step badge */}
        <div style={{
          width: 32,
          height: 32,
          borderRadius: '50%',
          border: `2px solid ${done ? 'var(--accent)' : 'rgba(255,255,255,0.12)'}`,
          background: done ? 'rgba(232,169,69,0.12)' : 'var(--bg-elevated)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          transition: 'border-color 0.2s, background 0.2s',
        }}>
          {done ? (
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M2.5 7L5.5 10L11.5 4" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          ) : (
            <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '-0.02em' }}>
              {index + 1}
            </span>
          )}
        </div>
        {/* Connector line */}
        {!isLast && (
          <div style={{
            width: 1,
            flex: 1,
            minHeight: 20,
            background: done ? 'rgba(232,169,69,0.25)' : 'rgba(255,255,255,0.06)',
            marginTop: 4,
            marginBottom: 4,
            transition: 'background 0.2s',
          }} />
        )}
      </div>

      {/* Right: card content */}
      <div style={{
        flex: 1,
        background: 'var(--bg-surface)',
        border: `1px solid ${done ? 'rgba(232,169,69,0.2)' : 'rgba(255,255,255,0.07)'}`,
        borderRadius: 'var(--radius-md)',
        padding: 'var(--space-4) var(--space-5)',
        marginBottom: isLast ? 0 : 'var(--space-3)',
        transition: 'border-color 0.2s',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 'var(--space-3)' }}>
          <div style={{ flex: 1 }}>
            <p style={{
              fontWeight: 600,
              fontSize: '0.95rem',
              color: done ? 'var(--text-primary)' : 'var(--text-primary)',
              marginBottom: 'var(--space-1)',
              lineHeight: 1.3,
            }}>
              {title}
            </p>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: 'var(--space-3)' }}>
              {description}
            </p>
            <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                <Clock size={11} /> {estimatedMinutes} min
              </span>
              {learningObjectives.length > 0 && (
                <button
                  onClick={() => setExpanded(!expanded)}
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    cursor: 'pointer',
                    fontSize: '0.75rem',
                    color: 'var(--text-muted)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 3,
                    transition: 'color 0.15s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-secondary)')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
                >
                  {expanded ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
                  {learningObjectives.length} objectives
                </button>
              )}
            </div>

            {expanded && learningObjectives.length > 0 && (
              <div style={{
                marginTop: 'var(--space-3)',
                paddingTop: 'var(--space-3)',
                borderTop: '1px solid rgba(255,255,255,0.05)',
              }}>
                <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                  {learningObjectives.map((obj, i) => (
                    <li key={i} style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'flex-start' }}>
                      <span style={{ color: 'var(--accent-muted)', fontSize: '0.7rem', marginTop: 3, flexShrink: 0 }}>◆</span>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>{obj}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <Link
            href={`/learn/${curriculumId}/session?module=${index}`}
            className="btn-small btn-ghost"
            style={{ textDecoration: 'none', flexShrink: 0, whiteSpace: 'nowrap' }}
          >
            {done ? 'Review again' : 'Start session'}
          </Link>
        </div>
      </div>
    </div>
  );
}
