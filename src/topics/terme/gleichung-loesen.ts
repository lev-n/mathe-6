/**
 * terme.gleichung-loesen: with equal steps on both sides. Stufe 1: x + b = c. Stufe 2: a · x = c with a whole result. Stufe 3: from a text to an equation, and fractions. AB varies the demand inside the Stufe: the plain form, x − b = c or
 * x : a = c or harder numbers, then the step named, an equation of equal solution, or a text solved to the end. Choice or number only (§6): a fractional x is chosen, not typed. The answer never equals a number beside x.
 */
import { MINUS, TIMES } from '../../core/format';
import type { Ab, ChoiceOption, Exercise, Rng, SkillDef, Stufe } from '../../core/types';
import { build, makeChoice, numberBugs, pickPerson, targetAb, type MaybeBug } from '../shared';
import { add, mul, NENNER_PAIRS, other, pickQ, q, qs, sameQ, say, sub, type Q } from './helpers';

const SKILL = { id: 'terme.gleichung-loesen', topicId: 'terme' } as const;
const KMK = ['SF.gleichungen'];
const KMK_REASON = ['SF.gleichungen', 'PK.argumentieren'];
const KMK_STORY = ['SF.gleichungen', 'PK.modellieren'];
const SOLVE = 'Löse die Gleichung. Welche Zahl ist x?';

const answer = (value: number) => ({ kind: 'number' as const, value, label: 'x' });
const same = (hint: string, value: number): MaybeBug => ({ id: 'umkehr-gleiche-rechnung', match: value, hint });

function solve(stufe: Stufe, ab: Ab, key: string, expr: string, value: number, hints: string[], steps: string[], bugs: MaybeBug[], praise: string): Exercise {
  return build(SKILL, stufe, {
    key: `${key}:${expr}`,
    ab,
    prompt: SOLVE,
    expression: expr,
    answer: answer(value),
    hints,
    steps,
    bugs: numberBugs(bugs, value),
    praise,
    srText: say(SOLVE, expr),
    kmk: KMK,
  });
}

function xPlus(stufe: Stufe, ab: Ab, b: number, c: number, swapped = false): Exercise {
  const expr = swapped ? `${b} + x = ${c}` : `x + ${b} = ${c}`;
  return solve(stufe, ab, 'plus', expr, c - b,
    [`Die Umkehrung von plus ${b} ist minus ${b}.`, `Rechne auf beiden Seiten minus ${b}.`],
    [`Auf beiden Seiten minus ${b}: x = ${c} ${MINUS} ${b}`, `${c} ${MINUS} ${b} = ${c - b}`, `Probe: ${c - b} + ${b} = ${c}`],
    [same(`Die Umkehrung von plus ${b} ist minus ${b}.`, c + b)],
    `Du hast auf beiden Seiten ${b} abgezogen.`);
}

function xMinus(stufe: Stufe, ab: Ab, b: number, c: number): Exercise {
  const expr = `x ${MINUS} ${b} = ${c}`;
  return solve(stufe, ab, 'minus', expr, c + b,
    [`Die Umkehrung von minus ${b} ist plus ${b}.`, `Rechne auf beiden Seiten plus ${b}.`],
    [`Auf beiden Seiten plus ${b}: x = ${c} + ${b}`, `${c} + ${b} = ${c + b}`, `Probe: ${c + b} ${MINUS} ${b} = ${c}`],
    [c > b && same(`Die Umkehrung von minus ${b} ist plus ${b}.`, c - b)],
    `Du hast auf beiden Seiten ${b} addiert.`);
}

function xTimes(stufe: Stufe, ab: Ab, a: number, x: number): Exercise {
  const c = a * x;
  const expr = `${a} ${TIMES} x = ${c}`;
  return solve(stufe, ab, 'mal', expr, x,
    [`Die Umkehrung von mal ${a} ist geteilt durch ${a}.`, `Teile beide Seiten durch ${a}.`],
    [`Beide Seiten geteilt durch ${a}: x = ${c} : ${a}`, `${c} : ${a} = ${x}`, `Probe: ${a} ${TIMES} ${x} = ${c}`],
    [same(`Die Umkehrung von mal ${a} ist geteilt durch ${a}.`, c * a), { id: 'umkehr-gleiche-rechnung', match: c - a, hint: `${a} ${TIMES} x heißt ${a} mal x. Teile durch ${a}.` }],
    `Du hast beide Seiten durch ${a} geteilt.`);
}

