/**
 * Helpers of the topic 'prozent': a skill is a table of task forms per Stufe and AB (docs/research.md §6: the Stufe chooses the content, AB the demand inside it).
 * Pure; randomness only through the Rng parameter.
 */
import { fmt, NBSP } from '../../core/format';
import type { Ab, Bug, Cell, GenContext, NumberAnswer, Rng, SkillDef, Stufe, Visual } from '../../core/types';
import { build, numberBugs, speak, targetAb, type ExerciseBody, type MaybeBug } from '../shared';

/** A task without what the table fills in. srText defaults to the spoken task. */
export type Task = Omit<ExerciseBody, 'ab' | 'kmk' | 'srText'> & { srText?: string };
export type Form = (rng: Rng) => Task;
export type Forms = Readonly<Record<Stufe, Readonly<Record<Ab, readonly Form[]>>>>;

/** The generate() of a skill: its Stufe and AB pick the list of forms, the Rng one form of it. */
export function fromForms(id: string, kmk: string[], forms: Forms): SkillDef['generate'] {
  return (rng: Rng, stufe: Stufe, ctx: GenContext) => {
    const ab = targetAb(rng, stufe, ctx);
    const { srText, ...task } = rng.pick(forms[stufe][ab])(rng);
    const spoken = srText ?? speak([task.context, task.prompt, task.expression].filter(Boolean).join(' '));
    return build({ id, topicId: 'prozent' }, stufe, { ...task, ab, kmk, srText: spoken });
  };
}

/**
 * The places of an answer field: money always shows both ('6,00 €', T10, core fieldText). Everything else keeps the comma key but has a comma only where the value needs one: '12 Hefte', '37,5 %', '1,25'.
 * Never 2 for anything but money: fieldText would print '12,00 Hefte'.
 */
export const placesOf = (unit?: string): number => (unit === '€' ? 2 : 3);

/** Three decimal places at most, so that no float noise reaches a text or a comparison. */
export const r3 = (x: number): number => Math.round(x * 1000) / 1000;

/** A number answer with a unit. */
export function num(value: number | null, unit?: string, decimals?: number): NumberAnswer {
  return { kind: 'number', value, ...(unit ? { unit } : {}), ...(decimals ? { decimals } : {}) };
}

/** A value that fits three decimal places, otherwise NaN, which fitBugs drops: a bug matches only what computes exactly (§5). */
export const exact = (x: number): number => (Math.abs(r3(x) - x) < 1e-9 ? r3(x) : NaN);

/** A number answer in its unit, with the places of that unit. */
export const quantity = (value: number | null, unit?: string): NumberAnswer => num(value, unit, placesOf(unit));

/** Number bugs a child can type in a field with `decimals` places: a value with more places would only get the parse message. */
export function fitBugs(bugs: MaybeBug[], correct: number | null, decimals = 0): Bug[] {
  const f = 10 ** decimals;
  return numberBugs(bugs.filter((b) => !b || typeof b.match !== 'number' || Math.abs(b.match * f - Math.round(b.match * f)) < 1e-6), correct);
}

/** A quantity in a text: money with two places where it has a comma ('8 €', '0,80 €'), everything else as it is. */
export function amount(value: number, unit: string): string {
  return `${unit === '€' && !Number.isInteger(value) ? fmt(value, 2) : fmt(value)}${NBSP}${unit}`;
}

/** The first `count` cells of a grid, row by row from the top left. */
export function firstCells(width: number, count: number): Cell[] {
  return Array.from({ length: count }, (_, i): Cell => [i % width, Math.floor(i / width)]);
}

/** Draws until the parameters fit, so that a rule such as 'the answer is not 100' stays in one place. A rule no draw can meet throws, so that the tests find it and no round hangs. */
export function drawUntil<T>(draw: () => T, ok: (value: T) => boolean): T {
  for (let i = 0; i < 2000; i++) {
    const value = draw();
    if (ok(value)) return value;
  }
  throw new RangeError('drawUntil: no draw fits');
}

/** 'Das Fahrrad' inside a sentence: 'das Fahrrad'. */
export const lower = (name: string): string => name.charAt(0).toLowerCase() + name.slice(1);

export const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));

/** Parts of a Prozentstreifen with percent labels: as few as hold the mark on a tick, otherwise 10, where the mark sits between two ticks. 20 parts leave the labels no room. */
export const barParts = (percent: number): number => [2, 4, 5, 10].find((t) => (percent * t) % 100 === 0) ?? 10;

/** The fewest parts with the mark on a tick, up to 20. The picture draws a value at the mark only on a tick; from 11 parts it can carry no percent labels. */
export const partsToMark = (percent: number): number => 100 / gcd(percent, 100);

/** The unit on the end label of a Prozentstreifen: a word such as 'Personen' runs out of the picture, and the task names it anyway. */
export const barUnit = (unit: string): { unit?: string } => (unit.length <= 2 ? { unit } : {});

/** The field of a number of cells: 20 is 5 × 4, 25 is 5 × 5, 50 is 10 × 5, 100 is the Hunderterfeld. */
export function field(total: number, filled: number): Extract<Visual, { type: 'grid' }> {
  const width = total === 20 || total === 25 ? 5 : 10;
  return { type: 'grid', width, height: total / width, cells: firstCells(width, filled) };
}
