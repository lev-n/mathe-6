import { describe, expect, it } from 'vitest';
import { bareKey, describeSkill } from '../../core/testing';
import type { Stufe, Visual } from '../../core/types';
import { checkWorkedSolution } from '../step-check';
import { samples } from '../test-utils';
import { allItems, answerInTask, barProblems, falseDecimals, itemsAt } from './test-support';
import { proportionalSkill } from './proportional';

describeSkill(proportionalSkill, { minDistinct: { 1: 30, 2: 20, 3: 30 } });

const valueOf = (cell: string) => Number(cell.replace(/[^\d,]/g, '').replace(',', '.'));
type Table = Extract<Visual, { type: 'table' }>;

describe('prozent.proportional specifics', () => {
  it('Stufe 1: the fields are the doubled values of the table', () => {
    for (const ex of samples(proportionalSkill, 1)) {
      if (ex.answer.kind !== 'multi') throw new Error(ex.key);
      const parts = bareKey(ex).split(':');
      const [x0, y0] = [Number(parts[2]), Number(parts[3])];
      if (parts[0] === 'zurueck') expect(ex.answer.fields.map((f) => f.value), ex.key).toEqual([2 * x0, 4 * x0]);
      else expect(ex.answer.fields.map((f) => f.value), ex.key).toEqual([4 * y0, 8 * y0]);
    }
  });

  it('Stufe 2: the answer on a table agrees with the doubling test', () => {
    let seen = 0;
    for (const ex of samples(proportionalSkill, 2)) {
      if (!bareKey(ex).startsWith('tabelle:') || ex.answer.kind !== 'choice') continue;
      const t = ex.visual as Table;
      const [a, b] = [valueOf(t.rows[0][1]), valueOf(t.rows[1][1])];
      const said = ex.answer.options[ex.answer.correct].label.startsWith('Ja');
      expect(said, ex.key).toBe(b === 2 * a);
      seen++;
    }
    expect(seen).toBeGreaterThan(20);
  });

  it('Stufe 2: only the line through the origin counts as proportional', () => {
    for (const ex of samples(proportionalSkill, 2)) {
      if (ex.visual?.type !== 'coordinateGrid' || ex.answer.kind !== 'choice') continue;
      expect(ex.visual.xMin, ex.key).toBe(0);
      expect(ex.visual.yMin, ex.key).toBe(0);
      const k = ex.visual.points[1].y / ex.visual.points[1].x;
      const straight = ex.visual.points.every((p) => p.y === k * p.x);
      expect(ex.answer.options[ex.answer.correct].label.startsWith('Ja'), ex.key).toBe(straight);
    }
  });

  it('Stufe 3: the Faktor fits the table, and exactly one row of a detective table is off', () => {
    for (const ex of samples(proportionalSkill, 3)) {
      const parts = bareKey(ex).split(':');
      if (parts[0] === 'faktor') {
        const t = ex.visual as Table;
        const k = Number(parts[3]);
        expect(ex.answer).toMatchObject({ value: k });
        for (const row of t.rows) expect(valueOf(row[1]), ex.key).toBeCloseTo(Number(row[0]) * k, 6);
      }
      if (parts[0] === 'fehler') {
        const t = ex.visual as Table;
        const k = Number(parts[3]);
        const off = t.rows.filter((row) => Math.abs(valueOf(row[1]) - Number(row[0]) * k) > 1e-6);
        expect(off.length, ex.key).toBe(1);
        expect(ex.answer).toMatchObject({ value: Number(off[0][0]) * k });
      }
      if (parts[0] === 'kerze') expect(ex.answer).toMatchObject({ value: Number(parts[1]) - Number(parts[2]) * Number(parts[3]) });
    }
  });

  it('every worked solution is correct and states the result', () => {
    for (const stufe of [1, 2, 3] as Stufe[]) {
      for (const ex of samples(proportionalSkill, stufe)) expect(checkWorkedSolution(ex).filter((e) => !e.includes('does not contain field'))).toEqual([]);
    }
  });

  it('no false decimals, no answer printed in the task, no Prozentstreifen that misleads', () => {
    const items = allItems(proportionalSkill);
    expect(falseDecimals(items)).toEqual([]);
    expect(answerInTask(items)).toEqual([]);
    expect(barProblems(items)).toEqual([]);
  });

  it('Stufe 2 AB III: both verdicts occur in each form, and the reason names the verdict of the table', () => {
    const verdicts: Record<string, Set<string>> = {};
    for (const ex of itemsAt(proportionalSkill, 2, 3)) {
      if (ex.answer.kind !== 'choice') throw new Error(ex.key);
      const form = bareKey(ex).split(':')[0];
      const label = ex.answer.options[ex.answer.correct].label;
      (verdicts[form] ??= new Set()).add(label.split(/[,:]/)[0]);
      if (form === 'grund') {
        const t = ex.visual as Table;
        const proportional = valueOf(t.rows[1][1]) === 2 * valueOf(t.rows[0][1]);
        expect(label.startsWith(proportional ? 'Ja' : 'Nein'), ex.key).toBe(true);
      }
      expect(ex.prompt, ex.key).not.toMatch(/nicht proportional/);
    }
    expect(Object.keys(verdicts).sort()).toEqual(['boot', 'grund']);
    for (const seen of Object.values(verdicts)) expect([...seen].sort()).toEqual(['Ja', 'Nein']);
  });

  it('Stufe 2 only decides: nothing is computed, and no table states that it is proportional', () => {
    for (const ex of samples(proportionalSkill, 2)) {
      expect(ex.answer.kind, ex.key).toBe('choice');
      expect(ex.prompt, ex.key).not.toMatch(/ist proportional\./);
    }
  });

  it('a value for one fits the column: a Heft of a doubling table costs at most 6 €', () => {
    for (const ab of [1, 2, 3] as const) {
      for (const ex of itemsAt(proportionalSkill, 1, ab)) {
        if (ex.visual?.type !== 'table' || ex.visual.header[0] !== 'Hefte') continue;
        expect(valueOf(ex.visual.rows[0][1]) / Number(ex.visual.rows[0][0]), ex.key).toBeLessThanOrEqual(6);
      }
    }
  });

  it('Stufe 3 AB II: the stories with numbers go both ways, both verdicts are equally likely, and a Ja names the Faktor', () => {
    const seen = new Set<string>();
    let yes = 0;
    const items = itemsAt(proportionalSkill, 3, 2, 1000);
    for (const ex of items) {
      if (ex.answer.kind !== 'choice') throw new Error(ex.key);
      const label = ex.answer.options[ex.answer.correct].label;
      expect(ex.answer.options.length, ex.key).toBe(4);
      const verdict = label.split(/[, ]/)[0];
      seen.add(`${bareKey(ex).split(':')[1]}:${verdict}`);
      if (verdict === 'Ja') yes++;
      if (verdict === 'Ja') expect(label, ex.key).toMatch(/^Ja, mit Faktor \d/);
    }
    for (const story of ['aepfel', 'zug']) for (const verdict of ['Ja', 'Nein']) expect(seen, `${story} ${verdict}`).toContain(`${story}:${verdict}`);
    expect(seen).toContain('alter:Nein');
    expect(yes / items.length).toBeGreaterThan(0.4);
    expect(yes / items.length).toBeLessThan(0.6);
  });

  it('Stufe 3 AB II has no doubling to read off', () => {
    for (const ex of itemsAt(proportionalSkill, 3, 2)) {
      const parts = bareKey(ex).split(':');
      if (parts[1] === 'alter') continue;
      expect(Number(parts[4]) % Number(parts[2]), ex.key).not.toBe(0);
    }
  });

  it('Stufe 1: no answer stands in the other column, so that copying is never right', () => {
    const numbers = (cells: string[]) => cells.filter((c) => c !== '□').map(valueOf);
    for (const ab of [1, 2, 3] as const) {
      for (const ex of itemsAt(proportionalSkill, 1, ab, 2000)) {
        if (ex.answer.kind !== 'multi') throw new Error(ex.key);
        const t = ex.visual as Table;
        const other = numbers(t.rows.map((r) => (bareKey(ex).startsWith('zurueck:') ? r[1] : r[0])));
        for (const f of ex.answer.fields) expect(other, ex.key).not.toContain(f.value);
        expect(ex.bugs?.length ?? 0, ex.key).toBeGreaterThan(0);
      }
    }
  });

  it('Stufe 1: two arrows on one side share no row, as the table then shifts out of its columns', () => {
    for (const ab of [1, 2, 3] as const) {
      for (const ex of itemsAt(proportionalSkill, 1, ab)) {
        const arrows = (ex.visual as Table).arrows ?? [];
        expect(arrows.length, ex.key).toBeGreaterThan(0);
        for (const side of ['left', 'right']) {
          const rows = arrows.filter((a) => (a.side ?? 'left') === side).flatMap((a) => [a.from, a.to]);
          expect(new Set(rows).size, ex.key).toBe(rows.length);
        }
      }
    }
  });
});
