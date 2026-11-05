/**
 * Koordinatensystem (docs/research.md §6). Stufe 1: first quadrant, 0 to 10, reading points. Stufe 2: setting points, the fourth corner of a Rechteck. Stufe 3: four quadrants, −6 to 6.
 * The minus key is active for the whole skill, so every field sets signed (§7.1). Reading is a multi answer P( x | y ), setting a point answer that draws its own grid. Every item of Stufe 3 has a negative value.
 */
import { fmt, fmtPoint, toSpeech } from '../../core/format';
import type { Ab, Bug, Exercise, GridPoint, MultiField, PointAnswer, Rng, SkillDef, Stufe, VisualOf } from '../../core/types';
import { build, makeChoice, multiBugs, pointBugs, targetAb } from '../shared';

const SKILL = { id: 'geometrie.koordinaten', topicId: 'geometrie' } as const;
const KMK = ['SF.koordinaten'];

const SWAP = 'Zuerst nach rechts: x. Dann nach oben: y.';
const FROM_ONE = 'Der Ursprung ist 0. Zähle die Schritte ab dem Ursprung.';
const SIGN = 'Links vom Ursprung ist x negativ. Unten ist y negativ.';
const CORNER = 'Geh von A genauso weit wie von B nach C.';
const NAMES = ['P', 'Q', 'A', 'B', 'R', 'S'] as const;

type Grid = Pick<VisualOf<'coordinateGrid'>, 'xMin' | 'xMax' | 'yMin' | 'yMax'>;
const FIRST: Grid = { xMin: 0, xMax: 10, yMin: 0, yMax: 10 };
const FOUR: Grid = { xMin: -6, xMax: 6, yMin: -6, yMax: 6 };

const picture = (grid: Grid, points: GridPoint[], labelStep = 1, rest: Partial<VisualOf<'coordinateGrid'>> = {}): VisualOf<'coordinateGrid'> => ({ type: 'coordinateGrid', ...grid, step: 1, labelStep, axisNames: 'xy', points, ...rest });
const pointAnswer = (grid: Grid, target: readonly [number, number], rest: Partial<PointAnswer> = {}): PointAnswer => ({ kind: 'point', ...grid, step: 1, target, tolerance: 0, axisNames: 'xy', ...rest });

/** The fields of a read point: P( [x] | [y] ). */
const pointFields = (name: string, x: number, y: number): MultiField[] => [
  { id: 'x', value: x, before: `${name}(`, signed: true, label: `x-Wert von ${name}` },
  { id: 'y', value: y, before: '|', after: ')', signed: true, label: `y-Wert von ${name}` },
];

/** The way from the origin in words, with the child's numbers. */
const walk = (x: number, y: number): string[] => [
  x === 0 ? 'Der Punkt liegt auf der y-Achse: x ist 0.' : `Vom Ursprung geht es ${fmt(Math.abs(x))} nach ${x > 0 ? 'rechts' : 'links'}.`,
  y === 0 ? 'Der Punkt liegt auf der x-Achse: y ist 0.' : `Dann geht es ${fmt(Math.abs(y))} nach ${y > 0 ? 'oben' : 'unten'}.`,
];

const away = (v: number) => (v < 0 ? v - 1 : v + 1);
const swapMatch = (x: number, y: number) => ({ x: y, y: x });
const oneMatch = (x: number, y: number) => ({ x: away(x), y: away(y) });
const signMatch = (x: number, y: number) => ({ x: Math.abs(x), y: Math.abs(y) });
const readBugs = (x: number, y: number, fields: MultiField[]): Bug[] => multiBugs([
  { id: 'koord-getauscht', match: swapMatch(x, y), hint: SWAP },
  { id: 'koord-ab-eins', match: oneMatch(x, y), hint: FROM_ONE },
  (x < 0 || y < 0) && { id: 'vorzeichen-vergessen', match: signMatch(x, y), hint: SIGN },
], fields);
const setBugs = (x: number, y: number, answer: PointAnswer): Bug[] => pointBugs([
  { id: 'koord-getauscht', match: swapMatch(x, y), hint: SWAP },
  { id: 'koord-ab-eins', match: oneMatch(x, y), hint: FROM_ONE },
  (x < 0 || y < 0) && { id: 'vorzeichen-vergessen', match: signMatch(x, y), hint: SIGN },
], answer);
/**
 * A point for the voice, as a way from the origin in either order: 'R liegt 2 nach oben und 5 nach rechts'. The picture shows no coordinates either: turning a direction into x or y,
 * into their order and into a sign stays with the child (koord-getauscht and vorzeichen-vergessen, §5).
 */
