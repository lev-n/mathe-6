/**
 * Text with tappable Fachwörter (docs/research.md T11, F17): a tap opens a short gloss in the text, never a pop-up, and a second tap closes it. Fractions still draw stacked (MathText).
 */
import { useId, useState } from 'react';
import type { GlossSegment } from '../../data/glossary';
import { MathText } from './MathText';

/** Punctuation that belongs to the word before it: a button is a box of its own, so a '?' could otherwise start the next line alone. */
const TAIL = /^[.,:;?!…“)]+/;

function GlossWord({ word, gloss, tail }: { word: string; gloss: string; tail: string }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <>
      <span className="gloss-pair">
        <button type="button" className="gloss-word" aria-expanded={open} aria-controls={id} onClick={() => setOpen((o) => !o)}>
          {word}
        </button>
        {tail}
      </span>
      <span id={id} className="gloss-text" hidden={!open}>
        {gloss}
      </span>
    </>
  );
}

/** keyBase: new for a new task, so that an open gloss does not carry over. */
export function GlossedText({ segments, keyBase }: { segments: readonly GlossSegment[]; keyBase: string }) {
  return (
    <>
      {segments.map((s, i) => {
        if ('word' in s) {
          const next = segments[i + 1];
          return <GlossWord key={`${keyBase}:${i}`} word={s.word} gloss={s.gloss} tail={next && 'text' in next ? (TAIL.exec(next.text)?.[0] ?? '') : ''} />;
        }
        const before = segments[i - 1];
        return <MathText key={i} text={before && 'word' in before ? s.text.replace(TAIL, '') : s.text} />;
      })}
    </>
  );
}
