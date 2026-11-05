/**
 * Brüche multiplizieren. An answer may stay an unechter Bruch or become a gemischte Zahl (keys.mixed), and it ends in lowest terms.
 * Stufe 1 (Bruch · natürliche Zahl, Nenner up to 10): AB I a small factor, AB II a larger factor in either order, or a whole result, AB III a story, or a missing factor.
 * Stufe 2 (Bruch · Bruch, Nenner up to 10; vorher kürzen): AB I nothing to shorten, AB II shorten across, AB III shorten twice across, or a missing fraction.
 * Stufe 3 (Anteil vom Anteil, story; result smaller than the factors): AB I a story with one Stammbruch, AB II a story with two Zähler, AB III a share of the rest, or which factor gives the smallest product.
 */
import { BOX, frac } from '../../core/format';
import type { Bug, Cell, ChoiceOption, FractionAnswer, SkillDef, Step, VisualOf } from '../../core/types';
import { build, fractionAnswer, makeChoice, numberBugs, pickPerson } from '../shared';
import { BAR_MAX_PARTS, barOf, barsOf, byStufeAndAb, compareFrac, differenceOf, fracOf, gcd, isLowest, lcm, lowest, mixedText, productOf, range, speak, sumOf, valueBugs, type Form, type Frac } from './helpers';

const SKILL = { id: 'brueche.mal', topicId: 'brueche' } as const;
const KMK = ['ZO.bruch-malgeteilt'];

const answerOf = ([n, d]: Frac, rest: Partial<FractionAnswer> = {}): FractionAnswer => fractionAnswer(n, d, { allowMixed: true, ...rest });
const correctOf = ([n, d]: Frac) => ({ numerator: n, denominator: d });

const LOW: readonly Frac[] = range(2, 10).flatMap((d) => range(1, d - 1).filter((n) => isLowest(n, d)).map((n): Frac => [n, d]));

/** [n, d, k]: the product is no whole number. */
const naturalTasks = (minK: number, maxK: number) => LOW.flatMap(([n, d]) => range(minK, maxK).filter((k) => (n * k) % d !== 0).map((k) => [n, d, k] as const));

const naturalBugs = (n: number, d: number, k: number, result: Frac): Bug[] => valueBugs([
  { id: 'nenner-auch-mal', match: { numerator: n * k, denominator: d * k }, hint: `Das ist Erweitern: Der Wert bleibt gleich. Nimm nur den Zähler mal ${k}.` },
  { id: 'nur-nenner-mal', match: { numerator: n, denominator: d * k }, hint: `Nimm den Zähler mal ${k}. Der Nenner bleibt gleich.` },
  { id: 'addiert', match: { numerator: n + k, denominator: d }, hint: `Es sind ${k} gleiche Brüche. Rechne mal, nicht plus.` },
], correctOf(result));

/** All k copies, or one if they take too many Streifen. */
const naturalBar = (n: number, d: number, k: number) => barsOf([n * k, d]) ?? barOf([n, d]);

const naturalSteps = (n: number, d: number, k: number, result: Frac): Step[] => {
  const raw = n * k;
  const shortened = raw !== result[0];
  return [{ text: `${k} · ${frac(n, d)} heißt: ${k}-mal ${frac(n, d)}.`, visual: naturalBar(n, d, k) }, `Zähler: ${n} · ${k} = ${raw}. Der Nenner bleibt ${d}.`, shortened ? `Gekürzt: ${frac(raw, d)} = ${fracOf(result)}` : `Ergebnis: ${mixedText(result)}`];
};

/** Stufe 1, AB I (a small factor) and AB II (a larger factor, in either order). */
function natural(minK: number, maxK: number, swap: boolean): Form {
  const tasks = naturalTasks(minK, maxK);
  return (rng, stufe, ab) => {
    const [n, d, k] = rng.pick(tasks);
    const result = lowest([n * k, d]);
    const front = swap && rng.chance(0.5);
    const expression = front ? `${k} · ${frac(n, d)} = ${BOX}` : `${frac(n, d)} · ${k} = ${BOX}`;
    return build(SKILL, stufe, {
      key: `zahl:${front ? 'v' : 'h'}:${n}/${d}:${k}`,
      ab,
      prompt: 'Rechne aus. Kürze das Ergebnis.',
      expression,
      answer: answerOf(result),
      hints: [`Nimm nur den Zähler mal ${k}.`, 'Der Nenner bleibt gleich. Kürze zum Schluss.'],
      steps: naturalSteps(n, d, k, result),
      bugs: naturalBugs(n, d, k, result),
      praise: 'Du hast nur den Zähler malgenommen.',
      srText: speak(`Rechne aus. Kürze das Ergebnis. ${expression}`),
      kmk: KMK,
    });
  };
}

