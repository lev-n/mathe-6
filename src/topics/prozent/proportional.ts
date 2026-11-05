/**
 * Proportional oder nicht? (docs/research.md §6)
 * Stufe 1: complete a doubling table. Stufe 2: decide from a table or a graph in the first quadrant. Stufe 3: find the Faktor, traps like age and height.
 */
import { fmt, fmtPoint, MINUS } from '../../core/format';
import type { Ab, ChoiceAnswer, GridPoint, MultiField, Rng, SkillDef, Visual } from '../../core/types';
import { makeChoice, multiBugs, pickPerson } from '../shared';
import { amount, drawUntil, fitBugs, fromForms, placesOf, quantity, r3, type Form } from './helpers';

const KMK = ['SF.dreisatz', 'PK.argumentieren'];

/** Bug values a child would type have at most two places (fitBugs). */
const DECIMALS = 2;

/** The two columns of a table. */
interface Columns {
  id: string;
  x: string;
  sg: string;
  y: string;
  unit: string;
  /** The most for one row of 1: a Heft costs no 25 €. */
  most: number;
}

const COLUMNS: readonly Columns[] = [
  { id: 'hefte', x: 'Hefte', sg: 'Heft', y: 'Preis', unit: '€', most: 6 },
  { id: 'stunden', x: 'Stunden', sg: 'Stunde', y: 'Strecke', unit: 'km', most: 25 },
  { id: 'kisten', x: 'Kisten', sg: 'Kiste', y: 'Gewicht', unit: 'kg', most: 25 },
  { id: 'minuten', x: 'Minuten', sg: 'Minute', y: 'Wasser', unit: 'l', most: 25 },
];

const table = (c: Columns, rows: [string, string][], arrows?: Extract<Visual, { type: 'table' }>['arrows']): Visual => ({
  type: 'table',
  header: [c.x, c.y],
  rows,
  ...(arrows ? { arrows } : {}),
});

const YES = 'Ja, proportional';
const NO = 'Nein, nicht proportional';
const CHECK = 'Prüfe zuerst: Wächst beides im gleichen Verhältnis?';

/** The answer "proportional or not", in a fixed order. */
function yesNo(rng: Rng, proportional: boolean, why: string): ChoiceAnswer {
  return makeChoice(rng, { label: proportional ? YES : NO }, [{ label: proportional ? NO : YES, whyWrong: why }], { order: [YES, NO] });
}

// ─── Stufe 1: Verdoppeln ──────────────────────────────────────────────────────

/**
 * The arrows of a doubling table: one to every other pair of rows, as two arrows on one side must not share a row (src/ui/visuals/TableVisual.tsx), and arrows on both sides make the table wider than a phone.
 * The task says that every row doubles.
 */
const doubleArrows = (rows: number) => Array.from({ length: rows - 1 }, (_, i) => ({ from: i, to: i + 1, label: '· 2' })).filter((_, i) => i % 2 === 0);

const DOUBLE_HINTS = ['Schau auf die linke Spalte: Von Zeile zu Zeile mal 2.', 'Rechne in der rechten Spalte genauso.'];

