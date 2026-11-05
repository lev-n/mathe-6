import { describe, expect, it } from 'vitest';
import { createRng } from '../../core/rng';
import { describeSkill } from '../../core/testing';
import type { Ab, ChoiceAnswer, Exercise, Stufe } from '../../core/types';
import { describeVisual, srTextWithPicture } from '../../ui/visuals/describe';
import { kreisSkill as skill } from './kreis';

describeSkill(skill, { minDistinct: { 1: 25, 2: 60, 3: 60 } });

const items = (stufe: Stufe, ab: Ab, n = 200): Exercise[] => Array.from({ length: n }, (_, i) => skill.generate(createRng(i * 337 + 19), stufe, { subtractionMethod: 'abziehen', ab }));
const AB: Ab[] = [1, 2, 3];
const lengths = (text: string) => [...text.matchAll(/(\d+(?:,\d+)?)[\s ](?:cm|m)(?![\p{L}])/gu)].map((m) => Number(m[1].replace(',', '.')));
const rightLabel = (ex: Exercise) => {
  const a = ex.answer as ChoiceAnswer;
  return a.options[a.correct].label;
};
const valueOf = (ex: Exercise) => {
  if (ex.answer.kind !== 'number' || ex.answer.value === null) throw new Error('number expected');
  return ex.answer.value;
};
const task = (ex: Exercise) => [ex.context, ex.prompt].filter(Boolean).join(' ');