function xDiv(stufe: Stufe, ab: Ab, a: number, c: number): Exercise {
  const expr = `x : ${a} = ${c}`;
  return solve(stufe, ab, 'durch', expr, a * c,
    [`Die Umkehrung von geteilt durch ${a} ist mal ${a}.`, `Multipliziere beide Seiten mit ${a}.`],
    [`Beide Seiten mal ${a}: x = ${c} ${TIMES} ${a}`, `${c} ${TIMES} ${a} = ${a * c}`, `Probe: ${a * c} : ${a} = ${c}`],
    [Number.isInteger(c / a) && same(`Die Umkehrung von geteilt durch ${a} ist mal ${a}.`, c / a)],
    `Du hast beide Seiten mit ${a} multipliziert.`);
}

/** Which step solves it? */
function whichStep(rng: Rng, stufe: Stufe, ab: Ab, expr: string, correct: string, wrongs: ChoiceOption[], result: string): Exercise {
  const prompt = 'Welcher Schritt führt zu x?';
  return build(SKILL, stufe, {
    key: `schritt:${expr}`,
    ab,
    prompt,
    expression: expr,
    answer: makeChoice(rng, { label: correct }, wrongs),
    hints: ['Was steht bei x? Kehre diese Rechnung um.', 'Rechne immer auf beiden Seiten dasselbe.'],
    steps: [correct, result],
    praise: 'Du hast den passenden Schritt für beide Seiten gewählt.',
    srText: say(prompt, expr),
    kmk: KMK_REASON,
  });
}

function stepPlus(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const b = rng.int(3, 30);
  const c = b + rng.int(3, 40);
  return whichStep(rng, stufe, ab, rng.chance(0.3) ? `${b} + x = ${c}` : `x + ${b} = ${c}`, `Auf beiden Seiten minus ${b}`, [
    { label: `Auf beiden Seiten plus ${b}`, whyWrong: `Dann steht links noch einmal plus ${b}. Die Umkehrung von plus ist minus.` },
    { label: `Nur links minus ${b}`, whyWrong: 'Die Gleichung bleibt nur richtig, mit demselben Schritt auf beiden Seiten.' },
    { label: `Auf beiden Seiten minus ${c}`, whyWrong: `Links bleibt dann nicht x allein. Bei x steht plus ${b}.` },
  ], `x = ${c} ${MINUS} ${b} = ${c - b}`);
}

function stepMinus(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const b = rng.int(3, 30);
  const c = rng.int(3, 40);
  return whichStep(rng, stufe, ab, `x ${MINUS} ${b} = ${c}`, `Auf beiden Seiten plus ${b}`, [
    { label: `Auf beiden Seiten minus ${b}`, whyWrong: 'Die Umkehrung von minus ist plus.' },
    { label: `Nur links plus ${b}`, whyWrong: 'Die Gleichung bleibt nur richtig, mit demselben Schritt auf beiden Seiten.' },
    { label: `Auf beiden Seiten plus ${c}`, whyWrong: `Links bleibt dann nicht x allein. Bei x steht minus ${b}.` },
  ], `x = ${c} + ${b} = ${c + b}`);
}

/** Which equation has the same solution, with plus: equal steps on both sides keep it. */
function samePlus(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const b = rng.int(3, 30);
  const x = rng.int(3, 40);
  const k = rng.int(2, 20);
  const c = b + x;
  const expr = `x + ${b} = ${c}`;
  const prompt = 'Welche Gleichung hat dieselbe Lösung?';
  return build(SKILL, stufe, {
    key: `gleiche-plus:${expr}:${k}`,
    ab,
    prompt,
    expression: expr,
    answer: makeChoice(rng, { label: `x + ${b + k} = ${c + k}` }, [
      { label: `x + ${b + k} = ${c}`, whyWrong: `Du hast nur links plus ${k} gerechnet.` },
      { label: `x + ${b} = ${c + k}`, whyWrong: `Du hast nur rechts plus ${k} gerechnet.` },
      { label: `x + ${b + k} = ${c + 2 * k}`, whyWrong: 'Links und rechts kommen verschiedene Zahlen dazu.' },
    ]),
    hints: ['Rechne auf beiden Seiten dasselbe. Dann bleibt die Lösung gleich.', `Löse zuerst: x = ${c} ${MINUS} ${b}.`],
    steps: [`Beide Seiten plus ${k}: x + ${b + k} = ${c + k}`, `Die Lösung bleibt x = ${x}.`],
    praise: 'Du hast die Gleichung mit derselben Lösung erkannt.',
    srText: say(prompt, expr),
    kmk: KMK_REASON,
  });
}

