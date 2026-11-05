/**
 * Absolute und relative Häufigkeit.
 * Stufe 1: from a Strichliste to a count, and 8 of 20 as a Bruch.
 * Stufe 2: the same share as Bruch, Dezimalzahl and Prozent.
 * Stufe 3: compare groups of different sizes.
 */
import { fmt, fmtPercent, frac } from '../../core/format';
import type { Ab, Bug, Exercise, Rng, SkillDef, Stufe, Visual } from '../../core/types';
import { build, fractionAnswer, fractionBugs, makeChoice, multiBugs, plural, targetAb, type MaybeBug } from '../shared';
import { clean, lowest, say, sum, SURVEYS, typeableBugs, type Survey } from './shared';

const SKILL = { id: 'daten.haeufigkeit', topicId: 'daten' } as const;
const KMK = ['DZ.haeufigkeit', 'ZO.darstellung-wechseln'];

/** Every number and multi field of this skill: the comma key stands for all items (§7.1). Not 2, which means money or metres and shows a count as '21,00'. */
const DECIMALS = 3;

const ANTEIL_HINT = 'Teile die Anzahl durch die Zahl aller Antworten.';

interface Tally {
  survey: Survey;
  labels: string[];
  counts: number[];
  total: number;
  /** The asked row. */
  i: number;
}

/** A Strichliste of n rows whose counts sum to one of the totals. */
function tallyData(rng: Rng, n: number, totals: readonly number[]): Tally {
  const survey = rng.pick(SURVEYS);
  const labels = rng.sample(survey.options, n);
  const total = rng.pick(totals);
  const counts = Array.from({ length: n }, () => 1);
  for (let left = total - n; left > 0; left--) {
    const k = rng.int(0, n - 1);
    if (counts[k] < 25) counts[k]++;
    else left++;
  }
  return { survey, labels, counts, total, i: rng.int(0, n - 1) };
}

const tallyVisual = (t: Tally): Visual => ({ type: 'tally', title: t.survey.title, rows: t.labels.map((label, k) => ({ label, count: t.counts[k] })) });
const tableVisual = (t: Tally): Visual => ({ type: 'table', caption: t.survey.title, header: ['Antwort', 'Anzahl'], rows: t.labels.map((label, k) => [label, fmt(t.counts[k])]) });

/** The wrong shares a child forms for n of total: part to rest, and upside down. whole: what the total counts, in the words of the story. */
function shareBugs(n: number, total: number, extra: MaybeBug[] = [], whole = 'Antworten'): MaybeBug[] {
  return [
    n < total && { id: 'anteil-zum-rest', match: { numerator: n, denominator: total - n }, hint: `Du hast durch den Rest geteilt. Der Nenner ist die Zahl aller ${whole}.` },
    ...extra,
    { id: 'bruch-umgedreht', match: { numerator: total, denominator: n }, hint: `Der Bruch steht auf dem Kopf. Die Zahl aller ${whole} kommt in den Nenner.` },
  ];
}

// ─── Stufe 1 ─────────────────────────────────────────────────────────────────

function countRow(rng: Rng, ab: Ab): Exercise {
  const survey = rng.pick(SURVEYS);
  const labels = rng.sample(survey.options, 3);
  const counts = labels.map(() => rng.int(6, 24));
  const i = rng.int(0, 2);
  const value = counts[i];
  const t: Tally = { survey, labels, counts, total: sum(counts), i };
  const prompt = `Wie oft kommt „${labels[i]}“ in der Strichliste vor?`;
  const bundles = Math.floor(value / 5);
  return build(SKILL, 1, {
    key: `zaehlen:${survey.id}:${labels.join('-')}:${counts.join('-')}:${i}`,
    ab,
    prompt,
    visual: tallyVisual(t),
    answer: { kind: 'number', value, decimals: DECIMALS },
    hints: ['Ein Bündel mit Querstrich zählt 5.', 'Zähle zuerst die Bündel, dann die einzelnen Striche.'],
    steps: [`${fmt(bundles)} Bündel zu je 5: ${fmt(bundles)} · 5 = ${fmt(bundles * 5)}`, `Dazu ${plural(value - bundles * 5, 'kommt', 'kommen')} ${fmt(value - bundles * 5)} ${plural(value - bundles * 5, 'einzelner Strich', 'einzelne Striche')}.`, `„${labels[i]}“ kommt ${fmt(value)}-mal vor.`],
    bugs: typeableBugs([{ id: 'fuenfer-buendel', match: value - bundles, hint: 'Ein Bündel hat 5 Striche: 4 senkrechte und 1 Querstrich.' }, { id: 'nur-buendel', match: bundles, hint: 'Das ist die Zahl der Bündel. Ein Bündel zählt 5.' }], value, DECIMALS),
    praise: 'Du hast die Bündel zu je 5 richtig gezählt.',
    srText: say([prompt]),
    kmk: KMK,
  });
}

