/**
 * Brüche dividieren. An answer may stay an unechter Bruch or become a gemischte Zahl (keys.mixed), and it ends in lowest terms.
 * Stufe 1 (Bruch : natürliche Zahl, Nenner up to 10): AB I the Zähler divides, AB II it does not, AB III a story, or a missing Dividend.
 * Stufe 2 (Bruch : Bruch by the Kehrwert, Nenner up to 10): AB I nothing to shorten, AB II shorten across, AB III which calculation fits, or a missing Divisor.
 * Stufe 3 (Wie oft passt?; the result is larger than the Dividend, and takes the Kehrwert of Stufe 2 and more): AB I a Bruch into a Bruch below 1, with a whole result, AB II into an unechter
 * Bruch, or a story, or a Bruch with a Zähler into a whole number, AB III how many full portions, the Rest left over, or which Divisor gives the largest result.
 */
import { BOX, frac } from '../../core/format';
import type { Bug, ChoiceOption, FractionAnswer, SkillDef, Step } from '../../core/types';
import { build, fractionAnswer, makeChoice, numberBugs, pickPerson } from '../shared';
import { BAR_MAX_PARTS, barOf, barsOf, byStufeAndAb, compareFrac, fracOf, gcd, isLowest, lcm, lowest, mixedText, partsName, productOf, quotientOf, range, speak, valueBugs, type Form, type Frac } from './helpers';

const SKILL = { id: 'brueche.geteilt', topicId: 'brueche' } as const;
const KMK = ['ZO.bruch-malgeteilt'];

const answerOf = ([n, d]: Frac, rest: Partial<FractionAnswer> = {}): FractionAnswer => fractionAnswer(n, d, { allowMixed: true, ...rest });
const correctOf = ([n, d]: Frac) => ({ numerator: n, denominator: d });

const LOW: readonly Frac[] = range(2, 10).flatMap((d) => range(1, d - 1).filter((n) => isLowest(n, d)).map((n): Frac => [n, d]));
const ANY_BELOW_ONE: readonly Frac[] = range(2, 10).flatMap((d) => range(1, d - 1).map((n): Frac => [n, d]));

/** [n, d, k]: the Zähler n divides by k, and the result stays below 1. */
const DIVIDES = ANY_BELOW_ONE.flatMap(([n, d]) => range(2, 9).filter((k) => n % k === 0).map((k) => [n, d, k] as const));
/** [n, d, k]: it does not; the Nenner grows to at most 40. */
const NOT_DIVIDES = LOW.flatMap(([n, d]) => range(2, 5).filter((k) => n % k !== 0 && d * k <= 40).map((k) => [n, d, k] as const));

const naturalBugs = (n: number, d: number, k: number, result: Frac): Bug[] => valueBugs([
  d % k === 0 && { id: 'nenner-geteilt', match: { numerator: n, denominator: d / k }, hint: `So wird der Bruch größer. Beim Teilen durch ${k} wird der Bruch kleiner.` },
  { id: 'zaehler-mal', match: { numerator: n * k, denominator: d }, hint: `Das ist mal ${k}. Beim Teilen durch ${k} wird der Bruch kleiner.` },
  { id: 'kehrwert-zweite-zahl', match: { numerator: d, denominator: n * k }, hint: 'Du nimmst den Kehrwert der zweiten Zahl, nicht der ersten.' },
], correctOf(result));

/** The last step: the result, shortened if it needed that. */
const endStep = (raw: Frac, result: Frac, unit = '') => (raw[1] === result[1] ? `Ergebnis: ${mixedText(result)}${unit}` : `Gekürzt: ${fracOf(raw)} = ${mixedText(result)}${unit}`);

/** The Bruch, and under it what is left of it after : k. With too many parts only the Bruch. */
const dividedBar = (n: number, d: number, k: number) => {
  if (n % k === 0) return barOf([n, d], [n / k, d]);
  return d * k <= BAR_MAX_PARTS ? barOf([n, d], [n, d * k]) : barOf([n, d]);
};

