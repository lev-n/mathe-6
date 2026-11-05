/**
 * Generic helpers for the generators of every topic: bug lists, choice and order answers, hint safety, spoken text,
 * small grammar helpers, the exercise builder and first names. Topics import from here, never from another topic's
 * directory (src/topics/contract.test.ts). Pure functions only (no React, randomness only through the Rng parameter).
 */
import { drawAb } from '../core/age';
import { fmt } from '../core/format';
import type { Ab, Answer, Bug, ChoiceAnswer, ChoiceOption, Exercise, FractionAnswer, GenContext, MultiField, NumberAnswer, OrderAnswer, Rng, SkillDef, Stufe, WrittenAnswer } from '../core/types';
import { correctDecimalResult, shiftedDivision } from '../core/written';

// ─── Numbers ─────────────────────────────────────────────────────────────────

/** true if a child can type x: a number with at most three decimal places, ≥ 0 unless the field is signed. */
function typeable(x: number, signed = false): boolean {
  return Number.isFinite(x) && (signed || x >= 0) && Math.abs(x * 1000 - Math.round(x * 1000)) < 1e-9;
}

// ─── AB level ────────────────────────────────────────────────────────────────

/**
 * The AB level a generator builds for: GenContext.ab when the round planned one, otherwise a draw with the weights of the Stufe's AB mix
 * (worksheets). Set Exercise.ab to this value.
 *
 * The Stufe chooses the content: the S1, S2, S3 cells of the catalogue (docs/research.md §6) and SkillDef.stufen. AB varies the demand inside that
 * Stufe: AB I is the most direct form of the Stufe's content, AB II a less direct form or harder numbers, AB III reversed, reasoning or the hardest
 * numbers, still inside the Stufe's scope. Never select forms by AB alone: every item of a round fits its Stufe label, and Stufe 3 is harder than
 * Stufe 2 and Stufe 2 harder than Stufe 1 at every AB. The shared suite measures this (describeSkill): with the same seed and AB, at least half of
 * the items differ between Stufe 1 and Stufe 3.
 */
export function targetAb(rng: Rng, stufe: Stufe, ctx: Pick<GenContext, 'ab'>): Ab {
  return ctx.ab ?? drawAb(rng, stufe);
}

// ─── Bugs ────────────────────────────────────────────────────────────────────

export type MaybeBug = Bug | null | undefined | false;

/**
 * Keep only bugs that make sense for a number answer: typeable, different from the correct value and from earlier bugs.
 * signed: negative values are typeable too (pass it for an answer with `signed`).
 */
export function numberBugs(bugs: MaybeBug[], correct: number | null, signed = false): Bug[] {
  const out: Bug[] = [];
  const seen = new Set<number>();
  for (const b of bugs) {
    if (!b || typeof b.match !== 'number') continue;
    if (!typeable(b.match, signed)) continue;
    const m = b.match;
    if (m === correct) continue;
    if (seen.has(m)) continue;
    seen.add(m);
    out.push(b);
  }
  return out;
}

/** Same for multi answers: every matched field exists, values are typeable, and at least one field differs. */
export function multiBugs(bugs: MaybeBug[], fields: MultiField[]): Bug[] {
  const out: Bug[] = [];
  const seen = new Set<string>();
  for (const b of bugs) {
    if (!b || typeof b.match !== 'object' || Array.isArray(b.match)) continue;
    const m = b.match;
    const keys = Object.keys(m);
    if (keys.length === 0) continue;
    let ok = true;
    let differs = false;
    for (const k of keys) {
      const f = fields.find((x) => x.id === k);
      if (!f || !typeable(m[k], f.signed)) ok = false;
      else if (m[k] !== f.value) differs = true;
    }
    if (!ok || !differs) continue;
    const sig = JSON.stringify(fields.map((f) => (f.id in m ? m[f.id] : f.value)));
    if (seen.has(sig)) continue;
    seen.add(sig);
    out.push(b);
  }
  return out;
}

/** Keep only bugs that make sense for a fraction answer: both parts given, a Nenner above 0, not the answer itself, no repeats. */
export function fractionBugs(bugs: MaybeBug[], correct: { numerator: number; denominator: number; whole?: number }): Bug[] {
  const sig = (m: { numerator: number; denominator: number; whole?: number }) => `${m.whole ?? ''}|${m.numerator}/${m.denominator}`;
  const seen = new Set<string>([sig(correct)]);
  const out: Bug[] = [];
  for (const b of bugs) {
    if (!b || typeof b.match !== 'object' || Array.isArray(b.match)) continue;
    const m = b.match;
    if (!Number.isInteger(m.numerator) || !Number.isInteger(m.denominator) || m.numerator < 0 || m.denominator <= 0) continue;
    const part = { numerator: m.numerator, denominator: m.denominator, ...(m.whole !== undefined ? { whole: m.whole } : {}) };
    if (seen.has(sig(part))) continue;
    seen.add(sig(part));
    out.push(b);
  }
  return out;
}

