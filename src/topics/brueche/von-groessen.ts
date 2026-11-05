/**
 * Bruchteile von Größen: from the whole to the part, and back from the part to the whole.
 * Stufe 1 (1/n of up to 60, exact, € or cm): AB I calculate with a bar, AB II a story, AB III what remains, or which of two shares is more.
 * Stufe 2 (a/b of up to 120, g, m, min): AB I calculate with a bar, AB II a story, AB III what remains, or which of two shares is more.
 * Stufe 3 (from the part to the Ganzes, 3/4 sind 12 €): AB I with a bar, AB II a story, AB III what remains, or another share of the same Ganzes.
 */
import { frac } from '../../core/format';
import type { Bug, ChoiceOption, Rng, SkillDef } from '../../core/types';
import { build, makeChoice, numberBugs, pickPerson } from '../shared';
import { byStufeAndAb, gcd, lcm, range, speak, type Form, type Frac } from './helpers';

const SKILL = { id: 'brueche.von-groessen', topicId: 'brueche' } as const;
const KMK = ['ZO.bruch-bedeutung', 'GM.einheiten'];
const KMK_STORY = [...KMK, 'PK.modellieren'];

const bar = (parts: number, filled: number) => ({ type: 'fractionModel', form: 'bar', parts, filled } as const);

// ─── Stufe 1: 1/n ────────────────────────────────────────────────────────────

const UNIT_NENNER = [2, 3, 4, 5, 6, 8, 10];

/** n and a total up to 60 that it divides. A story sets the smallest total and part that make sense in it. */
function unitTask(rng: Rng, minN = 2, minTotal = 0, minPart = 2): { n: number; total: number; part: number } {
  const n = rng.pick(UNIT_NENNER.filter((x) => x >= minN));
  const part = rng.int(Math.max(minPart, Math.ceil(minTotal / n)), Math.floor(60 / n));
  return { n, total: part * n, part };
}

const unitBugs = (n: number, total: number, part: number, unit: string): Bug[] => numberBugs([
  { id: 'nenner-mal', match: total * n, hint: `Ein Teil ist kleiner als das Ganze. Teile ${total} ${unit} durch ${n}.` },
  { id: 'nenner-abgezogen', match: total - n, hint: 'Teile durch den Nenner. Zieh den Nenner nicht ab.' },
  { id: 'rest-statt-teil', match: total - part, hint: 'Das ist der Rest. Gefragt ist der Teil.' },
], part);

/** Stufe 1, AB I. */
const unitPlain: Form = (rng, stufe, ab) => {
  const { n, total, part } = unitTask(rng);
  const unit = rng.pick(['€', 'cm'] as const);
  const prompt = `Berechne ${frac(1, n)} von ${total} ${unit}.`;
  return build(SKILL, stufe, {
    key: `eins:${n}:${total}:${unit}`,
    ab,
    prompt,
    visual: bar(n, 1),
    answer: { kind: 'number', value: part, unit },
    hints: [`Das Ganze hat ${n} gleich große Teile.`, `Teile ${total} ${unit} durch ${n}.`],
    steps: [`${frac(1, n)} heißt: durch ${n} teilen.`, `${total} ${unit} : ${n} = ${part} ${unit}`],
    bugs: unitBugs(n, total, part, unit),
    praise: 'Du hast das Ganze durch den Nenner geteilt.',
    srText: speak(prompt),
    kmk: KMK,
  });
};

