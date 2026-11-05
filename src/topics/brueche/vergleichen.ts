/**
 * Brüche vergleichen: with signs, in an order, and through a Zwischenwert.
 * Stufe 1 (same Nenner or same Zähler): AB I same Nenner, AB II same Zähler, reasoned without a picture, AB III order fractions with the same Zähler, or a story.
 * Stufe 2 (one Nenner a multiple of the other, up to 20): AB I small Nenner, AB II larger Nenner and equal values, AB III order three. Never the same Zähler: that is Stufe 1.
 * Stufe 3 (Nenner up to 12 unrelated; compare with 1/2; order 4): AB I against 1/2 with an odd Nenner, or two fractions on either side of it, AB II unrelated Nenner, by the common Nenner
 * or by the distance to 1, AB III order four. Never the same Zähler (Stufe 1) and never a Nenner that is a multiple of the other (Stufe 2).
 */
import { BOX, fmt, frac } from '../../core/format';
import type { Bug, ChoiceOption, SkillDef, Step, Visual } from '../../core/types';
import { build, makeChoice, pickTwo } from '../shared';
import { byStufeAndAb, compareFrac, fracOf, gcd, isLowest, lcm, orderBugs, orderWith, partsName, range, relationOf, speak, symbolChoice, type Form, type Frac } from './helpers';

const SKILL = { id: 'brueche.vergleichen', topicId: 'brueche' } as const;
const KMK = ['ZO.bruch-erweitern'];

const LARGER_D = 'Je mehr Teile das Ganze hat, desto kleiner ist ein Teil.';
const COMPARE_PROMPT = 'Setze das passende Zeichen ein.';

const orderPrompt = (dir: 'aufsteigend' | 'absteigend') => `Ordne die Brüche von ${dir === 'aufsteigend' ? 'klein nach groß' : 'groß nach klein'}.`;
const signOf = (dir: 'aufsteigend' | 'absteigend') => (dir === 'aufsteigend' ? ' < ' : ' > ');

/** The two fractions of a comparison on a Zahlenstrahl, as A and B, when the line stays readable. */
function lineStep(a: Frac, b: Frac, text: string): Step {
  const d = lcm(a[1], b[1]);
  if (d > 24 || compareFrac(a, b) === 0) return text;
  const visual: Visual = { type: 'numberLine', min: 0, max: d, majorStep: d, minorStep: 1, labelMajor: true, denominator: d, labelFormat: 'fraction', marks: [{ value: (a[0] * d) / a[1], label: 'A' }, { value: (b[0] * d) / b[1], label: 'B' }] };
  return { text, visual };
}

/** Stufe 1, AB I. */
const sameDenominator: Form = (rng, stufe, ab) => {
  const d = rng.int(3, 12);
  const [x, y] = rng.sample(range(1, d - 1), 2);
  const a: Frac = [x, d];
  const b: Frac = [y, d];
  const relation = relationOf(compareFrac(a, b));
  const rule = 'Die Teile sind gleich groß. Mehr Teile sind mehr.';
  return build(SKILL, stufe, {
    key: `nenner:${x}/${d}:${y}`,
    ab,
    prompt: COMPARE_PROMPT,
    expression: `${fracOf(a)} ${BOX} ${fracOf(b)}`,
    answer: symbolChoice(rng, relation, { '<': rule, '>': rule, '=': 'Die Zähler sind verschieden. Die Werte sind nicht gleich.' }),
    hints: ['Die Nenner sind gleich. Die Teile sind also gleich groß.', 'Vergleiche die Zähler: Wie viele Teile sind es?'],
    steps: [`Beide Brüche zählen ${partsName(d)}.`, `${x} ${relationOf(x - y)} ${y}`, `Also: ${fracOf(a)} ${relation} ${fracOf(b)}`],
    praise: 'Du hast bei gleichem Nenner die Zähler verglichen.',
    srText: speak(`${COMPARE_PROMPT} ${fracOf(a)} und ${fracOf(b)}.`),
    kmk: KMK,
  });
};

