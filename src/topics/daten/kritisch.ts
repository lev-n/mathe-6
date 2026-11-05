/**
 * Diagramme prüfen.
 * Stufe 1: which statement fits the chart.
 * Stufe 2: a shortened axis: Täuscht das Bild? Every chart is shortened, so that the picture's name ('…, nicht bei 0') says nothing about the answer.
 * Stufe 3: choose the fitting chart, and find the claim that does not fit.
 */
import { fmt, fmtPercent } from '../../core/format';
import type { Ab, ChoiceOption, Exercise, Rng, SkillDef, Stufe, VisualOf } from '../../core/types';
import { build, makeChoice, pickPerson, plural, targetAb } from '../shared';
import { AXIS_QUESTION, barChart, cap, chartSpeech, chartWords, multiples, partition, pickCategories, pictureChoice, pieChart, pieWords, say, sum, SURVEYS, tableWords, THEMES, type Theme } from './shared';

const SKILL = { id: 'daten.kritisch', topicId: 'daten' } as const;
const KMK = ['DZ.diagramme', 'PK.argumentieren'];

const AXIS_WARNING = 'Schau, wo die Achse beginnt. Die Säulen täuschen dann leicht.';

// ─── Statements about a chart ────────────────────────────────────────────────

interface Data {
  theme: Theme;
  cats: string[];
  values: number[];
}

const atCap = (d: Data, i: number) => cap(d.theme.at(d.cats[i]));

const sayMost = (d: Data, i: number) => `${atCap(d, i)} sind es am meisten ${d.theme.unit}.`;
const sayLeast = (d: Data, i: number) => `${atCap(d, i)} sind es am wenigsten ${d.theme.unit}.`;
const sayValue = (d: Data, i: number, v: number) => `${atCap(d, i)} sind es ${fmt(v)} ${d.theme.unit}.`;
const sayMore = (d: Data, i: number, j: number) => `${atCap(d, i)} sind es mehr ${d.theme.unit} als ${d.theme.at(d.cats[j])}.`;
const sayDiff = (d: Data, i: number, j: number, x: number) => `${atCap(d, i)} sind es ${fmt(x)} ${d.theme.unit} mehr als ${d.theme.at(d.cats[j])}.`;
const saySum = (d: Data, i: number, j: number, x: number) => `${atCap(d, i)} und ${d.theme.at(d.cats[j])} sind es zusammen ${fmt(x)} ${d.theme.unit}.`;
const sayTwice = (d: Data, i: number, j: number) => `${atCap(d, i)} sind es doppelt so viele ${d.theme.unit} wie ${d.theme.at(d.cats[j])}.`;

const indexOfMax = (values: number[]) => values.indexOf(Math.max(...values));
const indexOfMin = (values: number[]) => values.indexOf(Math.min(...values));

function dataOf(rng: Rng, n: number, step: number, maxK: number): Data {
  const theme = rng.pick(THEMES);
  return { theme, cats: pickCategories(rng, theme, n), values: multiples(rng, n, step, maxK) };
}

/** Two groups, the larger one first. */
function pairOf(rng: Rng, d: Data): [number, number] {
  const [i, j] = rng.sample(d.cats.map((_, k) => k), 2);
  return d.values[i] > d.values[j] ? [i, j] : [j, i];
}

// ─── Stufe 1: which statement fits ───────────────────────────────────────────

function fitsDirect(rng: Rng, ab: Ab): Exercise {
  const step = rng.pick([5, 10]);
  const d = dataOf(rng, 4, step, 9);
  const top = indexOfMax(d.values);
  const bottom = indexOfMin(d.values);
  const kind = rng.pick(['most', 'least', 'value'] as const);
  const about = kind === 'most' ? top : kind === 'least' ? bottom : rng.int(0, 3);
  const correct = kind === 'most' ? sayMost(d, top) : kind === 'least' ? sayLeast(d, bottom) : sayValue(d, about, d.values[about]);
  const read = (i: number) => `Lies den Wert ${d.theme.at(d.cats[i])} noch einmal an der Achse ab.`;
  /** A statement that does not hold for this group. */
  const wrongAbout = (i: number, wanted: typeof kind): ChoiceOption => {
    if (wanted === 'most' && i !== top) return { label: sayMost(d, i), whyWrong: 'Dort ist nicht der größte Wert. Vergleiche alle Werte.' };
    if (wanted === 'least' && i !== bottom) return { label: sayLeast(d, i), whyWrong: 'Dort ist nicht der kleinste Wert. Vergleiche alle Werte.' };
    return { label: sayValue(d, i, d.values[i] + step), whyWrong: read(i) };
  };
  // every option names another group and the form of the right one comes up again, so neither the group nor the form picks it out
  const others = rng.shuffle(d.cats.map((_, k) => k).filter((k) => k !== about));
  const wrongs = others.map((i, pos) => wrongAbout(i, pos === 0 ? kind : rng.pick(['most', 'least', 'value'] as const)));
  const answer = makeChoice(rng, { label: correct }, wrongs);
  const prompt = 'Welche Aussage passt zum Diagramm?';
  const visual = barChart(d.theme, d.cats, d.values, step);
  return build(SKILL, 1, {
    key: `direkt:${d.theme.id}:${step}:${chartWords(d.cats, d.values)}:${kind}:${about}`,
    ab,
    prompt,
    visual,
    answer,
    hints: ['Prüfe jede Aussage einzeln am Diagramm.', AXIS_QUESTION],
    steps: [`Lies ab: ${chartWords(d.cats, d.values, fmt)}.`, `Diese Aussage passt: ${correct}`],
    praise: 'Du hast jede Aussage am Diagramm geprüft.',
    srText: say([prompt, chartSpeech(visual)], answer),
    kmk: KMK,
  });
}

