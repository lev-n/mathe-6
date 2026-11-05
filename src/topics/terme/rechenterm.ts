/**
 * terme.rechenterm: Punkt vor Strich and Klammern. Stufe 1: natural numbers, two operations. Stufe 2: Klammern, decimals with one place. Stufe 3: fractions, three operations,
 * the planted step (Fehlerdetektiv, §7.1). AB varies the demand inside the Stufe: compute it, a less direct form or harder numbers, then gaps, reasons and the search for the step.
 */
import { BOX, MINUS, TIMES } from '../../core/format';
import type { Ab, Exercise, Rng, SkillDef, Stufe } from '../../core/types';
import { build, makeChoice, pickPerson, targetAb, type MaybeBug } from '../shared';
import { add, commaBugs, commaNumber, mixedFraction, n, other, pickQ, qBugs, qs, r3, sameQ, say, shownNumbers, sub, type Q } from './helpers';

const SKILL = { id: 'terme.rechenterm', topicId: 'terme' } as const;
const KMK = ['ZO.terme'];
const KMK_REASON = ['ZO.terme', 'PK.argumentieren'];
const RULE = 'Punktrechnung kommt vor Strichrechnung.';

const num = (value: number) => commaNumber(value, 'Ergebnis');

/** Left to right instead of Punkt vor Strich. */
const leftBug = (first: string, value: number): MaybeBug => ({ id: 'links-nach-rechts', match: r3(value), hint: `Du hast von links gerechnet. Rechne zuerst ${first}.` });
/** The Strich step taken first, in a term that starts with its Punkt step. */
const strichBug = (first: string, value: number): MaybeBug => ({ id: 'strich-zuerst', match: r3(value), hint: `Hier steht keine Klammer. Rechne zuerst ${first}.` });
/** The Klammer left out or only partly used (§5). */
const klammerBug = (inner: string, value: number): MaybeBug => ({ id: 'klammer-teilweise', match: r3(value), hint: `In der Klammer steht ${inner}. Rechne das zuerst aus.` });

/** A term whose value stands in it needs no calculation: 3 · 4 − 6 = 6. */
function withoutAnswer<T extends { expr: string; value: number }>(make: () => T): T {
  for (;;) {
    const t = make();
    if (!shownNumbers(t.expr).includes(n(t.value))) return t;
  }
}

// ─── A term of two operations (Stufe 1) ──────────────────────────────────────

interface Two {
  shape: string;
  expr: string;
  first: string;
  chain: string[];
  value: number;
  bugs: MaybeBug[];
  /** The value of a calculation from left to right, where that differs. */
  left?: number;
}

function twoOps(rng: Rng, big: boolean): Two {
  const b = big ? rng.int(11, 25) : rng.int(2, 9);
  const c = big ? rng.int(2, 6) : rng.int(2, 9);
  const p = b * c;
  const a = big ? rng.int(10, 99) : rng.int(2, 20);
  const shape = rng.pick(['plus-mal', 'mal-plus', 'minus-mal', 'mal-minus', 'plus-durch', 'minus-durch'] as const);
  const mal = `${b} ${TIMES} ${c}`;
  switch (shape) {
    case 'plus-mal': {
      const left = (a + b) * c;
      return { shape, expr: `${a} + ${mal}`, first: mal, chain: [`${mal} = ${p}`, `${a} + ${p} = ${a + p}`], value: a + p, left, bugs: [leftBug(mal, left)] };
    }
    case 'mal-plus':
      return { shape, expr: `${mal} + ${a}`, first: mal, chain: [`${mal} = ${p}`, `${p} + ${a} = ${p + a}`], value: p + a, bugs: [strichBug(mal, b * (c + a))] };
    case 'minus-mal': {
      const big2 = p + rng.int(1, 40);
      const left = (big2 - b) * c;
      return { shape, expr: `${big2} ${MINUS} ${mal}`, first: mal, chain: [`${mal} = ${p}`, `${big2} ${MINUS} ${p} = ${big2 - p}`], value: big2 - p, left, bugs: [leftBug(mal, left)] };
    }
    case 'mal-minus': {
      const d = rng.int(1, p - 1);
      return { shape, expr: `${mal} ${MINUS} ${d}`, first: mal, chain: [`${mal} = ${p}`, `${p} ${MINUS} ${d} = ${p - d}`], value: p - d, bugs: [c > d && strichBug(mal, b * (c - d))] };
    }
    case 'plus-durch': {
      const durch = `${p} : ${c}`;
      const left = (a + p) / c;
      return { shape, expr: `${a} + ${durch}`, first: durch, chain: [`${durch} = ${b}`, `${a} + ${b} = ${a + b}`], value: a + b, ...(Number.isInteger(left) ? { left } : {}), bugs: [Number.isInteger(left) && leftBug(durch, left)] };
    }
    case 'minus-durch': {
      const durch = `${p} : ${c}`;
      const start = p + rng.int(1, 40);
      const left = (start - p) / c;
      return { shape, expr: `${start} ${MINUS} ${durch}`, first: durch, chain: [`${durch} = ${b}`, `${start} ${MINUS} ${b} = ${start - b}`], value: start - b, ...(Number.isInteger(left) ? { left } : {}), bugs: [Number.isInteger(left) && leftBug(durch, left)] };
    }
  }
}