/** Stufe 1, AB II: the same Zähler, the larger Nenner is the smaller fraction. Two bars in the task would give the sign by their shaded length, so they show why in the worked steps. */
const sameNumerator: Form = (rng, stufe, ab) => {
  const n = rng.int(1, 5);
  const [x, y] = rng.sample(range(n + 1, 12), 2);
  const a: Frac = [n, x];
  const b: Frac = [n, y];
  const relation = relationOf(compareFrac(a, b));
  const [small, large] = [Math.max(x, y), Math.min(x, y)];
  return build(SKILL, stufe, {
    key: `zaehler:${n}:${x}:${y}`,
    ab,
    prompt: COMPARE_PROMPT,
    expression: `${fracOf(a)} ${BOX} ${fracOf(b)}`,
    answer: symbolChoice(rng, relation, { '<': LARGER_D, '>': LARGER_D, '=': 'Der Zähler ist gleich. Die Teile sind verschieden groß.' }),
    hints: ['Die Zähler sind gleich. Es sind also gleich viele Teile.', 'Welche Teile sind größer? Stell dir zwei gleich lange Streifen vor.'],
    steps: [`Beide Brüche haben ${n === 1 ? '1 Teil' : `${n} Teile`}.`, { text: `${partsName(small)} sind kleiner als ${partsName(large)}.`, visual: { type: 'fractionModel', form: 'bar', parts: x, filled: n, compare: { parts: y, filled: n } } }, `Also: ${fracOf(a)} ${relation} ${fracOf(b)}`],
    praise: 'Du hast bei gleichem Zähler die Teilgrößen verglichen.',
    srText: speak(`${COMPARE_PROMPT} ${fracOf(a)} und ${fracOf(b)}.`),
    kmk: KMK,
  });
};

/** Stufe 1, AB III. */
const orderSameNumerator: Form = (rng, stufe, ab) => {
  const n = rng.int(1, 4);
  const values = rng.sample(range(n + 1, 12), rng.int(3, 4)).map((d): Frac => [n, d]);
  const direction = rng.pick(['aufsteigend', 'absteigend'] as const);
  const { answer, sorted, wrongOrder } = orderWith(rng, values, compareFrac, fracOf, direction);
  const prompt = orderPrompt(direction);
  return build(SKILL, stufe, {
    key: `ordnen-zaehler:${n}:${direction}:${sorted.map(fracOf).join()}`,
    ab,
    prompt,
    answer,
    hints: ['Die Zähler sind gleich. Schau auf die Größe der Teile.', LARGER_D],
    steps: ['Alle Brüche haben denselben Zähler.', 'Je größer der Nenner, desto kleiner der Bruch.', sorted.map(fracOf).join(signOf(direction))],
    bugs: orderBugs(answer.correct, [['groesserer-nenner', wrongOrder((x, y) => x[1] - y[1]), LARGER_D]]),
    praise: 'Du hast die Teilgrößen richtig geordnet.',
    srText: speak(`${prompt} ${values.map(fracOf).join(', ')}.`),
    kmk: KMK,
  });
};

const SHARE_STORIES: readonly { item: string; ask: string; verb: string; text: (a: string, x: string, b: string, y: string) => string }[] = [
  { item: 'Pizza', ask: 'Wer isst mehr?', verb: 'isst', text: (a, x, b, y) => `${a} isst ${x} von einer Pizza. ${b} isst ${y} von einer gleich großen Pizza.` },
  { item: 'Strecke', ask: 'Wer läuft weiter?', verb: 'läuft', text: (a, x, b, y) => `${a} läuft ${x} der Strecke. ${b} läuft ${y} der gleichen Strecke.` },
  { item: 'Buch', ask: 'Wer liest mehr?', verb: 'liest', text: (a, x, b, y) => `${a} liest ${x} von einem Buch. ${b} liest ${y} von dem gleichen Buch.` },
];