function fitsWithSum(rng: Rng, ab: Ab): Exercise {
  const step = rng.pick([5, 10]);
  const d = dataOf(rng, 4, step, 9);
  const [hi, lo] = pairOf(rng, d);
  const a = d.values[hi];
  const b = d.values[lo];
  const useDiff = rng.chance(0.5);
  const correct = useDiff ? sayDiff(d, hi, lo, a - b) : saySum(d, hi, lo, a + b);
  const offs = [step, 2 * step, -step].filter((x) => a - b + x > 0);
  const wrongs: ChoiceOption[] = useDiff
    ? [...offs.map((x) => ({ label: sayDiff(d, hi, lo, a - b + x), whyWrong: 'Lies beide Werte genau ab und bilde die Differenz.' })), { label: sayDiff(d, lo, hi, a - b), whyWrong: 'Hier ist es anders herum. Lies beide Werte noch einmal ab.' }]
    : offs.map((x) => ({ label: saySum(d, hi, lo, a + b + x), whyWrong: 'Lies beide Werte genau ab und addiere.' }));
  const answer = makeChoice(rng, { label: correct }, rng.shuffle(wrongs), { max: 3 });
  const prompt = 'Rechne nach. Welche Aussage passt zum Diagramm?';
  const visual = barChart(d.theme, d.cats, d.values, step);
  return build(SKILL, 1, {
    key: `rechnen:${d.theme.id}:${step}:${chartWords(d.cats, d.values)}:${useDiff}:${hi}:${lo}`,
    ab,
    prompt,
    visual,
    answer,
    hints: ['Lies zuerst die beiden genannten Werte ab.', 'Rechne dann nach und vergleiche mit der Aussage.'],
    steps: [`${d.cats[hi]}: ${fmt(a)}, ${d.cats[lo]}: ${fmt(b)}.`, useDiff ? `${fmt(a)} − ${fmt(b)} = ${fmt(a - b)}` : `${fmt(a)} + ${fmt(b)} = ${fmt(a + b)}`, `Diese Aussage passt: ${correct}`],
    praise: 'Du hast die Aussage mit einer Rechnung geprüft.',
    srText: say([prompt, chartSpeech(visual)], answer),
    kmk: KMK,
  });
}

function fitsDouble(rng: Rng, ab: Ab): Exercise {
  const step = 10;
  const theme = rng.pick(THEMES);
  const cats = pickCategories(rng, theme, 4);
  const small = rng.int(1, 4) * step;
  const rest = rng.sample([10, 20, 30, 40, 50, 60, 70, 80, 90].filter((v) => v !== small && v !== 2 * small && v !== small / 2 && v !== 4 * small), 2);
  const [i, j, k, l] = rng.shuffle([0, 1, 2, 3]);
  const values = cats.map((_, x) => (x === i ? 2 * small : x === j ? small : x === k ? rest[0] : rest[1]));
  const d: Data = { theme, cats, values };
  const notDouble: [number, number][] = [[k, j], [l, j], [i, k]].filter(([x, y]) => values[x] !== 2 * values[y]) as [number, number][];
  const wrongs: ChoiceOption[] = [
    ...notDouble.slice(0, 2).map(([x, y]) => ({ label: sayTwice(d, x, y), whyWrong: `Rechne nach: Das Doppelte von ${fmt(values[y])} ist ${fmt(2 * values[y])}.` })),
    { label: sayTwice(d, j, i), whyWrong: 'Hier ist es anders herum. Lies beide Werte noch einmal ab.' },
  ];
  const correct = sayTwice(d, i, j);
  const answer = makeChoice(rng, { label: correct }, wrongs);
  const prompt = 'Vergleiche die Werte. Welche Aussage passt zum Diagramm?';
  const visual = barChart(theme, cats, values, step);
  return build(SKILL, 1, {
    key: `doppelt:${theme.id}:${chartWords(cats, values)}:${i}:${j}`,
    ab,
    prompt,
    visual,
    answer,
    hints: ['Doppelt so viele heißt: Der eine Wert ist 2-mal der andere.', 'Rechne bei jeder Aussage das Doppelte aus.'],
    steps: [`Lies ab: ${chartWords(cats, values, fmt)}.`, `${fmt(small)} · 2 = ${fmt(2 * small)}`, `Diese Aussage passt: ${correct}`],
    praise: 'Du hast das Doppelte ausgerechnet und verglichen.',
    srText: say([prompt, chartSpeech(visual)], answer),
    kmk: KMK,
  });
}

