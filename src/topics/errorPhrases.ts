/**
 * Phrases of the misconception families (src/topics/errorFamilies.ts): "Du hast <object> jetzt fünfmal <participle>."
 *
 * Each topic owns its phrases in src/topics/<topic>/phrases.ts; this file merges them. They are kept apart from the
 * family tables so that the texts of the progress view and the round summary (src/ui/practice/growthText.ts) need only
 * these strings, not the per-skill Bug-id lists of errorFamilies.ts. This file and every phrases.ts import no code,
 * only types and other phrases.ts files; keep it that way (errorFamilies.test.ts checks it).
 *
 * A phrase names what the child did right (du-form, no traits, no speed, no superlatives, no "falsch") and fits
 * every task kind of every skill in its family. The keys are the family ids stored in the progress: never rename
 * or reuse one once released. Every family in errorFamilies.ts has a phrase here and every phrase a family
 * (errorFamilies.test.ts).
 */
import type { TopicId } from '../core/types';
import brueche from './brueche/phrases';
import daten from './daten/phrases';
import dezimal from './dezimal/phrases';
import flaechen from './flaechen/phrases';
import negativ from './negativ/phrases';
import prozent from './prozent/phrases';
import terme from './terme/phrases';
import geometrie from './geometrie/phrases';

/** "Du hast <object> jetzt fünfmal <participle>." */
export interface FamilyPhrase {
  object: string;
  participle: string;
}

export interface FamilyPhrases {
  readonly phrase: FamilyPhrase;
}

/** Topic → its family id → phrase. Ids must be unique across topics (errorFamilies.test.ts). */
export const TOPIC_PHRASES: Readonly<Record<TopicId, Readonly<Record<string, FamilyPhrases>>>> = {
  brueche,
  dezimal,
  negativ,
  prozent,
  terme,
  geometrie,
  flaechen,
  daten,
};

/** Family id → phrase. */
export const FAMILY_PHRASES: Readonly<Record<string, FamilyPhrases>> = Object.assign({}, ...Object.values(TOPIC_PHRASES));

/** Phrase for tags without a family (a new Bug id that has not been added to the table yet). */
export const FALLBACK_PHRASE: FamilyPhrase = { object: 'die knifflige Stelle in diesen Aufgaben', participle: 'richtig gelöst' };

/** A Map, so that prototype names ('constructor', '__proto__') are no family. */
const BY_ID: ReadonlyMap<string, FamilyPhrases> = new Map(Object.entries(FAMILY_PHRASES));

/** "Du hast <object> jetzt fünfmal <participle>." for a stored tag (a family id); unknown tags get FALLBACK_PHRASE. */
export function familyPhrase(tag: string): FamilyPhrase {
  return BY_ID.get(tag)?.phrase ?? FALLBACK_PHRASE;
}
