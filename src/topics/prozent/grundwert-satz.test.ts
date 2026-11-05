import { describe, expect, it } from 'vitest';
import { bareKey, describeSkill } from '../../core/testing';
import { checkAnswer } from '../../core/check';
import { createRng } from '../../core/rng';
import type { Stufe } from '../../core/types';
import { checkWorkedSolution } from '../step-check';
import { samples } from '../test-utils';
import { allItems, answerInTask, barProblems, falseDecimals, itemsAt } from './test-support';
import { grundwertSatzSkill } from './grundwert-satz';

describeSkill(grundwertSatzSkill);

/** The answer recomputed from the numbers in the key; NaN parts are names. */
function expected(key: string): number | null {
  const [form, ...rest] = key.split(':');
  const n = rest.map(Number);
  switch (form) {
    case 'satz': return (n[0] * 100) / n[1];
    case 'satzstory': return (n[1] * 100) / n[2];
    case 'satzrest': return 100 - (n[0] * 100) / n[1];
    case 'satzvgl': return Math.max((n[2] * 100) / n[3], (n[4] * 100) / n[5]);
    case 'grund': return (n[0] * 100) / n[1];
    case 'grundstory': return (n[1] * 100) / n[2];
    case 'grunddetektiv': return (n[1] * 100) / n[2];
    case 'restgrund': return n[1];
    case 'zins': return (n[1] * n[2]) / 100;
    case 'guthaben': return n[1] + (n[1] * n[2]) / 100;
    case 'gesucht': return rest[0] === 'G' ? n[3] : rest[0] === 'W' ? n[2] : n[4];
    case 'zinsvgl': return Math.max(n[2] * n[3], n[4] * n[5]) / 100;
    case 'anteile': return 100 - n[1] - (n[2] * 100) / n[0];
    default: return null;
  }
}

describe('prozent.grundwert-satz specifics', () => {
  it('answers follow from the task (independent recomputation)', () => {
    for (const stufe of [1, 2, 3] as Stufe[]) {
      for (const ex of samples(grundwertSatzSkill, stufe)) {
        if (ex.answer.kind === 'number') expect(ex.answer.value, ex.key).toBeCloseTo(expected(bareKey(ex))!, 6);
      }
    }
  });

  it('every worked solution is correct and states the result', () => {
    for (const stufe of [1, 2, 3] as Stufe[]) {
      for (const ex of samples(grundwertSatzSkill, stufe)) expect(checkWorkedSolution(ex)).toEqual([]);
    }
  });

  it('each Stufe keeps to its content: Stufe 1 asks for percent, Stufe 2 for the whole, Stufe 3 has names or Zins', () => {
    for (const ex of samples(grundwertSatzSkill, 1)) expect(ex.answer).toMatchObject({ kind: 'number', unit: '%' });
    for (const ex of samples(grundwertSatzSkill, 2)) expect(ex.answer.kind === 'number' && ex.answer.unit !== '%', ex.key).toBe(true);
    for (const ex of samples(grundwertSatzSkill, 3)) expect(/^(rollen|gesucht|anteile|zins|guthaben)/.test(bareKey(ex)), ex.key).toBe(true);
  });

  it('20 % sind 12 read as 2,4 gets the targeted hint', () => {
    for (let seed = 1; seed < 400; seed++) {
      const ex = grundwertSatzSkill.generate(createRng(seed), 2, { subtractionMethod: 'abziehen', ab: 1 });
      const bug = ex.bugs?.find((b) => b.id === 'grundwert-vertauscht');
      if (!bug || ex.answer.kind !== 'number') continue;
      expect(checkAnswer(ex.answer, { kind: 'number', text: String(bug.match).replace('.', ',') }, ex.bugs).bugId).toBe('grundwert-vertauscht');
      return;
    }
    throw new Error('no item with the bug found');
  });

  it('no false decimals, no answer printed in the task, no Prozentstreifen that misleads', () => {
    const items = allItems(grundwertSatzSkill);
    expect(falseDecimals(items)).toEqual([]);
    expect(answerInTask(items)).toEqual([]);
    expect(barProblems(items)).toEqual([]);
  });

  it('stays inside §2.6: no change of a price, no old price, no Zins backwards', () => {
    for (const ex of allItems(grundwertSatzSkill)) {
      const task = `${ex.context ?? ''} ${ex.prompt}`;
      expect(task, ex.key).not.toMatch(/sinkt|gesenkt|alte[rn]? Preis|am Anfang/);
      expect(task, ex.key).not.toMatch(/Wie viel Prozent Zinsen/);
    }
  });

  it('a group has the size of the story: a class up to 32, a Klassenfahrt up to 120, one day of a Radtour up to 60 km', () => {
    for (const ex of allItems(grundwertSatzSkill)) {
      const task = `${ex.context ?? ''} ${ex.prompt}`;
      if (/Klasse (6a|6c)|der Klasse\b/.test(task) && ex.answer.kind === 'number' && ex.answer.unit === 'Personen') expect(ex.answer.value, ex.key).toBeLessThanOrEqual(32);
      const fahrt = /Von (\d+) Personen der Klassenfahrt/.exec(task);
      if (fahrt) expect(Number(fahrt[1]), ex.key).toBeLessThanOrEqual(120);
      const tag = /am ersten Tag (\d+)/.exec(task);
      if (tag) expect(Number(tag[1]), ex.key).toBeLessThanOrEqual(60);
    }
  });

  it('Stufe 3 AB II is above Stufe 2 AB II: the missing one is not named, the percent is no easy one, and a Zins is no plain forward task', () => {
    for (const ex of itemsAt(grundwertSatzSkill, 3, 2)) {
      if (ex.answer.kind !== 'number') throw new Error(ex.key);
      const [form, , , , , p] = bareKey(ex).split(':');
      expect(form, ex.key).toMatch(/^(gesucht|guthaben)$/);
      if (form !== 'gesucht') continue;
      expect(ex.prompt, ex.key).not.toMatch(/Wie viel Prozent|Wie viele|Wie viel Euro/);
      expect(ex.answer.unit, ex.key).toBeUndefined();
      expect([10, 20, 25, 50, 75], ex.key).not.toContain(Number(p));
    }
  });

  it('a Zins has a whole with a comma at 1 %', () => {
    for (const ex of allItems(grundwertSatzSkill)) {
      const m = /hat ([\d\u202F]+)\u00A0€ auf dem Sparbuch/.exec(ex.context ?? '');
      if (m) expect(Number(m[1].replace(/\u202F/g, '')) % 100, ex.key).not.toBe(0);
    }
  });

  it('the answer is no number the task prints, on a large sample too', () => {
    expect(answerInTask(allItems(grundwertSatzSkill, 1500))).toEqual([]);
  });

  it('Stufe 3 is never a tap: naming the roles comes with a calculation', () => {
    for (const ab of [1, 2, 3] as const) {
      for (const ex of itemsAt(grundwertSatzSkill, 3, ab)) expect(ex.answer.kind, ex.key).not.toBe('choice');
    }
    for (const ex of itemsAt(grundwertSatzSkill, 3, 1)) {
      if (ex.answer.kind !== 'multi') continue;
      const [g, w, p] = ex.answer.fields.map((f) => f.value);
      expect((w * 100) / g, ex.key).toBeCloseTo(p, 6);
    }
  });
});
