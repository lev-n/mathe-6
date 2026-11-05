import { describe, expect, it } from 'vitest';
import { bareKey, describeSkill } from '../../core/testing';
import { checkAnswer } from '../../core/check';
import { createRng } from '../../core/rng';
import type { Exercise, OrderAnswer, Stufe } from '../../core/types';
import { checkWorkedSolution } from '../step-check';
import { samples } from '../test-utils';
import { allItems, answerInTask, barProblems, falseDecimals, itemsAt } from './test-support';
import { decimalOf, fractionOf, umwandelnSkill } from './umwandeln';

describeSkill(umwandelnSkill, { minDistinct: { 1: 15, 2: 25, 3: 25 } });

const shareOfKey = (ex: Exercise) => Number(bareKey(ex).split(':').pop());

/** The value of a shown form in percent. */
function percentOf(label: string): number {
  const f = /\{frac:(\d+)\/(\d+)\}/.exec(label);
  if (f) return (Number(f[1]) * 100) / Number(f[2]);
  const n = Number(label.replace(/[ %]/g, '').replace(',', '.'));
  return label.includes('%') ? n : n * 100;
}

describe('prozent.umwandeln specifics', () => {
  it('the helpers agree on a share', () => {
    expect(fractionOf(37.5)).toEqual({ n: 3, d: 8 });
    expect(fractionOf(35)).toEqual({ n: 7, d: 20 });
    expect(decimalOf(12.5)).toBe(0.125);
  });

  it('answers follow from the share in the key (independent recomputation)', () => {
    for (const stufe of [1, 2, 3] as Stufe[]) {
      for (const ex of samples(umwandelnSkill, stufe)) {
        const form = bareKey(ex).split(':')[0];
        const p = shareOfKey(ex);
        if (form === 'f-p' || form === 'd-p') expect(ex.answer).toMatchObject({ value: p });
        if (form === 'p-d' || form === 'f-d') expect(ex.answer).toMatchObject({ value: p / 100 });
        if ((form === 'p-f' || form === 'd-f') && ex.answer.kind === 'fraction') expect((ex.answer.numerator * 100) / ex.answer.denominator).toBeCloseTo(p, 9);
        if (form === 'f-beide' && ex.answer.kind === 'multi') expect(ex.answer.fields.map((f) => f.value)).toEqual([p / 100, p]);
      }
    }
  });

  it('order items are sorted by their value, and the digit bug differs from the answer', () => {
    let seen = 0;
    for (const ex of samples(umwandelnSkill, 3)) {
      if (ex.answer.kind !== 'order') continue;
      const { items, correct } = ex.answer as OrderAnswer;
      const values = correct.map((i) => percentOf(items[i]));
      expect(values, ex.key).toEqual([...values].sort((a, b) => a - b));
      expect(new Set(values).size, ex.key).toBe(values.length);
      seen++;
    }
    expect(seen).toBeGreaterThan(10);
  });

  it('the worked solutions are correct, and each multi answer ends with its fields', () => {
    for (const stufe of [1, 2, 3] as Stufe[]) {
      for (const ex of samples(umwandelnSkill, stufe)) {
        // checkWorkedSolution looks for a field as String(value), a comma value is checked here
        expect(checkWorkedSolution(ex).filter((e) => !e.includes('does not contain field')), ex.key).toEqual([]);
        if (ex.answer.kind === 'multi') {
          const last = ex.steps[ex.steps.length - 1] as string;
          for (const f of ex.answer.fields) expect(last, ex.key).toContain(String(f.value).replace('.', ','));
        }
      }
    }
  });

  it('the hardest order always has the trap: a percent number that looks larger than it is', () => {
    for (let seed = 1; seed < 300; seed++) {
      const ex = umwandelnSkill.generate(createRng(seed), 3, { subtractionMethod: 'abziehen', ab: 3 });
      if (ex.answer.kind === 'order') expect(ex.bugs?.[0]?.id, ex.key).toBe('formen-nicht-umgewandelt');
    }
  });

  it('1/4 read as 14 % gets the targeted hint', () => {
    for (let seed = 1; seed < 400; seed++) {
      const ex = umwandelnSkill.generate(createRng(seed), 1, { subtractionMethod: 'abziehen', ab: 1 });
      if (bareKey(ex) !== 'f-p:25') continue;
      expect(checkAnswer(ex.answer, { kind: 'number', text: '14' }, ex.bugs).bugId).toBe('bruch-prozent-ziffern');
      return;
    }
    throw new Error('no item for 1/4 found');
  });

  it('each Stufe keeps to its content', () => {
    for (const ex of samples(umwandelnSkill, 1)) {
      for (const m of `${ex.prompt} ${ex.context ?? ''}`.matchAll(/\{frac:(\d+)\/(\d+)\}/g)) {
        expect(['1/2', '1/4', '3/4', '1/10', '1/5'], ex.key).toContain(`${m[1]}/${m[2]}`);
      }
    }
    for (const ex of samples(umwandelnSkill, 3)) {
      expect(ex.answer.kind === 'order' || /mitte|kugeln|12\.5|37\.5|62\.5|87\.5/.test(ex.key), ex.key).toBe(true);
    }
  });

  it('every number field allows the comma, as the keypad shows it for the whole skill', () => {
    for (const stufe of [1, 2, 3] as Stufe[]) {
      for (const ex of samples(umwandelnSkill, stufe)) {
        if (ex.answer.kind === 'number') expect(ex.answer.decimals, ex.key).toBeGreaterThan(0);
      }
    }
  });

  it('no false decimals, no answer printed in the task, no Prozentstreifen that misleads', () => {
    const items = allItems(umwandelnSkill);
    expect(falseDecimals(items)).toEqual([]);
    expect(answerInTask(items)).toEqual([]);
    expect(barProblems(items)).toEqual([]);
  });

  it('percent to fraction: neither the picture nor a hint holds the answer', () => {
    let seen = 0;
    for (const ex of allItems(umwandelnSkill)) {
      if (!bareKey(ex).startsWith('p-f:') || ex.answer.kind !== 'fraction') continue;
      seen++;
      if (ex.visual?.type === 'percentBar') expect(ex.visual.ticks, ex.key).not.toBe(ex.answer.denominator);
      for (const h of ex.hints) expect(h, ex.key).not.toMatch(/Achtel|12,5/);
    }
    expect(seen).toBeGreaterThan(50);
  });

  it('the middle: varied, and no hint recommends what its bug corrects', () => {
    const keys = new Set<string>();
    for (const ex of itemsAt(umwandelnSkill, 3, 3, 1500)) {
      if (!bareKey(ex).startsWith('mitte:')) continue;
      keys.add(ex.key);
      for (const h of ex.hints) expect(h, ex.key).not.toMatch(/Die Mitte ist die Hälfte/);
    }
    expect(keys.size).toBeGreaterThanOrEqual(30);
  });

  it('an order task never shows its answer', () => {
    for (const ab of [1, 2, 3] as const) {
      for (const ex of itemsAt(umwandelnSkill, 3, ab, 1000)) {
        if (ex.answer.kind === 'order') expect(ex.answer.correct.join(), ex.key).not.toBe(ex.answer.items.map((_, i) => i).join());
      }
    }
  });
});
