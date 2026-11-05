/**
 * Test support (imported only by *.test.ts): an evaluator of the terms the generators show, with exact fractions and its own parser, so that a test recomputes an answer
 * without the generator's arithmetic: '(2,5 + 1,5) · 3', '{frac:1/2} + {frac:1/4} · 2', '2 · x + 1' with x.
 */
import type { Exercise, Step } from '../../core/types';

export interface Frac {
  n: bigint;
  d: bigint;
}

const gcd = (a: bigint, b: bigint): bigint => (b === 0n ? (a < 0n ? -a : a) : gcd(b, a % b));
const norm = (n: bigint, d: bigint): Frac => {
  const g = gcd(n, d) || 1n;
  return d < 0n ? { n: -n / g, d: -d / g } : { n: n / g, d: d / g };
};

function fromText(text: string): Frac {
  const [int, dec = ''] = text.split(',');
  return norm(BigInt(int + dec), 10n ** BigInt(dec.length));
}

/** The value of a term, or throws on anything it cannot read. vars: the value of each letter. */
export function evalTerm(source: string, vars: Record<string, number> = {}): Frac {
  const tokens = source.replace(/[  ]/g, ' ').match(/\{frac:\d+\/\d+\}|\d+(?:,\d+)?|[+−·:()]|[a-z]|\S/g) ?? [];
  let at = 0;
  const atom = (): Frac => {
    const t = tokens[at++];
    if (t === '(') {
      const v = sum();
      if (tokens[at++] !== ')') throw new Error(`no closing bracket: ${source}`);
      return v;
    }
    if (t === undefined) throw new Error(`term ends early: ${source}`);
    const f = /^\{frac:(\d+)\/(\d+)\}$/.exec(t);
    if (f) return norm(BigInt(f[1]), BigInt(f[2]));
    if (/^\d/.test(t)) return fromText(t);
    if (/^[a-z]$/.test(t) && t in vars) return fromText(String(vars[t]).replace('.', ','));
    throw new Error(`cannot read "${t}" in: ${source}`);
  };
  const product = (): Frac => {
    let v = atom();
    while (tokens[at] === '·' || tokens[at] === ':') {
      const op = tokens[at++];
      const r = atom();
      v = op === '·' ? norm(v.n * r.n, v.d * r.d) : norm(v.n * r.d, v.d * r.n);
    }
    return v;
  };
  function sum(): Frac {
    let v = product();
    while (tokens[at] === '+' || tokens[at] === '−') {
      const op = tokens[at++];
      const r = product();
      v = op === '+' ? norm(v.n * r.d + r.n * v.d, v.d * r.d) : norm(v.n * r.d - r.n * v.d, v.d * r.d);
    }
    return v;
  }
  const v = sum();
  if (at !== tokens.length) throw new Error(`cannot read the rest of: ${source}`);
  return v;
}

export const sameFrac = (a: Frac, b: Frac): boolean => a.n * b.d === b.n * a.d;

/** A plain number as a Frac (0.1 + 0.2 kept away: from its shortest text). */
export const frNum = (x: number): Frac => fromText(String(Math.round(x * 1000) / 1000).replace('.', ','));

/** The value of a term as a number, for comparing with a number answer. */
export const termNumber = (source: string, vars: Record<string, number> = {}): number => {
  const v = evalTerm(source, vars);
  return Math.round((Number(v.n) / Number(v.d)) * 1000) / 1000;
};

/** The answer of an exercise as a Frac: number or fraction answers only. */
export function answerValue(ex: Exercise): Frac {
  const a = ex.answer;
  if (a.kind === 'number' && a.value !== null) return frNum(a.value);
  if (a.kind === 'fraction') return norm(BigInt((a.whole ?? 0) * a.denominator + a.numerator), BigInt(a.denominator));
  throw new Error(`${ex.key}: no number or fraction answer`);
}

export const stepText = (s: Step): string => (typeof s === 'string' ? s : s.text);

/** A filled gap '□': each side of an equation with the value put in. */
export function sidesWith(expression: string, value: string): [string, string] {
  const [left, right] = expression.replace('□', `(${value})`).split(' = ');
  return [left, right];
}

/** The value of a Frac as it goes into a term: {frac:n/d}, or a decimal number. */
export function fracText(v: Frac): string {
  return `{frac:${v.n}/${v.d}}`;
}

/** The answer of an item as it would stand in a term: a number, a fraction, or the label of the correct option. */
function answerText(ex: Exercise): string | null {
  const a = ex.answer;
  if (a.kind === 'number' && a.value !== null) return String(a.value).replace('.', ',');
  if (a.kind === 'fraction') return `{frac:${a.numerator}/${a.denominator}}`;
  if (a.kind === 'choice') return a.options[a.correct].label;
  return null;
}

/** true if the answer stands in the term beside the gap: 'x + 1/5 = 2/5' with x = 1/5, '3 · 4 − 6' with 6. Nothing is left to calculate then. */
export function answerInTask(ex: Exercise): boolean {
  const shown = ex.expression;
  const answer = answerText(ex);
  if (!shown || answer === null) return false;
  const tokens: readonly string[] = shown.match(/\{frac:\d+\/\d+\}|\d+(?:,\d+)?/g) ?? [];
  return ex.answer.kind === 'choice' ? shown === answer || tokens.includes(answer) : tokens.includes(answer);
}

const TIMES_WORDS: Record<string, string> = { 2: 'zweimal', 3: 'dreimal', 4: 'viermal', 5: 'fünfmal', 6: 'sechsmal', 7: 'siebenmal', 8: 'achtmal', 9: 'neunmal' };

/**
 * The texts shown after a first wrong tap, before the retry (src/ui/practice/session.ts), that state the correct option: its label, or a product '18 · x' in words as '18-mal x' or
 * 'dreimal x'. The shared revealedAnswers only looks at purely numeric labels.
 */
export function optionStated(ex: Exercise): string[] {
  if (ex.answer.kind !== 'choice') return [];
  const label = ex.answer.options[ex.answer.correct].label.replace(/ in €$/, '');
  const product = /^(\d+) · (\S+)$/.exec(label);
  const forms = [label, ...(product ? [`${product[1]}-mal ${product[2]}`, `${TIMES_WORDS[product[1]] ?? `${product[1]}mal`} ${product[2]}`] : [])];
  const has = (text: string, form: string) => new RegExp(`(?<![\\d,])${form.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![\\d,])`).test(text);
  return ex.answer.options.flatMap((o) => forms.filter((f) => o.whyWrong && has(o.whyWrong, f)).map((f) => `${ex.key}: "${o.whyWrong}" states ${f}`));
}
