/**
 * Dreisatz (docs/research.md §6).
 * Stufe 1: whole results, 3 Hefte 6 €, 5 Hefte? Stufe 2: a decimal unit price, the three-column table. Stufe 3: decide first whether the Dreisatz fits, a two-step story.
 */
import { MINUS } from '../../core/format';
import type { Ab, Rng, SkillDef, Visual } from '../../core/types';
import { multiBugs, pickPerson } from '../shared';
import { amount, drawUntil, fitBugs, fromForms, placesOf, quantity, r3, type Form, type Task } from './helpers';

const KMK = ['SF.dreisatz', 'PK.modellieren'];

/** Bug values a child would type have at most two places (fitBugs). */
const DECIMALS = 2;

/** Two sizes that grow in the same ratio. */
interface Pair {
  id: string;
  sg: string;
  pl: string;
  unit: string;
  /** The given sentence and the question for m. */
  given: (n: number, value: string) => string;
  ask: (m: number) => string;
  /** The first step, as a hint. */
  first: string;
  /** Whole values for one, at Stufe 1. */
  per: readonly [min: number, max: number, step: number];
  /** What the harder numbers of Stufe 1 add to a value for one: a price stays what the thing costs. */
  bump: number;
  /** The most of it a story can have: nobody cycles 15 hours in a row. */
  most: number;
  /** A price for one with Cent, at Stufe 2 and 3. */
  cents: readonly [min: number, max: number];
}

const price = (id: string, sg: string, pl: string, per: readonly [number, number], cents: readonly [number, number]): Pair => ({
  id, sg, pl, unit: '€',
  given: (n, value) => `${n} ${pl} kosten ${value}.`,
  ask: (m) => `Wie viel kosten ${m} ${pl}?`,
  first: `Rechne zuerst den Preis für 1 ${sg} aus.`,
  per: [per[0], per[1], 1],
  bump: 0,
  most: 15,
  cents,
});

/** Things with prices they can have. */
const WHOLE_PRICES: readonly Pair[] = [price('hefte', 'Heft', 'Hefte', [2, 4], [85, 295]), price('stifte', 'Stift', 'Stifte', [2, 3], [85, 295]), price('karten', 'Karte', 'Karten', [4, 9], [405, 895]), price('flaschen', 'Flasche Saft', 'Flaschen Saft', [2, 3], [95, 295])];
/** A Brötchen has no price in whole Euro above 1, so it joins from the prices with Cent. */
const PRICES: readonly Pair[] = [...WHOLE_PRICES, price('broetchen', 'Brötchen', 'Brötchen', [1, 1], [35, 95])];

const OTHER: readonly Pair[] = [
  { id: 'mehl', sg: 'Pfannkuchen', pl: 'Pfannkuchen', unit: 'g', given: (n, v) => `Für ${n} Pfannkuchen braucht Lea ${v} Mehl.`, ask: (m) => `Wie viel Gramm Mehl braucht Lea für ${m} Pfannkuchen?`, first: 'Rechne zuerst das Mehl für 1 Pfannkuchen aus.', per: [25, 75, 25], bump: 25, most: 15, cents: [0, 0] },
  { id: 'rad', sg: 'Stunde', pl: 'Stunden', unit: 'km', given: (n, v) => `In ${n} Stunden fährt Ben gleichmäßig ${v}.`, ask: (m) => `Wie viele Kilometer fährt Ben in ${m} Stunden?`, first: 'Rechne zuerst die Strecke für 1 Stunde aus.', per: [8, 20, 1], bump: 0, most: 8, cents: [0, 0] },
  { id: 'wasser', sg: 'Minute', pl: 'Minuten', unit: 'l', given: (n, v) => `Aus dem Schlauch laufen gleichmäßig in ${n} Minuten ${v}.`, ask: (m) => `Wie viele Liter laufen in ${m} Minuten?`, first: 'Rechne zuerst die Liter für 1 Minute aus.', per: [3, 15, 1], bump: 5, most: 15, cents: [0, 0] },
];

const ONE_THEN = 'Nimm den Wert für 1 dann mit der gesuchten Anzahl mal.';

/** The two lines of a Dreisatz and the wrong ways of it. */
function threeSteps(pair: Pair, n: number, total: number, per: number, m: number, value: number) {
  return [`1 ${pair.sg}: ${amount(total, pair.unit)} : ${n} = ${amount(per, pair.unit)}`, `${m} ${pair.pl}: ${m} · ${amount(per, pair.unit)} = ${amount(value, pair.unit)}`, `Für ${m} ${pair.pl} sind es ${amount(value, pair.unit)}.`];
}

