import { describe, expect, it } from 'vitest';
import { describeSkill } from '../../core/testing';
import { familyPhrase } from '../errorFamilies';
import { layoutMul, writtenPlaces } from '../../core/written';
import { evalSide } from '../step-check';
import skill from './mal';
import { allItems, answerValue, describeDecimalRules, items, near, num } from './test-helpers';

describeSkill(skill, { minDistinct: 30 });
describeDecimalRules(skill);

describe('dezimal.mal: content', () => {
  it('an open product has the answer as its value', () => {
    for (const ex of allItems(skill)) {
      const m = /^(.+) = □$/.exec(ex.expression ?? '');
      if (m) expect(near(evalSide(m[1])?.value ?? NaN, answerValue(ex)), ex.key).toBe(true);
    }
  });

  it('a missing number makes the product true', () => {
    let seen = 0;
    for (const ab of [3] as const) {
      for (const stufe of [1, 2] as const) {
        for (const ex of items(skill, stufe, ab)) {
          const left = /^□ · ([\d,]+) = ([\d, ]+)$/.exec(ex.expression ?? '');
          const right = /^([\d,]+) · □ = ([\d, ]+)$/.exec(ex.expression ?? '');
          const m = left ?? right;
          if (!m) continue;
          seen++;
          expect(near(answerValue(ex) * num(m[1]), num(m[2])), ex.key).toBe(true);
        }
      }
    }
    expect(seen).toBeGreaterThan(0);
  });

  it('Stufe 2 has one place in each factor, and 0,4 · 0,3 = 1,2 has its hint', () => {
    for (const ab of [1, 2] as const) {
      for (const ex of items(skill, 2, ab)) {
        const [a, b] = (ex.expression ?? '').split(' = ')[0].split(' · ');
        expect(a.split(',')[1]?.length, ex.key).toBe(1);
        expect(b.split(',')[1]?.length, ex.key).toBe(1);
        const product = Number(a.replace(',', '')) * Number(b.replace(',', ''));
        const bug = ex.bugs?.find((x) => x.match === product / 10);
        expect(['komma-wie-plus', 'mal-groesser'], ex.key).toContain(bug?.id);
      }
    }
  });

  it('Stufe 2, AB II stays below two digits each, which is the written task of Stufe 3', () => {
    for (const ex of items(skill, 2, 2, 300)) {
      const factors = (ex.expression ?? '').split(' = ')[0].split(' · ').map((x) => x.replace(',', '').replace(/^0+/, ''));
      expect(Math.min(...factors.map((x) => x.length)), ex.key).toBe(1);
    }
  });

  it('the hint for a missing shift says what WrittenInput and the worked picture show: the upper partial product ends further left', () => {
    const written = items(skill, 3, 1, 200).filter((ex) => ex.bugs?.some((b) => b.id === 'einruecken-vergessen'));
    expect(written.length).toBeGreaterThan(0);
    for (const ex of written) {
      if (ex.answer.kind !== 'written') throw new Error(ex.key);
      const [upper, lower] = layoutMul(ex.answer.operands[0], ex.answer.operands[1]).partials;
      expect(upper.shift, ex.key).toBe(lower.shift + 1);
      expect(ex.bugs?.find((b) => b.id === 'einruecken-vergessen')?.hint, ex.key).toBe('Die obere Zeile endet eine Stelle weiter links als die untere.');
    }
  });

  it('the growth phrase of a written multiplication praises the child’s work: the columns of the partial products are fixed', () => {
    expect(`${familyPhrase('dezimal-einruecken').object} ${familyPhrase('dezimal-einruecken').participle}`).not.toMatch(/einger(ü|ue)ckt/);
  });

  it('Stufe 2, AB III: a comparison goes either way, and the factor decides', () => {
    const asked = items(skill, 2, 3, 300).filter((ex) => ex.key.includes(':vergleich:'));
    let smaller = 0;
    for (const ex of asked) {
      if (ex.answer.kind !== 'choice') throw new Error(ex.key);
      const factor = num(/Ist ([\d,]+) ·/.exec(ex.prompt)?.[1] ?? '');
      const label = ex.answer.options[ex.answer.correct].label;
      expect(label.startsWith(factor < 1 ? 'kleiner' : 'größer'), ex.key).toBe(true);
      if (factor < 1) smaller++;
    }
    expect(smaller / asked.length).toBeGreaterThan(0.3);
    expect(smaller / asked.length).toBeLessThan(0.7);
  });

  it('Stufe 1, AB I: one digit · decimal has more tasks than a round asks for', () => {
    const tasks = new Set(items(skill, 1, 1, 800).filter((ex) => ex.key.includes(':ziffer:')).map((ex) => ex.key));
    expect(tasks.size).toBeGreaterThanOrEqual(20);
  });

  it('Stufe 3 is written, two digits each, with an Überschlag, and the comma is the child’s', () => {
    for (const ab of [1, 2] as const) {
      for (const ex of items(skill, 3, ab)) {
        const a = ex.answer;
        if (a.kind !== 'written') throw new Error(ex.key);
        expect(a.op, ex.key).toBe('mul');
        a.operands.forEach((n) => expect(String(n).length, ex.key).toBe(2));
        expect(a.result, ex.key).toBe(a.operands[0] * a.operands[1]);
        expect(a.ueberschlag, ex.key).toBeGreaterThan(0);
        expect(writtenPlaces(a), ex.key).toBe((a.decimalPlaces ?? []).reduce((s, p) => s + p, 0));
        expect(ex.bugs?.some((b) => b.id === 'komma-wie-plus'), ex.key).toBe(true);
      }
    }
  });

  it('Stufe 3, AB III: only the result near the Überschlag is right', () => {
    for (const ex of items(skill, 3, 3)) {
      if (ex.answer.kind !== 'choice') continue;
      const [a, b] = (ex.expression ?? '').split(' · ').map(num);
      expect(near(num(ex.answer.options[ex.answer.correct].label), a * b), ex.key).toBe(true);
    }
  });
});
