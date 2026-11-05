/**
 * Spannweite und Median.
 * Stufe 1: Minimum and Maximum of at most 8 values.
 * Stufe 2: Spannweite of unsorted values.
 * Stufe 3: Median of an odd number of values.
 */
import { fmt } from '../../core/format';
import type { Ab, Exercise, Rng, SkillDef, Stufe, Visual, VisualOf } from '../../core/types';
import { build, makeChoice, PEOPLE, targetAb } from '../shared';
import { say, sum, tableWords, typeableBugs } from './shared';

const SKILL = { id: 'daten.kennwerte', topicId: 'daten' } as const;
const KMK = ['DZ.kennwerte'];

interface Measure {
  id: string;
  caption: string;
  column: string;
  unit: string;
  /** Smallest and largest value of the easier and the harder numbers. */
  small: readonly [number, number];
  large: readonly [number, number];
}

const MEASURES: readonly Measure[] = [
  { id: 'seil', caption: 'Seilspringen in 2 Minuten', column: 'Sprünge', unit: 'Sprünge', small: [20, 60], large: [110, 190] },
  { id: 'sportfest', caption: 'Punkte beim Sportfest', column: 'Punkte', unit: 'Punkte', small: [20, 60], large: [210, 390] },
  { id: 'karten', caption: 'Gesammelte Karten', column: 'Karten', unit: 'Karten', small: [10, 50], large: [120, 210] },
  { id: 'seiten', caption: 'Gelesene Seiten im Monat', column: 'Seiten', unit: 'Seiten', small: [10, 60], large: [110, 290] },
  { id: 'rad', caption: 'Strecke mit dem Rad im Monat', column: 'km', unit: 'km', small: [12, 58], large: [105, 340] },
];

/** n distinct values in a range, in random order. */
function distinct(rng: Rng, n: number, [min, max]: readonly [number, number]): number[] {
  const all = Array.from({ length: max - min + 1 }, (_, i) => min + i);
  return rng.sample(all, n);
}

function listTable(rng: Rng, m: Measure, values: readonly number[]): { visual: VisualOf<'table'>; names: string[] } {
  const names = rng.sample(PEOPLE, values.length).map((p) => p.name);
  return { visual: { type: 'table', caption: m.caption, header: ['Name', m.column], rows: values.map((v, i) => [names[i], fmt(v)]) }, names };
}

const asc = (values: readonly number[]) => [...values].sort((a, b) => a - b);
const listOf = (values: readonly number[]) => values.map((v) => fmt(v)).join(', ');

// ─── Stufe 1: Minimum and Maximum ────────────────────────────────────────────

function extreme(rng: Rng, ab: Ab, n: number, range: 'small' | 'large'): Exercise {
  const m = rng.pick(MEASURES);
  // the list never starts with the extreme, so the first row is no shortcut
  let values = distinct(rng, n, m[range]);
  const wantMax = rng.chance(0.5);
  const target = wantMax ? Math.max(...values) : Math.min(...values);
  const other = wantMax ? Math.min(...values) : Math.max(...values);
  if (values[0] === target) values = [...values.slice(1), values[0]];
  const { visual } = listTable(rng, m, values);
  const name = wantMax ? 'Maximum' : 'Minimum';
  const word = wantMax ? 'größte' : 'kleinste';
  const prompt = `Wie groß ist das ${name}?`;
  return build(SKILL, 1, {
    key: `${wantMax ? 'max' : 'min'}:${m.id}:${values.join('-')}`,
    ab,
    prompt,
    visual,
    answer: { kind: 'number', value: target, unit: m.unit },
    hints: [`Das ${name} ist der ${word} Wert.`, 'Geh die Liste von oben nach unten durch.'],
    steps: [`Das ${name} ist der ${word} Wert.`, `Geordnet: ${listOf(asc(values))}.`, `Das ${name} ist ${fmt(target)} ${m.unit}.`],
    bugs: typeableBugs([{ id: 'min-max-verwechselt', match: other, hint: `Das ist der andere Rand. Das ${name} ist der ${word} Wert.` }, { id: 'erster-wert', match: values[0], hint: 'Das ist nur der erste Wert. Schau dir alle Werte an.' }], target),
    praise: `Du hast alle Werte verglichen und den ${word}n gefunden.`,
    srText: say([prompt]),
    kmk: KMK,
  });
}

