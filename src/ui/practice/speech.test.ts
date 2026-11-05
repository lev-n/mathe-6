// What the voice (T16) and the live region say, over the output of all real generators.
import { beforeAll, describe, expect, it } from 'vitest';
import { UNSOLVABLE_TEXT, isClockJoin } from '../../core/check';
import { numberWord, spokenWords } from '../../core/format';
import { decimalText } from '../../core/written';
import { DEFAULT_CONTEXT } from '../../core/generate';
import { createRng } from '../../core/rng';
import type { Ab, Exercise, Stufe } from '../../core/types';
import { STUFEN } from '../../core/types';
import { TOPICS, loadTopic } from '../../topics/registry';
import { announceCorrect, announceHint, announceRetry, announceSolution } from './phrases';
import { taskSpeech } from './readAloud';
import { describeVisual, srTextWithPicture } from '../visuals/describe';

const RAW_SIGN = /[·□−<>=+∥⊥]|(^|\s):(\s|$)|\{frac|\d[⁰¹²³⁴-⁹]/;
const items: Exercise[] = [];

/** Tasks of each kind the tests below look at, independent of what the topics offer at the moment. */
const FIXTURE: Exercise = { key: 'dezimal.stellenwert:1:x', topicId: 'dezimal', skillId: 'dezimal.stellenwert', stufe: 1, ab: 1, prompt: 'Rechne.', answer: { kind: 'number', value: 1 }, hints: ['Rechne Schritt für Schritt.'], steps: ['1'], praise: 'Gut.', srText: 'Rechne.', kmk: ['ZO.dezimal-rechnen'] };
const FIXTURES: Exercise[] = [
  { ...FIXTURE, skillId: 'prozent.massstab', prompt: 'Der Plan hat den Maßstab 1 : 100.' },
  { ...FIXTURE, answer: { kind: 'order', items: ['1', '2', '3'], correct: [0, 1, 2], direction: 'aufsteigend' } },
  { ...FIXTURE, visual: { type: 'term', lines: ['2 + 3 · 4'] } },
  { ...FIXTURE, srText: 'Lies die Tabelle ab.', visual: { type: 'table', header: ['Tag', 'Wert'], rows: [['Mo', '12']] } },
  { ...FIXTURE, srText: 'Lies die Zahl ab.', visual: { type: 'numberLine', min: 0, max: 10, majorStep: 5, minorStep: 1, labelMajor: true } },
  { ...FIXTURE, answer: { kind: 'multi', fields: [{ id: 'h', value: 6, after: ':' }, { id: 'm', value: 25, after: 'Uhr' }] } },
  { ...FIXTURE, answer: { kind: 'written', op: 'add', operands: [1250, 340], result: 1590 } },
  { ...FIXTURE, answer: { kind: 'written', op: 'div', operands: [4230, 6], result: 705 } },
  { ...FIXTURE, expression: '17 : 5 = □ Rest □', answer: { kind: 'multi', fields: [{ id: 'q', value: 3 }, { id: 'r', value: 2, before: 'Rest' }] } },
  { ...FIXTURE, answer: { kind: 'choice', options: [{ label: 'km' }, { label: 'cm', whyWrong: 'Die Strecke ist viel länger.' }], correct: 0 } },
  { ...FIXTURE, stufe: 3, answer: { kind: 'number', value: null, offerUnsolvable: true } },
  { ...FIXTURE, expression: '5 − (−3) = □', answer: { kind: 'number', value: 8, signed: true } },
  { ...FIXTURE, prompt: 'Trage {frac:3/4} ein.', answer: { kind: 'fraction', numerator: 3, denominator: 4, accept: 'equivalent' } },
  { ...FIXTURE, prompt: 'Setze den Punkt P(3\u00A0|\u00A02).', answer: { kind: 'point', xMin: 0, xMax: 8, yMin: 0, yMax: 8, step: 1, target: [3, 2], tolerance: 0 } },
];

beforeAll(async () => {
  for (const topic of TOPICS) {
    const { skills } = await loadTopic(topic.id);
    for (const skill of skills) {
      for (const stufe of STUFEN as readonly Stufe[]) {
        for (const ab of [1, 2, 3] as Ab[]) {
          for (let seed = 1; seed <= 8; seed++) items.push(skill.generate(createRng(seed * 7919 + stufe * 101 + ab), stufe, { ...DEFAULT_CONTEXT, ab }));
        }
      }
    }
  }
  items.push(...FIXTURES);
}, 60_000);

/** Everything a child can be told about a task. */
function feedbackTexts(ex: Exercise): string[] {
  const whyWrong = ex.answer.kind === 'choice' ? ex.answer.options.flatMap((o) => (o.whyWrong ? [o.whyWrong] : [])) : [];
  return [...ex.hints, ...(ex.bugs ?? []).map((b) => b.hint), ...whyWrong];
}

describe('read-aloud over all skills', () => {
  it('says signs as words: no raw sign reaches the voice', () => {
    for (const ex of items) expect(taskSpeech(ex, ex.hints), ex.key).not.toMatch(RAW_SIGN);
  });

  it('reads a clock-time answer as a time, never as a division', () => {
    const clocks = items.filter((ex) => ex.answer.kind === 'multi' && ex.answer.fields.some((f) => isClockJoin(f.after)));
    expect(clocks.length).toBeGreaterThan(0);
    for (const ex of clocks) {
      const said = taskSpeech(ex);
      expect(said, ex.key).toContain('Lücke Uhr Lücke');
      expect(said, ex.key).not.toContain('geteilt durch');
    }
  });

  it('T17: says the numbers of a written task, also when they stand only in the picture', () => {
    const written = items.filter((ex) => ex.answer.kind === 'written' || ex.visual?.type === 'written');
    expect(written.length).toBeGreaterThan(0);
    for (const ex of written) {
      const source = ex.answer.kind === 'written' ? ex.answer : ex.visual?.type === 'written' ? ex.visual : undefined;
      const said = taskSpeech(ex);
      (source?.operands ?? []).forEach((n, i) => {
        const places = source?.decimalPlaces?.[i] ?? 0;
        expect(said, `${ex.key}: ${n}`).toContain(places > 0 ? spokenWords(decimalText(n, places)) : numberWord(n));
      });
    }
  });

  it('T17: a Rest task has as many spoken gaps as fields', () => {
    const rest = items.filter((ex) => ex.answer.kind === 'multi' && ex.answer.fields.some((f) => f.before === 'Rest') && ex.expression);
    expect(rest.length).toBeGreaterThan(0);
    for (const ex of rest) {
      const gaps = (taskSpeech(ex).match(/Lücke/g) ?? []).length;
      expect(gaps, `${ex.key}: ${taskSpeech(ex)}`).toBe(ex.answer.kind === 'multi' ? ex.answer.fields.length : 0);
    }
  });

  it('T17: a bare unit as an option is said as a word', () => {
    const units = items.filter((ex) => ex.answer.kind === 'choice' && ex.answer.options.some((o) => /^(s|h|min|mm|cm|m|km|g|kg|ml|l)$/.test(o.label)));
    expect(units.length).toBeGreaterThan(0);
    for (const ex of units) expect(taskSpeech(ex), `${ex.key}: ${taskSpeech(ex)}`).not.toMatch(/\. (s|h|min|mm|cm|m|km|g|kg|ml|l)(\.|$)/);
  });

  it('reads the button of a task that may not be solvable: it can be the answer', () => {
    const open = items.filter((ex) => ex.answer.kind === 'number' && ex.answer.offerUnsolvable);
    expect(open.length).toBeGreaterThan(0);
    for (const ex of open) expect(taskSpeech(ex), ex.key).toContain(UNSOLVABLE_TEXT);
  });

  it('T16: reads the new kinds and signs as words', () => {
    const said = (kind: string) => taskSpeech(FIXTURES.find((ex) => ex.answer.kind === kind && ex.answer.kind !== 'number')!);
    expect(said('fraction')).toContain('drei Viertel');
    expect(said('fraction')).not.toContain('/');
    expect(said('point')).toContain('Punkt P mit den Koordinaten drei und zwei');
    const negative = taskSpeech(FIXTURES.find((ex) => ex.expression?.includes('(−3)'))!);
    expect(negative).toContain('fünf minus, minus drei');
  });

  it('says the brackets of a term, so two terms that differ only there sound different', () => {
    for (const ex of items) expect(taskSpeech(ex, ex.hints), ex.key).not.toMatch(/\([^()]*\s(plus|minus|mal)\s[^()]*\)/);
  });

  it('a Maßstab is said as one', () => {
    const maps = items.filter((ex) => ex.skillId === 'prozent.massstab');
    expect(maps.length).toBeGreaterThan(0);
    for (const ex of maps) expect(taskSpeech(ex), ex.key).not.toMatch(/Maßstab \S+ geteilt durch/);
  });

  it('says the direction of an order task', () => {
    const orders = items.filter((ex) => ex.answer.kind === 'order');
    expect(orders.length).toBeGreaterThan(0);
    for (const ex of orders) expect(taskSpeech(ex), ex.key).toMatch(/Zuerst das (Kleinste|Größte)/);
  });

  it('says the lines of a task that stands in a term picture', () => {
    const terms = items.filter((ex) => ex.visual?.type === 'term');
    expect(terms.length).toBeGreaterThan(0);
    for (const ex of terms) expect(taskSpeech(ex).length, ex.key).toBeGreaterThan(ex.prompt.length);
  });

  it('never says a hyphenated 1-mal', () => {
    for (const ex of items) {
      expect(taskSpeech(ex, ex.hints), ex.key).not.toMatch(/\b(1|eins)-mal\b/);
    }
  });
});

describe('the description of a task over all skills', () => {
  it('holds the data of a chart or table, so a child on the answer field can solve it', () => {
    const data = items.filter((ex) => ex.visual && ['barChart', 'table'].includes(ex.visual.type));
    expect(data.length).toBeGreaterThan(0);
    for (const ex of data) {
      const said = srTextWithPicture(ex);
      expect(said.startsWith(ex.srText), ex.key).toBe(true);
      for (const n of describeVisual(ex.visual!).match(/\d+/g) ?? []) expect(said, `${ex.key}: ${n}`).toContain(n);
    }
  });

  it('a number line is described by the generator or by its picture, a thermometer never by its value', () => {
    const lines = items.filter((ex) => ex.visual?.type === 'numberLine');
    expect(lines.length).toBeGreaterThan(0);
    for (const ex of lines) expect(srTextWithPicture(ex), ex.key).toMatch(/Zahlenstrahl|Zahlengerade|Rechenstrich/);
    for (const ex of items) {
      if (ex.visual?.type === 'thermometer') expect(describeVisual(ex.visual), ex.key).not.toContain('zeigt');
    }
  });

  it('does not repeat what srText says already', () => {
    for (const ex of items) {
      if (ex.visual?.type === 'numberLine' && /Zahlenstrahl von/.test(ex.srText)) expect(srTextWithPicture(ex), ex.key).toBe(ex.srText);
    }
  });
});

describe('live region over all skills', () => {
  it('announces hints, targeted feedback and praise with the signs as words', () => {
    for (const ex of items) {
      for (const text of feedbackTexts(ex)) {
        expect(announceRetry(text), `${ex.key}: ${text}`).not.toMatch(RAW_SIGN);
        expect(announceHint(0, text), `${ex.key}: ${text}`).not.toMatch(RAW_SIGN);
      }
      expect(announceCorrect(ex, ex.praise), ex.key).not.toMatch(RAW_SIGN);
      expect(announceSolution(ex), ex.key).not.toMatch(RAW_SIGN);
    }
  });

  it('counts the hint from 1', () => {
    expect(announceHint(1, '3 · 4 = □')).toBe('Tipp 2: 3 mal 4 gleich Lücke.');
  });
});
