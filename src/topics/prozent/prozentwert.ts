/**
 * Prozent von einer Größe (docs/research.md §6).
 * Stufe 1: 50, 25, 10 % of up to 200. Stufe 2: 5, 20, 75 % of up to 500. Stufe 3: any whole percent, a Rabatt story, the new price.
 * Out of scope (§2.6): a raised price and a chain of two discounts, both beyond the simple Rabatt of Stufe 3.
 * Money may end in Cent on the harder items, so the comma key belongs to the whole skill (§7.1).
 */
import { fmt, fmtPercent as pct, frac, MINUS } from '../../core/format';
import type { Ab, Bug, Rng, SkillDef, Step, Visual } from '../../core/types';
import { pickPerson } from '../shared';
import { amount, barParts, barUnit, drawUntil, fitBugs, fromForms, lower, quantity, r3, type Form } from './helpers';

const KMK = ['ZO.prozent', 'PK.modellieren'];

/** Bug values a child would type have at most two places (fitBugs). */
const DECIMALS = 2;

/** How a Stufe's percent number is reached, in a child's words. */
interface Way {
  p: number;
  /** Bases of this step give a whole result. */
  step: number;
  /** The hint that names the way. */
  hint: string;
  /** Worked lines from the whole to the result. */
  lines: (g: number, u: string) => string[];
}

/** A whole after 'von': '380 Plätzen'. */
const ofWhole = (g: number, u: string) => amount(g, u === 'Plätze' ? 'Plätzen' : u);

const halfOfTen = (g: number, u: string) => [`10 % von ${ofWhole(g, u)} sind ${amount(r3(g / 10), u)}.`, `5 % sind die Hälfte: ${amount(r3(g / 20), u)}`];

const S1_WAYS: Way[] = [
  { p: 50, step: 2, hint: '50 % sind die Hälfte. Teile durch 2.', lines: (g, u) => [`50 % sind die Hälfte, also ${frac(1, 2)}.`, `${amount(g, u)} : 2 = ${amount(r3(g / 2), u)}`] },
  { p: 25, step: 4, hint: `25 % sind ${frac(1, 4)}. Teile durch 4.`, lines: (g, u) => [`25 % sind ${frac(1, 4)}.`, `${amount(g, u)} : 4 = ${amount(r3(g / 4), u)}`] },
  { p: 10, step: 10, hint: `10 % sind ${frac(1, 10)}. Teile durch 10.`, lines: (g, u) => [`10 % sind ${frac(1, 10)}.`, `${amount(g, u)} : 10 = ${amount(r3(g / 10), u)}`] },
];

const S2_WAYS: Way[] = [
  { p: 5, step: 20, hint: '5 % sind die Hälfte von 10 %. Rechne zuerst 10 %.', lines: halfOfTen },
  { p: 20, step: 5, hint: `20 % sind ${frac(1, 5)}. Teile durch 5.`, lines: (g, u) => [`20 % sind ${frac(1, 5)}.`, `${amount(g, u)} : 5 = ${amount(r3(g / 5), u)}`] },
  { p: 75, step: 4, hint: `75 % sind ${frac(3, 4)}. Rechne zuerst ${frac(1, 4)}.`, lines: (g, u) => [`${frac(1, 4)} von ${ofWhole(g, u)} sind ${amount(r3(g / 4), u)}.`, `75 % sind 3 · ${amount(r3(g / 4), u)} = ${amount(r3((g * 3) / 4), u)}`] },
];

const UNITS = ['€', 'm', 'kg', 'km', 'Personen'] as const;

function value(g: number, p: number): number {
  return r3((g * p) / 100);
}

/** The wrong ways of a Prozentwert task. */
function percentBugs(g: number, p: number, w: number): Bug[] {
  return fitBugs([
    { id: 'prozent-als-zahl', match: p, hint: `${pct(p)} heißt ${p} von 100. Wie viel ist das von ${fmt(g)}?` },
    { id: 'rest-statt-anteil', match: r3(g - w), hint: `Das ist der Rest. Gefragt sind die ${pct(p)}.` },
    { id: 'durch-prozentzahl', match: r3(g / p), hint: `Du hast durch ${p} geteilt. Prozent heißt aber: von 100.` },
    { id: 'hundert-vergessen', match: g * p, hint: 'Du hast malgenommen. Teile das Ergebnis noch durch 100.' },
  ], w, DECIMALS);
}

