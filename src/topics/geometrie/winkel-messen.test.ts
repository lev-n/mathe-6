import { describe, expect, it } from 'vitest';
import { createRng } from '../../core/rng';
import { describeSkill } from '../../core/testing';
import type { Ab, Exercise, Stufe } from '../../core/types';
import { srTextWithPicture } from '../../ui/visuals/describe';
import { tagFor } from '../errorFamilies';
import { winkelMessenSkill as skill } from './winkel-messen';

describeSkill(skill, { minDistinct: { 1: 14, 2: 60, 3: 80 } });

const items = (stufe: Stufe, ab: Ab, n = 150): Exercise[] => Array.from({ length: n }, (_, i) => skill.generate(createRng(i * 337 + 19), stufe, { subtractionMethod: 'abziehen', ab }));
const AB: Ab[] = [1, 2, 3];
const read = (ex: Exercise) => {
  if (ex.answer.kind !== 'number' || ex.answer.value === null || ex.visual?.type !== 'angle') throw new Error('number and angle expected');
  return { value: ex.answer.value, tolerance: ex.answer.tolerance, unit: ex.answer.unit, v: ex.visual };
};

describe('Winkel messen: independent checks', () => {
  it('Stufe 1: arm on 0, the scale highlighted, steps of 10°, ±2°, the value is the drawn angle', () => {
    for (const ab of AB) {
      for (const ex of items(1, ab)) {
        const { value, tolerance, unit, v } = read(ex);
        expect(v.baseRotation).toBe(0);
        expect(v.tool).toBe('geodreieck');
        expect(v.highlightScale).toBe('outer');
        expect(value).toBe(v.degrees);
        expect(value % 10).toBe(0);
        expect(tolerance).toBe(2);
        expect(unit).toBe('°');
      }
    }
  });

  it('Stufe 2: steps of 5°, turned, no scale highlighted, ±2°', () => {
    for (const ab of AB) {
      for (const ex of items(2, ab)) {
        const { value, tolerance, v } = read(ex);
        expect(v.baseRotation).toBeGreaterThan(0);
        expect(v.highlightScale).toBeUndefined();
        expect(v.degrees % 5).toBe(0);
        expect(v.degrees % 10).not.toBe(0);
        expect(tolerance).toBe(2);
        expect(value).toBe(ab === 3 ? 180 - v.degrees : v.degrees);
      }
    }
  });

  it('Stufe 3: to the degree between the 5° ticks, ±1°, turned, arms of different lengths', () => {
    for (const ab of AB) {
      const arms = new Set<number>();
      for (const ex of items(3, ab)) {
        const { value, tolerance, v } = read(ex);
        expect(tolerance).toBe(1);
        expect(v.highlightScale).toBeUndefined();
        expect(v.degrees % 5).not.toBe(0);
        expect(Math.abs(v.degrees - 90)).toBeGreaterThanOrEqual(8);
        arms.add(v.arm1);
        if (ex.key.includes(':rest-genau:')) {
          const whole = Number(/:(\d+)$/.exec(ex.key)![1]);
          expect(value).toBe(whole - v.degrees);
        } else expect(value).toBe(v.degrees);
      }
      if (ab !== 3) expect(arms.size).toBeGreaterThan(1);
    }
    for (const ex of items(3, 2)) expect(read(ex).v.arm2).toBeLessThan(1);
  });

  it('the voice gives both scales and the opening, so reading and choosing stay with the child; one reading alone is never said', () => {
    for (const stufe of [1, 2, 3] as Stufe[]) {
      for (const ab of AB) {
        const smaller = new Set<boolean>();
        for (const ex of items(stufe, ab, 200)) {
          const { value, v } = read(ex);
          const said = srTextWithPicture(ex);
          expect(said, ex.key).not.toMatch(/zeigt auf \d+ Grad/);
          expect(said, ex.key).toContain(`auf jeder Skala: ${Math.min(v.degrees, 180 - v.degrees)} und ${Math.max(v.degrees, 180 - v.degrees)}.`);
          expect(said, ex.key).toContain(`Minute ${Math.round(v.degrees / 6)}.`);
          expect(said.match(/auf jeder Skala/g), `${ex.key}: the description of the picture is not read as well`).toHaveLength(1);
          if (stufe === 1) expect(said, ex.key).toContain('markierte Skala');
          if (value === v.degrees) smaller.add(v.degrees < 90);
        }
        if (smaller.size > 0) expect(smaller.size, `Stufe ${stufe}, AB ${ab}: the right number is the smaller and the larger one`).toBe(2);
      }
    }
  });

  it('every bug lies beyond the tolerance, and reading the other scale is the family of §5', () => {
    for (const stufe of [1, 2, 3] as Stufe[]) {
      for (const ab of AB) {
        for (const ex of items(stufe, ab, 80)) {
          const { value, tolerance, v } = read(ex);
          for (const b of ex.bugs ?? []) expect(Math.abs((b.match as number) - value), ex.key).toBeGreaterThan(tolerance!);
          const other = (ex.bugs ?? []).find((b) => b.id === 'skala-verwechselt');
          if (other) {
            expect(other.match).toBe(180 - v.degrees);
            expect(tagFor(skill.id, other.id)).toBe('geometrie-skala');
          }
        }
      }
    }
  });
});
