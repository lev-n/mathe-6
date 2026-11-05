/** Test support of the topic 'prozent' (imported only by *.test.ts): checks that every skill of the topic owes, over all Stufen and AB levels. */
import { formatAnswer } from '../../core/check';
import { createRng } from '../../core/rng';
import { FRAC_TOKEN } from '../../core/format';
import type { Ab, Exercise, SkillDef, Stufe } from '../../core/types';
import { CTX } from '../test-utils';

/** n items of each Stufe and AB. */
export function allItems(skill: SkillDef, n = 150): Exercise[] {
  const out: Exercise[] = [];
  for (const stufe of [1, 2, 3] as Stufe[]) {
    for (const ab of [1, 2, 3] as Ab[]) {
      for (let i = 0; i < n; i++) out.push(skill.generate(createRng(i * 9973 + stufe * 101 + ab), stufe, { ...CTX, ab }));
    }
  }
  return out;
}

/** The items of one Stufe and AB. */
export function itemsAt(skill: SkillDef, stufe: Stufe, ab: Ab, n = 300): Exercise[] {
  return Array.from({ length: n }, (_, i) => skill.generate(createRng(i * 9973 + stufe * 101 + ab), stufe, { ...CTX, ab }));
}

/** Solutions with a false ',00' on what is no money: '320,00 Personen', '70,00 %', Faktor '6,00'. */
export function falseDecimals(items: readonly Exercise[]): string[] {
  return items.flatMap((ex) => {
    const text = formatAnswer(ex.answer);
    return /,00(?![\s\u00A0]*€)/.test(text.replace(/,00[\s\u00A0]*€/g, '')) ? [`${ex.key}: ${text}`] : [];
  });
}

/** The numbers a task states as quantities. No fraction (1/10 is 10 % by the conversion that is asked), no Maßstab (1 : 100) and no name of a class (6a). */
function numbersOfTask(ex: Exercise): number[] {
  const text = [ex.context, ex.prompt, ex.expression].filter(Boolean).join(' ').replace(FRAC_TOKEN, '#').replace(/[\u202F\u2009]/g, '').replace(/1 : \d+/g, '#');
  return [...text.matchAll(/\d+(?:,\d+)?(?![\d\p{L}])/gu)].map((m) => Number(m[0].replace(',', '.')));
}

/** Tasks whose number answer is a number they print, so that copying is right: 25 % von 100 km, 8 cm at 1 : 100 as 8 m. */
export function answerInTask(items: readonly Exercise[]): string[] {
  return items.flatMap((ex) => (ex.answer.kind === 'number' && ex.answer.value !== null && numbersOfTask(ex).includes(ex.answer.value) ? [`${ex.key}: ${[ex.context, ex.prompt].filter(Boolean).join(' ')}`] : []));
}

/**
 * Prozentstreifen that say more or less than the task, or do not fit: a percent scale around a sought percent is the answer with a gap; percent labels on 20 parts overlap; a word as the unit at the
 * end runs out of the picture.
 */
export function barProblems(items: readonly Exercise[]): string[] {
  return items.flatMap((ex) => {
    const v = ex.visual;
    if (v?.type !== 'percentBar') return [];
    const out: string[] = [];
    if (v.unknown === 'p' && v.labels !== 'value') out.push(`${ex.key}: a percent scale around the sought percent`);
    if (v.ticks > 10 && v.labels !== 'value') out.push(`${ex.key}: percent labels on ${v.ticks} parts`);
    if ((v.unit ?? '').length > 2) out.push(`${ex.key}: the end label ${v.unit}`);
    return out;
  });
}