const stripe = (g: number, percent: number, unit: string): Visual => ({ type: 'percentBar', total: g, percent, ticks: barParts(percent), labels: 'both', unknown: 'W', ...barUnit(unit) });

/** The wholes of a Stufe. Stufe 2 starts above the easy wholes of Stufe 1, so that 5 % of 100 or 75 % of 20 stay out. */
interface Range {
  min: number;
  max: number;
}
const S1_RANGE: Range = { min: 20, max: 200 };
const S2_RANGE: Range = { min: 120, max: 500 };

/**
 * A whole of the Stufe's range and of at least `atLeast`, on the Stufe's grid. Never 100: then the percent number is the result, the task hands it over and the bug prozent-als-zahl disappears.
 * The result is no number of the hints either, and neither the result nor the rest is the percent number: copying it must not be right.
 */
function whole(rng: Rng, way: Way, range: Range, atLeast = 0): number {
  const low = Math.ceil(Math.max(range.min, atLeast) / way.step);
  const high = Math.floor(range.max / way.step);
  return drawUntil(() => rng.int(low, high) * way.step, (g) => g !== 100 && value(g, way.p) !== 100 && value(g, way.p) !== 10 && value(g, way.p) !== way.p && r3(g - value(g, way.p)) !== way.p);
}

// ─── Forms shared by Stufe 1 and 2 ────────────────────────────────────────────

const direct = (ways: Way[], range: Range, tag: string): Form => (rng) => {
  const way = rng.pick(ways);
  const g = whole(rng, way, range);
  const unit = rng.pick(UNITS);
  const w = value(g, way.p);
  return {
    key: `${tag}:${way.p}:${g}:${unit}`,
    prompt: `Wie viel sind ${pct(way.p)} von ${amount(g, unit)}?`,
    visual: stripe(g, way.p, unit),
    answer: quantity(w, unit),
    hints: [way.hint, 'Der Streifen zeigt die gleich großen Teile.'],
    steps: [...way.lines(g, unit), `${pct(way.p)} von ${amount(g, unit)} sind ${amount(w, unit)}.`],
    bugs: percentBugs(g, way.p, w),
    praise: `Du hast ${pct(way.p)} als Teil vom Ganzen gerechnet.`,
  };
};

/** A story: the whole, the share, and what is asked. Each with the smallest whole it can have, and with no item whose price the share would decide. */
const STORIES = [
  { unit: 'km', least: 60, text: (g: string, p: string) => `Die Klasse 6a fährt ${g} ins Schullandheim. ${p} der Strecke führen über die Autobahn.`, ask: 'Wie viele Kilometer sind das?', restAsk: 'Wie viele Kilometer fährt der Bus auf anderen Straßen?', id: 'fahrt' },
  { unit: 'Personen', least: 60, text: (g: string, p: string) => `Im Sportverein sind ${g}. ${p} der Personen spielen Handball.`, ask: 'Wie viele Personen spielen Handball?', restAsk: 'Wie viele Personen spielen nicht Handball?', id: 'verein' },
  { unit: '€', least: 60, text: (g: string, p: string) => `Die Klasse 6a hat ${g} in der Klassenkasse. ${p} des Geldes sind für den Ausflug.`, ask: 'Wie viel Euro sind für den Ausflug?', restAsk: 'Wie viel Euro bleiben in der Klassenkasse?', id: 'kasse' },
  { unit: 'g', least: 120, text: (g: string, p: string) => `Tom braucht für Kuchen ${g} Mehl. ${p} des Mehls sind Vollkornmehl.`, ask: 'Wie viel Gramm Vollkornmehl braucht Tom?', restAsk: 'Wie viel Gramm anderes Mehl braucht Tom?', id: 'brot' },
  { unit: 'Plätze', least: 60, text: (g: string, p: string) => `Der Saal hat für das Schulkonzert ${g}. ${p} der Plätze sind schon vergeben.`, ask: 'Wie viele Plätze sind vergeben?', restAsk: 'Wie viele Plätze sind noch frei?', id: 'konzert' },
] as const;

