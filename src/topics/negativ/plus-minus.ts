/**
 * Plus und Minus mit negativen Zahlen (docs/research.md §6). Stufe 1: a ± b with b positive, integers ≤ 50. Stufe 2: a + (−b), a − (−b), integers ≤ 50. Stufe 3: decimals and fractions ≤ 10, with signs. The hints
 * walk on the Zahlengerade instead of a rule on its own (§7.2). The comma and ± keys stay on for the whole skill, so neither gives anything away.
 */
import { BOX, fmt, fmtSigned, frac, MINUS } from '../../core/format';
import type { Ab, Bug, Rng, SkillDef, Stufe } from '../../core/types';
import { numberBugs, targetAb } from '../shared';
import { apply, assemble, bug, calcNumber, clean, type FractionSlip, type Form, fromUnits, isWhole, jumpLabel, KMK_RATIONAL, KMK_RECHNEN, lineAround, type Op, rat, type Rat, ratAdd, ratAnswer, ratBugs, ratNeg, ratSub, ratTerm, ratText, rightLeft, say, term, toZeroAndRest } from './helpers';

const SKILL = { id: 'negativ.plus-minus', topicId: 'negativ' } as const;

const OPPOSITE_RULE = 'Eine negative Zahl abziehen heißt: die Gegenzahl addieren.';

const HINT_WALK = ['Starte bei der ersten Zahl auf der Zahlengeraden.', 'Plus geht nach rechts, minus nach links.'];
const hintSecond = (op: Op) => (op === '+' ? ['Plus eine negative Zahl: Du gehst nach links.', 'Schreib es kürzer, ohne die Klammer.'] : [OPPOSITE_RULE, 'Minus einer negativen Zahl: Du gehst nach rechts.']);

function calcBugs(a: number, op: Op, b: number): Bug[] {
  const r = apply(a, op, b);
  const move = op === '+' ? b : -b;
  const crossing = a * r < 0;
  return numberBugs([
    op === '−' && b < 0 && bug('zeichen-verwechselt', apply(a, '+', b), OPPOSITE_RULE),
    op === '+' && b < 0 && bug('zeichen-verwechselt', apply(a, '−', b), 'Plus eine negative Zahl heißt: nach links gehen.'),
    a < 0 && crossing && bug('ueber-null', clean(-a + move), `Geh von ${fmt(a)} zuerst bis 0. Wie viele Schritte bleiben dann?`),
    a > 0 && crossing && bug('ueber-null', clean(-(a - move)), `Geh von ${fmt(a)} zuerst bis 0. Wie viele Schritte bleiben dann?`),
    a < 0 && !crossing && bug('vorzeichen-ignoriert', clean(-a + move), `Du startest links von der 0, bei ${fmt(a)}.`),
    b > 0 && bug('minus-richtung', clean(a - move), `${op === '+' ? 'Plus' : 'Minus'} ${fmt(b)} heißt: ${fmt(b)} nach ${rightLeft(move)} auf der Zahlengeraden.`),
    bug('vorzeichen-vergessen', clean(-r), 'Schau auf das Ergebnis: Liegt es links oder rechts von der 0?'),
  ], r, true);
}

function calcSteps(a: number, op: Op, b: number, withLine: boolean): Form['steps'] {
  const r = apply(a, op, b);
  const move = op === '+' ? b : -b;
  const crossing = a * r < 0;
  const walkText = `Starte bei ${fmt(a)}. Geh ${fmt(Math.abs(move))} nach ${rightLeft(move)}.`;
  return [
    ...(b < 0 ? [`${term(a, op, b)} = ${fmt(a)} ${move > 0 ? '+' : MINUS} ${fmt(Math.abs(move))}`] : []),
    withLine ? { text: walkText, visual: lineAround([a, r], { jumps: [{ from: a, to: r, label: jumpLabel(move) }] }) } : walkText,
    ...(crossing ? [toZeroAndRest(a, r)] : []),
    `${term(a, op, b)} = ${fmt(r)}`,
  ];
}

function calcForm(a: number, op: Op, b: number, form: string, hints: string[], praise: string, decimals = false): Form {
  const prompt = 'Rechne.';
  const expression = `${term(a, op, b)} = ${BOX}`;
  return {
    key: `${form}:${a}:${op === '+' ? 'p' : 'm'}:${b}`,
    prompt,
    expression,
    answer: calcNumber(apply(a, op, b)),
    hints,
    steps: calcSteps(a, op, b, !decimals),
    bugs: calcBugs(a, op, b),
    praise,
    srText: say(prompt, expression),
    ...(decimals ? { kmk: KMK_RATIONAL } : {}),
  };
}

