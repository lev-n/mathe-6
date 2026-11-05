/**
 * terme.geschickt: Rechengesetze nutzen. Stufe 1: tauschen zu glatten Zahlen, natural numbers. Stufe 2: Distributivgesetz, 12 · 7 = 10 · 7 + 2 · 7. Stufe 3: decimals and fractions, choosing the better
 * form. AB varies the demand inside the Stufe: the task with the way given or plain, harder numbers, then the way chosen, a gap or a reason.
 */
import { BOX, MINUS, TIMES, frac } from '../../core/format';
import type { Ab, ChoiceOption, Exercise, Rng, SkillDef, Stufe } from '../../core/types';
import { build, makeChoice, targetAb, type MaybeBug } from '../shared';
import { commaBugs, commaNumber, n, other, pickQ, r3, say } from './helpers';

const SKILL = { id: 'terme.geschickt', topicId: 'terme' } as const;
const KMK = ['ZO.terme'];
const KMK_REASON = ['ZO.terme', 'PK.argumentieren'];

const num = (value: number) => commaNumber(value, 'Ergebnis');
const missing = (partial: number): MaybeBug => ({ id: 'zahl-vergessen', match: r3(partial), hint: 'Du hast noch nicht alle Zahlen verrechnet. Prüfe den Term.' });
/** Distributive: one part was not multiplied (§5 klammer-teilweise, H). */
const part = (value: number, factor: string): MaybeBug => ({ id: 'teil-vergessen', match: r3(value), hint: `Beide Teile gehören mal ${factor}. Prüfe die Zerlegung.` });

const notRound = (lo: number, hi: number, rng: Rng) => {
  for (;;) {
    const x = rng.int(lo, hi);
    if (x % 10 !== 0) return x;
  }
};

// ─── Tauschen (Stufe 1) ──────────────────────────────────────────────────────

/** Two summands that make a round number, and a third number between them. */
function sumThree(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const r = rng.pick([50, 100, 100, 200]);
  const p = notRound(11, r - 11, rng);
  const q = r - p;
  let c = notRound(11, 89, rng);
  while (c === p || c === q || (p + c) % 10 === 0 || (q + c) % 10 === 0) c = notRound(11, 89, rng);
  // The pair never stands side by side at the start: tauschen is the point.
  const shown = rng.chance(0.5) ? [p, c, q] : [q, c, p];
  const expr = `${shown.join(' + ')} = ${BOX}`;
  return build(SKILL, stufe, {
    key: `summe:${shown.join('-')}`,
    ab,
    prompt: 'Rechne geschickt.',
    expression: expr,
    answer: num(r + c),
    hints: ['Beim Plusrechnen darfst du tauschen.', `Beginne mit ${p}. Welche Zahl passt dazu?`],
    steps: [`${p} + ${q} = ${r}`, `${r} + ${c} = ${r + c}`],
    bugs: commaBugs([missing(r)], r + c),
    praise: `Du hast zuerst ${p} + ${q} gerechnet.`,
    srText: say('Rechne geschickt.', expr),
    kmk: KMK,
  });
}

// Stufe 1 stays below Stufe 2: small pairs and a third factor of one digit, and only one step that needs thinking.
const PAIRS: readonly [number, number][] = [[2, 5], [4, 5], [2, 50], [4, 25], [5, 20]];
const PAIRS_HARD: readonly [number, number][] = [[4, 25], [4, 75], [2, 35], [5, 60], [8, 25]];

function productThree(rng: Rng, stufe: Stufe, ab: Ab, hard: boolean): Exercise {
  const [p, q] = rng.pick(hard ? PAIRS_HARD : PAIRS);
  const x = other(rng, 3, 9, p, q);
  const shown = rng.chance(0.5) ? [p, x, q] : [q, x, p];
  const expr = `${shown.join(` ${TIMES} `)} = ${BOX}`;
  const value = p * q * x;
  return build(SKILL, stufe, {
    key: `produkt:${shown.join('-')}`,
    ab,
    prompt: 'Rechne geschickt.',
    expression: expr,
    answer: num(value),
    hints: ['Beim Malrechnen darfst du tauschen.', `Rechne zuerst ${p} ${TIMES} ${q}.`],
    steps: [`${p} ${TIMES} ${q} = ${n(p * q)}`, `${n(p * q)} ${TIMES} ${x} = ${n(value)}`],
    bugs: commaBugs([missing(p * q), { id: 'zahl-vergessen', match: p * x, hint: 'Du hast noch nicht alle Zahlen verrechnet. Prüfe den Term.' }], value),
    praise: `Du hast zuerst ${p} ${TIMES} ${q} gerechnet.`,
    srText: say('Rechne geschickt.', expr),
    kmk: KMK,
  });
}

