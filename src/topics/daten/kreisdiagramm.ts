/**
 * Kreisdiagramme lesen.
 * Stufe 1: halves and quarters, the largest part.
 * Stufe 2: percent labels, the count from a given total.
 * Stufe 3: match table and chart, the share of 360°.
 */
import { fmt, fmtAngle, fmtPercent, frac } from '../../core/format';
import type { Ab, ChoiceOption, Exercise, Rng, SkillDef, Stufe, Visual, VisualOf } from '../../core/types';
import { build, makeChoice, safeHints, targetAb } from '../shared';
import { lowest, partition, pictureChoice, pieChart, pieWords, sameOrderShares, say, SURVEYS, sum, tableWords, thinNeighbours, typeableBugs, type PieChart, type Survey } from './shared';

const SKILL = { id: 'daten.kreisdiagramm', topicId: 'daten' } as const;
const KMK = ['DZ.diagramme', 'PK.darstellen'];

const TOTAL_HINT = 'Gefragt ist die Anzahl. Wie viele Personen sind es insgesamt?';

function slices(rng: Rng, n: number): { survey: Survey; labels: string[] } {
  const survey = rng.pick(SURVEYS);
  return { survey, labels: rng.sample(survey.options, n) };
}

const q = (label: string) => `„${label}“`;

/** A share as a fraction token: 25 → {frac:1/4}. */
function shareFrac(percent: number): string {
  const [a, b] = lowest(percent, 100);
  return frac(a, b);
}

// ─── Stufe 1: halves and quarters ────────────────────────────────────────────

const QUARTER_SETS: readonly (readonly number[])[] = [[50, 25, 25], [75, 25], [25, 50, 25], [25, 25, 50], [25, 75]];

function wordOf(percent: number): string {
  return percent === 50 ? 'die Hälfte' : percent === 25 ? 'ein Viertel' : 'drei Viertel';
}

/** A Stufe 1 pie shows no numbers, so its sizes are said in equal parts: the data of the picture, not yet a Bruch. */
function quarterWords(title: string, labels: readonly string[], shares: readonly number[]): string {
  const parts = labels.map((l, i) => `${l} ${shares[i] / 25} ${shares[i] === 25 ? 'Teil' : 'Teile'}`);
  return `Das Kreisdiagramm ${title} hat 4 gleich große Teile. Im Uhrzeigersinn von oben: ${parts.join(', ')}.`;
}

function largestPart(rng: Rng, ab: Ab): Exercise {
  const shares = rng.pick(QUARTER_SETS);
  const { survey, labels } = slices(rng, shares.length);
  const visual = pieChart(survey.title, labels, shares, 'none');
  const top = shares.indexOf(Math.max(...shares));
  const prompt = 'Welcher Teil ist am größten?';
  const answer = makeChoice(rng, { label: labels[top] }, labels.flatMap((l, i) => (i === top ? [] : [{ label: l, whyWrong: 'Dieser Teil ist kleiner. Vergleiche die Größe der Teile.' }])), { max: 3 });
  return build(SKILL, 1, {
    key: `groesster:${survey.id}:${labels.join('-')}:${shares.join('-')}`,
    ab,
    prompt,
    visual,
    answer,
    hints: ['Vergleiche die Größe der Teile im Kreis.', 'Der größte Teil nimmt am meisten vom Kreis ein.'],
    steps: [`${q(labels[top])} ist ${wordOf(shares[top])} des Kreises.`, `Am größten ist ${q(labels[top])}.`],
    praise: 'Du hast die Teile des Kreises verglichen.',
    srText: say([prompt, quarterWords(survey.title, labels, shares)], answer),
    kmk: KMK,
  });
}