/** Stufe 1, AB I. */
const zaehlerDivides: Form = (rng, stufe, ab) => {
  const [n, d, k] = rng.pick(DIVIDES);
  const result = lowest([n / k, d]);
  const expression = `${frac(n, d)} : ${k} = ${BOX}`;
  return build(SKILL, stufe, {
    key: `zaehler:${n}/${d}:${k}`,
    ab,
    prompt: 'Rechne aus. Kürze das Ergebnis.',
    expression,
    answer: answerOf(result),
    hints: [`Der Zähler ${n} lässt sich durch ${k} teilen.`, 'Der Nenner bleibt gleich.'],
    steps: [`Es sind ${n} ${partsName(d)}.`, { text: `${n} : ${k} = ${n / k}`, visual: dividedBar(n, d, k) }, endStep([n / k, d], result)],
    bugs: naturalBugs(n, d, k, result),
    praise: 'Du hast den Zähler geteilt und den Nenner behalten.',
    srText: speak(`Rechne aus. Kürze das Ergebnis. ${expression}`),
    kmk: KMK,
  });
};

/** Stufe 1, AB II. */
const nennerGrows: Form = (rng, stufe, ab) => {
  const [n, d, k] = rng.pick(NOT_DIVIDES);
  const result = lowest([n, d * k]);
  const expression = `${frac(n, d)} : ${k} = ${BOX}`;
  return build(SKILL, stufe, {
    key: `nenner:${n}/${d}:${k}`,
    ab,
    prompt: 'Rechne aus. Kürze das Ergebnis.',
    expression,
    answer: answerOf(result),
    hints: [`Der Zähler ${n} lässt sich nicht glatt durch ${k} teilen.`, `Teile jedes Stück in ${k} kleinere: Nimm den Nenner mal ${k}.`],
    steps: [{ text: `Jedes Stück teilst du in ${k} kleinere Stücke.`, visual: dividedBar(n, d, k) }, `Nenner: ${d} · ${k} = ${d * k}`, endStep([n, d * k], result)],
    bugs: naturalBugs(n, d, k, result),
    praise: 'Du hast den Nenner malgenommen.',
    srText: speak(`Rechne aus. Kürze das Ergebnis. ${expression}`),
    kmk: KMK,
  });
};

/** Stufe 1, AB III: a story. */
const naturalStory: Form = (rng, stufe, ab) => {
  const pool = [...DIVIDES, ...NOT_DIVIDES].filter(([, , k]) => k <= 6);
  const [n, d, k] = rng.pick(pool);
  const result = lowest([n, d * k]);
  const story = rng.pick([
    { unit: 'l', text: `Ein Krug enthält ${frac(n, d)} l Saft. ${pickPerson(rng).name} verteilt den Saft gleichmäßig auf ${k} Gläser.`, ask: 'Wie viele Liter sind in jedem Glas?' },
    { unit: 'kg', text: `Die Klasse 6c teilt ${frac(n, d)} kg Nüsse gerecht auf ${k} Gruppen auf.`, ask: 'Wie viele Kilogramm bekommt jede Gruppe?' },
    { unit: 'm', text: `${pickPerson(rng).name} schneidet ein Band von ${frac(n, d)} m in ${k} gleich lange Stücke.`, ask: 'Wie viele Meter ist jedes Stück lang?' },
  ] as const);
  return build(SKILL, stufe, {
    key: `text:${story.unit}:${n}/${d}:${k}`,
    ab,
    context: story.text,
    prompt: story.ask,
    answer: answerOf(result, { unit: story.unit }),
    hints: [`Du teilst durch ${k}. Die Menge wird kleiner.`, n % k === 0 ? `Teile den Zähler durch ${k}.` : `Nimm den Nenner mal ${k}.`],
    steps: [{ text: `${frac(n, d)} : ${k}`, visual: dividedBar(n, d, k) }, n % k === 0 ? `${n} : ${k} = ${n / k}` : `Nenner: ${d} · ${k} = ${d * k}`, endStep(n % k === 0 ? [n / k, d] : [n, d * k], result, ` ${story.unit}`)],
    bugs: naturalBugs(n, d, k, result),
    praise: 'Du hast die Menge richtig aufgeteilt.',
    srText: speak(`${story.text} ${story.ask}`),
    kmk: [...KMK, 'PK.modellieren'],
  });
};

