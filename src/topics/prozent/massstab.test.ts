import { describe, expect, it } from 'vitest';
import { bareKey, describeSkill } from '../../core/testing';
import { checkAnswer } from '../../core/check';
import { createRng } from '../../core/rng';
import type { Stufe } from '../../core/types';
import { checkWorkedSolution } from '../step-check';
import { taskSpeech } from '../../ui/practice/readAloud';
import { srTextWithPicture } from '../../ui/visuals/describe';
import { samples } from '../test-utils';
import { allItems, answerInTask, barProblems, falseDecimals, itemsAt } from './test-support';
import { massstabSkill } from './massstab';

describeSkill(massstabSkill);

/** The answer recomputed from the numbers in the key. */
function expected(key: string): number {
  const [form, ...rest] = key.split(':');
  const n = rest.map(Number);
  switch (form) {
    case 'plan': return n[1];
    case 'lineal': case 'plancm': return n[1] * 100;
    case 'differenz': return (n[0] - n[1]) * 100;
    case 'umfang': return 2 * (n[0] + n[1]);
    case 'karte': case 'kartehalb': return rest[0] === 'km' ? (n[2] * n[1]) / 100_000 : (n[2] * n[1]) / 100;
    case 'zurkarte': return n[1];
    case 'etappen': return ((n[1] + n[2]) * n[0]) / 100_000;
    case 'finden': return n[2];
    case 'findenkarte': return (n[1] * 100_000) / n[0];
    case 'zweikarten': return n[0] * n[2];
    default: throw new Error(key);
  }
}

describe('prozent.massstab specifics', () => {
  it('answers follow from the task (independent recomputation)', () => {
    for (const stufe of [1, 2, 3] as Stufe[]) {
      for (const ex of samples(massstabSkill, stufe)) {
        if (ex.answer.kind === 'number') expect(ex.answer.value, ex.key).toBeCloseTo(expected(bareKey(ex)), 6);
      }
    }
  });

  it('a ruler shows the length the task is about', () => {
    for (const stufe of [1, 3] as Stufe[]) {
      for (const ex of samples(massstabSkill, stufe)) {
        if (ex.visual?.type !== 'ruler') continue;
        const parts = bareKey(ex).split(':');
        expect(ex.visual.lengthMm / 10, ex.key).toBe(Number(parts[2]));
      }
    }
  });

  it('each Stufe keeps to its content', () => {
    for (const ex of samples(massstabSkill, 1)) expect(`${ex.context}`, ex.key).toContain('1 : 100');
    for (const ex of samples(massstabSkill, 2)) expect(`${ex.context}`, ex.key).toMatch(/1 : \d\d 000/);
    for (const ex of samples(massstabSkill, 3)) expect(ex.answer, ex.key).toMatchObject({ before: '1 :' });
  });

  it('1 : 100, 3 cm read as 0,03 gets the direction hint', () => {
    for (let seed = 1; seed < 400; seed++) {
      const ex = massstabSkill.generate(createRng(seed), 1, { subtractionMethod: 'abziehen', ab: 1 });
      if (!bareKey(ex).startsWith('plan:') || ex.answer.kind !== 'number' || ex.answer.value !== 3) continue;
      expect(checkAnswer(ex.answer, { kind: 'number', text: '0,03' }, ex.bugs).bugId).toBe('massstab-richtung');
      return;
    }
    throw new Error('no item with 3 cm found');
  });

  it('every worked solution is correct and states the result', () => {
    for (const stufe of [1, 2, 3] as Stufe[]) {
      for (const ex of samples(massstabSkill, stufe)) expect(checkWorkedSolution(ex)).toEqual([]);
    }
  });

  it('no false decimals, no answer printed in the task, no Prozentstreifen that misleads', () => {
    const items = allItems(massstabSkill);
    expect(falseDecimals(items)).toEqual([]);
    expect(answerInTask(items)).toEqual([]);
    expect(barProblems(items)).toEqual([]);
  });

  it('a child who hears the task gets the length that is only in the picture', () => {
    for (const ex of itemsAt(massstabSkill, 1, 2)) expect(srTextWithPicture(ex), ex.key).toMatch(/endet bei/);
  });

  it('a ruler never shows the answer: at 1 : 100 the length in cm is the number of metres', () => {
    for (const ex of allItems(massstabSkill, 500)) {
      if (ex.visual?.type !== 'ruler' || ex.answer.kind !== 'number') continue;
      expect(ex.answer.value, ex.key).not.toBe(ex.visual.lengthMm / 10);
    }
    for (const ex of itemsAt(massstabSkill, 1, 1)) if (bareKey(ex).startsWith('plan:')) expect(ex.visual, ex.key).toBeUndefined();
  });

  it('a hint never holds the result, not even the 100 of the Maßstab', () => {
    for (const ex of allItems(massstabSkill, 500)) {
      if (ex.answer.kind !== 'number' || ex.answer.value === null || ex.answer.value < 10) continue;
      const said = ex.hints.flatMap((h) => [...h.replace(/[\u202F\u2009]/g, '').matchAll(/\d+/g)].map((m) => Number(m[0])));
      expect(said, ex.key).not.toContain(ex.answer.value);
    }
  });

  it('the Streifen shows a room in the accusative', () => {
    const seen = new Set<string>();
    for (const ex of itemsAt(massstabSkill, 1, 2)) {
      const m = /zeigt (\S+)/.exec(ex.context ?? '');
      seen.add(m?.[1] ?? '');
    }
    expect([...seen].sort()).toEqual(['das', 'den', 'die']);
  });

  it('a place of Stufe 3 has a length it can have', () => {
    const shortest: Record<string, number> = { 'den Schulhof': 30, 'der Schulhof': 30, 'der Sportplatz': 50, 'der Garten': 8, 'die Turnhalle': 20 };
    for (const ex of itemsAt(massstabSkill, 3, 1, 1000)) {
      const m = /In echt ist (\S+ \S+) ([\d\u202F]+)/.exec(ex.context ?? '');
      if (!m) throw new Error(ex.key);
      expect(Number(m[2]), ex.key).toBeGreaterThanOrEqual(shortest[m[1]]);
    }
  });

  it('the Maßstab field: its label says "1 :", and the voice says "eins zu Lücke", never a division', () => {
    for (const ab of [1, 2, 3] as const) {
      for (const ex of itemsAt(massstabSkill, 3, ab, 50)) {
        expect(ex.answer, ex.key).toMatchObject({ before: '1 :' });
        expect(ex.answer, ex.key).not.toHaveProperty('label');
        const said = taskSpeech(ex);
        expect(said, ex.key).toMatch(/eins zu Lücke/);
        expect(said, ex.key).not.toMatch(/geteilt/);
        expect(ex.srText, ex.key).toMatch(/1 zu Lücke/);
      }
    }
  });

  it('Stufe 3 never shows the same digits on the plan and in real life', () => {
    const answers = new Set<number>();
    for (const ex of itemsAt(massstabSkill, 3, 1)) {
      if (ex.answer.kind !== 'number' || ex.answer.value === null) throw new Error(ex.key);
      expect(ex.answer.value, ex.key).not.toBe(100);
      answers.add(ex.answer.value);
    }
    expect(answers.size).toBeGreaterThanOrEqual(6);
  });
});
