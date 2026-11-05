import { describe, expect, it } from 'vitest';
import { createRng } from '../../core/rng';
import { describeSkill } from '../../core/testing';
import type { Ab, Cell, ChoiceAnswer, Exercise, Stufe, Visual } from '../../core/types';
import { srTextWithPicture } from '../../ui/visuals/describe';
import { kongruenzSkill as skill } from './kongruenz';

describeSkill(skill, { minDistinct: { 1: 80, 2: 80, 3: 60 } });

const items = (stufe: Stufe, ab: Ab, n = 150): Exercise[] => Array.from({ length: n }, (_, i) => skill.generate(createRng(i * 337 + 19), stufe, { subtractionMethod: 'abziehen', ab }));
const rightLabel = (ex: Exercise) => {
  const a = ex.answer as ChoiceAnswer;
  return a.options[a.correct].label;
};

/** All eight positions of a figure, computed here apart from the generator's helpers. */
function positions(cells: readonly Cell[]): Set<string> {
  const norm = (c: readonly Cell[]) => {
    const [mx, my] = [Math.min(...c.map((p) => p[0])), Math.min(...c.map((p) => p[1]))];
    return c.map(([x, y]) => `${x - mx}.${y - my}`).sort().join(' ');
  };
  const out = new Set<string>();
  let turn = [...cells];
  for (let i = 0; i < 4; i++) {
    out.add(norm(turn));
    out.add(norm(turn.map(([x, y]) => [-x, y] as Cell)));
    turn = turn.map(([x, y]) => [-y, x] as Cell);
  }
  return out;
}
const fits = (a: readonly Cell[], b: readonly Cell[]) => a.length === b.length && [...positions(a)].some((p) => positions(b).has(p));
/** The two figures of a pair grid: the free columns between them part the cells. */
function pairOf(v: Visual | undefined): [Cell[], Cell[]] {
  if (v?.type !== 'grid') throw new Error('grid expected');
  const columns = [...new Set(v.cells.map((c) => c[0]))].sort((a, b) => a - b);
  const gap = columns.find((c, i) => i > 0 && c - columns[i - 1] > 1)!;
  return [v.cells.filter((c) => c[0] < gap) as Cell[], v.cells.filter((c) => c[0] >= gap) as Cell[]];
}
const cellsOf = (v: Visual | undefined): Cell[] => {
  if (v?.type !== 'grid') throw new Error('grid expected');
  return v.cells as Cell[];
};

