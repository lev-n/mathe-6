import { describe, expect, it } from 'vitest';
import { abSequence } from '../../core/age';
import { DEFAULT_CONTEXT, generateUnique } from '../../core/generate';
import { createRng } from '../../core/rng';
import { describeSkill } from '../../core/testing';
import type { Ab, Exercise, FigurePoint, Stufe, VisualOf } from '../../core/types';
import { winkelBeziehungenSkill as skill } from './winkel-beziehungen';

describeSkill(skill, { minDistinct: { 1: 50, 2: 100, 3: 60 } });

const items = (stufe: Stufe, ab: Ab, n = 200): Exercise[] => Array.from({ length: n }, (_, i) => skill.generate(createRng(i * 337 + 19), stufe, { subtractionMethod: 'abziehen', ab }));
const AB: Ab[] = [1, 2, 3];
const valueOf = (ex: Exercise) => {
  if (ex.answer.kind !== 'number' || ex.answer.value === null) throw new Error('number expected');
  return ex.answer.value;
};
const degreesIn = (text: string) => [...text.matchAll(/(\d+)°/g)].map((m) => Number(m[1]));
const lines = (ex: Exercise): VisualOf<'lines'> => {
  if (ex.visual?.type !== 'lines') throw new Error('lines expected');
  return ex.visual;
};
const drawnAlpha = (ex: Exercise) => lines(ex).lines[1].angle - lines(ex).lines[0].angle;

/** The drawn angle at a corner of a figure, from its coordinates. */
function cornerAngle(points: FigurePoint[], i: number): number {
  const p = points[i];
  const [a, b] = [points[(i + 1) % points.length], points[(i + points.length - 1) % points.length]];
  const [ux, uy, wx, wy] = [a.x - p.x, a.y - p.y, b.x - p.x, b.y - p.y];
  return (Math.acos((ux * wx + uy * wy) / (Math.hypot(ux, uy) * Math.hypot(wx, wy))) * 180) / Math.PI;
}

