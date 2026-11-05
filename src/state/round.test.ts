import { describe, expect, it } from 'vitest';
import { AB_MIX, AB_MIX_SHORT, DEFAULT_STUFE, SHORT_ROUND_SIZE } from '../core/age';
import { createRng } from '../core/rng';
import type { Stufe } from '../core/types';
import { addDays } from './dates';
import { applyAnswer } from './mastery';
import { MAX_TWINS, REVIEW_MAX, ROUND_SIZE, buildRound, mixedStufe } from './round';
import { REVIEWS_PER_DAY, dueReviews, reviewBudget } from './selectors';
import { emptyState } from './store';
import { entry, skillDef, withSkills } from './testkit';
import type { ProgressState, RoundSlot, StufeProgress } from './types';

const DAY = '2026-10-19';
// Five core skills of one topic, as the tests of the round's shape need them (ids of other topics are not looked at here).
const ZAHLEN = ['brueche.anteil', 'brueche.erweitern-kuerzen', 'brueche.zahlenstrahl', 'brueche.vergleichen', 'brueche.von-groessen5'].map((id) => skillDef(id));
const SKILLS = [...ZAHLEN, skillDef('brueche.gemischt'), skillDef('flaechen.einheiten')];

function noAdjacentRepeats(slots: RoundSlot[]): boolean {
  return slots.every((s, i) => i === 0 || s.skillId !== slots[i - 1].skillId);
}

function counts(slots: RoundSlot[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const s of slots) m.set(s.skillId, (m.get(s.skillId) ?? 0) + 1);
  return m;
}

/** An arrangement without neighbours of the same skill exists iff the largest group ≤ others + 1. */
function separable(slots: RoundSlot[]): boolean {
  const max = Math.max(...counts(slots).values());
  return max <= slots.length - max + 1;
}

describe("plan 'skill'", () => {
  it('gives 10 practice slots of the chosen skill and Stufe', () => {
    const slots = buildRound({ mode: 'skill', skillId: 'brueche.anteil', stufe: 2 }, emptyState(), DAY, createRng(1), SKILLS);
    expect(ROUND_SIZE).toBe(10);
    expect(slots).toHaveLength(ROUND_SIZE);
    expect(slots.every((s) => s.skillId === 'brueche.anteil' && s.stufe === 2 && s.purpose === 'practice')).toBe(true);
    expect(MAX_TWINS).toBe(2);
  });

  it.each([
    [1, [1, 1, 1, 1, 1, 1, 1, 2, 2, 3]],
    [2, [1, 1, 1, 1, 2, 2, 2, 2, 3, 3]],
    [3, [1, 1, 2, 2, 2, 2, 2, 3, 3, 3]],
  ] as const)('Stufe %i has the AB mix of the research, easier items first', (stufe, abs) => {
    const slots = buildRound({ mode: 'skill', skillId: 'brueche.anteil', stufe }, emptyState(), DAY, createRng(1), SKILLS);
    expect(slots.map((s) => s.ab)).toEqual(abs);
    expect(AB_MIX[stufe].reduce((a, b) => a + b, 0)).toBe(ROUND_SIZE);
  });

  it('a written skill has the same 10 items as any other skill: no shorter written round', () => {
    const slots = buildRound({ mode: 'skill', skillId: 'dezimal.plus-minus', stufe: 1 }, emptyState(), DAY, createRng(1), SKILLS);
    expect(slots).toHaveLength(ROUND_SIZE);
  });

  it.each([
    [1, [1, 1, 1, 2, 3]],
    [2, [1, 1, 2, 2, 3]],
    [3, [1, 2, 2, 3, 3]],
  ] as const)('the optional short round has 5 items, at Stufe %i with a harder item too, and the same skill and Stufe', (stufe, abs) => {
    const slots = buildRound({ mode: 'skill', skillId: 'brueche.anteil', stufe, short: true }, emptyState(), DAY, createRng(1), SKILLS);
    expect(slots.map((s) => s.ab)).toEqual(abs);
    expect(slots.every((s) => s.skillId === 'brueche.anteil' && s.stufe === stufe && s.purpose === 'practice')).toBe(true);
    expect(AB_MIX_SHORT[stufe].reduce((a, b) => a + b, 0)).toBe(SHORT_ROUND_SIZE);
  });
});

