import { describe, expect, it } from 'vitest';
import { describeSkill } from '../../core/testing';
import type { VisualOf } from '../../core/types';
import { srTextWithPicture } from '../../ui/visuals/describe';
import skill from './stellenwert';
import { answerValue, describeDecimalRules, items, near, num, placesOf } from './test-helpers';

describeSkill(skill, { minDistinct: 30 });
describeDecimalRules(skill);

const PLACE: Record<string, number> = { Zehntel: 1, Hundertstel: 2, Tausendstel: 3 };

describe('dezimal.stellenwert: content', () => {
  it('Stufe 1 stays at 2 places; the digit asked for stands where the answer says', () => {
    for (const ab of [1, 2, 3] as const) {
      for (const ex of items(skill, 1, ab)) {
        if (ex.expression) expect(placesOf(ex.expression), ex.key).toBeLessThanOrEqual(2);
        if (ex.key.includes(':ziffer:')) {
          const place = PLACE[Object.keys(PLACE).find((p) => ex.prompt.includes(`${p}n`)) ?? ''];
          expect(Number(ex.expression?.split(',')[1][place - 1]), ex.key).toBe(answerValue(ex));
        }
      }
    }
  });

  it('no hint of a place question names the place, whatever the digit', () => {
    const asked = [...items(skill, 1, 1), ...items(skill, 1, 2), ...items(skill, 2, 1)].filter((ex) => /:(stelle|wert):/.test(ex.key));
    expect(asked.length).toBeGreaterThan(0);
    for (const ex of asked) {
      for (const hint of ex.hints) expect(/Einer|Zehntel|Hundertstel|Tausendstel/.test(hint), `${ex.key}: ${hint}`).toBe(false);
    }
  });

  it('Stufe 1, AB I: the Stellentafel helps with the order of the places, but neither its frame nor its label shows the pair of digit and place', () => {
    for (const ex of items(skill, 1, 1)) {
      const v = ex.visual as VisualOf<'placeValue'>;
      expect(v.highlight, ex.key).toBeUndefined();
      expect(v.columns, ex.key).toEqual(['E', 'z', 'h']);
      expect(v.rows.flatMap((r) => r.values).every((d) => d === null), ex.key).toBe(true);
      expect(srTextWithPicture(ex), ex.key).toBe(ex.srText);
    }
  });

  it('a Stellentafel to read has all its digits in the description of the task', () => {
    const read = items(skill, 2, 1).filter((ex) => ex.key.includes(':lesen:'));
    expect(read.length).toBeGreaterThan(0);
    for (const ex of read) {
      const v = ex.visual as VisualOf<'placeValue'>;
      const spoken = srTextWithPicture(ex);
      expect(spoken, ex.key).toContain(`Einer: ${v.rows[0].values[0]}`);
      v.columns.slice(1).forEach((_, i) => expect(spoken, ex.key).toContain(`${['Zehntel', 'Hundertstel', 'Tausendstel'][i]}: ${v.rows[0].values[i + 1]}`));
    }
  });

  it('Stufe 3, AB II needs bundling or a change of unit: the digits of the task alone do not give the answer', () => {
    let mixed = 0;
    let counted = 0;
    for (const ex of items(skill, 3, 2)) {
      const parts = /(\d+) Einer und (\d+) (Zehntel|Hundertstel)/.exec(ex.prompt);
      if (parts) {
        mixed++;
        expect(Math.floor(answerValue(ex)), ex.key).toBeGreaterThan(Number(parts[1]));
        expect(near(answerValue(ex), Number(`${parts[1]}.${parts[2]}`)), ex.key).toBe(false);
      }
      const units = /Wie viele \p{L}+ sind ([\d,]+)\?/u.exec(ex.prompt);
      if (units) {
        counted++;
        expect(answerValue(ex), ex.key).not.toBe(Number(units[1].replace(',', '')));
      }
    }
    expect(mixed).toBeGreaterThan(0);
    expect(counted).toBeGreaterThan(0);
  });

  it('Stufe 2 reads inner zeros: the Stellentafel gives the answer, and 3,05 read as 3,5 has its hint', () => {
    let read = 0;
    for (const ex of items(skill, 2, 1)) {
      if (!ex.key.includes(':lesen:')) continue;
      read++;
      const v = ex.visual as VisualOf<'placeValue'>;
      const row = v.rows[0].values;
      expect(row.some((d) => d === 0), ex.key).toBe(true);
      const after = v.columns.indexOf('E') + 1;
      const value = Number(`${row.slice(0, after).join('')}.${row.slice(after).join('')}`);
      expect(near(value, answerValue(ex)), ex.key).toBe(true);
      expect(ex.bugs?.some((b) => b.id === 'null-ignoriert'), ex.key).toBe(true);
    }
    expect(read).toBeGreaterThan(0);
  });

  it('Stufe 2, AB III: a change by one place carries over', () => {
    for (const ex of items(skill, 2, 3)) {
      const m = /1 (\p{L}+) (größer|kleiner) als ([\d,]+)/u.exec(ex.prompt);
      expect(m, ex.prompt).not.toBeNull();
      const [, place, way, from] = m!;
      const step = 10 ** -PLACE[place];
      expect(near(answerValue(ex), num(from) + (way === 'größer' ? step : -step)), ex.key).toBe(true);
    }
  });

  it('Stufe 3 bundles and splits: the numbers come back', () => {
    for (const ab of [1, 2, 3] as const) {
      for (const ex of items(skill, 3, ab)) {
        const bundle = /^(\d+) (Zehntel|Hundertstel|Tausendstel) = □$/.exec(ex.expression ?? '');
        if (bundle) expect(near(answerValue(ex), Number(bundle[1]) * 10 ** -PLACE[bundle[2]]), ex.key).toBe(true);
        const two = /^(\d+) Zehntel \+ (\d+) Hundertstel = □$/.exec(ex.expression ?? '');
        if (two) expect(near(answerValue(ex), Number(two[1]) / 10 + Number(two[2]) / 100), ex.key).toBe(true);
        if (ex.answer.kind === 'multi') {
          const [coarse, fine] = ex.answer.fields;
          const finePlace = PLACE[fine.after ?? ''];
          expect(PLACE[coarse.after ?? ''], ex.key).toBe(finePlace - 1);
          expect(near(coarse.value * 10 ** -(finePlace - 1) + fine.value * 10 ** -finePlace, num(ex.expression ?? '')), ex.key).toBe(true);
          ex.answer.fields.forEach((f) => expect(f.decimals, 'the comma key stays active').toBe(3));
        }
      }
    }
  });

  it('Stufe 3, AB I bundles when it splits: the first field holds the Einer too, so the digits do not stand in place order', () => {
    const splits = items(skill, 3, 1, 300).filter((ex) => ex.answer.kind === 'multi');
    expect(splits.length).toBeGreaterThan(0);
    for (const ex of splits) {
      if (ex.answer.kind !== 'multi') throw new Error(ex.key);
      expect(ex.answer.fields.length, ex.key).toBe(2);
      expect(ex.answer.fields[0].value, ex.key).toBeGreaterThanOrEqual(10);
      expect(ex.bugs?.some((b) => b.id === 'einer-vergessen'), ex.key).toBe(true);
    }
  });

  it('Stufe 3, AB III: a same-worth option opens 1 Einer, so the right option is not the digits of the number', () => {
    const asked = items(skill, 3, 3, 400).filter((ex) => ex.key.includes(':gleich:'));
    expect(asked.length).toBeGreaterThan(0);
    for (const ex of asked) {
      if (ex.answer.kind !== 'choice') throw new Error(ex.key);
      const shown = /wie ([\d,]+)\?/.exec(ex.prompt)?.[1] ?? '';
      const label = ex.answer.options[ex.answer.correct].label;
      const m = /^(\d+) Einer und (\d+) (Zehntel|Hundertstel)$/.exec(label);
      expect(m, `${ex.key}: ${label}`).not.toBeNull();
      expect(near(Number(m![1]) + Number(m![2]) * 10 ** -PLACE[m![3]], num(shown)), ex.key).toBe(true);
      expect(Number(m![1]), ex.key).toBeLessThan(Math.floor(num(shown)));
      expect(label.replace(/\D/g, ''), ex.key).not.toBe(shown.replace(/\D/g, ''));
      for (const [i, option] of ex.answer.options.entries()) {
        const parts = /^(?:(\d+) Einer und )?(\d+) (Zehntel|Hundertstel)$/.exec(option.label)!;
        const value = Number(parts[1] ?? 0) + Number(parts[2]) * 10 ** -PLACE[parts[3]];
        expect(near(value, num(shown)), `${ex.key}: ${option.label}`).toBe(i === ex.answer.correct);
      }
    }
  });
});