/** A story with 1/n, with a question for the part and one for what remains. minTotal, minPart: below these the story stops making sense (a book for 2 €, a rope of 8 cm). */
const UNIT_STORIES: readonly { unit: '€' | 'cm'; minTotal: number; minPart: number; text: (name: string, total: number, f: string) => string; part: string; rest: string }[] = [
  { unit: '€', minTotal: 20, minPart: 5, text: (name, total, f) => `${name} hat ${total} € gespart. ${name} gibt ${f} davon für ein Buch aus.`, part: 'Wie viel kostet das Buch?', rest: 'Wie viel Geld bleibt übrig?' },
  { unit: '€', minTotal: 20, minPart: 2, text: (_name, total, f) => `Die Klasse 6a hat ${total} € in der Kasse. Für Bastelpapier gibt die Klasse ${f} davon aus.`, part: 'Wie viel kostet das Bastelpapier?', rest: 'Wie viel Geld bleibt in der Kasse?' },
  { unit: 'cm', minTotal: 30, minPart: 3, text: (name, total, f) => `Ein Seil ist ${total} cm lang. ${name} schneidet ${f} davon ab.`, part: 'Wie lang ist das Stück?', rest: 'Wie lang ist das restliche Seil?' },
  { unit: 'cm', minTotal: 30, minPart: 3, text: (name, total, f) => `Ein Brett ist ${total} cm lang. ${name} sägt ${f} davon ab.`, part: 'Wie lang ist das Stück?', rest: 'Wie lang ist das restliche Brett?' },
];

/** Stufe 1, AB II. */
const unitStory: Form = (rng, stufe, ab) => {
  const story = rng.pick(UNIT_STORIES);
  const { n, total, part } = unitTask(rng, 2, story.minTotal, story.minPart);
  const context = story.text(pickPerson(rng).name, total, frac(1, n));
  return build(SKILL, stufe, {
    key: `eins-text:${UNIT_STORIES.indexOf(story)}:${n}:${total}`,
    ab,
    context,
    prompt: story.part,
    answer: { kind: 'number', value: part, unit: story.unit },
    hints: ['Das Ganze steht im ersten Satz.', `Teile das Ganze durch ${n}.`],
    steps: [`${frac(1, n)} heißt: durch ${n} teilen.`, `${total} ${story.unit} : ${n} = ${part} ${story.unit}`],
    bugs: unitBugs(n, total, part, story.unit),
    praise: 'Du hast den Bruchteil aus dem Text herausgelesen.',
    srText: speak(`${context} ${story.part}`),
    kmk: KMK_STORY,
  });
};

/** Stufe 1, AB III: what remains. */
const unitRest: Form = (rng, stufe, ab) => {
  const story = rng.pick(UNIT_STORIES);
  const { n, total, part } = unitTask(rng, 3, story.minTotal, story.minPart);
  const context = story.text(pickPerson(rng).name, total, frac(1, n));
  const rest = total - part;
  return build(SKILL, stufe, {
    key: `eins-rest:${UNIT_STORIES.indexOf(story)}:${n}:${total}`,
    ab,
    context,
    prompt: story.rest,
    answer: { kind: 'number', value: rest, unit: story.unit },
    hints: ['Gefragt ist nicht der Teil, sondern der Rest.', `Rechne zuerst den Teil aus: durch ${n}.`],
    steps: [`${frac(1, n)} von ${total} ${story.unit}: ${total} ${story.unit} : ${n} = ${part} ${story.unit}`, `Rest: ${total} ${story.unit} − ${part} ${story.unit} = ${rest} ${story.unit}`],
    bugs: numberBugs([
      { id: 'teil-statt-rest', match: part, hint: 'Das ist der Teil. Gefragt ist der Rest.' },
      { id: 'nenner-abgezogen', match: total - n, hint: 'Teile durch den Nenner. Zieh den Nenner nicht ab.' },
    ], rest),
    praise: 'Du hast den Teil vom Ganzen abgezogen.',
    srText: speak(`${context} ${story.rest}`),
    kmk: KMK_STORY,
  });
};

