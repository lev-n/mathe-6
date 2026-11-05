/**
 * Brüche addieren und subtrahieren. An answer may stay an unechter Bruch or become a gemischte Zahl (keys.mixed), and it ends in lowest terms: an equal value that can be shortened gets a
 * calm message and uses no attempt (FRACTION_NOT_LOWEST).
 * Stufe 1 (gleichnamig, Nenner up to 12): AB I the result stays below 1, AB II the sum passes 1, or a story, AB III a missing number.
 * Stufe 2 (one Nenner a multiple of the other, up to 20): AB I small Nenner, AB II larger Nenner, or a story, AB III a missing number, or what remains of a Ganzes in a story.
 * Stufe 3 (Hauptnenner up to 24, unrelated Nenner): AB I a small Hauptnenner, AB II a Hauptnenner from 18 on, or a story, AB III a missing fraction, or what remains of a Ganzes in a story.
 * Gemischte Zahlen come 'only where planned' (research §6), and GenContext holds no plan: MIXED_WHERE_PLANNED holds those forms, tested and not served until it does.
 */
import { BOX, MINUS, frac } from '../../core/format';
import type { Bug, FractionAnswer, SkillDef, Step } from '../../core/types';
import { build, fractionAnswer, pickPerson } from '../shared';
import { byStufeAndAb, compareFrac, differenceOf, fracOf, gcd, isLowest, lcm, lowest, mixedOf, mixedText, partsName, range, speak, sumOf, valueBugs, type Form, type Frac } from './helpers';

const SKILL = { id: 'brueche.plus-minus', topicId: 'brueche' } as const;
const KMK = ['ZO.bruch-plusminus'];

/** A result: an unechter Bruch stays one here; the child may write it mixed (keys.mixed). */
const answerOf = ([n, d]: Frac, rest: Partial<FractionAnswer> = {}): FractionAnswer => fractionAnswer(n, d, { allowMixed: true, ...rest });
const correctOf = ([n, d]: Frac) => ({ numerator: n, denominator: d });

/** The last step: the result, shortened if it needed that. */
function resultStep(raw: Frac, result: Frac): string {
  return compareFrac(raw, result) === 0 && raw[1] !== result[1] ? `Gekürzt: ${fracOf(raw)} = ${fracOf(result)}` : `Ergebnis: ${mixedText(result)}`;
}

const Tasks = {
  /** a/d + b/d. */
  sum: (maxD: number, passOne: boolean) => range(3, maxD).flatMap((d) => range(1, d - 1).flatMap((a) => range(1, d - 1).filter((b) => (passOne ? a + b > d : a + b < d)).map((b) => [a, b, d] as const))),
  /** a/d − b/d. */
  difference: (maxD: number) => range(3, maxD).flatMap((d) => range(2, d - 1).flatMap((a) => range(1, a - 1).map((b) => [a, b, d] as const))),
};

const SAME_SUM_LOW = Tasks.sum(12, false);
const SAME_SUM_HIGH = Tasks.sum(12, true).filter(([a, b, d]) => (a + b) % d !== 0);
const SAME_DIFF = Tasks.difference(12);

const sameSumBugs = (a: number, b: number, d: number, result: Frac): Bug[] => valueBugs([
  { id: 'zaehler-nenner-addiert', match: { numerator: a + b, denominator: 2 * d }, hint: 'Die Stücke sind gleich groß. Der Nenner bleibt gleich.' },
  { id: 'nenner-mal', match: { numerator: a * b, denominator: d }, hint: 'Addiere die Zähler. Rechne hier nicht mal.' },
], correctOf(result));

const sameDiffBugs = (a: number, b: number, d: number, result: Frac): Bug[] => valueBugs([
  { id: 'plus-statt-minus', match: { numerator: a + b, denominator: d }, hint: 'Hier steht minus. Zieh den zweiten Zähler ab.' },
  a - b !== d && { id: 'nur-zaehler-gerechnet', match: { numerator: a - b, denominator: 2 * d }, hint: 'Die Stücke sind gleich groß. Der Nenner bleibt gleich.' },
], correctOf(result));