const doubling = (draw: (rng: Rng) => { x0: number; y0: number }, tag: string): Form => (rng) => {
  const c = rng.pick(COLUMNS);
  // no answer stands in the left column already: 9 | 9 km gives 36 and 72, and 1 | 2 € gives 8
  const { x0, y0 } = drawUntil(() => draw(rng), (d) => d.y0 / d.x0 <= c.most && ![4 * d.y0, 8 * d.y0].some((y) => [d.x0, 2 * d.x0, 4 * d.x0, 8 * d.x0].includes(y)));
  const rows: number[] = [x0, 2 * x0, 4 * x0, 8 * x0];
  const [y1, y2, y3] = [2 * y0, 4 * y0, 8 * y0];
  const fields: MultiField[] = [
    { id: 'a', before: `${rows[2]} ${c.x}:`, after: c.unit, value: r3(y2), decimals: placesOf(c.unit) },
    { id: 'b', before: `${rows[3]} ${c.x}:`, after: c.unit, value: r3(y3), decimals: placesOf(c.unit) },
  ];
  return {
    key: `${tag}:${c.id}:${x0}:${y0}`,
    prompt: 'Die linke Spalte verdoppelt sich. Die rechte Spalte auch. Ergänze die Tabelle.',
    visual: table(c, [[`${rows[0]}`, amount(y0, c.unit)], [`${rows[1]}`, amount(r3(y1), c.unit)], [`${rows[2]}`, '□'], [`${rows[3]}`, '□']], doubleArrows(4)),
    answer: { kind: 'multi', fields },
    hints: DOUBLE_HINTS,
    steps: [`${rows[2]} ${c.x}: 2 · ${amount(r3(y1), c.unit)} = ${amount(r3(y2), c.unit)}`, `${rows[3]} ${c.x}: 2 · ${amount(r3(y2), c.unit)} = ${amount(r3(y3), c.unit)}`, `Es sind ${amount(r3(y2), c.unit)} und ${amount(r3(y3), c.unit)}.`],
    bugs: multiBugs([
      { id: 'additiv-statt-multiplikativ', match: { a: r3(3 * y0), b: r3(4 * y0) }, hint: 'Du hast immer gleich viel addiert. Verdopple die Werte.' },
      { id: 'links-abgeschrieben', match: { a: rows[2], b: rows[3] }, hint: 'Das sind die Zahlen der linken Spalte. Rechne rechts weiter.' },
    ], fields),
    praise: 'Du hast beide Spalten mit demselben Faktor verändert.',
  };
};

const doubleBack: Form = (rng) => {
  const c = rng.pick(COLUMNS);
  const x0 = rng.int(2, 7);
  // no answer stands in the right column already
  const y0 = drawUntil(() => rng.int(2, 15) * 2, (y) => y / x0 <= c.most && ![2 * x0, 4 * x0].some((x) => [y, 2 * y, 4 * y].includes(x)) && y !== x0);
  const fields: MultiField[] = [
    { id: 'a', before: `${amount(2 * y0, c.unit)}:`, after: c.x, value: 2 * x0, decimals: placesOf(c.x) },
    { id: 'b', before: `${amount(4 * y0, c.unit)}:`, after: c.x, value: 4 * x0, decimals: placesOf(c.x) },
  ];
  return {
    key: `zurueck:${c.id}:${x0}:${y0}`,
    prompt: 'Die rechte Spalte verdoppelt sich. Wie heißen die Zahlen in der linken Spalte?',
    visual: table(c, [[`${x0}`, amount(y0, c.unit)], ['□', amount(2 * y0, c.unit)], ['□', amount(4 * y0, c.unit)]], doubleArrows(3)),
    answer: { kind: 'multi', fields },
    hints: ['Die rechte Spalte verdoppelt sich.', 'Rechne in der linken Spalte genauso.'],
    steps: [`Erste Lücke: 2 · ${x0} = ${2 * x0}`, `Zweite Lücke: 2 · ${2 * x0} = ${4 * x0}`, `Es sind ${2 * x0} und ${4 * x0} ${c.x}.`],
    bugs: multiBugs([{ id: 'additiv-statt-multiplikativ', match: { a: x0 + y0, b: x0 + 3 * y0 }, hint: 'Du hast addiert. Verdopple auch links.' }], fields),
    praise: 'Du hast von rechts nach links gedacht.',
  };
};

// ─── Stufe 2: Tabelle oder Graph ──────────────────────────────────────────────

/** Rows with x and 2x, so that the doubling can be read off. Not proportional: a fixed amount on top. */
function ratioRows(rng: Rng, proportional: boolean): { c: Columns; xs: number[]; ys: number[]; base: number } {
  const c = rng.pick(COLUMNS);
  const x1 = rng.int(1, 3);
  const xs = [x1, 2 * x1, 3 * x1, 4 * x1];
  const k = rng.int(2, 6);
  const base = proportional ? 0 : rng.int(1, 5);
  return { c, xs, ys: xs.map((x) => k * x + base), base };
}

