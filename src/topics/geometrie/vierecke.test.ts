import { describe, expect, it } from 'vitest';
import { createRng } from '../../core/rng';
import { describeSkill } from '../../core/testing';
import type { Ab, ChoiceAnswer, Exercise, Stufe } from '../../core/types';
import { abSequence } from '../../core/age';
import { generateUnique } from '../../core/generate';
import { viereckeSkill as skill } from './vierecke';

describeSkill(skill, { minDistinct: { 1: 40, 2: 40, 3: 40 } });

const items = (stufe: Stufe, ab: Ab, n = 200): Exercise[] => Array.from({ length: n }, (_, i) => skill.generate(createRng(i * 337 + 19), stufe, { subtractionMethod: 'abziehen', ab }));
const AB: Ab[] = [1, 2, 3];
const rightLabel = (ex: Exercise) => {
  const a = ex.answer as ChoiceAnswer;
  return a.options[a.correct].label;
};
/** Is every square, every rectangle … also this figure? Written out here, apart from the generator. */
type P = readonly [number, number];
/** Examples of each figure, to test a sentence on: what holds for every such figure holds here, and what does not must fail on one. */
const EXAMPLES: Record<string, readonly (readonly P[])[]> = {
  Raute: [[[0, 0], [5, 0], [8, 4], [3, 4]], [[0, 0], [10, 0], [16, 8], [6, 8]]],
  Parallelogramm: [[[0, 0], [6, 0], [8, 3], [2, 3]], [[0, 0], [5, 0], [8, 4], [3, 4]]],
  Trapez: [[[0, 0], [8, 0], [5, 3], [2, 3]], [[0, 0], [7, 0], [4, 3], [0, 3]]],
  Drachenviereck: [[[0, -2], [3, 0], [0, 6], [-3, 0]], [[0, -4], [3, 0], [0, 2], [-3, 0]], [[0, -3], [4, 0], [0, 3], [-4, 0]]],
};
const SAME = (a: number, b: number) => Math.abs(a - b) < 1e-9;
const vec = (a: P, b: P): P => [b[0] - a[0], b[1] - a[1]];
const lengths = (f: readonly P[]) => f.map((p, i) => Math.hypot(...vec(p, f[(i + 1) % 4])));
const parallelSides = (f: readonly P[], i: number) => { const [u, v] = [vec(f[i], f[(i + 1) % 4]), vec(f[(i + 2) % 4], f[(i + 3) % 4])]; return SAME(u[0] * v[1] - u[1] * v[0], 0); };
const angleAt = (f: readonly P[], i: number) => { const [u, v] = [vec(f[i], f[(i + 1) % 4]), vec(f[i], f[(i + 3) % 4])]; return Math.atan2(Math.abs(u[0] * v[1] - u[1] * v[0]), u[0] * v[0] + u[1] * v[1]); };
const equalPairs = (f: readonly P[]) => { const l = lengths(f); return [[0, 1], [0, 2], [0, 3], [1, 2], [1, 3], [2, 3]].filter(([i, k]) => SAME(l[i], l[k])).length; };
/** Mirrors p at the line through a and b. */
const mirrored = (p: P, a: P, b: P): P => { const d = vec(a, b); const t = ((p[0] - a[0]) * d[0] + (p[1] - a[1]) * d[1]) / (d[0] * d[0] + d[1] * d[1]); return [2 * (a[0] + t * d[0]) - p[0], 2 * (a[1] + t * d[1]) - p[1]]; };
const onSame = (p: P, q: P) => SAME(p[0], q[0]) && SAME(p[1], q[1]);
/** Each sentence of the skill, measured on the corners. */
const CHECK: Record<string, (f: readonly P[]) => boolean> = {
  'Alle vier Seiten sind gleich lang.': (f) => equalPairs(f) === 6,
  'Die Seiten gegenüber sind parallel.': (f) => parallelSides(f, 0) && parallelSides(f, 1),
  'Die Seiten gegenüber sind gleich lang.': (f) => SAME(lengths(f)[0], lengths(f)[2]) && SAME(lengths(f)[1], lengths(f)[3]),
  'Die Winkel gegenüber sind gleich groß.': (f) => SAME(angleAt(f, 0), angleAt(f, 2)) && SAME(angleAt(f, 1), angleAt(f, 3)),
  'Zwei Seiten sind parallel.': (f) => parallelSides(f, 0) || parallelSides(f, 1),
  'Je zwei benachbarte Seiten sind gleich lang.': (f) => { const l = lengths(f); return (SAME(l[0], l[3]) && SAME(l[1], l[2])) || (SAME(l[0], l[1]) && SAME(l[2], l[3])); },
  'Eine Diagonale ist Symmetrieachse.': (f) => onSame(mirrored(f[1], f[0], f[2]), f[3]) || onSame(mirrored(f[0], f[1], f[3]), f[2]),
  'Die Diagonalen stehen senkrecht aufeinander.': (f) => { const [u, v] = [vec(f[0], f[2]), vec(f[1], f[3])]; return SAME(u[0] * v[0] + u[1] * v[1], 0); },
  'Die Diagonalen halbieren sich.': (f) => SAME(f[0][0] + f[2][0], f[1][0] + f[3][0]) && SAME(f[0][1] + f[2][1], f[1][1] + f[3][1]),
  'Alle Winkel sind rechte Winkel.': (f) => [0, 1, 2, 3].every((i) => SAME(angleAt(f, i), Math.PI / 2)),
  'Keine zwei Seiten sind parallel.': (f) => !parallelSides(f, 0) && !parallelSides(f, 1),
  'Nur zwei Seiten sind gleich lang.': (f) => equalPairs(f) === 1,
  'Genau drei Seiten sind gleich lang.': (f) => equalPairs(f) === 3,
};
const always = (figure: string, sentence: string) => EXAMPLES[figure].every((f) => CHECK[sentence](f));

