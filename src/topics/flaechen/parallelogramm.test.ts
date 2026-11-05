import { describe, expect, it } from 'vitest';
import { describeSkill } from '../../core/testing';
import { srTextWithPicture } from '../../ui/visuals/describe';
import { checkWorkedSolution } from '../step-check';
import { parallelogrammSkill } from './parallelogramm';
import { allItems, cellItems, correctLabel, numberOf, parseDe, printsAnswer, thinCells } from './testing';

describeSkill(parallelogrammSkill);

const items = allItems(parallelogrammSkill);

describe('flaechen.parallelogramm: answers recomputed', () => {
  it('the Fehlerdetektiv has no option that swaps a number for itself', () => {
    for (const ex of items) {
      if (ex.answer.kind !== 'choice') continue;
      for (const { label } of ex.answer.options) {
        const swap = /^Statt (\d+) cm die Höhe (\d+) cm nehmen$/.exec(label);
        if (swap) expect(swap[1], ex.key).not.toBe(swap[2]);
      }
    }
  });

  it('every worked solution adds up', () => {
    for (const ex of items) expect(checkWorkedSolution(ex), ex.key).toEqual([]);
  });

  it('the area is base times height, the slanted side stays out', () => {
    let seen = 0;
    for (const ex of items) {
      const g = /:gh:(\d+)x(\d+)$/.exec(ex.key) ?? /:geschichte:[^:]+:(\d+)x(\d+)$/.exec(ex.key);
      if (g) expect(numberOf(ex), ex.key).toBe(Number(g[1]) * Number(g[2]));
      const s = /:schraeg(?:-komma)?:([\d,]+):(\d+):(\d+)$/.exec(ex.key);
      if (s) {
        expect(numberOf(ex), ex.key).toBeCloseTo(parseDe(s[1]) * Number(s[2]), 6);
        expect(Number(s[3]), `${ex.key}: a slanted side is longer than the height`).toBeGreaterThan(Number(s[2]));
        seen++;
      }
    }
    expect(seen).toBeGreaterThan(50);
  });

  it('the picture is true to the numbers: slanted side, height and offset form a right triangle', () => {
    for (const ex of items) {
      const s = /:schraeg(?:-komma)?:([\d,]+):(\d+):(\d+)$/.exec(ex.key);
      if (!s || ex.visual?.type !== 'figure') continue;
      const [a, , c, d] = ex.visual.points;
      const scale = (a.y - c.y) / Number(s[2]);
      expect(Math.hypot(d.x - a.x, d.y - a.y) / scale, ex.key).toBeCloseTo(Number(s[3]), 0);
    }
  });

  it('the height from the area, and the height to the other side', () => {
    for (const ex of items) {
      const h = /:hoehe(?:-komma)?:([\d,]+):(\d+)$/.exec(ex.key);
      if (h) expect(numberOf(ex) * Number(h[2]), ex.key).toBeCloseTo(parseDe(h[1]), 6);
      const p = /:paar(?:-komma)?:(\d+):(\d+):(\d+)$/.exec(ex.key);
      if (p) {
        const [g1, h1, g2] = p.slice(1).map(Number);
        expect(numberOf(ex) * g2, ex.key).toBeCloseTo(g1 * h1, 6);
        expect(h1, `${ex.key}: a height fits its side`).toBeLessThanOrEqual(g2);
        expect(numberOf(ex), `${ex.key}: a height fits its side`).toBeLessThanOrEqual(g1);
      }
    }
  });

  it('the Rechteck of the moved triangle: the numbers decide, and the printed g and h are no option', () => {
    let choices = 0;
    for (const ex of cellItems(parallelogrammSkill, 1, 3)) {
      const f = /:zum-rechteck:flaeche:(\d+)x(\d+):(\d+)$/.exec(ex.key);
      if (f) expect(numberOf(ex), ex.key).toBe(Number(f[1]) * Number(f[2]));
      const c = /:zum-rechteck:gleich:(\d+)x(\d+):(\d+)$/.exec(ex.key);
      if (c && ex.answer.kind === 'choice') {
        const [g, h] = c.slice(1).map(Number);
        const area = (label: string) => label.match(/\d+/g)!.map(Number).reduce((p, n) => p * n, 1);
        expect(ex.answer.options.filter((o) => area(o.label) === g * h), ex.key).toEqual([ex.answer.options[ex.answer.correct]]);
        for (const o of ex.answer.options) expect([g, h].sort().join(), `${ex.key}: ${o.label}`).not.toBe(o.label.match(/\d+/g)!.map(Number).sort().join());
        choices++;
      }
      expect(ex.praise, `${ex.key}: the child reasoned, and moved nothing`).not.toMatch(/umgelegt/);
    }
    expect(choices).toBeGreaterThan(50);
  });

  it('the Rechteck of the moved triangle is no fixed item: many results, as thinCells only counts keys', () => {
    const results = new Set(cellItems(parallelogrammSkill, 1, 3).map((ex) => (ex.answer.kind === 'choice' ? correctLabel(ex) : numberOf(ex))));
    expect(results.size).toBeGreaterThanOrEqual(30);
  });

  it('the choices name the slanted side', () => {
    for (const ex of items) {
      const d = /:detektiv:(\d+):(\d+):(\d+)$/.exec(ex.key);
      if (d) expect(correctLabel(ex), ex.key).toBe(`Statt ${d[3]} cm die Höhe ${d[2]} cm nehmen`);
    }
  });
});