function stepTimes(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const a = rng.int(3, 12);
  const x = rng.int(4, 15);
  const c = a * x;
  return whichStep(rng, stufe, ab, `${a} ${TIMES} x = ${c}`, `Beide Seiten geteilt durch ${a}`, [
    { label: `Auf beiden Seiten minus ${a}`, whyWrong: `Zwischen ${a} und x steht ein Malzeichen. Die Umkehrung ist geteilt.` },
    { label: `Beide Seiten mal ${a}`, whyWrong: 'Die Umkehrung von mal ist geteilt.' },
    { label: `Nur links geteilt durch ${a}`, whyWrong: 'Die Gleichung bleibt nur richtig, mit demselben Schritt auf beiden Seiten.' },
  ], `x = ${c} : ${a} = ${x}`);
}

/** Which equation has the same solution? Equal steps keep the solution. */
function sameSolution(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const a = rng.int(3, 9);
  const x = rng.int(4, 12);
  const k = rng.int(2, 5);
  const c = a * x;
  const expr = `${a} ${TIMES} x = ${c}`;
  const prompt = 'Welche Gleichung hat dieselbe Lösung?';
  return build(SKILL, stufe, {
    key: `gleiche-loesung:${expr}:${k}`,
    ab,
    prompt,
    expression: expr,
    answer: makeChoice(rng, { label: `${a * k} ${TIMES} x = ${c * k}` }, [
      { label: `${a * k} ${TIMES} x = ${c}`, whyWrong: `Du hast nur die linke Seite mal ${k} gerechnet.` },
      { label: `${a} ${TIMES} x = ${c * k}`, whyWrong: `Du hast nur die rechte Seite mal ${k} gerechnet.` },
      { label: `${a + k} ${TIMES} x = ${c + k}`, whyWrong: `Hier steht ${a + k} mal x. Das ist nicht beide Seiten plus ${k}.` },
    ]),
    hints: ['Rechne auf beiden Seiten dasselbe. Dann bleibt die Lösung gleich.', `Löse zuerst: x = ${c} : ${a}.`],
    steps: [`Beide Seiten mal ${k}: ${a * k} ${TIMES} x = ${c * k}`, `Die Lösung bleibt x = ${x}.`],
    praise: 'Du hast die Gleichung mit derselben Lösung erkannt.',
    srText: say(prompt, expr),
    kmk: KMK_REASON,
  });
}

// ─── Stufe 3 ─────────────────────────────────────────────────────────────────

/** A fractional x, chosen: x + 1/4 = 5/8. Above the typed a · x = c of Stufe 2: the Nenner must be made equal first. Not x = op: then the correct option repeats the number beside x, and the hints name it. */
function fractionPlus(rng: Rng, ab: 1 | 2): Exercise {
  for (;;) {
    const [d1, d2] = rng.shuffle(rng.pick(NENNER_PAIRS[ab]));
    const op = pickQ(rng, [d1]);
    const right = pickQ(rng, [d2]);
    const value = sub(right, op);
    if (value.n <= 0 || value.d === 1 || sameQ(value, op)) continue;
    const wrongSum = add(right, op);
    if (wrongSum.d === 1) continue;
    const expr = `x + ${qs(op)} = ${qs(right)}`;
    const wrongs: ChoiceOption[] = [{ label: qs(wrongSum), whyWrong: `Die Umkehrung von plus ${qs(op)} ist minus ${qs(op)}.` }];
    // Zähler and Nenner handled as separate numbers (F1): only where it gives a real fraction of another value.
    const rawD = Math.abs(right.d - op.d);
    const rawN = right.n - op.n;
    if (rawD > 0 && rawN > 0 && !sameQ(q(rawN, rawD), value) && !sameQ(q(rawN, rawD), wrongSum) && q(rawN, rawD).d > 1) wrongs.push({ label: qs(q(rawN, rawD)), whyWrong: 'Mach die Nenner zuerst gleich. Rechne dann die Zähler.' });
    const half = mul(right, q(1, 2));
    if (!sameQ(half, value) && !sameQ(half, wrongSum)) wrongs.push({ label: qs(half), whyWrong: `Rechne auf beiden Seiten minus ${qs(op)}.` });
    if (!sameQ(right, value) && !sameQ(right, wrongSum)) wrongs.push({ label: qs(right), whyWrong: `Das ist die rechte Seite. Ziehe noch ${qs(op)} ab.` });
    return build(SKILL, 3, {
      key: `bruch-plus:${expr}`,
      ab,
      prompt: SOLVE,
      expression: expr,
      answer: makeChoice(rng, { label: qs(value) }, wrongs),
      hints: [`Die Umkehrung von plus ${qs(op)} ist minus ${qs(op)}.`, 'Mach die Nenner gleich. Rechne dann die Zähler.'],
      steps: [`Auf beiden Seiten minus ${qs(op)}: x = ${qs(right)} ${MINUS} ${qs(op)}`, `x = ${qs(value)}`, `Probe: ${qs(value)} + ${qs(op)} = ${qs(right)}`],
      praise: 'Du hast die passende Zahl für x gewählt.',
      srText: say(SOLVE, expr),
      kmk: KMK,
    });
  }
}

