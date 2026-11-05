import { describe, expect, it } from 'vitest';
import { describeSkill } from '../../core/testing';
import { erweiternKuerzenSkill } from './erweitern-kuerzen';
import { gcd } from './helpers';
import { expectAnswerFollowsNumbers, expectSoundItems, formOf, fractionsIn, items, sameValue, valueOf, wholeNumbersIn } from './test-helpers';

describeSkill(erweiternKuerzenSkill);

describe('brueche.erweitern-kuerzen specifics', () => {
  it('worked steps calculate, and a task has one key', () => expectSoundItems(erweiternKuerzenSkill));

  it('Stufe 1: factor 2, 3 or 5, and the result recomputes, Nenner up to 20', () => {
    for (const ex of [...items(erweiternKuerzenSkill, 1, 1), ...items(erweiternKuerzenSkill, 1, 2).filter((e) => formOf(e) === 'kuerzen')]) {
      const [[n, d]] = fractionsIn(ex.prompt);
      const k = wholeNumbersIn(ex.prompt).at(-1)!;
      expect([2, 3, 5]).toContain(k);
      expect(valueOf(ex.answer)).toEqual(formOf(ex) === 'erweitern' ? [n * k, d * k] : [n / k, d / k]);
      expect(Math.max(d, valueOf(ex.answer)[1])).toBeLessThanOrEqual(20);
    }
  });

  it('Stufe 1: the second bar shows the same value', () => {
    for (const ex of items(erweiternKuerzenSkill, 1, 2).filter((e) => formOf(e) === 'streifen')) {
      if (ex.visual?.type !== 'fractionModel' || !ex.visual.compare) throw new Error('two bars');
      expect(sameValue([ex.visual.filled, ex.visual.parts], [ex.visual.compare.filled, ex.visual.compare.parts])).toBe(true);
    }
  });

  it('Stufe 2: the factor recomputes, and fully shortened means lowest terms, Nenner up to 60', () => {
    for (const ex of items(erweiternKuerzenSkill, 2, 1)) {
      const [[a, b], [c, d]] = fractionsIn(ex.expression!);
      expect((ex.answer as { value: number }).value).toBe(Math.max(b, d) / Math.min(b, d));
      expect(a * d).toBe(c * b);
      expect(Math.max(b, d)).toBeLessThanOrEqual(60);
    }
    for (const ex of items(erweiternKuerzenSkill, 2, 2)) {
      const [[n, d]] = fractionsIn(ex.prompt);
      const value = valueOf(ex.answer);
      expect(d).toBeLessThanOrEqual(60);
      expect(sameValue(value, [n, d])).toBe(true);
      expect(gcd(value[0], value[1])).toBe(1);
      expect((ex.answer as { accept: string }).accept).toBe('lowest');
    }
  });

  it('Stufe 2: the largest factor is the ggT', () => {
    for (const ex of items(erweiternKuerzenSkill, 2, 3).filter((e) => formOf(e) === 'groesste')) {
      const [[n, d]] = fractionsIn(ex.prompt);
      expect((ex.answer as { value: number }).value).toBe(gcd(n, d));
    }
  });

  it('Stufe 2: the factor to find stands nowhere in the task, so it cannot be copied', () => {
    for (const ex of items(erweiternKuerzenSkill, 2, 1, 600)) expect(fractionsIn(ex.expression!).flat(), ex.key).not.toContain((ex.answer as { value: number }).value);
    const largest = items(erweiternKuerzenSkill, 2, 3, 600).filter((e) => formOf(e) === 'groesste');
    expect(largest.length).toBeGreaterThan(100);
    for (const ex of largest) expect(fractionsIn(ex.prompt).flat(), ex.key).not.toContain((ex.answer as { value: number }).value);
  });

  it('Stufe 1, judging work: the numbers decide the sentence, not the verb, and it can be right', () => {
    const judged = items(erweiternKuerzenSkill, 1, 3, 600);
    expectAnswerFollowsNumbers(judged, 8);
    const sentences = { erweitert: new Set<string>(), 'kürzt': new Set<string>() };
    for (const ex of judged) {
      if (ex.answer.kind !== 'choice') throw new Error('choice');
      const [name, verb] = ex.context!.split(' ') as [string, 'erweitert' | 'kürzt'];
      const label = ex.answer.options[ex.answer.correct].label;
      sentences[verb].add(label.replace(name, 'N').replace(/\d+/g, '#'));
      const [given, written] = fractionsIn(ex.context!);
      const k = wholeNumbersIn(ex.context!)[0];
      const right = verb === 'erweitert' ? [given[0] * k, given[1] * k] : [given[0] / k, given[1] / k];
      expect(label === 'Alles stimmt.', ex.key).toBe(written[0] === right[0] && written[1] === right[1]);
      expect(ex.prompt, ex.key).not.toMatch(/stimmt noch nicht/);
    }
    for (const seen of Object.values(sentences)) {
      expect(seen.size).toBe(4);
      expect(seen).toContain('Alles stimmt.');
    }
  });

  it('Stufe 3: the target Nenner holds and the value stays', () => {
    for (const ex of [...items(erweiternKuerzenSkill, 3, 1), ...items(erweiternKuerzenSkill, 3, 3).filter((e) => formOf(e) === 'ueber')]) {
      const [[n, d]] = fractionsIn(ex.prompt);
      const target = wholeNumbersIn(ex.prompt).at(-1)!;
      const value = valueOf(ex.answer);
      expect(value[1]).toBe(target);
      expect(sameValue(value, [n, d])).toBe(true);
      expect((ex.answer as { accept: string }).accept).toBe('exact');
    }
  });

  it('Stufe 3: through the lowest form really needs it (no whole factor between the Nenner)', () => {
    for (const ex of items(erweiternKuerzenSkill, 3, 3).filter((e) => formOf(e) === 'ueber')) {
      const [[, d]] = fractionsIn(ex.prompt);
      const target = wholeNumbersIn(ex.prompt).at(-1)!;
      expect(target % d !== 0 && d % target !== 0, ex.key).toBe(true);
    }
  });

  it('Stufe 3: exactly one fraction differs in value, and it is the right option', () => {
    for (const ab of [2, 3] as const) {
      for (const ex of items(erweiternKuerzenSkill, 3, ab).filter((e) => formOf(e) === 'anders')) {
        if (ex.answer.kind !== 'choice') throw new Error('choice');
        const values = ex.answer.options.map((o) => fractionsIn(o.label)[0]);
        const right = values[ex.answer.correct];
        const others = values.filter((_, i) => i !== (ex.answer as { correct: number }).correct);
        for (const f of others) {
          expect(sameValue(f, others[0]), ex.key).toBe(true);
          expect(sameValue(f, right), ex.key).toBe(false);
        }
      }
    }
  });
});
