/**
 * Spiegeln und Verschieben (docs/research.md §6). Stufe 1: vertical axis. Stufe 2: horizontal or diagonal axis, Symmetrieachsen. Stufe 3: Verschieben and Punktspiegelung with coordinates.
 * The catalogue's 8 by 8 grid: a cells answer stops at 6 by 6 (src/core/testing.ts, the width of a phone), so Kästchen tasks use 6 by 6 and the point tasks the full 8 by 8. Axis has no diagonal, so a diagonal
 * axis is a line on a coordinate grid with a point answer. Letters of the images are plain ones (P and Q): a prime would be read as an extra number.
 */
import { NBSP, fmt, fmtPoint, fmtSigned, toSpeech } from '../../core/format';
import type { Ab, Axis, Bug, Cell, Exercise, GridPoint, NumberAnswer, PointAnswer, Rng, ShapeKind, SkillDef, Step, Stufe } from '../../core/types';
import { build, joinDe, numberBugs, plural, pointBugs, targetAb } from '../shared';
import { polyomino, sayCells } from './helpers';

const SKILL = { id: 'geometrie.spiegeln', topicId: 'geometrie' } as const;
const KMK = ['RF.abbildungen'];

const DISTANCE = 'Original und Bild haben denselben Abstand zur Achse.';
const MIRROR_HINTS = ['Bestimme den Abstand jedes Punktes zur Achse.', 'Geh auf der anderen Seite gleich weit von der Achse weg.'];
const CELL_HINTS = ['Zähle den Abstand jedes Kästchens zur Achse.', DISTANCE];
const GRID = { xMin: 0, xMax: 8, yMin: 0, yMax: 8, step: 1, tolerance: 0, axisNames: 'xy' } as const;
const NAMES = ['A', 'B', 'C'] as const;

const named = (points: readonly (readonly [number, number])[]): GridPoint[] => points.map(([x, y], i) => ({ x, y, label: NAMES[i] }));
const uniquePoints = (points: readonly (readonly [number, number])[]) => new Set(points.map((p) => p.join())).size === points.length;
/** The place of an image in a worked step: the images have no letters of their own. */
const place = (x: number, y: number) => `(${fmt(x)}${NBSP}|${NBSP}${fmt(y)})`;
const listPoints = (points: readonly GridPoint[]) => joinDe(points.map((p) => fmtPoint(p.label ?? 'P', p.x, p.y)));

/** A few Kästchen on the given half of the grid, touching the axis at Stufe 1, the mirror image beyond it. */
function mirrorCells(rng: Rng, axis: Axis, size: number, n: number, touch: boolean): { given: Cell[]; solution: Cell[] } {
  const half = axis.at;
  for (;;) {
    const cells = polyomino(rng, n, half, size);
    if (touch && !cells.some((c) => c[0] === half - 1)) continue;
    const given = axis.orientation === 'vertical' ? cells : cells.map(([x, y]) => [y, x] as Cell);
    const solution = given.map(([x, y]) => (axis.orientation === 'vertical' ? [2 * half - 1 - x, y] : [x, 2 * half - 1 - y]) as Cell);
    return { given, solution };
  }
}

function cellsTask(rng: Rng, stufe: Stufe, ab: Ab, orientation: Axis['orientation'], n: number, touch: boolean): Exercise {
  const axis: Axis = { orientation, at: 3 };
  const size = 6;
  const { given, solution } = mirrorCells(rng, axis, size, n, touch);
  const word = orientation === 'vertical' ? 'senkrechten' : 'waagerechten';
  const prompt = `Spiegle die Figur an der ${word} Achse. Male die Kästchen an.`;
  const done: Step = { text: 'So sieht die Figur mit dem Spiegelbild aus.', visual: { type: 'grid', width: size, height: size, cells: [...given, ...solution], axis, showOutline: false } };
  return build(SKILL, stufe, {
    key: `kaestchen:${orientation}:${[...given].map((c) => c.join('.')).sort().join('_')}`,
    ab,
    prompt,
    answer: { kind: 'cells', width: size, height: size, given, solution, axis },
    hints: CELL_HINTS,
    steps: ['Jedes Kästchen hat ein Bild auf der anderen Seite der Achse.', `Die Figur hat ${fmt(given.length)} Kästchen, das Bild auch.`, done],
    praise: 'Du hast den Abstand zur Achse für jedes Kästchen gezählt.',
    srText: toSpeech(`Gitter mit 6 mal 6 Kästchen. Die ${orientation === 'vertical' ? 'senkrechte Achse liegt zwischen Spalte 3 und 4' : 'waagerechte Achse liegt zwischen Zeile 3 und 4'}. Angemalt: ${sayCells(given)}. ${prompt}`),
    kmk: KMK,
  });
}

