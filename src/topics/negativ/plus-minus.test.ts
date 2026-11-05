import { describe, expect, it } from 'vitest';
import { describeSkill } from '../../core/testing';
import type { Ab, Exercise } from '../../core/types';
import { checkAll, evalTerm, expressionHolds, items } from './checks';
import { plusMinusSkill } from './plus-minus';

describeSkill(plusMinusSkill);

const ABS = [1, 2, 3] as Ab[];

/** All numbers of an expression, without their signs, with fractions as their value. */
function sizes(ex: Exercise): number[] {
  return [...(ex.expression ?? '').matchAll(/\{frac:(?:(\d+) )?(\d+)\/(\d+)\}|\d+(?:,\d+)?/g)].map((m) => (m[0].startsWith('{') ? Number(m[1] ?? 0) + Number(m[2]) / Number(m[3]) : Number(m[0].replace(',', '.'))));
}

describe('negativ.plus-minus', () => {
  it('worked steps, hints, spoken text and labels', () => checkAll(plusMinusSkill));

  it('the answer makes every expression hold', () => {
    for (const stufe of [1, 2, 3] as const) {
      for (const ab of ABS) {
        for (const { ex } of items(plusMinusSkill, stufe, ab)) expect(expressionHolds(ex), ex.key).toBe(true);
      }
    }
  });

  it('Stufe 1: integers up to 50, and the second number is positive', () => {
    for (const ab of ABS) {
      for (const { ex } of items(plusMinusSkill, 1, ab)) {
        sizes(ex).forEach((n) => { expect(Number.isInteger(n)).toBe(true); expect(n).toBeLessThanOrEqual(50); });
        expect(ex.expression).not.toMatch(/\(−/);
      }
    }
  });

  it('Stufe 2: integers up to 50, and the second number is negative', () => {
    for (const ab of ABS) {
      for (const { ex, form } of items(plusMinusSkill, 2, ab)) {
        sizes(ex).forEach((n) => { expect(Number.isInteger(n), ex.key).toBe(true); expect(n, ex.key).toBeLessThanOrEqual(50); });
        if (form !== 'luecke-negativ') expect(ex.expression).toMatch(/[+−] \(−\d+\)/);
        else if (ex.answer.kind === 'number') expect(/\(−\d+\)/.test(ex.expression ?? '') || (ex.answer.value ?? 0) < 0, ex.key).toBe(true);
      }
    }
  });

  it('Stufe 3: decimals or fractions up to 10, with signs, and the result stays within 10', () => {
    for (const ab of ABS) {
      let decimals = 0;
      let fractions = 0;
      for (const { ex } of items(plusMinusSkill, 3, ab)) {
        sizes(ex).forEach((n) => expect(n, ex.key).toBeLessThanOrEqual(10));
        const negativeAnswer = ex.answer.kind === 'fraction' ? ex.answer.negative === true : ex.answer.kind === 'number' && (ex.answer.value ?? 0) < 0;
        // a sign, not the operator: a sign has its number directly behind it
        expect(/−(?=[\d{])/.test(ex.expression ?? '') || negativeAnswer, ex.key).toBe(true);
        if (ex.answer.kind === 'fraction') {
          fractions++;
          expect(ex.answer.allowNegative).toBe(true);
          expect(ex.answer.allowMixed).toBe(true);
          const value = (ex.answer.whole ?? 0) + ex.answer.numerator / ex.answer.denominator;
          expect(value, ex.key).toBeLessThanOrEqual(10);
          expect(ex.answer.denominator, `${ex.key}: a whole has no fraction to write`).toBeGreaterThan(1);
        } else {
          decimals++;
          if (ex.answer.kind === 'number') expect(Math.abs(ex.answer.value ?? 0), ex.key).toBeLessThanOrEqual(10);
          expect(ex.expression, ex.key).toMatch(/,/);
        }
      }
      expect(decimals).toBeGreaterThan(0);
      expect(fractions).toBeGreaterThan(0);
    }
  });

  it('unlike denominators stay unlike after reducing, so hints and praise about making them equal hold', () => {
    for (const [name, ab] of [['bruch-ungleich', 2], ['bruch-luecke', 3]] as const) {
      let seen = 0;
      for (const { ex, form, p } of items(plusMinusSkill, 3, ab, 800)) {
        if (form !== name) continue;
        seen++;
        // the keys hold a.n:a.d(:op):b.n:b.d, so the Nenner are the second and the last part
        expect(p[1], ex.key).not.toBe(p[p.length - 1]);
      }
      expect(seen, name).toBeGreaterThan(0);
    }
  });

  it('no hint says to leave the signs out: with plus and minus they decide the operation', () => {
    for (const stufe of [1, 2, 3] as const) {
      for (const ab of ABS) {
        for (const { ex } of items(plusMinusSkill, stufe, ab)) {
          for (const hint of ex.hints) expect(hint, ex.key).not.toMatch(/ohne (?:Vorzeichen|Minus)/i);
        }
      }
    }
  });

  it('the praise only names a negative number when the answer is one', () => {
    for (const { ex } of items(plusMinusSkill, 2, 3, 400)) expect(ex.praise, ex.key).not.toMatch(/negative Zahl/);
  });

  it('the bugs of §5 compute from the pattern', () => {
    for (const { ex, form, num } of items(plusMinusSkill, 2, 1)) {
      if (form !== 'minus-negativ') continue;
      const [a] = num;
      const b = Number(ex.key.split(':').pop());
      expect(ex.bugs?.find((x) => x.id === 'zeichen-verwechselt')?.match).toBe(a + b);
    }
    const crossing = items(plusMinusSkill, 1, 2).filter(({ form, num }) => form === 'ueber-null' && num[0] < 0);
    expect(crossing.length).toBeGreaterThan(0);
    for (const { ex, num } of crossing) {
      const a = num[0];
      const b = Number(ex.key.split(':').pop());
      expect(ex.bugs?.find((x) => x.id === 'ueber-null')?.match).toBe(-a + b);
      expect(ex.bugs?.find((x) => x.id === 'minus-richtung')?.match).toBe(a - b);
    }
    expect(evalTerm('−3 + 5')?.n).toBe(2n);
  });
});
