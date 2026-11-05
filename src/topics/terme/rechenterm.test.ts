import { describe, expect, it } from 'vitest';
import { describeSkill } from '../../core/testing';
import { createRng } from '../../core/rng';
import type { Ab, Exercise, Stufe } from '../../core/types';
import { checkWorkedSolution } from '../step-check';
import { CTX } from '../test-utils';
import { rechentermSkill } from './rechenterm';
import { answerValue, evalTerm, sameFrac, termNumber } from './test-utils';

describeSkill(rechentermSkill, { minDistinct: 30 });

const planned = (stufe: Stufe, ab: Ab, count = 200): Exercise[] => Array.from({ length: count }, (_, i) => rechentermSkill.generate(createRng(i * 6101 + 7), stufe, { ...CTX, ab }));
const shape = (ex: Exercise) => ex.key.split(':')[2];

describe('terme.rechenterm', () => {
  it('a term shown with = □ has the answer as its value', () => {
    for (const stufe of [1, 2, 3] as Stufe[]) {
      for (const ab of [1, 2, 3] as Ab[]) {
        for (const ex of planned(stufe, ab)) {
          if (!ex.expression?.endsWith(' = □')) continue;
          expect(sameFrac(evalTerm(ex.expression.replace(' = □', '')), answerValue(ex)), ex.key).toBe(true);
        }
      }
    }
  });

  it('the worked steps add up and state the result', () => {
    for (const stufe of [1, 2, 3] as Stufe[]) {
      for (const ab of [1, 2, 3] as Ab[]) {
        for (const ex of planned(stufe, ab, 80)) expect(checkWorkedSolution(ex), ex.key).toEqual([]);
      }
    }
  });

  it('Stufe 1 has natural numbers and two operations, with no Klammer at any AB', () => {
    for (const ab of [1, 2, 3] as Ab[]) {
      for (const ex of planned(1, ab)) {
        const shown = ex.expression ?? '';
        expect(shown, ex.key).not.toMatch(/[(),]|\{frac/);
        expect((shown.replace(/ = .*/, '').match(/[+−·:]/g) ?? []).length, ex.key).toBeLessThanOrEqual(2);
        if (ex.answer.kind === 'choice') expect(ex.answer.options.map((o) => o.label).join(), ex.key).not.toMatch(/\(/);
      }
    }
  });

  it('Stufe 2 always has a Klammer, and AB II has decimals with one place', () => {
    for (const ab of [1, 2, 3] as Ab[]) {
      for (const ex of planned(2, ab)) {
        const text = [ex.expression, ...(ex.answer.kind === 'choice' ? ex.answer.options.map((o) => o.label) : [])].join(' ');
        expect(text, ex.key).toMatch(/\(/);
        expect(text, ex.key).not.toMatch(/\{frac/);
      }
    }
    for (const ex of planned(2, 2)) {
      expect(ex.expression, ex.key).toMatch(/\d,\d/);
      expect(ex.expression, ex.key).not.toMatch(/\d,\d\d/);
    }
  });

  it('Stufe 3 has fractions or three operations, or a planted step', () => {
    for (const ab of [1, 2, 3] as Ab[]) {
      for (const ex of planned(3, ab)) {
        if (ex.visual?.type === 'term') continue;
        const ops = (ex.expression ?? '').replace(' = □', '').match(/[+−·:]/g) ?? [];
        expect(/\{frac/.test(ex.expression ?? '') || ops.length === 3, ex.key).toBe(true);
      }
    }
  });

  it('Stufe 3, fractions: plus and minus with a Klammer only, Nenner up to 24, and the answer never stands in the term', () => {
    let seen = 0;
    for (const ab of [1, 2, 3] as Ab[]) {
      for (let seed = 0; seed < 3000; seed++) {
        const ex = rechentermSkill.generate(createRng(seed), 3, { ...CTX, ab });
        if (!/\{frac/.test(ex.expression ?? '')) continue;
        seen += 1;
        const term = (ex.expression ?? '').replace(' = □', '');
        expect(term, ex.key).not.toMatch(/[·:] ?\{frac|\} ?[·:]|\d ·|· \d/);
        expect(term, ex.key).toMatch(/\(/);
        for (const [, d] of term.matchAll(/\{frac:\d+\/(\d+)\}/g)) expect(Number(d), ex.key).toBeLessThanOrEqual(24);
        if (ex.answer.kind !== 'fraction') throw new Error('fraction');
        expect(ex.answer.denominator, ex.key).toBeLessThanOrEqual(24);
        expect(ex.answer.numerator, ex.key).toBeLessThan(ex.answer.denominator);
        expect(term, ex.key).not.toContain(`{frac:${ex.answer.numerator}/${ex.answer.denominator}}`);
      }
    }
    expect(seen).toBeGreaterThan(1000);
  });

  it('a gap in a Klammer: no hint asks to work out a Klammer with an unknown number in it', () => {
    const items = planned(2, 3, 900).filter((ex) => ex.key.includes(':klammer-luecke:'));
    expect(items.length).toBeGreaterThan(100);
    for (const ex of items) for (const b of ex.bugs ?? []) expect(b.hint, ex.key).not.toMatch(/□.*zuerst aus/);
  });

  it('a bug hint of a gap fits its value: r − k · b is still k times the gap', () => {
    for (const ex of planned(2, 3, 900)) {
      if (!ex.key.includes(':klammer-luecke:') || ex.answer.kind !== 'number') continue;
      const hint = ex.bugs?.find((b) => /Das ist erst/.test(b.hint));
      if (!hint) continue;
      const k = Number(/Das ist erst (\d+) ·/.exec(hint.hint)![1]);
      expect(hint.match, ex.key).toBeCloseTo(k * (ex.answer.value as number), 6);
    }
  });

  it('with the planted step, the marked line is the first whose value differs, and the later lines follow from it', () => {
    const items = planned(3, 3, 400).filter((ex) => ex.visual?.type === 'term');
    expect(items.length).toBeGreaterThan(100);
    for (const ex of items) {
      if (ex.visual?.type !== 'term' || ex.answer.kind !== 'choice') throw new Error('planted step');
      const values = ex.visual.lines.map((l) => termNumber(l));
      const first = values.findIndex((v) => v !== values[0]);
      expect(first, ex.key).toBeGreaterThan(0);
      expect(ex.answer.options[ex.answer.correct].label, ex.key).toBe(ex.visual.lines[first]);
      for (let i = first; i < values.length; i++) expect(values[i], ex.key).toBe(values[first]);
      const right = (typeof ex.steps[2] === 'string' ? ex.steps[2] : ex.steps[2].text).replace('Richtig: ', '').split(' = ').map((s) => termNumber(s));
      expect(new Set(right).size, ex.key).toBe(1);
      expect(right[0], ex.key).toBe(values[0]);
    }
  });

  it('Stufe 3: every number field has an answer above 0, and no line of a worked step falls under 0', () => {
    for (const ab of [1, 2, 3] as Ab[]) {
      for (let seed = 0; seed < 3000; seed++) {
        const ex = rechentermSkill.generate(createRng(seed), 3, { ...CTX, ab });
        if (ex.answer.kind === 'number') expect(ex.answer.value as number, ex.key).toBeGreaterThan(0);
        const lines = ex.visual?.type === 'term' ? ex.visual.lines : [];
        for (const text of [...lines, ...ex.steps.map((s) => (typeof s === 'string' ? s : s.text))]) {
          // a term may hold a minus; a value never starts with one, and never comes out at 0
          expect(text, ex.key).not.toMatch(/(^|= )−/);
          expect(text, ex.key).not.toMatch(/= 0$/);
        }
      }
    }
  });

  it('Stufe 1, AB II: the first step takes the calculation, and no sign shows the right option', () => {
    const items = planned(1, 2, 800).filter((ex) => ex.key.includes(':zuerst:'));
    expect(items.length).toBeGreaterThan(100);
    expect(items.some((ex) => ex.expression?.includes(':'))).toBe(true);
    for (const ex of items) {
      if (ex.answer.kind !== 'choice') throw new Error('choice');
      expect(ex.answer.options.length, ex.key).toBeGreaterThanOrEqual(3);
      const value = termNumber(ex.expression ?? '');
      ex.answer.options.forEach((o, i) => expect(termNumber(o.label) === value, `${ex.key} ${o.label}`).toBe(i === (ex.answer as { correct: number }).correct));
    }
  });

  it('bugs compute from the pattern', () => {
    for (const ex of planned(1, 1)) {
      if (shape(ex) !== 'plus-mal') continue;
      const [a, b, c] = (ex.expression ?? '').match(/\d+/g)!.map(Number);
      expect(ex.bugs?.find((x) => x.id === 'links-nach-rechts')?.match, ex.key).toBe((a + b) * c);
    }
    for (const ex of planned(2, 1)) {
      if (shape(ex) !== 'mal-plus') continue;
      const [k, b, c] = (ex.expression ?? '').match(/\d+/g)!.map(Number);
      expect(ex.bugs?.find((x) => x.id === 'klammer-teilweise')?.match, ex.key).toBe(k * b + c);
    }
  });

  it('every option of "which term" has the value it claims', () => {
    for (const stufe of [1, 2] as Stufe[]) {
      for (const ex of planned(stufe, 3, 300)) {
        if (ex.answer.kind !== 'choice') continue;
        const target = Number(/den Wert (\d+)|kommt (\d+) heraus/.exec(ex.prompt)?.slice(1).find(Boolean));
        ex.answer.options.forEach((o, i) => expect(termNumber(o.label) === target, `${ex.key} ${o.label}`).toBe(i === (ex.answer as { correct: number }).correct));
      }
    }
  });
});
