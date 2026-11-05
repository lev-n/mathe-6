import { describe, expect, it } from 'vitest';
import {
  dueReviews,
  isExtraSkill,
  isNotYet,
  masteryOf,
  practisedStufe,
  skillKey,
  marksOf,
  suggestedStufe,
  topicMarks,
  weekProgress,
} from './selectors';
import { emptyState } from './store';
import { entry, skillDef, withSkills } from './testkit';
import type { PlanId } from '../core/types';
import type { ProgressState } from './types';

describe('basic selectors', () => {
  it('skillKey / masteryOf / marksOf', () => {
    const s = withSkills({ 'brueche.anteil#1': entry('sicher'), 'brueche.anteil#2': entry('geuebt'), 'brueche.anteil#3': entry('gemeistert') });
    expect(skillKey('brueche.anteil', 2)).toBe('brueche.anteil#2');
    expect(masteryOf(s, 'brueche.anteil', 1)).toBe('sicher');
    expect(masteryOf(s, 'brueche.vergleichen', 1)).toBe('neu');
    expect([1, 2, 3].map((n) => marksOf(s, 'brueche.anteil', n as 1 | 2 | 3))).toEqual([2, 1, 3]);
  });

  it('suggestedStufe: defaultStufe for a new skill, else the first Stufe from the lowest practised one that is not sicher (3 if all are)', () => {
    expect(suggestedStufe(emptyState(), 'brueche.gemischt')).toBe(1);
    // Stufe 1 for a new skill, never based on the plan (§7.1)
    for (const plan of ['bg', 'bm', 'br', 'bb', 'nr', 'ng', 'offen'] as const) {
      expect(suggestedStufe({ ...emptyState(), settings: { ...emptyState().settings, plan } }, 'brueche.anteil')).toBe(1);
      expect(suggestedStufe({ ...emptyState(), settings: { ...emptyState().settings, plan } }, 'negativ.kontext')).toBe(1);
    }
  });

  it('practisedStufe = highest Stufe with answers', () => {
    expect(practisedStufe(emptyState(), 'brueche.anteil')).toBeUndefined();
    expect(practisedStufe(withSkills({ 'brueche.anteil#1': entry('sicher'), 'brueche.anteil#2': entry('geuebt') }), 'brueche.anteil')).toBe(2);
    expect(practisedStufe(withSkills({ 'brueche.anteil#3': entry('neu') }), 'brueche.anteil')).toBeUndefined();
  });
});

describe('dueReviews', () => {
  const s = withSkills({
    'brueche.anteil#1': entry('sicher', { box: 2, due: '2026-10-19' }),
    'brueche.vergleichen#2': entry('sicher', { box: 1, due: '2026-10-10' }),
    'flaechen.einheiten#1': entry('gemeistert', { box: 4, due: '2026-10-15' }),
    'daten.kennwerte#3': entry('sicher', { box: 3, due: '2026-10-20' }),
    'brueche.zahlenstrahl2#1': entry('geuebt', { box: 0 }),
  });

  it('returns box ≥ 1 items due on or before the day, most overdue first', () => {
    expect(dueReviews(s, '2026-10-19')).toEqual([
      { skillId: 'brueche.vergleichen', stufe: 2, due: '2026-10-10' },
      { skillId: 'flaechen.einheiten', stufe: 1, due: '2026-10-15' },
      { skillId: 'brueche.anteil', stufe: 1, due: '2026-10-19' },
    ]);
    expect(dueReviews(s, '2026-10-09')).toEqual([]);
    expect(dueReviews(s, '2026-10-19', 1)).toHaveLength(1);
  });

  it('caps the list at 8 by default with a stable order for equal days', () => {
    const many: Record<string, ReturnType<typeof entry>> = {};
    for (let i = 0; i < 12; i++) many[`brueche.von-groessen${String(i).padStart(2, '0')}#1`] = entry('sicher', { box: 1, due: i < 6 ? '2026-10-18' : '2026-10-17' });
    const due = dueReviews(withSkills(many), '2026-10-19');
    expect(due).toHaveLength(8);
    expect(due.map((d) => d.skillId)).toEqual(['brueche.von-groessen06', 'brueche.von-groessen07', 'brueche.von-groessen08', 'brueche.von-groessen09', 'brueche.von-groessen10', 'brueche.von-groessen11', 'brueche.von-groessen00', 'brueche.von-groessen01']);
  });
});