/** Two shares of different totals: which is more? Never equal. */
function compareShares(pair: (rng: Rng) => [Frac, number, Frac, number], unit: string, key: string): Form {
  return (rng, stufe, ab) => {
    let [a, x, b, y] = pair(rng);
    for (let i = 0; i < 20 && (a[0] * x) / a[1] === (b[0] * y) / b[1]; i++) [a, x, b, y] = pair(rng);
    const valueA = (a[0] * x) / a[1];
    const valueB = (b[0] * y) / b[1];
    const [more, less] = valueA > valueB ? [[a, x], [b, y]] as const : [[b, y], [a, x]] as const;
    const label = ([f, total]: readonly [Frac, number]) => `${frac(f[0], f[1])} von ${total} ${unit}`;
    const wrong: ChoiceOption = { label: label(less), whyWrong: 'Rechne beide Bruchteile aus. Vergleiche erst dann.' };
    const equal: ChoiceOption = { label: 'Beide sind gleich viel.', whyWrong: 'Rechne beide Bruchteile aus. Die Ergebnisse sind verschieden.' };
    const prompt = 'Welcher Bruchteil ist mehr?';
    return build(SKILL, stufe, {
      key: `${key}:${[label([a, x]), label([b, y])].sort().join('|')}`,
      ab,
      prompt,
      answer: makeChoice(rng, { label: label(more) }, [wrong, equal]),
      hints: ['Rechne jeden Bruchteil einzeln aus.', 'Ein größerer Bruch allein sagt noch nichts. Das Ganze zählt auch.'],
      steps: [`${label([a, x])}: ${valueA} ${unit}`, `${label([b, y])}: ${valueB} ${unit}`, `Mehr ist ${label(more)}.`],
      praise: 'Du hast beide Bruchteile ausgerechnet.',
      srText: speak(prompt),
      kmk: [...KMK, 'PK.argumentieren'],
    });
  };
}

const unitCompare = compareShares((rng) => {
  const a = unitTask(rng);
  const b = unitTask(rng);
  return [[1, a.n], a.total, [1, b.n], b.total];
}, '€', 'eins-vergleich');

// ─── Stufe 2: a/b ────────────────────────────────────────────────────────────

const SHARES: readonly Frac[] = [3, 4, 5, 6, 8, 10].flatMap((b) => range(2, b - 1).filter((a) => gcd(a, b) === 1).map((a): Frac => [a, b]));

/** a/b and a total up to 120 that b divides. A story sets the smallest total that makes sense in it. */
function shareTask(rng: Rng, minTotal = 0): { a: number; b: number; total: number; one: number; part: number } {
  const [a, b] = rng.pick(SHARES);
  const one = rng.int(Math.max(2, Math.ceil(minTotal / b)), Math.floor(120 / b));
  return { a, b, total: one * b, one, part: one * a };
}

const shareBugs = (a: number, b: number, total: number, one: number, part: number): Bug[] => numberBugs([
  { id: 'nur-nenner', match: one, hint: `Das ist erst ${frac(1, b)}. Nimm das Ergebnis noch mal ${a}.` },
  { id: 'nur-zaehler', match: total * a, hint: `Teile auch durch den Nenner ${b}.` },
  total % a === 0 && { id: 'zaehler-nenner-getauscht', match: (total / a) * b, hint: 'Teile durch den Nenner. Nimm dann mal den Zähler.' },
  { id: 'rest-statt-teil', match: total - part, hint: 'Das ist der Rest. Gefragt ist der Teil.' },
], part);

const UNITS_S2 = ['g', 'm', 'min'] as const;

/** Stufe 2, AB I. */
const sharePlain: Form = (rng, stufe, ab) => {
  const { a, b, total, one, part } = shareTask(rng);
  const unit = rng.pick(UNITS_S2);
  const prompt = `Berechne ${frac(a, b)} von ${total} ${unit}.`;
  return build(SKILL, stufe, {
    key: `teil:${a}/${b}:${total}:${unit}`,
    ab,
    prompt,
    visual: bar(b, a),
    answer: { kind: 'number', value: part, unit },
    hints: [`Rechne zuerst ${frac(1, b)}: durch ${b}.`, `Nimm das Ergebnis dann mal ${a}.`],
    steps: [`${frac(1, b)} von ${total} ${unit}: ${total} ${unit} : ${b} = ${one} ${unit}`, `${frac(a, b)} von ${total} ${unit}: ${a} · ${one} ${unit} = ${part} ${unit}`],
    bugs: shareBugs(a, b, total, one, part),
    praise: 'Du hast erst durch den Nenner geteilt, dann malgenommen.',
    srText: speak(prompt),
    kmk: KMK,
  });
};

