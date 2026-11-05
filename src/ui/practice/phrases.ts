/**
 * German phrase bank for the practice flow (docs/research.md §7.4, §7.2).
 * Process and effort praise only; no trait or speed praise, no superlatives, never "falsch".
 */
import { fieldText, formatAnswer } from '../../core/check';
import { BOX, fmtPoint, toSpeech } from '../../core/format';
import type { Answer, Exercise, Stufe } from '../../core/types';

/** Shown in the heading of a correct answer. */
export const CORRECT_HEADING = 'Richtig.';

/** Solved on the 2nd try: effort praise (rotates). */
export const EFFORT_PHRASES = [
  'Geschafft – du hast weiter geübt.',
  'Du hast es noch einmal versucht.',
  'Du hast noch einmal genau hingeschaut.',
  'Du hast den Hinweis genutzt.',
  'Beim zweiten Versuch hat es geklappt.',
  'Du hast weiter gerechnet.',
] as const;

export const RETRY_HEADING = 'Noch nicht ganz. Probier es noch einmal.';
export const SOLUTION_HEADING = 'So kannst du rechnen:';
export const SOLUTION_PREFIX = 'Die Lösung: ';

/** Normalising sentences (at most one per session). */
export const NORMALISING_PHRASES = [
  'Fehler helfen beim Lernen.',
  'Das ist eine knifflige Stelle. Vielen geht das so.',
  'Gemischte Aufgaben sind schwerer. Das bringt mehr beim Üben.',
] as const;

export const TWIN_NOTE = 'Gleich kommt eine ähnliche Aufgabe. Dann kannst du den Lösungsweg nutzen.';

/** A Zwillingsaufgabe solved first try after the worked solution: a small, calm acknowledgement (M16; rotates). */
export const TWIN_SOLVED_PHRASES = [
  'Du hast den Lösungsweg von vorhin genutzt.',
  'Du hast den Lösungsweg wieder genutzt.',
  'Du hast dir den Lösungsweg gemerkt.',
  'Diesmal hast du es auf Anhieb gelöst.',
  'Du hast es so gemacht wie im Lösungsweg.',
  'Du hast an die knifflige Stelle gedacht.',
] as const;

/** Intro line of the 'So geht's' example after the Einstiegs-Check (the child has already tried). */
export const EXAMPLE_INTRO = 'Hier siehst du ein Beispiel.';
/** Intro line when the example comes back after 2 items in a row needed the solution. */
export const EXAMPLE_AGAIN_INTRO = 'Schau dir das Beispiel noch einmal an.';

/** The same answer was checked again without a change (not counted as an attempt). */
export const UNCHANGED_ANSWER = 'Das ist noch dieselbe Antwort. Ändere die Antwort zuerst und prüfe dann noch einmal.';
export const TWIN_LABEL = 'Eine ähnliche Aufgabe wie vorhin';

export const BREAK_QUESTION = 'Zeit für eine Pause?';
export const BREAK_CONFIRM = 'Eine Pause ist eine gute Idee.';
/** Word for word from the phrase bank (docs/research.md §7.4). */
export const GOODBYE = 'Gut, dass du geübt hast. Bis zum nächsten Mal.';

export const CONSENT_QUESTION = 'Soll die Seite deinen Fortschritt auf diesem Gerät speichern?';
export const CONSENT_NOTE = 'Dein Fortschritt bleibt nur auf diesem Gerät. Die Seite verschickt nichts.';
/** Consent is given, but the browser does not let us store anything (blocked, full, private mode). */
export const SAVE_FAILED_CHILD = 'Speichern geht in diesem Browser gerade nicht. Dein Fortschritt gilt nur für jetzt.';
export const SAVE_FAILED_ADULT = 'Speichern ist in diesem Browser gerade nicht möglich. Der Fortschritt gilt nur, bis die Seite geschlossen wird.';

export const EMPTY_REVIEW = 'Heute ist nichts zu wiederholen.';

/** Rotating pick (deterministic for a given counter). */
export function rotate<T>(items: readonly T[], n: number): T {
  return items[((n % items.length) + items.length) % items.length];
}

export function streakText(n: number): string {
  return `${n} richtig hintereinander.`;
}

/**
 * '8 von 10 geschafft. 2 Aufgaben waren noch knifflig.'
 * Success-framed and honest: missed items of a Stufe that is not 'Sicher' yet are not scheduled for a later
 * review, so the summary does not promise that ("üben wir später noch einmal").
 */