/** group: the counted things; afterVon: the same word after 'von' (Dativ). */
const STORIES: readonly { group: string; afterVon: string; verb: string }[] = [
  { group: 'Personen', afterVon: 'Personen', verb: 'fahren mit dem Rad zur Schule' },
  { group: 'Personen', afterVon: 'Personen', verb: 'spielen ein Instrument' },
  { group: 'Personen', afterVon: 'Personen', verb: 'wählen Sport als Lieblingsfach' },
  { group: 'Würfe', afterVon: 'Würfen', verb: 'treffen den Korb' },
  { group: 'Tage', afterVon: 'Tagen', verb: 'bringen Regen' },
];

function shareFromText(rng: Rng, ab: Ab): Exercise {
  const story = rng.pick(STORIES);
  const total = rng.pick([10, 12, 15, 20, 24, 25, 30]);
  const n = rng.int(2, total - 2);
  const context = `${fmt(n)} von ${fmt(total)} ${story.afterVon} ${story.verb}.`;
  const prompt = 'Schreibe die relative Häufigkeit als Bruch.';
  const [a, b] = lowest(n, total);
  const answer = fractionAnswer(n, total, { accept: 'equivalent' });
  return build(SKILL, 1, {
    key: `bruch-text:${story.verb}:${n}:${total}`,
    ab,
    context,
    prompt,
    answer,
    hints: ['Die Anzahl kommt in den Zähler.', 'Die Zahl aller kommt in den Nenner.'],
    steps: [`Anzahl: ${fmt(n)}. Alle: ${fmt(total)}.`, `Die relative Häufigkeit ist ${frac(n, total)}.`, ...(a !== n ? [`Gekürzt: ${frac(a, b)}`] : [])],
    bugs: fractionBugs(shareBugs(n, total, [], story.group), answer),
    praise: 'Du hast Anzahl und Gesamtzahl richtig eingesetzt.',
    srText: say([context, prompt]),
    kmk: KMK,
  });
}

function shareFromTally(rng: Rng, ab: Ab): Exercise {
  const t = tallyData(rng, 3, [12, 15, 16, 18, 20, 24, 25, 30]);
  const n = t.counts[t.i];
  const prompt = `Schreibe die relative Häufigkeit von „${t.labels[t.i]}“ als Bruch.`;
  const answer = fractionAnswer(n, t.total, { accept: 'equivalent' });
  const other = t.counts[(t.i + 1) % 3];
  return build(SKILL, 1, {
    key: `bruch-liste:${t.survey.id}:${t.labels.join('-')}:${t.counts.join('-')}:${t.i}`,
    ab,
    prompt,
    visual: tallyVisual(t),
    answer,
    hints: ['Zähle zuerst alle Striche der Liste zusammen.', 'Die Zahl aller Striche kommt in den Nenner.'],
    steps: [`Alle Striche: ${t.counts.map((c) => fmt(c)).join(' + ')} = ${fmt(t.total)}`, `„${t.labels[t.i]}“ kommt ${fmt(n)}-mal vor.`, `Die relative Häufigkeit ist ${frac(n, t.total)}.`],
    bugs: fractionBugs(shareBugs(n, t.total, [other !== t.total && { id: 'nenner-andere-zeile', match: { numerator: n, denominator: other }, hint: 'Im Nenner steht eine andere Zeile. Nimm alle Striche zusammen.' }]).filter((b) => !b || !sameShare(b, n, t.total)), answer),
    praise: 'Du hast alle Striche gezählt und den Anteil gebildet.',
    srText: say([prompt]),
    kmk: KMK,
  });
}

