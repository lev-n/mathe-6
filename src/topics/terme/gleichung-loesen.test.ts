import { describe, expect, it } from 'vitest';
import { describeSkill } from '../../core/testing';
import { createRng } from '../../core/rng';
import type { Ab, Exercise, Stufe } from '../../core/types';
import { checkWorkedSolution } from '../step-check';
import { CTX } from '../test-utils';
import { gleichungLoesenSkill } from './gleichung-loesen';
import { evalTerm, sameFrac } from './test-utils';

describeSkill(gleichungLoesenSkill, { minDistinct: 30 });

const planned = (stufe: Stufe, ab: Ab, count = 300): Exercise[] => Array.from({ length: count }, (_, i) => gleichungLoesenSkill.generate(createRng(i * 1999 + 23), stufe, { ...CTX, ab }));
const correct = (ex: Exercise): string => {
  if (ex.answer.kind !== 'choice') throw new Error('choice');
  return ex.answer.options[ex.answer.correct].label;
};
const holds = (equation: string, x: number) => {
  const [left, right] = equation.split(' = ');
  return sameFrac(evalTerm(left, { x }), evalTerm(right, { x }));
};

describe('terme.gleichung-loesen', () => {
  it('uses only number and choice answers (§6), with whole numbers', () => {
    for (const stufe of [1, 2, 3] as Stufe[]) {
      for (const ab of [1, 2, 3] as Ab[]) {
        for (const ex of planned(stufe, ab, 80)) {
          expect(['number', 'choice'], ex.key).toContain(ex.answer.kind);
          if (ex.answer.kind === 'number') expect(Number.isInteger(ex.answer.value), ex.key).toBe(true);
        }
      }
    }
  });

  it('the number answer solves the equation', () => {
    for (const stufe of [1, 2, 3] as Stufe[]) {
      for (const ab of [1, 2, 3] as Ab[]) {
        for (const ex of planned(stufe, ab)) {
          if (ex.answer.kind !== 'number' || !ex.expression) continue;
          expect(holds(ex.expression, ex.answer.value as number), ex.key).toBe(true);
        }
      }
    }
  });

  it('the chosen fraction solves the equation, and no other option does', () => {
    for (const ab of [1, 2] as Ab[]) {
      for (const ex of planned(3, ab)) {
        if (ex.answer.kind !== 'choice' || !ex.expression) continue;
        const [left, right] = ex.expression.split(' = ');
        const solves = (label: string) => sameFrac(evalTerm(left.replace('x', `(${label})`)), evalTerm(right));
        expect(solves(correct(ex)), ex.key).toBe(true);
        for (const o of ex.answer.options) if (o.label !== correct(ex)) expect(solves(o.label), `${ex.key} ${o.label}`).toBe(false);
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

  it('Stufe 1 stays with plus and minus; Stufe 2 with mal and geteilt, with a whole result', () => {
    for (const ab of [1, 2, 3] as Ab[]) {
      for (const ex of planned(1, ab)) expect(ex.expression, ex.key).toMatch(/^(x|\d+) [+−] /);
      for (const ex of planned(2, ab)) expect(ex.expression, ex.key).toMatch(/[·:]/);
    }
  });

  it('Stufe 2, equal solution: only the correct option keeps the solution of the shown equation', () => {
    for (const ex of planned(2, 3)) {
      if (!ex.key.includes('gleiche-loesung') || ex.answer.kind !== 'choice') continue;
      const [a, c] = (ex.expression ?? '').match(/\d+/g)!.map(Number);
      const x = c / a;
      for (const o of ex.answer.options) expect(holds(o.label, x), `${ex.key} ${o.label}`).toBe(o.label === correct(ex));
    }
  });

  it('Stufe 3: text to equation; the correct equation holds for the numbers of the text', () => {
    for (const ex of planned(3, 2)) {
      if (!ex.key.includes(':text:')) continue;
      const numbers = (ex.context ?? '').match(/\d+/g)!.map(Number);
      const eq = correct(ex);
      for (const shown of eq.match(/\d+/g) ?? []) expect(numbers, ex.key).toContain(Number(shown));
      expect(eq, ex.key).toMatch(/x/);
    }
  });

  it('Stufe 3: the text solved: x gives the stated total, and the variable is named', () => {
    for (const ex of planned(3, 3)) {
      if (!ex.key.includes('text-loesen')) continue;
      const [a, b, c] = (ex.context ?? '').match(/\d+/g)!.map(Number);
      expect(a * (ex.answer.kind === 'number' ? (ex.answer.value as number) : NaN) + b, ex.key).toBe(c);
      expect(ex.context, ex.key).toMatch(/x ist/);
    }
  });

  it('the Stufen rise: Stufe 2 has no factor 2 or 3 and no small result at AB I and AB II', () => {
    for (const ex of planned(2, 1, 1000)) {
      const [a, c] = (ex.expression ?? '').match(/\d+/g)!.map(Number);
      expect(a, ex.key).toBeGreaterThanOrEqual(4);
      expect(c, ex.key).toBeGreaterThanOrEqual(24);
    }
    for (const ex of planned(2, 2, 1000)) {
      const [a, c] = (ex.expression ?? '').match(/\d+/g)!.map(Number);
      expect(a, ex.key).toBeGreaterThanOrEqual(6);
      expect(c, ex.key).toBeGreaterThanOrEqual(12);
    }
  });

  it('Stufe 3: a fractional x needs equal Nenner first, and the correct option never repeats the number beside x', () => {
    let seen = 0;
    for (const ab of [1, 2] as Ab[]) {
      for (const ex of planned(3, ab, 3000)) {
        if (!ex.key.includes('bruch-plus')) continue;
        seen += 1;
        const ds = [...(ex.expression ?? '').matchAll(/\/(\d+)\}/g)].map((m) => Number(m[1]));
        expect(ds[0], ex.key).not.toBe(ds[1]);
        if (ab === 2) expect(ds[0] % ds[1] !== 0 && ds[1] % ds[0] !== 0, ex.key).toBe(true);
        expect(ex.expression, ex.key).not.toContain(correct(ex));
        for (const h of ex.hints) expect(h, ex.key).not.toContain(correct(ex));
      }
    }
    expect(seen).toBeGreaterThan(1000);
  });

  it('Stufe 1, AB III varies: the right step is not always minus the number next to x', () => {
    const items = planned(1, 3, 1000);
    const forms = new Set(items.map((ex) => ex.key.split(':')[2]));
    expect(forms.size).toBeGreaterThanOrEqual(2);
    expect(items.some((ex) => /^Auf beiden Seiten plus/.test(correct(ex)))).toBe(true);
    expect(items.some((ex) => /^Auf beiden Seiten minus/.test(correct(ex)))).toBe(true);
    expect(items.some((ex) => ex.key.includes(':gleiche-plus:'))).toBe(true);
    for (const ex of items) {
      if (!ex.key.includes(':gleiche-plus:') || ex.answer.kind !== 'choice') continue;
      const [b, c] = (ex.expression ?? '').match(/\d+/g)!.map(Number);
      for (const o of ex.answer.options) expect(holds(o.label, c - b), `${ex.key} ${o.label}`).toBe(o.label === correct(ex));
    }
  });

  it('Stufe 3: AB III has several stories and no equation of AB I; AB I has many fraction equations', () => {
    const stories = new Set(planned(3, 3, 1000).filter((ex) => ex.key.includes('text-loesen')).map((ex) => /kauft \d+ (\S+ \S+)/.exec(ex.context ?? '')![1]));
    expect(stories.size).toBeGreaterThanOrEqual(3);
    const easy = new Set(planned(3, 1, 4000).map((ex) => ex.expression));
    for (const ex of planned(3, 3, 1000)) if (ex.key.includes('bruch-mal')) expect(easy.has(ex.expression), ex.key).toBe(false);
    const plus = new Set(planned(3, 1, 4000).filter((ex) => ex.key.includes('bruch-plus')).map((ex) => ex.expression));
    expect(plus.size).toBeGreaterThanOrEqual(30);
  });

  it('prices fit their things: a Heft costs a few €', () => {
    for (const ab of [2, 3] as Ab[]) {
      for (const ex of planned(3, ab, 1000)) {
        const eq = /Ein Heft kostet x €\. \S+ kauft (\d+) Hefte und bezahlt (\d+) €/.exec(ex.context ?? '');
        if (eq) expect(Number(eq[2]) / Number(eq[1]), ex.key).toBeLessThanOrEqual(5);
        if (ex.key.includes('text-loesen') && /Hefte/.test(ex.context ?? '') && ex.answer.kind === 'number') expect(ex.answer.value as number, ex.key).toBeLessThanOrEqual(5);
      }
    }
  });

  it('umkehr-gleiche-rechnung computes from the pattern: x + 5 = 12 gives 17', () => {
    for (const ex of planned(1, 1)) {
      const [b, c] = (ex.expression ?? '').match(/\d+/g)!.map(Number);
      expect(ex.bugs?.find((x) => x.id === 'umkehr-gleiche-rechnung')?.match, ex.key).toBe(b + c);
    }
  });
});
