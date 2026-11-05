/**
 * Die Zahlengerade (docs/research.md §6). Stufe 1: −10 to 10, a tick for every 1. Stufe 2: −50 to 50, a tick for every 5. Stufe 3: −2 to 2, places in halves or quarters on a line with a tick for each quarter. The catalogue names a numberline answer, and
 * its description also asks to read off: a numberline answer can only place, so reading uses a number field, and on Stufe 3 a fraction field.
 */
import { fmt } from '../../core/format';
import type { Ab, Rng, SkillDef, Stufe } from '../../core/types';
import { numberBugs, signedNumber, targetAb } from '../shared';
import { assemble, bug, type Form, KMK_RATIONAL, KMK_ZAHLEN, line, lineAnswer, lineInWords, type Line, rat, ratAnswer, ratBugs, ratText, rightLeft, say } from './helpers';

const SKILL = { id: 'negativ.zahlengerade', topicId: 'negativ' } as const;

const SIDE = (v: number) => (v < 0 ? 'Links von der 0 stehen die negativen Zahlen.' : 'Rechts von der 0 stehen die positiven Zahlen.');
const COUNT_FROM_ZERO = 'Zähle die Striche von der 0 bis zum Pfeil.';

const striche = (n: number) => `${n} ${n === 1 ? 'Strich' : 'Striche'}`;

/** The mirror within a section between two labels: −4 between −5 and 0 taken as −1. */
function wrongSide(v: number, majorStep: number): number {
  const low = Math.floor(v / majorStep) * majorStep;
  return low + low + majorStep - v;
}

// ─── Whole numbers: Stufe 1 and 2 ────────────────────────────────────────────

function placeWhole(v: number, axis: Line, form: string, praise: string): Form {
  const prompt = `Setze den Pfeil auf ${fmt(v)}.`;
  const tick = axis.minorStep;
  return {
    key: `${form}:${v}`,
    prompt,
    answer: lineAnswer(v, axis),
    hints: ['Such zuerst die 0.', tick === 1 ? SIDE(v) : `Ein Strich zählt ${tick}. Zähle von der 0 aus.`],
    steps: [
      `Ein Strich zählt ${tick}.`,
      { text: `${fmt(v)} liegt ${striche(Math.abs(v) / tick)} ${rightLeft(v)} von der 0.`, visual: { ...axis, marks: [{ value: v, label: fmt(v) }] } },
      `Dort steht der Pfeil: ${fmt(v)}.`,
    ],
    bugs: numberBugs([
      bug('vorzeichen-vergessen', -v, SIDE(v)),
      v % axis.majorStep !== 0 && bug('links-gezaehlt', wrongSide(v, axis.majorStep), 'Zähle von der 0 aus. Negative Zahlen zählst du nach links.'),
    ], v, true),
    praise,
    srText: say(lineInWords(axis), prompt),
  };
}

function readWhole(v: number, axis: Line, form: string): Form {
  const prompt = 'Welche Zahl zeigt der Pfeil A?';
  const tick = axis.minorStep;
  const visual: Line = { ...axis, marks: [{ value: v, label: 'A' }] };
  return {
    key: `${form}:${v}`,
    prompt,
    visual,
    answer: signedNumber(v, { before: 'A =' }),
    hints: ['Such zuerst die 0.', tick === 1 ? COUNT_FROM_ZERO : `Wie viel zählt ein Strich? ${COUNT_FROM_ZERO}`],
    steps: [`Ein Strich zählt ${tick}.`, `A liegt ${striche(Math.abs(v) / tick)} ${rightLeft(v)} von der 0.`, `A = ${fmt(v)}`],
    bugs: numberBugs([
      bug('vorzeichen-vergessen', -v, SIDE(v)),
      // with the value of the tick this bug would state the answer one tick from the 0
      tick > 1 && bug('strich-zaehlt', v / tick, 'Das sind die Striche. Wie viel zählt ein Strich?'),
      tick === 1 && bug('null-mitgezaehlt', v < 0 ? v - 1 : v + 1, 'Die 0 ist der Start. Zähle die Schritte ab dort.'),
      v % axis.majorStep !== 0 && bug('links-gezaehlt', wrongSide(v, axis.majorStep), COUNT_FROM_ZERO),
    ], v, true),
    praise: 'Du hast die Striche von der 0 aus gezählt.',
    srText: say(lineInWords(visual), prompt),
  };
}

