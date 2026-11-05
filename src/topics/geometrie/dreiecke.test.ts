import { describe, expect, it } from 'vitest';
import { createRng } from '../../core/rng';
import { describeSkill } from '../../core/testing';
import type { Ab, ChoiceAnswer, Exercise, Stufe } from '../../core/types';
import { srTextWithPicture } from '../../ui/visuals/describe';
import { dreieckeSkill as skill } from './dreiecke';

describeSkill(skill, { minDistinct: { 1: 80, 2: 80, 3: 50 } });

const items = (stufe: Stufe, ab: Ab, n = 200): Exercise[] => Array.from({ length: n }, (_, i) => skill.generate(createRng(i * 337 + 19), stufe, { subtractionMethod: 'abziehen', ab }));
const rightLabel = (ex: Exercise) => {
  const a = ex.answer as ChoiceAnswer;
  return a.options[a.correct].label;
};
const numbersIn = (text: string, unit: string) => [...text.matchAll(new RegExp(`(\\d+(?:,\\d+)?)[\\s\\u00A0]?${unit}`, 'g'))].map((m) => Number(m[1].replace(',', '.')));
const bySides = ([a, b, c]: number[]) => (a === b && b === c ? 'gleichseitig' : a === b || b === c || a === c ? 'gleichschenklig' : 'alle Seiten verschieden lang');
const byAngles = (angles: number[]) => (Math.max(...angles) === 90 ? 'rechtwinklig' : Math.max(...angles) > 90 ? 'stumpfwinklig' : 'spitzwinklig');