/** Stufe 1, AB III: who has more, with the same Zähler or Nenner, and never the same value. */
const sameKindStory: Form = (rng, stufe, ab) => {
  const sameN = rng.chance(0.5);
  const n = rng.int(1, 5);
  const [p, q] = rng.sample(range(n + 1, 12), 2);
  const d = rng.int(4, 12);
  const [u, v] = rng.sample(range(1, d - 1), 2);
  const a: Frac = sameN ? [n, p] : [u, d];
  const b: Frac = sameN ? [n, q] : [v, d];
  const [first, second] = pickTwo(rng);
  const story = rng.pick(SHARE_STORIES);
  const context = story.text(first.name, fracOf(a), second.name, fracOf(b));
  const prompt = story.ask;
  const winner = compareFrac(a, b) > 0 ? first.name : second.name;
  const loser = winner === first.name ? second.name : first.name;
  const wrongs: ChoiceOption[] = [
    { label: loser, whyWrong: sameN ? LARGER_D : 'Die Teile sind gleich groß. Mehr Teile sind mehr.' },
    { label: 'Beide gleich viel', whyWrong: 'Die Brüche haben verschiedene Werte. Vergleiche Zähler und Nenner.' },
  ];
  return build(SKILL, stufe, {
    key: `text:${story.item}:${[fracOf(a), fracOf(b)].sort().join()}`,
    ab,
    context,
    prompt,
    answer: makeChoice(rng, { label: winner }, wrongs),
    hints: [sameN ? 'Die Zähler sind gleich. Schau auf die Größe der Teile.' : 'Die Nenner sind gleich. Schau auf die Zähler.', 'Schreibe die beiden Brüche untereinander.'],
    steps: [sameN ? `Beide haben ${n === 1 ? '1 Teil' : `${n} Teile`}.` : `Beide zählen ${partsName(d)}.`, `${fracOf(a)} ${relationOf(compareFrac(a, b))} ${fracOf(b)}`, `${winner} ${story.verb} mehr.`],
    praise: 'Du hast die Brüche aus dem Text verglichen.',
    srText: speak(`${context} ${prompt}`),
    kmk: [...KMK, 'PK.modellieren'],
  });
};

/** [d, D]: D a proper multiple of d. */
const multiples = (maxD: number, minD = 0) => range(2, maxD).flatMap((d) => range(2, Math.floor(maxD / d)).filter((k) => d * k >= minD).map((k) => [d, d * k] as const));

/** What is wrong with an answer that compares the Zähler or the Nenner alone. */
const mustExtend = (n: number, d: number, D: number) => `Die Teile sind verschieden groß. Erweitere ${frac(n, d)} auf den Nenner ${D}.`;

/** Stufe 2: one Nenner is a multiple of the other. allowEqual: the two can have the same value. */
function multipleDenominator(maxD: number, minD: number, allowEqual: boolean): Form {
  const pairs = multiples(maxD, minD);
  return (rng, stufe, ab) => {
    const [d, D] = rng.pick(pairs);
    const k = D / d;
    const n = rng.pick(range(1, d - 1).filter((x) => isLowest(x, d)));
    const equal = allowEqual && rng.chance(0.25);
    const m = equal ? n * k : rng.pick(range(1, D - 1).filter((x) => x !== n * k && x !== n));
    const flip = rng.chance(0.5);
    const a: Frac = flip ? [m, D] : [n, d];
    const b: Frac = flip ? [n, d] : [m, D];
    const relation = relationOf(compareFrac(a, b));
    return build(SKILL, stufe, {
      key: `vielfach:${a.join('/')}:${b.join('/')}`,
      ab,
      prompt: COMPARE_PROMPT,
      expression: `${fracOf(a)} ${BOX} ${fracOf(b)}`,
      answer: symbolChoice(rng, relation, {
        '<': mustExtend(n, d, D),
        '>': mustExtend(n, d, D),
        '=': `Erweitere ${frac(n, d)} auf den Nenner ${D}. Vergleiche dann die Zähler.`,
      }),
      hints: [`Ein Nenner passt in den anderen: ${d} · ${k} = ${D}.`, `Erweitere ${frac(n, d)} auf den Nenner ${D}.`],
      steps: [
        { text: `Erweitere mit ${k}: ${frac(n, d)} = ${frac(n * k, D)}.`, visual: { type: 'fractionModel', form: 'bar', parts: d, filled: n, compare: { parts: D, filled: m } } },
        `Vergleiche die Zähler: ${n * k} und ${m}.`,
        `Also: ${fracOf(a)} ${relation} ${fracOf(b)}`,
      ],
      praise: 'Du hast zuerst die Nenner gleich gemacht.',
      srText: speak(`${COMPARE_PROMPT} ${fracOf(a)} und ${fracOf(b)}.`),
      kmk: KMK,
    });
  };
}

