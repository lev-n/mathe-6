/**
 * Bruch, Dezimalzahl, Prozent (docs/research.md §6).
 * Stufe 1: {frac:1/2}, {frac:1/4}, {frac:3/4}, {frac:1/10}, {frac:1/5}. Stufe 2: Fünftel, Zwanzigstel, 0,35 and 35 %. Stufe 3: mixed forms in order, Achtel such as 12,5 %.
 * Every share is held as its percent number: its fraction and decimal number follow from it, so the three forms cannot drift apart.
 */
import { fmt, fmtPercent as pct, frac } from '../../core/format';
import type { Ab, Bug, ChoiceOption, MultiField, OrderAnswer, Rng, SkillDef, Visual } from '../../core/types';
import { fractionAnswer, fractionBugs, makeChoice, multiBugs, type MaybeBug } from '../shared';
import { drawUntil, fitBugs, fromForms, gcd, num, r3, type Form, type Task } from './helpers';

const KMK = ['ZO.darstellung-wechseln', 'ZO.prozent', 'PK.darstellen'];

/** The share in lowest terms: 37.5 → 3/8. */
export function fractionOf(p: number): { n: number; d: number } {
  const g = gcd(p * 10, 1000);
  return { n: (p * 10) / g, d: 1000 / g };
}

/** The decimal number of a percent number: 37.5 → 0.375. */
export const decimalOf = (p: number): number => r3(p / 100);

const fracText = (p: number): string => {
  const { n, d } = fractionOf(p);
  return frac(n, d);
};

/** The first hint of a fraction: Hundertstel where the Nenner goes into 100, otherwise the division (Achtel). */
function expandHint(p: number): string {
  const { n, d } = fractionOf(p);
  return Number.isInteger(100 / d) ? 'Erweitere den Bruch auf Hundertstel. Dann siehst du die Prozent.' : `Der Bruchstrich heißt geteilt. Rechne ${n} : ${d}, dann mal 100.`;
}

/** 1/4 read as 14 %, 3/5 as 35 %. */
function digitBug(p: number): MaybeBug {
  const { n, d } = fractionOf(p);
  return { id: 'bruch-prozent-ziffern', match: Number(`${n}${d}`), hint: expandHint(p) };
}

function unitShareBug(p: number): MaybeBug {
  const { n, d } = fractionOf(p);
  return n > 1 && { id: 'nur-ein-teil', match: r3(100 / d), hint: 'Das gilt für ein Stück. Es sind aber mehrere Stücke.' };
}

/** A share as a percent number from a fraction. */
function fractionToPercentBugs(p: number): Bug[] {
  return fitBugs([digitBug(p), unitShareBug(p)], p, 1);
}

/** A share as a decimal number from a fraction: 1/4 as 1,4. */
function fractionToDecimalBugs(p: number): Bug[] {
  const { n, d } = fractionOf(p);
  return fitBugs([
    { id: 'bruch-komma-ziffern', match: Number(`${n}.${d}`), hint: `Der Bruchstrich heißt geteilt: Rechne ${n} : ${d}.` },
    { id: 'komma-verschoben', match: r3(p / 10), hint: 'Hundertstel stehen zwei Stellen nach dem Komma.' },
  ], decimalOf(p), 3);
}

function percentToDecimalBugs(p: number): Bug[] {
  return fitBugs([
    { id: 'komma-verschoben', match: r3(p / 10), hint: 'Prozent heißt Hundertstel. Teile durch 100, nicht durch 10.' },
    { id: 'komma-verschoben', match: p, hint: 'Prozent heißt Hundertstel. Teile also durch 100.' },
  ], decimalOf(p), 3);
}

function decimalToPercentBugs(p: number): Bug[] {
  return fitBugs([
    { id: 'komma-verschoben', match: decimalOf(p), hint: 'Prozent heißt Hundertstel. Wie viele Hundertstel sind das?' },
    { id: 'komma-verschoben', match: r3(p / 10), hint: 'Verschiebe das Komma um zwei Stellen, nicht um eine.' },
    { id: 'komma-verschoben', match: p * 10, hint: 'Verschiebe das Komma um zwei Stellen, nicht um drei.' },
  ], p, 1);
}