/** A step with a bar: the sum of the two shares in one Ganzes. */
const barStep = (text: string, filled: number, d: number): Step => (filled <= d ? { text, visual: { type: 'fractionModel', form: 'bar', parts: d, filled } } : text);

/** Stufe 1, AB I. */
const sameBelowOne: Form = (rng, stufe, ab) => {
  const minus = rng.chance(0.4);
  const [a, b, d] = rng.pick(minus ? SAME_DIFF : SAME_SUM_LOW);
  const value = minus ? a - b : a + b;
  const result = lowest([value, d]);
  const sign = minus ? MINUS : '+';
  const expression = `${frac(a, d)} ${sign} ${frac(b, d)} = ${BOX}`;
  const prompt = 'Rechne aus. Kürze das Ergebnis.';
  return build(SKILL, stufe, {
    key: `gleich:${minus ? 'm' : 'p'}:${a}:${b}:${d}`,
    ab,
    prompt,
    expression,
    answer: answerOf(result),
    hints: ['Die Nenner sind gleich. Die Stücke sind also gleich groß.', minus ? 'Zieh den zweiten Zähler vom ersten ab. Der Nenner bleibt.' : 'Addiere die Zähler. Der Nenner bleibt.'],
    steps: [`Die Nenner sind gleich: ${partsName(d)}.`, barStep(`${a} ${sign} ${b} = ${value} ${partsName(d)}`, value, d), resultStep([value, d], result)],
    bugs: minus ? sameDiffBugs(a, b, d, result) : sameSumBugs(a, b, d, result),
    praise: 'Du hast nur die Zähler gerechnet, der Nenner blieb.',
    srText: speak(`${prompt} ${expression}`),
    kmk: KMK,
  });
};

/** Stufe 1, AB II: the sum passes 1. */
const samePastOne: Form = (rng, stufe, ab) => {
  const [a, b, d] = rng.pick(SAME_SUM_HIGH);
  const result = lowest([a + b, d]);
  const expression = `${frac(a, d)} + ${frac(b, d)} = ${BOX}`;
  return build(SKILL, stufe, {
    key: `gleich-ueber:${a}:${b}:${d}`,
    ab,
    prompt: 'Rechne aus. Kürze das Ergebnis.',
    expression,
    answer: answerOf(result),
    hints: ['Die Nenner sind gleich. Addiere die Zähler.', 'Der Zähler darf größer werden als der Nenner.'],
    steps: [`Die Nenner sind gleich: ${partsName(d)}.`, `${a} + ${b} = ${a + b} ${partsName(d)}`, resultStep([a + b, d], result)],
    bugs: sameSumBugs(a, b, d, result),
    praise: 'Du hast die Zähler addiert und den Nenner behalten.',
    srText: speak(`Rechne aus. Kürze das Ergebnis. ${expression}`),
    kmk: KMK,
  });
};

const STORY_USES = [
  { text: (name: string, x: string, y: string) => `${name} isst ${x} von einer Pizza. Danach isst ${name} noch ${y} der Pizza.`, ask: 'Welcher Anteil der Pizza ist das zusammen?' },
  { text: (name: string, x: string, y: string) => `${name} liest am Montag ${x} von einem Buch. Am Dienstag liest ${name} ${y} des Buches.`, ask: 'Welcher Anteil des Buches ist das zusammen?' },
  { text: (name: string, x: string, y: string) => `${name} malt ${x} von einem Bild. Danach malt ${name} noch ${y} des Bildes.`, ask: 'Welcher Anteil des Bildes ist fertig?' },
] as const;