function whoHasExtreme(rng: Rng, ab: Ab): Exercise {
  const m = rng.pick(MEASURES);
  const values = distinct(rng, 8, m.large);
  const { visual, names } = listTable(rng, m, values);
  const wantMax = rng.chance(0.5);
  const target = wantMax ? Math.max(...values) : Math.min(...values);
  const name = wantMax ? 'Maximum' : 'Minimum';
  const i = values.indexOf(target);
  const prompt = `Wer hat das ${name}?`;
  const answer = makeChoice(rng, { label: names[i] }, rng.shuffle(names.flatMap((n, k) => (k === i ? [] : [{ label: n, whyWrong: `Dort steht ${fmt(values[k])}. Vergleiche alle Werte.` }]))), { max: 4 });
  return build(SKILL, 1, {
    key: `wer:${m.id}:${values.join('-')}:${wantMax}`,
    ab,
    prompt,
    visual,
    answer,
    hints: [`Das ${name} ist der ${wantMax ? 'größte' : 'kleinste'} Wert.`, 'Die Zahlen liegen nah beieinander. Vergleiche Stelle für Stelle.'],
    steps: [`Geordnet: ${listOf(asc(values))}.`, `Das ${name} ist ${fmt(target)} ${m.unit}.`, `Das gehört zu ${names[i]}.`],
    praise: 'Du hast Stelle für Stelle verglichen.',
    srText: say([prompt], answer),
    kmk: KMK,
  });
}

function extremeWithNew(rng: Rng, ab: Ab): Exercise {
  const m = rng.pick(MEASURES);
  const values = distinct(rng, 6, m.small);
  const { visual, names } = listTable(rng, m, values);
  const wantMax = rng.chance(0.5);
  const old = wantMax ? Math.max(...values) : Math.min(...values);
  // the new value beats the old extreme in about half of the items
  const beats = rng.chance(0.5);
  const offset = rng.int(1, 9);
  // never 1: the sentence 'Das Minimum ist jetzt …' has a plural unit
  let extra = wantMax ? (beats ? old + offset : old - offset) : beats ? Math.max(2, old - offset) : old + offset;
  if (values.includes(extra)) extra = wantMax ? old + offset : Math.max(2, old - offset);
  const value = wantMax ? Math.max(old, extra) : Math.min(old, extra);
  const name = wantMax ? 'Maximum' : 'Minimum';
  // who comes along is not in the table yet: one person has one value
  const person = rng.pick(PEOPLE.filter((p) => !names.includes(p.name)));
  const context = `${person.name} kommt mit dem Wert ${fmt(extra)} dazu.`;
  const prompt = `Wie groß ist das ${name} jetzt?`;
  return build(SKILL, 1, {
    key: `dazu:${wantMax ? 'max' : 'min'}:${m.id}:${values.join('-')}:${extra}:${person.name}`,
    ab,
    context,
    prompt,
    visual,
    answer: { kind: 'number', value, unit: m.unit },
    hints: [`Such zuerst das ${name} der Liste.`, `Vergleiche dann mit dem neuen Wert ${fmt(extra)}.`],
    steps: [`${name} der Liste: ${fmt(old)}.`, `Neuer Wert: ${fmt(extra)}.`, `Das ${name} ist jetzt ${fmt(value)} ${m.unit}.`],
    bugs: typeableBugs([{ id: 'alter-rand', match: old, hint: 'Das ist der alte Wert. Vergleiche noch mit dem neuen Wert.' }, { id: 'neuer-wert', match: extra, hint: 'Der neue Wert allein reicht nicht. Vergleiche mit der Liste.' }], value),
    praise: 'Du hast den neuen Wert mit dem alten Rand verglichen.',
    srText: say([context, prompt]),
    kmk: [...KMK, 'PK.argumentieren'],
  });
}

// ─── Stufe 2: Spannweite, unsorted ───────────────────────────────────────────

const SPAN_HINT = 'Spannweite heißt: größter Wert minus kleinster Wert.';

