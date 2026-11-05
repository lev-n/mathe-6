import { describe, expect, it } from 'vitest';
import { describeSkill } from '../../core/testing';
import { checkWorkedSolution } from '../step-check';
import { dreieckSkill } from './dreieck';
import { allItems, cellItems, numberOf, parseDe, printsAnswer, thinCells } from './testing';

describeSkill(dreieckSkill);

const items = allItems(dreieckSkill);

describe('flaechen.dreieck: answers recomputed', () => {
  it('every worked solution adds up', () => {
    for (const ex of items) expect(checkWorkedSolution(ex), ex.key).toEqual([]);
  });

  it('half of base times height, whichever way it is drawn', () => {
    let seen = 0;
    for (const ex of items) {
      const m = /:(?:halb|halb-schwer|allgemein):(\d+)x(\d+)$/.exec(ex.key) ?? /:(?:schraeg|aussen):(\d+):(\d+):\d+$/.exec(ex.key);
      if (!m) continue;
      expect(numberOf(ex), ex.key).toBe(Number(m[1]) * Number(m[2]) / 2);
      seen++;
    }
    expect(seen).toBeGreaterThan(100);
  });

  it('a height outside lies beyond the base, and the slanted side fits the drawing', () => {
    let seen = 0;
    for (const ex of items) {
      const m = /:aussen:(\d+):(\d+):(\d+)$/.exec(ex.key);
      if (!m || ex.visual?.type !== 'figure' || !ex.visual.height) continue;
      const [, h, side] = m.slice(1).map(Number);
      const [a, b, c] = ex.visual.points;
      expect(ex.visual.height.outside, ex.key).toBe(true);
      expect(ex.visual.height.to.x, ex.key).toBeLessThan(a.x);
      const scale = (a.y - c.y) / h;
      expect(Math.hypot(b.x - c.x, b.y - c.y) / scale, ex.key).toBeCloseTo(side, 0);
      seen++;
    }
    expect(seen).toBeGreaterThan(10);
  });

  it('the Rechteck is twice the triangle', () => {
    for (const ex of items) {
      const m = /:rechteck-aus-dreieck:([\d,]+)$/.exec(ex.key);
      if (m) expect(numberOf(ex), ex.key).toBe(2 * parseDe(m[1]));
    }
  });

  it('height and base from the area', () => {
    for (const ex of items) {
      const m = /:(?:hoehe|grundseite):([\d,]+):(\d+)$/.exec(ex.key);
      if (m) expect(numberOf(ex) * Number(m[2]) / 2, ex.key).toBeCloseTo(parseDe(m[1]), 6);
    }
  });

  it('composite figures', () => {
    for (const ex of items) {
      const h = /:haus:(\d+):(\d+):(\d+)$/.exec(ex.key);
      if (h) {
        const [w, wall, roof] = h.slice(1).map(Number);
        expect(numberOf(ex), ex.key).toBe(w * wall + w * roof / 2);
      }
      const e = /:ecke:(\d+):(\d+):(\d+):(\d+)$/.exec(ex.key);
      if (e) {
        const [w, height, p, r] = e.slice(1).map(Number);
        expect(numberOf(ex), ex.key).toBe(w * height - p * r / 2);
      }
    }
  });
});

describe('flaechen.dreieck: what the task says', () => {
  it('the praise names an odd number only when one was halved', () => {
    let even = 0;
    for (const ex of cellItems(dreieckSkill, 1, 2)) {
      const m = /:halb-schwer:(\d+)x(\d+)$/.exec(ex.key)!;
      const odd = Number(m[1]) * Number(m[2]) % 2 === 1;
      expect(ex.praise.includes('ungerade'), ex.key).toBe(odd);
      if (!odd) even++;
    }
    expect(even).toBeGreaterThan(20);
  });

  it('no task prints its answer: a height is not the base', () => {
    for (const ex of [...items, ...cellItems(dreieckSkill, 3, 1)]) expect(printsAnswer(ex), `${ex.key}: ${ex.prompt}`).toBe(false);
  });
});

describe('flaechen.dreieck: the Stufen', () => {
  it('every cell has enough different items for its slots', () => {
    expect(thinCells(dreieckSkill)).toEqual([]);
  });

  it('each form belongs to its Stufe: AB only varies the demand', () => {
    const forms: Record<number, string[]> = { 1: ['halb', 'halb-schwer', 'rechteck-aus-dreieck'], 2: ['allgemein', 'schraeg', 'aussen'], 3: ['hoehe', 'haus', 'ecke', 'grundseite'] };
    for (const ex of items) expect(forms[ex.stufe], ex.key).toContain(ex.key.split(':')[2]);
  });

  it('on Stufe 1 the triangle is right-angled', () => {
    for (const ex of items.filter((x) => x.stufe === 1 && x.visual?.type === 'figure')) {
      if (ex.visual?.type === 'figure') expect(ex.visual.rightAngles, ex.key).toEqual([0]);
    }
  });
});
