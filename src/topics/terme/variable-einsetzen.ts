/**
 * terme.variable-einsetzen: a number for the letter (F7: variables only as numbers, §5 buchstabe-weg). Stufe 1: 2 · x + 1 with x up to 10. Stufe 2: a value table for x = 1, 2, 3. Stufe 3: decimals, Umfang as a
 * formula. AB varies the demand inside the Stufe: put the number in, a harder term, then back from the value to x. The formula is u = 2 · x + 2 · y: the voice would say the letter a as 'Ar' (src/core/format.ts speak), so only letters that are no unit stand in a term.
 */
import { MINUS, TIMES } from '../../core/format';
import type { Ab, Exercise, MultiField, Rng, SkillDef, Stufe, Visual } from '../../core/types';
import { build, multiBugs, targetAb, type MaybeBug } from '../shared';
import { COMMA_PLACES, commaBugs, commaNumber, n, other, r3, say } from './helpers';

const SKILL = { id: 'terme.variable-einsetzen', topicId: 'terme' } as const;
const KMK = ['SF.variablen'];
const KMK_REASON = ['SF.variablen', 'PK.problemloesen'];

/** A term with x, its value, its worked lines and its typical wrong values. */
interface Term {
  shape: string;
  text: string;
  at: (x: number) => number;
  /** Worked lines for one x. */
  lines: (x: number) => string[];
  /** The term with the number put in. */
  filled: (x: number) => string;
  /** Wrong values for one x, by misconception. */
  concat?: (x: number) => number;
  ignored?: (x: number) => number;
  left?: (x: number) => number;
  klammer?: (x: number) => number;
}

/** 2 · x + 1 said as 23 + 1: the digit next to the letter (§5). */
const glued = (a: number, x: number) => Number(`${a}${x}`);
/** Digits glue only where both numbers are natural: with 1,5 or 2,5 this mistake has no meaning. */
const canGlue = (a: number, x: number) => Number.isInteger(a) && Number.isInteger(x);

function mulPlus(a: number, b: number): Term {
  return {
    shape: 'mal-plus', text: `${n(a)} ${TIMES} x + ${n(b)}`,
    at: (x) => r3(a * x + b),
    filled: (x) => `${n(a)} ${TIMES} ${n(x)} + ${n(b)}`,
    lines: (x) => [`${n(a)} ${TIMES} ${n(x)} = ${n(a * x)}`, `${n(a * x)} + ${n(b)} = ${n(a * x + b)}`],
    concat: (x) => glued(a, x) + b,
    ignored: () => r3(a + b),
  };
}

function mulMinus(a: number, b: number): Term {
  return {
    shape: 'mal-minus', text: `${n(a)} ${TIMES} x ${MINUS} ${n(b)}`,
    at: (x) => r3(a * x - b),
    filled: (x) => `${n(a)} ${TIMES} ${n(x)} ${MINUS} ${n(b)}`,
    lines: (x) => [`${n(a)} ${TIMES} ${n(x)} = ${n(a * x)}`, `${n(a * x)} ${MINUS} ${n(b)} = ${n(a * x - b)}`],
    concat: (x) => glued(a, x) - b,
  };
}

function plusMul(b: number, a: number): Term {
  return {
    shape: 'plus-mal', text: `${n(b)} + ${n(a)} ${TIMES} x`,
    at: (x) => r3(b + a * x),
    filled: (x) => `${n(b)} + ${n(a)} ${TIMES} ${n(x)}`,
    lines: (x) => [`${n(a)} ${TIMES} ${n(x)} = ${n(a * x)}`, `${n(b)} + ${n(a * x)} = ${n(b + a * x)}`],
    left: (x) => r3((b + a) * x),
    concat: (x) => b + glued(a, x),
  };
}

