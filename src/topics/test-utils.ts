/** Test support (imported only by *.test.ts). */
import { DEFAULT_CONTEXT } from '../core/generate';
import { createRng } from '../core/rng';
import type { Exercise, GenContext, SkillDef, Stufe } from '../core/types';

export const CTX: GenContext = DEFAULT_CONTEXT;

/** n exercises of one Stufe (seeds differ from the shared suite's seeds). */
export function samples(skill: SkillDef, stufe: Stufe, n = 300): Exercise[] {
  return Array.from({ length: n }, (_, i) => skill.generate(createRng(i * 7717 + 13 + stufe), stufe, CTX));
}

/** Cent value of a money string, with comma or in mixed notation: '3,40 €' or '3 € 40 ct' → 340. */
export function cents(text: string): number {
  const comma = /(\d+),(\d{2})[\s\u00A0]*€/.exec(text);
  if (comma) return Number(comma[1]) * 100 + Number(comma[2]);
  const euro = /(\d+)[\s\u00A0]*€/.exec(text);
  const ct = /(\d+)[\s\u00A0]*ct/.exec(text);
  return (euro ? Number(euro[1]) * 100 : 0) + (ct ? Number(ct[1]) : 0);
}

/** Minutes since midnight for every 'HH.MM Uhr' in a text. */
export function times(text: string): number[] {
  return [...text.matchAll(/(\d{1,2})[.:](\d\d)\u00A0Uhr/g)].map((m) => Number(m[1]) * 60 + Number(m[2]));
}
