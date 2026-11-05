/**
 * Diagramme lesen.
 * Stufe 1: one value from bars, axis step 5.
 * Stufe 2: difference and sum, axis step 20 or 50.
 * Stufe 3: two questions from one chart, and from a table to its chart.
 */
import { fmt } from '../../core/format';
import type { Ab, Bug, Exercise, Rng, SkillDef, Stufe } from '../../core/types';
import { build, makeChoice, multiBugs, targetAb, type MaybeBug } from '../shared';
import { AXIS_QUESTION, barChart, cap, chartWords, multiples, pickCategories, pictureChoice, say, sum, table, tableWords, THEMES, typeableBugs, type Theme } from './shared';

const SKILL = { id: 'daten.diagramm', topicId: 'daten' } as const;
const KMK = ['DZ.diagramme', 'PK.darstellen'];

const howMany = (t: Theme) => `Wie viele ${t.unit}`;
const AXIS_HINT = 'Schau an der Achse, wie viel ein Kästchen zählt.';

// ─── Stufe 1: one value, axis step 5 ─────────────────────────────────────────

const S1_STEP = 5;
/** Only a worked step names the step: when the bar is one box tall, the step is the answer. */
const s1AxisStep = `Ein Kästchen an der Achse zählt hier ${S1_STEP}.`;
const s1Boxes = (value: number): Bug => ({ id: 'achse-schritt', match: value / S1_STEP, hint: `Das sind die Kästchen. ${AXIS_QUESTION}` });

function stufe1(rng: Rng, ab: Ab): Exercise {
  const theme = rng.pick(THEMES);
  const n = ab === 1 ? 4 : 5;
  const cats = pickCategories(rng, theme, n);
  const values = multiples(rng, n, S1_STEP, 10);
  const horizontal = ab > 1 && rng.chance(0.4);
  const visual = barChart(theme, cats, values, S1_STEP, { horizontal });

  if (ab === 1) {
    const i = rng.int(0, n - 1);
    const value = values[i];
    const prompt = `${howMany(theme)} sind es ${theme.at(cats[i])}?`;
    return build(SKILL, 1, {
      key: `wert:${theme.id}:${chartWords(cats, values)}:${i}`,
      ab,
      prompt,
      visual,
      answer: { kind: 'number', value, unit: theme.unit },
      hints: [`Such zuerst ${cats[i]} im Diagramm.`, AXIS_QUESTION],
      steps: [`Such ${cats[i]} im Diagramm.`, s1AxisStep, `${cap(theme.at(cats[i]))} sind es ${fmt(value)} ${theme.unit}.`],
      bugs: typeableBugs([s1Boxes(value), { id: 'nachbar-wert', match: values[(i + 1) % n], hint: 'Das ist der Wert daneben. Such den Namen noch einmal.' }], value),
      praise: 'Du hast den Wert genau an der Achse abgelesen.',
      srText: say([prompt]),
      kmk: KMK,
    });
  }

  if (ab === 2) {
    const largest = rng.chance(0.5);
    const value = largest ? Math.max(...values) : Math.min(...values);
    const other = largest ? Math.min(...values) : Math.max(...values);
    const word = largest ? 'größten' : 'kleinsten';
    const nominative = largest ? 'größte' : 'kleinste';
    const prompt = `Such den ${word} Wert. ${howMany(theme)} sind es?`;
    return build(SKILL, 1, {
      key: `extrem:${word}:${theme.id}:${chartWords(cats, values)}:${horizontal}`,
      ab,
      prompt,
      visual,
      answer: { kind: 'number', value, unit: theme.unit },
      hints: [`Vergleiche zuerst alle Werte. Such den ${word}.`, AXIS_QUESTION],
      steps: [`Vergleiche alle Werte: ${chartWords(cats, values)}.`, `Der ${nominative} Wert ist ${fmt(value)} ${theme.unit}.`],
      bugs: typeableBugs([s1Boxes(value), { id: 'groesster-kleinster', match: other, hint: `Das ist der andere Rand. Gefragt ist der ${nominative} Wert.` }], value),
      praise: 'Du hast erst verglichen und dann an der Achse abgelesen.',
      srText: say([prompt]),
      kmk: KMK,
    });
  }

  const i = rng.int(0, n - 1);
  const value = values[i];
  const answer = makeChoice(rng, { label: cats[i] }, cats.flatMap((c, j) => (j === i ? [] : [{ label: c, whyWrong: `${cap(theme.at(c))} sind es ${fmt(values[j])}. Lies noch einmal an der Achse ab.` }])), { max: n });
  const prompt = `${theme.which} sind es genau ${fmt(value)} ${theme.unit}?`;
  return build(SKILL, 1, {
    key: `rueckwaerts:${theme.id}:${chartWords(cats, values)}:${i}:${horizontal}`,
    ab,
    prompt,
    visual,
    answer,
    hints: [`Such die ${fmt(value)} an der Achse.`, 'Folge dann der Linie bis zum passenden Wert.'],
    steps: [`Such die ${fmt(value)} an der Achse.`, `Der Wert ${fmt(value)} gehört zu ${cats[i]}.`],
    praise: 'Du bist von der Achse zum passenden Namen gegangen.',
    srText: say([prompt], answer),
    kmk: KMK,
  });
}

