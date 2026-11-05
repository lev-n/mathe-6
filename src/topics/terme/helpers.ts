/** Small helpers of the topic 'terme': exact fractions, the keys of a skill's answers and the text of a term. Pure, randomness only through the Rng parameter. */
import { fmt, frac, toSpeech } from '../../core/format';
import type { Bug, FractionAnswer, NumberAnswer, Rng } from '../../core/types';
import { fractionAnswer, fractionBugs, numberBugs, type MaybeBug } from '../shared';

/** Removes the float noise of a decimal calculation. A term here has at most three places. */
export const r3 = (x: number): number => Math.round(x * 1000) / 1000;

/** A term's number: n(2.5) → '2,5'. */
export const n = (x: number): string => fmt(r3(x));

/** The places a field of a skill with keys.comma takes. Not 2: core/check.ts reads two decimals as money or metres and shows 10 as '10,00'. */
export const COMMA_PLACES = 3;

/** A number field of a skill with keys.comma: every item sets decimals, so the comma key gives nothing away (§7.1). */
export function commaNumber(value: number, label: string, rest: Omit<NumberAnswer, 'kind' | 'value' | 'decimals' | 'label'> = {}): NumberAnswer {
  return { kind: 'number', value: r3(value), decimals: COMMA_PLACES, label, ...rest };
}

/** Bugs of a commaNumber: only values the field can hold, without float noise, so that a typed value can match. */
export function commaBugs(bugs: MaybeBug[], correct: number): Bug[] {
  const clean = bugs.map((b) => (b && typeof b.match === 'number' && Math.abs(b.match * 1000 - Math.round(b.match * 1000)) < 1e-9 ? { ...b, match: r3(b.match) } : b));
  return numberBugs(clean, r3(correct));
}

/** A number from lo to hi that is none of these: an answer equal to a number beside the gap, or two equal numbers in a term, would give the result away. */
export function other(rng: Rng, lo: number, hi: number, ...not: number[]): number {
  for (;;) {
    const x = rng.int(lo, hi);
    if (!not.includes(x)) return x;
  }
}

/** A number of a term, without its fractions: the answer must not stand among these. */
export const shownNumbers = (term: string): string[] => term.replace(/\{frac:[^}]+\}/g, ' ').match(/\d+(?:,\d+)?/g) ?? [];

/** The task as the screen reader says it. */
export const say = (...parts: (string | undefined)[]): string => toSpeech(parts.filter(Boolean).join(' '));

// ─── Exact fractions ─────────────────────────────────────────────────────────

/** A fraction in lowest terms, Nenner above 0. */
export interface Q {
  n: number;
  d: number;
}

const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));

export function q(num: number, den = 1): Q {
  const g = gcd(Math.abs(num), den) || 1;
  return { n: num / g, d: den / g };
}
export const add = (a: Q, b: Q): Q => q(a.n * b.d + b.n * a.d, a.d * b.d);
export const sub = (a: Q, b: Q): Q => q(a.n * b.d - b.n * a.d, a.d * b.d);
export const mul = (a: Q, b: Q): Q => q(a.n * b.n, a.d * b.d);
export const div = (a: Q, b: Q): Q => q(a.n * b.d, a.d * b.n);
export const sameQ = (a: Q, b: Q): boolean => a.n * b.d === b.n * a.d;

/** A fraction or whole number as it stands in a text: {frac:3/4} or 2. */
export const qs = (x: Q): string => (x.d === 1 ? fmt(x.n) : frac(x.n, x.d));

/** A proper fraction with one of these Nenner, in lowest terms. */
export function pickQ(rng: Rng, denominators: readonly number[]): Q {
  const d = rng.pick(denominators);
  for (;;) {
    const x = q(rng.int(1, d - 1), d);
    if (x.d === d) return x;
  }
}

/** Two Nenner of a fraction task with plus or minus (brueche.plus-minus). AB I: one a multiple of the other. AB II: no multiple, with a Hauptnenner up to 24. */
export const NENNER_PAIRS: Readonly<Record<1 | 2, readonly (readonly [number, number])[]>> = {
  1: [[2, 4], [2, 8], [4, 8], [3, 6], [2, 6], [3, 12], [4, 12], [6, 12], [2, 10], [5, 10]],
  2: [[2, 3], [3, 4], [4, 6], [2, 5], [3, 5], [4, 5], [3, 8], [6, 8]],
};

/** A fraction answer of a skill with keys.mixed: it takes 11/4 and 2 3/4 alike, and a result that can still be shortened uses no attempt. */
export const mixedFraction = (x: Q, rest: Partial<FractionAnswer> = {}): FractionAnswer => fractionAnswer(x.n, x.d, { allowMixed: true, ...rest });

/** Bugs of a fraction answer, with the value of the answer left out (matched on the exact form, as written, so raw {n: 6, d: 8} stays 6/8). */
export function qBugs(bugs: readonly { id: string; hint: string; raw: Q | null }[], answer: Q): Bug[] {
  const kept = bugs.filter((b): b is { id: string; hint: string; raw: Q } => b.raw !== null && b.raw.n > 0 && b.raw.d > 1 && Number.isInteger(b.raw.n) && !sameQ(b.raw, answer));
  return fractionBugs(kept.map((b) => ({ id: b.id, hint: b.hint, match: { numerator: b.raw.n, denominator: b.raw.d } })), { numerator: answer.n, denominator: answer.d });
}
