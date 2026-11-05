/**
 * Fraction answer (docs/research.md §6): Zähler field above a bar, Nenner field below. The Ganze field stands to the left: always when the answer has a whole and no allowMixed, and behind the
 * "Ganze" toggle with allowMixed, for every item of such a skill. allowNegative adds a sign toggle that shows − before the fraction, for every item of such a skill. Digits only.
 * On a physical keyboard / and Tab move to the next field; the Ziffernblock's ↓ does the same (src/ui/keypad/Keypad.tsx). A minus key toggles the sign (src/ui/answers/fieldNav.ts).
 * An empty field, a Nenner 0 or (accept 'lowest') an equal value that can still be shortened gives a calm message and uses no attempt (src/core/check.ts).
 */
import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { fieldText } from '../../core/check';
import type { AnswerOf, Response } from '../../core/types';
import { describedByIds, type AnswerInputProps } from './types';
import { FieldMark, type MarkState } from './NumberInput';
import { answerFields, focusField } from './fieldNav';
import './FractionInput.css';

const digitsOnly = (raw: string) => raw.replace(/\D/g, '');

type FractionResponse = Extract<Response, { kind: 'fraction' }>;
type Part = 'numerator' | 'denominator' | 'whole';

export default function FractionInput({ answer, response, onChange, disabled, result, reveal, idBase, keypad, print, describedBy }: AnswerInputProps<AnswerOf<'fraction'>>) {
  const current: FractionResponse = response?.kind === 'fraction' ? response : { kind: 'fraction', numerator: '', denominator: '', whole: '' };
  const [wholeOpen, setWholeOpen] = useState(!!current.whole);
  // The toggle hands on to the field it opened, or back to the Zähler: the Ziffernblock and the keyboard go on typing where the child expects.
  const toggled = useRef(false);
  useEffect(() => {
    if (!toggled.current) return;
    toggled.current = false;
    const field = document.getElementById(`${idBase}-fraction-${wholeOpen ? 'whole' : 'numerator'}`);
    if (field) focusField(field);
  }, [wholeOpen, idBase]);
  const around = [answer.unit, answer.after].filter(Boolean).join(' ');
  const fixedWhole = answer.whole !== undefined && !answer.allowMixed;
  const hasWhole = fixedWhole || (answer.allowMixed && (wholeOpen || (reveal && answer.whole !== undefined)));

  if (print) {
    return (
      <div className="ans-fraction ans-fraction--print">
        {answer.before && <span className="ans-number__text">{answer.before}</span>}
        {(fixedWhole || answer.allowMixed) && <span className="print-box print-box--sm" aria-hidden="true" />}
        <span className="ans-fraction__stack" aria-hidden="true">
          <span className="print-box print-box--sm" />
          <span className="ans-fraction__bar" />
          <span className="print-box print-box--sm" />
        </span>
        {around && <span className="ans-number__text">{around}</span>}
      </div>
    );
  }

  const checked = result && !result.invalid ? result : null;
  const mark: MarkState = reveal ? 'solution' : checked ? (checked.correct ? 'right' : 'wrong') : null;
  const readOnly = disabled || reveal;
  const markId = `${idBase}-fraction-mark`;
  const negative = reveal ? !!answer.negative : !!current.negative;
  const emit = (patch: Partial<Pick<FractionResponse, Part | 'negative'>>, showWhole = hasWhole) => {
    const next = { ...current, ...patch };
    onChange({
      kind: 'fraction',
      numerator: next.numerator,
      denominator: next.denominator,
      ...(showWhole ? { whole: next.whole ?? '' } : {}),
      ...(next.negative ? { negative: true } : {}),
    });
  };
  const toggleWhole = () => {
    const open = !wholeOpen;
    toggled.current = true;
    setWholeOpen(open);
    emit(open ? {} : { whole: '' }, open);
  };
  /** / moves on like Tab: the stacked field already shows the bar, so the key has no other job. */
  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== '/' || e.ctrlKey || e.metaKey || e.altKey) return;
    e.preventDefault();
    const scope = e.currentTarget.closest('.ans-fraction');
    const fields = answerFields(scope);
    const next = fields[fields.indexOf(e.currentTarget) + 1];
    if (next) focusField(next);
  };
  const field = (part: Part, label: string, solution: number | undefined) => {
    const cls = `num-input ans-fraction__input${mark === 'wrong' ? ' is-wrong' : ''}${mark === 'right' || mark === 'solution' ? ' is-right' : ''}`;
    return (
      <input
        id={`${idBase}-fraction-${part}`}
        type="text"
        className={cls}
        inputMode={keypad ? 'none' : 'numeric'}
        enterKeyHint={part === 'denominator' ? 'done' : 'next'}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
        aria-label={label}
        aria-invalid={mark === 'wrong' || undefined}
        aria-describedby={describedByIds(describedBy, mark && markId)}
        aria-readonly={readOnly || undefined}
        readOnly={readOnly}
        data-answer-field=""
        data-fraction-part={part}
        data-signed={answer.allowNegative ? 'fraction' : undefined}
        data-answer-wrong={mark === 'wrong' ? '' : undefined}
        value={reveal ? fieldText(solution ?? 0) : (current[part] ?? '')}
        onChange={(e) => emit({ [part]: digitsOnly(e.target.value) })}
        onKeyDown={onKeyDown}
      />
    );
  };

  return (
    <div className="ans-fraction" role="group" aria-label={negative ? 'Bruch, negativ' : 'Bruch'} data-fraction-negative={negative ? '' : undefined}>
      {answer.before && <span className="ans-number__text">{answer.before}</span>}
      {answer.allowNegative && (
        <button
          type="button"
          className={`btn ans-fraction__toggle${negative ? ' is-pressed' : ''}`}
          aria-pressed={negative}
          aria-label="Vorzeichen: Minus"
          disabled={readOnly}
          onClick={() => emit({ negative: !negative })}
        >
          <span aria-hidden="true">±</span>
        </button>
      )}
      {negative && <span className="ans-fraction__sign" aria-hidden="true">−</span>}
      {hasWhole && field('whole', 'Ganze', answer.whole)}
      <span className="ans-fraction__stack">
        {field('numerator', 'Zähler', answer.numerator)}
        <span className="ans-fraction__bar" aria-hidden="true" />
        {field('denominator', 'Nenner', answer.denominator)}
      </span>
      {answer.allowMixed && (
        <button type="button" className={`btn ans-fraction__toggle${wholeOpen ? ' is-pressed' : ''}`} aria-pressed={wholeOpen} disabled={readOnly} onClick={toggleWhole}>
          Ganze
        </button>
      )}
      {around && <span className="ans-number__text">{around}</span>}
      <FieldMark state={mark} id={markId} />
    </div>
  );
}