// ─── Stufe 2: difference and sum, axis step 20 or 50 ─────────────────────────

/** Two values: multiples of the step, or (halfSteps) between two lines of the axis. */
function s2Values(rng: Rng, n: number, step: number, halfSteps: boolean): number[] {
  const unit = halfSteps ? step / 2 : step;
  const maxK = step === 20 ? 10 : 8;
  return multiples(rng, n, unit, halfSteps ? maxK * 2 : maxK);
}

function differenceOrSum(rng: Rng, ab: Ab, theme: Theme, cats: string[], values: number[], step: number, horizontal: boolean): Exercise {
  const visual = barChart(theme, cats, values, step, { horizontal });
  const [i, j] = rng.sample(cats.map((_, k) => k), 2);
  const [high, low] = values[i] > values[j] ? [i, j] : [j, i];
  const a = values[high];
  const b = values[low];
  const boxes = (x: number): Bug => ({ id: 'achse-schritt', match: x / step, hint: AXIS_HINT });
  const readOne = 'Lies beide Werte an der Achse ab.';
  if (rng.chance(0.5)) {
    const value = a - b;
    const prompt = `${howMany(theme)} sind es ${theme.at(cats[high])} mehr als ${theme.at(cats[low])}?`;
    return build(SKILL, 2, {
      key: `differenz:${theme.id}:${step}:${chartWords(cats, values)}:${high}:${low}`,
      ab,
      prompt,
      visual,
      answer: { kind: 'number', value, unit: theme.unit },
      hints: [readOne, 'Der Unterschied ist die Differenz der beiden Werte.'],
      steps: [`Ein Kästchen zählt ${fmt(step)}.`, `${cats[high]}: ${fmt(a)}, ${cats[low]}: ${fmt(b)}.`, `${fmt(a)} − ${fmt(b)} = ${fmt(value)}`],
      bugs: typeableBugs([boxes(value), { id: 'summe-statt-differenz', match: a + b, hint: 'Das ist die Summe. Gefragt ist der Unterschied der beiden Werte.' }, { id: 'nur-ein-wert', match: a, hint: 'Das ist nur ein Wert. Vergleiche mit dem zweiten Wert.' }], value),
      praise: 'Du hast beide Werte abgelesen und den Unterschied gerechnet.',
      srText: say([prompt]),
      kmk: KMK,
    });
  }
  const value = a + b;
  const prompt = `${howMany(theme)} sind es ${theme.at(cats[high])} und ${theme.at(cats[low])} zusammen?`;
  return build(SKILL, 2, {
    key: `summe:${theme.id}:${step}:${chartWords(cats, values)}:${high}:${low}`,
    ab,
    prompt,
    visual,
    answer: { kind: 'number', value, unit: theme.unit },
    hints: [readOne, 'Zusammen heißt hier: Addiere die beiden Werte.'],
    steps: [`Ein Kästchen zählt ${fmt(step)}.`, `${cats[high]}: ${fmt(a)}, ${cats[low]}: ${fmt(b)}.`, `${fmt(a)} + ${fmt(b)} = ${fmt(value)}`],
    bugs: typeableBugs([boxes(value), { id: 'differenz-statt-summe', match: a - b, hint: 'Das ist der Unterschied. Gefragt ist die Summe der beiden Werte.' }, { id: 'nur-ein-wert', match: a, hint: 'Das ist nur ein Wert. Addiere den zweiten Wert dazu.' }], value),
    praise: 'Du hast beide Werte abgelesen und addiert.',
    srText: say([prompt]),
    kmk: KMK,
  });
}

