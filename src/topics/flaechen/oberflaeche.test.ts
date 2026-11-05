import { describe, expect, it } from 'vitest';
import { describeSkill } from '../../core/testing';
import { srTextWithPicture } from '../../ui/visuals/describe';
import { checkWorkedSolution } from '../step-check';
import { oberflaecheSkill } from './oberflaeche';
import { allItems, cellItems, numberOf, printsAnswer, thinCells } from './testing';

describeSkill(oberflaecheSkill);

const items = allItems(oberflaecheSkill);
const O = (a: number, b: number, c: number) => 2 * a * b + 2 * a * c + 2 * b * c;

describe('flaechen.oberflaeche: answers recomputed', () => {
  it('every worked solution adds up', () => {
    for (const ex of items) expect(checkWorkedSolution(ex), ex.key).toEqual([]);
  });

  it('Würfel: six squares, the edge never above 10 cm', () => {
    let seen = 0;
    for (const ex of items) {
      const m = /:(wuerfel|wuerfelnetz|wuerfelflaeche|wuerfelkanten|kante-aus-oberflaeche):(\d+)$/.exec(ex.key);
      if (m) {
        const a = Number(m[2]);
        expect(a, ex.key).toBeLessThanOrEqual(10);
        expect(numberOf(ex), ex.key).toBe(m[1] === 'kante-aus-oberflaeche' ? a : 6 * a * a);
        seen++;
      }
      const n = /:(wuerfel-papier|wuerfel-teil|kante-aus-wuerfeln):(\d+):(\d+)$/.exec(ex.key);
      if (n) {
        const [count, a] = n.slice(2).map(Number);
        expect(a, ex.key).toBeLessThanOrEqual(10);
        expect(numberOf(ex), ex.key).toBe(n[1] === 'wuerfel-papier' ? count * 6 * a * a : n[1] === 'wuerfel-teil' ? count * a * a : a);
        seen++;
      }
    }
    expect(seen).toBeGreaterThan(100);
  });

  it('Quader: three pairs, edges up to 15 cm', () => {
    for (const ex of items) {
      const m = /:(quadernetz|quader):(\d+)-(\d+)-(\d+)$/.exec(ex.key);
      if (!m) continue;
      const [a, b, c] = m.slice(2).map(Number);
      expect(Math.max(a, b, c), ex.key).toBeLessThanOrEqual(15);
      expect(numberOf(ex), ex.key).toBe(O(a, b, c));
    }
  });

  it('one face from the Oberfläche', () => {
    for (const ex of items) {
      const m = /:flaeche-aus-oberflaeche:(\d+)-(\d+)-(\d+)$/.exec(ex.key);
      if (m) expect(numberOf(ex), ex.key).toBe(Number(m[2]) * Number(m[3]));
    }
  });

  it('a box without a lid has five faces', () => {
    for (const ex of items) {
      const m = /:ohne-deckel:[^:]+:(\d+)-(\d+)-(\d+)$/.exec(ex.key);
      if (!m) continue;
      const [a, b, c] = m.slice(1).map(Number);
      expect(numberOf(ex), ex.key).toBe(a * b + 2 * a * c + 2 * b * c);
    }
  });

  it('composite solids: what touches is inside, a sawn corner changes nothing', () => {
    let seen = 0;
    for (const ex of items) {
      const w = /:wuerfel-kleben:(\d+):(\d+)$/.exec(ex.key);
      if (w) expect(numberOf(ex), ex.key).toBe(O(Number(w[2]), Number(w[2]), Number(w[1]) * Number(w[2])));
      const k = /:quader-kleben:(\d+)-(\d+)-(\d+)$/.exec(ex.key);
      if (k) {
        const [a, b, c] = k.slice(1).map(Number);
        expect(numberOf(ex), ex.key).toBe(O(a, b, 2 * c));
      }
      const e = /:ecke-gesaegt:(\d+)-(\d+)-(\d+):(\d+)$/.exec(ex.key);
      if (e) {
        const [a, b, c, d] = e.slice(1).map(Number);
        expect(d, ex.key).toBeLessThan(Math.min(a, b, c));
        expect(numberOf(ex), ex.key).toBe(O(a, b, c));
      }
      const s = /:gestapelt:(\d+)-(\d+)-(\d+):(\d+)-(\d+)-(\d+)$/.exec(ex.key);
      if (s) {
        const [a, b, c, d, f, g] = s.slice(1).map(Number);
        expect(d, `${ex.key}: the small base fits on the large top`).toBeLessThan(a);
        expect(f, `${ex.key}: the small base fits on the large top`).toBeLessThan(b);
        expect(numberOf(ex), ex.key).toBe(O(a, b, c) + O(d, f, g) - 2 * d * f);
        seen++;
      }
    }
    expect(seen).toBeGreaterThan(5);
  });
});

