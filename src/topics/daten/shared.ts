/**
 * Helpers of the topic 'daten': the themes of the charts, chart and table builders, and answers made of pictures. Pure, randomness only through the Rng parameter.
 */
import { fmtPercent, speak } from '../../core/format';
import type { Bug, ChoiceAnswer, Rng, Visual, VisualOf } from '../../core/types';
import { numberBugs, type MaybeBug } from '../shared';

export const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** Rounds away the float noise of a sum of decimals. */
export const clean = (x: number) => Math.round(x * 1000) / 1000;

export const sum = (values: readonly number[]) => clean(values.reduce((a, b) => a + b, 0));

const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));

/** The smallest common multiple: the smallest common Nenner of two fractions. */
export const lcm = (a: number, b: number) => (a * b) / gcd(a, b);

/** A fraction in lowest terms. */
export function lowest(numerator: number, denominator: number): [number, number] {
  const g = gcd(numerator, denominator);
  return [numerator / g, denominator / g];
}

// ─── Themes of the charts ────────────────────────────────────────────────────

/** A data set of a chart: what is counted, in which groups, and how a sentence names a group. */
export interface Theme {
  id: string;
  title: string;
  categories: readonly string[];
  /** The counted things, plural: 'Bücher'. */
  unit: string;
  /** The word for one group, the head of a table: 'Tag'. */
  group: string;
  /** How a sentence names a group: 'am Montag'. */
  at(category: string): string;
  /** The question word of a group: 'An welchem Tag'. */
  which: string;
}

const CLASSES = ['6a', '6b', '6c', '6d', '6e'];

/**
 * A chart's width grows with its longest group name and its title. At most 6 letters and 31 characters: every bar of a chart fits a 375 px phone, also as an answer option, so no bar starts out of view.
 */
export const THEMES: readonly Theme[] = [
  { id: 'sport', title: 'Lieblingssport an der Schule', categories: ['Tennis', 'Judo', 'Tanzen', 'Hockey', 'Turnen'], unit: 'Personen', group: 'Sportart', at: (c) => `bei ${c}`, which: 'Bei welcher Sportart' },
  { id: 'buecher', title: 'Ausgeliehene Bücher', categories: ['März', 'April', 'Mai', 'Juni', 'Juli'], unit: 'Bücher', group: 'Monat', at: (c) => `im ${c}`, which: 'In welchem Monat' },
  { id: 'fahrrad', title: 'Fahrräder der Klassen', categories: CLASSES, unit: 'Fahrräder', group: 'Klasse', at: (c) => `in der ${c}`, which: 'In welcher Klasse' },
  { id: 'musik', title: 'Anmeldungen in der Musikschule', categories: ['Geige', 'Flöte', 'Cello', 'Harfe', 'Tuba'], unit: 'Anmeldungen', group: 'Instrument', at: (c) => `bei ${c}`, which: 'Bei welchem Instrument' },
  { id: 'waffeln', title: 'Waffeln beim Schulfest', categories: CLASSES, unit: 'Waffeln', group: 'Klasse', at: (c) => `in der ${c}`, which: 'In welcher Klasse' },
  { id: 'zoo', title: 'Besuch im Zoo', categories: ['April', 'Mai', 'Juni', 'Juli', 'August'], unit: 'Personen', group: 'Monat', at: (c) => `im ${c}`, which: 'In welchem Monat' },
];

/** n groups of a theme, in the theme's own order (Montag before Dienstag). */
export function pickCategories(rng: Rng, theme: Theme, n: number): string[] {
  const chosen = rng.sample(theme.categories, n);
  return theme.categories.filter((c) => chosen.includes(c));
}

/** n distinct multiples of step, from step up to maxK · step, in random order. */
export function multiples(rng: Rng, n: number, step: number, maxK: number): number[] {
  return rng.sample(Array.from({ length: maxK }, (_, i) => (i + 1) * step), n);
}

export type BarChart = VisualOf<'barChart'>;

/** Asks for the step without naming it: at Stufe 1 the step can be the answer. A question of its own, as Stufe 1 has no subordinate clause (T5). */
export const AXIS_QUESTION = 'Schau an der Achse: Wie viel zählt ein Kästchen?';

/** A bar chart of a theme: its axis ends one line above the highest bar. start: a shortened axis, on purpose. */
export function barChart(theme: Theme, categories: string[], values: number[], step: number, opts: { start?: number; horizontal?: boolean } = {}): BarChart {
  const start = opts.start ?? 0;
  const axisMax = start + step * (Math.ceil((Math.max(...values) - start) / step) + 1);
  return {
    type: 'barChart',
    title: theme.title,
    categories,
    values,
    axisMax,
    axisStep: step,
    valueLabel: `Anzahl: ${theme.unit}`,
    ...(start > 0 ? { axisStart: start } : {}),
    ...(opts.horizontal ? { horizontal: true } : {}),
  };
}

/** The groups and values of a chart, for a worked step or the voice: 'Montag 20, Dienstag 40'. */
export const chartWords = (categories: readonly string[], values: readonly number[], show: (x: number) => string = String) => categories.map((c, i) => `${c} ${show(values[i])}`).join(', ');

// ─── Pie charts ──────────────────────────────────────────────────────────────

const PATTERNS = ['lines', 'dots', 'solid', 'cross', 'waves', 'none'] as const;

export type PieChart = VisualOf<'pieChart'>;

/** A pie chart with one pattern per slice. */
export function pieChart(title: string, labels: readonly string[], values: readonly number[], showValues: PieChart['showValues']): PieChart {
  return { type: 'pieChart', title, slices: labels.map((label, i) => ({ label, value: values[i], pattern: PATTERNS[i] })), showValues };
}

