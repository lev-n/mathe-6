import { describe, expect, it } from 'vitest';
import { describeSkill } from '../../core/testing';
import { labelEvery } from '../../ui/visuals/ContainerVisual';
import { srTextWithPicture } from '../../ui/visuals/describe';
import { checkWorkedSolution } from '../step-check';
import { allItems, cellItems, correctLabel, fieldOf, numberOf, parseDe, printsAnswer, thinCells } from './testing';
import { volumeneinheitenSkill } from './volumeneinheiten';

describeSkill(volumeneinheitenSkill);

const items = allItems(volumeneinheitenSkill);
/** cm³ in each unit. */
const CM3: Record<string, number> = { 'mm³': 0.001, 'cm³': 1, ml: 1, 'dm³': 1000, l: 1000, 'm³': 1_000_000 };
const quantity = (text: string) => {
  const m = /^([\d,\s ]+?)\s(mm³|cm³|dm³|m³|ml|l)$/.exec(text.trim())!;
  return parseDe(m[1]) * CM3[m[2]];
};

describe('flaechen.volumeneinheiten: answers recomputed', () => {
  it('every worked solution adds up', () => {
    for (const ex of items) expect(checkWorkedSolution(ex), ex.key).toEqual([]);
  });

  it('a conversion: both sides are the same volume', () => {
    let seen = 0;
    for (const ex of items) {
      const m = /^(.+) = □ (cm³|dm³|m³|ml|l)$/.exec(ex.expression ?? '');
      if (!m || ex.answer.kind !== 'number') continue;
      const left = m[1].replace(' + ', ' ').split(/(?<=cm³|dm³|m³|ml|l) /).reduce((sum, part) => sum + quantity(part), 0);
      expect(numberOf(ex) * CM3[m[2]], ex.key).toBeCloseTo(left, 6);
      seen++;
    }
    expect(seen).toBeGreaterThan(100);
  });

  it('the litres of an Aquarium, never an edge that the task and its picture print', () => {
    let seen = 0;
    for (const ex of cellItems(volumeneinheitenSkill, 3, 3)) {
      const m = /:aquarium:(\d+)-(\d+)-(\d+)$/.exec(ex.key);
      if (!m) continue;
      expect(numberOf(ex) * 1000, ex.key).toBeCloseTo(Number(m[1]) * Number(m[2]) * Number(m[3]), 6);
      expect(printsAnswer(ex), ex.key).toBe(false);
      seen++;
    }
    expect(seen).toBeGreaterThan(50);
  });

  it('two units at once', () => {
    for (const ex of items) {
      const m = /:zerlegen:(\d+)$/.exec(ex.key);
      if (m) expect(fieldOf(ex, 'gross') * 1000 + fieldOf(ex, 'klein'), ex.key).toBe(Number(m[1]));
    }
  });

  it('the picture: the answer is what the jug shows', () => {
    for (const ex of items) {
      if (ex.visual?.type !== 'container') continue;
      expect(numberOf(ex), ex.key).toBe(ex.visual.fillMl);
      expect(ex.srText, `${ex.key}: the description of the jug is added to srText only when the text does not name it`).not.toMatch(/Messbecher/);
      // the fill lies between two numbers: the picture does not print it, and its description does not say it
      const every = labelEvery(ex.visual.capacityMl, ex.visual.stepMl);
      expect(every, ex.key).toBeGreaterThan(1);
      expect((ex.visual.fillMl / ex.visual.stepMl) % every, ex.key).not.toBe(0);
      expect(srTextWithPicture(ex), ex.key).not.toMatch(new RegExp(`(?<!\\d)${numberOf(ex)}(?!\\d)`));
    }
  });

  it('Stufe 1 AB I never prints its answer: the sum of two numbers, or two numbers to compare', () => {
    let seen = 0;
    const signs = new Set<string>();
    for (const ex of cellItems(volumeneinheitenSkill, 1, 1)) {
      if (ex.answer.kind === 'number') {
        expect(ex.expression, ex.key).not.toMatch(new RegExp(`(?<!\\d)${numberOf(ex)}(?!\\d)`));
        for (const hint of [...ex.hints, ...(ex.bugs ?? []).map((b) => b.hint)]) expect(hint, ex.key).not.toMatch(/Zahl bleibt|nur der Name/);
      } else {
        // the numbers decide: the fact in the second hint leads to the sign and does not state it
        const [, left, right] = /^(\d+) \S+ □ (\d+) \S+$/.exec(ex.expression ?? '')!;
        const sign = Number(left) < Number(right) ? '<' : Number(left) > Number(right) ? '>' : '=';
        expect(correctLabel(ex), ex.key).toBe(sign);
        signs.add(sign);
        for (const hint of ex.hints) expect(hint, ex.key).not.toContain(sign);
      }
      seen++;
    }
    expect(seen).toBeGreaterThan(100);
    expect(signs.size).toBe(3);
  });

  it('an order runs from the smallest volume, and no two are equal', () => {
    let seen = 0;
    for (const ex of items) {
      if (ex.answer.kind !== 'order') continue;
      const values = ex.answer.correct.map((i) => quantity((ex.answer as { items: string[] }).items[i]));
      expect(new Set(values).size, ex.key).toBe(values.length);
      expect([...values].sort((a, b) => a - b), ex.key).toEqual(values);
      seen++;
    }
    expect(seen).toBeGreaterThan(50);
  });

  it('a plausible volume: the right size is within a sensible range for the thing', () => {
    const range: Record<string, [number, number]> = {
      Trinkflasche: [300, 1500], Kochtopf: [1000, 10_000], Badewanne: [80_000, 300_000], Klassenzimmer: [100_000_000, 400_000_000],
      Spielwürfel: [1, 30], Eimer: [5000, 15_000], Schulranzen: [10_000, 40_000], Aquarium: [20_000, 200_000],
      Tasse: [100, 400], Regentonne: [100_000, 400_000], Kühlschrank: [150_000, 500_000], Schwimmbecken: [200_000_000, 1_500_000_000],
    };
    let seen = 0;
    for (const ex of items) {
      if (!ex.key.includes(':passt:')) continue;
      const thing = Object.keys(range).find((t) => ex.prompt.includes(t))!;
      const v = quantity(correctLabel(ex));
      expect(v >= range[thing][0] && v <= range[thing][1], `${ex.key}: ${v} cm³`).toBe(true);
      if (ex.answer.kind === 'choice') {
        for (const o of ex.answer.options) if (o !== ex.answer.options[ex.answer.correct]) expect(quantity(o.label) >= range[thing][0] && quantity(o.label) <= range[thing][1], `${ex.key}: ${o.label}`).toBe(false);
        // one unit for all options: only the size decides, the unit alone gives nothing away
        expect(new Set(ex.answer.options.map((o) => o.label.split(' ').at(-1))).size, ex.key).toBe(1);
        expect(new Set(ex.answer.options.map((o) => o.label)).size, ex.key).toBe(4);
      }
      seen++;
    }
    expect(seen).toBeGreaterThan(20);
  });
});

describe('flaechen.volumeneinheiten: the Stufen', () => {
  it('every cell has enough different items for its slots', () => {
    expect(thinCells(volumeneinheitenSkill)).toEqual([]);
  });

  it('Stufe 1 stays with cm³, ml, dm³ and l, Stufe 2 is m³ with whole numbers, a comma waits for Stufe 3', () => {
    for (const ex of items) {
      const text = ex.expression ?? '';
      if (ex.stufe === 1) expect(text, ex.key).not.toMatch(/(?<![cd])m³|,/);
      if (ex.stufe === 2) {
        expect(text, ex.key).toMatch(/(?<![cd])m³/);
        expect(text, ex.key).not.toMatch(/,/);
      }
    }
    const forms = new Set(items.filter((x) => x.stufe === 3).map((x) => x.key.split(':')[2]));
    expect(forms).toEqual(new Set(['komma', 'ordnen', 'passt', 'aquarium']));
  });
});