/** Stufe 1, AB II: a story; the sum stays at most 1. */
const sameStory: Form = (rng, stufe, ab) => {
  const [a, b, d] = rng.pick(SAME_SUM_LOW);
  const result = lowest([a + b, d]);
  const story = rng.pick(STORY_USES);
  const context = story.text(pickPerson(rng).name, frac(a, d), frac(b, d));
  const prompt = story.ask;
  return build(SKILL, stufe, {
    key: `gleich-text:${STORY_USES.indexOf(story)}:${a}:${b}:${d}`,
    ab,
    context,
    prompt,
    answer: answerOf(result),
    hints: ['Beide Anteile gehören zum selben Ganzen. Rechne plus.', 'Die Nenner sind gleich. Addiere die Zähler.'],
    steps: [`${frac(a, d)} + ${frac(b, d)}`, `${a} + ${b} = ${a + b} ${partsName(d)}`, resultStep([a + b, d], result)],
    bugs: sameSumBugs(a, b, d, result),
    praise: 'Du hast die beiden Anteile zusammengezählt.',
    srText: speak(`${context} ${prompt}`),
    kmk: [...KMK, 'PK.modellieren'],
  });
};

/** Stufe 1, AB III: a missing number in a gleichnamige task. */
const sameMissing: Form = (rng, stufe, ab) => {
  const [a, b, d] = rng.pick(SAME_SUM_LOW);
  const total = a + b;
  // front: □ − b/d = a/d; else a/d + □ = total/d.
  const front = rng.chance(0.5);
  const answer: Frac = lowest(front ? [total, d] : [b, d]);
  const expression = front ? `${BOX} ${MINUS} ${frac(b, d)} = ${frac(a, d)}` : `${frac(a, d)} + ${BOX} = ${frac(total, d)}`;
  return build(SKILL, stufe, {
    key: `gleich-luecke:${front ? 'v' : 'h'}:${a}:${b}:${d}`,
    ab,
    prompt: 'Kürze das Ergebnis. Welcher Bruch fehlt?',
    expression,
    answer: answerOf(answer),
    hints: [front ? 'Rechne rückwärts: Die Umkehrung von minus ist plus.' : 'Rechne rückwärts: Die Umkehrung von plus ist minus.', 'Der Nenner bleibt gleich.'],
    steps: front
      ? [`Rechne rückwärts: ${frac(a, d)} + ${frac(b, d)}`, `${a} + ${b} = ${total} ${partsName(d)}`, resultStep([total, d], answer)]
      : [`Rechne rückwärts: ${frac(total, d)} ${MINUS} ${frac(a, d)}`, `${total} ${MINUS} ${a} = ${b} ${partsName(d)}`, resultStep([b, d], answer)],
    bugs: valueBugs(front
      ? [{ id: 'umkehrung-vergessen', match: { numerator: Math.abs(a - b), denominator: d }, hint: 'Rechne rückwärts: Die Umkehrung von minus ist plus.' }]
      : [{ id: 'umkehrung-vergessen', match: { numerator: total + a, denominator: d }, hint: 'Rechne rückwärts: Die Umkehrung von plus ist minus.' }], correctOf(answer)),
    praise: 'Du hast die Umkehraufgabe genutzt.',
    srText: speak(`Welcher Bruch fehlt? ${expression}`),
    kmk: [...KMK, 'PK.problemloesen'],
  });
};

/** [d, D]: D a multiple of d, up to maxD. */
const multiplePairs = (minD: number, maxD: number) => range(2, maxD).flatMap((d) => range(2, Math.floor(maxD / d)).filter((k) => d * k >= minD && d * k <= maxD).map((k) => [d, d * k] as const));

