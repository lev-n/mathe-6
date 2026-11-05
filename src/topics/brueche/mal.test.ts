import { describe, expect, it } from 'vitest';
import { describeSkill } from '../../core/testing';
import { compareFrac, productOf, type Frac } from './helpers';
import { malSkill } from './mal';
import { ABS_ALL, expectAnswerFollowsNumbers, expectSoundItems, formOf, fractionsIn, items, sameValue, valueOf, wholeNumbersIn } from './test-helpers';

describeSkill(malSkill);

describe('brueche.mal specifics', () => {
  it('every Stufe has its Bruchstreifen in the worked steps, and a product under it is as long as the product', () => {
    for (const stufe of [1, 2, 3] as const) {
      const steps = ABS_ALL.flatMap((ab) => items(malSkill, stufe, ab)).flatMap((ex) => ex.steps);
      const bars = steps.flatMap((s) => (typeof s !== 'string' && s.visual?.type === 'fractionModel' ? [s.visual] : []));
      expect(bars.length, `Stufe ${stufe}`).toBeGreaterThan(50);
      for (const bar of bars) {
        expect(bar.filled).toBeLessThanOrEqual(bar.parts * (bar.wholes ?? 1));
        if (bar.compare) expect(bar.compare.filled / bar.compare.parts).toBeLessThan(bar.filled / bar.parts);
      }
    }
  });

  it('worked steps calculate, and a task has one key', () => expectSoundItems(malSkill));

  it('Stufe 1: Bruch · natürliche Zahl recomputes, Nenner up to 10', () => {
    for (const ex of [...items(malSkill, 1, 1), ...items(malSkill, 1, 2)]) {
      const [[n, d]] = fractionsIn(ex.expression!);
      const [k] = wholeNumbersIn(ex.expression!);
      expect(d).toBeLessThanOrEqual(10);
      if (ex.answer.kind === 'number') expect(ex.answer.value).toBe((n * k) / d);
      else expect(sameValue(valueOf(ex.answer), [n * k, d]), ex.key).toBe(true);
    }
  });

  it('Stufe 1: a missing factor recomputes', () => {
    for (const ex of items(malSkill, 1, 3).filter((e) => formOf(e) === 'luecke-zahl')) {
      const [[n, d], [m, e]] = fractionsIn(ex.expression!);
      expect(e).toBe(d);
      expect((ex.answer as { value: number }).value).toBe(m / n);
    }
  });

  it('Stufe 2: Bruch · Bruch recomputes; AB II and III can be shortened across first', () => {
    for (const ab of [1, 2] as const) {
      for (const ex of items(malSkill, 2, ab)) {
        const [a, b] = fractionsIn(ex.expression!) as Frac[];
        expect(Math.max(a[1], b[1])).toBeLessThanOrEqual(10);
        expect(sameValue(valueOf(ex.answer), productOf(a, b) as [number, number]), ex.key).toBe(true);
      }
    }
    for (const ex of items(malSkill, 2, 2)) {
      const [a, b] = fractionsIn(ex.expression!) as Frac[];
      const [n, d] = [a[0] * b[1], b[0] * a[1]];
      const hasCommon = (x: number, y: number) => { for (let k = 2; k <= Math.min(x, y); k++) if (x % k === 0 && y % k === 0) return true; return false; };
      expect(hasCommon(a[0], b[1]) || hasCommon(b[0], a[1]), `${ex.key} ${n} ${d}`).toBe(true);
    }
  });

  it('Stufe 2: a missing fraction recomputes', () => {
    for (const ex of items(malSkill, 2, 3).filter((e) => formOf(e) === 'luecke-bruch')) {
      const [a, c] = fractionsIn(ex.expression!) as Frac[];
      const value = valueOf(ex.answer);
      expect(sameValue([a[0] * value[0], a[1] * value[1]], c as [number, number]), ex.key).toBe(true);
    }
  });

  it('Stufe 3: Anteil vom Anteil recomputes, and the result is smaller than both factors', () => {
    for (const ab of [1, 2] as const) {
      for (const ex of items(malSkill, 3, ab)) {
        const [a, b] = fractionsIn(ex.context!) as Frac[];
        const value = valueOf(ex.answer);
        expect(sameValue(value, productOf(a, b) as [number, number]), ex.key).toBe(true);
        expect(compareFrac(value, a)).toBeLessThan(0);
        expect(compareFrac(value, b)).toBeLessThan(0);
      }
    }
  });

  it('Stufe 3: the area model is a block of a rows and b columns, as its step says', () => {
    let drawn = 0;
    for (const ab of [1, 2] as const) {
      for (const ex of items(malSkill, 3, ab, 400)) {
        const [a, b] = fractionsIn(ex.context!) as Frac[];
        for (const step of ex.steps) {
          if (typeof step === 'string' || step.visual?.type !== 'grid') continue;
          drawn++;
          expect([step.visual.height, step.visual.width], ex.key).toEqual([a[1], b[1]]);
          expect(step.visual.cells.length, ex.key).toBe(a[0] * b[0]);
          expect(step.visual.cells.every(([x, y]) => x < b[0] && y < a[0]), ex.key).toBe(true);
          expect(step.text, ex.key).toContain(`${a[1]} · ${b[1]} = ${a[1] * b[1]} Teile`);
          expect(step.text, ex.key).toContain(`= ${a[0] * b[0]} sind gefärbt`);
        }
      }
    }
    expect(drawn).toBeGreaterThan(100);
  });

  it('Stufe 3: never two Stammbrüche, the case Stufe 2 excludes; exactly one at AB I, none at AB II, and the first hint leaves the modelling to the child', () => {
    for (const [ab, stammbrueche] of [[1, 1], [2, 0]] as const) {
      for (const ex of items(malSkill, 3, ab, 600)) {
        const fractions = fractionsIn(ex.context!);
        expect(fractions.filter(([n]) => n === 1).length, ex.key).toBe(stammbrueche);
        expect(ex.hints[0], ex.key).not.toMatch(/\bmal\b/);
      }
    }
  });

  it('Stufe 3, the verb follows the fraction: 1/2 der Klasse fährt, 3/4 der Klasse fahren', () => {
    for (const ab of [1, 2] as const) {
      for (const ex of items(malSkill, 3, ab, 400).filter((e) => /Klasse 6b/.test(e.context!))) {
        const [a, b] = fractionsIn(ex.context!) as Frac[];
        expect(ex.context, ex.key).toContain(a[0] === 1 ? ' fährt ' : ' fahren ');
        expect(ex.context, ex.key).toContain(b[0] === 1 ? ' trägt ' : ' tragen ');
      }
    }
  });

  it('Stufe 3, the smallest product: the answer depends on the fractions, and it recomputes', () => {
    const choices = items(malSkill, 3, 3, 400).filter((e) => formOf(e) === 'kleinstes');
    expectAnswerFollowsNumbers(choices, 20);
    for (const ex of choices) {
      if (ex.answer.kind !== 'choice') throw new Error('choice');
      const value = (label: string) => { const [a, b] = fractionsIn(label) as Frac[]; return productOf(a, b); };
      const right = value(ex.answer.options[ex.answer.correct].label);
      for (const o of ex.answer.options) expect(compareFrac(right, value(o.label)), ex.key).toBeLessThanOrEqual(0);
    }
  });

  it('Stufe 3: what remains of the rest recomputes', () => {
    for (const ex of items(malSkill, 3, 3).filter((e) => formOf(e) === 'vom-rest')) {
      const [a, b] = fractionsIn(ex.context!) as Frac[];
      const want = productOf([a[1] - a[0], a[1]], [b[1] - b[0], b[1]]);
      expect(sameValue(valueOf(ex.answer), want as [number, number]), ex.key).toBe(true);
    }
  });

  it('a fraction answer ends in lowest terms and the Ganze is offered', () => {
    for (const stufe of [1, 2, 3] as const) {
      for (const ab of ABS_ALL) {
        for (const ex of items(malSkill, stufe, ab)) {
          if (ex.answer.kind !== 'fraction') continue;
          expect(ex.answer.accept).toBe('lowest');
          expect(ex.answer.allowMixed).toBe(true);
        }
      }
    }
  });
});