function span(rng: Rng, ab: Ab, n: number, range: 'small' | 'large'): Exercise {
  const m = rng.pick(MEASURES);
  let values = distinct(rng, n, m[range]);
  // first and last are not the extremes: the list is really unsorted
  const hi = Math.max(...values);
  const lo = Math.min(...values);
  const inner = values.filter((v) => v !== hi && v !== lo);
  values = [inner[0], ...rng.shuffle([hi, lo, ...inner.slice(2)]), inner[1]];
  const value = hi - lo;
  const { visual } = listTable(rng, m, values);
  const prompt = 'Wie groß ist die Spannweite der Werte?';
  return build(SKILL, 2, {
    key: `spannweite:${m.id}:${values.join('-')}`,
    ab,
    prompt,
    visual,
    answer: { kind: 'number', value, unit: m.unit },
    hints: ['Die Werte sind nicht geordnet. Such den größten und den kleinsten.', SPAN_HINT],
    steps: [`Größter Wert: ${fmt(hi)}. Kleinster Wert: ${fmt(lo)}.`, `${fmt(hi)} − ${fmt(lo)} = ${fmt(value)}`, `Die Spannweite ist ${fmt(value)} ${m.unit}.`],
    bugs: typeableBugs(
      [
        { id: 'spannweite-erster-letzter', match: Math.abs(values[0] - values[values.length - 1]), hint: 'Das sind der erste und der letzte Wert. Such den größten und den kleinsten.' },
        { id: 'spannweite-maximum', match: hi, hint: `Das ist nur der größte Wert. ${SPAN_HINT}` },
        { id: 'spannweite-summe', match: hi + lo, hint: 'Du hast addiert. Die Spannweite ist ein Abstand: Rechne minus.' },
      ],
      value,
    ),
    praise: 'Du hast beide Ränder gefunden und den Abstand gerechnet.',
    srText: say([prompt]),
    kmk: KMK,
  });
}

function spanBackwards(rng: Rng, ab: Ab): Exercise {
  const m = rng.pick(MEASURES);
  let [lo, hi] = asc(distinct(rng, 2, m.large));
  // two values next to each other are no data set, and '1 Karten' no sentence
  while (hi - lo < 10) [lo, hi] = asc(distinct(rng, 2, m.large));
  const width = hi - lo;
  const knownMax = rng.chance(0.5);
  const context = `Die Spannweite ist ${fmt(width)} ${m.unit}. Der ${knownMax ? 'größte' : 'kleinste'} Wert ist ${fmt(knownMax ? hi : lo)} ${m.unit}.`;
  const prompt = `Wie groß ist der ${knownMax ? 'kleinste' : 'größte'} Wert?`;
  const value = knownMax ? lo : hi;
  return build(SKILL, 2, {
    key: `zurueck:${m.id}:${lo}:${hi}:${knownMax}`,
    ab,
    context,
    prompt,
    answer: { kind: 'number', value, unit: m.unit },
    hints: [SPAN_HINT, knownMax ? 'Rechne vom größten Wert zurück.' : 'Rechne vom kleinsten Wert aus weiter.'],
    steps: [`Größter Wert − kleinster Wert = ${fmt(width)}`, knownMax ? `${fmt(hi)} − ${fmt(width)} = ${fmt(lo)}` : `${fmt(lo)} + ${fmt(width)} = ${fmt(hi)}`, `Der gesuchte Wert ist ${fmt(value)} ${m.unit}.`],
    bugs: typeableBugs([{ id: 'spannweite-richtung', match: knownMax ? hi + width : Math.abs(lo - width), hint: knownMax ? 'Der gesuchte Wert ist kleiner als der größte. Rechne minus.' : 'Der gesuchte Wert ist größer als der kleinste. Rechne plus.' }], value),
    praise: 'Du hast aus der Spannweite den fehlenden Wert berechnet.',
    srText: say([context, prompt]),
    kmk: [...KMK, 'PK.problemloesen'],
  });
}