/** Two different fractions with these Nenner, the result neither 0 nor a whole number. belowOne: both are shares of one Ganzes, so a sum cannot pass it. */
function pickPair(rng: Parameters<Form>[0], d: number, D: number, minus: boolean, belowOne = false): [Frac, Frac, Frac] {
  const first = range(1, d - 1).filter((x) => isLowest(x, d));
  const second = range(1, D - 1).filter((x) => gcd(x, D) === 1);
  const all = first.flatMap((n) => second.map((m): [Frac, Frac] => [[n, d], [m, D]]));
  const usable = all.filter(([a, b]) => {
    const [x, y] = minus && compareFrac(a, b) < 0 ? [b, a] : [a, b];
    if (compareFrac(x, y) === 0) return false;
    if (belowOne && compareFrac(sumOf(x, y), [1, 1]) >= 0) return false;
    return (minus ? differenceOf(x, y) : sumOf(x, y))[1] !== 1;
  });
  const [p, q] = rng.pick(usable);
  const [x, y] = minus && compareFrac(p, q) < 0 ? [q, p] : [p, q];
  return [x, y, minus ? differenceOf(x, y) : sumOf(x, y)];
}

/** The bugs of two Nenner that are not gleich; plausible: the mistaken sum is checked against a summand. */
function unlikeBugs(a: Frac, b: Frac, minus: boolean, result: Frac, plausible: boolean): Bug[] {
  const larger = compareFrac(a, b) > 0 ? a : b;
  const big = Math.max(a[1], b[1]);
  return valueBugs([
    !minus && (plausible
      ? { id: 'plausibel-kleiner', match: { numerator: a[0] + b[0], denominator: a[1] + b[1] }, hint: `Schau noch einmal: ${frac(a[0] + b[0], a[1] + b[1])} ist kleiner als ${fracOf(larger)}. Kann das stimmen?` }
      : { id: 'zaehler-nenner-addiert', match: { numerator: a[0] + b[0], denominator: a[1] + b[1] }, hint: 'Die Stücke sind verschieden groß. Mach zuerst die Nenner gleich.' }),
    !minus && { id: 'nicht-erweitert', match: { numerator: a[0] + b[0], denominator: big }, hint: 'Die Stücke sind verschieden groß. Erweitere zuerst auf denselben Nenner.' },
    minus && a[0] > b[0] && { id: 'nicht-erweitert', match: { numerator: a[0] - b[0], denominator: big }, hint: 'Die Stücke sind verschieden groß. Erweitere zuerst auf denselben Nenner.' },
    minus && a[1] !== b[1] && { id: 'nenner-abgezogen', match: { numerator: Math.abs(a[0] - b[0]), denominator: Math.abs(a[1] - b[1]) }, hint: 'Die Stücke sind verschieden groß. Mach zuerst die Nenner gleich.' },
  ], correctOf(result));
}

/** The steps of two Nenner: the common Nenner, the extended fractions, the result. */
function unlikeSteps(a: Frac, b: Frac, minus: boolean, result: Frac): Step[] {
  const common = lcm(a[1], b[1]);
  const x = (a[0] * common) / a[1];
  const y = (b[0] * common) / b[1];
  const raw = minus ? x - y : x + y;
  const sign = minus ? MINUS : '+';
  return [`Hauptnenner: ${common}`, `${fracOf(a)} = ${frac(x, common)} und ${fracOf(b)} = ${frac(y, common)}`, `${frac(x, common)} ${sign} ${frac(y, common)} = ${frac(raw, common)}`, resultStep([raw, common], result)];
}

/** Stufe 2 and Stufe 3: two fractions with different Nenner. */
function unlike(pairs: readonly (readonly [number, number])[], key: string, plausible: boolean, praise: string): Form {
  return (rng, stufe, ab) => {
    const [d, D] = rng.pick(pairs);
    const minus = rng.chance(0.4);
    const [a, b, result] = pickPair(rng, d, D, minus);
    const sign = minus ? MINUS : '+';
    const expression = `${fracOf(a)} ${sign} ${fracOf(b)} = ${BOX}`;
    const common = lcm(a[1], b[1]);
    return build(SKILL, stufe, {
      key: `${key}:${minus ? 'm' : 'p'}:${a.join('/')}:${b.join('/')}`,
      ab,
      prompt: 'Rechne aus. Kürze das Ergebnis.',
      expression,
      answer: answerOf(result),
      hints: [common === Math.max(d, D) ? `Ein Nenner passt in den anderen. Mach den kleineren Nenner zu ${common}.` : `Suche den Hauptnenner: die kleinste Zahl, in die ${d} und ${D} passen.`, 'Erweitere die Brüche. Rechne dann mit den Zählern.'],
      steps: unlikeSteps(a, b, minus, result),
      bugs: unlikeBugs(a, b, minus, result, plausible),
      praise,
      srText: speak(`Rechne aus. Kürze das Ergebnis. ${expression}`),
      kmk: KMK,
    });
  };
}