function threeBugs(pair: Pair, n: number, total: number, per: number, m: number, value: number) {
  return fitBugs([
    { id: 'additiv-statt-multiplikativ', match: r3(total + m - n), hint: pair.first },
    { id: 'einheit-statt-gesamt', match: per, hint: `Das gilt für 1 ${pair.sg}. Gefragt sind ${m} ${pair.pl}.` },
    { id: 'nicht-geteilt', match: r3(total * m), hint: `Teile zuerst durch ${n}. Nimm erst dann mal ${m}.` },
  ], value, DECIMALS);
}

const wholeTask = (draw: (rng: Rng, pair: Pair) => [n: number, per: number, m: number], tag: string): Form => (rng) => {
  const pair = rng.pick([...WHOLE_PRICES, ...OTHER]);
  // the result is no number the task shows
  const [n, per, m] = drawUntil(() => draw(rng, pair), ([a, b, c]) => c * b !== a && c * b !== c);
  const total = n * per;
  const value = m * per;
  return {
    key: `${tag}:${pair.id}:${n}:${per}:${m}`,
    context: pair.given(n, amount(total, pair.unit)),
    prompt: pair.ask(m),
    answer: quantity(value, pair.unit),
    hints: [pair.first, ONE_THEN],
    steps: threeSteps(pair, n, total, per, m, value),
    bugs: threeBugs(pair, n, total, per, m, value),
    praise: `Du hast zuerst den Wert für 1 ${pair.sg} berechnet.`,
  };
};

const small = wholeTask((rng, pair) => {
  const [lo, hi, step] = pair.per;
  const n = rng.int(2, 6);
  return [n, rng.int(lo / step, hi / step) * step, drawUntil(() => rng.int(2, 10), (m) => m !== n)];
}, 'klein');

const larger = wholeTask((rng, pair) => {
  const [lo, hi, step] = pair.per;
  const n = rng.int(3, Math.min(9, pair.most));
  return [n, (rng.int(lo / step, hi / step) * step) + pair.bump, drawUntil(() => rng.int(7, pair.most), (m) => m !== n)];
}, 'gross');

const backwards: Form = (rng) => {
  const pair = rng.pick(WHOLE_PRICES);
  const n = rng.int(2, 6);
  const per = rng.int(pair.per[0], pair.per[1]);
  const m = drawUntil(() => rng.int(2, 12), (x) => x !== n && x !== n * per);
  const budget = m * per;
  const total = n * per;
  return {
    key: `zurueck:${pair.id}:${n}:${per}:${m}`,
    context: pair.given(n, amount(total, '€')),
    prompt: `Wie viele ${pair.pl} bekommst du für ${amount(budget, '€')}?`,
    answer: quantity(m, pair.pl),
    hints: [pair.first, 'Wie oft passt dieser Preis in das Geld?'],
    steps: [`1 ${pair.sg}: ${amount(total, '€')} : ${n} = ${amount(per, '€')}`, `${amount(budget, '€')} : ${amount(per, '€')} = ${m}`, `Du bekommst ${m} ${pair.pl}.`],
    bugs: fitBugs([
      { id: 'additiv-statt-multiplikativ', match: n + budget - total, hint: pair.first },
      { id: 'einheit-statt-gesamt', match: per, hint: `Das ist der Preis für 1 ${pair.sg}. Gefragt ist die Anzahl.` },
      { id: 'nicht-geteilt', match: budget * per, hint: 'Teile das Geld durch den Preis für 1 Stück.' },
    ], m, DECIMALS),
    praise: 'Du hast vom Geld auf die Anzahl zurückgerechnet.',
  };
};

// ─── Stufe 2: Einheit mit Komma, Tabelle ──────────────────────────────────────

/** A unit price with Cent, and a given amount that is no whole unit price. No result, forward or back, is a number the task shows. */
function decimalPrice(rng: Rng): { pair: Pair; n: number; per: number; m: number; total: number; value: number } {
  const pair = rng.pick(PRICES);
  const [cents, n, m] = drawUntil(
    () => [drawUntil(() => rng.int(pair.cents[0] / 5, pair.cents[1] / 5) * 5, (c) => c % 100 !== 0), rng.pick([2, 3, 4, 5, 6, 8]), rng.int(3, 12)],
    ([c, a, b]) => a !== b && ![a, b].includes(r3((b * c) / 100)) && r3((a * c) / 100) !== b,
  );
  return { pair, n, per: cents / 100, m, total: r3((n * cents) / 100), value: r3((m * cents) / 100) };
}