/** Distances from the axis that the eye gets wrong: the image on the axis's next line, or twice as far away. */
function mirrorBugs(answer: PointAnswer, points: readonly (readonly [number, number])[], image: (x: number, y: number, factor: number) => [number, number]): Bug[] {
  return pointBugs(points.flatMap(([x, y]): Bug[] => {
    const [hx, hy] = image(x, y, 2);
    const [ox, oy] = image(x, y, 0.5);
    return [{ id: 'spiegel-abstand', match: { x: hx, y: hy }, hint: DISTANCE }, { id: 'spiegel-abstand', match: { x: ox, y: oy }, hint: DISTANCE }];
  }).filter((b) => {
    const m = b.match as { x: number; y: number };
    return Number.isInteger(m.x) && Number.isInteger(m.y);
  }), answer);
}

/** Stufe 1, AB I: Kästchen on a 6 by 6 grid, touching a vertical axis. */
const mirrorStraight = (rng: Rng, ab: Ab) => cellsTask(rng, 1, ab, 'vertical', rng.int(3, 5), true);

/** Stufe 1, AB II: two or three points on the 8 by 8 grid, at any distance from the vertical axis at x = 4. */
function mirrorPoints(rng: Rng, ab: Ab): Exercise {
  const count = rng.int(2, 3);
  let points: [number, number][];
  do points = Array.from({ length: count }, () => [rng.int(0, 3), rng.int(1, 7)] as [number, number]);
  while (!uniquePoints(points));
  const targets = points.map(([x, y]) => [8 - x, y] as const);
  const given = named(points);
  const answer: PointAnswer = { kind: 'point', ...GRID, target: targets[0], targets, points: given, segments: [[{ x: 4, y: 0 }, { x: 4, y: 8 }]] };
  const prompt = `Die Achse ist die senkrechte Linie bei x = 4. Spiegle ${joinDe(given.map((p) => p.label!))}. Setze die Bildpunkte.`;
  return build(SKILL, 1, {
    key: `punkte:${points.map((p) => p.join('.')).join('_')}`,
    ab,
    prompt,
    answer,
    hints: MIRROR_HINTS,
    steps: [...points.slice(0, 3).map(([x, y], i) => `${NAMES[i]} liegt ${fmt(4 - x)} links von der Achse. Das Bild liegt ${fmt(4 - x)} rechts bei ${place(8 - x, y)}.`), 'So hat jedes Bild denselben Abstand zur Achse.'],
    bugs: mirrorBugs(answer, points, (x, y, f) => [4 + (4 - x) * f, y]),
    praise: 'Du hast auf beiden Seiten denselben Abstand genommen.',
    srText: toSpeech(`Koordinatensystem von 0 bis 8. Punkte: ${listPoints(given)}. ${prompt}`),
    kmk: KMK,
  });
}

