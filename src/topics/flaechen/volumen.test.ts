import { describe, expect, it } from 'vitest';
import { describeSkill } from '../../core/testing';
import { srTextWithPicture } from '../../ui/visuals/describe';
import { checkWorkedSolution } from '../step-check';
import { allItems, cellItems, correctLabel, fieldOf, numberOf, parseDe, printsAnswer, thinCells } from './testing';
import { volumenSkill } from './volumen';

describeSkill(volumenSkill);

const items = allItems(volumenSkill);

describe('flaechen.volumen: answers recomputed', () => {
  it('every worked solution adds up', () => {
    for (const ex of items) expect(checkWorkedSolution(ex), ex.key).toEqual([]);
  });

  it('layers of unit cubes', () => {
    for (const ex of items) {
      const m = /:lagen:(\d+)-(\d+)-(\d+)$/.exec(ex.key);
      if (m) expect(numberOf(ex), ex.key).toBe(Number(m[1]) * Number(m[2]) * Number(m[3]));
      const f = /:lagen-felder:(\d+)-(\d+)-(\d+)$/.exec(ex.key);
      if (f) {
        const [a, b, c] = f.slice(1).map(Number);
        expect(fieldOf(ex, 'lage'), ex.key).toBe(a * b);
        expect(fieldOf(ex, 'lagen'), ex.key).toBe(c);
        expect(fieldOf(ex, 'alle'), ex.key).toBe(a * b * c);
        // the picture is the same Quader
        if (ex.visual?.type === 'cubeBuilding') expect(ex.visual.heights.flat().reduce((s, h) => s + h, 0), ex.key).toBe(a * b * c);
      }
      const r = /:lagen-rueck:(\d+):(\d+)$/.exec(ex.key);
      if (r) expect(numberOf(ex) * Number(r[2]), ex.key).toBe(Number(r[1]));
    }
  });

  it('a · b · c, also with a comma', () => {
    let seen = 0;
    for (const ex of items) {
      const m = /:(?:abc|komma):([\d,]+)-(\d+)-([\d,]+)$/.exec(ex.key) ?? /:geschichte:[^:]+:(\d+)-(\d+)-(\d+)$/.exec(ex.key);
      if (!m) continue;
      expect(numberOf(ex), ex.key).toBeCloseTo(parseDe(m[1]) * Number(m[2]) * parseDe(m[3]), 6);
      seen++;
    }
    expect(seen).toBeGreaterThan(100);
  });

  it('edges up to 12 cm on Stufe 2', () => {
    for (const ex of items.filter((x) => x.stufe === 2)) {
      const m = /:(\d+)-(\d+)-(\d+)$/.exec(ex.key);
      if (m) expect(Math.max(Number(m[1]), Number(m[2]), Number(m[3])), ex.key).toBeLessThanOrEqual(12);
    }
  });

  it('twice the height, and the larger of two', () => {
    for (const ex of items) {
      const d = /:doppelt:(\d+)-(\d+)-(\d+)$/.exec(ex.key);
      if (d) expect(numberOf(ex), ex.key).toBe(2 * Number(d[1]) * Number(d[2]) * Number(d[3]));
      const c = /:vergleich:(\d+)-(\d+)-(\d+):(\d+)-(\d+)-(\d+)$/.exec(ex.key);
      if (c) {
        const [a1, b1, c1, a2, b2, c2] = c.slice(1).map(Number);
        expect(a1 * b1 * c1, ex.key).not.toBe(a2 * b2 * c2);
        expect(correctLabel(ex), ex.key).toMatch(a1 * b1 * c1 > a2 * b2 * c2 ? /^Quader A/ : /^Quader B/);
        // neither Quader is at least as large on every sorted edge, or a look would decide
        const edges = (x: number[]) => [...x].sort((p, q) => q - p);
        const covers = (x: number[], y: number[]) => edges(x).every((n, i) => n >= edges(y)[i]);
        expect(covers([a1, b1, c1], [a2, b2, c2]) || covers([a2, b2, c2], [a1, b1, c1]), ex.key).toBe(false);
      }
    }
  });

  it('a missing edge, whole or with a comma', () => {
    for (const ex of items) {
      const m = /:kante(?:-komma)?:([\d, ]+):(\d+):(\d+)$/.exec(ex.key);
      if (m) expect(numberOf(ex) * Number(m[2]) * Number(m[3]), ex.key).toBeCloseTo(parseDe(m[1]), 6);
    }
  });

  it('composite Quader: the part that is cut out fits inside', () => {
    for (const ex of items) {
      const c = /:ausschnitt:(\d+)-(\d+)-(\d+):(\d+)-(\d+)-(\d+)$/.exec(ex.key);
      if (c) {
        const [a, b, h, x, y, z] = c.slice(1).map(Number);
        expect(x < a && y < b && z < h, ex.key).toBe(true);
        expect(numberOf(ex), ex.key).toBe(a * b * h - x * y * z);
      }
      const s = /:stapel:(\d+)-(\d+)-(\d+):(\d+)-(\d+)$/.exec(ex.key);
      if (s) {
        const [a, b, y, x, z] = s.slice(1).map(Number);
        expect(numberOf(ex), ex.key).toBe(a * b * y + x * y * z);
      }
    }
  });
});

describe('flaechen.volumen: what the task says', () => {
  it('no task prints its answer: the cubes still missing, the layers and the missing edge stand nowhere in the text', () => {
    for (const ex of [...items, ...cellItems(volumenSkill, 1, 3, 1000), ...cellItems(volumenSkill, 3, 1)]) expect(printsAnswer(ex), `${ex.key}: ${ex.context ?? ''} ${ex.prompt}`).toBe(false);
  });
});

describe('flaechen.volumen: the screen reader', () => {
  it('a Quader of unit cubes gives its counts in words, and never the answer', () => {
    let seen = 0;
    for (const ex of cellItems(volumenSkill, 1, 1)) {
      const m = /:lagen:(\d+)-(\d+)-(\d+)$/.exec(ex.key)!;
      const said = srTextWithPicture(ex);
      expect(said, ex.key).toContain(`${m[1]} Würfel breit, ${m[2]} Würfel tief und ${m[3]} Würfel hoch`);
      expect(said, ex.key).not.toMatch(new RegExp(`(?<!\\d)${numberOf(ex)} (kleine )?Würfel(?! (breit|tief|hoch))`));
      seen++;
    }
    expect(seen).toBeGreaterThan(100);
  });
});

describe('flaechen.volumen: the Stufen', () => {
  it('every cell has enough different items for its slots', () => {
    expect(thinCells(volumenSkill)).toEqual([]);
  });

  it('each form belongs to its Stufe: AB only varies the demand', () => {
    const forms: Record<number, string[]> = { 1: ['lagen', 'lagen-felder', 'lagen-rueck', 'kiste-fehlt'], 2: ['abc', 'geschichte', 'doppelt', 'vergleich'], 3: ['kante', 'ausschnitt', 'stapel', 'komma', 'kante-komma'] };
    for (const ex of items) expect(forms[ex.stufe], ex.key).toContain(ex.key.split(':')[2]);
  });
});
