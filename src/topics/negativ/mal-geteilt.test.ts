import { describe, expect, it } from 'vitest';
import { describeSkill } from '../../core/testing';
import type { Ab, Exercise } from '../../core/types';
import { checkAll, expressionHolds, items, textOf } from './checks';
import { malGeteiltSkill } from './mal-geteilt';

describeSkill(malGeteiltSkill);

const ABS = [1, 2, 3] as Ab[];

describe('negativ.mal-geteilt', () => {
  it('worked steps, hints, spoken text and labels', () => checkAll(malGeteiltSkill));

  it('the answer makes every expression hold', () => {
    for (const stufe of [1, 2, 3] as const) {
      for (const ab of ABS) {
        for (const { ex } of items(malGeteiltSkill, stufe, ab)) expect(expressionHolds(ex), ex.key).toBe(true);
      }
    }
  });

  it('Stufe 1: one negative factor and one natural one, up to 10', () => {
    for (const ab of ABS) {
      for (const { ex, form, num } of items(malGeteiltSkill, 1, ab)) {
        const [x, y] = form === 'luecke' ? num.slice(-2) : num;
        expect(x * y, ex.key).toBeLessThan(0);
        expect(Math.abs(x)).toBeLessThanOrEqual(10);
        expect(Math.abs(y)).toBeLessThanOrEqual(10);
        expect(ex.expression).toContain('·');
      }
    }
  });

  it('Stufe 2: two negative factors or a negative divisor, integers', () => {
    for (const ab of ABS) {
      for (const { ex } of items(malGeteiltSkill, 2, ab)) {
        expect(ex.expression, ex.key).not.toMatch(/,|\{frac/);
        const e = ex.expression ?? '';
        const twoNegatives = (e.match(/\(−/g) ?? []).length === 2;
        const negativeDivisor = /: \(−\d+\)/.test(e);
        const gap = e.includes('□ ·') || e.includes('· □');
        expect(twoNegatives || negativeDivisor || gap, ex.key).toBe(true);
      }
    }
  });

  it('Stufe 3: decimals, fractions or three factors', () => {
    for (const ab of ABS) {
      for (const { ex } of items(malGeteiltSkill, 3, ab)) {
        const e = ex.expression ?? '';
        const threeFactors = (e.match(/·/g) ?? []).length === 2;
        const decimalResult = ex.answer.kind === 'number' && !Number.isInteger(ex.answer.value);
        expect(/,|\{frac/.test(e) || threeFactors || decimalResult, ex.key).toBe(true);
        if (ex.answer.kind === 'fraction') {
          expect(ex.answer.denominator, `${ex.key}: a whole has no fraction to write`).toBeGreaterThan(1);
          // no factor 1 in disguise: every fraction of the term is a part or a mixed number
          expect(e, ex.key).not.toMatch(/[·:] 1 |\b1 ·/);
        }
      }
    }
  });

  it('Stufe 3 keeps the sign open: every form has positive and negative results, and all of them carry a negative number', () => {
    const negativeResult = (a: Exercise['answer']) => (a.kind === 'fraction' ? a.negative === true : a.kind === 'number' && (a.value ?? 0) < 0);
    for (const ab of ABS) {
      const signs = new Map<string, Set<boolean>>();
      for (const { ex, form } of items(malGeteiltSkill, 3, ab, 800)) {
        const set = signs.get(form) ?? new Set<boolean>();
        signs.set(form, set.add(negativeResult(ex.answer)));
        expect(ex.expression ?? '', `${ex.key}: the sign is the task`).toMatch(/−/);
      }
      for (const [form, set] of signs) expect(set.size, `AB ${ab}, ${form}`).toBe(2);
    }
    const counts = new Set<number>();
    for (const ab of [2, 3] as Ab[]) {
      for (const { ex, form } of items(malGeteiltSkill, 3, ab, 800)) {
        if (form.startsWith('drei')) counts.add((ex.expression?.match(/\(−/g) ?? []).length + (ex.expression?.startsWith('−') ? 1 : 0));
      }
    }
    expect([...counts].sort()).toEqual([1, 2, 3]);
  });

  it('three factors: the numbers are no smaller than on Stufe 2, and the prompt fits the hints', () => {
    for (const { ex, form } of items(malGeteiltSkill, 3, 2, 800)) {
      if (form === 'drei' && ex.answer.kind === 'number') expect(Math.abs(ex.answer.value ?? 0), ex.key).toBeGreaterThanOrEqual(33);
    }
    for (const ab of [2, 3] as Ab[]) {
      for (const { ex, form } of items(malGeteiltSkill, 3, ab, 400)) {
        if (form.startsWith('drei')) expect(ex.prompt, ex.key).toBe('Rechne.');
      }
    }
  });

  it('the Kehrwert shows the swap of Zähler and Nenner, never a mixed or whole number', () => {
    let quotients = 0;
    for (const { ex, form, num } of items(malGeteiltSkill, 3, 2, 800)) {
      if (form !== 'bruch-geteilt') continue;
      quotients++;
      const [, , bn, bd] = num;
      const line = ex.steps.map(textOf).find((s) => s.startsWith('Kehrwert'));
      expect(line, ex.key).toBe(`Kehrwert der zweiten Zahl: ${bn < 0 ? '−' : ''}{frac:${bd}/${Math.abs(bn)}}`);
    }
    expect(quotients).toBeGreaterThan(0);
  });

  it('the sign bug of §5 is the mirror of the result', () => {
    for (const { ex } of items(malGeteiltSkill, 2, 1)) {
      if (ex.answer.kind !== 'number') throw new Error('number');
      expect(ex.bugs?.find((b) => b.id === 'produkt-vorzeichen')?.match).toBe(-(ex.answer.value ?? 0));
    }
  });
});
