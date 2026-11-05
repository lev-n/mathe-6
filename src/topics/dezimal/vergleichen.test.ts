import { describe, expect, it } from 'vitest';
import { checkAnswer } from '../../core/check';
import { describeSkill } from '../../core/testing';
import skill from './vergleichen';
import { describeDecimalRules, items, num, placesOf } from './test-helpers';

describeSkill(skill, { minDistinct: 30 });
describeDecimalRules(skill);

const signsOf = (stufe: 1 | 2, ab: 1 | 2) => items(skill, stufe, ab).filter((ex) => ex.key.includes(':zeichen:'));

describe('dezimal.vergleichen: content', () => {
  it('the right sign is the true one', () => {
    for (const ex of [...signsOf(1, 1), ...signsOf(1, 2), ...signsOf(2, 1), ...signsOf(2, 2)]) {
      const [a, b] = (ex.expression ?? '').split(' □ ');
      if (ex.answer.kind !== 'choice') throw new Error(ex.key);
      const sign = num(a) < num(b) ? '<' : num(a) > num(b) ? '>' : '=';
      expect(ex.answer.options[ex.answer.correct].label, ex.key).toBe(sign);
    }
  });

  it('Stufe 1 has the same number of places in both numbers, Stufe 2 different ones', () => {
    for (const ex of [...signsOf(1, 1), ...signsOf(1, 2)]) {
      const [a, b] = (ex.expression ?? '').split(' □ ');
      expect(placesOf(a), ex.key).toBe(placesOf(b));
    }
    for (const ex of [...signsOf(2, 1), ...signsOf(2, 2)]) {
      const [a, b] = (ex.expression ?? '').split(' □ ');
      expect(placesOf(a), ex.key).not.toBe(placesOf(b));
    }
  });

  it('the wrong sign at 3,14 and 3,5 names the place, at 0,4 and 0,45 the part that is left over', () => {
    const texts = signsOf(2, 1).flatMap((ex) => (ex.answer.kind === 'choice' ? ex.answer.options.map((o) => o.whyWrong ?? '') : []));
    expect(texts.some((t) => t.includes('zuerst die Zehntel'))).toBe(true);
    expect(texts.some((t) => t.includes('noch etwas dazu'))).toBe(true);
  });

  it('Stufe 1, AB III: the extreme is not fixed by its slot, and the Zehntel have to be compared', () => {
    const asked = items(skill, 1, 3, 400);
    let inThree = 0;
    let smallestNotNull = 0;
    for (const ex of asked) {
      if (ex.answer.kind !== 'choice') throw new Error(ex.key);
      const labels = ex.answer.options.map((o) => o.label);
      const answer = labels[ex.answer.correct];
      const wholes = labels.map((l) => l.split(',')[0]);
      if (wholes.filter((w) => w === answer.split(',')[0]).length === 3) inThree++;
      if (ex.prompt.includes('kleinste') && answer.split(',')[1][0] !== '0') smallestNotNull++;
    }
    expect(inThree / asked.length).toBeGreaterThan(0.5);
    expect(inThree).toBeLessThan(asked.length);
    expect(smallestNotNull).toBeGreaterThan(0);
  });

  it('Stufe 2, AB III: longer-is-larger and shorter-is-larger each fail sometimes, for the largest and for the smallest (F4)', () => {
    const asked = items(skill, 2, 3, 600).filter((ex) => ex.key.includes(':extrem:'));
    for (const word of ['größte', 'kleinste']) {
      const lengths = asked.filter((ex) => ex.prompt.includes(word)).map((ex) => {
        if (ex.answer.kind !== 'choice') throw new Error(ex.key);
        const places = ex.answer.options.map((o) => placesOf(o.label));
        const own = placesOf(ex.answer.options[ex.answer.correct].label);
        return { shortest: own === Math.min(...places), longest: own === Math.max(...places) };
      });
      for (const side of ['shortest', 'longest'] as const) {
        const share = lengths.filter((l) => l[side]).length / lengths.length;
        expect(share, `${word}, ${side}`).toBeGreaterThan(0.1);
        expect(share, `${word}, ${side}`).toBeLessThan(0.75);
      }
    }
  });

  it('Stufe 3 orders 5 numbers in the true order, and the typical wrong orders have their hints', () => {
    const orders = [...items(skill, 3, 1), ...items(skill, 3, 2), ...items(skill, 3, 3)].filter((ex) => ex.answer.kind === 'order');
    expect(orders.length).toBeGreaterThan(0);
    const bugIds = new Set<string>();
    for (const ex of orders) {
      if (ex.answer.kind !== 'order') throw new Error(ex.key);
      const { items: shown, correct, direction } = ex.answer;
      expect(shown.length, ex.key).toBe(5);
      const values = correct.map((i) => num(shown[i]));
      for (let i = 1; i < values.length; i++) expect(direction === 'aufsteigend' ? values[i] > values[i - 1] : values[i] < values[i - 1], ex.key).toBe(true);
      for (const bug of ex.bugs ?? []) {
        bugIds.add(bug.id);
        expect(checkAnswer(ex.answer, { kind: 'order', order: bug.match as number[] }, ex.bugs).bugHint, ex.key).toBe(bug.hint);
      }
    }
    expect([...bugIds].sort()).toEqual(['kuerzer-groesser', 'laenger-groesser']);
  });

  it('a number in between: every typed number between the borders counts, the borders do not', () => {
    const between = [...items(skill, 3, 2), ...items(skill, 3, 3)].filter((ex) => ex.key.includes(':zwischen:'));
    expect(between.length).toBeGreaterThan(0);
    for (const ex of between) {
      const [lo, hi] = /zwischen ([\d,]+) und ([\d,]+)/.exec(ex.prompt)!.slice(1);
      const inside = `${lo}1`;
      expect(checkAnswer(ex.answer, { kind: 'number', text: inside }, ex.bugs).correct, `${ex.key}: ${inside}`).toBe(true);
      expect(checkAnswer(ex.answer, { kind: 'number', text: lo }, ex.bugs).correct, ex.key).toBe(false);
      expect(checkAnswer(ex.answer, { kind: 'number', text: hi }, ex.bugs).correct, ex.key).toBe(false);
    }
  });
});