const ALSO: Record<string, string[]> = { Quadrat: ['Rechteck', 'Raute', 'Parallelogramm', 'Drachenviereck'], Rechteck: ['Parallelogramm'], Raute: ['Parallelogramm', 'Drachenviereck'], Parallelogramm: [], Drachenviereck: [] };

describe('Vierecke: independent checks', () => {
  it('Stufe 1: only Quadrat, Rechteck and Parallelogramm, in the usual position', () => {
    for (const ab of AB) {
      for (const ex of items(1, ab)) {
        if (ex.visual?.type === 'shape') {
          expect(ex.visual.rotate).toBeUndefined();
          expect(['quadrat', 'rechteck', 'parallelogramm']).toContain(ex.visual.shape);
        }
        expect(JSON.stringify(ex.answer)).not.toMatch(/Raute|Trapez|Drachen/);
      }
    }
  });

  it('Stufe 1, AB I: the figure is drawn to its labels, and the drawings differ', () => {
    const drawings = new Set<string>();
    for (const ex of items(1, 1, 400)) {
      if (ex.visual?.type !== 'figure') throw new Error('figure expected');
      const { points, sides, rightAngles } = ex.visual;
      const f = points.map((p) => [p.x, p.y] as const);
      const [a, b] = sides!.map((s) => parseInt(s!, 10));
      const l = lengths(f);
      expect(l[0] / l[1], ex.key).toBeCloseTo(a / b, 1);
      expect(rightAngles?.length ?? 0, ex.key).toBe(rightLabel(ex) === 'Parallelogramm' ? 0 : 4);
      if (rightLabel(ex) !== 'Parallelogramm') expect(angleAt(f, 0), ex.key).toBeCloseTo(Math.PI / 2, 1);
      else expect(Math.abs(angleAt(f, 0) - Math.PI / 2), ex.key).toBeGreaterThan(0.2);
      drawings.add(JSON.stringify(points));
    }
    expect(drawings.size).toBeGreaterThan(30);
  });

  it('Stufe 1, AB II: a description never says that sides opposite each other differ', () => {
    for (const ex of items(1, 2)) {
      expect(ex.prompt, ex.key).not.toMatch(/Die Seiten gegenüber sind \d/);
      if (!ex.prompt.startsWith('Alle vier Seiten')) expect(ex.prompt, ex.key).toMatch(/Je zwei Seiten gegenüber sind gleich lang: /);
    }
  });

  it('Stufe 1: the name fits the sides and the angles', () => {
    for (const ex of items(1, 2)) {
      const noRight = ex.prompt.includes('Kein Winkel');
      const allEqual = ex.prompt.startsWith('Alle vier Seiten');
      expect(rightLabel(ex)).toBe(noRight ? 'Parallelogramm' : allEqual ? 'Quadrat' : 'Rechteck');
    }
    for (const ex of items(1, 3)) {
      if (ex.answer.kind !== 'multi' || ex.visual?.type !== 'shape') throw new Error('multi and shape expected');
      const [top, right] = ex.visual.sideLabels!.map((s) => (s ? parseInt(s, 10) : null));
      expect(ex.answer.fields.map((f) => f.value)).toEqual([top, right]);
    }
  });

  it('Stufe 2: figures are turned; a Drachenviereck has two pairs of neighbouring equal sides', () => {
    for (const ex of items(2, 1)) {
      if (ex.visual?.type !== 'shape') throw new Error('shape expected');
      expect(ex.visual.rotate).toBeGreaterThan(0);
    }
    for (const ex of items(2, 3)) {
      if (ex.answer.kind !== 'multi' || ex.visual?.type !== 'figure') throw new Error('multi and figure expected');
      const [, , below, above] = ex.visual.sides!.map((s) => (s ? parseInt(s, 10) : null));
      expect(ex.answer.fields.map((f) => f.value)).toEqual([above, below]);
    }
  });

  it('Stufe 2, AB II: the sentences hold or fail as measured on examples of each figure, and there are many questions', () => {
    const questions = new Set<string>();
    for (const ex of items(2, 2, 600)) {
      const a = ex.answer as ChoiceAnswer;
      questions.add(`${ex.prompt}|${rightLabel(ex)}`);
      if (ex.key.includes(':eigenschaft:')) {
        const figure = /jede[s]? (\S+)\?/.exec(ex.prompt)![1];
        a.options.forEach((o, i) => expect(always(figure, o.label), `${ex.key}: ${o.label}`).toBe(i === a.correct));
      } else {
        const sentence = `${/Eigenschaft: (.+)\?$/.exec(ex.prompt)![1]}.`;
        a.options.forEach((o, i) => expect(always(o.label, sentence), `${ex.key}: ${o.label}`).toBe(i === a.correct));
      }
    }
    expect(questions.size).toBeGreaterThanOrEqual(25);
  });

  it('a round repeats no question: the same text, answer and drawing never come twice', () => {
    for (const stufe of [1, 2, 3] as Stufe[]) {
      for (let round = 0; round < 150; round++) {
        const recent = new Set<string>();
        const seen = new Set<string>();
        abSequence(stufe).forEach((ab, i) => {
          const ex = generateUnique(skill, stufe, round * 1009 + i * 31 + 7, { subtractionMethod: 'abziehen', ab }, recent);
          recent.add(ex.key);
          const shown = JSON.stringify([ex.prompt, ex.answer.kind === 'choice' ? rightLabel(ex) : ex.answer, ex.visual]);
          expect(seen.has(shown), `round ${round} of Stufe ${stufe}: ${ex.key} again`).toBe(false);
          seen.add(shown);
        });
      }
    }
  });

  it('the drawn Drachenviereck fits its labels, measured from its corners', () => {
    for (const ex of items(2, 3, 60)) {
      if (ex.visual?.type !== 'figure') throw new Error('figure expected');
      const p = ex.visual.points;
      const len = (i: number) => Math.hypot(p[i].x - p[(i + 1) % 4].x, p[i].y - p[(i + 1) % 4].y);
      expect(len(0)).toBeCloseTo(len(3), 0);
      expect(len(1)).toBeCloseTo(len(2), 0);
      expect(len(2) / len(3)).toBeCloseTo(parseInt(ex.visual.sides![2]!, 10) / parseInt(ex.visual.sides![3]!, 10), 1);
    }
  });

  it('Stufe 3: statements agree with the table above, and none depends on the Trapez', () => {
    for (const ex of items(3, 1)) {
      const m = /^Jede[s]? (\S+) ist auch eine? (\S+)\./.exec(ex.prompt)!;
      expect(rightLabel(ex)).toBe(ALSO[m[1]].includes(m[2]) ? 'Ja' : 'Nein');
      expect(ex.prompt).not.toContain('Trapez');
    }
    for (const ex of items(3, 2)) {
      expect(JSON.stringify(ex.answer)).not.toContain('Trapez');
      const m = /^Das ist eine? (\S+)\./.exec(ex.prompt);
      if (m) expect(ALSO[m[1]]).toContain(rightLabel(ex));
    }
  });

  it('Stufe 3: a tap on Nein at a true statement points to the property of the second figure', () => {
    const PROPERTY: Record<string, RegExp> = { Rechteck: /rechte Winkel/, Raute: /gleich lange Seiten/, Parallelogramm: /parallel/, Drachenviereck: /benachbarte Seiten/ };
    for (const ex of items(3, 1, 400)) {
      const m = /^Jede[s]? (\S+) ist auch eine? (\S+)\./.exec(ex.prompt)!;
      if (rightLabel(ex) !== 'Ja') continue;
      const nein = (ex.answer as ChoiceAnswer).options.find((o) => o.label === 'Nein')!;
      expect(nein.whyWrong, ex.key).toMatch(PROPERTY[m[2]]);
    }
  });

  it('Stufe 3, AB II: what is missing: no hint and no whyWrong states it, and each whyWrong fits its sentence', () => {
    const items3 = items(3, 2, 600).filter((ex) => ex.key.includes(':fehlt:'));
    expect(new Set(items3.map((ex) => ex.key)).size).toBe(5);
    for (const ex of items3) {
      const right = rightLabel(ex);
      const parts = right.replace(/\.$/, '').split(' und ').map((p) => p.toLowerCase());
      const said = [...ex.hints, ...(ex.answer as ChoiceAnswer).options.flatMap((o) => (o.whyWrong ? [o.whyWrong] : []))].join(' ').toLowerCase();
      for (const part of parts) expect(said, ex.key).not.toContain(part);
      expect(said, ex.key).not.toMatch(/vier rechte winkel|vier gleich lange seiten/);
      const whys = (ex.answer as ChoiceAnswer).options.flatMap((o) => (o.whyWrong ? [o.whyWrong] : []));
      expect(new Set(whys).size, ex.key).toBeGreaterThan(1);
    }
  });

  it('Stufe 3, AB III: the counterexample is of the first figure, not of the second', () => {
    for (const ex of items(3, 3)) {
      expect(rightLabel(ex)).toMatch(ex.prompt.includes('Jedes Rechteck') ? /^Rechteck/ : ex.prompt.includes('Jede Raute') ? /^Raute/ : /^Parallelogramm/);
      if (rightLabel(ex).startsWith('Rechteck')) {
        const [a, b] = [...rightLabel(ex).matchAll(/\d+/g)].map(Number);
        expect(a).not.toBe(b);
      } else expect(rightLabel(ex)).toContain('ohne rechte Winkel');
    }
  });
});