/** Stufe 1, AB III: reversed. Where does the axis lie, or where was the original? */
function findAxis(rng: Rng, ab: Ab): Exercise {
  const axisX = rng.int(3, 5);
  const k = rng.int(1, 3);
  const y = rng.int(1, 7);
  const px = axisX - k;
  const qx = axisX + k;
  const prompt = `${fmtPoint('Q', qx, y)} ist das Spiegelbild von ${fmtPoint('P', px, y)}. Bei welchem x-Wert liegt die senkrechte Achse?`;
  const answer: NumberAnswer = { kind: 'number', value: axisX, before: 'x =' };
  return build(SKILL, 1, {
    key: `achse:${axisX}:${k}:${y}`,
    ab,
    prompt,
    visual: { type: 'coordinateGrid', xMin: 0, xMax: 8, yMin: 0, yMax: 8, step: 1, labelStep: 1, axisNames: 'xy', points: [{ x: px, y, label: 'P' }, { x: qx, y, label: 'Q' }] },
    answer,
    hints: ['Die Achse liegt genau in der Mitte zwischen P und Q.', 'Zähle die Schritte von P nach Q. Geh die Hälfte davon.'],
    steps: [`Von P nach Q sind es ${fmt(2 * k)} Schritte.`, k === 1 ? 'Die Hälfte ist 1 Schritt.' : `Die Hälfte sind ${fmt(k)} Schritte.`, `${fmt(px)} + ${fmt(k)} = ${fmt(axisX)}`],
    bugs: numberBugs([{ id: 'achse-abstand', match: k, hint: 'Das ist der Abstand zur Achse. Gefragt ist der x-Wert der Achse.' }, { id: 'achse-abstand', match: 2 * k, hint: 'Das ist der Abstand von P nach Q. Die Achse liegt in der Mitte.' }, { id: 'achse-abstand', match: px + qx, hint: 'Die Achse liegt zwischen P und Q. Nimm die Hälfte der Summe.' }], axisX),
    praise: 'Du hast die Mitte zwischen Punkt und Bild gefunden.',
    srText: toSpeech(`Koordinatensystem. ${prompt}`),
    kmk: [...KMK, 'SF.koordinaten', 'PK.argumentieren'],
  });
}

/** Stufe 2, AB I: Kästchen and a horizontal axis, also with a gap to the axis. */
const mirrorHorizontal = (rng: Rng, ab: Ab) => cellsTask(rng, 2, ab, 'horizontal', rng.int(4, 6), rng.chance(0.5));

/** Stufe 2, AB II: a point mirrored at a diagonal: x and y change places. */
function mirrorDiagonal(rng: Rng, ab: Ab): Exercise {
  const rising = rng.chance(0.5);
  const count = rng.int(1, 2);
  let points: [number, number][];
  do points = Array.from({ length: count }, () => [rng.int(1, 7), rng.int(1, 7)] as [number, number]);
  while (!uniquePoints(points) || points.some(([x, y]) => (rising ? x === y : x + y === 8)));
  const image = ([x, y]: readonly [number, number]) => (rising ? [y, x] : [8 - y, 8 - x]) as [number, number];
  const targets = points.map(image);
  const given = named(points);
  const answer: PointAnswer = { kind: 'point', ...GRID, target: targets[0], ...(count > 1 ? { targets } : { name: 'Q' }), points: given, segments: [rising ? [{ x: 0, y: 0 }, { x: 8, y: 8 }] : [{ x: 0, y: 8 }, { x: 8, y: 0 }]] };
  const prompt = `Die Achse ist die schräge Linie durch das Gitter. Spiegle ${joinDe(given.map((p) => p.label!))}. Setze ${count > 1 ? 'die Bildpunkte' : 'den Bildpunkt Q'}.`;
  return build(SKILL, 2, {
    key: `schraeg:${rising ? 'hoch' : 'runter'}:${points.map((p) => p.join('.')).join('_')}`,
    ab,
    prompt,
    answer,
    hints: ['Geh quer zur Achse, im rechten Winkel zur Linie.', 'Geh hinter der Achse gleich weit weiter.'],
    steps: [...points.map((p, i) => `${NAMES[i]} hat das Bild ${place(...image(p))}.`), 'Punkt und Bild liegen gleich weit von der Achse.', 'Die Verbindung steht im rechten Winkel zur Achse.'],
    bugs: pointBugs(points.flatMap(([x, y]): Bug[] => [{ id: 'achse-senkrecht', match: { x: 8 - x, y }, hint: 'Die Achse ist schräg. Geh im rechten Winkel zu dieser Linie.' }, { id: 'achse-senkrecht', match: { x, y: 8 - y }, hint: 'Die Achse ist schräg. Geh im rechten Winkel zu dieser Linie.' }]), answer),
    praise: 'Du hast quer zur schrägen Achse gespiegelt.',
    srText: toSpeech(`Koordinatensystem von 0 bis 8. Punkte: ${listPoints(given)}. Eine schräge Achse läuft ${rising ? 'von links unten nach rechts oben' : 'von links oben nach rechts unten'} durch das Gitter. ${prompt}`),
    kmk: [...KMK, 'SF.koordinaten'],
  });
}

