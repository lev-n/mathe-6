/**
 * Small helpers of the topic 'geometrie': the drawings the skills share, polyominoes for Kästchen tasks and the guard for answers with a tolerance.
 * Pure functions only. `lines` drawings follow the `lines` visual (a picture of 300 × 200 units around the centre, y upward).
 */
import type { Bug, Cell, ChoiceAnswer, ChoiceOption, FigurePoint, GridPoint, Rng, Visual, VisualOf } from '../../core/types';
import { makeChoice, numberBugs, type MaybeBug } from '../shared';

// ─── Choices ─────────────────────────────────────────────────────────────────

/** Labels in a fixed order. */
export function fixedChoice(rng: Rng, correct: string, wrongs: ChoiceOption[], order: readonly string[]): ChoiceAnswer {
  return makeChoice(rng, { label: correct }, wrongs, { order: [...order], max: order.length });
}

/** Ja or Nein in a fixed order, with the targeted hint on the wrong one. */
export function yesNo(rng: Rng, isYes: boolean, whyYes: string, whyNo: string): ChoiceAnswer {
  return isYes ? fixedChoice(rng, 'Ja', [{ label: 'Nein', whyWrong: whyNo }], ['Ja', 'Nein']) : fixedChoice(rng, 'Nein', [{ label: 'Ja', whyWrong: whyYes }], ['Ja', 'Nein']);
}

export const LETTERS = ['A', 'B', 'C', 'D'] as const;

/** Pictures as options A, B, C …, in random places. The options come back in that order, for the spoken text. */
export function pictureChoice<T extends { visual: Visual; whyWrong?: string }>(rng: Rng, correct: T, wrongs: readonly T[]): { answer: ChoiceAnswer; shown: T[] } {
  const shown = rng.shuffle([correct, ...wrongs]);
  const options: ChoiceOption[] = shown.map((o, i) => ({ label: LETTERS[i], visual: o.visual, ...(o === correct || !o.whyWrong ? {} : { whyWrong: o.whyWrong }) }));
  return { answer: { kind: 'choice', options, correct: shown.indexOf(correct), layout: 'grid' }, shown };
}

// ─── Angles ──────────────────────────────────────────────────────────────────

/** Turns of the first arm for a rotated angle. */
export const BASES = [20, 30, 45, 60, 75, 100, 120, 135, 150, 200, 225, 250, 300, 330] as const;

export function angleVisual(degrees: number, baseRotation = 0, rest: Partial<VisualOf<'angle'>> = {}): VisualOf<'angle'> {
  return { type: 'angle', degrees, baseRotation, arm1: 1, arm2: 1, showArc: true, ...rest };
}

/** The same angle with the Geodreieck on it: zero on the first arm, centre on the vertex. */
export function toolVisual(degrees: number, baseRotation = 0, rest: Partial<VisualOf<'angle'>> = {}): VisualOf<'angle'> {
  return angleVisual(degrees, baseRotation, { tool: 'geodreieck', ...rest });
}

/** Only bugs that the tolerance of the answer does not already accept. */
export function beyondTolerance(bugs: MaybeBug[], value: number, tolerance: number): Bug[] {
  return numberBugs(bugs, value).filter((b) => Math.abs((b.match as number) - value) > tolerance);
}

/** How the voice introduces an opening: the clock face gives the measure, and the Blattecke the benchmark the child compares with. */
export const CLOCK_FACE = 'Stell dir ein Zifferblatt vor. Eine Blattecke reicht von der 12 bis Minute 15.';
/** An opening as data for the voice, which has no picture. A number to compare, never a verdict such as 'größer als eine Blattecke': that is the answer to name or estimate. */
export const clockMinute = (d: number) => Math.round(d / 6);
export const openingOnClock = (d: number) => `Die Öffnung reicht von der 12 bis etwa Minute ${clockMinute(d)}.`;

// ─── Lines with named angles ─────────────────────────────────────────────────