/** Stufe 2, AB III: order three whose Nenner form a chain of multiples, so the largest is the common Nenner. Every Zähler differs: a shared one is the rule of Stufe 1. */
const orderMultiples: Form = (rng, stufe, ab) => {
  const [d, D, E] = rng.pick([[2, 4, 8], [2, 4, 12], [2, 6, 12], [3, 6, 12], [4, 8, 16], [2, 8, 16], [5, 10, 20], [2, 10, 20], [3, 9, 18], [3, 6, 18]] as const);
  const common = lcm(lcm(d, D), E);
  const direction = rng.pick(['aufsteigend', 'absteigend'] as const);
  const a = rng.pick(range(1, d - 1).filter((x) => isLowest(x, d)));
  const pickOther = (den: number, taken: readonly Frac[]): Frac => {
    const free = range(1, den - 1).filter((x) => isLowest(x, den) && taken.every((f) => f[0] !== x && compareFrac([x, den], f) !== 0));
    return [rng.pick(free), den];
  };
  const first: Frac = [a, d];
  const second = pickOther(D, [first]);
  const third = pickOther(E, [first, second]);
  const values = [first, second, third];
  const { answer, sorted, wrongOrder } = orderWith(rng, values, compareFrac, fracOf, direction);
  const prompt = orderPrompt(direction);
  return build(SKILL, stufe, {
    key: `ordnen-vielfach:${direction}:${sorted.map(fracOf).join()}`,
    ab,
    prompt,
    answer,
    hints: [`Alle Nenner passen in ${common}.`, `Erweitere alle Brüche auf den Nenner ${common}. Vergleiche dann die Zähler.`],
    steps: [`Gemeinsamer Nenner: ${common}`, values.filter((f) => f[1] !== common).map((f) => `${fracOf(f)} = ${frac((f[0] * common) / f[1], common)}`).join('; '), sorted.map(fracOf).join(signOf(direction))],
    bugs: orderBugs(answer.correct, [
      ['groesserer-nenner', wrongOrder((x, y) => x[1] - y[1]), LARGER_D],
      ['nur-zaehler-verglichen', wrongOrder((x, y) => x[0] - y[0]), 'Die Teile sind verschieden groß. Mach zuerst die Nenner gleich.'],
    ]),
    praise: 'Du hast alle Brüche auf einen Nenner gebracht.',
    srText: speak(`${prompt} ${values.map(fracOf).join(', ')}.`),
    kmk: KMK,
  });
};

/** Lowest fractions below 1 with the Nenner d. */
const lowOf = (d: number) => range(1, d - 1).filter((x) => isLowest(x, d));

/** Stufe 3, AB I: against 1/2, with an odd Nenner up to 12: an even one is a multiple of 2 (Stufe 2), a Zähler of 1 the same Zähler (Stufe 1). */
const againstHalf: Form = (rng, stufe, ab) => {
  const d = rng.pick([3, 5, 7, 9, 11]);
  const n = rng.pick(lowOf(d).filter((x) => x > 1));
  const half: Frac = [1, 2];
  const flip = rng.chance(0.5);
  const a: Frac = flip ? half : [n, d];
  const b: Frac = flip ? [n, d] : half;
  const relation = relationOf(compareFrac(a, b));
  const above = 2 * n > d;
  const half2 = fmt(d / 2);
  return build(SKILL, stufe, {
    key: `halb:${n}/${d}:${flip ? 'h' : 'b'}`,
    ab,
    prompt: COMPARE_PROMPT,
    expression: `${fracOf(a)} ${BOX} ${fracOf(b)}`,
    answer: symbolChoice(rng, relation, {
      '<': `Die Hälfte von ${d} Teilen sind ${half2} Teile. Vergleiche den Zähler mit dieser Zahl.`,
      '>': `Die Hälfte von ${d} Teilen sind ${half2} Teile. Vergleiche den Zähler mit dieser Zahl.`,
      '=': `Nur ein Zähler von genau der Hälfte des Nenners ergibt ${frac(1, 2)}.`,
    }),
    hints: [`Wie viele Teile sind die Hälfte von ${d} Teilen?`, `Vergleiche den Zähler ${n} mit dieser Zahl.`],
    steps: [`Die Hälfte von ${d} ist ${half2}.`, `${n} ist ${above ? 'mehr' : 'weniger'} als die Hälfte.`, `Also: ${fracOf(a)} ${relation} ${fracOf(b)}`],
    praise: `Du hast ${frac(1, 2)} als Vergleichswert genutzt.`,
    srText: speak(`${COMPARE_PROMPT} ${fracOf(a)} und ${fracOf(b)}.`),
    kmk: KMK,
  });
};