describe('flaechen.parallelogramm: what the task says', () => {
  it('no task prints its answer: a height is not the side it belongs to', () => {
    for (const ex of [...items, ...cellItems(parallelogrammSkill, 3, 1), ...cellItems(parallelogrammSkill, 3, 2)]) expect(printsAnswer(ex), `${ex.key}: ${ex.prompt}`).toBe(false);
  });
});

describe('flaechen.parallelogramm: hints and variety', () => {
  it('the second hint of a story splits the base, and never names a product outside the task', () => {
    let seen = 0;
    for (const ex of items) {
      const m = /:geschichte:[^:]+:(\d+)x(\d+)$/.exec(ex.key);
      if (!m) continue;
      const [g, h] = m.slice(1).map(Number);
      expect(g % 10, `${ex.key}: a base with a round number leaves nothing to split`).not.toBe(0);
      expect(h, `${ex.key}: · 10 would be the whole calculation`).not.toBe(10);
      expect(ex.hints.join(' '), ex.key).not.toMatch(/\d+ · \d+/);
      expect(ex.hints.join(' '), ex.key).toContain(`Zerlege ${g} in ${g - g % 10} und ${g % 10}.`);
      seen++;
    }
    expect(seen).toBeGreaterThan(20);
  });

  it('every cell has enough different items for its slots, and a height to the other side stands in either order', () => {
    expect(thinCells(parallelogrammSkill)).toEqual([]);
    const pairs = cellItems(parallelogrammSkill, 3, 2).map((ex) => /:paar:(\d+):\d+:(\d+)$/.exec(ex.key)!.slice(1).map(Number));
    expect(pairs.some(([g1, g2]) => g1 < g2) && pairs.some(([g1, g2]) => g1 > g2)).toBe(true);
  });

  it('a height beyond the base is drawn and said to stand outside', () => {
    let seen = 0;
    for (const ex of cellItems(parallelogrammSkill, 3, 2)) {
      if (ex.visual?.type !== 'figure' || !ex.visual.height?.outside) continue;
      expect(ex.visual.height.to.x, ex.key).toBeGreaterThan(ex.visual.points[1].x);
      expect(srTextWithPicture(ex), ex.key).toContain('außerhalb der Figur');
      seen++;
    }
    expect(seen).toBeGreaterThan(5);
  });
});

describe('flaechen.parallelogramm: the Stufen', () => {
  it('Stufe 1 has no slanted side and no comma; Stufe 2 always shows it; Stufe 3 goes from the area back', () => {
    for (const ex of items) {
      const form = ex.key.split(':')[2];
      if (ex.stufe === 1) expect(['gh', 'geschichte', 'zum-rechteck'], ex.key).toContain(form);
      if (ex.stufe === 2) expect(['schraeg', 'schraeg-komma', 'detektiv'], ex.key).toContain(form);
      if (ex.stufe === 3) expect(['hoehe', 'paar', 'paar-komma', 'hoehe-komma'], ex.key).toContain(form);
    }
  });
});
