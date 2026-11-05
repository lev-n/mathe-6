/**
 * Kreis (docs/research.md §6). Stufe 1: name the parts on a drawing. Stufe 2: r from d and back, whole and decimal. Stufe 3: points at a distance, two circles touching.
 * The comma key is active for the whole skill, so every number field sets decimals (§7.1). `figure` draws one circle only, so tasks about two circles have no picture.
 * Where the part is the answer, it is drawn as a two-point figure over the circle: circle.label would have the picture's description name it, and would always lie flat.
 * The tasks of Stufe 1 ask with no word that fits one option alone, and the voice describes a place by its distances, never as 'in der Mitte'.
 */
import { fmtQty, toSpeech } from '../../core/format';
import type { Ab, Bug, ChoiceOption, Exercise, NumberAnswer, Rng, SkillDef, Stufe, VisualOf } from '../../core/types';
import { build, numberBugs, pickPerson, targetAb } from '../shared';
import { fixedChoice } from './helpers';

const SKILL = { id: 'geometrie.kreis', topicId: 'geometrie' } as const;
const KMK = ['RF.figuren'];

const R_D = 'Der Durchmesser geht durch den ganzen Kreis. Der Radius ist die Hälfte.';
const SAME = 'Radius und Durchmesser sind verschieden lang. Der Durchmesser ist doppelt so lang.';
type Part = 'Radius' | 'Durchmesser' | 'Mittelpunkt' | 'Kreislinie';
const PARTS: readonly Part[] = ['Mittelpunkt', 'Radius', 'Durchmesser', 'Kreislinie'];
const PART_WHY: Record<Part, string> = {
  Mittelpunkt: 'Der Mittelpunkt ist ein Punkt genau in der Mitte des Kreises.',
  Radius: 'Der Radius geht vom Mittelpunkt bis zur Kreislinie.',
  Durchmesser: 'Der Durchmesser geht durch den Mittelpunkt von Rand zu Rand.',
  Kreislinie: 'Die Kreislinie ist der runde Rand des Kreises.',
};
const POINT_LABELS = ['Mittelpunkt', 'Punkt auf der Kreislinie', 'Punkt außerhalb des Kreises'];
const POINT_WHY: Readonly<Record<string, string>> = { Mittelpunkt: PART_WHY.Mittelpunkt, 'Punkt auf der Kreislinie': PART_WHY.Kreislinie, 'Punkt außerhalb des Kreises': 'Dieser Punkt liegt ganz außerhalb des runden Randes.' };
const partChoice = (rng: Rng, right: Part) => fixedChoice(rng, right, PARTS.filter((p) => p !== right).map((p): ChoiceOption => ({ label: p, whyWrong: PART_WHY[p] })), PARTS);
const circleFigure = (circle: Omit<NonNullable<VisualOf<'figure'>['circle']>, 'x' | 'y' | 'r'>): VisualOf<'figure'> => ({ type: 'figure', points: [], circle: { x: 120, y: 90, r: 80, ...circle } });

/** Decimal answers: at most one place after the comma, so a bug that needs two stays out. */
const oneDecimal = (bugs: (Bug | false)[], correct: number) => numberBugs(bugs, correct).filter((b) => Number.isInteger(Math.round((b.match as number) * 1000) / 100));
const length = (value: number, unit = 'cm'): NumberAnswer => ({ kind: 'number', value, unit, decimals: 1 });
const halfUp = (x: number) => Math.round(x * 10) / 10;

/** Directions of a drawn part, in degrees on the screen (y downward): the letter of M stands down and to the left of the centre, so no line goes there. */
const RADIUS_TURNS = [-80, -50, -20, 0, 25, 50, 80];
const DIAMETER_TURNS = [0, 20, 40, 60, 90];
/** The same with a length as its label: a label this wide needs a flat line. */
const FLAT_RADIUS_TURNS = [-50, -20, 0, 25, 50];
const FLAT_DIAMETER_TURNS = [0, 20, 40];
const SIZES = [60, 70, 80, 90];

