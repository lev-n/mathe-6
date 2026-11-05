/**
 * Zustand und Änderung (docs/research.md §6). Stufe 1: start and change within ±20, no crossing of the 0. Stufe 2: crossing the 0. Stufe 3: find the change or the start. A Konto has no owner, and a change
 * always says how far and which way, so the sign of the answer stays the child's decision.
 */
import { fmt, fmtQty, fmtTemp } from '../../core/format';
import type { Ab, Bug, Rng, SkillDef, Stufe } from '../../core/types';
import { type MaybeBug, numberBugs, signedNumber, targetAb } from '../shared';
import { assemble, bug, type Form, jumpLabel, KMK_ZAHLEN, lineAround, say, term, thermometerFor, toZeroAndRest } from './helpers';

const SKILL = { id: 'negativ.aenderung', topicId: 'negativ' } as const;

/** When a change comes in the story. */
type When = 'Dann' | 'Zuerst' | 'Danach';

interface Scene {
  id: string;
  unit?: string;
  /** A level as it is written. */
  show(v: number): string;
  /** How far a change goes, as words: '5 Grad', '30 €'. */
  amount(m: number): string;
  start(v: number): string;
  change(m: number, up: boolean, when: When): string;
  /** A change as the first sentence of a story, when the start is what is asked for. */
  alone(m: number, up: boolean): string;
  /** The first sentence of a story with two changes and no start. */
  twice: string;
  /** The question for the end, and for the start. */
  askEnd: string;
  askStart: string;
  /** The level now, as a sentence. */
  now(v: number): string;
  /** The steps of the numbers of this scene from Stufe 2 on: a Konto moves in fives. */
  grain: number;
}

const WETTER: Scene = {
  id: 'wetter',
  unit: '°C',
  show: fmtTemp,
  amount: (m) => `${m} Grad`,
  start: (v) => `Das Thermometer zeigt ${fmtTemp(v)}.`,
  change: (m, up, when) => `${when} ${up ? 'steigt' : 'fällt'} die Temperatur um ${m} Grad.`,
  alone: (m, up) => `Die Temperatur ${up ? 'steigt' : 'fällt'} um ${m} Grad.`,
  twice: 'Die Temperatur ändert sich zweimal.',
  askEnd: 'Welche Temperatur zeigt das Thermometer jetzt?',
  askStart: 'Welche Temperatur zeigt das Thermometer am Anfang?',
  now: (v) => `Jetzt zeigt das Thermometer ${fmtTemp(v)}.`,
  grain: 1,
};

const KONTO: Scene = {
  id: 'konto',
  unit: '€',
  show: (v) => fmtQty(v, '€'),
  amount: (m) => fmtQty(m, '€'),
  start: (v) => `Ein Konto zeigt ${fmtQty(v, '€')}.`,
  change: (m, up, when) => `${when} ${up ? `kommen ${fmtQty(m, '€')} dazu` : `gehen ${fmtQty(m, '€')} ab`}.`,
  alone: (m, up) => (up ? `Auf ein Konto kommen ${fmtQty(m, '€')}.` : `Von einem Konto gehen ${fmtQty(m, '€')} ab.`),
  twice: 'Ein Konto ändert sich zweimal.',
  askEnd: 'Welchen Stand zeigt das Konto jetzt?',
  askStart: 'Welchen Stand zeigt das Konto am Anfang?',
  now: (v) => `Jetzt zeigt das Konto ${fmtQty(v, '€')}.`,
  grain: 5,
};

/** A building has no deep cellars: every floor of a lift story stays at this one or above, as in negativ.kontext. */
const LOWEST_FLOOR = -6;

const stockwerke = (m: number) => `${m} ${m === 1 ? 'Stockwerk' : 'Stockwerke'}`;

