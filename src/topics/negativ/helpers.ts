/**
 * Helpers of the topic 'negativ' (docs/research.md §6): the exercise frame, Zahlengeraden, thermometers, terms with signs and exact fractions. Pure; randomness only through the Rng parameter.
 */
import { fmt, fmtSigned, frac, fmtTemp, MINUS, speak } from '../../core/format';
import type { Ab, Bug, Exercise, FractionAnswer, NumberAnswer, NumberLineAnswer, SkillDef, Stufe, VisualOf } from '../../core/types';
import { build, fractionAnswer, fractionBugs, signedNumber, type ExerciseBody } from '../shared';

export const KMK_ZAHLEN = ['ZO.negative-zahlen'];
export const KMK_RECHNEN = ['ZO.negative-rechnen'];
/** Decimals and fractions with a sign (Stufe 3 of the optional skills and of negativ.zahlengerade). */
export const KMK_RATIONAL = ['ZO.rationale-zahlen'];

/** One item without the frame: `key` holds the form and its numbers; `kmk` adds to the skill's tags. */
export type Form = Omit<ExerciseBody, 'ab' | 'kmk'> & { kmk?: string[] };

/** The frame every item shares: the key is '<ab>:<form>:<numbers>' after the skill and Stufe parts. */
export function assemble(skill: Pick<SkillDef, 'id' | 'topicId'>, stufe: Stufe, ab: Ab, kmk: string[], form: Form): Exercise {
  const { key, kmk: extra, ...rest } = form;
  return build(skill, stufe, { key: `${ab}:${key}`, ab, kmk: extra ? [...kmk, ...extra] : kmk, ...rest });
}

export const bug = (id: string, match: Bug['match'], hint: string): Bug => ({ id, match, hint });

const closed = (part: string) => (/[.!?:,]$/.test(part.trim()) ? part.trim() : `${part.trim()}.`);