/** A bug with the value of the answer is no bug. */
function sameShare(bug: Bug, n: number, total: number): boolean {
  const m = bug.match as Record<string, number>;
  return m.numerator * total === n * m.denominator;
}

function countFromShare(rng: Rng, ab: Ab): Exercise {
  const [a, b] = rng.pick([[1, 2], [1, 4], [3, 4], [1, 5], [2, 5], [3, 5], [1, 10], [3, 10]]);
  const total = b * rng.int(2, 5);
  const value = (a * total) / b;
  const story = rng.pick(STORIES.filter((s) => s.group === 'Personen'));
  const context = `${frac(a, b)} von ${fmt(total)} ${story.group} ${story.verb}.`;
  const prompt = `Wie viele ${story.group} sind das?`;
  return build(SKILL, 1, {
    key: `zurueck:${story.verb}:${a}/${b}:${total}`,
    ab,
    context,
    prompt,
    answer: { kind: 'number', value, decimals: DECIMALS, unit: story.group },
    hints: [`Rechne zuerst: ${fmt(total)} : ${fmt(b)}.`, 'Nimm das Ergebnis dann mit dem Zähler mal.'],
    steps: [`${fmt(total)} : ${fmt(b)} = ${fmt(total / b)}`, `${fmt(total / b)} · ${fmt(a)} = ${fmt(value)}`, `Das sind ${fmt(value)} ${story.group}.`],
    bugs: typeableBugs([a > 1 && { id: 'nur-durch-nenner', match: total / b, hint: 'Das ist nur ein Teil. Nimm das Ergebnis noch mit dem Zähler mal.' }, { id: 'rest-statt-anteil', match: total - value, hint: 'Das ist der Rest. Gefragt ist der genannte Anteil.' }], value, DECIMALS),
    praise: 'Du hast aus dem Anteil die Anzahl berechnet.',
    srText: say([context, prompt]),
    kmk: KMK,
  });
}

// ─── Stufe 2 ─────────────────────────────────────────────────────────────────

const NICE_TOTALS = [10, 20, 25, 50];

function decimalFromTable(rng: Rng, ab: Ab): Exercise {
  const t = tallyData(rng, 3, NICE_TOTALS);
  const n = t.counts[t.i];
  const value = clean(n / t.total);
  const percent = clean((n * 100) / t.total);
  const prompt = `Schreibe die relative Häufigkeit von „${t.labels[t.i]}“ als Dezimalzahl.`;
  return build(SKILL, 2, {
    key: `dezimal:${t.survey.id}:${t.labels.join('-')}:${t.counts.join('-')}:${t.i}`,
    ab,
    prompt,
    visual: tableVisual(t),
    answer: { kind: 'number', value, decimals: DECIMALS },
    hints: ['Addiere zuerst alle Anzahlen der Tabelle.', ANTEIL_HINT],
    steps: [`Alle: ${t.counts.map((c) => fmt(c)).join(' + ')} = ${fmt(t.total)}`, `${fmt(n)} : ${fmt(t.total)} = ${fmt(value)}`],
    bugs: typeableBugs([{ id: 'anzahl-statt-anteil', match: n, hint: 'Das ist die Anzahl. Teile noch durch die Zahl aller Antworten.' }, { id: 'prozent-statt-dezimal', match: percent, hint: 'Das ist der Anteil in Prozent. Gefragt ist die Dezimalzahl.' }], value, DECIMALS),
    praise: 'Du hast den Anteil als Dezimalzahl geschrieben.',
    srText: say([prompt]),
    kmk: KMK,
  });
}