/** Unrelated Nenner up to 12. */
const UNRELATED: readonly (readonly [number, number])[] = range(3, 12).flatMap((d) => range(d + 1, 12).filter((e) => e % d !== 0 && gcd(d, e) < d).map((e) => [d, e] as const));

/** [below 1/2, above 1/2] with unrelated Nenner, in either order of size, never with the same Zähler. */
const SIDES: readonly (readonly [Frac, Frac])[] = UNRELATED.flatMap(([p, q]) => [[p, q], [q, p]]).flatMap(([d, e]) => lowOf(d).filter((x) => 2 * x < d)
  .flatMap((x) => lowOf(e).filter((y) => 2 * y > e && y !== x).map((y) => [[x, d], [y, e]] as const)));
/** Three kinds of pair: the fraction above 1/2 has the larger Nenner and Zähler; the smaller Nenner and Zähler (2/3 and 3/8); only the smaller Nenner. */
const SIDES_LARGER = SIDES.filter(([low, high]) => high[1] > low[1]);
const SIDES_SMALLER = SIDES.filter(([low, high]) => high[1] < low[1] && high[0] < low[0]);
const SIDES_MIXED = SIDES.filter(([low, high]) => high[1] < low[1] && high[0] > low[0]);

/** Stufe 3, AB I: one above 1/2, one below. Drawn in this mix, so that neither the larger Nenner nor the larger Zähler alone (research §5) gets the sign right as a rule. */
const eitherSideOfHalf: Form = (rng, stufe, ab) => {
  const [[below, d], [above, e]] = rng.pick(rng.pick([SIDES_LARGER, SIDES_LARGER, SIDES_SMALLER, SIDES_SMALLER, SIDES_MIXED]));
  const flip = rng.chance(0.5);
  const a: Frac = flip ? [above, e] : [below, d];
  const b: Frac = flip ? [below, d] : [above, e];
  const relation = relationOf(compareFrac(a, b));
  const wrongSide = `Ist jeder Bruch größer oder kleiner als ${frac(1, 2)}? Ein Bruch liegt darunter, der andere darüber.`;
  return build(SKILL, stufe, {
    key: `beide-seiten:${a.join('/')}:${b.join('/')}`,
    ab,
    prompt: COMPARE_PROMPT,
    expression: `${fracOf(a)} ${BOX} ${fracOf(b)}`,
    answer: symbolChoice(rng, relation, { '<': wrongSide, '>': wrongSide, '=': wrongSide }),
    hints: [`Ist der erste Bruch größer oder kleiner als ${frac(1, 2)}?`, `Ist der zweite Bruch größer oder kleiner als ${frac(1, 2)}?`],
    steps: [`${frac(below, d)} < ${frac(1, 2)}`, `${frac(above, e)} > ${frac(1, 2)}`, lineStep(a, b, `Also: ${fracOf(a)} ${relation} ${fracOf(b)}`)],
    praise: `Du hast ${frac(1, 2)} als Vergleichswert genutzt.`,
    srText: speak(`${COMPARE_PROMPT} ${fracOf(a)} und ${fracOf(b)}.`),
    kmk: KMK,
  });
};

/** One part short of 1 against two parts short, where the larger Nenner has the larger rest: 3/4 and 5/7. e > d + 1, or the Zähler are the same. */
const isTwoShort = ([n, d]: Frac, [m, e]: Frac) => d >= 4 && n === d - 1 && m === e - 2 && e > d + 1 && e < 2 * d;

