/** Test support of the topic 'flaechen' (imported only by *.test.ts). */
import { DEFAULT_CONTEXT } from '../../core/generate';
import { createRng } from '../../core/rng';
import { AB_MIX } from '../../core/age';
import { fmt } from '../../core/format';
import type { Ab, Exercise, SkillDef, Stufe } from '../../core/types';
import { STUFEN } from '../../core/types';

/** Items of every Stufe and AB. */
export function allItems(skill: SkillDef, perCell = 60): Exercise[] {
  const out: Exercise[] = [];
  for (const stufe of STUFEN as readonly Stufe[]) {
    for (const ab of [1, 2, 3] as Ab[]) {
      for (let seed = 1; seed <= perCell; seed++) out.push(skill.generate(createRng(seed * 8831 + stufe * 13 + ab), stufe, { ...DEFAULT_CONTEXT, ab }));
    }
  }
  return out;
}

/** The items of one Stufe and AB. */
export function cellItems(skill: SkillDef, stufe: Stufe, ab: Ab, samples = 400): Exercise[] {
  return Array.from({ length: samples }, (_, i) => skill.generate(createRng((i + 1) * 6113 + stufe * 17 + ab), stufe, { ...DEFAULT_CONTEXT, ab }));
}

/** Slots of an AB in a round of a Stufe. */
export const slotsOf = (stufe: Stufe, ab: Ab) => AB_MIX[stufe][ab - 1];

/** Cells of a skill with fewer than `perSlot` distinct items for each slot they get in a round, so that a second round would meet the first again. */
export function thinCells(skill: SkillDef, perSlot = 3): string[] {
  return (STUFEN as readonly Stufe[]).flatMap((stufe) => ([1, 2, 3] as Ab[]).flatMap((ab) => {
    const distinct = new Set(cellItems(skill, stufe, ab).map((ex) => ex.key)).size;
    return distinct < perSlot * slotsOf(stufe, ab) ? [`Stufe ${stufe} AB ${ab}: ${distinct} items for ${slotsOf(stufe, ab)} slots`] : [];
  }));
}

/** The value of a number answer. */
export function numberOf(ex: Exercise): number {
  if (ex.answer.kind !== 'number' || ex.answer.value === null) throw new Error(`${ex.key}: no number answer`);
  return ex.answer.value;
}

/** The value of a field of a multi answer. */
export function fieldOf(ex: Exercise, id: string): number {
  if (ex.answer.kind !== 'multi') throw new Error(`${ex.key}: no multi answer`);
  const field = ex.answer.fields.find((f) => f.id === id);
  if (!field) throw new Error(`${ex.key}: no field ${id}`);
  return field.value;
}

/** The label of the correct option. */
export function correctLabel(ex: Exercise): string {
  if (ex.answer.kind !== 'choice') throw new Error(`${ex.key}: no choice answer`);
  return ex.answer.options[ex.answer.correct].label;
}

/** The value of a term as a choice label writes it: '3 · 4 + 2 · 5', '8 · 6 − 2 · 3'. */
export function termValue(term: string): number {
  return term.split(/ (?=[+−])/).reduce((sum, part) => {
    const negative = part.startsWith('−');
    const product = part.replace(/^[+−] /, '').split(' · ').reduce((p, n) => p * Number(n), 1);
    return negative ? sum - product : sum + product;
  }, 0);
}

/** The task prints its own number answer: nothing is left to work out once the child sees it, whatever the demand was meant to be. A number of a group ('42 000') does not count as 42. */
export function printsAnswer(ex: Exercise): boolean {
  if (ex.answer.kind !== 'number' || ex.answer.value === null) return false;
  const shown = fmt(ex.answer.value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(?<![\\d,\u202F\u2009\u00A0])${shown}(?![\\d]|,\\d|[\u202F\u2009\u00A0]\\d)`).test([ex.context, ex.prompt, ex.expression].filter(Boolean).join(' '));
}

/** A number as the keys and labels write it: '2,5' → 2.5, '12 500' → 12500. */
export const parseDe = (text: string) => Number(text.replace(/[\s  ]/g, '').replace(',', '.'));
