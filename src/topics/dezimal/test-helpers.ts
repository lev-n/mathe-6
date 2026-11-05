/** Test support of the topic 'dezimal' (imported only by *.test.ts): checks that every skill shares, and small readers for the numbers of a task. */
import { describe, expect, it } from 'vitest';
import { fmt, spokenWords } from '../../core/format';
import { createRng } from '../../core/rng';
import type { Ab, Exercise, SkillDef, Stufe } from '../../core/types';
import { writtenPlaces } from '../../core/written';
import { srTextWithPicture } from '../../ui/visuals/describe';
import { checkWorkedSolution } from '../step-check';

const STUFEN: readonly Stufe[] = [1, 2, 3];
const ABS: readonly Ab[] = [1, 2, 3];

/** Items of one Stufe and AB, both subtraction methods. */
export function items(skill: SkillDef, stufe: Stufe, ab: Ab, n = 120): Exercise[] {
  return Array.from({ length: n }, (_, i) => skill.generate(createRng(i * 8171 + stufe * 37 + ab * 5), stufe, { subtractionMethod: i % 2 ? 'abziehen' : 'ergaenzen', ab }));
}

export function allItems(skill: SkillDef, n = 120): Exercise[] {
  return STUFEN.flatMap((s) => ABS.flatMap((ab) => items(skill, s, ab, n)));
}

/** A decimal as it stands in a text, '3,05' → 3.05. */
export const num = (text: string) => Number(text.replace(/[ \s]/g, '').replace(',', '.'));

/** The decimal numbers of a text, in order. */
export const decimalsIn = (text: string) => [...text.matchAll(/\d+(?:[ ]\d{3})*(?:,\d+)?/g)].map((m) => m[0]);

/** Places after the comma of a number as written: '3,05' → 2. */
export const placesOf = (text: string) => text.split(',')[1]?.length ?? 0;

/** The answer of a number or written item as a value. */
export function answerValue(ex: Exercise): number {
  const a = ex.answer;
  if (a.kind === 'number' && a.value !== null) return a.value;
  if (a.kind === 'written') return a.result / 10 ** writtenPlaces(a);
  throw new Error(`${ex.key}: no number answer`);
}

export const near = (a: number, b: number) => Math.abs(a - b) < 1e-9;

/** All the text a child reads on an item. */
export function childTexts(ex: Exercise): string[] {
  const options = ex.answer.kind === 'choice' ? ex.answer.options.flatMap((o) => [o.label, o.whyWrong ?? '']) : [];
  return [ex.context ?? '', ex.prompt, ex.expression ?? '', ex.praise, ...ex.hints, ...ex.steps.map((s) => (typeof s === 'string' ? s : s.text)), ...(ex.bugs ?? []).map((b) => b.hint), ...options].filter(Boolean);
}

const STEP_QUOTIENT = /(\d[\d,]*)(?:\s€)? : (\d[\d,]*)(?:\s€)? ([=≈]) (\d[\d,]*)(…?)(?![\d,]* :)/g;

/** Every quotient in the worked steps, recomputed in integers: '≈' stands for a quotient that does not end there and is rounded half up, '…' for one that is cut off, '=' for one that ends. */
export function quotientStepProblems(ex: Exercise): string[] {
  const out: string[] = [];
  const parts = (text: string): [number, number] => [Number(text.replace(',', '')), placesOf(text)];
  for (const step of ex.steps) {
    const text = (typeof step === 'string' ? step : step.text).replace(/\u00A0/g, ' ');
    for (const m of text.matchAll(STEP_QUOTIENT)) {
      const [[a, pa], [b, pb], [c, pc]] = [parts(m[1]), parts(m[2]), parts(m[4])];
      const [n, d] = [a * 10 ** pb * 10 ** pc, b * 10 ** pa];
      const ends = n % d === 0;
      const right = m[5] ? !ends && Math.floor(n / d) === c : m[3] === '≈' ? !ends && Math.floor((2 * n + d) / (2 * d)) === c : ends && n / d === c;
      if (!right) out.push(`${ex.key}: "${m[0]}"`);
    }
  }
  return out;
}