/** Stufe 1, AB II: the Nenner goes into the factor, so the product is a whole number. */
const wholeResult: Form = (rng, stufe, ab) => {
  const [n, d] = rng.pick(LOW.filter(([, y]) => y <= 8));
  const k = d * rng.int(2, 6);
  const value = (n * k) / d;
  const expression = `${frac(n, d)} · ${k} = ${BOX}`;
  return build(SKILL, stufe, {
    key: `ganz:${n}/${d}:${k}`,
    ab,
    prompt: 'Rechne aus. Das Ergebnis ist eine ganze Zahl.',
    expression,
    answer: { kind: 'number', value },
    hints: [`Teile ${k} zuerst durch den Nenner ${d}.`, `Nimm das Ergebnis dann mal ${n}.`],
    steps: [{ text: `${frac(n, d)} heißt: ${n} von ${d} Teilen.`, visual: barOf([n, d]) }, `${k} : ${d} = ${k / d}`, `${k / d} · ${n} = ${value}`],
    bugs: numberBugs([
      { id: 'nur-zaehler-mal', match: n * k, hint: `Teile noch durch den Nenner ${d}.` },
      { id: 'nur-durch-nenner', match: k / d, hint: `Das ist erst ${frac(1, d)}. Nimm noch mal ${n}.` },
    ], value),
    praise: 'Du hast zuerst durch den Nenner geteilt.',
    srText: speak(`Rechne aus. Das Ergebnis ist eine ganze Zahl. ${expression}`),
    kmk: KMK,
  });
};

const PORTION_STORIES = [
  { unit: 'l', text: (name: string, f: string, k: number) => `${name} braucht ${f} l Wasser für 1 Portion Saft. ${name} macht ${k} Portionen.`, ask: (name: string) => `Wie viele Liter Wasser braucht ${name}?` },
  { unit: 'kg', text: (name: string, f: string, k: number) => `${name} braucht ${f} kg Mehl für 1 Kuchen. ${name} backt ${k} Kuchen.`, ask: (name: string) => `Wie viele Kilogramm Mehl braucht ${name}?` },
  { unit: 'km', text: (name: string, f: string, k: number) => `Der Schulweg von ${name} ist ${f} km lang. ${name} geht diesen Weg ${k}-mal.`, ask: () => 'Wie viele Kilometer sind das?' },
] as const;

/** Stufe 1, AB III. */
const naturalStory: Form = (rng, stufe, ab) => {
  const [n, d, k] = rng.pick(naturalTasks(2, 9));
  const result = lowest([n * k, d]);
  // 'einen halben Kilometer' is a form the voice does not have (core spokenWords), so 1/2 stays with the Liter and the Kilogramm.
  const story = rng.pick(PORTION_STORIES.filter((s) => s.unit !== 'km' || d !== 2));
  const name = pickPerson(rng).name;
  const context = story.text(name, frac(n, d), k);
  const prompt = story.ask(name);
  return build(SKILL, stufe, {
    key: `text:${story.unit}:${n}/${d}:${k}`,
    ab,
    context,
    prompt,
    answer: answerOf(result, { unit: story.unit }),
    hints: [`Das sind ${k} gleiche Mengen. Rechne mal.`, `Nimm den Zähler mal ${k}. Der Nenner bleibt gleich.`],
    steps: naturalSteps(n, d, k, result),
    bugs: naturalBugs(n, d, k, result),
    praise: 'Du hast aus dem Text die Malaufgabe gemacht.',
    srText: speak(`${context} ${prompt}`),
    kmk: [...KMK, 'PK.modellieren'],
  });
};

