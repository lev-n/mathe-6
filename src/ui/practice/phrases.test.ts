import { describe, expect, it } from 'vitest';
import { formatAnswer } from '../../core/check';
import { BANNED_PHRASES } from '../../core/testing';
import { childTextProblems } from '../../core/textRules';
import { KIDS_PRIVACY } from '../app/kidsPrivacy';
import { BOX, TIMES } from '../../core/format';
import type { Exercise } from '../../core/types';
import * as phrases from './phrases';
import { isHoldoverClick } from './useHoldover';

function allPhraseStrings(): string[] {
  const out: string[] = [];
  for (const v of Object.values(phrases)) {
    if (typeof v === 'string') out.push(v);
    else if (Array.isArray(v)) out.push(...v.filter((x): x is string => typeof x === 'string'));
  }
  out.push(phrases.summaryText(8, 10), phrases.summaryText(1, 2), phrases.summaryText(10, 10), phrases.summaryText(0, 3), phrases.streakText(5));
  return out;
}

const EX: Exercise = {
  key: 'dezimal.stellenwert:2x8',
  topicId: 'dezimal',
  skillId: 'dezimal.stellenwert',
  stufe: 1,
  ab: 1,
  prompt: 'Rechne.',
  expression: `7 ${TIMES} 8 = ${BOX}`,
  answer: { kind: 'number', value: 56 },
  hints: ['Denk an 7 · 10.'],
  steps: ['7 · 8 = 56'],
  praise: 'Du hast die Kernaufgabe genutzt.',
  srText: 'Wie viel ist 7 mal 8?',
  kmk: ['ZO.schriftlich'],
};

