import { describe, expect, it } from 'vitest';
import { correctResponse, formatAnswer } from '../../core/check';
import { createRng } from '../../core/rng';
import type { Ab, Stufe } from '../../core/types';
import { CATALOGUE, CORE_SKILLS } from '../../data/plans';
import { CTX } from '../test-utils';
import families from './families';
import topic from './index';
import phrases from './phrases';
import { answerInTask, optionStated } from './test-utils';

/** Words that claim an action. A tapped option wrote, calculated or moved nothing (§7.1: praise names what the child did). */
const CLAIMED_ACTION = /geschrieben|in Worte gefasst|übersetzt|abgezogen|addiert|multipliziert|zusammengefasst|ergänzt|mitgezählt|getrennt|verbunden|gerechnet|geprüft|beschrieben|behandelt/;

function allItems(count = 150) {
  return topic.skills.flatMap((skill) => ([1, 2, 3] as Stufe[]).flatMap((stufe) => ([1, 2, 3] as Ab[]).flatMap((ab) => Array.from({ length: count }, (_, i) => skill.generate(createRng(i * 1009 + 13), stufe, { ...CTX, ab })))));
}

describe('topic terme', () => {
  it('a choice item never praises an action the child did not do', () => {
    for (const ex of allItems()) if (ex.answer.kind === 'choice') expect(ex.praise, ex.key).not.toMatch(CLAIMED_ACTION);
  });

  it('a shown answer has the plain form of its value: 10, 8,2 and 4,8 cm, never 10,00 or 8,20', () => {
    for (const ex of allItems()) {
      if (ex.answer.kind === 'number') {
        expect(formatAnswer(ex.answer), ex.key).not.toMatch(/,\d*0(?!\d)/);
        const r = correctResponse(ex.answer);
        if (r.kind === 'number') expect(r.text, ex.key).not.toMatch(/,\d*0$/);
      }
      if (ex.answer.kind === 'multi') expect(formatAnswer(ex.answer), ex.key).not.toMatch(/,\d*0(?!\d)/);
    }
  });

  it('the text before the retry never states the correct option', () => {
    for (const ex of allItems(300)) expect(optionStated(ex), ex.key).toEqual([]);
  });

  it('the answer never stands in the task, and no option repeats the term shown', () => {
    for (const ex of allItems(300)) {
      expect(answerInTask(ex), ex.key).toBe(false);
      if (ex.answer.kind === 'choice') for (const o of ex.answer.options) expect(o.label, ex.key).not.toBe(ex.expression);
    }
  });

  it('a core skill asks for no fraction times or through a number: NR has Bruch · and : only in Klasse 7/8 (§2.3)', () => {
    const fractionProduct = /\{frac:[^}]+\} [·:]| [·:] \{frac:/;
    for (const skill of topic.skills) {
      if (!CORE_SKILLS.includes(skill.id)) continue;
      for (const stufe of [1, 2, 3] as Stufe[]) {
        for (const ab of [1, 2, 3] as Ab[]) {
          for (let i = 0; i < 300; i++) {
            const ex = skill.generate(createRng(i * 1009 + 13), stufe, { ...CTX, ab });
            const options = ex.answer.kind === 'choice' ? ex.answer.options.map((o) => o.label) : [];
            for (const text of [ex.expression ?? '', ...options, ...ex.steps.map((s) => (typeof s === 'string' ? s : s.text))]) expect(text, ex.key).not.toMatch(fractionProduct);
          }
        }
      }
    }
  });

  it('has the skills of the catalogue, in teaching order', () => {
    expect(topic.skills.map((s) => s.id)).toEqual([...CATALOGUE.terme]);
  });

  it('every family is prefixed, has a phrase and names a skill of this topic', () => {
    const ids = topic.skills.map((s) => s.id);
    expect(Object.keys(phrases).sort()).toEqual(Object.keys(families).sort());
    for (const [id, skills] of Object.entries(families)) {
      expect(id.startsWith('terme-'), id).toBe(true);
      for (const skillId of Object.keys(skills)) expect(ids, `${id}: ${skillId}`).toContain(skillId);
    }
  });
});