const rowsOf = (xs: number[], ys: number[], unit: string): [string, string][] => xs.map((x, i) => [`${x}`, amount(ys[i], unit)]);

const tableDecide: Form = (rng) => {
  const proportional = rng.chance(0.5);
  const { c, xs, ys, base } = ratioRows(rng, proportional);
  return {
    key: `tabelle:${c.id}:${xs[0]}:${ys[0]}:${base}`,
    prompt: 'Ist diese Zuordnung proportional?',
    visual: table(c, rowsOf(xs, ys, c.unit)),
    answer: yesNo(rng, proportional, 'Vergleiche zwei Zeilen: Doppelt so viel links, doppelt so viel rechts?'),
    hints: ['Suche zwei Zeilen: links das Doppelte.', 'Steht rechts dann auch das Doppelte?'],
    steps: [`Links: ${xs[0]} und ${xs[1]}, also das Doppelte.`, `Rechts: ${amount(ys[0], c.unit)} und ${amount(ys[1], c.unit)}.`, proportional ? 'Rechts steht auch das Doppelte: proportional.' : 'Rechts steht nicht das Doppelte: nicht proportional.'],
    praise: 'Du hast das Doppelte links und rechts verglichen.',
  };
};

const graphDecide: Form = (rng) => {
  const kind = rng.pick(['gerade', 'versetzt', 'knick'] as const);
  const k = rng.pick([1, 2]);
  const c = rng.int(1, 3);
  const points: GridPoint[] = kind === 'gerade'
    ? [{ x: 0, y: 0 }, { x: 2, y: 2 * k }, { x: 4, y: 4 * k }]
    : kind === 'versetzt'
      ? [{ x: 0, y: c }, { x: 2, y: 2 * k + c }, { x: 4, y: 4 * k + c }]
      : [{ x: 0, y: 0 }, { x: 2, y: 2 * k + 2 }, { x: 4, y: 2 * k + 3 }];
  const proportional = kind === 'gerade';
  const segments = points.slice(1).map((p, i): [GridPoint, GridPoint] => [points[i], p]);
  const said = kind === 'gerade' ? 'Die Linie ist eine Gerade durch den Ursprung: proportional.' : kind === 'versetzt' ? `Die Linie beginnt bei ${c}, nicht im Ursprung: nicht proportional.` : 'Die Linie hat einen Knick: nicht proportional.';
  return {
    key: `graph:${kind}:${k}:${kind === 'versetzt' ? c : 0}`,
    prompt: 'Der Graph zeigt eine Zuordnung. Ist diese Zuordnung proportional?',
    visual: { type: 'coordinateGrid', xMin: 0, xMax: 6, yMin: 0, yMax: 12, step: 1, labelStep: 2, points, segments, axisNames: 'xy' },
    answer: yesNo(rng, proportional, 'Eine proportionale Zuordnung ist eine Gerade durch den Ursprung.'),
    hints: ['Beginnt die Linie im Ursprung, bei 0?', 'Ist die Linie ganz gerade?'],
    steps: ['Proportional heißt: eine Gerade durch den Ursprung.', said],
    praise: 'Du hast Ursprung und Gerade geprüft.',
  };
};