type Line = VisualOf<'lines'>['lines'][number];

/** The signed distance of (x, y) from a line of the `lines` visual. */
const gap = (l: Pick<Line, 'angle' | 'offset'>, x: number, y: number) => {
  const r = (l.angle * Math.PI) / 180;
  return x * Math.sin(r) - y * Math.cos(r) - l.offset;
};

/**
 * A place for a named point inside the angle in this direction from (cx, cy), as near to the crossing as it can be: the dot and its letter (written up and to the right
 * of the dot) stay clear of all lines and inside the picture. The `lines` visual has no angle labels, so an angle is named by such a point.
 */
export function spotInAngle(lines: readonly Line[], cx: number, cy: number, direction: number): { x: number; y: number } {
  const a = (direction * Math.PI) / 180;
  for (let r = 24; r <= 110; r += 2) {
    const x = Math.round(cx + r * Math.cos(a) - 7);
    const y = Math.round(cy + r * Math.sin(a) - 8);
    const inside = Math.abs(x) <= 136 && y + 22 <= 98 && y >= -92 && x + 24 <= 148;
    if (!inside) continue;
    const corners = [[x, y], [x + 8, y + 3], [x + 22, y + 3], [x + 8, y + 21], [x + 22, y + 21]];
    const clear = lines.every((l) => {
      const sign = Math.sign(gap(l, cx + r * Math.cos(a), cy + r * Math.sin(a)));
      return corners.every(([px, py]) => gap(l, px, py) * sign >= 4);
    });
    if (clear) return { x, y };
  }
  return { x: Math.round(cx + 40 * Math.cos(a) - 7), y: Math.round(cy + 40 * Math.sin(a) - 8) };
}

export const ANGLE_NAMES = ['α', 'β', 'γ', 'δ'] as const;
const SAID: Readonly<Record<string, string>> = { α: 'Alpha', β: 'Beta', γ: 'Gamma', δ: 'Delta' };
/** The Greek letters as the voice says them. */
export const sayAngles = (text: string) => text.replace(/[αβγδ]/g, (c) => SAID[c]);

/** Two lines through the centre with the angles α, β, γ, δ counterclockwise. α has the given size, γ lies opposite. named: only these angles get their letter. */
export function crossing(tilt: number, alpha: number, named: readonly number[] = [0, 1, 2, 3]): VisualOf<'lines'> {
  const lines = [{ angle: tilt, offset: 0 }, { angle: tilt + alpha, offset: 0 }];
  const middles = [tilt + alpha / 2, tilt + alpha + (180 - alpha) / 2, tilt + 180 + alpha / 2, tilt + 180 + alpha + (180 - alpha) / 2];
  const points: GridPoint[] = named.map((i) => ({ ...spotInAngle(lines, 0, 0, middles[i]), label: ANGLE_NAMES[i] }));
  return { type: 'lines', lines, points };
}

/** The Geraden p and q are parallel, r crosses both at theta. α lies at the crossing with p, β and γ at the crossing with q: β is the Stufenwinkel of α, γ the Nebenwinkel of β. */
export function parallels(theta: number): VisualOf<'lines'> {
  const lines: Line[] = [{ angle: 0, offset: -48, label: 'p' }, { angle: 0, offset: 48, label: 'q' }, { angle: theta, offset: 0, label: 'r', labelAtStart: true }];
  const shift = 48 / Math.tan((theta * Math.PI) / 180);
  const points: GridPoint[] = [
    { ...spotInAngle(lines, shift, 48, theta / 2), label: 'α' },
    { ...spotInAngle(lines, -shift, -48, theta / 2), label: 'β' },
    { ...spotInAngle(lines, -shift, -48, theta + (180 - theta) / 2), label: 'γ' },
  ];
  return { type: 'lines', lines, points, parallelMarks: [[0, 1]] };
}

// ─── Figures ─────────────────────────────────────────────────────────────────