const AXES: readonly { shape: ShapeKind; name: string; count: number; bug?: { id: string; match: number; hint: string } }[] = [
  { shape: 'quadrat', name: 'Quadrat', count: 4, bug: { id: 'achsen-vergessen', match: 2, hint: 'Prüfe auch die Diagonalen. Falte das Quadrat auch an den Ecken.' } },
  { shape: 'rechteck', name: 'Rechteck', count: 2, bug: { id: 'achsen-diagonale', match: 4, hint: 'Falte in Gedanken an der Diagonale. Die Hälften passen nicht aufeinander.' } },
  { shape: 'raute', name: 'Raute', count: 2, bug: { id: 'achsen-diagonale', match: 4, hint: 'Falte in Gedanken durch die Seitenmitten. Die Hälften passen nicht aufeinander.' } },
  { shape: 'parallelogramm', name: 'Parallelogramm', count: 0, bug: { id: 'achsen-diagonale', match: 2, hint: 'Falte in Gedanken an der Diagonale. Die Hälften passen nicht aufeinander.' } },
  { shape: 'gleichseitiges-dreieck', name: 'gleichseitiges Dreieck', count: 3, bug: { id: 'achsen-vergessen', match: 1, hint: 'Jede Ecke hat eine eigene Achse. Prüfe alle Ecken.' } },
  { shape: 'drachen', name: 'Drachenviereck', count: 1, bug: { id: 'achsen-diagonale', match: 2, hint: 'Nur eine Diagonale teilt das Drachenviereck in zwei gleiche Hälften.' } },
  { shape: 'sechseck', name: 'regelmäßiges Sechseck', count: 6, bug: { id: 'achsen-vergessen', match: 3, hint: 'Es gibt Achsen durch die Ecken und durch die Seitenmitten.' } },
];

/** Stufe 2, AB III: reasoning. How many Symmetrieachsen does this figure have? */
function countAxes(rng: Rng, ab: Ab): Exercise {
  const item = rng.pick(AXES);
  const rotate = rng.pick([0, 15, 30, 45, 60]);
  const prompt = 'Wie viele Symmetrieachsen hat diese Figur?';
  return build(SKILL, 2, {
    key: `achsen:${item.shape}:${rotate}`,
    ab,
    prompt,
    visual: { type: 'shape', shape: item.shape, rotate },
    answer: { kind: 'number', value: item.count, label: 'Anzahl der Symmetrieachsen' },
    hints: ['Falte die Figur in Gedanken so, dass beide Hälften aufeinander passen.', 'Prüfe die Mitten der Seiten und die Diagonalen.'],
    steps: [`Die Figur ist ${item.shape === 'raute' ? 'eine' : 'ein'} ${item.name}.`, item.count === 0 ? 'Keine Faltung passt genau.' : `Die Hälften passen bei ${fmt(item.count)} ${plural(item.count, 'Faltung', 'Faltungen')} genau aufeinander.`, `Die Figur hat ${fmt(item.count)} ${plural(item.count, 'Symmetrieachse', 'Symmetrieachsen')}.`],
    bugs: item.bug ? numberBugs([item.bug], item.count) : [],
    praise: 'Du hast jede mögliche Faltung geprüft.',
    srText: toSpeech(`${item.shape === 'raute' ? 'Eine' : 'Ein'} ${item.name}. ${prompt}`),
    kmk: [...KMK, 'PK.argumentieren'],
  });
}

