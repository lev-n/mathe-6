/**
 * Mal und Geteilt mit negativen Zahlen (docs/research.md §6). Stufe 1: a negative number times a natural number, factors ≤ 10. Stufe 2: two negative factors, a : (−b), integers. Stufe 3: decimals, fractions, three
 * factors. Hints name the step and §7.2 keeps out catchphrases. The comma and ± keys stay on for the whole skill, so neither gives anything away.
 */
import { BOX, fmt, frac, MINUS } from '../../core/format';
import type { Ab, Bug, Rng, SkillDef, Stufe } from '../../core/types';
import { numberBugs, targetAb } from '../shared';
import { assemble, bug, calcNumber, clean, type FractionSlip, type Form, fromUnits, isWhole, jumpLabel, KMK_RATIONAL, KMK_RECHNEN, lineAround, rat, type Rat, ratAnswer, ratBugs, ratDiv, ratMul, ratNeg, ratTerm, say } from './helpers';

const SKILL = { id: 'negativ.mal-geteilt', topicId: 'negativ' } as const;

/** A factor in a term: a negative one in brackets, (−3) · (−4) (§5). */
const factor = (x: number) => (x < 0 ? `(${fmt(x)})` : fmt(x));

const TWO_NEGATIVE = 'Zwei negative Faktoren ergeben ein positives Produkt.';
const ONE_NEGATIVE = 'Ein negativer Faktor ergibt ein negatives Produkt.';
const DIVISION_CHECK = 'Prüfe mit der Malaufgabe: Quotient mal Teiler ergibt die erste Zahl.';
const HINT_SIGN_LATER = 'Rechne zuerst ohne Vorzeichen. Bestimme dann das Vorzeichen.';

const signRule = (negatives: number) => (negatives % 2 === 0 ? (negatives === 0 ? 'Kein negativer Faktor: Das Ergebnis ist positiv.' : `${negatives} negative Faktoren: Das Ergebnis ist positiv.`) : `${negatives === 1 ? 'Ein negativer Faktor' : `${negatives} negative Faktoren`}: Das Ergebnis ist negativ.`);

// ─── Whole numbers ───────────────────────────────────────────────────────────

function productBugs(x: number, y: number): Bug[] {
  const r = x * y;
  return numberBugs([
    bug('produkt-vorzeichen', -r, x < 0 && y < 0 ? TWO_NEGATIVE : ONE_NEGATIVE),
    bug('plus-statt-mal', x + y, 'Hier steht ein Malpunkt. Rechne mal, nicht plus.'),
  ], r, true);
}

function repeated(n: number, v: number): string {
  return Array.from({ length: n }, () => factor(v)).join(' + ');
}

/** Stufe 1: a natural number of equal negative steps. */
function timesNatural(a: number, b: number, form: string, hints: string[], praise: string, showWalk: boolean): Form {
  const prompt = 'Rechne.';
  const firstNegative = a < 0;
  const expression = `${factor(a)} · ${factor(b)} = ${BOX}`;
  const n = firstNegative ? b : a;
  const v = firstNegative ? a : b;
  const r = a * b;
  const jumps = Array.from({ length: n }, (_, i) => ({ from: i * v, to: (i + 1) * v, ...(i === 0 ? { label: jumpLabel(v) } : {}) }));
  return {
    key: `${form}:${a}:${b}`,
    prompt,
    expression,
    answer: calcNumber(r),
    hints,
    steps: [
      showWalk ? { text: `${n} · ${factor(v)} = ${repeated(n, v)}`, visual: lineAround([0, r], { jumps }) } : `Ohne Vorzeichen: ${n} · ${-v} = ${n * -v}`,
      showWalk ? `Du gehst ${n}-mal ${-v} nach links.` : signRule(1),
      `${factor(a)} · ${factor(b)} = ${fmt(r)}`,
    ],
    bugs: productBugs(a, b),
    praise,
    srText: say(prompt, expression),
  };
}