function percentToFractionBugs(p: number) {
  const { n, d } = fractionOf(p);
  const digits = [...String(p)];
  const bugs: MaybeBug[] = [
    digits.length === 2 && digits[1] !== '0' && { id: 'bruch-prozent-ziffern', match: { numerator: Number(digits[0]), denominator: Number(digits[1]) }, hint: 'Prozent heißt von 100. Schreibe die Prozent über die 100.' },
    Number.isInteger(p) && p !== 10 && { id: 'kehrwert-prozent', match: { numerator: 1, denominator: p }, hint: 'Prozent heißt von 100. Schreibe die Prozent über die 100.' },
  ];
  return fractionBugs(bugs, { numerator: n, denominator: d });
}

const fractionBar = (p: number): Visual => {
  const { n, d } = fractionOf(p);
  return { type: 'fractionModel', form: 'bar', parts: d, filled: n };
};

/** The share over a bar of ten parts. Never the parts of the fraction: their count and the marked ones would be the answer, with no Kürzen left. So a share of Zehnteln has no bar. */
const percentStripe = (p: number): { visual?: Visual } =>
  fractionOf(p).d === 10 ? {} : { visual: { type: 'percentBar', total: 10, percent: p, ticks: 10, labels: 'percent' } };

function expandSteps(p: number): string[] {
  const { n, d } = fractionOf(p);
  const f = 100 / d;
  return Number.isInteger(f)
    ? [`Erweitere mit ${f}: ${n} · ${f} = ${n * f}, ${d} · ${f} = 100`, `${frac(n * f, 100)} sind ${pct(p)}.`]
    : [`Rechne ${n} : ${d} = ${fmt(decimalOf(p))}`, `${fmt(decimalOf(p))} sind ${pct(p)}.`];
}

// ─── Task forms over a pool of percent numbers ────────────────────────────────

const fractionToPercent = (pool: readonly number[]): Form => (rng) => {
  const p = rng.pick(pool);
  return {
    key: `f-p:${p}`,
    prompt: `Wie viel Prozent sind ${fracText(p)}?`,
    visual: fractionBar(p),
    answer: num(p, '%', 1),
    hints: [expandHint(p), 'Prozent heißt: so viele Hundertstel.'],
    steps: expandSteps(p),
    bugs: fractionToPercentBugs(p),
    praise: 'Du hast den Bruch auf Hundertstel gebracht.',
  };
};

const fractionToDecimal = (pool: readonly number[]): Form => (rng) => {
  const p = rng.pick(pool);
  const { n, d } = fractionOf(p);
  return {
    key: `f-d:${p}`,
    prompt: `Schreibe ${fracText(p)} als Dezimalzahl.`,
    visual: fractionBar(p),
    answer: num(decimalOf(p), undefined, 3),
    hints: ['Der Bruchstrich heißt geteilt.', 'Oder erweitere auf Zehntel, Hundertstel oder Tausendstel.'],
    steps: [`${frac(n, d)} heißt ${n} : ${d}.`, `${n} : ${d} = ${fmt(decimalOf(p))}`],
    bugs: fractionToDecimalBugs(p),
    praise: 'Du hast den Bruchstrich als geteilt gelesen.',
  };
};

const percentToDecimal = (pool: readonly number[]): Form => (rng) => {
  const p = rng.pick(pool);
  return {
    key: `p-d:${p}`,
    prompt: `Schreibe ${pct(p)} als Dezimalzahl.`,
    answer: num(decimalOf(p), undefined, 3),
    hints: ['Prozent heißt Hundertstel.', 'Teile die Prozentzahl durch 100.'],
    steps: [`${pct(p)} heißt ${fmt(p)} von 100.`, `${fmt(p)} : 100 = ${fmt(decimalOf(p))}`],
    bugs: percentToDecimalBugs(p),
    praise: 'Du hast die Prozentzahl durch 100 geteilt.',
  };
};

const decimalToPercent = (pool: readonly number[]): Form => (rng) => {
  const p = rng.pick(pool);
  return {
    key: `d-p:${p}`,
    prompt: `Wie viel Prozent sind ${fmt(decimalOf(p))}?`,
    answer: num(p, '%', 1),
    hints: ['Prozent heißt Hundertstel.', 'Rechne die Dezimalzahl mal 100.'],
    steps: [`${fmt(decimalOf(p))} · 100 = ${fmt(p)}`, `${fmt(decimalOf(p))} sind ${pct(p)}.`],
    bugs: decimalToPercentBugs(p),
    praise: 'Du hast die Hundertstel als Prozent gelesen.',
  };
};

