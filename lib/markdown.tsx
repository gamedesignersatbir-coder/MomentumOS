import type { ReactNode } from 'react';

/**
 * Tiny markdown renderer for tutor replies: paragraphs, **bold**, *italics*,
 * `code`, ``` blocks, headings, and lists. Everything is rendered through
 * React nodes — no innerHTML, nothing to sanitize.
 */

function inline(text: string, keyBase: string): ReactNode[] {
  const parts: ReactNode[] = [];
  const pattern = /(\*\*[^*]+\*\*|\*[^*\n]+\*|`[^`\n]+`)/g;
  let last = 0;
  let match: RegExpExecArray | null;
  let i = 0;
  while ((match = pattern.exec(text)) !== null) {
    if (match.index > last) parts.push(text.slice(last, match.index));
    const token = match[0];
    const key = `${keyBase}-${i++}`;
    if (token.startsWith('**')) parts.push(<strong key={key}>{token.slice(2, -2)}</strong>);
    else if (token.startsWith('`')) parts.push(<code key={key}>{token.slice(1, -1)}</code>);
    else parts.push(<em key={key}>{token.slice(1, -1)}</em>);
    last = match.index + token.length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

export function renderMarkdown(text: string): ReactNode {
  const blocks: ReactNode[] = [];
  const segments = text.split(/```/);

  segments.forEach((segment, segmentIndex) => {
    if (segmentIndex % 2 === 1) {
      // Code block — first line may be a language tag.
      const lines = segment.replace(/^\n/, '').split('\n');
      const first = lines[0]?.trim() ?? '';
      const code = /^[a-z0-9+-]*$/i.test(first) && lines.length > 1 ? lines.slice(1).join('\n') : segment;
      blocks.push(
        <pre key={`code-${segmentIndex}`}>
          <code>{code.replace(/\n$/, '')}</code>
        </pre>
      );
      return;
    }

    const lines = segment.split('\n');
    let list: ReactNode[] = [];
    let ordered = false;
    let paragraph: string[] = [];

    const flushList = (key: string) => {
      if (list.length === 0) return;
      blocks.push(ordered ? <ol key={key}>{list}</ol> : <ul key={key}>{list}</ul>);
      list = [];
    };
    const flushParagraph = (key: string) => {
      if (paragraph.length === 0) return;
      blocks.push(<p key={key}>{inline(paragraph.join(' '), key)}</p>);
      paragraph = [];
    };

    lines.forEach((line, lineIndex) => {
      const key = `${segmentIndex}-${lineIndex}`;
      const trimmed = line.trim();
      const bullet = /^[-•*]\s+(.*)/.exec(trimmed);
      const numbered = /^\d+[.)]\s+(.*)/.exec(trimmed);
      const heading = /^#{1,4}\s+(.*)/.exec(trimmed);

      if (!trimmed) {
        flushParagraph(`p-${key}`);
        flushList(`l-${key}`);
      } else if (heading) {
        flushParagraph(`p-${key}`);
        flushList(`l-${key}`);
        blocks.push(<h3 key={`h-${key}`}>{inline(heading[1], key)}</h3>);
      } else if (bullet) {
        flushParagraph(`p-${key}`);
        if (list.length > 0 && ordered) flushList(`l-${key}`);
        ordered = false;
        list.push(<li key={`li-${key}`}>{inline(bullet[1], key)}</li>);
      } else if (numbered) {
        flushParagraph(`p-${key}`);
        if (list.length > 0 && !ordered) flushList(`l-${key}`);
        ordered = true;
        list.push(<li key={`li-${key}`}>{inline(numbered[1], key)}</li>);
      } else {
        flushList(`l-${key}`);
        paragraph.push(trimmed);
      }
    });
    flushParagraph(`p-${segmentIndex}-end`);
    flushList(`l-${segmentIndex}-end`);
  });

  return <div className="prose-chat">{blocks}</div>;
}
