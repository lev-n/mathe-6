/**
 * German texts for improvements (docs/research.md M16, M15): the round summary notes "Das hast du verbessert",
 * the progress view "So hast du dich verbessert" and the screen-reader announcement after a round.
 * Every line names what the child did and compares only with the child's own earlier answers: no traits, no speed,
 * no superlatives, no "falsch".
 */
import { fmt, toSpeech } from '../../core/format';
import type { Stufe } from '../../core/types';
import { GROWTH_WINDOW, OVERCOME_RUN, type RoundNote, type SkillGrowthView } from '../../state/growth';
import type { BadgeDef, MasteryState } from '../../state/types';
import { familyPhrase, type FamilyPhrase } from '../../topics/errorPhrases';
import { MASTERY_LABEL, stufeLabel } from '../app/labels';
import { summaryText } from './phrases';

export const IMPROVED_HEADING = 'Das hast du verbessert';
export const GROWTH_VIEW_HEADING = 'So hast du dich verbessert';

/** "Du hast <object> jetzt fünfmal <participle>." (src/topics/errorPhrases.ts) */
export type ErrorPhrase = FamilyPhrase;

/** Phrase of a stored error-library tag (a misconception family id, src/topics/errorFamilies.ts). */
export function errorPhrase(tag: string): ErrorPhrase {
  return familyPhrase(tag);
}

const TIMES_WORD: Record<number, string> = { 5: 'fünfmal', 6: 'sechsmal', 7: 'siebenmal', 8: 'achtmal', 9: 'neunmal', 10: 'zehnmal' };

/** A prepositional object ('an alle Rechenschritte') or one with "auch" reads better after "jetzt fünfmal". */
const PREPOSITION = /^(an|auf|mit|in|zu|bei|für|auch) /;

/**
 * 'Du hast den Übertrag jetzt fünfmal richtig beachtet.' / 'Du hast jetzt fünfmal an alle Rechenschritte gedacht.'
 * (`now` = '' in the progress view: no "jetzt").
 */
export function overcomeSentence(tag: string, run: number = OVERCOME_RUN, now = 'jetzt '): string {
  const { object, participle } = errorPhrase(tag);
  const times = `${now}${TIMES_WORD[run] ?? `${fmt(run)}-mal`}`;
  return PREPOSITION.test(object) ? `Du hast ${times} ${object} ${participle}.` : `Du hast ${object} ${times} ${participle}.`;
}

/** When the miss was: 'Vor ein paar Tagen', … */
export function agoPhrase(days: number): string {
  if (days >= 14) return 'Vor ein paar Wochen';
  if (days >= 8) return 'Vor mehr als einer Woche';
  if (days === 7) return 'Vor einer Woche';
  return 'Vor ein paar Tagen';
}

const levelPhrase = (state: MasteryState) => `jetzt ist die Stufe „${MASTERY_LABEL[state]}“`;

const of10 = (n: number) => `${fmt(n)} von ${fmt(GROWTH_WINDOW)}`;

/**
 * "Am Anfang 4 von 10 auf Anhieb, jetzt 9 von 10." – a very low start is said in words, never "0 von 10" (M15).
 * `now` is the second half ("jetzt 9 von 10" or "jetzt ist die Stufe „Sicher“").
 */
function fromTo(early: number, now: string, nowIsCount: boolean): string {
  if (early <= 1) return `Am Anfang war das noch knifflig – ${now}${nowIsCount ? ' auf Anhieb' : ''}.`;
  return `Am Anfang ${of10(early)} auf Anhieb${nowIsCount ? ', ' : ' – '}${now}.`;
}

/** A note of "Das hast du verbessert": `head` names the skill, `text` what the child did. */
export interface NoteParts {
  head?: string;
  text: string;
}

/**
 * One line of "Das hast du verbessert". `title` gives the skill's title.
 * The title is kept apart from the sentence (titles can end in "?" or contain commas).
 */