/** A circle with a drawn Radius from its centre or a drawn Durchmesser through it, in this direction, from the first point to the second. */
function circleWithPart(part: 'Radius' | 'Durchmesser', turn: number, r: number, names: { from?: string; to?: string }, circle: { centre?: string }, label?: string): VisualOf<'figure'> {
  const [cx, cy] = [120, 90];
  const [dx, dy] = [r * Math.cos((turn * Math.PI) / 180), r * Math.sin((turn * Math.PI) / 180)];
  const place = (f: number) => ({ x: Math.round((cx + f * dx) * 10) / 10, y: Math.round((cy + f * dy) * 10) / 10 });
  const points = [{ ...place(part === 'Radius' ? 0 : -1), ...(names.from ? { label: names.from } : {}) }, { ...place(1), ...(names.to ? { label: names.to } : {}) }];
  return { type: 'figure', points, ...(label ? { sides: [label, null] } : {}), circle: { x: cx, y: cy, r, ...circle } };
}

/** Where a drawn part runs, for the voice. Its 2 says the number of corners the picture's description names, so the description is not read a second time. */
const spokenCourse = (part: 'Radius' | 'Durchmesser') => (part === 'Radius' ? 'hat 2 Enden, M und einen Punkt auf dem Rand' : 'hat 2 Enden auf dem Rand und geht durch M');

/** Stufe 1, AB I: a drawn part in another direction each time, by a letter that is no unit or by its two end points; or one of two points. The direction and size of a picture stay out of the key: they change neither text nor answer. */
function namePart(rng: Rng, ab: Ab): Exercise {
  const part = rng.pick(['Radius', 'Durchmesser', 'Punkt'] as const);
  const r = rng.pick(SIZES);
  if (part === 'Punkt') {
    const [centre, rim] = rng.sample(['A', 'K', 'P', 'Q', 'U', 'V', 'Z'], 2);
    const atCentre = rng.chance(0.5);
    const letter = atCentre ? centre : rim;
    const right = atCentre ? POINT_LABELS[0] : POINT_LABELS[1];
    const turn = rng.pick(RADIUS_TURNS);
    const prompt = `Was ist der Punkt ${letter}?`;
    return build(SKILL, 1, {
      key: `teil:${right}:${letter}`,
      ab,
      prompt,
      visual: circleWithPart('Radius', turn, r, { from: centre, to: rim }, {}),
      answer: fixedChoice(rng, right, POINT_LABELS.filter((l) => l !== right).map((label): ChoiceOption => ({ label, whyWrong: POINT_WHY[label] })), POINT_LABELS),
      hints: ['Wo liegt der Punkt im Kreis?', 'Wie weit ist der Punkt in jede Richtung vom Rand entfernt?'],
      steps: atCentre ? [PART_WHY.Mittelpunkt, `${letter} ist der Mittelpunkt.`] : [PART_WHY.Kreislinie, `${letter} liegt auf der Kreislinie.`],
      praise: 'Du hast den Punkt im Kreis richtig benannt.',
      srText: toSpeech(`Ein Kreis mit 2 Punkten. ${centre} ist in jede Richtung gleich weit vom Rand entfernt. ${rim} hat zum Rand den Abstand 0. ${prompt}`),
      kmk: KMK,
    });
  }
  const turn = rng.pick(part === 'Radius' ? RADIUS_TURNS : DIAMETER_TURNS);
  const byEnds = rng.chance(0.4);
  const letter = rng.pick(['k', 'p', 'q', 'u', 'v']);
  const [from, to] = rng.pick([['A', 'B'], ['C', 'D'], ['P', 'Q'], ['R', 'S']]);
  const [start, end] = part === 'Radius' ? ['M', to] : [from, to];
  const name = byEnds ? `${start}${end}` : letter;
  const prompt = `Wie heißt die Strecke ${name}?`;
  const course = spokenCourse(part);
  return build(SKILL, 1, {
    key: `teil:${part}:${name}`,
    ab,
    prompt,
    visual: byEnds
      ? circleWithPart(part, turn, r, { from: start, to: end }, part === 'Radius' ? {} : { centre: 'M' })
      : circleWithPart(part, turn, r, {}, { centre: 'M' }, letter),
    answer: partChoice(rng, part),
    hints: ['Wo beginnt die Strecke, und wo endet die Strecke?', 'Geht die Strecke durch den ganzen Kreis?'],
    steps: [PART_WHY[part], `Die Strecke ${name} ist der ${part}.`],
    praise: 'Du hast den Teil des Kreises richtig benannt.',
    srText: toSpeech(`Ein Kreis um den Punkt M. Die Strecke ${name} ${course}. ${prompt}`),
    kmk: KMK,
  });
}

