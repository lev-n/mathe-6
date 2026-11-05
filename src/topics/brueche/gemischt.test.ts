import { describe, expect, it } from 'vitest';
import { checkAnswer, correctResponse } from '../../core/check';
import { describeSkill } from '../../core/testing';
import { compareFrac, gcd, lcm, type Frac } from './helpers';
import { gemischtSkill } from './gemischt';
import { srTextWithPicture } from '../../ui/visuals/describe';
import { ABS_ALL, STUFEN_ALL, expectAnswerFollowsNumbers, expectSoundItems, formOf, fractionsIn, items, sameValue, valueOf } from './test-helpers';

describeSkill(gemischtSkill);

const all = () => STUFEN_ALL.flatMap((s) => ABS_ALL.flatMap((ab) => items(gemischtSkill, s, ab)));

describe('brueche.gemischt specifics', () => {
  it('Stufe 2 stays inside its Nenner up to 10, at every AB', () => {
    for (const ab of ABS_ALL) {
      for (const ex of items(gemischtSkill, 2, ab, 400)) {
        for (const [, d] of fractionsIn(`${ex.prompt} ${ex.expression ?? ''}`)) expect(d, ex.key).toBeLessThanOrEqual(10);
      }
    }
  });

  it('worked steps calculate, and a task has one key', () => expectSoundItems(gemischtSkill));

  it('a conversion keeps the value and ends in the asked form, and the Ganze field is really used', () => {
    let usedWhole = 0;
    for (const ex of all()) {
      if (ex.answer.kind !== 'fraction') continue;
      expect(ex.answer.allowMixed, ex.key).toBe(true);
      expect(ex.answer.accept, ex.key).toBe('exact');
      if (/gemischte Zahl/.test(ex.prompt)) {
        usedWhole++;
        expect(ex.answer.whole, ex.key).toBeGreaterThan(0);
        expect(ex.answer.numerator).toBeLessThan(ex.answer.denominator);
        expect(gcd(ex.answer.numerator, ex.answer.denominator)).toBe(1);
      }
      if (/unechten Bruch/.test(ex.prompt)) {
        expect(ex.answer.whole, ex.key).toBeUndefined();
        expect(ex.answer.numerator).toBeGreaterThan(ex.answer.denominator);
      }
      if (/^Schreibe/.test(ex.prompt)) {
        const [given] = fractionsIn(ex.prompt);
        expect(sameValue(valueOf(ex.answer), given), ex.key).toBe(true);
      }
    }
    expect(usedWhole).toBeGreaterThan(100);
  });

  it('a child who types the Ganze gets it; the other form of the right value is not correct, and it gets a hint', () => {
    for (const ex of items(gemischtSkill, 2, 1)) {
      if (ex.answer.kind !== 'fraction') throw new Error('fraction');
      const response = correctResponse(ex.answer);
      expect(response).toMatchObject({ whole: String(ex.answer.whole) });
      expect(checkAnswer(ex.answer, response, ex.bugs).correct).toBe(true);
      const [total, d] = valueOf(ex.answer);
      const other = checkAnswer(ex.answer, { kind: 'fraction', numerator: String(total), denominator: String(d) }, ex.bugs);
      expect(other.correct).toBe(false);
      expect(other.bugHint).toMatch(/Ganze/);
    }
  });

  it('Stufe 1: to an unechter Bruch at AB I, the circles in the worked steps and not in the task', () => {
    for (const ex of items(gemischtSkill, 1, 1)) {
      expect(ex.visual, ex.key).toBeUndefined();
      const step = ex.steps[0];
      if (typeof step === 'string' || step.visual?.type !== 'fractionModel') throw new Error('picture');
      expect([2, 3, 4]).toContain(step.visual.parts);
      expect(valueOf(ex.answer)).toEqual([step.visual.filled, step.visual.parts]);
    }
  });

  it('what a screen reader says never gives the Zähler of an unechter Bruch, and a drawn circle is not called a Ganzes', () => {
    for (const ex of items(gemischtSkill, 1, 1)) {
      const said = srTextWithPicture(ex);
      expect(said, ex.key).not.toMatch(/gefärbt/);
    }
    for (const ex of items(gemischtSkill, 1, 2).filter((e) => formOf(e) === 'kreise')) {
      const said = srTextWithPicture(ex);
      expect(said, ex.key).not.toMatch(/Ganze als Kreis/);
      expect(said, ex.key).toMatch(/\d+ Kreise mit je \d+ Teilen/);
    }
  });

  it('judging a conversion: the numbers decide which sentence fits, and the Ganze are said with the right case', () => {
    expectAnswerFollowsNumbers(items(gemischtSkill, 1, 3, 600).filter((e) => formOf(e) === 'fehler'), 10);
    const slips = items(gemischtSkill, 2, 3, 600).filter((e) => formOf(e) === 'fehler-ganze');
    expectAnswerFollowsNumbers(slips, 3);
    for (const ex of slips) {
      if (ex.answer.kind !== 'choice') throw new Error('choice');
      const [given, written] = fractionsIn(ex.context!);
      const [, n, d] = /\{frac:\d+ (\d+)\/(\d+)\}/.exec(ex.context!)!.map(Number);
      const want = !sameValue(given, written) ? 'Der Wert hat sich geändert.' : n >= d ? 'Im Bruch steckt noch ein Ganzes.' : 'Alles stimmt.';
      expect(ex.answer.options[ex.answer.correct].label, ex.key).toBe(want);
    }
    for (const ex of items(gemischtSkill, 1, 3, 600)) {
      for (const h of ex.answer.kind === 'choice' ? ex.answer.options.flatMap((o) => o.whyWrong ?? []) : []) expect(h, ex.key).not.toMatch(/zählt in (Halbe|\p{L}+tel)\./u);
    }
  });

  it('Stufe 2 and 3 keep to their Stufe: no times-table fact at Stufe 2, an unechter Bruch to place at Stufe 3', () => {
    for (const ab of ABS_ALL) for (const ex of items(gemischtSkill, 2, ab)) expect(ex.answer.kind, ex.key).not.toBe('number');
    for (const ab of ABS_ALL) {
      for (const ex of items(gemischtSkill, 3, ab).filter((e) => e.answer.kind === 'numberline')) {
        const [[n, d]] = fractionsIn(ex.prompt);
        expect(ex.prompt, ex.key).not.toMatch(/\{frac:\d+ /);
        expect(n, ex.key).toBeGreaterThan(d);
        expect(ex.srText, ex.key).toMatch(/Zahlenstrahl von 0 bis 4 mit \d+ gleichen Abschnitten\./);
      }
    }
  });

  it('Stufe 2: Nenner up to 10', () => {
    for (const ex of [...items(gemischtSkill, 2, 1), ...items(gemischtSkill, 2, 2)]) {
      for (const [, d] of fractionsIn(ex.prompt)) expect(d).toBeLessThanOrEqual(10);
    }
  });

  it('Stufe 3: an order recomputes and mixes both forms; the line runs from 0 to 4', () => {
    for (const ab of ABS_ALL) {
      for (const ex of items(gemischtSkill, 3, ab)) {
        if (ex.answer.kind === 'order') {
          const values = ex.answer.items.map((i) => fractionsIn(i)[0] as Frac);
          const ordered = ex.answer.correct.map((i) => values[i]);
          for (let i = 1; i < ordered.length; i++) {
            const cmp = compareFrac(ordered[i - 1], ordered[i]);
            expect(ex.answer.direction === 'aufsteigend' ? cmp < 0 : cmp > 0, ex.key).toBe(true);
          }
          expect(ex.answer.items.some((i) => /\{frac:\d+ /.test(i)), ex.key).toBe(true);
          expect(ex.answer.items.some((i) => /\{frac:\d+\//.test(i)), ex.key).toBe(true);
        }
        if (ex.answer.kind === 'numberline') {
          expect(ex.answer.max).toBe(4 * ex.answer.denominator!);
          expect(ex.answer.labelFormat).toBe('mixed');
          const [[n, d]] = fractionsIn(ex.prompt);
          expect(ex.answer.value * d).toBe(n * ex.answer.denominator!);
        }
      }
    }
  });

  it('Stufe 3, placing: never a Bruch a child reaches by counting a few ticks from 0; AB III is more than AB I with fewer labels', () => {
    const placed = (ab: 1 | 3) => items(gemischtSkill, 3, ab, 400).filter((e) => e.answer.kind === 'numberline');
    expect(placed(1).length).toBeGreaterThan(50);
    for (const ex of placed(1)) {
      if (ex.answer.kind !== 'numberline') throw new Error('line');
      const [[n, d]] = fractionsIn(ex.prompt);
      expect(d, ex.key).toBe(ex.answer.denominator);
      expect(n, `${ex.key}: 2 Ganze or more`).toBeGreaterThan(2 * d);
    }
    expect(placed(3).length).toBeGreaterThan(50);
    for (const ex of placed(3)) {
      if (ex.answer.kind !== 'numberline') throw new Error('line');
      const [[, d]] = fractionsIn(ex.prompt);
      expect(d, `${ex.key}: no tick for this Nenner`).toBeGreaterThan(ex.answer.denominator!);
      expect(d % ex.answer.denominator!, ex.key).toBe(0);
      expect(ex.answer.labels, ex.key).toEqual([0, ex.answer.max]);
    }
  });

  it('Stufe 3, an order: the steps follow the hint, no Nenner above 24, nothing equal to itself, each on one line', () => {
    const stepWidth = (text: string) => text.replace(/\{frac:([^}]*)\}/g, '$1').length;
    const sets = new Set<string>();
    for (const ab of ABS_ALL) {
      for (const ex of items(gemischtSkill, 3, ab, 400).filter((e) => e.answer.kind === 'order')) {
        if (ex.answer.kind !== 'order') throw new Error('order');
        const nenner = ex.answer.items.map((i) => fractionsIn(i)[0][1]);
        expect(nenner.reduce(lcm, 1), ex.key).toBeLessThanOrEqual(24);
        if (ab === 3) sets.add([...new Set(nenner)].sort((x, y) => x - y).join());
        for (const step of ex.steps) {
          const text = typeof step === 'string' ? step : step.text;
          expect(stepWidth(text), `${ex.key}: ${text}`).toBeLessThanOrEqual(52);
          for (const part of text.split('; ')) {
            const sides = part.split(' = ');
            expect(sides.length === 2 && sides[0] === sides[1], `${ex.key}: ${text}`).toBe(false);
          }
        }
      }
    }
    expect(sets.size, 'AB III is not always the same four Nenner').toBeGreaterThan(5);
  });

  it('reading an arrow: the mark recomputes', () => {
    for (const ex of items(gemischtSkill, 3, 2).filter((e) => formOf(e) === 'lesen')) {
      if (ex.visual?.type !== 'numberLine') throw new Error('line');
      expect(sameValue(valueOf(ex.answer), [ex.visual.marks![0].value, ex.visual.denominator!])).toBe(true);
    }
  });
});
