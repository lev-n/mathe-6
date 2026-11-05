import { describe, expect, it } from 'vitest';
import { describeSkill } from '../../core/testing';
import { kritischSkill } from './kritisch';
import { srTextWithPicture } from '../../ui/visuals/describe';
import { atAb, bar, chartsTooWide, chosen, formOf, giveaways, keyClashes, picturesNotSaid, pluralSlips, rankOf, speechSlips, valueOf } from './testHelpers';

describeSkill(kritischSkill, { minDistinct: 40 });

type Chart = ReturnType<typeof bar>;

/** Recomputes a sentence about a chart from the chart's own data. */
function statementHolds(chart: Chart, label: string): boolean {
  const axis = /Achse beginnt bei (\d+)/.exec(label);
  if (axis) return Number(axis[1]) === (chart.axisStart ?? 0);
  const named = chart.categories.filter((c) => label.includes(c)).sort((a, b) => label.indexOf(a) - label.indexOf(b));
  const [x, y] = named.map((c) => valueOf(chart, c));
  const n = Number(/(?:es|zusammen) (\d+) /.exec(label)?.[1]);
  if (named.length === 1 && !Number.isNaN(n)) return x === n;
  if (label.includes('zusammen')) return x + y === n;
  if (label.includes('am meisten')) return x === Math.max(...chart.values);
  if (label.includes('so viele')) return x === (label.includes('doppelt') ? 2 : 3) * y;
  return Number.isNaN(n) ? x > y : x - y === n;
}

const formName = (label: string) => (label.includes('Achse') ? 'achse' : label.includes('zusammen') ? 'zusammen' : label.includes('so viele') ? 'so viele' : label.includes('am meisten') ? 'meisten' : /es \d+ /.test(label) ? 'wert-mehr' : 'mehr');