/** Stufe 1, AB II: only a description, or a drawn part with its length. */
function nameDescribed(rng: Rng, ab: Ab): Exercise {
  if (rng.chance(0.4)) {
    const [part, text] = rng.pick<[Part, string]>([
      ['Radius', 'Dieser Teil geht von M bis zum Rand des Kreises.'],
      ['Durchmesser', 'Dieser Teil geht durch M von Rand zu Rand.'],
      ['Mittelpunkt', 'Von diesem Teil sind alle Punkte des Randes gleich weit weg.'],
      ['Kreislinie', 'Alle Punkte dieses Teils sind von M gleich weit weg.'],
    ]);
    const prompt = `${text} Wie heißt dieser Teil des Kreises?`;
    return build(SKILL, 1, {
      key: `beschrieben:${part}`,
      ab,
      prompt,
      answer: partChoice(rng, part),
      hints: ['Zeichne einen Kreis auf ein Blatt.', 'Geh die Beschreibung an deiner Zeichnung durch.'],
      steps: [text, `Das ist ${part === 'Kreislinie' ? 'die' : 'der'} ${part}.`],
      praise: 'Du hast die Beschreibung am Kreis geprüft.',
      srText: toSpeech(prompt),
      kmk: KMK,
    });
  }
  const part = rng.pick<'Radius' | 'Durchmesser'>(['Radius', 'Durchmesser']);
  const value = rng.int(2, 12);
  const turn = rng.pick(part === 'Radius' ? FLAT_RADIUS_TURNS : FLAT_DIAMETER_TURNS);
  const r = rng.pick(SIZES);
  const prompt = `Wie heißt die Strecke mit ${fmtQty(value, 'cm')} Länge?`;
  return build(SKILL, 1, {
    key: `mass:${part}:${value}`,
    ab,
    prompt,
    visual: circleWithPart(part, turn, r, {}, { centre: 'M' }, fmtQty(value, 'cm')),
    answer: partChoice(rng, part),
    hints: ['Geht die Strecke durch den Mittelpunkt M hindurch?', 'Oder endet die Strecke im Mittelpunkt?'],
    steps: [PART_WHY[part], `Die Strecke ist der ${part}.`],
    praise: 'Du hast auf den Verlauf der Strecke geachtet.',
    srText: toSpeech(`Ein Kreis um den Punkt M. Eine Strecke von ${value} Zentimeter ${spokenCourse(part)}. ${prompt}`),
    kmk: KMK,
  });
}

/** Stufe 1, AB III: reasoning. Which part has the double or the half length? */
function nameReason(rng: Rng, ab: Ab): Exercise {
  const r = rng.int(2, 12);
  const fromRadius = rng.chance(0.5);
  const right: Part = fromRadius ? 'Durchmesser' : 'Radius';
  const prompt = fromRadius ? `Der Radius ist ${fmtQty(r, 'cm')} lang. Welche Strecke ist ${fmtQty(2 * r, 'cm')} lang?` : `Der Durchmesser ist ${fmtQty(2 * r, 'cm')} lang. Welche Strecke ist ${fmtQty(r, 'cm')} lang?`;
  return build(SKILL, 1, {
    key: `doppelt:${right}:${r}`,
    ab,
    prompt,
    answer: partChoice(rng, right),
    hints: ['Vergleiche die beiden Längen.', 'Eine Länge ist doppelt so groß wie die andere.'],
    steps: [`${fmtQty(2 * r, 'cm')} ist doppelt so lang wie ${fmtQty(r, 'cm')}.`, 'Der Durchmesser ist doppelt so lang wie der Radius.', `Die Strecke ist der ${right}.`],
    praise: 'Du hast Radius und Durchmesser verglichen.',
    srText: toSpeech(prompt),
    kmk: [...KMK, 'PK.argumentieren'],
  });
}