function bracketMul(a: number, b: number): Term {
  return {
    shape: 'klammer', text: `(x + ${n(a)}) ${TIMES} ${n(b)}`,
    at: (x) => r3((x + a) * b),
    filled: (x) => `(${n(x)} + ${n(a)}) ${TIMES} ${n(b)}`,
    lines: (x) => [`${n(x)} + ${n(a)} = ${n(x + a)}`, `${n(x + a)} ${TIMES} ${n(b)} = ${n((x + a) * b)}`],
    klammer: (x) => r3(x + a * b),
  };
}

function square(a: number): Term {
  return {
    shape: 'quadrat', text: `x ${TIMES} x + ${n(a)}`,
    at: (x) => r3(x * x + a),
    filled: (x) => `${n(x)} ${TIMES} ${n(x)} + ${n(a)}`,
    lines: (x) => [`${n(x)} ${TIMES} ${n(x)} = ${n(x * x)}`, `${n(x * x)} + ${n(a)} = ${n(x * x + a)}`],
    // x · x read as 2 · x, the letter counted instead of multiplied
    ignored: (x) => r3(2 * x + a),
  };
}

const EINSETZEN = 'Die Variable steht für eine Zahl. Setze die Zahl ein.';
const gluedHint = (a: number, x: number) => `${n(a)} ${TIMES} x heißt ${n(a)} mal x. Rechne ${n(a)} ${TIMES} ${n(x)}.`;

function termBugs(t: Term, x: number, a: number): MaybeBug[] {
  return [
    t.concat && canGlue(a, x) && { id: 'buchstabe-weg', match: t.concat(x), hint: gluedHint(a, x) },
    t.ignored && { id: 'buchstabe-weg', match: t.ignored(x), hint: EINSETZEN },
    t.left && { id: 'links-nach-rechts', match: t.left(x), hint: `Du hast von links gerechnet. Rechne zuerst ${n(a)} ${TIMES} ${n(x)}.` },
    t.klammer && { id: 'klammer-teilweise', match: t.klammer(x), hint: 'In der Klammer steht eine Summe. Rechne die Summe zuerst aus.' },
  ];
}

function putIn(stufe: Stufe, ab: Ab, t: Term, x: number, a: number): Exercise {
  const prompt = `Setze x = ${n(x)} ein. Welchen Wert hat der Term?`;
  const value = t.at(x);
  return build(SKILL, stufe, {
    key: `einsetzen:${t.shape}:${t.text}:${n(x)}`,
    ab,
    prompt,
    expression: t.text,
    answer: commaNumber(value, 'Wert des Terms'),
    hints: [EINSETZEN, `Rechne ${t.filled(x)}.`],
    steps: [`Mit ${n(x)} für x: ${t.filled(x)}`, ...t.lines(x)],
    bugs: commaBugs(termBugs(t, x, a), value),
    praise: `Du hast ${n(x)} für x eingesetzt und richtig gerechnet.`,
    srText: say(prompt, t.text),
    kmk: KMK,
  });
}

/** From the value back to x. */
function backToX(stufe: Stufe, ab: Ab, a: number, b: number, x: number): Exercise {
  const term = `${n(a)} ${TIMES} x + ${n(b)}`;
  const value = r3(a * x + b);
  const prompt = `Der Term hat den Wert ${n(value)}. Welche Zahl steht für x?`;
  return build(SKILL, stufe, {
    key: `rueckwaerts:${term}:${n(value)}`,
    ab,
    prompt,
    expression: term,
    answer: commaNumber(x, 'Zahl für x'),
    hints: [`Rechne rückwärts: Ziehe zuerst ${n(b)} ab.`, `Teile dann durch ${n(a)}.`],
    steps: [`${n(value)} ${MINUS} ${n(b)} = ${n(value - b)}`, `${n(value - b)} : ${n(a)} = ${n(x)}`, `Probe: ${n(a)} ${TIMES} ${n(x)} + ${n(b)} = ${n(value)}`],
    bugs: commaBugs([
      { id: 'umkehr-gleiche-rechnung', match: r3((value + b) / a), hint: `Die Umkehrung von plus ${n(b)} ist minus ${n(b)}.` },
      { id: 'schritt-vergessen', match: r3(value - b), hint: `Das ist erst ${n(a)} ${TIMES} x. Teile noch durch ${n(a)}.` },
    ], x),
    praise: 'Du hast den Term rückwärts gelöst und x gefunden.',
    srText: say(prompt, term),
    kmk: KMK_REASON,
  });
}