const decimalDirect: Form = (rng) => {
  const { pair, n, per, m, total, value } = decimalPrice(rng);
  return {
    key: `komma:${pair.id}:${n}:${per}:${m}`,
    context: pair.given(n, amount(total, '€')),
    prompt: pair.ask(m),
    answer: quantity(value, '€'),
    hints: [pair.first, 'Der Preis für 1 Stück hat Stellen nach dem Komma.'],
    steps: threeSteps(pair, n, total, per, m, value),
    bugs: threeBugs(pair, n, total, per, m, value),
    praise: 'Du hast mit dem Preis für 1 Stück weitergerechnet.',
  };
};

/** The three columns: the step, the number and the price. The steps stand in a column and not in arrows, and the things only in the head: with both, the table is wider than a phone. */
const threeColumns = (pair: Pair, n: number, total: string, per: string, m: number, value: string): Visual => ({
  type: 'table',
  header: ['Schritt', pair.pl, 'Preis'],
  rows: [['Start', `${n}`, total], [`: ${n}`, '1', per], [`· ${m}`, `${m}`, value]],
});

const decimalTable: Form = (rng) => {
  const { pair, n, per, m, total, value } = decimalPrice(rng);
  const fields = [
    { id: 'einheit', before: `1 ${pair.sg}:`, after: '€', value: per, decimals: placesOf('€') },
    { id: 'gesucht', before: `${m} ${pair.pl}:`, after: '€', value, decimals: placesOf('€') },
  ];
  return {
    key: `tabelle:${pair.id}:${n}:${per}:${m}`,
    prompt: 'Ergänze die Tabelle. Rechne über den Preis für 1 Stück.',
    visual: threeColumns(pair, n, amount(total, '€'), '□', m, '□'),
    answer: { kind: 'multi', fields },
    hints: [`Die erste Rechnung ist geteilt durch ${n}.`, `Die zweite Rechnung ist mal ${m}.`],
    steps: [
      `1 ${pair.sg}: ${amount(total, '€')} : ${n} = ${amount(per, '€')}`,
      `${m} ${pair.pl}: ${m} · ${amount(per, '€')} = ${amount(value, '€')}`,
      { text: `1 ${pair.sg} kostet ${amount(per, '€')}, ${m} ${pair.pl} kosten ${amount(value, '€')}.`, visual: threeColumns(pair, n, amount(total, '€'), amount(per, '€'), m, amount(value, '€')) },
    ],
    bugs: multiBugs([
      { id: 'additiv-statt-multiplikativ', match: { gesucht: r3(total + m - n) }, hint: pair.first },
      { id: 'einheit-statt-gesamt', match: { gesucht: per }, hint: `Das gilt für 1 ${pair.sg}. Rechne noch mal ${m}.` },
      { id: 'nicht-geteilt', match: { einheit: r3(total * n) }, hint: `Von ${n} ${pair.pl} auf 1 ${pair.sg} rechnest du geteilt.` },
    ], fields),
    praise: 'Du hast die Tabelle Zeile für Zeile gerechnet.',
  };
};

const decimalBack: Form = (rng) => {
  const { pair, n, per, m, total, value } = decimalPrice(rng);
  return {
    key: `kommazurueck:${pair.id}:${n}:${per}:${m}`,
    context: pair.given(n, amount(total, '€')),
    prompt: `Wie viele ${pair.pl} bekommst du für ${amount(value, '€')}?`,
    answer: quantity(m, pair.pl),
    hints: [pair.first, 'Wie oft passt dieser Preis in das Geld?'],
    steps: [`1 ${pair.sg}: ${amount(total, '€')} : ${n} = ${amount(per, '€')}`, `${amount(value, '€')} : ${amount(per, '€')} = ${m}`, `Du bekommst ${m} ${pair.pl}.`],
    bugs: fitBugs([
      { id: 'additiv-statt-multiplikativ', match: r3(n + value - total), hint: pair.first },
      { id: 'einheit-statt-gesamt', match: per, hint: `Das ist der Preis für 1 ${pair.sg}. Gefragt ist die Anzahl.` },
    ], m, DECIMALS),
    praise: 'Du hast vom Geld auf die Anzahl zurückgerechnet.',
  };
};

