import { describe, expect, it } from 'vitest';
import { describeSkill } from '../../core/testing';
import { zahlenstrahlSkill } from './zahlenstrahl';
import { ABS_ALL, expectSoundItems, formOf, fractionsIn, items, sameValue, valueOf } from './test-helpers';

describeSkill(zahlenstrahlSkill);

/** The line of a task, from the answer or the picture. */
const lineOf = (ex: Parameters<typeof formOf>[0]) => {
  if (ex.answer.kind === 'numberline') return ex.answer;
  if (ex.visual?.type === 'numberLine') return ex.visual;
  throw new Error(`no line: ${ex.key}`);
};

describe('brueche.zahlenstrahl specifics', () => {
  it('worked steps calculate, and a task has one key', () => expectSoundItems(zahlenstrahlSkill));

  it('Stufe 1: 0 to 1, Nenner 2, 4, 5, 10, ticks in that Nenner', () => {
    for (const ex of ABS_ALL.flatMap((ab) => items(zahlenstrahlSkill, 1, ab))) {
      const l = lineOf(ex);
      expect(l.min).toBe(0);
      expect(l.max).toBe(l.denominator);
      expect([2, 4, 5, 10]).toContain(l.denominator);
      expect(l.minorStep).toBe(1);
    }
  });

  it('Stufe 1, 2: an arrow reads as its fraction, in the Nenner of the line', () => {
    for (const ex of [...items(zahlenstrahlSkill, 1, 1), ...items(zahlenstrahlSkill, 2, 1), ...items(zahlenstrahlSkill, 2, 3).filter((e) => formOf(e) === 'enden')]) {
      if (ex.visual?.type !== 'numberLine') throw new Error('line');
      expect(sameValue(valueOf(ex.answer), [ex.visual.marks![0].value, ex.visual.denominator!])).toBe(true);
    }
  });

  it('placing: the position recomputes from the fraction of the prompt', () => {
    for (const stufe of [1, 2, 3] as const) {
      for (const ab of ABS_ALL) {
        for (const ex of items(zahlenstrahlSkill, stufe, ab)) {
          if (ex.answer.kind !== 'numberline') continue;
          const [[n, d]] = fractionsIn(ex.prompt);
          expect(ex.answer.value * d).toBe(n * ex.answer.denominator!);
          expect(ex.answer.tolerance).toBe(stufe === 3 ? 1 : 0);
        }
      }
    }
  });

  it('Stufe 2: 0 to 3 with unechte Brüche', () => {
    for (const ab of [1, 2] as const) {
      for (const ex of items(zahlenstrahlSkill, 2, ab)) {
        const l = lineOf(ex);
        expect(l.max).toBe(3 * l.denominator!);
        const value = ex.answer.kind === 'numberline' ? ex.answer.value : valueOf(ex.answer)[0];
        expect(value).toBeGreaterThan(l.denominator!);
      }
    }
  });

  it('a placing task says its line in words, range and sections, without the target', () => {
    for (const stufe of [1, 2, 3] as const) {
      for (const ab of ABS_ALL) {
        for (const ex of items(zahlenstrahlSkill, stufe, ab).filter((e) => e.answer.kind === 'numberline')) {
          if (ex.answer.kind !== 'numberline') throw new Error('line');
          const { max, minorStep, denominator } = ex.answer;
          expect(ex.srText, ex.key).toContain(`Zahlenstrahl von 0 bis ${max / denominator!} mit ${max / minorStep} gleichen Abschnitten.`);
          expect(ex.srText.split('Setze')[0], ex.key).not.toMatch(/\p{L}+tel\b|Halb/u);
        }
      }
    }
  });

  it('Stufe 3, which fraction fits an arrow: all options lie on the side of the arrow and apart by eye', () => {
    const arrows = items(zahlenstrahlSkill, 3, 3, 600).filter((e) => formOf(e) === 'pfeil');
    expect(arrows.length).toBeGreaterThan(100);
    for (const ex of arrows) {
      if (ex.answer.kind !== 'choice' || ex.visual?.type !== 'numberLine') throw new Error('choice with a line');
      const value = ex.visual.marks![0].value;
      const options = ex.answer.options.map((o) => fractionsIn(o.label)[0]).map(([n, d]) => (n * 12) / d);
      expect(options.every((o) => (o > 12) === (value > 12)), ex.key).toBe(true);
      expect(options[ex.answer.correct]).toBe(value);
      for (const o of options) if (o !== value) expect(Math.abs(o - value), ex.key).toBeGreaterThanOrEqual(2);
    }
  });

  it('Stufe 3: 0 to 2, and no tick matches the fraction', () => {
    for (const ab of ABS_ALL) {
      for (const ex of items(zahlenstrahlSkill, 3, ab)) {
        const l = lineOf(ex);
        expect(l.max).toBe(2 * l.denominator!);
        const value = ex.answer.kind === 'numberline' ? ex.answer.value : ex.visual?.type === 'numberLine' ? ex.visual.marks![0].value : NaN;
        expect(value % l.minorStep, ex.key).not.toBe(0);
      }
    }
  });
});
