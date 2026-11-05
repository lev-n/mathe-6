/**
 * Würfel and Quader nets of the topic 'flaechen'. fold() rolls a die over the cells, so which faces meet is computed, never written down by hand.
 * nets.test.ts checks NETS and NOT_NETS. quaderNet() lays a Quader out as a flat band of four faces with one flap on each side, drawn to scale.
 */
import type { Cell, NetRect, Rng, VisualOf } from '../../core/types';

const fromRows = (rows: readonly string[]): Cell[] => rows.flatMap((row, y) => [...row].flatMap((c, x): Cell[] => (c === 'X' ? [[x, y]] : [])));

/** The 11 cube nets. */
export const NETS: readonly Cell[][] = ([
  ['X...', 'XXXX', 'X...'], ['X...', 'XXXX', '.X..'], ['X...', 'XXXX', '..X.'], ['X...', 'XXXX', '...X'],
  ['.X..', 'XXXX', '.X..'], ['.X..', 'XXXX', '..X.'],
  ['XX..', '.XXX', '.X..'], ['XX..', '.XXX', '..X.'], ['XX..', '.XXX', '...X'],
  ['XX..', '.XX.', '..XX'],
  ['XXX..', '..XXX'],
] as const).map(fromRows);

/** Hexominoes that fold onto themselves. The strip of six is left out: it is too long for a phone and tells too little. */
export const NOT_NETS: readonly Cell[][] = ([
  ['XX', 'XX', 'XX'], ['X..', 'XXX', '.XX'], ['XX.', 'XXX', '.X.'], ['X..', 'XXX', 'XX.'], ['X.', 'XX', 'XX', 'X.'],
  ['X..', 'X..', 'XX.', '.XX'], ['X.', 'XX', '.X', 'XX'], ['X..', 'X..', 'XXX', '.X.'], ['XX.', '.XX', 'XX.'], ['X..', 'XXX', 'X.X'],
  ['X.', 'XX', 'X.', 'XX'], ['X..', 'X.X', 'XXX'], ['X..', 'X..', 'XXX', '..X'], ['XX', 'X.', 'X.', 'XX'], ['X..', 'X..', 'X..', 'XXX'],
  ['X..', 'X..', 'XXX', 'X..'], ['X.', 'X.', 'XX', 'X.', 'X.'], ['X.', 'X.', 'X.', 'XX', 'X.'],
] as const).map(fromRows);

const key = (c: Cell) => `${c[0]},${c[1]}`;

/** Cells moved to the top left corner, sorted by row. */
export function normalise(cells: readonly Cell[]): Cell[] {
  const mx = Math.min(...cells.map((c) => c[0]));
  const my = Math.min(...cells.map((c) => c[1]));
  return cells.map(([x, y]): Cell => [x - mx, y - my]).sort((a, b) => a[1] - b[1] || a[0] - b[0]);
}

const TURNS: readonly ((c: Cell) => Cell)[] = [
  ([x, y]) => [x, y], ([x, y]) => [-x, y], ([x, y]) => [x, -y], ([x, y]) => [-x, -y],
  ([x, y]) => [y, x], ([x, y]) => [-y, x], ([x, y]) => [y, -x], ([x, y]) => [-y, -x],
];

/** The distinct turned and mirrored forms of a figure. */
export function orientations(cells: readonly Cell[]): Cell[][] {
  const seen = new Map<string, Cell[]>();
  for (const turn of TURNS) {
    const form = normalise(cells.map(turn));
    seen.set(form.map(key).join(';'), form);
  }
  return [...seen.values()];
}

/** A form of a figure that fits a phone: at most 4 cells wide (68 px each). */
export function pickForm(rng: Rng, cells: readonly Cell[]): Cell[] {
  const forms = orientations(cells);
  const narrow = forms.filter((f) => Math.max(...f.map((c) => c[0])) < 4);
  return rng.pick(narrow.length ? narrow : forms);
}

export const cellsKey = (cells: readonly Cell[]) => cells.map((c) => c.join('')).join('.');

/** Faces of a die: 0–1, 2–3 and 4–5 lie opposite each other. */
export const oppositeFace = (face: number) => face ^ 1;

interface Die { down: number; up: number; north: number; south: number; east: number; west: number }

const ROLLS: readonly [dx: number, dy: number, roll: (d: Die) => Die][] = [
  [1, 0, (d) => ({ ...d, down: d.east, east: d.up, up: d.west, west: d.down })],
  [-1, 0, (d) => ({ ...d, down: d.west, west: d.up, up: d.east, east: d.down })],
  [0, 1, (d) => ({ ...d, down: d.south, south: d.up, up: d.north, north: d.down })],
  [0, -1, (d) => ({ ...d, down: d.north, north: d.up, up: d.south, south: d.down })],
];

/** The face of the cube each cell becomes, in the order of `cells`; null if two cells land on the same face, so it is no cube net. */
export function fold(cells: readonly Cell[]): number[] | null {
  const inside = new Set(cells.map(key));
  const found = new Map<string, Die>([[key(cells[0]), { down: 0, up: 1, north: 2, south: 3, east: 4, west: 5 }]]);
  const queue: Cell[] = [cells[0]];
  while (queue.length) {
    const c = queue.shift()!;
    for (const [dx, dy, roll] of ROLLS) {
      const next: Cell = [c[0] + dx, c[1] + dy];
      if (!inside.has(key(next)) || found.has(key(next))) continue;
      found.set(key(next), roll(found.get(key(c))!));
      queue.push(next);
    }
  }
  const faces = cells.map((c) => found.get(key(c))?.down ?? -1);
  return new Set(faces).size === 6 && !faces.includes(-1) ? faces : null;
}