/** Stufe 1, AB III: a missing factor. */
const naturalMissing: Form = (rng, stufe, ab) => {
  const [n, d, k] = rng.pick(naturalTasks(2, 9).filter(([x]) => x > 1));
  const raw = n * k;
  const expression = `${frac(n, d)} · ${BOX} = ${frac(raw, d)}`;
  return build(SKILL, stufe, {
    key: `luecke-zahl:${n}/${d}:${k}`,
    ab,
    prompt: 'Welche Zahl fehlt?',
    expression,
    answer: { kind: 'number', value: k, label: 'Fehlender Faktor' },
    hints: ['Der Nenner bleibt gleich. Schau auf die Zähler.', `Rechne: ${n} · ${BOX} = ${raw}`],
    steps: [`Der Nenner bleibt ${d}.`, { text: `Zähler: ${n} · ${k} = ${raw}`, visual: naturalBar(n, d, k) }, `Die fehlende Zahl ist ${k}.`],
    bugs: numberBugs([{ id: 'unterschied-statt-faktor', match: raw - n, hint: 'Hier steht mal. Der Unterschied der Zähler hilft nicht.' }], k),
    praise: 'Du hast den fehlenden Faktor am Zähler gefunden.',
    srText: speak(`Welche Zahl fehlt? ${expression}`),
    kmk: [...KMK, 'PK.problemloesen'],
  });
};

/** Pairs of lowest fractions with Nenner up to 10. */
const PAIRS: readonly (readonly [Frac, Frac])[] = LOW.flatMap((a) => LOW.filter((b) => a !== b).map((b) => [a, b] as const));
/** Across: the numbers that can be shortened before multiplying. */
const across = ([a, b]: readonly [Frac, Frac]) => [gcd(a[0], b[1]), gcd(b[0], a[1])];

const NOTHING_TO_SHORTEN = PAIRS.filter((p) => across(p).every((g) => g === 1) && p[0][0] * p[1][0] > 1);
const ONE_ACROSS = PAIRS.filter((p) => across(p).filter((g) => g > 1).length === 1);
const TWO_ACROSS = PAIRS.filter((p) => across(p).every((g) => g > 1));

function productBugs(a: Frac, b: Frac, result: Frac): Bug[] {
  const common = lcm(a[1], b[1]);
  return valueBugs([
    { id: 'nenner-bleibt', match: { numerator: a[0] * b[0], denominator: a[1] === b[1] ? a[1] : Math.max(a[1], b[1]) }, hint: 'Beim Malnehmen gilt: Zähler mal Zähler, Nenner mal Nenner.' },
    a[1] !== b[1] && { id: 'hauptnenner-mal', match: { numerator: ((a[0] * common) / a[1]) * ((b[0] * common) / b[1]), denominator: common }, hint: 'Für Malaufgaben brauchst du keine gleichen Nenner.' },
    { id: 'addiert', match: { numerator: a[0] + b[0], denominator: a[1] + b[1] }, hint: 'Hier steht mal: Zähler mal Zähler, Nenner mal Nenner.' },
    { id: 'kreuz-gerechnet', match: { numerator: a[0] * b[1], denominator: a[1] * b[0] }, hint: 'Das ist die Rechnung fürs Teilen. Der zweite Bruch bleibt hier gleich.' },
  ], correctOf(result));
}

/** The product as a length: under the Streifen of the first Bruch the same Streifen in the parts of the product. With too many parts only the first Bruch. */
const productBar = (a: Frac, b: Frac): Step => (a[1] * b[1] <= BAR_MAX_PARTS
  ? { text: `Oben ist ${fracOf(a)} gefärbt. Unten sind ${fracOf(b)} davon gefärbt.`, visual: barOf(a, [a[0] * b[0], a[1] * b[1]]) }
  : { text: `Der Streifen zeigt ${fracOf(a)}. Davon nimmst du ${fracOf(b)}.`, visual: barOf(a) });

/** The steps: shorten across if it goes, then multiply. */
function productSteps(a: Frac, b: Frac, result: Frac): Step[] {
  const [g1, g2] = across([a, b]);
  const x: Frac = [a[0] / g1, a[1] / g2];
  const y: Frac = [b[0] / g2, b[1] / g1];
  return [
    productBar(a, b),
    ...(g1 > 1 ? [`Kürze ${a[0]} und ${b[1]} mit ${g1}.`] : []),
    ...(g2 > 1 ? [`Kürze ${b[0]} und ${a[1]} mit ${g2}.`] : []),
    `Zähler: ${x[0]} · ${y[0]} = ${x[0] * y[0]}. Nenner: ${x[1]} · ${y[1]} = ${x[1] * y[1]}.`,
    `Ergebnis: ${mixedText(result)}`,
  ];
}