export function noteParts(note: RoundNote, title: (skillId: string) => string): NoteParts {
  const skillHead = (n: { skillId: string; stufe: Stufe }) => `${title(n.skillId)} – ${stufeLabel(n.stufe)}`; // not "·": that is read as "mal"
  switch (note.kind) {
    case 'behalten':
      return { head: skillHead(note), text: `${agoPhrase(note.days)} war das noch knifflig. Heute hast du so eine Aufgabe auf Anhieb gelöst.` };
    case 'besser':
      return { head: skillHead(note), text: fromTo(note.early, `jetzt ${of10(note.recent)}`, true) };
    case 'fehler':
      return { head: title(note.skillId), text: overcomeSentence(note.tag, note.run, 'jetzt ') };
    case 'zwilling':
      return {
        text:
          note.count === 1
            ? 'Danach hast du die ähnliche Aufgabe auf Anhieb gelöst.'
            : `Danach hast du ${fmt(note.count)} ähnliche Aufgaben auf Anhieb gelöst.`,
      };
    case 'selbst':
      return {
        text:
          note.count === 1
            ? 'Bei einer Aufgabe hast du deine Antwort selbst verbessert.'
            : `Bei ${fmt(note.count)} Aufgaben hast du deine Antwort selbst verbessert.`,
      };
  }
}

/** True for the larger improvements (kinds 3–5), which get the emphasised style. */
export function isBigNote(note: RoundNote): boolean {
  return note.kind !== 'zwilling' && note.kind !== 'selbst';
}

/**
 * Lines of the progress view for one skill ("Stufe 2: Am Anfang 4 von 10 auf Anhieb, später 9 von 10."), each once.
 * Only what got better; the numbers never go down (StufeGrowthView.window keeps the best).
 */
export function growthViewLines(view: SkillGrowthView): string[] {
  const lines: string[] = [];
  const add = (line: string) => {
    // two tags without a family share the fallback sentence: say it once
    if (!lines.includes(line)) lines.push(line);
  };
  for (const s of view.stufen) {
    const head = `${stufeLabel(s.stufe as Stufe)}: `;
    if (s.window) add(head + fromTo(s.window.early, `später ${of10(s.window.best)}`, true));
    else if (s.level && s.early !== undefined) add(head + fromTo(s.early, levelPhrase(s.level), false));
    if (s.kept > 0) {
      add(
        s.kept === 1
          ? `${head}Das war vorher noch knifflig. In der Wiederholung hast du es auf Anhieb gelöst.`
          : `${head}Das war vorher noch knifflig. In der Wiederholung hast du es ${fmt(s.kept)}-mal auf Anhieb gelöst.`,
      );
    }
  }
  for (const tag of view.overcome) add(overcomeSentence(tag, OVERCOME_RUN, ''));
  return lines;
}

/**
 * Polite live-region text after practice (round summary, or goodbye after a break): `lead` first, then short and
 * complete, because the focus moves to the heading at the same time and the child reads the notes there
 * ("Darunter steht …"). Spoken form (toSpeech).
 */
export function afterPracticeAnnouncement(lead: string, notes: number, badges: readonly BadgeDef[]): string {
  const parts = [lead];
  if (notes > 0) parts.push('Darunter stehen deine Fortschritte.');
  if (badges.length > 0) parts.push(`${badges.length === 1 ? 'Neues Abzeichen' : 'Neue Abzeichen'}: ${badges.map((b) => b.title).join(', ')}.`);
  return toSpeech(parts.join(' '));
}

/** Polite live-region text when the round summary appears. */
export function summaryAnnouncement(solved: number, answered: number, notes: readonly string[], badges: readonly BadgeDef[]): string {
  return afterPracticeAnnouncement(summaryText(solved, answered), notes.length, badges);
}

/** Text for screen readers when it differs from what is shown ('3 · 7' is read as '3 mal 7'), else undefined. */
export function spokenText(text: string): string | undefined {
  const spoken = toSpeech(text);
  return spoken === text ? undefined : spoken;
}
