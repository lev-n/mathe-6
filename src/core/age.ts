/**
 * Age rules for 11–12-year-olds that generators, planners, the UI and tests share (docs/research.md §4, §7.1, §7.3).
 * All numbers are heuristics, chosen to be checkable by a unit test. Pure and free of React and of the state code.
 */
import type { Ab, Rng, Stufe } from './types';

/** Items of a practice round (§7.3), for every skill: no shorter written round. The 3-item Einstiegs-Check counts inside the round. */
export const ROUND_SIZE = 10;
/** The optional short round, "5 Aufgaben" (§7.3): the child's choice, with no penalty. */
export const SHORT_ROUND_SIZE = 5;

/** AB I/II/III items per round of a Stufe (§7.1, §7.3): every Stufe keeps at least one harder item. */
export const AB_MIX: Readonly<Record<Stufe, readonly [ab1: number, ab2: number, ab3: number]>> = {
  1: [7, 2, 1],
  2: [4, 4, 2],
  3: [2, 5, 3],
};
/** The same for the short round, as near to the mix as 5 items allow. */
export const AB_MIX_SHORT: Readonly<Record<Stufe, readonly [ab1: number, ab2: number, ab3: number]>> = {
  1: [3, 1, 1],
  2: [2, 2, 1],
  3: [1, 2, 2],
};

/** The AB levels of the items of one round of `size` items (10 or 5), easier items first. */
export function abSequence(stufe: Stufe, size: number = ROUND_SIZE): Ab[] {
  const mix = size === SHORT_ROUND_SIZE ? AB_MIX_SHORT : AB_MIX;
  return mix[stufe].flatMap((n, i) => Array.from({ length: n }, () => (i + 1) as Ab));
}

/** An AB level drawn with the weights of the mix (items outside a planned round, such as worksheets). */
export function drawAb(rng: Rng, stufe: Stufe): Ab {
  return rng.pick(abSequence(stufe));
}

/** The Stufe suggested for a skill the child has not worked on yet (§7.1): always Stufe 1, and never derived from the plan. */
export const DEFAULT_STUFE: Stufe = 1;

/** Answer limits (§7.1). */
export const MAX_CHOICE_OPTIONS = 8;
export const MAX_ORDER_ITEMS = 6;
export const MAX_MULTI_FIELDS = 4;
/** Decimal places of an answer: up to Tausendstel (§6, dezimal.stellenwert). */
export const MAX_DECIMALS = 3;
/** Points a point answer asks for (§6). */
export const MAX_POINTS = 3;

/** Written calculation (§6): operands up to 8 digits, without the comma; factor and divisor up to 3. */
export const MAX_WRITTEN_DIGITS = 8;
export const MAX_WRITTEN_FACTOR_DIGITS = 3;

/**
 * Largest number a task works with: 1 m³ = 1 000 000 cm³ and a real length at 1 : 25 000 stay below it (§6). A Stufe's own limit belongs to the skill's test.
 */
export const MAX_NUMBER = 10_000_000;

/** Coordinates of a grid (§6: −6 to 6 at Stufe 3 of geometrie.koordinaten, 0 to 10 otherwise). */
export const MAX_COORDINATE = 12;

/** Text limits (§4, T1–T5, T7, T19). */
export const TEXT_LIMITS = {
  /** T1: words of a task without a story. */
  taskWords: 18,
  /** T2: words of a story task (an exercise with `context`). */
  storyWords: { 1: 30, 2: 40, 3: 50 } as Readonly<Record<Stufe, number>>,
  /** T3: sentences, including the question. */
  sentences: { 1: 4, 2: 4, 3: 5 } as Readonly<Record<Stufe, number>>,
  /** T4: words per sentence. */
  sentenceWords: { 1: 14, 2: 14, 3: 18 } as Readonly<Record<Stufe, number>>,
  /** T5: subordinate clauses per task (only wenn, weil, dass, and a relative clause above Stufe 1). */
  subordinateClauses: { 1: 0, 2: 1, 3: 1 } as Readonly<Record<Stufe, number>>,
  /** T7: numbers per sentence of a task; a mixed quantity ('3 € 40 ct') counts as one. */
  sentenceNumbers: 3,
  /** T19: a hint. */
  hintWords: 14,
  hintSentences: 2,
  /** T19: praise. */
  praiseWords: 10,
  /** T19: "one line each" for a worked step, counted in words (the proxy a test can check). */
  stepWords: 16,
  /** T19: worked steps. */
  steps: 5,
} as const;

/** UI rules of §7.1 that code outside the stylesheets needs. */
export const UI_RULES = {
  /** Holdover guard on screen changes (F20). */
  holdoverMs: 300,
  /** Break prompt (F21). */
  breakAfterMinutes: 20,
  /** The warm-up "Heute wiederholen" and the daily cap (L2). */
  warmUpMin: 3,
  warmUpMax: 5,
  reviewsPerDay: 8,
  /** "Gemischte Runde" is offered after this many Sicher skills in a topic (F14). */
  mixMinSicher: 2,
  /** Tap spacing of a point answer, in CSS pixels. */
  pointSpacingPx: 32,
} as const;