describe('Dreiecke: independent checks', () => {
  it('Stufe 1: the name comes from the sides, and the triangle exists', () => {
    for (const ab of [1, 2] as Ab[]) {
      for (const ex of items(1, ab)) {
        const sides = ex.visual?.type === 'figure' ? ex.visual.sides!.map((s) => numbersIn(s!, 'cm')[0]) : numbersIn(ex.prompt, 'cm');
        expect(sides).toHaveLength(3);
        const sorted = [...sides].sort((p, q) => p - q);
        expect(sorted[0] + sorted[1], ex.key).toBeGreaterThan(sorted[2]);
        expect(rightLabel(ex)).toBe(bySides(sides));
      }
    }
  });

  it('Stufe 1, AB III: from the name to the lengths; the answer never stands in the task, every triple is a triangle, one alone fits', () => {
    const seen = { laengen: 0, umfang: 0 };
    for (const ex of items(1, 3)) {
      const a = ex.answer as ChoiceAnswer;
      if (ex.key.includes(':laengen:')) {
        seen.laengen++;
        const wanted = ex.prompt.includes('gleichseitig') ? 'gleichseitig' : 'gleichschenklig';
        a.options.forEach((o, i) => {
          const sides = numbersIn(o.label, 'cm').sort((p, q) => p - q);
          expect(sides, ex.key).toHaveLength(3);
          expect(sides[0] + sides[1], `${ex.key}: ${o.label} is no triangle`).toBeGreaterThan(sides[2]);
          if (wanted === 'gleichschenklig') expect(bySides(sides), ex.key).not.toBe('gleichseitig');
          expect(bySides(sides) === wanted, `${ex.key}: ${o.label}`).toBe(i === a.correct);
        });
      } else {
        seen.umfang++;
        const [umfang, side] = numbersIn(ex.prompt, 'cm');
        const value = numbersIn(rightLabel(ex), 'cm')[0];
        expect(value, ex.key).toBe(side === undefined ? umfang / 3 : umfang - 2 * side);
        expect(numbersIn(ex.prompt, 'cm'), ex.key).not.toContain(value);
      }
    }
    expect(seen.laengen).toBeGreaterThan(50);
    expect(seen.umfang).toBeGreaterThan(50);
  });

  it('Stufe 2: the name comes from the angles, which sum to 180°', () => {
    for (const ex of items(2, 2)) {
      const angles = numbersIn(ex.prompt, '°');
      expect(angles.reduce((a, b) => a + b, 0)).toBe(180);
      expect(rightLabel(ex)).toBe(byAngles(angles));
    }
    for (const ex of items(2, 3)) {
      const [a, b] = numbersIn(ex.prompt, '°');
      expect(rightLabel(ex)).toBe(byAngles([a, b, 180 - a - b]));
    }
    for (const ex of items(2, 1)) {
      if (ex.visual?.type !== 'figure') throw new Error('figure expected');
      expect(ex.visual.points).toHaveLength(3);
      if (rightLabel(ex) === 'rechtwinklig') expect(ex.visual.rightAngles).toHaveLength(1);
    }
  });

  it('Stufe 3: both names; equal angles give equal sides', () => {
    for (const ex of items(3, 2)) {
      const angles = numbersIn(ex.prompt, '°');
      expect(angles.reduce((a, b) => a + b, 0)).toBe(180);
      const distinct = new Set(angles).size;
      const side = distinct === 1 ? 'gleichseitig' : distinct === 2 ? 'gleichschenklig' : 'verschieden lange Seiten';
      expect(rightLabel(ex)).toContain(side);
      expect(rightLabel(ex)).toContain(byAngles(angles));
    }
  });

  it('Stufe 3: exactly one description is true, also for a gleichseitiges Dreieck, which is gleichschenklig too', () => {
    const holds = (label: string, angles: number[]) => {
      const distinct = new Set(angles).size;
      const sideFits = label.startsWith('gleichseitig') ? distinct === 1 : label.startsWith('gleichschenklig') ? distinct <= 2 : distinct === 3;
      return sideFits && label.endsWith(byAngles(angles));
    };
    let equilateral = 0;
    for (const ex of items(3, 1, 400).concat(items(3, 2, 400))) {
      const angles = ex.visual ? /:(\d+)\.(\d+)\.(\d+):/.exec(ex.key)!.slice(1, 4).map(Number) : numbersIn(ex.prompt, '°');
      const a = ex.answer as ChoiceAnswer;
      a.options.forEach((o, i) => expect(holds(o.label, angles), `${ex.key}: ${o.label}`).toBe(i === a.correct));
      if (new Set(angles).size === 1) equilateral++;
    }
    expect(equilateral).toBeGreaterThan(40);
  });

  it('the voice gives the openings and marks as data, never the verdict that is the answer', () => {
    for (const ex of items(2, 1, 400).concat(items(3, 1, 400))) {
      const said = srTextWithPicture(ex);
      expect(said, ex.key).not.toMatch(/größer als|kleiner als|genau zwei|gleich lang|gedreht|verschieden|spitzwinklig|stumpfwinklig/i);
      const angles = /:(\d+)\.(\d+)\.(\d+):/.exec(ex.key)!.slice(1, 4).map(Number);
      const minutes = [...said.matchAll(/etwa Minute (\d+)/g)].map((m) => Number(m[1]));
      expect(minutes, ex.key).toEqual(angles.map((d) => Math.round(d / 6)));
      for (const [d, m] of angles.map((x, i) => [x, minutes[i]])) expect(Math.sign(m - 15), `${ex.key}: rounding must not cross the corner`).toBe(Math.sign(d - 90));
      expect(said.includes('Ein rechter Winkel ist markiert'), ex.key).toBe(angles.includes(90));
    }
    const strokes = new Set<string>();
    for (const ex of items(3, 1, 400)) strokes.add(/Die Seiten [^.]+\.|Keine Seite[^.]+\./.exec(ex.srText)![0]);
    expect(strokes.size).toBe(3);
  });

  it('Stufe 3, AB III: three forms of reasoning, with many answers and no fixed one', () => {
    const all = items(3, 3, 1500);
    expect(new Set(all.map((ex) => `${ex.prompt} ${rightLabel(ex)}`)).size).toBeGreaterThan(100);
    expect(new Set(all.map(rightLabel)).size).toBeGreaterThan(6);
    for (const form of [':unmoeglich:', ':gibt-es:', ':beides-dritter:']) expect(all.filter((ex) => ex.key.includes(form)).length, form).toBeGreaterThan(200);
    for (const ex of all) expect(ex.prompt, ex.key).not.toMatch(/zwei (rechte|stumpfe) Winkel/);
  });

  it('Stufe 3, AB III: which combination does not exist: the first word and the first hint tell nothing, every other one exists', () => {
    const forms = items(3, 3, 800).filter((ex) => ex.key.includes(':unmoeglich:'));
    expect(forms.length).toBeGreaterThan(100);
    for (const ex of forms) {
      expect(rightLabel(ex)).toMatch(/^gleichseitig und (rechtwinklig|stumpfwinklig)$/);
      for (const hint of ex.hints) expect(hint, ex.key).not.toMatch(/gleichseitig/i);
      const a = ex.answer as ChoiceAnswer;
      expect(a.options.filter((o) => o.label.startsWith('gleichseitig')), ex.key).toHaveLength(2);
      a.options.forEach((o, i) => {
        if (i === a.correct) return;
        expect(o.label).not.toMatch(/^gleichseitig und (rechtwinklig|stumpfwinklig)$/);
        const given = numbersIn(o.whyWrong!, '°');
        if (given.length === 3) expect(given.reduce((p, q) => p + q, 0)).toBe(180);
      });
    }
  });

  it('Stufe 3, AB III: does it exist? Recomputed from the sum of 180°; Ja and Nein about equally often', () => {
    const forms = items(3, 3, 1500).filter((ex) => ex.key.includes(':gibt-es:'));
    let yes = 0;
    for (const ex of forms) {
      const given = numbersIn(ex.prompt, '°');
      const sum = given.reduce((p, q) => p + q, 0);
      let exists: boolean;
      if (ex.prompt.includes('gleichseitig')) exists = given[0] === 60;
      else if (ex.prompt.includes('rechtwinklig')) exists = given[0] + 90 < 180;
      else {
        const all = [...given, 180 - sum];
        expect(Math.min(...all), ex.key).toBeGreaterThan(0);
        expect(new Set(given).size, ex.key).toBe(2);
        exists = ex.prompt.includes('gleichschenklig') ? new Set(all).size === 2 : ex.prompt.includes('stumpfwinklig') ? Math.max(...all) > 90 : Math.max(...all) < 90;
      }
      expect(rightLabel(ex), ex.key).toBe(exists ? 'Ja' : 'Nein');
      if (exists) yes++;
    }
    expect(yes / forms.length).toBeGreaterThan(0.35);
    expect(yes / forms.length).toBeLessThan(0.65);
  });

  it('Stufe 3, AB III: two angles, the third gives both names: more than Stufe 2, AB III and Stufe 3, AB II', () => {
    const forms = items(3, 3, 800).filter((ex) => ex.key.includes(':beides-dritter:'));
    expect(forms.length).toBeGreaterThan(100);
    for (const ex of forms) {
      const [a, b] = numbersIn(ex.prompt, '°');
      const all = [a, b, 180 - a - b];
      const distinct = new Set(all).size;
      expect(rightLabel(ex), ex.key).toContain(distinct === 1 ? 'gleichseitig' : distinct === 2 ? 'gleichschenklig' : 'verschieden lange Seiten');
      expect(rightLabel(ex), ex.key).toContain(byAngles(all));
    }
  });
});
