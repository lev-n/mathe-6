/**
 * Misconception families of the error library (docs/research.md M16, improvement kind 3, badge
 * "Stolperstein überwunden").
 *
 * Raw Bug ids are not stable misconception tags: the bug builders dedupe by value, so one misconception surfaces
 * under sibling ids; index ids split one misconception (zeile-0-vergessen … zeile-3-vergessen, nachbar-5, fehlt-0);
 * and one bare id means different things in different skills ('addiert', 'vertauscht', 'aufgerundet', 'mal' …). So
 * the improvement tracking stores the FAMILY of a bug, looked up per skill: tagFor(skillId, bugId).
 *
 * Each topic owns its table in src/topics/<topic>/families.ts (family id → skill id → space-separated Bug keys, only
 * skills of that topic) and the phrases in src/topics/<topic>/phrases.ts; this file merges them. Family ids must be
 * unique across topics. They are stored in the consent-gated progress (growth.errors[skillId][familyId] in
 * 'mathe6.v1'): never rename or reuse one once released. They are lower-case slugs that src/state/growth.ts
 * normalizeTag() leaves unchanged (no '-<digits>' segment, no '-<capital letter>' ending). Bug ids themselves are
 * internal and may change, as long as the tables follow.
 *
 * What the tests check (errorFamilies.test.ts): each (skill, bug key) of the tables belongs to one family, and a
 * generator sweep (every skill, Stufe 1–3, a fixed set of seeds) finds no emitted Bug id without a family
 * of its skill and no table entry that it never emits. The sweep is a sample of the generators, not a proof: a Bug id
 * that only rare inputs produce can still be missing here, and then tagFor falls back to the id itself (with
 * FALLBACK_PHRASE in the texts). A topic without bugs has empty tables.
 */
import type { TopicId } from '../core/types';
import brueche from './brueche/families';
import daten from './daten/families';
import { familyPhrase, type FamilyPhrase } from './errorPhrases';
import dezimal from './dezimal/families';
import flaechen from './flaechen/families';
import negativ from './negativ/families';
import prozent from './prozent/families';
import terme from './terme/families';
import geometrie from './geometrie/families';

export { FALLBACK_PHRASE, familyPhrase, type FamilyPhrase } from './errorPhrases';

/** What a topic's families.ts exports: family id → skill id → space-separated Bug keys. */
export type TopicFamilies = Readonly<Record<string, Readonly<Record<string, string>>>>;

export interface ErrorFamily {
  /** Stable tag stored in the progress. */
  readonly id: string;
  /** From src/topics/<topic>/phrases.ts. */
  readonly phrase: FamilyPhrase;
  /** skillId → the normalised Bug ids (bugKey) of this misconception in that skill. */
  readonly skills: Readonly<Record<string, readonly string[]>>;
}

/** Topic → its families. */
export const TOPIC_FAMILIES: Readonly<Record<TopicId, TopicFamilies>> = {
  brueche,
  dezimal,
  negativ,
  prozent,
  terme,
  geometrie,
  flaechen,
  daten,
};

function fam(id: string, skills: Readonly<Record<string, string>>): ErrorFamily {
  const parsed: Record<string, readonly string[]> = {};
  for (const [skillId, keys] of Object.entries(skills)) parsed[skillId] = keys.split(/\s+/).filter(Boolean);
  return { id, phrase: familyPhrase(id), skills: parsed };
}

export const ERROR_FAMILIES: readonly ErrorFamily[] = Object.values(TOPIC_FAMILIES).flatMap((families) =>
  Object.entries(families).map(([id, skills]) => fam(id, skills)),
);

// ─── Lookup ───────────────────────────────────────────────────────────────────

/** Bug ids whose trailing digit is part of the misconception, not an index ('a quarter: divide by 4'). */
const KEEP_DIGIT = new Set<string>();

/**
 * The Bug id without the parts that only number its variants: 'vier-2' → 'vier', 'zeile-0-vergessen' →
 * 'zeile-vergessen', 'faktor-1000' → 'faktor', 'nur-einer-b' → 'nur-einer', 'rechenart-+' → 'rechenart'. Words stay
 * ('minus-zehn', 'hs.minus-s'), and so do numbers that are part of the misconception ('durch-10', 'bis-100',
 * 'ohne-12', 'viertel-4').
 */
export function bugKey(id: string): string {
  const s = id.trim();
  if (KEEP_DIGIT.has(s)) return s;
  return s
    .replace(/^rechenart-[-+*:]$/, 'rechenart') // the wrong operation that was used
    .replace(/^faktor-10{1,3}$/, 'faktor') // the wrong conversion factor
    .replace(/-[A-Z]$/, '') // the gap letter
    .replace(/^nur-einer-[a-z]$/, 'nur-einer') // which bar was left out
    .replace(/-\d-vergessen$/, '-vergessen') // which row was left out
    .replace(/-\d$/, ''); // row, item or face index
}

/** Characters src/state/growth.ts accepts in a tag (same rule). */
const TAG_RE = /^[A-Za-z0-9][A-Za-z0-9._:+*-]{0,47}$/;

/** A tag for a Bug id without a family: also free of longer index segments, so growth.ts keeps it as it is. */
function fallbackTag(key: string): string | null {
  const tag = key.replace(/-\d+(?=-|$)/g, '').replace(/-[A-Z]$/, '');
  return TAG_RE.test(tag) ? tag : null;
}

/** skillId → bugKey → family id (built once). */
const INDEX: ReadonlyMap<string, ReadonlyMap<string, string>> = (() => {
  const index = new Map<string, Map<string, string>>();
  for (const f of ERROR_FAMILIES) {
    for (const [skillId, keys] of Object.entries(f.skills)) {
      let bySkill = index.get(skillId);
      if (!bySkill) index.set(skillId, (bySkill = new Map()));
      for (const key of keys) if (!bySkill.has(key)) bySkill.set(key, f.id);
    }
  }
  return index;
})();

/**
 * Error-library tag of a Bug id in a skill: the family id, or (unknown skill or id) the id without its index parts.
 * Null for ids that are no usable tag. Pure and cheap (called for every exercise).
 */
export function tagFor(skillId: string, bugId: string): string | null {
  if (typeof bugId !== 'string') return null;
  const key = bugKey(bugId);
  return INDEX.get(skillId)?.get(key) ?? fallbackTag(key);
}

/** Distinct tags of an exercise's (or an item's) Bug ids, in order. */
export function tagsFor(skillId: string, bugIds: readonly string[] | undefined): string[] {
  const out: string[] = [];
  for (const id of bugIds ?? []) {
    const tag = tagFor(skillId, id);
    if (tag !== null && !out.includes(tag)) out.push(tag);
  }
  return out;
}
