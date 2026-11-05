/**
 * terme.platzhalter: find the Platzhalter with the Umkehraufgabe. Stufe 1: □ + a = b up to 100. Stufe 2: a · □ = b and □ : a = b. Stufe 3: fractions or decimals, number riddles in words.
 * AB varies the demand inside the Stufe: the plain form, the gap in another place or harder numbers, then a sum on the right, a two-step riddle or the hardest numbers. The answer never equals a number beside the gap.
 */
import { BOX, MINUS, TIMES } from '../../core/format';
import type { Ab, Bug, Exercise, Rng, SkillDef, Stufe } from '../../core/types';
import { build, targetAb, type MaybeBug } from '../shared';
import { add, commaBugs, commaNumber, mixedFraction, n, NENNER_PAIRS, other, pickQ, qBugs, qs, r3, sameQ, say, sub, type Q } from './helpers';

const SKILL = { id: 'terme.platzhalter', topicId: 'terme' } as const;
const KMK = ['SF.gleichungen'];
const KMK_RIDDLE = ['SF.gleichungen', 'PK.problemloesen'];
const PROMPT = 'Welche Zahl gehört in die Lücke?';

const same = (hint: string, value: number): MaybeBug => ({ id: 'umkehr-gleiche-rechnung', match: r3(value), hint });

function item(stufe: Stufe, ab: Ab, key: string, expr: string, value: number, hints: string[], steps: string[], bugs: Bug[], praise: string, kmk = KMK): Exercise {
  return build(SKILL, stufe, {
    key: `${key}:${expr}`,
    ab,
    prompt: PROMPT,
    expression: expr,
    answer: commaNumber(value, 'Zahl in der Lücke'),
    hints,
    steps,
    bugs,
    praise,
    srText: say(PROMPT, expr),
    kmk,
  });
}

// ─── One step: the gap in each place, with any number ────────────────────────

/** □ + a = b or a + □ = b. Inverse: b − a. */
function gapPlus(stufe: Stufe, ab: Ab, a: number, b: number, front = true): Exercise {
  const expr = front ? `${BOX} + ${n(a)} = ${n(b)}` : `${n(a)} + ${BOX} = ${n(b)}`;
  const value = r3(b - a);
  return item(stufe, ab, 'plus', expr, value,
    [`Die Umkehrung von plus ${n(a)} ist minus ${n(a)}.`, `Rechne ${n(b)} ${MINUS} ${n(a)}.`],
    [`${n(b)} ${MINUS} ${n(a)} = ${n(value)}`, `Probe: ${n(value)} + ${n(a)} = ${n(b)}`],
    commaBugs([same(`Die Umkehrung von plus ${n(a)} ist minus ${n(a)}.`, a + b)], value),
    `Du hast mit minus ${n(a)} umgekehrt.`);
}

/** □ − a = b. Inverse: b + a. */
function gapMinus(stufe: Stufe, ab: Ab, a: number, b: number): Exercise {
  const expr = `${BOX} ${MINUS} ${n(a)} = ${n(b)}`;
  const value = r3(a + b);
  return item(stufe, ab, 'minus', expr, value,
    [`Die Umkehrung von minus ${n(a)} ist plus ${n(a)}.`, `Rechne ${n(b)} + ${n(a)}.`],
    [`${n(b)} + ${n(a)} = ${n(value)}`, `Probe: ${n(value)} ${MINUS} ${n(a)} = ${n(b)}`],
    commaBugs([b > a && same(`Die Umkehrung von minus ${n(a)} ist plus ${n(a)}.`, b - a)], value),
    `Du hast mit plus ${n(a)} umgekehrt.`);
}

/** a − □ = b: the gap is what was taken away, so the inverse is a − b and not a + b. */
function gapSubtrahend(stufe: Stufe, ab: Ab, a: number, b: number): Exercise {
  const expr = `${n(a)} ${MINUS} ${BOX} = ${n(b)}`;
  const value = r3(a - b);
  return item(stufe, ab, 'abgezogen', expr, value,
    [`Wie viel fehlt von ${n(b)} bis ${n(a)}?`, `Rechne ${n(a)} ${MINUS} ${n(b)}.`],
    [`${n(a)} ${MINUS} ${n(b)} = ${n(value)}`, `Probe: ${n(a)} ${MINUS} ${n(value)} = ${n(b)}`],
    commaBugs([same(`Die Lücke wird von ${n(a)} abgezogen. Das Ergebnis ist kleiner als ${n(a)}.`, a + b)], value),
    `Du hast den Unterschied von ${n(a)} und ${n(b)} gefunden.`);
}