/** Stufe 3, AB I: Verschieben of a drawn Dreieck in any direction. The coordinates come from the grid. */
function translate(rng: Rng, ab: Ab): Exercise {
  const dx = rng.pick([-5, -4, -3, -2, 2, 3, 4, 5]);
  const dy = rng.pick([-4, -3, -2, -1, 1, 2, 3, 4]);
  const onGrid = (d: number) => rng.int(Math.max(0, -d), Math.min(10, 10 - d));
  let points: [number, number][];
  let area: number;
  do {
    points = [0, 1, 2].map(() => [onGrid(dx), onGrid(dy)] as [number, number]);
    const [[ax, ay], [bx, by], [cx, cy]] = points;
    area = Math.abs((bx - ax) * (cy - ay) - (cx - ax) * (by - ay));
  } while (area < 4);
  const given = named(points);
  const targets = points.map(([x, y]) => [x + dx, y + dy] as const);
  const answer: PointAnswer = { kind: 'point', xMin: 0, xMax: 10, yMin: 0, yMax: 10, step: 1, tolerance: 0, axisNames: 'xy', target: targets[0], targets, points: given, segments: [[given[0], given[1]], [given[1], given[2]], [given[2], given[0]]] };
  const way = `${fmt(Math.abs(dx))} nach ${dx > 0 ? 'rechts' : 'links'} und ${fmt(Math.abs(dy))} nach ${dy > 0 ? 'oben' : 'unten'}`;
  const prompt = `Verschiebe das Dreieck ABC um ${way}. Setze die drei Bildpunkte.`;
  return build(SKILL, 3, {
    key: `verschieben:${points.map((p) => p.join('.')).join('_')}:${dx}.${dy}`,
    ab,
    prompt,
    answer,
    hints: ['Lies zuerst die Koordinaten von A, B und C ab.', 'Rechts und oben heißt plus. Links und unten heißt minus.'],
    steps: [`Jeder Punkt geht ${way}.`, ...given.map((p, i) => `${p.label} hat das Bild ${place(...targets[i])}.`)],
    bugs: pointBugs(points.flatMap(([x, y]): Bug[] => [
      { id: 'verschieben-richtung', match: { x: x + dx, y: y - dy }, hint: 'Prüfe die Richtung: Oben heißt plus, unten heißt minus.' },
      { id: 'verschieben-richtung', match: { x: x - dx, y: y + dy }, hint: 'Prüfe die Richtung: Rechts heißt plus, links heißt minus.' },
      { id: 'verschieben-getauscht', match: { x: x + dy, y: y + dx }, hint: 'Die erste Zahl gehört zu rechts oder links, die zweite zu oben oder unten.' },
    ]), answer),
    praise: 'Du hast x und y getrennt verschoben.',
    srText: toSpeech(`Koordinatensystem von 0 bis 10. Punkte: ${listPoints(given)}. ${prompt}`),
    kmk: [...KMK, 'SF.koordinaten'],
  });
}