describe('daten.kritisch', () => {
  it('Stufe 1: every item shows a full axis, and the chosen statement holds', () => {
    for (const ab of [1, 2, 3] as const) {
      for (const ex of atAb(kritischSkill, 1, ab)) {
        const chart = bar(ex);
        expect(chart.axisStart).toBeUndefined();
        const label = chosen(ex).label;
        const named = chart.categories.filter((c) => label.includes(c)).sort((a, b) => label.indexOf(a) - label.indexOf(b));
        if (label.includes('am meisten')) expect(valueOf(chart, named[0])).toBe(Math.max(...chart.values));
        if (label.includes('am wenigsten')) expect(valueOf(chart, named[0])).toBe(Math.min(...chart.values));
        if (label.includes('doppelt')) expect(valueOf(chart, named[0])).toBe(2 * valueOf(chart, named[1]));
        if (label.includes('zusammen')) expect(Number(/(\d+) [A-ZÄÖÜ]/.exec(label.split('zusammen')[1])![1])).toBe(valueOf(chart, named[0]) + valueOf(chart, named[1]));
      }
    }
  });

  it('Stufe 1: the other statements on doubling really do not hold', () => {
    for (const ex of atAb(kritischSkill, 1, 3)) {
      if (ex.answer.kind !== 'choice') throw new Error('choice expected');
      const chart = bar(ex);
      for (const o of ex.answer.options) {
        if (o === chosen(ex)) continue;
        const named = chart.categories.filter((c) => o.label.includes(c)).sort((a, b) => o.label.indexOf(a) - o.label.indexOf(b));
        expect(valueOf(chart, named[0]), o.label).not.toBe(2 * valueOf(chart, named[1]));
      }
    }
  });

  it('Stufe 1: every option names another group, and the form of the right one comes up again', () => {
    for (const ex of atAb(kritischSkill, 1, 1, 400)) {
      if (ex.answer.kind !== 'choice') throw new Error('choice expected');
      const chart = bar(ex);
      const group = (label: string) => chart.categories.find((c) => label.includes(c))!;
      expect(new Set(ex.answer.options.map((o) => group(o.label))).size, ex.key).toBe(4);
      const form = (label: string) => (label.includes('am meisten') ? 'most' : label.includes('am wenigsten') ? 'least' : 'value');
      expect(ex.answer.options.filter((o) => form(o.label) === form(chosen(ex).label)).length, ex.key).toBeGreaterThan(1);
    }
  });

  it('Stufe 2, AB I: every chart is shortened and no option talks about the axis, so the picture\'s name ("…, nicht bei 0") cannot pick an option', () => {
    for (const ex of atAb(kritischSkill, 2, 1, 400)) {
      if (ex.answer.kind !== 'choice') throw new Error('choice expected');
      expect(bar(ex).axisStart, ex.key).toBeGreaterThan(0);
      expect(srTextWithPicture(ex), ex.key).toContain(`unterste Zahl der Achse ist ${bar(ex).axisStart}`);
      for (const o of ex.answer.options) expect(o.label, ex.key).not.toMatch(/Achse/);
    }
  });

  it('Stufe 2, AB I: no position and no answer stands out, and the options vary with the data', () => {
    const items = atAb(kritischSkill, 2, 1, 800);
    expect(new Set(items.map((ex) => ex.prompt)).size).toBeGreaterThan(5);
    expect(new Set(items.map((ex) => chosen(ex).label)).size).toBeGreaterThan(150);
    for (const position of [0, 1, 2, 3]) {
      const right = items.filter((ex) => ex.answer.kind === 'choice' && ex.answer.correct === position).length;
      expect(right, `position ${position}`).toBeLessThan(items.length * 0.35);
    }
  });

  it('Stufe 2, AB I: the right option needs the numbers of the chart, and every other option holds a misreading of it', () => {
    const forms = new Set<string>();
    for (const ex of atAb(kritischSkill, 2, 1, 400)) {
      if (ex.answer.kind !== 'choice') throw new Error('choice expected');
      const chart = bar(ex);
      forms.add(formOf(ex));
      if (formOf(ex) === 'unterschied') {
        const [a, b] = chart.categories.filter((c) => ex.context!.includes(c)).sort((x, y) => ex.context!.indexOf(x) - ex.context!.indexOf(y));
        expect(chosen(ex).label, ex.key).toMatch(new RegExp(`^${valueOf(chart, a) - valueOf(chart, b)} `));
        // the bars look factor times as high, and the numbers say otherwise
        const factor = ex.context!.includes('doppelt') ? 2 : 3;
        const start = chart.axisStart!;
        expect(valueOf(chart, a) - start, ex.key).toBe(factor * (valueOf(chart, b) - start));
      } else {
        expect(ex.answer.options.filter((o) => statementHolds(chart, o.label)), ex.key).toEqual([chosen(ex)]);
      }
    }
    expect(forms).toEqual(new Set(['unterschied', 'satz']));
  });

  it('Stufe 2, AB II: the claim decides on the numbers, and it holds in some items and fails in others', () => {
    let held = 0;
    const items = atAb(kritischSkill, 2, 2, 400);
    for (const ex of items) {
      if (ex.answer.kind !== 'choice') throw new Error('choice expected');
      const chart = bar(ex);
      const start = chart.axisStart!;
      expect(start).toBeGreaterThan(0);
      const [a, b] = chart.categories.filter((c) => ex.context!.includes(c)).sort((x, y) => ex.context!.indexOf(x) - ex.context!.indexOf(y));
      const factor = ex.context!.includes('doppelt') ? 2 : 3;
      const holds = valueOf(chart, a) === factor * valueOf(chart, b);
      if (holds) held++;
      // the heights never decide: when the claim holds they say otherwise, and when it fails they say it holds
      expect(valueOf(chart, a) - start === factor * (valueOf(chart, b) - start), ex.key).toBe(!holds);
      const label = chosen(ex).label;
      expect(label.startsWith(holds ? 'Ja.' : 'Nein.'), ex.key).toBe(true);
      expect(label).toContain(`${valueOf(chart, a)} und ${valueOf(chart, b)}`);
      expect(label).not.toMatch(/ nur /);
      // the right numbers also stand behind the other word, so reading alone does not decide
      expect(ex.answer.options.filter((o) => o.label.includes(`${valueOf(chart, a)} und ${valueOf(chart, b)}`)).length, ex.key).toBe(2);
    }
    expect(held).toBeGreaterThan(items.length * 0.3);
    expect(held).toBeLessThan(items.length * 0.7);
  });

  it('Stufe 2, AB III: from 0 the bars look nearly equal, and the answer is worked out from the data', () => {
    const labels = new Set<string>();
    for (const ex of atAb(kritischSkill, 2, 3, 400)) {
      const chart = bar(ex);
      const v = chart.values;
      expect(Math.max(...v) - Math.min(...v)).toBeLessThanOrEqual(Math.min(...v) / 2);
      const named = chart.categories.find((c) => ex.prompt.includes(c))!;
      labels.add(chosen(ex).label);
      expect(chosen(ex).label, ex.key).toBe(`${valueOf(chart, named) / chart.axisStep} Kästchen`);
    }
    expect(labels.size).toBeGreaterThan(20);
  });

  it('Stufe 3: exactly one statement fails on the chart, any of the four forms can be it, and every item has all four', () => {
    for (const [ab, form, forms] of [[1, 'aussage', ['zusammen', 'wert-mehr', 'mehr', 'meisten']], [3, 'kurze-achse', ['so viele', 'wert-mehr', 'achse', 'meisten']]] as const) {
      const items = atAb(kritischSkill, 3, ab, 800).filter((ex) => formOf(ex) === form);
      expect(items.length).toBeGreaterThan(100);
      const answers = new Map<string, number>();
      for (const ex of items) {
        if (ex.answer.kind !== 'choice') throw new Error('choice expected');
        const chart = bar(ex);
        const failing = ex.answer.options.filter((o) => !statementHolds(chart, o.label));
        expect(failing, ex.key).toEqual([chosen(ex)]);
        expect(ex.answer.options.map((o) => formName(o.label)).sort(), ex.key).toEqual([...forms].sort());
        const name = formName(chosen(ex).label);
        answers.set(name, (answers.get(name) ?? 0) + 1);
      }
      for (const name of forms) {
        expect(answers.get(name) ?? 0, `${form}: ${name}`).toBeGreaterThan(items.length * 0.1);
        expect(answers.get(name) ?? 0, `${form}: ${name}`).toBeLessThan(items.length * 0.6);
      }
    }
  });

  it('Stufe 3, AB II: the groups are no single class, and the table never shows the percent', () => {
    for (const ex of atAb(kritischSkill, 3, 2, 400)) {
      if (formOf(ex) !== 'passender-kreis' || ex.visual?.type !== 'table') continue;
      expect(ex.visual.caption, ex.key).not.toContain('Klasse');
      expect(ex.visual.rows.reduce((n, r) => n + Number(r[1]), 0), ex.key).not.toBe(100);
    }
  });

  it('Stufe 3, AB II: every pie has the order of size of the table, and the largest slices lie well apart, so a share has to be worked out', () => {
    const items = atAb(kritischSkill, 3, 2, 800).filter((ex) => formOf(ex) === 'passender-kreis');
    expect(items.length).toBeGreaterThan(200);
    for (const ex of items) {
      if (ex.answer.kind !== 'choice' || ex.visual?.type !== 'table') throw new Error('table and choice expected');
      const data = rankOf(ex.visual.rows.map((r) => Number(r[1])));
      const pies = ex.answer.options.map((o) => (o.visual as { slices: { value: number }[] }).slices.map((s) => s.value));
      pies.forEach((p) => expect(rankOf(p), ex.key).toBe(data));
      const largest = pies.map((p) => Math.max(...p)).sort((a, b) => a - b);
      expect(largest[1] - largest[0], ex.key).toBeGreaterThanOrEqual(15);
      expect(largest[2] - largest[1], ex.key).toBeGreaterThanOrEqual(15);
    }
  });

  it('every bar of a chart fits a 375 px phone, as the picture of a task and as an answer option', () => {
    expect(chartsTooWide(kritischSkill)).toEqual([]);
  });

  it('the screen-reader text holds the data of the picture, and no form gives its answer away', () => {
    expect(picturesNotSaid(kritischSkill)).toEqual([]);
    expect(giveaways(kritischSkill)).toEqual([]);
  });

  it('one key is one task, a count of 1 has no plural, and every spoken part is closed by one mark', () => {
    expect(keyClashes(kritischSkill)).toEqual([]);
    expect(pluralSlips(kritischSkill)).toEqual([]);
    expect(speechSlips(kritischSkill)).toEqual([]);
  });

  it('Stufe 3: the claim to find is the one claim that does not hold', () => {
    const seen = new Set<string>();
    for (const ab of [1, 2, 3] as const) {
      for (const ex of atAb(kritischSkill, 3, ab)) {
        seen.add(formOf(ex));
        const label = chosen(ex).label;
        if (formOf(ex) === 'kreis-aussage') {
          if (ex.visual?.type !== 'pieChart') throw new Error('pie expected');
          const total = Number(/: (\d+) Personen/.exec(ex.visual.title)![1]);
          const slice = ex.visual.slices.find((s) => label.includes(s.label))!;
          expect(Number(/^(\d+)/.exec(label)![1])).not.toBe((slice.value * total) / 100);
        }
        if (formOf(ex) === 'passender-kreis') {
          if (ex.visual?.type !== 'table' || chosen(ex).visual?.type !== 'pieChart') throw new Error('table and pie expected');
          const counts = ex.visual.rows.map((r) => Number(r[1]));
          const whole = counts.reduce((a, b) => a + b, 0);
          const pie = chosen(ex).visual as { slices: { value: number }[] };
          pie.slices.forEach((s, i) => expect(s.value).toBeCloseTo((counts[i] / whole) * 100, 9));
        }
        if (formOf(ex) === 'passendes-diagramm') {
          const chart = chosen(ex).visual;
          if (chart?.type !== 'barChart') throw new Error('bar expected');
          expect(chart.values[0]).toBe(2 * chart.values[1]);
          expect(chart.values[2]).toBe(Math.min(...chart.values));
        }
      }
    }
    expect(seen).toEqual(new Set(['aussage', 'kurze-achse', 'kreis-aussage', 'passender-kreis', 'passendes-diagramm']));
  });
});