// ─── Quader nets with rectangular faces ─────────────────────────────────────

/** Labels of a net, all on outer sides with room beside them: a narrow face could not hold a width of its own. mark: the face of the net that shows a '?'. */
export interface NetLabels {
  topWidth?: string;
  topHeight?: string;
  leftHeight?: string;
  mark?: 'bottom' | 'back' | 'right';
}

/** How the two flaps hang on the band of four faces. 'gleiche-seite' does not fold: both flaps end on the same side. 'zu-lang' does not fold either: one flap has a side too long. */
export type NetLayout = 'kreuz' | 'versetzt' | 'gleiche-seite' | 'zu-lang';

/** Most units of a net, across and down (src/ui/visuals/NetVisual.tsx adds a margin of 44 px, and a unit is 28 px). */
export const NET_MAX_W = 11.5;
export const NET_MAX_H = 6.7;

/**
 * a = width, b = depth, c = height. The band runs left, front, right, back, c high, with a flap a wide and b high above and below the front. Faces are drawn to scale. The band lies flat, as
 * worksheet.css caps a picture at 55 mm (208 px): at NET_MAX_H a net of 276 px keeps its 16 px labels at 12 px there, and at NET_MAX_W it keeps 75 % of its width on a phone.
 */
export function quaderNet(a: number, b: number, c: number, labels: NetLabels = {}, layout: NetLayout = 'kreuz'): VisualOf<'net'> {
  const longer = Math.max(1, Math.round(b / 2));
  const s = Math.min(1.5, NET_MAX_W / (2 * a + 2 * b), NET_MAX_H / (c + 2 * b + longer));
  const unit = (n: number) => Math.round(n * s * 100) / 100;
  const rect = (x: number, y: number, w: number, h: number, extra: Partial<NetRect> = {}): NetRect => ({ x: unit(x), y: unit(y), w: unit(w), h: unit(h), ...extra });
  const strings = (entries: Record<string, string | undefined>) => Object.fromEntries(Object.entries(entries).filter(([, v]) => v !== undefined)) as Partial<NetRect>;
  const asked = (face: NetLabels['mark']): Partial<NetRect> => (labels.mark === face ? { label: '?' } : {});
  const lastFlap = {
    kreuz: rect(b, b + c, a, b, asked('bottom')),
    versetzt: rect(a + 2 * b, b + c, a, b, asked('bottom')),
    'gleiche-seite': rect(a + 2 * b, 0, a, b, asked('bottom')),
    'zu-lang': rect(b, b + c, a, b + longer, asked('bottom')),
  }[layout];
  return {
    type: 'net',
    rects: [
      rect(0, b, b, c, strings({ heightLabel: labels.leftHeight })),
      rect(b, b, a, c),
      rect(a + b, b, b, c, asked('right')),
      rect(a + 2 * b, b, a, c, asked('back')),
      rect(b, 0, a, b, strings({ widthLabel: labels.topWidth, heightLabel: labels.topHeight })),
      lastFlap,
    ],
  };
}

const PLACES_IN_ROW = ['ersten', 'zweiten', 'dritten', 'vierten'] as const;

/** What a net states about one face. */
function netFaceWords(r: NetRect): string {
  const said = [r.widthLabel && `${r.widthLabel} breit`, r.heightLabel && `${r.heightLabel} hoch`].filter(Boolean);
  const mark = r.label === '?' ? ['mit dem Fragezeichen'] : [];
  const text = [...said, ...mark].join(', ');
  return text ? `: ${text.replace('?', 'Fragezeichen')}` : '';
}

/**
 * A Quader net in words, face by face. netRectsLabel() in src/ui/visuals/NetVisual.tsx lists the faces without their places, so that two nets of the same Quader read alike: this tells them
 * apart. It repeats every number of that label, so that srTextWithPicture() does not add it.
 */
export function netWords(rects: readonly NetRect[]): string {
  const rowY = rects[0].y;
  const row = rects.filter((r) => r.y === rowY).sort((p, q) => p.x - q.x);
  const flaps = rects.filter((r) => r.y !== rowY);
  const parts = [`Netz aus ${rects.length} rechteckigen Flächen. In einer Reihe liegen ${row.length} Flächen nebeneinander.`];
  row.forEach((r, i) => {
    const said = netFaceWords(r);
    if (said) parts.push(`Die Fläche an der ${PLACES_IN_ROW[i]} Stelle der Reihe${said}.`);
  });
  for (const flap of flaps) {
    const below = row.findIndex((r) => Math.abs(r.x - flap.x) < 0.02);
    parts.push(`${flap.y < rowY ? 'Über' : 'Unter'} der ${PLACES_IN_ROW[below]} Fläche liegt eine Fläche${netFaceWords(flap)}.`);
  }
  const [first, second] = flaps;
  if (first && second && Math.abs(first.h - second.h) > 0.02) parts.push('Die zwei Flächen außerhalb der Reihe sind verschieden hoch.');
  return parts.join(' ');
}
