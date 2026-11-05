import { describe, expect, it } from 'vitest';
import { spokenWords } from '../../core/format';
import { describeSkill } from '../../core/testing';
import { speak } from '../../core/format';
import type { NumberAnswer } from '../../core/types';
import { evalSide } from '../step-check';
import skill from './groessen';
import { allItems, describeDecimalRules, items, near } from './test-helpers';

describeSkill(skill, { minDistinct: 30 });
describeDecimalRules(skill);

const UNITS = (text: string) => [...text.matchAll(/\d[\s ]?(€|ct|cm|km|kg|ml|mm|m|g|l)(?![\p{L}])/gu)].map((m) => m[1]);

describe('dezimal.groessen: content', () => {
  it('every item says its comma as a comma', () => {
    for (const ex of allItems(skill)) expect(ex.literalComma, ex.key).toBe(true);
    expect(spokenWords('7,08 €', { literalComma: true })).toContain('Komma');
  });

  it('a conversion is right in base units', () => {
    for (const ex of allItems(skill)) {
      const m = /^(.+) = □ (€|ct|cm|km|kg|ml|m|g|l)$/.exec(ex.expression ?? '');
      if (!m) continue;
      const a = ex.answer as NumberAnswer;
      const given = evalSide(m[1].replace(/ /g, ' '))?.value ?? NaN;
      const result = evalSide(`${String(a.value).replace('.', ',')} ${m[2]}`)?.value ?? NaN;
      expect(near(given, result) || Math.abs(given - result) < 1e-6, `${ex.key}: ${given} and ${result}`).toBe(true);
    }
  });

  it('each Stufe keeps its units', () => {
    const unitsOf = (stufe: 1 | 2 | 3, ab: 1 | 2 | 3) => items(skill, stufe, ab).filter((ex) => ex.expression).flatMap((ex) => UNITS(ex.expression ?? ''));
    for (const ab of [1, 2, 3] as const) {
      unitsOf(1, ab).forEach((u) => expect(['€', 'ct', 'm', 'cm']).toContain(u));
      unitsOf(2, ab).forEach((u) => expect(['kg', 'g', 'km', 'm']).toContain(u));
    }
    for (const ex of items(skill, 3, 1)) UNITS(ex.expression ?? '').forEach((u) => expect(['l', 'ml']).toContain(u));
  });

  it('Stufe 3 orders mixed units in the true order, and ordering the bare numbers has its hint', () => {
    const orders = [...items(skill, 3, 2), ...items(skill, 3, 3)].filter((ex) => ex.answer.kind === 'order');
    expect(orders.length).toBeGreaterThan(0);
    for (const ex of orders) {
      if (ex.answer.kind !== 'order') throw new Error(ex.key);
      const values = ex.answer.correct.map((i) => evalSide((ex.answer as { items: string[] }).items[i].replace(/ /g, ' '))?.value ?? NaN);
      for (let i = 1; i < values.length; i++) expect(ex.answer.direction === 'aufsteigend' ? values[i] > values[i - 1] : values[i] < values[i - 1], ex.key).toBe(true);
      expect(new Set(ex.answer.items.map((label) => UNITS(label)[0])).size, `${ex.key}: two units`).toBe(2);
    }
    expect(orders.some((ex) => ex.bugs?.some((b) => b.id === 'einheit-ignoriert'))).toBe(true);
  });

  it('Stufe 3, AB I: litres to millilitres take a shift, not only the digits without their comma', () => {
    const conversions = items(skill, 3, 1, 300).filter((ex) => ex.key.includes(':klein:'));
    expect(conversions.length).toBeGreaterThan(0);
    for (const ex of conversions) {
      const shown = (ex.expression ?? '').split('\u00A0')[0];
      const digits = shown.replace(',', '').replace(/^0+/, '');
      expect(String((ex.answer as NumberAnswer).value), `${ex.key}: ${ex.expression}`).not.toBe(digits);
    }
  });

  it('an order item says its quantities the same with and without the literal comma: OrderInput reads its buttons without it', () => {
    const orders = [...items(skill, 3, 2, 300), ...items(skill, 3, 3, 300)].filter((ex) => ex.answer.kind === 'order');
    expect(orders.length).toBeGreaterThan(0);
    for (const ex of orders) {
      if (ex.answer.kind !== 'order') throw new Error(ex.key);
      for (const item of ex.answer.items) expect(speak(item), `${ex.key}: ${item}`).toBe(speak(item, { literalComma: true }));
    }
  });

  it('1,5 kg = 150 g has its hint', () => {
    const bugs = items(skill, 2, 1).flatMap((ex) => ex.bugs ?? []);
    expect(bugs.some((b) => b.id === 'einheit-100-1000')).toBe(true);
  });
});