/** Keep only bugs that make sense for a point answer: inside the grid, not the target, no repeats. */
export function pointBugs(bugs: MaybeBug[], answer: Extract<Answer, { kind: 'point' }>): Bug[] {
  const sig = (x: number, y: number) => `${x}|${y}`;
  const seen = new Set<string>((answer.targets ?? [answer.target]).map(([x, y]) => sig(x, y)));
  const out: Bug[] = [];
  for (const b of bugs) {
    if (!b || typeof b.match !== 'object' || Array.isArray(b.match)) continue;
    const { x, y } = b.match;
    if (x === undefined || y === undefined || x < answer.xMin || x > answer.xMax || y < answer.yMin || y > answer.yMax) continue;
    if (seen.has(sig(x, y))) continue;
    seen.add(sig(x, y));
    out.push(b);
  }
  return out;
}

// ─── Answers ─────────────────────────────────────────────────────────────────

/** A signed number answer: every item of a skill with keys.minus uses this, even when the result is positive (§6). */
export function signedNumber(value: number, rest: Omit<NumberAnswer, 'kind' | 'value' | 'signed'> = {}): NumberAnswer {
  return { kind: 'number', value, signed: true, ...rest };
}

/** A fraction answer: `accept` is 'lowest' unless stated; numerator and denominator are the value as a child would write it. */
export function fractionAnswer(numerator: number, denominator: number, rest: Partial<Omit<FractionAnswer, 'kind' | 'numerator' | 'denominator'>> = {}): FractionAnswer {
  return { kind: 'fraction', numerator, denominator, accept: 'lowest', ...rest };
}

/**
 * A written answer with decimals: pass the operands as integers and their places, and the integer result in units of writtenPlaces() comes out (§6). writtenDecimal('add', [35, 125], [1, 2]) is 3,5 + 1,25,
 * with result 475. A division must end, and that is checked here: pass 7,50 : 2 as [750, 2], [2, 0] when the quotient needs the place.
 */
export function writtenDecimal(op: WrittenAnswer['op'], operands: number[], decimalPlaces: number[], rest: Partial<Pick<WrittenAnswer, 'method' | 'ueberschlag'>> = {}): WrittenAnswer {
  if (op === 'div') {
    const { dividend, divisor } = shiftedDivision(operands, decimalPlaces);
    if (dividend % divisor !== 0) throw new RangeError(`writtenDecimal: ${dividend} : ${divisor} does not end at these places`);
  }
  return { kind: 'written', op, operands, decimalPlaces, result: correctDecimalResult(op, operands, decimalPlaces), ...rest };
}

/** Order answer for distinct numbers, shown shuffled (never already in the target order). */
export function orderAnswer(rng: Rng, values: number[], direction: 'aufsteigend' | 'absteigend'): OrderAnswer {
  const sorted = [...values].sort((a, b) => (direction === 'aufsteigend' ? a - b : b - a));
  let shown = rng.shuffle(values);
  if (shown.every((v, i) => v === sorted[i])) shown = [...shown.slice(1), shown[0]];
  return {
    kind: 'order',
    items: shown.map((v) => fmt(v)),
    correct: sorted.map((v) => shown.indexOf(v)),
    direction,
  };
}

export interface ChoiceOpts {
  layout?: ChoiceAnswer['layout'];
  /** Total number of options (default 4). */
  max?: number;
  /** Keep this fixed label order instead of shuffling (e.g. ['<', '>', '=']). */
  order?: string[];
}