// ─── Stufe 2: the value table ────────────────────────────────────────────────

const GAP = '□';

function table(header: string[], row: string[]): Visual {
  return { type: 'table', header, rows: [row] };
}

function valueTable(ab: Ab, t: Term, a: number): Exercise {
  const xs = [1, 2, 3];
  const fields: MultiField[] = xs.map((x, i) => ({ id: `w${i + 1}`, value: t.at(x), decimals: COMMA_PLACES, before: `x = ${x}:`, label: `Wert für x = ${x}` }));
  const prompt = 'Fülle die Tabelle aus: Setze für x die Zahlen ein.';
  const by = (f?: (x: number) => number) => (f ? Object.fromEntries(xs.map((x, i) => [`w${i + 1}`, f(x)])) : null);
  const concat = by(t.concat);
  const ignored = by(t.ignored);
  const left = by(t.left);
  const klammer = by(t.klammer);
  return build(SKILL, 2, {
    key: `tabelle:${t.shape}:${t.text}`,
    ab,
    prompt,
    // Also as the expression: Vorlesen leaves tables out, and this term is the task (T20).
    expression: t.text,
    visual: table(['x', '1', '2', '3'], [t.text, GAP, GAP, GAP]),
    answer: { kind: 'multi', fields },
    hints: [EINSETZEN, `Für x = 1 rechnest du ${t.filled(1)}.`],
    steps: [`x = 1: ${t.filled(1)} = ${n(t.at(1))}`, `x = 2: ${t.filled(2)} = ${n(t.at(2))}`, `x = 3: ${t.filled(3)} = ${n(t.at(3))}`, `Die Werte: ${xs.map((x) => n(t.at(x))).join(', ')}`],
    bugs: multiBugs([
      concat && { id: 'buchstabe-weg', match: concat, hint: gluedHint(a, 1) },
      ignored && { id: 'buchstabe-weg', match: ignored, hint: EINSETZEN },
      left && { id: 'links-nach-rechts', match: left, hint: 'Du hast von links gerechnet. Punktrechnung kommt vor Strichrechnung.' },
      klammer && { id: 'klammer-teilweise', match: klammer, hint: 'In der Klammer steht eine Summe. Rechne die Summe zuerst aus.' },
    ], fields),
    praise: 'Du hast jede Zahl der Tabelle eingesetzt.',
    srText: say(prompt, `Der Term: ${t.text}.`),
    kmk: KMK,
  });
}