const rdSteps = (fromD: boolean, given: number, value: number, unit: string) => (fromD
  ? ['Der Radius ist die Hälfte des Durchmessers.', `${fmtQty(given, unit)} : 2 = ${fmtQty(value, unit)}`, `Der Radius ist ${fmtQty(value, unit)} lang.`]
  : ['Der Durchmesser ist doppelt so lang wie der Radius.', `2 · ${fmtQty(given, unit)} = ${fmtQty(value, unit)}`, `Der Durchmesser ist ${fmtQty(value, unit)} lang.`]);
const rdBugs = (fromD: boolean, given: number, value: number) => oneDecimal([
  { id: 'radius-durchmesser', match: fromD ? 2 * given : given / 2, hint: R_D },
  { id: 'radius-gleich', match: given, hint: SAME },
], value);
const RD_HINTS = ['Der Durchmesser besteht aus zwei Radien.', 'Teile oder verdopple. Was ist hier gefragt?'];

/** Stufe 2, AB I: whole numbers, with the given part drawn. */
function rdWhole(rng: Rng, ab: Ab): Exercise {
  const fromD = rng.chance(0.5);
  const r = rng.int(2, 15);
  const given = fromD ? 2 * r : r;
  const value = fromD ? r : 2 * r;
  const prompt = fromD ? `Der Durchmesser ist ${fmtQty(given, 'cm')} lang. Wie lang ist der Radius?` : `Der Radius ist ${fmtQty(given, 'cm')} lang. Wie lang ist der Durchmesser?`;
  return build(SKILL, 2, {
    key: `ganz:${fromD ? 'd' : 'r'}:${given}`,
    ab,
    prompt,
    visual: circleFigure({ centre: 'M', label: fmtQty(given, 'cm'), ...(fromD ? { diameter: true } : {}) }),
    answer: length(value),
    hints: RD_HINTS,
    steps: rdSteps(fromD, given, value, 'cm'),
    bugs: rdBugs(fromD, given, value),
    praise: fromD ? 'Du hast den Durchmesser halbiert.' : 'Du hast den Radius verdoppelt.',
    srText: toSpeech(prompt),
    kmk: KMK,
  });
}

/** Stufe 2, AB II: decimals, or a Kreis from everyday life. */
function rdDecimal(rng: Rng, ab: Ab): Exercise {
  if (rng.chance(0.4)) {
    const story = rng.pick([
      () => { const d = rng.pick([50, 55, 60, 65, 70, 71]); return { key: `rad:${d}`, context: `Ein Fahrradreifen hat den Durchmesser ${fmtQty(d, 'cm')}.`, prompt: 'Wie lang ist der Radius?', fromD: true, given: d, unit: 'cm' }; },
      () => { const r = rng.pick([2.5, 3.5, 4.5, 5.5, 6.5, 7.5]); const { name } = pickPerson(rng); return { key: `zirkel:${r}:${name}`, context: `${name} stellt den Zirkel auf ${fmtQty(r, 'cm')} ein und zeichnet einen Kreis.`, prompt: 'Wie lang ist der Durchmesser?', fromD: false, given: r, unit: 'cm' }; },
      () => { const r = rng.pick([1.5, 2.5, 3.5, 4.5]); return { key: `beet:${r}`, context: `Die Klasse 6b legt ein rundes Beet an. Der Radius ist ${fmtQty(r, 'm')} lang.`, prompt: 'Wie lang ist der Durchmesser?', fromD: false, given: r, unit: 'm' }; },
    ])();
    const value = story.fromD ? story.given / 2 : 2 * story.given;
    return build(SKILL, 2, {
      key: story.key,
      ab,
      context: story.context,
      prompt: story.prompt,
      answer: length(value, story.unit),
      hints: RD_HINTS,
      steps: rdSteps(story.fromD, story.given, value, story.unit),
      bugs: rdBugs(story.fromD, story.given, value),
      praise: story.fromD ? 'Du hast den Durchmesser halbiert.' : 'Du hast den Radius verdoppelt.',
      srText: toSpeech(`${story.context} ${story.prompt}`),
      kmk: [...KMK, 'PK.modellieren'],
    });
  }
  const fromD = rng.chance(0.5);
  const value = fromD ? rng.pick([1.5, 2.5, 3.5, 4.5, 5.5, 6.5, 7.5, 8.5, 9.5, 2.3, 3.4, 4.2, 6.1]) : rng.pick([1.5, 2.5, 3.5, 4.5, 5.5, 2.4, 3.6, 4.7, 6.2, 8.3]);
  const given = halfUp(fromD ? 2 * value : value);
  const answer = halfUp(fromD ? value : 2 * value);
  const prompt = fromD ? `Der Durchmesser ist ${fmtQty(given, 'cm')} lang. Wie lang ist der Radius?` : `Der Radius ist ${fmtQty(given, 'cm')} lang. Wie lang ist der Durchmesser?`;
  return build(SKILL, 2, {
    key: `komma:${fromD ? 'd' : 'r'}:${given}`,
    ab,
    prompt,
    answer: length(answer),
    hints: RD_HINTS,
    steps: rdSteps(fromD, given, answer, 'cm'),
    bugs: rdBugs(fromD, given, answer),
    praise: fromD ? 'Du hast die Kommazahl halbiert.' : 'Du hast die Kommazahl verdoppelt.',
    srText: toSpeech(prompt),
    kmk: KMK,
  });
}