const story = (ways: Way[], range: Range, tag: string): Form => (rng) => {
  const way = rng.pick(ways);
  const s = rng.pick(STORIES);
  const g = whole(rng, way, range, s.least);
  const w = value(g, way.p);
  return {
    key: `${tag}:${s.id}:${way.p}:${g}`,
    context: s.text(amount(g, s.unit), pct(way.p)),
    prompt: s.ask,
    answer: quantity(w, s.unit),
    hints: [way.hint, 'Das Ganze sind 100 %.'],
    steps: [...way.lines(g, s.unit), `${pct(way.p)} sind ${amount(w, s.unit)}.`],
    bugs: percentBugs(g, way.p, w),
    praise: 'Du hast das Ganze und den Anteil herausgesucht.',
  };
};

const restStory = (ways: Way[], range: Range, tag: string): Form => (rng) => {
  const way = rng.pick(ways.filter((x) => x.p !== 50));
  const s = rng.pick(STORIES);
  const g = whole(rng, way, range, s.least);
  const w = value(g, way.p);
  const left = r3(g - w);
  return {
    key: `${tag}:${s.id}:${way.p}:${g}`,
    context: s.text(amount(g, s.unit), pct(way.p)),
    prompt: s.restAsk,
    answer: quantity(left, s.unit),
    hints: [way.hint, 'Rechne zuerst den genannten Teil aus. Gefragt ist der andere Teil.'],
    steps: [...way.lines(g, s.unit), `Rest: ${amount(g, s.unit)} ${MINUS} ${amount(w, s.unit)} = ${amount(left, s.unit)}`, `Es bleiben ${amount(left, s.unit)}.`],
    bugs: fitBugs([
      { id: 'teil-statt-rest', match: w, hint: 'Das ist der genannte Teil. Gefragt ist der Rest.' },
      { id: 'prozent-als-zahl', match: g - way.p, hint: `Du hast ${way.p} abgezogen. Rechne zuerst die ${pct(way.p)} aus.` },
    ], left, DECIMALS),
    praise: 'Du hast den Teil berechnet und vom Ganzen abgezogen.',
  };
};

/** Fehlerdetektiv: a fictional child read the percent number as the result. */
const detective = (ways: Way[], range: Range, tag: string): Form => (rng) => {
  const way = rng.pick(ways);
  const person = pickPerson(rng);
  const g = whole(rng, way, range, 40);
  const w = value(g, way.p);
  return {
    key: `${tag}:${person.name}:${way.p}:${g}`,
    prompt: `${person.name} rechnet: ${pct(way.p)} von ${amount(g, '€')} sind ${amount(way.p, '€')}. Das stimmt noch nicht. Wie viel ist es?`,
    answer: quantity(w, '€'),
    hints: [way.hint, 'Prozent heißt: von 100.'],
    steps: [`${pct(way.p)} sind nicht ${amount(way.p, '€')}, denn das Ganze ist nicht 100 €.`, ...way.lines(g, '€'), `Es sind ${amount(w, '€')}.`],
    bugs: fitBugs([
      { id: 'prozent-als-zahl', match: way.p, hint: `Das ist die Zahl von ${person.name}. ${pct(way.p)} heißt: von 100.` },
      { id: 'rest-statt-anteil', match: r3(g - w), hint: `Das ist der Rest. Gefragt sind die ${pct(way.p)}.` },
    ], w, DECIMALS),
    praise: 'Du hast den Fehler in der Rechnung gefunden.',
  };
};

const compare = (ways: Way[], range: Range, tag: string): Form => (rng) => {
  const [a, b] = rng.sample(ways, 2);
  const [g, h] = drawUntil(() => [whole(rng, a, range), whole(rng, b, range)], ([x, y]) => value(x, a.p) !== value(y, b.p) && ![a.p, b.p, x, y].includes(Math.max(value(x, a.p), value(y, b.p))));
  const v = value(g, a.p);
  const u = value(h, b.p);
  const high = Math.max(v, u);
  return {
    key: `${tag}:${a.p}:${g}:${b.p}:${h}`,
    prompt: 'Rechne beide Beträge aus. Schreibe den größeren Betrag auf.',
    expression: `${pct(a.p)} von ${amount(g, '€')}   oder   ${pct(b.p)} von ${amount(h, '€')}`,
    answer: quantity(high, '€'),
    hints: [a.hint, b.hint],
    steps: [`${pct(a.p)} von ${amount(g, '€')} sind ${amount(v, '€')}.`, `${pct(b.p)} von ${amount(h, '€')} sind ${amount(u, '€')}.`, `Der größere Betrag ist ${amount(high, '€')}.`],
    bugs: fitBugs([{ id: 'kleinerer-betrag', match: Math.min(v, u), hint: 'Das ist der kleinere der beiden Beträge.' }], high, DECIMALS),
    praise: 'Du hast beide Beträge ausgerechnet und dann verglichen.',
  };
};

