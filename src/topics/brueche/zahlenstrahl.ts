/**
 * Brüche am Zahlenstrahl: read and place, positions counted in integer steps of the Nenner, never as floats.
 * Stufe 1 (0 to 1, Nenner 2, 4, 5, 10, ticks given): AB I read an arrow, AB II place a fraction, AB III place on finer ticks, or read and shorten.
 * Stufe 2 (0 to 3, unechte Brüche, ticks given): AB I read an arrow, AB II place a fraction, AB III read with only the ends labelled, or name the Ganze around a fraction.
 * Stufe 3 (0 to 2, no matching ticks, estimate with tolerance): AB I with ticks at the halves, AB II with ticks at the Ganze only, AB III Nenner 7, 9, 11, or which fraction fits an arrow,
 * all of its options on the same side of 1.
 */
import { frac } from '../../core/format';
import type { Bug, ChoiceOption, NumberLineAnswer, SkillDef, Visual, VisualOf } from '../../core/types';
import { build, fractionAnswer, makeChoice, numberBugs } from '../shared';
import { byStufeAndAb, fracOf, gcd, isLowest, lineWords, lowest, partsName, range, speak, valueBugs, type Form, type Frac } from './helpers';

const SKILL = { id: 'brueche.zahlenstrahl', topicId: 'brueche' } as const;
const KMK = ['ZO.bruch-bedeutung', 'PK.darstellen'];

type Line = VisualOf<'numberLine'>;

/** A line from 0 to `wholes`, in steps of 1/d. tickEvery: positions between two ticks. */
const line = (d: number, wholes: number, tickEvery = 1, labels?: number[]): Line => ({
  type: 'numberLine',
  min: 0,
  max: wholes * d,
  majorStep: d,
  minorStep: tickEvery,
  labelMajor: !labels,
  ...(labels ? { labels } : {}),
  denominator: d,
  labelFormat: 'fraction',
});

/** The answer that places an arrow on this line. */
const placing = (l: Line, value: number, tolerance = 0): NumberLineAnswer => ({
  kind: 'numberline',
  min: l.min,
  max: l.max,
  majorStep: l.majorStep,
  minorStep: l.minorStep,
  step: 1,
  value,
  tolerance,
  labelMajor: l.labelMajor,
  ...(l.labels ? { labels: l.labels } : {}),
  denominator: l.denominator,
  labelFormat: l.labelFormat,
});

const withMark = (l: Line, value: number): Visual => ({ ...l, marks: [{ value, label: 'A' }] });

const readBugs = (n: number, d: number, wholes: number): Bug[] => valueBugs([
  { id: 'striche-gezaehlt', match: { numerator: n, denominator: d + 1 }, hint: 'Zähle die Abschnitte von 0 bis 1, nicht die Striche.' },
  { id: 'null-mitgezaehlt', match: { numerator: n + 1, denominator: d }, hint: 'Die 0 ist der Anfang. Der erste Schritt endet am ersten Strich.' },
  wholes === 1 && { id: 'von-rechts-gezaehlt', match: { numerator: d - n, denominator: d }, hint: 'Zähle von der 0 aus nach rechts.' },
  wholes > 1 && n > d && { id: 'nur-letztes-ganzes', match: { numerator: n % d, denominator: d }, hint: 'Zähle ab 0, nicht erst ab der letzten ganzen Zahl.' },
  { id: 'vertauscht', match: { numerator: d, denominator: n }, hint: 'Der Nenner sagt: So viele Abschnitte hat 1 Ganzes.' },
], { numerator: n, denominator: d });

