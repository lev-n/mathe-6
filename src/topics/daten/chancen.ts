/**
 * Chancen vergleichen, as a game or an experiment (T15), never for money.
 * Stufe 1: which bag gives the better chance.
 * Stufe 2: the relative frequency of dice rolls as a Bruch.
 * Stufe 3: change the bag to reach a given chance.
 */
import { fmt, frac } from '../../core/format';
import type { Ab, ChoiceAnswer, ColorName, Exercise, Rng, SkillDef, Stufe, Visual } from '../../core/types';
import { build, fractionAnswer, fractionBugs, makeChoice, PEOPLE, pickPerson, plural, targetAb, type MaybeBug } from '../shared';
import { lcm, lowest, say, sum } from './shared';

const SKILL = { id: 'daten.chancen', topicId: 'daten' } as const;
const KMK = ['DZ.chancen', 'DZ.haeufigkeit'];

const ADJ: Record<ColorName, string> = { rot: 'rote', blau: 'blaue', gelb: 'gelbe', gruen: 'grüne', lila: 'lila', orange: 'orange' };
const NOUN: Record<ColorName, string> = { rot: 'Rot', blau: 'Blau', gelb: 'Gelb', gruen: 'Grün', lila: 'Lila', orange: 'Orange' };
const COLORS: readonly ColorName[] = ['rot', 'blau', 'gelb', 'gruen'];

const balls = (n: number, color: ColorName) => `${fmt(n)} ${ADJ[color]} ${plural(n, 'Kugel', 'Kugeln')}`;
const bag = (win: ColorName, n: number, other: ColorName, m: number): Visual => ({ type: 'bag', balls: [{ color: win, count: n }, { color: other, count: m }] });

// ─── Stufe 1: which bag ──────────────────────────────────────────────────────

const A = 'Säckchen A';
const B = 'Säckchen B';
const EQUAL = 'Beide gleich';
const BAG_SIZES = 'Die Säckchen sind verschieden groß. Vergleiche die Anteile.';

function gameContext(win: ColorName): string {
  return `Du ziehst ohne hinzusehen eine Kugel. Mit einer Kugel in ${NOUN[win]} gewinnst du das Spiel.`;
}

/** The worked step that makes two fractions comparable: both on the smallest common Nenner. None when the Nenner already agree. */
function commonNenner(a: number, s: number, b: number, t: number): string[] {
  if (s === t) return [];
  const n = lcm(s, t);
  return [`Gleicher Nenner: ${frac((a * n) / s, n)} und ${frac((b * n) / t, n)}.`];
}

const bagWords = (label: string, win: ColorName, n: number, other: ColorName, m: number) => `${label}: ${balls(n, win)} und ${balls(m, other)}.`;

function compareBags(rng: Rng, ab: Ab, n1: number, t1: number, n2: number, t2: number): Exercise {
  const [win, other] = rng.sample(COLORS, 2);
  const options = { a: { label: A, visual: bag(win, n1, other, t1 - n1) }, b: { label: B, visual: bag(win, n2, other, t2 - n2) } };
  const cmp = n1 * t2 - n2 * t1;
  const betterName = cmp > 0 ? A : cmp < 0 ? B : EQUAL;
  const answer: ChoiceAnswer = {
    kind: 'choice',
    layout: 'grid',
    options: [
      { ...options.a, ...(betterName === A ? {} : { whyWrong: n1 > n2 && t1 !== t2 ? BAG_SIZES : `Vergleiche den Anteil: ${fmt(n1)} von ${fmt(t1)} und ${fmt(n2)} von ${fmt(t2)}.` }) },
      { ...options.b, ...(betterName === B ? {} : { whyWrong: n2 > n1 && t1 !== t2 ? BAG_SIZES : `Vergleiche den Anteil: ${fmt(n1)} von ${fmt(t1)} und ${fmt(n2)} von ${fmt(t2)}.` }) },
      { label: EQUAL, ...(betterName === EQUAL ? {} : { whyWrong: 'Schreibe beide Anteile als Bruch und vergleiche.' }) },
    ],
    correct: betterName === A ? 0 : betterName === B ? 1 : 2,
  };
  const context = gameContext(win);
  const prompt = 'Welches Säckchen gibt die bessere Chance?';
  const words = `${bagWords(A, win, n1, other, t1 - n1)} ${bagWords(B, win, n2, other, t2 - n2)}`;
  return build(SKILL, 1, {
    key: `saeckchen:${win}:${other}:${n1}/${t1}:${n2}/${t2}`,
    ab,
    context,
    prompt,
    answer,
    hints: [`Zähle in jedem Säckchen die Kugeln in ${NOUN[win]} und alle Kugeln.`, 'Vergleiche die Anteile als Bruch.'],
    steps: [`${A}: ${frac(n1, t1)}. ${B}: ${frac(n2, t2)}.`, ...commonNenner(n1, t1, n2, t2), cmp === 0 ? 'Beide Anteile sind gleich groß.' : `Der Anteil in ${betterName} ist größer.`, `Die Antwort: ${betterName}.`],
    praise: 'Du hast die Anteile verglichen und nicht nur die Anzahl.',
    srText: say([context, prompt, words]),
    kmk: KMK,
  });
}

