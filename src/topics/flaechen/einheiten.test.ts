import { describe, expect, it } from 'vitest';
import { describeSkill } from '../../core/testing';
import { checkWorkedSolution } from '../step-check';
import { einheitenSkill } from './einheiten';
import { fmt } from '../../core/format';
import { allItems, cellItems, fieldOf, numberOf, parseDe, thinCells } from './testing';

describeSkill(einheitenSkill, { minDistinct: { 1: 30, 2: 30, 3: 30 } });

const items = allItems(einheitenSkill);
/** cm² in each unit, as a whole number, so that no float decides. */
const CM2: Record<string, number> = { 'cm²': 1, 'dm²': 100, 'm²': 10_000, a: 1_000_000, ha: 100_000_000 };
const quantity = (text: string) => {
  const m = /^([\d,\s ]+?)\s(cm²|dm²|m²|ha|a)$/.exec(text.trim())!;
  return parseDe(m[1]) * CM2[m[2]];
};

describe('flaechen.einheiten: answers recomputed', () => {
  it('every worked solution adds up', () => {
    for (const ex of items) expect(checkWorkedSolution(ex), ex.key).toEqual([]);
  });

  it('a conversion: both sides are the same area', () => {
    let seen = 0;
    for (const ex of items) {
      const m = /^(.+) = □ (cm²|dm²|m²|ha|a)$/.exec(ex.expression ?? '');
      if (!m || ex.answer.kind !== 'number') continue;
      const left = m[1].split(/(?<=cm²|dm²|m²|ha|a) /).reduce((sum, part) => sum + quantity(part), 0);
      expect(numberOf(ex) * CM2[m[2]], ex.key).toBeCloseTo(left, 6);
      seen++;
    }
    expect(seen).toBeGreaterThan(100);
  });

  it('two units at once: both fields together are the area', () => {
    for (const ex of items) {
      const m = /:zerlegen:(\d+)$/.exec(ex.key);
      if (m) expect(fieldOf(ex, 'gross') * 100 + fieldOf(ex, 'klein'), ex.key).toBe(Number(m[1]));
    }
  });

  it('an order runs from the smallest area, and no two areas are equal', () => {
    let seen = 0;
    for (const ex of items) {
      if (ex.answer.kind !== 'order') continue;
      const { items: labels, correct } = ex.answer;
      const values = correct.map((i) => quantity(labels[i]));
      expect(new Set(values).size, ex.key).toBe(values.length);
      expect([...values].sort((a, b) => a - b), ex.key).toEqual(values);
      seen++;
    }
    expect(seen).toBeGreaterThan(50);
  });
});

describe('flaechen.einheiten: the Stufen', () => {
  it('Stufe 2 AB I is never one step · 100, which is the demand of Stufe 1: whole m², two steps to cm²', () => {
    for (const ex of cellItems(einheitenSkill, 2, 1)) {
      expect(ex.expression, ex.key).toMatch(/^\d+ m² = □ cm²$/);
      expect(ex.steps.join(' '), ex.key).toMatch(/100 · 100/);
    }
    expect(new Set(cellItems(einheitenSkill, 2, 1).map((ex) => ex.key)).size).toBeGreaterThanOrEqual(25);
  });

  it('Stufe 3 AB I is harder than Stufe 2 AB I: back in two steps, or two units whose digits do not simply join', () => {
    for (const ex of cellItems(einheitenSkill, 3, 1)) {
      const parts = (ex.expression ?? '').split(' = □ ')[0].split(/(?<=m²|ha|a) /);
      const form = ex.key.split(':')[2];
      expect(['m-ha', 'zwei-einheiten'], ex.key).toContain(form);
      if (form === 'zwei-einheiten') {
        expect(parts, ex.key).toHaveLength(2);
        const digits = parts.map((p) => parseDe(p.split(' ')[0])).join('');
        expect(numberOf(ex), ex.key).not.toBe(Number(digits));
      } else expect(ex.steps.join(' '), ex.key).toMatch(/100 : 100/);
    }
  });

  it('Stufe 3 AB III is harder than Stufe 2 AB III: a conversion goes into a comma with three places, or orders five', () => {
    const conversions = cellItems(einheitenSkill, 3, 3).filter((ex) => ex.answer.kind === 'number');
    expect(conversions.length).toBeGreaterThan(100);
    for (const ex of conversions) {
      expect(ex.expression, ex.key).toMatch(/= □ ha$/);
      expect(numberOf(ex) * 1000 % 10, `${ex.key}: three places`).not.toBe(0);
    }
    expect(new Set(conversions.map((ex) => ex.expression)).size).toBeGreaterThanOrEqual(60);
    for (const ex of cellItems(einheitenSkill, 3, 3)) if (ex.answer.kind === 'order') expect(ex.answer.items, ex.key).toHaveLength(5);
  });

  it('Stufe 2 AB III always goes into a comma', () => {
    for (const ex of cellItems(einheitenSkill, 2, 3, 2000)) expect(Number.isInteger(numberOf(ex)), ex.key).toBe(false);
  });

  it('no hint states the answer with its unit: a fact like 100 dm² = 1 m² must not be the task itself', () => {
    for (const ex of [...items, ...cellItems(einheitenSkill, 2, 3, 2000)]) {
      if (ex.answer.kind !== 'number' || ex.answer.value === null || !ex.answer.unit) continue;
      const stated = new RegExp(`(?<![\\d,])${fmt(ex.answer.value)} ${ex.answer.unit}`);
      for (const hint of ex.hints) expect(hint, ex.key).not.toMatch(stated);
    }
  });

  it('every cell has enough different items for its slots', () => {
    expect(thinCells(einheitenSkill)).toEqual([]);
  });

  it('Stufe 1 is cm² and dm² with whole numbers, Stufe 2 adds m² and a comma, a and ha wait for Stufe 3', () => {
    for (const ex of items) {
      const text = `${ex.expression ?? ''} ${ex.answer.kind === 'order' ? ex.answer.items.join(' ') : ''}`;
      if (ex.stufe === 1) {
        expect(text, ex.key).not.toMatch(/(?<!c|d)m²|\bha\b|\ba\b|,/);
      }
      if (ex.stufe === 2) expect(text, ex.key).not.toMatch(/\bha\b|\ba\b/);
      if (ex.stufe === 3) expect(text, ex.key).toMatch(/\bha\b|\ba\b/);
    }
  });
});