const twoPacks: Form = (rng) => {
  const pair = rng.pick(PRICES);
  const draw = () => rng.int(pair.cents[0] / 5, pair.cents[1] / 5) * 5;
  const [a, b] = drawUntil(() => [draw(), draw()], ([x, y]) => x !== y && x % 100 !== 0 && y % 100 !== 0);
  const [n, k] = rng.sample([2, 3, 4, 5, 6], 2);
  const low = Math.min(a, b) / 100;
  return {
    key: `packungen:${pair.id}:${n}:${a}:${k}:${b}`,
    context: `Packung A: ${n} ${pair.pl} für ${amount(r3((n * a) / 100), '€')}. Packung B: ${k} ${pair.pl} für ${amount(r3((k * b) / 100), '€')}.`,
    prompt: `Wie viel kostet 1 ${pair.sg} in der günstigeren Packung?`,
    answer: quantity(low, '€'),
    hints: ['Rechne für jede Packung den Preis für 1 Stück aus.', 'Vergleiche dann die beiden Preise.'],
    steps: [`Packung A: ${amount(r3((n * a) / 100), '€')} : ${n} = ${amount(a / 100, '€')}`, `Packung B: ${amount(r3((k * b) / 100), '€')} : ${k} = ${amount(b / 100, '€')}`, `Der kleinere Preis ist ${amount(low, '€')}.`],
    bugs: fitBugs([{ id: 'teurere-packung', match: Math.max(a, b) / 100, hint: 'Das ist der Preis in der teureren Packung.' }], low, DECIMALS),
    praise: 'Du hast beide Packungen über den Preis für 1 Stück verglichen.',
  };
};

// ─── Stufe 3: passt der Dreisatz? ─────────────────────────────────────────────

const CHECK_HINTS = ['Prüfe zuerst: Wächst beides im gleichen Verhältnis?', 'Rechne für beide Angaben den Wert für 1 aus.'];
const CHECK_PRAISE = 'Du hast geprüft, ob der Dreisatz überhaupt passt.';

/** A story that can get a second given line, so that the check is a calculation. */
interface Checkable {
  /** The story as it fits, told with one line. */
  task: Task;
  /** A given line for k of them at a value for one, with no word that says it fits. */
  told: (k: number, per: number) => string;
  /** What is told after the given lines. */
  rest: string;
  /** Its worked line: the value for one. */
  worked: (k: number, per: number) => string;
  /** What the second line would have to differ by when the Dreisatz does not fit. */
  gap: number;
  /** The result if one line is simply taken as true. */
  wrong: (per: number) => number;
  id: string;
  n: number;
  per: number;
  m: number;
  most: number;
  unit: string | undefined;
}

/** A value for one that differs from the first line, with less per piece for more of it, as with a large pack. More of it never comes to less in all: 6 Pfannkuchen with 525 g, 5 with 562,5 g. */
function otherValue(s: Checkable, n2: number): number | undefined {
  const fits = (per: number) => per > 0 && n2 * per > s.n * s.per === n2 > s.n;
  return [n2 > s.n ? s.per - s.gap : s.per + s.gap, n2 > s.n ? s.per + s.gap : s.per - s.gap].map(r3).find(fits);
}

/**
 * First decide, then calculate. Two lines of one story, and only dividing both tells whether the value for one is the same: a story that gives itself away, such as the height at twice the age,
 * would be a tap and easier than the unit price of Stufe 2. Two of three fit, so that the button alone is no way through.
 */
function decideFirst(rng: Rng, tag: string, s: Checkable): Task {
  const result = s.task.answer.kind === 'number' ? s.task.answer.value : null;
  const n2 = drawUntil(() => rng.int(2, Math.min(8, s.most)), (x) => x !== s.n && x !== s.m && x !== result && r3(x * s.per) !== result && x % s.n !== 0 && s.n % x !== 0 && otherValue(s, x) !== undefined);
  const context = (per2: number) => [s.told(s.n, s.per), s.told(n2, per2), s.rest].filter(Boolean).join(' ');
  if (rng.chance(1 / 3)) {
    const per2 = otherValue(s, n2)!;
    return {
      key: `${tag}:nein:${s.id}:${n2}:${per2}`,
      context: context(per2),
      prompt: s.task.prompt,
      answer: { ...quantity(null, s.unit), offerUnsolvable: true },
      hints: CHECK_HINTS,
      steps: [s.worked(s.n, s.per), s.worked(n2, per2), 'Die Werte für 1 sind verschieden, also passt der Dreisatz nicht.', 'Die Aufgabe ist nicht lösbar.'],
      bugs: fitBugs([
        { id: 'immer-proportional', match: s.wrong(s.per), hint: CHECK_HINTS[0] },
        { id: 'immer-proportional', match: s.wrong(per2), hint: CHECK_HINTS[0] },
      ], null, DECIMALS),
      praise: CHECK_PRAISE,
    };
  }
  if (s.task.answer.kind !== 'number') throw new TypeError(s.task.key);
  const [first, ...others] = s.task.steps;
  return {
    ...s.task,
    key: `${tag}:ja:${s.id}:${n2}`,
    context: context(s.per),
    answer: { ...s.task.answer, offerUnsolvable: true },
    hints: CHECK_HINTS,
    steps: [first, `${s.worked(n2, s.per)}. Der Wert für 1 ist gleich, also passt der Dreisatz.`, ...others],
    praise: CHECK_PRAISE,
  };
}