// ─── Stufe 2: a shortened axis ───────────────────────────────────────────────

/** Start and step of a shortened axis: the start is at least 5 times the whole span, so the bars look quite different and the values hardly differ. */
const SHORT_AXES: readonly (readonly [start: number, step: number])[] = [[50, 2], [100, 2], [100, 5], [200, 5], [200, 10], [500, 10]];

function shortData(rng: Rng): Data & { start: number; step: number } {
  const [start, step] = rng.pick(SHORT_AXES);
  const theme = rng.pick(THEMES);
  const n = rng.int(3, 4);
  const cats = pickCategories(rng, theme, n);
  return { theme, cats, values: multiples(rng, n, step, 6).map((v) => start + v), start, step };
}

const TIMES_WORD: Record<number, string> = { 2: 'doppelt so viele', 3: 'dreimal so viele' };

/** Two bars on a shortened axis, as boxes above the start: lowK and highK. */
interface TimesPair {
  start: number;
  step: number;
  lowK: number;
  highK: number;
  factor: number;
}

/** The higher bar looks factor times as high, and the numbers say otherwise. */
function heightsPair(rng: Rng): TimesPair {
  const [start, step] = rng.pick(SHORT_AXES);
  const factor = rng.pick([2, 3]);
  const lowK = factor === 3 ? rng.int(1, 2) : rng.int(1, 3);
  return { start, step, lowK, highK: lowK * factor, factor };
}

/** The numbers really are factor times as large, and the higher bar looks much higher than that. */
const NUMBER_PAIRS: readonly TimesPair[] = (() => {
  const out: TimesPair[] = [];
  for (const start of [50, 100, 200]) {
    for (const step of [10, 20, 50]) {
      for (const factor of [2, 3]) {
        for (const lowK of [1, 2, 3]) {
          const highK = (factor * (start + lowK * step) - start) / step;
          if (Number.isInteger(highK) && highK <= 10) out.push({ start, step, lowK, highK, factor });
        }
      }
    }
  }
  return out;
})();

/** Two bars at least 2 boxes apart that look factor times as high as each other, and the other bars of the chart. */
function misleadingChart(rng: Rng): Data & TimesPair & { hi: number; lo: number } {
  let pair = heightsPair(rng);
  while (pair.highK - pair.lowK < 2) pair = heightsPair(rng);
  const theme = rng.pick(THEMES);
  const n = rng.int(3, 4);
  const cats = pickCategories(rng, theme, n);
  const [hi, lo, ...rest] = rng.shuffle(cats.map((_, k) => k));
  const others = rng.sample([1, 2, 3, 4, 5, 6].filter((k) => k !== pair.lowK && k !== pair.highK), rest.length);
  const ks = cats.map((_, k) => (k === hi ? pair.highK : k === lo ? pair.lowK : others[rest.indexOf(k)]));
  return { ...pair, theme, cats, values: ks.map((k) => pair.start + k * pair.step), hi, lo };
}

const LOOKS = (factor: number) => (factor === 2 ? 'doppelt' : 'dreimal');
const BOXES_WHY = (step: number) => `Das sind die Kästchen. Ein Kästchen zählt ${fmt(step)}.`;
const HEIGHTS_WHY = 'Das zeigen nur die Höhen. Rechne mit den Zahlen an der Achse.';

/** The bars look far apart: how far apart are the numbers? */
function realDifference(rng: Rng, ab: Ab): Exercise {
  const d = misleadingChart(rng);
  const { theme, cats, values, hi, lo, step, factor, start } = d;
  const a = values[hi];
  const b = values[lo];
  const diff = a - b;
  const label = (x: number) => `${fmt(x)} ${theme.unit}`;
  const answer = makeChoice(rng, { label: label(diff) }, rng.shuffle<ChoiceOption>([
    { label: label(d.highK - d.lowK), whyWrong: BOXES_WHY(step) },
    { label: label((factor - 1) * b), whyWrong: HEIGHTS_WHY },
    { label: label(a), whyWrong: `Das ist nur der eine Wert. Rechne auch mit dem Wert ${theme.at(cats[lo])}.` },
  ]));
  const context = `Die Säule ${theme.at(cats[hi])} sieht ${LOOKS(factor)} so hoch aus wie ${theme.at(cats[lo])}.`;
  const prompt = `Wie viele ${theme.unit} sind es wirklich mehr?`;
  const visual = barChart(theme, cats, values, step, { start });
  return build(SKILL, 2, {
    key: `unterschied:${theme.id}:${start}:${step}:${chartWords(cats, values)}:${hi}:${lo}`,
    ab,
    context,
    prompt,
    visual,
    answer,
    hints: ['Vergleiche die Zahlen an der Achse, nicht die Höhen.', 'Lies beide Werte ab. Rechne dann minus.'],
    steps: [`Die Achse beginnt bei ${fmt(start)}, nicht bei 0.`, `${cats[hi]}: ${fmt(a)}, ${cats[lo]}: ${fmt(b)}.`, `${fmt(a)} − ${fmt(b)} = ${fmt(diff)}`, `Es sind nur ${label(diff)} mehr.`],
    praise: 'Du hast mit den Zahlen der Achse gerechnet.',
    srText: say([context, prompt, chartSpeech(visual)], answer),
    kmk: KMK,
  });
}