/** The catalogue keeps these totals up to 120, so each story is one of that size: a bag of nuts, not a bag of flour; a run on the Schulhof, not a lap of a Sportplatz. */
const SHARE_STORIES: readonly { unit: 'g' | 'm' | 'min'; minTotal: number; text: (name: string, total: number, f: string) => string; part: (name: string) => string; rest: (name: string) => string }[] = [
  { unit: 'g', minTotal: 60, text: (name, total, f) => `In der Tüte sind ${total} g Nüsse. ${name} braucht ${f} davon für einen Kuchen.`, part: () => 'Wie viel Gramm Nüsse sind das?', rest: () => 'Wie viel Gramm Nüsse bleiben übrig?' },
  { unit: 'm', minTotal: 50, text: (name, total, f) => `Die Laufstrecke auf dem Schulhof ist ${total} m lang. ${name} läuft ${f} der Strecke.`, part: (name) => `Wie viele Meter läuft ${name}?`, rest: () => 'Wie viele Meter fehlen noch bis zum Ziel?' },
  { unit: 'min', minTotal: 60, text: (name, total, f) => `Der Film dauert ${total} min. ${name} sieht heute ${f} davon.`, part: (name) => `Wie viele Minuten sieht ${name} heute?`, rest: () => 'Wie viele Minuten bleiben für morgen?' },
  { unit: 'min', minTotal: 30, text: (name, total, f) => `Das Training dauert ${total} min. ${name} läuft ${f} der Zeit.`, part: (name) => `Wie viele Minuten läuft ${name}?`, rest: () => 'Wie viele Minuten bleiben für den Rest?' },
];

/** Stufe 2, AB II. */
const shareStory: Form = (rng, stufe, ab) => {
  const story = rng.pick(SHARE_STORIES);
  const { a, b, total, one, part } = shareTask(rng, story.minTotal);
  const name = pickPerson(rng).name;
  const context = story.text(name, total, frac(a, b));
  const prompt = story.part(name);
  return build(SKILL, stufe, {
    key: `teil-text:${SHARE_STORIES.indexOf(story)}:${a}/${b}:${total}`,
    ab,
    context,
    prompt,
    answer: { kind: 'number', value: part, unit: story.unit },
    hints: ['Das Ganze steht im ersten Satz.', `Teile durch ${b}. Nimm dann mal ${a}.`],
    steps: [`${frac(1, b)}: ${total} ${story.unit} : ${b} = ${one} ${story.unit}`, `${frac(a, b)}: ${a} · ${one} ${story.unit} = ${part} ${story.unit}`],
    bugs: shareBugs(a, b, total, one, part),
    praise: 'Du hast Teil und Ganzes im Text gefunden.',
    srText: speak(`${context} ${prompt}`),
    kmk: KMK_STORY,
  });
};

/** Stufe 2, AB III: what remains. */
const shareRest: Form = (rng, stufe, ab) => {
  const story = rng.pick(SHARE_STORIES);
  const { a, b, total, one, part } = shareTask(rng, story.minTotal);
  const name = pickPerson(rng).name;
  const context = story.text(name, total, frac(a, b));
  const prompt = story.rest(name);
  const rest = total - part;
  return build(SKILL, stufe, {
    key: `teil-rest:${SHARE_STORIES.indexOf(story)}:${a}/${b}:${total}`,
    ab,
    context,
    prompt,
    answer: { kind: 'number', value: rest, unit: story.unit },
    hints: [`Rest und Teil ergeben zusammen das Ganze: ${frac(b, b)}.`, 'Welcher Bruchteil bleibt übrig? Rechne mit diesem Bruch.'],
    steps: [`Es ${b - a === 1 ? 'bleibt' : 'bleiben'} ${frac(b - a, b)} des Ganzen.`, `${frac(1, b)}: ${total} ${story.unit} : ${b} = ${one} ${story.unit}`, ...(b - a > 1 ? [`${frac(b - a, b)}: ${b - a} · ${one} ${story.unit} = ${rest} ${story.unit}`] : [])],
    bugs: numberBugs([
      { id: 'teil-statt-rest', match: part, hint: 'Das ist der Teil. Gefragt ist der Rest.' },
      { id: 'nur-nenner', match: one, hint: `Das ist erst ${frac(1, b)}. Wie viele solche Teile bleiben?` },
      { id: 'nur-nenner-rest', match: total - one, hint: `Abgezogen sind ${frac(a, b)}, nicht ${frac(1, b)}.` },
    ], rest),
    praise: 'Du hast zuerst den Anteil des Rests bestimmt.',
    srText: speak(`${context} ${prompt}`),
    kmk: KMK_STORY,
  });
};

