/**
 * Mittelwert.
 * Stufe 1: 3 to 4 values, a whole mean, values up to 50.
 * Stufe 2: 5 to 6 values with a zero, a decimal mean.
 * Stufe 3: a missing value, and the effect of a value far from the others.
 */
import { fmt } from '../../core/format';
import type { Ab, Bug, Exercise, Rng, SkillDef, Stufe, Visual } from '../../core/types';
import { build, makeChoice, targetAb } from '../shared';
import { clean, say, sum, typeableBugs, type BarChart } from './shared';

const SKILL = { id: 'daten.mittelwert', topicId: 'daten' } as const;
const KMK = ['DZ.kennwerte'];

/** Every number field of this skill: the comma key stands for all items (§7.1). Not 2, which means money or metres and shows a whole mean as '21,00'. */
const DECIMALS = 3;

const SUM_FIRST = 'Rechne zuerst die Summe aller Werte aus.';
const DIVIDE = 'Teile die Summe durch die Anzahl aller Werte.';

interface Series {
  id: string;
  caption: string;
  /** The heads of the two table columns. */
  head: string;
  column: string;
  unit: string;
  rows: readonly string[];
}

/** Short names: as the groups of a chart, all its bars fit a 375 px phone. */
const numbered = (word: string) => [1, 2, 3, 4, 5, 6].map((i) => `${word} ${i}`);
const DAYS = numbered('Tag');

const SERIES: readonly Series[] = [
  { id: 'seiten', caption: 'Gelesene Seiten', head: 'Tag', column: 'Seiten', unit: 'Seiten', rows: DAYS },
  { id: 'seil', caption: 'Seilspringen', head: 'Runde', column: 'Sprünge', unit: 'Sprünge', rows: numbered('Runde') },
  { id: 'punkte', caption: 'Punkte im Basketball', head: 'Spiel', column: 'Punkte', unit: 'Punkte', rows: numbered('Spiel') },
  { id: 'rad', caption: 'Strecke mit dem Rad', head: 'Tag', column: 'km', unit: 'km', rows: DAYS },
  { id: 'regen', caption: 'Regen in einer Woche', head: 'Tag', column: 'mm', unit: 'mm', rows: DAYS },
];

const tableOf = (set: Series, values: readonly (number | null)[]): Visual => ({
  type: 'table',
  caption: set.caption,
  header: [set.head, set.column],
  rows: values.map((v, i) => [set.rows[i], v === null ? '□' : fmt(v)]),
});

/** n values in [min, max] whose sum divides by n. A retry keeps the generator pure: only the rng decides. */
function wholeMean(rng: Rng, n: number, min: number, max: number, stepBy = 1): number[] {
  for (;;) {
    const values = Array.from({ length: n }, () => rng.int(Math.ceil(min / stepBy), Math.floor(max / stepBy)) * stepBy);
    if (sum(values) % n === 0 && new Set(values).size > 1) return values;
  }
}

/** A repeated value gives the bug 'häufigster Wert' something to catch; otherwise the largest value. */
function modeOrLargest(values: readonly number[]): { value: number; text: string } {
  const repeated = values.find((v, i) => values.indexOf(v) !== i);
  return repeated !== undefined ? { value: repeated, text: 'Das ist der häufigste Wert. Der Mittelwert verteilt alles gleichmäßig.' } : { value: Math.max(...values), text: 'Das ist der größte Wert. Der Mittelwert verteilt alles gleichmäßig.' };
}

function meanBugs(values: readonly number[], mean: number): Bug[] {
  const total = sum(values);
  const n = values.length;
  const m = modeOrLargest(values);
  const zero = values.includes(0);
  return typeableBugs(
    [
      { id: 'mittel-anzahl', match: total, hint: DIVIDE },
      n > 1 && { id: 'mittel-anzahl', match: clean(total / (n + 1)), hint: 'Zähle die Werte noch einmal. Teile durch die Anzahl aller Werte.' },
      { id: zero ? 'mittel-ohne-null' : 'mittel-anzahl', match: clean(total / (n - 1)), hint: zero ? 'Auch die 0 ist ein Wert. Zähle die 0 mit.' : 'Zähle die Werte noch einmal. Teile durch die Anzahl aller Werte.' },
      { id: 'mittel-groesster-haeufigster', match: m.value, hint: m.text },
    ],
    mean,
    DECIMALS,
  );
}

function meanSteps(values: readonly number[], mean: number, unit: string, chart?: Visual) {
  const total = sum(values);
  return [
    `Summe: ${values.map((v) => fmt(v)).join(' + ')} = ${fmt(total)}`,
    `Anzahl der Werte: ${fmt(values.length)}`,
    `${fmt(total)} : ${fmt(values.length)} = ${fmt(mean)}`,
    chart ? { text: `Der Mittelwert ist ${fmt(mean)} ${unit}.`, visual: chart } : `Der Mittelwert ist ${fmt(mean)} ${unit}.`,
  ];
}