/**
 * A gap in the term. `count`: the distance from the first number to the result, on Stufe 1, where no minus with a negative number has come yet.
 */
function missing(a: number, op: Op, b: number, gap: 'a' | 'b', form: string, count: boolean, praise: string, decimals = false): Form {
  const r = apply(a, op, b);
  const value = gap === 'a' ? a : b;
  const prompt = 'Welche Zahl gehört in die Lücke?';
  const expression = gap === 'a' ? `${BOX} ${op} ${fmtSigned(b)} = ${fmt(r)}` : `${fmt(a)} ${op} ${BOX} = ${fmt(r)}`;
  const inverse: Op = op === '+' ? '−' : '+';
  const first = gap === 'a'
    ? `Umkehraufgabe: ${term(r, inverse, b)} = ${fmt(value)}`
    : count
      ? `Von ${fmt(a)} bis ${fmt(r)} sind es ${fmt(value)} nach ${rightLeft(r - a)}.`
      : op === '+' ? `Umkehraufgabe: ${term(r, '−', a)} = ${fmt(value)}` : `Umkehraufgabe: ${term(a, '−', r)} = ${fmt(value)}`;
  return {
    key: `${form}:${gap}:${a}:${op === '+' ? 'p' : 'm'}:${b}`,
    prompt,
    expression,
    answer: calcNumber(value),
    hints: [count && gap === 'b' ? 'Wie weit ist es von der ersten Zahl bis zum Ergebnis?' : 'Rechne mit der Umkehraufgabe.', 'Mach die Probe: Setz deine Zahl in die Lücke.'],
    steps: [first, `Probe: ${term(a, op, b)} = ${fmt(r)}`, `In die Lücke gehört ${fmt(value)}.`],
    bugs: numberBugs([
      gap === 'a' && bug('umkehr-gleiche', apply(r, op, b), b > 0 ? `Die Umkehrung von ${op === '+' ? 'plus' : 'minus'} ${fmt(b)} ist ${op === '+' ? 'minus' : 'plus'} ${fmt(b)}.` : 'Mach die Probe. Was hebt diese Rechnung auf?'),
      gap === 'b' && bug('vorzeichen-ignoriert', op === '+' ? clean(r - Math.abs(a)) : clean(Math.abs(a) - r), 'Mach die Probe. Achte bei der ersten Zahl auf das Vorzeichen.'),
      bug('vorzeichen-vergessen', clean(-value), 'Mach die Probe. Ist deine Zahl positiv oder negativ?'),
    ], value, true),
    praise,
    srText: say(prompt, expression),
    ...(decimals ? { kmk: KMK_RATIONAL } : {}),
  };
}

// ─── Stufe 1: b positive ─────────────────────────────────────────────────────

function stufe1(rng: Rng, ab: Ab): Form {
  if (ab === 1) {
    const a = -rng.int(3, 20);
    const op: Op = rng.chance(0.5) ? '+' : '−';
    const b = op === '+' ? rng.int(1, -a - 1) : rng.int(1, 20);
    return calcForm(a, op, b, 'direkt', HINT_WALK, 'Du bist von der negativen Zahl aus gegangen.');
  }
  if (ab === 2) {
    if (rng.chance(0.5)) {
      const a = -rng.int(11, 40);
      const r = rng.int(1, 50 + a);
      return calcForm(a, '+', r - a, 'ueber-null', ['Geh zuerst bis zur 0.', 'Geh dann den Rest nach rechts weiter.'], 'Du bist über die 0 hinaus weitergegangen.');
    }
    if (rng.chance(0.5)) {
      const a = rng.int(5, 30);
      const r = -rng.int(3, 20);
      return calcForm(a, '−', a - r, 'ueber-null', ['Geh zuerst bis zur 0.', 'Geh dann den Rest nach links weiter.'], 'Du bist über die 0 hinaus weitergegangen.');
    }
    const a = -rng.int(12, 30);
    return calcForm(a, '−', rng.int(11, 50 + a), 'gross', ['Beide Schritte führen nach links.', 'Zähle die beiden Schritte zusammen. Schreib dann das Minus davor.'], 'Du bist weiter nach links gegangen.');
  }
  const a = -rng.int(3, 25);
  const b = rng.int(2, 25);
  const op: Op = rng.chance(0.65) ? '+' : '−';
  const gap = rng.chance(0.5) ? 'a' : 'b';
  return missing(a, op, b, gap, 'luecke', true, 'Du hast die fehlende Zahl gefunden und geprüft.');
}