/** No doubling to read off, and a table that can be off in one row only: every row has to be checked. */
const tableCheck: Form = (rng) => {
  const proportional = rng.chance(0.5);
  const c = rng.pick(COLUMNS);
  const xs = rng.sample([2, 3, 4, 5, 6, 7, 8, 9], 3).sort((a, b) => a - b);
  const k = rng.int(2, 6);
  const at = rng.int(1, 2);
  const off = proportional ? 0 : rng.int(1, 3);
  const ys = xs.map((x, i) => k * x + (i === at ? off : 0));
  return {
    key: `tabelle2:${c.id}:${xs.join('-')}:${k}:${at}:${off}`,
    prompt: 'Ist diese Zuordnung proportional?',
    visual: table(c, rowsOf(xs, ys, c.unit)),
    answer: yesNo(rng, proportional, 'Teile in jeder Zeile den rechten Wert durch den linken.'),
    hints: ['Teile in jeder Zeile den rechten Wert durch den linken.', 'Kommt in jeder Zeile dieselbe Zahl heraus?'],
    steps: [`Faktor aus Zeile 1: ${ys[0]} : ${xs[0]} = ${k}`, proportional ? 'Alle Zeilen passen zu diesem Faktor: proportional.' : `Zeile ${at + 1}: ${xs[at]} · ${k} = ${k * xs[at]}, dort steht ${ys[at]}: nicht proportional.`],
    praise: 'Du hast jede Zeile geprüft.',
  };
};

const REASON_YES = 'Ja: Doppelt so viel links gibt doppelt so viel rechts.';
const REASON_NO = 'Nein: Doppelt so viel links gibt nicht doppelt so viel rechts.';

/** The verdict and its reason: only the table says which one it is. */
const reason: Form = (rng) => {
  const proportional = rng.chance(0.5);
  const { c, xs, ys, base } = ratioRows(rng, proportional);
  const verdict = proportional ? 'Ja' : 'Nein';
  return {
    key: `grund:${c.id}:${xs[0]}:${ys[0]}:${base}`,
    prompt: 'Wähle die passende Begründung: Ist diese Zuordnung proportional?',
    visual: table(c, rowsOf(xs, ys, c.unit)),
    answer: makeChoice(rng, { label: proportional ? REASON_YES : REASON_NO }, [
      { label: proportional ? REASON_NO : REASON_YES, whyWrong: 'Vergleiche zwei Zeilen: Doppelt so viel links, doppelt so viel rechts?' },
      { label: `${verdict}: Die Werte werden größer.`, whyWrong: 'Bei jeder dieser Zuordnungen werden die Werte größer.' },
      { label: `${verdict}: Die Tabelle hat nur wenige Zeilen.`, whyWrong: 'Die Zahl der Zeilen sagt darüber nichts.' },
    ]),
    hints: ['Suche zwei Zeilen: links das Doppelte.', 'Steht rechts dann auch das Doppelte?'],
    steps: [`Links: ${xs[0]} und ${xs[1]}, also das Doppelte.`, `Rechts: ${amount(ys[0], c.unit)} und ${amount(ys[1], c.unit)}, das ist ${proportional ? '' : 'nicht '}das Doppelte.`],
    praise: 'Du hast das Verhältnis als Grund genannt.',
  };
};

/** Two prices, with or without a Grundpreis inside them: only the numbers say which. */
const boat: Form = (rng) => {
  const proportional = rng.chance(0.5);
  const base = proportional ? 0 : rng.int(2, 6);
  const perHour = rng.int(3, 8);
  const h = rng.int(2, 4);
  const [one, two] = [base + h * perHour, base + 2 * h * perHour];
  return {
    key: `boot:${base}:${perHour}:${h}`,
    context: `Ein Boot kostet für ${h} Stunden ${amount(one, '€')}. Für ${2 * h} Stunden kostet das Boot ${amount(two, '€')}.`,
    prompt: 'Ist der Preis proportional zur Zeit?',
    answer: yesNo(rng, proportional, 'Vergleiche: Kostet die doppelte Zeit genau das Doppelte?'),
    hints: ['Wie viel ist das Doppelte vom ersten Preis?', 'Kostet die doppelte Zeit genau so viel?'],
    steps: [`Das Doppelte der Zeit: 2 · ${h} = ${2 * h}`, `Das Doppelte vom ersten Preis: 2 · ${one} = ${2 * one}`, proportional ? `Das Boot kostet ${amount(two, '€')}, genau das Doppelte: proportional.` : `Das Boot kostet nur ${amount(two, '€')}, das ist nicht das Doppelte: nicht proportional.`],
    praise: 'Du hast beide Preise mit dem Doppelten verglichen.',
  };
};

