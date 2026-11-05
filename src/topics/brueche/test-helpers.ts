/** Test support of the topic 'brueche' (imported only by *.test.ts): samples per Stufe and AB, and independent readers of the task text. */
import { expect } from 'vitest';
import { DEFAULT_CONTEXT } from '../../core/generate';
import { createRng } from '../../core/rng';
import type { Ab, Exercise, SkillDef, Stufe } from '../../core/types';
import { taskSpeech } from '../../ui/practice/readAloud';
import { checkWorkedSolution } from '../step-check';

export const STUFEN_ALL = [1, 2, 3] as Stufe[];
export const ABS_ALL = [1, 2, 3] as Ab[];

export function items(skill: SkillDef, stufe: Stufe, ab: Ab, n = 200): Exercise[] {
  return Array.from({ length: n }, (_, i) => skill.generate(createRng(i * 2053 + stufe * 7 + ab), stufe, { ...DEFAULT_CONTEXT, ab }));
}

export function everyItem(skill: SkillDef, n = 120): Exercise[] {
  return STUFEN_ALL.flatMap((s) => ABS_ALL.flatMap((a) => items(skill, s, a, n)));
}

/** The form of an item: the first part of its key after the skill and the Stufe. */
export const formOf = (ex: Exercise) => ex.key.split(':')[2];

/** What a child sees of a task; the order of its options or order items does not make it another task. */
function shownTask(ex: Exercise): string {
  const a = ex.answer;
  const options = a.kind === 'choice' ? a.options.map((o) => JSON.stringify([o.label, o.visual ?? null])).sort() : a.kind === 'order' ? [...a.items].sort() : a.kind === 'numberline' ? [JSON.stringify([a.max, a.majorStep, a.minorStep, a.denominator])] : [];
  return JSON.stringify([ex.context, ex.prompt, ex.expression, ex.visual, options]);
}

/** Tasks that look the same under two keys at one Stufe: generateUnique avoids repeats by key alone, so a round could show them twice. */
export function sameTaskTwoKeys(skill: SkillDef, n = 300): string[] {
  const out: string[] = [];
  for (const stufe of STUFEN_ALL) {
    const keyOf = new Map<string, string>();
    for (const ab of ABS_ALL) {
      for (const ex of items(skill, stufe, ab, n)) {
        const task = shownTask(ex);
        const known = keyOf.get(task);
        if (known !== undefined && known !== ex.key) out.push(`${known} and ${ex.key}`);
        keyOf.set(task, ex.key);
      }
    }
  }
  return out;
}

/** All fractions of a text as [Zähler, Nenner], a mixed number counted in its Nenner: '{frac:1 3/4}' → [7, 4]. */
export function fractionsIn(text: string): [number, number][] {
  return [...text.matchAll(/\{frac:(?:(\d+) )?(\d+)\/(\d+)\}/g)].map((m) => [(m[1] ? Number(m[1]) * Number(m[3]) : 0) + Number(m[2]), Number(m[3])]);
}

/** The plain whole numbers of a text, fractions left out. */
export const wholeNumbersIn = (text: string) => [...text.replace(/\{frac:[^}]*\}/g, ' ').matchAll(/\d+/g)].map((m) => Number(m[0]));

/** The value of a fraction answer as [Zähler, Nenner], a Ganze counted in its Nenner. */
export function valueOf(answer: Exercise['answer']): [number, number] {
  if (answer.kind !== 'fraction') throw new Error(`no fraction answer: ${answer.kind}`);
  return [(answer.whole ?? 0) * answer.denominator + answer.numerator, answer.denominator];
}

/** a/b = c/d, in integers. */
export const sameValue = (a: readonly [number, number], b: readonly [number, number]) => a[0] * b[1] === b[0] * a[1];

/** 1/2 said in a form no sentence of this topic can use. */
const WRONG_HALF = /\bein Halb (einer|eines|einem|derselben|desselben|Pizza|Kilometer|Liter|Meter)\b|\bein halber\b|\bmit ein Halb\b/;

/** The worked steps calculate correctly, the same task never comes under two keys, 1/2 is said in the form its sentence needs, by the voice and in srText, and no Fachwort without a gloss stands in the texts. */
export function expectSoundItems(skill: SkillDef): void {
  expect(Object.values(skill.stufen).join(' ')).not.toMatch(/Stammbr/);
  for (const ex of everyItem(skill, 300)) {
    expect(checkWorkedSolution(ex)).toEqual([]);
    expect(ex.srText, ex.key).not.toMatch(WRONG_HALF);
    expect(taskSpeech(ex, ex.hints), ex.key).not.toMatch(WRONG_HALF);
    expect(JSON.stringify(ex), ex.key).not.toMatch(/Stammbr/);
  }
  expect(sameTaskTwoKeys(skill)).toEqual([]);
}

/** A reasoning form: its right option depends on the numbers, in text and in place, so a child who has seen one item cannot tap the same answer. */
export function expectAnswerFollowsNumbers(samples: readonly Exercise[], minLabels: number): void {
  const choices = samples.flatMap((ex) => (ex.answer.kind === 'choice' ? [ex.answer] : []));
  expect(choices.length).toBeGreaterThan(20);
  expect(new Set(choices.map((a) => a.options[a.correct].label)).size).toBeGreaterThanOrEqual(minLabels);
  expect(new Set(choices.map((a) => a.correct)).size).toBeGreaterThan(1);
}