/** Pairs with unrelated Nenner, on the same side of 1/2, never equal, never with the same Zähler (Stufe 1), and not one or two parts short of 1: that is the other form of this AB level. */
const UNRELATED_PAIRS: readonly (readonly [Frac, Frac])[] = UNRELATED.flatMap(([d, e]) => lowOf(d).flatMap((n) => lowOf(e)
  .filter((m) => (2 * n > d) === (2 * m > e) && n !== m && n * e !== m * d && !(n === d - 1 && m === e - 1) && !isTwoShort([n, d], [m, e]))
  .map((m) => [[n, d], [m, e]] as const)));
/** The second fraction has the larger Nenner. Sorted by what the larger Nenner and the larger Zähler alone would say (research §5). */
const biasRight = ([a, b]: readonly [Frac, Frac], at: 0 | 1) => Math.sign(b[at] - a[at]) === Math.sign(compareFrac(b, a));
const PAIRS_BIAS_RIGHT = UNRELATED_PAIRS.filter((p) => biasRight(p, 0) && biasRight(p, 1));
const PAIRS_BIAS_WRONG = UNRELATED_PAIRS.filter((p) => !biasRight(p, 0) && !biasRight(p, 1));
const PAIRS_BIAS_SPLIT = UNRELATED_PAIRS.filter((p) => biasRight(p, 0) !== biasRight(p, 1));

/** Stufe 3, AB II: unrelated Nenner, through the Hauptnenner. Drawn in this mix, so that a single number does not give the sign as a rule. */
const unrelated: Form = (rng, stufe, ab) => {
  const pair = rng.pick(rng.pick([PAIRS_BIAS_RIGHT, PAIRS_BIAS_WRONG, PAIRS_BIAS_WRONG, PAIRS_BIAS_SPLIT]));
  const [a, b] = rng.chance(0.5) ? pair : [pair[1], pair[0]];
  const common = lcm(a[1], b[1]);
  const relation = relationOf(compareFrac(a, b));
  const x = (a[0] * common) / a[1];
  const y = (b[0] * common) / b[1];
  const onlyParts = 'Die Teile sind verschieden groß. Mach zuerst die Nenner gleich.';
  return build(SKILL, stufe, {
    key: `fremd:${a.join('/')}:${b.join('/')}`,
    ab,
    prompt: COMPARE_PROMPT,
    expression: `${fracOf(a)} ${BOX} ${fracOf(b)}`,
    answer: symbolChoice(rng, relation, { '<': onlyParts, '>': onlyParts, '=': 'Mach die Nenner gleich. Die Zähler sind dann verschieden.' }),
    hints: [`Suche einen gemeinsamen Nenner von ${a[1]} und ${b[1]}.`, 'Erweitere beide Brüche. Vergleiche dann die Zähler.'],
    steps: [`Gemeinsamer Nenner: ${common}`, `${fracOf(a)} = ${frac(x, common)}`, `${fracOf(b)} = ${frac(y, common)}`, lineStep(a, b, `Also: ${fracOf(a)} ${relation} ${fracOf(b)}`)],
    praise: 'Du hast beide Brüche auf denselben Nenner gebracht.',
    srText: speak(`${COMPARE_PROMPT} ${fracOf(a)} und ${fracOf(b)}.`),
    kmk: KMK,
  });
};

const ONE_SHORT: readonly (readonly [Frac, Frac])[] = UNRELATED.filter(([x, y]) => x >= 4 && y >= 4).map(([d, e]) => [[d - 1, d], [e - 1, e]]);
const TWO_SHORT: readonly (readonly [Frac, Frac])[] = UNRELATED.filter(([d, e]) => e % 2 === 1 && isTwoShort([d - 1, d], [e - 2, e])).map(([d, e]) => [[d - 1, d], [e - 2, e]]);