/** Stufe 1, AB III: a missing Dividend. */
const naturalMissing: Form = (rng, stufe, ab) => {
  const [n, d, k] = rng.pick(LOW.filter(([, y]) => y >= 3).flatMap(([x, y]) => range(2, 6).filter((z) => (x * z) % y !== 0).map((z) => [x, y, z] as const)));
  const result = lowest([n * k, d]);
  const expression = `${BOX} : ${k} = ${frac(n, d)}`;
  return build(SKILL, stufe, {
    key: `luecke-zahl:${n}/${d}:${k}`,
    ab,
    prompt: 'Kürze das Ergebnis. Welcher Bruch fehlt?',
    expression,
    answer: answerOf(result),
    hints: ['Rechne rückwärts: Die Umkehrung von geteilt ist mal.', `Nimm ${frac(n, d)} mal ${k}.`],
    steps: [{ text: `Rechne rückwärts: ${frac(n, d)} · ${k}`, visual: barsOf([n * k, d]) ?? barOf([n, d]) }, `Zähler: ${n} · ${k} = ${n * k}`, endStep([n * k, d], result)],
    bugs: valueBugs([{ id: 'umkehrung-vergessen', match: { numerator: n, denominator: d * k }, hint: 'Rechne rückwärts: Die Umkehrung von geteilt ist mal.' }], correctOf(result)),
    praise: 'Du hast mit der Umkehraufgabe gerechnet.',
    srText: speak(`Welcher Bruch fehlt? ${expression}`),
    kmk: [...KMK, 'PK.problemloesen'],
  });
};

/** Pairs of different lowest fractions whose quotient is no whole number. */
const PAIRS: readonly (readonly [Frac, Frac])[] = LOW.flatMap((a) => LOW.filter((b) => compareFrac(a, b) !== 0 && quotientOf(a, b)[1] !== 1).map((b) => [a, b] as const));
/** Across, after the Kehrwert: a[0] with b[0], a[1] with b[1]. */
const shortenable = ([a, b]: readonly [Frac, Frac]) => gcd(a[0], b[0]) > 1 || gcd(a[1], b[1]) > 1;
const NOTHING_TO_SHORTEN = PAIRS.filter((p) => !shortenable(p));
const SHORTEN = PAIRS.filter(shortenable);

function quotientBugs(a: Frac, b: Frac, result: Frac): Bug[] {
  return valueBugs([
    { id: 'kehrwert-zweite-zahl', match: { numerator: a[1] * b[0], denominator: a[0] * b[1] }, hint: 'Du nimmst den Kehrwert der zweiten Zahl, nicht der ersten.' },
    { id: 'kein-kehrwert', match: correctOf(productOf(a, b)), hint: 'Nimm zuerst den Kehrwert des zweiten Bruchs.' },
    { id: 'kein-kehrwert', match: { numerator: a[0] * b[0], denominator: a[1] * b[1] }, hint: 'Nimm zuerst den Kehrwert des zweiten Bruchs.' },
    a[0] % b[0] === 0 && { id: 'nur-zaehler-geteilt', match: { numerator: a[0] / b[0], denominator: a[1] }, hint: 'Teile durch den ganzen Bruch: Nimm mal den Kehrwert.' },
  ], correctOf(result));
}