/** Four sentences: what the heights suggest, and what the numbers say. Any of two forms can be the right one. */
function fitsShortAxis(rng: Rng, ab: Ab): Exercise {
  const d = misleadingChart(rng);
  const { theme, cats, values, hi, lo, step, factor, start, highK, lowK } = d;
  const a = values[hi];
  const b = values[lo];
  const diff = a - b;
  const asDiff = rng.chance(0.5);
  const named = rng.chance(0.5) ? hi : lo;
  // the other group of the two, read from the bottom of the picture as if the axis began at 0
  const misread = named === hi && !asDiff ? [lo, lowK] : [hi, highK];
  const correct = asDiff ? sayDiff(d, hi, lo, diff) : sayValue(d, named, values[named]);
  const answer = makeChoice(rng, { label: correct }, [
    { label: `${atCap(d, hi)} sind es ${TIMES_WORD[factor]} ${theme.unit} wie ${theme.at(cats[lo])}.`, whyWrong: HEIGHTS_WHY },
    { label: sayDiff(d, hi, lo, highK - lowK), whyWrong: BOXES_WHY(step) },
    { label: sayValue(d, misread[0], misread[1] * step), whyWrong: 'Die Achse beginnt nicht bei 0. Lies den Wert an der Achse ab.' },
  ]);
  const prompt = 'Schau auf die Zahlen an der Achse. Welcher Satz stimmt?';
  const visual = barChart(theme, cats, values, step, { start });
  return build(SKILL, 2, {
    key: `satz:${theme.id}:${start}:${step}:${chartWords(cats, values)}:${hi}:${lo}:${asDiff ? 'mehr' : named}`,
    ab,
    prompt,
    visual,
    answer,
    hints: ['Vergleiche die Zahlen an der Achse, nicht die Höhen.', 'Lies die genannten Werte ab und prüfe jeden Satz.'],
    steps: [`Die Achse beginnt bei ${fmt(start)}, nicht bei 0.`, `${cats[hi]}: ${fmt(a)}, ${cats[lo]}: ${fmt(b)}.`, `Diese Aussage passt: ${correct}`],
    praise: 'Du hast jeden Satz an den Zahlen geprüft.',
    srText: say([prompt, chartSpeech(visual)], answer),
    kmk: KMK,
  });
}

