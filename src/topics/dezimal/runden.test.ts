import { describe, expect, it } from 'vitest';
import { checkAnswer, formatAnswer } from '../../core/check';
import { describeSkill } from '../../core/testing';
import skill from './runden';
import { answerValue, describeDecimalRules, items, near, num, placesOf, quotientStepProblems } from './test-helpers';

describeSkill(skill, { minDistinct: 30 });
describeDecimalRules(skill);

/** Half up, in integers. */
const rounded = (text: string, to: number) => {
  const int = Number(text.replace(',', ''));
  const unit = 10 ** (placesOf(text) - to);
  return Math.floor((int + unit / 2) / unit) / 10 ** to;
};

describe('dezimal.runden: content', () => {
  it('Stufe 1 rounds a number of one place to a whole number', () => {
    for (const ab of [1, 2] as const) {
      for (const ex of items(skill, 1, ab)) {
        const shown = (ex.expression ?? '').split(' ')[0];
        expect(placesOf(shown), ex.key).toBe(1);
        expect(answerValue(ex), ex.key).toBe(rounded(shown, 0));
      }
    }
  });

  it('Stufe 1, AB III: only the right number rounds to the target', () => {
    for (const ex of items(skill, 1, 3)) {
      if (ex.answer.kind !== 'choice') throw new Error(ex.key);
      const { options, correct } = ex.answer;
      const target = Number(/erhältst (\d+)/.exec(ex.prompt)?.[1]);
      options.forEach((o, i) => expect(rounded(o.label, 0) === target, `${ex.key}: ${o.label}`).toBe(i === correct));
    }
  });

  it('Stufe 2 rounds to Zehntel or Hundertstel, and 2,96 becomes 3,0', () => {
    let overNine = 0;
    for (const ab of [1, 2] as const) {
      for (const ex of items(skill, 2, ab)) {
        const shown = (ex.expression ?? '').split(' ')[0];
        const to = ex.prompt.includes('Zehntel') ? 1 : 2;
        if (ex.answer.kind === 'choice') {
          overNine++;
          expect(near(num(ex.answer.options[ex.answer.correct].label), rounded(shown, to)), ex.key).toBe(true);
        } else expect(near(answerValue(ex), rounded(shown, to)), ex.key).toBe(true);
      }
    }
    expect(overNine).toBeGreaterThan(0);
  });

  it('the revealed answer keeps the place it is rounded to, and rounding to another place is not accepted', () => {
    for (const ab of [1, 2] as const) {
      for (const ex of items(skill, 2, ab)) {
        const to = ex.prompt.includes('Zehntel') ? 1 : 2;
        const shown = (ex.expression ?? '').split(' ')[0];
        expect(placesOf(formatAnswer(ex.answer)), `${ex.key}: ${formatAnswer(ex.answer)}`).toBe(to);
        expect(ex.steps.at(-1)?.toString(), ex.key).toContain(formatAnswer(ex.answer));
        if (ex.answer.kind === 'number') {
          const coarser = rounded(shown, to - 1);
          const result = checkAnswer(ex.answer, { kind: 'number', text: String(coarser).replace('.', ',') }, ex.bugs);
          expect(result.correct, ex.key).toBe(false);
          expect(result.bugHint, `${ex.key}: rounding to the wrong place gets feedback`).toBeTruthy();
        } else if (ex.answer.kind === 'choice') {
          const { options, correct } = ex.answer;
          // the same value without the place stands among the wrong options, with its own answer
          const same = options.findIndex((o, i) => i !== correct && near(num(o.label), num(options[correct].label)));
          expect(same, `${ex.key}: ${options.map((o) => o.label).join(' | ')}`).toBeGreaterThanOrEqual(0);
          expect(options[same].whyWrong, ex.key).toBeTruthy();
        } else throw new Error(ex.key);
      }
    }
  });

  it('a length rounded to Zentimeter shows both places in the solution and in the last step', () => {
    const lengths = items(skill, 3, 1, 400).filter((ex) => ex.key.includes(':laenge:'));
    expect(lengths.length).toBeGreaterThan(0);
    for (const ex of lengths) {
      const solution = formatAnswer(ex.answer).replace(/\s?m$/, '');
      expect(placesOf(solution), `${ex.key}: ${solution}`).toBe(2);
      expect(String(ex.steps.at(-1)).replace(/\u00A0/g, ' '), ex.key).toContain(`${solution} m`);
      const coarser = rounded(num(/zeigt ([\d,]+)/.exec(ex.context ?? '')?.[1] ?? '').toFixed(3).replace('.', ','), 1);
      expect(checkAnswer(ex.answer, { kind: 'number', text: String(coarser).replace('.', ',') }, ex.bugs).bugHint, ex.key).toBeTruthy();
    }
  });

  it('the quantities of the stories fit what they name', () => {
    const LENGTHS: Record<string, [number, number]> = { 'den Flur': [12, 41], 'die Turnhalle': [20, 46], 'den Schulhof': [30, 81], 'die Laufbahn': [50, 111], 'den Weg zum Bus': [80, 251] };
    const seen = new Set<string>();
    for (const ex of items(skill, 3, 1, 600)) {
      const m = /misst (.+)\. Das Messgerät zeigt ([\d,]+)/.exec(ex.context ?? '');
      if (!m) continue;
      seen.add(m[1]);
      const [min, max] = LENGTHS[m[1]];
      expect(num(m[2]) >= min && num(m[2]) < max, `${ex.key}: ${ex.context}`).toBe(true);
    }
    expect(seen.size).toBe(Object.keys(LENGTHS).length);
    for (const ex of items(skill, 3, 3, 600)) {
      expect(/Tee\b/.test(ex.context ?? ''), ex.key).toBe(false);
      for (const text of [...ex.hints, ...(ex.bugs ?? []).map((b) => b.hint)]) expect(/Mit \d+ (Eimer|Säcke)\b/.test(text), `${ex.key}: ${text}`).toBe(false);
    }
  });

  it('a pack price asks for a price per piece: no one shares money and then pays it', () => {
    const packs = items(skill, 3, 1, 400).filter((ex) => ex.key.includes(':teilen:'));
    expect(packs.length).toBeGreaterThan(0);
    for (const ex of packs) expect(/teilen sich|zahlt/.test(`${ex.context} ${ex.prompt}`), `${ex.key}: ${ex.context} ${ex.prompt}`).toBe(false);
  });

  it('the first step of a story states a true quotient: 9,00 : 3,40 ≈ 2,65, and an exact one with =', () => {
    const stories = items(skill, 3, 3, 800);
    expect(stories.flatMap(quotientStepProblems)).toEqual([]);
    expect(stories.some((ex) => /^\d[\d,]* : [\d,]+ ≈ /.test(String(ex.steps[0])))).toBe(true);
    expect(stories.some((ex) => /^\d[\d,]* : [\d,]+ = /.test(String(ex.steps[0])))).toBe(true);
  });

  it('Stufe 2, AB III: the border rounds to the given number, one step further does not', () => {
    for (const ex of items(skill, 2, 3)) {
      const target = num(/Zahl ([\d,]+)\./.exec(ex.context ?? '')?.[1] ?? '');
      const value = answerValue(ex);
      const text = value.toFixed(2).replace('.', ',');
      expect(near(rounded(text, 1), target), ex.key).toBe(true);
      const beyond = (Math.round(value * 100) + (ex.prompt.includes('kleinste') ? -1 : 1)).toString();
      expect(near(rounded(`${beyond.slice(0, -2)},${beyond.slice(-2)}`, 1), target), ex.key).toBe(false);
    }
  });

  it('Stufe 3: a story says up or down, against the rule', () => {
    for (const ex of items(skill, 3, 3)) {
      const bug = ex.bugs?.find((b) => b.id === 'nach-regel-gerundet');
      expect(bug, ex.key).toBeDefined();
      expect(Math.abs((bug?.match as number) - answerValue(ex)), ex.key).toBe(1);
    }
    for (const ex of items(skill, 3, 1)) expect(ex.context, ex.key).toBeTruthy();
  });

  it('Stufe 3, AB III: rounding up comes from a division whose rest the rule rounds down', () => {
    const up = items(skill, 3, 3).filter((ex) => ex.key.includes(':auf:'));
    expect(up.length).toBeGreaterThan(0);
    for (const ex of up) {
      const [total, each] = [...(ex.context ?? '').matchAll(/([\d,]+) (?:l|m|kg)\b/g)].map((m) => num(m[1]));
      const quotient = total / each;
      expect(answerValue(ex), ex.key).toBe(Math.ceil(quotient));
      expect(quotient - Math.floor(quotient), ex.key).toBeGreaterThan(0);
      expect(quotient - Math.floor(quotient), ex.key).toBeLessThan(0.5);
    }
  });

  it('Stufe 3: an Überschlag rounds every number first', () => {
    const estimates = items(skill, 3, 2).filter((ex) => ex.key.includes(':ueberschlag:'));
    expect(estimates.length).toBeGreaterThan(0);
    for (const ex of estimates) {
      const m = /^([\d,]+) ([+·]) ([\d,]+) ≈ □$/.exec(ex.expression ?? '')!;
      const [a, b] = [rounded(m[1], 0), rounded(m[3], 0)];
      expect(answerValue(ex), ex.key).toBe(m[2] === '+' ? a + b : a * b);
    }
  });
});