/** The given line of a story without the word 'gleichmäßig', which would say that it fits. */
const toldOf = (pair: Pair) => (k: number, per: number) => pair.given(k, amount(r3(k * per), pair.unit)).replace(' gleichmäßig', '');
const workedOf = (pair: Pair) => (k: number, per: number) => `1 ${pair.sg}: ${amount(r3(k * per), pair.unit)} : ${k} = ${amount(per, pair.unit)}`;

/** A story that fits: half of them have a price with Cent, the others no price at all. */
function fitting(rng: Rng): { pair: Pair; n: number; per: number; m: number; total: number; value: number } {
  if (rng.chance(0.5)) return decimalPrice(rng);
  const pair = rng.pick(OTHER);
  const [lo, hi, step] = pair.per;
  const per = rng.int(lo / step, hi / step) * step + step / 2;
  const n = rng.int(2, 6);
  const m = drawUntil(() => rng.int(3, pair.most), (x) => x !== n);
  return { pair, n, per, m, total: r3(n * per), value: r3(m * per) };
}

const decide: Form = (rng) => {
  // the result is no number the task shows
  const { pair, n, per, m, total, value } = drawUntil(() => fitting(rng), (x) => ![x.n, x.m].includes(x.value));
  const id = `${pair.id}:${n}:${per}:${m}`;
  return decideFirst(rng, 'entscheiden', {
    task: {
      key: id,
      prompt: pair.ask(m),
      answer: quantity(value, pair.unit),
      hints: CHECK_HINTS,
      steps: threeSteps(pair, n, total, per, m, value),
      bugs: threeBugs(pair, n, total, per, m, value),
      praise: CHECK_PRAISE,
    },
    told: toldOf(pair),
    rest: '',
    worked: workedOf(pair),
    gap: pair.unit === '€' ? rng.int(4, 10) * 0.05 : pair.per[2],
    wrong: (x) => r3(m * x),
    id,
    n,
    per,
    m,
    most: pair.most,
    unit: pair.unit,
  });
};

/** The note that pays for it, with money back. */
const payFor = (value: number): number => [10, 20, 50, 100, 200].find((x) => x >= value + 1) ?? 200;

function changeStory(rng: Rng): Checkable {
  const person = pickPerson(rng);
  const { pair, n, per, m, total, value } = drawUntil(() => decimalPrice(rng), (x) => ![x.n, x.m, x.total].includes(r3(payFor(x.value) - x.value)));
  const pay = payFor(value);
  const back = r3(pay - value);
  const rest = `${person.name} kauft ${m} ${pair.pl} und bezahlt mit ${amount(pay, '€')}.`;
  const key = `zurueckgeld:${person.name}:${pair.id}:${n}:${per}:${m}`;
  return {
    task: {
      key,
      context: `${pair.given(n, amount(total, '€'))} ${rest}`,
      prompt: `Wie viel Geld bekommt ${person.name} zurück?`,
      answer: quantity(back, '€'),
      hints: [pair.first, 'Ziehe den Preis zum Schluss vom bezahlten Geld ab.'],
      steps: [`1 ${pair.sg}: ${amount(total, '€')} : ${n} = ${amount(per, '€')}`, `${m} ${pair.pl}: ${m} · ${amount(per, '€')} = ${amount(value, '€')}`, `Zurück: ${amount(pay, '€')} ${MINUS} ${amount(value, '€')} = ${amount(back, '€')}`, `${person.name} bekommt ${amount(back, '€')} zurück.`],
      bugs: fitBugs([
        { id: 'zweiter-schritt-fehlt', match: value, hint: 'Das ist der Preis. Gefragt ist das Geld, das zurückkommt.' },
        { id: 'additiv-statt-multiplikativ', match: r3(pay - (total + m - n)), hint: pair.first },
      ], back, DECIMALS),
      praise: 'Du hast den Preis berechnet und dann abgezogen.',
    },
    told: toldOf(pair),
    rest,
    worked: workedOf(pair),
    gap: rng.int(1, 3) * 0.05,
    wrong: (x) => r3(pay - m * x),
    id: key,
    n,
    per,
    m,
    most: 8,
    unit: '€',
  };
}