/** Four summands, two pairs. */
function sumFour(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const r1 = rng.pick([40, 50, 100]);
  const r2 = rng.pick([30, 60, 100]);
  const a = notRound(11, r1 - 11, rng);
  const b = notRound(11, r2 - 11, rng);
  const shown = rng.shuffle([a, r1 - a, b, r2 - b]);
  // Never the pairs side by side from the start.
  const pair = new Set([a, r1 - a]);
  const ordered = pair.has(shown[0]) === pair.has(shown[1]) ? [shown[0], shown[2], shown[1], shown[3]] : shown;
  const expr = `${ordered.join(' + ')} = ${BOX}`;
  return build(SKILL, stufe, {
    key: `vier:${ordered.join('-')}`,
    ab,
    prompt: 'Rechne geschickt.',
    expression: expr,
    answer: num(r1 + r2),
    hints: ['Suche zwei Paare mit glatter Summe.', `Beginne mit ${a}. Welche Zahl passt dazu?`],
    steps: [`${a} + ${r1 - a} = ${r1}`, `${b} + ${r2 - b} = ${r2}`, `${r1} + ${r2} = ${r1 + r2}`],
    bugs: commaBugs([missing(r1), missing(r2)], r1 + r2),
    praise: 'Du hast zwei passende Paare gefunden.',
    srText: say('Rechne geschickt.', expr),
    kmk: KMK,
  });
}

/** Which pair first? */
function bestPair(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const r = rng.pick([50, 100, 200]);
  const p = notRound(11, r - 11, rng);
  const q = r - p;
  let c = notRound(11, 89, rng);
  while (c === p || c === q || (p + c) % 10 === 0 || (q + c) % 10 === 0) c = notRound(11, 89, rng);
  const expr = `${p} + ${c} + ${q}`;
  const prompt = 'Welche zwei Zahlen rechnest du am besten zuerst?';
  return build(SKILL, stufe, {
    key: `paar:${expr}`,
    ab,
    prompt,
    expression: expr,
    answer: makeChoice(rng, { label: `${p} + ${q}` }, [
      { label: `${p} + ${c}`, whyWrong: 'Das geht auch. Mit einem anderen Paar entsteht aber eine glatte Zahl.' },
      { label: `${c} + ${q}`, whyWrong: 'Das geht auch. Mit einem anderen Paar entsteht aber eine glatte Zahl.' },
    ]),
    hints: ['Suche das Paar mit einer glatten Summe.', 'Prüfe die Einerstellen.'],
    steps: [`${p} + ${q} = ${r}`, `${r} + ${c} = ${r + c}`],
    praise: 'Du hast das Paar mit der glatten Summe gewählt.',
    srText: say(prompt, expr),
    kmk: KMK_REASON,
  });
}

/** A gap among three summands: the known pair first. */
function gapSum(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const r = rng.pick([50, 100, 200]);
  const p = notRound(11, r - 11, rng);
  // Not a number of the term: the answer would stand beside the gap.
  let c = notRound(11, 89, rng);
  while (c === p || c === r - p) c = notRound(11, 89, rng);
  const expr = `${p} + ${BOX} + ${r - p} = ${r + c}`;
  return build(SKILL, stufe, {
    key: `luecke:${expr}`,
    ab,
    prompt: 'Welche Zahl gehört in die Lücke?',
    expression: expr,
    answer: commaNumber(c, 'Zahl in der Lücke'),
    hints: [`Rechne zuerst ${p} + ${r - p}.`, 'Wie viel fehlt dann noch bis zum Ergebnis?'],
    steps: [`${p} + ${r - p} = ${r}`, `${r + c} ${MINUS} ${r} = ${c}`, `Probe: ${r} + ${c} = ${r + c}`],
    bugs: commaBugs([{ id: 'zahl-vergessen', match: r + c - p, hint: `Du hast nur ${p} abgezogen. Rechne zuerst ${p} + ${r - p}.` }], c),
    praise: 'Du hast das glatte Paar zuerst zusammengefasst.',
    srText: say('Welche Zahl gehört in die Lücke?', expr),
    kmk: KMK_REASON,
  });
}

