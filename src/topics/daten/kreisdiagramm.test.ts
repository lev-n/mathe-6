import { describe, expect, it } from 'vitest';
import { describeSkill } from '../../core/testing';
import { checkWorkedSolution } from '../step-check';
import { kreisdiagrammSkill } from './kreisdiagramm';
import { atAb, chosen, formOf, giveaways, keyClashes, number, picturesNotSaid, pluralSlips, rankOf, speechSlips } from './testHelpers';

describeSkill(kreisdiagrammSkill, { minDistinct: 40 });

function pie(ex: { visual?: unknown }) {
  const v = ex.visual as { type: string; slices: { label: string; value: number }[] };
  if (v.type !== 'pieChart') throw new Error('pie expected');
  return v;
}

describe('daten.kreisdiagramm', () => {
  it('Stufe 1: only halves and quarters, and the answer is that part', () => {
    for (const ab of [1, 2, 3] as const) {
      for (const ex of atAb(kreisdiagrammSkill, 1, ab)) {
        const p = pie(ex);
        p.slices.forEach((s) => expect([25, 50, 75]).toContain(s.value));
        expect(p.slices.reduce((n, s) => n + s.value, 0)).toBe(100);
        if (ab === 1) expect(p.slices.find((s) => s.label === chosen(ex).label)!.value).toBe(Math.max(...p.slices.map((s) => s.value)));
        if (ab === 2) {
          const named = p.slices.find((s) => ex.prompt.includes(`„${s.label}“`))!;
          expect(chosen(ex).label).toBe({ 25: '{frac:1/4}', 50: '{frac:1/2}', 75: '{frac:3/4}' }[named.value]);
        }
        if (ab === 3) {
          const named = p.slices.filter((s) => ex.prompt.includes(`„${s.label}“`));
          expect(chosen(ex).label).toBe({ 50: '{frac:1/2}', 75: '{frac:3/4}' }[named[0].value + named[1].value]);
        }
      }
    }
  });

  it('Stufe 1: the text gives every slice its size in equal parts, without the Bruch', () => {
    for (const ab of [1, 2, 3] as const) {
      for (const ex of atAb(kreisdiagrammSkill, 1, ab)) {
        for (const s of pie(ex).slices) expect(ex.srText, ex.key).toContain(`${s.label} ${s.value / 25} Teil`);
      }
    }
  });

  it('Stufe 2: the total is never 100, so the answer is not printed on the chart and the percent-as-count bug stays', () => {
    for (const ab of [1, 2] as const) {
      for (const ex of atAb(kreisdiagrammSkill, 2, ab, 600)) {
        const named = pie(ex).slices.find((s) => ex.prompt.includes(`„${s.label}“`))!;
        expect(/^(\d+)/.exec(ex.context!)![1], ex.key).not.toBe('100');
        expect(number(ex), ex.key).not.toBe(named.value);
        expect(ex.bugs?.some((b) => b.id === 'kreis-gesamtzahl'), ex.key).toBe(true);
      }
    }
  });

  it('Stufe 3, AB II: the table always needs converting: its numbers are not the percent', () => {
    for (const ex of atAb(kreisdiagrammSkill, 3, 2, 600)) {
      if (formOf(ex) !== 'tabelle-kreis') continue;
      const counts = (ex.visual as { rows: string[][] }).rows.map((r) => Number(r[1]));
      expect(counts.reduce((a, b) => a + b, 0), ex.key).not.toBe(100);
    }
  });

  it('Stufe 3, AB II: comparing sizes decides nothing: every option has the order of size of the data, so only a calculation tells them apart', () => {
    const items = atAb(kreisdiagrammSkill, 3, 2, 800);
    expect(new Set(items.map(formOf))).toEqual(new Set(['tabelle-kreis', 'kreis-tabelle']));
    for (const ex of items) {
      if (ex.answer.kind !== 'choice') throw new Error('choice expected');
      const shown = (v: unknown) => {
        const x = v as { type: string; rows?: string[][]; slices?: { value: number }[] };
        return x.type === 'table' ? x.rows!.map((r) => Number(r[1])) : x.slices!.map((s) => s.value);
      };
      const data = rankOf(shown(ex.visual));
      for (const o of ex.answer.options) expect(rankOf(shown(o.visual)), `${ex.key}: ${o.label}`).toBe(data);
    }
  });

  it('Stufe 2: both forms name the slice in the key, and a total of 10 no longer gives one person', () => {
    for (const ex of atAb(kreisdiagrammSkill, 2, 1, 800)) expect(number(ex), ex.key).toBeGreaterThan(1);
  });

  it('no two thin slices lie side by side, so their labels cannot overlap', () => {
    for (const stufe of [2, 3] as const) {
      for (const ab of [1, 2, 3] as const) {
        for (const ex of atAb(kreisdiagrammSkill, stufe, ab, 400)) {
          if (ex.visual?.type !== 'pieChart') continue;
          const v = ex.visual.slices.map((s) => s.value);
          v.forEach((x, i) => expect(x + v[(i + 1) % v.length], ex.key).toBeGreaterThanOrEqual(20));
        }
      }
    }
  });

  it('the screen-reader text holds the data of the picture, and no form gives its answer away', () => {
    expect(picturesNotSaid(kreisdiagrammSkill)).toEqual([]);
    expect(giveaways(kreisdiagrammSkill)).toEqual([]);
  });

  it('one key is one task, a count of 1 has no plural, and every spoken part is closed by one mark', () => {
    expect(keyClashes(kreisdiagrammSkill)).toEqual([]);
    expect(pluralSlips(kreisdiagrammSkill)).toEqual([]);
    expect(speechSlips(kreisdiagrammSkill)).toEqual([]);
  });

  it('Stufe 2: the count recomputes from the percent label and the total', () => {
    for (const ab of [1, 2] as const) {
      for (const ex of atAb(kreisdiagrammSkill, 2, ab)) {
        const p = pie(ex);
        const total = Number(/^(\d+)/.exec(ex.context!)![1]);
        const named = p.slices.find((s) => ex.prompt.includes(`„${s.label}“`))!;
        expect(number(ex)).toBe((named.value * total) / 100);
        expect(checkWorkedSolution(ex)).toEqual([]);
      }
    }
  });

  it('Stufe 2, AB III: from a part to the whole, and the missing share', () => {
    const forms = new Set<string>();
    for (const ex of atAb(kreisdiagrammSkill, 2, 3)) {
      forms.add(formOf(ex));
      const p = pie(ex);
      if (formOf(ex) === 'gesamt') {
        const count = Number(/^(\d+)/.exec(ex.context!)![1]);
        const named = p.slices.find((s) => ex.context!.includes(`„${s.label}“`))!;
        expect((number(ex) * named.value) / 100).toBe(count);
      } else {
        const named = p.slices.find((s) => ex.prompt.includes(`„${s.label}“`))!;
        expect(number(ex)).toBe(named.value);
      }
    }
    expect(forms).toEqual(new Set(['gesamt', 'fehlend']));
  });

  it('Stufe 3: 360° is the whole circle, both ways', () => {
    for (const ex of atAb(kreisdiagrammSkill, 3, 1)) {
      const named = pie(ex).slices.find((s) => ex.prompt.includes(`„${s.label}“`))!;
      expect(number(ex)).toBeCloseTo(named.value * 3.6, 9);
      expect(checkWorkedSolution(ex)).toEqual([]);
    }
    for (const ex of atAb(kreisdiagrammSkill, 3, 3)) {
      const angle = Number(/von (\d+)°/.exec(ex.prompt)![1]);
      expect(number(ex)).toBeCloseTo(angle / 3.6, 9);
      expect(pie(ex).slices.some((s) => s.value === number(ex))).toBe(true);
    }
  });

  it('Stufe 3, AB II: exactly one option matches the data', () => {
    const forms = new Set<string>();
    for (const ex of atAb(kreisdiagrammSkill, 3, 2)) {
      forms.add(formOf(ex));
      if (ex.answer.kind !== 'choice') throw new Error('choice expected');
      if (formOf(ex) === 'tabelle-kreis') {
        const rows = (ex.visual as { rows: string[][] }).rows;
        const counts = rows.map((r) => Number(r[1]));
        const total = counts.reduce((a, b) => a + b, 0);
        const fits = ex.answer.options.filter((o) => (o.visual as { slices: { value: number }[] }).slices.every((s, i) => s.value === (counts[i] * 100) / total));
        expect(fits).toEqual([chosen(ex)]);
      } else {
        const total = Number(/antworten (\d+)/.exec(ex.context!)![1]);
        const p = pie(ex);
        const fits = ex.answer.options.filter((o) => (o.visual as { rows: string[][] }).rows.every((r, i) => Number(r[1]) === (p.slices[i].value * total) / 100));
        expect(fits).toEqual([chosen(ex)]);
      }
    }
    expect(forms).toEqual(new Set(['tabelle-kreis', 'kreis-tabelle']));
  });
});
