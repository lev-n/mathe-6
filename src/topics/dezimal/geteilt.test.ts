import { describe, expect, it } from 'vitest';
import { describeSkill } from '../../core/testing';
import { numLength, shiftedDivision, writtenPlaces } from '../../core/written';
import { evalSide } from '../step-check';
import skill from './geteilt';
import { allItems, answerValue, describeDecimalRules, items, near, num, quotientStepProblems } from './test-helpers';

describeSkill(skill, { minDistinct: 30 });
describeDecimalRules(skill);

describe('dezimal.geteilt: content', () => {
  it('an open quotient has the answer as its value', () => {
    for (const ex of allItems(skill)) {
      const m = /^(.+) = □$/.exec(ex.expression ?? '');
      if (m) expect(near(evalSide(m[1])?.value ?? NaN, answerValue(ex)), ex.key).toBe(true);
      const gap = /^□ : (\d+) = ([\d,]+)$/.exec(ex.expression ?? '');
      if (gap) expect(near(answerValue(ex) / Number(gap[1]), num(gap[2])), ex.key).toBe(true);
    }
  });

  it('Stufe 1 divides by 10, 100 or one digit, and the result ends', () => {
    for (const ab of [1, 2] as const) {
      for (const ex of items(skill, 1, ab)) {
        const a = ex.answer;
        if (a.kind === 'written') {
          expect(a.op, ex.key).toBe('div');
          expect(a.operands[1], ex.key).toBeLessThan(10);
          expect(a.remainder ?? 0, ex.key).toBe(0);
          expect(a.decimalPlaces?.[1], ex.key).toBe(0);
        } else {
          expect(/ : (10|100|[2-9]) = □$/.test(ex.expression ?? ''), ex.key).toBe(true);
        }
      }
    }
  });

  it('Stufe 2 has a Divisor with one place: the comma shift gives the same result, and 0,8 : 0,2 = 0,4 has its hint', () => {
    for (const ex of items(skill, 2, 1)) {
      const [a, b] = (ex.expression ?? '').split(' = ')[0].split(' : ');
      expect(b.split(',')[1]?.length, ex.key).toBe(1);
      expect(near(answerValue(ex), Number(a.replace(',', '')) / Number(b.replace(',', ''))), ex.key).toBe(true);
      expect(ex.bugs?.find((x) => x.id === 'komma-nicht-verschoben')?.match, ex.key).toBeCloseTo(answerValue(ex) / 10, 9);
    }
    for (const ex of items(skill, 2, 2)) {
      const [a, b] = (ex.expression ?? '').split(' = ')[0].split(' : ');
      expect(b.split(',')[1]?.length, ex.key).toBe(1);
      expect(near(answerValue(ex) * Number(b.replace(',', '.')), Number(a.replace(',', '.'))), ex.key).toBe(true);
    }
  });

  it('Stufe 2, AB II leaves the shift to the child: typed, with a hint for no shift, and the digits do not divide one by one', () => {
    for (const ex of items(skill, 2, 2, 300)) {
      expect(ex.answer.kind, ex.key).toBe('number');
      expect(ex.bugs?.find((x) => x.id === 'komma-nicht-verschoben')?.match, ex.key).toBeCloseTo(answerValue(ex) / 10, 9);
      const [a, b] = (ex.expression ?? '').split(' = ')[0].split(' : ');
      const divisor = Number(b.replace(',', ''));
      expect([...a.replace(',', '')].every((c) => Number(c) % divisor === 0), ex.key).toBe(false);
    }
  });

  it('a written division has a place in its result and a digit in every box: WrittenInput has a box per digit of the Dividend', () => {
    let seen = 0;
    for (const ex of allItems(skill, 300)) {
      if (ex.answer.kind !== 'written') continue;
      seen++;
      const places = writtenPlaces(ex.answer);
      expect(places, ex.key).toBeGreaterThan(0);
      const { dividend } = shiftedDivision(ex.answer.operands, ex.answer.decimalPlaces);
      expect(Math.max(numLength(dividend), places + 1), ex.key).toBe(Math.max(numLength(ex.answer.result), places + 1));
    }
    expect(seen).toBeGreaterThan(0);
  });

  it('a price per ticket has no one paying a sum that equal payments cannot reach, and its first step is marked as cut off', () => {
    const stories = items(skill, 3, 2, 400).filter((ex) => ex.key.includes(':ausflug:'));
    expect(stories.length).toBeGreaterThan(0);
    for (const ex of stories) {
      expect(/gleich viel|zahlt/.test(`${ex.context} ${ex.prompt}`), `${ex.key}: ${ex.context} ${ex.prompt}`).toBe(false);
      expect(String(ex.steps[0]), ex.key).toMatch(/ = [\d,]+…$/);
      expect(quotientStepProblems(ex)).toEqual([]);
    }
  });

  it('Stufe 2, AB III: a comparison goes either way, and the Divisor decides', () => {
    const asked = items(skill, 2, 3, 300).filter((ex) => ex.key.includes(':vergleich:'));
    let larger = 0;
    for (const ex of asked) {
      if (ex.answer.kind !== 'choice') throw new Error(ex.key);
      const divisor = num(/: ([\d,]+) größer/.exec(ex.prompt)?.[1] ?? '');
      const label = ex.answer.options[ex.answer.correct].label;
      expect(label.startsWith(divisor < 1 ? 'größer' : 'kleiner'), ex.key).toBe(true);
      if (divisor < 1) larger++;
    }
    expect(larger / asked.length).toBeGreaterThan(0.3);
    expect(larger / asked.length).toBeLessThan(0.7);
  });

  it('Stufe 3: the result does not end and is rounded half up', () => {
    let seen = 0;
    for (const ab of [1, 2] as const) {
      for (const ex of items(skill, 3, ab)) {
        const m = /^([\d,]+) : ([\d,]+) ≈ □$/.exec(ex.expression ?? '');
        if (!m) {
          expect(ex.context, ex.key).toBeTruthy();
          continue;
        }
        seen++;
        const exact = num(m[1]) / num(m[2]);
        expect(near(answerValue(ex), Math.round(exact * 100 + 1e-9) / 100), ex.key).toBe(true);
        expect(near(exact * 100, Math.round(exact * 100)), `${ex.key} ends`).toBe(false);
      }
    }
    expect(seen).toBeGreaterThan(0);
  });

  it('Stufe 3, AB III: a story says up or down', () => {
    for (const ex of items(skill, 3, 3)) {
      const [total, each] = [...(ex.context ?? '').matchAll(/([\d,]+) l/g)].map((m) => num(m[1]));
      const quotient = total / each;
      expect(answerValue(ex), ex.key).toBe(ex.prompt.includes('mindestens') ? Math.ceil(quotient) : Math.floor(quotient));
    }
  });
});