// ─── Stufe 3: Faktor und Fallen ───────────────────────────────────────────────

const FACTORS = [0.5, 1.5, 2.5, 3, 4, 6, 1.25, 3.5];

function factorBugs(x: number, y: number, k: number) {
  return fitBugs([
    { id: 'additiv-statt-multiplikativ', match: r3(y - x), hint: 'Das ist der Abstand. Gesucht ist die Malzahl.' },
    { id: 'faktor-verkehrt', match: r3(x / y), hint: 'Teile den rechten Wert durch den linken.' },
  ], k, DECIMALS);
}

const factor: Form = (rng) => {
  const c = rng.pick(COLUMNS);
  const k = rng.pick(FACTORS);
  const x1 = rng.pick([2, 4, 8]);
  const xs = [x1, 2 * x1, 3 * x1];
  const ys = xs.map((x) => r3(x * k));
  return {
    key: `faktor:${c.id}:${x1}:${k}`,
    prompt: 'Die Zuordnung ist proportional. Wie heißt der Faktor von links nach rechts?',
    visual: table(c, rowsOf(xs, ys, c.unit)),
    answer: quantity(k),
    hints: ['Teile in einer Zeile den rechten Wert durch den linken.', 'Prüfe den Faktor an einer anderen Zeile.'],
    steps: [`${fmt(ys[0])} : ${xs[0]} = ${fmt(k)}`, `Probe: ${xs[1]} · ${fmt(k)} = ${fmt(ys[1])}`, `Der Faktor ist ${fmt(k)}.`],
    bugs: factorBugs(xs[0], ys[0], k),
    praise: 'Du hast den Faktor aus einer Zeile bestimmt und geprüft.',
  };
};

const graphFactor: Form = (rng) => {
  const [k, x] = rng.pick([[1.5, 2], [1.5, 4], [1.5, 6], [2, 3], [2, 5], [2.5, 2], [2.5, 4], [3, 2], [3, 4]] as const);
  const y = k * x;
  const origin = { x: 0, y: 0 };
  return {
    key: `graphfaktor:${x}:${y}`,
    prompt: `Der Punkt ${fmtPoint('P', x, y)} liegt auf einer Geraden durch den Ursprung. Wie heißt der Faktor?`,
    visual: { type: 'coordinateGrid', xMin: 0, xMax: 8, yMin: 0, yMax: 12, step: 1, labelStep: 2, points: [{ x, y, label: 'P' }], segments: [[origin, { x, y }]], axisNames: 'xy' },
    answer: quantity(k),
    hints: ['Der Faktor sagt: y ist so viel mal x.', 'Teile y durch x.'],
    steps: [`Faktor: ${fmt(y)} : ${x} = ${fmt(k)}`, `Der Faktor ist ${fmt(k)}.`],
    bugs: factorBugs(x, y, k),
    praise: 'Du hast den Faktor aus einem Punkt bestimmt.',
  };
};

interface StoryCheck {
  id: string;
  context: string;
  /** The two sizes, as the question names them. */
  names: string;
  /** The Faktor if they are proportional, otherwise null. */
  k: number | null;
  /** Other numbers that look like a Faktor. */
  others: number[];
  lines: string[];
}

