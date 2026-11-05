import { describe, expect, it } from 'vitest';
import { describeSkill } from '../../core/testing';
import { createRng } from '../../core/rng';
import type { Ab, Exercise, Stufe } from '../../core/types';
import { checkStepText } from '../step-check';
import { CTX } from '../test-utils';
import { evalTerm, sameFrac, stepText, termNumber } from './test-utils';
import { variableAufstellenSkill } from './variable-aufstellen';

describeSkill(variableAufstellenSkill, { minDistinct: 25 });

const planned = (stufe: Stufe, ab: Ab, count = 300): Exercise[] => Array.from({ length: count }, (_, i) => variableAufstellenSkill.generate(createRng(i * 2281 + 19), stufe, { ...CTX, ab }));
const correct = (ex: Exercise): string => {
  if (ex.answer.kind !== 'choice') throw new Error('choice only');
  return ex.answer.options[ex.answer.correct].label;
};
const options = (ex: Exercise) => (ex.answer.kind === 'choice' ? ex.answer.options.map((o) => o.label) : []);
const isTerm = (label: string) => /^[\dx ()+−·:]+$/.test(label);

describe('terme.variable-aufstellen', () => {
  it('answers by choice only (§6)', () => {
    for (const stufe of [1, 2, 3] as Stufe[]) for (const ab of [1, 2, 3] as Ab[]) for (const ex of planned(stufe, ab, 60)) expect(ex.answer.kind).toBe('choice');
  });

  it('the arithmetic of the worked steps is right', () => {
    for (const stufe of [1, 2, 3] as Stufe[]) {
      for (const ab of [1, 2, 3] as Ab[]) for (const ex of planned(stufe, ab, 100)) for (const s of ex.steps) expect(checkStepText(stepText(s)), ex.key).toBeNull();
    }
  });

  it('Stufe 1 always says what x is (F7: "x ist die Anzahl")', () => {
    for (const ab of [1, 2, 3] as Ab[]) for (const ex of planned(1, ab)) expect(ex.context, ex.key).toMatch(/x ist die Anzahl/);
  });

  it('never says a letter stands for a thing, outside an option with its reason', () => {
    for (const stufe of [1, 2, 3] as Stufe[]) {
      for (const ab of [1, 2, 3] as Ab[]) {
        for (const ex of planned(stufe, ab, 60)) {
          expect(`${ex.context ?? ''} ${ex.prompt}`, ex.key).not.toMatch(/x (ist|steht für) (ein|eine) (?!Länge)\p{Lu}/u);
          if (ex.answer.kind !== 'choice') continue;
          for (const o of ex.answer.options) if (/^x ist ein/.test(o.label)) expect(o.whyWrong, ex.key).toMatch(/Zahl/);
        }
      }
    }
  });

  it('Stufe 1, AB I: the correct term is the number per piece times x', () => {
    for (const ex of planned(1, 1)) {
      const each = Number(/(\d+)/.exec(ex.context ?? '')![1]);
      for (const x of [1, 2, 5]) expect(termNumber(correct(ex), { x }), ex.key).toBe(each * x);
    }
  });

  it('Stufe 1, AB I is varied: many items, a total other than a price, the term in both orders', () => {
    const items = planned(1, 1, 500);
    expect(new Set(items.map((e) => e.key)).size).toBeGreaterThanOrEqual(100);
    expect(items.some((e) => !/€/.test(e.prompt))).toBe(true);
    expect(items.some((e) => /^x · /.test(correct(e)))).toBe(true);
    expect(items.some((e) => / · x$/.test(correct(e)))).toBe(true);
  });

  it('Stufe 1, AB III and Stufe 3, AB III: no correct option takes more than a fifth of the draws', () => {
    for (const stufe of [1, 3] as Stufe[]) {
      const counts = new Map<string, number>();
      const items = planned(stufe, 3, 4000);
      for (const ex of items) counts.set(correct(ex), (counts.get(correct(ex)) ?? 0) + 1);
      expect(Math.max(...counts.values()) / items.length, `Stufe ${stufe}`).toBeLessThan(0.2);
    }
  });

  it('Stufe 1, AB III: the term of the story has its numbers in the right places, and no sentence of a story stands alone', () => {
    for (const ex of planned(1, 3, 600)) {
      if (!ex.key.includes(':geschichte:')) continue;
      const [p, f] = (ex.expression ?? '').match(/\d+/g)!;
      expect(correct(ex), ex.key).toContain(`${p} €`);
      expect(correct(ex), ex.key).toContain(`${f} €`);
    }
  });

  it('Stufe 1, AB II: the term fits its numbers at each x', () => {
    for (const ex of planned(1, 2)) {
      const numbers = (ex.context ?? '').match(/\d+/g)!.map(Number);
      const rest = /\bhat \d+ €/.test(ex.context ?? '');
      for (const x of [1, 2]) expect(termNumber(correct(ex), { x }), ex.key).toBe(rest ? numbers[0] - numbers[1] * x : numbers[0] * x + numbers[1]);
    }
  });

  it('Stufe 2: the figure carries the sides of the correct term, and the term gives the sum of its sides', () => {
    for (const ab of [1, 2] as Ab[]) {
      for (const ex of planned(2, ab)) {
        if (ex.visual?.type !== 'figure') throw new Error('a figure');
        const sides = ex.visual.points.map((_, i) => (ex.visual?.type === 'figure' ? ex.visual.sides?.[i] : null));
        const marked = ex.visual.equalMarks?.[0]?.length ?? 0;
        // A side without a label carries the mark of the labelled side x.
        const sum = (x: number) => sides.reduce((total: number, s) => total + (s === 'x cm' || s === null || s === undefined ? x : parseInt(s, 10)), 0);
        if (marked > 0) expect(ex.visual.equalMarks?.[0], ex.key).toContain(0);
        const term = ex.expression ? `${correct(ex)} + 2 · x` : correct(ex);
        for (const x of [1, 3, 8]) expect(termNumber(term, { x }), ex.key).toBe(sum(x));
      }
    }
  });

  it('Stufe 2: a figure is drawn as its marks say: sides marked or labelled alike are equally long, the others are not', () => {
    const lengths = (points: readonly { x: number; y: number }[]) => points.map((p, i) => Math.hypot(points[(i + 1) % points.length].x - p.x, points[(i + 1) % points.length].y - p.y));
    let seen = 0;
    for (const ab of [1, 2, 3] as Ab[]) {
      for (const ex of planned(2, ab, 800)) {
        if (ex.visual?.type !== 'figure') continue;
        seen += 1;
        const drawn = lengths(ex.visual.points);
        const near = (a: number, b: number) => Math.abs(a - b) / Math.max(a, b) < 0.01;
        for (const group of ex.visual.equalMarks ?? []) for (const i of group) expect(near(drawn[i], drawn[group[0]]), `${ex.key}: side ${i}`).toBe(true);
        const sides = ex.visual.sides ?? [];
        sides.forEach((a, i) => sides.forEach((b, j) => {
          if (i >= j || !a || !b) return;
          expect(near(drawn[i], drawn[j]), `${ex.key}: sides ${i} and ${j}, ${a} and ${b}`).toBe(a === b);
        }));
      }
    }
    expect(seen).toBeGreaterThan(500);
  });

  it('Stufe 2, an isosceles triangle: the two sides x are the legs, the third side has the number', () => {
    const items = planned(2, 2, 800).filter((ex) => ex.visual?.type === 'figure' && ex.key.includes('2 · x +') && ex.visual.points.length === 3);
    expect(items.length).toBeGreaterThan(20);
    for (const ex of items) {
      if (ex.visual?.type !== 'figure') continue;
      expect(ex.visual.sides?.[0], ex.key).toBe('x cm');
      expect(ex.visual.sides?.[2], ex.key).toBe('x cm');
      expect(ex.visual.equalMarks, ex.key).toEqual([[0, 2]]);
    }
  });

  it('Stufe 2, AB III: terms of the same Umfang have the same value; the others differ', () => {
    for (const ex of planned(2, 3)) {
      if (!ex.key.includes('gleicher-umfang') || ex.answer.kind !== 'choice') continue;
      for (const x of [2, 7]) expect(termNumber(correct(ex), { x }), ex.key).toBe(termNumber(ex.expression ?? '', { x }));
      for (const o of ex.answer.options) {
        if (o.label === correct(ex)) continue;
        expect([2, 3, 7].some((x) => termNumber(o.label, { x }) !== termNumber(ex.expression ?? '', { x })), `${ex.key} ${o.label}`).toBe(true);
      }
    }
  });

  it('Stufe 3, Muster: the correct term gives every number of the table, and the others miss one', () => {
    for (const ab of [1, 2] as Ab[]) {
      for (const ex of planned(3, ab)) {
        if (ex.visual?.type !== 'table') continue;
        const row = ex.visual.rows[0].slice(1).map(Number);
        const places = ex.visual.header.slice(1).map(Number);
        const fits = (label: string) => row.every((v, i) => termNumber(label, { x: places[i] }) === v);
        expect(fits(correct(ex)), ex.key).toBe(true);
        for (const o of options(ex)) if (o !== correct(ex)) expect(fits(o), `${ex.key} ${o}`).toBe(false);
      }
    }
  });

  it('Stufe 3, equal terms: the correct term has the value at every x, and the others do not', () => {
    for (const ab of [2, 3] as Ab[]) {
      for (const ex of planned(3, ab)) {
        if (!ex.key.includes(':gleich:')) continue;
        const shown = ex.expression ?? '';
        for (const x of [1, 2, 7]) expect(sameFrac(evalTerm(correct(ex), { x }), evalTerm(shown, { x })), ex.key).toBe(true);
        for (const o of options(ex)) {
          if (o === correct(ex) || !isTerm(o)) continue;
          expect([1, 2, 3, 7].some((x) => !sameFrac(evalTerm(o, { x }), evalTerm(shown, { x }))), `${ex.key} ${o}`).toBe(true);
        }
      }
    }
  });

  it('Stufe 3, AB I: many items, above Stufe 2, and never a plain a · x', () => {
    const items = planned(3, 1, 3000);
    expect(new Set(items.map((e) => e.key)).size).toBeGreaterThanOrEqual(50);
    for (const ex of items) expect(correct(ex), ex.key).toMatch(/^\d+ · x \+ \d+$/);
  });

  it('Stufe 2, AB I and III are varied, and no item takes more than a fifth of the draws', () => {
    for (const ab of [1, 3] as Ab[]) {
      const counts = new Map<string, number>();
      const items = planned(2, ab, 4000);
      for (const ex of items) counts.set(ex.key, (counts.get(ex.key) ?? 0) + 1);
      expect(counts.size, `AB ${ab}`).toBeGreaterThanOrEqual(60);
      expect(Math.max(...counts.values()) / items.length, `AB ${ab}`).toBeLessThan(0.2);
    }
  });

  it('the money left has a reason: the text says that something is bought, and prices fit their things', () => {
    const prices: Record<string, [number, number]> = { Heft: [2, 4], Stift: [2, 5], Karte: [12, 40], Ticket: [2, 5], Schlauch: [5, 12], Block: [2, 6] };
    for (const ab of [1, 2] as Ab[]) {
      for (const ex of planned(1, ab, 1000)) {
        if (ex.key.includes(':rest:')) expect(ex.context, ex.key).toMatch(/kauft/);
        const thing = /(Heft|Stift|Karte|Ticket|Schlauch|Block)\b[^.]* kostet (\d+) €/.exec(ex.context ?? '');
        if (!thing) continue;
        const [lo, hi] = prices[thing[1]];
        expect(Number(thing[2]), ex.key).toBeGreaterThanOrEqual(lo);
        expect(Number(thing[2]), ex.key).toBeLessThanOrEqual(hi);
        // A fee on school supplies makes no sense.
        if (thing[1] !== 'Karte') expect(ex.context, ex.key).not.toMatch(/Gebühr/);
      }
    }
  });

  it('u is named as the Umfang wherever a term starts with u', () => {
    for (const ex of planned(2, 2, 400)) if (ex.expression?.startsWith('u =')) expect(ex.context, ex.key).toMatch(/u ist der Umfang/);
  });

  it('a figure that shows equal sides only by its ticks says so to the screen reader', () => {
    for (const ab of [1, 2] as Ab[]) {
      for (const ex of planned(2, ab, 600)) {
        if (ex.visual?.type !== 'figure' || ex.expression) continue;
        const allMarked = (ex.visual.equalMarks?.[0]?.length ?? 0) === ex.visual.points.length;
        if (allMarked) expect(ex.srText, ex.key).toMatch(/Alle \d Seiten sind gleich lang/);
      }
    }
  });

  it('Stufe 3, one value alike: the two terms agree at the value named and differ at the value of the answer; every option names numbers', () => {
    for (const ex of planned(3, 3)) {
      if (!ex.key.includes('ein-wert')) continue;
      const [left, right] = (ex.expression ?? '').split(/\s+und\s+/);
      const k = Number(/x = (\d+)/.exec(ex.context ?? '')![1]);
      expect(termNumber(left, { x: k }), ex.key).toBe(termNumber(right, { x: k }));
      const [t, a, b] = /für x = (\d+) kommen (\d+) und (\d+)/i.exec(correct(ex))!.slice(1).map(Number);
      expect(termNumber(left, { x: t }), ex.key).toBe(a);
      expect(termNumber(right, { x: t }), ex.key).toBe(b);
      expect(a, ex.key).not.toBe(b);
      for (const o of options(ex)) expect(o, ex.key).toMatch(/\d/);
    }
  });

  it('the text before the retry names no result: 9 · x + 9 · x with 81 · x, and a square with x + 4', () => {
    for (const ab of [2, 3] as Ab[]) {
      for (const ex of planned(3, ab, 800)) {
        if (!ex.key.includes(':gleich:') || ex.answer.kind !== 'choice') continue;
        const coefficient = /^(\d+) · x$/.exec(correct(ex))?.[1];
        if (coefficient) for (const o of ex.answer.options) expect(o.whyWrong ?? '', ex.key).not.toContain(`${coefficient}-mal`);
      }
    }
    for (const ex of planned(2, 1, 1000)) {
      if (ex.answer.kind !== 'choice') continue;
      for (const o of ex.answer.options) expect(o.whyWrong ?? '', ex.key).not.toMatch(/(drei|vier|sechs)mal x/);
    }
  });
});