/** Where tauschen is not allowed. */
function noSwap(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const [a, b, c] = [rng.int(21, 60), rng.int(3, 19), rng.int(3, 9)];
  const prompt = 'Bei welchem Term darfst du die Zahlen nicht einfach tauschen?';
  return build(SKILL, stufe, {
    key: `tauschen:${a}:${b}:${c}`,
    ab,
    prompt,
    answer: makeChoice(rng, { label: `${a} ${MINUS} ${b}` }, [
      { label: `${a} + ${b}`, whyWrong: `Beim Plusrechnen darfst du tauschen. ${b} + ${a} hat denselben Wert.` },
      { label: `${a} ${TIMES} ${c}`, whyWrong: `Beim Malrechnen darfst du tauschen. ${c} ${TIMES} ${a} hat denselben Wert.` },
      { label: `${a} + ${b} + ${c}`, whyWrong: 'Beim Plusrechnen darfst du tauschen. Das gilt auch für drei Zahlen.' },
    ]),
    hints: ['Rechne einmal in beiden Reihenfolgen.', 'Probiere die Zahlen vertauscht aus. Kommt derselbe Wert heraus?'],
    steps: [`${a} ${MINUS} ${b} = ${a - b}`, `${b} ${MINUS} ${a} ergibt einen anderen Wert. Tauschen geht hier nicht.`],
    praise: 'Du hast den Term erkannt: Hier geht Tauschen nicht.',
    srText: say(prompt),
    kmk: KMK_REASON,
  });
}

// ─── Distributivgesetz (Stufe 2) ─────────────────────────────────────────────

/** 12 · 7 = 10 · 7 + 2 · 7, the way shown. */
function givenWay(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  // Above the three-factor products of Stufe 1: the way is given, and the two parts still need a two-digit product.
  const k = rng.int(3, 9);
  const tens = rng.pick([40, 50, 60, 70, 80, 90]);
  const a = tens + k;
  const c = rng.int(4, 9);
  const front = rng.chance(0.5);
  const expr = front ? `${c} ${TIMES} ${a} = ${c} ${TIMES} ${tens} + ${c} ${TIMES} ${k} = ${BOX}` : `${a} ${TIMES} ${c} = ${tens} ${TIMES} ${c} + ${k} ${TIMES} ${c} = ${BOX}`;
  const value = a * c;
  return build(SKILL, stufe, {
    key: `zerlegt:${expr}`,
    ab,
    prompt: 'Rechne beide Teile aus. Addiere danach.',
    expression: expr,
    answer: num(value),
    hints: [`Rechne ${tens} ${TIMES} ${c} und ${k} ${TIMES} ${c}.`, 'Addiere die beiden Ergebnisse.'],
    steps: [`${tens} ${TIMES} ${c} = ${tens * c}`, `${k} ${TIMES} ${c} = ${k * c}`, `${tens * c} + ${k * c} = ${value}`],
    bugs: commaBugs([part(tens * c + k, String(c)), part(tens + k * c, String(c))], value),
    praise: 'Du hast beide Teile der Zerlegung gerechnet.',
    srText: say('Rechne beide Teile aus. Addiere danach.', expr),
    kmk: KMK,
  });
}

