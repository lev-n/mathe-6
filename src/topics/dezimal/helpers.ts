/**
 * Helpers of the topic 'dezimal'. A decimal number is an integer plus its places (3,05 is [305, 2]), so that no generator adds or multiplies floats: the value comes
 * from one division by a power of ten, and that is the double nearest to the written number. Pure, randomness only through the Rng parameter.
 */
import { APPROX, fmt } from '../../core/format';
import type { Bug, MultiField, NumberAnswer, OrderAnswer, PlaceColumn, Rng, VisualOf } from '../../core/types';

/** §7.1: the comma key is active on every item of every decimal skill, so it gives nothing away. */
export const KEYS = { comma: true } as const;

/** A decimal number: the digits as an integer, and the places after the comma. */
export type Dec = readonly [int: number, places: number];

export const val = ([int, places]: Dec): number => int / 10 ** places;
/** With all its places, end zeros too: show([350, 2]) → '3,50'. */
export const show = ([int, places]: Dec): string => fmt(int / 10 ** places, places);
/** The whole part. */
export const wholeOf = ([int, places]: Dec): number => Math.floor(int / 10 ** places);
/** The digits after the comma, as text: fracOf([305, 2]) → '05'. */
export const fracOf = ([int, places]: Dec): string => (places === 0 ? '' : String(int % 10 ** places).padStart(places, '0'));
/** The same number with more places: scaled([35, 1], 2) → 350. */
export const scaled = ([int, places]: Dec, to: number): number => int * 10 ** (to - places);

/** Rounded half up, in integers: roundDec([296, 2], 1) → [30, 1]. */
export function roundDec([int, places]: Dec, to: number): Dec {
  const unit = 10 ** (places - to);
  return [Math.floor((int + unit / 2) / unit), to];
}

/** Cut off: cutDec([296, 2], 1) → [29, 1]. */
export function cutDec([int, places]: Dec, to: number): Dec {
  return [Math.floor(int / 10 ** (places - to)), to];
}

/** a : b rounded half up to `to` places, in integers (a and b count units of 10^-places). */
export function roundedQuotient(a: Dec, b: Dec, to: number): Dec {
  const places = Math.max(a[1], b[1]);
  const [n, d] = [scaled(a, places) * 10 ** to, scaled(b, places)];
  return [Math.floor((2 * n + d) / (2 * d)), to];
}

/** a : b cut off at `to` places. */
export function cutQuotient(a: Dec, b: Dec, to: number): Dec {
  const places = Math.max(a[1], b[1]);
  return [Math.floor((scaled(a, places) * 10 ** to) / scaled(b, places)), to];
}

/** a : b as a line of a worked solution: '12,00 : 2,50 = 4,80' when it ends at `to` places, else really rounded: '9,00 : 3,40 ≈ 2,65'. Digits that are cut off stand with '…' instead: '39,50 : 7 = 5,642…'. */
export function quotientStep(a: Dec, b: Dec, to = 2): string {
  const places = Math.max(a[1], b[1]);
  const ends = (scaled(a, places) * 10 ** to) % scaled(b, places) === 0;
  return `${show(a)} : ${show(b)} ${ends ? '=' : APPROX} ${show(roundedQuotient(a, b, to))}`;
}

/** A number answer of a decimal skill: the comma key is active, whatever the value is. */
export function numberAnswer(value: number, rest: Omit<NumberAnswer, 'kind' | 'value' | 'decimals'> = {}): NumberAnswer {
  return { kind: 'number', value, decimals: 3, ...rest };
}

/** A money answer: two places, written '3,50'. */
export function euroAnswer(cents: number, rest: Omit<NumberAnswer, 'kind' | 'value' | 'decimals' | 'unit'> = {}): NumberAnswer {
  return { kind: 'number', value: cents / 100, decimals: 2, unit: '€', ...rest };
}

/** A field of a multi answer in a decimal skill. */
export function digitField(id: string, value: number, after: string): MultiField {
  return { id, value, after, decimals: 3, label: after };
}

const WHOLE_COLUMNS: readonly PlaceColumn[] = ['H', 'Z', 'E'];
const AFTER_COLUMNS: readonly PlaceColumn[] = ['z', 'h', 't'];

/** The Stellentafel of some decimal numbers, one row each, comma under comma. Places a number does not have stay empty. */
export function tafel(rows: readonly Dec[]): VisualOf<'placeValue'> {
  const wholeLength = Math.max(...rows.map((d) => String(wholeOf(d)).length));
  const most = Math.max(...rows.map((d) => d[1]));
  return {
    type: 'placeValue',
    columns: [...WHOLE_COLUMNS.slice(-wholeLength), ...AFTER_COLUMNS.slice(0, most)],
    rows: rows.map((d) => {
      const whole = String(wholeOf(d)).padStart(wholeLength, ' ');
      const frac = fracOf(d).padEnd(most, ' ');
      return { values: [...whole, ...frac].map((c) => (c === ' ' ? null : Number(c))) };
    }),
  };
}

/**
 * The Stellentafel of a number with its cells empty: the order of the places as a help, without a digit standing under its name. It always runs to the Hundertstel,
 * so that the columns of a one-place number do not leave one name to choose.
 */
export function emptyTafel(d: Dec): VisualOf<'placeValue'> {
  const columns = [...WHOLE_COLUMNS.slice(-String(wholeOf(d)).length), ...AFTER_COLUMNS.slice(0, Math.max(d[1], 2))];
  return { type: 'placeValue', columns, rows: [{ values: columns.map(() => null) }] };
}

/** '1 Ganzes', '3 Ganze'. */
export const ganze = (n: number) => `${n} ${n === 1 ? 'Ganzes' : 'Ganze'}`;
/** The verb after a count: '1 Zehntel ist', '3 Zehntel sind'. */
export const sind = (n: number) => (n === 1 ? 'ist' : 'sind');

/** A written visual with the solution, for a worked step. */
export function solved(op: VisualOf<'written'>['op'], operands: number[], decimalPlaces: number[], method?: VisualOf<'written'>['method']): VisualOf<'written'> {
  return { type: 'written', op, operands, decimalPlaces, showSolution: true, ...(method ? { method } : {}) };
}

/** A random integer whose last digit is not 0, so that a number never shows an end zero by chance. */
export function noEndZero(rng: Rng, min: number, max: number): number {
  const n = rng.int(min, max);
  return n % 10 === 0 ? n + 1 : n;
}

/** Try until `make` gives a value; bounded, so a generator always ends. */
export function attempt<T>(make: () => T | null, fallback: T): T {
  for (let i = 0; i < 60; i++) {
    const out = make();
    if (out !== null) return out;
  }
  return fallback;
}

/** Order bugs: the index order of a wrong sorting, on the shown items. Orders equal to the right one, or to an earlier bug, stay out. */
export function orderBugs(answer: OrderAnswer, wrong: readonly { id: string; order: readonly string[]; hint: string }[]): Bug[] {
  const seen = new Set<string>([answer.correct.join()]);
  const out: Bug[] = [];
  for (const w of wrong) {
    const match = w.order.map((label) => answer.items.indexOf(label));
    if (seen.has(match.join())) continue;
    seen.add(match.join());
    out.push({ id: w.id, match, hint: w.hint });
  }
  return out;
}