/** The steps: the Kehrwert, with the two Brüche side by side (Wie oft passt? F2), then the product. */
function quotientSteps(a: Frac, b: Frac, result: Frac): Step[] {
  const inverse: Frac = [b[1], b[0]];
  const raw: Frac = [a[0] * inverse[0], a[1] * inverse[1]];
  return [`Der Kehrwert von ${fracOf(b)} ist ${frac(inverse[0], inverse[1])}.`, { text: `${fracOf(a)} : ${fracOf(b)} = ${fracOf(a)} · ${frac(inverse[0], inverse[1])}`, visual: barOf(a, b) }, `Zähler: ${a[0]} · ${inverse[0]} = ${raw[0]}`, `Nenner: ${a[1]} · ${inverse[1]} = ${raw[1]}`, raw[1] === result[1] ? `Ergebnis: ${mixedText(result)}` : `Gekürzt: ${fracOf(raw)} = ${mixedText(result)}`];
}

/** Stufe 2, AB I and AB II. */
function byInverse(pool: readonly (readonly [Frac, Frac])[], key: string, shorten: boolean): Form {
  return (rng, stufe, ab) => {
    const [a, b] = rng.pick(pool);
    const result = quotientOf(a, b);
    const expression = `${fracOf(a)} : ${fracOf(b)} = ${BOX}`;
    return build(SKILL, stufe, {
      key: `${key}:${a.join('/')}:${b.join('/')}`,
      ab,
      prompt: 'Rechne aus. Kürze das Ergebnis.',
      expression,
      answer: answerOf(result),
      hints: shorten ? ['Nimm mal den Kehrwert des zweiten Bruchs.', 'Kürze vor dem Malnehmen, dann bleiben die Zahlen klein.'] : ['Bilde den Kehrwert des zweiten Bruchs.', 'Rechne dann mal: Zähler mal Zähler, Nenner mal Nenner.'],
      steps: quotientSteps(a, b, result),
      bugs: quotientBugs(a, b, result),
      praise: shorten ? 'Du hast mit dem Kehrwert gerechnet und gekürzt.' : 'Du hast mit dem Kehrwert der zweiten Zahl gerechnet.',
      srText: speak(`Rechne aus. Kürze das Ergebnis. ${expression}`),
      kmk: KMK,
    });
  };
}

/** Stufe 2, AB III: which calculation fits. */
const whichCalculation: Form = (rng, stufe, ab) => {
  const [a, b] = rng.pick(PAIRS.filter(([x, y]) => x[0] !== x[1] && y[0] > 1 && x[0] > 1));
  const expression = `${fracOf(a)} : ${fracOf(b)}`;
  const prompt = 'Welche Malaufgabe hat dasselbe Ergebnis?';
  const right = `${fracOf(a)} · ${frac(b[1], b[0])}`;
  const others: ChoiceOption[] = [
    { label: `${frac(a[1], a[0])} · ${fracOf(b)}`, whyWrong: 'Du nimmst den Kehrwert der zweiten Zahl, nicht der ersten.' },
    { label: `${fracOf(a)} · ${fracOf(b)}`, whyWrong: 'Für die Malaufgabe brauchst du den Kehrwert des zweiten Bruchs.' },
    { label: `${frac(a[1], a[0])} · ${frac(b[1], b[0])}`, whyWrong: 'Nur der zweite Bruch ändert sich. Der erste Bruch bleibt gleich.' },
  ];
  return build(SKILL, stufe, {
    key: `welche:${a.join('/')}:${b.join('/')}`,
    ab,
    prompt,
    expression,
    answer: makeChoice(rng, { label: right }, others),
    hints: ['Geteilt durch einen Bruch heißt: mal seinen Kehrwert.', 'Der erste Bruch bleibt unverändert.'],
    steps: [`Der Kehrwert von ${fracOf(b)} ist ${frac(b[1], b[0])}.`, `${expression} = ${right}`],
    praise: 'Du hast den Kehrwert beim richtigen Bruch gebildet.',
    srText: speak(`${prompt} ${expression}`),
    kmk: [...KMK, 'PK.argumentieren'],
  });
};

