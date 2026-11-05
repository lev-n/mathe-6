import { describe, expect, it } from 'vitest';
import { toSpeech } from '../../core/format';
import { createRng } from '../../core/rng';
import { describeSkill } from '../../core/testing';
import type { Ab, Exercise, Stufe } from '../../core/types';
import { spiegelnSkill as skill } from './spiegeln';

describeSkill(skill, { minDistinct: { 1: 60, 2: 60, 3: 60 } });

const items = (stufe: Stufe, ab: Ab, n = 200): Exercise[] => Array.from({ length: n }, (_, i) => skill.generate(createRng(i * 337 + 19), stufe, { subtractionMethod: 'abziehen', ab }));
const pointsIn = (text: string) => [...text.matchAll(/([A-Z])\((−?\d+)\s\|\s(−?\d+)\)/g)].map((m) => ({ name: m[1], x: Number(m[2].replace('−', '-')), y: Number(m[3].replace('−', '-')) }));
const targetsOf = (ex: Exercise) => {
  if (ex.answer.kind !== 'point') throw new Error('point expected');
  return (ex.answer.targets ?? [ex.answer.target]).map((t) => t.join());
};
const given = (ex: Exercise) => {
  if (ex.answer.kind !== 'point') throw new Error('point expected');
  return ex.answer.points!;
};

describe('Spiegeln und Verschieben: independent checks', () => {
  it('Stufe 1, AB I: Kästchen, the image mirrored at the vertical axis, inside a 6 by 6 grid, touching the axis', () => {
    for (const ex of items(1, 1)) {
      if (ex.answer.kind !== 'cells') throw new Error('cells expected');
      const { given: cells, solution, axis } = ex.answer;
      expect(axis).toEqual({ orientation: 'vertical', at: 3 });
      expect(ex.answer.width).toBe(6);
      expect(cells.every(([x]) => x < 3)).toBe(true);
      expect(cells.some(([x]) => x === 2)).toBe(true);
      expect(solution.map(([x, y]) => `${5 - x},${y}`).sort()).toEqual(cells.map((c) => c.join()).sort());
    }
  });

  it('Stufe 1, AB II: points on the 8 by 8 grid at the vertical axis x = 4', () => {
    for (const ex of items(1, 2)) {
      if (ex.answer.kind !== 'point') throw new Error('point expected');
      expect(ex.answer.xMax).toBe(8);
      expect(ex.answer.segments).toEqual([[{ x: 4, y: 0 }, { x: 4, y: 8 }]]);
      expect(targetsOf(ex)).toEqual(given(ex).map((p) => `${8 - p.x},${p.y}`));
    }
  });

  it('Stufe 1, AB III: the axis is the middle of a point and its image', () => {
    for (const ex of items(1, 3)) {
      if (ex.answer.kind !== 'number') throw new Error('number expected');
      const [q, p] = pointsIn(ex.prompt);
      expect(ex.answer.value).toBe((p.x + q.x) / 2);
      expect(p.y).toBe(q.y);
    }
  });

  it('Stufe 2: horizontal axis for Kästchen; a diagonal changes places, never on the axis itself', () => {
    for (const ex of items(2, 1)) {
      if (ex.answer.kind !== 'cells') throw new Error('cells expected');
      expect(ex.answer.axis?.orientation).toBe('horizontal');
      expect(ex.answer.solution.map(([x, y]) => `${x},${5 - y}`).sort()).toEqual(ex.answer.given.map((c) => c.join()).sort());
    }
    for (const ex of items(2, 2)) {
      if (ex.answer.kind !== 'point') throw new Error('point expected');
      const rising = ex.answer.segments![0][0].y === 0;
      expect(targetsOf(ex)).toEqual(given(ex).map((p) => (rising ? `${p.y},${p.x}` : `${8 - p.y},${8 - p.x}`)));
      expect(targetsOf(ex).every((t, i) => t !== `${given(ex)[i].x},${given(ex)[i].y}`)).toBe(true);
    }
  });

  it('Stufe 2, AB III: Symmetrieachsen, counted once more here', () => {
    const COUNT: Record<string, number> = { quadrat: 4, rechteck: 2, raute: 2, parallelogramm: 0, 'gleichseitiges-dreieck': 3, drachen: 1, sechseck: 6 };
    for (const ex of items(2, 3)) {
      if (ex.answer.kind !== 'number' || ex.visual?.type !== 'shape') throw new Error('number and shape expected');
      expect(ex.answer.value).toBe(COUNT[ex.visual.shape]);
    }
  });

  it('Stufe 3: Verschieben adds, Punktspiegelung doubles the way, the centre halves it', () => {
    const horizontal = new Set<string>();
    for (const ex of items(3, 1)) {
      const way = /(\d+) nach (rechts|links) und (\d+) nach (oben|unten)/.exec(ex.prompt)!;
      const dx = (way[2] === 'rechts' ? 1 : -1) * Number(way[1]);
      const dy = (way[4] === 'oben' ? 1 : -1) * Number(way[3]);
      horizontal.add(way[2]);
      expect(pointsIn(ex.prompt), `${ex.key}: the coordinates come from the grid`).toEqual([]);
      expect(given(ex), ex.key).toHaveLength(3);
      expect(targetsOf(ex), ex.key).toEqual(given(ex).map((p) => `${p.x + dx},${p.y + dy}`));
    }
    expect(horizontal.size, 'to the right and to the left').toBe(2);
    for (const ex of items(3, 2)) {
      const [p, z] = pointsIn(ex.prompt);
      expect(targetsOf(ex)).toEqual([`${2 * z.x - p.x},${2 * z.y - p.y}`]);
    }
    for (const ex of items(3, 3)) {
      const pts = pointsIn(ex.prompt);
      if (ex.key.includes(':gleich:')) {
        const [p, q, r] = pts;
        expect(targetsOf(ex)).toEqual([`${r.x + q.x - p.x},${r.y + q.y - p.y}`]);
      } else {
        const [q, p] = pts;
        expect(targetsOf(ex)).toEqual([`${(p.x + q.x) / 2},${(p.y + q.y) / 2}`]);
      }
    }
  });

  it('a single image has its own name, and the voice never says Punkt twice', () => {
    for (const ex of items(2, 2)) {
      if (ex.answer.kind !== 'point') throw new Error('point expected');
      if (!ex.answer.targets) {
        expect(ex.answer.name, ex.key).toBe('Q');
        expect(ex.prompt, ex.key).toContain('den Bildpunkt Q');
      }
    }
    for (const stufe of [1, 2, 3] as Stufe[]) {
      for (const ab of [1, 2, 3] as Ab[]) {
        for (const ex of items(stufe, ab, 60)) {
          for (const text of [ex.prompt, ex.srText, ...ex.steps.map((step) => (typeof step === 'string' ? step : step.text))]) expect(toSpeech(text), ex.key).not.toMatch(/Punkt (heißt |ist )?Punkt/);
        }
      }
    }
  });

  it('a wrong distance from the axis matches its bug at Stufe 1', () => {
    let found = 0;
    for (const ex of items(1, 2)) for (const b of ex.bugs ?? []) if (b.id === 'spiegel-abstand') found++;
    expect(found).toBeGreaterThan(100);
  });
});