function packsStory(rng: Rng): Checkable {
  const person = pickPerson(rng);
  const [n, per, m] = drawUntil(() => [rng.pick([2, 4, 5]), rng.pick([50, 75, 100, 125]), rng.int(6, 16)], ([a, p, b]) => a !== b && (p * b) % 500 !== 0 && p * b > 500 && ![a, b].includes(Math.ceil((p * b) / 500)));
  const need = per * m;
  const count = Math.ceil(need / 500);
  const told = (k: number, x: number) => `Für ${k} Personen braucht ${person.name} ${amount(k * x, 'g')} Nudeln.`;
  const rest = `${person.name} kocht für ${m} Personen. Eine Packung hat 500 g.`;
  const key = `packungen3:${person.name}:${n}:${per}:${m}`;
  return {
    task: {
      key,
      context: `${told(n, per)} ${rest}`,
      prompt: `Wie viele Packungen braucht ${person.name}?`,
      answer: quantity(count, 'Packungen'),
      hints: ['Rechne zuerst die Nudeln für 1 Person aus.', 'Eine angebrochene Packung musst du ganz kaufen.'],
      steps: [`1 Person: ${amount(n * per, 'g')} : ${n} = ${amount(per, 'g')}`, `${m} Personen: ${m} · ${amount(per, 'g')} = ${amount(need, 'g')}`, `${count - 1} · 500 g = ${amount((count - 1) * 500, 'g')}, das reicht nicht.`, `${person.name} braucht ${count} Packungen.`],
      bugs: fitBugs([
        { id: 'zweiter-schritt-fehlt', match: need, hint: 'Das sind die Nudeln in Gramm. Gefragt sind die Packungen.' },
        { id: 'abgerundet', match: count - 1, hint: 'So viele Packungen reichen noch nicht.' },
        { id: 'packung-als-bruch', match: r3(need / 500), hint: 'Du kaufst nur ganze Packungen.' },
      ], count, DECIMALS),
      praise: 'Du hast bis zu den ganzen Packungen weitergedacht.',
    },
    told,
    rest,
    worked: (k, x) => `1 Person: ${amount(k * x, 'g')} : ${k} = ${amount(x, 'g')}`,
    gap: 25,
    wrong: (x) => Math.ceil((m * x) / 500),
    id: key,
    n,
    per,
    m,
    most: 8,
    unit: 'Packungen',
  };
}

const change: Form = (rng) => changeStory(rng).task;
const packs: Form = (rng) => packsStory(rng).task;

/** The same decision before a story with two steps, and with lines closer to each other: the gap is a few Cent. */
const decideTwoSteps: Form = (rng) => decideFirst(rng, 'entscheiden2', rng.pick([changeStory, packsStory])(rng));

const FORMS: Record<1 | 2 | 3, Record<Ab, Form[]>> = {
  1: { 1: [small], 2: [larger], 3: [backwards] },
  2: { 1: [decimalDirect], 2: [decimalTable], 3: [decimalBack, twoPacks] },
  3: { 1: [decide], 2: [change, packs], 3: [decideTwoSteps] },
};

export const dreisatzSkill: SkillDef = {
  id: 'prozent.dreisatz',
  topicId: 'prozent',
  title: 'Dreisatz',
  description: 'Du schließt über eine Einheit auf die gesuchte Größe.',
  stufen: {
    1: 'Ganze Ergebnisse: 3 Hefte kosten 6 €, wie viel 5 Hefte?',
    2: 'Preis für 1 Stück mit Komma, Tabelle mit drei Spalten',
    3: 'Prüfen: Passt der Dreisatz? Geschichten mit zwei Schritten',
  },
  keys: { comma: true },
  kmk: KMK,
  generate: fromForms('prozent.dreisatz', KMK, FORMS),
};