/** Stufe 2 and Stufe 3, AB II: a story with different Nenner; the sum stays below 1. */
const unlikeStory = (pairs: readonly (readonly [number, number])[]): Form => (rng, stufe, ab) => {
  const [d, D] = rng.pick(pairs);
  const [a, b, result] = pickPair(rng, d, D, false, true);
  const story = rng.pick(STORY_USES);
  const context = story.text(pickPerson(rng).name, fracOf(a), fracOf(b));
  const prompt = story.ask;
  return build(SKILL, stufe, {
    key: `text:${STORY_USES.indexOf(story)}:${a.join('/')}:${b.join('/')}`,
    ab,
    context,
    prompt,
    answer: answerOf(result),
    hints: ['Beide Anteile gehören zum selben Ganzen. Rechne plus.', `Erweitere auf den Nenner ${lcm(d, D)}.`],
    steps: unlikeSteps(a, b, false, result),
    bugs: unlikeBugs(a, b, false, result, true),
    praise: 'Du hast die Nenner gleich gemacht und addiert.',
    srText: speak(`${context} ${prompt}`),
    kmk: [...KMK, 'PK.modellieren'],
  });
};

/** Stufe 2 and Stufe 3, AB III: a missing fraction. */
const unlikeMissing = (pairs: readonly (readonly [number, number])[]): Form => (rng, stufe, ab) => {
  const [d, D] = rng.pick(pairs);
  const [x, y] = pickPair(rng, d, D, true);
  const answer = differenceOf(x, y);
  const expression = `${fracOf(y)} + ${BOX} = ${fracOf(x)}`;
  const common = lcm(d, D);
  const X = (x[0] * common) / x[1];
  const Y = (y[0] * common) / y[1];
  return build(SKILL, stufe, {
    key: `luecke:${y.join('/')}:${x.join('/')}`,
    ab,
    prompt: 'Kürze das Ergebnis. Welcher Bruch fehlt?',
    expression,
    answer: answerOf(answer),
    hints: ['Rechne rückwärts: Die Umkehrung von plus ist minus.', `Erweitere auf den Nenner ${common}.`],
    steps: [`Rechne rückwärts: ${fracOf(x)} ${MINUS} ${fracOf(y)}`, `Hauptnenner: ${common}`, `${frac(X, common)} ${MINUS} ${frac(Y, common)} = ${frac(X - Y, common)}`, resultStep([X - Y, common], answer)],
    bugs: unlikeBugs(x, y, true, answer, false),
    praise: 'Du hast die Umkehraufgabe mit gleichen Nennern gerechnet.',
    srText: speak(`Welcher Bruch fehlt? ${expression}`),
    kmk: [...KMK, 'PK.problemloesen'],
  });
};

