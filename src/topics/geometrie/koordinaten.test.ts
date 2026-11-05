import { describe, expect, it } from 'vitest';
import { toSpeech } from '../../core/format';
import { createRng } from '../../core/rng';
import { describeSkill } from '../../core/testing';
import type { Ab, ChoiceAnswer, Exercise, Stufe } from '../../core/types';
import { srTextWithPicture } from '../../ui/visuals/describe';
import { tagFor } from '../errorFamilies';
import { koordinatenSkill as skill } from './koordinaten';

describeSkill(skill, { minDistinct: { 1: 60, 2: 60, 3: 60 } });

const items = (stufe: Stufe, ab: Ab, n = 200): Exercise[] => Array.from({ length: n }, (_, i) => skill.generate(createRng(i * 337 + 19), stufe, { subtractionMethod: 'abziehen', ab }));
const AB: Ab[] = [1, 2, 3];
const fieldsOf = (ex: Exercise) => {
  if (ex.answer.kind !== 'multi') throw new Error('multi expected');
  return { x: ex.answer.fields.find((f) => f.id === 'x')!.value, y: ex.answer.fields.find((f) => f.id === 'y')!.value };
};
const pointsIn = (text: string) => [...text.matchAll(/([A-Z])\((−?\d+)\s\|\s(−?\d+)\)/g)].map((m) => ({ name: m[1], x: Number(m[2].replace('−', '-')), y: Number(m[3].replace('−', '-')) }));

