import { describe, expect, it } from 'vitest';
import { bareKey, describeSkill } from '../../core/testing';
import { checkAnswer } from '../../core/check';
import { createRng } from '../../core/rng';
import type { Exercise, Stufe } from '../../core/types';
import { checkWorkedSolution } from '../step-check';
import { samples } from '../test-utils';
import { allItems, answerInTask, barProblems, falseDecimals, itemsAt } from './test-support';
import { dreisatzSkill } from './dreisatz';

describeSkill(dreisatzSkill);

/** The answer recomputed from the numbers in the key. */
function expected(ex: Exercise): number | null | undefined {
  const [form, ...rest] = bareKey(ex).split(':');
  const n = rest.map(Number);
  switch (form) {
    case 'klein': case 'gross': case 'komma': return n[3] * n[2];
    case 'zurueck': case 'kommazurueck': return n[3];
    case 'packungen': return Math.min(n[2], n[4]) / 100;
    case 'packungen3': return Math.ceil((n[2] * n[3]) / 500);
    case 'entscheiden': return rest[0] === 'nein' ? null : n[4] * n[3];
    default: return undefined;
  }
}

describe('prozent.dreisatz specifics', () => {
  it('answers follow from the task (independent recomputation)', () => {
    for (const stufe of [1, 2, 3] as Stufe[]) {
      for (const ex of samples(dreisatzSkill, stufe)) {
        const want = expected(ex);
        if (want === undefined || ex.answer.kind !== 'number') continue;
        if (want === null) expect(ex.answer.value, ex.key).toBeNull();
        else expect(ex.answer.value, ex.key).toBeCloseTo(want, 6);
      }
    }
  });

  it('the table: the Einheit times the given number is the given amount, times the sought number the answer', () => {
    let seen = 0;
    for (const ex of samples(dreisatzSkill, 2)) {
      if (ex.answer.kind !== 'multi') continue;
      const [, , n, per, m] = bareKey(ex).split(':');
      const [unit, sought] = ex.answer.fields;
      expect(unit.value, ex.key).toBe(Number(per));
      expect(sought.value, ex.key).toBeCloseTo(Number(per) * Number(m), 6);
      expect(ex.visual?.type === 'table' && ex.visual.header.length, ex.key).toBe(3);
      expect(ex.visual?.type === 'table' && ex.visual.rows[1][0], ex.key).toBe(`: ${n}`);
      expect(ex.visual?.type === 'table' && ex.visual.arrows, ex.key).toBeUndefined();
      seen++;
    }
    expect(seen).toBeGreaterThan(20);
  });

  it('Stufe 1 keeps whole results, Stufe 2 has a unit price with Cent', () => {
    for (const ex of samples(dreisatzSkill, 1)) if (ex.answer.kind === 'number') expect(Number.isInteger(ex.answer.value), ex.key).toBe(true);
    for (const ex of samples(dreisatzSkill, 2)) {
      const key = bareKey(ex);
      if (key.startsWith('packungen')) continue;
      expect(Number.isInteger(Number(key.split(':')[3])), ex.key).toBe(false);
    }
  });

  it('Stufe 3: a story that does not fit is not solvable, and the Dreisatz result gets the check hint', () => {
    let seen = 0;
    for (let seed = 1; seed < 200; seed++) {
      const ex = dreisatzSkill.generate(createRng(seed), 3, { subtractionMethod: 'abziehen', ab: 3 });
      expect(ex.answer).toMatchObject({ kind: 'number', offerUnsolvable: true });
      if (ex.answer.kind !== 'number' || ex.answer.value !== null) continue;
      expect(checkAnswer(ex.answer, { kind: 'number', text: '', unsolvable: true }, ex.bugs).correct, ex.key).toBe(true);
      const bug = ex.bugs?.find((b) => b.id === 'immer-proportional');
      expect(bug, ex.key).toBeDefined();
      seen++;
    }
    expect(seen).toBeGreaterThan(20);
  });

  it('every worked solution is correct and states the result', () => {
    for (const stufe of [1, 2, 3] as Stufe[]) {
      for (const ex of samples(dreisatzSkill, stufe)) expect(checkWorkedSolution(ex).filter((e) => !e.includes('does not contain field'))).toEqual([]);
    }
  });

  it('no false decimals, no answer printed in the task, no Prozentstreifen that misleads', () => {
    const items = allItems(dreisatzSkill);
    expect(falseDecimals(items)).toEqual([]);
    expect(answerInTask(items)).toEqual([]);
    expect(barProblems(items)).toEqual([]);
  });

  it('a price fits the thing: no Brötchen for whole Euro, nothing for one above 9 €', () => {
    for (const ex of allItems(dreisatzSkill)) {
      const m = /^(\d+) ([\p{L} ]+?) kosten ([\d,]+)/u.exec(ex.context ?? '');
      if (!m) continue;
      const per = Number(m[3].replace(',', '.')) / Number(m[1]);
      expect(per, ex.key).toBeLessThanOrEqual(9);
      if (m[2] === 'Brötchen') expect(per, ex.key).toBeLessThan(1);
    }
  });

  it('Stufe 3: "kosten" does not tell whether the Dreisatz fits, and every item is more than one tap', () => {
    for (const ab of [1, 3] as const) {
      const items = itemsAt(dreisatzSkill, 3, ab);
      const share = (fits: boolean) => {
        const group = items.filter((ex) => ex.answer.kind === 'number' && (ex.answer.value === null) !== fits);
        return group.filter((ex) => /kost/.test(`${ex.context} ${ex.prompt}`)).length / group.length;
      };
      for (const fits of [true, false]) {
        expect(share(fits), `AB ${ab}, fits ${fits}`).toBeGreaterThan(0.2);
        expect(share(fits), `AB ${ab}, fits ${fits}`).toBeLessThan(0.9);
      }
    }
    for (const ex of allItems(dreisatzSkill)) expect(ex.answer.kind, ex.key).not.toBe('choice');
  });

  it('Stufe 3 AB I and III: the check is a calculation, two lines of one story with the same value for one or with two', () => {
    const text = (step: Exercise['steps'][number]) => (typeof step === 'string' ? step : step.text);
    const valueFor1 = (line: string) => /= ([\d,\u202F]+)/.exec(line)?.[1];
    for (const ab of [1, 3] as const) {
      const items = itemsAt(dreisatzSkill, 3, ab, 800);
      let unsolvable = 0;
      for (const ex of items) {
        expect(`${ex.context}`, ex.key).not.toMatch(/Jahren|Uhr|Tore|Grundpreis|gleichmäßig/);
        const [first, second] = ex.steps.map(text);
        if (ex.answer.kind === 'number' && ex.answer.value === null) {
          unsolvable++;
          expect(valueFor1(first), ex.key).not.toBe(valueFor1(second));
          // more of it never comes to less in all
          const [a, b] = [first, second].map((line) => /: ([\d,\u202F]+)\S* \S*? ?: (\d+) =/.exec(line.replace(/\u00A0/g, ' ')));
          if (!a || !b) throw new Error(`${ex.key}: ${first} ${second}`);
          const total = (m: RegExpExecArray) => Number(m[1].replace(/\u202F/g, '').replace(',', '.'));
          expect(total(a) < total(b), ex.key).toBe(Number(a[2]) < Number(b[2]));
        } else {
          expect(valueFor1(second), ex.key).toBe(valueFor1(first));
        }
        const parts = bareKey(ex).split(':');
        expect(parts[0], ex.key).toBe(ab === 1 ? 'entscheiden' : 'entscheiden2');
      }
      expect(unsolvable / items.length, `AB ${ab}`).toBeGreaterThan(0.25);
      expect(unsolvable / items.length, `AB ${ab}`).toBeLessThan(0.42);
    }
  });

  it('Stufe 3 AB III has a second step that AB I does not have', () => {
    for (const ex of itemsAt(dreisatzSkill, 3, 3)) expect(`${ex.context}`, ex.key).toMatch(/bezahlt mit|Eine Packung hat/);
    for (const ex of itemsAt(dreisatzSkill, 3, 1)) expect(`${ex.context}`, ex.key).not.toMatch(/bezahlt mit|Eine Packung hat/);
  });

  it('the answer is no number the task prints, on a large sample too', () => {
    expect(answerInTask(allItems(dreisatzSkill, 1500))).toEqual([]);
  });

  it('the money back is never negative', () => {
    for (const ex of itemsAt(dreisatzSkill, 3, 2)) if (ex.answer.kind === 'number') expect(ex.answer.value, ex.key).toBeGreaterThan(0);
  });
});