/** Stufe 2 and Stufe 3, AB III: what remains of a Ganzes. */
const unlikeRest = (nenner: readonly (readonly [number, number])[]): Form => (rng, stufe, ab) => {
  const [d, D] = rng.pick(nenner);
  const pairs = range(1, d - 1).filter((x) => isLowest(x, d)).flatMap((n) => range(1, D - 1).filter((m) => gcd(m, D) === 1).map((m): [Frac, Frac] => [[n, d], [m, D]])).filter(([a, b]) => compareFrac(sumOf(a, b), [1, 1]) < 0);
  const usable = pairs.length ? pairs : ([[[1, d], [1, D]]] as [Frac, Frac][]);
  const [a, b] = rng.pick(usable);
  const sum = sumOf(a, b);
  const result = differenceOf([1, 1], sum);
  const person = pickPerson(rng);
  const context = `${person.name} isst ${fracOf(a)} von einer Pizza. Danach isst ${person.name} noch ${fracOf(b)} der Pizza.`;
  const prompt = 'Welcher Anteil der Pizza bleibt übrig?';
  const common = lcm(d, D);
  const X = (a[0] * common) / d;
  const Y = (b[0] * common) / D;
  return build(SKILL, stufe, {
    key: `rest:${a.join('/')}:${b.join('/')}`,
    ab,
    context,
    prompt,
    answer: answerOf(result),
    hints: ['Rechne zuerst den gegessenen Anteil aus.', 'Die ganze Pizza ist 1. Zieh den gegessenen Anteil davon ab.'],
    steps: [`Hauptnenner: ${common}`, `Gegessen: ${frac(X, common)} + ${frac(Y, common)} = ${frac(X + Y, common)}`, `Übrig: ${frac(common, common)} ${MINUS} ${frac(X + Y, common)} = ${frac(common - X - Y, common)}`, resultStep([common - X - Y, common], result)],
    bugs: valueBugs([
      { id: 'gegessen-statt-rest', match: correctOf(sum), hint: 'Das ist der gegessene Anteil. Gefragt ist der Rest.' },
      { id: 'zaehler-nenner-addiert', match: { numerator: a[0] + b[0], denominator: d + D }, hint: 'Die Stücke sind verschieden groß. Mach zuerst die Nenner gleich.' },
    ], correctOf(result)),
    praise: 'Du hast die ganze Pizza als 1 genommen.',
    srText: speak(`${context} ${prompt}`),
    kmk: [...KMK, 'PK.problemloesen'],
  });
};

/** Stufe 3: unrelated Nenner, Hauptnenner up to 24. */
const HAUPT_PAIRS: readonly (readonly [number, number])[] = range(2, 12).flatMap((d) => range(d + 1, 12).filter((e) => e % d !== 0 && lcm(d, e) <= 24 && lcm(d, e) > e).map((e) => [d, e] as const));
const HAUPT_SMALL = HAUPT_PAIRS.filter(([d, e]) => lcm(d, e) <= 15);
const HAUPT_LARGE = HAUPT_PAIRS.filter(([d, e]) => lcm(d, e) >= 18);

/** A gemischte Zahl as a fraction. */
const fromMixed = (w: number, n: number, d: number): Frac => [w * d + n, d];

const mixedAnswerOf = (f: Frac): FractionAnswer => {
  const m = mixedOf(f);
  return m.whole > 0 && m.numerator > 0 ? fractionAnswer(m.numerator, m.denominator, { whole: m.whole, allowMixed: true }) : answerOf(f);
};

