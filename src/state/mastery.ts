/**
 * Pure progress reducer: mastery per skill-Stufe, Leitner boxes, totals.
 * (docs/research.md L2, L8, L11; thresholds are documented heuristics, see §7.2.)
 *
 * Mastery per key `${skillId}#${stufe}`:
 *   neu → geuebt (any attempt)
 *       → sicher (≥ 8 of the last 10 first-try results true AND the last 3 true;
 *                 only purposes practice/mixed/twin feed `recent`)
 *       → gemeistert (sicher AND ≥ 4 true in the last 5 checks AND practised on ≥ 3 distinct days).
 *   A check = a 'review' answer at least 3 days after `sicherSince`. The state never goes down.
 *   L1 asks for retrieval in ≥ 3 different sessions; distinct days are the stricter, privacy-friendly
 *   stand-in (P1: no session ids, dates at day granularity).
 *
 * Leitner per skill-Stufe: scheduled when it turns sicher (box 1, due = day + 1).
 *   review: first try → box + 1 (max 5), otherwise box − 1 (min 1); a wrong answer in mixed practice
 *   also moves the box down. Promotion only happens when the item is due, so answering the same
 *   item twice on one day cannot skip boxes.
 * Intervals by box: [0, 1, 3, 7, 14, 28] days.
 */
import { addDays, daysBetween, insertDay } from './dates';
import type { AnswerEvent, Day, MasteryState, ProgressState, RoundPurpose, StufeProgress } from './types';
import type { Stufe, TopicId } from '../core/types';

export const LEITNER_INTERVALS: readonly number[] = [0, 1, 3, 7, 14, 28];
export const MAX_BOX = 5;
export const RECENT_SIZE = 10;
export const CHECKS_SIZE = 5;
export const SICHER_MIN_CORRECT = 8;
export const SICHER_LAST_RUN = 3;
export const GEMEISTERT_MIN_CHECKS = 4;
export const GEMEISTERT_MIN_DAYS = 3;
export const CHECK_MIN_DAYS = 3;
/** First-try correct answers in a row before the next Stufe is suggested (L9). */
export const SUGGEST_RUN = 5;

const RECENT_PURPOSES: ReadonlySet<RoundPurpose> = new Set<RoundPurpose>(['practice', 'mixed', 'twin']);

/** Answers of these purposes feed `recent` (review answers do not). */
export function feedsRecent(purpose: RoundPurpose): boolean {
  return RECENT_PURPOSES.has(purpose);
}

/** Record (not array) so the compiler checks that every TopicId is listed; order = TOPICS order. */
const TOPIC_ORDER: Record<TopicId, true> = {
  brueche: true,
  dezimal: true,
  negativ: true,
  prozent: true,
  terme: true,
  geometrie: true,
  flaechen: true,
  daten: true,
};
export const TOPIC_IDS: readonly TopicId[] = Object.keys(TOPIC_ORDER) as TopicId[];

const SKILL_KEY_RE = /^([a-z]+)\.([A-Za-z0-9_.-]{1,60})#([123])$/;

export interface ParsedSkillKey {
  skillId: string;
  topicId: TopicId;
  stufe: Stufe;
}

/** Splits 'zahlen.lesen#2'; null if malformed or the topic prefix is unknown. */
export function parseSkillKey(key: string): ParsedSkillKey | null {
  const m = SKILL_KEY_RE.exec(key);
  if (!m || !(TOPIC_IDS as readonly string[]).includes(m[1])) return null;
  return { skillId: `${m[1]}.${m[2]}`, topicId: m[1] as TopicId, stufe: Number(m[3]) as Stufe };
}

export function newStufeProgress(): StufeProgress {
  return { attempts: 0, recent: [], practiceDays: 0, state: 'neu', box: 0, checks: [] };
}

export function isSicherRecent(recent: readonly boolean[]): boolean {
  const last = recent.slice(-RECENT_SIZE);
  return (
    last.filter(Boolean).length >= SICHER_MIN_CORRECT &&
    last.length >= SICHER_LAST_RUN &&
    last.slice(-SICHER_LAST_RUN).every(Boolean)
  );
}

export function meetsGemeistert(p: Pick<StufeProgress, 'checks' | 'practiceDays'>): boolean {
  return p.checks.slice(-CHECKS_SIZE).filter(Boolean).length >= GEMEISTERT_MIN_CHECKS && p.practiceDays >= GEMEISTERT_MIN_DAYS;
}