/**
 * 'Beide gleich' stands at every item of this Stufe and is right in about this share of them at every AB, so that seeing it says nothing about the answer.
 */
const EQUAL_SHARE = 0.25;

/** Two bags with the same number of balls. */
function sameTotal(rng: Rng, ab: Ab): Exercise {
  const t = rng.pick([5, 6, 8, 10]);
  const [n1, other] = rng.sample(Array.from({ length: t - 1 }, (_, i) => i + 1), 2);
  return compareBags(rng, ab, n1, t, rng.chance(EQUAL_SHARE) ? n1 : other, t);
}

type BagPair = readonly [number, number, number, number];

/** All pairs of bags with these totals: [n1, t1, n2, t2]. */
function bagPairs(totals: readonly number[], fits: (t1: number, t2: number) => boolean): BagPair[] {
  const out: BagPair[] = [];
  for (const t1 of totals) {
    for (const t2 of totals) {
      if (t1 === t2 || !fits(t1, t2)) continue;
      for (let n1 = 1; n1 < t1; n1++) for (let n2 = 1; n2 < t2; n2++) out.push([n1, t1, n2, t2]);
    }
  }
  return out;
}

const isEqualPair = ([n1, t1, n2, t2]: BagPair) => n1 * t2 === n2 * t1;

/** Different totals, one a multiple of the other, so that the Nenner are easy to make equal. */
const EASY_PAIRS = bagPairs([4, 5, 8, 10, 12, 16, 20], (a, b) => a % b === 0 || b % a === 0);
/** The largest common Nenner of this Stufe, the same as the Hauptnenner of Stufe 3 in src/topics/brueche/plus-minus.ts. */
const MAX_NENNER = 24;
/** Different totals, neither a multiple of the other: both Nenner have to change. */
const HARD_PAIRS = bagPairs([3, 4, 5, 6, 8, 10, 12], (a, b) => a % b !== 0 && b % a !== 0 && lcm(a, b) <= MAX_NENNER);

function comparePairs(rng: Rng, ab: Ab, pairs: readonly BagPair[]): Exercise {
  const equal = rng.chance(EQUAL_SHARE);
  const [n1, t1, n2, t2] = rng.pick(pairs.filter((p) => isEqualPair(p) === equal));
  return compareBags(rng, ab, n1, t1, n2, t2);
}

const WHEEL_SIZES = [6, 8, 10, 12];
const BAG_TOTALS = [5, 8, 10, 12, 16];

/** Bag totals and wheel sizes whose common Nenner stays small: [balls, sectors]. */
const BAG_AND_WHEEL = BAG_TOTALS.flatMap((t) => WHEEL_SIZES.filter((sectors) => lcm(t, sectors) <= MAX_NENNER).map((sectors): [number, number] => [t, sectors]));

/** A bag and a wheel with the same share of the winning colour. */
const EQUAL_WHEELS: readonly (readonly [number, number, number, number])[] = (() => {
  const out: [number, number, number, number][] = [];
  for (const [t, sectors] of BAG_AND_WHEEL) {
    for (let n = 1; n < t; n++) if ((n * sectors) % t === 0) out.push([n, t, (n * sectors) / t, sectors]);
  }
  return out;
})();

