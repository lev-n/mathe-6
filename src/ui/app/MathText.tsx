/**
 * Text with stacked fractions (docs/research.md T10): {frac:3/4} and {frac:1 3/4} are drawn with Zähler above and Nenner below, at least 1.5 times
 * the body height (src/styles/base.css). Screen readers get the words ('drei Viertel'). Plain text passes through unchanged.
 */
import { Fragment } from 'react';
import { fractionWords, mathParts } from '../../core/format';

/** A browser may break after '|', also before a no-break space: a word joiner keeps P(3 | 5) on one line in every text (src/core/format.ts keepTermsTogether). */
const keepPoint = (text: string) => text.replace(/\|(?!\u2060)/g, '|\u2060');

export function MathText({ text }: { text: string }) {
  const parts = mathParts(text);
  if (parts.length === 1 && 'text' in parts[0]) return <>{keepPoint(parts[0].text)}</>;
  return (
    <>
      {parts.map((p, i) =>
        'text' in p ? (
          <Fragment key={i}>{keepPoint(p.text)}</Fragment>
        ) : (
          <span key={i} className="frac-wrap" role="img" aria-label={fractionWords(Number(p.numerator), Number(p.denominator), p.whole === undefined ? undefined : Number(p.whole))}>
            {p.whole !== undefined && <span className="frac-whole">{p.whole}</span>}
            <span className="frac">
              <span className="frac__num">{p.numerator}</span>
              <span className="frac__den">{p.denominator}</span>
            </span>
          </span>
        ),
      )}
    </>
  );
}
