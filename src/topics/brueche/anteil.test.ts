import { describe, expect, it } from 'vitest';
import { describeSkill } from '../../core/testing';
import { anteilSkill } from './anteil';
import { expectSoundItems, formOf, fractionsIn, items, valueOf, wholeNumbersIn } from './test-helpers';

describeSkill(anteilSkill);

describe('brueche.anteil specifics', () => {
  it('worked steps calculate, and a task has one key', () => expectSoundItems(anteilSkill));

  it('Stufe 1: the answer recomputes from the picture, with the catalogue Nenner', () => {
    for (const ex of items(anteilSkill, 1, 1)) {
      if (ex.visual?.type !== 'fractionModel') throw new Error('picture');
      expect([2, 3, 4, 5, 6, 8, 10]).toContain(ex.visual.parts);
      expect(valueOf(ex.answer)).toEqual([ex.visual.filled, ex.visual.parts]);
    }
    for (const ex of items(anteilSkill, 1, 2).filter((e) => formOf(e) === 'rest')) {
      if (ex.visual?.type !== 'fractionModel') throw new Error('picture');
      expect(valueOf(ex.answer)).toEqual([ex.visual.parts - ex.visual.filled, ex.visual.parts]);
    }
  });

  it('Stufe 1, a claim: the right option follows from the picture', () => {
    for (const ex of items(anteilSkill, 1, 3)) {
      if (ex.answer.kind !== 'choice' || ex.visual?.type !== 'fractionModel') throw new Error('choice with a picture');
      const label = ex.answer.options[ex.answer.correct].label;
      if (ex.visual.unequal) expect(label).toMatch(/verschieden groß/);
      else if (formOf(ex) === 'aussage' && ex.key.includes('nenner')) expect(label).toMatch(/Nenner/);
      else expect(label).toMatch(/^Ja/);
    }
  });

  it('Stufe 2: the parts really are unsorted, and Nenner stay at 12 or below', () => {
    for (const ex of items(anteilSkill, 2, 1)) {
      if (ex.visual?.type !== 'grid') throw new Error('grid');
      const { width, height, cells } = ex.visual;
      expect(width * height).toBeLessThanOrEqual(12);
      expect(valueOf(ex.answer)).toEqual([cells.length, width * height]);
      const reading = cells.map(([x, y]) => y * width + x).sort((a, b) => a - b);
      expect(reading.every((c, i) => c === i), JSON.stringify(cells)).toBe(false);
    }
  });

  it('Stufe 2: several Ganze give an unechter Bruch with the Nenner of 1 Ganzes', () => {
    for (const ex of items(anteilSkill, 2, 2)) {
      if (ex.visual?.type !== 'fractionModel') throw new Error('picture');
      expect(ex.visual.wholes).toBeGreaterThan(1);
      expect(valueOf(ex.answer)).toEqual([ex.visual.filled, ex.visual.parts]);
      expect(ex.visual.filled).toBeGreaterThan(ex.visual.parts);
    }
  });

  it('Stufe 3: the Ganzes recomputes from the drawn part', () => {
    for (const ab of [1, 2] as const) {
      for (const ex of items(anteilSkill, 3, ab).filter((e) => formOf(e).startsWith('ganzes'))) {
        if (ex.visual?.type !== 'grid' || ex.answer.kind !== 'number') throw new Error('grid, number');
        const m = /\{frac:(\d+)\/(\d+)\}/.exec(ex.prompt)!;
        expect(ex.visual.cells.length * Number(m[2])).toBe((ex.answer.value as number) * Number(m[1]));
      }
    }
  });

  it('Stufe 3: a drawn part has no empty cell, so the grid holds exactly the part', () => {
    let grids = 0;
    for (const ab of [1, 2, 3] as const) {
      for (const ex of items(anteilSkill, 3, ab, 400)) {
        if (ex.visual?.type !== 'grid') continue;
        grids++;
        expect(ex.visual.width * ex.visual.height, ex.key).toBe(ex.visual.cells.length);
        expect(ex.visual.width).toBeLessThanOrEqual(6);
        expect(ex.visual.cells.length, ex.key).not.toBe((ex.answer as { value: number }).value);
      }
    }
    expect(grids).toBeGreaterThan(200);
  });

  it('Stufe 3: the answer does not stand in the prompt or in a hint, even as a small number', () => {
    for (const ab of [2, 3] as const) {
      for (const ex of items(anteilSkill, 3, ab, 400).filter((e) => ['ganzes', 'anderer'].includes(formOf(e)))) {
        const value = (ex.answer as { value: number }).value;
        expect(fractionsIn(ex.prompt).flat(), ex.key).not.toContain(value);
        for (const h of ex.hints) {
          expect([...fractionsIn(h).flat(), ...wholeNumbersIn(h)], `${ex.key}: ${h}`).not.toContain(value);
        }
      }
    }
  });

  it('Stufe 3: a division reads as its Bruch, and neither its text nor a hint gives that Bruch away', () => {
    const shared = [...items(anteilSkill, 3, 1, 400), ...items(anteilSkill, 3, 2, 400)].filter((e) => formOf(e) === 'teilen');
    expect(shared.length).toBeGreaterThan(100);
    for (const ex of shared) {
      const m = /^(\d+) Personen .* teilen sich (\d+) /.exec(ex.context!)!;
      const [d, n] = [Number(m[1]), Number(m[2])];
      expect(valueOf(ex.answer), ex.key).toEqual([n, d]);
      // The Nenner comes first, so the numbers in reading order are not the Bruch.
      expect(wholeNumbersIn(ex.context!)[0]).toBe(d);
      for (const h of ex.hints) expect(wholeNumbersIn(h), `${ex.key}: ${h}`).toEqual([]);
    }
  });

  it('several full Ganze are named in the plural', () => {
    for (const ex of items(anteilSkill, 2, 2, 400)) {
      if (ex.visual?.type !== 'fractionModel') throw new Error('picture');
      const hint = ex.bugs!.find((b) => b.id === 'nur-letztes-ganzes');
      if (!hint) continue;
      if (ex.visual.filled >= 2 * ex.visual.parts) expect(hint.hint, ex.key).toMatch(/in den vollen/);
      else expect(hint.hint, ex.key).toMatch(/im vollen/);
    }
  });

  it('Stufe 1 and Stufe 3 share no form', () => {
    const forms = (s: 1 | 3) => new Set([1, 2, 3].flatMap((ab) => items(anteilSkill, s, ab as 1 | 2 | 3, 80).map(formOf)));
    const high = forms(3);
    for (const f of forms(1)) expect(high.has(f), f).toBe(false);
  });
});