function bagAndSpinner(rng: Rng, ab: Ab): Exercise {
  const [win, other] = rng.sample(COLORS, 2);
  let [n, t, onWheel, sectors] = rng.pick(EQUAL_WHEELS);
  if (!rng.chance(EQUAL_SHARE)) {
    [t, sectors] = rng.pick(BAG_AND_WHEEL);
    onWheel = rng.int(1, sectors - 1);
    n = rng.int(1, t - 1);
    if (n * sectors === onWheel * t) n = n === 1 ? 2 : n - 1;
  }
  const wheel: ColorName[] = rng.shuffle([...Array.from({ length: onWheel }, () => win), ...Array.from({ length: sectors - onWheel }, () => other)]);
  const cmp = n * sectors - onWheel * t;
  const winner = cmp > 0 ? 'Das Säckchen' : cmp < 0 ? 'Das Glücksrad' : EQUAL;
  const compare = `Vergleiche die Anteile: ${fmt(n)} von ${fmt(t)} und ${fmt(onWheel)} von ${fmt(sectors)}.`;
  const answer: ChoiceAnswer = {
    kind: 'choice',
    layout: 'grid',
    options: [
      { label: 'Das Säckchen', visual: bag(win, n, other, t - n), ...(cmp > 0 ? {} : { whyWrong: compare }) },
      { label: 'Das Glücksrad', visual: { type: 'spinner', sectors: wheel }, ...(cmp < 0 ? {} : { whyWrong: compare }) },
      { label: EQUAL, ...(cmp === 0 ? {} : { whyWrong: 'Schreibe beide Anteile als Bruch und vergleiche.' }) },
    ],
    correct: cmp > 0 ? 0 : cmp < 0 ? 1 : 2,
  };
  const context = `Bei einem Spiel gewinnt die Farbe ${NOUN[win]}. Du wählst Säckchen oder Glücksrad.`;
  const prompt = 'Was gibt die bessere Chance?';
  const words = `Säckchen: ${balls(n, win)} und ${balls(t - n, other)}. Glücksrad: ${fmt(onWheel)} von ${fmt(sectors)} Feldern in ${NOUN[win]}.`;
  return build(SKILL, 1, {
    key: `rad-oder-sack:${win}:${other}:${n}/${t}:${wheel.join('-')}`,
    ab,
    context,
    prompt,
    answer,
    hints: ['Schreibe für beide den Anteil der Farbe als Bruch.', 'Mach die Nenner gleich und vergleiche dann.'],
    steps: [`Säckchen: ${frac(n, t)}. Glücksrad: ${frac(onWheel, sectors)}.`, ...commonNenner(n, t, onWheel, sectors), `Die Antwort: ${winner}.`],
    praise: 'Du hast zwei verschiedene Spiele über den Anteil verglichen.',
    srText: say([context, prompt, words]),
    kmk: KMK,
  });
}

// ─── Stufe 2: relative frequency of dice rolls ───────────────────────────────

const ROLL_HINT = 'Teile durch die Zahl aller Würfe, nicht durch die 6 Seiten.';

/** Wrong fractions a child forms for n of N rolls; none of them has the value of the answer. inAdvance: the chance before rolling, of one face unless the task asks for an event. */
function rollBugs(n: number, total: number, inAdvance: readonly [number, number] = [1, 6]): MaybeBug[] {
  const differs = (a: number, b: number) => a * total !== n * b;
  return [
    differs(n, total - n) && { id: 'anteil-zum-rest', match: { numerator: n, denominator: total - n }, hint: 'Du hast durch den Rest geteilt. Der Nenner ist die Zahl aller Würfe.' },
    n !== total && differs(total, n) && { id: 'bruch-umgedreht', match: { numerator: total, denominator: n }, hint: 'Der Bruch steht auf dem Kopf. Die Zahl aller Würfe kommt in den Nenner.' },
    differs(n, 6) && { id: 'nenner-sechs', match: { numerator: n, denominator: 6 }, hint: ROLL_HINT },
    differs(inAdvance[0], inAdvance[1]) && { id: inAdvance[1] === 6 ? 'erwartung-sechstel' : 'erwartung-ereignis', match: { numerator: inAdvance[0], denominator: inAdvance[1] }, hint: 'Das ist die Chance im Voraus. Gefragt ist, was hier wirklich gewürfelt ist.' },
  ];
}