const percentToFraction = (pool: readonly number[]): Form => (rng) => {
  const p = rng.pick(pool);
  const { n, d } = fractionOf(p);
  const g = Number.isInteger(p) ? gcd(p, 100) : 0;
  return {
    key: `p-f:${p}`,
    prompt: `Schreibe ${pct(p)} als vollständig gekürzten Bruch.`,
    ...percentStripe(p),
    answer: fractionAnswer(n, d),
    hints: Number.isInteger(p) ? ['Schreibe die Prozent als Bruch mit dem Nenner 100.', 'Kürze dann, so weit es geht.'] : ['Schreibe die Prozent als Bruch mit dem Nenner 100.', 'Erweitere mit 2, dann ist das Komma weg. Kürze danach.'],
    steps: Number.isInteger(p)
      ? [`${pct(p)} sind ${frac(p, 100)}.`, `Kürze mit ${g}: ${p} : ${g} = ${n}, 100 : ${g} = ${d}`, `Das ist ${frac(n, d)}.`]
      : [`Erweitere mit 2: ${pct(p)} sind ${frac(p * 2, 200)}.`, `Kürze mit ${gcd(p * 2, 200)}: ${p * 2} : ${gcd(p * 2, 200)} = ${n}, 200 : ${gcd(p * 2, 200)} = ${d}`, `Das ist ${frac(n, d)}.`],
    bugs: percentToFractionBugs(p),
    praise: 'Du hast den Bruch vollständig gekürzt.',
  };
};

const decimalToFraction = (pool: readonly number[]): Form => (rng) => {
  const p = rng.pick(pool);
  const { n, d } = fractionOf(p);
  const g = gcd(p, 100);
  return {
    key: `d-f:${p}`,
    prompt: `Schreibe ${fmt(decimalOf(p))} als vollständig gekürzten Bruch.`,
    answer: fractionAnswer(n, d),
    hints: ['Lies die Dezimalzahl als Hundertstel.', 'Kürze dann, so weit es geht.'],
    steps: [`${fmt(decimalOf(p))} sind ${frac(p, 100)}.`, `Kürze mit ${g}: ${p} : ${g} = ${n}, 100 : ${g} = ${d}`, `Das ist ${frac(n, d)}.`],
    bugs: percentToFractionBugs(p),
    praise: 'Du hast die Dezimalzahl als Hundertstel gelesen und gekürzt.',
  };
};

const bothForms = (pool: readonly number[]): Form => (rng) => {
  const p = rng.pick(pool);
  const { n, d } = fractionOf(p);
  const fields: MultiField[] = [
    { id: 'dezimal', before: 'Dezimalzahl:', value: decimalOf(p), decimals: 3 },
    { id: 'prozent', before: 'Prozent:', after: '%', value: p, decimals: 1 },
  ];
  return {
    key: `f-beide:${p}`,
    prompt: `Schreibe ${fracText(p)} als Dezimalzahl und in Prozent.`,
    visual: fractionBar(p),
    answer: { kind: 'multi', fields },
    hints: [expandHint(p), 'Hundertstel kannst du als Dezimalzahl und als Prozent lesen.'],
    steps: [`Dezimalzahl: ${n} : ${d} = ${fmt(decimalOf(p))}`, `Prozent: ${fmt(decimalOf(p))} · 100 = ${fmt(p)}`, `${frac(n, d)} = ${fmt(decimalOf(p))} = ${pct(p)}`],
    bugs: multiBugs([
      { id: 'bruch-prozent-ziffern', match: { prozent: Number(`${n}${d}`) }, hint: expandHint(p) },
      { id: 'bruch-komma-ziffern', match: { dezimal: Number(`${n}.${d}`) }, hint: `Der Bruchstrich heißt geteilt: Rechne ${n} : ${d}.` },
    ], fields),
    praise: 'Du hast denselben Anteil in zwei Formen geschrieben.',
  };
};

const REST_STORIES = [
  ['des Schulhofs', 'ist Wiese', 'Der Rest ist Pflaster', 'Wie viel Prozent des Schulhofs sind Pflaster?'],
  ['der Klasse', 'kommt mit dem Bus', 'Der Rest kommt zu Fuß', 'Wie viel Prozent der Klasse kommen zu Fuß?'],
  ['der Beete', 'sind schon bepflanzt', 'Der Rest ist noch frei', 'Wie viel Prozent der Beete sind noch frei?'],
] as const;