const AUFZUG: Scene = {
  id: 'aufzug',
  show: (v) => fmt(v),
  amount: stockwerke,
  start: (v) => `Ein Aufzug hält im Stockwerk ${fmt(v)}.`,
  change: (m, up, when) => `${when} fährt der Aufzug ${stockwerke(m)} nach ${up ? 'oben' : 'unten'}.`,
  alone: (m, up) => `Ein Aufzug fährt ${stockwerke(m)} nach ${up ? 'oben' : 'unten'}.`,
  twice: 'Ein Aufzug fährt zweimal.',
  askEnd: 'In welchem Stockwerk hält der Aufzug jetzt?',
  askStart: 'In welchem Stockwerk hält der Aufzug am Anfang?',
  now: (v) => `Jetzt hält der Aufzug im Stockwerk ${fmt(v)}.`,
  grain: 1,
};

/** Only below the 0, so never on a crossing. */
const TAUCHER: Scene = {
  id: 'taucher',
  unit: 'm',
  show: (v) => fmtQty(v, 'm'),
  amount: (m) => fmtQty(m, 'm'),
  start: (v) => `Ein Taucher ist bei ${fmtQty(v, 'm')}.`,
  change: (m, up, when) => `${when} ${up ? `steigt der Taucher ${fmtQty(m, 'm')} auf` : `taucht der Taucher ${fmtQty(m, 'm')} tiefer`}.`,
  alone: (m, up) => (up ? `Ein Taucher steigt ${fmtQty(m, 'm')} auf.` : `Ein Taucher taucht ${fmtQty(m, 'm')} tiefer.`),
  twice: 'Ein Taucher ändert die Höhe zweimal.',
  askEnd: 'Auf welcher Höhe ist der Taucher jetzt?',
  askStart: 'Auf welcher Höhe ist der Taucher am Anfang?',
  now: (v) => `Jetzt ist der Taucher bei ${fmtQty(v, 'm')}.`,
  grain: 1,
};

/** Within this distance of the 0 a temperature story stays real: a change over the 0 stays below 20 Grad. */
const WETTER_REACH = 9;

const WHY_SIGN = (r: number) => (r < 0 ? 'Der Stand liegt unter 0. Dort steht ein Minus.' : 'Der Stand liegt über 0. Dort steht kein Minus.');
const ROUTE = (up: boolean) => (up ? 'nach oben' : 'nach unten');

function endBugs(v: number, m: number, up: boolean): Bug[] {
  const move = up ? m : -m;
  const r = v + move;
  const crossing = v * r < 0;
  const list: MaybeBug[] = [
    bug('minus-richtung', v - move, `Prüfe die Richtung: Der Stand geht ${ROUTE(up)}.`),
    crossing && bug('ueber-null', v < 0 ? -v + m : -(v + m), `Geh von ${fmt(v)} zuerst bis 0. Wie viele Schritte bleiben dann?`),
    crossing && bug('bei-null', 0, 'Bei 0 ist der Weg noch nicht zu Ende. Geh weiter.'),
    !crossing && v < 0 && bug('vorzeichen-ignoriert', -v + move, `Du startest unter 0, bei ${fmt(v)}.`),
    bug('vorzeichen-vergessen', -r, crossing && r > 0 ? 'Du kommst über die 0 hinaus. Dort sind die Zahlen positiv.' : WHY_SIGN(r)),
  ];
  return numberBugs(list, r, true);
}

function endSteps(scene: Scene, v: number, m: number, up: boolean, withThermometer: boolean): Form['steps'] {
  const move = up ? m : -m;
  const r = v + move;
  const crossing = v * r < 0;
  const visual = withThermometer ? thermometerFor([v, r], v, move) : lineAround([v, r], { jumps: [{ from: v, to: r, label: jumpLabel(move) }] });
  return [
    { text: `Start: ${scene.show(v)}. Änderung: ${scene.amount(m)} ${ROUTE(up)}.`, visual },
    ...(crossing ? [toZeroAndRest(v, r)] : []),
    `${term(v, up ? '+' : '−', m)} = ${fmt(r)}`,
    `Das Ergebnis ist ${scene.show(r)}.`,
  ];
}