/** Stufe 2, AB III: reasoning. Two circles, one by its radius, one by its diameter: how much wider is the second? */
function rdCompare(rng: Rng, ab: Ab): Exercise {
  const r = rng.pick([1.5, 2.5, 3.5, 4.5, 5]);
  const d = 2 * r + rng.pick([1, 2, 3, 4, 5]);
  const value = d - 2 * r;
  const prompt = `Kreis A hat den Radius ${fmtQty(r, 'cm')}. Kreis B hat den Durchmesser ${fmtQty(d, 'cm')}. Um wie viel cm ist Kreis B breiter?`;
  return build(SKILL, 2, {
    key: `vergleich:${r}:${d}`,
    ab,
    prompt,
    answer: length(value),
    hints: ['Die Breite eines Kreises ist sein Durchmesser.', 'Rechne zuerst den Durchmesser von Kreis A aus.'],
    steps: [`Kreis A: 2 · ${fmtQty(r, 'cm')} = ${fmtQty(2 * r, 'cm')}`, `${fmtQty(d, 'cm')} − ${fmtQty(2 * r, 'cm')} = ${fmtQty(value, 'cm')}`, `Kreis B ist ${fmtQty(value, 'cm')} breiter.`],
    bugs: oneDecimal([{ id: 'radius-durchmesser', match: d - r, hint: 'Hier stehen Radius und Durchmesser. Vergleiche zwei Durchmesser.' }], value),
    praise: 'Du hast zwei Durchmesser verglichen.',
    srText: toSpeech(prompt),
    kmk: [...KMK, 'PK.problemloesen'],
  });
}

const PLACES = ['innerhalb des Kreises', 'auf der Kreislinie', 'außerhalb des Kreises'] as const;