function spokenWay(rng: Rng, name: string, x: number, y: number): string {
  const across = x === 0 ? 'auf der y-Achse' : `${fmt(Math.abs(x))} nach ${x > 0 ? 'rechts' : 'links'}`;
  const up = y === 0 ? 'auf der x-Achse' : `${fmt(Math.abs(y))} nach ${y > 0 ? 'oben' : 'unten'}`;
  const [first, second] = rng.chance(0.5) ? [across, up] : [up, across];
  return `Vom Ursprung aus liegt ${name} ${first} und ${second}`;
}

/** A point of the first quadrant, off the axes and with different values. */
function freePoint(rng: Rng): [number, number] {
  for (;;) {
    const x = rng.int(1, 9);
    const y = rng.int(1, 9);
    if (x !== y) return [x, y];
  }
}

/** A point of the four quadrants, off the axes, with at least one negative value and different sizes. */
function freeFourPoint(rng: Rng): [number, number] {
  for (;;) {
    const x = rng.pick([-6, -5, -4, -3, -2, -1, 1, 2, 3, 4, 5, 6]);
    const y = rng.pick([-6, -5, -4, -3, -2, -1, 1, 2, 3, 4, 5, 6]);
    if ((x < 0 || y < 0) && Math.abs(x) !== Math.abs(y)) return [x, y];
  }
}

/** Stufe 1, AB I: read one point, every number on the axes. */
function readOne(rng: Rng, ab: Ab): Exercise {
  const [x, y] = freePoint(rng);
  const name = rng.pick(NAMES);
  const fields = pointFields(name, x, y);
  const prompt = `Lies die Koordinaten von ${name} ab.`;
  return build(SKILL, 1, {
    key: `lesen:${name}:${x}.${y}`,
    ab,
    prompt,
    visual: picture(FIRST, [{ x, y, label: name }]),
    answer: { kind: 'multi', fields },
    hints: ['Starte im Ursprung. Geh zuerst nach rechts, dann nach oben.', 'Der erste Wert ist x, der zweite Wert ist y.'],
    steps: [...walk(x, y), `Das ist ${fmtPoint(name, x, y)}.`],
    bugs: readBugs(x, y, fields),
    praise: 'Du hast zuerst nach rechts und dann nach oben gezählt.',
    srText: toSpeech(`Koordinatensystem von 0 bis 10. ${spokenWay(rng, name, x, y)}. ${prompt}`),
    kmk: KMK,
  });
}