/** A claim on a shortened axis that holds on the numbers in half of the items: the answer depends on the chart, never on the wording. */
function claimFromHeights(rng: Rng, ab: Ab): Exercise {
  const claimHolds = rng.chance(0.5);
  const { start, step, lowK, highK, factor } = claimHolds ? rng.pick(NUMBER_PAIRS) : heightsPair(rng);
  const theme = rng.pick(THEMES);
  const cats = pickCategories(rng, theme, 3);
  const others = Array.from({ length: Math.max(6, highK) }, (_, i) => i + 1).filter((k) => k !== lowK && k !== highK);
  const [hi, lo, third] = rng.shuffle([0, 1, 2]);
  const ks = [0, 0, 0];
  ks[hi] = highK;
  ks[lo] = lowK;
  ks[third] = rng.pick(others);
  const values = ks.map((k) => start + k * step);
  const person = pickPerson(rng);
  const claim = `${cap(theme.at(cats[hi]))} sind es ${TIMES_WORD[factor]} ${theme.unit} wie ${theme.at(cats[lo])}`;
  const context = `${person.name} liest das Diagramm so. ${claim}.`;
  const prompt = 'Stimmt diese Aussage?';
  const times = values[lo] * factor;
  const read = `${fmt(values[hi])} und ${fmt(values[lo])} ${theme.unit}`;
  const misread = `${fmt(values[hi] + step)} und ${fmt(values[lo])} ${theme.unit}`;
  const yes = `Ja. Es sind ${read}.`;
  const no = `Nein. Es sind ${read}.`;
  const reckon = `Rechne: ${fmt(values[lo])} · ${factor} = ${fmt(times)}.`;
  const lookAgain = 'Lies den höheren Wert noch einmal an der Achse ab.';
  const correct = claimHolds ? yes : no;
  // Ja and Nein, and the right numbers, stand twice in every item
  const wrongs: ChoiceOption[] = claimHolds
    ? [
        { label: no, whyWrong: `${reckon} Die Aussage passt also.` },
        { label: `Ja. Es sind ${misread}.`, whyWrong: lookAgain },
        { label: 'Nein. Die eine Säule ist viel höher.', whyWrong: AXIS_WARNING },
      ]
    : [
        { label: yes, whyWrong: `${reckon} Das ist nicht der höhere Wert.` },
        { label: `Nein. Es sind ${misread}.`, whyWrong: lookAgain },
        { label: `Ja. Die Säule ist ${factor === 2 ? 'doppelt' : 'dreimal'} so hoch.`, whyWrong: AXIS_WARNING },
      ];
  const answer = makeChoice(rng, { label: correct }, wrongs);
  const visual = barChart(theme, cats, values, step, { start });
  return build(SKILL, 2, {
    key: `behauptung:${theme.id}:${start}:${step}:${chartWords(cats, values)}:${factor}:${person.name}:${hi}:${lo}`,
    ab,
    context,
    prompt,
    visual,
    answer,
    hints: ['Lies die beiden Werte an der Achse ab. Vergleiche die Zahlen, nicht die Höhen.', AXIS_WARNING],
    steps: [`Die Achse beginnt bei ${fmt(start)}, nicht bei 0.`, `${cats[hi]}: ${fmt(values[hi])}, ${cats[lo]}: ${fmt(values[lo])}.`, `${fmt(values[lo])} · ${factor} = ${fmt(times)}`, `Die Antwort: ${correct}`],
    praise: 'Du hast die Zahlen verglichen und nicht nur die Höhen.',
    srText: say([context, prompt, chartSpeech(visual)], answer),
    kmk: KMK,
  });
}

/** The same chart with an axis from 0: how tall is one bar? The child reasons from the chart's own numbers, and sees how much the picture left out. */
function axisFromZero(rng: Rng, ab: Ab): Exercise {
  const d = shortData(rng);
  const i = rng.int(0, d.cats.length - 1);
  const value = d.values[i];
  const boxes = value / d.step;
  const inPicture = (value - d.start) / d.step;
  const left = d.start / d.step;
  const label = (n: number) => `${fmt(n)} Kästchen`;
  const wrongs: ChoiceOption[] = [
    { label: label(inPicture), whyWrong: 'So hoch ist die Säule im Bild. Von 0 aus kommt das untere Stück dazu.' },
    { label: label(left), whyWrong: 'Das ist nur das untere Stück. Die Höhe im Bild kommt dazu.' },
    { label: label(value), whyWrong: `Das ist der Wert. Ein Kästchen zählt ${fmt(d.step)}.` },
    { label: label(boxes + inPicture), whyWrong: 'Das ist zu viel. Teile den Wert durch die Zahl pro Kästchen.' },
  ];
  const answer = makeChoice(rng, { label: label(boxes) }, rng.shuffle(wrongs));
  const context = `Die Achse soll bei 0 beginnen. Ein Kästchen zählt weiterhin ${fmt(d.step)}.`;
  const prompt = `Wie viele Kästchen hoch ist dann die Säule ${d.theme.at(d.cats[i])}?`;
  const visual = barChart(d.theme, d.cats, d.values, d.step, { start: d.start });
  return build(SKILL, 2, {
    key: `von-null:${d.theme.id}:${d.start}:${d.step}:${chartWords(d.cats, d.values)}:${i}`,
    ab,
    context,
    prompt,
    visual,
    answer,
    hints: ['Von 0 aus reicht die Säule bis zu ihrem Wert.', 'Lies den Wert ab. Teile den Wert durch die Zahl pro Kästchen.'],
    steps: [`${d.cats[i]}: ${fmt(value)}.`, `${fmt(value)} : ${fmt(d.step)} = ${fmt(boxes)}`, `Von 0 aus sind es ${fmt(boxes)} Kästchen. Im Bild ${plural(inPicture, 'ist', 'sind')} es ${fmt(inPicture)}.`, 'Von 0 aus sehen die Säulen fast gleich hoch aus.'],
    praise: 'Du hast die Höhe von der 0 aus berechnet.',
    srText: say([context, prompt, chartSpeech(visual)], answer),
    kmk: KMK,
  });
}

// ─── Stufe 3: the fitting chart, the claim that does not fit ─────────────────

const STILL_TRUE = 'Diese Aussage stimmt. Such die Aussage mit dem Fehler.';