/** Stufe 2, harder numbers: 5 % of a whole that ends in Cent. */
const fivePercentCents: Form = (rng) => {
  const g = drawUntil(() => rng.int(3, 49) * 10, (x) => x % 20 !== 0);
  const w = value(g, 5);
  return {
    key: `cent:${g}`,
    prompt: `Wie viel sind ${pct(5)} von ${amount(g, '€')}?`,
    visual: stripe(g, 5, '€'),
    answer: quantity(w, '€'),
    hints: ['5 % sind die Hälfte von 10 %.', 'Rechne genau, auch mit Cent.'],
    steps: [...halfOfTen(g, '€'), `5 % von ${amount(g, '€')} sind ${amount(w, '€')}.`],
    bugs: fitBugs([
      { id: 'durch-prozentzahl', match: g / 5, hint: 'Durch 5 ergibt 20 %. Für 5 % brauchst du durch 20.' },
      { id: 'zehn-statt-fuenf', match: g / 10, hint: 'Das sind 10 %. Nimm davon noch die Hälfte.' },
      { id: 'prozent-als-zahl', match: 5, hint: '5 % heißt 5 von 100. Rechne von dem Ganzen aus.' },
    ], w, DECIMALS),
    praise: 'Du hast 10 % gerechnet und dann halbiert.',
  };
};

// ─── Stufe 3: jeder ganze Prozentsatz, Rabatt ─────────────────────────────────

/** No percent of Stufe 1 or 2: 10 % of a whole is easier than 75 % of one. */
const ANY_PERCENT = [3, 4, 6, 7, 8, 9, 11, 12, 13, 14, 15, 16, 17, 18, 19, 21, 22, 23, 24, 26, 27, 28, 30, 32, 35, 36, 40, 45, 48, 55, 60, 65, 70, 80, 85, 90];

function viaOnePercent(g: number, p: number, unit: string): Step[] {
  const one = r3(g / 100);
  return [`1 % von ${amount(g, unit)} sind ${amount(one, unit)}.`, `${pct(p)} sind ${p} · ${amount(one, unit)} = ${amount(value(g, p), unit)}`];
}

/** A whole that is no multiple of 100, so that 1 % has a comma, and no Personen, as a share of them would have one too. */
const anyPercent: Form = (rng) => {
  const p = rng.pick(ANY_PERCENT);
  const unit = rng.pick(['€', 'm', 'kg', 'km'] as const);
  const g = drawUntil(() => rng.int(3, 49) * 20, (x) => x % 100 !== 0 && value(x, p) !== 100 && value(x, p) !== p);
  const w = value(g, p);
  return {
    key: `jeder:${p}:${g}:${unit}`,
    prompt: `Wie viel sind ${pct(p)} von ${amount(g, unit)}?`,
    visual: stripe(g, p, unit),
    answer: quantity(w, unit),
    hints: ['Rechne zuerst 1 %. Teile dafür durch 100.', 'Nimm das Ergebnis dann mit der Prozentzahl mal.'],
    steps: [...viaOnePercent(g, p, unit), `${pct(p)} von ${amount(g, unit)} sind ${amount(w, unit)}.`],
    bugs: fitBugs([
      ...percentBugs(g, p, w),
      { id: 'nur-ein-prozent', match: r3(g / 100), hint: `Das ist erst 1 %. Gefragt sind ${pct(p)}.` },
    ], w, DECIMALS),
    praise: 'Du bist über 1 % gegangen.',
  };
};

const GOODS = [
  { name: 'Das Fahrrad', min: 12, max: 48, step: 10 },
  { name: 'Der Rucksack', min: 6, max: 16, step: 5 },
  { name: 'Die Gitarre', min: 8, max: 30, step: 10 },
  { name: 'Das Trikot', min: 5, max: 14, step: 5 },
  { name: 'Der Helm', min: 4, max: 12, step: 5 },
  { name: 'Das Zelt', min: 7, max: 25, step: 10 },
] as const;