/** a · □ = b or □ · a = b. Inverse: b : a. */
function gapTimes(stufe: Stufe, ab: Ab, a: number, b: number, front = true): Exercise {
  const expr = front ? `${n(a)} ${TIMES} ${BOX} = ${n(b)}` : `${BOX} ${TIMES} ${n(a)} = ${n(b)}`;
  const value = r3(b / a);
  return item(stufe, ab, 'mal', expr, value,
    [`Die Umkehrung von mal ${n(a)} ist geteilt durch ${n(a)}.`, `Rechne ${n(b)} : ${n(a)}.`],
    [`${n(b)} : ${n(a)} = ${n(value)}`, `Probe: ${n(a)} ${TIMES} ${n(value)} = ${n(b)}`],
    commaBugs([same(`Die Umkehrung von mal ${n(a)} ist geteilt durch ${n(a)}.`, a * b), { id: 'umkehr-gleiche-rechnung', match: r3(b - a), hint: `Hier steht mal ${n(a)}. Die Umkehrung ist geteilt durch ${n(a)}.` }], value),
    `Du hast mit geteilt durch ${n(a)} umgekehrt.`);
}

/** □ : a = b. Inverse: b · a. */
function gapDiv(stufe: Stufe, ab: Ab, a: number, b: number): Exercise {
  const expr = `${BOX} : ${n(a)} = ${n(b)}`;
  const value = r3(a * b);
  const back = b / a;
  return item(stufe, ab, 'durch', expr, value,
    [`Die Umkehrung von geteilt durch ${n(a)} ist mal ${n(a)}.`, `Rechne ${n(b)} ${TIMES} ${n(a)}.`],
    [`${n(b)} ${TIMES} ${n(a)} = ${n(value)}`, `Probe: ${n(value)} : ${n(a)} = ${n(b)}`],
    commaBugs([same(`Die Umkehrung von geteilt durch ${n(a)} ist mal ${n(a)}.`, back)], value),
    `Du hast mit mal ${n(a)} umgekehrt.`);
}

/** a : □ = b: the gap is the divisor. */
function gapDivisor(stufe: Stufe, ab: Ab, a: number, b: number): Exercise {
  const expr = `${n(a)} : ${BOX} = ${n(b)}`;
  const value = r3(a / b);
  return item(stufe, ab, 'teiler', expr, value,
    [`Wie oft passt ${n(b)} in ${n(a)}?`, `Rechne ${n(a)} : ${n(b)}.`],
    [`${n(a)} : ${n(b)} = ${n(value)}`, `Probe: ${n(a)} : ${n(value)} = ${n(b)}`],
    commaBugs([same(`Die Lücke teilt ${n(a)}. Das Ergebnis ist kleiner als ${n(a)}.`, a * b)], value),
    `Du hast geprüft, wie oft ${n(b)} in ${n(a)} passt.`);
}

// ─── Stufe 1 ─────────────────────────────────────────────────────────────────

function stufe1(rng: Rng, ab: Ab): Exercise {
  if (ab === 1) {
    const a = rng.int(3, 40);
    return gapPlus(1, ab, a, a + other(rng, 3, 40, a));
  }
  if (ab === 2) {
    if (rng.chance(0.5)) {
      const a = rng.int(21, 60);
      return gapPlus(1, ab, a, a + other(rng, 12, 39, a), rng.chance(0.3));
    }
    const a = rng.int(5, 40);
    return gapMinus(1, ab, a, rng.int(5, 60));
  }
  if (rng.chance(0.5)) {
    const a = rng.int(30, 100);
    return gapSubtrahend(1, ab, a, other(rng, 5, a - 5, a / 2));
  }
  // □ + a = b + c: first the right side.
  let [a, b, c] = [rng.int(8, 22), rng.int(20, 45), rng.int(5, 25)];
  while ([a, b, c].includes(b + c - a)) [a, b, c] = [rng.int(8, 22), rng.int(20, 45), rng.int(5, 25)];
  const value = b + c - a;
  const expr = `${BOX} + ${a} = ${b} + ${c}`;
  return item(1, ab, 'summe-rechts', expr, value,
    ['Rechne zuerst die rechte Seite aus.', `Die Umkehrung von plus ${a} ist minus ${a}.`],
    [`${b} + ${c} = ${b + c}`, `${b + c} ${MINUS} ${a} = ${value}`, `Probe: ${value} + ${a} = ${b + c}`],
    commaBugs([same(`Die Umkehrung von plus ${a} ist minus ${a}.`, b + c + a), { id: 'schritt-vergessen', match: b + c, hint: 'Das ist erst die rechte Seite. Kehre jetzt die Plusrechnung um.' }], value),
    'Du hast zuerst die rechte Seite zusammengefasst.', KMK_RIDDLE);
}