/** The checks of the topic beyond describeSkill. */
export function describeDecimalRules(skill: SkillDef): void {
  describe(`${skill.id}: rules of the topic`, () => {
    const all = allItems(skill, 80);

    it('sets the comma key for the whole skill', () => {
      expect(skill.keys).toEqual({ comma: true });
    });

    it('has at least 2 hints on every item', () => {
      for (const ex of all) expect(ex.hints.length, ex.key).toBeGreaterThanOrEqual(2);
    });

    it('worked steps compute and state the result', () => {
      for (const ex of all) expect(checkWorkedSolution(ex)).toEqual([]);
    });

    it('a quotient in a worked step is exact, really rounded or marked as cut off', () => {
      for (const ex of all) expect(quotientStepProblems(ex)).toEqual([]);
    });

    it('no hint states a comma answer, whatever its size', () => {
      for (const ex of all) {
        if (ex.answer.kind !== 'number' && ex.answer.kind !== 'written') continue;
        const value = answerValue(ex);
        if (Number.isInteger(value)) continue;
        const shown = fmt(value);
        const task = [ex.context, ex.prompt, ex.expression].filter(Boolean).join(' ');
        if (task.includes(shown)) continue;
        for (const hint of ex.hints) expect(new RegExp(`(?<![\\d,])${shown}(?![\\d,])`).test(hint), `${ex.key}: "${hint}"`).toBe(false);
      }
    });

    it('speaks the digits after the comma one by one, never as a number word (T20)', () => {
      for (const ex of all) {
        expect(/\d,\d/.test(ex.srText), `${ex.key}: ${ex.srText}`).toBe(ex.literalComma === true && /\d,\d/.test(ex.srText));
        const spoken = spokenWords([ex.context, ex.prompt, ex.expression].filter(Boolean).join(' '), { literalComma: ex.literalComma });
        expect(/Komma \p{L}*(zehn|zig|ßig|elf|zwölf|hundert)/u.test(spoken), `${ex.key}: ${spoken}`).toBe(false);
      }
      expect(spokenWords('3,14')).toBe('drei Komma eins vier');
    });

    // A literal comma keeps its digits together in the shared picture description of describe.ts, which needs a fix there (a table in dezimal.groessen).
    it('the picture description added to srText also says the digits one by one (T20)', () => {
      for (const ex of all) {
        if (!ex.literalComma) expect(/\d,\d/.test(srTextWithPicture(ex)), `${ex.key}: ${srTextWithPicture(ex)}`).toBe(false);
      }
    });

    it('no text says 1 Stellen, 1 Ganze or 0,1 sind 1 Zehntel', () => {
      for (const ex of all) {
        for (const text of childTexts(ex)) {
          expect(/(?<![\d,])1 (Stellen|Ganze\b|Schritte|Nullen)/.test(text), `${ex.key}: ${text}`).toBe(false);
          expect(/(\{frac:1\/\d+\}|\b0,0*1) sind 1 /.test(text), `${ex.key}: ${text}`).toBe(false);
        }
      }
    });

    it('text and praise do not claim what the input did: a tap writes nothing, and WrittenInput sets the commas, the end zeros and the shift', () => {
      for (const ex of all) {
        const a = ex.answer;
        if (a.kind === 'choice' || a.kind === 'order' || a.kind === 'numberline') expect(/geschrieben|aufgefüllt/.test(ex.praise), `${ex.key}: ${ex.praise}`).toBe(false);
        if (a.kind !== 'written') continue;
        const told = [ex.prompt, ex.praise, ...ex.hints, ...(ex.bugs ?? []).map((b) => b.hint)];
        for (const text of told) {
          if (a.op === 'add' || a.op === 'sub') expect(/Schreibe Komma|Komma unter Komma geschrieben|aufgefüllt\.|Fülle /.test(text), `${ex.key}: ${text}`).toBe(false);
          if (a.op === 'div') expect(/Verschiebe\b|verschiebst|Du hast das Komma/.test(text), `${ex.key}: ${text}`).toBe(false);
        }
      }
    });

    it('AB varies the demand inside each Stufe: at least two task forms per Stufe', () => {
      const form = (ex: Exercise) => ex.key.split(':')[2];
      for (const stufe of STUFEN) {
        const forms = new Set(ABS.flatMap((ab) => items(skill, stufe, ab, 40).map(form)));
        expect(forms.size, `${skill.id} Stufe ${stufe}: ${[...forms].join(', ')}`).toBeGreaterThanOrEqual(2);
      }
    });
  });
}