/** Gemischte Zahlen: no crossing a Ganzes, or crossing one. */
function mixedTask(crossing: boolean): Form {
  return (rng, stufe, ab) => {
    const [d, e] = rng.pick(HAUPT_PAIRS.filter(([x, y]) => lcm(x, y) <= 12 || !crossing));
    const common = lcm(d, e);
    const options = range(1, d - 1).filter((x) => isLowest(x, d)).flatMap((n) => range(1, e - 1).filter((m) => isLowest(m, e)).map((m) => [n, m] as const));
    const minus = crossing || rng.chance(0.4);
    const usable = options.filter(([n, m]) => {
      const x = (n * common) / d;
      const y = (m * common) / e;
      if (x === y) return false;
      if (minus) return crossing ? x < y : x > y;
      return x + y < common;
    });
    const [n, m] = rng.pick(usable);
    const w1 = rng.int(crossing ? 2 : 1, 5);
    const w2 = rng.int(1, crossing ? w1 - 1 : minus ? w1 : 4);
    const a = fromMixed(w1, n, d);
    const b = fromMixed(w2, m, e);
    const result = minus ? differenceOf(a, b) : sumOf(a, b);
    const x = (n * common) / d;
    const y = (m * common) / e;
    const sign = minus ? MINUS : '+';
    const expression = `${frac(n, d, w1)} ${sign} ${frac(m, e, w2)} = ${BOX}`;
    const mixed = mixedOf(result);
    const wholePart = minus ? w1 - w2 : w1 + w2;
    const parts = minus ? Math.abs(x - y) : x + y;
    const low = lowest([parts, common]);
    const steps: Step[] = crossing
      ? [`Hauptnenner: ${common}`, `${frac(n, d, w1)} = ${frac(x, common, w1)} und ${frac(m, e, w2)} = ${frac(y, common, w2)}`, `${x} ist kleiner als ${y}: Nimm 1 Ganzes aus ${w1}.`, `${frac(x + common, common, w1 - 1)} ${MINUS} ${frac(y, common, w2)} = ${w1 - 1 - w2 > 0 ? frac(common + x - y, common, w1 - 1 - w2) : frac(common + x - y, common)}`, `Ergebnis: ${mixedText(result)}`]
      : [`Hauptnenner: ${common}`, `${frac(n, d)} = ${frac(x, common)} und ${frac(m, e)} = ${frac(y, common)}`, `Ganze: ${w1} ${sign} ${w2} = ${wholePart}`, `Brüche: ${frac(x, common)} ${sign} ${frac(y, common)} = ${frac(parts, common)}`, `Ergebnis: ${mixedText(result)}`];
    return build(SKILL, stufe, {
      key: `gemischt:${minus ? 'm' : 'p'}:${w1}-${n}/${d}:${w2}-${m}/${e}`,
      ab,
      prompt: 'Rechne aus. Kürze das Ergebnis.',
      expression,
      answer: mixedAnswerOf(result),
      hints: crossing ? ['Der zweite Bruch ist größer als der erste. Nimm 1 Ganzes dazu.', `Erweitere zuerst auf den Nenner ${common}.`] : ['Rechne die Ganzen und die Brüche getrennt.', `Erweitere die Brüche auf den Nenner ${common}.`],
      steps,
      bugs: valueBugs([
        { id: 'ganze-vergessen', match: { numerator: low[0], denominator: low[1] }, hint: 'Das ist nur der Bruch. Die Ganzen gehören auch dazu.' },
        crossing && w1 - w2 > 0 && { id: 'ein-ganzes-nicht-geborgt', match: { whole: w1 - w2, numerator: low[0], denominator: low[1] }, hint: 'Der zweite Bruch ist größer. Nimm 1 Ganzes aus der ersten Zahl.' },
        !crossing && !minus && { id: 'zaehler-nenner-addiert', match: { whole: wholePart, numerator: n + m, denominator: d + e }, hint: 'Die Stücke sind verschieden groß. Mach zuerst die Nenner gleich.' },
      ], { numerator: mixed.numerator, denominator: mixed.denominator, whole: mixed.whole }),
      praise: crossing ? 'Du hast 1 Ganzes in Teile umgerechnet.' : 'Du hast Ganze und Brüche getrennt gerechnet.',
      srText: speak(`Rechne aus. Kürze das Ergebnis. ${expression}`),
      kmk: KMK,
    });
  };
}