/** The four forms of statement, each in every item; any of them can be the one that does not hold, so the form says nothing. */
function wrongClaim(rng: Rng, ab: Ab): Exercise {
  const step = rng.pick([20, 50]);
  const d = dataOf(rng, 4, step / 2, 16);
  const [hi, lo] = pairOf(rng, d);
  const a = d.values[hi];
  const b = d.values[lo];
  const top = indexOfMax(d.values);
  const notTop = rng.pick(d.cats.map((_, k) => k).filter((k) => k !== top));
  const kind = rng.pick(['sum', 'diff', 'more', 'most'] as const);
  const statements = {
    sum: kind === 'sum' ? saySum(d, hi, lo, a + b + step) : saySum(d, hi, lo, a + b),
    diff: kind === 'diff' ? sayDiff(d, hi, lo, a - b + step) : sayDiff(d, hi, lo, a - b),
    more: kind === 'more' ? sayMore(d, lo, hi) : sayMore(d, hi, lo),
    most: kind === 'most' ? sayMost(d, notTop) : sayMost(d, top),
  };
  const why = {
    sum: [`${fmt(a)} + ${fmt(b)} = ${fmt(a + b)}`, `Die Aussage nennt ${fmt(a + b + step)}. Diese Aussage stimmt nicht.`],
    diff: [`${fmt(a)} − ${fmt(b)} = ${fmt(a - b)}`, `Die Aussage nennt ${fmt(a - b + step)}. Diese Aussage stimmt nicht.`],
    more: [`${d.cats[hi]}: ${fmt(a)}, ${d.cats[lo]}: ${fmt(b)}.`, `Der größere Wert steht ${d.theme.at(d.cats[hi])}. Diese Aussage stimmt nicht.`],
    most: [`Der größte Wert ist ${fmt(d.values[top])}.`, `Er steht ${d.theme.at(d.cats[top])}. Diese Aussage stimmt nicht.`],
  };
  const truths: ChoiceOption[] = (['sum', 'diff', 'more', 'most'] as const).filter((k) => k !== kind).map((k) => ({ label: statements[k], whyWrong: STILL_TRUE }));
  const answer = makeChoice(rng, { label: statements[kind] }, truths);
  const prompt = 'Welche Aussage stimmt nicht?';
  const visual = barChart(d.theme, d.cats, d.values, step);
  return build(SKILL, 3, {
    key: `aussage:${d.theme.id}:${step}:${chartWords(d.cats, d.values)}:${hi}:${lo}:${kind}`,
    ab,
    prompt,
    visual,
    answer,
    hints: ['Prüfe jede Aussage am Diagramm. Rechne bei Zahlen nach.', 'Manche Werte liegen zwischen zwei Linien der Achse.'],
    steps: [`Lies ab: ${chartWords(d.cats, d.values, fmt)}.`, ...why[kind]],
    praise: 'Du hast jede Aussage nachgerechnet und den Fehler gefunden.',
    srText: say([prompt, chartSpeech(visual)], answer),
    kmk: KMK,
  });
}

function fittingBarChart(rng: Rng, ab: Ab): Exercise {
  const theme = rng.pick(THEMES);
  const cats = pickCategories(rng, theme, 3);
  const step = 10;
  const m = rng.int(2, 4) * step;
  const low = rng.int(1, Math.max(1, m / step - 1)) * step;
  const values = [2 * m, m, low];
  const t = (i: number) => theme.at(cats[i]);
  const context = `${cap(t(0))} sind es doppelt so viele ${theme.unit} wie ${t(1)}. ${cap(t(2))} sind es am wenigsten ${theme.unit}.`;
  const prompt = 'Welches Diagramm passt zu diesen Sätzen?';
  const correct = barChart(theme, cats, values, step);
  const answer = pictureChoice(rng, 'Diagramm', correct, [
    { visual: barChart(theme, cats, [m, 2 * m, low], step), whyWrong: `Hier ist es ${t(1)} doppelt so viel. Lies die Sätze noch einmal.` },
    { visual: barChart(theme, cats, [2 * m, m + step, low], step), whyWrong: `Rechne das Doppelte vom Wert ${t(1)} aus.` },
    { visual: barChart(theme, cats, [2 * m, low, m], step), whyWrong: `${cap(t(2))} steht hier nicht der kleinste Wert.` },
  ]);
  const words = answer.options.map((o) => (o.visual?.type === 'barChart' ? `${o.label}: ${chartWords(o.visual.categories, o.visual.values)}.` : '')).join(' ');
  return build(SKILL, 3, {
    key: `passendes-diagramm:${theme.id}:${chartWords(cats, values)}`,
    ab,
    context,
    prompt,
    answer,
    hints: ['Prüfe zuerst den ersten Satz an jedem Diagramm.', 'Lies die Werte ab und rechne das Doppelte nach.'],
    steps: [`${fmt(m)} · 2 = ${fmt(2 * m)}`, `Der kleinste Wert steht ${t(2)}.`, `Das passende Bild ist ${answer.options[answer.correct].label}.`],
    praise: 'Du hast beide Sätze an den Diagrammen geprüft.',
    srText: say([context, prompt, words]),
    kmk: KMK,
  });
}

