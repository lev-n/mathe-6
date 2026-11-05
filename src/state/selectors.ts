/**
 * Read-only views on ProgressState for the UI. All functions are pure.
 */
import { DEFAULT_STUFE, UI_RULES } from '../core/age';
import type { SkillDef, Stufe, TopicId } from '../core/types';
import { isInPlan, planStufen } from '../data/plans';
import { addDays, weekStart } from './dates';
import { TOPIC_IDS, isAtLeastSicher, parseSkillKey } from './mastery';
import type { Day, MasteryState, ProgressState, ReviewItem, StufeProgress } from './types';

export const skillKey = (skillId: string, stufe: Stufe) => `${skillId}#${stufe}`;

export function stufeProgress(state: ProgressState, skillId: string, stufe: Stufe): StufeProgress | undefined {
  return state.skills[skillKey(skillId, stufe)];
}

export function masteryOf(state: ProgressState, skillId: string, stufe: Stufe): MasteryState {
  return stufeProgress(state, skillId, stufe)?.state ?? 'neu';
}

/** Filled marks per mastery state: 0 = neu, 1 = geübt, 2 = sicher, 3 = gemeistert. */
export const MASTERY_MARKS: Readonly<Record<MasteryState, 0 | 1 | 2 | 3>> = { neu: 0, geuebt: 1, sicher: 2, gemeistert: 3 };

/** 0 = neu, 1 = geübt, 2 = sicher, 3 = gemeistert */
export function marksOf(state: ProgressState, skillId: string, stufe: Stufe): 0 | 1 | 2 | 3 {
  return MASTERY_MARKS[masteryOf(state, skillId, stufe)];
}

/**
 * The recommended Stufe ("Empfohlen"). For an untouched skill it is DEFAULT_STUFE, never based on the plan (docs/research.md §7.1). Otherwise,
 * from the lowest Stufe the child has worked on, the first Stufe that is not yet 'sicher'/'gemeistert' (3 if all are).
 */
export function suggestedStufe(state: ProgressState, skillId: string): Stufe {
  const start = ([1, 2, 3] as Stufe[]).find((s) => (stufeProgress(state, skillId, s)?.attempts ?? 0) > 0) ?? DEFAULT_STUFE;
  for (const s of [1, 2, 3] as Stufe[]) {
    if (s < start) continue;
    if (!isAtLeastSicher(masteryOf(state, skillId, s))) return s;
  }
  return 3;
}

/** Highest Stufe with at least one answer, if any. */
export function practisedStufe(state: ProgressState, skillId: string): Stufe | undefined {
  for (const s of [3, 2, 1] as Stufe[]) {
    if ((stufeProgress(state, skillId, s)?.attempts ?? 0) > 0) return s;
  }
  return undefined;
}

/** "Heute wiederholen" is capped at 8 review answers a day (docs/research.md §7.1), not per round. */
export const REVIEWS_PER_DAY: number = UI_RULES.reviewsPerDay;

/** Review answers still possible on `day` (REVIEWS_PER_DAY minus those already given that day). */
export function reviewBudget(state: ProgressState, day: Day): number {
  const done = state.reviewed?.day === day ? state.reviewed.count : 0;
  return Math.max(0, REVIEWS_PER_DAY - done);
}

/** Due skill-Stufen, most overdue first, capped at `limit` (default REVIEWS_PER_DAY). A skill marked "Haben wir noch nicht" stays out of the review (§2.5). */
export function dueReviews(state: ProgressState, day: Day, limit = REVIEWS_PER_DAY): ReviewItem[] {
  const items: ReviewItem[] = [];
  for (const [key, p] of Object.entries(state.skills)) {
    if (p.box < 1 || !p.due || p.due > day) continue;
    const parsed = parseSkillKey(key);
    if (parsed && !state.settings.notYet.includes(parsed.skillId)) items.push({ skillId: parsed.skillId, stufe: parsed.stufe, due: p.due });
  }
  items.sort((a, b) => (a.due < b.due ? -1 : a.due > b.due ? 1 : skillKey(a.skillId, a.stufe) < skillKey(b.skillId, b.stufe) ? -1 : 1));
  return items.slice(0, Math.max(0, limit));
}

function clampGoal(goal: number): number {
  return Number.isInteger(goal) ? Math.min(5, Math.max(1, goal)) : 3;
}

/** Übungstage in the current week (Mon–Sun) vs weekly goal. */
export function weekProgress(state: ProgressState, day: Day): { days: number; goal: number; reached: boolean } {
  const from = weekStart(day);
  const to = addDays(from, 6);
  const days = new Set(state.days.filter((d) => d >= from && d <= to)).size;
  const goal = clampGoal(state.settings.weeklyGoal);
  return { days, goal, reached: days >= goal };
}

/** A skill's place in this plan: in the plan, or an Extra that stays reachable (docs/research.md §2.5). */
export function isExtraSkill(state: Pick<ProgressState, 'settings'>, skillId: string): boolean {
  return !isInPlan(state.settings.plan, skillId);
}

/** "Haben wir noch nicht" is set for this skill (§2.5). */
export function isNotYet(state: Pick<ProgressState, 'settings'>, skillId: string): boolean {
  return state.settings.notYet.includes(skillId);
}

/**
 * Marks per topic for overview cards. Topic progress counts only what is in the plan, so an Extra never makes a topic look unfinished
 * (docs/research.md §2.5); max is 0 when the topic has nothing in this plan.
 */
export function topicMarks(state: ProgressState, skills: readonly SkillDef[]): { marks: number; max: number; sicher: number; total: number } {
  let marks = 0;
  let sicher = 0;
  let total = 0;
  for (const skill of skills) {
    for (const s of planStufen(state.settings.plan, skill.id)) {
      total += 1;
      marks += marksOf(state, skill.id, s);
      if (isAtLeastSicher(masteryOf(state, skill.id, s))) sicher += 1;
    }
  }
  return { marks, max: total * 3, sicher, total };
}

/** Topics with at least one practised skill (in the order of TOPICS). */
export function practisedTopics(state: ProgressState): TopicId[] {
  const found = new Set<TopicId>();
  for (const [key, p] of Object.entries(state.skills)) {
    if (p.attempts <= 0) continue;
    const parsed = parseSkillKey(key);
    if (parsed) found.add(parsed.topicId);
  }
  return TOPIC_IDS.filter((t) => found.has(t));
}