/** Read an arrow on a line of d-ths. */
function readArrow(d: number, n: number, wholes: number, onlyEnds = false): Pick<Parameters<typeof build>[2], 'prompt' | 'visual' | 'answer' | 'hints' | 'steps' | 'bugs' | 'praise' | 'srText'> {
  const l = line(d, wholes, 1, onlyEnds ? [0, wholes * d] : undefined);
  const prompt = 'Welcher Bruch gehört zum Pfeil A?';
  return {
    prompt,
    visual: withMark(l, n),
    answer: fractionAnswer(n, d, { accept: 'equivalent' }),
    hints: onlyEnds ? [`Die langen Striche sind die Ganzen. Der Strahl endet bei ${wholes}.`, 'Zähle die kurzen Abschnitte von 0 bis 1.'] : ['Zähle die Abschnitte von 0 bis 1. Das ist der Nenner.', 'Zähle dann von 0 bis zum Pfeil. Das ist der Zähler.'],
    steps: [`Von 0 bis 1 sind es ${d} gleiche Abschnitte. Der Nenner ist ${d}.`, `Von 0 bis A sind es ${n} ${n === 1 ? 'Abschnitt' : 'Abschnitte'}. Der Zähler ist ${n}.`, `Der Pfeil A zeigt ${frac(n, d)}.`],
    bugs: readBugs(n, d, wholes),
    praise: 'Du hast die Abschnitte von 0 bis 1 gezählt.',
    srText: speak(prompt),
  };
}

const placeBugs = (n: number, d: number, max: number): Bug[] => numberBugs([
  n + 1 <= max && { id: 'null-mitgezaehlt', match: n + 1, hint: 'Die 0 ist der Anfang. Der erste Schritt endet am ersten Strich.' },
  d - n > 0 && { id: 'von-rechts-gezaehlt', match: d - n, hint: 'Zähle von der 0 aus nach rechts.' },
  n > d && { id: 'nur-letztes-ganzes', match: n % d, hint: 'Der Bruch ist größer als 1. Zähle über die 1 hinaus.' },
], n);

const S1_FRACTIONS: readonly Frac[] = [2, 4, 5, 10].flatMap((d) => range(1, d - 1).map((n): Frac => [n, d]));

/** Stufe 1, AB I. */
const readUnit: Form = (rng, stufe, ab) => {
  const [n, d] = rng.pick(S1_FRACTIONS);
  return build(SKILL, stufe, { key: `lesen:${n}/${d}`, ab, ...readArrow(d, n, 1), kmk: KMK });
};

/** Stufe 1, AB II. */
const placeUnit: Form = (rng, stufe, ab) => {
  const [n, d] = rng.pick(S1_FRACTIONS);
  const l = line(d, 1);
  const prompt = `Setze den Pfeil auf ${frac(n, d)}.`;
  return build(SKILL, stufe, {
    key: `setzen:${n}/${d}`,
    ab,
    prompt,
    answer: placing(l, n),
    hints: ['Zähle die Abschnitte von 0 bis 1. Passt die Zahl zum Nenner?', 'Der Zähler sagt: So viele Abschnitte gehst du von 0 aus.'],
    steps: [`Von 0 bis 1 sind es ${d} Abschnitte.`, { text: `Geh von 0 aus ${n} ${n === 1 ? 'Abschnitt' : 'Abschnitte'} nach rechts. Dort liegt ${frac(n, d)}.`, visual: withMark(l, n) }],
    bugs: placeBugs(n, d, d),
    praise: 'Du hast von 0 aus die Abschnitte gezählt.',
    srText: speak(`${lineWords(l)} ${prompt}`),
    kmk: KMK,
  });
};