/** The pair of groups with this difference, if there is only one. */
function uniquePairByDifference(rng: Rng, values: number[]): { high: number; low: number; pairs: [number, number][] } | null {
  const pairs: [number, number][] = [];
  values.forEach((a, i) => values.forEach((b, j) => a > b && pairs.push([i, j])));
  const diff = ([i, j]: [number, number]) => values[i] - values[j];
  const once = pairs.filter((p) => pairs.filter((q) => diff(q) === diff(p)).length === 1);
  if (once.length === 0) return null;
  const [high, low] = rng.pick(once);
  return { high, low, pairs };
}

function stufe2(rng: Rng, ab: Ab): Exercise {
  const theme = rng.pick(THEMES);
  const step = rng.pick([20, 50]);
  const horizontal = rng.chance(0.3);
  if (ab === 1) {
    const cats = pickCategories(rng, theme, 4);
    return differenceOrSum(rng, ab, theme, cats, s2Values(rng, 4, step, false), step, horizontal);
  }
  if (ab === 2) {
    const cats = pickCategories(rng, theme, 4);
    return differenceOrSum(rng, ab, theme, cats, s2Values(rng, 4, step, true), step, horizontal);
  }

  const cats = pickCategories(rng, theme, 4);
  const values = s2Values(rng, 4, step, true);
  const visual = barChart(theme, cats, values, step, { horizontal });
  const pair = rng.chance(0.5) ? uniquePairByDifference(rng, values) : null;
  if (pair) {
    const d = values[pair.high] - values[pair.low];
    const label = (i: number, j: number) => `${cats[i]} und ${cats[j]}`;
    const wrongs = pair.pairs.filter(([i, j]) => !(i === pair.high && j === pair.low)).map(([i, j]) => ({ label: label(i, j), whyWrong: `Hier ist der Unterschied ${fmt(values[i] - values[j])}. Lies noch einmal genau ab.` }));
    const answer = makeChoice(rng, { label: label(pair.high, pair.low) }, rng.shuffle(wrongs), { max: 4 });
    const prompt = `Bei welchen zwei Werten beträgt der Unterschied genau ${fmt(d)}?`;
    return build(SKILL, 2, {
      key: `paar:${theme.id}:${step}:${chartWords(cats, values)}:${pair.high}:${pair.low}`,
      ab,
      prompt,
      visual,
      answer,
      hints: ['Lies zuerst alle Werte an der Achse ab.', 'Rechne für jedes Paar den Unterschied aus.'],
      steps: [`Lies ab: ${chartWords(cats, values, fmt)}.`, `${fmt(values[pair.high])} − ${fmt(values[pair.low])} = ${fmt(d)}`, `Das Paar ist ${label(pair.high, pair.low)}.`],
      praise: 'Du hast die Paare geprüft und den Unterschied gefunden.',
      srText: say([prompt], answer),
      kmk: KMK,
    });
  }
  const value = sum(values);
  const prompt = `${howMany(theme)} sind es insgesamt?`;
  return build(SKILL, 2, {
    key: `alle:${theme.id}:${step}:${chartWords(cats, values)}`,
    ab,
    prompt,
    visual,
    answer: { kind: 'number', value, unit: theme.unit },
    hints: ['Lies alle Werte an der Achse ab.', AXIS_HINT],
    steps: [`Ein Kästchen zählt ${fmt(step)}.`, `Lies ab: ${chartWords(cats, values, fmt)}.`, `${values.map((v) => fmt(v)).join(' + ')} = ${fmt(value)}`],
    bugs: typeableBugs([{ id: 'achse-schritt', match: value / step, hint: AXIS_HINT }, { id: 'ein-wert-vergessen', match: value - values[values.length - 1], hint: 'Hier fehlt ein Wert. Zähle noch einmal, wie viele Werte das Diagramm zeigt.' }], value),
    praise: 'Du hast alle Werte abgelesen und keinen ausgelassen.',
    srText: say([prompt]),
    kmk: KMK,
  });
}