/** Stufe 1, AB II: only every second number on the axes, a point on an axis, or the point with these coordinates among others. */
function readHarder(rng: Rng, ab: Ab): Exercise {
  if (rng.chance(0.35)) {
    const [x, y] = freePoint(rng);
    const swapped = { x: y, y: x, label: 'B' };
    const others = [{ x: Math.min(10, x + 2), y, label: 'C' }, { x, y: Math.max(0, y - 1), label: 'D' }];
    const letters = rng.shuffle(['A', 'B', 'C', 'D']);
    const placed = [{ x, y }, swapped, ...others].map((p, i) => ({ x: p.x, y: p.y, label: letters[i] }));
    const prompt = `Welcher Punkt hat den x-Wert ${fmt(x)} und den y-Wert ${fmt(y)}?`;
    return build(SKILL, 1, {
      key: `welcher:${x}.${y}:${letters.join('')}`,
      ab,
      prompt,
      visual: picture(FIRST, placed),
      answer: makeChoice(rng, { label: placed[0].label }, [
        { label: placed[1].label, whyWrong: SWAP },
        { label: placed[2].label, whyWrong: 'Zähle die Schritte nach rechts noch einmal.' },
        { label: placed[3].label, whyWrong: 'Zähle die Schritte nach oben noch einmal.' },
      ], { order: ['A', 'B', 'C', 'D'] }),
      hints: ['Starte im Ursprung. Geh zuerst nach rechts.', 'Geh dann nach oben. Welcher Punkt liegt dort?'],
      steps: [...walk(x, y), `Dort liegt der Punkt ${placed[0].label}.`],
      praise: 'Du hast die Reihenfolge von x und y beachtet.',
      srText: toSpeech(`Koordinatensystem von 0 bis 10 mit vier Punkten. ${placed.map((p) => spokenWay(rng, p.label, p.x, p.y)).join('. ')}. ${prompt}`),
      kmk: KMK,
    });
  }
  const onAxis = rng.chance(0.4);
  const [px, py] = freePoint(rng);
  const axisX = onAxis && rng.chance(0.5);
  const x = axisX ? 0 : px;
  const y = onAxis && !axisX ? 0 : py;
  const name = rng.pick(NAMES);
  const fields = pointFields(name, x, y);
  const prompt = `An den Achsen steht nur jede zweite Zahl. Lies die Koordinaten von ${name} ab.`;
  return build(SKILL, 1, {
    key: `lesen2:${name}:${x}.${y}`,
    ab,
    prompt,
    visual: picture(FIRST, [{ x, y, label: name }], 2),
    answer: { kind: 'multi', fields },
    hints: ['Jede Linie zählt 1, auch ohne Zahl.', onAxis ? 'Der Punkt liegt auf einer Achse. Ein Wert ist 0.' : 'Geh zuerst nach rechts, dann nach oben.'],
    steps: [...walk(x, y), `Das ist ${fmtPoint(name, x, y)}.`],
    bugs: readBugs(x, y, fields),
    praise: 'Du hast auch die Linien ohne Zahl gezählt.',
    srText: toSpeech(`Koordinatensystem von 0 bis 10. An den Achsen steht nur jede zweite Zahl. ${spokenWay(rng, name, x, y)}. Lies die Koordinaten ab.`),
    kmk: KMK,
  });
}

/** A walk from a point: the fields of the end, with the two typical slips. */
function walkTask(stufe: Stufe, ab: Ab, grid: Grid, ax: number, ay: number, dx: number, dy: number, kmk: string[]): Exercise {
  const x = ax + dx;
  const y = ay + dy;
  const start = fmtPoint('A', ax, ay);
  const across = `${fmt(Math.abs(dx))} nach ${dx > 0 ? 'rechts' : 'links'}`;
  const up = `${fmt(Math.abs(dy))} nach ${dy > 0 ? 'oben' : 'unten'}`;
  const prompt = `Von ${start} gehst du ${across} und ${up}. Dort liegt B. Welche Koordinaten hat B?`;
  const fields = pointFields('B', x, y);
  return build(SKILL, stufe, {
    key: `weg:${ax}.${ay}:${dx}.${dy}`,
    ab,
    prompt,
    visual: picture(grid, [{ x: ax, y: ay, label: 'A' }]),
    answer: { kind: 'multi', fields },
    hints: ['Nach rechts oder links ändert sich nur x.', 'Nach oben oder unten ändert sich nur y.'],
    steps: [`x: ${fmt(ax)} ${dx > 0 ? '+' : '−'} ${fmt(Math.abs(dx))} = ${fmt(x)}`, `y: ${fmt(ay)} ${dy > 0 ? '+' : '−'} ${fmt(Math.abs(dy))} = ${fmt(y)}`, `Du landest bei ${fmtPoint('B', x, y)}.`],
    bugs: multiBugs([
      { id: 'weg-getauscht', match: { x: ax + dy, y: ay + dx }, hint: 'Nach rechts ändert sich x. Nach oben ändert sich y.' },
      { id: 'weg-richtung', match: { x: ax - dx, y: ay - dy }, hint: 'Rechts und oben heißt plus. Links und unten heißt minus.' },
    ], fields),
    praise: 'Du hast x und y getrennt verändert.',
    srText: toSpeech(`Koordinatensystem. ${prompt}`),
    kmk,
  });
}

/** Stufe 1, AB III: reversed. Where does a walk from a known point end? */
function walkFirst(rng: Rng, ab: Ab): Exercise {
  const ax = rng.int(1, 5);
  const ay = rng.int(1, 5);
  return walkTask(1, ab, FIRST, ax, ay, rng.int(2, 5), rng.int(1, 5), [...KMK, 'PK.problemloesen']);
}

