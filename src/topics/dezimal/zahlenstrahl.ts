/**
 * Dezimalzahlen am Zahlenstrahl. Positions count d-ths (denominator 10 or 100, labelFormat 'decimal'): integers, never floats.
 * Stufe 1: 0 to 1, ticks every 0,1. Stufe 2: 0 to 5, ticks every 0,1, labels every 1; a picture to read shows 4 of the 5 units (a numberLine visual has at most 40 ticks).
 * Stufe 3: a section such as 3,4 to 3,5, ticks every 0,01.
 */
import { fmt, speak } from '../../core/format';
import type { Ab, Exercise, NumberLineAnswer, Rng, SkillDef, Stufe, VisualOf } from '../../core/types';
import { build, numberBugs, targetAb } from '../shared';
import { KEYS, numberAnswer } from './helpers';

const KMK = ['ZO.dezimal-darstellen'];
const MARK = 'A';

interface Line {
  min: number;
  max: number;
  major: number;
  d: 10 | 100;
  /** Explicit labels; otherwise the major ticks carry them. */
  labels?: number[];
}

const text = (v: number, d: number) => fmt(v / d);
const schritte = (n: number) => `${n} ${n === 1 ? 'Schritt' : 'Schritte'}`;
const unit = (line: Line) => (line.d === 10 ? '0,1' : '0,01');

function lineAnswer(line: Line, value: number): NumberLineAnswer {
  return {
    kind: 'numberline',
    min: line.min,
    max: line.max,
    majorStep: line.major,
    minorStep: 1,
    step: 1,
    value,
    tolerance: 0,
    labelMajor: line.labels === undefined,
    ...(line.labels ? { labels: line.labels } : {}),
    denominator: line.d,
    labelFormat: 'decimal',
  };
}

function lineVisual(line: Line, value: number): VisualOf<'numberLine'> {
  return {
    type: 'numberLine',
    min: line.min,
    max: line.max,
    majorStep: line.major,
    minorStep: 1,
    labelMajor: line.labels === undefined,
    ...(line.labels ? { labels: line.labels } : {}),
    marks: [{ value, label: MARK }],
    denominator: line.d,
    labelFormat: 'decimal',
  };
}

const LINE_S1: Line = { min: 0, max: 10, major: 10, d: 10 };
const LINE_S1_HELP: Line = { min: 0, max: 10, major: 5, d: 10 };
const LINE_S2: Line = { min: 0, max: 50, major: 10, d: 10 };
/** A section of Stufe 3: tenths t to t + 1, shown in hundredths. */
const section = (t: number): Line => ({ min: t * 10, max: (t + 1) * 10, major: 5, d: 100, labels: [t * 10, (t + 1) * 10] });

/** The start of the unit the value lies in, as a text for the steps. */
function startOf(line: Line, value: number): number {
  return line.d === 10 ? Math.floor(value / 10) * 10 : line.min;
}

/** The picture in words, for srText. It names the line, so describe.ts adds nothing: the place of the arrow must stand here, and speak() says the digits one by one (T20). */
function lineWords(line: Line, value: number): string {
  const start = startOf(line, value);
  const count = value - start;
  return `Zahlenstrahl von ${text(line.min, line.d)} bis ${text(line.max, line.d)}. Ein kleiner Schritt ist ${unit(line)}. Pfeil ${MARK}: ${count} ${count === 1 ? 'kleiner Schritt' : 'kleine Schritte'} rechts von ${text(start, line.d)}.`;
}