/** A factor missing from a product or a number missing from a quotient, with the Probe. */
function missingFactor(x: number, y: number, gap: 'x' | 'y', form: string, praise: string): Form {
  const r = x * y;
  const value = gap === 'x' ? x : y;
  const prompt = 'Welche Zahl gehört in die Lücke?';
  const expression = gap === 'x' ? `${BOX} · ${factor(y)} = ${fmt(r)}` : `${factor(x)} · ${BOX} = ${fmt(r)}`;
  const given = gap === 'x' ? y : x;
  return {
    key: `${form}:${gap}:${x}:${y}`,
    prompt,
    expression,
    answer: calcNumber(value),
    hints: [HINT_SIGN_LATER, 'Mach die Probe mit der Zahl in der Lücke.'],
    steps: [`Ohne Vorzeichen: ${Math.abs(r)} : ${Math.abs(given)} = ${Math.abs(value)}`, `Probe: ${factor(x)} · ${factor(y)} = ${fmt(r)}`, `In die Lücke gehört ${fmt(value)}.`],
    bugs: numberBugs([bug('produkt-vorzeichen', -value, 'Mach die Probe. Ist deine Zahl positiv oder negativ?')], value, true),
    praise,
    srText: say(prompt, expression),
  };
}

function quotient(a: number, b: number, form: string, hints: string[], praise: string): Form {
  const prompt = 'Rechne.';
  const expression = `${factor(a)} : ${factor(b)} = ${BOX}`;
  const r = a / b;
  return {
    key: `${form}:${a}:${b}`,
    prompt,
    expression,
    answer: calcNumber(r),
    hints,
    steps: [`Ohne Vorzeichen: ${Math.abs(a)} : ${Math.abs(b)} = ${Math.abs(r)}`, `Probe: ${factor(r)} · ${factor(b)} = ${fmt(a)}`, `${factor(a)} : ${factor(b)} = ${fmt(r)}`],
    bugs: numberBugs([
      bug('produkt-vorzeichen', -r, DIVISION_CHECK),
      bug('rechenart', a * b, 'Hier steht ein Doppelpunkt. Rechne geteilt, nicht mal.'),
    ], r, true),
    praise,
    srText: say(prompt, expression),
  };
}

function product(a: number, b: number, form: string, praise: string): Form {
  const prompt = 'Rechne.';
  const expression = `${factor(a)} · ${factor(b)} = ${BOX}`;
  const r = a * b;
  return {
    key: `${form}:${a}:${b}`,
    prompt,
    expression,
    answer: calcNumber(r),
    hints: [HINT_SIGN_LATER, TWO_NEGATIVE],
    steps: [`Ohne Vorzeichen: ${Math.abs(a)} · ${Math.abs(b)} = ${Math.abs(r)}`, signRule(a < 0 && b < 0 ? 2 : 1), `${factor(a)} · ${factor(b)} = ${fmt(r)}`],
    bugs: productBugs(a, b),
    praise,
    srText: say(prompt, expression),
  };
}

// ─── Stufe 1 ─────────────────────────────────────────────────────────────────

function stufe1(rng: Rng, ab: Ab): Form {
  const order = (n: number, v: number): [number, number] => (rng.chance(0.5) ? [n, v] : [v, n]);
  if (ab === 1) {
    const [a, b] = order(rng.int(2, 5), -rng.int(2, 6));
    return timesNatural(a, b, 'kurz', ['Schreib es als Summe mit gleichen Zahlen.', 'Du gehst immer gleich weit nach links.'], 'Du hast die Malaufgabe als Summe gelesen.', true);
  }
  if (ab === 2) {
    const [a, b] = order(rng.int(4, 10), -rng.int(4, 10));
    return timesNatural(a, b, 'gross', [HINT_SIGN_LATER, ONE_NEGATIVE], 'Du hast zuerst die Zahl und dann das Vorzeichen bestimmt.', false);
  }
  const n = rng.int(2, 10);
  const v = -rng.int(2, 10);
  const [x, y] = order(n, v);
  return missingFactor(x, y, rng.chance(0.5) ? 'x' : 'y', 'luecke', 'Du hast mit der Probe geprüft.');
}

// ─── Stufe 2 ─────────────────────────────────────────────────────────────────