function computeTwo(stufe: Stufe, ab: Ab, t: Two): Exercise {
  return build(SKILL, stufe, {
    key: `rechne:${t.shape}:${t.expr}`,
    ab,
    prompt: 'Rechne.',
    expression: `${t.expr} = ${BOX}`,
    answer: num(t.value),
    hints: [RULE, `Rechne zuerst ${t.first}.`],
    steps: t.chain,
    bugs: commaBugs(t.bugs, t.value),
    praise: `Du hast zuerst ${t.first} gerechnet.`,
    srText: say('Rechne.', `${t.expr} = ${BOX}`),
    kmk: KMK,
  });
}

/** The term after its first step: the child finds the Punkt step, with mal or geteilt, and calculates it. Only the option with that value fits, so no sign gives it away. */
function firstStep(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const [b, c] = pickPair(rng);
  const divide = rng.chance(0.4);
  const whole = b * c;
  const punkt = divide ? `${whole} : ${c}` : `${b} ${TIMES} ${c}`;
  const done = divide ? b : whole;
  const sign = rng.pick(['+', MINUS]);
  const start = rng.int(10, 60) + (sign === '+' ? 0 : whole);
  const expr = `${start} ${sign} ${punkt}`;
  const prompt = 'Wie sieht der Term nach dem ersten Schritt aus?';
  return build(SKILL, stufe, {
    key: `zuerst:${expr}`,
    ab,
    prompt,
    expression: expr,
    answer: makeChoice(rng, { label: `${start} ${sign} ${done}` }, [
      { label: divide ? `${sign === '+' ? start + whole : start - whole} : ${c}` : `${sign === '+' ? start + b : start - b} ${TIMES} ${c}`, whyWrong: `Das ist von links gerechnet. ${RULE}` },
      { label: `${start} ${sign} ${divide ? whole - c : b + c}`, whyWrong: `Prüfe die Rechnung ${punkt} noch einmal.` },
      { label: `${start} ${sign} ${divide ? whole : b}`, whyWrong: `Hier fehlt noch ein Teil von ${punkt}.` },
    ]),
    hints: [RULE, 'Rechne nur den ersten Schritt aus. Der Rest bleibt stehen.'],
    steps: [`Zuerst: ${punkt} = ${done}`, `Dann: ${start} ${sign} ${done} = ${sign === '+' ? start + done : start - done}`],
    praise: 'Du hast die Punktrechnung zuerst gewählt.',
    srText: say(prompt, expr),
    kmk: KMK,
  });
}

/** Two factors, but not 2 and 2: 2 · 2 and 2 + 2, or 4 : 2 and 4 − 2, have one value. */
function pickPair(rng: Rng): [number, number] {
  for (;;) {
    const [b, c] = [rng.int(2, 9), rng.int(2, 9)];
    if (b !== 2 || c !== 2) return [b, c];
  }
}

/** Gap in the Punkt step: a + □ · c = r. Back from the result. */
function gapTwo(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const a = rng.int(2, 30);
  const c = rng.int(2, 9);
  const b = other(rng, 2, 12, a, c);
  const r = a + b * c;
  const expr = `${a} + ${BOX} ${TIMES} ${c} = ${r}`;
  const left = r / c - a;
  return build(SKILL, stufe, {
    key: `luecke:${expr}`,
    ab,
    prompt: 'Welche Zahl gehört in die Lücke?',
    expression: expr,
    answer: commaNumber(b, 'Zahl in der Lücke'),
    hints: [`Rechne rückwärts: Wie viel ergibt ${BOX} ${TIMES} ${c}?`, `Ziehe zuerst ${a} von ${r} ab.`],
    steps: [`${r} ${MINUS} ${a} = ${b * c}`, `${b * c} : ${c} = ${b}`, `Probe: ${a} + ${b} ${TIMES} ${c} = ${r}`],
    bugs: commaBugs([Number.isInteger(left) && left > 0 && { id: 'links-nach-rechts', match: left, hint: `Du hast von links gerechnet. Ziehe zuerst ${a} von ${r} ab.` }], b),
    praise: 'Du hast den Term rückwärts gelöst.',
    srText: say('Welche Zahl gehört in die Lücke?', expr),
    kmk: KMK_REASON,
  });
}

/** A fictional calculation from left to right: which result is the right one? */
function correctIt(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  let t = withoutAnswer(() => twoOps(rng, false));
  while (t.left === undefined || t.left === t.value) t = withoutAnswer(() => twoOps(rng, false));
  const name = pickPerson(rng).name;
  const prompt = `Diese Rechnung von ${name} stimmt noch nicht. Wie heißt das richtige Ergebnis?`;
  const expr = `${t.expr} = ${t.left}`;
  return build(SKILL, stufe, {
    key: `korrektur:${expr}`,
    ab,
    prompt,
    expression: expr,
    answer: num(t.value),
    hints: [`${name} hat von links gerechnet. ${RULE}`, `Rechne zuerst ${t.first}.`],
    steps: t.chain,
    bugs: commaBugs([leftBug(t.first, t.left)], t.value),
    praise: `Du hast die Reihenfolge korrigiert und ${t.first} vorgezogen.`,
    srText: say(prompt, expr),
    kmk: KMK_REASON,
  });
}

