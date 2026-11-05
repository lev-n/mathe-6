/**
 * Badges (docs/research.md §7.1, M6–M8): a plain list with factual titles, awarded as a surprise, never announced in advance. No participation badge (§7.2), so no "Alle Themen geübt", and none
 * naming a track, a plan or a trait. Every condition needs solved tasks (sicher/gemeistert Stufen, improvements); none is earned for practice days or time spent (M6, M12). The weekly goal has its own
 * gentle display and is never turned into a badge. Conditions use only topic prefixes, counts and totals, so they do not depend on other modules' exact skill ids or on the plan.
 *
 * Improvement badges (docs/research.md M16, src/state/growth.ts) are the most significant ones: they reward getting better than one's own earlier self, and each needs evidence from a later day or from a
 * spaced review, so wrong answers alone never earn one. Small improvements (a 2nd try, a twin task) get only a calm line in the round, never a badge.
 */
import type { TopicId } from '../core/types';
import { growthFacts, type GrowthFacts } from './growth';
import { TOPIC_IDS, isAtLeastSicher, parseSkillKey } from './mastery';
import type { BadgeDef, ProgressState } from './types';

/** Numbers the conditions look at, computed once per evaluation. */
export interface BadgeFacts {
  /** Distinct skills with ≥ 1 Stufe sicher/gemeistert, per topic. */
  sicherSkills: Record<TopicId, number>;
  /** Skill-Stufen at 'gemeistert', per topic. */
  gemeistert: Record<TopicId, number>;
  gemeistertTotal: number;
  /** Skill-Stufen of Stufe 3 at 'gemeistert'. */
  stufe3Gemeistert: number;
  /** Improvements. */
  growth: GrowthFacts;
}

interface BadgeRule extends BadgeDef {
  met(state: ProgressState, f: BadgeFacts): boolean;
}

/** Names the topic, never a trait or a title: 'Brüche: Sicher', never 'Bruch-Profi'. */
const TOPIC_NAMES: Record<TopicId, string> = {
  brueche: 'Brüche',
  dezimal: 'Dezimalzahlen',
  negativ: 'Negative Zahlen',
  prozent: 'Prozent',
  terme: 'Terme',
  geometrie: 'Geometrie',
  flaechen: 'Fläche und Volumen',
  daten: 'Daten',
};

/** Thresholds (heuristics; documented so they can be tuned in a pilot). */
export const BADGE_THRESHOLDS = {
  /** Topics with a lasting improvement for 'Vieles behalten' (the largest improvement badge). */
  vielesBehaltenTopics: 3,
} as const;

const RULES: BadgeRule[] = [
  ...TOPIC_IDS.flatMap((t): BadgeRule[] => {
    const name = TOPIC_NAMES[t];
    return [
      { id: `${t}-sicher`, title: `${name}: Sicher`, description: 'Du kannst eine Stufe aus diesem Thema sicher.', met: (_s, f) => f.sicherSkills[t] >= 1 },
      { id: `${t}-gemeistert`, title: `${name}: Gemeistert`, description: 'Du hast eine Stufe aus diesem Thema gemeistert. Du kannst diese Stufe auch nach ein paar Tagen noch.', met: (_s, f) => f.gemeistert[t] >= 1 },
    ];
  }),
  {
    id: 'stufe3',
    title: 'Stufe 3 gemeistert',
    description: 'Du hast eine Stufe 3 gemeistert. Du kannst diese Stufe auch nach ein paar Tagen noch.',
    met: (_s, f) => f.stufe3Gemeistert >= 1,
  },
  // ── Improvement badges (docs/research.md M16), from the 3rd kind of improvement upwards ──
  {
    id: 'fehler-ueberwunden',
    title: 'Stolperstein überwunden',
    description: 'Du bist oft an derselben Stelle gestolpert. Danach hast du 5 solche Aufgaben auf Anhieb gelöst. Das hat auch an einem anderen Tag geklappt.',
    improvement: true,
    met: (_s, f) => f.growth.overcome >= 1,
  },
  {
    id: 'besser-geworden',
    title: 'Besser geworden',
    description: 'Du fandest eine Aufgabenart am Anfang noch knifflig. Später hast du dreimal mindestens 8 von 10 gelöst.',
    improvement: true,
    met: (_s, f) => f.growth.improved >= 1,
  },
  {
    id: 'behalten',
    title: 'Gut behalten',
    description: 'Du hast Tage später etwas auf Anhieb gelöst. Das war vorher noch knifflig.',
    improvement: true,
    met: (_s, f) => f.growth.kept >= 1,
  },
  {
    id: 'vieles-behalten',
    title: 'Vieles behalten',
    description: 'Du hast in 3 Themen später etwas auf Anhieb gelöst. Das war vorher noch knifflig.',
    improvement: true,
    met: (_s, f) => f.growth.keptTopics >= BADGE_THRESHOLDS.vielesBehaltenTopics,
  },
];

/** Badges named by the act (no participation badges, never announced in advance). */
export const BADGES: BadgeDef[] = RULES.map(({ id, title, description, improvement }) => (improvement ? { id, title, description, improvement } : { id, title, description }));

const zeroPerTopic = (): Record<TopicId, number> => Object.fromEntries(TOPIC_IDS.map((t) => [t, 0])) as Record<TopicId, number>;

export function badgeFacts(state: ProgressState): BadgeFacts {
  const sicherSkillIds: Record<TopicId, Set<string>> = Object.fromEntries(TOPIC_IDS.map((t) => [t, new Set<string>()])) as Record<TopicId, Set<string>>;
  const gemeistert = zeroPerTopic();
  let stufe3Gemeistert = 0;
  let gemeistertTotal = 0;
  for (const [key, p] of Object.entries(state.skills)) {
    const parsed = parseSkillKey(key);
    if (!parsed || !isAtLeastSicher(p.state)) continue;
    sicherSkillIds[parsed.topicId].add(parsed.skillId);
    if (p.state === 'gemeistert') {
      gemeistert[parsed.topicId] += 1;
      gemeistertTotal += 1;
      if (parsed.stufe === 3) stufe3Gemeistert += 1;
    }
  }
  const sicherSkills = zeroPerTopic();
  for (const t of TOPIC_IDS) sicherSkills[t] = sicherSkillIds[t].size;
  return { sicherSkills, gemeistert, gemeistertTotal, stufe3Gemeistert, growth: growthFacts(state) };
}

/** Ids of badges whose condition is met but that are not yet in state.badges. */
export function evaluateBadges(state: ProgressState): string[] {
  const f = badgeFacts(state);
  return RULES.filter((r) => !Object.prototype.hasOwnProperty.call(state.badges, r.id) && r.met(state, f)).map((r) => r.id);
}

export function badgeById(id: string): BadgeDef | undefined {
  return BADGES.find((b) => b.id === id);
}