describe('flaechen.oberflaeche: the Stufen', () => {
  it('each form belongs to its Stufe: AB only varies the demand', () => {
    const forms: Record<number, string[]> = { 1: ['wuerfel', 'wuerfel-papier', 'wuerfel-teil', 'wuerfelnetz', 'wuerfelflaeche', 'wuerfelkanten', 'kante-aus-oberflaeche', 'kante-aus-wuerfeln'], 2: ['quadernetz', 'quader', 'flaeche-aus-oberflaeche'], 3: ['ohne-deckel', 'wuerfel-kleben', 'quader-kleben', 'ecke-gesaegt', 'gestapelt'] };
    for (const ex of items) expect(forms[ex.stufe], ex.key).toContain(ex.key.split(':')[2]);
  });

  it('every cell has enough different items for its slots, and Stufe 1 AB I has different results, not only different words', () => {
    expect(thinCells(oberflaecheSkill)).toEqual([]);
    const results = new Set(cellItems(oberflaecheSkill, 1, 1).map(numberOf));
    expect(results.size, 'distinct results of Stufe 1 AB I').toBeGreaterThanOrEqual(25);
  });
});

describe('flaechen.oberflaeche: glued solids', () => {
  const glued = cellItems(oberflaecheSkill, 3, 2);

  it('Stufe 3 AB II has enough real tasks for its 5 slots: different results, not only different names', () => {
    expect(new Set(glued.map(numberOf)).size).toBeGreaterThanOrEqual(30);
  });

  it('the picture never gives the whole solid: the routine of Stufe 2 on its labels misses the answer', () => {
    for (const ex of glued) {
      if (ex.visual?.type === 'quader') expect(O(ex.visual.a, ex.visual.b, ex.visual.c), ex.key).not.toBe(numberOf(ex));
      else expect(ex.visual?.type, ex.key).toBe('cubeBuilding');
    }
  });

  it('a bug hint never counts faces that the solid does not have', () => {
    for (const stufe3 of items.filter((ex) => ex.stufe === 3)) {
      for (const b of stufe3.bugs ?? []) expect(b.hint, `${stufe3.key}: ${b.id}`).not.toMatch(/sechs Flächen/);
    }
  });
});

describe('flaechen.oberflaeche: what the task says', () => {
  it('no task prints its answer: the edge is not the number of Würfel, a face is not a printed pair, the 12 edges are not the Oberfläche', () => {
    for (const ex of [...items, ...[1, 2, 3].flatMap((ab) => cellItems(oberflaecheSkill, 1, ab as 1 | 2 | 3)), ...cellItems(oberflaecheSkill, 2, 3)]) expect(printsAnswer(ex), `${ex.key}: ${ex.prompt}`).toBe(false);
  });

  it('a Würfel in the picture says its edge, also when the same digit stands in the text', () => {
    let seen = 0;
    for (const ex of cellItems(oberflaecheSkill, 1, 1, 800)) {
      const m = /:(?:wuerfel-papier|wuerfel-teil):(\d+):(\d+)$/.exec(ex.key);
      if (!m) continue;
      expect(srTextWithPicture(ex), ex.key).toContain(`Jede Kante des Würfels ist ${m[2]} Zentimeter lang`);
      if (m[1] === m[2]) seen++;
    }
    expect(seen).toBeGreaterThan(5);
  });

  it('a Quader in the picture says all three edges', () => {
    for (const ex of cellItems(oberflaecheSkill, 2, 2)) {
      const m = /:quader:(\d+)-(\d+)-(\d+)$/.exec(ex.key)!;
      expect(srTextWithPicture(ex), ex.key).toContain(`${m[1]} Zentimeter breit, ${m[2]} Zentimeter tief und ${m[3]} Zentimeter hoch`);
    }
  });
});

describe('flaechen.oberflaeche: the answer field', () => {
  it("says 'Oberfläche:' only when the task asks for an Oberfläche", () => {
    let seen = 0;
    for (const ex of items) {
      if (ex.answer.kind !== 'number' || ex.answer.before !== 'Oberfläche:') continue;
      expect(/Oberfläche\?|Oberfläche des/.test(ex.prompt), ex.key).toBe(true);
      seen++;
    }
    expect(seen).toBeGreaterThan(50);
    for (const ex of items) {
      if (ex.key.includes(':flaeche-aus-oberflaeche:') && ex.answer.kind === 'number') expect(ex.answer.before, ex.key).toBe('Fläche links:');
      if (ex.key.includes(':ohne-deckel:') && ex.answer.kind === 'number') expect(ex.answer.before, ex.key).toMatch(/^(Pappe|Holz|Glas):$/);
    }
  });
});