function namedShare(rng: Rng, ab: Ab): Exercise {
  const shares = rng.pick(QUARTER_SETS);
  const { survey, labels } = slices(rng, shares.length);
  const i = rng.int(0, shares.length - 1);
  const visual = pieChart(survey.title, labels, shares, 'none');
  const prompt = `Welchen Anteil hat ${q(labels[i])} am ganzen Kreis?`;
  const correct = shareFrac(shares[i]);
  const options: ChoiceOption[] = [25, 50, 75].filter((s) => s !== shares[i]).map((s) => ({ label: shareFrac(s), whyWrong: s > shares[i] ? 'Der Teil ist kleiner. Falte den Kreis in Gedanken in Viertel.' : 'Der Teil ist größer. Falte den Kreis in Gedanken in Viertel.' }));
  const answer = makeChoice(rng, { label: correct }, [...options, { label: frac(1, 3), whyWrong: 'Der Kreis ist nicht in Drittel geteilt. Schau auf Hälften und Viertel.' }]);
  return build(SKILL, 1, {
    key: `anteil:${survey.id}:${labels.join('-')}:${shares.join('-')}:${i}`,
    ab,
    prompt,
    visual,
    answer,
    hints: ['Denk dir den Kreis in 4 gleich große Teile.', 'Zähle die Viertel des gefragten Teils.'],
    steps: [`Der Kreis hat 4 Viertel.`, `${q(labels[i])} ist ${wordOf(shares[i])} des Kreises: ${correct}.`],
    praise: 'Du hast den Teil in Vierteln gesehen.',
    srText: say([prompt, quarterWords(survey.title, labels, shares)], answer),
    kmk: KMK,
  });
}

function twoTogether(rng: Rng, ab: Ab): Exercise {
  const shares = rng.pick([[50, 25, 25], [25, 50, 25], [25, 25, 50]]);
  const { survey, labels } = slices(rng, 3);
  const [i, j] = rng.sample([0, 1, 2], 2);
  const together = shares[i] + shares[j];
  const prompt = `Welchen Anteil haben ${q(labels[i])} und ${q(labels[j])} zusammen?`;
  const correct = shareFrac(together);
  const answer = makeChoice(rng, { label: correct }, [25, 50, 75].filter((s) => s !== together).map((s) => ({ label: shareFrac(s), whyWrong: 'Zähle die Viertel der beiden Teile zusammen.' })));
  return build(SKILL, 1, {
    key: `zusammen:${survey.id}:${labels.join('-')}:${shares.join('-')}:${i}:${j}`,
    ab,
    prompt,
    visual: pieChart(survey.title, labels, shares, 'none'),
    answer,
    hints: ['Zähle für jeden Teil die Viertel.', 'Addiere dann die Viertel der beiden Teile.'],
    steps: [`${q(labels[i])}: ${shareFrac(shares[i])}. ${q(labels[j])}: ${shareFrac(shares[j])}.`, `Zusammen sind es ${correct}.`],
    praise: 'Du hast die beiden Anteile in Vierteln addiert.',
    srText: say([prompt, quarterWords(survey.title, labels, shares)], answer),
    kmk: KMK,
  });
}

// ─── Stufe 2: percent labels, count from a total ─────────────────────────────

function countFromPie(rng: Rng, ab: Ab, step: number, totals: readonly number[]): Exercise {
  const n = rng.int(3, 4);
  const shares = partition(rng, n, step);
  const { survey, labels } = slices(rng, n);
  const total = rng.pick(totals);
  const i = rng.int(0, n - 1);
  const p = shares[i];
  const value = (p * total) / 100;
  const context = `${fmt(total)} Personen antworten bei der Umfrage.`;
  const prompt = `Wie viele Personen wählen ${q(labels[i])}?`;
  return build(SKILL, 2, {
    key: `anzahl:${survey.id}:${labels.join('-')}:${shares.join('-')}:${total}:${i}`,
    ab,
    context,
    prompt,
    visual: pieChart(survey.title, labels, shares, 'percent'),
    answer: { kind: 'number', value, unit: 'Personen' },
    hints: safeHints([`${fmtPercent(p)} heißt: ${fmt(p)} von 100.`, `Rechne zuerst ${fmt(total)} : 100.`], value, 'Rechne zuerst 1 % der Gesamtzahl aus.'),
    steps: [`${fmt(total)} : 100 = ${fmt(total / 100)}`, `${fmt(total / 100)} · ${fmt(p)} = ${fmt(value)}`, `${fmt(value)} Personen wählen ${q(labels[i])}.`],
    bugs: typeableBugs([{ id: 'kreis-gesamtzahl', match: p, hint: TOTAL_HINT }, { id: 'rest-statt-teil', match: total - value, hint: 'Das ist der Rest. Gefragt ist nur dieser eine Teil.' }], value),
    praise: 'Du hast den Anteil auf die Gesamtzahl übertragen.',
    srText: say([context, prompt]),
    kmk: KMK,
  });
}

