import { describe, expect, it } from 'vitest';
import { describeSkill } from '../../core/testing';
import { createRng } from '../../core/rng';
import type { Ab, Exercise, Stufe } from '../../core/types';
import { checkWorkedSolution } from '../step-check';
import { CTX } from '../test-utils';
import { platzhalterSkill } from './platzhalter';
import { answerValue, evalTerm, fracText, sameFrac } from './test-utils';

describeSkill(platzhalterSkill, { minDistinct: 30 });

const planned = (stufe: Stufe, ab: Ab, count = 300): Exercise[] => Array.from({ length: count }, (_, i) => platzhalterSkill.generate(createRng(i * 3119 + 5), stufe, { ...CTX, ab }));
const bug = (ex: Exercise, id: string) => ex.bugs?.filter((b) => b.id === id).map((b) => b.match) ?? [];

describe('terme.platzhalter', () => {
  it('the answer put in the gap makes both sides equal', () => {
    for (const stufe of [1, 2, 3] as Stufe[]) {
      for (const ab of [1, 2, 3] as Ab[]) {
        for (const ex of planned(stufe, ab)) {
          if (!ex.expression) continue;
          const [left, right] = ex.expression.replace('□', `(${fracText(answerValue(ex))})`).split(' = ');
          expect(sameFrac(evalTerm(left), evalTerm(right)), ex.key).toBe(true);
        }
      }
    }
  });

  it('the worked steps add up and state the result', () => {
    for (const stufe of [1, 2, 3] as Stufe[]) {
      for (const ab of [1, 2, 3] as Ab[]) {
        for (const ex of planned(stufe, ab, 100)) expect(checkWorkedSolution(ex), ex.key).toEqual([]);
      }
    }
  });

  it('the riddle: following its words from the answer gives its result', () => {
    for (const ex of planned(3, 3, 500)) {
      const text = ex.context ?? '';
      const x = ex.answer.kind === 'number' ? (ex.answer.value as number) : NaN;
      const numbers = (text.match(/\d+(?:,\d+)?/g) ?? []).map((s) => Number(s.replace(',', '.')));
      const close = (a: number, b: number) => expect(Math.abs(a - b), `${ex.key}: ${text}`).toBeLessThan(1e-9);
      if (/multipliziere die Zahl/.test(text)) close(x * numbers[0] + numbers[1], numbers[2]);
      else if (/zu der Zahl/.test(text)) close((x + numbers[0]) * numbers[1], numbers[2]);
      else if (/dividiere die Zahl/.test(text)) close(x / numbers[0] - numbers[1], numbers[2]);
      else close(x / 2 + numbers[0], numbers[1]);
    }
  });

  it('Stufe 1: natural numbers up to 100, gap in an addition or a subtraction', () => {
    for (const ab of [1, 2, 3] as Ab[]) {
      for (const ex of planned(1, ab)) {
        const numbers = (ex.expression ?? '').match(/\d+/g)!.map(Number);
        for (const x of numbers) expect(x, ex.key).toBeLessThanOrEqual(100);
        expect(ex.expression, ex.key).not.toMatch(/[·:,]|\{frac/);
        if (ex.answer.kind === 'number') expect(Number.isInteger(ex.answer.value) && (ex.answer.value as number) <= 100, ex.key).toBe(true);
      }
    }
    for (const ex of planned(1, 1)) expect(ex.expression, ex.key).toMatch(/^□ \+ /);
  });

  it('Stufe 2: every term has · or :', () => {
    for (const ab of [1, 2, 3] as Ab[]) for (const ex of planned(2, ab)) expect(ex.expression, ex.key).toMatch(/[·:]/);
  });

  it('Stufe 3: a decimal, a fraction or a riddle in every item', () => {
    for (const ab of [1, 2] as Ab[]) for (const ex of planned(3, ab)) expect(/\d,\d|\{frac/.test(ex.expression ?? '') || (ex.answer.kind === 'number' && !Number.isInteger(ex.answer.value)), ex.key).toBe(true);
    for (const ex of planned(3, 3)) expect(ex.context, ex.key).toMatch(/^Ich denke mir eine Zahl/);
  });

  it('the Stufen rise: Stufe 2 has no factor 2 or 3 at AB I and AB II, and a small table fact stays out', () => {
    for (const ex of planned(2, 1, 1000)) {
      const [a, b] = (ex.expression ?? '').match(/\d+/g)!.map(Number);
      expect(a, ex.key).toBeGreaterThanOrEqual(4);
      expect(Math.max(a, b), ex.key).toBeGreaterThanOrEqual(6);
    }
    for (const ex of planned(2, 2, 1000)) expect(Math.max(...(ex.expression ?? '').match(/\d+/g)!.map(Number), ex.answer.kind === 'number' ? (ex.answer.value as number) : 0), ex.key).toBeGreaterThanOrEqual(11);
  });

  it('Stufe 3: fractions with plus or minus only, the Nenner made equal first, the answer never beside the gap, and decimals with hundredths at AB I', () => {
    for (const ab of [1, 2] as Ab[]) {
      for (const ex of planned(3, ab, 2000)) {
        if (ex.answer.kind === 'number') {
          if (ab === 1) expect(ex.expression, ex.key).toMatch(/\d,\d\d/);
          continue;
        }
        expect(ex.expression, ex.key).toMatch(/^□ [+−] /);
        const ds = [...(ex.expression ?? '').matchAll(/\/(\d+)\}/g)].map((m) => Number(m[1]));
        expect(ds[0], ex.key).not.toBe(ds[1]);
        if (ex.answer.kind === 'fraction') {
          expect(ex.answer.numerator, ex.key).toBeLessThan(ex.answer.denominator);
          expect(ex.answer.denominator, ex.key).toBeLessThanOrEqual(24);
          expect(ex.expression, ex.key).not.toContain(`{frac:${ex.answer.numerator}/${ex.answer.denominator}}`);
        }
      }
    }
  });

  it('Stufe 3, AB II: a decimal gap is no small one-step fact: an operand above 10, or an answer above 10', () => {
    const items = planned(3, 2, 1000).filter((ex) => ex.answer.kind === 'number');
    expect(items.length).toBeGreaterThan(200);
    for (const ex of items) {
      const shown = (ex.expression ?? '').match(/\d+(?:,\d+)?/g)!.map((s) => Number(s.replace(',', '.')));
      expect(Math.max(...shown, ex.answer.kind === 'number' ? (ex.answer.value as number) : 0), ex.key).toBeGreaterThan(10);
    }
  });

  it('umkehr-gleiche-rechnung computes from the pattern: x + 5 = 12 gives 17', () => {
    for (const ex of planned(1, 1)) {
      const [a, b] = (ex.expression ?? '').match(/\d+/g)!.map(Number);
      expect(bug(ex, 'umkehr-gleiche-rechnung'), ex.key).toEqual([a + b]);
    }
  });

  it('a fraction answer is never a whole number and always takes mixed input', () => {
    for (const ab of [1, 2] as Ab[]) {
      for (const ex of planned(3, ab)) {
        if (ex.answer.kind !== 'fraction') continue;
        expect(ex.answer.denominator, ex.key).toBeGreaterThan(1);
        expect(ex.answer.allowMixed, ex.key).toBe(true);
      }
    }
  });
});
