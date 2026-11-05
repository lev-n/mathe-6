import { describe, expect, it } from 'vitest';
import { describeSkill } from '../../core/testing';
import { checkWorkedSolution } from '../step-check';
import { mittelwertSkill } from './mittelwert';
import { atAb, chartsTooWide, chosen, formOf, giveaways, keyClashes, number, paddedAnswers, picturesNotSaid, pluralSlips, speechSlips } from './testHelpers';

describeSkill(mittelwertSkill, { minDistinct: 40 });

const parse = (s: string) => Number(s.replace(',', '.'));

function dataOf(ex: { visual?: unknown }): (number | null)[] {
  const v = ex.visual as { type: string; rows?: string[][]; values?: number[] };
  if (v.type === 'barChart') return v.values!;
  return v.rows!.map((r) => (r[1] === '□' ? null : parse(r[1])));
}

const known = (d: (number | null)[]) => d.filter((x): x is number => x !== null);
const total = (d: number[]) => d.reduce((a, b) => a + b, 0);

describe('daten.mittelwert', () => {
  it('a whole number is shown without decimals, the data reach the screen reader, and no form gives its answer away', () => {
    expect(paddedAnswers(mittelwertSkill)).toEqual([]);
    expect(picturesNotSaid(mittelwertSkill)).toEqual([]);
    expect(giveaways(mittelwertSkill)).toEqual([]);
  });

  it('one key is one task, a count of 1 has no plural, and every spoken part is closed by one mark', () => {
    expect(keyClashes(mittelwertSkill)).toEqual([]);
    expect(pluralSlips(mittelwertSkill)).toEqual([]);
    expect(speechSlips(mittelwertSkill)).toEqual([]);
  });

  it('every bar of a chart fits a 375 px phone, also the levelled chart of a worked step', () => {
    expect(chartsTooWide(mittelwertSkill)).toEqual([]);
  });

  it('Stufe 1: 3 or 4 values up to 50, a whole mean that recomputes', () => {
    for (const ab of [1, 2] as const) {
      for (const ex of atAb(mittelwertSkill, 1, ab)) {
        const d = known(dataOf(ex));
        expect(d.length).toBe(ab === 1 ? 3 : 4);
        d.forEach((v) => expect(v).toBeLessThanOrEqual(50));
        expect(number(ex)).toBe(total(d) / d.length);
        expect(Number.isInteger(number(ex))).toBe(true);
        expect(checkWorkedSolution(ex)).toEqual([]);
      }
    }
    for (const ex of atAb(mittelwertSkill, 1, 3)) {
      const n = Number(/^(\d+)/.exec(ex.context!)![1]);
      const mean = Number(/hat jede Person (\d+)/.exec(ex.prompt)![1]);
      expect(number(ex)).toBe(n * mean);
      expect(n === 3 || n === 4).toBe(true);
      expect(mean).toBeLessThanOrEqual(50);
    }
  });

  it('Stufe 2: 5 or 6 values with a zero, a mean with a comma', () => {
    for (const ab of [1, 2, 3] as const) {
      for (const ex of atAb(mittelwertSkill, 2, ab)) {
        const d = known(dataOf(ex));
        expect([5, 6]).toContain(d.length);
        expect(d).toContain(0);
        expect(number(ex)).toBeCloseTo(total(d) / d.length, 9);
        expect(Number.isInteger(number(ex))).toBe(false);
        expect(checkWorkedSolution(ex)).toEqual([]);
      }
    }
  });

  it('Stufe 2: leaving out the zero has its own hint', () => {
    const items = atAb(mittelwertSkill, 2, 1);
    expect(items.every((ex) => ex.bugs?.some((b) => b.id === 'mittel-ohne-null' && b.match === total(known(dataOf(ex))) / 4))).toBe(true);
  });

  it('Stufe 3: the missing value makes the given mean', () => {
    for (const ex of [...atAb(mittelwertSkill, 3, 1), ...atAb(mittelwertSkill, 3, 2).filter((x) => formOf(x) === 'fehlt')]) {
      const d = dataOf(ex);
      expect(d.filter((x) => x === null).length).toBe(1);
      const mean = parse(/ist ([\d,]+)\.$/.exec(ex.context!)![1]);
      expect((total(known(d)) + number(ex)) / d.length).toBeCloseTo(mean, 9);
      expect(number(ex)).toBeGreaterThanOrEqual(0);
    }
  });

  it('Stufe 3: a changed value shifts the mean by the change over the count', () => {
    const items = atAb(mittelwertSkill, 3, 2).filter((x) => formOf(x) === 'aendern');
    expect(items.length).toBeGreaterThan(40);
    for (const ex of items) {
      const d = known(dataOf(ex));
      const [, after, before] = /(\d+) statt (\d+)/.exec(ex.context!)!;
      expect(chosen(ex).label).toBe(`Der Mittelwert steigt um ${(Number(after) - Number(before)) / d.length}.`);
    }
  });

  it('Stufe 3, AB III: the drop recomputes when the far value goes', () => {
    for (const ex of atAb(mittelwertSkill, 3, 3)) {
      const d = known(dataOf(ex));
      const far = Math.max(...d);
      expect(ex.context).toContain(String(far));
      const rest = d.filter((_, i) => i !== d.indexOf(far));
      expect(number(ex)).toBeCloseTo(total(d) / 5 - total(rest) / 4, 9);
      expect(number(ex)).toBeGreaterThan(0);
    }
  });
});