/** Stufe 2, AB III: a missing Divisor. */
const missingDivisor: Form = (rng, stufe, ab) => {
  const [a, b] = rng.pick(NOTHING_TO_SHORTEN);
  const raw: Frac = [a[0] * b[1], a[1] * b[0]];
  const expression = `${fracOf(a)} : ${BOX} = ${fracOf(raw)}`;
  return build(SKILL, stufe, {
    key: `luecke-bruch:${a.join('/')}:${b.join('/')}`,
    ab,
    prompt: 'Welcher Bruch fehlt?',
    expression,
    answer: answerOf(b),
    hints: ['Geteilt durch einen Bruch heißt: mal seinen Kehrwert.', `Rechne für den Zähler: ${a[0]} · ${BOX} = ${raw[0]}`],
    steps: [`Der Kehrwert ist ${frac(b[1], b[0])}, weil ${a[0]} · ${b[1]} = ${raw[0]} ist.`, `Auch der Nenner passt: ${a[1]} · ${b[0]} = ${raw[1]}.`, `Der fehlende Bruch ist ${fracOf(b)}.`],
    bugs: valueBugs([{ id: 'kehrwert-vergessen', match: { numerator: b[1], denominator: b[0] }, hint: 'Das ist der Kehrwert. Gesucht ist der Bruch selbst.' }], correctOf(b)),
    praise: 'Du hast vom Kehrwert auf den Bruch geschlossen.',
    srText: speak(`Welcher Bruch fehlt? ${expression}`),
    kmk: [...KMK, 'PK.problemloesen'],
  });
};

const properUpTo = (maxD: number): readonly Frac[] => range(2, maxD).flatMap((d) => range(1, d - 1).filter((n) => isLowest(n, d)).map((n): Frac => [n, d]));
const IMPROPER: readonly Frac[] = range(2, 12).flatMap((d) => range(d + 1, 4 * d).filter((n) => isLowest(n, d)).map((n): Frac => [n, d]));

/** [a, b]: b fits into a a whole number of times, at least twice. The Nenner differ, or the Zähler would do; the Zähler differ, or the Nenner would do. */
const fitsWhole = (dividends: readonly Frac[], divisors: readonly Frac[]) => dividends.flatMap((a) => divisors
  .filter((b) => a[1] !== b[1] && a[0] !== b[0] && (a[0] * b[1]) % (a[1] * b[0]) === 0 && a[0] * b[1] >= 2 * a[1] * b[0])
  .map((b) => [a, b] as const));

/** Divisors up to Nenner 20: up to 12 only 9 tasks are left for AB I. Two Stammbrüche would only ask for the Nenner. */
const FITS_PROPER = fitsWhole(properUpTo(12), properUpTo(20)).filter(([a, b]) => a[0] > 1 || b[0] > 1);
const FITS_IMPROPER = fitsWhole(IMPROPER, properUpTo(20).filter(([n]) => n > 1));

/** The Kehrwert as a child writes it: of a Stammbruch a whole number. */
const inverseOf = (b: Frac): string => (b[0] === 1 ? String(b[1]) : frac(b[1], b[0]));

function fitsBugs(a: Frac, b: Frac, value: number): Bug[] {
  return numberBugs([
    (a[0] * b[0]) % (a[1] * b[1]) === 0 && { id: 'teilen-macht-kleiner', match: (a[0] * b[0]) / (a[1] * b[1]), hint: `Das ist die Malaufgabe. Wie oft passt ${fracOf(b)} in ${fracOf(a)}?` },
    a[0] % b[0] === 0 && { id: 'nur-durch-zaehler', match: a[0] / b[0], hint: 'Das sind nur die Zähler. Die Nenner sind verschieden.' },
    { id: 'nur-ein-ganzes', match: b[1], hint: `So oft passt ${frac(1, b[1])} in 1 Ganzes. Hier ist es ${fracOf(a)}.` },
  ], value);
}

/** The slow route of F2: both Brüche in parts of one size, so the Stücke can be counted. With too many parts or Streifen only the Stück. */
function fitsPicture(a: Frac, b: Frac): Step {
  const D = lcm(a[1], b[1]);
  const [x, y] = [(a[0] * D) / a[1], (b[0] * D) / b[1]];
  const bars = D <= BAR_MAX_PARTS ? barsOf([x, D]) : null;
  if (!bars) return { text: `Ein Stück ist ${fracOf(b)}.`, visual: barOf(b) };
  return {
    text: `In gleich großen Teilen: ${fracOf(a)} sind ${x} Teile, ein Stück ${y === 1 ? 'ist 1 Teil' : `sind ${y} Teile`}.`,
    visual: x <= D ? barOf([x, D], [y, D]) : bars,
  };
}