/** A story with gemischte Zahlen and units. */
const mixedStory: Form = (rng, stufe, ab) => {
  const [d, e] = rng.pick(HAUPT_PAIRS.filter(([x, y]) => lcm(x, y) <= 12));
  const common = lcm(d, e);
  const usable = range(1, d - 1).filter((x) => isLowest(x, d)).flatMap((n) => range(1, e - 1).filter((m) => isLowest(m, e)).map((m) => [n, m] as const)).filter(([n, m]) => (n * common) / d + (m * common) / e !== common);
  const [n, m] = rng.pick(usable);
  const w1 = rng.int(1, 3);
  const w2 = rng.int(1, 3);
  const a = fromMixed(w1, n, d);
  const b = fromMixed(w2, m, e);
  const result = sumOf(a, b);
  const name = pickPerson(rng).name;
  const context = `${name} wandert am Samstag ${frac(n, d, w1)} km. Am Sonntag wandert ${name} ${frac(m, e, w2)} km.`;
  const prompt = 'Wie viele Kilometer sind das zusammen?';
  const x = (n * common) / d;
  const y = (m * common) / e;
  const mixed = mixedOf(result);
  return build(SKILL, stufe, {
    key: `gemischt-text:${w1}-${n}/${d}:${w2}-${m}/${e}`,
    ab,
    context,
    prompt,
    answer: { ...mixedAnswerOf(result), unit: 'km' },
    hints: ['Rechne die Ganzen und die Brüche getrennt.', `Erweitere die Brüche auf den Nenner ${common}.`],
    steps: [`Ganze: ${w1} + ${w2} = ${w1 + w2}`, `Hauptnenner: ${common}`, `Brüche: ${frac(x, common)} + ${frac(y, common)} = ${frac(x + y, common)}`, `Ergebnis: ${mixedText(result)} km`],
    bugs: valueBugs([
      { id: 'ganze-vergessen', match: { numerator: lowest([x + y, common])[0], denominator: lowest([x + y, common])[1] }, hint: 'Das ist nur der Bruch. Die Ganzen gehören auch dazu.' },
      { id: 'zaehler-nenner-addiert', match: { whole: w1 + w2, numerator: n + m, denominator: d + e }, hint: 'Die Stücke sind verschieden groß. Mach zuerst die Nenner gleich.' },
    ], { numerator: mixed.numerator, denominator: mixed.denominator, ...(mixed.whole ? { whole: mixed.whole } : {}) }),
    praise: 'Du hast Ganze und Brüche getrennt gerechnet.',
    srText: speak(`${context} ${prompt}`),
    kmk: [...KMK, 'PK.modellieren'],
  });
};

/**
 * The forms of Stufe 3 for a plan that names gemischte Zahlen, per AB level. generate() serves them once GenContext holds the plan; their bugs ganze-vergessen and ein-ganzes-nicht-geborgt
 * then need a family again (families.ts, phrases.ts): 'die Ganzen beim Rechnen mitgenommen'.
 */
export const MIXED_WHERE_PLANNED = { 2: [mixedTask(false)], 3: [mixedTask(true), mixedStory] } as const;

export const plusMinusSkill: SkillDef = {
  ...SKILL,
  title: 'Brüche addieren und subtrahieren',
  description: 'Du rechnest plus und minus mit Brüchen.',
  stufen: {
    1: 'Gleichnamige Brüche, Nenner bis 12',
    2: 'Ein Nenner ist ein Vielfaches des anderen, bis 20',
    3: 'Hauptnenner bis 24, kein Nenner passt in den anderen',
  },
  kmk: KMK,
  keys: { mixed: true },
  generate: byStufeAndAb({
    1: { 1: [sameBelowOne], 2: [samePastOne, sameStory], 3: [sameMissing] },
    2: { 1: [unlike(multiplePairs(4, 12), 'vielfach', false, 'Du hast zuerst die Nenner gleich gemacht.')], 2: [unlike(multiplePairs(13, 20), 'vielfach-gross', true, 'Du hast zuerst die Nenner gleich gemacht.'), unlikeStory(multiplePairs(6, 20))], 3: [unlikeMissing(multiplePairs(4, 20)), unlikeRest(multiplePairs(6, 20))] },
    3: { 1: [unlike(HAUPT_SMALL, 'haupt', false, 'Du hast den Hauptnenner gefunden und erweitert.')], 2: [unlike(HAUPT_LARGE, 'haupt-gross', true, 'Du hast den Hauptnenner gefunden und erweitert.'), unlikeStory(HAUPT_PAIRS)], 3: [unlikeMissing(HAUPT_PAIRS), unlikeRest(HAUPT_PAIRS)] },
  }),
};
