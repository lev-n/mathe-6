import { describe, expect, it } from 'vitest';
import { createRng } from '../../core/rng';
import { describeSkill } from '../../core/testing';
import type { Ab, ChoiceAnswer, Exercise, Stufe } from '../../core/types';
import { winkelArtenSkill as skill } from './winkel-arten';

describeSkill(skill, { minDistinct: { 1: 25, 2: 40, 3: 80 } });

const items = (stufe: Stufe, ab: Ab, n = 150): Exercise[] => Array.from({ length: n }, (_, i) => skill.generate(createRng(i * 337 + 19), stufe, { subtractionMethod: 'abziehen', ab }));
const choice = (ex: Exercise) => ex.answer as ChoiceAnswer;
const rightLabel = (ex: Exercise) => choice(ex).options[choice(ex).correct].label;
const art = (d: number) => (d < 90 ? 'spitzer' : d === 90 ? 'rechter' : d < 180 ? 'stumpfer' : d === 180 ? 'gestreckter' : 'überstumpfer');
const stated = (ex: Exercise) => Number(/(\d+)°/.exec(ex.prompt)![1]);

describe('Winkelarten: independent checks', () => {
  it('Stufe 1: spitz, recht and stumpf only, the picture flat, and the named art fits the angle', () => {
    for (const ex of items(1, 1)) {
      expect(ex.visual?.type).toBe('angle');
      if (ex.visual?.type !== 'angle') continue;
      expect(ex.visual.baseRotation).toBe(0);
      expect(choice(ex).options.map((o) => o.label)).toEqual(['spitzer Winkel', 'rechter Winkel', 'stumpfer Winkel']);
      expect(rightLabel(ex)).toBe(`${art(ex.visual.degrees)} Winkel`);
    }
    for (const ex of items(1, 2)) expect(rightLabel(ex)).toBe(`${art(stated(ex))} Winkel`);
  });

  it('Stufe 1, AB III: the right picture has the asked art, the others do not', () => {
    for (const ex of items(1, 3)) {
      const options = choice(ex).options;
      const right = options[choice(ex).correct].visual;
      if (right?.type !== 'angle') throw new Error('angle expected');
      expect(art(right.degrees)).toBe(ex.prompt.includes('stumpf') ? 'stumpfer' : 'spitzer');
      for (const o of options) if (o.visual !== right && o.visual?.type === 'angle') expect(art(o.visual.degrees)).not.toBe(art(right.degrees));
    }
  });

  it('where pictures compete, the arm lengths tell nothing: the right one has the shortest, middle and longest about equally often', () => {
    for (const forms of [items(1, 3, 600), items(3, 3, 1200).filter((ex) => ex.key.includes(':arme:'))]) {
      const place = [0, 0, 0];
      for (const ex of forms) {
        const arms = choice(ex).options.map((o) => (o.visual?.type === 'angle' ? o.visual.arm1 : 0));
        expect(new Set(arms).size, ex.key).toBe(3);
        place[[...arms].sort((p, q) => p - q).indexOf(arms[choice(ex).correct])]++;
      }
      expect(forms.length).toBeGreaterThan(300);
      for (const n of place) expect(n / forms.length).toBeGreaterThan(0.25);
    }
  });

  it('the voice gives an opening as data, never a verdict about the opening, and no picture tells the size in words', () => {
    for (const stufe of [1, 2, 3] as Stufe[]) {
      for (const ab of [1, 2, 3] as Ab[]) {
        for (const ex of items(stufe, ab, 80)) {
          if (ex.visual?.type !== 'angle' && !ex.key.includes(':arme:') && !ex.key.includes(':finden:')) continue;
          expect(ex.srText, ex.key).not.toMatch(/kleiner|größer als|große Öffnung|näher an/);
          expect(ex.srText, ex.key).toMatch(/Minute \d+/);
        }
      }
    }
  });

  it('Stufe 2: turned pictures of all five arts, sizes beside 90° and 180°', () => {
    const arts = new Set<string>();
    for (const ex of items(2, 1)) {
      if (ex.visual?.type !== 'angle') throw new Error('angle expected');
      expect(ex.visual.baseRotation).toBeGreaterThan(0);
      expect(rightLabel(ex)).toBe(`${art(ex.visual.degrees)} Winkel`);
      arts.add(rightLabel(ex));
    }
    expect(arts.size).toBe(5);
    for (const ex of items(2, 2)) expect(rightLabel(ex)).toBe(`${art(stated(ex))} Winkel`);
  });

  it('Stufe 2, AB III: the sum of two angles, or six degrees per minute', () => {
    for (const ex of items(2, 3)) {
      if (ex.key.includes(':uhr:')) {
        const minutes = Number(/(\d+) Minuten/.exec(ex.context!)![1]);
        expect(rightLabel(ex)).toBe(`${art(minutes * 6)} Winkel`);
      } else {
        const [a, b] = [...ex.prompt.matchAll(/(\d+)°/g)].map((m) => Number(m[1]));
        expect(rightLabel(ex)).toBe(`${art(a + b)} Winkel`);
      }
    }
  });

  it('Stufe 3: the range is the one of the drawn angle, and each estimate stays at least 20° from the others', () => {
    for (const ex of items(3, 1)) {
      if (ex.visual?.type !== 'angle') throw new Error('angle expected');
      const d = ex.visual.degrees;
      expect(rightLabel(ex)).toBe(d < 45 ? 'kleiner als 45°' : d < 90 ? 'zwischen 45° und 90°' : d < 180 ? 'zwischen 90° und 180°' : 'größer als 180°');
      for (const border of [45, 90, 180]) expect(Math.abs(d - border)).toBeGreaterThanOrEqual(10);
    }
    for (const ex of items(3, 2)) {
      if (ex.visual?.type !== 'angle') throw new Error('angle expected');
      expect(rightLabel(ex)).toBe(`${ex.visual.degrees}°`);
      const sizes = choice(ex).options.map((o) => parseInt(o.label, 10));
      expect(sizes.length).toBeGreaterThanOrEqual(3);
      for (const size of sizes) if (size !== ex.visual.degrees) expect(Math.abs(size - ex.visual.degrees)).toBeGreaterThanOrEqual(20);
    }
  });

  it('Stufe 3, AB III: a wrong estimate never lies across 90° alone, so only 45°, the way to 180° or 180° itself can decide', () => {
    const benchmarks = new Set<string>();
    for (const ex of items(3, 3, 600).filter((e) => e.key.includes(':pruefen:'))) {
      if (ex.visual?.type !== 'angle') throw new Error('angle expected');
      const [claim, d] = [stated(ex), ex.visual.degrees];
      if (Math.abs(claim - d) <= 5) {
        expect(rightLabel(ex), ex.key).toBe('Ja, das passt');
        continue;
      }
      expect(rightLabel(ex), ex.key).toBe(d > claim ? 'Nein, der Winkel ist größer' : 'Nein, der Winkel ist kleiner');
      expect(Math.abs(claim - d), ex.key).toBeGreaterThanOrEqual(25);
      expect(claim < 90, `${ex.key}: 90° alone decides`).toBe(d < 90);
      const said = ex.steps.slice(0, 2).join(' ');
      const used = [...said.matchAll(/als (45|180)°|näher an (90|180)°/g)].map((m) => m[0]);
      expect(used, ex.key).toHaveLength(2);
      used.forEach((u) => benchmarks.add(u));
    }
    expect(benchmarks.has('als 45°') && benchmarks.has('als 180°') && benchmarks.has('näher an 180°')).toBe(true);
  });

  it('Stufe 3, AB III: of three angles the one with the asked size is right, near the others, and each of smallest, middle and largest', () => {
    const place = [0, 0, 0];
    const forms = items(3, 3, 1200).filter((e) => e.key.includes(':arme:'));
    for (const ex of forms) {
      const asked = stated(ex);
      const sizes = choice(ex).options.map((o) => (o.visual?.type === 'angle' ? o.visual.degrees : 0));
      expect(sizes, ex.key).toHaveLength(3);
      expect(sizes[choice(ex).correct], ex.key).toBe(asked);
      const sorted = [...sizes].sort((p, q) => p - q);
      for (const i of [1, 2]) {
        expect(sorted[i] - sorted[i - 1], ex.key).toBeGreaterThanOrEqual(25);
        expect(sorted[i] - sorted[i - 1], ex.key).toBeLessThanOrEqual(35);
      }
      place[sorted.indexOf(asked)]++;
    }
    for (const n of place) expect(n / forms.length).toBeGreaterThan(0.2);
  });

  it('the hints never name the right art', () => {
    for (const stufe of [1, 2] as Stufe[]) {
      for (const ab of [1, 2, 3] as Ab[]) {
        for (const ex of items(stufe, ab, 60)) for (const h of ex.hints) if (ex.answer.kind === 'choice' && rightLabel(ex).includes('Winkel')) expect(h, ex.key).not.toContain(rightLabel(ex));
      }
    }
  });
});