const shareCompare = compareShares((rng) => {
  const a = shareTask(rng);
  const b = shareTask(rng);
  return [[a.a, a.b], a.total, [b.a, b.b], b.total];
}, 'g', 'teil-vergleich');

// ─── Stufe 3: from the part to the Ganzes ────────────────────────────────────

const WHOLE_SHARES: readonly Frac[] = [[2, 3], [3, 4], [2, 5], [3, 5], [4, 5], [5, 6], [3, 8], [5, 8], [7, 8], [3, 10], [7, 10]];

type WholeTask = { a: number; b: number; k: number; part: number; whole: number };

function wholeTask(rng: Rng, maxWhole: number): WholeTask {
  const [a, b] = rng.pick(WHOLE_SHARES);
  const k = rng.int(2, Math.floor(maxWhole / b));
  return { a, b, k, part: a * k, whole: b * k };
}

/** A share and one of the wholes that make sense in a story. */
function storyWholeTask(rng: Rng, wholes: readonly number[]): WholeTask {
  const [a, b] = rng.pick(WHOLE_SHARES);
  const whole = rng.pick(wholes.filter((w) => w % b === 0 && w >= 2 * b));
  return { a, b, k: whole / b, part: (a * whole) / b, whole };
}

function wholeBugs(a: number, b: number, k: number, part: number, whole: number, unit: string): Bug[] {
  return numberBugs([
    (part * a) % b === 0 && { id: 'anteil-ganzes', match: (part * a) / b, hint: `Gesucht ist das Ganze. Wenn ${frac(a, b)} ${part} ${unit} sind, wie viel ist ${frac(1, b)}?` },
    { id: 'nur-ein-teil', match: k, hint: `Das ist erst ${frac(1, b)}. Das Ganze hat ${b} solche Teile.` },
    { id: 'mal-nenner-ohne-teilen', match: part * b, hint: `Teile zuerst durch den Zähler ${a}. Dann hast du ${frac(1, b)}.` },
    { id: 'differenz-addiert', match: part + (b - a), hint: 'Rechne über einen einzelnen Teil. Addiere nicht den Unterschied von Nenner und Zähler.' },
  ], whole);
}

const AMOUNTS: readonly { unit: '€' | 'm' | 'g' | 'min'; of: string; ask: string; whole: string }[] = [
  { unit: '€', of: 'einem Betrag', ask: 'Wie groß ist der ganze Betrag?', whole: 'des ganzen Betrags' },
  { unit: 'm', of: 'einer Strecke', ask: 'Wie lang ist die ganze Strecke?', whole: 'der ganzen Strecke' },
  { unit: 'g', of: 'einer Menge', ask: 'Wie groß ist die ganze Menge?', whole: 'der ganzen Menge' },
  { unit: 'min', of: 'einer Zeitspanne', ask: 'Wie lang ist die ganze Zeitspanne?', whole: 'der ganzen Zeitspanne' },
];

/** Stufe 3, AB I. */
const wholePlain: Form = (rng, stufe, ab) => {
  const { a, b, k, part, whole } = wholeTask(rng, 120);
  const amount = rng.pick(AMOUNTS);
  const context = `${frac(a, b)} von ${amount.of} sind ${part} ${amount.unit}.`;
  return build(SKILL, stufe, {
    key: `ganzes:${a}/${b}:${k}:${amount.unit}`,
    ab,
    context,
    prompt: amount.ask,
    visual: bar(b, a),
    answer: { kind: 'number', value: whole, unit: amount.unit },
    hints: [`Teile ${part} ${amount.unit} durch ${a}. Dann hast du ${frac(1, b)}.`, `Das Ganze hat ${b} solche Teile.`],
    steps: [`${frac(a, b)} sind ${part} ${amount.unit}.`, `${frac(1, b)}: ${part} ${amount.unit} : ${a} = ${k} ${amount.unit}`, `Das Ganze: ${b} · ${k} ${amount.unit} = ${whole} ${amount.unit}`],
    bugs: wholeBugs(a, b, k, part, whole, amount.unit),
    praise: 'Du bist vom Teil über einen Bruchteil zum Ganzen gegangen.',
    srText: speak(`${context} ${amount.ask}`),
    kmk: KMK,
  });
};