/** 1/2 · x = 6: x is a whole number. */
function fractionTimes(rng: Rng, ab: Ab): Exercise {
  for (;;) {
    // AB III: no equation of AB I comes back. A Zähler above 1 and larger numbers need the two steps of the inverse.
    const f: Q = pickQ(rng, ab === 1 ? [2, 3, 4, 5] : [3, 4, 5, 6, 8, 10]);
    if (ab === 3 && f.n === 1) continue;
    const x = f.d * (ab === 3 ? rng.int(9, 15) : rng.int(1, 8));
    const c = (f.n * x) / f.d;
    if (c < 3 || !Number.isInteger(c) || x === c) continue;
    const expr = `${qs(f)} ${TIMES} x = ${c}`;
    const wrong = (c * f.n) / f.d;
    return solve(3, ab, 'bruch-mal', expr, x,
      [`Die Umkehrung von mal ${qs(f)} ist geteilt durch ${qs(f)}.`, `Rechne: ${f.n === 1 ? `${c} ${TIMES} ${f.d}` : `${c} : ${f.n} ${TIMES} ${f.d}`}.`],
      [f.n === 1 ? `Beide Seiten mal ${f.d}: x = ${c} ${TIMES} ${f.d}` : `Beide Seiten geteilt durch ${qs(f)}: x = ${c} : ${f.n} ${TIMES} ${f.d}`, `x = ${x}`, `Probe: ${qs(f)} ${TIMES} ${x} = ${c}`],
      [Number.isInteger(wrong) && same(`Die Umkehrung von mal ${qs(f)} ist geteilt durch ${qs(f)}.`, wrong)],
      `Du hast beide Seiten durch ${qs(f)} geteilt.`);
  }
}