const restStory = (pool: readonly number[]): Form => (rng) => {
  const p = rng.pick(pool);
  const [whole, part, rest, ask] = rng.pick(REST_STORIES);
  const left = 100 - p;
  return {
    key: `rest:${whole}:${p}`,
    context: `${fracText(p)} ${whole} ${part}. ${rest}.`,
    prompt: ask,
    answer: num(left, '%', 1),
    hints: ['Das Ganze sind 100 %.', 'Schreibe den Bruch zuerst in Prozent.'],
    steps: [`${fracText(p)} sind ${pct(p)}.`, `100 − ${fmt(p)} = ${fmt(left)}`, `Es sind ${pct(left)}.`],
    bugs: fitBugs([
      { id: 'teil-statt-rest', match: p, hint: 'Das ist der Teil aus dem Bruch. Gefragt ist der Rest.' },
      { id: 'bruch-prozent-ziffern', match: 100 - Number(`${fractionOf(p).n}${fractionOf(p).d}`), hint: expandHint(p) },
    ], left, 1),
    praise: 'Du hast den Bruch in Prozent umgerechnet und abgezogen.',
  };
};

/** Three equal forms and a fourth built from the digits of the fraction. */
const oddOneOut = (pool: readonly number[]): Form => (rng) => {
  const p = rng.pick(pool);
  const { n, d } = fractionOf(p);
  const digits = Number(`${n}${d}`);
  const wrong = digits <= 100 ? digits : n;
  const f = rng.pick([2, 3, 5].filter((x) => d * x <= 100));
  const equal: ChoiceOption[] = [
    { label: pct(p), whyWrong: `${pct(p)} sind ${fmt(p)} Hundertstel. Das passt zum Bruch.` },
    { label: fmt(decimalOf(p)), whyWrong: `${fmt(decimalOf(p))} sind ${fmt(p)} Hundertstel. Das passt zum Bruch.` },
    { label: frac(n * f, d * f), whyWrong: `Kürze den Bruch mit ${f}. Dann siehst du den Bruch der Aufgabe.` },
  ];
  return {
    key: `odd:${p}:${f}`,
    prompt: `Drei Angaben sind gleich groß wie ${frac(n, d)}. Welche Angabe passt nicht?`,
    answer: makeChoice(rng, { label: pct(wrong) }, equal),
    hints: [expandHint(p), 'Schreibe jede Angabe als Hundertstel.'],
    steps: [`${frac(n, d)} sind ${pct(p)}.`, `Auch ${fmt(decimalOf(p))} und ${frac(n * f, d * f)} sind ${pct(p)}.`, `${pct(wrong)} passt nicht.`],
    praise: 'Du hast jede Angabe als Hundertstel geprüft.',
  };
};

const compareForms = (pool: readonly number[]): Form => (rng) => {
  const a = rng.pick(pool);
  const b = rng.chance(0.25) ? a : drawUntil(() => rng.pick(pool), (x) => x !== a);
  const left = rng.pick([fmt(decimalOf(a)), fracText(a)]);
  const right = b === a ? pct(a) : rng.pick([pct(b), fracText(b)].filter((t) => t !== left));
  const sign = a < b ? '<' : a > b ? '>' : '=';
  const why = 'Schreibe beide Zahlen in Prozent. Vergleiche dann.';
  const inPercent = (label: string, x: number) => (label === pct(x) ? [] : [`${label} sind ${pct(x)}.`]);
  return {
    key: `vgl:${left}:${right}`,
    prompt: 'Welches Zeichen gehört in die Lücke?',
    expression: `${left} □ ${right}`,
    answer: makeChoice(rng, { label: sign }, ['<', '>', '='].filter((s) => s !== sign).map((label) => ({ label, whyWrong: why })), { layout: 'symbols', order: ['<', '>', '='] }),
    hints: [why, 'Prozent heißt Hundertstel.'],
    steps: [...inPercent(left, a), ...inPercent(right, b), `${left} ${sign} ${right}`],
    praise: 'Du hast beide Zahlen in dieselbe Form gebracht.',
  };
};

// ─── Stufe 3: ordnen und Achtel ───────────────────────────────────────────────

const EIGHTHS = [12.5, 37.5, 62.5, 87.5];

type ShareForm = 'p' | 'd' | 'f';