function decimalAndPercent(rng: Rng, ab: Ab): Exercise {
  const t = tallyData(rng, 3, NICE_TOTALS);
  const n = t.counts[t.i];
  const dez = clean(n / t.total);
  const pct = clean((n * 100) / t.total);
  const fields = [
    { id: 'dez', value: dez, before: 'Dezimalzahl:', decimals: DECIMALS, label: 'Relative Häufigkeit als Dezimalzahl' },
    { id: 'pct', value: pct, before: 'In Prozent:', after: '%', decimals: DECIMALS, label: 'Relative Häufigkeit in Prozent' },
  ];
  const prompt = `Schreibe die relative Häufigkeit von „${t.labels[t.i]}“ auf zwei Arten.`;
  return build(SKILL, 2, {
    key: `zwei-formen:${t.survey.id}:${t.labels.join('-')}:${t.counts.join('-')}:${t.i}`,
    ab,
    prompt,
    visual: tallyVisual(t),
    answer: { kind: 'multi', fields },
    hints: ['Zähle zuerst alle Striche zusammen.', 'Prozent heißt: von 100. Erweitere den Anteil auf Hundertstel.'],
    steps: [`Alle Striche: ${t.counts.map((c) => fmt(c)).join(' + ')} = ${fmt(t.total)}`, `${fmt(n)} : ${fmt(t.total)} = ${fmt(dez)}`, `${fmt(dez)} = ${fmtPercent(pct)}`],
    bugs: multiBugs([{ id: 'anzahl-statt-anteil', match: { dez: n }, hint: 'Das ist die Anzahl. Teile noch durch die Zahl aller Antworten.' }, { id: 'dezimal-als-prozent', match: { pct: dez }, hint: 'Das ist die Dezimalzahl. Nimm die Zahl mal 100 für die Prozent.' }], fields),
    praise: 'Du hast denselben Anteil in zwei Formen geschrieben.',
    srText: say([prompt, ...fields.map((f) => f.label)]),
    kmk: KMK,
  });
}

function reducedFraction(rng: Rng, ab: Ab): Exercise {
  let t = tallyData(rng, 3, [20, 24, 25, 30, 40]);
  // a share that can be shortened, so that kürzen is the demand here
  for (let tries = 0; tries < 20 && lowest(t.counts[t.i], t.total)[0] === t.counts[t.i]; tries++) t = tallyData(rng, 3, [20, 24, 30, 40]);
  const n = t.counts[t.i];
  const [a, b] = lowest(n, t.total);
  const prompt = `Schreibe die relative Häufigkeit von „${t.labels[t.i]}“ als gekürzten Bruch.`;
  const answer = fractionAnswer(a, b);
  return build(SKILL, 2, {
    key: `gekuerzt:${t.survey.id}:${t.labels.join('-')}:${t.counts.join('-')}:${t.i}`,
    ab,
    prompt,
    visual: tableVisual(t),
    answer,
    hints: ['Addiere zuerst alle Anzahlen der Tabelle.', 'Teile Zähler und Nenner durch dieselbe Zahl.'],
    steps: [`Alle: ${t.counts.map((c) => fmt(c)).join(' + ')} = ${fmt(t.total)}`, `Der Anteil ist ${frac(n, t.total)}.`, ...(a !== n ? [`Gekürzt: ${frac(a, b)}`] : [])],
    bugs: fractionBugs(shareBugs(n, t.total).filter((x) => !x || !sameShare(x, n, t.total)), answer),
    praise: 'Du hast den Anteil gebildet und vollständig gekürzt.',
    srText: say([prompt]),
    kmk: KMK,
  });
}

function missingShare(rng: Rng, ab: Ab): Exercise {
  const survey = rng.pick(SURVEYS);
  const labels = rng.sample(survey.options, 4);
  const parts = rng.shuffle([5, 10, 15, 20, 25, 30, 35]).slice(0, 3);
  const given = parts.map((p) => p / 100);
  const value = clean(1 - sum(given));
  const prompt = `Wie groß ist die relative Häufigkeit von „${labels[3]}“?`;
  const context = 'Alle relativen Häufigkeiten ergeben zusammen 1.';
  return build(SKILL, 2, {
    key: `fehlt:${survey.id}:${labels.join('-')}:${parts.join('-')}`,
    ab,
    context,
    prompt,
    visual: { type: 'table', caption: survey.title, header: ['Antwort', 'Relative Häufigkeit'], rows: labels.map((l, k) => [l, k < 3 ? fmt(given[k]) : '□']) },
    answer: { kind: 'number', value, decimals: DECIMALS },
    hints: ['Addiere die drei bekannten Werte.', 'Das Ganze ist 1. Wie viel fehlt noch?'],
    steps: [`${given.map((g) => fmt(g)).join(' + ')} = ${fmt(sum(given))}`, `1 − ${fmt(sum(given))} = ${fmt(value)}`],
    bugs: typeableBugs([{ id: 'summe-nicht-eins', match: sum(given), hint: 'Das ist die Summe der bekannten Werte. Gefragt ist der Rest bis 1.' }], value, DECIMALS),
    praise: 'Du hast den Rest bis 1 berechnet.',
    srText: say([context, prompt]),
    kmk: KMK,
  });
}

