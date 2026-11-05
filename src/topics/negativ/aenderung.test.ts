import { describe, expect, it } from 'vitest';
import { describeSkill } from '../../core/testing';
import type { Ab, Exercise } from '../../core/types';
import { checkAll, items, numberValue, textOf } from './checks';
import { aenderungSkill } from './aenderung';

describeSkill(aenderungSkill);

const ABS = [1, 2, 3] as Ab[];

describe('negativ.aenderung', () => {
  it('worked steps, hints, spoken text and labels', () => checkAll(aenderungSkill));

  it('Stufe 1 stays within ±20 and on one side of the 0', () => {
    for (const ab of ABS) {
      for (const { ex, form, p } of items(aenderungSkill, 1, ab)) {
        if (form === 'zwei') {
          const [v, m1, m2] = p.slice(1).map(Number);
          for (const level of [v, v + m1, v + m1 + m2]) {
            expect(level).toBeLessThan(0);
            expect(level).toBeGreaterThanOrEqual(-20);
          }
          expect(numberValue(ex)).toBe(v + m1 + m2);
          continue;
        }
        const v = Number(p[1]);
        const m = Number(p[3]);
        const r = v + (p[2] === 'p' ? m : -m);
        expect(numberValue(ex)).toBe(r);
        expect(Math.abs(v)).toBeLessThanOrEqual(20);
        expect(Math.abs(r)).toBeLessThanOrEqual(20);
        expect(v * r, ex.key).toBeGreaterThan(0);
      }
    }
  });

  it('Stufe 2 crosses the 0, and the end is recomputed', () => {
    for (const ab of ABS) {
      for (const { ex, form, p } of items(aenderungSkill, 2, ab)) {
        if (form === 'zwei') {
          const [v, m1, m2] = p.slice(1).map(Number);
          expect(v * (v + m1), ex.key).toBeLessThan(0);
          expect(numberValue(ex)).toBe(v + m1 + m2);
          continue;
        }
        const v = Number(p[1]);
        const m = Number(p[3]);
        const r = v + (p[2] === 'p' ? m : -m);
        expect(numberValue(ex)).toBe(r);
        expect(v * r, ex.key).toBeLessThan(0);
      }
    }
  });

  it('Stufe 3 finds the change or the start, and the bug from the examples is there', () => {
    for (const { ex, p } of items(aenderungSkill, 3, 1)) {
      const [from, to] = p.slice(1).map(Number);
      expect(numberValue(ex)).toBe(Math.abs(to - from));
      if (from * to < 0) expect(ex.bugs?.some((b) => b.id === 'aenderung-betrag' && b.match === Math.abs(Math.abs(to) - Math.abs(from))), ex.key).toBe(true);
    }
    for (const { ex, form, p } of items(aenderungSkill, 3, 2)) {
      if (form === 'aenderung') expect(numberValue(ex)).toBe(Number(p[2]) - Number(p[1]));
      else {
        const end = Number(p[1]);
        const m = Number(p[3]);
        expect(numberValue(ex)).toBe(p[2] === 'p' ? end - m : end + m);
      }
    }
    for (const { ex, p } of items(aenderungSkill, 3, 3)) {
      const [end, d1, d2] = p.slice(1).map(Number);
      expect(numberValue(ex)).toBe(end - d1 - d2);
    }
  });

  it('two changes never undo each other: the answer is not the start in the text', () => {
    for (const stufe of [1, 2] as const) {
      for (const ab of ABS) {
        for (const { ex, form, p } of items(aenderungSkill, stufe, ab, 800)) {
          if (form !== 'zwei') continue;
          const [v, m1, m2] = p.slice(1).map(Number);
          expect(m1 + m2, ex.key).not.toBe(0);
          expect(numberValue(ex), ex.key).not.toBe(v);
        }
      }
    }
  });

  it('every search for the start holds a negative number and is no plain sum of positives', () => {
    const negative = (ex: Exercise) => /−\d/.test(`${ex.context ?? ''}`) || numberValue(ex) < 0;
    let starts = 0;
    for (const ab of [2, 3] as Ab[]) {
      for (const { ex, form, p } of items(aenderungSkill, 3, ab, 800)) {
        if (form === 'start') {
          starts++;
          expect(negative(ex), ex.key).toBe(true);
        }
        if (form === 'start-zwei') {
          starts++;
          expect(negative(ex), ex.key).toBe(true);
          const [end, d1, d2] = p.slice(1).map(Number);
          expect(Math.max(end, end - d2, end - d2 - d1), `${ex.key}: the way crosses the 0`).toBeGreaterThan(0);
        }
      }
    }
    expect(starts).toBeGreaterThan(0);
  });

  it('no minus with a negative number: this core skill comes before a − (−b) in some plans', () => {
    for (const stufe of [1, 2, 3] as const) {
      for (const ab of ABS) {
        for (const { ex } of items(aenderungSkill, stufe, ab)) {
          for (const text of [...ex.hints, ...ex.steps.map(textOf), ...(ex.bugs ?? []).map((b) => b.hint)]) expect(text, ex.key).not.toMatch(/−\s*\(−/);
        }
      }
    }
  });

  it('temperature stories stay real: under 20 Grad in one change, and no fall towards midday', () => {
    for (const stufe of [1, 2, 3] as const) {
      for (const ab of ABS) {
        for (const { ex, form, p } of items(aenderungSkill, stufe, ab, 400)) {
          const context = ex.context ?? '';
          for (const m of context.matchAll(/um (\d+) Grad/g)) expect(Number(m[1]), ex.key).toBeLessThan(20);
          if ((form === 'wieviel' || form === 'aenderung') && p[0] === 'wetter') {
            const [from, to] = p.slice(1).map(Number);
            expect(Math.abs(to - from), ex.key).toBeLessThan(20);
            if (/Am Morgen.*Am Mittag/.test(context)) expect(to, ex.key).toBeGreaterThan(from);
          }
        }
      }
    }
  });

  it('the thermometer of a task has a scale of the form: its ends do not depend on the result', () => {
    for (const [stufe, scales] of [[1, 2], [2, 1]] as const) {
      const seen = new Set<string>();
      for (const { ex } of items(aenderungSkill, stufe, 1, 800)) {
        if (ex.visual?.type !== 'thermometer') throw new Error(`${ex.key}: a thermometer`);
        seen.add(`${ex.visual.min}:${ex.visual.max}`);
        expect(ex.visual.step, ex.key).toBe(1);
        expect(numberValue(ex), ex.key).toBeLessThanOrEqual(ex.visual.max);
        expect(numberValue(ex), ex.key).toBeGreaterThanOrEqual(ex.visual.min);
      }
      expect(seen.size, `Stufe ${stufe}: ${[...seen].join(' ')}`).toBe(scales);
    }
  });

  it('a building has no deep cellars: the lift stays at floor −6 or above, with or without a floor in the text', () => {
    let lifts = 0;
    for (const stufe of [1, 2, 3] as const) {
      for (const ab of ABS) {
        for (const { ex, form, p } of items(aenderungSkill, stufe, ab, 800)) {
          if (p[0] !== 'aufzug') continue;
          lifts++;
          for (const m of (ex.context ?? '').matchAll(/Stockwerk −(\d+)/g)) expect(Number(m[1]), ex.key).toBeLessThanOrEqual(6);
          if (form !== 'aenderung') expect(numberValue(ex), ex.key).toBeGreaterThanOrEqual(-6);
          if (form === 'zwei') {
            const [v, m1, m2] = p.slice(1).map(Number);
            expect(Math.min(v, v + m1, v + m1 + m2), ex.key).toBeGreaterThanOrEqual(-6);
          }
          if (form === 'start-zwei') {
            const [end, , d2] = p.slice(1).map(Number);
            expect(end - d2, ex.key).toBeGreaterThanOrEqual(-6);
          }
        }
      }
    }
    expect(lifts).toBeGreaterThan(0);
  });

  it('a Konto stands alone: no name and no family in a story', () => {
    for (const stufe of [1, 2, 3] as const) {
      for (const ab of ABS) {
        for (const { ex } of items(aenderungSkill, stufe, ab)) {
          if (/Konto/.test(ex.context ?? '')) expect(ex.context).not.toMatch(/Mama|Papa|Eltern|Familie|Taschengeld|mein|dein|Schulden/);
        }
      }
    }
  });
});
