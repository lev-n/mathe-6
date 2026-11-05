/**
 * Helpers of the topic 'brueche': exact fraction arithmetic, bug filters, and the answers its skills share.
 * Pure functions only; randomness only through the Rng parameter. Generic helpers stay in src/topics/shared.ts.
 */
import { frac, fractionWords } from '../../core/format';
import type { Ab, Bug, ChoiceAnswer, ChoiceOption, Exercise, GenContext, OrderAnswer, Rng, Stufe, Visual, VisualOf } from '../../core/types';
import { fractionBugs, makeChoice, speak as speakBase, targetAb, type MaybeBug } from '../shared';

export const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
export const lcm = (a: number, b: number): number => (a * b) / gcd(a, b);

/** A fraction as [Zähler, Nenner]. */
export type Frac = readonly [n: number, d: number];

export const lowest = ([n, d]: Frac): Frac => {
  const g = gcd(n, d);
  return [n / g, d / g];
};

export const isLowest = (n: number, d: number) => gcd(n, d) === 1;

/** Integer cross-multiplication, never floats: below 0 if a < b. */
export const compareFrac = (a: Frac, b: Frac): number => a[0] * b[1] - b[0] * a[1];

export const sumOf = (a: Frac, b: Frac): Frac => lowest([a[0] * b[1] + b[0] * a[1], a[1] * b[1]]);
export const differenceOf = (a: Frac, b: Frac): Frac => lowest([a[0] * b[1] - b[0] * a[1], a[1] * b[1]]);
export const productOf = (a: Frac, b: Frac): Frac => lowest([a[0] * b[0], a[1] * b[1]]);
export const quotientOf = (a: Frac, b: Frac): Frac => lowest([a[0] * b[1], a[1] * b[0]]);

export const fracOf = ([n, d]: Frac): string => frac(n, d);

/** The most parts of a Streifen a child can still count: above it the parts get thinner than the hatch. */
export const BAR_MAX_PARTS = 24;
/** The most Streifen one above the other in a worked step. */
const BAR_MAX_WHOLES = 4;

/** A Bruchstreifen of a fraction up to 1, with a second one under it of the same length. */
export const barOf = ([n, d]: Frac, under?: Frac): VisualOf<'fractionModel'> => ({ type: 'fractionModel', form: 'bar', parts: d, filled: n, ...(under ? { compare: { parts: under[1], filled: under[0] } } : {}) });

/** Enough Bruchstreifen for a fraction above 1 to stand as it is, or null if that takes too many. */
export function barsOf([n, d]: Frac): VisualOf<'fractionModel'> | null {
  const wholes = Math.ceil(n / d);
  if (wholes > BAR_MAX_WHOLES) return null;
  return { type: 'fractionModel', form: 'bar', parts: d, filled: n, ...(wholes > 1 ? { wholes } : {}) };
}

/** An unechter Bruch as a gemischte Zahl: 11/4 → { whole: 2, numerator: 3, denominator: 4 }. */
export const mixedOf = ([n, d]: Frac) => ({ whole: Math.floor(n / d), numerator: n % d, denominator: d });

/** As a child reads it: {frac:2 3/4} above 1, else the plain fraction. */
export const mixedText = (f: Frac): string => {
  const m = mixedOf(f);
  return m.whole > 0 && m.numerator > 0 ? frac(m.numerator, m.denominator, m.whole) : fracOf(f);
};

/** The name of the parts: 'Achtel', 'Fünftel', 'Halbe'. */
export const partsName = (d: number) => fractionWords(2, d).replace(/^zwei /, '');

/** The parts after 'in': 'in Fünfteln', 'in Halben'. */
export const partsDative = (d: number) => (d === 2 ? 'Halben' : `${partsName(d)}n`);

export const speak = speakBase;

/** A line of a placing task in words: its picture is the answer field, so srText has to hold the range and the sections. Never the target. */
export function lineWords(l: { min: number; max: number; minorStep: number; denominator?: number; labels?: readonly number[] }): string {
  const d = l.denominator ?? 1;
  const labels = l.labels ? `Beschriftet sind nur ${l.labels.map((x) => x / d).join(' und ')}.` : 'Beschriftet sind die ganzen Zahlen.';
  return `Zahlenstrahl von ${l.min / d} bis ${l.max / d} mit ${(l.max - l.min) / l.minorStep} gleichen Abschnitten. ${labels}`;
}

/** '1 Teil ist' or '3 Teile sind' (any noun pair). */
export const countIs = (n: number, one: string, many: string) => (n === 1 ? `1 ${one} ist` : `${n} ${many} sind`);