function missingPercent(rng: Rng, ab: Ab): Exercise {
  const n = rng.int(3, 4);
  const shares = partition(rng, n, 5);
  const { survey, labels } = slices(rng, n);
  const i = rng.int(0, n - 1);
  const value = shares[i];
  const visual: PieChart = pieChart(survey.title, labels.map((l, k) => (k === i ? l : `${l} ${fmtPercent(shares[k])}`)), shares, 'none');
  const others = shares.filter((_, k) => k !== i);
  const prompt = `Bei ${q(labels[i])} fehlt die Zahl. Wie viel Prozent sind es?`;
  return build(SKILL, 2, {
    key: `fehlend:${survey.id}:${labels.join('-')}:${shares.join('-')}:${i}`,
    ab,
    prompt,
    visual,
    answer: { kind: 'number', value, unit: '%' },
    hints: ['Der ganze Kreis hat 100 %.', 'Addiere die bekannten Prozente. Wie viel fehlt bis 100 %?'],
    steps: [`${others.map((s) => fmt(s)).join(' + ')} = ${fmt(sum(others))}`, `100 − ${fmt(sum(others))} = ${fmt(value)}`, `Es sind ${fmtPercent(value)}.`],
    bugs: typeableBugs([{ id: 'summe-statt-rest', match: sum(others), hint: 'Das ist die Summe der anderen Teile. Rechne noch den Rest bis 100 %.' }], value),
    praise: 'Du hast den Rest bis 100 % berechnet.',
    srText: say([prompt]),
    kmk: KMK,
  });
}

function totalFromPart(rng: Rng, ab: Ab): Exercise {
  const n = 3;
  // the named slice is a share with an easy way back
  const p = rng.pick([10, 20, 25, 50]);
  const rest = 100 - p;
  let percents = [p, 5, rest - 5];
  do {
    const a = 5 * rng.int(1, rest / 5 - 1);
    percents = rng.shuffle([p, a, rest - a]);
  } while (thinNeighbours(percents));
  const { survey, labels } = slices(rng, n);
  const i = percents.indexOf(p);
  const count = rng.int(2, 15) * (p === 25 ? 5 : p === 50 ? 10 : p === 20 ? 4 : 2);
  const value = (count * 100) / p;
  const context = `${fmt(count)} Personen wählen ${q(labels[i])}.`;
  const prompt = 'Wie viele Personen antworten insgesamt?';
  return build(SKILL, 2, {
    key: `gesamt:${survey.id}:${labels.join('-')}:${percents.join('-')}:${i}:${count}`,
    ab,
    context,
    prompt,
    visual: pieChart(survey.title, labels, percents, 'percent'),
    answer: { kind: 'number', value, unit: 'Personen' },
    hints: [`${fmt(count)} Personen sind ${fmtPercent(p)}.`, 'Wie oft passt der Teil in das Ganze?'],
    steps: [`100 : ${fmt(p)} = ${fmt(100 / p)}`, `${fmt(count)} · ${fmt(100 / p)} = ${fmt(value)}`, `Insgesamt antworten ${fmt(value)} Personen.`],
    bugs: typeableBugs([{ id: 'teil-von-teil', match: (count * p) / 100, hint: 'Hier ist die Anzahl der Teil. Gesucht ist das Ganze.' }, { id: 'prozent-plus-anzahl', match: count + p, hint: 'Personen und Prozent lassen sich nicht addieren. Wie oft passt der Teil ins Ganze?' }], value),
    praise: 'Du hast vom Teil auf das Ganze geschlossen.',
    srText: say([context, prompt]),
    kmk: [...KMK, 'PK.problemloesen'],
  });
}

// ─── Stufe 3: table and chart, 360° ──────────────────────────────────────────

const CIRCLE_HINT = (p: number) => `Der ganze Kreis hat 360°. Wie viel davon sind ${fmtPercent(p)}?`;

/** Three shares with this one in them, in random order: no two thin slices side by side. */
function sharesWith(rng: Rng, a: number): number[] {
  for (;;) {
    const b = 5 * rng.int(1, (100 - a) / 5 - 1);
    const shares = rng.shuffle([a, b, 100 - a - b]);
    if (!thinNeighbours(shares)) return shares;
  }
}