/** Two values with no doubling to read off, the same story with or without one Faktor: only dividing both tells which. */
function measured(rng: Rng, id: string, names: string, say: (x: number, y: number) => string, per: number, gap: number): StoryCheck {
  const [x1, x2] = rng.pick([[2, 3], [2, 5], [3, 4], [3, 5], [4, 5]] as const);
  // three of four, so that with the age, which is never proportional, both verdicts are equally likely: 'Nein' without reading is no way through
  const proportional = rng.chance(0.75);
  const per2 = proportional ? per : r3(per - gap);
  const [y1, y2] = [r3(x1 * per), r3(x2 * per2)];
  return {
    id: `${id}:${x1}:${per}:${x2}:${per2}`,
    context: `${say(x1, y1)} ${say(x2, y2)}`,
    names,
    k: proportional ? per : null,
    others: proportional ? [r3(2 * per), r3(per + gap), r3(y1 - x1), r3(y2 - x2)] : [per, per2, r3(y1 - x1), r3(y2 - x2)],
    lines: [`${fmt(y1)} : ${x1} = ${fmt(per)}`, `${fmt(y2)} : ${x2} = ${fmt(per2)}`, proportional ? `Beide Male ist es ${fmt(per)}: proportional mit Faktor ${fmt(per)}.` : 'Das sind zwei verschiedene Zahlen: nicht proportional.'],
  };
}

function storyCheck(rng: Rng): StoryCheck {
  const { name } = pickPerson(rng);
  return rng.pick<() => StoryCheck>([
    () => {
      const age = rng.int(9, 12);
      const age2 = age + rng.int(2, 5);
      const a = rng.int(27, 31) * 5;
      const b = a + rng.int(2, 6) * 5;
      const roughly = (x: number) => Math.round(x * 100) / 100;
      return {
        id: `alter:${age}:${a}:${age2}:${b}`,
        context: `${name} ist mit ${age} Jahren ${amount(a / 100, 'm')} groß. Mit ${age2} Jahren ist ${name} ${amount(b / 100, 'm')} groß.`,
        names: 'Alter und Größe',
        k: null,
        others: [roughly(a / 100 / age), roughly(b / 100 / age2), r3((b - a) / 100), 2],
        lines: ['Die Größe wächst nicht im gleichen Verhältnis wie das Alter.', 'Die beiden Größen sind nicht proportional.'],
      };
    },
    () => measured(rng, 'aepfel', 'Gewicht und Preis', (x, y) => `${x} kg Äpfel kosten ${amount(y, '€')}.`, rng.int(3, 9) / 2, 0.5),
    () => measured(rng, 'zug', 'Zeit und Strecke', (x, y) => `In ${x} Stunden fährt der Zug ${amount(y, 'km')}.`, rng.int(6, 12) * 10, 10),
  ])();
}

/** The trap and the Faktor in one answer: a verdict alone is the check of Stufe 2. */
const trapCheck: Form = (rng) => {
  const s = storyCheck(rng);
  const said = (k: number) => `Ja, mit Faktor ${fmt(k)}`;
  const why = 'Teile bei beiden Angaben den zweiten Wert durch den ersten.';
  const others = s.others.map((k) => ({ label: said(k), whyWrong: s.k === null ? CHECK : why }));
  return {
    key: `falle:${s.id}`,
    context: s.context,
    prompt: `Sind ${s.names} proportional, und mit welchem Faktor?`,
    answer: s.k === null ? makeChoice(rng, { label: NO }, others) : makeChoice(rng, { label: said(s.k) }, [{ label: NO, whyWrong: why }, ...others]),
    hints: [CHECK, why],
    steps: s.lines,
    praise: 'Du hast zuerst das Verhältnis geprüft.',
  };
};