describe('Kongruente Figuren: independent checks', () => {
  it('Stufe 1: Ja exactly when the right figure fits the left, and only by a turn', () => {
    for (const ab of [1, 2] as Ab[]) {
      for (const ex of items(1, ab)) {
        const [left, right] = pairOf(ex.visual);
        expect(left.length).toBe(right.length);
        expect(rightLabel(ex)).toBe(fits(left, right) ? 'Ja' : 'Nein');
      }
    }
  });

  it('Stufe 1, AB III: the claims are checked at the picture', () => {
    for (const ex of items(1, 3)) {
      const [left, right] = pairOf(ex.visual);
      const positive = ex.prompt.includes('passt die rechte Figur');
      if (ex.prompt.includes('gedreht. Darum')) expect(fits(left, right)).toBe(true);
      if (ex.prompt.includes('Kästchen. Darum')) expect(fits(left, right)).toBe(false);
      expect(rightLabel(ex)).toBe(positive ? 'Ja' : 'Nein');
    }
  });

  it('Stufe 2: exactly one option fits the figure; AB III exactly one option differs from the rest', () => {
    for (const ab of [1, 2] as Ab[]) {
      for (const ex of items(2, ab)) {
        const a = ex.answer as ChoiceAnswer;
        const figure = cellsOf(ex.visual);
        const fitting = a.options.flatMap((o, i) => (fits(figure, cellsOf(o.visual)) ? [i] : []));
        expect(fitting, ex.key).toEqual([a.correct]);
      }
    }
    for (const ex of items(2, 3)) {
      const a = ex.answer as ChoiceAnswer;
      const figures = a.options.map((o) => cellsOf(o.visual));
      a.options.forEach((_, i) => {
        const others = figures.filter((_f, k) => k !== i);
        expect(others.every((f) => fits(f, others[0])), ex.key).toBe(i === a.correct);
      });
    }
  });

  it('Stufe 3: a flipped figure counts as kongruent', () => {
    let flippedYes = 0;
    for (const ex of items(3, 1)) {
      const [left, right] = pairOf(ex.visual);
      expect(rightLabel(ex)).toBe(fits(left, right) ? 'Ja' : 'Nein');
      if (fits(left, right)) flippedYes++;
    }
    expect(flippedYes).toBeGreaterThan(30);
  });

  it('Stufe 3, AB II: a part of DEF comes through the matching, which is never the plain order, so the task is no copy', () => {
    const counts = { seite: 0, gerechnet: 0, gelesen: 0 };
    for (const ex of items(3, 2, 300)) {
      const m = /A passt auf (\w), B auf (\w) und C auf (\w)/.exec(ex.context!)!;
      const partners = [m[1], m[2], m[3]];
      expect(partners.join(''), ex.key).not.toBe('DEF');
      const original = (corner: string) => 'ABC'[partners.indexOf(corner)];
      if (ex.visual?.type !== 'figure') throw new Error('figure expected');
      if (ex.prompt.includes('Seite')) {
        counts.seite++;
        const [p, q] = /Seite (\w)(\w)/.exec(ex.prompt)!.slice(1).map(original);
        const side = ['AB', 'BC', 'CA'].findIndex((name) => name.includes(p) && name.includes(q));
        expect(rightLabel(ex), ex.key).toBe(ex.visual.sides![side]);
        expect(`${ex.context} ${ex.prompt}`, ex.key).not.toMatch(/\d/);
        expect(new Set(ex.visual.sides).size, ex.key).toBe(3);
        for (const label of ex.visual.sides!) expect((ex.answer as ChoiceAnswer).options.map((o) => o.label), ex.key).toContain(label);
      } else {
        const known = [...ex.context!.matchAll(/Winkel bei (\w) misst (\d+)°/g)].map((g) => [g[1], Number(g[2])] as const);
        expect(known, ex.key).toHaveLength(2);
        const size = (corner: string) => known.find(([c]) => c === corner)?.[1] ?? 180 - known[0][1] - known[1][1];
        const asked = /Winkel bei (\w)\?/.exec(ex.prompt)![1];
        expect(rightLabel(ex), ex.key).toBe(`${size(original(asked))}°`);
        if (known.some(([c]) => c === original(asked))) counts.gelesen++;
        else counts.gerechnet++;
        for (const corner of 'ABC') expect((ex.answer as ChoiceAnswer).options.map((o) => o.label), ex.key).toContain(`${size(corner)}°`);
      }
    }
    expect(Math.min(counts.seite, counts.gerechnet, counts.gelesen)).toBeGreaterThan(20);
  });

  it('no spoken text says which figure fits: it holds the Kästchen, and the verdict comes from comparing them', () => {
    for (const stufe of [1, 2, 3] as Stufe[]) {
      for (const ab of [1, 2, 3] as Ab[]) {
        for (const ex of items(stufe, ab, 60)) {
          const pictures = [ex.visual, ...(ex.answer.kind === 'choice' ? ex.answer.options.map((o) => o.visual) : [])].filter((v): v is Visual => v?.type === 'grid');
          if (pictures.length === 0) continue;
          expect(ex.srText.replace(ex.prompt, ''), ex.key).not.toMatch(/dieselbe Form|andere Form|liegt anders|gedreht|umgeklappt/);
          expect(ex.srText, ex.key).toMatch(/Spalte \d Zeile \d/);
          expect(srTextWithPicture(ex), ex.key).not.toMatch(/dieselbe Form|andere Form|liegt anders/);
        }
      }
    }
  });

  it('the caption of a pair grid fits the narrowest grid', () => {
    for (const ab of [1, 2, 3] as Ab[]) {
      for (const ex of items(1, ab, 60)) {
        if (ex.visual?.type !== 'grid') throw new Error('grid expected');
        // 9.5 units per letter of the 18 unit font; the picture is width · 32 + 28 units wide.
        expect(ex.visual.caption!.length * 9.5, ex.key).toBeLessThanOrEqual(ex.visual.width * 32 + 28);
      }
    }
  });
  it('Stufe 3, AB III: rectangles fit exactly when their sides fit, and the missing side has to be computed', () => {
    let rectangles = 0;
    for (const ex of items(3, 3)) {
      if (!ex.key.includes(':flaeche:')) continue;
      rectangles++;
      const [w1, h1, w2] = [...ex.context!.matchAll(/(\d+)[\s ]cm/g)].map((m) => Number(m[1]));
      const h2 = (w1 * h1) / w2;
      expect(Number.isInteger(h2), ex.key).toBe(true);
      expect(rightLabel(ex)).toBe((w1 === w2 && h1 === h2) || (w1 === h2 && h1 === w2) ? 'Ja' : 'Nein');
    }
    expect(rectangles).toBeGreaterThan(30);
  });

  it('Stufe 3, AB III: of four figures, flipped and turned, exactly one differs, and a flip is needed to see that the others fit', () => {
    let found = 0;
    for (const ex of items(3, 3)) {
      if (ex.key.includes(':flaeche:')) continue;
      found++;
      const a = ex.answer as ChoiceAnswer;
      const figures = a.options.map((o) => cellsOf(o.visual));
      expect(figures, ex.key).toHaveLength(4);
      a.options.forEach((_, i) => {
        const others = figures.filter((_f, k) => k !== i);
        expect(others.every((f) => fits(f, others[0])), ex.key).toBe(i === a.correct);
      });
      const others = figures.filter((_f, k) => k !== a.correct);
      const turns = (c: readonly Cell[]) => { const out: string[] = []; let t = [...c]; for (let q = 0; q < 4; q++) { const [mx, my] = [Math.min(...t.map((p) => p[0])), Math.min(...t.map((p) => p[1]))]; out.push(t.map(([x, y]) => `${x - mx}.${y - my}`).sort().join(' ')); t = t.map(([x, y]) => [-y, x] as Cell); } return out; };
      const key = (c: readonly Cell[]) => { const [mx, my] = [Math.min(...c.map((p) => p[0])), Math.min(...c.map((p) => p[1]))]; return c.map(([x, y]) => `${x - mx}.${y - my}`).sort().join(' '); };
      expect(others.some((f) => !turns(others[0]).includes(key(f))), `${ex.key}: no figure is flipped`).toBe(true);
    }
    expect(found).toBeGreaterThan(30);
  });
});