describe("plan 'mixed'", () => {
  const mixed = (state: ProgressState, seed: number, skills = SKILLS) => buildRound({ mode: 'mixed', topicId: 'brueche' }, state, DAY, createRng(seed), skills);

  it('new topic: 10 slots spread evenly over the skills in the plan, never the same skill twice in a row', () => {
    for (let seed = 0; seed < 200; seed++) {
      const slots = mixed(emptyState(), seed);
      expect(slots).toHaveLength(10);
      expect(slots.every((s) => s.purpose === 'mixed' && s.stufe === DEFAULT_STUFE)).toBe(true); // new skills: the default Stufe
      expect(noAdjacentRepeats(slots)).toBe(true);
      const c = counts(slots);
      // brueche.von-groessen5 stands for an Extra here: only the four core skills, spread evenly
      expect([...c.keys()].sort()).toEqual(ZAHLEN.map((s) => s.id).filter((id) => id !== 'brueche.von-groessen5').sort());
      expect(Math.max(...c.values()) - Math.min(...c.values())).toBeLessThanOrEqual(1);
    }
  });

  it('prefers practised skills, each at its practised/suggested Stufe', () => {
    const state = withSkills({
      'brueche.anteil#1': entry('sicher'),
      'brueche.anteil#2': entry('geuebt'),
      'brueche.vergleichen#1': entry('geuebt'),
      'brueche.zahlenstrahl#1': entry('gemeistert'),
      'flaechen.einheiten#1': entry('sicher'),
    });
    for (let seed = 0; seed < 100; seed++) {
      const slots = mixed(state, seed);
      expect(slots).toHaveLength(10);
      expect(noAdjacentRepeats(slots)).toBe(true);
      const c = counts(slots);
      expect([...c.keys()].sort()).toEqual(['brueche.anteil', 'brueche.vergleichen', 'brueche.zahlenstrahl']);
      expect(Math.max(...c.values()) - Math.min(...c.values())).toBeLessThanOrEqual(1);
      for (const s of slots) {
        // brueche.zahlenstrahl#1 is mastered and the new Stufe 2 is not opened yet: practised Stufe
        const expected: Record<string, Stufe> = { 'brueche.anteil': 2, 'brueche.vergleichen': 1, 'brueche.zahlenstrahl': 1 };
        expect(s.stufe).toBe(expected[s.skillId]);
      }
    }
  });

  it('mixedStufe: suggested Stufe once worked on, otherwise the practised one', () => {
    const s = withSkills({
      'brueche.anteil#1': entry('sicher'),
      'brueche.vergleichen#2': entry('geuebt'),
      'brueche.zahlenstrahl#1': entry('sicher'),
      'brueche.zahlenstrahl#2': entry('sicher'),
      'brueche.zahlenstrahl#3': entry('sicher'),
    });
    expect(mixedStufe(s, 'brueche.anteil')).toBe(1); // Stufe 2 not opened yet
    expect(mixedStufe(s, 'brueche.vergleichen')).toBe(2); // works on Stufe 2
    expect(mixedStufe(s, 'brueche.zahlenstrahl')).toBe(3);
    expect(mixedStufe(s, 'brueche.neu')).toBe(1); // new: the default suggestion
  });

  it('with fewer than 2 practised skills the whole topic is used, practised skills first for extra slots', () => {
    const three = ZAHLEN.slice(0, 3);
    const state = withSkills({ 'brueche.zahlenstrahl#1': entry('geuebt') });
    for (let seed = 0; seed < 50; seed++) {
      const slots = mixed(state, seed, three);
      expect(noAdjacentRepeats(slots)).toBe(true);
      expect(counts(slots).get('brueche.zahlenstrahl')).toBe(4);
    }
  });

  it('includes an Extra only once the child has practised it, unless the plan has it', () => {
    expect(mixed(emptyState(), 3).some((s) => s.skillId === 'brueche.gemischt')).toBe(false);
    const practised = withSkills({ 'brueche.gemischt#1': entry('geuebt'), 'brueche.anteil#1': entry('geuebt') });
    expect(counts(mixed(practised, 3)).get('brueche.gemischt')).toBeGreaterThan(0);
    const inPlan = { ...emptyState(), settings: { ...emptyState().settings, plan: 'bg' as const } };
    expect(mixed(inPlan, 3).some((s) => s.skillId === 'brueche.gemischt')).toBe(true);
  });

  it('is deterministic per rng seed and varies between seeds', () => {
    expect(mixed(emptyState(), 42)).toEqual(mixed(emptyState(), 42));
    const orders = new Set(Array.from({ length: 20 }, (_, seed) => mixed(emptyState(), seed).map((s) => s.skillId).join()));
    expect(orders.size).toBeGreaterThan(10);
  });

  it('handles tiny and huge topics', () => {
    expect(mixed(emptyState(), 1, [])).toEqual([]);
    const one = mixed(emptyState(), 1, [skillDef('brueche.anteil')]);
    expect(one).toHaveLength(10);
    expect(one.every((s) => s.skillId === 'brueche.anteil')).toBe(true);
    const twelve = Array.from({ length: 12 }, (_, i) => skillDef(`brueche.von-groessen${i}`));
    const practisedAll: Record<string, StufeProgress> = {};
    twelve.forEach((s) => (practisedAll[`${s.id}#1`] = entry('geuebt')));
    const slots = mixed(withSkills(practisedAll), 9, twelve);
    expect(slots).toHaveLength(10);
    expect(new Set(slots.map((s) => s.skillId)).size).toBe(10);
  });
});