// ─── Stufe 2: a negative second number ───────────────────────────────────────

function stufe2(rng: Rng, ab: Ab): Form {
  if (ab === 1) {
    const a = (rng.int(1, 15)) * (rng.chance(0.5) ? -1 : 1);
    const b = -rng.int(2, 15);
    return rng.chance(0.5)
      ? calcForm(a, '+', b, 'plus-negativ', hintSecond('+'), 'Du hast Rechenzeichen und Vorzeichen getrennt gelesen.')
      : calcForm(a, '−', b, 'minus-negativ', hintSecond('−'), 'Du hast die Gegenzahl addiert.');
  }
  if (ab === 2) {
    const a = rng.int(11, 35) * (rng.chance(0.7) ? -1 : 1);
    const op: Op = rng.chance(0.5) ? '+' : '−';
    // the result stays within 50: the room is what is left in the direction of the step
    const room = op === '+' ? 50 + a : 50 - a;
    return calcForm(a, op, -rng.int(11, Math.min(40, room)), 'zwei-negative', hintSecond(op), 'Du hast Rechenzeichen und Vorzeichen getrennt gelesen.');
  }
  const a = rng.int(-20, 20) || 7;
  const b = -rng.int(3, 25);
  const op: Op = rng.chance(0.5) ? '+' : '−';
  return missing(a, op, b, rng.chance(0.5) ? 'a' : 'b', 'luecke-negativ', false, 'Du hast die fehlende Zahl mit der Probe gefunden.');
}

// ─── Stufe 3: decimals and fractions ≤ 10, with signs ────────────────────────

const lcm = (a: number, b: number): number => {
  const gcd = (x: number, y: number): number => (y === 0 ? x : gcd(y, x % y));
  return (a * b) / gcd(a, b);
};

function fractionForm(a: Rat, op: Op, b: Rat, form: string, praise: string): Form {
  const r = op === '+' ? ratAdd(a, b) : ratSub(a, b);
  const d = lcm(a.d, b.d);
  const an = (a.n * d) / a.d;
  const bn = (b.n * d) / b.d;
  const move = op === '+' ? bn : -bn;
  const signedFrac = (n: number) => `${n < 0 ? MINUS : ''}${frac(Math.abs(n), d)}`;
  const raw = op === '+' ? a.n + b.n : a.n - b.n;
  const prompt = 'Rechne.';
  const expression = `${ratText(a)} ${op} ${ratTerm(b)} = ${BOX}`;
  const slip = (id: string, value: number, denominator: number, hint: string): FractionSlip => ({ id, numerator: Math.abs(value), denominator, negative: value < 0, hint });
  return {
    key: `${form}:${a.n}:${a.d}:${op === '+' ? 'p' : 'm'}:${b.n}:${b.d}`,
    prompt,
    expression,
    answer: ratAnswer(r),
    hints: a.d === b.d ? ['Der Nenner bleibt gleich. Rechne nur mit den Zählern.', 'Stell dir die Zähler auf der Zahlengeraden vor.'] : ['Mach zuerst die Nenner gleich.', 'Rechne dann mit den Zählern, wie auf der Zahlengeraden.'],
    steps: [
      ...(a.d === b.d ? [] : [`Gleicher Nenner: ${signedFrac(an)} und ${signedFrac(bn)}`]),
      `Zähler: ${term(an, op, bn)} = ${fmt(an + move)}`,
      `${ratText(a)} ${op} ${ratTerm(b)} = ${ratText(r)}`,
    ],
    bugs: ratBugs([
      op === '−' && b.n < 0 && slip('zeichen-verwechselt', an + bn, d, OPPOSITE_RULE),
      slip('zaehler-nenner-addiert', raw, a.d + b.d, a.d === b.d ? 'Der Nenner bleibt gleich. Rechne nur mit den Zählern.' : 'Die Stücke sind verschieden groß. Mach zuerst die Nenner gleich.'),
      a.n < 0 && slip('vorzeichen-ignoriert', -an + move, d, 'Prüfe das Vorzeichen der ersten Zahl.'),
      b.n > 0 && slip('minus-richtung', an - move, d, `Prüfe die Richtung: Hier geht es nach ${rightLeft(move)}.`),
    ].filter((s): s is FractionSlip => !!s), r),
    praise,
    srText: say(prompt, expression),
    kmk: KMK_RATIONAL,
  };
}