function rollsFromDice(rng: Rng, ab: Ab): Exercise {
  const total = rng.pick([10, 12]);
  const eye = rng.int(1, 6);
  const count = rng.int(2, 5);
  const others = [1, 2, 3, 4, 5, 6].filter((x) => x !== eye);
  const values = rng.shuffle([...Array.from({ length: count }, () => eye), ...Array.from({ length: total - count }, () => rng.pick(others))]);
  const person = pickPerson(rng);
  const context = `${person.name} würfelt ${fmt(total)}-mal. Das Bild zeigt alle Würfe.`;
  const prompt = `Schreibe die relative Häufigkeit der ${eye} als Bruch.`;
  const answer = fractionAnswer(count, total, { accept: 'equivalent' });
  return build(SKILL, 2, {
    key: `wuerfel:${person.name}:${values.join('')}:${eye}`,
    ab,
    context,
    prompt,
    visual: { type: 'dice', values },
    answer,
    hints: [`Zähle die Würfe mit der ${eye}.`, 'Die Zahl aller Würfe kommt in den Nenner.'],
    steps: [`Die ${eye} kommt ${fmt(count)}-mal vor.`, `Es sind ${fmt(total)} Würfe.`, `Die relative Häufigkeit ist ${frac(count, total)}.`],
    bugs: fractionBugs(rollBugs(count, total), answer),
    praise: 'Du hast gezählt und durch alle Würfe geteilt.',
    srText: say([context, prompt]),
    kmk: KMK,
  });
}

/** Counts of the six faces with this total, none above the Strichliste's limit. */
function faceCounts(rng: Rng, total: number): number[] {
  const counts = [1, 1, 1, 1, 1, 1];
  for (let left = total - 6; left > 0; left--) {
    const k = rng.int(0, 5);
    if (counts[k] < 25) counts[k]++;
    else left++;
  }
  return counts;
}

const canReduce = (n: number, total: number) => lowest(n, total)[0] !== n;

function rollsFromTally(rng: Rng, ab: Ab): Exercise {
  const total = rng.pick([20, 24, 30, 36, 40, 50, 60]);
  // a share that can be shortened, so that the task and the hint fit it
  let counts = faceCounts(rng, total);
  let faces = counts.flatMap((c, k) => (canReduce(c, total) ? [k] : []));
  while (faces.length === 0) {
    counts = faceCounts(rng, total);
    faces = counts.flatMap((c, k) => (canReduce(c, total) ? [k] : []));
  }
  const i = rng.pick(faces);
  const n = counts[i];
  const [a, b] = lowest(n, total);
  const prompt = `Schreibe die relative Häufigkeit der ${i + 1} als gekürzten Bruch.`;
  const answer = fractionAnswer(a, b);
  return build(SKILL, 2, {
    key: `liste:${counts.join('-')}:${i}`,
    ab,
    prompt,
    visual: { type: 'tally', title: 'Würfe mit einem Würfel', rows: counts.map((count, k) => ({ label: `Die ${k + 1}`, count })) },
    answer,
    hints: ['Zähle zuerst alle Striche der Liste zusammen.', 'Teile Zähler und Nenner durch dieselbe Zahl.'],
    steps: [`Alle Würfe: ${counts.map((c) => fmt(c)).join(' + ')} = ${fmt(total)}`, `Der Anteil ist ${frac(n, total)}.`, `Gekürzt: ${frac(a, b)}`],
    bugs: fractionBugs(rollBugs(n, total), answer),
    praise: 'Du hast alle Würfe gezählt und den Bruch gekürzt.',
    srText: say([prompt]),
    kmk: KMK,
  });
}