function walk(a: number, s: number, right: boolean, axis: Line, form: string): Form {
  const target = right ? a + s : a - s;
  const way = right ? 'rechts' : 'links';
  const prompt = `Starte bei ${fmt(a)}. Geh ${s} ${axis.minorStep === 1 ? 'Schritte ' : ''}nach ${way}. Setze dort den Pfeil.`;
  return {
    key: `${form}:${a}:${right ? 'r' : 'l'}:${s}`,
    prompt,
    answer: lineAnswer(target, axis),
    hints: [`Such zuerst ${fmt(a)} auf der Zahlengeraden.`, right ? 'Nach rechts werden die Zahlen größer.' : 'Nach links werden die Zahlen kleiner.'],
    steps: [`Du startest bei ${fmt(a)}.`, { text: `${s} nach ${way}: Du kommst bei ${fmt(target)} an.`, visual: { ...axis, jumps: [{ from: a, to: target, label: `${right ? '+' : '−'} ${s}` }] } }],
    bugs: numberBugs([
      bug('richtung', right ? a - s : a + s, right ? 'Prüfe die Richtung: Rechts stehen die größeren Zahlen.' : 'Prüfe die Richtung: Links stehen die kleineren Zahlen.'),
      bug('vorzeichen-vergessen', -target, 'Prüfe die Seite: Liegt das Ziel links oder rechts von der 0?'),
    ], target, true),
    praise: 'Du hast den Weg auf der Zahlengeraden verfolgt.',
    srText: say(lineInWords(axis), prompt),
    kmk: ['PK.darstellen'],
  };
}

function gegenzahlWhole(v: number, axis: Line, form: string): Form {
  const prompt = `Setze den Pfeil auf die Gegenzahl von ${fmt(v)}.`;
  return {
    key: `${form}:${v}`,
    prompt,
    answer: lineAnswer(-v, axis),
    hints: ['Die Gegenzahl liegt gleich weit von der 0.', 'Die Gegenzahl liegt auf der anderen Seite der 0.'],
    steps: [`${fmt(v)} liegt ${fmt(Math.abs(v))} ${rightLeft(v)} von der 0.`, { text: `Die Gegenzahl von ${fmt(v)} ist ${fmt(-v)}.`, visual: { ...axis, marks: [{ value: -v, label: fmt(-v) }] } }],
    bugs: numberBugs([bug('vorzeichen-umgekehrt', v, 'Das ist die Zahl selbst. Die Gegenzahl liegt auf der anderen Seite der 0.')], -v, true),
    praise: 'Du hast den gleichen Abstand zur 0 genutzt.',
    srText: say(lineInWords(axis), prompt),
  };
}

const AXIS_10 = line(-10, 10, 5, 1);
const AXIS_50 = line(-50, 50, 25, 5);
const AXIS_50_SPARSE = line(-50, 50, 25, 5, { labels: [-50, 0, 50] });

/** Not on a labelled tick, and mostly below 0. */
function offLabel(rng: Rng, tick: number, major: number, max: number): number {
  const all = Array.from({ length: Math.round(max / tick) }, (_, i) => (i + 1) * tick).filter((n) => n % major !== 0);
  return (rng.chance(0.8) ? -1 : 1) * rng.pick(all);
}

function stufe1(rng: Rng, ab: Ab): Form {
  if (ab === 1) return placeWhole(offLabel(rng, 1, 5, 9), AXIS_10, 'setzen', 'Du hast von der 0 aus gezählt.');
  if (ab === 2) return readWhole(offLabel(rng, 1, 5, 9), AXIS_10, 'lesen');
  if (rng.chance(0.5)) return gegenzahlWhole(offLabel(rng, 1, 5, 9), AXIS_10, 'gegenzahl');
  const right = rng.chance(0.5);
  const s = rng.int(3, 9);
  const a = right ? rng.int(-9, 10 - s) : rng.int(-10 + s, 9);
  return walk(a || (right ? -1 : 1), s, right, AXIS_10, 'weg');
}