/** Build a choice answer: de-duplicates labels, caps the count, shuffles with rng. */
export function makeChoice(rng: Rng, correct: ChoiceOption, wrongs: ChoiceOption[], opts: ChoiceOpts = {}): ChoiceAnswer {
  const seen = new Set<string>([correct.label]);
  const ws: ChoiceOption[] = [];
  for (const w of wrongs) {
    if (seen.has(w.label)) continue;
    seen.add(w.label);
    ws.push(w);
  }
  const chosen = ws.slice(0, (opts.max ?? 4) - 1);
  const right: ChoiceOption = { label: correct.label, ...(correct.visual ? { visual: correct.visual } : {}) };
  let all: ChoiceOption[];
  if (opts.order) {
    const pool = [right, ...chosen];
    all = opts.order.map((l) => pool.find((o) => o.label === l)).filter((o): o is ChoiceOption => !!o);
  } else {
    all = rng.shuffle([right, ...chosen]);
  }
  const answer: ChoiceAnswer = { kind: 'choice', options: all, correct: all.indexOf(right) };
  if (opts.layout) answer.layout = opts.layout;
  return answer;
}

/** The Probe of a division with Rest: probeLine(3, 5, 2) → '3 · 5 + 2 = 17'. */
export function probeLine(quotient: number, divisor: number, rest: number): string {
  return `${quotient} · ${divisor} + ${rest} = ${quotient * divisor + rest}`;
}

// ─── Hints ───────────────────────────────────────────────────────────────────

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** true if `text` contains the number `shown` as a whole number (not as part of a longer one). */
export function mentionsNumber(text: string, shown: string): boolean {
  return new RegExp(`(?<!\\d)${escapeRe(shown)}(?!\\d)`).test(text);
}

/**
 * Hints must never give the answer away. Drops hints that mention the answer
 * (≥ 100: any occurrence, as the shared test suite checks; 10–99: as a whole number).
 */
export function safeHints(hints: string[], value: number | null | undefined, fallback: string): string[] {
  if (value === null || value === undefined || Math.abs(value) < 10) return hints.length ? hints : [fallback];
  const form = fmt(value);
  const strict = Math.abs(value) >= 100;
  const ok = hints.filter((h) => !(strict ? h.includes(form) : mentionsNumber(h, form)));
  return ok.length ? ok : [fallback];
}

// ─── Speech ──────────────────────────────────────────────────────────────────

export { speak } from '../core/format';

// ─── Small grammar helpers ───────────────────────────────────────────────────

/** Singular for exactly 1, plural otherwise: plural(1, 'Stunde', 'Stunden') → 'Stunde'. */
export function plural(n: number, one: string, many: string): string {
  return n === 1 ? one : many;
}

/** German list: ['a', 'b', 'c'] → 'a, b und c'. */
export function joinDe(items: readonly string[]): string {
  if (items.length <= 1) return items.join('');
  return `${items.slice(0, -1).join(', ')} und ${items[items.length - 1]}`;
}

// ─── Exercise builder ────────────────────────────────────────────────────────

export type ExerciseBody = Omit<Exercise, 'topicId' | 'skillId' | 'stufe'>;

/** Fill in topic/skill/stufe and prefix the key with '<skillId>:<stufe>:'. */
export function build(skill: Pick<SkillDef, 'id' | 'topicId'>, stufe: Stufe, body: ExerciseBody): Exercise {
  const { key, ...rest } = body;
  const ex: Exercise = { key: `${skill.id}:${stufe}:${key}`, topicId: skill.topicId, skillId: skill.id, stufe, ...rest };
  if (ex.bugs && ex.bugs.length === 0) delete ex.bugs;
  return ex;
}

// ─── Names (T14: varied names of everyday German classes) ─────────────────────

export interface Person {
  name: string;
  /** 'sie' or 'er' */
  p: 'sie' | 'er';
}

export const PEOPLE: readonly Person[] = [
  { name: 'Tom', p: 'er' }, { name: 'Mia', p: 'sie' }, { name: 'Ali', p: 'er' }, { name: 'Lea', p: 'sie' },
  { name: 'Ben', p: 'er' }, { name: 'Ida', p: 'sie' }, { name: 'Emil', p: 'er' }, { name: 'Lena', p: 'sie' },
  { name: 'Finn', p: 'er' }, { name: 'Nele', p: 'sie' }, { name: 'Paul', p: 'er' }, { name: 'Elif', p: 'sie' },
  { name: 'Can', p: 'er' }, { name: 'Sara', p: 'sie' }, { name: 'Omar', p: 'er' }, { name: 'Lina', p: 'sie' },
  { name: 'Emre', p: 'er' }, { name: 'Sofia', p: 'sie' }, { name: 'Noah', p: 'er' },
];

export function pickPerson(rng: Rng): Person {
  return rng.pick(PEOPLE);
}

/** Two different people. */
export function pickTwo(rng: Rng): [Person, Person] {
  const [a, b] = rng.sample(PEOPLE, 2);
  return [a, b];
}

