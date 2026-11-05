/**
 * Helpers of the topic 'flaechen': the generator frame (the Stufe picks the forms, the AB the demand inside them), text of quantities, figures drawn to scale
 * and the bug hints of docs/research.md §5, word for word where the text rules allow it.
 */
import { fmt, speak } from '../../core/format';
import type { Ab, Answer, Bug, FigurePoint, MultiField, NumberAnswer, Rng, SkillDef, Stufe, VisualOf } from '../../core/types';
import { build, multiBugs, numberBugs, safeHints, targetAb, type ExerciseBody, type MaybeBug } from '../shared';
import { netWords } from './nets';

/** A task as a form returns it. The frame adds AB and KMK tags, cleans the bugs and hints and writes srText from the text if none is given. */
export type Item = Omit<ExerciseBody, 'ab' | 'kmk' | 'bugs' | 'srText'> & { kmk?: string[]; bugs?: MaybeBug[]; srText?: string };
export type Form = (rng: Rng) => Item;
export type Forms = Readonly<Record<Stufe, Readonly<Record<Ab, Form>>>>;

/**
 * What the pictures hold beyond their own aria-label, so that a task can be solved from srText alone: a figure with the place of each measure, a Quader net with the place of each
 * face, the same for a net among the options, the counts of a Quader of unit cubes, the edges of a labelled Quader. srTextWithPicture() compares digits only: without these words an edge
 * that happens to equal another number of the text would never be said.
 */
function pictureWords({ visual, answer }: Item): string[] {
  const words: string[] = [];
  if (visual?.type === 'figure') words.push(figureWords(visual));
  if (visual?.type === 'net' && 'rects' in visual) words.push(netWords(visual.rects));
  if (visual?.type === 'quader' && visual.unitCubes && !visual.showLabels) words.push(`Der Quader ist ${fmt(visual.a)} Würfel breit, ${fmt(visual.b)} Würfel tief und ${fmt(visual.c)} Würfel hoch.`);
  if (visual?.type === 'quader' && visual.showLabels) {
    const edge = (n: number) => `${fmt(n)}${visual.unit ? ` ${visual.unit}` : ''}`;
    words.push(visual.kind === 'wuerfel' ? `Jede Kante des Würfels ist ${edge(visual.a)} lang.` : `Der Quader im Bild ist ${edge(visual.a)} breit, ${edge(visual.b)} tief und ${edge(visual.c)} hoch.`);
  }
  if (answer.kind === 'choice') for (const o of answer.options) if (o.visual?.type === 'net' && 'rects' in o.visual) words.push(`Bild ${o.label}: ${netWords(o.visual.rects)}`);
  return words;
}

/** Instead of a hint that would state the answer. */
const NEUTRAL_HINT = 'Prüfe deine Rechnung Schritt für Schritt.';

const fits = (x: number, decimals = 0) => x >= 0 && Math.abs(x * 10 ** decimals - Math.round(x * 10 ** decimals)) < 1e-9;

/** The numbers a hint must not state. */
function answerNumbers(answer: Answer): number[] {
  if (answer.kind === 'number') return answer.value === null ? [] : [answer.value];
  if (answer.kind === 'multi') return answer.fields.map((f) => f.value);
  return [];
}

/** Bugs a child can type in this answer's fields, none equal to the answer. */
function usableBugs(bugs: MaybeBug[], answer: Answer): Bug[] {
  if (answer.kind === 'number') return numberBugs(bugs, answer.value).filter((b) => fits(b.match as number, answer.decimals));
  if (answer.kind === 'multi') {
    return multiBugs(bugs, answer.fields).filter((b) => answer.fields.every((f) => {
      const m = (b.match as Record<string, number>)[f.id];
      return m === undefined || fits(m, f.decimals);
    }));
  }
  return bugs.filter((b): b is Bug => !!b);
}