/** The steps down to a whole number. */
function fitsSteps(a: Frac, b: Frac): Step[] {
  const [x, y] = [a[0] * b[1], a[1] * b[0]];
  return [fitsPicture(a, b), `Der Kehrwert von ${fracOf(b)} ist ${inverseOf(b)}.`, `${fracOf(a)} : ${fracOf(b)} = ${fracOf(a)} · ${inverseOf(b)}`, `Zähler: ${a[0]} · ${b[1]} = ${x}. Nenner: ${a[1]} · ${b[0]} = ${y}.`, `${x} : ${y} = ${x / y}`];
}

/** Stufe 3, AB I (a Bruch below 1 as the Dividend) and AB II (an unechter Bruch): the result is a whole number, so 'Wie oft' has its meaning. */
function fitsFractions(pool: readonly (readonly [Frac, Frac])[], key: string): Form {
  return (rng, stufe, ab) => {
    const [a, b] = rng.pick(pool);
    const value = (a[0] * b[1]) / (a[1] * b[0]);
    const prompt = `Wie oft passt ${fracOf(b)} in ${fracOf(a)}?`;
    return build(SKILL, stufe, {
      key: `${key}:${a.join('/')}:${b.join('/')}`,
      ab,
      prompt,
      answer: { kind: 'number', value, unit: 'mal', label: 'Wie oft' },
      hints: [`Das ist die Rechnung ${fracOf(a)} : ${fracOf(b)}.`, 'Nimm mal den Kehrwert des zweiten Bruchs. Teile dann durch den Nenner.'],
      steps: fitsSteps(a, b),
      bugs: fitsBugs(a, b, value),
      praise: 'Du hast die Frage als Geteilt-Aufgabe gelesen.',
      srText: speak(prompt),
      kmk: KMK,
    });
  };
}

/** [b, w]: a Bruch with a Zähler and a whole number from 12 that both its parts divide, so the child who multiplies by mistake lands on a whole number too. */
const FITS_NUMBER = LOW.filter(([n]) => n >= 2).flatMap((b) => range(1, 8).map((t) => t * b[0] * b[1]).filter((w) => w >= 12 && w <= 60).map((w) => [b, w] as const));

/** Stufe 3, AB II: a Bruch with a Zähler into a whole number: 'teilen macht kleiner' meets a result larger than the Dividend. */
const fitsNumber: Form = (rng, stufe, ab) => {
  const [b, w] = rng.pick(FITS_NUMBER);
  const value = (w * b[1]) / b[0];
  const prompt = `Wie oft passt ${fracOf(b)} in ${w}?`;
  return build(SKILL, stufe, {
    key: `passt-zahl:${b.join('/')}:${w}`,
    ab,
    prompt,
    answer: { kind: 'number', value, unit: 'mal', label: 'Wie oft' },
    hints: [`Das ist die Rechnung ${w} : ${fracOf(b)}.`, `Nimm ${w} mal den Kehrwert.`],
    steps: [{ text: `Ein Stück ist ${fracOf(b)}.`, visual: barOf(b) }, `${w} : ${fracOf(b)} = ${w} · ${inverseOf(b)}`, `${w} : ${b[0]} = ${w / b[0]}`, `${w / b[0]} · ${b[1]} = ${value}`],
    bugs: numberBugs([
      { id: 'teilen-macht-kleiner', match: (w * b[0]) / b[1], hint: `Wie oft passt ${fracOf(b)} in ${w}? Zähl die ${partsName(b[1])} in ${w} Ganzen.` },
      { id: 'nur-durch-zaehler', match: w / b[0], hint: `Das ist erst ${w} : ${b[0]}. Nimm das Ergebnis noch mal ${b[1]}.` },
      { id: 'nur-durch-nenner', match: w * b[1], hint: `So oft passt ${frac(1, b[1])}. Das Stück ist aber ${b[0]}-mal so groß.` },
    ], value),
    praise: 'Du hast mit dem Kehrwert gerechnet.',
    srText: speak(prompt),
    kmk: KMK,
  });
};