// ─── Stufe 3: two questions, and from a table to its chart ───────────────────

function tableToChart(rng: Rng, ab: Ab): Exercise {
  const theme = rng.pick(THEMES);
  const step = rng.pick([20, 50]);
  const other = step === 20 ? 50 : 20;
  const n = 4;
  const cats = pickCategories(rng, theme, n);
  const values = multiples(rng, n, step, 6);
  const correct = barChart(theme, cats, values, step);
  const [i, j] = rng.sample(cats.map((_, k) => k), 2);
  const swapped = values.map((v, k) => (k === i ? values[j] : k === j ? values[i] : v));
  const scaled = values.map((v) => (v / step) * other);
  const off = values.map((v, k) => (k === i ? v + step : v));
  const answer = pictureChoice(rng, 'Diagramm', correct, [
    { visual: barChart(theme, cats, swapped, step), whyWrong: `Vergleiche ${cats[i]} und ${cats[j]} mit der Tabelle.` },
    { visual: barChart(theme, cats, scaled, other), whyWrong: 'Die Höhen sehen passend aus. Schau, wie viel ein Kästchen zählt.' },
    { visual: barChart(theme, cats, off, step), whyWrong: `Vergleiche ${cats[i]} noch einmal mit der Tabelle.` },
  ]);
  const prompt = 'Welches Diagramm passt zur Tabelle?';
  const header = `Lies die Tabelle: ${chartWords(cats, values, fmt)}.`;
  const visual = table(theme.title, [theme.group, theme.unit], cats, values.map((v) => fmt(v)));
  const describeOptions = answer.options.map((o) => (o.visual?.type === 'barChart' ? `${o.label}: ${chartWords(o.visual.categories, o.visual.values)}.` : ''));
  return build(SKILL, 3, {
    key: `tabelle:${theme.id}:${step}:${chartWords(cats, values)}:${i}:${j}`,
    ab,
    prompt,
    visual,
    answer,
    hints: ['Schau zuerst, wie viel ein Kästchen an der Achse zählt.', 'Prüfe dann jeden Wert der Tabelle einzeln.'],
    steps: [header, `Die Achse muss bis mindestens ${fmt(Math.max(...values))} reichen.`, `Das passende Diagramm ist ${answer.options[answer.correct].label}.`],
    praise: 'Du hast die Achse und jeden Wert geprüft.',
    srText: say([prompt, tableWords(visual), describeOptions.join(' ')]),
    kmk: KMK,
  });
}

function twoQuestions(rng: Rng, ab: Ab): Exercise {
  const theme = rng.pick(THEMES);
  const step = rng.pick([20, 50]);
  const cats = pickCategories(rng, theme, 4);
  const values = s2Values(rng, 4, step, true);
  const visual = barChart(theme, cats, values, step);
  const [i, j] = rng.sample(cats.map((_, k) => k), 2);
  const [high, low] = values[i] > values[j] ? [i, j] : [j, i];
  const a = values[high];
  const b = values[low];
  const fields = [
    { id: 'wert', value: a, before: `${cap(theme.at(cats[high]))}:`, after: theme.unit, label: `${howMany(theme)} sind es ${theme.at(cats[high])}?` },
    { id: 'mehr', value: a - b, before: `Mehr als ${theme.at(cats[low])}:`, after: theme.unit, label: `Wie viele sind es mehr als ${theme.at(cats[low])}?` },
  ];
  const bugs: MaybeBug[] = [
    Number.isInteger(a / step) && { id: 'achse-schritt', match: { wert: a / step }, hint: AXIS_HINT },
    { id: 'summe-statt-differenz', match: { mehr: a + b }, hint: 'Das ist die Summe. Gefragt ist der Unterschied der beiden Werte.' },
    { id: 'nachbar-wert', match: { mehr: b }, hint: 'Das ist nur der kleinere Wert. Gefragt ist der Unterschied.' },
  ];
  const prompt = 'Lies ab und rechne. Trage beide Antworten ein.';
  return build(SKILL, 3, {
    key: `zwei:${theme.id}:${step}:${chartWords(cats, values)}:${high}:${low}`,
    ab,
    prompt,
    visual,
    answer: { kind: 'multi', fields },
    hints: [AXIS_HINT, 'Rechne die zweite Antwort mit deinem ersten Wert.'],
    steps: [`Ein Kästchen zählt ${fmt(step)}.`, `${cats[high]}: ${fmt(a)}, ${cats[low]}: ${fmt(b)}.`, `${fmt(a)} − ${fmt(b)} = ${fmt(a - b)}`, `Antworten: ${fmt(a)} und ${fmt(a - b)} ${theme.unit}.`],
    bugs: multiBugs(bugs, fields),
    praise: 'Du hast aus demselben Diagramm zwei Antworten gefunden.',
    srText: say([prompt, ...fields.map((f) => f.label)]),
    kmk: KMK,
  });
}

