import { describe, expect, it } from 'vitest';
import { describeSkill } from '../../core/testing';
import type { Cell } from '../../core/types';
import { srTextWithPicture } from '../../ui/visuals/describe';
import { checkWorkedSolution } from '../step-check';
import { NOT_NETS, fold, oppositeFace, orientations } from './nets';
import { netzSkill } from './netz';
import { allItems, cellItems, correctLabel, numberOf, thinCells } from './testing';

describeSkill(netzSkill);

const items = allItems(netzSkill);
const cellsOf = (visual: unknown): Cell[] => (visual as { cells: Cell[] }).cells;

describe('flaechen.netz: answers recomputed by folding', () => {
  it('every worked solution adds up', () => {
    for (const ex of items) expect(checkWorkedSolution(ex), ex.key).toEqual([]);
  });

  it('yes or no: the answer is what folding says', () => {
    let seen = 0;
    for (const ex of items) {
      if (!ex.key.includes(':ist-netz:')) continue;
      expect(correctLabel(ex), ex.key).toBe(fold(cellsOf(ex.visual)) ? 'Ja' : 'Nein');
      seen++;
    }
    expect(seen).toBeGreaterThan(20);
  });

  it('among four pictures exactly one is the odd one', () => {
    for (const ex of items) {
      if (ex.answer.kind !== 'choice') continue;
      const look = ex.key.includes(':welches-netz:') ? true : ex.key.includes(':kein-netz:') ? false : null;
      if (look === null) continue;
      expect(ex.answer.options, ex.key).toHaveLength(4);
      const good = ex.answer.options.filter((o) => !!fold(cellsOf(o.visual)) === look);
      expect(good, ex.key).toHaveLength(1);
      expect(good[0], ex.key).toBe(ex.answer.options[ex.answer.correct]);
    }
  });

  it('NOT_NETS and NETS stay apart in every turned form shown', () => {
    for (const net of NOT_NETS) for (const turned of orientations(net)) expect(fold(turned)).toBeNull();
  });

  it('the opposite face and the number on a die', () => {
    let seen = 0;
    for (const ex of items) {
      if (ex.visual?.type !== 'net' || !('cells' in ex.visual)) continue;
      const { cells, faces } = ex.visual;
      if (!faces) continue;
      const folded = fold(cells)!;
      if (ex.key.includes(':gegenueber:')) {
        const letter = /gegenüber von ([A-F])/.exec(ex.prompt)![1];
        const target = faces.indexOf(letter);
        const partner = folded.indexOf(oppositeFace(folded[target]));
        expect(correctLabel(ex), ex.key).toBe(faces[partner]);
        seen++;
      }
      if (ex.key.includes(':spielwuerfel:')) {
        const asked = faces.indexOf('?');
        const partner = folded.indexOf(oppositeFace(folded[asked]));
        expect(numberOf(ex) + Number(faces[partner]), ex.key).toBe(7);
        // one face of each other pair shows its number, and the numbers are those of a die
        faces.forEach((label, i) => {
          if (label === '?' || i === partner) return;
          const other = faces[folded.indexOf(oppositeFace(folded[i]))];
          expect([label, other].filter((x) => x !== null), ex.key).toHaveLength(1);
        });
        // no answer by elimination: three numbers are absent from the net
        const absent = [1, 2, 3, 4, 5, 6].filter((n) => !faces.includes(String(n)));
        expect(absent, ex.key).toHaveLength(3);
        expect(absent, ex.key).toContain(numberOf(ex));
        seen++;
      }
    }
    expect(seen).toBeGreaterThan(50);
  });

  it('the size of a whole net needs the edges that meet by folding', () => {
    let seen = 0;
    for (const ex of items) {
      const m = /:netz-mass:(hoch|breit):(\d+)-(\d+)-(\d+)$/.exec(ex.key);
      if (!m) continue;
      const [a, b, c] = m.slice(2).map(Number);
      expect(numberOf(ex), ex.key).toBe(m[1] === 'hoch' ? 2 * b + c : 2 * a + 2 * b);
      expect(new Set([a, b, c]).size, `${ex.key}: three different edges`).toBe(3);
      seen++;
    }
    expect(seen).toBeGreaterThan(20);
  });

  it('net to Schrägbild: the printed numbers do not decide, only the edge worked out does', () => {
    const sorted = (x: number[]) => [...x].sort((p, q) => p - q).join();
    let seen = 0;
    for (const ex of items) {
      if (ex.answer.kind !== 'choice') continue;
      const m = /:zum-schraegbild:(\d+)-(\d+)-(\d+):/.exec(ex.key);
      if (!m) continue;
      const [a, b, c] = m.slice(1).map(Number);
      const right = ex.answer.options.filter((o) => o.visual?.type === 'quader' && sorted([o.visual.a, o.visual.b, o.visual.c]) === sorted([a, b, c]));
      expect(right, ex.key).toHaveLength(1);
      expect(right[0], ex.key).toBe(ex.answer.options[ex.answer.correct]);
      // the other drawings keep both printed edges, and the height in the text is what gives the third
      for (const o of ex.answer.options) if (o.visual?.type === 'quader') for (const edge of [a, c]) expect([o.visual.a, o.visual.b, o.visual.c], ex.key).toContain(edge);
      expect(ex.prompt, ex.key).toContain(`${2 * b + c} cm`);
      expect(ex.visual && 'rects' in ex.visual && ex.visual.rects.some((r) => r.heightLabel === '?'), ex.key).toBe(true);
      seen++;
    }
    expect(seen).toBeGreaterThan(20);
  });

  it('no choice shows two equal pictures: the labels A and B alone do not make them two options', () => {
    for (const ex of [...items, ...cellItems(netzSkill, 2, 2, 800)]) {
      if (ex.answer.kind !== 'choice') continue;
      const pictures = ex.answer.options.filter((o) => o.visual).map((o) => JSON.stringify(o.visual));
      expect(new Set(pictures).size, ex.key).toBe(pictures.length);
    }
  });

  it('net to Schrägbild: the way a drawing stands says nothing, the right one is no odd one out', () => {
    const cell = cellItems(netzSkill, 2, 2, 1200);
    let odd = 0;
    let oddRight = 0;
    for (const ex of cell) {
      if (ex.answer.kind !== 'choice') continue;
      const widths = ex.answer.options.map((o) => (o.visual?.type === 'quader' ? o.visual.a : 0));
      const alone = widths.findIndex((w) => widths.filter((x) => x === w).length === 1);
      if (alone < 0) continue;
      odd++;
      if (alone === ex.answer.correct) oddRight++;
    }
    expect(odd).toBeGreaterThan(300);
    // one of three by chance
    expect(oddRight / odd).toBeLessThan(0.45);
  });

  it('a face of the net to a face of the Schrägbild: all options print the same numbers', () => {
    const FACE = { bottom: 'top', back: 'front', right: 'side' } as const;
    let seen = 0;
    for (const ex of items) {
      if (ex.answer.kind !== 'choice') continue;
      const m = /:flaeche-im-netz:(bottom|back|right):/.exec(ex.key);
      if (!m) continue;
      const pictures = ex.answer.options.map((o) => (o.visual?.type === 'quader' ? o.visual : null));
      expect(new Set(pictures.map((v) => `${v?.a}-${v?.b}-${v?.c}`)).size, ex.key).toBe(1);
      expect(new Set(pictures.map((v) => v?.highlightFace)).size, ex.key).toBe(3);
      expect(pictures[ex.answer.correct]?.highlightFace, ex.key).toBe(FACE[m[1] as keyof typeof FACE]);
      seen++;
    }
    expect(seen).toBeGreaterThan(20);
  });

  it('no net with printed measures stands among the options: its labels would be too small to compare (src/ui/answers/ChoiceInput.tsx)', () => {
    for (const ex of items) {
      if (ex.answer.kind !== 'choice') continue;
      for (const o of ex.answer.options) {
        if (o.visual?.type === 'net' && 'rects' in o.visual) expect(o.visual.rects.every((r) => !r.widthLabel && !r.heightLabel && !r.label), ex.key).toBe(true);
      }
    }
  });
});

