import { describe, expect, it } from 'vitest';
import { describeSkill } from '../../core/testing';
import type { Exercise } from '../../core/types';
import skill from './bruch-umwandeln';
import { allItems, answerValue, childTexts, describeDecimalRules, items, near, num } from './test-helpers';

describeSkill(skill, { minDistinct: { 1: 25, 2: 25, 3: 20 } });
describeDecimalRules(skill);

const fractionOf = (text: string) => {
  const m = /\{frac:(\d+)\/(\d+)\}/.exec(text);
  return m ? { n: Number(m[1]), d: Number(m[2]) } : null;
};
const inTask = (ex: Exercise) => [ex.prompt, ex.expression].filter(Boolean).join(' ');

describe('dezimal.bruch-umwandeln: content', () => {
  it('a number answer is the value of the fraction, rounded where the task says so', () => {
    for (const ex of allItems(skill)) {
      if (ex.answer.kind !== 'number') continue;
      const f = fractionOf(inTask(ex));
      expect(f, ex.key).not.toBeNull();
      const exact = f!.n / f!.d;
      const value = answerValue(ex);
      if (ex.prompt.includes('Runde')) expect(near(value, Math.round((exact + 1e-9) * 100) / 100), ex.key).toBe(true);
      else expect(near(value, exact), ex.key).toBe(true);
    }
  });

  it('a fraction answer has the value of the number in the task', () => {
    let seen = 0;
    for (const ex of allItems(skill)) {
      if (ex.answer.kind !== 'fraction') continue;
      seen++;
      const shown = /\d+,\d+/.exec(inTask(ex))?.[0] ?? '';
      expect(near(ex.answer.numerator / ex.answer.denominator, num(shown)), ex.key).toBe(true);
    }
    expect(seen).toBeGreaterThan(0);
  });

  it('each Stufe keeps its Nenner', () => {
    const denominators = (stufe: 1 | 2 | 3) => (ab: 1 | 2 | 3) => items(skill, stufe, ab).flatMap((ex) => {
      const f = fractionOf(ex.expression ?? '');
      return f ? [f.d] : [];
    });
    for (const ab of [1, 2, 3] as const) {
      denominators(1)(ab).forEach((d) => expect([10, 100]).toContain(d));
      denominators(2)(ab).forEach((d) => expect([2, 4, 5, 20, 25, 50]).toContain(d));
      denominators(3)(ab).forEach((d) => expect([8, 40]).toContain(d));
    }
  });

  it('Stufe 1 stays at Nenner 10 and 100 in every text, and no answer has 3 places', () => {
    for (const ab of [1, 2, 3] as const) {
      for (const ex of items(skill, 1, ab)) {
        for (const text of childTexts(ex)) expect(/Tausendstel|\/1000\b/.test(text), `${ex.key}: ${text}`).toBe(false);
        if (ex.answer.kind === 'number') expect(near(answerValue(ex) * 100, Math.round(answerValue(ex) * 100)), ex.key).toBe(true);
      }
    }
  });

  it('the narrow pools are wide enough for a round: AB I of Stufe 2 reaches 3/4 and 7/20, AB I of Stufe 3 has 20 tasks', () => {
    const keys = (stufe: 2 | 3) => new Set(items(skill, stufe, 1, 800).map((ex) => ex.key));
    const direct = keys(2);
    expect(direct.size).toBeGreaterThanOrEqual(15);
    for (const end of [':3:4', ':7:20']) expect([...direct].some((k) => k.endsWith(end)), end).toBe(true);
    expect(keys(3).size).toBeGreaterThanOrEqual(20);
  });

  it('3/4 read as 3,4 has its hint', () => {
    const ex = items(skill, 2, 2).find((x) => x.key.endsWith(':3:4'));
    expect(ex?.bugs?.find((b) => b.match === 3.4)?.id).toBe('zehner-bruch-direkt');
  });

  it('Stufe 3 holds the numbers that do not end', () => {
    const periodic = items(skill, 3, 2).filter((ex) => ex.key.includes(':periodisch:'));
    expect(periodic.length).toBeGreaterThan(0);
    for (const ex of periodic) {
      if (ex.answer.kind !== 'choice') throw new Error(ex.key);
      expect(ex.answer.options[ex.answer.correct].label, ex.key).toMatch(/^\d,\d+…$/);
    }
  });

  it('Stufe 3: the dots do not point at the right option, and only that option is the value of the fraction', () => {
    const periodic = items(skill, 3, 2, 400).filter((ex) => ex.key.includes(':periodisch:'));
    expect(periodic.length).toBeGreaterThan(0);
    for (const ex of periodic) {
      if (ex.answer.kind !== 'choice') throw new Error(ex.key);
      const { options, correct } = ex.answer;
      expect(options.length, ex.key).toBe(4);
      expect(options.filter((o) => o.label.endsWith('…')).length, `${ex.key}: ${options.map((o) => o.label).join(' | ')}`).toBeGreaterThanOrEqual(3);
      const f = fractionOf(ex.prompt)!;
      options.forEach((o, i) => {
        const shown = num(o.label.replace('…', ''));
        expect(Math.abs(shown - f.n / f.d) < 0.01, `${ex.key}: ${o.label}`).toBe(i === correct);
      });
    }
  });
});