function stufe2(rng: Rng, ab: Ab): Form {
  if (ab === 1) {
    if (rng.chance(0.5)) return product(-rng.int(2, 10), -rng.int(2, 10), 'zwei-negative', 'Du hast das Vorzeichen des Produkts bestimmt.');
    const b = -rng.int(2, 9);
    const q = rng.int(2, 9) * (rng.chance(0.5) ? -1 : 1);
    return quotient(q * b, b, 'geteilt', [HINT_SIGN_LATER, DIVISION_CHECK], 'Du hast das Vorzeichen mit der Malaufgabe geprüft.');
  }
  if (ab === 2) {
    if (rng.chance(0.5)) return product(-rng.int(11, 25), -rng.int(3, 9), 'gross', 'Du hast die Zahl und das Vorzeichen getrennt bestimmt.');
    const b = -rng.int(3, 12);
    const q = rng.int(6, 25) * (rng.chance(0.5) ? -1 : 1);
    return quotient(q * b, b, 'gross-geteilt', [HINT_SIGN_LATER, DIVISION_CHECK], 'Du hast das Vorzeichen mit der Malaufgabe geprüft.');
  }
  const x = -rng.int(2, 12);
  const y = -rng.int(2, 12);
  if (rng.chance(0.5)) return missingFactor(x, y, rng.chance(0.5) ? 'x' : 'y', 'luecke-negativ', 'Du hast die negative Zahl mit der Probe gefunden.');
  // □ : (−b) = q: the dividend from a Malaufgabe
  const q = rng.int(2, 9) * (rng.chance(0.5) ? -1 : 1);
  const value = q * y;
  const prompt = 'Welche Zahl gehört in die Lücke?';
  const expression = `${BOX} : ${factor(y)} = ${fmt(q)}`;
  return {
    key: `dividend:${y}:${q}`,
    prompt,
    expression,
    answer: calcNumber(value),
    hints: ['Rechne mit der Umkehraufgabe: Hier passt eine Malaufgabe.', 'Mach die Probe mit der Zahl in der Lücke.'],
    steps: [`Umkehraufgabe: ${factor(q)} · ${factor(y)} = ${fmt(value)}`, `Probe: ${factor(value)} : ${factor(y)} = ${fmt(q)}`, `In die Lücke gehört ${fmt(value)}.`],
    bugs: numberBugs([bug('produkt-vorzeichen', -value, DIVISION_CHECK)], value, true),
    praise: 'Du hast die Umkehraufgabe genutzt.',
    srText: say(prompt, expression),
  };
}

// ─── Stufe 3: decimals, fractions, three factors ─────────────────────────────

/** Signs of two numbers, one or both negative: the sign of the result stays the child's decision on every form. */
const twoSigns = (rng: Rng): [number, number] => rng.pick<[number, number]>([[-1, 1], [1, -1], [-1, -1]]);

/** Signs of three factors, one, two or all negative. */
function threeSigns(rng: Rng): [number, number, number] {
  for (;;) {
    const [x, y, z] = [rng.chance(0.5) ? -1 : 1, rng.chance(0.5) ? -1 : 1, rng.chance(0.5) ? -1 : 1];
    if (x < 0 || y < 0 || z < 0) return [x, y, z];
  }
}

/** A product with decimals. Tenths in, hundredths out, so no float decides anything. */
function decimalProduct(aUnits: number, aPlaces: number, bUnits: number, bPlaces: number, form: string, praise: string): Form {
  const a = fromUnits(aUnits, aPlaces);
  const b = fromUnits(bUnits, bPlaces);
  const r = fromUnits(aUnits * bUnits, aPlaces + bPlaces);
  const prompt = 'Rechne.';
  const expression = `${factor(a)} · ${factor(b)} = ${BOX}`;
  const negatives = (a < 0 ? 1 : 0) + (b < 0 ? 1 : 0);
  return {
    key: `${form}:${aUnits}:${aPlaces}:${bUnits}:${bPlaces}`,
    prompt,
    expression,
    answer: calcNumber(r),
    hints: [HINT_SIGN_LATER, 'Zähle die Stellen nach dem Komma in beiden Faktoren zusammen.'],
    steps: [`Ohne Vorzeichen: ${fmt(Math.abs(a))} · ${fmt(Math.abs(b))} = ${fmt(Math.abs(r))}`, signRule(negatives), `${factor(a)} · ${factor(b)} = ${fmt(r)}`],
    bugs: numberBugs([
      bug('produkt-vorzeichen', clean(-r), negatives === 2 ? TWO_NEGATIVE : ONE_NEGATIVE),
      bug('komma-stellen', clean(r * 10), 'Zähle die Stellen nach dem Komma in beiden Faktoren zusammen.'),
      Number.isInteger(clean(r * 100)) && bug('komma-stellen', clean(r / 10), 'Zähle die Stellen nach dem Komma in beiden Faktoren zusammen.'),
    ], r, true),
    praise,
    srText: say(prompt, expression),
    kmk: KMK_RATIONAL,
  };
}