describe('weekProgress (Mon–Sun)', () => {
  const s = { ...emptyState(), days: ['2026-11-12', '2026-10-12', '2026-10-14', '2026-10-18', '2026-10-19'] };

  it('counts distinct practice days of the current week only', () => {
    // week of 12.–18.10.2026
    expect(weekProgress(s, '2026-10-18')).toEqual({ days: 3, goal: 3, reached: true });
    expect(weekProgress(s, '2026-10-12')).toEqual({ days: 3, goal: 3, reached: true });
    // Monday 19.10. starts a new week quietly
    expect(weekProgress(s, '2026-10-19')).toEqual({ days: 1, goal: 3, reached: false });
    expect(weekProgress(s, '2026-10-25')).toEqual({ days: 1, goal: 3, reached: false });
  });

  it('uses the weekly goal (1–5) from the settings', () => {
    const g5 = { ...s, settings: { ...s.settings, weeklyGoal: 5 } };
    expect(weekProgress(g5, '2026-10-18')).toEqual({ days: 3, goal: 5, reached: false });
    const g1 = { ...s, settings: { ...s.settings, weeklyGoal: 1 } };
    expect(weekProgress(g1, '2026-10-19').reached).toBe(true);
  });

  it('works for weeks across the year boundary', () => {
    const y = { ...emptyState(), days: ['2026-12-27', '2026-12-28', '2026-12-31', '2027-01-03', '2027-01-04'] };
    expect(weekProgress(y, '2027-01-01').days).toBe(3);
  });
});

describe('topicMarks / practisedTopics', () => {
  // core: brueche.anteil, brueche.vergleichen. brueche.gemischt: optional, in the plan 'bg' among others.
  const skills = [skillDef('brueche.anteil'), skillDef('brueche.vergleichen'), skillDef('brueche.gemischt')];
  const s = withSkills({
    'brueche.anteil#1': entry('gemeistert'),
    'brueche.anteil#2': entry('sicher'),
    'brueche.anteil#3': entry('geuebt'),
    'brueche.vergleichen#1': entry('geuebt'),
    'brueche.gemischt#1': entry('sicher'),
    'flaechen.einheiten#1': entry('neu'),
  });
  const inPlan = (plan: PlanId): ProgressState => ({ ...s, settings: { ...s.settings, plan } });

  it('counts only what is in the plan: an Extra never makes a topic look unfinished (§2.5)', () => {
    expect(topicMarks(s, skills)).toEqual({ marks: 3 + 2 + 1 + 1, max: 18, sicher: 2, total: 6 });
    expect(topicMarks(inPlan('bg'), skills)).toEqual({ marks: 3 + 2 + 1 + 1 + 2, max: 27, sicher: 3, total: 9 });
    expect(topicMarks(emptyState(), [])).toEqual({ marks: 0, max: 0, sicher: 0, total: 0 });
  });

  it('a restricted skill counts with its Stufen only', () => {
    const plus = [skillDef('negativ.plus-minus')];
    expect(topicMarks({ ...emptyState(), settings: { ...emptyState().settings, plan: 'bm' } }, plus).total).toBe(1);
    expect(topicMarks(emptyState(), plus).total).toBe(0);
  });

  it('Extra follows the plan, and a hidden core skill stays a skill', () => {
    expect(isExtraSkill(inPlan('bg'), 'brueche.gemischt')).toBe(false);
    expect(isExtraSkill(s, 'brueche.gemischt')).toBe(true);
    expect(isExtraSkill(inPlan('bb'), 'negativ.kontext')).toBe(true);
    expect(isExtraSkill(s, 'negativ.kontext')).toBe(false);
  });

  it('Haben wir noch nicht leaves a skill out of the review, and nothing else', () => {
    const due = withSkills({ 'brueche.anteil#1': { ...entry('sicher'), box: 1, due: '2026-10-01' } });
    expect(dueReviews(due, '2026-10-19')).toHaveLength(1);
    const notYet: ProgressState = { ...due, settings: { ...due.settings, notYet: ['brueche.anteil'] } };
    expect(isNotYet(notYet, 'brueche.anteil')).toBe(true);
    expect(dueReviews(notYet, '2026-10-19')).toEqual([]);
    expect(marksOf(notYet, 'brueche.anteil', 1)).toBe(2);
  });
});