/** An equation from a text: the variable is named, the term is what the text says. */
function toEquation(rng: Rng, ab: Ab): Exercise {
  const name = pickPerson(rng).name;
  const kind = rng.pick(['stueck', 'bleibt', 'dazu', 'teilen', 'zwei-schritte'] as const);
  const prompt = 'Welche Gleichung passt?';
  let context: string;
  let correct: string;
  let wrongs: ChoiceOption[];
  if (kind === 'stueck') {
    // A Heft costs a few €.
    const [a, x] = [rng.int(3, 12), rng.int(2, 5)];
    const c = a * x;
    context = `Ein Heft kostet x €. ${name} kauft ${a} Hefte und bezahlt ${c} €.`;
    correct = `${a} ${TIMES} x = ${c}`;
    wrongs = [
      { label: `x + ${a} = ${c}`, whyWrong: `${a} Hefte kosten ${a}-mal so viel wie ein Heft.` },
      { label: `x : ${a} = ${c}`, whyWrong: `${a} Hefte kosten mehr als ein Heft. Beim Teilen wird es weniger.` },
      { label: `${a} ${TIMES} ${c} = x`, whyWrong: `Der Preis für alle ist ${c} €. x ist der Preis für ein Heft.` },
    ];
  } else if (kind === 'bleibt') {
    const [b, c] = [rng.int(3, 15), rng.int(3, 25)];
    context = `${name} hat x €. Nach dem Kauf eines Balls für ${b} € bleiben ${c} €.`;
    correct = `x ${MINUS} ${b} = ${c}`;
    wrongs = [
      { label: `x + ${b} = ${c}`, whyWrong: 'Beim Kauf wird das Geld weniger.' },
      { label: `${b} ${MINUS} x = ${c}`, whyWrong: 'Prüfe die Reihenfolge: Wovon geht der Preis ab?' },
      { label: `${b} ${TIMES} x = ${c}`, whyWrong: `Der Ball kostet einmal ${b} €.` },
    ];
  } else if (kind === 'dazu') {
    const [a, c] = [rng.int(3, 20), rng.int(30, 60)];
    context = `Die Klasse 6b hat x Bücher. ${a} neue Bücher kommen dazu. Jetzt hat die Klasse ${c} Bücher.`;
    correct = `x + ${a} = ${c}`;
    wrongs = [
      { label: `x ${MINUS} ${a} = ${c}`, whyWrong: 'Neue Bücher machen den Bestand größer.' },
      { label: `${a} ${TIMES} x = ${c}`, whyWrong: `Es kommen einmal ${a} Bücher dazu.` },
      { label: `x = ${a} + ${c}`, whyWrong: `${c} ist schon die Anzahl mit den neuen Büchern.` },
    ];
  } else if (kind === 'teilen') {
    const [k, c] = [rng.int(3, 9), rng.int(3, 15)];
    context = `${k} Personen teilen x € gleich auf. Jede Person bekommt ${c} €.`;
    correct = `x : ${k} = ${c}`;
    wrongs = [
      { label: `x ${TIMES} ${k} = ${c}`, whyWrong: 'Jede Person bekommt einen Teil. Das ist weniger als x.' },
      { label: `${k} : x = ${c}`, whyWrong: 'Prüfe die Reihenfolge: Welche Zahl teilst du?' },
      { label: `x ${MINUS} ${k} = ${c}`, whyWrong: `Das Geld geht in ${k} gleiche Teile. Prüfe die Rechenart.` },
    ];
  } else {
    const [a, b, x] = [rng.int(2, 8), rng.int(2, 6), rng.int(2, 5)];
    const c = a * x + b;
    context = `Ein Heft kostet x €. ${name} kauft ${a} Hefte und einen Block für ${b} €. Alles kostet ${c} €.`;
    correct = `${a} ${TIMES} x + ${b} = ${c}`;
    wrongs = [
      { label: `${a} ${TIMES} (x + ${b}) = ${c}`, whyWrong: 'Der Block kommt nur einmal dazu.' },
      { label: `x + ${a} + ${b} = ${c}`, whyWrong: `${a} Hefte kosten ${a}-mal so viel wie ein Heft.` },
      { label: `${a} ${TIMES} x ${MINUS} ${b} = ${c}`, whyWrong: 'Der Block kostet etwas dazu. Das ist eine Plusrechnung.' },
    ];
  }
  return build(SKILL, 3, {
    key: `text:${kind}:${correct}`,
    ab,
    context,
    prompt,
    answer: makeChoice(rng, { label: correct }, wrongs),
    hints: ['Was steht für x im Text? Schreibe die Rechnung mit x auf.', 'Prüfe deine Gleichung: Passt jede Zahl zum Text?'],
    steps: [`Die Gleichung: ${correct}`],
    praise: 'Du hast die passende Gleichung zum Text gewählt.',
    srText: say(context, prompt),
    kmk: KMK_STORY,
  });
}

/** Stories of solveText, each with prices that fit its things. */
const SOLVE_STORIES: readonly { things: string; extra: string; each: string; question: string; price: readonly [number, number]; once: readonly [number, number] }[] = [
  { things: 'gleiche Hefte', extra: 'einen Block', each: 'eines Heftes', question: 'Wie viel kostet 1 Heft?', price: [2, 5], once: [2, 6] },
  { things: 'gleiche Karten für ein Konzert', extra: 'ein Programmheft', each: 'einer Karte', question: 'Wie viel kostet 1 Karte?', price: [12, 30], once: [3, 8] },
  { things: 'gleiche Eintrittskarten für das Schwimmbad', extra: 'ein Eis', each: 'einer Eintrittskarte', question: 'Wie viel kostet 1 Eintrittskarte?', price: [3, 7], once: [2, 4] },
  { things: 'gleiche Schläuche für das Fahrrad', extra: 'eine Pumpe', each: 'eines Schlauchs', question: 'Wie viel kostet 1 Schlauch?', price: [5, 11], once: [9, 18] },
];