// ─── Stufe 2 ─────────────────────────────────────────────────────────────────

/** Above □ + a = b of Stufe 1 at each AB: no factor 2 or 3 and no small table fact. */
function stufe2(rng: Rng, ab: Ab): Exercise {
  if (ab === 1) {
    const a = rng.int(4, 12);
    const x = other(rng, 6, 15, a);
    return rng.chance(0.5) ? gapTimes(2, ab, a, a * x) : gapDiv(2, ab, a, x);
  }
  if (ab === 2) {
    const kind = rng.int(0, 2);
    if (kind === 0) {
      const a = rng.int(11, 19);
      const x = other(rng, 4, 12, a);
      return gapTimes(2, ab, a, a * x, rng.chance(0.5));
    }
    if (kind === 1) return gapDiv(2, ab, rng.int(11, 19), rng.int(4, 15));
    const b = rng.int(6, 15);
    return gapDivisor(2, ab, b * other(rng, 6, 15, b), b);
  }
  // A sum, or a product, on the other side.
  const a = rng.int(3, 12);
  const x = other(rng, 4, 15, a);
  if (rng.chance(0.5)) {
    const total = a * x;
    const part = other(rng, 2, total - 2, x, total - x);
    const expr = `${a} ${TIMES} ${BOX} = ${part} + ${total - part}`;
    return item(2, ab, 'mal-summe', expr, x,
      ['Rechne zuerst die rechte Seite aus.', `Die Umkehrung von mal ${a} ist geteilt durch ${a}.`],
      [`${part} + ${total - part} = ${total}`, `${total} : ${a} = ${x}`, `Probe: ${a} ${TIMES} ${x} = ${total}`],
      commaBugs([{ id: 'schritt-vergessen', match: total, hint: `Das ist erst die rechte Seite. Teile jetzt durch ${a}.` }, same(`Die Umkehrung von mal ${a} ist geteilt durch ${a}.`, total * a)], x),
      'Du hast zuerst die rechte Seite zusammengefasst.', KMK_RIDDLE);
  }
  const [b, c] = [rng.int(3, 12), rng.int(2, 9)];
  const expr = `${BOX} : ${a} = ${b} ${TIMES} ${c}`;
  const value = a * b * c;
  return item(2, ab, 'durch-produkt', expr, value,
    ['Rechne zuerst die rechte Seite aus.', `Die Umkehrung von geteilt durch ${a} ist mal ${a}.`],
    [`${b} ${TIMES} ${c} = ${b * c}`, `${b * c} ${TIMES} ${a} = ${value}`, `Probe: ${value} : ${a} = ${b * c}`],
    commaBugs([{ id: 'schritt-vergessen', match: b * c, hint: `Das ist erst die rechte Seite. Multipliziere jetzt mit ${a}.` }], value),
    'Du hast zuerst die rechte Seite zusammengefasst.', KMK_RIDDLE);
}

// ─── Stufe 3 ─────────────────────────────────────────────────────────────────

const tenths = (rng: Rng, lo: number, hi: number): number => {
  for (;;) {
    const x = rng.int(lo, hi);
    if (x % 10 !== 0) return x / 10;
  }
};

/** A fraction in the gap, with plus or minus only: terme.platzhalter is core, and NR has Bruch · and : in Klasse 7/8 (§2.3). The answer is a proper fraction. */
function gapFraction(ab: Ab, kind: 'plus' | 'minus', right: Q, op: Q): Exercise {
  const plus = kind === 'plus';
  const value = plus ? sub(right, op) : add(right, op);
  const sign = plus ? '+' : MINUS;
  const inverse = plus ? MINUS : '+';
  const expr = `${BOX} ${sign} ${qs(op)} = ${qs(right)}`;
  const [word, inverseWord] = plus ? ['plus', 'minus'] : ['minus', 'plus'];
  const sameResult = plus ? add(right, op) : sub(right, op);
  return build(SKILL, 3, {
    key: `bruch:${expr}`,
    ab,
    prompt: `Kürze das Ergebnis. ${PROMPT}`,
    expression: expr,
    answer: mixedFraction(value),
    hints: [`Die Umkehrung von ${word} ${qs(op)} ist ${inverseWord} ${qs(op)}.`, `Rechne ${qs(right)} ${inverse} ${qs(op)}.`],
    steps: [`${qs(right)} ${inverse} ${qs(op)} = ${qs(value)}`, `Probe: ${qs(value)} ${sign} ${qs(op)} = ${qs(right)}`],
    bugs: qBugs([{ id: 'umkehr-gleiche-rechnung', hint: `Die Umkehrung von ${word} ${qs(op)} ist ${inverseWord} ${qs(op)}.`, raw: sameResult }], value),
    praise: `Du hast mit ${inverseWord} ${qs(op)} umgekehrt.`,
    srText: say(`Kürze das Ergebnis. ${PROMPT}`, expr),
    kmk: KMK,
  });
}