/** Stufe 1, AB III: the ticks are finer than the fraction, so the child extends first. */
const placeFiner: Form = (rng, stufe, ab) => {
  const [n, b, d] = rng.pick([[1, 2, 4], [1, 2, 10], [1, 5, 10], [2, 5, 10], [3, 5, 10], [4, 5, 10]] as const);
  const k = d / b;
  const l = line(d, 1);
  const prompt = `Setze den Pfeil auf ${frac(n, b)}. Schau genau auf die Abschnitte.`;
  return build(SKILL, stufe, {
    key: `fein:${n}/${b}:${d}`,
    ab,
    prompt,
    answer: placing(l, n * k),
    hints: ['Zähle die Abschnitte von 0 bis 1. Das sind mehr als im Nenner.', 'Erweitere den Bruch, bis der Nenner zu den Abschnitten passt.'],
    steps: [`Von 0 bis 1 sind es ${d} Abschnitte.`, `Erweitere mit ${k}: ${frac(n, b)} = ${frac(n * k, d)}.`, { text: `Geh ${n * k} Abschnitte nach rechts.`, visual: withMark(l, n * k) }],
    bugs: numberBugs([{ id: 'nicht-erweitert', match: n, hint: 'Die Abschnitte passen noch nicht zum Nenner. Erweitere zuerst.' }, n * k + 1 <= d && { id: 'null-mitgezaehlt', match: n * k + 1, hint: 'Die 0 ist der Anfang. Der erste Schritt endet am ersten Strich.' }], n * k),
    praise: 'Du hast den Bruch passend zu den Abschnitten erweitert.',
    srText: speak(`${lineWords(l)} ${prompt}`),
    kmk: [...KMK, 'ZO.bruch-erweitern'],
  });
};

/** Stufe 1, AB III: read, and shorten as far as it goes. */
const readShorten: Form = (rng, stufe, ab) => {
  const [n, d] = rng.pick(S1_FRACTIONS.filter(([x, y]) => gcd(x, y) > 1));
  const [p, q] = lowest([n, d]);
  const prompt = 'Schreibe den Bruch gekürzt. Welcher Bruch gehört zum Pfeil A?';
  return build(SKILL, stufe, {
    key: `kuerzen:${n}/${d}`,
    ab,
    prompt,
    visual: withMark(line(d, 1), n),
    answer: fractionAnswer(p, q),
    hints: ['Lies zuerst den Bruch am Pfeil ab.', 'Teile dann Zähler und Nenner durch dieselbe Zahl.'],
    steps: [`Der Pfeil zeigt ${frac(n, d)}.`, `Kürze mit ${n / p}: ${frac(n, d)} = ${frac(p, q)}.`],
    bugs: valueBugs([{ id: 'null-mitgezaehlt', match: { numerator: n + 1, denominator: d }, hint: 'Die 0 ist der Anfang. Der erste Schritt endet am ersten Strich.' }, { id: 'striche-gezaehlt', match: { numerator: n, denominator: d + 1 }, hint: 'Zähle die Abschnitte von 0 bis 1, nicht die Striche.' }], { numerator: p, denominator: q }),
    praise: 'Du hast abgelesen und dann gekürzt.',
    srText: speak(prompt),
    kmk: [...KMK, 'ZO.bruch-erweitern'],
  });
};

const S2_NENNER = [2, 3, 4, 5, 6];
const S2_FRACTIONS: readonly Frac[] = S2_NENNER.flatMap((d) => range(d + 1, 3 * d - 1).filter((n) => n % d !== 0).map((n): Frac => [n, d]));

/** Stufe 2, AB I. */
const readImproper: Form = (rng, stufe, ab) => {
  const [n, d] = rng.pick(S2_FRACTIONS);
  return build(SKILL, stufe, { key: `unecht-lesen:${n}/${d}`, ab, ...readArrow(d, n, 3), kmk: KMK });
};

/** Stufe 2, AB II. */
const placeImproper: Form = (rng, stufe, ab) => {
  const [n, d] = rng.pick(S2_FRACTIONS);
  const l = line(d, 3);
  const prompt = `Setze den Pfeil auf ${frac(n, d)}.`;
  const wholes = Math.floor(n / d);
  return build(SKILL, stufe, {
    key: `unecht-setzen:${n}/${d}`,
    ab,
    prompt,
    answer: placing(l, n),
    hints: ['Der Zähler ist größer als der Nenner. Der Bruch liegt also rechts von 1.', `${d} ${partsName(d)} sind 1 Ganzes. Wie viele Ganze stecken im Bruch?`],
    steps: [`${d} ${partsName(d)} sind 1 Ganzes.`, `${wholes} · ${d} = ${wholes * d}, also ist ${frac(n, d)} rechts von ${wholes}.`, { text: `Geh von ${wholes} aus noch ${n - wholes * d} ${n - wholes * d === 1 ? 'Abschnitt' : 'Abschnitte'} weiter.`, visual: withMark(l, n) }],
    bugs: placeBugs(n, d, 3 * d),
    praise: 'Du hast die Ganzen im Bruch gesehen.',
    srText: speak(`${lineWords(l)} ${prompt}`),
    kmk: KMK,
  });
};