/** The exercise generator of a skill: the Stufe chooses the content, the AB the form inside it. */
export function generator(skill: Pick<SkillDef, 'id' | 'topicId'>, kmk: string[], forms: Forms): SkillDef['generate'] {
  return (rng, stufe, ctx) => {
    const ab = targetAb(rng, stufe, ctx);
    const item = forms[stufe][ab](rng);
    const numbers = answerNumbers(item.answer);
    const safe = (hint: string) => numbers.reduce((text, value) => safeHints([text], value, NEUTRAL_HINT)[0], hint);
    return build(skill, stufe, {
      ...item,
      ab,
      hints: [...new Set(item.hints.map(safe))],
      bugs: usableBugs(item.bugs ?? [], item.answer).map((b) => ({ ...b, hint: safe(b.hint) })),
      kmk: item.kmk ?? kmk,
      srText: item.srText ?? speak([item.context, item.prompt, item.expression, ...pictureWords(item)].filter(Boolean).join(' ')),
    });
  };
}

// ─── Numbers and text ────────────────────────────────────────────────────────

/** Rounds away what a float adds: 2.5 · 100 stays 250, 0.07 · 100 stays 7. */
export const clean = (x: number) => Math.round(x * 1000) / 1000;

/** A quantity: q(12500, 'cm²') → '12 500 cm²'. */
export const q = (n: number, unit: string) => `${fmt(n)} ${unit}`;

export const bug = (id: string, match: Bug['match'], hint: string): Bug => ({ id, match, hint });

/** Above 2: fieldText() writes two decimals as money ('600,00'), and a Lösung here shows '600 dm²' or '3,45 ha'. */
const COMMA_FIELD = 3;

/** A number field of a skill with the comma key (keys.comma): every item sets decimals, so the key gives nothing away. */
export const commaAnswer = (value: number, unit?: string, before?: string): NumberAnswer => ({ kind: 'number', value: clean(value), decimals: COMMA_FIELD, ...(unit ? { unit } : {}), ...(before ? { before } : {}) });

/** A field of a multi answer of a skill with the comma key. */
export const commaField = (id: string, value: number, before: string, after?: string): MultiField => ({ id, value: clean(value), decimals: COMMA_FIELD, before, label: before.replace(/:$/, ''), ...(after ? { after } : {}) });

/** A number field of a skill without the comma key. */
export const wholeAnswer = (value: number, unit?: string, before?: string): NumberAnswer => ({ kind: 'number', value, ...(unit ? { unit } : {}), ...(before ? { before } : {}) });

/** Letters of the faces and of picture options. */
export const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'] as const;

// ─── Hints (docs/research.md §5) ─────────────────────────────────────────────

export const HINT = {
  umfangFlaeche: 'Fläche misst das Innere, Umfang den Rand. Was ist gefragt?',
  schraegeSeite: 'Die Höhe steht senkrecht auf der Grundseite. Nimm nicht die schräge Seite.',
  dreieckHalb: 'Ein Dreieck ist die Hälfte eines Parallelogramms. Denk an die Hälfte.',
  rechteckHalb: 'Das Dreieck ist die Hälfte eines Rechtecks. Denk an die Hälfte.',
  flaecheneinheit: '1 dm² ist ein Quadrat: 10 Reihen mit je 10 cm².',
  volumeneinheit: '1 dm³ hat 10 Schichten mit je 100 cm³.',
  volumenOberflaeche: 'Für die Oberfläche addierst du alle sechs Flächen.',
  oberflaecheDrei: 'Der Quader hat sechs Flächen. Je zwei sind gleich groß.',
  netzUeberlappt: 'Falte das Netz im Kopf. Liegen zwei Flächen aufeinander?',
  huelle: 'Das große Rechteck ist zu viel: Ein Stück fehlt.',
  doppelt: 'Zähle das gemeinsame Stück nur einmal.',
} as const;

// ─── Figures ─────────────────────────────────────────────────────────────────

type FigureSpec = Omit<VisualOf<'figure'>, 'type'>;

const MAX_W = 260;
const MAX_H = 170;