/** Stufe 2: Bruch · Bruch. */
function fractionProduct(pool: readonly (readonly [Frac, Frac])[], shorten: boolean, praise: string): Form {
  return (rng, stufe, ab) => {
    const [a, b] = rng.pick(pool);
    const result = productOf(a, b);
    const expression = `${fracOf(a)} · ${fracOf(b)} = ${BOX}`;
    return build(SKILL, stufe, {
      key: `bruch:${a.join('/')}:${b.join('/')}`,
      ab,
      prompt: 'Rechne aus. Kürze das Ergebnis.',
      expression,
      answer: answerOf(result),
      hints: shorten ? ['Kürze vor dem Malnehmen: Suche Zähler und Nenner mit gemeinsamem Teiler.', 'Nimm dann Zähler mal Zähler und Nenner mal Nenner.'] : ['Nimm Zähler mal Zähler.', 'Nimm Nenner mal Nenner.'],
      steps: productSteps(a, b, result),
      bugs: productBugs(a, b, result),
      praise,
      srText: speak(`Rechne aus. Kürze das Ergebnis. ${expression}`),
      kmk: KMK,
    });
  };
}

/** Stufe 2, AB III: a missing fraction, whose parts divide the result. */
const fractionMissing: Form = (rng, stufe, ab) => {
  const [a, b] = rng.pick(NOTHING_TO_SHORTEN);
  const raw: Frac = [a[0] * b[0], a[1] * b[1]];
  const expression = `${fracOf(a)} · ${BOX} = ${fracOf(raw)}`;
  return build(SKILL, stufe, {
    key: `luecke-bruch:${a.join('/')}:${b.join('/')}`,
    ab,
    prompt: 'Welcher Bruch fehlt?',
    expression,
    answer: answerOf(b),
    hints: [`Rechne für den Zähler: ${a[0]} · ${BOX} = ${raw[0]}`, `Rechne für den Nenner: ${a[1]} · ${BOX} = ${raw[1]}`],
    steps: [`Zähler: ${a[0]} · ${b[0]} = ${raw[0]}`, `Nenner: ${a[1]} · ${b[1]} = ${raw[1]}`, `Der fehlende Bruch ist ${fracOf(b)}.`, productBar(a, b)],
    bugs: valueBugs([
      { id: 'unterschied-statt-faktor', match: { numerator: raw[0] - a[0], denominator: raw[1] - a[1] }, hint: 'Hier steht mal. Der Unterschied der Zahlen hilft nicht.' },
      { id: 'kreuz-gerechnet', match: { numerator: b[1], denominator: b[0] }, hint: 'Zähler gehört zu Zähler und Nenner zu Nenner.' },
    ], correctOf(b)),
    praise: 'Du hast Zähler und Nenner getrennt ergänzt.',
    srText: speak(`Welcher Bruch fehlt? ${expression}`),
    kmk: [...KMK, 'PK.problemloesen'],
  });
};

/** A share of a share: the first share of a Ganzes, then a share of that. */
const PART_STORIES = [
  { text: (name: string, a: Frac, b: Frac) => `${name} hat ${fracOf(a)} von einer Pizza. ${name} isst ${fracOf(b)} davon.`, ask: 'Welcher Anteil der ganzen Pizza ist das?' },
  { text: (_name: string, a: Frac, b: Frac) => `Im Schulgarten ${a[0] === 1 ? 'ist' : 'sind'} ${fracOf(a)} der Fläche Beet. Auf ${fracOf(b)} der Beete wachsen Tomaten.`, ask: 'Welcher Anteil des Schulgartens ist das?' },
  { text: (_name: string, a: Frac, b: Frac) => `${fracOf(a)} der Klasse 6b ${a[0] === 1 ? 'fährt' : 'fahren'} mit dem Fahrrad zur Schule. ${fracOf(b)} davon ${b[0] === 1 ? 'trägt' : 'tragen'} einen Helm.`, ask: 'Welcher Anteil der Klasse ist das?' },
  { text: (name: string, a: Frac, b: Frac) => `${name} übt ${fracOf(a)} von einer Stunde Musik. Davon singt ${name} ${fracOf(b)} der Zeit.`, ask: 'Welcher Anteil der Stunde ist das?' },
] as const;