const TAP_HINTS = ['Starte im Ursprung. Geh zuerst nach rechts, dann nach oben.', 'Der erste Wert ist x, der zweite Wert ist y.'];

/** Stufe 2, AB I: set one point. */
function setOne(rng: Rng, ab: Ab): Exercise {
  const [x, y] = freePoint(rng);
  const name = rng.pick(NAMES);
  const prompt = `Setze ${fmtPoint(name, x, y)}.`;
  const answer = pointAnswer(FIRST, [x, y], { name });
  return build(SKILL, 2, {
    key: `setzen:${name}:${x}.${y}`,
    ab,
    prompt,
    answer,
    hints: TAP_HINTS,
    steps: [...walk(x, y), `Dort liegt ${fmtPoint(name, x, y)}.`],
    bugs: setBugs(x, y, answer),
    praise: 'Du hast zuerst x und dann y gesucht.',
    srText: toSpeech(`Koordinatensystem von 0 bis 10. ${prompt}`),
    kmk: KMK,
  });
}

/** Three corners A, B, C of an axis-parallel Rechteck, with B as the corner between A and C, and the fourth corner D. On four quadrants it spans the axes. */
function straightCorners(rng: Rng, grid: Grid): { a: [number, number]; b: [number, number]; c: [number, number]; d: [number, number] } {
  const four = grid.xMin < 0;
  const [left, right] = four ? [rng.int(-5, -1), rng.int(1, 5)] : [rng.int(1, 4), rng.int(5, 9)];
  const [low, high] = four ? [rng.int(-5, -1), rng.int(1, 5)] : [rng.int(1, 4), rng.int(5, 9)];
  const box: [number, number][] = [[left, low], [right, low], [right, high], [left, high]];
  const start = rng.int(0, 3);
  const at = (i: number) => box[(start + i) % 4];
  return { a: at(0), b: at(1), c: at(2), d: at(3) };
}

const corners = ([ax, ay]: readonly number[], [bx, by]: readonly number[], [cx, cy]: readonly number[]): GridPoint[] => [{ x: ax, y: ay, label: 'A' }, { x: bx, y: by, label: 'B' }, { x: cx, y: cy, label: 'C' }];
const sidesOf = ([a, b, c]: GridPoint[]): [GridPoint, GridPoint][] => [[a, b], [b, c]];

/** The fourth corner on a grid, with its typical slips. */
function cornerTask(stufe: Stufe, ab: Ab, grid: Grid, a: [number, number], b: [number, number], c: [number, number], d: [number, number], kmk: string[], kind: string): Exercise {
  const given = corners(a, b, c);
  const answer = pointAnswer(grid, d, { name: 'D', points: given, segments: sidesOf(given) });
  const prompt = `${fmtPoint('A', ...a)}, ${fmtPoint('B', ...b)} und ${fmtPoint('C', ...c)} sind Ecken eines Rechtecks. Setze die vierte Ecke D.`;
  const way = [c[0] - b[0] !== 0 && `${fmt(Math.abs(c[0] - b[0]))} nach ${c[0] > b[0] ? 'rechts' : 'links'}`, c[1] - b[1] !== 0 && `${fmt(Math.abs(c[1] - b[1]))} nach ${c[1] > b[1] ? 'oben' : 'unten'}`].filter((t): t is string => !!t);
  return build(SKILL, stufe, {
    key: `${kind}:${a.join('.')}:${b.join('.')}:${c.join('.')}`,
    ab,
    prompt,
    answer,
    hints: ['Die Seiten gegenüber sind gleich lang und parallel.', CORNER],
    steps: [`Von B nach C geht es ${way.join(' und ')}.`, 'Geh von A denselben Weg.', `Die vierte Ecke ist ${fmtPoint('D', ...d)}.`],
    bugs: pointBugs([
      { id: 'koord-getauscht', match: swapMatch(d[0], d[1]), hint: SWAP },
      { id: 'ecke-gegenueber', match: { x: a[0] + b[0] - c[0], y: a[1] + b[1] - c[1] }, hint: CORNER },
      { id: 'ecke-gegenueber', match: { x: b[0] + c[0] - a[0], y: b[1] + c[1] - a[1] }, hint: CORNER },
      (d[0] < 0 || d[1] < 0) && { id: 'vorzeichen-vergessen', match: signMatch(d[0], d[1]), hint: SIGN },
    ], answer),
    praise: 'Du hast denselben Weg noch einmal abgezählt.',
    srText: toSpeech(`Koordinatensystem. ${prompt}`),
    kmk,
  });
}