/** A figure in its own units (y downward), scaled to a readable drawing: the proportions stay those of the task's numbers. */
export function figure(spec: FigureSpec): VisualOf<'figure'> {
  const all = [...spec.points, ...(spec.height ? [spec.height.to] : [])];
  const xs = all.map((p) => p.x);
  const ys = all.map((p) => p.y);
  const scale = Math.min(MAX_W / (Math.max(...xs) - Math.min(...xs) || 1), MAX_H / (Math.max(...ys) - Math.min(...ys) || 1));
  const at = (v: number) => Math.round(v * scale * 10) / 10;
  const points: FigurePoint[] = spec.points.map((p) => ({ ...p, x: at(p.x), y: at(p.y) }));
  return { type: 'figure', ...spec, points, ...(spec.height ? { height: { ...spec.height, to: { x: at(spec.height.to.x), y: at(spec.height.to.y) } } } : {}) };
}

const ORDINALS = ['Erste', 'Zweite', 'Dritte', 'Vierte', 'Fünfte', 'Sechste', 'Siebte', 'Achte'] as const;

/** Where a point lies in the figure's box: 'oben links', 'unten', 'in der Mitte'. */
function placeIn(p: FigurePoint, points: readonly FigurePoint[]): string {
  const xs = points.map((c) => c.x);
  const ys = points.map((c) => c.y);
  const part = (v: number, min: number, max: number, low: string, high: string) => (v <= min + (max - min) * 0.2 ? low : v >= max - (max - min) * 0.2 ? high : '');
  const place = [part(p.y, Math.min(...ys), Math.max(...ys), 'oben', 'unten'), part(p.x, Math.min(...xs), Math.max(...xs), 'links', 'rechts')].filter(Boolean).join(' ');
  return place || 'in der Mitte';
}

/** The way from one corner to the next. */
function direction(a: FigurePoint, b: FigurePoint): string {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const across = dx > 0 ? 'rechts' : 'links';
  const down = dy > 0 ? 'unten' : 'oben';
  if (Math.abs(dy) < 0.5) return `nach ${across}`;
  if (Math.abs(dx) < 0.5) return `nach ${down}`;
  return `schräg nach ${across} ${down}`;
}

/** A label in words. 'g = 6 cm' keeps its number, as the spoken 'h' would be an hour (speak() in src/core/format.ts). */
const labelWords = (label: string) => label.replace(/^[a-z] = /, '').replace('?', 'Fragezeichen');

/** The dashed height: its corner, and the side it stands on, or its extension. */
function heightWords({ points, height }: VisualOf<'figure'>): string {
  if (!height) return '';
  const corner = points[height.from];
  const onLine = points.map((a, i) => ({ a, b: points[(i + 1) % points.length] })).find(({ a, b }) => Math.abs(a.y - b.y) < 0.5 && Math.abs(a.y - height.to.y) < 0.5);
  const where = !onLine ? 'senkrecht nach unten ins Innere der Figur' : `senkrecht zu${height.outside ? 'r Verlängerung der' : 'r'} Seite ${placeIn(onLine.a, points).split(' ')[0]}`;
  return `Die gestrichelte Höhe geht${height.outside ? ' außerhalb der Figur' : ''} von der Ecke ${placeIn(corner, points)} ${where}${height.label ? `: ${labelWords(height.label)}` : ''}.`;
}

/**
 * A figure in words, side by side around it from its first corner. figureAriaLabel() in src/ui/visuals/FigureVisual.tsx says 'Eine Seite: 15 cm' for a side without corner letters, which fits
 * any side: here the way of each side tells the base from the slanted side, and the wall from the width. It repeats every number of that label, so that srTextWithPicture() does not add it.
 */