const PORTIONS = [
  { key: 'saft', unit: 'Gläser', text: (name: string, x: string, y: string) => `${name} hat ${x} l Saft. Jedes Glas fasst ${y} l.`, all: (name: string) => `Wie viele Gläser kann ${name} füllen?`, full: (name: string) => `Wie viele Gläser kann ${name} ganz füllen?`, roundedUp: 'Das letzte Glas ist nicht ganz voll. Zähle nur die vollen Gläser.', rest: (q: number) => `Es reicht für ${q} volle Gläser.` },
  { key: 'seil', unit: 'Stücke', text: (name: string, x: string, y: string) => `${name} hat ${x} m Seil. Jedes Stück soll ${y} m lang sein.`, all: () => 'Wie viele Stücke entstehen?', full: () => 'Wie viele ganze Stücke entstehen?', roundedUp: 'Das letzte Stück ist zu kurz. Zähle nur die ganzen Stücke.', rest: (q: number) => `Es reicht für ${q} ganze Stücke.` },
] as const;

/** Stufe 3, AB II: a story of pouring into portions, the amount an unechter Bruch. */
const fitsStory: Form = (rng, stufe, ab) => {
  const [a, b] = rng.pick(FITS_IMPROPER.filter(([x, y]) => x[1] <= 8 && y[1] <= 10));
  const value = (a[0] * b[1]) / (a[1] * b[0]);
  const name = pickPerson(rng).name;
  const story = rng.pick(PORTIONS);
  const context = story.text(name, fracOf(a), fracOf(b));
  const prompt = story.all(name);
  return build(SKILL, stufe, {
    key: `passt-text:${story.key}:${a.join('/')}:${b.join('/')}`,
    ab,
    context,
    prompt,
    answer: { kind: 'number', value, unit: story.unit },
    hints: [`Die Frage heißt: Wie oft passt ${fracOf(b)} in ${fracOf(a)}?`, `Rechne ${fracOf(a)} : ${fracOf(b)}.`],
    steps: fitsSteps(a, b),
    bugs: fitsBugs(a, b, value),
    praise: 'Du hast im Text die Frage nach dem Passen erkannt.',
    srText: speak(`${context} ${prompt}`),
    kmk: [...KMK, 'PK.modellieren'],
  });
};

/** [a, b]: b does not fit a whole number of times, and at least twice: the Rest stays over. As above, the Zähler differ. */
const FULL_PORTIONS = IMPROPER.filter(([, d]) => d <= 8).flatMap((a) => ([[2, 3], [3, 4], [2, 5], [3, 5], [3, 8], [5, 8]] as const)
  .filter((b) => a[1] !== b[1] && a[0] !== b[0] && (a[0] * b[1]) % (a[1] * b[0]) !== 0 && a[0] * b[1] >= 2 * a[1] * b[0])
  .map((b): readonly [Frac, Frac] => [a, b]));