/** The spoken text of a task: operators and units spelled out, the places of a decimal one by one (T20), each part closed as a sentence; a bracket round a signed fraction is not said, a grouping bracket is. */
export function say(...parts: (string | undefined)[]): string {
  return speak(parts.filter((p): p is string => !!p).map(closed).join(' '))
    .replace(/\(\s*minus ([^()]*?)\s*\)/g, 'minus $1')
    .replace(/\(\s*/g, 'Klammer auf ')
    .replace(/\s*\)/g, ' Klammer zu')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Keeps a float from the integer steps it was computed in clean: 0.30000000000000004 → 0.3. */
export const clean = (x: number): number => Math.round(x * 1000) / 1000 + 0;

export type Op = '+' | '−';

export const apply = (a: number, op: Op, b: number): number => clean(op === '+' ? a + b : a - b);

/** 'a + (−b)', with the first number free of brackets (T11). */
export function term(a: number, op: Op, b: number): string {
  return `${fmt(a)} ${op} ${fmtSigned(b)}`;
}

/** The label of a jump on the line: '+ 8', '− 3'. */
export const jumpLabel = (d: number): string => (d >= 0 ? `+ ${fmt(d)}` : `${MINUS} ${fmt(-d)}`);

/** A number answer of a skill with keys.minus and keys.comma: signed and with places on every item, so neither key gives anything away (§7.2). The three places take any decimal the skill asks for. */
export const calcNumber = (value: number, rest: Omit<NumberAnswer, 'kind' | 'value' | 'signed' | 'decimals'> = {}): NumberAnswer => signedNumber(value, { decimals: 3, ...rest });

export const rightLeft = (d: number) => (d > 0 ? 'rechts' : 'links');

/** A worked step over the 0: the way to it and what is left after it. */
export const toZeroAndRest = (from: number, to: number): string => {
  const [way, rest] = [Math.abs(from), Math.abs(to)];
  return `Bis zur 0 ${way === 1 ? 'ist es' : 'sind es'} ${fmt(way)}. Dann ${rest === 1 ? 'bleibt' : 'bleiben'} noch ${fmt(rest)}.`;
};

// ─── Zahlengerade ────────────────────────────────────────────────────────────

export type Line = VisualOf<'numberLine'>;

/** A Zahlengerade with an arrowhead at both ends, labelled at the long ticks unless `labels` is given. */
export function line(min: number, max: number, majorStep: number, minorStep: number, extra: Partial<Line> = {}): Line {
  return { type: 'numberLine', min, max, majorStep, minorStep, labelMajor: !extra.labels, arrows: 'both', ...extra };
}

/** A Zahlengerade around these values and the 0 with a readable scale, for worked steps: long ticks are multiples of 5 steps, so the 0 gets its label. */
export function lineAround(values: readonly number[], extra: Partial<Line> = {}): Line {
  const low = Math.min(0, ...values);
  const high = Math.max(0, ...values);
  const span = Math.max(1, high - low);
  const minor = [1, 2, 5, 10, 20, 50, 100, 200, 500].find((s) => span / s <= 20) ?? 1000;
  const major = minor * 5;
  return line(Math.floor((low - minor) / major) * major, Math.ceil((high + minor) / major) * major, major, minor, extra);
}

/** How wide a mark's label is on the line (NumberLineVisual: viewBox 400, 340 of it for the axis, font size 20). */
const markWidth = (label: string) => label.length * 11.6 + 6;

/** A Zahlengerade for two labelled marks: around the 0 if their labels stay apart there, else a section close enough to tell them apart. */
export function lineForMarks(a: number, b: number): Line {
  const lo = Math.min(a, b);
  const hi = Math.max(a, b);
  const need = (markWidth(fmt(lo)) + markWidth(fmt(hi))) / 2 + 4;
  const apart = (l: Line) => ((hi - lo) / (l.max - l.min)) * 340 >= need;
  const around = lineAround([a, b]);
  const sections = [1, 2, 5, 10, 20, 50, 100].map((minor) => line(Math.floor(lo / (minor * 5)) * minor * 5, Math.ceil(hi / (minor * 5)) * minor * 5, minor * 5, minor));
  const axis = apart(around) ? around : (sections.find((l) => l.min < 0 && (l.max - l.min) / l.minorStep <= 20 && apart(l)) ?? around);
  return { ...axis, marks: [{ value: a, label: fmt(a) }, { value: b, label: fmt(b) }] };
}

/** The arrow is set on this line: the same axis as `v`. */
export function lineAnswer(value: number, v: Line): NumberLineAnswer {
  return {
    kind: 'numberline',
    min: v.min,
    max: v.max,
    majorStep: v.majorStep,
    minorStep: v.minorStep,
    step: v.minorStep,
    value,
    tolerance: 0,
    labelMajor: v.labelMajor,
    arrows: 'both',
    ...(v.labels ? { labels: v.labels } : {}),
    ...(v.denominator !== undefined ? { denominator: v.denominator } : {}),
    ...(v.labelFormat ? { labelFormat: v.labelFormat } : {}),
  };
}

/**
 * The picture in words for srText: the ends, the number of sections and the labels. A letter mark is told in sections from the nearest label on its left, never by its value, which is the answer of a
 * reading task. The value of a section stays out too. (With the word Zahlengerade in srText, src/ui/visuals/describe.ts adds no description of its own.)
 */
export function lineInWords(v: Pick<Line, 'min' | 'max' | 'majorStep' | 'minorStep' | 'labels' | 'marks' | 'denominator'>): string {
  const value = (position: number) => fmt(position / (v.denominator ?? 1));
  const sections = Math.round((v.max - v.min) / v.minorStep);
  const shown = v.labels ?? Array.from({ length: Math.round((v.max - v.min) / v.majorStep) + 1 }, (_, i) => v.min + i * v.majorStep);
  const labels = v.labels
    ? `Beschriftet sind nur ${shown.map(value).join(' und ').replace(/ und (?=.* und )/g, ', ')}.`
    : `Die Beschriftung geht in Schritten von ${value(v.majorStep)}.`;
  const marks = (v.marks ?? []).filter((m) => /^[A-Z]$/.test(m.label)).map((m) => {
    const from = [...shown].reverse().find((n) => n <= m.value) ?? v.min;
    const count = Math.round((m.value - from) / v.minorStep);
    return count === 0 ? `Pfeil ${m.label} steht genau bei ${value(from)}.` : `Pfeil ${m.label}: ${count} ${count === 1 ? 'Abschnitt' : 'Abschnitte'} rechts von ${value(from)}.`;
  });
  return [`Zahlengerade von ${value(v.min)} bis ${value(v.max)} mit ${sections} gleichen Abschnitten.`, labels, ...marks].join(' ');
}

// ─── Thermometer ─────────────────────────────────────────────────────────────

/**
 * A thermometer that holds these values and the 0, with at most 30 ticks for a phone. ThermometerVisual labels every tick, every 2nd (16 to 21 ticks) or every 5th, counted from the lower end: an end on
 * a multiple of 5, and on an even tick for every 2nd label, puts the labels on round values.
 */
export function thermometerFor(values: readonly number[], value: number, change?: number): VisualOf<'thermometer'> {
  const low = Math.min(0, ...values) - 2;
  const high = Math.max(0, ...values) + 2;
  const scale = (step: number) => {
    const min = Math.floor(low / (5 * step)) * 5 * step;
    const max = Math.ceil(high / step) * step;
    const count = (max - min) / step;
    return { min: count > 15 && count < 22 && (min / step) % 2 !== 0 ? min - 5 * step : min, max, step };
  };
  const { min, max, step } = [1, 2, 5].map(scale).find((s) => (s.max - s.min) / s.step <= 30) ?? scale(10);
  return { type: 'thermometer', min, max, step, value, unit: '°C', ...(change !== undefined ? { change } : {}) };
}

/** The thermometer in words for srText: the level in ticks from the lower end, never its value. */
export function thermometerInWords(v: Pick<VisualOf<'thermometer'>, 'min' | 'max' | 'step' | 'value'>): string {
  const ticks = Math.round((v.value - v.min) / v.step);
  return `Thermometer von ${fmtTemp(v.min)} bis ${fmtTemp(v.max)}, ein Strich zählt ${fmt(v.step)} Grad. Der Stand liegt ${ticks} ${ticks === 1 ? 'Strich' : 'Striche'} über dem unteren Ende.`;
}

// ─── Exact fractions ─────────────────────────────────────────────────────────

/** A signed fraction in lowest terms: n carries the sign, d > 0. */
export interface Rat {
  n: number;
  d: number;
}

const gcd = (a: number, b: number): number => (b === 0 ? Math.abs(a) : gcd(b, a % b));

export function rat(n: number, d: number): Rat {
  const g = gcd(n, d) || 1;
  const sign = d < 0 ? -1 : 1;
  return { n: (sign * n) / g + 0, d: (sign * d) / g };
}

export const ratAdd = (a: Rat, b: Rat): Rat => rat(a.n * b.d + b.n * a.d, a.d * b.d);
export const ratNeg = (a: Rat): Rat => rat(-a.n, a.d);
export const ratSub = (a: Rat, b: Rat): Rat => ratAdd(a, ratNeg(b));
export const ratMul = (a: Rat, b: Rat): Rat => rat(a.n * b.n, a.d * b.d);
export const ratDiv = (a: Rat, b: Rat): Rat => rat(a.n * b.d, a.d * b.n);
export const isWhole = (a: Rat): boolean => a.d === 1;

/** '−{frac:1 1/4}', '{frac:3/4}', '2': as a child reads the value. */
export function ratText(a: Rat): string {
  const abs = Math.abs(a.n);
  const sign = a.n < 0 ? MINUS : '';
  if (a.d === 1) return `${sign}${fmt(abs)}`;
  return abs > a.d ? `${sign}${frac(abs % a.d, a.d, Math.floor(abs / a.d))}` : `${sign}${frac(abs, a.d)}`;
}

/** As ratText, in brackets when negative: the second operand of a term (T11). */
export const ratTerm = (a: Rat): string => (a.n < 0 ? `(${ratText(a)})` : ratText(a));

/** The answer in the form a child writes; the keys of a skill with signs and mixed numbers stay on for every value, and 11/4 and 2 3/4 both count. */
export function ratAnswer(a: Rat, rest: Partial<Pick<FractionAnswer, 'accept' | 'before' | 'after' | 'unit'>> = {}): FractionAnswer {
  const abs = Math.abs(a.n);
  const mixed = abs > a.d && a.d > 1;
  return fractionAnswer(mixed ? abs % a.d : abs, a.d, {
    allowNegative: true,
    allowMixed: true,
    ...(a.n < 0 ? { negative: true } : {}),
    ...(mixed ? { whole: Math.floor(abs / a.d) } : {}),
    ...rest,
  });
}

/** A bug on the form the child wrote, unreduced as the wrong rule gives it. */
export interface FractionSlip {
  id: string;
  numerator: number;
  denominator: number;
  /** The Ganze of a slip written as a mixed or whole number. */
  whole?: number;
  negative: boolean;
  hint: string;
}

/**
 * Bugs of a fraction answer. A slip with the value of the answer falls away, whatever its sign: a wrong sign alone cannot be a Bug yet (fractionBugs and the shared suite compare without the sign), so it gets
 * the general hints.
 */
export function ratBugs(slips: FractionSlip[], answer: Rat): Bug[] {
  const magnitude = (s: FractionSlip) => (s.whole ?? 0) * s.denominator + s.numerator;
  const kept = slips.filter((s) => s.denominator > 0 && s.numerator >= 0 && !(magnitude(s) === 0 && s.negative) && magnitude(s) * answer.d !== Math.abs(answer.n) * s.denominator);
  return fractionBugs(
    kept.map((s) => bug(s.id, { numerator: s.numerator, denominator: s.denominator, ...(s.whole !== undefined ? { whole: s.whole } : {}), negative: s.negative ? 1 : 0 }, s.hint)),
    { numerator: Math.abs(answer.n), denominator: answer.d },
  );
}

/** Digits after the comma as the units of a number: tenths to the value, 25 with 1 place is 2,5. */
export const fromUnits = (units: number, places: number): number => clean(units / 10 ** places);