function decimalQuotient(rUnits: number, rPlaces: number, bUnits: number, bPlaces: number, form: string, praise: string): Form {
  const r = fromUnits(rUnits, rPlaces);
  const b = fromUnits(bUnits, bPlaces);
  const a = fromUnits(rUnits * bUnits, rPlaces + bPlaces);
  const prompt = 'Rechne.';
  const expression = `${factor(a)} : ${factor(b)} = ${BOX}`;
  const shifted = bPlaces > 0;
  return {
    key: `${form}:${rUnits}:${rPlaces}:${bUnits}:${bPlaces}`,
    prompt,
    expression,
    answer: calcNumber(r),
    hints: [shifted ? 'Verschiebe das Komma bei beiden Zahlen. Rechne dann ohne Vorzeichen.' : HINT_SIGN_LATER, DIVISION_CHECK],
    steps: [`Ohne Vorzeichen: ${fmt(Math.abs(a))} : ${fmt(Math.abs(b))} = ${fmt(Math.abs(r))}`, `Probe: ${factor(r)} · ${factor(b)} = ${fmt(a)}`, `${factor(a)} : ${factor(b)} = ${fmt(r)}`],
    bugs: numberBugs([
      bug('produkt-vorzeichen', clean(-r), DIVISION_CHECK),
      shifted && bug('komma-nicht-verschoben', clean(r / 10), `Wie oft passt ${fmt(Math.abs(b))} in ${fmt(Math.abs(a))}? Verschiebe das Komma bei beiden Zahlen.`),
    ], r, true),
    praise,
    srText: say(prompt, expression),
    kmk: KMK_RATIONAL,
  };
}

/** A part of a whole, above 0 and below 1. */
const proper = (rng: Rng, d: number): Rat => rat(rng.int(1, d - 1), d);

const slip = (id: string, value: Rat | { n: number; d: number }, hint: string): FractionSlip => ({ id, numerator: Math.abs(value.n), denominator: value.d, negative: value.n < 0, hint });

function fractionProduct(a: Rat, b: Rat, form: string, praise: string): Form {
  const r = ratMul(a, b);
  const prompt = 'Rechne.';
  const expression = `${ratTerm(a)} · ${ratTerm(b)} = ${BOX}`;
  const negatives = (a.n < 0 ? 1 : 0) + (b.n < 0 ? 1 : 0);
  return {
    key: `${form}:${a.n}:${a.d}:${b.n}:${b.d}`,
    prompt,
    expression,
    answer: ratAnswer(r),
    hints: ['Zähler mal Zähler, Nenner mal Nenner.', HINT_SIGN_LATER],
    steps: [`Ohne Vorzeichen: ${Math.abs(a.n)} · ${Math.abs(b.n)} im Zähler, ${a.d} · ${b.d} im Nenner.`, signRule(negatives), `${ratTerm(a)} · ${ratTerm(b)} = ${resultText(r)}`],
    bugs: ratBugs([
      a.d === b.d && slip('nenner-bleibt', { n: a.n * b.n, d: a.d }, 'Beim Malnehmen gilt: Zähler mal Zähler, Nenner mal Nenner.'),
      slip('bruch-addiert', { n: (r.n < 0 ? -1 : 1) * (Math.abs(a.n) + Math.abs(b.n)), d: a.d + b.d }, 'Hier steht ein Malpunkt. Rechne Zähler mal Zähler, Nenner mal Nenner.'),
    ].filter((s): s is FractionSlip => !!s), r),
    praise,
    srText: say(prompt, expression),
    kmk: KMK_RATIONAL,
  };
}

