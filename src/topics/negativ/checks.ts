/**
 * Test support of the topic (imported only by *.test.ts): an independent exact evaluator for terms with signs, decimals and fractions, used to recompute the lines of worked steps and the answers, and the
 * checks every skill test of this topic runs.
 */
import { expect } from 'vitest';
import { fmt, frac } from '../../core/format';
import { createRng } from '../../core/rng';
import type { Ab, Answer, Exercise, SkillDef, Step, Stufe } from '../../core/types';
import { CTX } from '../test-utils';

/** A fraction of BigInts: the worked steps are recomputed without any float. */
export interface Exact { n: bigint; d: bigint }

const gcd = (a: bigint, b: bigint): bigint => (b === 0n ? (a < 0n ? -a : a) : gcd(b, a % b));
const norm = (n: bigint, d: bigint): Exact => { const g = gcd(n, d) || 1n; const s = d < 0n ? -1n : 1n; return { n: (s * n) / g, d: (s * d) / g }; };
const add = (a: Exact, b: Exact) => norm(a.n * b.d + b.n * a.d, a.d * b.d);
const neg = (a: Exact) => norm(-a.n, a.d);
const mul = (a: Exact, b: Exact) => norm(a.n * b.n, a.d * b.d);
const div = (a: Exact, b: Exact) => norm(a.n * b.d, a.d * b.n);
export const same = (a: Exact, b: Exact) => a.n === b.n && a.d === b.d;

/** A decimal such as 2,5 or −0,125 as an exact fraction; a JS number comes in through its text with three places at most. */
export function exactOf(value: number): Exact {
  const text = Math.abs(value).toFixed(3);
  const units = BigInt(text.replace('.', ''));
  return norm(value < 0 ? -units : units, 1000n);
}

type Tok = Exact | '+' | '−' | '·' | ':' | '(' | ')' | '|';

function tokens(src: string): Tok[] | null {
  const out: Tok[] = [];
  const text = src.replace(/[   ⁠]/g, ' ');
  for (const m of text.matchAll(/\{frac:(?:(\d+) )?(\d+)\/(\d+)\}|\d+(?:,\d+)?|[+−·:()|]|\S/g)) {
    const t = m[0];
    if (t.startsWith('{')) {
      const d = BigInt(m[3]);
      out.push(norm(BigInt(m[1] ?? '0') * d + BigInt(m[2]), d));
    } else if (/^\d/.test(t)) {
      const [i, f = ''] = t.split(',');
      out.push(norm(BigInt(i + f), 10n ** BigInt(f.length)));
    } else if ('+−·:()|'.includes(t)) out.push(t as Tok);
    else return null;
  }
  return out.length ? out : null;
}

/** The value of a term, exactly; null if the text is anything else. */
export function evalTerm(src: string): Exact | null {
  const toks = tokens(src);
  if (!toks) return null;
  let i = 0;
  const atom = (): Exact | null => {
    const t = toks[i++];
    if (t === undefined) return null;
    if (typeof t === 'object') return t;
    if (t === '−') { const v = atom(); return v && neg(v); }
    if (t === '(' || t === '|') {
      const v = sum();
      const close = toks[i++];
      if (!v || close !== (t === '(' ? ')' : '|')) return null;
      return t === '|' && v.n < 0n ? neg(v) : v;
    }
    return null;
  };
  const product = (): Exact | null => {
    let v = atom();
    while (v && (toks[i] === '·' || toks[i] === ':')) {
      const op = toks[i++];
      const r = atom();
      if (!r || (op === ':' && r.n === 0n)) return null;
      v = op === '·' ? mul(v, r) : div(v, r);
    }
    return v;
  };
  const sum = (): Exact | null => {
    let v = product();
    while (v && (toks[i] === '+' || toks[i] === '−')) {
      const op = toks[i++];
      const r = product();
      if (!r) return null;
      v = op === '+' ? add(v, r) : add(v, neg(r));
    }
    return v;
  };
  const v = sum();
  return i === toks.length ? v : null;
}

export const textOf = (s: Step) => (typeof s === 'string' ? s : s.text);