const answerOf = (scene: Scene, value: number) => signedNumber(value, scene.unit ? { unit: scene.unit } : {});

/** `scale`: what a thermometer beside the task has to hold, fixed for the form. A scale fitted to the result would state it: its end would stand a fixed distance from the answer. */
function endForm(scene: Scene, v: number, m: number, up: boolean, form: string, hints: string[], praise: string, scale?: readonly number[]): Form {
  const r = v + (up ? m : -m);
  const context = `${scene.start(v)} ${scene.change(m, up, 'Dann')}`;
  return {
    key: `${form}:${scene.id}:${v}:${up ? 'p' : 'm'}:${m}`,
    context,
    prompt: scene.askEnd,
    ...(scale ? { visual: thermometerFor(scale, v) } : {}),
    answer: answerOf(scene, r),
    hints,
    steps: endSteps(scene, v, m, up, scene === WETTER),
    bugs: endBugs(v, m, up),
    praise,
    srText: say(context, scene.askEnd),
  };
}

/** Two changes one after the other. */
function twoChanges(scene: Scene, v: number, first: number, up1: boolean, second: number, up2: boolean, form: string, hints: string[], praise: string): Form {
  const m1 = up1 ? first : -first;
  const m2 = up2 ? second : -second;
  const mid = v + m1;
  const r = mid + m2;
  const context = `${scene.start(v)} ${scene.change(first, up1, 'Zuerst')} ${scene.change(second, up2, 'Danach')}`;
  const axis = lineAround([v, mid, r]);
  // the labels of two short jumps would overprint each other (46 of the 340 units of the axis)
  const roomy = (Math.abs(r - v) / 2 / (axis.max - axis.min)) * 340 >= 46;
  const jumps = [{ from: v, to: mid, ...(roomy ? { label: jumpLabel(m1) } : {}) }, { from: mid, to: r, ...(roomy ? { label: jumpLabel(m2) } : {}) }];
  return {
    key: `${form}:${scene.id}:${v}:${m1}:${m2}`,
    context,
    prompt: scene.askEnd,
    answer: answerOf(scene, r),
    hints,
    steps: [
      { text: `Start: ${scene.show(v)}.`, visual: { ...axis, jumps } },
      `Erste Änderung: ${term(v, up1 ? '+' : '−', first)} = ${fmt(mid)}`,
      `Zweite Änderung: ${term(mid, up2 ? '+' : '−', second)} = ${fmt(r)}`,
      `Das Ergebnis ist ${scene.show(r)}.`,
    ],
    bugs: numberBugs([
      bug('zwischenstand', mid, 'Das ist der Stand nach der ersten Änderung. Rechne auch die zweite.'),
      bug('minus-richtung', v - m1 + m2, 'Prüfe die Richtung der ersten Änderung.'),
      bug('minus-richtung', mid - m2, 'Prüfe die Richtung der zweiten Änderung.'),
      bug('vorzeichen-vergessen', -r, WHY_SIGN(r)),
    ], r, true),
    praise,
    srText: say(context, scene.askEnd),
  };
}

// ─── Stufe 1: within ±20, no crossing ────────────────────────────────────────

const HINT_WAY = ['Stell dir den Start auf der Zahlengeraden vor.', 'Nach oben heißt plus, nach unten heißt minus.'];

/** A start and a change that stay on one side of the 0, within ±limit. */
function oneSide(rng: Rng, limit: number, below: boolean): { v: number; m: number; up: boolean } {
  const n = rng.int(3, limit);
  // towards the 0 it must stop before it, away from it before the limit
  const towards = n === limit || rng.chance(0.5);
  const m = rng.int(1, towards ? n - 1 : limit - n);
  return below ? { v: -n, m, up: towards } : { v: n, m, up: !towards };
}