/** '1 Ganzes ist' or '2 Ganze sind'. */
export const wholesAre = (w: number) => countIs(w, 'Ganzes', 'Ganze');

export type Relation = '<' | '>' | '=';
export const relationOf = (cmp: number): Relation => (cmp < 0 ? '<' : cmp > 0 ? '>' : '=');

/** One form of a skill: builds its item for a Stufe and an AB level. */
export type Form = (rng: Rng, stufe: Stufe, ab: Ab) => Exercise;

/** generate() of a skill: each Stufe has its forms per AB level, so a Stufe chooses the content and AB only the demand. */
export function byStufeAndAb(forms: Readonly<Record<Stufe, Readonly<Record<Ab, readonly Form[]>>>>) {
  return (rng: Rng, stufe: Stufe, ctx: GenContext): Exercise => {
    const ab = targetAb(rng, stufe, ctx);
    return rng.pick(forms[stufe][ab])(rng, stufe, ab);
  };
}

/** The numbers from min to max. */
export const range = (min: number, max: number): number[] => Array.from({ length: max - min + 1 }, (_, i) => min + i);

// ─── Bugs ────────────────────────────────────────────────────────────────────

/** Bugs of a fraction answer that accepts any equal value: a match with the value of the answer would be correct, so it stays out. */
export function valueBugs(bugs: MaybeBug[], correct: { numerator: number; denominator: number; whole?: number }): Bug[] {
  const n = (correct.whole ?? 0) * correct.denominator + correct.numerator;
  return fractionBugs(bugs, correct).filter((b) => {
    const m = b.match as Record<string, number>;
    return ((m.whole ?? 0) * m.denominator + m.numerator) * correct.denominator !== n * m.denominator;
  });
}

/** One Bug per wrong index order: leaves out the correct order and repeats. */
export function orderBugs(correct: readonly number[], candidates: readonly (readonly [id: string, order: readonly number[], hint: string])[]): Bug[] {
  const seen = new Set<string>([correct.join()]);
  const out: Bug[] = [];
  for (const [id, order, hint] of candidates) {
    if (seen.has(order.join())) continue;
    seen.add(order.join());
    out.push({ id, match: [...order], hint });
  }
  return out;
}

// ─── Answers ─────────────────────────────────────────────────────────────────

/** An order answer of any values, shown shuffled and never already sorted. wrongOrder gives the index order a mistaken comparison leads to. */
export function orderWith<T>(rng: Rng, values: readonly T[], compare: (a: T, b: T) => number, label: (v: T) => string, direction: OrderAnswer['direction']) {
  const sign = direction === 'aufsteigend' ? 1 : -1;
  const sorted = [...values].sort((a, b) => sign * compare(a, b));
  let shown = rng.shuffle(values);
  if (shown.every((v, i) => v === sorted[i])) shown = [...shown.slice(1), shown[0]];
  const answer: OrderAnswer = { kind: 'order', items: shown.map(label), correct: sorted.map((v) => shown.indexOf(v)), direction };
  const wrongOrder = (mistaken: (a: T, b: T) => number) => [...shown].sort((a, b) => sign * mistaken(a, b)).map((v) => shown.indexOf(v));
  return { answer, sorted, wrongOrder };
}

/** The three signs in a fixed order, with a text for each wrong one. */
export function symbolChoice(rng: Rng, correct: Relation, whyWrong: Partial<Record<Relation, string>>): ChoiceAnswer {
  const wrongs: ChoiceOption[] = (['<', '>', '='] as const).filter((s) => s !== correct).map((s) => ({ label: s, whyWrong: whyWrong[s] ?? 'Vergleiche die beiden Werte noch einmal.' }));
  return makeChoice(rng, { label: correct }, wrongs, { layout: 'symbols', order: ['<', '>', '='] });
}

/** Options that are pictures, named Bild A, Bild B, … in the shown order. */
export function pictureChoice(rng: Rng, correct: Visual, wrong: readonly { visual: Visual; whyWrong: string }[], max = 4): ChoiceAnswer {
  const seen = new Set<string>([JSON.stringify(correct)]);
  const items: { visual: Visual; whyWrong?: string }[] = [{ visual: correct }];
  for (const w of wrong) {
    if (items.length >= max || seen.has(JSON.stringify(w.visual))) continue;
    seen.add(JSON.stringify(w.visual));
    items.push(w);
  }
  const shown = rng.shuffle(items);
  const options = shown.map((item, i): ChoiceOption => ({ label: `Bild ${'ABCD'[i]}`, visual: item.visual, ...(item.whyWrong ? { whyWrong: item.whyWrong } : {}) }));
  return { kind: 'choice', options, correct: shown.findIndex((item) => item.visual === correct), layout: 'grid' };
}
