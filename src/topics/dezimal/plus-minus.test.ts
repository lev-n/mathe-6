import { describe, expect, it } from 'vitest';
import { createRng } from '../../core/rng';
import { describeSkill } from '../../core/testing';
import type { WrittenAnswer } from '../../core/types';
import { alignedOperands, digitAt } from '../../core/written';
import { srTextWithPicture } from '../../ui/visuals/describe';
import { tagsFor } from '../errorFamilies';
import { evalSide } from '../step-check';
import skill from './plus-minus';
import { allItems, answerValue, describeDecimalRules, items, near, num, placesOf } from './test-helpers';

describeSkill(skill, { minDistinct: 30 });
describeDecimalRules(skill);

const writtenItems = (stufe: 1 | 2 | 3, ab: 1 | 2 | 3) => items(skill, stufe, ab).flatMap((ex) => (ex.answer.kind === 'written' ? [{ ex, a: ex.answer as WrittenAnswer }] : []));

describe('dezimal.plus-minus: content', () => {
  it('a written minus task follows the method in its hints, steps, bugs and praise, and never mixes them', () => {
    let seen = 0;
    for (const stufe of [1, 2] as const) {
      for (const ab of [2, 3] as const) {
        for (let seed = 0; seed < 150; seed++) {
          const of = (subtractionMethod: 'abziehen' | 'ergaenzen') => skill.generate(createRng(seed * 7919 + stufe), stufe, { subtractionMethod, ab });
          const [taken, added] = [of('abziehen'), of('ergaenzen')];
          if (added.answer.kind !== 'written' || added.answer.op !== 'sub') continue;
          seen++;
          expect(added.key).toBe(taken.key);
          const text = (ex: typeof added) => [...ex.hints, ...(ex.bugs ?? []).map((b) => b.hint), ...ex.steps.map((s) => (typeof s === 'string' ? s : s.text)), ex.praise].join(' ');
          expect(text(added), added.key).toMatch(/Ergänze|bis \d+ (fehlt|fehlen)/);
          expect(text(added), added.key).not.toMatch(/von links|minus \d+ gleich|oben minus unten/);
          expect(text(taken), taken.key).not.toMatch(/Ergänze|ergänzt|gemerkte|merken/);
          const noReduce = added.bugs?.find((b) => b.id === 'nicht-vermindert');
          if (noReduce) expect(noReduce.hint, added.key).toMatch(/gemerkte 1/);
        }
      }
    }
    expect(seen).toBeGreaterThan(100);
  });

  it('an open term has the answer as its value', () => {
    for (const ex of allItems(skill)) {
      const m = /^(.+) = □$/.exec(ex.expression ?? '');
      if (m) expect(near(evalSide(m[1])?.value ?? NaN, answerValue(ex)), ex.key).toBe(true);
      const gap = /^(?:□ ([+−]) ([\d,]+) = ([\d,]+)|([\d,]+) − □ = ([\d,]+))$/.exec(ex.expression ?? '');
      if (gap) {
        const value = answerValue(ex);
        if (gap[1] === '+') expect(near(value + num(gap[2]), num(gap[3])), ex.key).toBe(true);
        else if (gap[1] === '−') expect(near(value - num(gap[2]), num(gap[3])), ex.key).toBe(true);
        else expect(near(num(gap[4]) - value, num(gap[5])), ex.key).toBe(true);
      }
    }
  });

  it('Stufe 1: same places, up to 100, no carry over the comma', () => {
    for (const { ex, a } of writtenItems(1, 2)) {
      expect(a.decimalPlaces?.[0], ex.key).toBe(a.decimalPlaces?.[1]);
      const [x, y] = a.operands;
      if (a.op === 'add') {
        expect((x % 100) + (y % 100), ex.key).toBeLessThan(100);
        expect(x + y, ex.key).toBeLessThanOrEqual(10000);
      } else {
        expect(x % 100, ex.key).toBeGreaterThanOrEqual(y % 100);
        expect(x, ex.key).toBeLessThanOrEqual(10000);
      }
    }
    for (const ex of items(skill, 1, 1)) {
      const [a, b] = (ex.expression ?? '').split(' = ')[0].split(/ [+−] /);
      expect(placesOf(a), ex.key).toBe(placesOf(b));
    }
  });

  it('Stufe 2: different lengths, and a sum set on the right digits has its hint', () => {
    for (const { ex, a } of writtenItems(2, 1)) {
      expect(a.decimalPlaces?.[0], ex.key).not.toBe(a.decimalPlaces?.[1]);
      const places = Math.max(...(a.decimalPlaces ?? []));
      const bug = ex.bugs?.find((b) => b.id === 'komma-rechtsbuendig');
      expect(bug?.match, ex.key).toBeCloseTo((a.operands[0] + a.operands[1]) / 10 ** places, 9);
    }
  });

  it('written sums and differences are right, in the method of the setting', () => {
    for (const stufe of [1, 2, 3] as const) {
      for (const ab of [1, 2, 3] as const) {
        for (const { ex, a } of writtenItems(stufe, ab)) {
          const [x, ...rest] = alignedOperands(a.operands, a.decimalPlaces);
          expect(a.result, ex.key).toBe(a.op === 'add' ? rest.reduce((s, n) => s + n, x) : x - rest[0]);
          if (a.op === 'sub') expect(a.method, ex.key).toBeDefined();
        }
      }
    }
  });

  it('Stufe 3: three numbers with an Überschlag, money stories, a Fehlerdetektiv', () => {
    for (const { ex, a } of writtenItems(3, 1)) {
      expect(a.operands.length, ex.key).toBe(3);
      expect(a.ueberschlag, ex.key).toBeGreaterThan(0);
    }
    for (const ex of items(skill, 3, 2)) {
      const euros = [...(ex.context ?? '').matchAll(/([\d,]+) €/g)].map((m) => num(m[1]));
      const paid = euros.pop() ?? 0;
      expect(near(answerValue(ex), paid - euros.reduce((s, n) => s + n, 0)), ex.key).toBe(true);
    }
    const detectives = items(skill, 3, 3).filter((ex) => ex.key.includes(':detektiv:'));
    expect(detectives.length).toBeGreaterThan(0);
    for (const ex of detectives) {
      if (ex.visual?.type !== 'written') throw new Error(ex.key);
      expect(ex.visual.shownResult, ex.key).not.toBe(Math.round(answerValue(ex) * 100));
    }
  });

  it('Stufe 3, AB I: hint and worked step ask for the Überschlag that the help of WrittenInput asks for, the highest place of each number', () => {
    const high = (n: number) => {
      const unit = 10 ** (String(n).length - 1);
      return Math.floor((n + unit / 2) / unit) * unit;
    };
    for (const { ex, a } of writtenItems(3, 1)) {
      const places = a.decimalPlaces ?? [];
      const expected = a.operands.reduce((sum, n, i) => sum + high(n) / 10 ** places[i], 0);
      expect(a.ueberschlag, ex.key).toBe(expected);
      expect(/höchste Stelle/.test(ex.hints[0]), ex.key).toBe(true);
      expect(String(ex.steps[0]), ex.key).toContain(`= ${expected}`);
      const sum = a.operands.reduce((s, n, i) => s + n / 10 ** places[i], 0);
      expect(Math.abs(expected - sum), `${ex.key}: the praise says it confirmed the result`).toBeLessThanOrEqual(0.25 * sum);
    }
  });

  it('a written item does not count towards setting the comma, as WrittenInput sets it: only a typed result does', () => {
    const typed = items(skill, 1, 1).flatMap((ex) => tagsFor(skill.id, (ex.bugs ?? []).map((b) => b.id)));
    expect(typed).toContain('dezimal-komma-unter-komma');
    for (const stufe of [1, 2, 3] as const) {
      for (const ab of [1, 2, 3] as const) {
        for (const { ex } of writtenItems(stufe, ab)) expect(tagsFor(skill.id, (ex.bugs ?? []).map((b) => b.id)), ex.key).not.toContain('dezimal-komma-unter-komma');
      }
    }
  });

  it('the Fehlerdetektiv shows its mistake: comma under comma, no carries of the right sum, and a result from the columns without their carries', () => {
    const detectives = items(skill, 3, 3).filter((ex) => ex.key.includes(':detektiv:'));
    expect(detectives.length).toBeGreaterThan(0);
    for (const ex of detectives) {
      if (ex.visual?.type !== 'written') throw new Error(ex.key);
      expect(ex.visual.showSolution, ex.key).toBe(false);
      const aligned = alignedOperands(ex.visual.operands, ex.visual.decimalPlaces);
      const noCarry = [...Array(8).keys()].reduce((sum, p) => sum + (aligned.reduce((s, n) => s + digitAt(n, p), 0) % 10) * 10 ** p, 0);
      expect(ex.visual.shownResult, ex.key).toBe(noCarry);
      expect(ex.bugs?.find((b) => b.id === 'ohne-uebertrag')?.match, ex.key).toBeCloseTo(noCarry / 100, 9);
      const spoken = srTextWithPicture(ex);
      expect(/plus/.test(spoken) && /Darunter steht als Ergebnis/.test(spoken), `${ex.key}: ${spoken}`).toBe(true);
      expect(`${ex.praise} ${ex.hints.join(' ')} ${ex.steps.map((s) => (typeof s === 'string' ? s : s.text)).join(' ')}`, ex.key).not.toMatch(/Komma/);
    }
  });
});