function rollsEvent(rng: Rng, ab: Ab): Exercise {
  const total = rng.pick([30, 40, 50, 60, 80]);
  const even = rng.chance(0.5);
  const hits = even ? [1, 3, 5] : [4, 5];
  const hitsIn = (values: number[]) => sum(hits.map((k) => values[k]));
  // a share that can be shortened, as the task asks for it
  let counts = faceCounts(rng, total);
  while (!canReduce(hitsIn(counts), total)) counts = faceCounts(rng, total);
  const n = hitsIn(counts);
  const [a, b] = lowest(n, total);
  const event = even ? 'eine gerade Zahl' : 'eine Zahl über 4';
  const context = `Das Ereignis heißt: ${event}.`;
  const prompt = 'Schreibe die relative Häufigkeit als gekürzten Bruch.';
  const answer = fractionAnswer(a, b);
  return build(SKILL, 2, {
    key: `ereignis:${counts.join('-')}:${even}`,
    ab,
    context,
    prompt,
    visual: { type: 'table', caption: 'Würfe mit einem Würfel', header: ['Augenzahl', 'Anzahl'], rows: counts.map((c, k) => [`Die ${k + 1}`, fmt(c)]) },
    answer,
    hints: ['Welche Augenzahlen passen zum Ereignis?', 'Addiere diese Anzahlen. Teile durch die Zahl aller Würfe.'],
    steps: [`Dazu gehören: ${hits.map((k) => k + 1).join(', ')}.`, `Treffer: ${hits.map((k) => fmt(counts[k])).join(' + ')} = ${fmt(n)}`, `${frac(n, total)} = ${frac(a, b)}`],
    bugs: fractionBugs(rollBugs(n, total, even ? [1, 2] : [1, 3]), answer),
    praise: 'Du hast alle passenden Augenzahlen zusammengezählt.',
    srText: say([context, prompt]),
    kmk: KMK,
  });
}

function comparePlayers(rng: Rng, ab: Ab): Exercise {
  const [first, second] = rng.sample(PEOPLE, 2);
  const eye = rng.int(1, 6);
  // the common Nenner stays at 100 or below
  const [more, fewer] = rng.pick([[50, 20], [30, 20], [60, 30], [40, 20], [100, 25]]);
  const equal = rng.chance(EQUAL_SHARE);
  let hitsFewer = Math.round((rng.pick([20, 28, 32, 36, 40]) * fewer) / 100);
  // 'Beide gleich' is right now and then: hits on both sides with the same share
  while (equal && !Number.isInteger((hitsFewer * more) / fewer)) hitsFewer = Math.round((rng.pick([20, 28, 32, 36, 40]) * fewer) / 100);
  // usually the larger count has the smaller share: the counts alone mislead
  const limit = (hitsFewer * more) / fewer;
  const hitsMore = equal ? limit : rng.chance(0.7) ? rng.int(hitsFewer + 1, Math.ceil(limit) - 1) : rng.int(Math.floor(limit) + 1, Math.floor(limit) + 6);
  const rows = rng.chance(0.5) ? [{ p: first, n: hitsMore, t: more }, { p: second, n: hitsFewer, t: fewer }] : [{ p: first, n: hitsFewer, t: fewer }, { p: second, n: hitsMore, t: more }];
  const [a, b] = rows;
  const correct = equal ? EQUAL : a.n * b.t > b.n * a.t ? a.p.name : b.p.name;
  const countsWhy = 'Die Zahl der Würfe ist verschieden. Vergleiche die Anteile.';
  const context = `${a.p.name} würfelt ${fmt(a.t)}-mal und hat ${fmt(a.n)}-mal die ${eye}. ${b.p.name} würfelt ${fmt(b.t)}-mal und hat ${fmt(b.n)}-mal die ${eye}.`;
  const prompt = 'Wer hat die größere relative Häufigkeit?';
  const labels = [a.p.name, b.p.name, EQUAL];
  const answer = makeChoice(rng, { label: correct }, labels.filter((l) => l !== correct).map((l) => ({ label: l, whyWrong: l === EQUAL ? 'Schreibe beide Anteile als Bruch mit gleichem Nenner.' : countsWhy })), { order: labels });
  return build(SKILL, 2, {
    key: `spieler:${a.p.name}:${b.p.name}:${eye}:${a.n}/${a.t}:${b.n}/${b.t}`,
    ab,
    context,
    prompt,
    answer,
    hints: [countsWhy, 'Schreibe beide Anteile als Bruch mit gleichem Nenner.'],
    steps: [`${a.p.name}: ${frac(a.n, a.t)}. ${b.p.name}: ${frac(b.n, b.t)}.`, ...commonNenner(a.n, a.t, b.n, b.t), equal ? 'Beide Anteile sind gleich groß.' : `Größer ist der Anteil von ${correct}.`],
    praise: 'Du hast die Anteile verglichen und nicht die Anzahlen.',
    srText: say([context, prompt], answer),
    kmk: [...KMK, 'PK.argumentieren'],
  });
}