describe('Winkel an Geraden: independent checks', () => {
  it('Stufe 1: Nebenwinkel only, summing to 180°, as drawn', () => {
    for (const ab of [1, 2] as Ab[]) {
      for (const ex of items(1, ab)) {
        const [known] = degreesIn(ex.prompt);
        expect(known + valueOf(ex)).toBe(180);
        expect(ex.prompt).toContain('Nebenwinkel');
        const alpha = drawnAlpha(ex);
        expect([alpha, 180 - alpha]).toContain(valueOf(ex));
      }
    }
    const forms = { pruefen: 0, unterschied: 0 };
    for (const ex of items(1, 3)) {
      const alpha = drawnAlpha(ex);
      if (ex.key.includes(':pruefen:')) {
        forms.pruefen++;
        const [known, claim] = degreesIn(ex.prompt);
        expect(known + valueOf(ex), ex.key).toBe(180);
        expect(known + claim, ex.key).not.toBe(180);
        expect([alpha, 180 - alpha]).toContain(known);
      } else {
        forms.unterschied++;
        const [given] = degreesIn(ex.prompt);
        expect(given).toBe(alpha);
        expect(valueOf(ex), ex.key).toBe(180 - 2 * alpha);
      }
    }
    expect(Math.min(forms.pruefen, forms.unterschied)).toBeGreaterThan(50);
  });

  it('Stufe 1, AB III stays below Stufe 2, AB III: no sum and difference to split, only subtraction from 180°; Stufe 2 halves first', () => {
    for (const ex of items(1, 3)) {
      expect(ex.prompt, ex.key).not.toMatch(/größer als \S+\. Wie groß/);
      for (const step of ex.steps) expect(step, ex.key).not.toMatch(/: 2 =/);
    }
    for (const ex of items(2, 3)) expect(ex.steps[0], ex.key).toMatch(/: 2 =/);
  });

  it('a round shows no sentence twice: the tilt of a picture is no new task', () => {
    for (const stufe of [1, 2, 3] as Stufe[]) {
      for (let round = 0; round < 300; round++) {
        const keys = new Set<string>();
        const texts = new Set<string>();
        abSequence(stufe).forEach((ab, i) => {
          const ex = generateUnique(skill, stufe, round * 1009 + i * 31 + stufe, { ...DEFAULT_CONTEXT, ab }, keys);
          const text = `${ex.context ?? ''} ${ex.prompt} ${valueOf(ex)}`;
          expect(texts.has(text), `round ${round}: ${text}`).toBe(false);
          keys.add(ex.key);
          texts.add(text);
        });
      }
    }
  });

  it('one sentence has one key at every Stufe, so the repeat check of a round can see it', () => {
    for (const stufe of [1, 2, 3] as Stufe[]) {
      const keyOf = new Map<string, string>();
      for (const ab of AB) {
        for (const ex of items(stufe, ab, 400)) {
          const text = `${ex.context ?? ''} ${ex.prompt} ${valueOf(ex)}`;
          expect(keyOf.get(text) ?? ex.key, text).toBe(ex.key);
          keyOf.set(text, ex.key);
        }
      }
    }
  });

  it('two angles together: the bug hint names the relation that was missed, and no step says the same fact twice', () => {
    const sums = items(2, 2, 800).filter((ex) => ex.key.includes(':vier-summe:'));
    expect(sums.length).toBeGreaterThan(100);
    for (const ex of sums) {
      const given = degreesIn(ex.prompt)[0];
      const names = [...ex.prompt].filter((c) => 'αβγδ'.includes(c));
      const beside = names[0] !== names[1] && names[0] !== names[2];
      const bug = ex.bugs?.find((b) => b.id === 'scheitel-neben');
      if (bug) {
        expect(bug.match, ex.key).toBe(beside ? 2 * given : 2 * (180 - given));
        if (beside) {
          expect(bug.hint, ex.key).toContain('neben');
          expect(bug.hint, ex.key).not.toContain('gegenüber');
        } else expect(bug.hint, ex.key).toContain('gegenüber');
      }
      expect(ex.steps.filter((s) => (typeof s === 'string' ? s : s.text).includes('gegenüber')), ex.key).toHaveLength(1);
    }
  });

  it('Stufe 2: the four angles of a crossing, recomputed from the drawing', () => {
    const NAMES = 'αβγδ';
    for (const ex of items(2, 1).concat(items(2, 2))) {
      const alpha = drawnAlpha(ex);
      const size = (name: string) => (NAMES.indexOf(name) % 2 === 0 ? alpha : 180 - alpha);
      const names = [...ex.prompt].filter((c) => NAMES.includes(c));
      expect(degreesIn(ex.prompt)[0]).toBe(size(names[0]));
      if (ex.prompt.includes('zusammen')) expect(valueOf(ex)).toBe(size(names[1]) + size(names[2]));
      else expect(valueOf(ex)).toBe(size(names[names.length - 1]));
    }
    for (const ex of items(2, 3)) {
      const [sum] = degreesIn(ex.prompt);
      expect(valueOf(ex)).toBe(180 - sum / 2);
      expect(drawnAlpha(ex)).toBe(sum / 2);
    }
  });

  it('no item repeats the number of its prompt: Stufe 2 AB I needs the same calculation as Stufe 1 AB I, and more', () => {
    for (const stufe of [1, 2, 3] as Stufe[]) {
      for (const ab of AB) {
        for (const ex of items(stufe, ab)) expect(degreesIn([ex.context, ex.prompt].filter(Boolean).join(' ')), ex.key).not.toContain(valueOf(ex));
      }
    }
    for (const ex of items(2, 1)) {
      expect(ex.prompt, ex.key).toContain('Scheitelwinkel');
      expect(ex.prompt, ex.key).toContain('Nebenwinkel');
    }
  });

  it('a letter stands inside its angle and inside the picture', () => {
    for (const ex of items(2, 2)) {
      const v = lines(ex);
      const [tilt, alpha] = [v.lines[0].angle, drawnAlpha(ex)];
      const bounds = [[tilt, tilt + alpha], [tilt + alpha, tilt + 180], [tilt + 180, tilt + 180 + alpha], [tilt + 180 + alpha, tilt + 360]];
      v.points!.forEach((p, i) => {
        expect(Math.abs(p.y)).toBeLessThanOrEqual(92);
        expect(Math.abs(p.x)).toBeLessThanOrEqual(136);
        const direction = (Math.atan2(p.y + 8, p.x + 7) * 180) / Math.PI;
        const inside = [-360, 0, 360].some((turn) => direction + turn > bounds[i][0] && direction + turn < bounds[i][1]);
        expect(inside, `${ex.key} ${p.label}`).toBe(true);
      });
    }
  });

  it('Stufe 3: Innenwinkel sum to 180°, the triangle is drawn to its numbers', () => {
    for (const ex of items(3, 1)) {
      const [a, b] = degreesIn(ex.context!);
      expect(a + b + valueOf(ex)).toBe(180);
      if (ex.visual?.type !== 'figure') throw new Error('figure expected');
      expect(cornerAngle(ex.visual.points, 0)).toBeCloseTo(a, 0);
      expect(cornerAngle(ex.visual.points, 1)).toBeCloseTo(b, 0);
      expect(cornerAngle(ex.visual.points, 2)).toBeCloseTo(valueOf(ex), 0);
    }
  });

  it('Stufe 3: Stufenwinkel are equal, the Nebenwinkel of one sums to 180°; the Geraden are marked parallel', () => {
    for (const ex of items(3, 2)) {
      const v = lines(ex);
      expect(v.parallelMarks).toEqual([[0, 1]]);
      expect(v.lines[0].angle).toBe(v.lines[1].angle);
      const [known] = degreesIn(ex.prompt);
      expect(known).toBe(ex.prompt.includes('α misst') ? v.lines[2].angle : 180 - v.lines[2].angle);
      expect(valueOf(ex)).toBe(180 - known);
    }
  });

  it('Stufe 3, AB III: base angles of a gleichschenkliges Dreieck', () => {
    for (const ex of items(3, 3)) {
      const [given] = degreesIn(ex.prompt);
      expect(valueOf(ex)).toBe(ex.prompt.endsWith('Basiswinkel?') ? (180 - given) / 2 : 180 - 2 * given);
      if (ex.visual?.type !== 'figure') throw new Error('figure expected');
      expect(cornerAngle(ex.visual.points, 0)).toBeCloseTo(cornerAngle(ex.visual.points, 1), 0);
    }
  });

  it('every bug hint is a different value than the answer', () => {
    for (const stufe of [1, 2, 3] as Stufe[]) for (const ab of AB) for (const ex of items(stufe, ab, 60)) for (const b of ex.bugs ?? []) expect(b.match).not.toBe(valueOf(ex));
  });
});