/** Stufe 2, AB II: the fourth corner of an upright Rechteck. */
function cornerStraight(rng: Rng, ab: Ab): Exercise {
  const { a, b, c, d } = straightCorners(rng, FIRST);
  return cornerTask(2, ab, FIRST, a, b, c, d, KMK, 'ecke');
}

/** A turned Rechteck on grid points: from B the sides go by u and by a multiple of u turned by 90°. On four quadrants a corner lies on the negative side, or this is a task of the first quadrant again. */
function tiltedCorners(rng: Rng, grid: Grid): { a: [number, number]; b: [number, number]; c: [number, number]; d: [number, number] } {
  for (;;) {
    const u: [number, number] = [rng.int(1, 3), rng.int(1, 3)];
    const k = rng.int(1, 2);
    const bx = rng.int(grid.xMin + 1, grid.xMax - 1);
    const by = rng.int(grid.yMin + 1, grid.yMax - 1);
    const a: [number, number] = [bx + u[0], by + u[1]];
    const c: [number, number] = [bx - k * u[1], by + k * u[0]];
    const d: [number, number] = [a[0] + c[0] - bx, a[1] + c[1] - by];
    const inside = [a, c, d].every(([x, y]) => x >= grid.xMin && x <= grid.xMax && y >= grid.yMin && y <= grid.yMax);
    const fits = grid.xMin >= 0 || [a, [bx, by], c, d].some(([x, y]) => x < 0 || y < 0);
    if (inside && fits) return { a, b: [bx, by], c, d };
  }
}

/** Both missing corners from two opposite ones. Only sides along the grid make these two the answer: other rectangles with these corners exist, so the task says so. */
function twoCorners(stufe: Stufe, ab: Ab, grid: Grid, a: [number, number], b: [number, number], c: [number, number], d: [number, number], kind: string): Exercise {
  const given: GridPoint[] = [{ x: a[0], y: a[1], label: 'A' }, { x: c[0], y: c[1], label: 'C' }];
  const answer = pointAnswer(grid, b, { targets: [b, d], points: given });
  const prompt = `${fmtPoint('A', ...a)} und ${fmtPoint('C', ...c)} sind Ecken gegenüber in einem Rechteck. Die Seiten laufen entlang der Gitterlinien. Setze die beiden fehlenden Ecken.`;
  return build(SKILL, stufe, {
    key: `${kind}:${a.join('.')}:${c.join('.')}`,
    ab,
    prompt,
    answer,
    hints: ['Jede Seite läuft waagerecht oder senkrecht.', 'Jede fehlende Ecke übernimmt x von einer Ecke und y von der anderen.'],
    steps: ['Die Seiten laufen waagerecht und senkrecht.', `Eine Ecke: x von A, y von C: ${fmtPoint('P', a[0], c[1])}.`, `Andere Ecke: x von C, y von A: ${fmtPoint('Q', c[0], a[1])}.`],
    bugs: pointBugs([{ id: 'koord-getauscht', match: swapMatch(b[0], b[1]), hint: SWAP }, { id: 'ecke-gegenueber', match: { x: Math.round((a[0] + c[0]) / 2), y: Math.round((a[1] + c[1]) / 2) }, hint: 'Die Ecke liegt nicht in der Mitte. Geh waagerecht und senkrecht weiter.' }], answer),
    praise: 'Du hast x und y der beiden Ecken verbunden.',
    srText: toSpeech(`Koordinatensystem. ${prompt}`),
    kmk: [...KMK, 'PK.problemloesen'],
  });
}

/** Stufe 2, AB III: a turned Rechteck, or both missing corners from two opposite ones. */
function cornerHard(rng: Rng, ab: Ab): Exercise {
  if (rng.chance(0.5)) {
    const { a, b, c, d } = tiltedCorners(rng, FIRST);
    return cornerTask(2, ab, FIRST, a, b, c, d, [...KMK, 'PK.problemloesen'], 'schraeg');
  }
  const { a, b, c, d } = straightCorners(rng, FIRST);
  return twoCorners(2, ab, FIRST, a, b, c, d, 'zwei-ecken');
}