/** wholes: the sizes this Ganzes has in real life: Taschengeld up to 60 €, a Schulweg and a Packung Zucker in steps of 50. */
const WHOLE_STORIES: readonly { unit: '€' | 'm' | 'min' | 'g'; wholes: readonly number[]; text: (name: string, f: string, part: number) => string; whole: string; rest: string }[] = [
  { unit: '€', wholes: range(12, 60), text: (name, f, part) => `${name} gibt ${f} des Taschengelds aus. Das sind ${part} €.`, whole: 'Wie viel Taschengeld ist es insgesamt?', rest: 'Wie viel Taschengeld bleibt übrig?' },
  { unit: 'm', wholes: range(8, 48).map((x) => x * 50), text: (name, f, part) => `${name} fährt mit dem Fahrrad ${f} des Schulwegs. Das sind ${part} m.`, whole: 'Wie lang ist der ganze Schulweg?', rest: 'Wie viele Meter fehlen noch?' },
  { unit: 'min', wholes: range(60, 150), text: (name, f, part) => `${name} sieht ${f} des Films. Das sind ${part} min.`, whole: 'Wie lange dauert der ganze Film?', rest: 'Wie viele Minuten fehlen noch?' },
  { unit: 'g', wholes: range(5, 20).map((x) => x * 50), text: (name, f, part) => `${name} nimmt für einen Kuchen ${f} der Packung Zucker. Das sind ${part} g.`, whole: 'Wie viel Gramm Zucker sind in der ganzen Packung?', rest: 'Wie viel Gramm Zucker bleiben in der Packung?' },
];

/** Stufe 3, AB II. */
const wholeStory: Form = (rng, stufe, ab) => {
  const story = rng.pick(WHOLE_STORIES);
  const { a, b, k, part, whole } = storyWholeTask(rng, story.wholes);
  const context = story.text(pickPerson(rng).name, frac(a, b), part);
  return build(SKILL, stufe, {
    key: `ganzes-text:${story.unit}:${a}/${b}:${k}`,
    ab,
    context,
    prompt: story.whole,
    answer: { kind: 'number', value: whole, unit: story.unit },
    hints: [`Hier ist ${part} der Teil. Gesucht ist das Ganze.`, `Wie viel ist ${frac(1, b)}? Teile dazu durch den Zähler.`],
    steps: [`${frac(a, b)} sind ${part} ${story.unit}.`, `${frac(1, b)}: ${part} ${story.unit} : ${a} = ${k} ${story.unit}`, `Das Ganze: ${b} · ${k} ${story.unit} = ${whole} ${story.unit}`],
    bugs: wholeBugs(a, b, k, part, whole, story.unit),
    praise: 'Du hast erkannt: Die Zahl im Text ist der Teil.',
    srText: speak(`${context} ${story.whole}`),
    kmk: KMK_STORY,
  });
};