/** Which term has this value? The same numbers, in other places. */
function whichValue(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  for (;;) {
    const [a, b, c] = [rng.int(2, 9), rng.int(2, 9), rng.int(2, 9)];
    const terms: [string, number][] = [
      [`${a} + ${b} ${TIMES} ${c}`, a + b * c],
      [`${a} ${TIMES} ${b} + ${c}`, a * b + c],
      [`${b} + ${a} ${TIMES} ${c}`, b + a * c],
      [`${c} + ${a} ${TIMES} ${b}`, c + a * b],
    ];
    const [correct, ...others] = terms;
    if (others.some((o) => o[1] === correct[1])) continue;
    return build(SKILL, stufe, {
      key: `wert:${a}:${b}:${c}`,
      ab,
      prompt: `Welcher Term hat den Wert ${correct[1]}?`,
      answer: makeChoice(rng, { label: correct[0] }, others.map(([label, value]) => ({ label, whyWrong: `${label} = ${value}. ${RULE}` }))),
      hints: ['Rechne jeden Term aus.', RULE],
      steps: [`${correct[0]} = ${a} + ${b * c}`, `${a} + ${b * c} = ${correct[1]}`],
      praise: 'Du hast den Term mit diesem Wert gefunden.',
      srText: say(`Welcher Term hat den Wert ${correct[1]}?`),
      kmk: KMK_REASON,
    });
  }
}

// ─── Klammern (Stufe 2) ──────────────────────────────────────────────────────

interface Bracket {
  shape: string;
  expr: string;
  inner: string;
  chain: string[];
  value: number;
  /** Without the Klammer. */
  plain: number;
}

/** Klammer terms: natural numbers, or decimals with one place. Every intermediate result stays above 0. */
function bracket(rng: Rng, decimal: boolean): Bracket {
  const tenth = (lo: number, hi: number) => {
    if (!decimal) return rng.int(lo, hi);
    for (;;) {
      const x = rng.int(lo * 10 + 1, hi * 10 - 1);
      if (x % 10 !== 0) return x / 10;
    }
  };
  const shape = rng.pick(['mal-plus', 'plus-mal', 'minus-mal', 'mal-minus', 'plus-durch', 'minus-summe'] as const);
  const k = rng.int(2, 9);
  switch (shape) {
    case 'mal-plus': {
      const [b, c] = [tenth(2, 12), tenth(2, 9)];
      const s = r3(b + c);
      return { shape, expr: `${k} ${TIMES} (${n(b)} + ${n(c)})`, inner: `${n(b)} + ${n(c)}`, chain: [`${n(b)} + ${n(c)} = ${n(s)}`, `${k} ${TIMES} ${n(s)} = ${n(k * s)}`], value: r3(k * s), plain: r3(k * b + c) };
    }
    case 'plus-mal': {
      const [a, b] = [tenth(2, 12), tenth(2, 9)];
      const s = r3(a + b);
      return { shape, expr: `(${n(a)} + ${n(b)}) ${TIMES} ${k}`, inner: `${n(a)} + ${n(b)}`, chain: [`${n(a)} + ${n(b)} = ${n(s)}`, `${n(s)} ${TIMES} ${k} = ${n(s * k)}`], value: r3(s * k), plain: r3(a + b * k) };
    }
    case 'minus-mal': {
      const b = tenth(2, 8);
      const a = r3(b + tenth(1, 9));
      const s = r3(a - b);
      return { shape, expr: `(${n(a)} ${MINUS} ${n(b)}) ${TIMES} ${k}`, inner: `${n(a)} ${MINUS} ${n(b)}`, chain: [`${n(a)} ${MINUS} ${n(b)} = ${n(s)}`, `${n(s)} ${TIMES} ${k} = ${n(s * k)}`], value: r3(s * k), plain: r3(a - b * k) };
    }
    case 'mal-minus': {
      const c = tenth(1, 8);
      const b = r3(c + tenth(1, 9));
      const s = r3(b - c);
      return { shape, expr: `${k} ${TIMES} (${n(b)} ${MINUS} ${n(c)})`, inner: `${n(b)} ${MINUS} ${n(c)}`, chain: [`${n(b)} ${MINUS} ${n(c)} = ${n(s)}`, `${k} ${TIMES} ${n(s)} = ${n(k * s)}`], value: r3(k * s), plain: r3(k * b - c) };
    }
    case 'plus-durch': {
      // The sum is a multiple of k, so that the division ends.
      const quotient = decimal ? rng.int(11, 59) / 10 : rng.int(2, 12);
      const s = r3(k * quotient);
      let a = decimal ? r3(rng.int(1, Math.round(s * 10) - 1) / 10) : rng.int(1, s - 1);
      while (decimal && Number.isInteger(a)) a = r3(rng.int(1, Math.round(s * 10) - 1) / 10);
      const b = r3(s - a);
      return { shape, expr: `(${n(a)} + ${n(b)}) : ${k}`, inner: `${n(a)} + ${n(b)}`, chain: [`${n(a)} + ${n(b)} = ${n(s)}`, `${n(s)} : ${k} = ${n(quotient)}`], value: quotient, plain: r3(a + b / k) };
    }
    case 'minus-summe': {
      const [b, c] = [tenth(2, 9), tenth(2, 9)];
      const a = r3(b + c + tenth(1, 20));
      const s = r3(b + c);
      return { shape, expr: `${n(a)} ${MINUS} (${n(b)} + ${n(c)})`, inner: `${n(b)} + ${n(c)}`, chain: [`${n(b)} + ${n(c)} = ${n(s)}`, `${n(a)} ${MINUS} ${n(s)} = ${n(a - s)}`], value: r3(a - s), plain: r3(a - b + c) };
    }
  }
}