function compareSpans(rng: Rng, ab: Ab): Exercise {
  const m = rng.pick(MEASURES);
  const n = 5;
  const a = distinct(rng, n, m.large);
  const shift = rng.int(10, 40);
  // Gruppe B: the larger maximum and the smaller Spannweite (or the same Spannweite), so that looking at the maximum alone misleads
  const spreadB = rng.chance(0.25) ? Math.max(...a) - Math.min(...a) : Math.max(5, Math.floor((Math.max(...a) - Math.min(...a)) / 2));
  const loB = Math.max(...a) + shift - spreadB;
  const b = [loB, loB + spreadB, ...distinct(rng, 3, [loB + 1, Math.max(loB + 3, loB + spreadB - 1)])];
  const shuffled = rng.shuffle(b);
  // either column can hold the group with the larger maximum
  const [columnA, columnB] = rng.chance(0.5) ? [a, shuffled] : [shuffled, a];
  const spanOf = (values: number[]) => Math.max(...values) - Math.min(...values);
  const visual: Visual = { type: 'table', caption: m.caption, header: ['Gruppe A', 'Gruppe B'], rows: columnA.map((v, i) => [fmt(v), fmt(columnB[i])]) };
  const labels = ['Gruppe A', 'Gruppe B', 'Beide gleich'];
  const correct = spanOf(columnA) > spanOf(columnB) ? labels[0] : spanOf(columnB) > spanOf(columnA) ? labels[1] : labels[2];
  const maxWhy = 'Der größte Wert allein reicht nicht. Rechne auch den Abstand zum kleinsten.';
  const whys: Record<string, string> = {
    'Gruppe A': Math.max(...columnA) > Math.max(...columnB) ? maxWhy : 'Rechne für beide Gruppen: größter Wert minus kleinster Wert.',
    'Gruppe B': Math.max(...columnB) > Math.max(...columnA) ? maxWhy : 'Rechne für beide Gruppen: größter Wert minus kleinster Wert.',
    'Beide gleich': 'Rechne beide Spannweiten aus und vergleiche.',
  };
  const answer = makeChoice(rng, { label: correct }, labels.filter((l) => l !== correct).map((l) => ({ label: l, whyWrong: whys[l] })), { order: labels });
  const prompt = 'Welche Gruppe hat die größere Spannweite?';
  return build(SKILL, 2, {
    key: `vergleich:${m.id}:${columnA.join('-')}:${columnB.join('-')}`,
    ab,
    prompt,
    visual,
    answer,
    hints: [SPAN_HINT, 'Rechne die Spannweite für jede Gruppe einzeln aus.'],
    steps: [`Gruppe A: ${fmt(Math.max(...columnA))} − ${fmt(Math.min(...columnA))} = ${fmt(spanOf(columnA))}`, `Gruppe B: ${fmt(Math.max(...columnB))} − ${fmt(Math.min(...columnB))} = ${fmt(spanOf(columnB))}`, `Die Antwort: ${correct}.`],
    praise: 'Du hast beide Spannweiten berechnet und verglichen.',
    srText: say([prompt], answer),
    kmk: [...KMK, 'PK.argumentieren'],
  });
}

// ─── Stufe 3: Median, odd number of values ───────────────────────────────────

const ORDER_HINT = 'Ordne die Werte zuerst der Größe nach.';

/** Values whose middle in the shown order is not the Median. */
function unsortedOdd(rng: Rng, n: number, range: readonly [number, number]): number[] {
  const values = distinct(rng, n, range);
  const median = asc(values)[(n - 1) / 2];
  const mid = (n - 1) / 2;
  if (values[mid] !== median) return values;
  const other = mid === 0 ? 1 : 0;
  const copy = [...values];
  [copy[mid], copy[other]] = [copy[other], copy[mid]];
  return copy;
}

function median(rng: Rng, ab: Ab, n: number, range: 'small' | 'large'): Exercise {
  const m = rng.pick(MEASURES);
  const values = unsortedOdd(rng, n, m[range]);
  const sorted = asc(values);
  const mid = (n - 1) / 2;
  const value = sorted[mid];
  const { visual } = listTable(rng, m, values);
  const prompt = 'Wie groß ist der Median der Werte?';
  const mean = sum(values) / n;
  return build(SKILL, 3, {
    key: `median:${m.id}:${values.join('-')}`,
    ab,
    prompt,
    visual,
    answer: { kind: 'number', value, unit: m.unit },
    hints: [ORDER_HINT, 'Der Median steht genau in der Mitte der geordneten Liste.'],
    steps: [`Geordnet: ${listOf(sorted)}.`, `Bei ${fmt(n)} Werten steht der Median an Stelle ${fmt(mid + 1)}.`, `Der Median ist ${fmt(value)} ${m.unit}.`],
    bugs: typeableBugs(
      [
        { id: 'median-ungeordnet', match: values[mid], hint: ORDER_HINT },
        Number.isInteger(mean) && { id: 'median-mittelwert', match: mean, hint: 'Das ist der Mittelwert. Der Median ist der Wert in der Mitte.' },
        { id: 'median-stelle', match: mid + 1, hint: 'Das ist die Stelle in der Liste. Gefragt ist der Wert an dieser Stelle.' },
      ],
      value,
    ),
    praise: 'Du hast zuerst geordnet und dann die Mitte gefunden.',
    srText: say([prompt]),
    kmk: KMK,
  });
}