function fractionQuotient(a: Rat, b: Rat, form: string, praise: string): Form {
  const r = ratDiv(a, b);
  const prompt = 'Rechne.';
  const expression = `${ratTerm(a)} : ${ratTerm(b)} = ${BOX}`;
  // as the swap gives it, Zähler and Nenner on each other's place: 3/2, never 1 1/2, and 2/1, never 2
  const flipped = `${b.n < 0 ? MINUS : ''}${frac(b.d, Math.abs(b.n))}`;
  return {
    key: `${form}:${a.n}:${a.d}:${b.n}:${b.d}`,
    prompt,
    expression,
    answer: ratAnswer(r),
    hints: ['Nimm den Kehrwert der zweiten Zahl und rechne mal.', HINT_SIGN_LATER],
    steps: [`Kehrwert der zweiten Zahl: ${flipped}`, `${ratTerm(a)} · ${b.n < 0 ? `(${flipped})` : flipped} = ${resultText(r)}`, `${ratTerm(a)} : ${ratTerm(b)} = ${resultText(r)}`],
    bugs: ratBugs([
      slip('kehrwert-erste', { n: a.d * b.n * Math.sign(a.n), d: Math.abs(a.n) * b.d }, 'Du nimmst den Kehrwert der zweiten Zahl, nicht der ersten.'),
      slip('kehrwert-fehlt', { n: a.n * b.n, d: a.d * b.d }, 'Teilen heißt: mit dem Kehrwert der zweiten Zahl malnehmen.'),
    ], r),
    praise,
    srText: say(prompt, expression),
    kmk: KMK_RATIONAL,
  };
}

/** The value of a product of fractions, as a child writes it. */
function resultText(r: Rat): string {
  const t = ratTerm(r);
  return t.startsWith('(') ? t.slice(1, -1) : t;
}

function threeIntegers(x: number, y: number, z: number, form: string): Form {
  const r = x * y * z;
  // the sign is counted first, so no order of the factors is asked for
  const prompt = 'Rechne.';
  const shown = `${factor(x)} · ${factor(y)} · ${factor(z)}`;
  const expression = `${shown} = ${BOX}`;
  const negatives = [x, y, z].filter((v) => v < 0).length;
  return {
    key: `${form}:${x}:${y}:${z}`,
    prompt,
    expression,
    answer: calcNumber(r),
    hints: ['Zähle die negativen Faktoren. Ihre Anzahl bestimmt das Vorzeichen.', 'Rechne dann ohne Vorzeichen.'],
    steps: [`Ohne Vorzeichen: ${Math.abs(x)} · ${Math.abs(y)} · ${Math.abs(z)} = ${Math.abs(r)}`, signRule(negatives), `${shown} = ${fmt(r)}`],
    bugs: numberBugs([bug('produkt-vorzeichen', -r, 'Zähle die negativen Faktoren. Ihre Anzahl bestimmt das Vorzeichen.')], r, true),
    praise: 'Du hast die negativen Faktoren gezählt.',
    srText: say(prompt, expression),
  };
}

