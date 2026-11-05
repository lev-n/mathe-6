import { describe, expect, it } from 'vitest';
import { createRng } from './rng';
import {
  digitAt,
  layoutAdd,
  layoutDiv,
  layoutMul,
  layoutSub,
  numLength,
  placeDative,
  placeName,
  placeOne,
  placeShort,
  writtenVisual,
} from './written';

describe('place names', () => {
  it('names the places in German', () => {
    expect([0, 1, 2, 3].map(placeName)).toEqual(['Einer', 'Zehner', 'Hunderter', 'Tausender']);
    expect(placeDative(1)).toBe('Zehnern');
    expect(placeOne(3)).toBe('einen Tausender');
    expect([0, 1, 2, 3].map(placeShort)).toEqual(['E', 'Z', 'H', 'T']);
  });
});

describe('layoutAdd', () => {
  it('computes carries and column sums (4567 + 2845)', () => {
    const lay = layoutAdd([4567, 2845]);
    expect(lay.columnSums).toEqual([12, 11, 14, 7]);
    expect(lay.carries).toEqual([0, 1, 1, 1]);
    expect(lay.result).toBe(7412);
    expect(lay.width).toBe(4);
  });
  it('adds a column for the last carry and supports carries ≥ 2', () => {
    expect(layoutAdd([6000, 5000]).width).toBe(5);
    const lay = layoutAdd([999, 999, 999]);
    expect(lay.carries).toEqual([0, 2, 2, 2]);
    expect(lay.result).toBe(2997);
  });
  it('result digits always match the sum (random)', () => {
    const rng = createRng(7);
    for (let i = 0; i < 300; i++) {
      const ops = Array.from({ length: rng.int(2, 4) }, () => rng.int(1, 999_999));
      const lay = layoutAdd(ops);
      const digits = lay.columnSums.map((s) => s % 10);
      expect(digits.reduce((acc, d, p) => acc + d * 10 ** p, 0)).toBe(ops.reduce((a, b) => a + b, 0));
    }
  });
});

describe('layoutSub', () => {
  it('Abziehen, wechseln across a zero (805 − 328)', () => {
    const lay = layoutSub(805, 328, 'abziehen');
    expect(lay.columns.map((c) => c.top)).toEqual([15, 9, 7]);
    expect(lay.columns[0].regrouped).toBe(true);
    expect(lay.columns[0].regroupFrom).toBe(2);
    expect(lay.acrossZero).toBe(true);
    expect(lay.regroupings).toBe(1);
    expect(lay.columns.map((c) => c.r)).toEqual([7, 7, 4]);
  });
  it('Ergänzen with the Übertrag (805 − 328)', () => {
    const lay = layoutSub(805, 328, 'ergaenzen');
    expect(lay.columns.map((c) => c.carryIn)).toEqual([0, 1, 1]);
    expect(lay.columns.map((c) => c.extended)).toEqual([true, true, false]);
    expect(lay.regroupings).toBe(2);
    expect(lay.acrossZero).toBe(true);
    expect(lay.columns.map((c) => c.r)).toEqual([7, 7, 4]);
  });
  it('both methods give the difference (random)', () => {
    const rng = createRng(11);
    for (let i = 0; i < 400; i++) {
      const a = rng.int(100, 999_999);
      const b = rng.int(0, a);
      for (const method of ['abziehen', 'ergaenzen'] as const) {
        const lay = layoutSub(a, b, method);
        expect(lay.columns.reduce((acc, c) => acc + c.r * 10 ** c.place, 0)).toBe(a - b);
        lay.columns.forEach((c) => {
          expect(c.r).toBeGreaterThanOrEqual(0);
          expect(c.r).toBeLessThanOrEqual(9);
        });
        // Ergänzen extends exactly where a borrow is needed
        if (method === 'ergaenzen') {
          const borrows = lay.columns.filter((c) => a % 10 ** (c.place + 1) < b % 10 ** (c.place + 1)).length;
          expect(lay.regroupings).toBe(borrows);
        }
      }
    }
  });
  it('rejects negative differences', () => {
    expect(() => layoutSub(3, 5, 'abziehen')).toThrow(RangeError);
  });
});

describe('helpers', () => {
  it('digits and differences', () => {
    expect(numLength(0)).toBe(1);
    expect(numLength(100000)).toBe(6);
    expect(digitAt(5432, 2)).toBe(4);
  });
  it('writtenVisual drops undefined fields and keeps extras', () => {
    const v = writtenVisual({ type: 'written', op: 'add', operands: [1, 2], method: undefined, showSolution: false, shownResult: 4 });
    expect(Object.keys(v)).not.toContain('method');
    expect(v.shownResult).toBe(4);
  });
});

describe('layoutMul', () => {
  it('carries of a one-digit factor (473 · 6)', () => {
    const lay = layoutMul(473, 6);
    expect(lay.result).toBe(2838);
    expect(lay.partials).toHaveLength(1);
    expect(lay.partials[0].carries).toEqual([0, 1, 4, 2]);
    expect(lay.carryCount).toBe(2);
  });
  it('a multi-digit factor: partial products in German order, with their shift', () => {
    const lay = layoutMul(123, 45);
    expect(lay.partials.map((p) => [p.digit, p.shift, p.value])).toEqual([[4, 1, 492], [5, 0, 615]]);
    expect(lay.result).toBe(5535);
  });
  it('a three-digit factor (Stufe 3)', () => {
    const lay = layoutMul(1254, 307);
    expect(lay.partials.map((p) => p.shift)).toEqual([2, 1, 0]);
    expect(lay.partials[1].value).toBe(0);
    expect(lay.result).toBe(1254 * 307);
  });
});

describe('layoutDiv', () => {
  it('steps, zero in the quotient and Rest', () => {
    const lay = layoutDiv(4230, 6);
    expect(lay.quotient).toBe(705);
    expect(lay.remainder).toBe(0);
    expect(lay.quotientZeros).toBe(1);
    expect(lay.firstTwoDigits).toBe(true);
    expect(lay.steps.map((s) => s.q)).toEqual([7, 0, 5]);
  });
  it('a three-digit divisor (Stufe 3)', () => {
    const lay = layoutDiv(98765, 123);
    expect(lay.quotient).toBe(Math.floor(98765 / 123));
    expect(lay.remainder).toBe(98765 % 123);
  });
});

describe('large numbers', () => {
  it('names the places to 12 digits', () => {
    expect(placeName(10)).toBe('Zehnmilliarden');
    expect(placeShort(9)).toBe('Mrd');
  });
  it('adds and subtracts operands of 12 digits', () => {
    expect(layoutAdd([987654321098, 123456789012]).result).toBe(1111111110110);
    expect(layoutSub(100000000000, 1, 'abziehen').result).toBe(99999999999);
    expect(layoutSub(100000000000, 1, 'abziehen').acrossZero).toBe(true);
  });
});