describe('flaechen.netz: the screen reader', () => {
  it('the nets of the wrong drawing can be told apart in words', () => {
    let seen = 0;
    for (const ex of items) {
      if (!ex.key.includes(':falsches-netz:') || ex.answer.kind !== 'choice') continue;
      const said = ex.answer.options.map((o) => o.label).map((label, i, labels) => {
        const from = ex.srText.indexOf(`Bild ${label}:`);
        const next = labels[i + 1] ? ex.srText.indexOf(`Bild ${labels[i + 1]}:`) : ex.srText.length;
        expect(from, ex.key).toBeGreaterThanOrEqual(0);
        return ex.srText.slice(ex.srText.indexOf(':', from), next);
      });
      expect(new Set(said).size, ex.key).toBe(3);
      seen++;
    }
    expect(seen).toBeGreaterThan(20);
  });

  it('a Quader net in the task says where its faces and its marks are', () => {
    let seen = 0;
    for (const ex of items) {
      if (ex.visual?.type !== 'net' || !('rects' in ex.visual)) continue;
      const said = srTextWithPicture(ex);
      expect(said, ex.key).toContain('Über der');
      expect(said, ex.key).toContain('Unter der');
      expect(said, `${ex.key}: the label without places is not added`).not.toContain('Fläche (');
      if (ex.visual.rects.some((r) => r.label === '?' || r.heightLabel === '?')) expect(said, ex.key).toContain('Fragezeichen');
      seen++;
    }
    expect(seen).toBeGreaterThan(20);
  });
});

describe('flaechen.netz: the Stufen', () => {
  it('each form belongs to its Stufe: AB only varies the demand', () => {
    const forms: Record<number, string[]> = { 1: ['ist-netz', 'welches-netz', 'kein-netz'], 2: ['netz-mass', 'zum-schraegbild', 'flaeche-im-netz'], 3: ['gegenueber', 'spielwuerfel', 'falsches-netz'] };
    for (const ex of items) expect(forms[ex.stufe], ex.key).toContain(ex.key.split(':')[2]);
  });

  it('every cell has enough different items for its slots in a round', () => {
    expect(thinCells(netzSkill)).toEqual([]);
  });
});