/** One person gets another value: which change leaves the Median where it is, or moves it? The data decide, so every child orders the values. */
function medianAfterChange(rng: Rng, ab: Ab): Exercise {
  const m = rng.pick(MEASURES);
  const values = distinct(rng, 5, m.small);
  const sorted = asc(values);
  const med = sorted[2];
  const { visual, names } = listTable(rng, m, values);
  const below = () => rng.pick(Array.from({ length: med - 1 }, (_, i) => i + 1).filter((x) => x >= sorted[0] - 9 && !values.includes(x)));
  const above = () => rng.pick(Array.from({ length: 60 }, (_, i) => sorted[4] - 9 + i).filter((x) => x > med && !values.includes(x)));
  // a value that stays on its side of the middle leaves the Median alone; one that crosses it moves the Median
  const staying = (v: number) => (v < med ? below() : above());
  const crossing = (v: number) => (v > med ? below() : above());
  const after = (v: number, w: number) => asc(values.map((x) => (x === v ? w : x)));
  const option = (v: number, w: number) => ({ v, w, label: `${names[values.indexOf(v)]} hat ${fmt(w)} statt ${fmt(v)}.` });
  const sides = rng.shuffle(values.filter((v) => v !== med));
  const wantStay = rng.chance(0.5);
  const right = wantStay ? option(sides[0], staying(sides[0])) : (() => { const v = rng.pick(values); return option(v, crossing(v)); })();
  const rest = rng.shuffle(values.filter((v) => v !== right.v));
  const wrongs = (wantStay ? rest : rest.filter((v) => v !== med)).slice(0, 3).map((v) => {
    if (wantStay) {
      const moved = option(v, crossing(v));
      return { label: moved.label, whyWrong: `Ordne die Werte neu. Dann ist der Median ${fmt(after(moved.v, moved.w)[2])}.` };
    }
    return { label: option(v, staying(v)).label, whyWrong: `Der Wert bleibt auf seiner Seite der Mitte. Der Median bleibt ${fmt(med)}.` };
  });
  const answer = makeChoice(rng, { label: right.label }, wrongs);
  const context = 'Eine Person hat jetzt einen anderen Wert.';
  const prompt = wantStay ? 'Welche Änderung lässt den Median gleich?' : 'Welche Änderung verschiebt den Median?';
  const changed = after(right.v, right.w);
  return build(SKILL, 3, {
    key: `stabil:${m.id}:${values.join('-')}:${wantStay}:${right.v}:${right.w}`,
    ab,
    context,
    prompt,
    visual,
    answer,
    hints: [ORDER_HINT, 'Prüfe bei jeder Änderung: Bleibt der Wert auf seiner Seite der Mitte?'],
    steps: [`Geordnet: ${listOf(sorted)}. Mitte: ${fmt(med)}.`, `Nach dieser Änderung: ${listOf(changed)}. Mitte: ${fmt(changed[2])}.`, `Die Antwort: ${right.label}`],
    praise: 'Du hast jede Änderung an der Mitte geprüft.',
    srText: say([context, prompt, tableWords(visual)], answer),
    kmk: [...KMK, 'PK.argumentieren'],
  });
}

export const kennwerteSkill: SkillDef = {
  ...SKILL,
  title: 'Spannweite und Median',
  description: 'Du findest kleinsten und größten Wert, Spannweite und Median.',
  stufen: {
    1: 'Minimum und Maximum, höchstens 8 Werte',
    2: 'Spannweite bei ungeordneten Werten',
    3: 'Median bei einer ungeraden Anzahl von Werten',
  },
  kmk: KMK,
  generate(rng, stufe: Stufe, ctx) {
    const ab = targetAb(rng, stufe, ctx);
    if (stufe === 1) {
      if (ab === 1) return extreme(rng, ab, rng.int(5, 6), 'small');
      if (ab === 2) return rng.chance(0.5) ? extreme(rng, ab, rng.int(7, 8), 'large') : whoHasExtreme(rng, ab);
      return extremeWithNew(rng, ab);
    }
    if (stufe === 2) {
      if (ab === 1) return span(rng, ab, rng.int(5, 6), 'small');
      if (ab === 2) return span(rng, ab, rng.int(7, 8), 'large');
      return rng.chance(0.5) ? spanBackwards(rng, ab) : compareSpans(rng, ab);
    }
    if (ab === 1) return median(rng, ab, 5, 'small');
    if (ab === 2) return median(rng, ab, 7, 'large');
    return rng.chance(0.5) ? medianAfterChange(rng, ab) : median(rng, ab, 9, 'large');
  },
};