function degrees(rng: Rng, ab: Ab): Exercise {
  const { survey, labels } = slices(rng, 3);
  const a = rng.pick([5, 10, 15, 20, 25, 30, 35, 40, 45, 55, 60, 75]);
  const shares = sharesWith(rng, a);
  const i = shares.indexOf(a);
  const value = (a * 360) / 100;
  const prompt = `Wie groß ist der Winkel des Teils ${q(labels[i])}?`;
  return build(SKILL, 3, {
    key: `winkel:${survey.id}:${labels.join('-')}:${shares.join('-')}:${a}`,
    ab,
    prompt,
    visual: pieChart(survey.title, labels, shares, 'percent'),
    answer: { kind: 'number', value, unit: '°' },
    hints: [CIRCLE_HINT(a), 'Rechne zuerst: 1 % sind 3,6°.'],
    steps: [`Der ganze Kreis hat ${fmtAngle(360)}.`, `1 % sind 360 : 100 = 3,6`, `${fmt(a)} · 3,6 = ${fmt(value)}`, `Der Winkel ist ${fmtAngle(value)}.`],
    bugs: typeableBugs([{ id: 'kreis-sektor-winkel', match: a, hint: CIRCLE_HINT(a) }, { id: 'rest-zum-ganzen', match: 360 - value, hint: 'Das ist der Rest des Kreises. Gefragt ist nur dieser Teil.' }], value),
    praise: 'Du hast den Anteil auf 360° übertragen.',
    srText: say([prompt]),
    kmk: KMK,
  });
}

function percentFromDegrees(rng: Rng, ab: Ab): Exercise {
  const { survey, labels } = slices(rng, 3);
  const a = rng.pick([5, 10, 15, 20, 25, 30, 35, 40, 45, 55, 60, 75]);
  const shares = sharesWith(rng, a);
  const i = shares.indexOf(a);
  const angle = (a * 360) / 100;
  const prompt = `Der Teil ${q(labels[i])} hat einen Winkel von ${fmtAngle(angle)}. Wie viel Prozent sind das?`;
  return build(SKILL, 3, {
    key: `prozent-winkel:${survey.id}:${labels.join('-')}:${shares.join('-')}:${a}`,
    ab,
    prompt,
    visual: pieChart(survey.title, labels, shares, 'none'),
    answer: { kind: 'number', value: a, unit: '%' },
    hints: ['Der ganze Kreis hat 360°. Das sind 100 %.', 'Rechne: Winkel durch 360, dann mal 100.'],
    steps: [`Anteil: ${fmt(angle)} : 360 = ${fmt(a / 100)}`, `${fmt(a / 100)} · 100 = ${fmt(a)}`, `Es sind ${fmtPercent(a)}.`],
    bugs: typeableBugs([{ id: 'kreis-sektor-winkel', match: angle, hint: 'Das ist der Winkel. Rechne den Winkel in Prozent um: 360° sind 100 %.' }, { id: 'rest-zum-ganzen', match: 100 - a, hint: 'Das ist der Rest des Kreises. Gefragt ist nur dieser Teil.' }], a),
    praise: 'Du hast den Winkel in Prozent umgerechnet.',
    srText: say([prompt]),
    kmk: KMK,
  });
}

/** A table and three pie charts in the same order of size: only the percent of a row tells which chart shows the table. */
function matchPie(rng: Rng, ab: Ab): Exercise {
  const { survey, labels } = slices(rng, 3);
  const percents = rng.pick([[50, 30, 20], [60, 30, 10], [40, 35, 25], [55, 25, 20], [45, 40, 15], [70, 20, 10]]);
  const shares = rng.shuffle(percents);
  // never 100: the table would already show the percent, and nothing is left to convert
  const total = rng.pick([20, 40, 60, 80, 200]);
  const counts = shares.map((s) => (s * total) / 100);
  const correct = pieChart(survey.title, labels, shares, 'percent');
  const answer = pictureChoice(rng, 'Kreis', correct, sameOrderShares(rng, shares, 2).map((other) => {
    const k = other.findIndex((s, x) => s !== shares[x]);
    return { visual: pieChart(survey.title, labels, other, 'percent'), whyWrong: `Rechne ${q(labels[k])} nach: ${fmt(counts[k])} von ${fmt(total)} Personen.` };
  }));
  const words = answer.options.map((o) => (o.visual?.type === 'pieChart' ? `${o.label}: ${o.visual.slices.map((s) => `${s.label} ${fmtPercent(s.value)}`).join(', ')}.` : '')).join(' ');
  const prompt = 'Welcher Kreis passt zur Tabelle?';
  const visual: VisualOf<'table'> = { type: 'table', caption: survey.title, header: ['Antwort', 'Personen'], rows: labels.map((l, k) => [l, fmt(counts[k])]) };
  return build(SKILL, 3, {
    key: `tabelle-kreis:${survey.id}:${labels.join('-')}:${shares.join('-')}:${total}`,
    ab,
    prompt,
    visual,
    answer,
    hints: ['Addiere zuerst alle Personen der Tabelle.', 'Rechne dann jede Anzahl in Prozent um.'],
    steps: [`Insgesamt: ${counts.map((c) => fmt(c)).join(' + ')} = ${fmt(total)}`, ...labels.map((l, k) => `${q(l)}: ${fmt(counts[k])} von ${fmt(total)} sind ${fmtPercent(shares[k])}.`), `Es passt ${answer.options[answer.correct].label}.`],
    praise: 'Du hast die Tabelle in Prozent umgerechnet und verglichen.',
    srText: say([prompt, tableWords(visual), words]),
    kmk: KMK,
  });
}