describe('phrase bank', () => {
  it('never uses banned phrases', () => {
    for (const s of allPhraseStrings()) {
      const lower = s.toLowerCase();
      for (const banned of BANNED_PHRASES) {
        expect(new RegExp(`(^|[^a-zäöüß])${banned}([^a-zäöüß]|$)`).test(lower), `"${banned}" in "${s}"`).toBe(false);
      }
    }
  });

  it('keeps sentences short (≤ 15 words)', () => {
    for (const s of allPhraseStrings()) {
      for (const sentence of s.split(/(?<=[.!?])\s+/)) {
        expect(sentence.split(/\s+/).filter(Boolean).length, sentence).toBeLessThanOrEqual(15);
      }
    }
  });

  it('keeps the text rules of docs/research.md §4 (T4, T5, T6, T8)', () => {
    // SAVE_FAILED_ADULT is for adults; GOODBYE is word for word from the phrase bank (§7.4).
    const texts = allPhraseStrings().filter((s) => s !== phrases.SAVE_FAILED_ADULT && s !== phrases.GOODBYE);
    expect(texts.flatMap(childTextProblems)).toEqual([]);
    expect(phrases.GOODBYE).toBe('Gut, dass du geübt hast. Bis zum nächsten Mal.');
  });

  it('kids privacy text keeps the same rules', () => {
    expect(KIDS_PRIVACY.flatMap(childTextProblems)).toEqual([]);
  });

  it('round summary is success-framed and promises no later review', () => {
    expect(phrases.summaryText(8, 10)).toBe('8 von 10 geschafft. 2 Aufgaben waren noch knifflig.');
    expect(phrases.summaryText(9, 10)).toBe('9 von 10 geschafft. 1 Aufgabe war noch knifflig.');
    expect(phrases.summaryText(10, 10)).toBe('10 von 10 geschafft.');
    expect(phrases.summaryText(0, 10)).toBe('Du hast alle 10 Aufgaben bearbeitet. Die Aufgaben waren noch knifflig.');
    expect(phrases.summaryText(0, 1)).toBe('Du hast die Aufgabe bearbeitet. Die Aufgabe war noch knifflig.');
    for (const t of [phrases.summaryText(8, 10), phrases.summaryText(0, 3)]) expect(t).not.toMatch(/später/);
  });

  it('mastery words and stars', () => {
  });

  it('announces a full German sentence with the solved task', () => {
    expect(phrases.spokenSolution(EX)).toBe('7 mal 8 ist 56.');
    expect(phrases.announceCorrect(EX, 'Du hast die Kernaufgabe genutzt.')).toBe('Richtig. 7 mal 8 ist 56. Du hast die Kernaufgabe genutzt.');
    expect(phrases.announceRetry('Denk an 7 · 10')).toBe('Noch nicht ganz. Probier es noch einmal. Denk an 7 mal 10.');
    expect(phrases.announceSolution(EX)).toContain('So kannst du rechnen: 7 mal 8 ist 56.');
  });

  it('falls back to wording that fits the answer kind without a fillable expression', () => {
    const ex: Exercise = { ...EX, expression: undefined, answer: { kind: 'choice', options: [{ label: 'Würfel' }, { label: 'Quader' }], correct: 0 } };
    expect(phrases.spokenSolution(ex)).toBe('Die Lösung: Würfel.');
    const big: Exercise = { ...EX, expression: undefined, answer: { kind: 'number', value: 56 } };
    expect(phrases.spokenSolution(big)).toBe('Die Lösung ist 56.');
    const unit: Exercise = { ...EX, expression: undefined, answer: { kind: 'number', value: 15, unit: 'min' } };
    expect(phrases.spokenSolution(unit)).toBe('Die Lösung ist 15 min.');
  });

  it('speaks a clock time as h.mm Uhr, never "geteilt durch"', () => {
    const time = (h: number, m: number): Exercise => ({
      ...EX,
      expression: undefined,
      answer: { kind: 'multi', fields: [{ id: 'h', value: h, after: ':' }, { id: 'm', value: m, after: 'Uhr' }] },
    });
    expect(phrases.spokenSolution(time(6, 25))).toBe('Die Lösung: 6.25 Uhr.');
    expect(phrases.spokenSolution(time(17, 5))).toBe('Die Lösung: 17.05 Uhr.');
    expect(phrases.announceCorrect(time(6, 25), 'Du hast die Zeiger genau gelesen.')).toBe('Richtig. Die Lösung: 6.25 Uhr. Du hast die Zeiger genau gelesen.');
    expect(phrases.spokenSolution(time(6, 25))).not.toMatch(/geteilt/);
    // The visible 'Die Lösung: …' line uses the same notation.
    expect(formatAnswer(time(17, 5).answer)).toBe('17.05\u00A0Uhr');
    expect(formatAnswer(EX.answer)).toBe('56');
  });

  it('speaks an answer sentence as it is (no "Die Lösung ist Mia bekommt …")', () => {
    const ex: Exercise = { ...EX, expression: undefined, answer: { kind: 'number', value: 2, unit: '€', before: 'Mia bekommt', after: 'zurück.' } };
    expect(phrases.spokenSolution(ex)).toBe('Mia bekommt 2 € zurück.');
    const label: Exercise = { ...EX, expression: undefined, answer: { kind: 'number', value: 6, before: 'Flächeninhalt:', after: 'Kästchen' } };
    expect(phrases.spokenSolution(label)).toBe('Flächeninhalt: 6 Kästchen.');
    // T10: money and metres keep both decimals, as on the page.
    const money: Exercise = { ...EX, expression: undefined, answer: { kind: 'number', value: 4.9, decimals: 2, unit: '€', before: 'Lena bezahlt', after: '.' } };
    expect(phrases.spokenSolution(money)).toBe(`Lena bezahlt 4,90 € .`.replace(' .', '.'));
    const metres: Exercise = { ...EX, expression: `530 cm = ${BOX} m`, answer: { kind: 'number', value: 5.3, decimals: 2, unit: 'm' } };
    expect(phrases.spokenSolution(metres)).toContain('5,30 m');
    const unsolvable: Exercise = { ...EX, expression: undefined, answer: { kind: 'number', value: null, offerUnsolvable: true } };
    expect(phrases.spokenSolution(unsolvable)).toBe('Die Aufgabe ist nicht lösbar – es fehlt eine Angabe.');
  });

  it('cells: no "siehe Lösungsbild"; the solution points to the marked cells, a correct drawing needs no repeat', () => {
    const ex: Exercise = {
      ...EX,
      expression: undefined,
      answer: { kind: 'cells', width: 4, height: 4, given: [[0, 0]], solution: [[3, 0]] },
    };
    expect(phrases.spokenSolution(ex)).toBe('Die richtigen Kästchen sind im Gitter mit einem Haken markiert.');
    expect(phrases.announceCorrect(ex, 'Du hast genau gespiegelt.')).toBe('Richtig. Du hast genau gespiegelt.');
    expect(phrases.announceSolution(ex)).not.toMatch(/Lösungsbild|Die Lösung ist/);
  });

  it('comparisons, multi chains and order read as German sentences', () => {
    const cmp: Exercise = {
      ...EX,
      expression: `45 ${BOX} 54`,
      answer: { kind: 'choice', layout: 'symbols', options: [{ label: '<' }, { label: '>' }, { label: '=' }], correct: 0 },
    };
    expect(phrases.spokenSolution(cmp)).toBe('45 ist kleiner als 54.');
    const chain: Exercise = {
      ...EX,
      expression: undefined,
      answer: { kind: 'multi', fields: [{ id: 'a', value: 1, before: 'A =' }, { id: 'b', value: 0, before: 'B =' }] },
    };
    expect(phrases.spokenSolution(chain)).toBe('Die Lösung: A gleich 1, B gleich 0.');
    const order: Exercise = {
      ...EX,
      expression: undefined,
      answer: { kind: 'order', items: ['309 cm', '3 m 6 cm', '0,39 m'], direction: 'aufsteigend', correct: [2, 1, 0] },
    };
    expect(phrases.spokenSolution(order)).toBe('Die Reihenfolge: 0,39 m, dann 3 m 6 cm, dann 309 cm.');
  });

  it('rotate cycles through variants', () => {
    expect(phrases.rotate(['a', 'b', 'c'], 4)).toBe('b');
    expect(phrases.rotate(['a', 'b', 'c'], -1)).toBe('c');
  });
});

describe('holdover guard', () => {
  it('ignores pointer clicks within 300 ms of a screen change, never keyboard clicks', () => {
    expect(isHoldoverClick(1, 100)).toBe(true);
    expect(isHoldoverClick(1, 299)).toBe(true);
    expect(isHoldoverClick(1, 300)).toBe(false);
    expect(isHoldoverClick(0, 10)).toBe(false);
  });
});