const RABATT_PERCENT = [15, 30, 35, 40, 45, 60];

/**
 * A thing, a price that fits it and a Rabatt in no easy percent of Stufe 1 or 2, with a discount and a new price that are no number of the task or the hints.
 * Never 100 €: there the percent number is the discount, so the task would hand it over. A price above the percent number: price minus percent number is the sum of Fehlerdetektiv, and no one believes a price of 0 € or −10 €.
 */
function discount(rng: Rng): { name: string; g: number; p: number; w: number } {
  return drawUntil(() => {
    const item = rng.pick(GOODS);
    const g = rng.int(item.min, item.max) * item.step;
    const p = rng.pick(RABATT_PERCENT);
    return { name: item.name, g, p, w: value(g, p) };
  }, ({ g, p, w }) => g !== 100 && g > p && w !== p && r3(g - w) !== p && w !== 10 && w !== 100);
}

const discountAmount: Form = (rng) => {
  const { name, g, p, w } = discount(rng);
  return {
    key: `rabatt:${name}:${g}:${p}`,
    context: `${name} kostet ${amount(g, '€')}. Der Preis wird um ${pct(p)} gesenkt.`,
    prompt: 'Wie viel Euro sparst du?',
    visual: stripe(g, p, '€'),
    answer: quantity(w, '€'),
    hints: ['Du sparst den Rabatt, also einen Teil vom alten Preis.', 'Rechne zuerst 1 % oder 10 %.'],
    steps: [...viaOnePercent(g, p, '€'), `Du sparst ${amount(w, '€')}.`],
    bugs: fitBugs([
      { id: 'prozent-als-zahl', match: p, hint: `${pct(p)} sind nicht ${amount(p, '€')}. Prozent heißt: von 100.` },
      { id: 'neuer-preis-statt-rabatt', match: r3(g - w), hint: 'Das ist der neue Preis. Gefragt ist, wie viel du sparst.' },
    ], w, DECIMALS),
    praise: 'Du hast den Rabatt vom alten Preis berechnet.',
  };
};

/** The bar marks what stays and asks for its value, as the task does. The □ on the discount would steer the child to prozent-subtrahiert. */
const newPrice: Form = (rng) => {
  const { name, g, p, w } = discount(rng);
  const result = r3(g - w);
  return {
    key: `neu:${name}:${g}:${p}`,
    context: `${name} kostet ${amount(g, '€')}. Der Preis wird um ${pct(p)} gesenkt.`,
    prompt: `Wie viel kostet ${lower(name)} jetzt?`,
    visual: stripe(g, 100 - p, '€'),
    answer: quantity(result, '€'),
    hints: ['Gefragt ist der neue Preis.', 'Rechne zuerst aus, um wie viel Euro der Preis sinkt.'],
    steps: [...viaOnePercent(g, p, '€'), `Neuer Preis: ${amount(g, '€')} ${MINUS} ${amount(w, '€')} = ${amount(result, '€')}`, `${name} kostet jetzt ${amount(result, '€')}.`],
    bugs: fitBugs([
      { id: 'prozent-subtrahiert', match: w, hint: 'Gefragt ist der neue Preis. Wie viel bleibt nach dem Rabatt?' },
      { id: 'prozent-als-euro', match: g - p, hint: `${pct(p)} sind nicht ${amount(p, '€')}. Rechne zuerst die Prozent aus.` },
      { id: 'falsche-richtung', match: r3(g + w), hint: 'Der Preis sinkt. Ziehe den Rabatt ab.' },
    ], result, DECIMALS),
    praise: 'Du hast den Betrag berechnet und den neuen Preis genannt.',
  };
};