function markItem(stufe: Stufe, ab: Ab, line: Line, value: number, praise: string): Exercise {
  const start = startOf(line, value);
  const count = value - start;
  const shown = text(value, line.d);
  const prompt = `Setze den Pfeil auf ${shown}.`;
  return build(skill, stufe, {
    key: `setzen:${line.min}:${line.major}:${value}`,
    ab,
    prompt,
    answer: lineAnswer(line, value),
    hints: [`Ein kleiner Schritt ist ${unit(line)}.`, `Beginne bei ${text(start, line.d)} und zähle die Schritte.`],
    steps: [`Ein kleiner Schritt ist ${unit(line)}.`, `Von ${text(start, line.d)} aus sind das ${schritte(count)}.`, { text: `Dort liegt ${shown}.`, visual: lineVisual(line.max - line.min > 40 ? { ...line, min: Math.min(start, 10), max: Math.min(start, 10) + 40 } : line, value) }],
    bugs: numberBugs(
      [
        value - 1 > start && { id: 'strich-gezaehlt', match: value - 1, hint: 'Zähle die Schritte zwischen den Strichen. Der Start zählt nicht mit.' },
        { id: 'von-rechts', match: start + (line.d === 10 ? 10 : line.max - line.min) - count, hint: 'Zähle von der kleineren Zahl aus nach rechts.' },
      ].filter((b) => b && typeof b.match === 'number' && b.match >= line.min && b.match <= line.max),
      value,
    ),
    praise,
    srText: speak(prompt),
    kmk: KMK,
  });
}

function readItem(stufe: Stufe, ab: Ab, line: Line, value: number, praise: string): Exercise {
  const start = startOf(line, value);
  const count = value - start;
  const prompt = `Welche Zahl zeigt der Pfeil ${MARK}?`;
  const correct = value / line.d;
  const bugs = line.d === 10
    ? [
        { id: 'striche-gesamt', match: value, hint: 'Ein kleiner Schritt ist 0,1 und nicht 1.' },
        value >= 10 && count > 0 && { id: 'null-eingefuegt', match: Number(`${Math.floor(value / 10)}.0${count}`), hint: 'Ein kleiner Schritt ist 1 Zehntel. Zähle die Zehntel.' },
        value < 10 && { id: 'null-eingefuegt', match: value / 100, hint: 'Ein kleiner Schritt ist 1 Zehntel. Zähle die Zehntel.' },
        { id: 'von-rechts', match: (start + 10 - count) / 10, hint: 'Zähle von der kleineren Zahl aus nach rechts.' },
      ]
    : [
        { id: 'strich-als-zehntel', match: (line.min + count * 10) / 100, hint: 'Von Zahl zu Zahl sind es 10 kleine Schritte. Ein Schritt ist also 0,01.' },
        { id: 'strich-als-tausendstel', match: (line.min * 10 + count) / 1000, hint: 'Von Zahl zu Zahl sind es 10 kleine Schritte. Ein Schritt ist also 0,01.' },
        { id: 'von-rechts', match: (line.max - count) / 100, hint: 'Zähle von der kleineren Zahl aus nach rechts.' },
      ];
  return build(skill, stufe, {
    key: `lesen:${line.min}:${line.max}:${line.major}:${value}`,
    ab,
    prompt,
    visual: lineVisual(line, value),
    answer: numberAnswer(correct, { label: 'Die Zahl am Pfeil' }),
    hints: ['Wie viele kleine Schritte liegen zwischen zwei Zahlen?', `Ein Schritt ist ${unit(line)}. Zähle ab ${text(start, line.d)}.`],
    steps: [`Ein kleiner Schritt ist ${unit(line)}.`, `Der Pfeil steht ${schritte(count)} nach ${text(start, line.d)}.`, `Die Zahl ist ${fmt(correct)}.`],
    bugs: numberBugs(bugs, correct),
    praise,
    srText: speak(`${prompt} ${lineWords(line, value)}`),
    kmk: KMK,
  });
}