function threeDecimals(rng: Rng): Form {
  const [sa, sb, sc] = threeSigns(rng);
  const aUnits = sa * rng.pick([5, 15, 25, 12]);
  const b = sb * rng.pick([2, 4, 8]);
  const cUnits = sc * rng.int(2, 9);
  const a = fromUnits(aUnits, 1);
  const c = fromUnits(cUnits, 1);
  const r = fromUnits(aUnits * b * cUnits, 2);
  const shown = `${factor(a)} · ${factor(b)} · ${factor(c)}`;
  const negatives = [a, b, c].filter((v) => v < 0).length;
  const prompt = 'Rechne.';
  return {
    key: `drei-komma:${aUnits}:${b}:${cUnits}`,
    prompt,
    expression: `${shown} = ${BOX}`,
    answer: calcNumber(r),
    hints: ['Zähle die negativen Faktoren. Ihre Anzahl bestimmt das Vorzeichen.', 'Rechne dann ohne Vorzeichen, Schritt für Schritt.'],
    steps: [`Ohne Vorzeichen: ${fmt(Math.abs(a))} · ${Math.abs(b)} · ${fmt(Math.abs(c))} = ${fmt(Math.abs(r))}`, signRule(negatives), `${shown} = ${fmt(r)}`],
    bugs: numberBugs([
      bug('produkt-vorzeichen', clean(-r), 'Zähle die negativen Faktoren. Ihre Anzahl bestimmt das Vorzeichen.'),
      bug('komma-stellen', clean(r * 10), 'Zähle die Stellen nach dem Komma in allen Faktoren zusammen.'),
    ], r, true),
    praise: 'Du hast Stellen und negative Faktoren gezählt.',
    srText: say(prompt, `${shown} = ${BOX}`),
    kmk: KMK_RATIONAL,
  };
}

function missingDecimal(rng: Rng): Form {
  const aUnits = -rng.pick([2, 4, 5, 15, 25]);
  const v = rng.int(2, 9) * (rng.chance(0.5) ? -1 : 1);
  const a = fromUnits(aUnits, 1);
  const r = fromUnits(aUnits * v, 1);
  const prompt = 'Welche Zahl gehört in die Lücke?';
  const expression = `${factor(a)} · ${BOX} = ${fmt(r)}`;
  return {
    key: `komma-luecke:${aUnits}:${v}`,
    prompt,
    expression,
    answer: calcNumber(v),
    hints: ['Verschiebe das Komma bei beiden Zahlen. Rechne dann ohne Vorzeichen.', 'Mach die Probe mit der Zahl in der Lücke.'],
    steps: [`Ohne Vorzeichen: ${fmt(Math.abs(r))} : ${fmt(Math.abs(a))} = ${Math.abs(v)}`, `Probe: ${factor(a)} · ${factor(v)} = ${fmt(r)}`, `In die Lücke gehört ${fmt(v)}.`],
    bugs: numberBugs([bug('produkt-vorzeichen', -v, 'Mach die Probe. Ist deine Zahl positiv oder negativ?')], v, true),
    praise: 'Du hast mit der Probe geprüft.',
    srText: say(prompt, expression),
    kmk: KMK_RATIONAL,
  };
}

function threeFractions(rng: Rng): Form {
  let a: Rat;
  let b: Rat;
  let c: Rat;
  let r: Rat;
  const signed = (x: Rat, sign: number) => (sign < 0 ? ratNeg(x) : x);
  const [sa, sb, sc] = threeSigns(rng);
  do {
    a = signed(proper(rng, rng.pick([2, 4, 5])), sa);
    b = signed(proper(rng, rng.pick([2, 3, 4])), sb);
    c = signed(proper(rng, rng.pick([3, 5, 6])), sc);
    r = ratMul(ratMul(a, b), c);
  } while (isWhole(r));
  const shown = `${ratTerm(a)} · ${ratTerm(b)} · ${ratTerm(c)}`;
  const prompt = 'Rechne.';
  return {
    key: `drei-bruch:${a.n}:${a.d}:${b.n}:${b.d}:${c.n}:${c.d}`,
    prompt,
    expression: `${shown} = ${BOX}`,
    answer: ratAnswer(r),
    hints: ['Zähle zuerst die negativen Faktoren.', 'Zähler mal Zähler, Nenner mal Nenner. Kürze am Ende.'],
    steps: [signRule([a, b, c].filter((v) => v.n < 0).length), `Zähler: ${Math.abs(a.n)} · ${Math.abs(b.n)} · ${Math.abs(c.n)}, Nenner: ${a.d} · ${b.d} · ${c.d}`, `${shown} = ${resultText(r)}`],
    praise: 'Du hast Vorzeichen und Bruch getrennt gerechnet.',
    srText: say(prompt, `${shown} = ${BOX}`),
    kmk: KMK_RATIONAL,
  };
}