/** Stufe 3, AB I: where does a point at this distance lie? Given by the radius or, as a trap, by the diameter. */
function pointDistance(rng: Rng, ab: Ab): Exercise {
  const r = rng.pick([2, 2.5, 3, 3.5, 4, 4.5, 5, 6]);
  const byD = rng.chance(0.5);
  const place = rng.int(0, 2);
  const dist = place === 1 ? r : place === 0 ? r - rng.pick([0.5, 1]) : r + rng.pick([0.5, 1, 2]);
  const circle = byD ? `den Durchmesser ${fmtQty(2 * r, 'cm')}` : `den Radius ${fmtQty(r, 'cm')}`;
  const prompt = `Ein Kreis hat ${circle}. Der Punkt P ist ${fmtQty(dist, 'cm')} von M entfernt. Wo liegt P?`;
  return build(SKILL, 3, {
    key: `abstand:${byD ? 'd' : 'r'}:${r}:${dist}`,
    ab,
    prompt,
    answer: fixedChoice(rng, PLACES[place], PLACES.flatMap((p, i) => (i === place ? [] : [{ label: p, whyWrong: byD ? 'Vergleiche den Abstand mit dem Radius, nicht mit dem Durchmesser.' : 'Vergleiche den Abstand von P mit dem Radius.' }])), PLACES),
    hints: ['Alle Punkte der Kreislinie sind einen Radius von M entfernt.', 'Vergleiche den Abstand von P mit dem Radius.'],
    steps: [byD ? `Der Radius ist ${fmtQty(2 * r, 'cm')} : 2 = ${fmtQty(r, 'cm')}.` : `Der Radius ist ${fmtQty(r, 'cm')}.`, `Der Abstand ${fmtQty(dist, 'cm')} ist ${dist < r ? 'kleiner als der' : dist === r ? 'genauso groß wie der' : 'größer als der'} Radius.`, `P liegt ${PLACES[place]}.`],
    praise: 'Du hast den Abstand mit dem Radius verglichen.',
    srText: toSpeech(prompt),
    kmk: KMK,
  });
}

/** Stufe 3, AB II: two circles touching from outside. How far apart are the centres? */
function touching(rng: Rng, ab: Ab): Exercise {
  const a = rng.pick([1.5, 2, 2.5, 3, 3.5, 4, 4.5]);
  const b = rng.pick([2, 2.5, 3.5, 4, 5, 5.5, 6].filter((x) => x !== a));
  const value = a + b;
  const prompt = `Zwei Kreise berühren sich von außen. Die Radien sind ${fmtQty(a, 'cm')} und ${fmtQty(b, 'cm')}. Wie weit sind die Mittelpunkte voneinander entfernt?`;
  return build(SKILL, 3, {
    key: `beruehren:${a}:${b}`,
    ab,
    prompt,
    answer: length(value),
    hints: ['Zeichne die Kreise. Verbinde die beiden Mittelpunkte.', 'Die Verbindung geht durch den Berührpunkt.'],
    steps: ['Die Verbindung besteht aus den beiden Radien.', `${fmtQty(a, 'cm')} + ${fmtQty(b, 'cm')} = ${fmtQty(value, 'cm')}`, `Die Mittelpunkte sind ${fmtQty(value, 'cm')} voneinander entfernt.`],
    bugs: oneDecimal([
      { id: 'kreise-differenz', match: Math.abs(a - b), hint: 'Die Kreise liegen nebeneinander. Die Radien liegen hintereinander.' },
      { id: 'kreise-durchmesser', match: 2 * (a + b), hint: 'Vom Mittelpunkt bis zum Berührpunkt ist es nur ein Radius.' },
    ], value),
    praise: 'Du hast die beiden Radien zusammengezählt.',
    srText: toSpeech(prompt),
    kmk: KMK,
  });
}