/** Stufe 3, AB II: both just below 1, so the rest to the Ganzes tells. With one part short the larger Nenner always wins; two parts short it loses, so the rest has to be looked at. */
const distanceToOne: Form = (rng, stufe, ab) => {
  const [a, b] = rng.pick(rng.pick([ONE_SHORT, TWO_SHORT, TWO_SHORT]));
  const flip = rng.chance(0.5);
  const [left, right] = flip ? [b, a] : [a, b];
  const relation = relationOf(compareFrac(left, right));
  const restOf = ([n, d]: Frac) => frac(d - n, d);
  const hint = `Vergleiche mit dem Rest bis zum Ganzen: ${restOf(a)} und ${restOf(b)}.`;
  return build(SKILL, stufe, {
    key: `abstand:${left.join('/')}:${right.join('/')}`,
    ab,
    prompt: COMPARE_PROMPT,
    expression: `${fracOf(left)} ${BOX} ${fracOf(right)}`,
    answer: symbolChoice(rng, relation, { '<': hint, '>': hint, '=': hint }),
    hints: ['Wie viel fehlt jedem Bruch bis zum Ganzen?', 'Weniger Rest heißt: näher an 1.'],
    steps: [`Bis 1 fehlt ${fracOf(a)} noch ${restOf(a)}.`, `Bis 1 fehlt ${fracOf(b)} noch ${restOf(b)}.`, `Der kleinere Rest gehört zum größeren Bruch: ${fracOf(left)} ${relation} ${fracOf(right)}`],
    praise: 'Du hast den Rest bis zum Ganzen verglichen.',
    srText: speak(`${COMPARE_PROMPT} ${fracOf(left)} und ${fracOf(right)}.`),
    kmk: [...KMK, 'PK.problemloesen'],
  });
};

/** Stufe 3, AB III: order four from unrelated Nenner up to 12, not all with the same Zähler. */
const orderFour: Form = (rng, stufe, ab) => {
  const denominators = rng.sample([3, 4, 5, 6, 8, 9, 10, 12], 4);
  const values: Frac[] = [];
  for (const d of denominators) {
    const free = lowOf(d).filter((x) => values.every((f) => compareFrac([x, d], f) !== 0) && !(values.length === 3 && values.every((f) => f[0] === x)));
    values.push([rng.pick(free), d]);
  }
  const direction = rng.pick(['aufsteigend', 'absteigend'] as const);
  const { answer, sorted, wrongOrder } = orderWith(rng, values, compareFrac, fracOf, direction);
  const prompt = orderPrompt(direction);
  const bugs: Bug[] = orderBugs(answer.correct, [
    ['groesserer-nenner', wrongOrder((x, y) => x[1] - y[1]), LARGER_D],
    ['nur-zaehler-verglichen', wrongOrder((x, y) => x[0] - y[0]), 'Die Teile sind verschieden groß. Mach zuerst die Nenner gleich.'],
  ]);
  const below = sorted.filter((f) => 2 * f[0] < f[1]);
  return build(SKILL, stufe, {
    key: `ordnen-vier:${direction}:${sorted.map(fracOf).join()}`,
    ab,
    prompt,
    answer,
    hints: [`Sortiere zuerst: kleiner oder größer als ${frac(1, 2)}?`, 'Vergleiche dann die Brüche jeder Gruppe.'],
    steps: [below.length ? `Kleiner als ${frac(1, 2)}: ${below.map(fracOf).join(', ')}` : `Kein Bruch ist kleiner als ${frac(1, 2)}.`, 'Vergleiche in jeder Gruppe über den gemeinsamen Nenner.', sorted.map(fracOf).join(signOf(direction))],
    bugs,
    praise: 'Du hast geschickt mit Vergleichswerten geordnet.',
    srText: speak(`${prompt} ${values.map(fracOf).join(', ')}.`),
    kmk: [...KMK, 'PK.problemloesen'],
  });
};

export const vergleichenSkill: SkillDef = {
  ...SKILL,
  title: 'Brüche vergleichen',
  description: 'Du findest heraus, welcher Bruch größer ist.',
  stufen: {
    1: 'Gleicher Nenner oder gleicher Zähler',
    2: 'Ein Nenner ist ein Vielfaches des anderen, bis 20',
    3: 'Nenner bis 12 ohne Bezug; Vergleich mit einem Halben; vier ordnen',
  },
  kmk: KMK,
  generate: byStufeAndAb({
    1: { 1: [sameDenominator], 2: [sameNumerator], 3: [orderSameNumerator, sameKindStory] },
    2: { 1: [multipleDenominator(12, 0, false)], 2: [multipleDenominator(20, 12, true)], 3: [orderMultiples] },
    3: { 1: [againstHalf, eitherSideOfHalf], 2: [unrelated, distanceToOne], 3: [orderFour] },
  }),
};