function stufe3(rng: Rng, ab: Ab): Form {
  if (ab === 1) {
    const kind = rng.int(0, 2);
    if (kind === 0) {
      const units = rng.pick([5, 15, 25, 12, 24]);
      const n = rng.int(2, 8);
      const [su, sn] = twoSigns(rng);
      return rng.chance(0.5)
        ? decimalProduct(su * units, 1, sn * n, 0, 'komma-mal', 'Du hast Komma und Vorzeichen beachtet.')
        : decimalProduct(sn * n, 0, su * units, 1, 'komma-mal', 'Du hast Komma und Vorzeichen beachtet.');
    }
    if (kind === 1) {
      const [sr, sb] = twoSigns(rng);
      return decimalQuotient(sr * rng.pick([2, 3, 4, 5, 6, 7, 8, 9, 12, 15, 25]), 1, sb * rng.int(2, 6), 0, 'komma-geteilt', 'Du hast das Vorzeichen mit der Malaufgabe geprüft.');
    }
    // with the same Nenner in part of the items: there the wrong rule keeps it
    const d = rng.pick([3, 5, 7]);
    const other = rng.chance(0.4) ? d : rng.pick([2, 3, 4, 5]);
    const [sa, sb] = twoSigns(rng);
    return fractionProduct(rat(sa * rng.int(1, d - 1), d), rat(sb * rng.int(1, other - 1), other), 'bruch-mal', 'Du hast Zähler und Nenner mit Vorzeichen gerechnet.');
  }
  if (ab === 2) {
    const kind = rng.int(0, 3);
    if (kind === 0) {
      const [sa, sb] = twoSigns(rng);
      return decimalProduct(sa * rng.pick([15, 25, 12, 35]), 1, sb * rng.int(2, 9), 1, 'komma-negativ', 'Du hast die Stellen und beide Vorzeichen beachtet.');
    }
    if (kind === 1) return decimalQuotient(rng.int(2, 9) * (rng.chance(0.5) ? -1 : 1), 0, -rng.int(2, 9), 1, 'komma-teiler', 'Du hast das Komma bei beiden Zahlen verschoben.');
    if (kind === 2) {
      // the product is at least what two factors reach on Stufe 2 AB II
      const [sx, sy, sz] = threeSigns(rng);
      for (;;) {
        const [x, y, z] = [rng.int(3, 9), rng.int(2, 6), rng.int(2, 6)];
        if (x * y * z >= 36) return threeIntegers(sx * x, sy * y, sz * z, 'drei');
      }
    }
    const [sa, sb] = twoSigns(rng);
    let a: Rat;
    let b: Rat;
    do {
      const pa = proper(rng, rng.pick([4, 5, 8]));
      const pb = proper(rng, rng.pick([2, 3, 5]));
      a = sa < 0 ? ratNeg(pa) : pa;
      b = sb < 0 ? ratNeg(pb) : pb;
    } while (isWhole(ratDiv(a, b)));
    return fractionQuotient(a, b, 'bruch-geteilt', 'Du hast den Kehrwert der zweiten Zahl genommen.');
  }
  const kind = rng.int(0, 2);
  if (kind === 0) return threeDecimals(rng);
  if (kind === 1) return threeFractions(rng);
  return missingDecimal(rng);
}

const FORMS: Record<Stufe, (rng: Rng, ab: Ab) => Form> = { 1: stufe1, 2: stufe2, 3: stufe3 };

export const malGeteiltSkill: SkillDef = {
  ...SKILL,
  title: 'Mal und Geteilt mit negativen Zahlen',
  description: 'Du nimmst mal und teilst und findest das Vorzeichen.',
  stufen: { 1: 'Negative Zahl mal natürliche Zahl, Faktoren bis 10', 2: 'Zwei negative Faktoren; a : (−b), ganze Zahlen', 3: 'Dezimalzahlen und Brüche; drei Faktoren' },
  kmk: [...KMK_RECHNEN, ...KMK_RATIONAL],
  keys: { minus: true, comma: true, mixed: true },
  generate(rng, stufe, ctx) {
    const ab = targetAb(rng, stufe, ctx);
    return assemble(SKILL, stufe, ab, KMK_RECHNEN, FORMS[stufe](rng, ab));
  },
};