export function summaryText(solved: number, answered: number): string {
  const rest = answered - solved;
  if (solved === 0 && answered > 0) {
    return answered === 1
      ? 'Du hast die Aufgabe bearbeitet. Die Aufgabe war noch knifflig.'
      : `Du hast alle ${answered} Aufgaben bearbeitet. Die Aufgaben waren noch knifflig.`;
  }
  const head = `${solved} von ${answered} geschafft`;
  if (rest <= 0) return `${head}.`;
  return `${head}. ${rest} ${rest === 1 ? 'Aufgabe war' : 'Aufgaben waren'} noch knifflig.`;
}

export function stufeLabel(stufe: Stufe): string {
  return `Stufe ${stufe}`;
}

/** Remove a trailing full stop so sentences can be joined. */
function sentence(text: string): string {
  const t = text.trim();
  return /[.!?…]$/.test(t) ? t : `${t}.`;
}

const SYMBOL_WORDS: Record<string, string> = { '<': 'ist kleiner als', '>': 'ist größer als', '=': 'gleich' };

/** The answer in words for the live region, or null if there is nothing useful to say. */
function spokenAnswer(ex: Exercise, a: Answer, context: 'correct' | 'solution'): string | null {
  switch (a.kind) {
    case 'number': {
      if (a.value === null) return 'Die Aufgabe ist nicht lösbar – es fehlt eine Angabe.';
      const value = fieldText(a.value, a.decimals) + (a.unit ? (a.unit === '°' ? a.unit : ` ${a.unit}`) : '');
      // An answer sentence ('Mia bekommt 2 € zurück.') or label ('Flächeninhalt: 6 Kästchen') is spoken as it is.
      if (a.before || a.after) return [a.before, value, a.after].filter(Boolean).join(' ');
      return `Die Lösung ist ${value}`;
    }
    case 'choice': {
      const label = a.options[a.correct].label.trim();
      if (label in SYMBOL_WORDS) {
        if (ex.expression && ex.expression.split(BOX).length === 2) return ex.expression.replace(BOX, label);
        return `Die Lösung: ${SYMBOL_WORDS[label]}`;
      }
      return `Die Lösung: ${label}`;
    }
    case 'multi':
      return `Die Lösung: ${formatAnswer(a)}`;
    case 'written':
      return `Die Lösung ist ${formatAnswer(a)}`;
    case 'numberline':
      return `Die Lösung ist ${formatAnswer(a)}`;
    case 'cells':
      return context === 'solution' ? 'Die richtigen Kästchen sind im Gitter mit einem Haken markiert' : null;
    case 'order':
      return `Die Reihenfolge: ${a.correct.map((i) => a.items[i]).join(', dann ')}`;
    case 'fraction':
      return `Die Lösung ist ${formatAnswer(a)}`;
    case 'point':
      return a.targets ? `Die Punkte liegen bei ${formatAnswer(a)}` : `Der Punkt liegt bei ${fmtPoint(a.name ?? 'P', a.target[0], a.target[1])}`;
  }
}

/**
 * Spoken result for the live region, e.g. '7 mal 8 ist 56.'
 * Uses the expression with the box filled in when possible, otherwise wording that fits the answer kind
 * ('Die Lösung ist 42.', 'Mia bekommt 2 € zurück.', 'Die Lösung: 6.25 Uhr.'). Empty if there is
 * nothing useful to say (a correct drawing).
 */
export function spokenSolution(ex: Exercise, context: 'correct' | 'solution' = 'solution'): string {
  const a = ex.answer;
  if (ex.expression && a.kind === 'number' && a.value !== null) {
    const boxes = ex.expression.split(BOX).length - 1;
    if (boxes === 1) {
      const filled = ex.expression.replace(BOX, fieldText(a.value, a.decimals));
      const spoken = toSpeech(filled).replace(/ gleich /g, ' ist ');
      return sentence(spoken);
    }
  }
  const text = spokenAnswer(ex, a, context);
  return text ? sentence(toSpeech(text)) : '';
}

/** Text of a task for the live region: the signs as words, as in srText (a screen reader skips or misreads · □ −). */
const spokenSentence = (text: string) => sentence(toSpeech(text));

/** Full sentence for the live region after a correct answer. */
export function announceCorrect(ex: Exercise, praise: string): string {
  return [CORRECT_HEADING, spokenSolution(ex, 'correct'), praise && spokenSentence(praise)].filter(Boolean).join(' ');
}

export function announceRetry(hint: string | null): string {
  return hint ? `${RETRY_HEADING} ${spokenSentence(hint)}` : RETRY_HEADING;
}

/** A hint the child asked for ('Tipp 1: …'; `index` counts from 0). */
export function announceHint(index: number, hint: string): string {
  return `Tipp ${index + 1}: ${spokenSentence(hint)}`;
}

export function announceSolution(ex: Exercise): string {
  return [SOLUTION_HEADING, spokenSolution(ex, 'solution'), 'Die Rechenschritte stehen unter der Aufgabe.'].filter(Boolean).join(' ');
}