/** Without the way: 14 · 6, 98 · 6, 7 · 104. */
function freeWay(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  // Above the products of Stufe 1, whose pair makes a round number: a large factor, and 101 · 6 or 99 · 3 would need no thought.
  const c = rng.int(6, 9);
  const kind = rng.pick(['zehner', 'knapp', 'hundert'] as const);
  if (kind === 'zehner') {
    const tens = rng.pick([30, 40, 50, 60, 70, 80, 90]);
    const k = rng.int(2, 9);
    const a = tens + k;
    return build(SKILL, stufe, {
      key: `frei:${a}:${c}`,
      ab,
      prompt: 'Rechne geschickt: Zerlege die große Zahl.',
      expression: `${a} ${TIMES} ${c} = ${BOX}`,
      answer: num(a * c),
      hints: [`Zerlege ${a} in ${tens} + ${k}.`, `Rechne ${tens} ${TIMES} ${c} und ${k} ${TIMES} ${c}.`],
      steps: [`${a} ${TIMES} ${c} = ${tens} ${TIMES} ${c} + ${k} ${TIMES} ${c}`, `${tens} ${TIMES} ${c} = ${tens * c}`, `${k} ${TIMES} ${c} = ${k * c}`, `${tens * c} + ${k * c} = ${a * c}`],
      bugs: commaBugs([part(tens * c + k, String(c))], a * c),
      praise: `Du hast ${a} in ${tens} + ${k} zerlegt.`,
      srText: say('Rechne geschickt: Zerlege die große Zahl.', `${a} ${TIMES} ${c} = ${BOX}`),
      kmk: KMK,
    });
  }
  const base = rng.pick([50, 100, 200]);
  const off = kind === 'knapp' ? rng.int(2, 9) : rng.int(3, 9);
  const a = kind === 'knapp' ? base - off : 100 + off;
  const value = a * c;
  const plus = kind === 'hundert';
  const round = plus ? 100 : base;
  return build(SKILL, stufe, {
    key: `frei:${a}:${c}`,
    ab,
    prompt: 'Rechne geschickt: Nutze die glatte Zahl.',
    expression: `${a} ${TIMES} ${c} = ${BOX}`,
    answer: num(value),
    hints: [`${a} liegt nah an ${round}. Rechne zuerst ${round} ${TIMES} ${c}.`, plus ? `Addiere dann noch ${off} ${TIMES} ${c}.` : `Ziehe dann ${off} ${TIMES} ${c} ab.`],
    steps: [plus ? `${a} ${TIMES} ${c} = ${round} ${TIMES} ${c} + ${off} ${TIMES} ${c}` : `${a} ${TIMES} ${c} = ${round} ${TIMES} ${c} ${MINUS} ${off} ${TIMES} ${c}`, `${round} ${TIMES} ${c} = ${round * c}`, `${off} ${TIMES} ${c} = ${off * c}`, plus ? `${round * c} + ${off * c} = ${value}` : `${round * c} ${MINUS} ${off * c} = ${value}`],
    bugs: commaBugs([part(plus ? round * c + off : round * c - off, String(c))], value),
    praise: `Du hast mit der glatten Zahl ${round} gerechnet.`,
    srText: say('Rechne geschickt: Nutze die glatte Zahl.', `${a} ${TIMES} ${c} = ${BOX}`),
    kmk: KMK,
  });
}

/** Back to a product: 8 · 17 + 2 · 17 = □ · 17. */
function gapBack(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const sum = rng.pick([10, 20, 30, 40, 50, 60, 100]);
  const x = rng.int(3, sum - 3);
  const y = sum - x;
  const c = notRound(11, 39, rng);
  const expr = `${x} ${TIMES} ${c} + ${y} ${TIMES} ${c} = ${BOX} ${TIMES} ${c}`;
  return build(SKILL, stufe, {
    key: `zurueck:${expr}`,
    ab,
    prompt: 'Welche Zahl gehört in die Lücke?',
    expression: expr,
    answer: commaNumber(x + y, 'Zahl in der Lücke'),
    hints: [`Links steht ${x}-mal ${c} und ${y}-mal ${c}.`, `Wie oft steht ${c} also zusammen da?`],
    steps: [`${x} + ${y} = ${x + y}`, `${x + y} ${TIMES} ${c} = ${(x + y) * c}`],
    bugs: commaBugs([{ id: 'teil-vergessen', match: x * y, hint: `Hier kommen ${x}-mal und ${y}-mal zusammen. Addiere die beiden Zahlen.` }], x + y),
    praise: `Du hast den gemeinsamen Faktor ${c} erkannt.`,
    srText: say('Welche Zahl gehört in die Lücke?', expr),
    kmk: KMK_REASON,
  });
}