function countFromPercent(rng: Rng, ab: Ab): Exercise {
  const percent = rng.pick([10, 20, 30, 40, 60, 5, 15, 25, 35, 45]);
  // never 100: the percent would be the count, printed in the task
  const total = rng.pick([20, 40, 60, 80, 200]);
  const story = rng.pick(STORIES.filter((s) => s.group === 'Personen'));
  const value = (percent * total) / 100;
  const context = `${fmtPercent(percent)} von ${fmt(total)} ${story.group} ${story.verb}.`;
  const prompt = 'Wie groß ist die absolute Häufigkeit?';
  return build(SKILL, 2, {
    key: `prozent-zurueck:${story.verb}:${percent}:${total}`,
    ab,
    context,
    prompt,
    answer: { kind: 'number', value, decimals: DECIMALS },
    hints: ['Absolute Häufigkeit heißt: die Anzahl.', `${fmtPercent(percent)} heißt: ${fmt(percent)} von 100.`],
    steps: [`${fmt(total)} : 100 = ${fmt(total / 100)}`, `${fmt(total / 100)} · ${fmt(percent)} = ${fmt(value)}`, `Die absolute Häufigkeit ist ${fmt(value)}.`],
    bugs: typeableBugs([{ id: 'prozent-als-anzahl', match: percent, hint: `${fmtPercent(percent)} ist der Anteil, nicht die Anzahl. Rechne von ${fmt(total)} aus.` }], value, DECIMALS),
    praise: 'Du hast aus dem Prozentanteil die Anzahl berechnet.',
    srText: say([context, prompt]),
    kmk: KMK,
  });
}

// ─── Stufe 3: groups of different sizes ──────────────────────────────────────

interface GroupPair {
  n1: number;
  total1: number;
  n2: number;
  total2: number;
  p1: number;
  p2: number;
}

/** Every pair of groups in whole percent, the first group the larger one. The groups are school classes: at most 32 Personen. */
const GROUP_PAIRS: readonly GroupPair[] = (() => {
  const totals = [20, 24, 25, 28, 30, 32];
  const shares = Array.from({ length: 81 }, (_, i) => i + 10);
  const out: GroupPair[] = [];
  for (const total1 of totals) {
    for (const total2 of totals) {
      if (total1 <= total2) continue;
      for (const p1 of shares) {
        for (const p2 of shares) {
          const n1 = (p1 * total1) / 100;
          const n2 = (p2 * total2) / 100;
          if (Number.isInteger(n1) && Number.isInteger(n2)) out.push({ n1, total1, n2, total2, p1, p2 });
        }
      }
    }
  }
  return out;
})();

/** The larger group has the larger count and the smaller share: counts alone mislead. */
const TRAP_PAIRS = GROUP_PAIRS.filter((p) => p.n1 > p.n2 && p.p1 < p.p2);
/** The larger group is ahead in both. */
const PLAIN_PAIRS = GROUP_PAIRS.filter((p) => p.n1 > p.n2 && p.p1 > p.p2);
const EQUAL_PAIRS = GROUP_PAIRS.filter((p) => p.p1 === p.p2);

const GROUP_TABLES: readonly { caption: string; what: string }[] = [
  { caption: 'Mit dem Rad zur Schule', what: 'mit Rad' },
  { caption: 'Im Sportverein', what: 'im Verein' },
  { caption: 'Spielt ein Instrument', what: 'mit Instrument' },
  { caption: 'Isst in der Mensa', what: 'in der Mensa' },
];

function groupsTable(c: (typeof GROUP_TABLES)[number], names: [string, string], n1: number, total1: number, n2: number | null, total2: number): Visual {
  return { type: 'table', caption: c.caption, header: ['Klasse', 'Personen', c.what], rows: [[names[0], fmt(total1), fmt(n1)], [names[1], fmt(total2), n2 === null ? '□' : fmt(n2)]] };
}

const CLASS_PAIRS: readonly [string, string][] = [['6a', '6b'], ['6b', '6c'], ['6c', '6d'], ['6d', '6e']];
const ABSOLUT_HINT = 'Die Gruppen sind verschieden groß. Vergleiche die Anteile.';

