import { describe, expect, it } from 'vitest';
import { bareKey, describeSkill } from '../../core/testing';
import { checkAnswer } from '../../core/check';
import { createRng } from '../../core/rng';
import type { Stufe } from '../../core/types';
import { checkWorkedSolution } from '../step-check';
import { samples } from '../test-utils';
import { allItems, answerInTask, barProblems, falseDecimals, itemsAt } from './test-support';
import { prozentwertSkill } from './prozentwert';

describeSkill(prozentwertSkill);

/** The answer recomputed from the numbers in the key. */
function expected(key: string): number | null {
  const [form, ...rest] = key.split(':');
  const n = rest.map(Number);
  const of = (g: number, p: number) => (g * p) / 100;
  switch (form) {
    case 'direkt': case 'direkt2': case 'jeder': return of(n[1], n[0]);
    case 'story': case 'story2': return of(n[2], n[1]);
    case 'rest': case 'rest2': return n[2] - of(n[2], n[1]);
    case 'detektiv': case 'detektiv2': return of(n[2], n[1]);
    case 'vergleich1': case 'vergleich2': return Math.max(of(n[1], n[0]), of(n[3], n[2]));
    case 'cent': return of(n[0], 5);
    case 'rabatt': return of(n[1], n[2]);
    case 'neu': return n[1] - of(n[1], n[2]);
    case 'rabattdetektiv': return n[2] - of(n[2], n[3]);
    case 'laeden': return Math.min(n[1] - of(n[1], n[2]), n[1] - n[3]);
    default: return null;
  }
}