/** A survey for a pie chart or a Strichliste: the question it asks and its answers. */
export interface Survey {
  id: string;
  title: string;
  options: readonly string[];
}

export const SURVEYS: readonly Survey[] = [
  { id: 'weg', title: 'Schulweg', options: ['Bus', 'Rad', 'zu Fuß', 'Bahn', 'Roller'] },
  { id: 'fach', title: 'Lieblingsfach', options: ['Mathe', 'Sport', 'Musik', 'Kunst', 'Deutsch'] },
  { id: 'pause', title: 'Pausensnack', options: ['Apfel', 'Brot', 'Banane', 'Müsli', 'Gurke'] },
  { id: 'ferien', title: 'Ferienziel', options: ['Meer', 'Berge', 'Stadt', 'See', 'Land'] },
  { id: 'tier', title: 'Haustier', options: ['Hund', 'Katze', 'Fisch', 'Hase', 'Vogel'] },
];

/** Two thin slices side by side, 15 % or less together: their labels would lie on top of each other. */
export const thinNeighbours = (shares: readonly number[]) => shares.some((s, i) => s + shares[(i + 1) % shares.length] < 20);

/** n shares that sum to 100, multiples of step, each at least step, with no two thin slices side by side. A retry keeps it pure: only the rng decides. */
export function partition(rng: Rng, n: number, step: number): number[] {
  const units = 100 / step;
  for (;;) {
    const cuts = rng.sample(Array.from({ length: units - 1 }, (_, i) => i + 1), n - 1).sort((a, b) => a - b);
    const shares = [...cuts, units].map((c, i) => (c - (i === 0 ? 0 : cuts[i - 1])) * step);
    if (!thinNeighbours(shares)) return shares;
  }
}

/**
 * Other shares with the same order of size as these distinct shares: every slice keeps its rank, so comparing sizes leaves all of them open and only a calculation decides.
 */
export function sameOrderShares(rng: Rng, shares: readonly number[], count: number): number[][] {
  const rank = (s: readonly number[]) => s.map((x) => s.filter((y) => y < x).length).join();
  const out: number[][] = [];
  shares.forEach((_, up) => {
    shares.forEach((__, down) => {
      for (const by of [5, 10, 15]) {
        const next = shares.map((s, k) => (k === up ? s + by : k === down ? s - by : s));
        if (up !== down && Math.min(...next) >= 10 && new Set(next).size === next.length && rank(next) === rank(shares) && !thinNeighbours(next)) out.push(next);
      }
    });
  });
  return rng.sample(out, count);
}

// ─── Tables ──────────────────────────────────────────────────────────────────

/** A table of two columns: one row per group. */
export function table(caption: string, header: [string, string], names: readonly string[], cells: readonly string[]): VisualOf<'table'> {
  return { type: 'table', caption, header: [...header], rows: names.map((n, i) => [n, cells[i]]) };
}

// ─── Answers ─────────────────────────────────────────────────────────────────

/** Number bugs a child can type in a field with these decimals (a whole-number field takes no comma). */
export function typeableBugs(bugs: MaybeBug[], correct: number, decimals = 0): Bug[] {
  const fits = (x: number) => Math.abs(x * 10 ** decimals - Math.round(x * 10 ** decimals)) < 1e-9;
  return numberBugs(bugs.filter((b) => !b || typeof b.match !== 'number' || fits(b.match)), correct);
}

const LETTERS = ['A', 'B', 'C', 'D'];

/** A choice between pictures, lettered in the order they appear: the letter says nothing about the answer. */
export function pictureChoice(rng: Rng, noun: string, correct: Visual, wrongs: readonly { visual: Visual; whyWrong: string }[]): ChoiceAnswer {
  const all = rng.shuffle<{ visual: Visual; whyWrong?: string }>([{ visual: correct }, ...wrongs]);
  const options = all.map((o, i) => ({ label: `${noun} ${LETTERS[i]}`, visual: o.visual, ...(o.whyWrong ? { whyWrong: o.whyWrong } : {}) }));
  return { kind: 'choice', options, correct: all.findIndex((o) => o.visual === correct), layout: 'grid' };
}

// ─── Speech ──────────────────────────────────────────────────────────────────

/**
 * A picture in words. srTextWithPicture leaves a picture out when srText holds all its numbers, so a task whose options repeat those numbers says its own
 * picture; otherwise nothing tells the task's table from the options.
 */
export const tableWords = (t: VisualOf<'table'>) => `Die Tabelle ${t.caption ?? ''}: ${t.rows.map((r) => r.join(' ')).join(', ')}.`;
export const pieWords = (p: PieChart) => `Das Kreisdiagramm ${p.title}: ${p.slices.map((s) => `${s.label} ${fmtPercent(s.value)}`).join(', ')}.`;
export const chartSpeech = (c: BarChart) => `Das Diagramm ${c.title}: ${chartWords(c.categories, c.values)}. Die unterste Zahl der Achse ist ${c.axisStart ?? 0}.`;

/** One spoken part, closed with one mark: the next part never runs into it. */
const closed = (part: string) => (/[.?!:]$/.test(part.trim()) ? part.trim() : `${part.trim()}.`);

/** The text for a screen reader: the task and, for a choice, its options. */
export function say(parts: readonly (string | undefined)[], answer?: ChoiceAnswer): string {
  const options = answer ? answer.options.map((o) => o.label.trim().replace(/\.$/, '')).join('. Oder: ') : undefined;
  return speak([...parts, options].filter((part): part is string => Boolean(part)).map(closed).join(' '));
}