const SAME = 'In beiden gleich';

function compareGroups(rng: Rng, ab: Ab): Exercise {
  const kind = rng.next();
  const pair = rng.pick(kind < 0.6 ? TRAP_PAIRS : kind < 0.8 ? PLAIN_PAIRS : EQUAL_PAIRS);
  const c = rng.pick(GROUP_TABLES);
  const names = rng.pick(CLASS_PAIRS);
  // either class can be the larger one, so the row says nothing about the answer
  const rows = rng.chance(0.5) ? [{ n: pair.n1, total: pair.total1, p: pair.p1 }, { n: pair.n2, total: pair.total2, p: pair.p2 }] : [{ n: pair.n2, total: pair.total2, p: pair.p2 }, { n: pair.n1, total: pair.total1, p: pair.p1 }];
  const [first, second] = rows;
  const correct = first.p > second.p ? names[0] : first.p < second.p ? names[1] : SAME;
  const whyGroup = (me: typeof first, other: typeof first) => (me.n > other.n ? ABSOLUT_HINT : 'Rechne beide Anteile in Prozent aus. Vergleiche dann.');
  const labels = [names[0], names[1], SAME];
  const whys: Record<string, string> = { [names[0]]: whyGroup(first, second), [names[1]]: whyGroup(second, first), [SAME]: 'Rechne beide Anteile in Prozent aus. Vergleiche dann.' };
  const answer = makeChoice(rng, { label: correct }, labels.filter((l) => l !== correct).map((l) => ({ label: l, whyWrong: whys[l] })), { order: labels });
  const prompt = 'In welcher Klasse ist der Anteil größer?';
  return build(SKILL, 3, {
    key: `vergleich:${c.what}:${names.join('-')}:${first.n}/${first.total}:${second.n}/${second.total}`,
    ab,
    prompt,
    visual: groupsTable(c, names, first.n, first.total, second.n, second.total),
    answer,
    hints: [ABSOLUT_HINT, 'Rechne jeden Anteil auf 100 um.'],
    steps: [`${names[0]}: ${fmt(first.n)} von ${fmt(first.total)} sind ${fmtPercent(first.p)}.`, `${names[1]}: ${fmt(second.n)} von ${fmt(second.total)} sind ${fmtPercent(second.p)}.`, correct === SAME ? 'Beide Anteile sind gleich groß.' : `Der Anteil ist in der ${correct} größer.`],
    praise: 'Du hast Anteile verglichen und nicht nur die Anzahlen.',
    srText: say([prompt], answer),
    kmk: [...KMK, 'PK.argumentieren'],
  });
}

/** Both shares in percent and the comparison: the larger count usually has the smaller share. */
function largerShare(rng: Rng, ab: Ab): Exercise {
  const trap = rng.chance(0.7);
  const pair = rng.pick(trap ? TRAP_PAIRS : PLAIN_PAIRS);
  const names = rng.pick(CLASS_PAIRS);
  const c = rng.pick(GROUP_TABLES);
  // either class can be the larger one, so the row says nothing about the answer
  const rows = rng.chance(0.5) ? [{ n: pair.n1, total: pair.total1, p: pair.p1 }, { n: pair.n2, total: pair.total2, p: pair.p2 }] : [{ n: pair.n2, total: pair.total2, p: pair.p2 }, { n: pair.n1, total: pair.total1, p: pair.p1 }];
  const [first, second] = rows;
  const [high, low] = first.p > second.p ? [first, second] : [second, first];
  const prompt = 'Vergleiche beide Klassen. Wie groß ist der größere Anteil in Prozent?';
  const asDecimal = (row: typeof first) => `${fmt(row.n)} : ${fmt(row.total)} = ${fmt(clean(row.p / 100))} = ${fmtPercent(row.p)}`;
  return build(SKILL, 3, {
    key: `prozente:${c.what}:${names.join('-')}:${first.n}/${first.total}:${second.n}/${second.total}`,
    ab,
    prompt,
    visual: groupsTable(c, names, first.n, first.total, second.n, second.total),
    answer: { kind: 'number', value: high.p, unit: '%', decimals: DECIMALS },
    hints: ['Schreibe jeden Anteil zuerst als Bruch.', 'Erweitere oder kürze den Bruch auf Hundertstel. Vergleiche dann.'],
    steps: [`${names[0]}: ${asDecimal(first)}`, `${names[1]}: ${asDecimal(second)}`, `Der größere Anteil ist ${fmtPercent(high.p)}.`],
    bugs: typeableBugs(
      [
        trap ? { id: 'absolut-relativ', match: low.p, hint: ABSOLUT_HINT } : { id: 'kleinerer-anteil', match: low.p, hint: 'Das ist der kleinere Anteil. Gefragt ist der größere.' },
        { id: 'anzahl-statt-anteil', match: high.n, hint: 'Das ist die Anzahl. Rechne die Anzahl auf 100 um.' },
      ],
      high.p,
      DECIMALS,
    ),
    praise: 'Du hast beide Gruppen auf 100 umgerechnet und verglichen.',
    srText: say([prompt]),
    kmk: [...KMK, 'PK.argumentieren'],
  });
}