/** 'Setze den Pfeil genau in die Mitte zwischen 0,2 und 0,8.' */
function middleItem(stufe: Stufe, ab: Ab, line: Line, lo: number, half: number): Exercise {
  const hi = lo + 2 * half;
  const value = lo + half;
  const prompt = `Setze den Pfeil genau in die Mitte zwischen ${text(lo, line.d)} und ${text(hi, line.d)}.`;
  return build(skill, stufe, {
    key: `mitte:${line.min}:${lo}:${hi}`,
    ab,
    prompt,
    answer: lineAnswer(line, value),
    hints: ['Zähle die kleinen Schritte zwischen den beiden Zahlen.', 'Gehe von der kleineren Zahl die Hälfte davon nach rechts.'],
    steps: [`Von ${text(lo, line.d)} bis ${text(hi, line.d)} sind es ${2 * half} Schritte.`, `Die Hälfte davon: ${schritte(half)}.`, `Die Mitte liegt bei ${text(value, line.d)}.`],
    bugs: numberBugs(
      [
        { id: 'rand-getroffen', match: lo, hint: 'Das ist eine der beiden Zahlen. Gesucht ist die Mitte dazwischen.' },
        { id: 'rand-getroffen', match: hi, hint: 'Das ist eine der beiden Zahlen. Gesucht ist die Mitte dazwischen.' },
      ],
      value,
    ),
    praise: 'Du hast die Schritte gezählt und halbiert.',
    srText: speak(prompt),
    kmk: KMK,
  });
}

/** 'Setze den Pfeil auf 3 − 0,2.' The place comes from a small calculation, over a whole number when it can. */
function termItem(stufe: Stufe, ab: Ab, line: Line, from: number, change: number): Exercise {
  const value = from + change;
  const term = `${text(from, line.d)} ${change > 0 ? '+' : '−'} ${text(Math.abs(change), line.d)}`;
  const prompt = `Rechne ${term}. Setze den Pfeil auf das Ergebnis.`;
  return build(skill, stufe, {
    key: `term:${line.min}:${from}:${change}`,
    ab,
    prompt,
    answer: lineAnswer(line, value),
    hints: [`Gehe von ${text(from, line.d)} aus.`, `Plus geht nach rechts, minus nach links. Ein Schritt ist ${unit(line)}.`],
    steps: [`${term} = ${text(value, line.d)}`, `Gehe ${schritte(Math.abs(change))} nach ${change > 0 ? 'rechts' : 'links'}.`, `Der Pfeil steht auf ${text(value, line.d)}.`],
    bugs: numberBugs([{ id: 'falsche-richtung', match: from - change, hint: `Hier steht ${change > 0 ? 'plus. Gehe nach rechts' : 'minus. Gehe nach links'}.` }].filter((b) => b.match >= line.min && b.match <= line.max), value),
    praise: 'Du hast gerechnet und die Stelle am Strahl gefunden.',
    srText: speak(prompt),
    kmk: KMK,
  });
}

/** 'Welche Zahl liegt 2 Schritte rechts von A?' */
function stepsFromMark(stufe: Stufe, ab: Ab, line: Line, from: number, steps: number): Exercise {
  const correct = (from + steps) / line.d;
  const prompt = `Welche Zahl liegt ${steps} kleine Schritte rechts von ${MARK}?`;
  return build(skill, stufe, {
    key: `von-a:${line.min}:${from}:${steps}`,
    ab,
    prompt,
    visual: lineVisual(line, from),
    answer: numberAnswer(correct, { label: 'Die Zahl' }),
    hints: [`Lies zuerst die Zahl bei ${MARK} ab.`, `Ein Schritt ist ${unit(line)}. Gehe nach rechts weiter.`],
    steps: [`Bei ${MARK} steht ${text(from, line.d)}.`, `${steps} Schritte sind ${fmt(steps / line.d)}.`, `${text(from, line.d)} + ${fmt(steps / line.d)} = ${fmt(correct)}`],
    bugs: numberBugs([{ id: 'falsche-richtung', match: (from - steps) / line.d, hint: 'Rechts liegen die größeren Zahlen.' }], correct),
    praise: 'Du hast zuerst abgelesen und dann weitergezählt.',
    srText: speak(`${prompt} ${lineWords(line, from)}`),
    kmk: KMK,
  });
}

/** A tick of the section that is no end and not the long middle tick. */
function innerTick(rng: Rng, line: Line): number {
  return line.min + rng.pick([1, 2, 3, 4, 6, 7, 8, 9]);
}