function stufe1(rng: Rng, ab: Ab): Form {
  if (ab === 1) {
    const { v, m, up } = oneSide(rng, 15, rng.chance(0.8));
    return endForm(WETTER, v, m, up, 'direkt', HINT_WAY, 'Du hast Start und Änderung getrennt.', v < 0 ? [-15, 0] : [0, 15]);
  }
  if (ab === 2) {
    const scene = rng.pick([KONTO, AUFZUG, TAUCHER]);
    const { v, m, up } = oneSide(rng, scene === AUFZUG ? -LOWEST_FLOOR : 20, scene === TAUCHER || rng.chance(0.8));
    return endForm(scene, v, m, up, 'sache', HINT_WAY, 'Du hast die Änderung in der Sache gelesen.');
  }
  // up first, then down, both below the 0: the sign never changes, so only the order has to be followed
  const scene = rng.pick([WETTER, AUFZUG, TAUCHER]);
  const limit = scene === AUFZUG ? -LOWEST_FLOOR : 20;
  const v = -rng.int(scene === AUFZUG ? 3 : 6, limit - 2);
  const first = rng.int(1, -v - 1);
  // at least 3 Grad of room; back by the same step would only give the start again
  const second = rng.pick(Array.from({ length: Math.min(6, limit + v + first) }, (_, i) => i + 1).filter((n) => n !== first));
  return twoChanges(scene, v, first, true, second, false, 'zwei', ['Rechne der Reihe nach.', 'Zuerst die erste Änderung, dann die zweite.'], 'Du hast beide Änderungen der Reihe nach gerechnet.');
}

// ─── Stufe 2: crossing the 0 ─────────────────────────────────────────────────

const HINT_CROSS = ['Geh zuerst bis zur 0.', 'Wie viele Schritte bleiben dann? Geh diese Schritte auf der anderen Seite weiter.'];

function crossing(rng: Rng, limit: number, grain: number): { v: number; m: number; up: boolean } {
  const below = rng.chance(0.6);
  const a = grain * rng.int(1, Math.floor(limit / grain));
  const b = grain * rng.int(1, Math.floor(limit / grain));
  return below ? { v: -a, m: a + b, up: true } : { v: a, m: a + b, up: false };
}

function stufe2(rng: Rng, ab: Ab): Form {
  if (ab === 1) {
    const { v, m, up } = crossing(rng, WETTER_REACH, 1);
    return endForm(WETTER, v, m, up, 'direkt', HINT_CROSS, 'Du bist über die 0 hinaus weitergegangen.', [-WETTER_REACH, WETTER_REACH]);
  }
  if (ab === 2) {
    const scene = rng.pick([KONTO, AUFZUG]);
    const { v, m, up } = crossing(rng, scene === KONTO ? 95 : -LOWEST_FLOOR, scene.grain);
    return endForm(scene, v, m, up, 'sache', HINT_CROSS, 'Du hast den Weg über die 0 in Teilen gerechnet.');
  }
  // over the 0, then on: the second change can stay on that side or turn back
  const scene = rng.pick([KONTO, WETTER]);
  const unit = scene.grain;
  const reach = scene === WETTER ? WETTER_REACH : 12;
  const { v, m, up } = crossing(rng, unit * reach, unit);
  const after = v + (up ? m : -m);
  const back = unit * rng.int(1, reach) + (rng.chance(0.5) ? Math.abs(after) : 0);
  // back by the same step would only give the start again
  const second = back === m ? back + unit : back;
  const up2 = !up;
  return twoChanges(scene, v, m, up, second, up2, 'zwei', ['Rechne der Reihe nach.', 'Prüfe nach jeder Änderung: Liegt der Stand über oder unter 0?'], 'Du hast den Stand Schritt für Schritt verfolgt.');
}

// ─── Stufe 3: find the change or the start ───────────────────────────────────

/** Two stands of a story: on both sides of the 0, or both below it, where they add up to the deeper one, which a lift keeps at LOWEST_FLOOR. */
function stands(rng: Rng, scene: Scene, limit: number, rising: boolean, crossingZero: boolean): [number, number] {
  const u = scene.grain;
  const shallow = !crossingZero && scene === AUFZUG;
  const a = u * rng.int(1, shallow ? -LOWEST_FLOOR - 1 : limit);
  const b = u * rng.int(1, shallow ? -LOWEST_FLOOR - a : limit);
  if (crossingZero) return rising ? [-a, b] : [a, -b];
  return rising ? [-(a + b), -a] : [-a, -(a + b)];
}