/** A line 'Text: a = b = c': every side that is a pure term must have the same value. Returns the lines that do not add up. */
export function wrongStepLines(ex: Exercise): string[] {
  const out: string[] = [];
  for (const raw of ex.steps.map(textOf)) {
    const body = raw.replace(/^[^=]*?\p{L}:\s/u, '').replace(/\.$/, '');
    if (!body.includes(' = ')) continue;
    const values = body.split(' = ').map(evalTerm);
    if (values.some((v) => v === null)) continue;
    if (values.some((v) => !same(v as Exact, values[0] as Exact))) out.push(`${ex.key}: ${raw}`);
  }
  return out;
}

/** The value of a number, numberline or fraction answer. */
export function answerExact(a: Answer): Exact | null {
  if (a.kind === 'number') return a.value === null ? null : exactOf(a.value);
  if (a.kind === 'numberline') return norm(BigInt(Math.round(a.value * 1000)), BigInt(1000 * (a.denominator ?? 1)));
  if (a.kind === 'fraction') {
    const m = BigInt((a.whole ?? 0) * a.denominator + a.numerator);
    return norm(a.negative ? -m : m, BigInt(a.denominator));
  }
  return null;
}

/** The result as the child reads it, in the last step: the number, or the fraction token. */
export function missingResult(ex: Exercise): string[] {
  const last = textOf(ex.steps[ex.steps.length - 1]);
  const a = ex.answer;
  if (a.kind === 'number' && a.value !== null) return last.includes(fmt(a.value)) ? [] : [`${ex.key}: last step "${last}" does not state ${fmt(a.value)}`];
  if (a.kind === 'fraction') {
    const token = frac(a.numerator, a.denominator, a.whole);
    const signed = `${a.negative ? '−' : ''}${token}`;
    return last.includes(signed) ? [] : [`${ex.key}: last step "${last}" does not state ${signed}`];
  }
  return [];
}

/** The digits of an answer without its sign, as a text states them; null when the answer has no such form or is the 0. */
function answerDigits(a: Answer): string | null {
  if (a.kind === 'number') return a.value ? fmt(Math.abs(a.value)) : null;
  if (a.kind === 'fraction') return frac(a.numerator, a.denominator, a.whole).replace(/[{}]/g, '\\$&');
  if (a.kind === 'choice') return /^[−\d][\d,]*$/.test(a.options[a.correct].label) ? a.options[a.correct].label.replace('−', '') : null;
  return null;
}

/**
 * Hints never give the result away, a small one or a negative one neither (revealedAnswers in the shared suite looks only from 10 on): the digits of the answer stay out of every hint, bug hint and whyWrong, with or
 * without the sign, unless the task itself shows that number. So the value of a tick cannot state the answer of a value one tick from the 0.
 */
export function hintStatesAnswer(ex: Exercise): string[] {
  const digits = answerDigits(ex.answer);
  if (digits === null) return [];
  const mentioned = (t: string) => new RegExp(`(?<![\\d,])${digits}(?![\\d,])`).test(t);
  const task = [ex.context, ex.prompt, ex.expression].filter(Boolean).join(' ');
  if (mentioned(task)) return [];
  const whyWrong = ex.answer.kind === 'choice' ? ex.answer.options.map((o) => o.whyWrong ?? '') : [];
  return [...ex.hints, ...(ex.bugs ?? []).map((b) => b.hint), ...whyWrong].filter(mentioned).map((t) => `${ex.key}: ${t}`);
}

/** '1 Striche', '1 Stockwerke': the noun does not fit the number 1. */
export function singularProblems(ex: Exercise): string[] {
  const texts = [ex.context ?? '', ex.prompt, ex.praise, ...ex.hints, ...ex.steps.map(textOf), ...(ex.bugs ?? []).map((b) => b.hint)];
  return texts.filter((t) => /(?<![\d,])1 (Striche|Schritte|Stockwerke)\b|\bsind es 1 |\bbleiben noch 1 /.test(t)).map((t) => `${ex.key}: ${t}`);
}