function bars(set: Series, values: readonly number[], step: number): BarChart {
  const axisMax = step * (Math.ceil(Math.max(...values) / step) + 1);
  return { type: 'barChart', title: set.caption, categories: values.map((_, i) => set.rows[i]), values: [...values], axisMax, axisStep: step, valueLabel: set.column };
}

const prompt = 'Wie groß ist der Mittelwert?';

// ─── Stufe 1 ─────────────────────────────────────────────────────────────────

function meanFromTable(rng: Rng, ab: Ab): Exercise {
  const set = rng.pick(SERIES);
  const values = wholeMean(rng, 3, 2, 30);
  const mean = sum(values) / 3;
  return build(SKILL, 1, {
    key: `tabelle:${set.id}:${values.join('-')}`,
    ab,
    prompt,
    visual: tableOf(set, values),
    answer: { kind: 'number', value: mean, unit: set.unit, decimals: DECIMALS },
    hints: [SUM_FIRST, DIVIDE],
    steps: meanSteps(values, mean, set.unit),
    bugs: meanBugs(values, mean),
    praise: 'Du hast addiert und durch die Anzahl der Werte geteilt.',
    srText: say([prompt]),
    kmk: KMK,
  });
}

function meanFromBars(rng: Rng, ab: Ab): Exercise {
  const set = rng.pick(SERIES);
  const n = 4;
  const values = wholeMean(rng, n, 5, 50, 5);
  const mean = sum(values) / n;
  const chart = bars(set, values, 10);
  return build(SKILL, 1, {
    key: `saeulen:${set.id}:${values.join('-')}`,
    ab,
    prompt,
    visual: chart,
    answer: { kind: 'number', value: mean, unit: set.unit, decimals: DECIMALS },
    hints: ['Lies zuerst alle Werte an der Achse ab.', DIVIDE],
    steps: meanSteps(values, mean, set.unit, { ...chart, meanLine: mean, levelled: true }),
    bugs: meanBugs(values, mean),
    praise: 'Du hast die Werte abgelesen und gleichmäßig verteilt.',
    srText: say([prompt]),
    kmk: KMK,
  });
}

function sumFromMean(rng: Rng, ab: Ab): Exercise {
  const n = rng.int(3, 4);
  const mean = rng.int(4, 40);
  const value = n * mean;
  const context = `${fmt(n)} Personen sammeln Karten.`;
  const question = `Im Mittel hat jede Person ${fmt(mean)} Karten. Wie viele Karten sind es zusammen?`;
  return build(SKILL, 1, {
    key: `summe:${n}:${mean}`,
    ab,
    context,
    prompt: question,
    answer: { kind: 'number', value, unit: 'Karten', decimals: DECIMALS },
    hints: ['Beim Mittelwert hat jede Person gleich viel.', `Es sind ${fmt(n)} Personen mit je ${fmt(mean)} Karten.`],
    steps: [`${fmt(n)} Personen mit je ${fmt(mean)} Karten.`, `${fmt(n)} · ${fmt(mean)} = ${fmt(value)}`, `Zusammen sind es ${fmt(value)} Karten.`],
    bugs: typeableBugs([{ id: 'mittel-statt-summe', match: mean, hint: 'Das ist der Mittelwert. Gefragt ist die Summe aller Karten.' }, { id: 'plus-statt-mal', match: n + mean, hint: 'Jede Person hat im Mittel gleich viele Karten. Rechne mal.' }], value, DECIMALS),
    praise: 'Du hast vom Mittelwert zurück zur Summe gerechnet.',
    srText: say([context, question]),
    kmk: [...KMK, 'PK.problemloesen'],
  });
}

// ─── Stufe 2: 5 or 6 values with a zero, a decimal mean ──────────────────────

/** n values with a zero, whose mean is a decimal that ends: n = 5, or n = 6 with an odd half. */
function decimalMean(rng: Rng, n: number, max: number): number[] {
  for (;;) {
    const values = rng.shuffle([0, ...Array.from({ length: n - 1 }, () => rng.int(1, max))]);
    const total = sum(values);
    if (n === 5 ? total % 5 !== 0 : total % 6 === 3) return values;
  }
}

function zeroMean(rng: Rng, ab: Ab, n: number, max: number): Exercise {
  const set = rng.pick(SERIES);
  const values = decimalMean(rng, n, max);
  const mean = clean(sum(values) / n);
  return build(SKILL, 2, {
    key: `null:${set.id}:${values.join('-')}`,
    ab,
    prompt,
    visual: tableOf(set, values),
    answer: { kind: 'number', value: mean, unit: set.unit, decimals: DECIMALS },
    hints: ['Auch die 0 ist ein Wert. Zähle die 0 mit.', DIVIDE],
    steps: meanSteps(values, mean, set.unit),
    bugs: meanBugs(values, mean),
    praise: 'Du hast die 0 mitgezählt und bis zum Komma gerechnet.',
    srText: say([prompt]),
    kmk: KMK,
  });
}