/** From the text to x: two steps. */
function solveText(rng: Rng, ab: Ab): Exercise {
  const name = pickPerson(rng).name;
  const story = rng.pick(SOLVE_STORIES);
  const [a, b, x] = [rng.int(2, 8), rng.int(story.once[0], story.once[1]), rng.int(story.price[0], story.price[1])];
  const c = a * x + b;
  const context = `${name} kauft ${a} ${story.things} und ${story.extra} für ${b} €. Alles kostet ${c} €. x ist der Preis ${story.each} in €.`;
  const prompt = story.question;
  const wrongOrder = c / a - b;
  return build(SKILL, 3, {
    key: `text-loesen:${a}:${b}:${c}`,
    ab,
    context,
    prompt,
    answer: { kind: 'number', value: x, unit: '€', label: `Preis ${story.each}` },
    hints: [`Die Gleichung ist ${a} ${TIMES} x + ${b} = ${c}.`, `Ziehe auf beiden Seiten zuerst ${b} ab.`],
    steps: [`Die Gleichung: ${a} ${TIMES} x + ${b} = ${c}`, `Auf beiden Seiten minus ${b}: ${a} ${TIMES} x = ${c - b}`, `Beide Seiten geteilt durch ${a}: x = ${x}`, `Probe: ${a} ${TIMES} ${x} + ${b} = ${c}`],
    bugs: numberBugs([
      { id: 'schritt-vergessen', match: c - b, hint: `Das ist der Preis für alle ${a} zusammen. Teile noch durch ${a}.` },
      Number.isInteger(wrongOrder) && wrongOrder > 0 && { id: 'umkehr-gleiche-rechnung', match: wrongOrder, hint: `Ziehe zuerst ${b} ab. Dieser Preis gilt nur einmal.` },
      Number.isInteger((c + b) / a) && { id: 'umkehr-gleiche-rechnung', match: (c + b) / a, hint: `Die Umkehrung von plus ${b} ist minus ${b}.` },
    ], x),
    praise: 'Du hast die Gleichung in zwei Schritten gelöst.',
    srText: say(context, prompt),
    kmk: ['SF.gleichungen', 'PK.modellieren', 'PK.problemloesen'],
  });
}

// ─── The skill ───────────────────────────────────────────────────────────────

function stufe1(rng: Rng, ab: Ab): Exercise {
  if (ab === 1) {
    const b = rng.int(2, 30);
    return xPlus(1, ab, b, b + other(rng, 2, 40, b));
  }
  if (ab === 2) {
    if (rng.chance(0.5)) {
      const b = rng.int(25, 90);
      return xPlus(1, ab, b, b + other(rng, 25, 90, b), rng.chance(0.5));
    }
    return xMinus(1, ab, rng.int(3, 40), rng.int(3, 60));
  }
  return rng.pick([stepPlus, stepMinus, samePlus])(rng, 1, ab);
}

/** Above x + b = c of Stufe 1 at each AB: no factor 2 or 3 and no result under 20 at AB I, a divisor and result above the small table at AB II. */
function stufe2(rng: Rng, ab: Ab): Exercise {
  if (ab === 1) {
    const a = rng.int(4, 12);
    return xTimes(2, ab, a, other(rng, 6, 15, a));
  }
  if (ab === 2) {
    if (rng.chance(0.5)) {
      const a = rng.int(11, 25);
      return xTimes(2, ab, a, other(rng, 4, 15, a));
    }
    return xDiv(2, ab, rng.int(6, 15), rng.int(12, 25));
  }
  return rng.chance(0.5) ? stepTimes(rng, 2, ab) : sameSolution(rng, 2, ab);
}

function stufe3(rng: Rng, ab: Ab): Exercise {
  if (ab === 1) return rng.chance(0.5) ? fractionPlus(rng, ab) : fractionTimes(rng, ab);
  if (ab === 2) return rng.chance(0.6) ? toEquation(rng, ab) : fractionPlus(rng, ab);
  return rng.chance(0.7) ? solveText(rng, ab) : fractionTimes(rng, ab);
}

export const gleichungLoesenSkill: SkillDef = {
  ...SKILL,
  title: 'Gleichungen lösen',
  description: 'Du löst Gleichungen mit gleichen Schritten auf beiden Seiten.',
  stufen: { 1: 'x + b = c, natürliche Zahlen', 2: 'a · x = c, ganzes Ergebnis', 3: 'Vom Text zur Gleichung, Brüche' },
  kmk: ['SF.gleichungen', 'PK.argumentieren', 'PK.modellieren', 'PK.problemloesen'],
  generate(rng, stufe, ctx) {
    const ab = targetAb(rng, stufe, ctx);
    return stufe === 1 ? stufe1(rng, ab) : stufe === 2 ? stufe2(rng, ab) : stufe3(rng, ab);
  },
};