describe('prozent.prozentwert specifics', () => {
  it('answers follow from the task (independent recomputation)', () => {
    for (const stufe of [1, 2, 3] as Stufe[]) {
      for (const ex of samples(prozentwertSkill, stufe)) {
        const want = expected(bareKey(ex));
        expect(want, ex.key).not.toBeNull();
        if (ex.answer.kind === 'number') expect(ex.answer.value, ex.key).toBeCloseTo(want!, 6);
      }
    }
  });

  it('every worked solution is correct and states the result', () => {
    for (const stufe of [1, 2, 3] as Stufe[]) {
      for (const ex of samples(prozentwertSkill, stufe)) expect(checkWorkedSolution(ex)).toEqual([]);
    }
  });

  it('each Stufe keeps to its percents and its range', () => {
    const percents = (text: string) => [...text.matchAll(/(\d+) %/g)].map((m) => Number(m[1]));
    const range: Record<number, [number[], number]> = { 1: [[50, 25, 10], 200], 2: [[5, 20, 75], 500] };
    for (const stufe of [1, 2] as Stufe[]) {
      const [allowed, max] = range[stufe];
      for (const ex of samples(prozentwertSkill, stufe)) {
        for (const p of percents(`${ex.context ?? ''} ${ex.prompt} ${ex.expression ?? ''}`)) expect(allowed, ex.key).toContain(p);
        if (ex.visual?.type === 'percentBar') expect(ex.visual.total, ex.key).toBeLessThanOrEqual(max);
      }
    }
  });

  it('Rabatt stories: the discount alone gets the hint about the new price', () => {
    for (let seed = 1; seed < 200; seed++) {
      const ex = prozentwertSkill.generate(createRng(seed), 3, { subtractionMethod: 'abziehen', ab: 2 });
      expect(ex.prompt, ex.key).toMatch(/jetzt\?$/);
      const bug = ex.bugs?.find((b) => b.id === 'prozent-subtrahiert');
      if (!bug || ex.answer.kind !== 'number') continue;
      const res = checkAnswer(ex.answer, { kind: 'number', text: String(bug.match).replace('.', ',') }, ex.bugs);
      expect(res.bugId, ex.key).toBe('prozent-subtrahiert');
    }
  });

  it('no false decimals, no answer printed in the task, no Prozentstreifen that misleads', () => {
    const items = allItems(prozentwertSkill);
    expect(falseDecimals(items)).toEqual([]);
    expect(answerInTask(items)).toEqual([]);
    expect(barProblems(items)).toEqual([]);
  });

  it('stays inside §2.6: no raised price, no second discount', () => {
    for (const ex of allItems(prozentwertSkill)) expect(`${ex.context ?? ''} ${ex.prompt}`, ex.key).not.toMatch(/erhöht|noch einmal/);
  });

  it('the bar of a new price marks what stays and asks for it', () => {
    for (const ex of itemsAt(prozentwertSkill, 3, 2)) {
      if (ex.visual?.type !== 'percentBar') throw new Error(ex.key);
      const p = Number(bareKey(ex).split(':')[3]);
      expect(ex.visual.percent, ex.key).toBe(100 - p);
      expect(ex.visual.unknown, ex.key).toBe('W');
    }
  });

  it('every Stufe is above the last: wholes of Stufe 2 above 100, no easy percent and no round whole on Stufe 3', () => {
    for (const ex of itemsAt(prozentwertSkill, 2, 1)) {
      const g = Number(bareKey(ex).split(':')[2]);
      expect(g, ex.key).toBeGreaterThanOrEqual(120);
      if (ex.answer.kind === 'number') expect(ex.answer.value, ex.key).toBeGreaterThan(5);
    }
    for (const ex of itemsAt(prozentwertSkill, 3, 1)) {
      const [form, a, b] = bareKey(ex).split(':');
      const [p, g] = form === 'jeder' ? [Number(a), Number(b)] : [Number(bareKey(ex).split(':')[3]), Number(b)];
      expect([5, 10, 20, 25, 50, 75], ex.key).not.toContain(p);
      if (form === 'jeder') expect(g % 100, ex.key).not.toBe(0);
    }
  });

  it('a whole fits the story: no 68 g Mehl for a Kuchen, no Euro for an item the share would price', () => {
    for (const ex of allItems(prozentwertSkill)) {
      const m = /für Kuchen ([\d\u202F]+)/.exec(ex.context ?? '');
      if (m) expect(Number(m[1]), ex.key).toBeGreaterThanOrEqual(120);
      expect(`${ex.context ?? ''}`, ex.key).not.toMatch(/Spardose/);
    }
  });

  it('the percent number is never the answer: not as the result, not as the rest, not as the cheaper price', () => {
    expect(answerInTask(allItems(prozentwertSkill, 2000))).toEqual([]);
  });

  it('Fehlerdetektiv at the Rabatt: the sum of the fictional child gives a price above 0 €, and the bug for it stays', () => {
    let seen = 0;
    for (const ex of itemsAt(prozentwertSkill, 3, 3, 4000)) {
      const m = /rechnet: (\d+)\D+(\d+)\D+= (\S+)/u.exec(ex.context ?? '');
      if (!m) continue;
      seen++;
      expect(Number(m[1]), ex.key).toBeGreaterThan(Number(m[2]));
      expect(m[3], ex.key).not.toMatch(/^(−|0$)/);
      expect(ex.bugs?.some((b) => b.id === 'prozent-als-euro'), ex.key).toBe(true);
    }
    expect(seen).toBeGreaterThan(1000);
  });

  it('Stufe 1 AB III stays forward: no reversal to the whole, which is harder than the direct items of Stufe 2 AB III', () => {
    for (const ex of itemsAt(prozentwertSkill, 1, 3)) {
      expect(bareKey(ex), ex.key).toMatch(/^(detektiv|vergleich1):/);
      expect(ex.expression ?? '', ex.key).not.toContain('□');
    }
  });

  it('a hint never holds the result', () => {
    for (const ex of allItems(prozentwertSkill)) {
      if (ex.answer.kind !== 'number' || ex.answer.value === null) continue;
      if (ex.answer.value === 10 && ex.hints.some((h) => /10 %/.test(h))) throw new Error(`${ex.key}: ${ex.hints.join(' ')}`);
      if (ex.answer.value === 100 && ex.hints.some((h) => /100/.test(h))) throw new Error(`${ex.key}: ${ex.hints.join(' ')}`);
    }
  });
});