/** Stufe 3, AB III: what remains of a Ganzes known only by its part. */
const wholeRest: Form = (rng, stufe, ab) => {
  const story = rng.pick(WHOLE_STORIES);
  const { a, b, k, part, whole } = storyWholeTask(rng, story.wholes);
  const context = story.text(pickPerson(rng).name, frac(a, b), part);
  const rest = whole - part;
  return build(SKILL, stufe, {
    key: `ganzes-rest:${story.unit}:${a}/${b}:${k}`,
    ab,
    context,
    prompt: story.rest,
    answer: { kind: 'number', value: rest, unit: story.unit },
    hints: [`Wie viel ist ${frac(1, b)}? Teile dazu durch den Zähler.`, `Welcher Bruchteil fehlt noch bis ${frac(b, b)}?`],
    steps: [`${frac(1, b)}: ${part} ${story.unit} : ${a} = ${k} ${story.unit}`, `Es ${b - a === 1 ? 'fehlt' : 'fehlen'} ${frac(b - a, b)} des Ganzen.`, `${b - a} · ${k} ${story.unit} = ${rest} ${story.unit}`],
    bugs: numberBugs([
      { id: 'ganzes-statt-rest', match: whole, hint: 'Das ist das Ganze. Gefragt ist nur der Rest.' },
      { id: 'nur-ein-teil', match: k, hint: `Das ist erst ${frac(1, b)}. Wie viele solche Teile fehlen?` },
    ], rest),
    praise: 'Du hast den fehlenden Bruchteil bestimmt.',
    srText: speak(`${context} ${story.rest}`),
    kmk: [...KMK_STORY, 'PK.problemloesen'],
  });
};

/** Stufe 3, AB III: from one share of a Ganzes to another. */
const wholeOther: Form = (rng, stufe, ab) => {
  const [a, b] = rng.pick(WHOLE_SHARES);
  const c = rng.pick([2, 3, 4, 5, 6].filter((x) => x !== b));
  const e = rng.pick(range(1, c - 1).filter((x) => x * b !== a * c && gcd(x, c) === 1));
  const base = lcm(b, c);
  const m = rng.int(1, Math.max(1, Math.floor(240 / base)));
  const whole = base * m;
  const part = (a * whole) / b;
  const amount = rng.pick(AMOUNTS);
  const value = (e * whole) / c;
  const context = `${frac(a, b)} von ${amount.of} sind ${part} ${amount.unit}.`;
  const prompt = `Wie viel ${e === 1 ? 'ist' : 'sind'} ${frac(e, c)} ${amount.whole}?`;
  return build(SKILL, stufe, {
    key: `anderer:${a}/${b}:${e}/${c}:${m}:${amount.unit}`,
    ab,
    context,
    prompt,
    answer: { kind: 'number', value, unit: amount.unit },
    hints: ['Rechne zuerst das Ganze aus.', `Berechne dann ${frac(e, c)} vom Ganzen.`],
    steps: [`${frac(1, b)}: ${part} ${amount.unit} : ${a} = ${whole / b} ${amount.unit}`, `Das Ganze: ${b} · ${whole / b} ${amount.unit} = ${whole} ${amount.unit}`, `${frac(1, c)}: ${whole} ${amount.unit} : ${c} = ${whole / c} ${amount.unit}`, `${frac(e, c)}: ${e} · ${whole / c} ${amount.unit} = ${value} ${amount.unit}`],
    bugs: numberBugs([
      (part * e) % c === 0 && { id: 'vom-teil-gerechnet', match: (part * e) / c, hint: 'Das ist ein Teil vom Teil. Rechne zuerst das Ganze aus.' },
      { id: 'ganzes-statt-rest', match: whole, hint: `Das ist das Ganze. Gefragt ist ${frac(e, c)} davon.` },
    ], value),
    praise: 'Du hast zuerst das Ganze bestimmt.',
    srText: speak(`${context} ${prompt}`),
    kmk: [...KMK, 'PK.problemloesen'],
  });
};

export const vonGroessenSkill: SkillDef = {
  ...SKILL,
  title: 'Bruchteile von Größen',
  description: 'Du rechnest aus, wie viel ein Bruchteil von einer Größe ist.',
  stufen: {
    1: 'Ein Bruchteil von bis zu 60, in € oder cm',
    2: 'Bruchteil von bis zu 120, in g, m, min',
    3: 'Vom Teil zum Ganzen: 3 von 4 Teilen bekannt',
  },
  kmk: KMK,
  generate: byStufeAndAb({
    1: { 1: [unitPlain], 2: [unitStory], 3: [unitRest, unitCompare] },
    2: { 1: [sharePlain], 2: [shareStory], 3: [shareRest, shareCompare] },
    3: { 1: [wholePlain], 2: [wholeStory], 3: [wholeRest, wholeOther] },
  }),
};