/** Stufe 3, AB III: how many full portions; the result is no whole number, and the Rest does not count. */
const fullPortions: Form = (rng, stufe, ab) => {
  const [a, b] = rng.pick(FULL_PORTIONS);
  const [x, y] = [a[0] * b[1], a[1] * b[0]];
  const value = Math.floor(x / y);
  const name = pickPerson(rng).name;
  const story = rng.pick(PORTIONS);
  const context = story.text(name, fracOf(a), fracOf(b));
  const prompt = story.full(name);
  return build(SKILL, stufe, {
    key: `passt-rest:${story.key}:${a.join('/')}:${b.join('/')}`,
    ab,
    context,
    prompt,
    answer: { kind: 'number', value, unit: story.unit },
    hints: [`Rechne ${fracOf(a)} : ${fracOf(b)}.`, 'Das Ergebnis ist keine ganze Zahl. Was passiert mit dem Rest?'],
    steps: [fitsPicture(a, b), `${fracOf(a)} : ${fracOf(b)} = ${fracOf(a)} · ${inverseOf(b)}`, `Zähler: ${a[0]} · ${b[1]} = ${x}. Nenner: ${a[1]} · ${b[0]} = ${y}.`, `${x} : ${y} = ${value} Rest ${x % y}`, story.rest(value)],
    bugs: numberBugs([
      { id: 'aufgerundet', match: value + 1, hint: story.roundedUp },
      { id: 'nur-ein-ganzes', match: b[1], hint: `So oft passt ${frac(1, b[1])} in 1 Ganzes. Hier ist es ${fracOf(a)}.` },
    ], value),
    praise: 'Du hast den Rest richtig gedeutet.',
    srText: speak(`${context} ${prompt}`),
    kmk: [...KMK, 'PK.modellieren', 'PK.problemloesen'],
  });
};

/** Stufe 3, AB III: which Divisor gives the largest result; the answer depends on the fractions, and they have to be compared. */
const largestResult: Form = (rng, stufe, ab) => {
  const a = rng.pick(LOW.filter(([, d]) => d <= 8));
  const divisors = rng.sample(LOW.filter((f) => f[1] >= 3 && f[1] <= 8 && compareFrac(f, a) !== 0), 3);
  const smallest = [...divisors].sort(compareFrac)[0];
  const label = (b: Frac) => `${fracOf(a)} : ${fracOf(b)}`;
  const prompt = 'Bei welcher Aufgabe ist das Ergebnis am größten?';
  const others: ChoiceOption[] = divisors.filter((b) => b !== smallest).map((b) => ({ label: label(b), whyWrong: `Es gibt einen kleineren zweiten Bruch als ${fracOf(b)}.` }));
  return build(SKILL, stufe, {
    key: `groesstes:${a.join('/')}:${divisors.map((b) => b.join('/')).sort().join()}`,
    ab,
    prompt,
    answer: makeChoice(rng, { label: label(smallest) }, others),
    hints: ['Der erste Bruch ist überall gleich. Vergleiche die zweiten Brüche.', 'Je kleiner das Stück, desto öfter passt es.'],
    steps: [`Der erste Bruch ist überall ${fracOf(a)}.`, { text: `Der kleinste zweite Bruch ist ${fracOf(smallest)}.`, visual: barOf(smallest) }, 'Das kleinste Stück passt am häufigsten.', `Am größten ist ${label(smallest)}.`],
    praise: 'Du hast erkannt: Ein kleineres Stück passt öfter.',
    srText: speak(`${prompt} ${divisors.map(label).join(', ')}.`),
    kmk: [...KMK, 'PK.argumentieren'],
  });
};

export const geteiltSkill: SkillDef = {
  ...SKILL,
  title: 'Brüche dividieren',
  description: 'Du teilst Brüche und überlegst, wie oft etwas passt.',
  stufen: {
    1: 'Bruch geteilt durch natürliche Zahl, Nenner bis 10',
    2: 'Bruch geteilt durch Bruch mit dem Kehrwert',
    3: 'Wie oft passt es? Das Ergebnis ist größer',
  },
  kmk: KMK,
  keys: { mixed: true },
  generate: byStufeAndAb({
    1: { 1: [zaehlerDivides], 2: [nennerGrows], 3: [naturalStory, naturalMissing] },
    2: { 1: [byInverse(NOTHING_TO_SHORTEN, 'kehrwert', false)], 2: [byInverse(SHORTEN, 'kehrwert-kuerzen', true)], 3: [whichCalculation, missingDivisor] },
    3: { 1: [fitsFractions(FITS_PROPER, 'passt')], 2: [fitsFractions(FITS_IMPROPER, 'passt-unecht'), fitsStory, fitsNumber], 3: [fullPortions, largestResult] },
  }),
};