/** Stufe 3, AB II: Punktspiegelung at a point Z, also over the axes. */
function pointMirror(rng: Rng, ab: Ab): Exercise {
  let x: number;
  let y: number;
  let zx: number;
  let zy: number;
  do {
    x = rng.int(-6, 6);
    y = rng.int(-6, 6);
    zx = rng.int(-3, 3);
    zy = rng.int(-3, 3);
  } while ((x === zx && y === zy) || Math.abs(2 * zx - x) > 6 || Math.abs(2 * zy - y) > 6 || x === zx || y === zy);
  const target = [2 * zx - x, 2 * zy - y] as const;
  const answer: PointAnswer = { kind: 'point', xMin: -6, xMax: 6, yMin: -6, yMax: 6, step: 1, tolerance: 0, axisNames: 'xy', target, name: 'Q', points: [{ x, y, label: 'P' }, { x: zx, y: zy, label: 'Z' }] };
  const prompt = `Spiegle ${fmtPoint('P', x, y)} an ${fmtPoint('Z', zx, zy)}. Setze den Bildpunkt Q.`;
  return build(SKILL, 3, {
    key: `punkt:${x}.${y}:${zx}.${zy}`,
    ab,
    prompt,
    answer,
    hints: ['Geh von P gerade durch Z.', 'Hinter Z geht es gleich weit weiter.'],
    steps: [`Von P nach Z: ${fmt(zx - x)} in x-Richtung, ${fmt(zy - y)} in y-Richtung.`, 'Geh von Z denselben Weg weiter.', `Der Bildpunkt ist ${fmtPoint('Q', target[0], target[1])}.`],
    bugs: pointBugs([
      { id: 'punkt-nur-eine-achse', match: { x: target[0], y }, hint: 'Bei der Punktspiegelung ändern sich beide Werte. Prüfe auch y.' },
      { id: 'punkt-nur-eine-achse', match: { x, y: target[1] }, hint: 'Bei der Punktspiegelung ändern sich beide Werte. Prüfe auch x.' },
      { id: 'spiegel-abstand', match: { x: zx + (zx - x) * 2, y: zy + (zy - y) * 2 }, hint: 'P und das Bild haben denselben Abstand zu Z.' },
    ], answer),
    praise: 'Du hast den Weg von P nach Z verdoppelt.',
    srText: toSpeech(`Koordinatensystem von minus 6 bis 6. ${prompt}`),
    kmk: [...KMK, 'SF.koordinaten'],
  });
}