function decimalData(rng: Rng, ab: Ab): Exercise {
  const set = rng.pick(SERIES.filter((s) => s.id === 'rad' || s.id === 'regen'));
  const n = rng.int(5, 6);
  for (;;) {
    const halves = rng.shuffle([0, ...Array.from({ length: n - 1 }, () => rng.int(1, 30))]);
    const total = sum(halves);
    if (n === 6 && total % 3 !== 0) continue;
    if (total % (2 * n) === 0) continue;
    const values = halves.map((h) => h / 2);
    const mean = clean(sum(values) / n);
    return build(SKILL, 2, {
      key: `komma:${set.id}:${values.join('-')}`,
      ab,
      prompt,
      visual: tableOf(set, values),
      answer: { kind: 'number', value: mean, unit: set.unit, decimals: DECIMALS },
      hints: ['Addiere Komma unter Komma. Auch die 0 zählt mit.', DIVIDE],
      steps: meanSteps(values, mean, set.unit),
      bugs: meanBugs(values, mean),
      praise: 'Du hast mit Kommazahlen addiert und die 0 mitgezählt.',
      srText: say([prompt]),
      kmk: KMK,
    });
  }
}

// ─── Stufe 3: a missing value, a value far from the others ───────────────────

function missingValue(rng: Rng, ab: Ab, n: number, decimalTarget: boolean): Exercise {
  const set = rng.pick(SERIES);
  for (;;) {
    const known = Array.from({ length: n - 1 }, () => rng.int(4, 40));
    const mean = decimalTarget ? rng.int(10, 30) + 0.5 : rng.int(10, 30);
    const value = clean(n * mean - sum(known));
    if (value < 0 || value > 60 || !Number.isInteger(value)) continue;
    const gap = rng.int(0, n - 1);
    const shown: (number | null)[] = [...known.slice(0, gap), null, ...known.slice(gap)];
    const context = `Der Mittelwert aller ${fmt(n)} Werte ist ${fmt(mean)}.`;
    const question = 'Welcher Wert fehlt in der Tabelle?';
    const smaller = clean((n - 1) * mean - sum(known));
    return build(SKILL, 3, {
      key: `fehlt:${set.id}:${shown.map((v) => v ?? 'x').join('-')}:${mean}`,
      ab,
      context,
      prompt: question,
      visual: tableOf(set, shown),
      answer: { kind: 'number', value, unit: set.unit, decimals: DECIMALS },
      hints: ['Rechne vom Mittelwert zurück zur Summe aller Werte.', 'Zieh dann die bekannten Werte von der Summe ab.'],
      steps: [`Summe aller Werte: ${fmt(n)} · ${fmt(mean)} = ${fmt(n * mean)}`, `Bekannte Werte: ${known.map((v) => fmt(v)).join(' + ')} = ${fmt(sum(known))}`, `${fmt(n * mean)} − ${fmt(sum(known))} = ${fmt(value)}`, `Es fehlt der Wert ${fmt(value)}.`],
      bugs: typeableBugs(
        [
          { id: 'fehlwert-mittel', match: mean, hint: 'Das ist der Mittelwert. Gesucht ist der fehlende Wert.' },
          { id: 'fehlwert-gesamt', match: clean(n * mean), hint: 'Das ist die Summe aller Werte. Zieh die bekannten Werte noch ab.' },
          smaller >= 0 && { id: 'fehlwert-anzahl', match: smaller, hint: 'Der fehlende Wert gehört auch zur Anzahl. Zähle die Lücke mit.' },
        ],
        value,
        DECIMALS,
      ),
      praise: 'Du hast vom Mittelwert auf den fehlenden Wert geschlossen.',
      srText: say([context, question]),
      kmk: [...KMK, 'PK.problemloesen'],
    });
  }
}

