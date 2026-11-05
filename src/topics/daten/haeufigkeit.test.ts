import { describe, expect, it } from 'vitest';
import { describeSkill } from '../../core/testing';
import { checkWorkedSolution } from '../step-check';
import { haeufigkeitSkill } from './haeufigkeit';
import { atAb, chosen, field, formOf, giveaways, keyClashes, number, paddedAnswers, picturesNotSaid, pluralSlips, speechSlips } from './testHelpers';

describeSkill(haeufigkeitSkill, { minDistinct: 40 });

const tableRows = (ex: { visual?: unknown }) => (ex.visual as { rows: string[][] }).rows;

describe('daten.haeufigkeit', () => {
  it('Stufe 1: counts from the Strichliste, shares from the text, all recomputed', () => {
    const forms = new Set<string>();
    for (const ab of [1, 2, 3] as const) {
      for (const ex of atAb(haeufigkeitSkill, 1, ab)) {
        forms.add(formOf(ex));
        if (ex.visual?.type === 'tally') {
          const rows = ex.visual.rows;
          const label = rows.find((r) => ex.prompt.includes(`„${r.label}“`))!;
          const total = rows.reduce((n, r) => n + r.count, 0);
          if (formOf(ex) === 'zaehlen') expect(number(ex)).toBe(label.count);
          if (ex.answer.kind === 'fraction') expect(ex.answer.numerator * total).toBe(label.count * ex.answer.denominator);
        }
        if (formOf(ex) === 'bruch-text') {
          const [, n, total] = /^(\d+) von (\d+)/.exec(ex.context!)!;
          if (ex.answer.kind !== 'fraction') throw new Error('fraction expected');
          expect(ex.answer.numerator * Number(total)).toBe(Number(n) * ex.answer.denominator);
          expect(ex.answer.accept).toBe('equivalent');
        }
        if (ex.answer.kind === 'number') expect(checkWorkedSolution(ex)).toEqual([]);
      }
    }
    expect(forms).toEqual(new Set(['zaehlen', 'bruch-text', 'bruch-liste', 'zurueck']));
  });

  it('Stufe 2: Dezimalzahl and Prozent of the same share; a table adds up', () => {
    for (const ex of atAb(haeufigkeitSkill, 2, 1)) {
      const rows = tableRows(ex);
      const total = rows.reduce((n, r) => n + Number(r[1]), 0);
      const row = rows.find((r) => ex.prompt.includes(`„${r[0]}“`))!;
      expect(number(ex)).toBeCloseTo(Number(row[1]) / total, 9);
    }
    for (const ex of atAb(haeufigkeitSkill, 2, 2)) {
      if (formOf(ex) === 'zwei-formen') {
        expect(field(ex, 'pct')).toBeCloseTo(field(ex, 'dez') * 100, 9);
        if (ex.visual?.type !== 'tally') throw new Error('tally expected');
        const total = ex.visual.rows.reduce((n, r) => n + r.count, 0);
        const row = ex.visual.rows.find((r) => ex.prompt.includes(`„${r.label}“`))!;
        expect(field(ex, 'dez')).toBeCloseTo(row.count / total, 9);
      } else {
        if (ex.answer.kind !== 'fraction') throw new Error('fraction expected');
        expect(ex.answer.accept).toBe('lowest');
      }
    }
    for (const ex of atAb(haeufigkeitSkill, 2, 3)) {
      if (formOf(ex) === 'fehlt') {
        const sum = tableRows(ex).slice(0, 3).reduce((n, r) => n + Number(r[1].replace(',', '.')), 0);
        expect(number(ex)).toBeCloseTo(1 - sum, 9);
        expect(number(ex)).toBeGreaterThan(0);
      }
    }
  });

  it('Stufe 2, AB III: from a percent back to the count, never with a total of 100', () => {
    for (const ex of atAb(haeufigkeitSkill, 2, 3, 600)) {
      if (formOf(ex) !== 'prozent-zurueck') continue;
      const [, percent, total] = /^(\d+)\s*% von (\d+)/.exec(ex.context!)!;
      expect(total, ex.key).not.toBe('100');
      expect(number(ex), ex.key).not.toBe(Number(percent));
      expect(ex.bugs?.some((b) => b.id === 'prozent-als-anzahl'), ex.key).toBe(true);
    }
  });

  it('Stufe 1: "von" takes the Dativ, and the bug hints speak of what the story counts', () => {
    let stories = 0;
    for (const ex of atAb(haeufigkeitSkill, 1, 1, 400)) {
      if (formOf(ex) !== 'bruch-text') continue;
      expect(ex.context, ex.key).not.toMatch(/von \d+ (Würfe|Tage) /);
      if (!/Würfen|Tagen/.test(ex.context!)) continue;
      stories++;
      (ex.bugs ?? []).forEach((b) => expect(b.hint, ex.key).not.toContain('Antworten'));
    }
    expect(stories).toBeGreaterThan(20);
  });

  it('Stufe 3, AB II: the groups are compared, the row does not tell which, and the trap has its hint', () => {
    const rowsOfLarger = new Set<number>();
    let traps = 0;
    for (const ex of atAb(haeufigkeitSkill, 3, 2)) {
      expect(ex.prompt).toContain('Vergleiche');
      const [[, t1, n1], [, t2, n2]] = tableRows(ex);
      const shares = [Number(n1) / Number(t1), Number(n2) / Number(t2)];
      rowsOfLarger.add(shares[0] > shares[1] ? 0 : 1);
      const larger = shares[0] > shares[1] ? Number(n1) : Number(n2);
      const smaller = shares[0] > shares[1] ? Number(n2) : Number(n1);
      if (smaller > larger) {
        traps++;
        expect(ex.bugs?.some((b) => b.id === 'absolut-relativ'), ex.key).toBe(true);
      }
    }
    expect(rowsOfLarger).toEqual(new Set([0, 1]));
    expect(traps).toBeGreaterThan(80);
  });

  it('a whole number is shown without decimals, the data reach the screen reader, and no form gives its answer away', () => {
    expect(paddedAnswers(haeufigkeitSkill)).toEqual([]);
    expect(picturesNotSaid(haeufigkeitSkill)).toEqual([]);
    expect(giveaways(haeufigkeitSkill)).toEqual([]);
  });

  it('one key is one task, a count of 1 has no plural, and every spoken part is closed by one mark', () => {
    expect(keyClashes(haeufigkeitSkill)).toEqual([]);
    expect(pluralSlips(haeufigkeitSkill)).toEqual([]);
    expect(speechSlips(haeufigkeitSkill)).toEqual([]);
  });

  it('Stufe 3: the answer recomputes from the shares; and in a gap the first class is the larger one', () => {
    for (const ab of [1, 2, 3] as const) {
      for (const ex of atAb(haeufigkeitSkill, 3, ab)) {
        const [[, total1, n1], [, total2, n2]] = tableRows(ex);
        expect(Math.max(Number(total1), Number(total2)), `${ex.key}: a school class`).toBeLessThanOrEqual(32);
        if (ab === 3) expect(Number(total1)).toBeGreaterThan(Number(total2));
        const share1 = Number(n1) / Number(total1);
        const share2 = Number(n2) / Number(total2);
        if (ab === 1) expect(chosen(ex).label).toBe(share1 > share2 ? tableRows(ex)[0][0] : share1 < share2 ? tableRows(ex)[1][0] : 'In beiden gleich');
        if (ab === 2) {
          expect(share1).not.toBe(share2);
          expect(number(ex)).toBeCloseTo(Math.max(share1, share2) * 100, 9);
        }
        if (ab === 3) expect(number(ex)).toBeCloseTo(share1 * Number(total2), 9);
      }
    }
  });
});