/** The area of a product: a rows of the first Bruch cross b columns of the second, so the shaded part is a block. A grid, because a rect fractionModel picks its own rows and fills in reading order. */
const areaModel = (a: Frac, b: Frac): VisualOf<'grid'> => ({ type: 'grid', width: b[1], height: a[1], cells: range(0, a[0] - 1).flatMap((y) => range(0, b[0] - 1).map((x): Cell => [x, y])) });

function storyBugs(a: Frac, b: Frac, result: Frac): Bug[] {
  const sum = sumOf(a, b);
  return valueBugs([
    { id: 'anteile-addiert', match: correctOf(sum), hint: 'Du nimmst einen Teil vom Teil. Das Ergebnis ist kleiner als beide Anteile.' },
    { id: 'addiert', match: { numerator: a[0] + b[0], denominator: a[1] + b[1] }, hint: 'Ein Anteil vom Anteil heißt: mal rechnen.' },
    { id: 'nenner-bleibt', match: { numerator: a[0] * b[0], denominator: Math.max(a[1], b[1]) }, hint: 'Beim Malnehmen gilt: Zähler mal Zähler, Nenner mal Nenner.' },
  ], correctOf(result));
}

/** Stufe 3, AB I (exactly one share a Stammbruch: two would leave only the Nenner to multiply, the case Stufe 2 excludes) and AB II (both with a Zähler). */
function shareOfShare(stammbruch: boolean): Form {
  const firsts = LOW.filter(([, d]) => d <= 6);
  const seconds = LOW.filter(([, d]) => d <= 8);
  const pairs = firsts.flatMap((a) => seconds.filter((b) => (stammbruch ? (a[0] === 1) !== (b[0] === 1) : a[0] >= 2 && b[0] >= 2)).map((b) => [a, b] as const));
  return (rng, stufe, ab) => {
    const [a, b] = rng.pick(pairs);
    const result = productOf(a, b);
    const story = rng.pick(PART_STORIES);
    const context = story.text(pickPerson(rng).name, a, b);
    return build(SKILL, stufe, {
      key: `anteil:${PART_STORIES.indexOf(story)}:${a.join('/')}:${b.join('/')}`,
      ab,
      context,
      prompt: story.ask,
      answer: answerOf(result),
      hints: ['Nimm zuerst den ersten Anteil. Vom ersten Anteil nimmst du dann den zweiten.', 'Welche Rechnung passt? Das Ergebnis ist kleiner als beide Anteile.'],
      steps: [{ text: `${fracOf(b)} von ${fracOf(a)}: ${fracOf(a)} · ${fracOf(b)}`, visual: barOf(a) }, ...(a[1] * b[1] <= 24 ? [{ text: `Das Rechteck hat ${a[1]} · ${b[1]} = ${a[1] * b[1]} Teile, ${a[0]} · ${b[0]} = ${a[0] * b[0]} sind gefärbt.`, visual: areaModel(a, b) }] : []), `Ergebnis: ${fracOf(result)}`],
      bugs: storyBugs(a, b, result),
      praise: 'Du hast den Anteil vom Anteil malgerechnet.',
      srText: speak(`${context} ${story.ask}`),
      kmk: [...KMK, 'PK.modellieren'],
    });
  };
}

