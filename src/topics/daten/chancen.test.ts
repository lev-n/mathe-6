import { describe, expect, it } from 'vitest';
import { describeSkill } from '../../core/testing';
import type { Exercise, Visual } from '../../core/types';
import { chancenSkill } from './chancen';
import { atAb, chosen, formOf, giveaways, keyClashes, picturesNotSaid, pluralSlips, speechSlips } from './testHelpers';

describeSkill(chancenSkill, { minDistinct: 40 });

/** The share of the winning colour in a bag or on a spinner, as [hits, all]. */
function shareOf(v: Visual | undefined, winning: string): [number, number] {
  if (v?.type === 'bag') return [v.balls.find((b) => b.color === winning)!.count, v.balls.reduce((n, b) => n + b.count, 0)];
  if (v?.type === 'spinner') return [v.sectors.filter((s) => s === winning).length, v.sectors.length];
  throw new Error('bag or spinner expected');
}

const winningOf = (ex: Exercise) => ex.key.split(':')[3];
const fraction = (ex: Exercise) => {
  if (ex.answer.kind !== 'fraction') throw new Error('fraction expected');
  return ex.answer;
};
const same = (a: number, b: number, c: number, d: number) => a * d === c * b;

describe('daten.chancen', () => {
  it('Stufe 1: the better chance recomputes, and no text talks of money', () => {
    for (const ab of [1, 2, 3] as const) {
      for (const ex of atAb(chancenSkill, 1, ab)) {
        if (ex.answer.kind !== 'choice') throw new Error('choice expected');
        expect(`${ex.context} ${ex.prompt}`).not.toMatch(/€|Euro|Geld|Einsatz|Preis/);
        const win = winningOf(ex);
        const pictures = ex.answer.options.filter((o) => o.visual);
        const [[a, s], [b, t]] = pictures.map((o) => shareOf(o.visual, win));
        const cmp = a * t - b * s;
        const expected = cmp === 0 ? 'Beide gleich' : cmp > 0 ? pictures[0].label : pictures[1].label;
        expect(chosen(ex).label).toBe(expected);
        if (ab === 1) expect(s).toBe(t);
      }
    }
  });

  it('Stufe 1: "Beide gleich" stands at every item and is sometimes right, at every AB', () => {
    for (const ab of [1, 2, 3] as const) {
      const items = atAb(chancenSkill, 1, ab, 400);
      for (const ex of items) {
        if (ex.answer.kind !== 'choice') throw new Error('choice expected');
        expect(ex.answer.options.map((o) => o.label), ex.key).toContain('Beide gleich');
      }
      const right = items.filter((ex) => chosen(ex).label === 'Beide gleich').length;
      expect(right, `AB ${ab}`).toBeGreaterThan(items.length * 0.15);
      expect(right, `AB ${ab}`).toBeLessThan(items.length * 0.4);
      for (const form of new Set(items.map(formOf))) {
        const ofForm = items.filter((ex) => formOf(ex) === form);
        expect(ofForm.filter((ex) => chosen(ex).label === 'Beide gleich').length, `AB ${ab}, ${form}`).toBeLessThan(ofForm.length * 0.5);
      }
    }
  });

  it('every comparison of fractions with different Nenner shows them on a common Nenner', () => {
    const items = [...[1, 2, 3].flatMap((ab) => atAb(chancenSkill, 1, ab as 1 | 2 | 3)), ...atAb(chancenSkill, 2, 3).filter((ex) => formOf(ex) === 'spieler')];
    for (const ex of items) {
      const nenner = (step: unknown) => [...String(step).matchAll(/\{frac:\d+\/(\d+)\}/g)].map((m) => m[1]);
      const [s, t] = nenner(ex.steps[0]);
      if (s === t) continue;
      const line = ex.steps.find((step) => String(step).startsWith('Gleicher Nenner'));
      expect(line, ex.key).toBeTruthy();
      const [d1, d2] = nenner(line);
      expect(d1, ex.key).toBe(d2);
    }
  });

  it('the common Nenner stays in reach: 24 at Stufe 1, the Hauptnenner of Stufe 3 in the fractions topic, and 100 for two players', () => {
    const nennerOf = (ex: Exercise) => [...ex.steps.map(String).filter((step) => step.startsWith('Gleicher Nenner')).join(' ').matchAll(/\{frac:\d+\/(\d+)\}/g)].map((m) => Number(m[1]));
    for (const ab of [1, 2, 3] as const) {
      for (const ex of atAb(chancenSkill, 1, ab, 800)) for (const n of nennerOf(ex)) expect(n, ex.key).toBeLessThanOrEqual(24);
    }
    const players = atAb(chancenSkill, 2, 3, 800).filter((ex) => formOf(ex) === 'spieler');
    expect(players.length).toBeGreaterThan(200);
    for (const ex of players) for (const n of nennerOf(ex)) expect(n, ex.key).toBeLessThanOrEqual(100);
  });

  it('Stufe 1, AB III: both Nenner have to change, and "Beide gleich" can still be right', () => {
    const bags = atAb(chancenSkill, 1, 3, 800).filter((ex) => formOf(ex) === 'saeckchen');
    expect(bags.length).toBeGreaterThan(200);
    for (const ex of bags) {
      const [, , , , a, b] = ex.key.split(':');
      const [s, t] = [Number(a.split('/')[1]), Number(b.split('/')[1])];
      expect(s % t !== 0 && t % s !== 0, ex.key).toBe(true);
    }
    expect(bags.some((ex) => chosen(ex).label === 'Beide gleich')).toBe(true);
  });

  it('Stufe 2: a task that asks for kürzen has a share that can be shortened', () => {
    const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
    for (const ex of atAb(chancenSkill, 2, 2, 400)) {
      if (ex.visual?.type !== 'tally') throw new Error('tally expected');
      const eye = Number(/der (\d) als/.exec(ex.prompt)![1]);
      const total = ex.visual.rows.reduce((n, r) => n + r.count, 0);
      expect(gcd(ex.visual.rows[eye - 1].count, total), ex.key).toBeGreaterThan(1);
    }
    for (const ex of atAb(chancenSkill, 2, 3, 400)) {
      if (formOf(ex) !== 'ereignis' || ex.visual?.type !== 'table') continue;
      const counts = ex.visual.rows.map((r) => Number(r[1]));
      const n = ex.context!.includes('gerade') ? counts[1] + counts[3] + counts[5] : counts[4] + counts[5];
      expect(gcd(n, counts.reduce((a, b) => a + b, 0)), ex.key).toBeGreaterThan(1);
    }
  });

  it('Stufe 2: the chance in advance is the true one for the asked event', () => {
    for (const ex of atAb(chancenSkill, 2, 3, 400)) {
      if (formOf(ex) !== 'ereignis') continue;
      const bug = ex.bugs?.find((b) => b.hint.startsWith('Das ist die Chance im Voraus'));
      if (!bug) continue;
      const m = bug.match as { numerator: number; denominator: number };
      expect(m.numerator * (ex.context!.includes('gerade') ? 2 : 3), ex.key).toBe(m.denominator);
    }
    const single = atAb(chancenSkill, 2, 2, 100).flatMap((ex) => ex.bugs ?? []).filter((b) => b.id === 'erwartung-sechstel');
    expect(single.length).toBeGreaterThan(0);
  });

  it('the screen-reader text holds the data of the picture, and no form gives its answer away', () => {
    expect(picturesNotSaid(chancenSkill)).toEqual([]);
    expect(giveaways(chancenSkill)).toEqual([]);
  });

  it('one key is one task, a count of 1 has no plural, and every spoken part is closed by one mark', () => {
    expect(keyClashes(chancenSkill)).toEqual([]);
    expect(pluralSlips(chancenSkill)).toEqual([]);
    expect(speechSlips(chancenSkill)).toEqual([]);
  });

  it('Stufe 2: the relative frequency recomputes from the rolls', () => {
    for (const ex of atAb(chancenSkill, 2, 1)) {
      if (ex.visual?.type !== 'dice') throw new Error('dice expected');
      const eye = Number(/der (\d) als/.exec(ex.prompt)![1]);
      const n = ex.visual.values.filter((v) => v === eye).length;
      const a = fraction(ex);
      expect(same(a.numerator, a.denominator, n, ex.visual.values.length)).toBe(true);
    }
    for (const ex of atAb(chancenSkill, 2, 2)) {
      if (ex.visual?.type !== 'tally') throw new Error('tally expected');
      const eye = Number(/der (\d) als/.exec(ex.prompt)![1]);
      const total = ex.visual.rows.reduce((n, r) => n + r.count, 0);
      const a = fraction(ex);
      expect(a.accept).toBe('lowest');
      expect(same(a.numerator, a.denominator, ex.visual.rows[eye - 1].count, total)).toBe(true);
    }
  });

  it('Stufe 2, AB III: events and the comparison of two players', () => {
    const forms = new Set<string>();
    for (const ex of atAb(chancenSkill, 2, 3)) {
      forms.add(formOf(ex));
      if (formOf(ex) === 'ereignis') {
        if (ex.visual?.type !== 'table') throw new Error('table expected');
        const counts = ex.visual.rows.map((r) => Number(r[1]));
        expect(counts.length).toBe(6);
        const total = counts.reduce((a, b) => a + b, 0);
        const n = ex.context!.includes('gerade') ? counts[1] + counts[3] + counts[5] : counts[4] + counts[5];
        const a = fraction(ex);
        expect(same(a.numerator, a.denominator, n, total)).toBe(true);
      } else {
        const sentence = [...ex.context!.matchAll(/(\p{L}+) würfelt (\d+)-mal und hat (\d+)-mal/gu)].map((m) => ({ name: m[1], t: Number(m[2]), n: Number(m[3]) }));
        expect(sentence.length).toBe(2);
        const [a, b] = sentence;
        expect(a.n).toBeLessThanOrEqual(a.t);
        expect(b.n).toBeLessThanOrEqual(b.t);
        expect(chosen(ex).label).toBe(a.n * b.t === b.n * a.t ? 'Beide gleich' : a.n * b.t > b.n * a.t ? a.name : b.name);
      }
    }
    expect(forms).toEqual(new Set(['ereignis', 'spieler']));
  });

  it('Stufe 3: after the change the bag has the asked chance', () => {
    for (const ex of atAb(chancenSkill, 3, 1)) {
      const [hits, all] = shareOf(ex.visual, winningOf(ex));
      const added = Number(/Du legst (\d+)/.exec(ex.context!)![1]);
      const a = fraction(ex);
      expect(same(a.numerator, a.denominator, hits + added, all + added)).toBe(true);
    }
    const goal = (ex: Exercise) => {
      const m = /\{frac:(\d+)\/(\d+)\}/.exec(ex.context!)!;
      return [Number(m[1]), Number(m[2])];
    };
    for (const ex of atAb(chancenSkill, 3, 2)) {
      const [p, q] = goal(ex);
      const [hits, all] = shareOf(ex.visual, winningOf(ex));
      const k = Number(/^(\d+)/.exec(chosen(ex).label)![1]);
      if (formOf(ex) === 'ziel') expect(same(hits, all + k, p, q)).toBe(true);
      else expect(same(hits + k, all, p, q)).toBe(true);
    }
    for (const ex of atAb(chancenSkill, 3, 3)) {
      if (ex.answer.kind !== 'choice') throw new Error('choice expected');
      const [p, q] = goal(ex);
      const [hits, all] = shareOf(ex.visual, winningOf(ex));
      const isWin = (label: string) => new RegExp(`^\\d+ ${{ rot: 'rote', blau: 'blaue', gelb: 'gelbe', gruen: 'grüne' }[winningOf(ex)]}`).test(label);
      const after = (label: string): [number, number] => {
        const k = Number(/^(\d+)/.exec(label)![1]);
        const sign = label.includes('dazulegen') ? 1 : -1;
        return [hits + (isWin(label) ? sign * k : 0), all + sign * k];
      };
      for (const o of ex.answer.options) {
        const [x, y] = after(o.label);
        expect(same(x, y, p, q), `${ex.key}: ${o.label}`).toBe(o === chosen(ex));
      }
    }
  });

  it('bag and wheel stay inside the limits of the pictures', () => {
    for (const ab of [1, 2, 3] as const) {
      for (const stufe of [1, 3] as const) {
        for (const ex of atAb(chancenSkill, stufe, ab, 100)) {
          if (ex.visual?.type === 'bag') expect(ex.visual.balls.reduce((n, b) => n + b.count, 0)).toBeLessThanOrEqual(20);
          if (ex.visual?.type === 'spinner') expect(ex.visual.sectors.length).toBeLessThanOrEqual(12);
        }
      }
    }
  });
});
