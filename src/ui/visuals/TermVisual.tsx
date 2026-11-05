/**
 * A term and its next steps, line by line (docs/research.md §6, F4). The highlighted part of the first line is tinted and underlined, so the next step is never
 * marked by colour alone. bracketDepth lifts brackets by level. No Rechenbaum in v1. Semantic HTML inside role="img".
 */
import { toSpeech } from '../../core/format';
import type { VisualOf } from '../../core/types';
import type { VisualProps } from './types';
import './TermVisual.css';

type Term = VisualOf<'term'>;

export function termAriaLabel(v: Term): string {
  const parts = v.lines.map((l) => toSpeech(l));
  let text = parts.length > 1 ? `Rechenweg: ${parts.join('. Dann: ')}.` : `Term: ${parts[0] ?? ''}.`;
  if (v.highlight) text += ` Markiert: ${toSpeech(v.lines[0].slice(v.highlight[0], v.highlight[1]))}.`;
  return text;
}

/** Text with its brackets drawn one size larger per level, inner brackets smallest. */
function Depth({ text, on, maxDepth, start }: { text: string; on: boolean; maxDepth: number; start: number }) {
  if (!on) return <>{text}</>;
  let depth = start;
  return (
    <>
      {[...text].map((ch, i) => {
        if (ch === '(') depth += 1;
        const level = ch === '(' ? depth : ch === ')' ? depth : 0;
        if (ch === ')') depth -= 1;
        return level > 0 ? (
          <span key={i} className="term-bracket" data-depth={level} style={{ fontSize: `${100 + (maxDepth - level) * 22}%` }}>{ch}</span>
        ) : (
          <span key={i}>{ch}</span>
        );
      })}
    </>
  );
}

function depthAt(text: string, end: number): number {
  let d = 0;
  for (const ch of text.slice(0, end)) {
    if (ch === '(') d += 1;
    if (ch === ')') d -= 1;
  }
  return d;
}

function maxDepthOf(text: string): number {
  let d = 0;
  let top = 0;
  for (const ch of text) {
    if (ch === '(') top = Math.max(top, ++d);
    if (ch === ')') d -= 1;
  }
  return top;
}

export default function TermVisual({ visual, print }: VisualProps<Term>) {
  const { lines, highlight, bracketDepth } = visual;
  return (
    <div className={`visual term-visual${print ? ' term-visual--print' : ''}`} role="img" aria-label={termAriaLabel(visual)}>
      {lines.map((line, i) => {
        const on = !!bracketDepth;
        const top = maxDepthOf(line);
        if (i === 0 && highlight) {
          const [a, b] = highlight;
          return (
            <p key={i} className="term-line" aria-hidden="true">
              <Depth text={line.slice(0, a)} on={on} maxDepth={top} start={0} />
              <mark className="term-next" data-testid="term-highlight">
                <Depth text={line.slice(a, b)} on={on} maxDepth={top} start={depthAt(line, a)} />
              </mark>
              <Depth text={line.slice(b)} on={on} maxDepth={top} start={depthAt(line, b)} />
            </p>
          );
        }
        return (
          <p key={i} className="term-line" aria-hidden="true">
            <Depth text={line} on={on} maxDepth={top} start={0} />
          </p>
        );
      })}
    </div>
  );
}