export function figureWords(v: VisualOf<'figure'>): string {
  const { points, sides, rightAngles, parallelMarks, equalMarks } = v;
  const ordinal = (i: number) => ORDINALS[i].toLowerCase();
  const list = (group: readonly number[]) => group.map(ordinal).join(' und ');
  const parts = [`Figur mit ${fmt(points.length)} Ecken. Der Weg um die Figur beginnt ${placeIn(points[0], points)}.`];
  points.forEach((p, i) => {
    const label = sides?.[i];
    parts.push(`${ORDINALS[i]} Seite ${direction(p, points[(i + 1) % points.length])}: ${label ? labelWords(label) : 'ohne Zahl'}.`);
  });
  if (v.height) parts.push(heightWords(v));
  if (rightAngles?.length) parts.push(`${rightAngles.length === 1 ? 'Ein rechter Winkel' : `${fmt(rightAngles.length)} rechte Winkel`}: ${rightAngles.map((i) => placeIn(points[i], points)).join(', ')}.`);
  for (const pair of parallelMarks ?? []) parts.push(`Parallel sind die ${list(pair)} Seite.`);
  for (const group of equalMarks ?? []) parts.push(`Gleich lang sind die ${list(group)} Seite.`);
  return parts.join(' ');
}

/** A rectangle a wide and b high; labels on the top and left side, by default with their lengths. */
export function rectFigure(a: number, b: number, unit: string, labels: { top?: string; left?: string } = {}): VisualOf<'figure'> {
  return figure({ points: [{ x: 0, y: 0 }, { x: a, y: 0 }, { x: a, y: b }, { x: 0, y: b }], sides: [labels.top ?? q(a, unit), null, null, labels.left ?? q(b, unit)], rightAngles: [0, 1, 2, 3] });
}

/** A Quader as a Schrägbild with its edges. */
export function quaderPic(a: number, b: number, c: number, extra: Partial<VisualOf<'quader'>> = {}): VisualOf<'quader'> {
  return { type: 'quader', a, b, c, unit: 'cm', showLabels: true, hiddenEdges: 'dashed', ...extra };
}

/** Bounding box w × h with its top right corner cut out, at most half of each side, so all side labels stay outside the figure. */
export interface LForm {
  w: number;
  h: number;
  cutW: number;
  cutH: number;
}

export const lArea = (l: LForm) => l.w * l.h - l.cutW * l.cutH;

/** The six sides clockwise from the top: w − cutW, cutH, cutW, h − cutH, w, h. */
export const lSides = (l: LForm) => [l.w - l.cutW, l.cutH, l.cutW, l.h - l.cutH, l.w, l.h];

/** The L-form drawn to scale. hidden: the indices of lSides() without a label. */
export function lFigure(l: LForm, unit: string, hidden: readonly number[] = []): VisualOf<'figure'> {
  const { w, h, cutW, cutH } = l;
  return figure({
    points: [{ x: 0, y: 0 }, { x: w - cutW, y: 0 }, { x: w - cutW, y: cutH }, { x: w, y: cutH }, { x: w, y: h }, { x: 0, y: h }],
    sides: lSides(l).map((s, i) => (hidden.includes(i) ? null : q(s, unit))),
  });
}

/**
 * Can a child read the labels at the cut (src/ui/visuals/FigureVisual.tsx)? Labels stand 18 px from their side and are about 50 px wide and 17 px high: the flat side must hold
 * its label, and that label must clear the one beside the steep side.
 */
export function lLabelsFit({ w, h, cutW, cutH }: LForm): boolean {
  const scale = Math.min(MAX_W / w, MAX_H / h);
  return cutW * scale >= 50 && (cutH * scale >= 70 || cutW * scale >= 136);
}

/** An L-form whose cut takes between a quarter and a half of each side, with labels that can all be read. */
export function pickL(rng: Rng, w: [number, number], h: [number, number]): LForm {
  for (;;) {
    const W = rng.int(w[0], w[1]);
    const H = rng.int(h[0], h[1]);
    const l = { w: W, h: H, cutW: rng.int(Math.ceil(W / 4), Math.floor(W / 2)), cutH: rng.int(Math.ceil(H / 4), Math.floor(H / 2)) };
    if (lLabelsFit(l)) return l;
  }
}

/** Right triangles with whole sides: height, offset of the foot, slanted side. The drawing stays true to the numbers. */
export const TRIPLES: readonly (readonly [h: number, shift: number, side: number])[] = [
  [3, 4, 5], [4, 3, 5], [6, 8, 10], [8, 6, 10], [5, 12, 13], [12, 5, 13], [9, 12, 15], [12, 9, 15], [8, 15, 17], [15, 8, 17],
];