function computeBracket(stufe: Stufe, ab: Ab, t: Bracket): Exercise {
  return build(SKILL, stufe, {
    key: `klammer:${t.shape}:${t.expr}`,
    ab,
    prompt: 'Rechne.',
    expression: `${t.expr} = ${BOX}`,
    answer: num(t.value),
    hints: ['Die Klammer rechnest du zuerst.', `Rechne zuerst ${t.inner}.`],
    steps: t.chain,
    bugs: commaBugs([klammerBug(t.inner, t.plain)], t.value),
    praise: `Du hast zuerst die Klammer ${t.inner} gerechnet.`,
    srText: say('Rechne.', `${t.expr} = ${BOX}`),
    kmk: KMK,
  });
}

/** A gap inside the Klammer: 4 · (6 + □) = 40; with decimals (2,5 + □) · 2 = 9. */
function gapBracket(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const decimal = rng.chance(0.5);
  const k = rng.int(2, 9);
  const b = decimal ? rng.int(11, 49) / 10 : rng.int(2, 15);
  // Not a number of the term, and not its result: the gap is what is left to find.
  const gap = decimal ? other(rng, 11, 49, Math.round(b * 10), k * 10) / 10 : other(rng, 2, 15, b, k);
  const s = r3(b + gap);
  const r = r3(k * s);
  const front = rng.chance(0.5);
  const expr = front ? `${k} ${TIMES} (${n(b)} + ${BOX}) = ${n(r)}` : `(${n(b)} + ${BOX}) ${TIMES} ${k} = ${n(r)}`;
  // r − k · b is k · □: the factor stands in front of the gap still.
  const plain = r3(r - k * b);
  return build(SKILL, stufe, {
    key: `klammer-luecke:${expr}`,
    ab,
    prompt: 'Welche Zahl gehört in die Lücke?',
    expression: expr,
    answer: commaNumber(gap, 'Zahl in der Lücke'),
    hints: [`Wie viel muss in der Klammer herauskommen? Teile ${n(r)} durch ${k}.`, `Ziehe dann ${n(b)} ab.`],
    steps: [`${n(r)} : ${k} = ${n(s)}`, `${n(s)} ${MINUS} ${n(b)} = ${n(gap)}`, `Probe: ${k} ${TIMES} (${n(b)} + ${n(gap)}) = ${n(r)}`],
    bugs: commaBugs([plain > 0 && { id: 'klammer-teilweise', match: plain, hint: `Das ist erst ${k} ${TIMES} ${BOX}. Teile noch durch ${k}.` }, { id: 'klammer-teilweise', match: r3(r - b), hint: `Die Klammer gehört zusammen. Teile zuerst ${n(r)} durch ${k}.` }], gap),
    praise: 'Du hast rückwärts zuerst den Wert der Klammer gefunden.',
    srText: say('Welche Zahl gehört in die Lücke?', expr),
    kmk: KMK_REASON,
  });
}

/** Mit und ohne Klammer: how far apart are the two values? */
function difference(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  // The difference is (k − 1) · c: never a number of the term, as with k = 2.
  let [k, b, c] = [rng.int(2, 9), rng.int(2, 12), rng.int(2, 9)];
  while ([k, b, c].includes((k - 1) * c)) [k, b, c] = [rng.int(2, 9), rng.int(2, 12), rng.int(2, 9)];
  const withK = k * (b + c);
  const plain = k * b + c;
  const expr = `${k} ${TIMES} (${b} + ${c})   und   ${k} ${TIMES} ${b} + ${c}`;
  return build(SKILL, stufe, {
    key: `unterschied:${k}:${b}:${c}`,
    ab,
    prompt: 'Wie groß ist der Unterschied zwischen den beiden Werten?',
    expression: expr,
    answer: num(withK - plain),
    hints: ['Rechne beide Terme aus.', 'Nur im ersten Term gehört die Summe zusammen.'],
    steps: [`${k} ${TIMES} (${b} + ${c}) = ${k} ${TIMES} ${b + c} = ${withK}`, `${k} ${TIMES} ${b} + ${c} = ${k * b} + ${c} = ${plain}`, `${withK} ${MINUS} ${plain} = ${withK - plain}`],
    bugs: commaBugs([{ id: 'klammer-teilweise', match: withK, hint: 'Das ist erst der Wert des ersten Terms. Rechne auch den zweiten aus.' }, { id: 'klammer-teilweise', match: plain, hint: 'Das ist erst der Wert des zweiten Terms. Rechne auch den ersten aus.' }], withK - plain),
    praise: 'Du hast beide Terme gerechnet und verglichen.',
    srText: say('Wie groß ist der Unterschied zwischen den beiden Werten?', `${k} ${TIMES} (${b} + ${c}) und ${k} ${TIMES} ${b} + ${c}`),
    kmk: KMK_REASON,
  });
}

