import { describe, expect, it } from 'vitest';
import { spokenWords } from '../../core/format';
import { checkAnswer, correctResponse, responseForBug } from '../../core/check';
import { taskSpeech } from '../../ui/practice/readAloud';
import { describeSkill } from '../../core/testing';
import { createRng } from '../../core/rng';
import type { Ab, Exercise, Stufe } from '../../core/types';
import { checkWorkedSolution } from '../step-check';
import { CTX } from '../test-utils';
import { termNumber } from './test-utils';
import { variableEinsetzenSkill } from './variable-einsetzen';

describeSkill(variableEinsetzenSkill, { minDistinct: 30 });

const planned = (stufe: Stufe, ab: Ab, count = 300): Exercise[] => Array.from({ length: count }, (_, i) => variableEinsetzenSkill.generate(createRng(i * 2663 + 17), stufe, { ...CTX, ab }));
const parse = (text: string) => Number(text.replace(',', '.'));

describe('terme.variable-einsetzen', () => {
  it('Stufe 1, AB I and II: the term at x gives the answer, with natural numbers and x up to 10', () => {
    for (const ab of [1, 2] as Ab[]) {
      for (const ex of planned(1, ab)) {
        const x = parse(/x = (\d+)/.exec(ex.prompt)![1]);
        expect(x, ex.key).toBeLessThanOrEqual(10);
        expect(termNumber(ex.expression ?? '', { x }), ex.key).toBe(ex.answer.kind === 'number' ? ex.answer.value : NaN);
        expect(ex.expression, ex.key).not.toMatch(/,/);
      }
    }
  });

  it('Stufe 1 and 3, back to x: the answer put in gives the value', () => {
    for (const stufe of [1, 3] as Stufe[]) {
      for (const ex of planned(stufe, 3)) {
        if (!ex.key.includes(':rueckwaerts:')) continue;
        const value = parse(/den Wert ([\d,]+)/.exec(ex.prompt)![1]);
        expect(termNumber(ex.expression ?? '', { x: ex.answer.kind === 'number' ? (ex.answer.value as number) : NaN }), ex.key).toBeCloseTo(value, 6);
      }
    }
  });

  it('the bug 2 · x + 1 with x = 3 gives 24 is offered, as the letter glued to the digit (§5)', () => {
    const ex = planned(1, 1).find((e) => e.key.includes(':mal-plus:2 · x + 1:3'));
    if (ex) expect(ex.bugs?.map((b) => b.match)).toContain(24);
    const any = planned(1, 1).filter((e) => e.key.includes(':mal-plus:'));
    expect(any.length).toBeGreaterThan(0);
    for (const e of any) {
      const [, a, b, x] = /:(\d+) · x \+ (\d+):(\d+)$/.exec(e.key)!.map(Number);
      expect(e.bugs?.find((g) => g.match === Number(`${a}${x}`) + b)?.id, e.key).toBe('buchstabe-weg');
    }
  });

  it('Stufe 2: the table has a term, x = 1, 2, 3 and three fields with its values', () => {
    for (const ex of planned(2, 1).concat(planned(2, 2))) {
      if (ex.answer.kind !== 'multi' || ex.visual?.type !== 'table') throw new Error('a table');
      expect(ex.visual.header, ex.key).toEqual(['x', '1', '2', '3']);
      expect(ex.answer.fields.map((f) => f.value), ex.key).toEqual([1, 2, 3].map((x) => termNumber(ex.visual?.type === 'table' ? ex.visual.rows[0][0] : '', { x })));
    }
  });

  it('Stufe 2, AB III: the fields hold the x of the given values', () => {
    for (const ex of planned(2, 3)) {
      if (ex.answer.kind !== 'multi' || ex.visual?.type !== 'table') throw new Error('a table');
      const row = ex.visual.rows[0];
      ex.answer.fields.forEach((f, i) => expect(termNumber(row[0], { x: f.value }), ex.key).toBe(Number(row[i + 1])));
    }
  });

  it('Stufe 3: decimals in the term at AB I; the Umfang formula at AB II, and its numbers give the answer', () => {
    for (const ex of planned(3, 1)) expect(ex.prompt, ex.key).toMatch(/\d,\d/);
    for (const ex of planned(3, 2)) {
      const formula = (ex.expression ?? '').replace('u = ', '');
      const x = parse(/x = ([\d,]+)/.exec(ex.context ?? '')![1]);
      const y = /y = ([\d,]+)/.exec(ex.context ?? '');
      expect(termNumber(formula, { x, y: y ? parse(y[1]) : 0 }), ex.key).toBeCloseTo(ex.answer.kind === 'number' ? (ex.answer.value as number) : NaN, 6);
    }
  });

  it('Stufe 3, Umfang back: the length found gives the Umfang', () => {
    for (const ex of planned(3, 3)) {
      if (!ex.key.includes('seite-')) continue;
      const u = parse(/u = ([\d,]+)/.exec(ex.context ?? '')![1]);
      const givenX = /und x = ([\d,]+)/.exec(ex.context ?? '');
      const givenY = /und y = ([\d,]+)/.exec(ex.context ?? '');
      const answer = ex.answer.kind === 'number' ? (ex.answer.value as number) : NaN;
      const formula = (ex.expression ?? '').replace('u = ', '');
      expect(termNumber(formula, givenX ? { x: parse(givenX[1]), y: answer } : { x: answer, y: parse(givenY![1]) }), ex.key).toBeCloseTo(u, 6);
    }
  });

  it('Stufe 3, AB II and III: every Umfang takes at least two steps, above the three values of the table at Stufe 2', () => {
    for (const ab of [2, 3] as Ab[]) {
      for (const ex of planned(3, ab, 1500)) {
        expect(ex.expression, ex.key).not.toBe('u = 4 · x');
        expect(ex.expression, ex.key).toMatch(/[+−]/);
      }
    }
  });

  it('the voice says the letters as letters, not as units: no a, no h, no m', () => {
    for (const stufe of [1, 2, 3] as Stufe[]) {
      for (const ab of [1, 2, 3] as Ab[]) {
        for (const ex of planned(stufe, ab, 60)) {
          const said = spokenWords(`${ex.prompt} ${ex.expression ?? ''}`);
          expect(said, ex.key).not.toMatch(/\b(Ar|Hektar|Stunden?|Sekunden?)\b/);
        }
      }
    }
  });

  it('a triangle of the Umfang formula exists: its two equal sides are longer than the third', () => {
    let seen = 0;
    for (const ex of planned(3, 2, 2000)) {
      if (!ex.key.includes('umfang:dreieck')) continue;
      seen += 1;
      const x = parse(/x = ([\d,]+)/.exec(ex.context ?? '')![1]);
      const y = parse(/y = ([\d,]+)/.exec(ex.context ?? '')![1]);
      expect(2 * x, ex.key).toBeGreaterThan(y);
    }
    expect(seen).toBeGreaterThan(100);
  });

  it('bug hints write numbers with a comma, without float noise, and digits glue only for natural numbers', () => {
    for (const stufe of [1, 2, 3] as Stufe[]) {
      for (const ab of [1, 2, 3] as Ab[]) {
        for (const ex of planned(stufe, ab)) {
          for (const b of ex.bugs ?? []) {
            expect(b.hint, ex.key).not.toMatch(/\d\.\d/);
            if (typeof b.match === 'number') expect(Math.round(b.match * 1000) / 1000, ex.key).toBe(b.match);
            const r = responseForBug(ex.answer, b);
            if (r) expect(checkAnswer(ex.answer, r, ex.bugs).bugHint, ex.key).toBe(b.hint);
          }
        }
      }
    }
    for (const ex of planned(3, 1)) expect(ex.bugs?.some((b) => /heißt/.test(b.hint)) ?? false, ex.key).toBe(false);
  });

  it('a value table says its term aloud (T20), and fills it with the plain form of each value', () => {
    for (const ab of [1, 2, 3] as Ab[]) {
      for (const ex of planned(2, ab, 100)) {
        if (ex.visual?.type !== 'table') throw new Error('a table');
        expect(ex.expression, ex.key).toBe(ex.visual.rows[0][0]);
        expect(taskSpeech(ex), ex.key).toMatch(/mal/);
        if (ex.answer.kind !== 'multi') throw new Error('multi');
        const r = correctResponse(ex.answer);
        if (r.kind === 'multi') for (const text of Object.values(r.values)) expect(text, ex.key).not.toMatch(/,/);
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
});
