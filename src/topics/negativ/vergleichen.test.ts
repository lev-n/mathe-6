import { describe, expect, it } from 'vitest';
import { describeSkill } from '../../core/testing';
import type { Ab } from '../../core/types';
import { checkAll, correctLabel, items } from './checks';
import { vergleichenSkill } from './vergleichen';

describeSkill(vergleichenSkill);

const parse = (t: string) => Number(t.replace('−', '-').replace(/[\s  ]/g, '').replace(/[^\d-]/g, ''));

describe('negativ.vergleichen', () => {
  it('worked steps, hints, spoken text and labels', () => checkAll(vergleichenSkill));

  it('needs no keypad: choice and order only', () => {
    expect(vergleichenSkill.keys).toBeUndefined();
    for (const stufe of [1, 2, 3] as const) {
      for (const ab of [1, 2, 3] as Ab[]) {
        for (const { ex } of items(vergleichenSkill, stufe, ab)) expect(['choice', 'order']).toContain(ex.answer.kind);
      }
    }
  });

  it('Stufe 1 compares one negative with one positive number or 0, and the sign is right', () => {
    for (const ab of [1, 2] as Ab[]) {
      for (const { ex, form, num } of items(vergleichenSkill, 1, ab)) {
        expect(form).toBe('zeichen');
        const [a, b] = num;
        expect(Math.min(a, b)).toBeLessThan(0);
        expect(Math.max(a, b)).toBeGreaterThanOrEqual(0);
        expect(correctLabel(ex)).toBe(a < b ? '<' : '>');
      }
    }
  });

  it('Stufe 1 AB III: the counterexample does not fall to the only minus', () => {
    let seen = 0;
    for (const { ex, form } of items(vergleichenSkill, 1, 3, 800)) {
      if (form !== 'null') continue;
      seen++;
      if (ex.answer.kind !== 'choice') throw new Error('choice');
      expect(ex.answer.options.filter((o) => o.label.includes('−')).length, ex.key).toBeGreaterThanOrEqual(3);
      expect(ex.answer.options, ex.key).toHaveLength(4);
    }
    expect(seen).toBeGreaterThan(0);
  });

  it('Stufe 2 compares two negative numbers, and the choice is right', () => {
    for (const ab of [1, 2, 3] as Ab[]) {
      for (const { ex, form, num } of items(vergleichenSkill, 2, ab)) {
        if (form === 'zeichen') {
          const [a, b] = num;
          expect(Math.max(a, b)).toBeLessThan(0);
          expect(a).not.toBe(b);
          expect(correctLabel(ex)).toBe(a < b ? '<' : '>');
        }
        if (form === 'kaelter' || form === 'tiefer') expect(parse(correctLabel(ex))).toBe(Math.min(num[0], num[1]));
        if (form === 'zwischen') {
          expect(parse(correctLabel(ex))).toBe(num[2]);
          expect(num[0]).toBeLessThan(num[2]);
          expect(num[2]).toBeLessThan(num[1]);
          expect(num[1]).toBeLessThan(0);
        }
      }
    }
  });

  it('Stufe 3 orders five numbers by their value, not their Betrag', () => {
    let orders = 0;
    let terms = 0;
    for (const ab of [1, 2] as Ab[]) {
      for (const { ex, form } of items(vergleichenSkill, 3, ab)) {
        if (form === 'gegenzahl' || form === 'betrag' || form === 'groesster-betrag') { terms++; continue; }
        orders++;
        if (ex.answer.kind !== 'order') throw new Error('order');
        const { items: shown, correct, direction } = ex.answer;
        expect(shown).toHaveLength(5);
        const inOrder = correct.map((i) => parse(shown[i]));
        expect(inOrder).toEqual([...inOrder].sort((x, y) => (direction === 'aufsteigend' ? x - y : y - x)));
        expect(new Set(inOrder).size).toBe(5);
      }
    }
    expect(orders).toBeGreaterThan(0);
    expect(terms).toBeGreaterThan(0);
  });

  it('Gegenzahl and Betrag are right', () => {
    for (const { ex, form, num } of items(vergleichenSkill, 3, 1)) {
      if (form === 'gegenzahl') {
        expect(parse(correctLabel(ex))).toBe(-num[0]);
        if (ex.answer.kind !== 'choice') throw new Error('choice');
        const values = ex.answer.options.map((o) => parse(o.label));
        const answer = parse(correctLabel(ex));
        expect(values.filter((v) => Math.sign(v) === Math.sign(answer)).length, `${ex.key}: the side alone must not find it`).toBeGreaterThan(1);
        expect(values.filter((v) => Math.abs(v) === Math.abs(answer)).length, `${ex.key}: the size alone must not find it`).toBeGreaterThan(1);
      }
      if (form === 'betrag') expect(parse(correctLabel(ex))).toBe(Math.abs(num[0]));
    }
    for (const { ex, form, num } of items(vergleichenSkill, 3, 2)) {
      if (form === 'groesster-betrag') expect(Math.abs(parse(correctLabel(ex)))).toBe(Math.max(...num.map(Math.abs)));
    }
  });
});