function fractionMissing(a: Rat, b: Rat, form: string): Form {
  const r = ratAdd(a, b);
  const prompt = 'Welche Zahl gehört in die Lücke?';
  const expression = `${ratText(a)} + ${BOX} = ${ratText(r)}`;
  return {
    key: `${form}:${a.n}:${a.d}:${b.n}:${b.d}`,
    prompt,
    expression,
    answer: ratAnswer(b),
    hints: ['Rechne mit der Umkehraufgabe: Ergebnis minus erste Zahl.', 'Mach zuerst die Nenner gleich.'],
    steps: [`Umkehraufgabe: ${ratText(r)} − ${ratTerm(a)} = ${ratText(b)}`, `Probe: ${ratText(a)} + ${ratTerm(b)} = ${ratText(r)}`, `In die Lücke gehört ${ratText(b)}.`],
    bugs: ratBugs([
      (() => {
        const wrong = ratAdd(r, a);
        return { id: 'umkehr-gleiche', numerator: Math.abs(wrong.n), denominator: wrong.d, negative: wrong.n < 0, hint: 'Die Umkehrung von plus ist minus.' };
      })(),
    ], b),
    praise: 'Du hast die fehlende Zahl mit der Probe gefunden.',
    srText: say(prompt, expression),
    kmk: KMK_RATIONAL,
  };
}

/** A proper part, not a whole, with denominators that a child can bring together by heart. A part can reduce onto the other Nenner, 2/10 to 1/5, and then the Nenner would be equal already: those fall away. */
function properPair(rng: Rng): [Rat, Rat] {
  for (;;) {
    const [d1, d2] = rng.pick([[2, 4], [2, 3], [3, 4], [2, 6], [3, 6], [4, 8], [2, 5], [5, 10], [4, 3], [6, 4]] as const);
    const x = rat(rng.int(1, d1 - 1), d1);
    const y = rat(rng.int(1, d2 - 1), d2);
    if (x.d !== y.d) return [x, y];
  }
}

/** A value of the term that is no whole and no 0: those have no fraction to write. */
const fractionResult = (r: Rat) => r.n !== 0 && !isWhole(r);

function likeFractions(rng: Rng): Form {
  const d = rng.pick([3, 4, 5, 6, 8, 10]);
  for (;;) {
    const p = rng.int(1, d - 1);
    const q = rng.int(1, d - 1);
    const kind = rng.int(0, 3);
    // kind 2 takes a larger part away: with a smaller one no sign appears anywhere, and the item is a plain Bruch task
    if (kind === 2 && p >= q) continue;
    const a = rat(kind === 2 ? p : -p, d);
    const b = rat(kind === 3 ? -q : q, d);
    const op: Op = kind === 0 ? '+' : kind === 1 ? '−' : kind === 2 ? '−' : '+';
    const r = op === '+' ? ratAdd(a, b) : ratSub(a, b);
    if (fractionResult(r) && a.d === b.d) return fractionForm(a, op, b, 'bruch-gleich', 'Du hast mit den Zählern gerechnet.');
  }
}

function unlikeFractions(rng: Rng): Form {
  for (;;) {
    const [x, y] = properPair(rng);
    // a sign on at least one number, or the item is a plain Bruch task
    const firstNegative = rng.chance(0.7);
    const a = firstNegative ? ratNeg(x) : x;
    const b = !firstNegative || rng.chance(0.5) ? ratNeg(y) : y;
    const op: Op = rng.chance(0.5) ? '+' : '−';
    const r = op === '+' ? ratAdd(a, b) : ratSub(a, b);
    if (fractionResult(r)) return fractionForm(a, op, b, 'bruch-ungleich', 'Du hast zuerst die Nenner gleich gemacht.');
  }
}

function mixedFractions(rng: Rng): Form {
  for (;;) {
    const [x, y] = properPair(rng);
    const a = ratNeg(ratAdd(rat(rng.int(1, 4), 1), x));
    const b = rat(rng.int(1, 4) * y.d + y.n, y.d);
    const op: Op = rng.chance(0.6) ? '+' : '−';
    const r = op === '+' ? ratAdd(a, b) : ratSub(a, b);
    if (fractionResult(r) && Math.abs(r.n) <= 10 * r.d) return fractionForm(a, op, b, 'bruch-gemischt', 'Du hast gemischte Zahlen mit Vorzeichen gerechnet.');
  }
}

function missingFraction(rng: Rng): Form {
  for (;;) {
    const [x, y] = properPair(rng);
    const a = ratNeg(x);
    const b = rng.chance(0.5) ? y : ratNeg(y);
    const r = ratAdd(a, b);
    if (fractionResult(r)) return fractionMissing(a, b, 'bruch-luecke');
  }
}