/** Which decomposition keeps the value? */
function sameValue(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const k = rng.int(2, 9);
  const tens = rng.pick([10, 20, 30]);
  const a = tens + k;
  let c = rng.int(3, 9);
  // Each wrong term has another value, also tens · k + c.
  while (c === k || tens * k + c === a * c) c = rng.int(3, 9);
  const prompt = 'Welcher Term hat denselben Wert?';
  const expr = `${a} ${TIMES} ${c}`;
  return build(SKILL, stufe, {
    key: `zerlegung:${a}:${c}`,
    ab,
    prompt,
    expression: expr,
    answer: makeChoice(rng, { label: `${tens} ${TIMES} ${c} + ${k} ${TIMES} ${c}` }, [
      { label: `${tens} ${TIMES} ${c} + ${k}`, whyWrong: `Hier rechnest du nur einen Teil mal ${c}.` },
      { label: `${tens} + ${k} ${TIMES} ${c}`, whyWrong: `Hier rechnest du nur einen Teil mal ${c}.` },
      { label: `${tens} ${TIMES} ${k} + ${c}`, whyWrong: `Prüfe die Zerlegung von ${a}: Was gehört mal ${c}?` },
    ]),
    hints: [`Zerlege ${a} in ${tens} + ${k}.`, `Beide Teile gehören mal ${c}.`],
    steps: [`${a} = ${tens} + ${k}`, `${expr} = ${tens} ${TIMES} ${c} + ${k} ${TIMES} ${c} = ${a * c}`],
    praise: 'Du hast die passende Zerlegung gewählt.',
    srText: say(prompt, expr),
    kmk: KMK_REASON,
  });
}

// ─── Decimals and fractions (Stufe 3) ────────────────────────────────────────

/** 2,5 · 17 · 4 or 7,35 + 12,8 + 4,65 or {frac:3/4} + 34 + {frac:1/4} + 66: the pair makes a whole number, so the answer never stands in the task. Fractions only with plus: terme.geschickt is core, and NR has Bruch · in Klasse 7/8 (§2.3). */
function pairDecimal(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const kind = rng.pick(['mal', 'plus', 'bruch'] as const);
  if (kind === 'mal') {
    const [p, q] = rng.pick([[2.5, 4], [2.5, 8], [1.25, 8], [0.25, 8], [1.5, 2], [1.5, 4], [7.5, 4], [1.2, 5], [0.75, 8]] as const);
    const x = rng.int(11, 39);
    const shown = rng.chance(0.5) ? [p, x, q] : [q, x, p];
    const expr = `${shown.map(n).join(` ${TIMES} `)} = ${BOX}`;
    const pq = r3(p * q);
    const value = r3(pq * x);
    return build(SKILL, stufe, {
      key: `dez-mal:${shown.join('-')}`,
      ab,
      prompt: 'Rechne geschickt.',
      expression: expr,
      answer: num(value),
      hints: ['Beim Malrechnen darfst du tauschen.', `Rechne zuerst ${n(p)} ${TIMES} ${n(q)}.`],
      steps: [`${n(p)} ${TIMES} ${n(q)} = ${n(pq)}`, `${n(pq)} ${TIMES} ${x} = ${n(value)}`],
      bugs: commaBugs([missing(pq)], value),
      praise: `Du hast zuerst ${n(p)} ${TIMES} ${n(q)} gerechnet.`,
      srText: say('Rechne geschickt.', expr),
      kmk: KMK,
    });
  }
  if (kind === 'plus') {
    // Hundredths and a large whole: above the plain products of Stufe 2 at the same AB.
    const whole = rng.int(5, 20);
    const p = rng.int(101, whole * 100 - 101);
    const q = whole * 100 - p;
    const c = rng.int(11, 199);
    const [pn, qn, cn] = [p / 100, q / 100, c / 10];
    if (p % 10 === 0 || c % 10 === 0) return pairDecimal(rng, stufe, ab);
    const shown = rng.chance(0.5) ? [pn, cn, qn] : [qn, cn, pn];
    const expr = `${shown.map(n).join(' + ')} = ${BOX}`;
    const value = r3(whole + cn);
    return build(SKILL, stufe, {
      key: `dez-plus:${shown.join('-')}`,
      ab,
      prompt: 'Rechne geschickt.',
      expression: expr,
      answer: num(value),
      hints: ['Beim Plusrechnen darfst du tauschen.', `Rechne zuerst ${n(pn)} + ${n(qn)}.`],
      steps: [`${n(pn)} + ${n(qn)} = ${whole}`, `${whole} + ${n(cn)} = ${n(value)}`],
      bugs: commaBugs([missing(whole)], value),
      praise: `Du hast zuerst ${n(pn)} + ${n(qn)} gerechnet.`,
      srText: say('Rechne geschickt.', expr),
      kmk: KMK,
    });
  }
  const d = rng.pick([3, 4, 5, 8, 10]);
  const top = pickQ(rng, [d]).n;
  const r = rng.pick([50, 100, 200]);
  const x = notRound(11, r - 11, rng);
  const [f, g] = [frac(top, d), frac(d - top, d)];
  const shown = rng.chance(0.5) ? `${f} + ${x} + ${g} + ${r - x}` : `${x} + ${f} + ${r - x} + ${g}`;
  const expr = `${shown} = ${BOX}`;
  const value = r + 1;
  return build(SKILL, stufe, {
    key: `bruch-plus:${expr}`,
    ab,
    prompt: 'Rechne geschickt.',
    expression: expr,
    answer: num(value),
    hints: ['Beim Plusrechnen darfst du tauschen.', 'Suche zwei Paare: zwei Brüche und zwei Zahlen.'],
    steps: [`${f} + ${g} = 1`, `${x} + ${r - x} = ${r}`, `1 + ${r} = ${value}`],
    bugs: commaBugs([missing(r), missing(1)], value),
    praise: 'Du hast die Brüche und die Zahlen zu Paaren geordnet.',
    srText: say('Rechne geschickt.', expr),
    kmk: KMK,
  });
}