/** Stufe 3, AB III: reversed. The same shift for another point, or the centre of a Punktspiegelung. */
function coordinatesReason(rng: Rng, ab: Ab): Exercise {
  if (rng.chance(0.5)) {
    let x: number, y: number, dx: number, dy: number, rx: number, ry: number;
    do {
      x = rng.int(-5, 4);
      y = rng.int(-5, 4);
      dx = rng.pick([-4, -3, -2, 2, 3, 4]);
      dy = rng.pick([-4, -3, -2, 2, 3, 4]);
      rx = rng.int(-5, 5);
      ry = rng.int(-5, 5);
    } while (Math.abs(x + dx) > 6 || Math.abs(y + dy) > 6 || Math.abs(rx + dx) > 6 || Math.abs(ry + dy) > 6 || (rx === x && ry === y) || (rx === x + dx && ry === y + dy));
    const target = [rx + dx, ry + dy] as const;
    const answer: PointAnswer = { kind: 'point', xMin: -6, xMax: 6, yMin: -6, yMax: 6, step: 1, tolerance: 0, axisNames: 'xy', target, name: 'S', points: [{ x, y, label: 'P' }, { x: x + dx, y: y + dy, label: 'Q' }, { x: rx, y: ry, label: 'R' }] };
    const prompt = `Eine Verschiebung bringt ${fmtPoint('P', x, y)} nach ${fmtPoint('Q', x + dx, y + dy)}. Dieselbe Verschiebung bringt ${fmtPoint('R', rx, ry)} nach S. Setze S.`;
    return build(SKILL, 3, {
      key: `gleich:${x}.${y}:${dx}.${dy}:${rx}.${ry}`,
      ab,
      prompt,
      answer,
      hints: ['Lies den Weg von P nach Q ab.', 'Geh denselben Weg von R aus.'],
      steps: [`Von P nach Q: ${fmt(dx)} in x-Richtung, ${fmt(dy)} in y-Richtung.`, `x: ${fmt(rx)} + ${fmtSigned(dx)} = ${fmt(target[0])}`, `y: ${fmt(ry)} + ${fmtSigned(dy)} = ${fmt(target[1])}`, `Das ist ${fmtPoint('S', target[0], target[1])}.`],
      bugs: pointBugs([
        { id: 'verschieben-richtung', match: { x: rx - dx, y: ry - dy }, hint: 'Der Weg geht von P nach Q, nicht zurück.' },
        { id: 'verschieben-getauscht', match: { x: rx + dy, y: ry + dx }, hint: 'Der x-Weg bleibt x, der y-Weg bleibt y.' },
      ], answer),
      praise: 'Du hast den Weg auf einen neuen Punkt übertragen.',
      srText: toSpeech(`Koordinatensystem von minus 6 bis 6. ${prompt}`),
      kmk: [...KMK, 'SF.koordinaten', 'PK.problemloesen'],
    });
  }
  let x: number, y: number, zx: number, zy: number;
  do {
    zx = rng.int(-3, 3);
    zy = rng.int(-3, 3);
    x = rng.int(-6, 6);
    y = rng.int(-6, 6);
  } while (Math.abs(2 * zx - x) > 6 || Math.abs(2 * zy - y) > 6 || x === zx || y === zy);
  const qx = 2 * zx - x;
  const qy = 2 * zy - y;
  const answer: PointAnswer = { kind: 'point', xMin: -6, xMax: 6, yMin: -6, yMax: 6, step: 1, tolerance: 0, axisNames: 'xy', target: [zx, zy], name: 'Z', points: [{ x, y, label: 'P' }, { x: qx, y: qy, label: 'Q' }] };
  const prompt = `${fmtPoint('Q', qx, qy)} ist das Bild von ${fmtPoint('P', x, y)} bei einer Punktspiegelung. Setze das Zentrum Z.`;
  return build(SKILL, 3, {
    key: `zentrum:${x}.${y}:${zx}.${zy}`,
    ab,
    prompt,
    answer,
    hints: ['Das Zentrum liegt genau in der Mitte zwischen P und Q.', 'Geh von P aus den halben Weg nach Q.'],
    steps: [`Von P nach Q: ${fmt(qx - x)} in x-Richtung, ${fmt(qy - y)} in y-Richtung.`, 'Geh von P die Hälfte dieses Wegs.', `Das Zentrum ist ${fmtPoint('Z', zx, zy)}.`],
    bugs: pointBugs([{ id: 'zentrum-summe', match: { x: x + qx, y: y + qy }, hint: 'Das ist die Summe der Werte. Nimm jeweils die Hälfte davon.' }, { id: 'zentrum-summe', match: { x: qx - x, y: qy - y }, hint: 'Das ist der ganze Weg von P nach Q. Nimm nur die Hälfte.' }], answer),
    praise: 'Du hast die Mitte zwischen Punkt und Bild gefunden.',
    srText: toSpeech(`Koordinatensystem von minus 6 bis 6. ${prompt}`),
    kmk: [...KMK, 'SF.koordinaten', 'PK.problemloesen'],
  });
}

const FORMS: Record<Stufe, Record<Ab, (rng: Rng, ab: Ab) => Exercise>> = {
  1: { 1: mirrorStraight, 2: mirrorPoints, 3: findAxis },
  2: { 1: mirrorHorizontal, 2: mirrorDiagonal, 3: countAxes },
  3: { 1: translate, 2: pointMirror, 3: coordinatesReason },
};

export const spiegelnSkill: SkillDef = {
  ...SKILL,
  title: 'Spiegeln und Verschieben',
  description: 'Du spiegelst und verschiebst Figuren.',
  stufen: {
    1: 'Senkrechte Achse auf einem Gitter',
    2: 'Waagerechte oder schräge Achse; Symmetrieachsen zählen',
    3: 'Verschieben und Punktspiegelung mit Koordinaten',
  },
  kmk: KMK,
  generate(rng, stufe, ctx) {
    const ab = targetAb(rng, stufe, ctx);
    return FORMS[stufe][ab](rng, ab);
  },
};