/** Two values on the ticks, on both sides of the 0: at least two ticks apart, so that the labels of the arrows stay apart. */
function distance(rng: Rng): Form {
  const a = -5 * rng.int(1, 9);
  const b = 5 * rng.int(1, 9);
  const prompt = 'Wie weit liegen die Pfeile A und B auseinander?';
  const visual: Line = { ...AXIS_50, marks: [{ value: a, label: 'A' }, { value: b, label: 'B' }] };
  const d = b - a;
  return {
    key: `abstand:${a}:${b}`,
    prompt,
    visual,
    answer: signedNumber(d),
    hints: ['Geh von A aus zuerst bis zur 0.', 'Geh dann von der 0 aus bis B.'],
    steps: [`A = ${fmt(a)} und B = ${fmt(b)}`, `Von A bis zur 0 sind es ${-a}, von 0 bis B sind es ${b}.`, `Zusammen sind es ${d}.`],
    bugs: numberBugs([
      bug('abstand-ohne-null', Math.abs(b + a), 'Zähle bis 0 und dann weiter bis B. Beides gehört dazu.'),
      bug('strich-zaehlt', d / 5, 'Das sind die Striche. Ein Strich zählt aber 5.'),
      bug('vorzeichen-vergessen', -d, 'Ein Abstand hat kein Minus.'),
    ], d, true),
    praise: 'Du hast den Weg über die 0 ganz gezählt.',
    srText: say(lineInWords(visual), prompt),
    kmk: ['PK.problemloesen'],
  };
}

function stufe2(rng: Rng, ab: Ab): Form {
  if (ab === 1) return placeWhole(offLabel(rng, 5, 25, 45), AXIS_50, 'setzen', 'Du hast in Fünfern von der 0 aus gezählt.');
  if (ab === 2) return readWhole(offLabel(rng, 5, 25, 45), rng.chance(0.5) ? AXIS_50 : AXIS_50_SPARSE, 'lesen');
  const kind = rng.int(0, 2);
  if (kind === 0) return distance(rng);
  if (kind === 1) return gegenzahlWhole(offLabel(rng, 5, 25, 45), AXIS_50, 'gegenzahl');
  const right = rng.chance(0.5);
  const s = 5 * rng.int(3, 9);
  const a = 5 * (right ? rng.int(-9, (50 - s) / 5) : rng.int((-50 + s) / 5, 9));
  return walk(a || (right ? -5 : 5), s, right, AXIS_50, 'weg');
}

// ─── Stufe 3: halves and quarters ────────────────────────────────────────────

/**
 * Positions count quarters. Halves are places on this line too: with a tick for each half, the target would always be the one unlabelled tick beside a label, with nothing to count, which is less than Stufe 2 asks.
 */
const PARTS = 4;

/** −2 to 2 in quarters: long ticks at the wholes. */
const fineAxis = (labelFormat: 'mixed' | 'decimal' = 'mixed'): Line => line(-2 * PARTS, 2 * PARTS, PARTS, 1, { denominator: PARTS, labelFormat });
/** Labels only at the ends and the 0: AB II finds the wholes too. */
const SPARSE_AXIS = line(-2 * PARTS, 2 * PARTS, PARTS, 1, { denominator: PARTS, labelFormat: 'mixed', labels: [-2 * PARTS, 0, 2 * PARTS] });

const TICK_LINE = 'Ein Strich zählt {frac:1/4}.';

/** The whole on the far side of a value: −1 and −2 for −1 1/4. */
function betweenWholes(position: number): [number, number] {
  const low = Math.floor(position / PARTS);
  return [low, low + 1];
}

