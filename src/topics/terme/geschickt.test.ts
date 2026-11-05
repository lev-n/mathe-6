import { describe, expect, it } from 'vitest';
import { describeSkill } from '../../core/testing';
import { createRng } from '../../core/rng';
import type { Ab, Exercise, Stufe } from '../../core/types';
import { checkWorkedSolution } from '../step-check';
import { CTX } from '../test-utils';
import { geschicktSkill } from './geschickt';
import { answerValue, evalTerm, sameFrac, sidesWith, termNumber } from './test-utils';

describeSkill(geschicktSkill, { minDistinct: 30 });

const planned = (stufe: Stufe, ab: Ab, count = 300): Exercise[] => Array.from({ length: count }, (_, i) => geschicktSkill.generate(createRng(i * 4441 + 3), stufe, { ...CTX, ab }));
const correct = (ex: Exercise): string => {
  if (ex.answer.kind !== 'choice') throw new Error('choice');
  return ex.answer.options[ex.answer.correct].label;
};

describe('terme.geschickt', () => {
  it('a term = □ has the answer as its value; every other gap fills to an equation', () => {
    for (const stufe of [1, 2, 3] as Stufe[]) {
      for (const ab of [1, 2, 3] as Ab[]) {
        for (const ex of planned(stufe, ab)) {
          if (ex.answer.kind === 'choice' || !ex.expression) continue;
          const parts = ex.expression.split(' = ');
          if (parts[parts.length - 1] === '□') {
            for (const side of parts.slice(0, -1)) expect(sameFrac(evalTerm(side), answerValue(ex)), `${ex.key}: ${side}`).toBe(true);
          } else {
            const [left, right] = sidesWith(ex.expression, String(ex.answer.kind === 'number' ? ex.answer.value : 0).replace('.', ','));
            expect(termNumber(left), ex.key).toBe(termNumber(right));
          }
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

  it('Stufe 1 keeps natural numbers: the pair makes a round number, and the pair is not given side by side', () => {
    for (const ab of [1, 2, 3] as Ab[]) {
      for (const ex of planned(1, ab)) expect(`${ex.expression ?? ''} ${ex.prompt}`, ex.key).not.toMatch(/\d,\d|\{frac/);
    }
    for (const ex of planned(1, 1)) {
      if (!ex.key.includes(':summe:')) continue;
      const [a, b, c] = (ex.expression ?? '').match(/\d+/g)!.map(Number);
      expect((a + c) % 10, ex.key).toBe(0);
      expect((a + b) % 10 === 0 && (b + c) % 10 === 0, ex.key).toBe(false);
    }
  });

  it('Stufe 2 zerlegt: the task names or shows the factor, with natural numbers only', () => {
    for (const ab of [1, 2, 3] as Ab[]) {
      for (const ex of planned(2, ab)) {
        const text = [ex.expression, ...(ex.answer.kind === 'choice' ? ex.answer.options.map((o) => o.label) : [])].join(' ');
        expect(text, ex.key).toMatch(/·/);
        expect(text, ex.key).not.toMatch(/\d,\d|\{frac/);
      }
    }
  });

  it('Stufe 3 always holds a decimal or a fraction', () => {
    for (const ab of [1, 2, 3] as Ab[]) {
      for (const ex of planned(3, ab)) expect(ex.expression, ex.key).toMatch(/\d,\d|\{frac/);
    }
  });

  it('at Stufe 3, AB III: the best way keeps the value; each other option says why it was left', () => {
    for (const ex of planned(3, 3)) {
      if (ex.answer.kind !== 'choice') throw new Error('choice');
      const value = evalTerm(ex.expression ?? '');
      expect(sameFrac(evalTerm(correct(ex)), value), ex.key).toBe(true);
      for (const o of ex.answer.options) {
        if (o.label === correct(ex)) continue;
        // 'stimmt auch' only where the value stays, and 'ändert sich' only where it changes
        const same = sameFrac(evalTerm(o.label), value);
        expect(/stimmt auch/.test(o.whyWrong ?? ''), `${ex.key}: ${o.label}: ${o.whyWrong}`).toBe(same);
      }
    }
  });

  it('at Stufe 2, AB III: only the correct decomposition has the value', () => {
    for (const ex of planned(2, 3)) {
      if (ex.answer.kind !== 'choice') continue;
      const value = evalTerm(ex.expression ?? '');
      for (const o of ex.answer.options) expect(sameFrac(evalTerm(o.label), value), `${ex.key}: ${o.label}`).toBe(o.label === correct(ex));
    }
  });

  it('Stufe 3: the answer of a number item never stands in the task', () => {
    for (const ab of [1, 2] as Ab[]) {
      for (const ex of planned(3, ab, 2000)) {
        if (ex.answer.kind !== 'number') continue;
        const shown = (ex.expression ?? '').replace(/\{frac:[^}]+\}/g, ' ').match(/\d+(?:,\d+)?/g)!.map((s) => Number(s.replace(',', '.')));
        expect(shown, ex.key).not.toContain(ex.answer.value);
      }
    }
  });

  it('Stufe 3: a fraction stands in lowest terms, and fractions come with plus only: no Bruch · Zahl in a core skill', () => {
    let seen = 0;
    const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
    for (const ab of [1, 2, 3] as Ab[]) {
      for (const ex of planned(3, ab, 2000)) {
        const text = ex.expression ?? '';
        if (!/\{frac/.test(text)) continue;
        seen += 1;
        expect(text, ex.key).not.toMatch(/\} [·:]|[·:] \{frac/);
        for (const [, top, d] of text.matchAll(/\{frac:(\d+)\/(\d+)\}/g)) expect(gcd(Number(top), Number(d)), ex.key).toBe(1);
      }
    }
    expect(seen).toBeGreaterThan(300);
  });

  it('Stufe 3, way by tauschen: the correct way is another term than the one shown, also when x equals a factor', () => {
    let seen = 0;
    for (let i = 0; i < 6000; i++) {
      const ex = geschicktSkill.generate(createRng(i * 13 + 1), 3, { ...CTX, ab: 3 });
      if (!ex.key.includes(':weg:tauschen:')) continue;
      seen += 1;
      expect(correct(ex), ex.key).not.toBe(ex.expression);
    }
    expect(seen).toBeGreaterThan(500);
  });

  it('the Stufen rise at AB I and AB II: the third factor of Stufe 1 stays small, and Stufe 3 sums have hundredths', () => {
    for (const ab of [1, 2] as Ab[]) {
      for (const ex of planned(1, ab, 1000)) {
        if (!ex.expression?.includes('·')) continue;
        const factors = ex.expression.replace(' = □', '').split(' · ').map(Number).sort((a, b) => a - b);
        expect(factors[0], ex.key).toBeLessThanOrEqual(9);
      }
    }
    for (const ex of planned(2, 2, 1000)) expect((ex.expression ?? '').split(' ')[2], ex.key).toMatch(/^[6-9]$/);
    for (const ex of planned(3, 1, 1000)) if (ex.key.includes(':dez-plus:')) expect(ex.expression, ex.key).toMatch(/\d,\d\d/);
  });

  it('the Stufen rise: Stufe 2 has two-digit factors above the small products of Stufe 1, at each AB', () => {
    for (const ex of planned(2, 1, 1000)) expect(Number(/\b(\d{2,})\b/.exec(ex.expression ?? '')![1]), ex.key).toBeGreaterThanOrEqual(32);
    for (const ex of planned(2, 2, 1000)) expect(ex.answer.kind === 'number' ? (ex.answer.value as number) : 0, ex.key).toBeGreaterThanOrEqual(190);
    for (const ab of [1, 2] as Ab[]) {
      for (const ex of planned(1, ab, 1000)) if (ex.expression?.includes('·')) expect(ex.expression, ex.key).not.toMatch(/\b125\b/);
    }
  });

  it('Stufe 2, gap back: varied answers, a hint in plain words, and a bug hint that fits', () => {
    const items = planned(2, 3, 2000).filter((ex) => ex.key.includes(':zurueck:'));
    expect(new Set(items.map((ex) => (ex.answer.kind === 'number' ? ex.answer.value : 0))).size).toBeGreaterThanOrEqual(5);
    for (const ex of items) {
      expect(ex.hints[0], ex.key).toMatch(/^Links steht \d+-mal \d+ und \d+-mal \d+\.$/);
      for (const b of ex.bugs ?? []) expect(b.hint, ex.key).not.toMatch(/Zerlegung/);
    }
  });

  it('Stufe 3, way by tauschen: an option marked as less easy keeps the pair apart', () => {
    for (const ex of planned(3, 3, 2000)) {
      if (!ex.key.includes(':weg:tauschen:') || ex.answer.kind !== 'choice') continue;
      const [, p, q] = /^(\S+) · \S+ · (\S+)$/.exec(ex.expression ?? '')!;
      for (const o of ex.answer.options) if (/stimmt auch/.test(o.whyWrong ?? '')) expect(o.label, ex.key).toBe(`${q} · ${/· (\d+) ·/.exec(ex.expression ?? '')![1]} · ${p}`);
    }
  });

  it('where tauschen fails, the swapped term has another value and the others keep it', () => {
    for (const ex of planned(1, 3)) {
      if (!ex.key.includes(':tauschen:') || ex.answer.kind !== 'choice') continue;
      const [a, b] = correct(ex).split(' − ').map(Number);
      expect(a - b, ex.key).not.toBe(b - a);
    }
  });
});
