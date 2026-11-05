import { describe, expect, it } from 'vitest';
import { describeSkill } from '../../core/testing';
import { checkWorkedSolution } from '../step-check';
import { rechteckSkill } from './rechteck';
import { lLabelsFit } from './common';
import { allItems, cellItems, correctLabel, fieldOf, numberOf, parseDe, thinCells } from './testing';

describeSkill(rechteckSkill);

const items = allItems(rechteckSkill);
const sides = (s: string) => s.split('x').map(parseDe);

describe('flaechen.rechteck: answers recomputed', () => {
  it('every worked solution adds up', () => {
    for (const ex of items) expect(checkWorkedSolution(ex), ex.key).toEqual([]);
  });

  it('Fläche, Umfang and both together', () => {
    for (const ex of items) {
      const m = /:(flaeche|umfang|beides):([\d,]+x[\d,]+)$/.exec(ex.key);
      if (!m) continue;
      const [a, b] = sides(m[2]);
      if (m[1] === 'flaeche') expect(numberOf(ex), ex.key).toBeCloseTo(a * b, 6);
      if (m[1] === 'umfang') expect(numberOf(ex), ex.key).toBeCloseTo(2 * a + 2 * b, 6);
      if (m[1] === 'beides') {
        expect(fieldOf(ex, 'flaeche'), ex.key).toBe(a * b);
        expect(fieldOf(ex, 'umfang'), ex.key).toBe(2 * a + 2 * b);
      }
    }
  });

  it('a side from the Umfang or from the area', () => {
    for (const ex of items) {
      const u = /:seite-aus-umfang:(\d+):(\d+)$/.exec(ex.key);
      if (u) expect(numberOf(ex), ex.key).toBe(Number(u[1]) / 2 - Number(u[2]));
      const f = /:seite-aus-flaeche:([\d,\s]+):([\d,]+)$/.exec(ex.key);
      if (f) expect(numberOf(ex), ex.key).toBeCloseTo(parseDe(f[1]) / parseDe(f[2]), 6);
    }
  });

  it('an L-form: both decompositions agree, and the Umfang is that of its box', () => {
    for (const ex of items) {
      const m = /:l-form(?:-versteckt:(flaeche|umfang))?:(\d+)x(\d+)-(\d+)x(\d+)$/.exec(ex.key);
      if (!m) continue;
      const [w, h, cw, ch] = m.slice(2).map(Number);
      expect(cw, ex.key).toBeLessThanOrEqual(w / 2);
      expect(ch, ex.key).toBeLessThanOrEqual(h / 2);
      expect(lLabelsFit({ w, h, cutW: cw, cutH: ch }), ex.key).toBe(true);
      const area = (w - cw) * h + cw * (h - ch);
      expect(area, ex.key).toBe(w * h - cw * ch);
      expect(numberOf(ex), ex.key).toBe(m[1] === 'umfang' ? 2 * w + 2 * h : area);
    }
  });

  it('equal areas: the Umfang of B, and the rectangle with the smallest or largest Umfang', () => {
    for (const ex of items) {
      const u = /:gleiche-flaeche:umfang:(\d+)x(\d+):(\d+)x(\d+)$/.exec(ex.key);
      if (u) {
        const [a, b, c, d] = u.slice(1).map(Number);
        expect(a * b, ex.key).toBe(c * d);
        expect(numberOf(ex), ex.key).toBe(2 * c + 2 * d);
      }
      const w = /:gleiche-flaeche:wahl:(klein|gross):(\d+):/.exec(ex.key);
      if (w && ex.answer.kind === 'choice') {
        const rims = ex.answer.options.map((o) => {
          const [a, b] = o.label.match(/\d+/g)!.map(Number);
          expect(a * b, ex.key).toBe(Number(w[2]));
          return 2 * a + 2 * b;
        });
        const [a, b] = correctLabel(ex).match(/\d+/g)!.map(Number);
        expect(2 * a + 2 * b, ex.key).toBe(w[1] === 'klein' ? Math.min(...rims) : Math.max(...rims));
      }
    }
  });
});

describe('flaechen.rechteck: the Stufen', () => {
  it('Stufe 1 stays with whole cm and sides up to 20', () => {
    for (const ex of items.filter((x) => x.stufe === 1)) {
      expect(ex.key, ex.key).not.toMatch(/,\d/);
      const m = /:(?:flaeche|umfang|beides):(\d+)x(\d+)$/.exec(ex.key);
      if (m) expect(Math.max(Number(m[1]), Number(m[2])), ex.key).toBeLessThanOrEqual(20);
    }
  });

  it('every form of a Stufe belongs to it: AB only varies the demand', () => {
    const forms = (stufe: number) => new Set(items.filter((x) => x.stufe === stufe).map((x) => x.key.split(':')[2]));
    expect(forms(1)).toEqual(new Set(['flaeche', 'umfang', 'beides', 'seite-aus-umfang']));
    expect(forms(2)).toEqual(new Set(['flaeche', 'umfang', 'seite-aus-flaeche', 'geschichte']));
    expect(forms(3)).toEqual(new Set(['l-form', 'l-form-versteckt', 'gleiche-flaeche']));
  });

  it('Stufe 2 AB II always has a comma, in the known side or in the answer', () => {
    for (const ex of cellItems(rechteckSkill, 2, 2)) {
      const known = /:([\d,]+)$/.exec(ex.key)![1];
      expect(known.includes(',') || !Number.isInteger(numberOf(ex)), ex.key).toBe(true);
    }
  });

  it('every cell has enough different items for its slots', () => {
    expect(thinCells(rechteckSkill)).toEqual([]);
  });

  it('a story spells its place with a capital and gives it a size that fits', () => {
    const size: Record<string, [number, number]> = { 'das Beet': [5, 40], 'das Spielfeld': [120, 400], 'der Pausenhof': [600, 2200] };
    let seen = 0;
    for (const ex of cellItems(rechteckSkill, 2, 3)) {
      const place = /braucht ((?:das|der) \p{L}+) ringsum/u.exec(ex.prompt)![1];
      expect(place.split(' ')[1], ex.key).toMatch(/^\p{Lu}/u);
      const area = parseDe(/die Fläche ([\d,\s]+) m²/.exec(ex.context!)![1]);
      expect(area >= size[place][0] && area <= size[place][1], `${ex.key}: ${area} m² for ${place}`).toBe(true);
      seen++;
    }
    expect(seen).toBeGreaterThan(100);
  });

  it('Stufe 2 sides of the direct form have a comma', () => {
    for (const ex of items.filter((x) => x.stufe === 2 && /:(flaeche|umfang):/.test(x.key))) expect(ex.key, ex.key).toMatch(/,\d/);
  });
});