/** A pie chart and three tables in the same order of size: only the count of a share tells which table belongs to the chart. */
function matchTable(rng: Rng, ab: Ab): Exercise {
  const { survey, labels } = slices(rng, 3);
  const percents = rng.pick([[50, 30, 20], [60, 30, 10], [40, 35, 25], [55, 25, 20], [45, 40, 15]]);
  const shares = rng.shuffle(percents);
  const total = rng.pick([40, 60, 80, 200]);
  const counts = shares.map((s) => (s * total) / 100);
  const tableOf = (values: number[]): Visual => ({ type: 'table', caption: `${fmt(total)} Personen`, header: ['Antwort', 'Personen'], rows: labels.map((l, k) => [l, fmt(values[k])]) });
  const correct = tableOf(counts);
  const asPercent = tableOf(shares);
  const [nearby] = sameOrderShares(rng, shares, 1);
  const answer = pictureChoice(rng, 'Tabelle', correct, [
    { visual: tableOf(nearby.map((s) => (s * total) / 100)), whyWrong: 'Die Reihenfolge passt. Rechne die Anzahlen aus den Prozenten nach.' },
    { visual: asPercent, whyWrong: `Das sind die Prozente. Gefragt sind Personen von ${fmt(total)}.` },
  ]);
  const words = answer.options.map((o) => (o.visual?.type === 'table' ? `${o.label}: ${o.visual.rows.map((r) => r.join(' ')).join(', ')}.` : '')).join(' ');
  const context = `Bei der Umfrage antworten ${fmt(total)} Personen.`;
  const prompt = 'Welche Tabelle passt zum Kreis?';
  const pie = pieChart(survey.title, labels, shares, 'percent');
  return build(SKILL, 3, {
    key: `kreis-tabelle:${survey.id}:${labels.join('-')}:${shares.join('-')}:${total}`,
    ab,
    context,
    prompt,
    visual: pie,
    answer,
    hints: ['Rechne jeden Anteil auf die Personen um.', 'Die Summe jeder Spalte muss die Gesamtzahl ergeben.'],
    steps: [...labels.map((l, k) => `${q(l)}: ${fmtPercent(shares[k])} von ${fmt(total)} sind ${fmt(counts[k])}.`), `Es passt ${answer.options[answer.correct].label}.`],
    praise: 'Du hast die Prozente in Personen umgerechnet.',
    srText: say([context, prompt, pieWords(pie), words]),
    kmk: KMK,
  });
}

export const kreisdiagrammSkill: SkillDef = {
  ...SKILL,
  title: 'Kreisdiagramme lesen',
  description: 'Du liest Anteile aus Kreisdiagrammen ab.',
  stufen: {
    1: 'Hälften und Viertel; der größte Teil',
    2: 'Prozentangaben; Anzahl aus einer Gesamtzahl',
    3: 'Tabelle und Kreis zuordnen; Winkel als Anteil von 360°',
  },
  kmk: KMK,
  generate(rng, stufe: Stufe, ctx) {
    const ab = targetAb(rng, stufe, ctx);
    if (stufe === 1) return ab === 1 ? largestPart(rng, ab) : ab === 2 ? namedShare(rng, ab) : twoTogether(rng, ab);
    if (stufe === 2) {
      // never a total of 100: the count would be the percent on the chart; never 10: its 10 % would be '1 Personen'
      if (ab === 1) return countFromPie(rng, ab, 10, [20, 30, 50, 200]);
      if (ab === 2) return countFromPie(rng, ab, 5, [40, 60, 80, 200, 300, 400, 500]);
      return rng.chance(0.5) ? missingPercent(rng, ab) : totalFromPart(rng, ab);
    }
    if (ab === 1) return degrees(rng, ab);
    if (ab === 2) return rng.chance(0.5) ? matchPie(rng, ab) : matchTable(rng, ab);
    return percentFromDegrees(rng, ab);
  },
};