// ─── Stufe 3: change the bag ─────────────────────────────────────────────────

function afterChange(rng: Rng, ab: Ab): Exercise {
  const [win, other] = rng.sample(COLORS, 2);
  const r = rng.int(1, 6);
  const b = rng.int(2, 8);
  const k = rng.int(1, 5);
  const value: [number, number] = [r + k, r + b + k];
  const context = `Im Säckchen liegen ${balls(r, win)} und ${balls(b, other)}. Du legst ${balls(k, win)} dazu.`;
  const prompt = `Schreibe die neue Chance für ${NOUN[win]} als Bruch.`;
  const answer = fractionAnswer(value[0], value[1], { accept: 'equivalent' });
  const differs = (x: number, y: number) => x * value[1] !== value[0] * y;
  return build(SKILL, 3, {
    key: `neu:${win}:${other}:${r}:${b}:${k}`,
    ab,
    context,
    prompt,
    visual: bag(win, r, other, b),
    answer,
    hints: ['Mit den neuen Kugeln wächst auch die Zahl aller Kugeln.', `Zähle die Kugeln in ${NOUN[win]} und alle Kugeln neu.`],
    steps: [`Kugeln in ${NOUN[win]}: ${fmt(r)} + ${fmt(k)} = ${fmt(r + k)}`, `Alle Kugeln: ${fmt(r + b)} + ${fmt(k)} = ${fmt(r + b + k)}`, `Die Chance ist jetzt ${frac(value[0], value[1])}.`],
    bugs: fractionBugs(
      [
        differs(r + k, r + b) && { id: 'gesamt-nicht-neu', match: { numerator: r + k, denominator: r + b }, hint: 'Der Nenner ist noch alt. Zähle auch die neuen Kugeln mit.' },
        differs(r, r + b + k) && { id: 'nur-alte-gewinner', match: { numerator: r, denominator: r + b + k }, hint: 'Der Zähler ist noch alt. Die neuen Kugeln gehören dazu.' },
        differs(r + k, b) && { id: 'anteil-zum-rest', match: { numerator: r + k, denominator: b }, hint: 'Du hast durch den Rest geteilt. Der Nenner ist die Zahl aller Kugeln.' },
      ],
      answer,
    ),
    praise: 'Du hast Zähler und Nenner neu gezählt.',
    srText: say([context, prompt]),
    kmk: KMK,
  });
}

interface Target {
  r: number;
  b: number;
  k: number;
  p: number;
  q: number;
}

const GOALS: readonly (readonly [number, number])[] = [[1, 2], [1, 3], [1, 4], [2, 3], [3, 4], [1, 5], [2, 5]];

/** Bags and a number of balls of the other colour to add, with the chance afterwards. */
const ADD_OTHER: readonly Target[] = (() => {
  const out: Target[] = [];
  for (let r = 1; r <= 8; r++) {
    for (let b = 1; b <= 8; b++) {
      for (let k = 1; k <= 8; k++) {
        if (r + b + k > 20) continue;
        for (const [p, q] of GOALS) if (r * q === p * (r + b + k)) out.push({ r, b, k, p, q });
      }
    }
  }
  return out;
})();

const chanceOf = (x: number, y: number) => {
  const [a, b] = lowest(x, y);
  return frac(a, b);
};