describe('Kreis: independent checks', () => {
  it('Stufe 1: naming only; the drawn line is what the answer says', () => {
    for (const ab of AB) for (const ex of items(1, ab, 100)) expect(ex.answer.kind).toBe('choice');
    for (const ex of items(1, 1)) {
      if (ex.visual?.type !== 'figure' || !ex.visual.circle) throw new Error('circle expected');
      const { x, y, r } = ex.visual.circle;
      const [from, to] = ex.visual.points;
      const fromCentre = Math.hypot(from.x - x, from.y - y);
      expect(Math.hypot(to.x - x, to.y - y), ex.key).toBeCloseTo(r, 0);
      if (rightLabel(ex) === 'Durchmesser') {
        expect(fromCentre, ex.key).toBeCloseTo(r, 0);
        expect(Math.hypot(from.x + to.x - 2 * x, from.y + to.y - 2 * y), `${ex.key}: through the centre`).toBeLessThan(0.5);
      } else {
        expect(fromCentre, ex.key).toBeLessThan(0.5);
        if (rightLabel(ex) === 'Mittelpunkt') expect(ex.prompt).toContain(`Punkt ${from.label}`);
        else if (rightLabel(ex) === 'Punkt auf der Kreislinie') expect(ex.prompt).toContain(`Punkt ${to.label}`);
        else expect(rightLabel(ex)).toBe('Radius');
      }
    }
    for (const ex of items(1, 3)) {
      const [first, second] = lengths(ex.prompt);
      expect(rightLabel(ex)).toBe(second === 2 * first ? 'Durchmesser' : 'Radius');
    }
  });

  it('Stufe 1: neither the first hint nor any spoken text names the part that is asked', () => {
    for (const ab of [1, 2, 3] as Ab[]) {
      for (const ex of items(1, ab, 400)) {
        const right = rightLabel(ex);
        for (const hint of ex.hints) expect(hint, ex.key).not.toContain(right);
        const said = [srTextWithPicture(ex), ex.visual ? describeVisual(ex.visual) : ''];
        for (const text of said) expect(text, ex.key).not.toContain(right);
      }
    }
  });

  it('Stufe 1: no word of the task fits one option alone, and the voice does not say where the centre lies', () => {
    const rights = new Set<string>();
    for (const ex of items(1, 1, 600).filter((e) => e.prompt.includes('Punkt'))) {
      const options = (ex.answer as ChoiceAnswer).options.map((o) => o.label);
      expect(options.filter((o) => o.includes('punkt') || o.includes('Punkt')).length, ex.key).toBeGreaterThanOrEqual(2);
      rights.add(rightLabel(ex));
    }
    expect([...rights].sort()).toEqual(['Mittelpunkt', 'Punkt auf der Kreislinie']);
    for (const ab of [1, 2] as Ab[]) {
      for (const ex of items(1, ab, 400)) {
        expect(srTextWithPicture(ex), ex.key).not.toMatch(/Mitte\b|in der Mitte/);
        expect(ex.prompt, ex.key).not.toMatch(/(dieser Punkt|diese Linie|Wie heißt der Punkt)/);
      }
    }
  });

  it('a round sees a repeat: the direction and size of a picture are no part of the key', () => {
    for (const ex of items(1, 1, 200).concat(items(1, 2, 200))) expect(ex.key.split(':').length, ex.key).toBeLessThanOrEqual(5);
    const keyOf = new Map<string, string>();
    for (const ex of items(1, 2, 400)) {
      if (!ex.key.includes(':mass:')) continue;
      const text = `${ex.prompt} ${rightLabel(ex)}`;
      expect(keyOf.get(text) ?? ex.key, text).toBe(ex.key);
      keyOf.set(text, ex.key);
    }
  });

  it('Stufe 1: the drawings differ: directions, sizes, and names of a part', () => {
    const drawings = new Set<string>();
    const directions = new Set<number>();
    const named = new Set<string>();
    for (const ex of items(1, 1, 400)) {
      if (ex.visual?.type !== 'figure' || !ex.visual.circle) throw new Error('circle expected');
      drawings.add(JSON.stringify(ex.visual));
      const [from, to] = ex.visual.points;
      directions.add(Math.round((Math.atan2(to.y - from.y, to.x - from.x) * 180) / Math.PI));
      named.add(/(Strecke|Punkt) (\S+)\?/.exec(ex.prompt)![2]);
    }
    expect(drawings.size).toBeGreaterThan(100);
    expect(directions.size).toBeGreaterThan(5);
    expect(named.size).toBeGreaterThan(10);
  });

  it('Stufe 2: r and d, one is twice the other; decimals appear at AB II', () => {
    let decimals = 0;
    for (const ab of [1, 2] as Ab[]) {
      for (const ex of items(2, ab)) {
        const [given] = lengths(task(ex));
        const value = valueOf(ex);
        const asksRadius = ex.prompt.includes('Wie lang ist der Radius');
        expect(value).toBeCloseTo(asksRadius ? given / 2 : given * 2, 6);
        if (!Number.isInteger(value) || !Number.isInteger(given)) decimals++;
      }
    }
    expect(decimals).toBeGreaterThan(50);
    for (const ex of items(2, 3)) {
      const [r, d] = lengths(ex.prompt);
      expect(valueOf(ex)).toBeCloseTo(d - 2 * r, 6);
      expect(valueOf(ex)).toBeGreaterThan(0);
    }
  });

  it('every number field of the skill has the comma key, every bug fits one decimal', () => {
    expect(skill.keys).toEqual({ comma: true });
    for (const stufe of [2, 3] as Stufe[]) {
      for (const ab of AB) {
        for (const ex of items(stufe, ab, 100)) {
          if (ex.answer.kind === 'number') expect(ex.answer.decimals, ex.key).toBe(1);
          for (const b of ex.bugs ?? []) expect(Number.isInteger(Math.round((b.match as number) * 1000) / 100), ex.key).toBe(true);
        }
      }
    }
  });

  it('Stufe 3: where a point lies depends on the radius, also when the diameter is given', () => {
    for (const ex of items(3, 1)) {
      const [size, dist] = lengths(ex.prompt);
      const r = ex.prompt.includes('Durchmesser') ? size / 2 : size;
      expect(rightLabel(ex)).toBe(dist < r ? 'innerhalb des Kreises' : dist === r ? 'auf der Kreislinie' : 'außerhalb des Kreises');
    }
  });

  it('Stufe 3: touching circles, recomputed', () => {
    for (const ex of items(3, 2)) {
      const [a, b] = lengths(ex.prompt);
      expect(valueOf(ex)).toBeCloseTo(a + b, 6);
    }
    for (const ex of items(3, 3)) {
      const numbers = lengths(task(ex));
      if (ex.key.includes(':reihe:')) expect(valueOf(ex)).toBeCloseTo(numbers[0] / 6, 6);
      else if (ex.key.includes(':anderer:')) expect(valueOf(ex)).toBeCloseTo(numbers[0] - numbers[1], 6);
      else expect(valueOf(ex)).toBeCloseTo(numbers[1] - numbers[0], 6);
      expect(valueOf(ex)).toBeGreaterThan(0);
    }
  });
});