/** A decimal of one or two places below 5, no whole, so a sum stays within 10: the units count tenths or hundredths. */
function decimal(rng: Rng, places: 1 | 2): number {
  const top = places === 1 ? 49 : 499;
  for (;;) {
    const units = rng.int(places === 1 ? 2 : 11, top);
    if (units % (places === 1 ? 10 : 5) !== 0) return fromUnits(units, places);
  }
}

function threeTerms(rng: Rng): Form {
  const a = -decimal(rng, 1);
  const b = rng.int(2, 4);
  const c = -decimal(rng, 1);
  const mid = apply(a, '+', b);
  const r = apply(mid, '−', c);
  const prompt = 'Rechne von links nach rechts.';
  const expression = `${fmt(a)} + ${b} − ${fmtSigned(c)} = ${BOX}`;
  return {
    key: `drei:${a}:${b}:${c}`,
    prompt,
    expression,
    answer: calcNumber(r),
    hints: ['Rechne zuerst die ersten beiden Zahlen.', OPPOSITE_RULE],
    steps: [`${fmt(a)} + ${b} = ${fmt(mid)}`, `${term(mid, '−', c)} = ${fmt(mid)} + ${fmt(-c)}`, `${fmt(a)} + ${b} − ${fmtSigned(c)} = ${fmt(r)}`],
    bugs: numberBugs([
      bug('zwischenstand', mid, 'Das ist der Stand nach dem ersten Schritt. Rechne auch den zweiten.'),
      bug('zeichen-verwechselt', apply(mid, '+', c), OPPOSITE_RULE),
      bug('vorzeichen-vergessen', clean(-r), 'Schau auf das Ergebnis: Liegt es links oder rechts von der 0?'),
    ], r, true),
    praise: 'Du hast den Term Schritt für Schritt gerechnet.',
    srText: say(prompt, expression),
    kmk: KMK_RATIONAL,
  };
}

function stufe3(rng: Rng, ab: Ab): Form {
  if (ab === 1) {
    if (rng.chance(0.5)) return likeFractions(rng);
    const a = -decimal(rng, 1);
    const op: Op = rng.chance(0.5) ? '+' : '−';
    return calcForm(a, op, decimal(rng, 1), 'komma-eine', ['Starte bei der ersten Zahl. Plus geht nach rechts, minus nach links.', 'Führt der Weg über die 0? Geh zuerst bis 0 und dann weiter.'], 'Du hast Komma und Richtung beachtet.', true);
  }
  if (ab === 2) {
    if (rng.chance(0.5)) return unlikeFractions(rng);
    const a = decimal(rng, 2) * (rng.chance(0.7) ? -1 : 1);
    const b = -decimal(rng, rng.chance(0.5) ? 1 : 2);
    const op: Op = rng.chance(0.5) ? '+' : '−';
    return calcForm(clean(a), op, b, 'komma-zwei', hintSecond(op), 'Du hast die Stellen und die Vorzeichen beachtet.', true);
  }
  const kind = rng.int(0, 3);
  if (kind === 0) return threeTerms(rng);
  if (kind === 1) return mixedFractions(rng);
  if (kind === 2) return missingFraction(rng);
  const a = -decimal(rng, 2);
  const b = decimal(rng, 2);
  return missing(a, '+', b, rng.chance(0.5) ? 'a' : 'b', 'komma-luecke', false, 'Du hast die fehlende Zahl mit der Probe gefunden.', true);
}

const FORMS: Record<Stufe, (rng: Rng, ab: Ab) => Form> = { 1: stufe1, 2: stufe2, 3: stufe3 };

export const plusMinusSkill: SkillDef = {
  ...SKILL,
  title: 'Plus und Minus mit negativen Zahlen',
  description: 'Du addierst und subtrahierst mit positiven und negativen Zahlen.',
  stufen: { 1: 'Plus und minus mit positiver zweiter Zahl, bis 50', 2: 'Negative zweite Zahl: 4 + (−9), 4 − (−9), bis 50', 3: 'Dezimalzahlen und Brüche bis 10, mit Vorzeichen' },
  kmk: [...KMK_RECHNEN, ...KMK_RATIONAL],
  keys: { minus: true, comma: true, mixed: true },
  generate(rng, stufe, ctx) {
    const ab = targetAb(rng, stufe, ctx);
    return assemble(SKILL, stufe, ab, KMK_RECHNEN, FORMS[stufe](rng, ab));
  },
};