export function dueAfter(day: Day, box: number): Day {
  return addDays(day, LEITNER_INTERVALS[Math.max(0, Math.min(MAX_BOX, box))]);
}

export function isAtLeastSicher(state: MasteryState): boolean {
  return state === 'sicher' || state === 'gemeistert';
}

interface StufeUpdate {
  next: StufeProgress;
  fedRecent: boolean;
  checkPassed: boolean;
}

function updateStufe(prev: StufeProgress, event: AnswerEvent, day: Day): StufeUpdate {
  const p: StufeProgress = { ...prev, recent: [...prev.recent], checks: [...prev.checks] };
  p.attempts += 1;
  if (p.last !== day) p.practiceDays += 1;
  p.last = day;

  const fedRecent = RECENT_PURPOSES.has(event.purpose);
  if (fedRecent) p.recent = [...p.recent, event.firstTry].slice(-RECENT_SIZE);
  if (p.state === 'neu') p.state = 'geuebt';

  let checkPassed = false;
  if (p.box >= 1 && event.purpose === 'review') {
    const due = !p.due || p.due <= day;
    if (!event.firstTry) {
      p.box = Math.max(1, p.box - 1);
      p.due = dueAfter(day, p.box);
    } else if (due) {
      p.box = Math.min(MAX_BOX, p.box + 1);
      p.due = dueAfter(day, p.box);
    }
    if (p.sicherSince && daysBetween(p.sicherSince, day) >= CHECK_MIN_DAYS) {
      p.checks = [...p.checks, event.firstTry].slice(-CHECKS_SIZE);
      checkPassed = event.firstTry;
    }
  } else if (p.box >= 1 && event.purpose === 'mixed' && !event.firstTry) {
    // Errors in mixed practice move the box down but never remove 'sicher'.
    p.box = Math.max(1, p.box - 1);
    p.due = dueAfter(day, p.box);
  }

  if (p.state === 'geuebt' && isSicherRecent(p.recent)) {
    p.state = 'sicher';
    p.sicherSince = day;
    if (p.box < 1) {
      p.box = 1;
      p.due = dueAfter(day, 1);
    }
  }
  if (p.state === 'sicher' && meetsGemeistert(p)) p.state = 'gemeistert';
  return { next: p, fedRecent, checkPassed };
}

export interface AppliedAnswer {
  state: ProgressState;
  before: MasteryState;
  after: MasteryState;
  suggestNextStufe: boolean;
}

/**
 * Apply one answer. Pure: returns a new state (unchanged parts are shared).
 * `day` must be a valid Day (the store falls back to today() for malformed event days).
 */
export function applyAnswer(state: ProgressState, event: AnswerEvent, day: Day = event.day): AppliedAnswer {
  const key = `${event.skillId}#${event.stufe}`;
  const prev = parseSkillKey(key) ? state.skills[key] : undefined;
  const before = prev?.state ?? 'neu';

  let skills = state.skills;
  let after: MasteryState = before;
  let suggestNextStufe = false;
  let checkPassed = false;
  if (parseSkillKey(key)) {
    const u = updateStufe(prev ?? newStufeProgress(), event, day);
    skills = { ...state.skills, [key]: u.next };
    after = u.next.state;
    checkPassed = u.checkPassed;
    suggestNextStufe =
      u.fedRecent && event.firstTry && event.stufe < 3 && u.next.recent.length >= SUGGEST_RUN && u.next.recent.slice(-SUGGEST_RUN).every(Boolean);
  }

  const reviewed: ProgressState['reviewed'] =
    event.purpose === 'review' ? { day, count: (state.reviewed?.day === day ? state.reviewed.count : 0) + 1 } : state.reviewed;

  const t = state.totals;
  const totals: ProgressState['totals'] = {
    answered: t.answered + 1,
    firstTry: t.firstTry + (event.firstTry ? 1 : 0),
    rounds: t.rounds,
    checksPassed: t.checksPassed + (checkPassed ? 1 : 0),
  };

  const next: ProgressState = { ...state, skills, totals, days: insertDay(state.days, day) };
  if (reviewed) next.reviewed = reviewed;
  // "Weiter üben" continues what the child chose to practise (not a review or mixed round). A twin in a skill round
  // repeats the skill-Stufe its practice answer has just set; a twin in a review or mixed round must not change it.
  if (parseSkillKey(key) && event.purpose === 'practice') {
    next.lastPlayed = { skillId: event.skillId, stufe: event.stufe };
  }
  return {
    state: next,
    before,
    after,
    suggestNextStufe,
  };
}