const wrongRow: Form = (rng) => {
  const c = rng.pick(COLUMNS);
  const k = rng.pick([1.5, 2, 2.5, 3, 4, 5]);
  const x1 = rng.pick([2, 4]);
  const xs = [x1, 2 * x1, 3 * x1, 4 * x1];
  const ys = xs.map((x) => r3(x * k));
  const at = rng.int(1, 3);
  const shown = r3(ys[at] + rng.pick([-2, -1, 1, 2, 3]));
  const rows = rowsOf(xs, ys.map((y, i) => (i === at ? shown : y)), c.unit);
  return {
    key: `fehler:${c.id}:${x1}:${k}:${at}:${shown}`,
    prompt: 'Die Zuordnung soll proportional sein. Ein Wert rechts stimmt noch nicht. Welcher Wert gehört dorthin?',
    visual: table(c, rows),
    answer: quantity(ys[at], c.unit),
    hints: ['Bestimme den Faktor aus der ersten Zeile.', 'Prüfe mit diesem Faktor jede Zeile.'],
    steps: [`Faktor: ${fmt(ys[0])} : ${xs[0]} = ${fmt(k)}`, `Zeile mit ${xs[at]}: ${xs[at]} · ${fmt(k)} = ${fmt(ys[at])}`, `Dort gehört ${amount(ys[at], c.unit)} hin.`],
    bugs: fitBugs([{ id: 'falscher-wert-bleibt', match: shown, hint: 'Dieser Wert passt nicht zum Faktor der anderen Zeilen.' }], ys[at], DECIMALS),
    praise: 'Du hast den Faktor benutzt und den Wert gefunden.',
  };
};

const candle: Form = (rng) => {
  const l = rng.int(11, 15) * 2;
  const d = rng.int(2, 4);
  const h = rng.int(2, 4);
  const left = l - h * d;
  return {
    key: `kerze:${l}:${d}:${h}`,
    context: `Eine Kerze ist ${amount(l, 'cm')} lang. Nach 1 Stunde ist die Kerze noch ${amount(l - d, 'cm')} lang. Die Kerze brennt gleichmäßig.`,
    prompt: `Wie lang ist die Kerze nach ${h} Stunden?`,
    answer: quantity(left, 'cm'),
    hints: [CHECK, 'Wie viele Zentimeter brennt die Kerze in 1 Stunde ab?'],
    steps: [`In 1 Stunde: ${amount(l, 'cm')} ${MINUS} ${amount(l - d, 'cm')} = ${amount(d, 'cm')}`, `In ${h} Stunden: ${h} · ${amount(d, 'cm')} = ${amount(h * d, 'cm')}`, `Übrig: ${amount(l, 'cm')} ${MINUS} ${amount(h * d, 'cm')} = ${amount(left, 'cm')}`, `Die Kerze ist noch ${amount(left, 'cm')} lang.`],
    bugs: fitBugs([
      { id: 'immer-proportional', match: (l - d) * h, hint: 'Die Kerze wird kürzer, nicht länger. Prüfe das Verhältnis.' },
      { id: 'nur-abgebrannt', match: h * d, hint: 'So viel ist abgebrannt. Gefragt ist der Rest.' },
    ], left, DECIMALS),
    praise: 'Du hast erkannt: Hier ist es nicht proportional.',
  };
};

const FORMS: Record<1 | 2 | 3, Record<Ab, Form[]>> = {
  1: {
    1: [doubling((rng) => ({ x0: 1, y0: rng.int(2, 25) }), 'doppelt')],
    2: [doubling((rng) => ({ x0: rng.pick([3, 5, 6, 7, 9]), y0: rng.int(5, 39) / 2 }), 'doppelt2')],
    3: [doubleBack],
  },
  2: { 1: [tableDecide], 2: [graphDecide, tableCheck], 3: [reason, boat] },
  3: { 1: [factor, graphFactor], 2: [trapCheck], 3: [wrongRow, candle] },
};

export const proportionalSkill: SkillDef = {
  id: 'prozent.proportional',
  topicId: 'prozent',
  title: 'Proportional oder nicht?',
  description: 'Du erkennst, ob zwei Größen proportional zueinander sind.',
  stufen: {
    1: 'Tabellen durch Verdoppeln ergänzen',
    2: 'Entscheiden nach Tabelle oder Graph im ersten Quadranten',
    3: 'Den Faktor finden, Fallen wie Alter und Größe',
  },
  keys: { comma: true },
  kmk: KMK,
  generate: fromForms('prozent.proportional', KMK, FORMS),
};
