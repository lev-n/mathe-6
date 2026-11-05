import { describe, expect, it } from 'vitest';
import { describeSkill } from '../../core/testing';
import type { Ab, Exercise, Stufe } from '../../core/types';
import { checkAll, hintStatesAnswer, items, numberValue } from './checks';
import { zahlengeradeSkill } from './zahlengerade';

describeSkill(zahlengeradeSkill, { minDistinct: { 3: 20 } });

const ABS = [1, 2, 3] as Ab[];

/** The axis of an item: the line of its answer, or of its picture. */
function axisOf(ex: Exercise) {
  if (ex.answer.kind === 'numberline') return ex.answer;
  if (ex.visual?.type === 'numberLine') return ex.visual;
  throw new Error(`${ex.key}: a Zahlengerade`);
}

const SPANS: Record<Stufe, [number, number]> = { 1: [10, 1], 2: [50, 5], 3: [2, 0] };

describe('negativ.zahlengerade', () => {
  it('worked steps, hints, spoken text and labels', () => checkAll(zahlengeradeSkill));

  it('each Stufe keeps its range and its ticks', () => {
    for (const stufe of [1, 2, 3] as Stufe[]) {
      for (const ab of ABS) {
        for (const { ex } of items(zahlengeradeSkill, stufe, ab)) {
          const axis = axisOf(ex);
          const d = axis.denominator ?? 1;
          expect(axis.min / d).toBe(-SPANS[stufe][0]);
          expect(axis.max / d).toBe(SPANS[stufe][0]);
          if (stufe < 3) expect(axis.minorStep).toBe(SPANS[stufe][1]);
          else expect([2, 4]).toContain(d);
        }
      }
    }
  });

  it('a task names the place or shows it, and the answer is that place', () => {
    for (const stufe of [1, 2, 3] as Stufe[]) {
      for (const ab of ABS) {
        for (const { ex, form, num } of items(zahlengeradeSkill, stufe, ab)) {
          if (form === 'setzen') expect(ex.answer.kind === 'numberline' && ex.answer.value).toBe(num[0]);
          if (form === 'lesen') {
            expect(numberValue(ex)).toBe(num[0]);
            expect(ex.visual?.type === 'numberLine' && ex.visual.marks?.[0].value).toBe(num[0]);
          }
          if (form === 'gegenzahl') expect(ex.answer.kind === 'numberline' && ex.answer.value).toBe(-num[0]);
          if (form === 'weg') expect(ex.answer.kind === 'numberline' && ex.answer.value).toBe(num[0] + (ex.key.split(':')[5] === 'r' ? num[2] : -num[2]));
          if (form === 'abstand') expect(numberValue(ex)).toBe(num[1] - num[0]);
          if (form === 'mitte') expect(ex.answer.kind === 'numberline' && ex.answer.value).toBe(num[0] + 1);
          if (form === 'gegenzahl-fein') expect(ex.answer.kind === 'numberline' && ex.answer.value).toBe(-num[0]);
        }
      }
    }
  });

  it('a tick value never states the answer of a mark one tick from the 0', () => {
    for (const ab of [1, 2] as Ab[]) {
      for (const { ex } of items(zahlengeradeSkill, 2, ab, 800)) expect(hintStatesAnswer(ex)).toEqual([]);
    }
  });

  it('Stufe 3 is more than the one tick beside a label: quarter ticks on AB I, and only −2, 0 and 2 labelled on AB II', () => {
    const places = new Set<string>();
    for (const { ex } of items(zahlengeradeSkill, 3, 1, 800)) {
      expect(axisOf(ex).denominator, ex.key).toBe(4);
      places.add(ex.key.split(':').slice(4).join(':'));
    }
    expect(places.size).toBeGreaterThanOrEqual(8);
    for (const { ex } of items(zahlengeradeSkill, 3, 2)) {
      expect(axisOf(ex).denominator, ex.key).toBe(4);
      expect(axisOf(ex).labels, ex.key).toEqual([-8, 0, 8]);
    }
  });

  it('a read fraction has the value of the arrow, sign included', () => {
    for (const ab of [1, 2] as Ab[]) {
      for (const { ex, form, num } of items(zahlengeradeSkill, 3, ab)) {
        if (!form.endsWith('-lesen') || ex.answer.kind !== 'fraction') continue;
        const [position] = num;
        const a = ex.answer;
        const value = ((a.whole ?? 0) * a.denominator + a.numerator) / a.denominator;
        expect(a.negative ? -value : value).toBeCloseTo(position / 4, 9);
      }
    }
  });
});