function totalAndGoal(rng: Rng, ab: Ab): Exercise {
  const theme = rng.pick(THEMES);
  const step = 50;
  const cats = pickCategories(rng, theme, 4);
  const values = s2Values(rng, 4, step, true);
  const visual = barChart(theme, cats, values, step);
  const total = sum(values);
  const goal = (Math.floor(total / 100) + rng.int(1, 3)) * 100;
  const rest = goal - total;
  const fields = [
    { id: 'gesamt', value: total, before: 'Insgesamt:', after: theme.unit, label: `${howMany(theme)} sind es insgesamt?` },
    { id: 'rest', value: rest, before: 'Bis zum Ziel fehlen:', after: theme.unit, label: 'Wie viele fehlen bis zum Ziel?' },
  ];
  const bugs: MaybeBug[] = [
    { id: 'ein-wert-vergessen', match: { gesamt: total - values[3] }, hint: 'Hier fehlt ein Wert. Zähle noch einmal, wie viele Werte das Diagramm zeigt.' },
    { id: 'ziel-ohne-summe', match: { rest: goal - Math.max(...values) }, hint: 'Rechne vom Ziel aus mit der Summe aller Werte, nicht mit einem Wert.' },
    Number.isInteger(total / step) && { id: 'achse-schritt', match: { gesamt: total / step }, hint: AXIS_HINT },
  ];
  const context = `Das Ziel sind ${fmt(goal)} ${theme.unit}.`;
  const prompt = 'Lies ab und rechne. Trage beide Antworten ein.';
  return build(SKILL, 3, {
    key: `ziel:${theme.id}:${goal}:${chartWords(cats, values)}`,
    ab,
    context,
    prompt,
    visual,
    answer: { kind: 'multi', fields },
    hints: ['Addiere zuerst alle Werte des Diagramms.', 'Vergleiche die Summe dann mit dem Ziel.'],
    steps: [`Lies ab: ${chartWords(cats, values, fmt)}.`, `${values.map((v) => fmt(v)).join(' + ')} = ${fmt(total)}`, `${fmt(goal)} − ${fmt(total)} = ${fmt(rest)}`, `Antworten: ${fmt(total)} und ${fmt(rest)} ${theme.unit}.`],
    bugs: multiBugs(bugs, fields),
    praise: 'Du hast die Summe genutzt und bis zum Ziel gerechnet.',
    srText: say([context, prompt, ...fields.map((f) => f.label)]),
    kmk: [...KMK, 'PK.modellieren'],
  });
}

function stufe3(rng: Rng, ab: Ab): Exercise {
  if (ab === 1) return tableToChart(rng, ab);
  if (ab === 2) return twoQuestions(rng, ab);
  return totalAndGoal(rng, ab);
}

export const diagrammSkill: SkillDef = {
  ...SKILL,
  title: 'Diagramme lesen',
  description: 'Du liest Werte ab und vergleichst sie.',
  stufen: {
    1: 'Säulen und Balken, Achse in 5er-Schritten, ein Wert',
    2: 'Unterschied und Summe, Achse in 20er- oder 50er-Schritten',
    3: 'Zwei Fragen zu einem Diagramm, von der Tabelle zum Diagramm',
  },
  kmk: KMK,
  generate(rng, stufe: Stufe, ctx) {
    const ab = targetAb(rng, stufe, ctx);
    if (stufe === 1) return stufe1(rng, ab);
    if (stufe === 2) return stufe2(rng, ab);
    return stufe3(rng, ab);
  },
};