function reachGoalWithBag(rng: Rng, ab: Ab): Exercise {
  const t = rng.pick(ADD_OTHER);
  const [win, other] = rng.sample(COLORS, 2);
  const context = `Im Säckchen liegen ${balls(t.r, win)} und ${balls(t.b, other)}. Die Chance für ${NOUN[win]} soll ${frac(t.p, t.q)} sein.`;
  const prompt = `Wie viele Kugeln in ${NOUN[other]} legst du dazu?`;
  const label = (k: number) => balls(k, other);
  const wrongK = [t.k - 2, t.k - 1, t.k + 1, t.k + 2, t.k + 3].filter((k) => k >= 1);
  const answer = makeChoice(rng, { label: label(t.k) }, rng.shuffle(wrongK).map((k) => ({ label: label(k), whyWrong: `Dann ist die Chance ${chanceOf(t.r, t.r + t.b + k)}.` })));
  const totalAfter = t.r + t.b + t.k;
  return build(SKILL, 3, {
    key: `ziel:${win}:${other}:${t.r}:${t.b}:${t.k}:${t.p}/${t.q}`,
    ab,
    context,
    prompt,
    visual: bag(win, t.r, other, t.b),
    answer,
    hints: [`Die Zahl der Kugeln in ${NOUN[win]} bleibt gleich.`, `Probiere aus: ${NOUN[win]} durch alle Kugeln.`],
    steps: [`Es ${plural(t.r, 'bleibt', 'bleiben')} ${fmt(t.r)} ${plural(t.r, 'Kugel', 'Kugeln')} in ${NOUN[win]}.`, `Für ${frac(t.p, t.q)} brauchst du ${fmt(totalAfter)} Kugeln.`, `${fmt(totalAfter)} − ${fmt(t.r + t.b)} = ${fmt(t.k)}`, `Du legst ${label(t.k)} dazu.`],
    praise: 'Du hast vom Ziel auf die Zahl aller Kugeln geschlossen.',
    srText: say([context, prompt], answer),
    kmk: [...KMK, 'PK.problemloesen'],
  });
}

function reachGoalWithSpinner(rng: Rng, ab: Ab): Exercise {
  const sectors = rng.pick([8, 12]);
  const goals = sectors === 8 ? [[1, 2], [3, 4], [5, 8]] : [[1, 2], [2, 3], [3, 4], [5, 6]];
  const [p, q] = rng.pick(goals);
  const target = (sectors * p) / q;
  const start = rng.int(1, target - 1);
  const k = target - start;
  const [win, other] = rng.sample(COLORS, 2);
  const wheel: ColorName[] = rng.shuffle([...Array.from({ length: start }, () => win), ...Array.from({ length: sectors - start }, () => other)]);
  const context = `Beim Spielfest soll die Chance für ${NOUN[win]} ${frac(p, q)} sein.`;
  const prompt = `Wie viele Felder in ${NOUN[other]} färbst du in ${NOUN[win]} um?`;
  const label = (x: number) => `${fmt(x)} ${plural(x, 'Feld', 'Felder')}`;
  const wrongs = [k - 1, k + 1, k + 2, target].filter((x) => x >= 1 && x !== k && x <= sectors - start);
  const answer = makeChoice(rng, { label: label(k) }, wrongs.map((x) => ({ label: label(x), whyWrong: `Dann sind es ${fmt(start + x)} von ${fmt(sectors)} Feldern. Vergleiche mit dem Ziel.` })));
  return build(SKILL, 3, {
    key: `rad:${win}:${other}:${wheel.join('-')}:${p}/${q}`,
    ab,
    context,
    prompt,
    visual: { type: 'spinner', sectors: wheel },
    answer,
    hints: ['Die Zahl aller Felder bleibt gleich.', `Rechne: ${frac(p, q)} von ${fmt(sectors)} Feldern.`],
    steps: [`${frac(p, q)} von ${fmt(sectors)} Feldern sind ${fmt(target)} Felder.`, `Schon da: ${label(start)}.`, `${fmt(target)} − ${fmt(start)} = ${fmt(k)}`, `Du färbst ${label(k)} um.`],
    praise: 'Du hast vom Ziel auf die Zahl der Felder geschlossen.',
    srText: say([context, prompt, `Das Glücksrad hat ${fmt(start)} von ${fmt(sectors)} Feldern in ${NOUN[win]}.`], answer),
    kmk: [...KMK, 'PK.problemloesen'],
  });
}