/** A bracket or a comparison sign left in the spoken text, which the voice reads as something else or not at all; a decimal not said place by place (T20); a unit left as its symbol. */
export function spokenProblems(ex: Exercise): string[] {
  return /[()<>{}]|\d,\d|\d (?:m|€)(?!\p{L})/u.test(ex.srText) ? [`${ex.key}: ${ex.srText}`] : [];
}

/** Labels above a Zahlengerade that overprint each other: the marks' labels and the jumps' labels share one band (geometry of NumberLineVisual). */
export function labelOverlaps(ex: Exercise): string[] {
  const out: string[] = [];
  const visuals = [ex.visual, ...ex.steps.map((s) => (typeof s === 'string' ? undefined : s.visual))];
  for (const v of visuals) {
    if (v?.type !== 'numberLine') continue;
    const x = (value: number) => ((value - v.min) / (v.max - v.min)) * 340;
    const boxes = [
      ...(v.marks ?? []).map((m) => ({ x: x(m.value), w: m.label.length * 11.6 + 6, text: m.label })),
      ...(v.jumps ?? []).filter((j) => j.label).map((j) => ({ x: (x(j.from) + x(j.to)) / 2, w: (j.label as string).length * 9.3 + 6, text: j.label as string })),
    ];
    boxes.forEach((p, i) => boxes.slice(i + 1).forEach((q) => {
      if (Math.abs(p.x - q.x) < (p.w + q.w) / 2) out.push(`${ex.key}: ${p.text} and ${q.text}`);
    }));
  }
  return out;
}

/** Items of one Stufe and AB, with the parts of the key after the skill, Stufe and AB. */
export function items(skill: SkillDef, stufe: Stufe, ab: Ab, n = 200): { ex: Exercise; form: string; p: string[]; num: number[] }[] {
  return Array.from({ length: n }, (_, i) => {
    const ex = skill.generate(createRng(i * 7717 + 13 + stufe * 101 + ab), stufe, { ...CTX, ab });
    const [, , , form, ...p] = ex.key.split(':');
    return { ex, form, p, num: p.map(Number) };
  });
}

export const correctLabel = (ex: Exercise): string => {
  if (ex.answer.kind !== 'choice') throw new Error(`${ex.key}: a choice answer`);
  return ex.answer.options[ex.answer.correct].label;
};

/** The value of a number answer. */
export const numberValue = (ex: Exercise): number => {
  if (ex.answer.kind !== 'number' || ex.answer.value === null) throw new Error(`${ex.key}: a number answer`);
  return ex.answer.value;
};

/** The answer as a term, for the gap of an expression. */
function answerTerm(a: Answer): string | null {
  if (a.kind === 'number' && a.value !== null) return `(${fmt(a.value)})`;
  if (a.kind === 'fraction') return `(${a.negative ? '−' : ''}${frac(a.numerator, a.denominator, a.whole)})`;
  return null;
}

/** The expression with the answer in its gap holds: both sides of '=' have the same value. Null when the item has no such expression. */
export function expressionHolds(ex: Exercise): boolean | null {
  const shown = answerTerm(ex.answer);
  if (!ex.expression || !shown || !ex.expression.includes('\u25A1') || !ex.expression.includes(' = ')) return null;
  const [left, right] = ex.expression.replace('\u25A1', shown).split(' = ').map(evalTerm);
  return left !== null && right !== null && same(left, right);
}

/** Every item of every Stufe and AB: worked steps add up and state the result, at least two hints, and the checks above. */
export function checkAll(skill: SkillDef): void {
  for (const stufe of [1, 2, 3] as Stufe[]) {
    for (const ab of [1, 2, 3] as Ab[]) {
      for (const { ex } of items(skill, stufe, ab, 80)) {
        expect(wrongStepLines(ex)).toEqual([]);
        expect(missingResult(ex)).toEqual([]);
        expect(ex.hints.length, ex.key).toBeGreaterThanOrEqual(2);
        expect(hintStatesAnswer(ex)).toEqual([]);
        expect(singularProblems(ex)).toEqual([]);
        expect(spokenProblems(ex)).toEqual([]);
        expect(labelOverlaps(ex)).toEqual([]);
        const holds = expressionHolds(ex);
        if (holds !== null) expect(holds, `${ex.key}: ${ex.expression}`).toBe(true);
      }
    }
  }
}