function sameShareCount(rng: Rng, ab: Ab): Exercise {
  const usable = TRAP_PAIRS.filter((p) => Number.isInteger((p.p1 * p.total2) / 100));
  const pair = rng.pick(usable);
  const names = rng.pick(CLASS_PAIRS);
  const c = rng.pick(GROUP_TABLES);
  const value = (pair.p1 * pair.total2) / 100;
  const additive = pair.total2 - (pair.total1 - pair.n1);
  const prompt = `Beide Klassen sollen denselben Anteil haben. Welche Zahl gehört in die Lücke?`;
  return build(SKILL, 3, {
    key: `gleicher-anteil:${c.what}:${names.join('-')}:${pair.n1}/${pair.total1}:${pair.total2}`,
    ab,
    prompt,
    visual: groupsTable(c, names, pair.n1, pair.total1, null, pair.total2),
    answer: { kind: 'number', value, decimals: DECIMALS },
    hints: [`Rechne zuerst den Anteil in der ${names[0]} in Prozent aus.`, 'Nimm dann denselben Anteil von der zweiten Klasse.'],
    steps: [`${fmt(pair.n1)} von ${fmt(pair.total1)} sind ${fmtPercent(pair.p1)}.`, `${fmtPercent(pair.p1)} von ${fmt(pair.total2)} sind ${fmt(value)}.`, `In die Lücke gehört ${fmt(value)}.`],
    bugs: typeableBugs([{ id: 'gleiche-anzahl', match: pair.n1, hint: 'Das ist dieselbe Anzahl. Gefragt ist derselbe Anteil.' }, additive > 0 && { id: 'gleicher-abstand', match: additive, hint: 'Du hast denselben Abstand genommen. Rechne mit dem Anteil in Prozent.' }], value, DECIMALS),
    praise: 'Du hast denselben Anteil auf die andere Gruppe übertragen.',
    srText: say([prompt]),
    kmk: [...KMK, 'PK.problemloesen'],
  });
}

export const haeufigkeitSkill: SkillDef = {
  ...SKILL,
  title: 'Absolute und relative Häufigkeit',
  description: 'Du rechnest aus, welchen Anteil ein Wert hat.',
  stufen: {
    1: 'Von der Strichliste zur Anzahl; 8 von 20 als Bruch',
    2: 'Anteil als Bruch, Dezimalzahl und Prozent',
    3: 'Gruppen verschiedener Größe vergleichen',
  },
  kmk: KMK,
  keys: { comma: true },
  generate(rng, stufe: Stufe, ctx) {
    const ab = targetAb(rng, stufe, ctx);
    if (stufe === 1) {
      if (ab === 1) return rng.chance(0.5) ? countRow(rng, ab) : shareFromText(rng, ab);
      return ab === 2 ? shareFromTally(rng, ab) : countFromShare(rng, ab);
    }
    if (stufe === 2) {
      if (ab === 1) return decimalFromTable(rng, ab);
      if (ab === 2) return rng.chance(0.5) ? decimalAndPercent(rng, ab) : reducedFraction(rng, ab);
      return rng.chance(0.5) ? missingShare(rng, ab) : countFromPercent(rng, ab);
    }
    if (ab === 1) return compareGroups(rng, ab);
    return ab === 2 ? largerShare(rng, ab) : sameShareCount(rng, ab);
  },
};