/** Stufe 3, AB III: first a share, then a share of the rest. */
const shareOfRest: Form = (rng, stufe, ab) => {
  const a = rng.pick(LOW.filter(([, d]) => d >= 3 && d <= 6));
  const b = rng.pick(LOW.filter(([, d]) => d >= 2 && d <= 6));
  const rest: Frac = lowest([a[1] - a[0], a[1]]);
  const taken = productOf(rest, b);
  const left = productOf(rest, [b[1] - b[0], b[1]]);
  const name = pickPerson(rng).name;
  const context = `${name} liest am Montag ${fracOf(a)} von einem Buch. Am Dienstag liest ${name} ${fracOf(b)} vom Rest.`;
  const prompt = 'Welcher Anteil des Buches bleibt noch übrig?';
  return build(SKILL, stufe, {
    key: `vom-rest:${a.join('/')}:${b.join('/')}`,
    ab,
    context,
    prompt,
    answer: answerOf(left),
    hints: ['Welcher Anteil des Buches bleibt nach dem Montag?', 'Welcher Anteil von diesem Rest bleibt nach dem Dienstag?'],
    steps: [{ text: `Nach Montag ${rest[0] === 1 ? 'bleibt' : 'bleiben'} ${fracOf(rest)} des Buches.`, visual: barOf(rest) }, `Vom Rest ${b[1] - b[0] === 1 ? 'bleibt' : 'bleiben'} ${frac(b[1] - b[0], b[1])}.`, `${fracOf(rest)} · ${frac(b[1] - b[0], b[1])} = ${fracOf(left)}`],
    bugs: valueBugs([
      { id: 'dienstag-statt-rest', match: correctOf(taken), hint: 'Das ist der Anteil vom Dienstag. Gefragt ist der Rest danach.' },
      compareFrac(sumOf(a, b), [1, 1]) < 0 && { id: 'vom-ganzen-gerechnet', match: correctOf(differenceOf([1, 1], sumOf(a, b))), hint: 'Der zweite Bruch bezieht sich auf den Rest, nicht auf das ganze Buch.' },
    ], correctOf(left)),
    praise: 'Du hast den Rest Schritt für Schritt bestimmt.',
    srText: speak(`${context} ${prompt}`),
    kmk: [...KMK, 'PK.problemloesen'],
  });
};

/** Stufe 3, AB III: which second factor gives the smallest product; the answer depends on the fractions, and they have to be compared. */
const smallestProduct: Form = (rng, stufe, ab) => {
  const a = rng.pick(LOW.filter(([n, d]) => n > 1 && d <= 8));
  const factors = rng.sample(LOW.filter((f) => f[1] >= 3 && f[1] <= 8 && compareFrac(f, a) !== 0), 3);
  const smallest = [...factors].sort(compareFrac)[0];
  const label = (b: Frac) => `${fracOf(a)} · ${fracOf(b)}`;
  const prompt = 'Bei welcher Aufgabe ist das Ergebnis am kleinsten?';
  const others: ChoiceOption[] = factors.filter((b) => b !== smallest).map((b) => ({ label: label(b), whyWrong: `Es gibt einen kleineren zweiten Bruch als ${fracOf(b)}.` }));
  return build(SKILL, stufe, {
    key: `kleinstes:${a.join('/')}:${factors.map((b) => b.join('/')).sort().join()}`,
    ab,
    prompt,
    answer: makeChoice(rng, { label: label(smallest) }, others),
    hints: ['Der erste Bruch ist überall gleich. Vergleiche die zweiten Brüche.', 'Du nimmst einen Teil von diesem Bruch. Ein kleinerer Teil gibt weniger.'],
    steps: [`Der erste Bruch ist überall ${fracOf(a)}.`, { text: `Der kleinste zweite Bruch ist ${fracOf(smallest)}.`, visual: barOf(smallest) }, `${label(smallest)} = ${fracOf(productOf(a, smallest))}`, 'Das Produkt ist kleiner als beide Brüche.'],
    praise: 'Du hast das Ergebnis vor dem Rechnen abgeschätzt.',
    srText: speak(`${prompt} ${factors.map(label).join(', ')}.`),
    kmk: [...KMK, 'PK.argumentieren'],
  });
};

export const malSkill: SkillDef = {
  ...SKILL,
  title: 'Brüche multiplizieren',
  description: 'Du nimmst Brüche mal und rechnest Anteile von Anteilen.',
  stufen: {
    1: 'Bruch mal natürliche Zahl, Nenner bis 10',
    2: 'Bruch mal Bruch, Nenner bis 10; vorher kürzen',
    3: 'Anteil vom Anteil; das Ergebnis ist kleiner',
  },
  kmk: KMK,
  keys: { mixed: true },
  generate: byStufeAndAb({
    1: { 1: [natural(2, 4, false)], 2: [natural(5, 9, true), wholeResult], 3: [naturalStory, naturalMissing] },
    2: { 1: [fractionProduct(NOTHING_TO_SHORTEN, false, 'Du hast Zähler mal Zähler und Nenner mal Nenner gerechnet.')], 2: [fractionProduct(ONE_ACROSS, true, 'Du hast vor dem Malnehmen gekürzt.')], 3: [fractionProduct(TWO_ACROSS, true, 'Du hast vor dem Malnehmen zweimal gekürzt.'), fractionMissing] },
    3: { 1: [shareOfShare(true)], 2: [shareOfShare(false)], 3: [shareOfRest, smallestProduct] },
  }),
};
