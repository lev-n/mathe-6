import { describe, expect, it } from 'vitest';
import { describeSkill } from '../../core/testing';
import { checkWorkedSolution } from '../step-check';
import { diagrammSkill } from './diagramm';
import { atAb, bar, chartsTooWide, chosen, field, formOf, giveaways, keyClashes, number, picturesNotSaid, pluralSlips, speechSlips, valueOf } from './testHelpers';

describeSkill(diagrammSkill, { minDistinct: 40 });

describe('daten.diagramm', () => {
  it('Stufe 1: axis step 5, every bar on a line, the answer is the bar named in the prompt', () => {
    for (const ex of atAb(diagrammSkill, 1, 1)) {
      const chart = bar(ex);
      expect(chart.axisStep).toBe(5);
      chart.values.forEach((v) => expect(v % 5).toBe(0));
      const named = chart.categories.find((c) => new RegExp(`${c}\\?$`).test(ex.prompt));
      expect(number(ex)).toBe(valueOf(chart, named!));
      expect(checkWorkedSolution(ex)).toEqual([]);
    }
  });

  it('Stufe 1, AB II: the extreme value of the chart', () => {
    for (const ex of atAb(diagrammSkill, 1, 2)) {
      const values = bar(ex).values;
      expect(number(ex)).toBe(ex.prompt.includes('größten') ? Math.max(...values) : Math.min(...values));
    }
  });

  it('Stufe 1, AB III: the group with the value of the prompt', () => {
    for (const ex of atAb(diagrammSkill, 1, 3)) {
      const shown = Number(/genau (\d+)/.exec(ex.prompt)![1]);
      expect(valueOf(bar(ex), chosen(ex).label)).toBe(shown);
    }
  });

  it('Stufe 1: no hint names the answer when the bar is one box tall', () => {
    const fives = [1, 2].flatMap((ab) => atAb(diagrammSkill, 1, ab as 1 | 2, 400)).filter((ex) => number(ex) === 5);
    expect(fives.length).toBeGreaterThan(30);
    for (const ex of fives) {
      const hints = [...ex.hints, ...(ex.bugs ?? []).map((b) => b.hint)];
      hints.forEach((h) => expect(h, ex.key).not.toMatch(/(?<!\d)5(?!\d)/));
    }
  });

  it('Stufe 1, AB II: the hint on the other edge has the right case', () => {
    for (const ex of atAb(diagrammSkill, 1, 2)) {
      const hint = ex.bugs?.find((b) => b.id === 'groesster-kleinster')?.hint;
      if (hint) expect(hint).toMatch(/Gefragt ist der (größte|kleinste) Wert\./);
    }
  });

  it('the screen-reader text holds the data of the picture', () => {
    expect(picturesNotSaid(diagrammSkill)).toEqual([]);
    expect(giveaways(diagrammSkill)).toEqual([]);
  });

  it('one key is one task, a count of 1 has no plural, and every spoken part is closed by one mark', () => {
    expect(keyClashes(diagrammSkill)).toEqual([]);
    expect(pluralSlips(diagrammSkill)).toEqual([]);
    expect(speechSlips(diagrammSkill)).toEqual([]);
  });

  it('every bar of a chart fits a 375 px phone, as the picture of a task and as an answer option', () => {
    expect(chartsTooWide(diagrammSkill)).toEqual([]);
  });

  it('Stufe 2: axis step 20 or 50, difference and sum recompute from the chart', () => {
    const forms = new Set<string>();
    for (const ab of [1, 2, 3] as const) {
      for (const ex of atAb(diagrammSkill, 2, ab)) {
        const chart = bar(ex);
        expect([20, 50]).toContain(chart.axisStep);
        forms.add(formOf(ex));
        const named = chart.categories.filter((c) => ex.prompt.includes(c));
        if (formOf(ex) === 'differenz') expect(number(ex)).toBe(Math.abs(valueOf(chart, named[0]) - valueOf(chart, named[1])));
        if (formOf(ex) === 'summe') expect(number(ex)).toBe(valueOf(chart, named[0]) + valueOf(chart, named[1]));
        if (formOf(ex) === 'alle') expect(number(ex)).toBe(chart.values.reduce((a, b) => a + b, 0));
        if (formOf(ex) === 'paar') {
          const [x, y] = chosen(ex).label.split(' und ');
          expect(Math.abs(valueOf(chart, x) - valueOf(chart, y))).toBe(Number(/genau (\d+)/.exec(ex.prompt)![1]));
        }
        if (ex.answer.kind === 'number') expect(checkWorkedSolution(ex)).toEqual([]);
      }
    }
    expect(forms).toEqual(new Set(['differenz', 'summe', 'alle', 'paar']));
  });

  it('Stufe 2, AB II: at least some bars lie between two lines of the axis', () => {
    const between = atAb(diagrammSkill, 2, 2).filter((ex) => bar(ex).values.some((v) => v % bar(ex).axisStep !== 0));
    expect(between.length).toBeGreaterThan(150);
  });

  it('Stufe 3, AB I: exactly one chart shows the table', () => {
    for (const ex of atAb(diagrammSkill, 3, 1)) {
      if (ex.visual?.type !== 'table' || ex.answer.kind !== 'choice') throw new Error('table and choice expected');
      const table = ex.visual.rows.map((r) => r[1]);
      const fits = ex.answer.options.filter((o) => o.visual?.type === 'barChart' && o.visual.values.map(String).join() === table.join());
      expect(fits).toEqual([chosen(ex)]);
      // two columns: a table of four columns scrolls sideways on a phone
      expect(ex.visual.header.length).toBe(2);
    }
  });

  it('Stufe 3: two answers from one chart', () => {
    for (const ex of atAb(diagrammSkill, 3, 2)) {
      const chart = bar(ex);
      if (ex.answer.kind !== 'multi') throw new Error('multi expected');
      const named = (t: string) => chart.categories.find((c) => t.includes(c))!;
      expect(field(ex, 'wert')).toBe(valueOf(chart, named(ex.answer.fields[0].before!)));
      expect(field(ex, 'mehr')).toBe(field(ex, 'wert') - valueOf(chart, named(ex.answer.fields[1].before!)));
    }
    for (const ex of atAb(diagrammSkill, 3, 3)) {
      const total = bar(ex).values.reduce((a, b) => a + b, 0);
      expect(field(ex, 'gesamt')).toBe(total);
      expect(field(ex, 'rest')).toBe(Number(/sind (\d+)/.exec(ex.context!)![1]) - total);
    }
  });
});