/** Above a · □ = b of Stufe 2: the Nenner must be made equal first. */
function fractionGap(rng: Rng, ab: 1 | 2): Exercise {
  for (;;) {
    const [d1, d2] = rng.shuffle(rng.pick(NENNER_PAIRS[ab]));
    const op = pickQ(rng, [d1]);
    const right = pickQ(rng, [d2]);
    const kind = rng.pick(['plus', 'minus'] as const);
    const value = kind === 'plus' ? sub(right, op) : add(right, op);
    // Not op: the answer would stand beside the gap, and the hints would name it.
    if (value.n <= 0 || value.n >= value.d || sameQ(value, op)) continue;
    return gapFraction(ab, kind, right, op);
  }
}

/** Two decimal places at AB I: above the natural numbers of a · □ = b at Stufe 2, with places that must be lined up. */
function decimalGap(rng: Rng, ab: 1 | 2): Exercise {
  if (ab === 1) {
    const hundredths = () => {
      for (;;) {
        const x = rng.int(105, 995);
        if (x % 10 !== 0) return x / 100;
      }
    };
    const a = hundredths();
    let b = hundredths();
    while (b === a) b = hundredths();
    return rng.chance(0.5) ? gapPlus(3, ab, a, r3(a + b)) : gapMinus(3, ab, a, b);
  }
  // Harder than a · □ = b with natural numbers at Stufe 2: a decimal and a factor above 10, so that no small table fact solves it.
  const kind = rng.int(0, 2);
  if (kind === 0) {
    const a = rng.pick([2.5, 0.5, 1.5, 0.2, 1.2, 0.4, 3.5]);
    const x = rng.int(11, 24);
    return gapTimes(3, ab, a, r3(a * x));
  }
  if (kind === 1) return gapDiv(3, ab, rng.int(11, 19), tenths(rng, 15, 95));
  const [a, x] = [rng.int(11, 19), tenths(rng, 12, 85)];
  return gapTimes(3, ab, a, r3(a * x), false);
}