/** Stufe 2, AB III: only the ends carry a label. */
const readOnlyEnds: Form = (rng, stufe, ab) => {
  const [n, d] = rng.pick(S2_FRACTIONS);
  return build(SKILL, stufe, { key: `enden:${n}/${d}`, ab, ...readArrow(d, n, 3, true), kmk: [...KMK, 'PK.problemloesen'] });
};

/** Stufe 2, AB III: which Ganze lie around a fraction, without a picture. */
const betweenWholes: Form = (rng, stufe, ab) => {
  const [n, d] = rng.pick(S2_FRACTIONS);
  const low = Math.floor(n / d);
  const label = (x: number) => `zwischen ${x} und ${x + 1}`;
  const prompt = `Wo liegt ${frac(n, d)} auf dem Zahlenstrahl?`;
  const options: ChoiceOption[] = [0, 1, 2].filter((x) => x !== low).map((x) => ({ label: label(x), whyWrong: `Rechne: Wie viele ${partsName(d)} sind ${x + 1} ${x === 0 ? 'Ganzes' : 'Ganze'}?` }));
  return build(SKILL, stufe, {
    key: `zwischen:${n}/${d}`,
    ab,
    prompt,
    answer: makeChoice(rng, { label: label(low) }, options, { order: [0, 1, 2].map(label) }),
    hints: [`${d} ${partsName(d)} sind 1 Ganzes.`, `Wie oft passt ${d} in ${n}?`],
    steps: [`${d} ${partsName(d)} sind 1 Ganzes.`, `${low} · ${d} = ${low * d} und ${low + 1} · ${d} = ${(low + 1) * d}.`, `${n} liegt dazwischen, also ${label(low)}.`],
    praise: 'Du hast die Ganzen im unechten Bruch erkannt.',
    srText: speak(prompt),
    kmk: [...KMK, 'PK.argumentieren'],
  });
};

/** Fractions in lowest terms from 0 to 2, not on a tick of the halves, not next to 0 or 2. */
const estimatePool = (nenner: readonly number[]): readonly Frac[] => nenner.flatMap((d) => range(2, 2 * d - 2).filter((n) => isLowest(n, d) && n !== d && (d % 2 === 1 || n % (d / 2) !== 0)).map((n): Frac => [n, d]));

/** Stufe 3: an arrow set by eye; the steps of the arrow are the Nenner, the ticks are not. */
function estimate(nenner: readonly number[], halves: boolean): Form {
  const pool = estimatePool(nenner);
  return (rng, stufe, ab) => {
    const [n, d] = rng.pick(pool);
    const tick = halves ? d / 2 : d;
    const l = line(d, 2, tick);
    const prompt = `Setze den Pfeil ungefähr auf ${frac(n, d)}.`;
    return build(SKILL, stufe, {
      key: `schaetzen:${n}/${d}:${halves ? 'halbe' : 'ganze'}`,
      ab,
      prompt,
      answer: placing(l, n, 1),
      hints: [n > d ? 'Der Bruch ist größer als 1. Liegt der Bruch näher bei 1 oder bei 2?' : `Ist der Bruch größer als ${frac(1, 2)}? Ist der Zähler mehr als die Hälfte des Nenners?`, `Stell dir ${d} gleiche Abschnitte von 0 bis 1 vor.`],
      steps: [
        `Von 0 bis 1 denkst du dir ${d} gleiche Abschnitte.`,
        { text: `${frac(n, d)} liegt ${n} ${n === 1 ? 'Abschnitt' : 'Abschnitte'} rechts von 0.`, visual: withMark(line(d, 2), n) },
      ],
      bugs: numberBugs([
        n < d && { id: 'strecke-als-ganzes', match: 2 * n, hint: 'Das Ganze reicht von 0 bis 1, nicht bis 2.' },
        n > d && { id: 'nur-letztes-ganzes', match: n - d, hint: 'Der Bruch ist größer als 1. Der Pfeil gehört rechts von der 1.' },
      ], n),
      praise: 'Du hast den Bruch mit den Strichen verglichen.',
      srText: speak(`${lineWords(l)} ${prompt}`),
      kmk: [...KMK, 'PK.problemloesen'],
    });
  };
}