function changedValue(rng: Rng, ab: Ab): Exercise {
  const set = rng.pick(SERIES.filter((s) => s.id === 'seiten' || s.id === 'punkte'));
  const n = rng.pick([4, 5]);
  const values = Array.from({ length: n }, () => rng.int(6, 16));
  const i = rng.int(0, n - 1);
  const d = rng.int(4, 10);
  const after = values[i] + n * d;
  const correct = `Der Mittelwert steigt um ${fmt(d)}.`;
  const context = `${set.rows[i]}: Es sind ${fmt(after)} statt ${fmt(values[i])} ${set.unit}.`;
  const question = 'Was passiert mit dem Mittelwert?';
  const answer = makeChoice(rng, { label: correct }, [
    { label: 'Der Mittelwert bleibt gleich.', whyWrong: 'Der geänderte Wert gehört zur Summe. Also ändert sich auch der Mittelwert.' },
    { label: `Der Mittelwert steigt um ${fmt(after - values[i])}.`, whyWrong: 'Der Zuwachs verteilt sich gleichmäßig auf alle Werte. Teile durch die Anzahl.' },
    { label: `Der Mittelwert sinkt um ${fmt(d)}.`, whyWrong: 'Ein größerer Wert macht die Summe größer. Prüfe die Richtung.' },
  ]);
  return build(SKILL, 3, {
    key: `aendern:${set.id}:${values.join('-')}:${i}:${after}`,
    ab,
    context,
    prompt: question,
    visual: tableOf(set, values),
    answer,
    hints: ['Die Summe wächst um den Unterschied der beiden Werte.', 'Dieser Zuwachs verteilt sich auf alle Werte.'],
    steps: [`Zuwachs: ${fmt(after)} − ${fmt(values[i])} = ${fmt(after - values[i])}`, `Verteilt auf ${fmt(n)} Werte: ${fmt(after - values[i])} : ${fmt(n)} = ${fmt(d)}`, correct],
    praise: 'Du hast den Zuwachs auf alle Werte verteilt.',
    srText: say([context, question], answer),
    kmk: [...KMK, 'PK.argumentieren'],
  });
}

function dropOutlier(rng: Rng, ab: Ab): Exercise {
  const set = rng.pick(SERIES.filter((s) => s.id === 'seiten' || s.id === 'punkte'));
  for (;;) {
    const near = Array.from({ length: 4 }, () => rng.int(8, 16));
    if (sum(near) % 4 !== 0) continue;
    const far = rng.int(5, 12) * 5;
    const all = rng.shuffle([...near, far]);
    const before = clean(sum(all) / 5);
    const without = sum(near) / 4;
    const value = clean(before - without);
    const context = `Der Wert ${fmt(far)} liegt weit über den anderen Werten.`;
    const question = 'Lass diesen Wert weg. Um wie viel sinkt der Mittelwert?';
    return build(SKILL, 3, {
      key: `weglassen:${set.id}:${all.join('-')}`,
      ab,
      context,
      prompt: question,
      visual: tableOf(set, all),
      answer: { kind: 'number', value, decimals: DECIMALS },
      hints: ['Rechne den Mittelwert einmal mit allen Werten aus.', 'Rechne dann ohne den großen Wert. Vergleiche beide.'],
      steps: [`Mit allen Werten: ${fmt(sum(all))} : 5 = ${fmt(before)}`, `Ohne ${fmt(far)}: ${fmt(sum(near))} : 4 = ${fmt(without)}`, `${fmt(before)} − ${fmt(without)} = ${fmt(value)}`],
      bugs: typeableBugs([{ id: 'ausreisser-neu', match: without, hint: 'Das ist der neue Mittelwert. Gefragt ist der Unterschied zum alten.' }, { id: 'ausreisser-alt', match: before, hint: 'Das ist der alte Mittelwert. Gefragt ist der Unterschied zum neuen.' }], value, DECIMALS),
      praise: 'Du hast beide Mittelwerte berechnet und verglichen.',
      srText: say([context, question]),
      kmk: [...KMK, 'PK.argumentieren'],
    });
  }
}

export const mittelwertSkill: SkillDef = {
  ...SKILL,
  title: 'Mittelwert',
  description: 'Du verteilst Werte gleichmäßig und findest den Mittelwert.',
  stufen: {
    1: '3 oder 4 Werte, ganzer Mittelwert, Werte bis 50',
    2: '5 oder 6 Werte mit einer 0, Mittelwert mit Komma',
    3: 'Fehlender Wert; ein Wert weit weg von den anderen',
  },
  kmk: KMK,
  keys: { comma: true },
  generate(rng, stufe: Stufe, ctx) {
    const ab = targetAb(rng, stufe, ctx);
    if (stufe === 1) return ab === 1 ? meanFromTable(rng, ab) : ab === 2 ? meanFromBars(rng, ab) : sumFromMean(rng, ab);
    if (stufe === 2) return ab === 1 ? zeroMean(rng, ab, 5, 30) : ab === 2 ? zeroMean(rng, ab, 6, 40) : decimalData(rng, ab);
    if (ab === 1) return missingValue(rng, ab, rng.int(4, 5), false);
    if (ab === 2) return rng.chance(0.5) ? missingValue(rng, ab, rng.pick([4, 6]), true) : changedValue(rng, ab);
    return dropOutlier(rng, ab);
  },
};