/** Mixed forms in order. The bug takes the digits of a percent number for its value: 8 % then stands above 0,7. */
function orderForms(rng: Rng, shares: number[], formOf?: (p: number) => ShareForm): Pick<Task, 'answer' | 'bugs' | 'steps'> & { key: string } {
  const drawn = rng.shuffle(shares);
  // never already in the target order, as in orderAnswer (src/topics/shared.ts)
  const shown = drawn.every((p, i) => i === 0 || drawn[i - 1] <= p) ? [...drawn.slice(1), drawn[0]] : drawn;
  const items = shown.map((p) => {
    const form = formOf ? formOf(p) : rng.pick(['p', 'd', 'f'] as const);
    return { p, form, label: form === 'p' ? pct(p) : form === 'd' ? fmt(decimalOf(p)) : fracText(p) };
  });
  const byValue = (values: number[]) => values.map((_, i) => i).sort((i, j) => values[i] - values[j]);
  const correct = byValue(items.map((x) => x.p));
  const raw = byValue(items.map((x) => (x.form === 'p' ? x.p : x.p / 100)));
  const answer: OrderAnswer = { kind: 'order', items: items.map((x) => x.label), correct, direction: 'aufsteigend' };
  const bugs: Bug[] = raw.join() === correct.join() ? [] : [{ id: 'formen-nicht-umgewandelt', match: raw, hint: 'Schreibe zuerst alle Zahlen in Prozent. Vergleiche dann.' }];
  return {
    key: items.map((x) => `${x.form}${x.p}`).join('-'),
    answer,
    bugs,
    steps: [`In Prozent: ${items.map((x) => pct(x.p)).join(', ')}`, `Geordnet: ${correct.map((i) => items[i].label).join(', ')}`],
  };
}

const orderTask = (draw: (rng: Rng) => number[], formOf?: (p: number) => ShareForm): Form => (rng) => {
  const { key, ...rest } = orderForms(rng, draw(rng), formOf);
  return {
    key: `ordnen:${key}`,
    prompt: 'Ordne die Zahlen. Beginne mit der kleinsten Zahl.',
    ...rest,
    hints: ['Schreibe zuerst alle Zahlen in Prozent.', 'Prozent heißt Hundertstel. Vergleiche dann die Prozentzahlen.'],
    praise: 'Du hast alle Zahlen in dieselbe Form gebracht.',
  };
};

/** The trap of the hardest order: 8 % looks larger than 0,7. */
const trapForm = (p: number): ShareForm => (p < 10 ? 'p' : Number.isInteger(p) ? 'd' : 'f');

const ROUND = [10, 20, 25, 30, 40, 50, 60, 70, 75, 80, 90];

/** Two shares with an Achtel in the middle (Stufe 3). */
const MIDDLES = [[0, 25], [25, 50], [50, 75], [75, 100], [10, 15], [5, 20], [30, 45], [35, 40], [60, 65], [55, 70], [85, 90], [80, 95]] as const;

/** A share in a mixed form: a fraction, a decimal number or a percent number. */
const anyForm = (rng: Rng, x: number): string => (x === 0 ? '0' : x === 100 ? '1' : rng.pick([fracText(x), fmt(decimalOf(x)), pct(x)]));

const middle: Form = (rng) => {
  const [a, b] = rng.pick(MIDDLES);
  const p = (a + b) / 2;
  const [low, high] = [anyForm(rng, a), anyForm(rng, b)];
  return {
    key: `mitte:${low}:${high}`,
    prompt: `Schreibe die Zahl genau in der Mitte zwischen ${low} und ${high} in Prozent.`,
    answer: num(p, '%', 1),
    hints: ['Schreibe beide Zahlen zuerst in Prozent.', 'Halbiere den Abstand. Zähle das zur kleineren Zahl dazu.'],
    steps: [`In Prozent: ${pct(a)} und ${pct(b)}`, `Abstand: ${b} − ${a} = ${b - a}`, `Mitte: ${a} + ${fmt((b - a) / 2)} = ${fmt(p)}`, `Die Mitte ist ${pct(p)}.`],
    bugs: fitBugs([
      { id: 'mitte-gerundet', match: Math.round(p), hint: 'Rechne genau. Die Mitte hat eine Stelle nach dem Komma.' },
      { id: 'abstand-statt-mitte', match: (b - a) / 2, hint: 'Das ist der halbe Abstand. Zähle die kleinere Zahl dazu.' },
    ], p, 1),
    praise: 'Du hast beide Zahlen in Prozent verglichen.',
  };
};

