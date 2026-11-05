import { describe, expect, it } from 'vitest';
import { describeSkill } from '../../core/testing';
import { checkWorkedSolution } from '../step-check';
import { kennwerteSkill } from './kennwerte';
import { atAb, chosen, formOf, giveaways, keyClashes, number, picturesNotSaid, pluralSlips, speechSlips } from './testHelpers';

describeSkill(kennwerteSkill, { minDistinct: 40 });

function rows(ex: { visual?: unknown }): string[][] {
  return (ex.visual as { rows: string[][] }).rows;
}
const data = (ex: { visual?: unknown }) => rows(ex).map((r) => Number(r[1]));
const asc = (values: number[]) => [...values].sort((a, b) => a - b);

describe('daten.kennwerte', () => {
  it('Stufe 1: Minimum and Maximum of at most 8 values', () => {
    for (const ab of [1, 2, 3] as const) {
      for (const ex of atAb(kennwerteSkill, 1, ab)) {
        const d = data(ex);
        expect(d.length).toBeLessThanOrEqual(8);
        const wantMax = (ex.prompt + ex.key).includes('Maximum');
        if (formOf(ex) === 'wer') {
          const i = rows(ex).findIndex((r) => r[0] === chosen(ex).label);
          expect(d[i]).toBe(wantMax ? Math.max(...d) : Math.min(...d));
          continue;
        }
        const extra = formOf(ex) === 'dazu' ? Number(/Wert (\d+)/.exec(ex.context!)![1]) : undefined;
        const all = extra === undefined ? d : [...d, extra];
        expect(number(ex)).toBe(wantMax ? Math.max(...all) : Math.min(...all));
        expect(checkWorkedSolution(ex)).toEqual([]);
      }
    }
  });

  it('Stufe 1, AB III: who comes along is not in the table yet', () => {
    for (const ex of atAb(kennwerteSkill, 1, 3, 400)) {
      const name = ex.context!.split(' ')[0];
      expect(rows(ex).map((r) => r[0]), ex.key).not.toContain(name);
    }
  });

  it('Stufe 3, AB III: the changed Median recomputes for every option, and no label is the answer every time', () => {
    const labels = new Set<string>();
    const prompts = new Set<string>();
    let seen = 0;
    for (const ex of atAb(kennwerteSkill, 3, 3, 400)) {
      if (formOf(ex) !== 'stabil') continue;
      if (ex.answer.kind !== 'choice') throw new Error('choice expected');
      seen++;
      prompts.add(ex.prompt);
      labels.add(chosen(ex).label);
      const before = asc(data(ex))[2];
      const wantSame = ex.prompt.includes('gleich');
      for (const o of ex.answer.options) {
        const [, name, w, v] = /^(\p{L}+) hat (\d+) statt (\d+)\.$/u.exec(o.label)!;
        expect(rows(ex).find((r) => r[0] === name)![1], ex.key).toBe(v);
        const after = asc(rows(ex).map((r) => (r[0] === name ? Number(w) : Number(r[1]))))[2];
        expect(after === before, `${ex.key}: ${o.label}`).toBe(o === chosen(ex) ? wantSame : !wantSame);
      }
    }
    expect(seen).toBeGreaterThan(100);
    expect(prompts.size).toBe(2);
    expect(labels.size).toBeGreaterThan(100);
  });

  it('the screen-reader text holds the data of the picture, and no form gives its answer away', () => {
    expect(picturesNotSaid(kennwerteSkill)).toEqual([]);
    expect(giveaways(kennwerteSkill)).toEqual([]);
  });

  it('one key is one task, a count of 1 has no plural, and every spoken part is closed by one mark', () => {
    expect(keyClashes(kennwerteSkill)).toEqual([]);
    expect(pluralSlips(kennwerteSkill)).toEqual([]);
    expect(speechSlips(kennwerteSkill)).toEqual([]);
  });

  it('Stufe 2: the Spannweite recomputes, the values are not in order', () => {
    for (const ab of [1, 2] as const) {
      for (const ex of atAb(kennwerteSkill, 2, ab)) {
        const d = data(ex);
        expect(number(ex)).toBe(Math.max(...d) - Math.min(...d));
        expect(d).not.toEqual(asc(d));
        expect(d).not.toEqual(asc(d).reverse());
        expect(checkWorkedSolution(ex)).toEqual([]);
      }
    }
  });

  it('Stufe 2, AB III: the Spannweite given for working back is more than two neighbouring values', () => {
    const items = atAb(kennwerteSkill, 2, 3, 800).filter((ex) => formOf(ex) === 'zurueck');
    expect(items.length).toBeGreaterThan(200);
    for (const ex of items) expect(Number(/Spannweite ist (\d+)/.exec(ex.context!)![1]), ex.key).toBeGreaterThanOrEqual(10);
  });

  it('Stufe 2, AB III: from the Spannweite to a value, and the larger Spannweite of two groups', () => {
    const forms = new Set<string>();
    for (const ex of atAb(kennwerteSkill, 2, 3)) {
      forms.add(formOf(ex));
      if (formOf(ex) === 'zurueck') {
        const [width, known] = [...ex.context!.matchAll(/(\d+) (?:Sprünge|Punkte|Karten|Seiten|km)/g)].map((m) => Number(m[1]));
        expect(number(ex)).toBe(ex.prompt.includes('kleinste') ? known - width : known + width);
      } else {
        const a = rows(ex).map((r) => Number(r[0]));
        const b = rows(ex).map((r) => Number(r[1]));
        const sa = Math.max(...a) - Math.min(...a);
        const sb = Math.max(...b) - Math.min(...b);
        expect(chosen(ex).label).toBe(sa > sb ? 'Gruppe A' : sb > sa ? 'Gruppe B' : 'Beide gleich');
      }
    }
    expect(forms).toEqual(new Set(['zurueck', 'vergleich']));
  });

  it('Stufe 3: the Median of an odd number of values; the middle of the shown list is another value', () => {
    for (const ab of [1, 2, 3] as const) {
      for (const ex of atAb(kennwerteSkill, 3, ab)) {
        if (formOf(ex) === 'stabil') continue;
        const d = data(ex);
        expect(d.length % 2).toBe(1);
        const median = asc(d)[(d.length - 1) / 2];
        expect(number(ex)).toBe(median);
        expect(d[(d.length - 1) / 2]).not.toBe(median);
        expect(ex.bugs?.some((b) => b.id === 'median-ungeordnet')).toBe(true);
      }
    }
  });
});
