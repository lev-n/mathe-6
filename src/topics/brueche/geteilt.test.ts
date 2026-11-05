import { describe, expect, it } from 'vitest';
import { describeSkill } from '../../core/testing';
import { geteiltSkill } from './geteilt';
import { compareFrac, gcd, quotientOf, type Frac } from './helpers';
import { srTextWithPicture } from '../../ui/visuals/describe';
import { ABS_ALL, STUFEN_ALL, expectAnswerFollowsNumbers, expectSoundItems, formOf, fractionsIn, items, sameValue, valueOf, wholeNumbersIn } from './test-helpers';

describeSkill(geteiltSkill);

const numberValue = (ex: { answer: unknown }) => (ex.answer as { value: number }).value;

describe('brueche.geteilt specifics', () => {
  it('every Stufe has its Bruchstreifen in the worked steps, and each one fits the task', () => {
    for (const stufe of STUFEN_ALL) {
      const bars = ABS_ALL.flatMap((ab) => items(geteiltSkill, stufe, ab)).flatMap((ex) => ex.steps.flatMap((s) => (typeof s !== 'string' && s.visual?.type === 'fractionModel' ? [s.visual] : [])));
      expect(bars.length, `Stufe ${stufe}`).toBeGreaterThan(50);
      for (const bar of bars) {
        expect(bar.form).toBe('bar');
        expect(bar.filled).toBeLessThanOrEqual(bar.parts * (bar.wholes ?? 1));
        if (bar.compare) expect(bar.compare.filled).toBeLessThanOrEqual(bar.compare.parts);
        if (bar.compare) expect(bar.wholes ?? 1).toBe(1);
      }
    }
  });

  it('worked steps calculate, and a task has one key', () => expectSoundItems(geteiltSkill));

  it('Stufe 1: Bruch : natürliche Zahl recomputes, Nenner up to 10', () => {
    for (const ab of [1, 2] as const) {
      for (const ex of items(geteiltSkill, 1, ab)) {
        const [[n, d]] = fractionsIn(ex.expression!);
        const [k] = wholeNumbersIn(ex.expression!);
        expect(d).toBeLessThanOrEqual(10);
        expect(sameValue(valueOf(ex.answer), [n, d * k]), ex.key).toBe(true);
      }
    }
  });

  it('Stufe 1: a story and a missing Dividend recompute', () => {
    for (const ex of items(geteiltSkill, 1, 3)) {
      if (formOf(ex) === 'text') {
        const [[n, d]] = fractionsIn(ex.context!);
        const k = Number(/auf (\d+) |in (\d+) /.exec(ex.context!)!.slice(1).find(Boolean));
        expect(sameValue(valueOf(ex.answer), [n, d * k]), ex.key).toBe(true);
      } else {
        const [[n, d]] = fractionsIn(ex.expression!);
        const [k] = wholeNumbersIn(ex.expression!);
        expect(sameValue(valueOf(ex.answer), [n * k, d]), ex.key).toBe(true);
      }
    }
  });

  it('Stufe 2: Bruch : Bruch recomputes by the Kehrwert, in lowest terms', () => {
    for (const ab of [1, 2] as const) {
      for (const ex of items(geteiltSkill, 2, ab)) {
        const [a, b] = fractionsIn(ex.expression!) as Frac[];
        expect(Math.max(a[1], b[1])).toBeLessThanOrEqual(10);
        const value = valueOf(ex.answer);
        expect(sameValue(value, [a[0] * b[1], a[1] * b[0]]), ex.key).toBe(true);
        expect(gcd(value[0], value[1])).toBe(1);
      }
    }
  });

  it('Stufe 2: the right calculation has the Kehrwert of the second fraction', () => {
    for (const ex of items(geteiltSkill, 2, 3).filter((e) => formOf(e) === 'welche')) {
      if (ex.answer.kind !== 'choice') throw new Error('choice');
      const [a, b] = fractionsIn(ex.expression!) as Frac[];
      const [x, y] = fractionsIn(ex.answer.options[ex.answer.correct].label);
      expect(x).toEqual(a);
      expect(y).toEqual([b[1], b[0]]);
    }
  });

  it('Stufe 3: Wie oft passt recomputes to a whole number, and the result is larger than the Dividend', () => {
    for (const ab of [1, 2] as const) {
      for (const ex of items(geteiltSkill, 3, ab)) {
        const fractions = ex.context ? (fractionsIn(ex.context) as Frac[]) : (fractionsIn(ex.prompt).reverse() as Frac[]);
        const [a, b]: Frac[] = fractions.length === 2 ? fractions : [[wholeNumbersIn(ex.prompt)[0], 1], fractions[0]];
        expect(sameValue([numberValue(ex), 1], quotientOf(a, b) as [number, number]), ex.key).toBe(true);
        expect(compareFrac([numberValue(ex), 1], a), ex.key).toBeGreaterThan(0);
        expect(a[1], `${ex.key}: Nenner differ, so this takes more than the Zähler`).not.toBe(b[1]);
        expect(b[0] > 1 || a[0] > 1, `${ex.key}: two Stammbrüche only ask for the Nenner`).toBe(true);
      }
    }
    for (const ex of items(geteiltSkill, 3, 1)) expect(compareFrac(fractionsIn(ex.prompt)[1], [1, 1]), ex.key).toBeLessThan(0);
    for (const ex of items(geteiltSkill, 3, 2).filter((e) => formOf(e) === 'passt-unecht')) expect(compareFrac(fractionsIn(ex.prompt)[1], [1, 1]), ex.key).toBeGreaterThan(0);
    for (const ex of items(geteiltSkill, 3, 2).filter((e) => formOf(e) === 'passt-zahl')) expect(fractionsIn(ex.prompt)[0][0], ex.key).toBeGreaterThan(1);
  });

  it('Stufe 3: a Bruch into a Bruch never shares its Zähler, or the Nenner alone give the answer, and no Nenner above 20', () => {
    const pairs = [...items(geteiltSkill, 3, 1, 600), ...items(geteiltSkill, 3, 2, 600), ...items(geteiltSkill, 3, 3, 600)].filter((e) => formOf(e) !== 'groesstes' && formOf(e) !== 'passt-zahl');
    expect(pairs.length).toBeGreaterThan(500);
    for (const ex of pairs) {
      const [a, b] = fractionsIn(ex.context ?? ex.prompt);
      expect(a[0], ex.key).not.toBe(b[0]);
      expect(Math.max(a[1], b[1]), ex.key).toBeLessThanOrEqual(20);
    }
  });

  it('Stufe 1: a Nenner that was divided gets a hint that holds for every item: the right Nenner can be smaller too', () => {
    let seen = 0;
    for (const ab of ABS_ALL) {
      for (const ex of items(geteiltSkill, 1, ab, 400)) {
        const bug = ex.bugs?.find((b) => b.id === 'nenner-geteilt');
        if (!bug) continue;
        seen++;
        const [dividend] = fractionsIn(ex.expression ?? ex.context!);
        const { numerator, denominator } = bug.match as { numerator: number; denominator: number };
        expect(compareFrac([numerator, denominator], dividend), ex.key).toBeGreaterThan(0);
        expect(bug.hint, ex.key).toMatch(/größer/);
        expect(bug.hint, ex.key).not.toMatch(/Nenner kann nicht/);
      }
    }
    expect(seen).toBeGreaterThan(50);
  });

  it('Stufe 3 is more than Stufe 2 at each AB: no bar to count, and AB I is not a handful of items', () => {
    for (const ab of ABS_ALL) for (const ex of items(geteiltSkill, 3, ab)) expect(ex.visual, ex.key).toBeUndefined();
    expect(new Set(items(geteiltSkill, 3, 1, 800).map((e) => e.key)).size).toBeGreaterThan(30);
  });

  it('Stufe 3, full portions: the Rest does not count', () => {
    const stories = items(geteiltSkill, 3, 3, 400).filter((e) => formOf(e) === 'passt-rest');
    expect(stories.length).toBeGreaterThan(100);
    for (const ex of stories) {
      const [a, b] = fractionsIn(ex.context!);
      expect(numberValue(ex), ex.key).toBe(Math.floor((a[0] * b[1]) / (a[1] * b[0])));
      expect((a[0] * b[1]) % (a[1] * b[0]), ex.key).not.toBe(0);
    }
  });

  it('Stufe 3, the largest result: the smallest second fraction, wherever it stands', () => {
    const choices = items(geteiltSkill, 3, 3, 400).filter((e) => formOf(e) === 'groesstes');
    expectAnswerFollowsNumbers(choices, 20);
    for (const ex of choices) {
      if (ex.answer.kind !== 'choice') throw new Error('choice');
      const value = (label: string) => { const [a, b] = fractionsIn(label) as Frac[]; return quotientOf(a, b); };
      const right = value(ex.answer.options[ex.answer.correct].label);
      for (const o of ex.answer.options) expect(compareFrac(right, value(o.label)), ex.key).toBeGreaterThanOrEqual(0);
    }
  });

  it('what a screen reader says never holds a whole number that is the answer', () => {
    for (const ab of ABS_ALL) {
      for (const ex of items(geteiltSkill, 3, ab)) {
        if (ex.answer.kind !== 'number') continue;
        expect(wholeNumbersIn(srTextWithPicture(ex)), ex.key).not.toContain(ex.answer.value);
      }
    }
  });

  it('worked steps show the fraction that gets shortened', () => {
    for (const ab of [1, 2] as const) {
      for (const ex of items(geteiltSkill, 1, ab)) {
        const [[n, d]] = fractionsIn(ex.expression!);
        const [k] = wholeNumbersIn(ex.expression!);
        const raw = ab === 1 ? [n / k, d] : [n, d * k];
        const value = valueOf(ex.answer);
        const last = ex.steps[ex.steps.length - 1] as string;
        if (raw[1] !== value[1]) expect(last, ex.key).toContain(`Gekürzt: {frac:${raw[0]}/${raw[1]}}`);
      }
    }
  });

  it('a fraction answer ends in lowest terms and the Ganze is offered', () => {
    for (const stufe of [1, 2, 3] as const) {
      for (const ab of ABS_ALL) {
        for (const ex of items(geteiltSkill, stufe, ab)) {
          if (ex.answer.kind !== 'fraction') continue;
          expect(ex.answer.accept).toBe('lowest');
          expect(ex.answer.allowMixed).toBe(true);
        }
      }
    }
  });
});
