import { describe, expect, it } from 'vitest';
import { describeSkill } from '../../core/testing';
import { createRng } from '../../core/rng';
import type { Ab, Exercise, Stufe } from '../../core/types';
import { CTX } from '../test-utils';
import { evalTerm, sameFrac } from './test-utils';
import { textTermSkill } from './text-term';

describeSkill(textTermSkill, { minDistinct: 30 });

const planned = (stufe: Stufe, ab: Ab, count = 300): Exercise[] => Array.from({ length: count }, (_, i) => textTermSkill.generate(createRng(i * 5003 + 11), stufe, { ...CTX, ab }));
const correct = (ex: Exercise): string => {
  if (ex.answer.kind !== 'choice') throw new Error('choice only');
  return ex.answer.options[ex.answer.correct].label;
};

describe('terme.text-term', () => {
  it('answers by choice only, with at least three options', () => {
    for (const stufe of [1, 2, 3] as Stufe[]) {
      for (const ab of [1, 2, 3] as Ab[]) {
        for (const ex of planned(stufe, ab, 100)) {
          expect(ex.answer.kind).toBe('choice');
          if (ex.answer.kind === 'choice') expect(ex.answer.options.length, ex.key).toBeGreaterThanOrEqual(3);
        }
      }
    }
  });

  it('Stufe 1, sentence to term: the correct term has exactly one operation with the numbers of the sentence', () => {
    for (const ex of planned(1, 1)) {
      const term = correct(ex);
      expect((term.match(/[+−·:]/g) ?? []).length, ex.key).toBe(1);
      const [a, b] = ex.prompt.match(/\d+/g)!.map(Number);
      const value = evalTerm(term);
      const expected = /^Addiere/.test(ex.prompt) ? a + b : /^Subtrahiere/.test(ex.prompt) ? b - a : /^Multipliziere/.test(ex.prompt) ? a * b : a / b;
      expect(Number(value.n) / Number(value.d), ex.key).toBe(expected);
    }
  });

  it('Stufe 1, term to sentence: the sentence names the operation of the term', () => {
    for (const ex of planned(1, 3)) {
      const op = /[+−·:]/.exec(ex.expression ?? '')?.[0];
      const verb = ({ '+': 'Addiere', '−': 'Subtrahiere', '·': 'Multipliziere', ':': 'Dividiere' } as Record<string, string>)[op ?? '+'];
      expect(correct(ex).startsWith(verb), ex.key).toBe(true);
    }
  });

  it('Stufe 2 uses a Fachwort or two operations, and the correct term needs no Klammer', () => {
    for (const ex of planned(2, 1)) {
      expect(ex.prompt, ex.key).toMatch(/Summe|Differenz|Produkt|Quotient/);
      expect(correct(ex), ex.key).not.toMatch(/\(/);
    }
    for (const ex of planned(2, 2)) {
      expect((correct(ex).match(/[+−·:]/g) ?? []).length, ex.key).toBe(2);
      expect(correct(ex), ex.key).not.toMatch(/\(/);
    }
  });

  it('Stufe 3 needs a Klammer in every term that fits', () => {
    for (const ex of planned(3, 1)) expect(correct(ex), ex.key).toMatch(/\(/);
    for (const ex of planned(3, 2)) expect(correct(ex), ex.key).toMatch(/\(/);
    for (const ex of planned(3, 3)) if (ex.expression) expect(ex.expression, ex.key).toMatch(/\(/);
  });

  it('in the stories, the two fitting terms have the same value, and the term that does not fit differs', () => {
    for (const ex of planned(3, 3)) {
      if (!ex.key.includes('passt-nicht') || ex.answer.kind !== 'choice') continue;
      const fit = ex.answer.options.filter((_, i) => i !== (ex.answer as { correct: number }).correct).map((o) => evalTerm(o.label));
      expect(sameFrac(fit[0], fit[1]), ex.key).toBe(true);
      expect(sameFrac(fit[0], evalTerm(correct(ex))), ex.key).toBe(false);
    }
    for (const ex of planned(3, 2)) {
      if (ex.answer.kind !== 'choice') continue;
      const chosen = evalTerm(correct(ex));
      for (const o of ex.answer.options) if (o.label !== correct(ex)) expect(sameFrac(evalTerm(o.label), chosen), `${ex.key} ${o.label}`).toBe(false);
    }
  });

  it('no option marked wrong has the value of the right one, in sentences of Stufe 2 and 3', () => {
    for (const [stufe, ab] of [[2, 2], [3, 1], [3, 2]] as [Stufe, Ab][]) {
      for (const ex of planned(stufe, ab, 6000)) {
        if (ex.answer.kind !== 'choice') continue;
        const right = correct(ex);
        for (const o of ex.answer.options) if (o.label !== right) expect(sameFrac(evalTerm(o.label), evalTerm(right)), `${ex.prompt} ${right} = ${o.label}`).toBe(false);
      }
    }
  });

  it('Stufe 2, term to sentence: no two numbers of the term coincide, so that no wrong sentence is right', () => {
    for (const ex of planned(2, 3, 3000)) {
      const numbers = (ex.expression ?? '').match(/\d+/g)!.map(Number);
      if (/\+/.test(ex.expression ?? '')) expect(numbers[0], ex.key).not.toBe(numbers[2]);
      else expect(numbers[1], ex.key).not.toBe(numbers[2]);
    }
  });

  it('Stufe 2, two steps: a difference stays above 0', () => {
    for (const ex of planned(2, 2, 2000)) {
      const value = evalTerm(correct(ex));
      expect(Number(value.n) / Number(value.d), ex.key).toBeGreaterThan(0);
    }
  });

  it('stories have sensible prices: a Karte for a Konzert above a few €, a Buch above a Heft', () => {
    for (const ab of [2, 3] as Ab[]) {
      for (const ex of planned(3, ab, 2000)) {
        const karte = /Eine Karte kostet (\d+) €/.exec(ex.context ?? '');
        if (karte) expect(Number(karte[1]), ex.key).toBeGreaterThanOrEqual(12);
        const buch = /ein Buch für (\d+) € und ein Heft für (\d+) €/.exec(ex.context ?? '');
        if (buch) expect(Number(buch[1]), ex.key).toBeGreaterThan(Number(buch[2]));
      }
    }
  });

  it('the text before the retry names no result: Verdreifache 7 never says dreimal 7', () => {
    let seen = 0;
    for (const ex of planned(1, 2, 2000)) {
      if (!ex.prompt.startsWith('Verdreifache') || ex.answer.kind !== 'choice') continue;
      seen += 1;
      for (const o of ex.answer.options) expect(o.whyWrong ?? '', ex.key).not.toMatch(/dreimal \d/);
    }
    expect(seen).toBeGreaterThan(100);
  });

  it('every story uses a term of its own numbers', () => {
    for (const ex of planned(3, 2)) {
      const numbers = new Set((ex.context ?? '').match(/\d+/g));
      for (const shown of correct(ex).match(/\d+/g) ?? []) expect(numbers.has(shown), `${ex.key}: ${shown} in "${ex.context}"`).toBe(true);
    }
  });
});