/** Where the Klammer stands decides the value: which placing gives this value? */
function whichBracket(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  for (;;) {
    const [a, b, c] = [rng.int(2, 9), rng.int(2, 9), rng.int(2, 9)];
    const terms: [string, number][] = [
      [`(${a} + ${b}) ${TIMES} ${c}`, (a + b) * c],
      [`${a} ${TIMES} (${b} + ${c})`, a * (b + c)],
      [`${a} + ${b} ${TIMES} ${c}`, a + b * c],
      [`${a} ${TIMES} ${b} + ${c}`, a * b + c],
    ];
    if (new Set(terms.map((t) => t[1])).size !== 4) continue;
    const correct = terms[rng.int(0, 1)];
    return build(SKILL, stufe, {
      key: `klammer-wert:${correct[0]}`,
      ab,
      prompt: `Bei welchem Term kommt ${correct[1]} heraus?`,
      answer: makeChoice(rng, { label: correct[0] }, terms.filter((t) => t !== correct).map(([label, value]) => ({ label, whyWrong: `${label} = ${value}. Prüfe, was du zuerst rechnest.` }))),
      hints: ['Rechne jeden Term aus.', 'Eine Klammer kommt immer zuerst. Dann Punkt vor Strich.'],
      steps: [`${correct[0]} = ${correct[1]}`],
      praise: 'Du hast gesehen, was die Klammer ändert.',
      srText: say(`Bei welchem Term kommt ${correct[1]} heraus?`),
      kmk: KMK_REASON,
    });
  }
}

// ─── Three operations and fractions (Stufe 3) ────────────────────────────────

interface Three {
  shape: string;
  expr: string;
  chain: string[];
  first: string;
  value: number;
  bugs: MaybeBug[];
}

function threeOps(rng: Rng, decimal: boolean): Three {
  const x = (lo: number, hi: number) => (decimal ? rng.int(lo * 10 + 1, hi * 10 - 1) / 10 : rng.int(lo, hi));
  /** The number taken away: the field has no minus, so every result stays above 0. */
  const taken = (from: number) => x(1, Math.min(9, Math.floor(from) - 1));
  const [b, c] = [rng.int(2, 9), rng.int(2, 9)];
  const shape = rng.pick(['plus-mal-minus', 'klammer-mal-minus', 'mal-plus-mal', 'mal-klammer-minus'] as const);
  switch (shape) {
    case 'plus-mal-minus': {
      const a = x(3, 30);
      const p = b * c;
      const d = taken(a + p);
      const value = r3(a + p - d);
      return { shape, expr: `${n(a)} + ${b} ${TIMES} ${c} ${MINUS} ${n(d)}`, first: `${b} ${TIMES} ${c}`, chain: [`${b} ${TIMES} ${c} = ${p}`, `${n(a)} + ${p} = ${n(a + p)}`, `${n(a + p)} ${MINUS} ${n(d)} = ${n(value)}`], value, bugs: [leftBug(`${b} ${TIMES} ${c}`, (a + b) * c - d)] };
    }
    case 'klammer-mal-minus': {
      const a = x(2, 12);
      const s = r3(a + b);
      const total = r3(s * c);
      const d = taken(total);
      const value = r3(total - d);
      return { shape, expr: `(${n(a)} + ${b}) ${TIMES} ${c} ${MINUS} ${n(d)}`, first: `${n(a)} + ${b}`, chain: [`${n(a)} + ${b} = ${n(s)}`, `${n(s)} ${TIMES} ${c} = ${n(total)}`, `${n(total)} ${MINUS} ${n(d)} = ${n(value)}`], value, bugs: [klammerBug(`${n(a)} + ${b}`, a + b * c - d)] };
    }
    case 'mal-plus-mal': {
      const a = rng.int(2, 9);
      const e = x(2, 9);
      const p = a * b;
      const s = r3(c * e);
      const value = r3(p + s);
      return { shape, expr: `${a} ${TIMES} ${b} + ${c} ${TIMES} ${n(e)}`, first: `${a} ${TIMES} ${b}`, chain: [`${a} ${TIMES} ${b} = ${p}`, `${c} ${TIMES} ${n(e)} = ${n(s)}`, `${p} + ${n(s)} = ${n(value)}`], value, bugs: [leftBug(`${c} ${TIMES} ${n(e)}`, (p + c) * e)] };
    }
    case 'mal-klammer-minus': {
      const a = rng.int(2, 9);
      const e = x(2, 9);
      const s = r3(b + e);
      const total = r3(a * s);
      const d = taken(total);
      const value = r3(total - d);
      return { shape, expr: `${a} ${TIMES} (${b} + ${n(e)}) ${MINUS} ${n(d)}`, first: `${b} + ${n(e)}`, chain: [`${b} + ${n(e)} = ${n(s)}`, `${a} ${TIMES} ${n(s)} = ${n(total)}`, `${n(total)} ${MINUS} ${n(d)} = ${n(value)}`], value, bugs: [klammerBug(`${b} + ${n(e)}`, a * b + e - d)] };
    }
  }
}