/** A number riddle in words, in two steps: the steps backward, the inverse of each. */
function riddle(rng: Rng, ab: Ab): Exercise {
  const decimal = rng.chance(0.4);
  const kind = rng.pick(['mal-plus', 'plus-mal', 'durch-minus', 'haelfte-plus'] as const);
  const small = () => (decimal ? tenths(rng, 3, 90) : rng.int(3, 25));
  let sentence: string;
  let result: number;
  let value: number;
  let back: string[];
  let bugs: MaybeBug[];
  let praise: string;
  if (kind === 'mal-plus') {
    const [k, c] = [rng.int(2, 9), small()];
    value = decimal ? tenths(rng, 12, 90) : rng.int(3, 15);
    result = r3(k * value + c);
    sentence = `Ich multipliziere die Zahl mit ${k} und addiere ${n(c)}.`;
    back = [`${n(result)} ${MINUS} ${n(c)} = ${n(result - c)}`, `${n(result - c)} : ${k} = ${n(value)}`];
    bugs = [same(`Rechne rückwärts: Die Umkehrung von plus ${n(c)} ist minus ${n(c)}.`, (result + c) / k), { id: 'rueckwaerts-reihenfolge', match: r3(result / k - c), hint: `Rechne rückwärts: Zuletzt kam plus ${n(c)}. Kehre das zuerst um.` }, { id: 'schritt-vergessen', match: r3(result - c), hint: `Das ist erst der erste Schritt. Teile jetzt noch durch ${k}.` }];
    praise = 'Du hast das Rätsel Schritt für Schritt rückwärts gelöst.';
  } else if (kind === 'plus-mal') {
    const [c, k] = [small(), rng.int(2, 9)];
    value = decimal ? tenths(rng, 12, 90) : rng.int(3, 15);
    result = r3((value + c) * k);
    sentence = `Ich addiere ${n(c)} zu der Zahl und multipliziere das Ergebnis mit ${k}.`;
    back = [`${n(result)} : ${k} = ${n(result / k)}`, `${n(result / k)} ${MINUS} ${n(c)} = ${n(value)}`];
    bugs = [{ id: 'rueckwaerts-reihenfolge', match: r3((result - c) / k), hint: `Rechne rückwärts: Zuletzt kam mal ${k}. Kehre das zuerst um.` }, { id: 'schritt-vergessen', match: r3(result / k), hint: `Das ist erst der erste Schritt. Ziehe jetzt noch ${n(c)} ab.` }];
    praise = 'Du hast den letzten Schritt zuerst umgekehrt.';
  } else if (kind === 'durch-minus') {
    const [k, c] = [rng.int(2, 9), small()];
    const quotient = r3((decimal ? rng.int(30, 90) / 10 : rng.int(3, 15)) + c);
    value = r3(k * quotient);
    result = r3(quotient - c);
    sentence = `Ich dividiere die Zahl durch ${k} und subtrahiere ${n(c)}.`;
    back = [`${n(result)} + ${n(c)} = ${n(quotient)}`, `${n(quotient)} ${TIMES} ${k} = ${n(value)}`];
    bugs = [same(`Rechne rückwärts: Die Umkehrung von minus ${n(c)} ist plus ${n(c)}.`, (result - c) * k), { id: 'schritt-vergessen', match: quotient, hint: `Das ist erst der erste Schritt. Multipliziere jetzt noch mit ${k}.` }];
    praise = 'Du hast Minus und Geteilt der Reihe nach umgekehrt.';
  } else {
    const c = small();
    const half = decimal ? rng.int(11, 90) / 10 : rng.int(3, 25);
    value = r3(half * 2);
    result = r3(half + c);
    sentence = `Die Hälfte der Zahl plus ${n(c)} ergibt ${n(result)}.`;
    back = [`${n(result)} ${MINUS} ${n(c)} = ${n(half)}`, `${n(half)} ${TIMES} 2 = ${n(value)}`];
    bugs = [{ id: 'schritt-vergessen', match: half, hint: 'Das ist erst die Hälfte der Zahl. Wie heißt die ganze Zahl?' }, same(`Rechne rückwärts: Die Umkehrung von plus ${n(c)} ist minus ${n(c)}.`, (result + c) * 2)];
    praise = 'Du hast von der Hälfte auf die Zahl geschlossen.';
  }
  const context = kind === 'haelfte-plus' ? `Ich denke mir eine Zahl. ${sentence}` : `Ich denke mir eine Zahl. ${sentence} Das Ergebnis ist ${n(result)}.`;
  const prompt = 'Wie heißt die Zahl?';
  return build(SKILL, 3, {
    key: `raetsel:${kind}:${n(value)}:${sentence}`,
    ab,
    context,
    prompt,
    answer: commaNumber(value, 'Die Zahl'),
    hints: ['Rechne rückwärts: Beginne beim Ergebnis.', 'Kehre jeden Schritt um. Der letzte Schritt kommt zuerst.'],
    steps: [...back, `Die Zahl ist ${n(value)}.`],
    bugs: commaBugs(bugs, value),
    praise,
    srText: say(context, prompt),
    kmk: KMK_RIDDLE,
  });
}

function stufe3(rng: Rng, ab: Ab): Exercise {
  if (ab === 3) return riddle(rng, ab);
  return rng.chance(0.5) ? decimalGap(rng, ab) : fractionGap(rng, ab);
}

export const platzhalterSkill: SkillDef = {
  ...SKILL,
  title: 'Gleichungen durch Umkehren',
  description: 'Du findest den Platzhalter mit der Umkehraufgabe.',
  stufen: { 1: '□ + a = b, natürliche Zahlen bis 100', 2: 'a · □ = b und □ : a = b', 3: 'Brüche oder Dezimalzahlen, Zahlenrätsel in Worten' },
  kmk: ['SF.gleichungen', 'PK.problemloesen'],
  keys: { comma: true, mixed: true },
  generate(rng, stufe, ctx) {
    const ab = targetAb(rng, stufe, ctx);
    return stufe === 1 ? stufe1(rng, ab) : stufe === 2 ? stufe2(rng, ab) : stufe3(rng, ab);
  },
};
