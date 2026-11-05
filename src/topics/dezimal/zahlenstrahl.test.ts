import { describe, expect, it } from 'vitest';
import { describeSkill } from '../../core/testing';
import type { Exercise, VisualOf } from '../../core/types';
import { srTextWithPicture } from '../../ui/visuals/describe';
import skill from './zahlenstrahl';
import { allItems, answerValue, describeDecimalRules, items, near, num } from './test-helpers';

describeSkill(skill, { minDistinct: { 1: 15, 2: 30, 3: 30 } });
describeDecimalRules(skill);

function line(ex: Exercise): { min: number; max: number; d: number; minor: number } {
  if (ex.answer.kind === 'numberline') return { min: ex.answer.min, max: ex.answer.max, d: ex.answer.denominator ?? 1, minor: ex.answer.minorStep };
  const v = ex.visual as VisualOf<'numberLine'>;
  return { min: v.min, max: v.max, d: v.denominator ?? 1, minor: v.minorStep };
}

describe('dezimal.zahlenstrahl: content', () => {
  it('Stufe 1 runs from 0 to 1 with ticks every 0,1', () => {
    for (const ab of [1, 2, 3] as const) {
      for (const ex of items(skill, 1, ab)) expect(line(ex), ex.key).toEqual({ min: 0, max: 10, d: 10, minor: 1 });
    }
  });

  it('Stufe 2 stays inside 0 to 5 with ticks every 0,1; marking uses the whole line', () => {
    for (const ab of [1, 2, 3] as const) {
      for (const ex of items(skill, 2, ab)) {
        const l = line(ex);
        expect(l.d, ex.key).toBe(10);
        expect(l.min, ex.key).toBeGreaterThanOrEqual(0);
        expect(l.max, ex.key).toBeLessThanOrEqual(50);
        if (ex.answer.kind === 'numberline') expect(l.max - l.min, ex.key).toBe(50);
      }
    }
  });

  it('Stufe 3 is a section of 0,1 with ticks every 0,01', () => {
    for (const ab of [1, 2, 3] as const) {
      for (const ex of items(skill, 3, ab)) {
        const l = line(ex);
        expect(l.d, ex.key).toBe(100);
        expect(l.max - l.min, ex.key).toBe(10);
        expect(l.min % 10, ex.key).toBe(0);
      }
    }
  });

  it('the place is what the task says', () => {
    for (const ex of allItems(skill)) {
      const a = ex.answer;
      if (a.kind === 'numberline') {
        const direct = /auf ([\d,]+)\.$/.exec(ex.prompt);
        const term = /Rechne ([\d,]+) ([+−]) ([\d,]+)\./.exec(ex.prompt);
        const middle = /zwischen ([\d,]+) und ([\d,]+)/.exec(ex.prompt);
        const value = a.value / (a.denominator ?? 1);
        if (direct) expect(near(value, num(direct[1])), ex.key).toBe(true);
        else if (term) expect(near(value, num(term[1]) + (term[2] === '+' ? 1 : -1) * num(term[3])), ex.key).toBe(true);
        else if (middle) expect(near(value, (num(middle[1]) + num(middle[2])) / 2), ex.key).toBe(true);
        else throw new Error(`no place in ${ex.prompt}`);
      } else {
        const v = ex.visual as VisualOf<'numberLine'>;
        const mark = v.marks?.[0].value ?? 0;
        const further = /liegt (\d+) kleine Schritte rechts/.exec(ex.prompt);
        expect(near(answerValue(ex), (mark + (further ? Number(further[1]) : 0)) / (v.denominator ?? 1)), ex.key).toBe(true);
      }
    }
  });

  it('a line to read says where the arrow is, in the description of the task', () => {
    let seen = 0;
    for (const ex of allItems(skill)) {
      if (ex.answer.kind === 'numberline') continue;
      seen++;
      const v = ex.visual as VisualOf<'numberLine'>;
      const steps = /Pfeil A: (\d+) kleiner? Schritte? rechts von/.exec(srTextWithPicture(ex));
      expect(steps, `${ex.key}: ${srTextWithPicture(ex)}`).not.toBeNull();
      const from = (v.marks?.[0].value ?? 0) - Number(steps?.[1]);
      expect(v.denominator === 10 ? from % 10 : from - v.min, ex.key).toBe(0);
    }
    expect(seen).toBeGreaterThan(0);
  });

  it('every line writes its labels with the comma', () => {
    for (const ex of allItems(skill)) {
      const a = ex.answer;
      if (a.kind === 'numberline') expect(a.labelFormat, ex.key).toBe('decimal');
      else expect((ex.visual as VisualOf<'numberLine'>).labelFormat, ex.key).toBe('decimal');
    }
  });
});