function computeThree(stufe: Stufe, ab: Ab, t: Three): Exercise {
  return build(SKILL, stufe, {
    key: `drei:${t.shape}:${t.expr}`,
    ab,
    prompt: 'Rechne.',
    expression: `${t.expr} = ${BOX}`,
    answer: num(t.value),
    hints: [t.expr.includes('(') ? 'Zuerst die Klammer. Dann Punkt vor Strich.' : RULE, `Beginne mit ${t.first}.`],
    steps: t.chain,
    bugs: commaBugs(t.bugs, t.value),
    praise: `Du hast mit ${t.first} begonnen.`,
    srText: say('Rechne.', `${t.expr} = ${BOX}`),
    kmk: KMK,
  });
}

interface FractionTerm {
  shape: string;
  expr: string;
  first: string;
  chain: string[];
  value: Q;
  /** The value with the Klammer left out. */
  wrong: Q | null;
}

/**
 * Plus and minus only: terme.rechenterm is core, and NR has Bruch · and : in Klasse 7/8 (§2.3). Nenner of a term share a Hauptnenner up to 24 (brueche.plus-minus, Stufe 3). AB I: one Nenner a multiple of the others. AB II and III: Nenner that are no
 * multiple of each other.
 */
const NENNER: Record<'leicht' | 'mittel', readonly (readonly number[])[]> = {
  leicht: [[2, 4, 8], [3, 6, 12], [2, 5, 10]],
  mittel: [[3, 4, 6, 12], [3, 4, 8], [4, 5, 10], [2, 3, 6]],
};

/** Klammern with fractions: 'leicht' and 'mittel' have two operations, 'schwer' a third Strich step. The result is a proper fraction, never a number of the term, and no line falls to 0 or under it. */
function fractionTerm(rng: Rng, level: 'leicht' | 'mittel' | 'schwer'): FractionTerm {
  const family = rng.pick(level === 'leicht' ? NENNER.leicht : NENNER.mittel);
  for (;;) {
    const [a, b, c] = [pickQ(rng, family), pickQ(rng, family), pickQ(rng, family)];
    const ds = [a.d, b.d, c.d];
    if (level === 'leicht' ? new Set(ds).size < 2 : !ds.some((x) => ds.some((y) => x % y !== 0 && y % x !== 0))) continue;
    const shape = rng.pick(['minus-summe', 'minus-differenz', 'plus-differenz', 'summe-minus'] as const);
    const [as, bs, cs] = [qs(a), qs(b), qs(c)];
    const above = (x: Q, y: Q) => x.n * y.d > y.n * x.d;
    let t: FractionTerm;
    if (shape === 'minus-summe') {
      const s = add(b, c);
      if (!above(a, s)) continue;
      t = { shape, expr: `${as} ${MINUS} (${bs} + ${cs})`, first: `${bs} + ${cs}`, chain: [`${bs} + ${cs} = ${qs(s)}`, `${as} ${MINUS} ${qs(s)} = ${qs(sub(a, s))}`], value: sub(a, s), wrong: above(a, b) ? add(sub(a, b), c) : null };
    } else if (shape === 'minus-differenz') {
      if (!above(b, c)) continue;
      const d = sub(b, c);
      if (!above(a, d)) continue;
      t = { shape, expr: `${as} ${MINUS} (${bs} ${MINUS} ${cs})`, first: `${bs} ${MINUS} ${cs}`, chain: [`${bs} ${MINUS} ${cs} = ${qs(d)}`, `${as} ${MINUS} ${qs(d)} = ${qs(sub(a, d))}`], value: sub(a, d), wrong: above(a, b) && above(sub(a, b), c) ? sub(sub(a, b), c) : null };
    } else if (shape === 'plus-differenz') {
      if (!above(b, c)) continue;
      const d = sub(b, c);
      t = { shape, expr: `${as} + (${bs} ${MINUS} ${cs})`, first: `${bs} ${MINUS} ${cs}`, chain: [`${bs} ${MINUS} ${cs} = ${qs(d)}`, `${as} + ${qs(d)} = ${qs(add(a, d))}`], value: add(a, d), wrong: null };
    } else {
      const s = add(a, b);
      if (s.d === 1 || !above(s, c)) continue;
      t = { shape, expr: `(${as} + ${bs}) ${MINUS} ${cs}`, first: `${as} + ${bs}`, chain: [`${as} + ${bs} = ${qs(s)}`, `${qs(s)} ${MINUS} ${cs} = ${qs(sub(s, c))}`], value: sub(s, c), wrong: null };
    }
    const shown = [a, b, c];
    if (level === 'schwer') {
      const e = pickQ(rng, family);
      if (!above(t.value, e)) continue;
      const end = sub(t.value, e);
      shown.push(e);
      t = { ...t, shape: `${t.shape}-minus`, expr: `${t.expr} ${MINUS} ${qs(e)}`, chain: [...t.chain, `${qs(t.value)} ${MINUS} ${qs(e)} = ${qs(end)}`], value: end, wrong: t.wrong && above(t.wrong, e) ? sub(t.wrong, e) : null };
    }
    if (t.value.d === 1 || t.value.n >= t.value.d || t.chain.some((line) => / = 1$/.test(line)) || shown.some((x) => sameQ(x, t.value))) continue;
    return t;
  }
}

