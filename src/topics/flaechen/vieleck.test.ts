import { describe, expect, it } from 'vitest';
import { describeSkill } from '../../core/testing';
import { checkWorkedSolution } from '../step-check';
import { outline, partCells, vieleckSkill } from './vieleck';
import { allItems, correctLabel, numberOf, parseDe, termValue, thinCells } from './testing';

describeSkill(vieleckSkill);

const items = allItems(vieleckSkill);

describe('flaechen.vieleck: answers recomputed', () => {
  it('every worked solution adds up', () => {
    for (const ex of items) expect(checkWorkedSolution(ex), ex.key).toEqual([]);
  });

  it('outline counts the sides of the Kästchen on the rim', () => {
    expect(outline(partCells([{ x: 0, y: 0, w: 3, h: 2 }]))).toBe(10);
    expect(outline(partCells([{ x: 0, y: 0, w: 2, h: 3 }, { x: 2, y: 1, w: 2, h: 2 }]))).toBe(14);
  });

  it('on the grid: the Kästchen of the picture, at most 40, and no part twice', () => {
    let seen = 0;
    for (const ex of items) {
      if (ex.visual?.type !== 'grid') continue;
      const { cells } = ex.visual;
      expect(new Set(cells.map((c) => c.join())).size, ex.key).toBe(cells.length);
      expect(cells.length, ex.key).toBeLessThanOrEqual(40);
      if (ex.key.includes(':kaestchen-wert:')) {
        const side = Number(/:kaestchen-wert:(\d):/.exec(ex.key)![1]);
        expect(numberOf(ex), ex.key).toBe(cells.length * side * side);
      } else expect(numberOf(ex), ex.key).toBe(cells.length);
      seen++;
    }
    expect(seen).toBeGreaterThan(100);
  });

  it('a Trapez, by its parts and by the rule (a + c) · h : 2', () => {
    for (const ex of items) {
      const m = /:trapez-(?:rechts|sym):([\d,]+):(\d+):(\d+)$/.exec(ex.key);
      if (!m) continue;
      const [a, c, h] = [parseDe(m[1]), Number(m[2]), Number(m[3])];
      expect(numberOf(ex), ex.key).toBeCloseTo((a + c) * h / 2, 6);
    }
  });

  it('Raute and Drachen: half the product of the diagonals', () => {
    for (const ex of items) {
      const m = /:diagonalen:[^:]+:(\d+):(\d+):\d+$/.exec(ex.key);
      if (!m) continue;
      expect(numberOf(ex), ex.key).toBe(Number(m[1]) * Number(m[2]) / 2);
      // the worked steps use only what the task states: the split of the long diagonal is in neither text nor picture
      const steps = ex.steps.map((s) => (typeof s === 'string' ? s : s.text)).join(' ');
      for (const n of steps.match(/\d+/g)!) expect([m[1], m[2], '2', String(numberOf(ex))], `${ex.key}: ${steps}`).toContain(n);
    }
  });

  it('polygons from measures', () => {
    for (const ex of items) {
      const s = /:sechseck:(\d+):(\d+):(\d+)$/.exec(ex.key);
      if (s) {
        const [w, h, tip] = s.slice(1).map(Number);
        expect(numberOf(ex), ex.key).toBe(w * h + 2 * (h * tip / 2));
      }
      const t = /:haus-gesamt:(\d+):(\d+):(\d+)$/.exec(ex.key);
      if (t) {
        const [w, wall, total] = t.slice(1).map(Number);
        expect(numberOf(ex), ex.key).toBe(w * wall + w * (total - wall) / 2);
      }
      const e = /:zwei-ecken:(\d+):(\d+):(\d+):(\d+)$/.exec(ex.key);
      if (e) {
        const [w, top, h, wall] = e.slice(1).map(Number);
        expect(numberOf(ex), ex.key).toBe(w * h - (w - top) / 2 * (h - wall));
      }
    }
  });

  it('choosing a decomposition: exactly one calculation gives the area', () => {
    let seen = 0;
    for (const ex of items) {
      const m = /:zerlegung:(\d+)x(\d+)-(\d+)x(\d+):/.exec(ex.key);
      if (!m || ex.answer.kind !== 'choice') continue;
      const [w, h, cw, ch] = m.slice(1).map(Number);
      const area = w * h - cw * ch;
      expect(termValue(correctLabel(ex)), ex.key).toBe(area);
      expect(ex.answer.options.filter((o) => termValue(o.label) === area).length, ex.key).toBe(1);
      seen++;
    }
    expect(seen).toBeGreaterThan(50);
  });
});

describe('flaechen.vieleck: the Stufen', () => {
  it('every cell has enough different items for its slots', () => {
    expect(thinCells(vieleckSkill)).toEqual([]);
  });

  it('each form belongs to its Stufe: AB only varies the demand', () => {
    const forms: Record<number, string[]> = { 1: ['gitter-l', 'gitter-frei', 'kaestchen-wert'], 2: ['trapez-rechts', 'diagonalen', 'trapez-sym'], 3: ['sechseck', 'zerlegung', 'haus-gesamt', 'zwei-ecken'] };
    for (const ex of items) expect(forms[ex.stufe], ex.key).toContain(ex.key.split(':')[2]);
  });
});