function amountForm(rng: Rng): Form {
  const scene = rng.chance(0.7) ? WETTER : KONTO;
  const rising = rng.chance(0.6);
  const crossingZero = rng.chance(0.75);
  const [from, to] = stands(rng, scene, scene === WETTER ? WETTER_REACH : 12, rising, crossingZero);
  const size = Math.abs(to - from);
  // the temperature rises up to midday and falls after it
  const [first, last] = scene === WETTER ? (rising ? ['Am Morgen', 'Am Mittag'] : ['Am Mittag', 'Am Abend']) : ['Am Montag', 'Am Freitag'];
  const context = `${first} zeigt ${scene === WETTER ? 'das Thermometer' : 'ein Konto'} ${scene.show(from)}. ${last} zeigt ${scene === WETTER ? 'das Thermometer' : 'das Konto'} ${scene.show(to)}.`;
  const prompt = scene === WETTER ? `Um wie viel Grad ${rising ? 'steigt' : 'fällt'} die Temperatur?` : `Um wie viel Euro ${rising ? 'steigt' : 'fällt'} der Stand?`;
  const wrongSize = crossingZero ? Math.abs(Math.abs(to) - Math.abs(from)) : Math.abs(from) + Math.abs(to);
  return {
    key: `wieviel:${scene.id}:${from}:${to}`,
    context,
    prompt,
    answer: signedNumber(size, { unit: scene === WETTER ? 'Grad' : '€' }),
    hints: crossingZero ? ['Der Weg führt über die 0.', 'Zähle bis 0 und dann weiter. Beides gehört dazu.'] : ['Beide Stände liegen unter 0.', 'Zähle von einem Stand bis zum anderen.'],
    steps: [
      { text: `Von ${scene.show(from)} bis ${scene.show(to)}.`, visual: lineAround([from, to], { jumps: [{ from, to }] }) },
      crossingZero ? `Bis zur 0 sind es ${Math.abs(from)}, dann noch ${Math.abs(to)}.` : `Ohne Vorzeichen: ${Math.max(Math.abs(from), Math.abs(to))} − ${Math.min(Math.abs(from), Math.abs(to))} = ${size}`,
      `Die Änderung beträgt ${scene === WETTER ? `${size} Grad` : fmtQty(size, '€')}.`,
    ],
    bugs: numberBugs([
      bug('aenderung-betrag', wrongSize, crossingZero ? `Zähle bis 0 und dann weiter bis ${fmt(to)}. Beides gehört dazu.` : 'Beide Stände liegen unter 0. Der Weg führt nicht über die 0.'),
      bug('vorzeichen-vergessen', -size, 'Die Frage nennt die Richtung schon. Gesucht ist nur die Größe der Änderung.'),
    ], size, true),
    praise: 'Du hast den ganzen Weg von Stand zu Stand gemessen.',
    srText: say(context, prompt),
  };
}