function placeFine(position: number, shownAs: string, form: string, axis: Line = fineAxis()): Form {
  const prompt = `Setze den Pfeil auf ${shownAs}.`;
  const [low, high] = betweenWholes(position);
  const onWhole = position % PARTS === 0;
  return {
    key: `${form}:${position}`,
    prompt,
    answer: lineAnswer(position, axis),
    hints: [onWhole ? 'Such zuerst die 0.' : `Die Zahl liegt zwischen ${fmt(low)} und ${fmt(high)}.`, `Von einer ganzen Zahl zur nächsten sind es ${PARTS} Striche.`],
    steps: [
      TICK_LINE,
      { text: `${shownAs} liegt ${striche(Math.abs(position))} ${rightLeft(position)} von der 0.`, visual: { ...axis, marks: [{ value: position, label: 'Hier' }] } },
      `Dort steht der Pfeil: ${shownAs}.`,
    ],
    bugs: numberBugs([
      bug('vorzeichen-vergessen', -position, SIDE(position)),
      !onWhole && bug('links-gezaehlt', low * PARTS + high * PARTS - position, position < 0 ? 'Zähle von der 0 nach links. Ein Strich ist ein Viertel.' : 'Zähle von der 0 nach rechts. Ein Strich ist ein Viertel.'),
      Math.abs(position) > PARTS && bug('ganze-vergessen', Math.sign(position) * (Math.abs(position) - PARTS), 'Die Zahl hat auch ein Ganzes. Geh zuerst bis zu dieser ganzen Zahl.'),
    ], position, true),
    praise: 'Du hast die Striche zwischen den ganzen Zahlen genutzt.',
    srText: say(lineInWords(axis), prompt),
    kmk: KMK_RATIONAL,
  };
}

function readFine(position: number, form: string, axis: Line = fineAxis()): Form {
  const prompt = 'Welche Zahl zeigt der Pfeil A?';
  const value = rat(position, PARTS);
  const visual: Line = { ...axis, marks: [{ value: position, label: 'A' }] };
  const abs = Math.abs(position);
  const negative = position < 0;
  const side = rightLeft(position);
  return {
    key: `${form}:${position}`,
    prompt,
    visual,
    answer: ratAnswer(value, { accept: 'equivalent', before: 'A =' }),
    hints: ['Such zuerst die 0. Wie viel zählt ein Strich?', `Von einer ganzen Zahl zur nächsten sind es ${PARTS} Striche.`],
    steps: [TICK_LINE, `A liegt ${striche(abs)} ${side} von der 0.`, `A = ${ratText(value)}`],
    bugs: ratBugs([
      { id: 'links-gezaehlt', numerator: PARTS - abs % PARTS, denominator: PARTS, negative, hint: 'Zähle von der 0 aus, nicht von der nächsten ganzen Zahl.' },
      { id: 'strich-zaehlt', numerator: 0, denominator: 1, whole: abs, negative, hint: 'Das sind die Striche. Wie viel zählt ein Strich?' },
    ].filter((s) => abs < PARTS || s.id === 'strich-zaehlt'), value),
    praise: 'Du hast die Teile von der 0 aus gezählt.',
    srText: say(lineInWords(visual), prompt),
    kmk: KMK_RATIONAL,
  };
}

/** Positions that are no whole number, mostly below 0. */
function finePosition(rng: Rng, oddOnly = false): number {
  const all = Array.from({ length: 2 * PARTS - 1 }, (_, i) => i + 1).filter((n) => (oddOnly ? n % 2 === 1 : n % PARTS !== 0));
  return (rng.chance(0.8) ? -1 : 1) * rng.pick(all);
}