/** 4,5 · 7 + 5,5 · 7 with the common factor, 14,5 · 8 split up, or two pairs of fractions around a number: {frac:1/3} + 14 + {frac:5/8} + {frac:2/3} + {frac:3/8}. */
function commonFactor(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const kind = rng.pick(['dezimal', 'bruch', 'zerlegen'] as const);
  const c = rng.int(6, 19);
  if (kind === 'dezimal') {
    const sum = rng.pick([5, 10, 10, 20]);
    const p = rng.int(11, sum * 10 - 11);
    if (p % 10 === 0) return commonFactor(rng, stufe, ab);
    const [x, y] = [p / 10, r3(sum - p / 10)];
    const expr = `${n(x)} ${TIMES} ${c} + ${n(y)} ${TIMES} ${c} = ${BOX}`;
    return build(SKILL, stufe, {
      key: `gemeinsam:${expr}`,
      ab,
      prompt: 'Rechne geschickt.',
      expression: expr,
      answer: num(sum * c),
      hints: [`Beide Produkte haben den Faktor ${c}.`, `Rechne zuerst ${n(x)} + ${n(y)}.`],
      steps: [`${n(x)} ${TIMES} ${c} + ${n(y)} ${TIMES} ${c} = (${n(x)} + ${n(y)}) ${TIMES} ${c}`, `${n(x)} + ${n(y)} = ${sum}`, `${sum} ${TIMES} ${c} = ${sum * c}`],
      bugs: commaBugs([part(sum, String(c))], sum * c),
      praise: `Du hast den gemeinsamen Faktor ${c} genutzt.`,
      srText: say('Rechne geschickt.', expr),
      kmk: KMK,
    });
  }
  if (kind === 'bruch') {
    const [d1, d2] = rng.sample([3, 4, 5, 8, 10], 2);
    const [top1, top2] = [pickQ(rng, [d1]).n, pickQ(rng, [d2]).n];
    const x = rng.int(11, 49);
    const [f1, f2, g1, g2] = [frac(top1, d1), frac(d1 - top1, d1), frac(top2, d2), frac(d2 - top2, d2)];
    const expr = `${f1} + ${x} + ${g1} + ${f2} + ${g2} = ${BOX}`;
    return build(SKILL, stufe, {
      key: `bruch-paare:${expr}`,
      ab,
      prompt: 'Rechne geschickt.',
      expression: expr,
      answer: num(x + 2),
      hints: ['Suche die Brüche mit gleichem Nenner.', 'Jedes Paar ergibt eine glatte Zahl.'],
      steps: [`${f1} + ${f2} = 1`, `${g1} + ${g2} = 1`, `1 + 1 + ${x} = ${x + 2}`],
      bugs: commaBugs([missing(x + 1), missing(2)], x + 2),
      praise: 'Du hast die Brüche zu Paaren geordnet.',
      srText: say('Rechne geschickt.', expr),
      kmk: KMK,
    });
  }
  const whole = rng.int(11, 29);
  const dec = rng.pick([0.5, 0.2, 0.1, 0.25]);
  const a = whole + dec;
  const f = dec === 0.25 ? 4 * rng.int(1, 4) : 2 * rng.int(2, 9);
  const value = r3(a * f);
  const expr = `${n(a)} ${TIMES} ${f} = ${BOX}`;
  return build(SKILL, stufe, {
    key: `dez-zerlegen:${expr}`,
    ab,
    prompt: 'Rechne geschickt: Zerlege die Dezimalzahl.',
    expression: expr,
    answer: num(value),
    hints: [`Zerlege ${n(a)} in ${whole} + ${n(dec)}.`, `Rechne ${whole} ${TIMES} ${f} und ${n(dec)} ${TIMES} ${f}.`],
    steps: [`${n(a)} ${TIMES} ${f} = ${whole} ${TIMES} ${f} + ${n(dec)} ${TIMES} ${f}`, `${whole} ${TIMES} ${f} = ${whole * f}`, `${n(dec)} ${TIMES} ${f} = ${n(dec * f)}`, `${whole * f} + ${n(dec * f)} = ${n(value)}`],
    bugs: commaBugs([part(r3(whole * f + dec), String(f))], value),
    praise: `Du hast ${n(a)} zerlegt und beide Teile gerechnet.`,
    srText: say('Rechne geschickt: Zerlege die Dezimalzahl.', expr),
    kmk: KMK,
  });
}

