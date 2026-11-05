// The round flow with the real skills: the state code and the generators have to agree on slots and levels.
import { beforeAll, describe, expect, it } from 'vitest';
import { ROUND_SIZE, SHORT_ROUND_SIZE, abSequence } from '../core/age';
import { DEFAULT_CONTEXT } from '../core/generate';
import { createRng } from '../core/rng';
import type { PlanId, SkillDef, Stufe } from '../core/types';
import { STUFEN } from '../core/types';
import { TOPICS, loadTopic } from '../topics/registry';
import { CATALOGUE, PLAN_MAP, PLAN_OPTIONS, isInPlan, planStufen } from '../data/plans';
import { buildRound } from './round';
import { dueReviews, isExtraSkill, suggestedStufe } from './selectors';
import { emptyState } from './store';
import { entry, withSkills } from './testkit';

const DAY = '2026-10-19';
let skills: SkillDef[] = [];
const skillOf = (id: string) => skills.find((s) => s.id === id)!;

beforeAll(async () => {
  skills = (await Promise.all(TOPICS.map((t) => loadTopic(t.id)))).flatMap((m) => m.skills);
});

describe('skill rounds', () => {
  it('every skill: 10 items, with the AB mix of the Stufe, easier items first, each item at its planned level', () => {
        for (const skill of skills) {
      for (const stufe of STUFEN as readonly Stufe[]) {
        const slots = buildRound({ mode: 'skill', skillId: skill.id, stufe }, emptyState(), DAY, createRng(1), skills);
        expect(slots).toHaveLength(ROUND_SIZE);
        expect(slots.map((s) => s.ab), `${skill.id} Stufe ${stufe}`).toEqual(abSequence(stufe));
        expect(slots.map((s) => s.ab), skill.id).toEqual([...slots.map((s) => s.ab)].sort());
        slots.forEach((slot, i) => {
          const ex = skill.generate(createRng(i * 37 + 5), stufe, { ...DEFAULT_CONTEXT, ab: slot.ab });
          expect(ex.ab, `${ex.key} planned AB ${slot.ab}`).toBe(slot.ab);
          expect(ex.skillId).toBe(skill.id);
          expect(ex.stufe).toBe(stufe);
        });
      }
    }
  });
});

describe('the plan changes neither the round nor the Stufe', () => {
  const withPlan = (plan: PlanId) => {
    const s = emptyState();
    return { ...s, settings: { ...s.settings, plan } };
  };

  it('a round of a skill has the same plan under every option, and the suggested Stufe is the same', () => {
    for (const skill of skills) {
      const plans = PLAN_OPTIONS.map((o) => buildRound({ mode: 'skill', skillId: skill.id, stufe: 2 }, withPlan(o.id), DAY, createRng(1), skills));
      for (const plan of plans) expect(plan).toEqual(plans[0]);
      for (const o of PLAN_OPTIONS) expect(suggestedStufe(withPlan(o.id), skill.id)).toBe(1);
    }
  });
});

describe('the short round', () => {
  it('every skill: 5 items, with the short AB mix of the Stufe', () => {
    for (const skill of skills) {
      for (const stufe of STUFEN as readonly Stufe[]) {
        const slots = buildRound({ mode: 'skill', skillId: skill.id, stufe, short: true }, emptyState(), DAY, createRng(1), skills);
        expect(slots).toHaveLength(SHORT_ROUND_SIZE);
        expect(slots.map((s) => s.ab), `${skill.id} Stufe ${stufe}`).toEqual(abSequence(stufe, SHORT_ROUND_SIZE));
      }
    }
  });
});

describe('the plan map with the real skills', () => {
  const planned = (s: ReturnType<typeof emptyState>, plan: PlanId) => ({ ...s, settings: { ...s.settings, plan } });

  it('every id of the plan map is a real skill', () => {
    const ids = new Set(skills.map((s) => s.id));
    for (const row of PLAN_MAP) for (const id of [...Object.keys(row.optional), ...row.hiddenCore]) expect(ids.has(id), `${row.code}: ${id}`).toBe(true);
  });

  it('BB moves negativ, prozent.bedeutung and prozent.umwandeln to Extra, and they keep their rounds', () => {
    const state = planned(emptyState(), 'bb');
    for (const id of [...CATALOGUE.negativ, 'prozent.bedeutung', 'prozent.umwandeln']) {
      expect(isInPlan('bb', id), id).toBe(false);
      expect(isExtraSkill(state, id), id).toBe(true);
      expect(buildRound({ mode: 'skill', skillId: id, stufe: 1 }, state, DAY, createRng(1), skills), id).toHaveLength(ROUND_SIZE);
    }
  });

  it('a restricted skill shows its Stufen by default, and still opens at every Stufe', () => {
    const state = planned(emptyState(), 'bm');
    expect(planStufen('bm', 'brueche.geteilt')).toEqual([1]);
    for (const stufe of STUFEN) expect(buildRound({ mode: 'skill', skillId: 'brueche.geteilt', stufe }, state, DAY, createRng(1), skills)).toHaveLength(ROUND_SIZE);
  });
});

describe('Haben wir noch nicht', () => {
  it('leaves a skill out of the review and nothing else', () => {
    const due = withSkills({ 'brueche.anteil#1': entry('sicher'), 'dezimal.runden#1': entry('sicher') });
    expect(dueReviews(due, DAY).map((r) => r.skillId).sort()).toEqual(['brueche.anteil', 'dezimal.runden']);
    const marked = { ...due, settings: { ...due.settings, notYet: ['brueche.anteil'] } };
    expect(dueReviews(marked, DAY).map((r) => r.skillId)).toEqual(['dezimal.runden']);
    expect(buildRound({ mode: 'skill', skillId: 'brueche.anteil', stufe: 1 }, marked, DAY, createRng(1), skills)).toHaveLength(ROUND_SIZE);
  });
});

describe('the keys of the Ziffernblock', () => {
  it('follow the skill, never the item: every field of a skill agrees with its keys', () => {
    for (const skill of skills) {
      for (const stufe of STUFEN as readonly Stufe[]) {
        for (const ab of [1, 2, 3] as const) {
          for (let seed = 1; seed <= 6; seed++) {
            const a = skill.generate(createRng(seed * 41 + ab), stufe, { ...DEFAULT_CONTEXT, ab }).answer;
            const fields = a.kind === 'number' ? [a] : a.kind === 'multi' ? a.fields : [];
            for (const f of fields) {
              expect(f.signed === true, `${skill.id}: signed`).toBe(skill.keys?.minus === true);
              expect(f.decimals !== undefined, `${skill.id}: decimals`).toBe(skill.keys?.comma === true);
            }
          }
        }
      }
    }
  });
});

describe('mixed rounds', () => {
  it('Extras only once practised; every slot is a skill of the topic whose generator accepts it', () => {
    for (const topic of TOPICS) {
      const skill = skills.find((x) => x.topicId === topic.id)!;
      const state = { ...emptyState(), skills: { [`${skill.id}#1`]: { attempts: 1, recent: [true], practiceDays: 1, state: 'geuebt' as const, box: 0, checks: [] } } };
      const slots = buildRound({ mode: 'mixed', topicId: topic.id }, state, DAY, createRng(5), skills);
      expect(slots.length, topic.id).toBeGreaterThan(0);
      for (const slot of slots) {
        const def = skillOf(slot.skillId);
        expect(def.topicId).toBe(topic.id);
        expect(def.generate(createRng(9), slot.stufe, DEFAULT_CONTEXT).skillId).toBe(slot.skillId);
      }
    }
  });
});