/** Candidates of the arrow task, in twelfths. */
const ARROW_FRACTIONS: readonly Frac[] = [[1, 4], [1, 3], [1, 2], [2, 3], [3, 4], [5, 4], [4, 3], [3, 2], [5, 3], [7, 4]];
const twelfths = ([n, d]: Frac) => (n * 12) / d;

/** Stufe 3, AB III: which fraction fits an arrow on a line with the Ganze only. All options lie on the side of the arrow, so a look at the 1 does not decide it. */
const arrowEstimate: Form = (rng, stufe, ab) => {
  const right = rng.pick(ARROW_FRACTIONS);
  const value = twelfths(right);
  const others = rng.sample(ARROW_FRACTIONS.filter((f) => (twelfths(f) > 12) === (value > 12) && Math.abs(twelfths(f) - value) >= 2), 3);
  const options: ChoiceOption[] = others.map((f) => ({
    label: fracOf(f),
    whyWrong: `Dieser Bruch liegt weiter ${twelfths(f) > value ? 'rechts' : 'links'} als der Pfeil.`,
  }));
  const low = value > 12 ? 1 : 0;
  const inPart = value - low * 12;
  const prompt = 'Welcher Bruch passt am besten zum Pfeil A?';
  return build(SKILL, stufe, {
    key: `pfeil:${right.join('/')}:${others.map((f) => f.join('/')).sort().join()}`,
    ab,
    prompt,
    visual: withMark(line(12, 2, 12), value),
    answer: makeChoice(rng, { label: fracOf(right) }, options),
    hints: ['Schau auf die Mitte zwischen den beiden ganzen Zahlen.', 'Wie weit ist der Pfeil von der Mitte entfernt?'],
    steps: [`Der Pfeil liegt zwischen ${low} und ${low + 1}.`, `Der Pfeil liegt ${inPart < 6 ? 'vor' : inPart === 6 ? 'genau in' : 'hinter'} der Mitte, bei ${frac(inPart, 12)} des Abschnitts.`, `Am besten passt ${fracOf(right)}.`],
    praise: 'Du hast die Lage des Pfeils mit den Ganzen verglichen.',
    srText: speak(prompt),
    kmk: [...KMK, 'PK.argumentieren'],
  });
};

export const zahlenstrahlSkill: SkillDef = {
  ...SKILL,
  title: 'Brüche am Zahlenstrahl',
  description: 'Du liest Brüche am Zahlenstrahl ab und trägst sie ein.',
  stufen: {
    1: 'Von 0 bis 1, Nenner 2, 4, 5, 10, mit Strichen',
    2: 'Von 0 bis 3, unechte Brüche, mit Strichen',
    3: 'Von 0 bis 2, ohne passende Striche: ungefähr setzen',
  },
  kmk: KMK,
  generate: byStufeAndAb({
    1: { 1: [readUnit], 2: [placeUnit], 3: [placeFiner, readShorten] },
    2: { 1: [readImproper], 2: [placeImproper], 3: [readOnlyEnds, betweenWholes] },
    3: { 1: [estimate([8, 10, 12], true)], 2: [estimate([8, 10, 12], false)], 3: [estimate([7, 9, 11], false), arrowEstimate] },
  }),
};
