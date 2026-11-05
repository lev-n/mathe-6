import { describe, expect, it } from 'vitest';
import { describeSkill } from '../../core/testing';
import type { Ab } from '../../core/types';
import { checkAll, correctLabel, hintStatesAnswer, items, numberValue } from './checks';
import { kontextSkill } from './kontext';

describeSkill(kontextSkill);

const ABS = [1, 2, 3] as Ab[];

describe('negativ.kontext', () => {
  it('worked steps, hints, spoken text and labels', () => checkAll(kontextSkill));

  it('Stufe 1 only reads thermometers between −20 and 20', () => {
    for (const ab of ABS) {
      for (const { ex, form } of items(kontextSkill, 1, ab)) {
        const pictures = ex.answer.kind === 'choice' ? ex.answer.options.map((o) => o.visual) : [ex.visual];
        for (const v of pictures) {
          if (v?.type !== 'thermometer') throw new Error(`${ex.key}: a thermometer`);
          expect(v.min).toBeGreaterThanOrEqual(-20);
          expect(v.max).toBeLessThanOrEqual(20);
        }
        if (form === 'thermometer' && ex.visual?.type === 'thermometer') expect(numberValue(ex)).toBe(ex.visual.value);
        if (form === 'bis-null' && ex.visual?.type === 'thermometer') expect(numberValue(ex)).toBe(-ex.visual.value);
        if (form === 'welches' && ex.answer.kind === 'choice') {
          const target = Number(/([−\d]+)/.exec(ex.prompt)?.[1].replace('−', '-'));
          const picture = ex.answer.options[ex.answer.correct].visual;
          expect(picture?.type === 'thermometer' && picture.value).toBe(target);
        }
      }
    }
  });

  it('Stufe 2 turns Konto, Stockwerke and Meereshöhe into the number with the right sign', () => {
    for (const { ex } of items(kontextSkill, 2, 1)) {
      const label = correctLabel(ex);
      const context = ex.context ?? '';
      expect(/Konto|Aufzug|Meeresspiegel/.test(context), context).toBe(true);
      expect(label.startsWith('−')).toBe(/unter dem Meeresspiegel|Schulden|Untergeschoss/.test(context));
    }
    const below = /im Minus|tief im Meer|unter dem Erdgeschoss/;
    let positive = 0;
    for (const { ex } of items(kontextSkill, 2, 2, 800)) {
      // a positive number is never just copied: a place below 0 stands beside it, so the sign is still to decide
      expect(below.test(ex.context ?? ''), ex.key).toBe(true);
      if (numberValue(ex) > 0) {
        positive++;
        expect(ex.context ?? '', ex.key).toMatch(/im Plus|über dem Meer|im \p{L}+ Stock/u);
        expect(ex.bugs?.some((b) => b.id === 'andere-stelle' && b.match === Number(ex.key.split(':').pop())), ex.key).toBe(true);
      }
    }
    expect(positive).toBeGreaterThan(0);
  });

  it('a tick value never states the answer of a level one tick from the 0', () => {
    for (const ab of [2, 3] as Ab[]) {
      for (const { ex } of items(kontextSkill, 1, ab, 800)) expect(hintStatesAnswer(ex)).toEqual([]);
    }
  });

  it('Stufe 2 AB III needs a step from a second place: the number is not in the text, the words alone do not decide the sign, and a negative number is always part of it', () => {
    let positive = 0;
    let negative = 0;
    for (const { ex, form, p } of items(kontextSkill, 2, 3, 800)) {
      expect(form).toBe('bezug');
      const [base, move] = p.slice(1).map(Number);
      const value = numberValue(ex);
      expect(value, ex.key).toBe(base + move);
      expect(Math.min(base, value), `${ex.key}: positive numbers only are a plain sum`).toBeLessThan(0);
      const told = ((ex.context ?? '').replace(/\u202F|\u2009/g, '').match(/\d+/g) ?? []).map(Number);
      expect(told, ex.key).not.toContain(Math.abs(value));
      if (value > 0) positive++;
      else negative++;
    }
    expect(positive).toBeGreaterThan(0);
    expect(negative).toBeGreaterThan(0);
  });

  it('Stufe 3 AB III follows a step and the Gegenzahl: no option falls to the sign or the size alone', () => {
    const value = (label: string) => Number(/(−?)(\d+)/.exec(label)?.slice(1).join('').replace('−', '-'));
    let positive = 0;
    let negative = 0;
    for (const { ex, form, p } of items(kontextSkill, 3, 3, 800)) {
      expect(form).toBe('stimmt');
      if (ex.answer.kind !== 'choice') throw new Error('choice');
      const [base, move] = p.slice(1).map(Number);
      const answer = -(base + move);
      expect(answer, ex.key).not.toBe(0);
      expect(value(correctLabel(ex)), ex.key).toBe(answer);
      const options = ex.answer.options.map((o) => value(o.label));
      expect(options, ex.key).toHaveLength(4);
      expect(options.filter((v) => v < 0), `${ex.key}: the side alone must not find it`).toHaveLength(2);
      expect(options.filter((v) => Math.abs(v) === Math.abs(answer)), `${ex.key}: the size alone must not find it`).toHaveLength(2);
      const told = ((ex.context ?? '').match(/\d+/g) ?? []).map(Number);
      expect(told, ex.key).not.toContain(Math.abs(answer));
      expect(ex.context ?? '', ex.key).toContain('Gegenzahl');
      if (answer > 0) positive++;
      else negative++;
    }
    expect(positive).toBeGreaterThan(0);
    expect(negative).toBeGreaterThan(0);
  });

  it('Stufe 3 AB I says that a Stand is wanted, as −n also fits a change', () => {
    for (const { ex } of items(kontextSkill, 3, 1)) {
      expect(ex.context, ex.key).toBe('Gesucht ist ein Stand, keine Änderung.');
      expect(ex.srText, ex.key).toContain('Stand');
    }
  });

  it('a temperature story stays real: under 20 Grad from morning to midday', () => {
    for (const { ex, p } of items(kontextSkill, 3, 2, 800)) {
      if (p[0] === 'wetter') expect(2 * Number(p[1]), ex.key).toBeLessThan(20);
    }
  });

  it('Stufe 3 asks which statement fits or for the Gegenzahl; a Konto never belongs to a person', () => {
    for (const { ex } of items(kontextSkill, 3, 1)) expect(ex.prompt).toMatch(/^Welche Aussage passt zu −/);
    for (const { ex, form, p } of items(kontextSkill, 3, 2)) {
      expect(form).toBe('gegenzahl');
      expect(Math.abs(numberValue(ex))).toBe(Number(p[1]));
    }
    for (const { ex } of items(kontextSkill, 3, 3)) expect(ex.prompt).toBe('Welche Aussage stimmt?');
    for (const stufe of [2, 3] as const) {
      for (const ab of ABS) {
        for (const { ex } of items(kontextSkill, stufe, ab)) expect(ex.context ?? '').not.toMatch(/(?:Mama|Papa|Eltern|Familie|Taschengeld|mein|dein)/);
      }
    }
  });
});
