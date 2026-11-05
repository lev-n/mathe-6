import { describe, expect, it } from 'vitest';
import { checkAnswer, FRACTION_NOT_LOWEST } from '../../core/check';
import { assertWellFormedExercise, describeSkill } from '../../core/testing';
import { createRng } from '../../core/rng';
import { checkWorkedSolution } from '../step-check';
import { compareFrac, differenceOf, gcd, lcm, sumOf, type Frac } from './helpers';
import { MIXED_WHERE_PLANNED, plusMinusSkill } from './plus-minus';
import { ABS_ALL, STUFEN_ALL, expectSoundItems, formOf, fractionsIn, items, sameValue, valueOf } from './test-helpers';

describeSkill(plusMinusSkill);

const plainExpression = (ex: { expression?: string }) => /^\{frac:[^}]+\} [+−] \{frac:[^}]+\} = □$/.test(ex.expression ?? '');

/** Items of the forms for a plan with gemischte Zahlen, which generate() does not serve yet. */
const plannedItems = (ab: 2 | 3, n = 200) => Array.from({ length: n }, (_, i) => {
  const forms = MIXED_WHERE_PLANNED[ab];
  return forms[i % forms.length](createRng(i * 2053 + ab), 3, ab);
});

describe('brueche.plus-minus specifics', () => {
  it('worked steps calculate, and a task has one key', () => expectSoundItems(plusMinusSkill));

  it('every plain term recomputes, the result in lowest terms, also as a gemischte Zahl', () => {
    for (const stufe of STUFEN_ALL) {
      for (const ab of ABS_ALL) {
        for (const ex of items(plusMinusSkill, stufe, ab).filter(plainExpression)) {
          const [a, b] = fractionsIn(ex.expression!) as Frac[];
          const want = ex.expression!.includes('−') ? differenceOf(a, b) : sumOf(a, b);
          const value = valueOf(ex.answer);
          expect(sameValue(value, want as [number, number]), ex.key).toBe(true);
          if (ex.answer.kind !== 'fraction') throw new Error('fraction');
          expect(gcd(ex.answer.numerator, ex.answer.denominator)).toBe(1);
          expect(ex.answer.accept).toBe('lowest');
          expect(want[0]).toBeGreaterThan(0);
        }
      }
    }
  });

  it('missing numbers recompute', () => {
    for (const [stufe, ab] of [[1, 3], [2, 3]] as const) {
      for (const ex of items(plusMinusSkill, stufe, ab).filter((e) => (e.expression ?? '').includes('□') && !plainExpression(e))) {
        const value = valueOf(ex.answer);
        const [a, b] = fractionsIn(ex.expression!) as Frac[];
        const whole = ex.expression!.startsWith('□') ? sumOf(a, b) : differenceOf(b, a);
        expect(sameValue(value, whole as [number, number]), ex.key).toBe(true);
      }
    }
  });

  it('what remains recomputes', () => {
    for (const ex of items(plusMinusSkill, 2, 3).filter((e) => formOf(e) === 'rest')) {
      const [a, b] = fractionsIn(ex.context!) as Frac[];
      expect(sameValue(valueOf(ex.answer), differenceOf([1, 1], sumOf(a, b)) as [number, number]), ex.key).toBe(true);
    }
  });

  it('a story of one Ganzes never passes it: nobody eats more than the pizza', () => {
    let stories = 0;
    for (const stufe of [1, 2, 3] as const) {
      for (const ex of items(plusMinusSkill, stufe, 2, 600).filter((e) => e.context)) {
        stories++;
        expect(compareFrac(valueOf(ex.answer), [1, 1]), ex.key).toBeLessThan(0);
      }
    }
    expect(stories).toBeGreaterThan(300);
  });

  it('Stufe 1: gleichnamig, Nenner up to 12', () => {
    for (const ab of ABS_ALL) {
      for (const ex of items(plusMinusSkill, 1, ab)) {
        const fractions = fractionsIn(`${ex.context ?? ''} ${ex.expression ?? ''}`);
        expect(fractions[0][1]).toBe(fractions[1][1]);
        expect(fractions[0][1]).toBeLessThanOrEqual(12);
      }
    }
  });

  it('Stufe 2: one Nenner a multiple of the other, up to 20', () => {
    for (const ab of [1, 2] as const) {
      for (const ex of items(plusMinusSkill, 2, ab)) {
        const [a, b] = fractionsIn(`${ex.context ?? ''} ${ex.expression ?? ''}`);
        const [low, high] = [Math.min(a[1], b[1]), Math.max(a[1], b[1])];
        expect(high % low, ex.key).toBe(0);
        expect(low).toBeLessThan(high);
        expect(high).toBeLessThanOrEqual(20);
      }
    }
  });

  it('Stufe 3: Hauptnenner up to 24, no Nenner a multiple of the other, and no gemischte Zahl: no plan is known (research §6)', () => {
    for (const ab of ABS_ALL) {
      for (const ex of items(plusMinusSkill, 3, ab)) {
        const [a, b] = fractionsIn(`${ex.context ?? ''} ${ex.expression ?? ''}`);
        expect(lcm(a[1], b[1])).toBeLessThanOrEqual(24);
        expect(a[1] % b[1] !== 0 && b[1] % a[1] !== 0, ex.key).toBe(true);
        expect(`${ex.context ?? ''} ${ex.expression ?? ''}`, ex.key).not.toMatch(/\{frac:\d+ /);
        expect(ex.answer.kind === 'fraction' && ex.answer.whole, ex.key).toBeFalsy();
      }
    }
    expect(Object.values(plusMinusSkill.stufen).join(' ')).not.toMatch(/gemischt/i);
  });

  it('Stufe 3: AB varies the demand: a small Hauptnenner, then from 18 on or a story, then reversed or what remains', () => {
    for (const ex of items(plusMinusSkill, 3, 1)) {
      const [a, b] = fractionsIn(ex.expression!);
      expect(lcm(a[1], b[1]), ex.key).toBeLessThanOrEqual(15);
    }
    for (const ex of items(plusMinusSkill, 3, 2).filter((e) => !e.context)) {
      const [a, b] = fractionsIn(ex.expression!);
      expect(lcm(a[1], b[1]), ex.key).toBeGreaterThanOrEqual(18);
    }
    expect(new Set(items(plusMinusSkill, 3, 3).map(formOf))).toEqual(new Set(['luecke', 'rest']));
  });

  it('the forms for a plan with gemischte Zahlen stay sound: well-formed, calculating, and using the Ganze', () => {
    let wholes = 0;
    for (const ab of [2, 3] as const) {
      for (const ex of plannedItems(ab)) {
        assertWellFormedExercise(plusMinusSkill, 3, ex);
        expect(checkWorkedSolution(ex), ex.key).toEqual([]);
        const [a, b] = fractionsIn(`${ex.context ?? ''} ${ex.expression ?? ''}`);
        expect(lcm(a[1], b[1])).toBeLessThanOrEqual(24);
        if (ex.answer.kind === 'fraction' && ex.answer.whole) wholes++;
      }
    }
    expect(wholes).toBeGreaterThan(100);
  });

  it('crossing a Ganzes: the fraction of the result is the larger one first', () => {
    for (const ex of plannedItems(3).filter((e) => formOf(e) === 'gemischt')) {
      const [a, b] = fractionsIn(ex.expression!) as Frac[];
      expect(sameValue(valueOf(ex.answer), differenceOf(a, b) as [number, number]), ex.key).toBe(true);
      const [m, n] = [...ex.expression!.matchAll(/\{frac:(\d+) (\d+)\/(\d+)\}/g)].map((x) => (Number(x[2]) / Number(x[3])));
      expect(m).toBeLessThan(n);
    }
  });

  it('an equal value that can be shortened uses no attempt; a gemischte Zahl is right too', () => {
    for (const ex of items(plusMinusSkill, 1, 1)) {
      if (ex.answer.kind !== 'fraction') throw new Error('fraction');
      const { numerator: n, denominator: d } = ex.answer;
      const doubled = checkAnswer(ex.answer, { kind: 'fraction', numerator: String(n * 2), denominator: String(d * 2) }, ex.bugs);
      if (n > 0) expect(doubled.invalid === FRACTION_NOT_LOWEST || doubled.bugHint !== undefined, ex.key).toBe(true);
    }
    for (const ex of items(plusMinusSkill, 1, 2).filter((e) => formOf(e) === 'gleich-ueber')) {
      if (ex.answer.kind !== 'fraction') throw new Error('fraction');
      const whole = Math.floor(ex.answer.numerator / ex.answer.denominator);
      const r = checkAnswer(ex.answer, { kind: 'fraction', whole: String(whole), numerator: String(ex.answer.numerator - whole * ex.answer.denominator), denominator: String(ex.answer.denominator) });
      expect(r.correct, ex.key).toBe(true);
    }
  });
});
