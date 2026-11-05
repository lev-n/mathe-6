import { describe, expect, it } from 'vitest';
import { describeSkill } from '../../core/testing';
import { vonGroessenSkill } from './von-groessen';
import { expectSoundItems, formOf, fractionsIn, items, wholeNumbersIn } from './test-helpers';

describeSkill(vonGroessenSkill);

const valueOf = (ex: { answer: unknown }) => (ex.answer as { value: number }).value;

describe('brueche.von-groessen specifics', () => {
  it('worked steps calculate, and a task has one key', () => expectSoundItems(vonGroessenSkill));

  it('Stufe 1: 1/n of up to 60, exact, in € or cm', () => {
    for (const ex of items(vonGroessenSkill, 1, 1)) {
      const [[a, b]] = fractionsIn(ex.prompt);
      const [total] = wholeNumbersIn(ex.prompt);
      expect(a).toBe(1);
      expect(total).toBeLessThanOrEqual(60);
      expect(total % b).toBe(0);
      expect(valueOf(ex)).toBe(total / b);
      expect((ex.answer as { unit: string }).unit).toMatch(/^(€|cm)$/);
    }
  });

  it('Stufe 2: a/b of up to 120, exact, in g, m or min, a above 1', () => {
    for (const ex of items(vonGroessenSkill, 2, 1)) {
      const [[a, b]] = fractionsIn(ex.prompt);
      const [total] = wholeNumbersIn(ex.prompt);
      expect(a).toBeGreaterThan(1);
      expect(total).toBeLessThanOrEqual(120);
      expect(valueOf(ex)).toBe((total * a) / b);
      expect((ex.answer as { unit: string }).unit).toMatch(/^(g|m|min)$/);
    }
  });

  it('Stufe 3: the answer is the Ganzes, and its share gives the stated part back', () => {
    for (const ex of [...items(vonGroessenSkill, 3, 1), ...items(vonGroessenSkill, 3, 2)]) {
      const [[a, b]] = fractionsIn(ex.context!);
      const part = wholeNumbersIn(ex.context!).at(-1)!;
      expect((valueOf(ex) * a) / b).toBe(part);
    }
  });

  it('Stufe 3, AB III: what remains and another share recompute from the part', () => {
    for (const ex of items(vonGroessenSkill, 3, 3)) {
      const fractions = fractionsIn(`${ex.context} ${ex.prompt}`);
      const [a, b] = fractions[0];
      const part = wholeNumbersIn(ex.context!).at(-1)!;
      const whole = (part * b) / a;
      if (formOf(ex) === 'anderer') {
        const [e, c] = fractions[1];
        expect(valueOf(ex)).toBe((whole * e) / c);
      } else expect(valueOf(ex)).toBe(whole - part);
    }
  });

  it('a story holds quantities of its own size: no book for 2 €, no 6 m around a Schulhof, no Taschengeld of 240 €', () => {
    const smallest: [RegExp, number][] = [[/gespart/, 20], [/Kasse/, 20], [/Seil/, 30], [/Brett/, 30], [/Tüte/, 60], [/Schulhof/, 50], [/Film dauert/, 60], [/Training/, 30]];
    let told = 0;
    for (const s of [1, 2] as const) {
      for (const ab of [2, 3] as const) {
        for (const ex of items(vonGroessenSkill, s, ab, 400).filter((e) => e.context)) {
          const [total] = wholeNumbersIn(ex.context!.replace(/Klasse 6a/, ''));
          const rule = smallest.find(([re]) => re.test(ex.context!));
          expect(rule, ex.key).toBeDefined();
          expect(total, ex.key).toBeGreaterThanOrEqual(rule![1]);
          expect(total, ex.key).toBeLessThanOrEqual(s === 1 ? 60 : 120);
          told++;
        }
      }
    }
    expect(told).toBeGreaterThan(300);
    for (const ex of items(vonGroessenSkill, 1, 2, 400).filter((e) => /Buch/.test(e.context!))) expect(valueOf(ex), ex.key).toBeGreaterThanOrEqual(5);
    const wholes: [RegExp, number, number][] = [[/Taschengeld/, 12, 60], [/Schulwegs/, 400, 2400], [/des Films/, 60, 150], [/Packung/, 250, 1000]];
    for (const ab of [2, 3] as const) {
      for (const ex of items(vonGroessenSkill, 3, ab, 400).filter((e) => wholes.some(([re]) => re.test(e.context!)))) {
        const [[a, b]] = fractionsIn(ex.context!);
        const whole = (wholeNumbersIn(ex.context!).at(-1)! * b) / a;
        const [, low, high] = wholes.find(([re]) => re.test(ex.context!))!;
        expect(whole, ex.key).toBeGreaterThanOrEqual(low);
        expect(whole, ex.key).toBeLessThanOrEqual(high);
      }
    }
  });

  it('the verb follows the fraction: es bleibt 1/8, es bleiben 3/8; wie viel ist 1/2', () => {
    for (const s of [2, 3] as const) {
      for (const ex of items(vonGroessenSkill, s, 3, 400)) {
        for (const step of ex.steps) expect(step, ex.key).not.toMatch(/Es (bleiben|fehlen) \{frac:1\//);
        expect(ex.prompt, ex.key).not.toMatch(/Wie viel sind \{frac:1\//);
      }
    }
  });

  it('every number answer is a whole number', () => {
    for (const s of [1, 2, 3] as const) {
      for (const ab of [1, 2, 3] as const) {
        for (const ex of items(vonGroessenSkill, s, ab)) if (ex.answer.kind === 'number') expect(Number.isInteger(ex.answer.value)).toBe(true);
      }
    }
  });

  it('which share is more: the right option recomputes', () => {
    for (const s of [1, 2] as const) {
      for (const ex of items(vonGroessenSkill, s, 3).filter((e) => e.answer.kind === 'choice')) {
        if (ex.answer.kind !== 'choice') continue;
        const worth = (label: string) => {
          const [[a, b]] = fractionsIn(label);
          return (wholeNumbersIn(label)[0] * a) / b;
        };
        const right = worth(ex.answer.options[ex.answer.correct].label);
        for (const o of ex.answer.options) if (o.label.includes('frac') && o !== ex.answer.options[ex.answer.correct]) expect(right).toBeGreaterThan(worth(o.label));
      }
    }
  });
});