/** Shares largest first. Inside a set of pies every slice keeps its rank, so the sizes alone decide nothing; the largest slices lie 15 % apart, so a share worked out from the table can be seen in the picture. */
const PIE_SETS: readonly (readonly (readonly number[])[])[] = [
  [[75, 15, 10], [60, 30, 10], [45, 35, 20]],
  [[70, 20, 10], [55, 30, 15], [40, 35, 25]],
];

function fittingPie(rng: Rng, ab: Ab): Exercise {
  const survey = rng.pick(SURVEYS);
  const labels = rng.sample(survey.options, 3);
  // a whole year group, as these numbers are too large for one class; never 100, as the table would show the percent
  const total = rng.pick([40, 60, 80, 120]);
  const [shares, ...otherShares] = rng.shuffle(rng.pick(PIE_SETS));
  const order = rng.shuffle([0, 1, 2]);
  const inOrder = (set: readonly number[]) => order.map((k) => set[k]);
  const percent = inOrder(shares);
  const counts = percent.map((p) => (p * total) / 100);
  const title = `${survey.title} im Jahrgang`;
  const correct = pieChart(title, labels, percent, 'none');
  const largest = percent.indexOf(Math.max(...percent));
  const answer = pictureChoice(rng, 'Kreis', correct, otherShares.map((set) => ({ visual: pieChart(title, labels, inOrder(set), 'none'), whyWrong: `Rechne nach: Wie viel Prozent sind ${fmt(counts[largest])} von ${fmt(total)}?` })));
  const words = answer.options.map((o) => (o.visual?.type === 'pieChart' ? `${o.label}: ${o.visual.slices.map((s) => `${s.label} ${fmtPercent(s.value)}`).join(', ')}.` : '')).join(' ');
  const prompt = 'Welcher Kreis passt zur Tabelle?';
  const visual: VisualOf<'table'> = { type: 'table', caption: title, header: ['Antwort', 'Personen'], rows: labels.map((l, i) => [l, fmt(counts[i])]) };
  return build(SKILL, 3, {
    key: `passender-kreis:${survey.id}:${labels.join('-')}:${percent.join('-')}:${total}`,
    ab,
    prompt,
    visual,
    answer,
    hints: ['Rechne zuerst die Summe aller Personen aus.', 'Rechne den größten Wert in Prozent um. Vergleiche dann die Kreise.'],
    steps: [`Insgesamt: ${counts.map((c) => fmt(c)).join(' + ')} = ${fmt(sum(counts))}`, ...labels.map((l, k) => `„${l}“: ${fmt(counts[k])} von ${fmt(total)} sind ${fmtPercent(percent[k])}.`), `Das passende Bild ist ${answer.options[answer.correct].label}.`],
    praise: 'Du hast die Anteile aus der Tabelle berechnet.',
    srText: say([prompt, tableWords(visual), words]),
    kmk: KMK,
  });
}

/** The same four forms of statement in every item. The claim on 'so viele' fails on the numbers in some items and holds in others; one of the others fails instead. */
function shortAxisClaims(rng: Rng, ab: Ab): Exercise {
  const kind = rng.chance(0.4) ? 'times' : rng.pick(['diff', 'most', 'axis'] as const);
  const { start, step, lowK, highK, factor } = kind === 'times' ? heightsPair(rng) : rng.pick(NUMBER_PAIRS);
  const theme = rng.pick(THEMES);
  const cats = pickCategories(rng, theme, 3);
  const thirdK = rng.pick([highK + 1, ...Array.from({ length: highK }, (_, i) => i + 1)].filter((k) => k !== lowK && k !== highK));
  const [lo, mi, third] = rng.shuffle([0, 1, 2]);
  const ks = [0, 0, 0];
  ks[lo] = lowK;
  ks[mi] = highK;
  ks[third] = thirdK;
  const values = ks.map((k) => start + k * step);
  const d: Data = { theme, cats, values };
  const top = indexOfMax(values);
  const notTop = rng.pick([0, 1, 2].filter((k) => k !== top));
  const diff = values[mi] - values[lo];
  const statements = {
    times: `${atCap(d, mi)} sind es ${TIMES_WORD[factor]} ${theme.unit} wie ${theme.at(cats[lo])}.`,
    diff: sayDiff(d, mi, lo, kind === 'diff' ? diff + step : diff),
    most: sayMost(d, kind === 'most' ? notTop : top),
    axis: `Die Achse beginnt bei ${fmt(kind === 'axis' ? start + step : start)}.`,
  };
  const why = {
    times: [`${fmt(values[lo])} · ${factor} = ${fmt(values[lo] * factor)}`, 'Die Höhen täuschen. Diese Aussage stimmt also nicht.'],
    diff: [`${fmt(values[mi])} − ${fmt(values[lo])} = ${fmt(diff)}`, `Die Aussage nennt ${fmt(diff + step)}. Diese Aussage stimmt nicht.`],
    most: [`Der größte Wert ist ${fmt(values[top])}.`, `Er steht ${theme.at(cats[top])}. Diese Aussage stimmt nicht.`],
    axis: [`Die unterste Zahl der Achse ist ${fmt(start)}.`, 'Diese Aussage stimmt nicht.'],
  };
  const answer = makeChoice(rng, { label: statements[kind] }, (['times', 'diff', 'most', 'axis'] as const).filter((k) => k !== kind).map((k) => ({ label: statements[k], whyWrong: STILL_TRUE })));
  const prompt = 'Lies die Zahlen an der Achse. Welche Aussage stimmt nicht?';
  const visual = barChart(theme, cats, values, step, { start });
  return build(SKILL, 3, {
    key: `kurze-achse:${theme.id}:${start}:${step}:${chartWords(cats, values)}:${factor}:${kind}:${mi}:${lo}:${notTop}`,
    ab,
    prompt,
    visual,
    answer,
    hints: [AXIS_WARNING, 'Vergleiche die Zahlen an der Achse, nicht die Höhen der Säulen.'],
    steps: [`Die Achse beginnt bei ${fmt(start)}.`, `${cats[mi]}: ${fmt(values[mi])}, ${cats[lo]}: ${fmt(values[lo])}.`, ...why[kind]],
    praise: 'Du hast die Zahlen geprüft und die Höhen nicht geglaubt.',
    srText: say([prompt, chartSpeech(visual)], answer),
    kmk: KMK,
  });
}