const FOUR_HINTS = ['Rechts vom Ursprung ist x positiv, links negativ.', 'Oben ist y positiv, unten negativ.'];

/** Stufe 3, AB I: read a point in one of the four quadrants. */
function readFour(rng: Rng, ab: Ab): Exercise {
  const [x, y] = freeFourPoint(rng);
  const name = rng.pick(NAMES);
  const fields = pointFields(name, x, y);
  const prompt = `Lies die Koordinaten von ${name} ab. Achte auf die Vorzeichen.`;
  return build(SKILL, 3, {
    key: `lesen-vier:${name}:${x}.${y}`,
    ab,
    prompt,
    visual: picture(FOUR, [{ x, y, label: name }]),
    answer: { kind: 'multi', fields },
    hints: FOUR_HINTS,
    steps: [...walk(x, y), `Das ist ${fmtPoint(name, x, y)}.`],
    bugs: readBugs(x, y, fields),
    praise: 'Du hast Richtung und Vorzeichen zusammen beachtet.',
    srText: toSpeech(`Koordinatensystem von minus 6 bis 6. ${spokenWay(rng, name, x, y)}. ${prompt}`),
    kmk: KMK,
  });
}

/** Stufe 3, AB II: the fourth corner, or both missing corners, of an upright Rechteck across the axes. */
function setFour(rng: Rng, ab: Ab): Exercise {
  const { a, b, c, d } = straightCorners(rng, FOUR);
  return rng.chance(0.5) ? cornerTask(3, ab, FOUR, a, b, c, d, KMK, 'ecke-vier') : twoCorners(3, ab, FOUR, a, b, c, d, 'zwei-vier');
}

/** A walk that crosses an axis, in any direction: a walk that stays in one quadrant is a task of Stufe 1 again. */
function walkOverAxes(rng: Rng): [ax: number, ay: number, dx: number, dy: number] {
  for (;;) {
    const ax = rng.int(-5, 5);
    const ay = rng.int(-5, 5);
    const dx = rng.pick([-5, -4, -3, -2, 2, 3, 4, 5]);
    const dy = rng.pick([-6, -5, -4, -3, 3, 4, 5, 6]);
    const inside = Math.abs(ax + dx) <= 6 && Math.abs(ay + dy) <= 6;
    if (inside && (ax * (ax + dx) < 0 || ay * (ay + dy) < 0)) return [ax, ay, dx, dy];
  }
}

/** Stufe 3, AB III: a walk over the axes, or the fourth corner of a turned Rechteck in four quadrants. */
function fourReason(rng: Rng, ab: Ab): Exercise {
  if (rng.chance(0.5)) {
    const [ax, ay, dx, dy] = walkOverAxes(rng);
    return walkTask(3, ab, FOUR, ax, ay, dx, dy, [...KMK, 'PK.problemloesen']);
  }
  const { a, b, c, d } = tiltedCorners(rng, FOUR);
  return cornerTask(3, ab, FOUR, a, b, c, d, [...KMK, 'PK.problemloesen'], 'schraeg-vier');
}

const FORMS: Record<Stufe, Record<Ab, (rng: Rng, ab: Ab) => Exercise>> = {
  1: { 1: readOne, 2: readHarder, 3: walkFirst },
  2: { 1: setOne, 2: cornerStraight, 3: cornerHard },
  3: { 1: readFour, 2: setFour, 3: fourReason },
};

export const koordinatenSkill: SkillDef = {
  ...SKILL,
  title: 'Koordinatensystem',
  description: 'Du liest Punkte ab und trägst sie ein.',
  stufen: {
    1: 'Erster Quadrant von 0 bis 10; Punkte ablesen',
    2: 'Punkte setzen; vierte Ecke eines Rechtecks',
    3: 'Vier Quadranten von −6 bis 6',
  },
  kmk: KMK,
  keys: { minus: true },
  generate(rng, stufe, ctx) {
    const ab = targetAb(rng, stufe, ctx);
    return FORMS[stufe][ab](rng, ab);
  },
};