/** Stufe 3, AB III: reversed or hardest. The other radius, a circle inside another, or a row of three circles. */
function touchingReason(rng: Rng, ab: Ab): Exercise {
  const form = rng.pick(['anderer', 'innen', 'reihe'] as const);
  if (form === 'reihe') {
    const r = rng.pick([1, 1.5, 2, 2.5, 3, 3.5, 4]);
    const row = 6 * r;
    const context = `Drei gleich große Kreise liegen in einer Reihe und berühren sich. Die Reihe ist ${fmtQty(row, 'cm')} lang.`;
    const prompt = 'Wie lang ist ein Radius?';
    return build(SKILL, 3, {
      key: `reihe:${r}`,
      ab,
      context,
      prompt,
      answer: length(r),
      hints: ['Die Reihe ist so lang wie drei Durchmesser.', 'Rechne zuerst einen Durchmesser aus.'],
      steps: [`${fmtQty(row, 'cm')} : 3 = ${fmtQty(2 * r, 'cm')}, das ist ein Durchmesser.`, `${fmtQty(2 * r, 'cm')} : 2 = ${fmtQty(r, 'cm')}`, `Ein Radius ist ${fmtQty(r, 'cm')} lang.`],
      bugs: oneDecimal([{ id: 'radius-durchmesser', match: row / 3, hint: R_D }, { id: 'kreise-durchmesser', match: row / 2, hint: 'Die Reihe besteht aus drei Durchmessern, nicht aus zwei.' }], r),
      praise: 'Du hast von der Reihe auf den Radius geschlossen.',
      srText: toSpeech(`${context} ${prompt}`),
      kmk: [...KMK, 'PK.problemloesen'],
    });
  }
  const a = rng.pick([1.5, 2, 2.5, 3, 3.5, 4]);
  const b = a + rng.pick([1, 1.5, 2, 2.5, 3]);
  if (form === 'anderer') {
    const dist = a + b;
    const context = `Zwei Kreise berühren sich von außen. Die Mittelpunkte sind ${fmtQty(dist, 'cm')} entfernt. Ein Radius ist ${fmtQty(a, 'cm')} lang.`;
    const prompt = 'Wie lang ist der andere Radius?';
    return build(SKILL, 3, {
      key: `anderer:${a}:${b}`,
      ab,
      context,
      prompt,
      answer: length(b),
      hints: ['Der Abstand der Mittelpunkte besteht aus beiden Radien.', 'Rechne rückwärts.'],
      steps: ['Der Abstand ist die Summe der Radien.', `${fmtQty(dist, 'cm')} − ${fmtQty(a, 'cm')} = ${fmtQty(b, 'cm')}`, `Der andere Radius ist ${fmtQty(b, 'cm')} lang.`],
      bugs: oneDecimal([{ id: 'kreise-differenz', match: dist + a, hint: 'Der Abstand besteht schon aus beiden Radien. Zieh den bekannten Radius ab.' }], b),
      praise: 'Du hast rückwärts gerechnet.',
      srText: toSpeech(`${context} ${prompt}`),
      kmk: [...KMK, 'PK.problemloesen'],
    });
  }
  const value = b - a;
  const context = `Ein kleiner Kreis liegt in einem großen Kreis und berührt den Rand. Die Radien sind ${fmtQty(a, 'cm')} und ${fmtQty(b, 'cm')}.`;
  const prompt = 'Wie weit sind die Mittelpunkte entfernt?';
  return build(SKILL, 3, {
    key: `innen:${a}:${b}`,
    ab,
    context,
    prompt,
    answer: length(value),
    hints: ['Zeichne den kleinen Kreis in den großen.', 'Geh vom großen Mittelpunkt zum Berührpunkt und wieder zurück.'],
    steps: ['Beide Radien enden am Berührpunkt.', `${fmtQty(b, 'cm')} − ${fmtQty(a, 'cm')} = ${fmtQty(value, 'cm')}`, `Die Mittelpunkte sind ${fmtQty(value, 'cm')} entfernt.`],
    bugs: oneDecimal([{ id: 'kreise-differenz', match: a + b, hint: 'Der kleine Kreis liegt innen. Die Radien liegen übereinander.' }], value),
    praise: 'Du hast die Lage der Kreise richtig genutzt.',
    srText: toSpeech(`${context} ${prompt}`),
    kmk: [...KMK, 'PK.problemloesen'],
  });
}

const FORMS: Record<Stufe, Record<Ab, (rng: Rng, ab: Ab) => Exercise>> = {
  1: { 1: namePart, 2: nameDescribed, 3: nameReason },
  2: { 1: rdWhole, 2: rdDecimal, 3: rdCompare },
  3: { 1: pointDistance, 2: touching, 3: touchingReason },
};

export const kreisSkill: SkillDef = {
  ...SKILL,
  title: 'Kreis',
  description: 'Du kennst Mittelpunkt, Radius und Durchmesser.',
  stufen: {
    1: 'Mittelpunkt, Radius und Durchmesser im Bild benennen',
    2: 'Radius aus Durchmesser und zurück, auch mit Komma',
    3: 'Punkte mit einem Abstand; zwei Kreise berühren sich',
  },
  kmk: KMK,
  keys: { comma: true },
  generate(rng, stufe, ctx) {
    const ab = targetAb(rng, stufe, ctx);
    return FORMS[stufe][ab](rng, ab);
  },
};
