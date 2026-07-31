import { Fragment, type ReactNode } from 'react';

import { cn } from '@/lib/cn';

/**
 * Matches WhatsApp-style bold: `*texto*`.
 *
 * Deliberately narrow. The content may not contain another asterisk or a line
 * break, so a lone `*` in a list item ("- * 4 unidades") or a multiplication
 * never swallows half a paragraph into bold.
 */
const BOLD_PATTERN = /\*([^*\n]+)\*/g;

export interface IRichTextProps {
  /** Raw model output, as returned by the agent. */
  children: string;
  className?: string;
}

/**
 * Renders agent output with its WhatsApp formatting applied.
 *
 * The assistant is the same one that answers on WhatsApp, so it emits that
 * markup — showing the asterisks literally leaks the transport's syntax into
 * the panel. Only bold is interpreted: `_` and `` ` `` appear too often inside
 * model ids and snake_case fields to treat as formatting without false hits.
 */
export function RichText({ children, className }: IRichTextProps) {
  return (
    <p className={cn('whitespace-pre-wrap', className)}>{renderBold(children)}</p>
  );
}

/** Exported for callers that need the nodes without the wrapping paragraph. */
export function renderBold(text: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  let lastIndex = 0;
  let key = 0;

  for (const match of text.matchAll(BOLD_PATTERN)) {
    const start = match.index;

    if (start > lastIndex) {
      nodes.push(<Fragment key={key++}>{text.slice(lastIndex, start)}</Fragment>);
    }

    nodes.push(<strong key={key++} className="font-semibold">{match[1]}</strong>);
    lastIndex = start + match[0].length;
  }

  if (lastIndex < text.length) {
    nodes.push(<Fragment key={key++}>{text.slice(lastIndex)}</Fragment>);
  }

  return nodes;
}