function signedChange(rng: Rng): Form {
  const scene = rng.pick([WETTER, KONTO, AUFZUG]);
  const rising = rng.chance(0.5);
  const crossingZero = rng.chance(0.6);
  const [from, to] = stands(rng, scene, scene === AUFZUG ? -LOWEST_FLOOR : scene === WETTER ? WETTER_REACH : 15, rising, crossingZero);
  const change = to - from;
  const size = Math.abs(change);
  const name = scene === WETTER ? ['Am Morgen zeigt das Thermometer', 'Am Abend zeigt das Thermometer'] : scene === KONTO ? ['Am Montag zeigt ein Konto', 'Am Freitag zeigt das Konto'] : ['Der Aufzug hält im Stockwerk', 'Danach hält der Aufzug im Stockwerk'];
  const context = `${name[0]} ${scene.show(from)}. ${name[1]} ${scene.show(to)}. Eine Änderung nach unten bekommt ein Minus.`;
  const prompt = 'Wie groß ist die Änderung?';
  const wrongSize = crossingZero ? Math.abs(Math.abs(to) - Math.abs(from)) : Math.abs(from) + Math.abs(to);
  const unit = scene === WETTER ? 'Grad' : scene === KONTO ? '€' : 'Stockwerke';
  return {
    key: `aenderung:${scene.id}:${from}:${to}`,
    context,
    prompt,
    answer: signedNumber(change, { unit }),
    // counted, not as end minus start: a − (−b) belongs to negativ.plus-minus, which a plan with this core skill may not have
    hints: ['Zähle vom Anfang bis zum Ende. Wie weit ist der Weg?', 'Geht es nach oben oder nach unten? Das bestimmt das Vorzeichen.'],
    steps: [
      { text: `Von ${scene.show(from)} bis ${scene.show(to)} geht es ${ROUTE(rising)}.`, visual: lineAround([from, to], { jumps: [{ from, to, label: jumpLabel(change) }] }) },
      crossingZero ? `Bis zur 0 sind es ${Math.abs(from)}, dann noch ${Math.abs(to)}. Zusammen sind es ${size}.` : `Ohne Vorzeichen: ${Math.max(Math.abs(from), Math.abs(to))} − ${Math.min(Math.abs(from), Math.abs(to))} = ${size}`,
      `Die Änderung ist ${fmt(change)}.`,
    ],
    bugs: numberBugs([
      bug('vorzeichen-vergessen', -change, rising ? 'Es geht nach oben. Eine solche Änderung ist positiv.' : 'Es geht nach unten. Eine solche Änderung ist negativ.'),
      bug('aenderung-betrag', (rising ? 1 : -1) * wrongSize, crossingZero ? 'Zähle bis 0 und dann weiter. Beides gehört dazu.' : 'Beide Stände liegen unter 0. Der Weg führt nicht über die 0.'),
      bug('aenderung-betrag', (rising ? -1 : 1) * wrongSize, crossingZero ? 'Zähle bis 0 und dann weiter. Beides gehört dazu.' : 'Beide Stände liegen unter 0. Der Weg führt nicht über die 0.'),
    ], change, true),
    praise: 'Du hast Größe und Richtung der Änderung bestimmt.',
    srText: say(context, prompt),
  };
}

function startForm(rng: Rng): Form {
  const scene = rng.pick([WETTER, KONTO, AUFZUG]);
  const up = rng.chance(0.5);
  // mostly over the 0, else below it: a story of positive numbers only is an easier task than Stufe 2
  const [start, end] = stands(rng, scene, scene === AUFZUG ? 5 : scene === WETTER ? WETTER_REACH : 16, up, rng.chance(0.7));
  const m = Math.abs(end - start);
  const context = `${scene.alone(m, up)} ${scene.now(end)}`;
  return {
    key: `start:${scene.id}:${end}:${up ? 'p' : 'm'}:${m}`,
    context,
    prompt: scene.askStart,
    answer: answerOf(scene, start),
    hints: ['Geh von jetzt aus rückwärts.', up ? 'Rückwärts heißt: Aus nach oben wird nach unten.' : 'Rückwärts heißt: Aus nach unten wird nach oben.'],
    steps: [
      `Jetzt: ${scene.show(end)}. Rückwärts geht es ${ROUTE(!up)}.`,
      `${term(end, up ? '−' : '+', m)} = ${fmt(start)}`,
      `Der Start ist ${scene.show(start)}.`,
    ],
    bugs: numberBugs([
      bug('umkehr-gleiche', up ? end + m : end - m, up ? 'Die Umkehrung von nach oben ist nach unten.' : 'Die Umkehrung von nach unten ist nach oben.'),
      bug('vorzeichen-vergessen', -start, WHY_SIGN(start)),
    ], start, true),
    praise: 'Du hast rückwärts vom Ergebnis gerechnet.',
    srText: say(context, scene.askStart),
  };
}