describe('Koordinatensystem: independent checks', () => {
  it('Stufe 1: first quadrant, 0 to 10, the fields are the drawn point', () => {
    for (const ab of AB) {
      for (const ex of items(1, ab)) {
        if (ex.visual?.type !== 'coordinateGrid') throw new Error('grid expected');
        expect([ex.visual.xMin, ex.visual.xMax, ex.visual.yMin, ex.visual.yMax]).toEqual([0, 10, 0, 10]);
        ex.visual.points.forEach((p) => expect(p.x >= 0 && p.y >= 0 && p.x <= 10 && p.y <= 10).toBe(true));
        if (ex.key.includes(':lesen')) expect(fieldsOf(ex)).toEqual({ x: ex.visual.points[0].x, y: ex.visual.points[0].y });
      }
    }
  });

  it('Stufe 1: the point with these coordinates is the labelled one; a walk adds to the start', () => {
    for (const ex of items(1, 2)) {
      if (!ex.key.includes(':welcher:')) continue;
      if (ex.visual?.type !== 'coordinateGrid') throw new Error('grid expected');
      const [x, y] = [.../x-Wert (\d+) und den y-Wert (\d+)/.exec(ex.prompt)!].slice(1).map(Number);
      const a = ex.answer as ChoiceAnswer;
      expect(ex.visual.points.find((p) => p.label === a.options[a.correct].label)).toMatchObject({ x, y });
      expect(new Set(ex.visual.points.map((p) => `${p.x}|${p.y}`)).size).toBe(4);
    }
    for (const ex of items(1, 3)) {
      const [start] = pointsIn(ex.prompt);
      const [dx, dy] = [/(\d+) nach rechts/, /(\d+) nach oben/].map((re) => Number(re.exec(ex.prompt)![1]));
      expect(fieldsOf(ex)).toEqual({ x: start.x + dx, y: start.y + dy });
      expect(ex.prompt, 'the field names a point of the task').toContain(' B');
    }
  });

  it('every field of the skill is signed, so the ± key gives nothing away', () => {
    expect(skill.keys).toEqual({ minus: true });
    for (const stufe of [1, 2, 3] as Stufe[]) {
      for (const ab of AB) {
        for (const ex of items(stufe, ab, 60)) if (ex.answer.kind === 'multi') ex.answer.fields.forEach((f) => expect(f.signed, ex.key).toBe(true));
      }
    }
  });

  it('Stufe 2: setting a point; the fourth corner makes a Rechteck, checked by its diagonals and a right angle', () => {
    for (const ex of items(2, 1)) {
      if (ex.answer.kind !== 'point') throw new Error('point expected');
      const [p] = pointsIn(ex.prompt);
      expect(ex.answer.target).toEqual([p.x, p.y]);
      expect(ex.answer.name).toBe(p.name);
    }
    for (const ex of items(2, 2).concat(items(2, 3).filter((e) => e.key.includes(':schraeg:')))) {
      if (ex.answer.kind !== 'point') throw new Error('point expected');
      const [a, b, c] = pointsIn(ex.prompt);
      const [dx, dy] = ex.answer.target;
      expect(a.x + c.x).toBe(b.x + dx);
      expect(a.y + c.y).toBe(b.y + dy);
      expect(Math.abs((a.x - b.x) * (c.x - b.x) + (a.y - b.y) * (c.y - b.y)), ex.key).toBe(0);
    }
    for (const ex of items(2, 3).filter((e) => e.key.includes(':zwei-ecken:'))) {
      if (ex.answer.kind !== 'point' || !ex.answer.targets) throw new Error('two targets expected');
      const [a, c] = pointsIn(ex.prompt);
      const got = ex.answer.targets.map((t) => t.join()).sort();
      expect(got).toEqual([[a.x, c.y].join(), [c.x, a.y].join()].sort());
    }
  });

  it('two opposite corners: the task says that the sides run along the grid, which makes the answer the only one', () => {
    for (const [stufe, ab, form] of [[2, 3, ':zwei-ecken:'], [3, 2, ':zwei-vier:']] as const) {
      let found = 0;
      for (const ex of items(stufe, ab)) {
        if (!ex.key.includes(form)) continue;
        found++;
        if (ex.answer.kind !== 'point' || !ex.answer.targets) throw new Error('two targets expected');
        expect(ex.prompt, ex.key).toContain('entlang der Gitterlinien');
        const [a, c] = pointsIn(ex.prompt);
        expect(a.x, ex.key).not.toBe(c.x);
        expect(a.y, ex.key).not.toBe(c.y);
        // A lattice search: two more corners make a Rechteck with sides along the grid in one way only.
        const { xMin, xMax, yMin, yMax } = ex.answer;
        const solutions = new Set<string>();
        for (let x = xMin; x <= xMax; x++) for (let y = yMin; y <= yMax; y++) if ((x === a.x && y === c.y) || (x === c.x && y === a.y)) solutions.add(`${x},${y}`);
        expect([...solutions].sort(), ex.key).toEqual(ex.answer.targets.map((t) => t.join()).sort());
      }
      expect(found).toBeGreaterThan(50);
    }
  });

  it('Stufe 3: four quadrants from −6 to 6, with a negative coordinate', () => {
    for (const ex of items(3, 1)) {
      if (ex.visual?.type !== 'coordinateGrid') throw new Error('grid expected');
      expect([ex.visual.xMin, ex.visual.xMax]).toEqual([-6, 6]);
      const { x, y } = fieldsOf(ex);
      expect(x < 0 || y < 0).toBe(true);
      expect({ x, y }).toEqual({ x: ex.visual.points[0].x, y: ex.visual.points[0].y });
    }
  });

  it('Stufe 3, AB II: every item derives a corner of a Rechteck across the axes: no point to copy from the task, and more than the fourth corner of Stufe 2', () => {
    for (const ex of items(3, 2)) {
      if (ex.answer.kind !== 'point') throw new Error('point expected');
      expect(ex.answer.xMin, ex.key).toBe(-6);
      const given = pointsIn(ex.prompt);
      const wanted = (ex.answer.targets ?? [ex.answer.target]).map((t) => t.join());
      for (const p of given) expect(wanted, ex.key).not.toContain(`${p.x},${p.y}`);
      const corners = [...given.map((p) => [p.x, p.y]), ...(ex.answer.targets ?? [ex.answer.target])];
      expect(corners, ex.key).toHaveLength(4);
      const xs = corners.map((p) => p[0]);
      const ys = corners.map((p) => p[1]);
      expect(Math.min(...xs) < 0 && Math.max(...xs) > 0 && Math.min(...ys) < 0 && Math.max(...ys) > 0, ex.key).toBe(true);
    }
  });

  it('Stufe 3, AB III: a walk crosses an axis, a Rechteck has a negative corner, so no item fits the first quadrant alone', () => {
    const directions = new Set<string>();
    for (const ex of items(3, 3, 400)) {
      const [start] = pointsIn(ex.prompt);
      if (ex.answer.kind === 'multi') {
        const { x, y } = fieldsOf(ex);
        expect(start.x * x < 0 || start.y * y < 0, ex.key).toBe(true);
        directions.add(/nach (rechts|links)/.exec(ex.prompt)![1]);
      } else {
        if (ex.answer.kind !== 'point') throw new Error('point expected');
        const corners = [...pointsIn(ex.prompt).map((p) => [p.x, p.y]), ex.answer.target];
        expect(corners.some(([x, y]) => x < 0 || y < 0), ex.key).toBe(true);
      }
    }
    expect(directions.size).toBe(2);
  });

  it('the voice gives a way from the origin, never the coordinates in field order or their signs: order and sign stay with the child', () => {
    const reads = [items(1, 1), items(1, 2).filter((ex) => ex.key.includes(':lesen2:')), items(3, 1)].flat();
    let upFirst = 0;
    for (const ex of reads) {
      const { x, y } = fieldsOf(ex);
      const said = srTextWithPicture(ex);
      expect(said, ex.key).not.toContain('liegt bei');
      expect(said.replace('von minus 6', ''), ex.key).not.toMatch(/minus/);
      if (x !== 0) expect(said, ex.key).toContain(`${Math.abs(x)} nach ${x > 0 ? 'rechts' : 'links'}`);
      if (y !== 0) expect(said, ex.key).toContain(`${Math.abs(y)} nach ${y > 0 ? 'oben' : 'unten'}`);
      if (/nach (oben|unten) und/.test(said)) upFirst++;
    }
    expect(upFirst / reads.length).toBeGreaterThan(0.3);
    expect(upFirst / reads.length).toBeLessThan(0.7);
    for (const ex of items(1, 2).filter((e) => e.key.includes(':welcher:'))) expect(srTextWithPicture(ex), ex.key).not.toContain('liegt bei');
  });

  it('the voice never says Punkt twice, and points without a name of their own stay out of the text', () => {
    for (const stufe of [1, 2, 3] as Stufe[]) {
      for (const ab of AB) {
        for (const ex of items(stufe, ab, 60)) {
          for (const text of [ex.prompt, ex.srText, ...ex.steps.map((step) => (typeof step === 'string' ? step : step.text))]) expect(toSpeech(text), ex.key).not.toMatch(/Punkt (heißt |ist )?Punkt|\||\(\s*\d/);
        }
      }
    }
  });

  it('a swapped pair and a missing sign have their own families (§5)', () => {
    let swapped = 0;
    let sign = 0;
    for (const ex of items(3, 1)) {
      const { x, y } = fieldsOf(ex);
      for (const b of ex.bugs ?? []) {
        if (b.id === 'koord-getauscht') {
          expect(b.match).toEqual({ x: y, y: x });
          expect(tagFor(skill.id, b.id)).toBe('geometrie-koord-getauscht');
          swapped++;
        }
        if (b.id === 'vorzeichen-vergessen') {
          expect(b.match).toEqual({ x: Math.abs(x), y: Math.abs(y) });
          sign++;
        }
      }
    }
    expect(swapped).toBeGreaterThan(50);
    expect(sign).toBeGreaterThan(50);
  });
});