const kugeln: Form = (rng) => {
  const eighth = rng.pick([12.5, 37.5, 62.5]);
  const other = drawUntil(() => rng.pick([5, 10, 20, 25]), (x) => eighth + x < 100);
  const left = 100 - eighth - other;
  const [noun, gen] = rng.pick([['Kiste', 'Kugeln'], ['Tüte', 'Murmeln']] as const);
  return {
    key: `kugeln:${noun}:${eighth}:${other}`,
    context: `In einer ${noun} sind ${fracText(eighth)} der ${gen} rot und ${pct(other)} blau.`,
    prompt: `Wie viel Prozent der ${gen} haben eine andere Farbe?`,
    answer: num(left, '%', 1),
    hints: ['Schreibe den Bruch zuerst in Prozent.', 'Alle zusammen sind 100 %.'],
    steps: [`${fracText(eighth)} sind ${pct(eighth)}.`, `Rot und blau: ${fmt(eighth)} + ${other} = ${fmt(eighth + other)}`, `Rest: 100 − ${fmt(eighth + other)} = ${fmt(left)}`, `Es sind ${pct(left)}.`],
    bugs: fitBugs([
      { id: 'teil-statt-rest', match: eighth + other, hint: 'Das sind rot und blau zusammen. Gefragt ist der Rest.' },
      { id: 'bruch-prozent-ziffern', match: 100 - Number(`${fractionOf(eighth).n}${fractionOf(eighth).d}`) - other, hint: expandHint(eighth) },
    ], left, 1),
    praise: 'Du hast den Bruch umgerechnet und den Rest bestimmt.',
  };
};

// ─── Pools ───────────────────────────────────────────────────────────────────

/** {frac:1/2}, {frac:1/4}, {frac:3/4}, {frac:1/10}, {frac:1/5}. */
const S1 = [50, 25, 75, 10, 20];
/** Fünftel and Zwanzigstel in lowest terms. */
const S2_FRACTIONS = [40, 60, 80, 5, 15, 35, 45, 55, 65, 85, 95];
/** 0,35 and 35 %: two places, and the traps 0,07 and 0,4. */
const S2_HUNDREDTHS = [11, 13, 18, 23, 27, 35, 38, 42, 46, 54, 62, 68, 73, 89, 94];
const S2_TRAPS = [3, 4, 6, 7, 8, 9, 30, 40, 60, 70];

const FORMS: Record<1 | 2 | 3, Record<Ab, Form[]>> = {
  1: {
    1: [fractionToPercent(S1), percentToDecimal(S1), fractionToDecimal(S1), decimalToPercent(S1)],
    2: [percentToFraction(S1), decimalToFraction(S1), bothForms(S1)],
    3: [restStory(S1), oddOneOut(S1), compareForms(S1)],
  },
  2: {
    1: [fractionToPercent(S2_FRACTIONS), percentToDecimal(S2_HUNDREDTHS), decimalToPercent(S2_HUNDREDTHS)],
    2: [percentToFraction(S2_FRACTIONS), bothForms(S2_FRACTIONS), decimalToPercent(S2_TRAPS), percentToDecimal(S2_TRAPS)],
    3: [restStory(S2_FRACTIONS), oddOneOut(S2_FRACTIONS), compareForms(S2_FRACTIONS), decimalToFraction(S2_FRACTIONS)],
  },
  3: {
    1: [fractionToPercent(EIGHTHS), fractionToDecimal(EIGHTHS), orderTask((rng) => rng.sample(ROUND, 4))],
    2: [percentToFraction(EIGHTHS), bothForms(EIGHTHS), orderTask((rng) => [rng.pick(EIGHTHS), ...rng.sample(ROUND, 3)])],
    3: [middle, kugeln, orderTask((rng) => [...rng.sample([3, 4, 6, 7, 8], 2), rng.pick(EIGHTHS), rng.pick([30, 40, 60, 70])], trapForm)],
  },
};

export const umwandelnSkill: SkillDef = {
  id: 'prozent.umwandeln',
  topicId: 'prozent',
  title: 'Bruch, Dezimalzahl, Prozent',
  description: 'Du wechselst zwischen Bruch, Dezimalzahl und Prozent.',
  stufen: {
    1: 'Halbe, Viertel, Zehntel und Fünftel in allen drei Formen',
    2: 'Fünftel, Zwanzigstel und Hundertstel wie 0,35 und 35 %',
    3: 'Gemischte Formen ordnen, Achtel wie 12,5 %',
  },
  keys: { comma: true },
  kmk: KMK,
  generate: fromForms('prozent.umwandeln', KMK, FORMS),
};