/** Two opposite changes whose way crosses the 0, with a negative number as the end or the start: positive numbers only would be an easier task than Stufe 2. */
function twoBack(rng: Rng, u: number, limit: number, lowest: number) {
  for (;;) {
    const m1 = u * rng.int(2, limit);
    // two equal steps would cancel out, and the start would be the level of now
    const other = rng.int(2, limit - 1);
    const m2 = u * (other * u === m1 ? limit : other);
    const up1 = rng.chance(0.5);
    const end = u * rng.int(-limit, limit) || u;
    const d1 = up1 ? m1 : -m1;
    const d2 = up1 ? -m2 : m2;
    const before = end - d2;
    const start = before - d1;
    if (start !== 0 && (start < 0 || end < 0) && Math.max(start, before, end) > 0 && Math.min(start, before, end) >= lowest) return { m1, m2, up1, up2: !up1, end, d1, d2, before, start };
  }
}

function startAfterTwo(rng: Rng): Form {
  const scene = rng.pick([WETTER, KONTO, AUFZUG]);
  const { m1, m2, up1, up2, end, d1, d2, before, start } = twoBack(rng, scene.grain, scene === AUFZUG ? 5 : 12, scene === AUFZUG ? LOWEST_FLOOR : -Infinity);
  const context = `${scene.twice} ${scene.change(m1, up1, 'Zuerst')} ${scene.change(m2, up2, 'Danach')} ${scene.now(end)}`;
  return {
    key: `start-zwei:${scene.id}:${end}:${d1}:${d2}`,
    context,
    prompt: scene.askStart,
    answer: answerOf(scene, start),
    hints: ['Fang beim Stand von jetzt an und geh rückwärts.', 'Nimm zuerst die zweite Änderung zurück.'],
    steps: [
      `Jetzt: ${scene.show(end)}.`,
      `Zweite Änderung zurück: ${term(end, up2 ? '−' : '+', m2)} = ${fmt(before)}`,
      `Erste Änderung zurück: ${term(before, up1 ? '−' : '+', m1)} = ${fmt(start)}`,
      `Der Start ist ${scene.show(start)}.`,
    ],
    bugs: numberBugs([
      bug('umkehr-gleiche', end + d1 + d2, 'Du bist vorwärts gegangen. Nimm beide Änderungen zurück.'),
      bug('zwischenstand', before, 'Das ist der Stand vor der zweiten Änderung. Nimm auch die erste zurück.'),
      bug('vorzeichen-vergessen', -start, WHY_SIGN(start)),
    ], start, true),
    praise: 'Du hast beide Änderungen zurückgerechnet.',
    srText: say(context, scene.askStart),
    kmk: ['PK.problemloesen'],
  };
}

const FORMS: Record<Stufe, (rng: Rng, ab: Ab) => Form> = {
  1: stufe1,
  2: stufe2,
  3: (rng, ab) => (ab === 1 ? amountForm(rng) : ab === 2 ? (rng.chance(0.5) ? signedChange(rng) : startForm(rng)) : startAfterTwo(rng)),
};

export const aenderungSkill: SkillDef = {
  ...SKILL,
  title: 'Zustand und Änderung',
  description: 'Du rechnest aus, wie sich ein Stand ändert.',
  stufen: { 1: 'Start und Änderung bis 20, ohne Weg über die 0', 2: 'Über die 0: −3 °C, 5 Grad wärmer', 3: 'Die Änderung oder den Start finden' },
  kmk: [...KMK_ZAHLEN, 'PK.modellieren', 'PK.problemloesen'],
  keys: { minus: true },
  generate(rng, stufe, ctx) {
    const ab = targetAb(rng, stufe, ctx);
    return assemble(SKILL, stufe, ab, [...KMK_ZAHLEN, 'PK.modellieren'], FORMS[stufe](rng, ab));
  },
};