function whichChange(rng: Rng, ab: Ab): Exercise {
  const [win, other] = rng.sample(COLORS, 2);
  for (;;) {
    const r = rng.int(2, 7);
    const b = rng.int(3, 9);
    const moves: { label: string; x: number; y: number }[] = [
      ...[1, 2, 3, 4].map((k) => ({ label: `${balls(k, win)} dazulegen`, x: r + k, y: r + b + k })),
      ...[1, 2, 3, 4].map((k) => ({ label: `${balls(k, other)} dazulegen`, x: r, y: r + b + k })),
      ...[1, 2, 3].filter((k) => k < b).map((k) => ({ label: `${balls(k, other)} herausnehmen`, x: r, y: r + b - k })),
      ...[1, 2].filter((k) => k < r).map((k) => ({ label: `${balls(k, win)} herausnehmen`, x: r - k, y: r + b - k })),
    ];
    const good = moves.filter((m) => GOALS.some(([p, q]) => m.x * q === p * m.y));
    if (good.length === 0) continue;
    const correct = rng.pick(good);
    const [gp, gq] = lowest(correct.x, correct.y);
    const others = moves.filter((m) => m.x * gq !== gp * m.y);
    if (others.length < 3) continue;
    const wrongs = rng.sample(others, 3).map((m) => ({ label: m.label, whyWrong: `Dann ist die Chance ${chanceOf(m.x, m.y)}. Das Ziel ist ${frac(gp, gq)}.` }));
    const answer = makeChoice(rng, { label: correct.label }, wrongs);
    const context = `Im Säckchen liegen ${balls(r, win)} und ${balls(b, other)}. Die Chance für ${NOUN[win]} soll ${frac(gp, gq)} sein.`;
    const prompt = 'Welche Änderung passt?';
    return build(SKILL, 3, {
      key: `aenderung:${win}:${other}:${r}:${b}:${correct.label}`,
      ab,
      context,
      prompt,
      visual: bag(win, r, other, b),
      answer,
      hints: ['Prüfe jede Änderung einzeln.', `Rechne jeweils: Kugeln in ${NOUN[win]} durch alle Kugeln.`],
      steps: [`Nach der Änderung: ${frac(correct.x, correct.y)}.`, `Gekürzt: ${frac(gp, gq)}.`, `Die Änderung: ${correct.label}.`],
      praise: 'Du hast jede Änderung am Anteil geprüft.',
      srText: say([context, prompt], answer),
      kmk: [...KMK, 'PK.problemloesen'],
    });
  }
}

export const chancenSkill: SkillDef = {
  ...SKILL,
  title: 'Chancen vergleichen',
  description: 'Du vergleichst Chancen mit relativen Häufigkeiten.',
  stufen: {
    1: 'Welches Säckchen gibt die bessere Chance?',
    2: 'Relative Häufigkeit von Würfen als Bruch',
    3: 'Das Säckchen ändern, bis die Chance passt',
  },
  kmk: KMK,
  generate(rng, stufe: Stufe, ctx) {
    const ab = targetAb(rng, stufe, ctx);
    if (stufe === 1) {
      if (ab === 1) return sameTotal(rng, ab);
      if (ab === 2) return comparePairs(rng, ab, EASY_PAIRS);
      return rng.chance(0.5) ? comparePairs(rng, ab, HARD_PAIRS) : bagAndSpinner(rng, ab);
    }
    if (stufe === 2) {
      if (ab === 1) return rollsFromDice(rng, ab);
      if (ab === 2) return rollsFromTally(rng, ab);
      return rng.chance(0.5) ? rollsEvent(rng, ab) : comparePlayers(rng, ab);
    }
    if (ab === 1) return afterChange(rng, ab);
    if (ab === 2) return rng.chance(0.6) ? reachGoalWithBag(rng, ab) : reachGoalWithSpinner(rng, ab);
    return whichChange(rng, ab);
  },
};
