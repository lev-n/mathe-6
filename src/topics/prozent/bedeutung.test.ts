import { describe, expect, it } from 'vitest';
import { bareKey, describeSkill } from '../../core/testing';
import type { Stufe } from '../../core/types';
import { checkWorkedSolution } from '../step-check';
import { samples } from '../test-utils';
import { allItems, answerInTask, barProblems, falseDecimals, itemsAt } from './test-support';
import { bedeutungSkill } from './bedeutung';

describeSkill(bedeutungSkill, { minDistinct: { 1: 30, 2: 30, 3: 30 } });

/** The answer recomputed from the numbers in the key. */
function expected(key: string): number | number[] | null {
  const [form, ...rest] = key.split(':');
  const n = rest.map(Number);
  switch (form) {
    case 'lesen': return n[0];
    case 'fehlen': return n[1] - n[0];
    case 'rest': case 'umkehr': return 100 - n[0];
    case 'zwei': return n[0] + n[1];
    case 'beete': return 100 - n[1] - n[2];
    case 'streifen': return n[0] * 10;
    case 'teile': return n[0];
    case 'wert': return (n[1] * n[2]) / 10;
    case 'frei': return (n[1] * (10 - n[2])) / 10;
    case 'ganzes': return n[1];
    case 'buch': return (n[1] * (100 - n[2] - n[3])) / 100;
    case 'anteil': case 'luecke': case 'gruppe': return (n[n.length - 2] * 100) / n[n.length - 1];
    case 'umkehr3': return n[0];
    case 'vergleich': return Math.max(n[0] * 5, n[1] * 4);
    default: return null;
  }
}

describe('prozent.bedeutung specifics', () => {
  it('answers follow from the task (independent recomputation)', () => {
    for (const stufe of [1, 2, 3] as Stufe[]) {
      for (const ex of samples(bedeutungSkill, stufe)) {
        const want = expected(bareKey(ex));
        if (ex.answer.kind === 'number') expect(ex.answer.value, ex.key).toBe(want);
        else if (ex.answer.kind === 'cells') {
          const m = /(\d+) gleich|(\d+) Kästchen/.exec(ex.prompt);
          const total = Number(m?.[1] ?? m?.[2]);
          const percent = Number(/Male (\d+)/.exec(ex.prompt)?.[1]);
          expect(ex.answer.solution.length, ex.key).toBe((percent * total) / 100);
          expect(ex.answer.width * ex.answer.height, ex.key).toBe(total);
        }
      }
    }
  });

  it('every worked solution is correct and states the result', () => {
    for (const stufe of [1, 2, 3] as Stufe[]) {
      for (const ex of samples(bedeutungSkill, stufe)) expect(checkWorkedSolution(ex)).toEqual([]);
    }
  });

  it('each Stufe keeps to its content', () => {
    for (const ex of samples(bedeutungSkill, 1)) {
      if (ex.visual?.type === 'grid') expect(ex.visual.width * ex.visual.height, ex.key).toBe(100);
      expect(ex.answer.kind, ex.key).toBe('number');
    }
    for (const ex of samples(bedeutungSkill, 2)) {
      if (ex.visual?.type === 'percentBar') expect(ex.visual.ticks, ex.key).toBe(10);
      if (ex.visual?.type === 'percentBar' && ex.visual.percent !== undefined) expect(ex.visual.percent % 10, ex.key).toBe(0);
    }
    for (const ex of samples(bedeutungSkill, 3)) {
      if (ex.visual?.type === 'grid') expect(ex.visual.width * ex.visual.height, ex.key).not.toBe(100);
      expect(`${ex.context ?? ''} ${ex.prompt} ${ex.expression ?? ''}`, ex.key).toMatch(/\b(20|25|50)\b/);
    }
  });

  it('no false decimals, no answer printed in the task, no Prozentstreifen that misleads', () => {
    const items = allItems(bedeutungSkill);
    expect(falseDecimals(items)).toEqual([]);
    expect(answerInTask(items)).toEqual([]);
    expect(barProblems(items)).toEqual([]);
  });

  it('Stufe 1 AB I is the plain reading of the field, as the step of fehlen is no direct form', () => {
    for (const ex of itemsAt(bedeutungSkill, 1, 1)) expect(bareKey(ex), ex.key).toMatch(/^(lesen|rest):/);
  });

  it('Stufe 2 is above Stufe 1: the free parts are not counted, the percents become a value, and no label hands over the parts', () => {
    for (const ex of itemsAt(bedeutungSkill, 2, 1)) {
      if (bareKey(ex).startsWith('teile:') && ex.visual?.type === 'percentBar') expect(ex.visual.labels, ex.key).toBe('value');
    }
    for (const ex of itemsAt(bedeutungSkill, 2, 2)) {
      expect(bareKey(ex), ex.key).toMatch(/^(wert|frei):/);
      if (ex.answer.kind !== 'number' || ex.visual?.type !== 'percentBar') throw new Error(ex.key);
      if (bareKey(ex).startsWith('frei:')) expect(ex.answer.value, ex.key).not.toBe(10 - (ex.visual.percent ?? 0) / 10);
    }
    for (const ex of itemsAt(bedeutungSkill, 2, 3)) {
      if (ex.answer.kind !== 'number') throw new Error(ex.key);
      expect(ex.answer.unit, ex.key).not.toBe('%');
      if (ex.visual?.type === 'percentBar' && bareKey(ex).startsWith('buch:')) expect(ex.visual.percent, ex.key).toBeUndefined();
    }
  });

  it('the verb of the Beete agrees with the plant', () => {
    for (const ex of itemsAt(bedeutungSkill, 1, 3)) expect(`${ex.context ?? ''}`, ex.key).not.toMatch(/wächst (Bohnen|Tomaten)|wachsen Salat/);
  });

  it('a picture never contradicts the task or shows the sum that is asked', () => {
    for (const ex of allItems(bedeutungSkill)) {
      if (ex.visual?.type === 'grid' && ex.visual.cells.length === 0) throw new Error(`${ex.key}: an empty field`);
      if (/rot und|Wie viele Kästchen sind weiß/.test(ex.prompt)) expect(ex.visual, ex.key).toBeUndefined();
    }
  });

  it('the size of a group fits the group: a class has at most 25 Personen', () => {
    for (const ex of allItems(bedeutungSkill)) {
      const m = /In der Klasse \S+ sind (\d+) Personen/.exec(ex.context ?? '');
      if (m) expect(Number(m[1]), ex.key).toBeLessThanOrEqual(25);
    }
  });
});