const klammerFraction = (first: string, raw: Q) => ({ id: 'klammer-teilweise', hint: `In der Klammer steht ${first}. Rechne das zuerst aus.`, raw });

function computeFraction(stufe: Stufe, ab: Ab, t: FractionTerm): Exercise {
  return build(SKILL, stufe, {
    key: `bruch:${t.shape}:${t.expr}`,
    ab,
    prompt: 'Rechne. Kürze das Ergebnis.',
    expression: `${t.expr} = ${BOX}`,
    answer: mixedFraction(t.value),
    hints: ['Zuerst die Klammer. Dann von links nach rechts.', `Beginne mit ${t.first}.`],
    steps: t.chain,
    bugs: qBugs(t.wrong ? [klammerFraction(t.first, t.wrong)] : [], t.value),
    praise: 'Du hast die Brüche in der richtigen Reihenfolge verrechnet.',
    srText: say('Rechne. Kürze das Ergebnis.', `${t.expr} = ${BOX}`),
    kmk: KMK,
  });
}

/** A fictional calculation with one planted step (§7.1 Fehlerdetektiv): which line is the first that no longer has the value of the term? */
function plantedStep(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const decimal = rng.chance(0.3);
  const x = (lo: number, hi: number) => (decimal ? rng.int(lo * 10 + 1, hi * 10 - 1) / 10 : rng.int(lo, hi));
  /** The number taken away stays below every value it is taken from: no line of this calculation falls under 0. */
  const taken = (...from: number[]) => x(1, Math.min(9, Math.floor(Math.min(...from)) - 1));
  const shape = rng.pick(['strich-vor-punkt', 'punkt-zu-spaet', 'klammer-weg', 'mal-mal', 'rechenfehler'] as const);
  let lines: string[];
  let wrongLine: number;
  let right: string;
  let rule: string;
  if (shape === 'strich-vor-punkt') {
    const [a, b, c] = [x(3, 20), rng.int(2, 9), rng.int(2, 9)];
    const bad = r3((a + b) * c);
    const d = taken(bad, a + b * c);
    lines = [`${n(a)} + ${b} ${TIMES} ${c} ${MINUS} ${n(d)}`, `${n(a + b)} ${TIMES} ${c} ${MINUS} ${n(d)}`, `${n(bad)} ${MINUS} ${n(d)}`, n(bad - d)];
    wrongLine = 1;
    right = `${lines[0]} = ${n(a)} + ${b * c} ${MINUS} ${n(d)} = ${n(a + b * c - d)}`;
    rule = `Punkt vor Strich: ${b} ${TIMES} ${c} kommt zuerst.`;
  } else if (shape === 'punkt-zu-spaet') {
    const [a, b, c] = [x(2, 12), rng.int(2, 9), rng.int(5, 9)];
    const d = rng.int(1, c - 1);
    const s = r3(a + b);
    lines = [`(${n(a)} + ${b}) ${TIMES} ${c} ${MINUS} ${d}`, `${n(s)} ${TIMES} ${c} ${MINUS} ${d}`, `${n(s)} ${TIMES} ${c - d}`, n(s * (c - d))];
    wrongLine = 2;
    right = `${lines[0]} = ${n(s)} ${TIMES} ${c} ${MINUS} ${d} = ${n(s * c)} ${MINUS} ${d} = ${n(s * c - d)}`;
    rule = `Punkt vor Strich: ${n(s)} ${TIMES} ${c} kommt vor der Minusrechnung.`;
  } else if (shape === 'klammer-weg') {
    const [a, b, c] = [rng.int(2, 9), x(2, 12), rng.int(2, 9)];
    const bad = r3(a * b + c);
    const d = taken(bad, a * (b + c));
    lines = [`${a} ${TIMES} (${n(b)} + ${c}) ${MINUS} ${n(d)}`, `${n(a * b)} + ${c} ${MINUS} ${n(d)}`, `${n(bad)} ${MINUS} ${n(d)}`, n(bad - d)];
    wrongLine = 1;
    right = `${lines[0]} = ${a} ${TIMES} ${n(b + c)} ${MINUS} ${n(d)} = ${n(a * (b + c))} ${MINUS} ${n(d)} = ${n(a * (b + c) - d)}`;
    rule = `Die Klammer kommt zuerst: ${n(b)} + ${c}.`;
  } else if (shape === 'mal-mal') {
    const [a, b, c] = [rng.int(2, 9), rng.int(2, 9), rng.int(2, 9)];
    const d = rng.int(2, 9);
    const p = a * b;
    lines = [`${a} ${TIMES} ${b} + ${c} ${TIMES} ${d}`, `${p} + ${c} ${TIMES} ${d}`, `${p + c} ${TIMES} ${d}`, n((p + c) * d)];
    wrongLine = 2;
    right = `${lines[0]} = ${p} + ${c * d} = ${p + c * d}`;
    rule = `Punkt vor Strich: ${c} ${TIMES} ${d} kommt vor der Plusrechnung.`;
  } else {
    const [a, b, c] = [x(3, 20), rng.int(2, 9), rng.int(2, 9)];
    const p = b * c;
    const d = taken(a + p);
    const off = rng.pick([10, 2, 1]);
    lines = [`${n(a)} + ${b} ${TIMES} ${c} ${MINUS} ${n(d)}`, `${n(a)} + ${p} ${MINUS} ${n(d)}`, `${n(a + p + off)} ${MINUS} ${n(d)}`, n(a + p + off - d)];
    wrongLine = 2;
    right = `${lines[0]} = ${n(a)} + ${p} ${MINUS} ${n(d)} = ${n(a + p)} ${MINUS} ${n(d)} = ${n(a + p - d)}`;
    rule = `Rechne nach: ${n(a)} + ${p} = ${n(a + p)}.`;
  }
  const name = pickPerson(rng).name;
  const prompt = `Diese Rechnung von ${name} stimmt noch nicht. In welcher Zeile steht der erste Fehler?`;
  const options = lines.slice(1);
  return build(SKILL, stufe, {
    key: `fehler:${shape}:${lines[0]}`,
    ab,
    prompt,
    visual: { type: 'term', lines },
    answer: makeChoice(rng, { label: lines[wrongLine] }, options.flatMap((label, i) => (i + 1 === wrongLine ? [] : [{ label, whyWrong: i + 1 < wrongLine ? 'Diese Zeile hat noch denselben Wert wie der Term. Prüfe die Zeilen danach.' : 'Der Rechenschritt selbst stimmt. Prüfe noch einmal von vorn.' }]))),
    hints: ['Prüfe Zeile für Zeile. Hat jede Zeile noch denselben Wert?', lines[0].includes('(') ? 'Zuerst die Klammer. Dann Punkt vor Strich.' : RULE],
    steps: [`Der erste Fehler: ${lines[wrongLine]}`, rule, `Richtig: ${right}`],
    praise: 'Du hast den Fehler Zeile für Zeile gefunden.',
    srText: say(prompt),
    kmk: KMK_REASON,
  });
}