const LATER_ROUND = 'Das stimmt auch. Mit einem anderen Weg entsteht früher eine glatte Zahl.';

/** Which way is easier? The options that keep the value are fine, only longer; the others change the value. */
function betterForm(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const kind = rng.pick(['tauschen', 'faktor', 'bruch', 'knapp'] as const);
  const prompt = 'Welcher Weg ist hier am einfachsten?';
  let expr: string;
  let correct: string;
  let wrongs: ChoiceOption[];
  let value: string;
  if (kind === 'tauschen') {
    const [p, q] = rng.pick([[2.5, 4], [0.5, 2], [1.25, 8], [0.25, 4]] as const);
    let x = rng.int(3, 19);
    // The two wrong terms keep another value, and x is not q: then the way would already stand in the task.
    while (x === q || r3(p * x + q) === r3(p * q * x) || r3(p + q * x) === r3(p * q * x)) x = rng.int(3, 19);
    expr = `${n(p)} ${TIMES} ${x} ${TIMES} ${n(q)}`;
    correct = `${n(p)} ${TIMES} ${n(q)} ${TIMES} ${x}`;
    value = n(p * q * x);
    wrongs = [
      // Also keeps the value, but with the easy pair still apart.
      { label: `${n(q)} ${TIMES} ${x} ${TIMES} ${n(p)}`, whyWrong: LATER_ROUND },
      { label: `${n(p)} ${TIMES} ${x} + ${n(q)}`, whyWrong: 'Hier ändert sich der Wert. Tauschen darfst du nur beim Malrechnen.' },
      { label: `${n(p)} + ${n(q)} ${TIMES} ${x}`, whyWrong: 'Hier ändert sich der Wert. Aus der Malrechnung ist eine Summe geworden.' },
    ];
  } else if (kind === 'faktor') {
    const sum = rng.pick([5, 10, 20]);
    let p = rng.int(11, sum * 10 - 11);
    if (p % 10 === 0) p += 1;
    const [x, y] = [p / 10, r3(sum - p / 10)];
    const c = rng.int(3, 19);
    expr = `${n(x)} ${TIMES} ${c} + ${n(y)} ${TIMES} ${c}`;
    correct = `(${n(x)} + ${n(y)}) ${TIMES} ${c}`;
    value = n(sum * c);
    wrongs = [
      { label: `${n(x)} ${TIMES} (${c} + ${n(y)})`, whyWrong: 'Hier ändert sich der Wert. Der gemeinsame Faktor gehört nach außen.' },
      { label: `${n(x)} + ${n(y)} ${TIMES} ${c}`, whyWrong: 'Ohne Klammer multiplizierst du nur eine Zahl. Der Wert ändert sich.' },
      { label: `${n(x * c)} + ${n(y * c)}`, whyWrong: LATER_ROUND },
    ];
  } else if (kind === 'bruch') {
    const d = rng.pick([3, 4, 5, 8]);
    const top = pickQ(rng, [d]).n;
    const c = rng.int(3, 19);
    const [x, y] = [frac(top, d), frac(d - top, d)];
    expr = `${x} + ${c} + ${y}`;
    correct = `${x} + ${y} + ${c}`;
    value = String(c + 1);
    wrongs = [
      { label: `${y} + ${c} + ${x}`, whyWrong: LATER_ROUND },
      { label: `${x} + ${y} ${MINUS} ${c}`, whyWrong: 'Hier ändert sich der Wert. Aus dem Plus ist ein Minus geworden.' },
      { label: `${c} + ${x} ${MINUS} ${y}`, whyWrong: 'Hier ändert sich der Wert. Aus dem Plus ist ein Minus geworden.' },
    ];
  } else {
    const whole = rng.int(2, 9);
    const off = rng.pick([0.1, 0.2]);
    const a = r3(whole - off);
    const c = rng.int(3, 9);
    expr = `${n(a)} ${TIMES} ${c}`;
    correct = `${whole} ${TIMES} ${c} ${MINUS} ${n(off)} ${TIMES} ${c}`;
    value = n(a * c);
    wrongs = [
      { label: `${whole} ${TIMES} ${c} ${MINUS} ${n(off)}`, whyWrong: `Hier rechnest du nur einen Teil mal ${c}. Der Wert ändert sich.` },
      { label: `${whole} ${MINUS} ${n(off)} ${TIMES} ${c}`, whyWrong: `Hier multiplizierst du nur ${n(off)}. Der Wert ändert sich.` },
      { label: `${whole - 1} ${TIMES} ${c} + ${n(a - whole + 1)} ${TIMES} ${c}`, whyWrong: LATER_ROUND },
    ];
  }
  return build(SKILL, stufe, {
    key: `weg:${kind}:${expr}`,
    ab,
    prompt,
    expression: expr,
    answer: makeChoice(rng, { label: correct }, wrongs),
    hints: ['Der Wert muss gleich bleiben. Prüfe das zuerst.', 'Welcher Weg ergibt zuerst eine glatte Zahl?'],
    steps: [`Der einfachste Weg: ${correct}`, `Das Ergebnis: ${value}`],
    praise: 'Du hast den Term gewählt, der die Rechnung leicht macht.',
    srText: say(prompt, expr),
    kmk: KMK_REASON,
  });
}

