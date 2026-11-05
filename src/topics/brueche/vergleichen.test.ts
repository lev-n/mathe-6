import { describe, expect, it } from 'vitest';
import { describeSkill } from '../../core/testing';
import { compareFrac, gcd, type Frac } from './helpers';
import { ABS_ALL, STUFEN_ALL, expectSoundItems, formOf, fractionsIn, items } from './test-helpers';
import { vergleichenSkill } from './vergleichen';

describeSkill(vergleichenSkill);

/** How often comparing a single number of the fractions gets the sign right: the larger Zähler or Nenner taken as the larger fraction (research §5). */
function shortcutShares(samples: readonly { expression?: string }[]) {
  const pairs = samples.filter((e) => e.expression).map((e) => fractionsIn(e.expression!) as Frac[]);
  const share = (at: 0 | 1) => pairs.filter(([a, b]) => Math.sign(a[at] - b[at]) === Math.sign(compareFrac(a, b))).length / pairs.length;
  return { zaehler: share(0), nenner: share(1) };
}

describe('brueche.vergleichen specifics', () => {
  it('worked steps calculate, and a task has one key', () => expectSoundItems(vergleichenSkill));

  it('every sign recomputes by cross-multiplication', () => {
    for (const stufe of STUFEN_ALL) {
      for (const ab of ABS_ALL) {
        for (const ex of items(vergleichenSkill, stufe, ab)) {
          if (ex.answer.kind !== 'choice' || !ex.expression) continue;
          const [a, b] = fractionsIn(ex.expression);
          const cmp = compareFrac(a, b);
          expect(ex.answer.options[ex.answer.correct].label, ex.key).toBe(cmp < 0 ? '<' : cmp > 0 ? '>' : '=');
        }
      }
    }
  });

  it('every order recomputes, with no two items of equal value', () => {
    for (const stufe of STUFEN_ALL) {
      for (const ab of ABS_ALL) {
        for (const ex of items(vergleichenSkill, stufe, ab)) {
          if (ex.answer.kind !== 'order') continue;
          const values = ex.answer.items.map((i) => fractionsIn(i)[0] as Frac);
          const ordered = ex.answer.correct.map((i) => values[i]);
          for (let i = 1; i < ordered.length; i++) {
            const cmp = compareFrac(ordered[i - 1], ordered[i]);
            if (ex.answer.direction === 'aufsteigend') expect(cmp, ex.key).toBeLessThan(0);
            else expect(cmp, ex.key).toBeGreaterThan(0);
          }
        }
      }
    }
  });

  it('Stufe 1: same Nenner or same Zähler', () => {
    for (const ex of [...items(vergleichenSkill, 1, 1), ...items(vergleichenSkill, 1, 2)]) {
      const [a, b] = fractionsIn(ex.expression!);
      expect(a[0] === b[0] || a[1] === b[1], ex.key).toBe(true);
    }
  });

  it('Stufe 1, same Zähler: no bars in the task to read the sign from, and the worked steps show them', () => {
    for (const ex of items(vergleichenSkill, 1, 2)) {
      expect(ex.visual, ex.key).toBeUndefined();
      expect(ex.steps.some((s) => typeof s !== 'string' && s.visual?.type === 'fractionModel'), ex.key).toBe(true);
    }
  });

  it('Stufe 2, order three: every Zähler differs, or the rule of Stufe 1 does the work', () => {
    for (const ex of items(vergleichenSkill, 2, 3, 800)) {
      if (ex.answer.kind !== 'order') throw new Error('order');
      const zaehler = ex.answer.items.map((i) => fractionsIn(i)[0][0]);
      expect(new Set(zaehler).size, ex.key).toBe(zaehler.length);
    }
  });

  it('Stufe 3, either side of 1/2: neither the larger Nenner nor the larger Zähler alone gets the sign right as a rule', () => {
    const sides = items(vergleichenSkill, 3, 1, 1600).filter((e) => formOf(e) === 'beide-seiten');
    expect(sides.length).toBeGreaterThan(400);
    const { zaehler, nenner } = shortcutShares(sides);
    expect(nenner).toBeLessThan(0.5);
    expect(zaehler).toBeLessThan(0.7);
    expect(1 - nenner, 'the opposite rule does not work as a rule either').toBeLessThan(0.7);
  });

  it.each([1, 2] as const)('Stufe 3, AB %i: the shortcuts succeed less often than at Stufe 2 of the same AB', (ab) => {
    const low = shortcutShares(items(vergleichenSkill, 2, ab, 1600));
    const high = shortcutShares(items(vergleichenSkill, 3, ab, 1600));
    expect(high.zaehler).toBeLessThan(low.zaehler);
    expect(high.nenner).toBeLessThan(low.nenner);
  });

  it('Stufe 2: one Nenner divides the other, up to 20', () => {
    for (const ab of [1, 2] as const) {
      for (const ex of items(vergleichenSkill, 2, ab)) {
        const [a, b] = fractionsIn(ex.expression!);
        const [low, high] = [Math.min(a[1], b[1]), Math.max(a[1], b[1])];
        expect(high % low, ex.key).toBe(0);
        expect(high).toBeLessThanOrEqual(20);
        expect(low).toBeLessThan(high);
        expect(a[0], `${ex.key}: the same Zähler is Stufe 1`).not.toBe(b[0]);
      }
    }
  });

  it('Stufe 2, order three: the Nenner are multiples of each other, up to 20', () => {
    for (const ex of items(vergleichenSkill, 2, 3, 600)) {
      if (ex.answer.kind !== 'order') throw new Error('order');
      const nenner = ex.answer.items.map((i) => fractionsIn(i)[0][1]).sort((x, y) => x - y);
      expect(nenner[2]).toBeLessThanOrEqual(20);
      expect(nenner[1] % nenner[0], ex.key).toBe(0);
      expect(nenner[2] % nenner[1], ex.key).toBe(0);
    }
  });

  it('Stufe 3 never serves a task of a lower Stufe: no same Zähler, no Nenner that is a multiple of the other', () => {
    const shown = (ex: { expression?: string }) => fractionsIn(ex.expression!).map((f) => f.join('/')).sort().join(' ');
    const lower = new Set([1, 2].flatMap((s) => ABS_ALL.flatMap((ab) => items(vergleichenSkill, s as 1 | 2, ab, 800).filter((e) => e.expression).map(shown))));
    for (const ab of [1, 2] as const) {
      for (const ex of items(vergleichenSkill, 3, ab, 800)) {
        const [a, b] = fractionsIn(ex.expression!);
        expect(a[0], ex.key).not.toBe(b[0]);
        expect(a[1] % b[1] === 0 || b[1] % a[1] === 0, ex.key).toBe(false);
        expect(lower.has(shown(ex)), ex.key).toBe(false);
      }
    }
  });

  it('Stufe 3: compared with 1/2 or unrelated Nenner up to 12; four to order', () => {
    for (const ex of items(vergleichenSkill, 3, 2).filter((e) => formOf(e) === 'fremd')) {
      const [a, b] = fractionsIn(ex.expression!);
      expect(Math.max(a[1], b[1])).toBeLessThanOrEqual(12);
      expect(gcd(a[1], b[1]), ex.key).toBeLessThan(Math.min(a[1], b[1]));
    }
    for (const ex of items(vergleichenSkill, 3, 3)) expect((ex.answer as { items: string[] }).items.length).toBe(4);
  });

  it('the story names the one who has more', () => {
    for (const ex of items(vergleichenSkill, 1, 3).filter((e) => formOf(e) === 'text')) {
      if (ex.answer.kind !== 'choice') throw new Error('choice');
      const [a, b] = fractionsIn(ex.context!);
      const names = ex.context!.split(/\s/).filter((w) => ex.answer.kind === 'choice' && ex.answer.options.some((o) => o.label === w));
      expect(ex.answer.options[ex.answer.correct].label).toBe(compareFrac(a, b) > 0 ? names[0] : names[1]);
    }
  });
});