function pieClaims(rng: Rng, ab: Ab): Exercise {
  const survey = rng.pick(SURVEYS);
  const labels = rng.sample(survey.options, 3);
  const total = rng.pick([40, 60, 80, 200]);
  const percent = partition(rng, 3, 5);
  const counts = percent.map((p) => (p * total) / 100);
  const visual = pieChart(`${survey.title}: ${fmt(total)} Personen`, labels, percent, 'percent');
  const i = rng.int(0, 2);
  const j = (i + 1) % 3;
  const k = (i + 2) % 3;
  const claim = `${fmt(percent[i])} Personen wählen „${labels[i]}“.`;
  const fair = `${fmt(counts[j])} Personen wählen „${labels[j]}“.`;
  const fair2 = `„${labels[k]}“ hat einen Anteil von ${fmtPercent(percent[k])}.`;
  const fair3 = `Insgesamt sind es ${fmt(total)} Personen.`;
  const answer = makeChoice(rng, { label: claim }, [
    { label: fair, whyWrong: STILL_TRUE },
    { label: fair2, whyWrong: STILL_TRUE },
    { label: fair3, whyWrong: STILL_TRUE },
  ]);
  const prompt = 'Welche Aussage stimmt nicht?';
  return build(SKILL, 3, {
    key: `kreis-aussage:${survey.id}:${labels.join('-')}:${percent.join('-')}:${total}:${i}`,
    ab,
    prompt,
    visual,
    answer,
    hints: ['Prozent sind nicht die Anzahl der Personen.', `Rechne bei jeder Anzahl nach: Anteil von ${fmt(total)} Personen.`],
    steps: [`${fmtPercent(percent[i])} von ${fmt(total)} sind ${fmt(counts[i])} Personen.`, `Die Aussage nennt ${fmt(percent[i])} Personen.`, 'Diese Aussage stimmt nicht.'],
    praise: 'Du hast Prozent und Anzahl sauber getrennt.',
    srText: say([prompt, pieWords(visual)], answer),
    kmk: KMK,
  });
}

function stufe3(rng: Rng, ab: Ab): Exercise {
  if (ab === 1) return wrongClaim(rng, ab);
  if (ab === 2) return rng.chance(0.5) ? fittingBarChart(rng, ab) : fittingPie(rng, ab);
  return rng.chance(0.5) ? shortAxisClaims(rng, ab) : pieClaims(rng, ab);
}

export const kritischSkill: SkillDef = {
  ...SKILL,
  title: 'Diagramme prüfen',
  description: 'Du prüfst, ob ein Diagramm und eine Aussage zusammenpassen.',
  stufen: {
    1: 'Welche Aussage passt zum Diagramm?',
    2: 'Verkürzte Achse: Täuscht das Bild?',
    3: 'Das passende Diagramm wählen und die unpassende Aussage finden',
  },
  kmk: KMK,
  generate(rng, stufe: Stufe, ctx) {
    const ab = targetAb(rng, stufe, ctx);
    if (stufe === 1) return ab === 1 ? fitsDirect(rng, ab) : ab === 2 ? fitsWithSum(rng, ab) : fitsDouble(rng, ab);
    if (stufe === 2) return ab === 1 ? (rng.chance(0.5) ? realDifference(rng, ab) : fitsShortAxis(rng, ab)) : ab === 2 ? claimFromHeights(rng, ab) : axisFromZero(rng, ab);
    return stufe3(rng, ab);
  },
};

