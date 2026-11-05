import type { CSSProperties } from 'react';
import type { Answer, CheckResult, Response } from '../../core/types';

/**
 * Contract for every answer input component (src/ui/answers/*Input.tsx).
 *
 * - Text inputs are plain <input type="text"> with inputMode = keypad ? 'none' : 'numeric' (or 'decimal'),
 *   never type="number". The on-screen Ziffernblock inserts characters into the focused input by
 *   dispatching native input events, so components just use React onChange.
 * - Enter: AnswerInput handles Enter for every text field (src/ui/answers/fieldNav.ts): it moves to the next
 *   empty field and calls onSubmit() when nothing is left to fill. Components only mark their fields with the
 *   data-answer-* attributes described there; widgets with their own Enter semantics (choice, order, cells,
 *   number line) mark their tab stop with data-answer-enter="self" and call onSubmit() themselves.
 * - Every input has a visible or programmatic German label.
 * - Wrong parts are marked with colour AND an icon/text (never colour only), using result.
 * - Touch targets ≥ 48 px (answer buttons ≥ 56 px).
 */
export interface AnswerInputProps<A extends Answer = Answer> {
  answer: A;
  response: Response | null;
  onChange: (response: Response) => void;
  onSubmit: () => void;
  /** No more changes (solved, or solution shown). */
  disabled: boolean;
  /** Last check result (to mark wrong fields/columns/cells). */
  result: CheckResult | null;
  /** Solution was revealed: show the correct answer read-only. */
  reveal: boolean;
  /** The comma is the task (Exercise.literalComma): spoken labels keep it, '0 Komma 7 2 Meter', instead of '0 Meter 72'. */
  literalComma?: boolean;
  /** Unique prefix for element ids. */
  idBase: string;
  /** On-screen keypad is active → inputMode 'none'. */
  keypad: boolean;
  /** Worksheet mode: static, empty, printable boxes (no interactivity). */
  print?: boolean;
  /** Id of the visible task prompt; group inputs (e.g. the choice radiogroup) use it as their accessible name. */
  labelledBy?: string;
  /** Id of the spoken task (Exercise.srText): answer fields add it to aria-describedby, so a focused field reads the question. */
  describedBy?: string;
}

/** Join aria-describedby ids, skipping empty ones (undefined when none are left). */
export function describedByIds(...ids: (string | false | null | undefined)[]): string | undefined {
  const out = ids.filter((id): id is string => typeof id === 'string' && id !== '');
  return out.length ? out.join(' ') : undefined;
}

/**
 * A field grows with what is typed, so a long number stays readable while typing and checking (a width from the answer would give its length away).
 * Up to `fits` characters the stylesheet's width applies. 2.5rem: the field's padding and border.
 */
export function fieldWidth(text: string, fits: number): CSSProperties | undefined {
  return text.length > fits ? { width: `calc(${text.length}ch + 2.5rem)` } : undefined;
}

/** The box on paper for a value: a hand writes bigger than a screen, so from 100 000 on it is long enough for up to 12 digits. */
export function printBoxClass(value: number | null, small?: string): string {
  if (value !== null && Math.abs(value) >= 100_000) return 'print-box print-box--long';
  return small ? `print-box ${small}` : 'print-box';
}