describe("plan 'review'", () => {
  const review = (state: ProgressState, seed = 1, skills = SKILLS) => buildRound({ mode: 'review' }, state, DAY, createRng(seed), skills);
  const due = (d: string, extra: Partial<StufeProgress> = {}) => entry('sicher', { box: 2, due: d, ...extra });

  it('is empty when nothing is due', () => {
    const s = withSkills({ 'brueche.anteil#1': due('2026-10-20'), 'brueche.vergleichen#1': entry('geuebt') });
    expect(review(s)).toEqual([]);
    expect(review(emptyState())).toEqual([]);
  });

  it('one due skill-Stufe gets 3 slots, the smallest warm-up', () => {
    const slots = review(withSkills({ 'brueche.anteil#2': due('2026-10-18') }));
    expect(slots).toHaveLength(3);
    expect(slots.every((s) => s.skillId === 'brueche.anteil' && s.stufe === 2 && s.purpose === 'review')).toBe(true);
  });

  it('many due items: at most 5 slots', () => {
    const many: Record<string, StufeProgress> = {};
    for (let i = 0; i < 12; i++) many[`brueche.von-groessen${i}#1`] = due(`2026-10-${String(i + 1).padStart(2, '0')}`);
    expect(review(withSkills(many), 1, Object.keys(many).map((k) => skillDef(k.split('#')[0])))).toHaveLength(REVIEW_MAX);
    expect(REVIEW_MAX).toBe(5);
  });

  it('the cap of 8 is per day: a second warm-up gets the rest, then nothing more today, the rest comes tomorrow', () => {
    const many: Record<string, StufeProgress> = {};
    for (let i = 0; i < 12; i++) many[`brueche.von-groessen${i}#1`] = due(`2026-10-${String(i + 1).padStart(2, '0')}`);
    const defs = Object.keys(many).map((k) => skillDef(k.split('#')[0]));
    let s = withSkills(many);
    const answerAll = (slots: RoundSlot[]) => {
      for (const slot of slots) s = applyAnswer(s, { skillId: slot.skillId, topicId: 'brueche', stufe: slot.stufe, firstTry: true, solved: true, usedHint: false, purpose: 'review', day: DAY }).state;
    };
    const first = review(s, 1, defs);
    expect(first).toHaveLength(5);
    answerAll(first);
    expect(reviewBudget(s, DAY)).toBe(3);
    const second = review(s, 1, defs);
    expect(second).toHaveLength(3);
    answerAll(second);
    expect(s.reviewed).toEqual({ day: DAY, count: REVIEWS_PER_DAY });
    expect(reviewBudget(s, DAY)).toBe(0);
    // 4 skill-Stufen are still due, but today's 8 are done
    expect(dueReviews(s, DAY, 100)).toHaveLength(4);
    expect(review(s, 2, defs)).toEqual([]);
    // tomorrow the rest comes back
    const tomorrow = buildRound({ mode: 'review' }, s, addDays(DAY, 1), createRng(3), defs);
    expect(tomorrow).toHaveLength(5);
    expect(new Set(tomorrow.map((x) => x.skillId))).toEqual(new Set(['brueche.von-groessen8', 'brueche.von-groessen9', 'brueche.von-groessen10', 'brueche.von-groessen11']));
  });

  it('a budget of 1 still gives one slot, and a count from an earlier day does not limit today', () => {
    const s = withSkills({ 'brueche.vergleichen#1': due('2026-10-10'), 'brueche.anteil#1': due('2026-10-12') });
    expect(reviewBudget({ ...s, reviewed: { day: '2026-10-18', count: 8 } }, DAY)).toBe(REVIEWS_PER_DAY);
    expect(review({ ...s, reviewed: { day: DAY, count: 7 } })).toHaveLength(1);
  });

  it('two Stufen of one skill are treated as one skill for interleaving', () => {
    const s = withSkills({ 'brueche.anteil#1': due('2026-10-10'), 'brueche.anteil#2': due('2026-11-12'), 'brueche.vergleichen#1': due('2026-10-12'), 'brueche.zahlenstrahl#1': due('2026-10-13') });
    const slots = review(s);
    expect(slots).toHaveLength(5);
    expect(counts(slots).get('brueche.anteil')).toBe(2);
    expect(noAdjacentRepeats(slots)).toBe(true);
  });

  it('drops skills that no longer exist in a loaded topic; keeps skills of topics not loaded', () => {
    const s = withSkills({
      'brueche.plus-minus#1': due('2026-10-10'),
      'brueche.gemischt#1': due('2026-10-10'),
      'daten.kennwerte#1': due('2026-10-12'),
    });
    expect(new Set(review(s).map((x) => x.skillId))).toEqual(new Set(['brueche.gemischt', 'daten.kennwerte']));
  });

  it('random states: 3 to 5 slots, only due items, every slot purpose review, no neighbours when separable, deterministic', () => {
    const rng = createRng(2024);
    const ids = ['brueche.von-groessen', 'brueche.von-groessen', 'geometrie.c', 'daten.d', 'prozent.bedeutung', 'dezimal.stellenwert'];
    for (let trial = 0; trial < 300; trial++) {
      const skills: Record<string, StufeProgress> = {};
      for (const id of ids) {
        for (const st of [1, 2, 3] as Stufe[]) {
          if (rng.chance(0.3)) skills[`${id}#${st}`] = due(`2026-10-${String(rng.int(10, 25)).padStart(2, '0')}`, { box: rng.int(1, 5) });
        }
      }
      const s = withSkills(skills);
      // alternately with all topics loaded and with no topic loaded (nothing can be verified → keep)
      const defs = trial % 2 ? ids.map((id) => skillDef(id)) : [];
      const slots = review(s, trial, defs);
      expect(slots.length).toBeLessThanOrEqual(REVIEW_MAX);
      const dueIds = new Set(dueReviews(s, DAY, 100).map((d) => `${d.skillId}#${d.stufe}`));
      for (const x of slots) {
        expect(x.purpose).toBe('review');
        expect(dueIds.has(`${x.skillId}#${x.stufe}`)).toBe(true);
      }
      if (dueIds.size > 0) expect(slots.length).toBeGreaterThanOrEqual(3);
      if (slots.length > 0 && separable(slots)) expect(noAdjacentRepeats(slots), JSON.stringify(slots)).toBe(true);
      expect(review(s, trial, defs)).toEqual(slots);
    }
  });
});