/** The values are given, the x are missing. */
function valuesBack(rng: Rng, ab: Ab): Exercise {
  const [a, b] = [rng.int(2, 9), rng.int(1, 12)];
  const term = `${a} ${TIMES} x + ${b}`;
  const xs = rng.sample([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 3).sort((p, q) => p - q);
  const values = xs.map((x) => a * x + b);
  const fields: MultiField[] = xs.map((x, i) => ({ id: `x${i + 1}`, value: x, decimals: COMMA_PLACES, before: `Wert ${values[i]}: x =`, label: `x für den Wert ${values[i]}` }));
  const prompt = 'Fülle die Tabelle aus. Welche Zahlen stehen für x?';
  return build(SKILL, 2, {
    key: `tabelle-zurueck:${term}:${xs.join('-')}`,
    ab,
    prompt,
    expression: term,
    visual: table(['x', GAP, GAP, GAP], [term, ...values.map(String)]),
    answer: { kind: 'multi', fields },
    hints: ['Rechne rückwärts: Ziehe zuerst die Zahl ohne x ab.', 'Teile dann durch die Zahl vor x.'],
    steps: [`${values[0]} ${MINUS} ${b} = ${values[0] - b}`, `${values[0] - b} : ${a} = ${xs[0]}`, 'Genauso für die beiden anderen Werte.', `Die Zahlen für x: ${xs.join(', ')}`],
    bugs: multiBugs([{ id: 'schritt-vergessen', match: Object.fromEntries(values.map((v, i) => [`x${i + 1}`, v - b])), hint: 'Das ist erst die Zahl mal x. Teile noch durch die Zahl vor x.' }], fields),
    praise: 'Du hast die Zahlen für x rückwärts gefunden.',
    srText: say(prompt, `Der Term: ${term}. Die Werte: ${values.join(', ')}.`),
    kmk: KMK_REASON,
  });
}

// ─── Stufe 3: decimals and Umfang ────────────────────────────────────────────

const tenths = (rng: Rng, lo: number, hi: number): number => {
  for (;;) {
    const v = rng.int(lo, hi);
    if (v % 10 !== 0) return v / 10;
  }
};

/** A formula with its numbers. Every length has its own letter; x and y, never a unit letter. */
function umfang(rng: Rng, ab: Ab): Exercise {
  // Each with two steps or more: u = 4 · x of a square would be one step, below the three values of the table at Stufe 2.
  const shape = rng.pick(['rechteck', 'klammer', 'fuenfeck', 'dreieck'] as const);
  const p = tenths(rng, 12, 95);
  // A triangle exists only if the two equal sides are together longer than the third.
  const r = tenths(rng, 12, shape === 'dreieck' ? Math.min(95, Math.round(p * 20) - 1) : 95);
  let text: string;
  let given: string;
  let filled: string;
  let value: number;
  let bugs: MaybeBug[];
  let name: string;
  if (shape === 'rechteck') {
    name = 'Ein Rechteck';
    text = `u = 2 ${TIMES} x + 2 ${TIMES} y`;
    given = `Die Seiten sind x = ${n(p)} cm und y = ${n(r)} cm.`;
    filled = `2 ${TIMES} ${n(p)} + 2 ${TIMES} ${n(r)}`;
    value = r3(2 * p + 2 * r);
    bugs = [{ id: 'flaeche-statt-umfang', match: r3(p * r), hint: 'Der Umfang ist der Weg um die Figur. Setze in die Formel ein.' }, { id: 'halbe-runde', match: r3(p + r), hint: 'Das ist erst eine halbe Runde. Jede Seite gibt es zweimal.' }];
  } else if (shape === 'klammer') {
    name = 'Ein Rechteck';
    text = `u = 2 ${TIMES} (x + y)`;
    given = `Die Seiten sind x = ${n(p)} cm und y = ${n(r)} cm.`;
    filled = `2 ${TIMES} (${n(p)} + ${n(r)})`;
    value = r3(2 * (p + r));
    bugs = [{ id: 'klammer-teilweise', match: r3(2 * p + r), hint: 'In der Klammer steht eine Summe. Rechne die Summe zuerst aus.' }, { id: 'halbe-runde', match: r3(p + r), hint: 'Das ist erst die Klammer. Multipliziere noch mit 2.' }];
  } else if (shape === 'fuenfeck') {
    name = 'Ein Fünfeck';
    text = `u = 3 ${TIMES} x + 2 ${TIMES} y`;
    given = `Die Seiten sind x = ${n(p)} cm und y = ${n(r)} cm.`;
    filled = `3 ${TIMES} ${n(p)} + 2 ${TIMES} ${n(r)}`;
    value = r3(3 * p + 2 * r);
    bugs = [{ id: 'halbe-runde', match: r3(p + r), hint: 'Die Formel nennt mehrere gleiche Seiten. Setze in die Formel ein.' }];
  } else {
    name = 'Ein gleichschenkliges Dreieck';
    text = `u = 2 ${TIMES} x + y`;
    given = `Die Seiten sind x = ${n(p)} cm und y = ${n(r)} cm.`;
    filled = `2 ${TIMES} ${n(p)} + ${n(r)}`;
    value = r3(2 * p + r);
    bugs = [{ id: 'halbe-runde', match: r3(p + r), hint: 'Die Formel nennt x zweimal. Das Dreieck hat zwei gleiche Seiten.' }];
  }
  const context = `${name} hat diese Formel für den Umfang u. ${given}`;
  const prompt = 'Wie groß ist der Umfang?';
  return build(SKILL, 3, {
    key: `umfang:${shape}:${n(p)}:${n(r)}`,
    ab,
    context,
    prompt,
    expression: text,
    answer: commaNumber(value, 'Umfang', { unit: 'cm' }),
    hints: [EINSETZEN, `Rechne ${filled}.`],
    steps: [`Die Zahlen in der Formel: ${filled}`, `u = ${filled} = ${n(value)}`, `Der Umfang ist ${n(value)} cm.`],
    bugs: commaBugs(bugs, value),
    praise: 'Du hast die Längen in die Formel eingesetzt.',
    srText: say(context, prompt, text),
    kmk: ['SF.variablen', 'GM.flaeche'],
  });
}

/** Umfang given, one length wanted, in two steps: the known sides off, then the division. */
function umfangBack(rng: Rng, ab: Ab): Exercise {
  const triangle = rng.chance(0.5);
  const x = tenths(rng, 12, 95);
  if (triangle) {
    // A triangle exists only if the two equal sides are together longer than the third.
    const y = tenths(rng, 12, Math.min(95, Math.round(x * 20) - 1));
    const u = r3(2 * x + y);
    const context = `Ein gleichschenkliges Dreieck hat diese Formel für den Umfang u. Der Umfang ist u = ${n(u)} cm und y = ${n(y)} cm.`;
    const prompt = 'Wie lang ist die Seite x?';
    const expr = `u = 2 ${TIMES} x + y`;
    return build(SKILL, 3, {
      key: `seite-dreieck:${n(u)}:${n(y)}`,
      ab,
      context,
      prompt,
      expression: expr,
      answer: commaNumber(x, 'Seite x', { unit: 'cm' }),
      hints: [`Ziehe zuerst ${n(y)} vom Umfang ab.`, 'Teile dann durch 2.'],
      steps: [`${n(u)} ${MINUS} ${n(y)} = ${n(2 * x)}`, `${n(2 * x)} : 2 = ${n(x)}`, `Probe: 2 ${TIMES} ${n(x)} + ${n(y)} = ${n(u)}`],
      bugs: commaBugs([{ id: 'schritt-vergessen', match: r3(2 * x), hint: 'Das sind beide Seiten x zusammen. Teile noch durch 2.' }, { id: 'umkehr-gleiche-rechnung', match: r3((u + y) / 2), hint: `Die Umkehrung von plus ${n(y)} ist minus ${n(y)}.` }], x),
      praise: 'Du hast aus dem Umfang die Seite berechnet.',
      srText: say(context, prompt, expr),
      kmk: ['SF.variablen', 'GM.flaeche', 'PK.problemloesen'],
    });
  }
  const y = tenths(rng, 12, 95);
  const u = r3(2 * x + 2 * y);
  const context = `Ein Rechteck hat diese Formel für den Umfang u. Der Umfang ist u = ${n(u)} cm und x = ${n(x)} cm.`;
  const prompt = 'Wie lang ist die Seite y?';
  const expr = `u = 2 ${TIMES} x + 2 ${TIMES} y`;
  return build(SKILL, 3, {
    key: `seite-rechteck:${n(u)}:${n(x)}`,
    ab,
    context,
    prompt,
    expression: expr,
    answer: commaNumber(y, 'Seite y', { unit: 'cm' }),
    hints: [`Rechne zuerst 2 ${TIMES} ${n(x)}.`, 'Ziehe das vom Umfang ab. Teile dann durch 2.'],
    steps: [`2 ${TIMES} ${n(x)} = ${n(2 * x)}`, `${n(u)} ${MINUS} ${n(2 * x)} = ${n(2 * y)}`, `${n(2 * y)} : 2 = ${n(y)}`],
    bugs: commaBugs([{ id: 'schritt-vergessen', match: r3(2 * y), hint: 'Das sind beide Seiten y zusammen. Teile noch durch 2.' }, { id: 'halbe-runde', match: r3(u - x), hint: 'Die Seite x gibt es zweimal. Ziehe 2 · x ab.' }], y),
    praise: 'Du hast die Formel rückwärts genutzt.',
    srText: say(context, prompt, expr),
    kmk: ['SF.variablen', 'GM.flaeche', 'PK.problemloesen'],
  });
}

// ─── The skill ───────────────────────────────────────────────────────────────

function stufe1(rng: Rng, ab: Ab): Exercise {
  const [a, b] = [rng.int(2, 9), rng.int(1, 12)];
  // Not a number of the term: the answer of a way back, or the value of a difference, would stand in the term.
  const x = other(rng, 2, 10, a, b);
  if (ab === 1) {
    if (rng.chance(0.7)) return putIn(1, ab, mulPlus(a, b), x, a);
    let d = Math.min(b, a * x - 1);
    while (a * x - d === a || a * x - d === d) d -= 1;
    return putIn(1, ab, mulMinus(a, d), x, a);
  }
  if (ab === 2) {
    const kind = rng.int(0, 2);
    if (kind === 0) return putIn(1, ab, plusMul(b, a), x, a);
    if (kind === 1) return putIn(1, ab, bracketMul(b, a), x, a);
    return putIn(1, ab, square(b), x, a);
  }
  return backToX(1, ab, a, b, x);
}

function stufe2(rng: Rng, ab: Ab): Exercise {
  const [a, b] = [rng.int(2, 12), rng.int(1, 12)];
  if (ab === 1) return valueTable(ab, rng.chance(0.7) ? mulPlus(a, b) : mulMinus(a, rng.int(1, Math.min(a - 1, 12))), a);
  if (ab === 2) {
    const kind = rng.int(0, 2);
    if (kind === 0) return valueTable(ab, plusMul(b, a), a);
    if (kind === 1) return valueTable(ab, bracketMul(b, a), a);
    return valueTable(ab, square(b), a);
  }
  return valuesBack(rng, ab);
}

function stufe3(rng: Rng, ab: Ab): Exercise {
  if (ab === 1) {
    const a = rng.pick([2, 3, 4, 5, 1.5, 2.5]);
    const x = tenths(rng, 11, 89);
    const b = tenths(rng, 3, 49);
    return putIn(3, ab, rng.chance(0.5) ? mulPlus(a, b) : plusMul(b, a), x, a);
  }
  if (ab === 2) return umfang(rng, ab);
  if (rng.chance(0.6)) return umfangBack(rng, ab);
  const a = rng.pick([2, 4, 5]);
  const b = tenths(rng, 3, 49);
  let x = tenths(rng, 11, 89);
  while (x === b) x = tenths(rng, 11, 89);
  return backToX(3, ab, a, b, x);
}

export const variableEinsetzenSkill: SkillDef = {
  ...SKILL,
  title: 'Zahlen einsetzen',
  description: 'Du setzt Zahlen in Terme mit Variablen ein.',
  stufen: { 1: '2 · x + 1 mit x bis 10', 2: 'Wertetabelle für x = 1, 2, 3', 3: 'Dezimalzahlen, der Umfang als Formel' },
  kmk: ['SF.variablen', 'GM.flaeche', 'PK.problemloesen'],
  keys: { comma: true },
  generate(rng, stufe, ctx) {
    const ab = targetAb(rng, stufe, ctx);
    return stufe === 1 ? stufe1(rng, ab) : stufe === 2 ? stufe2(rng, ab) : stufe3(rng, ab);
  },
};