/** Fehlerdetektiv at the Rabatt: the percent number was taken for Euro. */
const rabattDetektiv: Form = (rng) => {
  const person = pickPerson(rng);
  const { name, g, p, w } = discount(rng);
  const result = r3(g - w);
  return {
    key: `rabattdetektiv:${person.name}:${name}:${g}:${p}`,
    context: `${name} kostet ${amount(g, '€')}. Der Preis wird um ${pct(p)} gesenkt. ${person.name} rechnet: ${amount(g, '€')} ${MINUS} ${amount(p, '€')} = ${amount(g - p, '€')}.`,
    prompt: `Das stimmt noch nicht. Wie viel kostet ${lower(name)} jetzt?`,
    answer: quantity(result, '€'),
    hints: ['Prozent sind noch keine Euro.', 'Rechne zuerst aus, wie viel Euro der Rabatt ist.'],
    steps: [...viaOnePercent(g, p, '€'), `Neuer Preis: ${amount(g, '€')} ${MINUS} ${amount(w, '€')} = ${amount(result, '€')}`, `${name} kostet jetzt ${amount(result, '€')}.`],
    bugs: fitBugs([
      { id: 'prozent-als-euro', match: g - p, hint: `Das ist die Zahl von ${person.name}. ${pct(p)} sind nicht ${amount(p, '€')}.` },
      { id: 'prozent-subtrahiert', match: w, hint: 'Das ist der Rabatt. Gefragt ist der neue Preis.' },
    ], result, DECIMALS),
    praise: 'Du hast den Fehler in der Rechnung gefunden.',
  };
};

const twoShops: Form = (rng) => {
  const { name, g, p } = discount(rng);
  const off = drawUntil(() => Math.round((g * rng.int(10, 35)) / 100), (x) => x !== value(g, p) && x !== p && g - x !== p);
  const a = r3(g - value(g, p));
  const b = g - off;
  const low = Math.min(a, b);
  return {
    key: `laeden:${name}:${g}:${p}:${off}`,
    context: `${name} kostet in beiden Läden ${amount(g, '€')}. Laden A gibt ${pct(p)} Rabatt. Laden B gibt ${amount(off, '€')} Rabatt.`,
    prompt: `Wie viel kostet ${lower(name)} im günstigeren Laden?`,
    answer: quantity(low, '€'),
    hints: ['Rechne für Laden A zuerst den Rabatt in Euro aus.', 'Vergleiche dann beide neuen Preise.'],
    steps: [`Laden A: ${pct(p)} von ${amount(g, '€')} sind ${amount(value(g, p), '€')}.`, `Laden A: ${amount(g, '€')} ${MINUS} ${amount(value(g, p), '€')} = ${amount(a, '€')}`, `Laden B: ${amount(g, '€')} ${MINUS} ${amount(off, '€')} = ${amount(b, '€')}`, `Im günstigeren Laden kostet es ${amount(low, '€')}.`],
    bugs: fitBugs([
      { id: 'teurerer-laden', match: Math.max(a, b), hint: 'Das ist der Preis im teureren Laden.' },
      { id: 'prozent-als-euro', match: g - p, hint: `${pct(p)} sind nicht ${amount(p, '€')}. Rechne den Rabatt in Euro aus.` },
    ], low, DECIMALS),
    praise: 'Du hast beide Rabatte in Euro verglichen.',
  };
};

const FORMS: Record<1 | 2 | 3, Record<Ab, Form[]>> = {
  1: {
    1: [direct(S1_WAYS, S1_RANGE, 'direkt')],
    2: [story(S1_WAYS, S1_RANGE, 'story'), restStory(S1_WAYS, S1_RANGE, 'rest')],
    3: [detective(S1_WAYS, S1_RANGE, 'detektiv'), compare(S1_WAYS, S1_RANGE, 'vergleich1')],
  },
  2: {
    1: [direct(S2_WAYS, S2_RANGE, 'direkt2')],
    2: [story(S2_WAYS, S2_RANGE, 'story2'), restStory(S2_WAYS, S2_RANGE, 'rest2')],
    3: [compare(S2_WAYS, S2_RANGE, 'vergleich2'), fivePercentCents, detective(S2_WAYS, S2_RANGE, 'detektiv2')],
  },
  3: {
    1: [anyPercent, discountAmount],
    2: [newPrice],
    3: [twoShops, rabattDetektiv],
  },
};

export const prozentwertSkill: SkillDef = {
  id: 'prozent.prozentwert',
  topicId: 'prozent',
  title: 'Prozent von einer Größe',
  description: 'Du rechnest aus, wie viel ein Prozentsatz vom Ganzen ist.',
  stufen: {
    1: '50 %, 25 % und 10 % von Größen bis 200',
    2: '5 %, 20 % und 75 % von Größen bis 500',
    3: 'Jeder ganze Prozentsatz, Rabatt und neuer Preis',
  },
  keys: { comma: true },
  kmk: KMK,
  generate: fromForms('prozent.prozentwert', KMK, FORMS),
};