// ─── The skill ───────────────────────────────────────────────────────────────

function stufe1(rng: Rng, ab: Ab): Exercise {
  if (ab === 1) return computeTwo(1, ab, withoutAnswer(() => twoOps(rng, false)));
  if (ab === 2) return rng.chance(0.6) ? computeTwo(1, ab, withoutAnswer(() => twoOps(rng, true))) : firstStep(rng, 1, ab);
  return rng.pick([gapTwo, correctIt, whichValue])(rng, 1, ab);
}

function stufe2(rng: Rng, ab: Ab): Exercise {
  if (ab === 1) return computeBracket(2, ab, withoutAnswer(() => bracket(rng, false)));
  if (ab === 2) return computeBracket(2, ab, withoutAnswer(() => bracket(rng, true)));
  return rng.pick([gapBracket, difference, whichBracket])(rng, 2, ab);
}

function stufe3(rng: Rng, ab: Ab): Exercise {
  if (ab === 1) return rng.chance(0.5) ? computeThree(3, ab, withoutAnswer(() => threeOps(rng, false))) : computeFraction(3, ab, fractionTerm(rng, 'leicht'));
  if (ab === 2) return rng.chance(0.3) ? computeThree(3, ab, withoutAnswer(() => threeOps(rng, true))) : computeFraction(3, ab, fractionTerm(rng, 'mittel'));
  return rng.chance(0.7) ? plantedStep(rng, 3, ab) : computeFraction(3, ab, fractionTerm(rng, 'schwer'));
}

export const rechentermSkill: SkillDef = {
  ...SKILL,
  title: 'Reihenfolge beim Rechnen',
  description: 'Du rechnest Terme mit Punkt vor Strich und Klammern.',
  stufen: { 1: 'Natürliche Zahlen, zwei Rechenarten', 2: 'Klammern, Dezimalzahlen mit einer Stelle', 3: 'Brüche, drei Rechenarten und ein Fehler im Rechenweg' },
  kmk: ['ZO.terme', 'PK.argumentieren'],
  keys: { comma: true, mixed: true },
  generate(rng, stufe, ctx) {
    const ab = targetAb(rng, stufe, ctx);
    return stufe === 1 ? stufe1(rng, ab) : stufe === 2 ? stufe2(rng, ab) : stufe3(rng, ab);
  },
};