/** AB III: the middle between two given numbers, one step finer than the numbers. */
function middle(rng: Rng): Form {
  const left = 2 * rng.int(-4, 3);
  const mid = left + 1;
  const [a, b] = [rat(left, PARTS), rat(left + 2, PARTS)];
  const prompt = `Setze den Pfeil genau in die Mitte von ${ratText(a)} und ${ratText(b)}.`;
  const axis = fineAxis();
  return {
    key: `mitte:${left}`,
    prompt,
    answer: lineAnswer(mid, axis),
    hints: ['Such zuerst beide Zahlen auf der Zahlengeraden.', 'Zähle die Striche zwischen beiden Zahlen.'],
    steps: [TICK_LINE, `Zwischen ${ratText(a)} und ${ratText(b)} liegen 2 Striche.`, { text: `Die Mitte ist ${ratText(rat(mid, PARTS))}.`, visual: { ...axis, marks: [{ value: mid, label: 'Hier' }] } }],
    bugs: numberBugs([
      bug('mitte-rand', left, 'Das ist eine der beiden Zahlen. Gesucht ist die Stelle dazwischen.'),
      bug('mitte-rand', left + 2, 'Das ist eine der beiden Zahlen. Gesucht ist die Stelle dazwischen.'),
      bug('vorzeichen-vergessen', -mid, SIDE(mid)),
    ], mid, true),
    praise: 'Du hast die Mitte an den Strichen gefunden.',
    srText: say(lineInWords(axis), prompt),
    kmk: [...KMK_RATIONAL, 'PK.problemloesen'],
  };
}

function gegenzahlFine(rng: Rng): Form {
  const position = finePosition(rng, true);
  const axis = fineAxis();
  const prompt = `Setze den Pfeil auf die Gegenzahl von ${ratText(rat(position, PARTS))}.`;
  const target = rat(-position, PARTS);
  return {
    key: `gegenzahl-fein:${position}`,
    prompt,
    answer: lineAnswer(-position, axis),
    hints: ['Die Gegenzahl liegt gleich weit von der 0.', 'Die Gegenzahl liegt auf der anderen Seite der 0.'],
    steps: [TICK_LINE, `${ratText(rat(position, PARTS))} liegt ${striche(Math.abs(position))} ${rightLeft(position)} von der 0.`, { text: `Die Gegenzahl ist ${ratText(target)}.`, visual: { ...axis, marks: [{ value: -position, label: 'Hier' }] } }],
    bugs: numberBugs([bug('vorzeichen-umgekehrt', position, 'Das ist die Zahl selbst. Die Gegenzahl liegt auf der anderen Seite der 0.')], -position, true),
    praise: 'Du hast den gleichen Abstand zur 0 genutzt.',
    srText: say(lineInWords(axis), prompt),
    kmk: KMK_RATIONAL,
  };
}

function stufe3(rng: Rng, ab: Ab): Form {
  if (ab === 1) {
    const position = finePosition(rng);
    return rng.chance(0.6) ? placeFine(position, ratText(rat(position, PARTS)), 'teile-setzen') : readFine(position, 'teile-lesen');
  }
  if (ab === 2) {
    const position = finePosition(rng, true);
    return rng.chance(0.6) ? placeFine(position, ratText(rat(position, PARTS)), 'viertel-setzen', SPARSE_AXIS) : readFine(position, 'viertel-lesen', SPARSE_AXIS);
  }
  const kind = rng.int(0, 2);
  if (kind === 0) return middle(rng);
  if (kind === 1) return gegenzahlFine(rng);
  // the same place written with a comma: the line and the task speak decimals
  const position = finePosition(rng, true);
  return placeFine(position, fmt(position / PARTS), 'komma-setzen', fineAxis('decimal'));
}

const FORMS: Record<Stufe, (rng: Rng, ab: Ab) => Form> = { 1: stufe1, 2: stufe2, 3: stufe3 };

export const zahlengeradeSkill: SkillDef = {
  ...SKILL,
  title: 'Die Zahlengerade',
  description: 'Du liest ganze Zahlen ab und trägst sie ein.',
  stufen: { 1: '−10 bis 10, ein Strich zählt 1', 2: '−50 bis 50, ein Strich zählt 5', 3: '−2 bis 2, in Halben oder Vierteln' },
  kmk: [...KMK_ZAHLEN, ...KMK_RATIONAL, 'PK.darstellen', 'PK.problemloesen'],
  keys: { minus: true, mixed: true },
  generate(rng, stufe, ctx) {
    const ab = targetAb(rng, stufe, ctx);
    return assemble(SKILL, stufe, ab, KMK_ZAHLEN, FORMS[stufe](rng, ab));
  },
};