function stufe1(rng: Rng, ab: Ab): Exercise {
  if (ab === 1) return rng.chance(0.6) ? markItem(1, ab, LINE_S1_HELP, rng.pick([1, 2, 3, 4, 6, 7, 8, 9]), 'Du hast die Zehntel von 0 aus gezählt.') : readItem(1, ab, LINE_S1_HELP, rng.pick([2, 3, 4, 6, 7, 8, 9]), 'Du hast die Zehntel von 0 aus gezählt.');
  if (ab === 2) return rng.chance(0.6) ? readItem(1, ab, LINE_S1, rng.int(2, 9), 'Du hast die Länge eines Schritts erkannt.') : markItem(1, ab, LINE_S1, rng.int(1, 9), 'Du hast die Zehntel ohne Hilfszahl gezählt.');
  if (rng.chance(0.5)) {
    const half = rng.int(1, 4);
    return middleItem(1, ab, LINE_S1, rng.int(1, 9 - 2 * half), half);
  }
  const from = rng.int(1, 6);
  return stepsFromMark(1, ab, LINE_S1, from, rng.int(2, 9 - from));
}

function stufe2(rng: Rng, ab: Ab): Exercise {
  const notWhole = () => {
    const v = rng.int(1, 49);
    return v % 10 === 0 ? v + 1 : v;
  };
  if (ab === 1) return markItem(2, ab, LINE_S2, notWhole(), 'Du bist zur ganzen Zahl gegangen und hast dann gezählt.');
  if (ab === 2) {
    const min = rng.pick([0, 10]);
    const v = min + rng.int(2, 39);
    const value = v % 10 === 0 ? v + 1 : v;
    return readItem(2, ab, { ...LINE_S2, min, max: min + 40 }, value, 'Du hast von der letzten ganzen Zahl aus gezählt.');
  }
  if (rng.chance(0.5)) {
    const w = rng.int(1, 4) * 10;
    const change = rng.int(2, 6);
    return termItem(2, ab, LINE_S2, w + rng.int(0, 1), -change);
  }
  const half = rng.int(2, 9);
  return middleItem(2, ab, LINE_S2, rng.int(1, 50 - 2 * half), half);
}

function stufe3(rng: Rng, ab: Ab): Exercise {
  const line = section(rng.int(1, 8) * 10 + rng.int(0, 8));
  if (ab === 1) return markItem(3, ab, line, innerTick(rng, line), 'Du hast in Hundertstel-Schritten genau gezählt.');
  if (ab === 2) return readItem(3, ab, line, innerTick(rng, line), 'Du hast den kleinen Schritt 0,01 erkannt.');
  const form = rng.int(1, 3);
  // Over a whole number: 2,9 to 3,0.
  const end = section(rng.int(1, 8) * 10 + 9);
  if (form === 1) return markItem(3, ab, end, innerTick(rng, end), 'Du hast auch bis zur ganzen Zahl genau gezählt.');
  if (form === 2) {
    const start = rng.int(2, 4);
    return termItem(3, ab, end, end.min + start, rng.int(2, 5));
  }
  const half = rng.int(1, 4);
  return middleItem(3, ab, line, line.min + rng.int(0, 10 - 2 * half), half);
}

const skill: SkillDef = {
  id: 'dezimal.zahlenstrahl',
  topicId: 'dezimal',
  title: 'Dezimalzahlen am Zahlenstrahl',
  description: 'Du liest Dezimalzahlen ab und trägst sie ein.',
  stufen: {
    1: 'Von 0 bis 1, Striche alle 0,1',
    2: 'Von 0 bis 5, Striche alle 0,1, Zahlen alle 1',
    3: 'Abschnitt wie 3,4 bis 3,5, Striche alle 0,01',
  },
  kmk: KMK,
  keys: KEYS,
  generate(rng, stufe, ctx) {
    const ab = targetAb(rng, stufe, ctx);
    return stufe === 1 ? stufe1(rng, ab) : stufe === 2 ? stufe2(rng, ab) : stufe3(rng, ab);
  },
};
export default skill;