const round1 = (n: number) => Math.round(n * 10) / 10;

/** Corners with the names A, B, C …, turned by `turn` degrees and fitted to about `size` drawing units. */
export function fitted(points: readonly (readonly [number, number])[], turn = 0, size = 240): FigurePoint[] {
  const r = (turn * Math.PI) / 180;
  const turned = points.map(([x, y]) => [x * Math.cos(r) - y * Math.sin(r), x * Math.sin(r) + y * Math.cos(r)]);
  const xs = turned.map((p) => p[0]);
  const ys = turned.map((p) => p[1]);
  const scale = size / Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys));
  return turned.map(([x, y], i) => ({ x: round1((x - Math.min(...xs)) * scale), y: round1((y - Math.min(...ys)) * scale), label: LETTERS[i] }));
}

/** A triangle with the angles alpha at A and beta at B, drawn to scale, y downward. */
export function triangleFromAngles(alpha: number, beta: number, turn = 0): FigurePoint[] {
  const gamma = 180 - alpha - beta;
  const sin = (d: number) => Math.sin((d * Math.PI) / 180);
  const cos = (d: number) => Math.cos((d * Math.PI) / 180);
  const b = sin(beta) / sin(gamma);
  return fitted([[0, 0], [1, 0], [b * cos(alpha), -b * sin(alpha)]], turn);
}

/** A triangle with the sides AB = c, BC = a and CA = b, drawn to scale, y downward. */
export function triangleFromSides(a: number, b: number, c: number, turn = 0): FigurePoint[] {
  const x = (b * b + c * c - a * a) / (2 * c);
  return fitted([[0, 0], [c, 0], [x, -Math.sqrt(b * b - x * x)]], turn);
}

// ─── Kästchen figures ────────────────────────────────────────────────────────

/** Moved to the top left corner and sorted, so two equal figures have the same list. */
export function normalize(cells: readonly Cell[]): Cell[] {
  const minX = Math.min(...cells.map((c) => c[0]));
  const minY = Math.min(...cells.map((c) => c[1]));
  return cells.map(([x, y]) => [x - minX, y - minY] as Cell).sort((a, b) => a[1] - b[1] || a[0] - b[0]);
}

export const cellsKey = (cells: readonly Cell[]) => normalize(cells).map((c) => c.join('.')).join('_');
export const turned = (cells: readonly Cell[], quarters: number): Cell[] => {
  let out: Cell[] = [...cells];
  for (let i = 0; i < quarters; i++) out = out.map(([x, y]) => [-y, x] as Cell);
  return normalize(out);
};
export const flipped = (cells: readonly Cell[]): Cell[] => normalize(cells.map(([x, y]) => [-x, y] as Cell));

/** All eight positions of a figure on the grid: turned and flipped. */
const positions = (cells: readonly Cell[]) => [0, 1, 2, 3].flatMap((q) => [cellsKey(turned(cells, q)), cellsKey(flipped(turned(cells, q)))]);
/** The same key for every figure that fits exactly on this one. */
export const congruenceKey = (cells: readonly Cell[]) => [...positions(cells)].sort()[0];

const has = (cells: readonly Cell[], x: number, y: number) => cells.some((c) => c[0] === x && c[1] === y);
const NEIGHBOURS = [[1, 0], [-1, 0], [0, 1], [0, -1]];

function isConnected(cells: readonly Cell[]): boolean {
  const seen = new Set<string>([cells[0].join()]);
  const queue: Cell[] = [cells[0]];
  while (queue.length) {
    const [x, y] = queue.pop()!;
    for (const [dx, dy] of NEIGHBOURS) {
      if (has(cells, x + dx, y + dy) && !seen.has(`${x + dx},${y + dy}`)) {
        seen.add(`${x + dx},${y + dy}`);
        queue.push([x + dx, y + dy]);
      }
    }
  }
  return seen.size === cells.length;
}