// ─── The skill ───────────────────────────────────────────────────────────────

function stufe1(rng: Rng, ab: Ab): Exercise {
  if (ab === 1) return rng.chance(0.5) ? sumThree(rng, 1, ab) : productThree(rng, 1, ab, false);
  if (ab === 2) return rng.chance(0.5) ? sumFour(rng, 1, ab) : productThree(rng, 1, ab, true);
  return rng.pick([bestPair, gapSum, noSwap])(rng, 1, ab);
}

function stufe2(rng: Rng, ab: Ab): Exercise {
  if (ab === 1) return givenWay(rng, 2, ab);
  if (ab === 2) return freeWay(rng, 2, ab);
  return rng.chance(0.5) ? gapBack(rng, 2, ab) : sameValue(rng, 2, ab);
}

function stufe3(rng: Rng, ab: Ab): Exercise {
  if (ab === 1) return pairDecimal(rng, 3, ab);
  if (ab === 2) return commonFactor(rng, 3, ab);
  return betterForm(rng, 3, ab);
}

export const geschicktSkill: SkillDef = {
  ...SKILL,
  title: 'Geschickt rechnen',
  description: 'Du nutzt Rechengesetze und rechnest einfacher.',
  stufen: { 1: 'Tauschen zu glatten Zahlen, natürliche Zahlen', 2: 'Zerlegen: 12 · 7 = 10 · 7 + 2 · 7', 3: 'Dezimalzahlen und Brüche, der bessere Weg' },
  kmk: ['ZO.terme', 'PK.argumentieren'],
  keys: { comma: true },
  generate(rng, stufe, ctx) {
    const ab = targetAb(rng, stufe, ctx);
    return stufe === 1 ? stufe1(rng, ab) : stufe === 2 ? stufe2(rng, ab) : stufe3(rng, ab);
  },
};