/** A connected figure of n Kästchen inside w × h, not yet moved to a corner. */
export function polyomino(rng: Rng, n: number, w: number, h: number): Cell[] {
  const cells: Cell[] = [[rng.int(0, w - 1), rng.int(0, h - 1)]];
  while (cells.length < n) {
    const free = cells.flatMap(([x, y]) => NEIGHBOURS.map(([dx, dy]) => [x + dx, y + dy] as Cell)).filter(([x, y]) => x >= 0 && y >= 0 && x < w && y < h && !has(cells, x, y));
    cells.push(rng.pick(free));
  }
  return cells;
}

/** A figure with no symmetry at all: each of its eight positions looks different, so a turn or a flip always shows. */
export function lopsided(rng: Rng, n: number, w: number, h: number): Cell[] {
  for (;;) {
    const cells = normalize(polyomino(rng, n, w, h));
    if (new Set(positions(cells)).size === 8) return cells;
  }
}

/** The same number of Kästchen, connected, one moved: this figure does not fit on the original in any position. */
export function changed(rng: Rng, cells: readonly Cell[], w: number, h: number): Cell[] {
  const own = congruenceKey(cells);
  const out: Cell[][] = [];
  for (const moved of cells) {
    const rest = cells.filter((c) => c !== moved);
    if (!isConnected(rest)) continue;
    for (const [x, y] of rest) {
      for (const [dx, dy] of NEIGHBOURS) {
        const c: Cell = [x + dx, y + dy];
        if (has(rest, c[0], c[1]) || (c[0] === moved[0] && c[1] === moved[1])) continue;
        const next = normalize([...rest, c]);
        if (congruenceKey(next) === own) continue;
        if (Math.max(...next.map((p) => p[0])) >= w || Math.max(...next.map((p) => p[1])) >= h) continue;
        out.push(next);
      }
    }
  }
  if (out.length === 0) throw new Error('geometrie: no changed figure');
  return rng.pick(out);
}

const widthOf = (cells: readonly Cell[]) => Math.max(...cells.map((c) => c[0])) + 1;
const heightOf = (cells: readonly Cell[]) => Math.max(...cells.map((c) => c[1])) + 1;

/** A picture of one figure, with one free row and column round it. */
export function figureGrid(cells: readonly Cell[]): VisualOf<'grid'> {
  const n = normalize(cells);
  return { type: 'grid', width: widthOf(n) + 2, height: heightOf(n) + 2, cells: n.map(([x, y]) => [x + 1, y + 1] as Cell), showOutline: true };
}

/** Short enough for the narrowest pair grid (220 units): the grid has no room for a longer line, and clips it. */
const PAIR_CAPTION = 'Linke und rechte Figur';

/** Two figures side by side on one grid, with two free columns between them. */
export function pairGrid(left: readonly Cell[], right: readonly Cell[]): VisualOf<'grid'> {
  const a = normalize(left);
  const b = normalize(right);
  const shift = widthOf(a) + 2;
  return { type: 'grid', width: shift + widthOf(b), height: Math.max(heightOf(a), heightOf(b)), cells: [...a, ...b.map(([x, y]) => [x + shift, y] as Cell)], caption: PAIR_CAPTION, showOutline: true };
}

/** A list of Kästchen for the voice: 'Spalte 2 Zeile 3', counted from 1. */
export const sayCells = (cells: readonly Cell[]) => cells.map(([x, y]) => `Spalte ${x + 1} Zeile ${y + 1}`).join(', ');
/** The two figures of a pair grid for the voice: only their Kästchen, so the child compares them too. 'Gitter' tells srTextWithPicture that the data is here. */
export const sayPair = (left: readonly Cell[], right: readonly Cell[]) => `Zwei Figuren aus Kästchen auf einem Gitter. Linke Figur: ${sayCells(normalize(left))}. Rechte Figur: ${sayCells(normalize(right))}.`;
