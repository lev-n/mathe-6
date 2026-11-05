/**
 * Kongruente Figuren (docs/research.md §6). Stufe 1: the same figure turned, kongruent or not. Stufe 2: find the congruent figure on a grid. Stufe 3: what stays equal, Längen and Winkel, and flipped figures.
 * A figure that does not fit is one Kästchen moved, never a flipped copy: a flipped copy is kongruent. The spoken text lists the Kästchen of every figure and never says which ones fit: comparing them is the task.
 */
import { fmt, fmtAngle, fmtQty, toSpeech } from '../../core/format';
import type { Ab, Cell, Exercise, Rng, SkillDef, Stufe, VisualOf } from '../../core/types';
import { build, makeChoice, pickPerson, targetAb } from '../shared';
import { changed, figureGrid, flipped, lopsided, pairGrid, pictureChoice, sayCells, sayPair, triangleFromAngles, turned, yesNo } from './helpers';

const SKILL = { id: 'geometrie.kongruenz', topicId: 'geometrie' } as const;
const KMK = ['RF.abbildungen'];

const TURNED_WHY = 'Die Lage ist egal. Passen die Figuren genau aufeinander?';
const MOVED_WHY = 'Zähle die Kästchen in jeder Reihe. Ein Kästchen liegt anders.';
const FLIPPED_WHY = 'Auch umgeklappt passen die Figuren genau aufeinander.';
const SAME_COUNT_WHY = 'Gleich viele Kästchen reichen nicht. Die Form muss genau passen.';
const AREA_WHY = 'Gleiche Fläche reicht nicht. Die Seiten müssen gleich lang sein.';
const FIT_HINTS = ['Dreh die rechte Figur im Kopf.', 'Passen alle Kästchen genau aufeinander?'];
const fingerprint = (cells: readonly Cell[]) => cells.map((c) => c.join('.')).join('_');
const fitStep = (fits: boolean) => (fits ? 'Die Figuren passen genau aufeinander. Die Figuren sind kongruent.' : 'Die Figuren passen nicht genau aufeinander. Die Figuren sind nicht kongruent.');

/** Two figures: the second is the first turned, or one Kästchen is moved in it. */
function turnedPair(rng: Rng, n: number, fits: boolean): { left: Cell[]; right: Cell[]; quarters: number } {
  const left = lopsided(rng, n, 4, 4);
  const quarters = rng.int(1, 3);
  return { left, right: turned(fits ? left : changed(rng, left, 4, 4), quarters), quarters };
}

function pairTask(rng: Rng, ab: Ab, n: number, key: string): Exercise {
  const fits = rng.chance(0.5);
  const { left, right } = turnedPair(rng, n, fits);
  const prompt = 'Sind die beiden Figuren kongruent?';
  return build(SKILL, 1, {
    key: `${key}:${fingerprint(left)}:${fingerprint(right)}`,
    ab,
    prompt,
    visual: pairGrid(left, right),
    answer: yesNo(rng, fits, MOVED_WHY, TURNED_WHY),
    hints: FIT_HINTS,
    steps: ['Kongruent heißt: Die Figuren passen genau aufeinander.', fits ? 'Die rechte Figur ist nur gedreht.' : 'Ein Kästchen liegt in der rechten Figur anders.', fitStep(fits)],
    praise: fits ? 'Du hast die Figur im Kopf gedreht.' : 'Du hast den Unterschied in der Form gefunden.',
    srText: toSpeech(`${sayPair(left, right)} ${prompt}`),
    kmk: KMK,
  });
}

const pairSmall = (rng: Rng, ab: Ab) => pairTask(rng, ab, 5, 'paar');
const pairLarge = (rng: Rng, ab: Ab) => pairTask(rng, ab, rng.int(6, 7), 'paar-gross');

/** Stufe 1, AB III: reasoning. Is what someone says about the two figures right? */
function pairClaim(rng: Rng, ab: Ab): Exercise {
  const { name } = pickPerson(rng);
  const form = rng.pick(['gedreht', 'anzahl', 'passt'] as const);
  const fits = form !== 'anzahl';
  const { left, right } = turnedPair(rng, rng.int(5, 6), fits);
  const claim = {
    gedreht: `${name} sagt: Die rechte Figur ist gedreht. Darum sind die Figuren nicht kongruent.`,
    anzahl: `${name} sagt: Beide Figuren haben ${fmt(left.length)} Kästchen. Darum sind die Figuren kongruent.`,
    passt: `${name} sagt: Gedreht passt die rechte Figur genau auf die linke.`,
  }[form];
  const prompt = `${claim} Stimmt das?`;
  const yes = form === 'passt';
  return build(SKILL, 1, {
    key: `behauptung:${form}:${fingerprint(left)}:${fingerprint(right)}`,
    ab,
    prompt,
    visual: pairGrid(left, right),
    answer: yesNo(rng, yes, form === 'anzahl' ? SAME_COUNT_WHY : TURNED_WHY, 'Dreh die rechte Figur im Kopf. Die Lage ist egal.'),
    hints: ['Prüfe am Bild, nicht an der Anzahl.', 'Passen die Figuren genau aufeinander?'],
    steps: ['Kongruent heißt: Die Figuren passen genau aufeinander.', fits ? 'Die rechte Figur ist nur gedreht. Die Lage ist egal.' : 'Die Kästchen liegen in der rechten Figur anders.', yes ? 'Die Aussage stimmt.' : 'Die Aussage stimmt nicht.'],
    praise: 'Du hast die Aussage am Bild geprüft.',
    srText: toSpeech(`${sayPair(left, right)} ${prompt}`),
    kmk: [...KMK, 'PK.argumentieren'],
  });
}

const someOption = (cells: readonly Cell[], whyWrong?: string) => ({ cells, visual: figureGrid(cells), ...(whyWrong ? { whyWrong } : {}) });
type SomeOption = ReturnType<typeof someOption>;
/** The options for the voice: their Kästchen, on a grid (see sayPair). */
const sayOptions = (shown: readonly SomeOption[]) => shown.map((o, i) => `Figur ${'ABCD'[i]}: ${sayCells(o.cells)}.`).join(' ');

/** Stufe 2, AB I and II: find the turned copy among other figures. */
function findCopy(rng: Rng, ab: Ab): Exercise {
  const n = ab === 1 ? 5 : rng.int(6, 7);
  const count = ab === 1 ? 2 : 3;
  const figure = lopsided(rng, n, 4, 4);
  const copy = turned(figure, rng.int(1, 3));
  const seen = new Set<string>();
  const others: Cell[][] = [];
  while (others.length < count) {
    const other = turned(changed(rng, figure, 4, 4), rng.int(0, 3));
    if (!seen.has(fingerprint(other))) {
      seen.add(fingerprint(other));
      others.push(other);
    }
  }
  const correct = someOption(copy);
  const { answer, shown } = pictureChoice<SomeOption>(rng, correct, others.map((o) => someOption(o, MOVED_WHY)));
  const prompt = 'Welche Figur ist kongruent zur Figur im Bild?';
  return build(SKILL, 2, {
    key: `finden:${n}:${fingerprint(figure)}:${fingerprint(copy)}`,
    ab,
    prompt,
    visual: figureGrid(figure),
    answer,
    hints: ['Dreh die Figur im Kopf. Die Lage ist egal.', 'Vergleiche die Kästchen Reihe für Reihe.'],
    steps: ['Kongruent heißt: Die Figuren passen genau aufeinander.', 'Nur eine Figur hat dieselbe Form.', `Das ist die Figur ${'ABCD'[shown.indexOf(correct)]}.`],
    praise: 'Du hast die gedrehte Figur erkannt.',
    srText: toSpeech(`Eine Figur auf einem Gitter: ${sayCells(figure)}. Zur Wahl stehen ${count + 1} Figuren. ${sayOptions(shown)} ${prompt}`),
    kmk: KMK,
  });
}

/** Stufe 2, AB III: reversed. Which of four figures does not fit the other three? They are all turned. */
function findOdd(rng: Rng, ab: Ab): Exercise {
  const figure = lopsided(rng, rng.int(6, 7), 4, 4);
  const odd = turned(changed(rng, figure, 4, 4), rng.int(0, 3));
  const correct = someOption(odd);
  const { answer, shown } = pictureChoice<SomeOption>(rng, correct, [0, 1, 2].map((q) => someOption(turned(figure, q), 'Diese Figur passt gedreht auf zwei andere. Vergleiche Reihe für Reihe.')));
  const prompt = 'Drei Figuren sind kongruent. Welche Figur passt nicht dazu?';
  return build(SKILL, 2, {
    key: `anders:${fingerprint(figure)}:${fingerprint(odd)}`,
    ab,
    prompt,
    answer,
    hints: ['Vergleiche zwei Figuren. Dreh eine Figur im Kopf.', 'Prüfe danach die beiden anderen.'],
    steps: ['Drei Figuren sind dieselbe Form in anderer Lage.', 'In einer Figur liegt ein Kästchen anders.', `Das ist die Figur ${'ABCD'[shown.indexOf(correct)]}.`],
    praise: 'Du hast alle Figuren miteinander verglichen.',
    srText: toSpeech(`Vier Figuren aus Kästchen auf einem Gitter. ${sayOptions(shown)} ${prompt}`),
    kmk: [...KMK, 'PK.argumentieren'],
  });
}

/** Stufe 3, AB I: a flipped figure: kongruent too. */
function flippedPair(rng: Rng, ab: Ab): Exercise {
  const fits = rng.chance(0.6);
  const left = lopsided(rng, rng.int(5, 7), 4, 4);
  const base = fits ? left : changed(rng, left, 4, 4);
  const right = turned(flipped(base), rng.int(0, 3));
  const prompt = 'Du darfst die Figuren drehen und umklappen. Sind die Figuren kongruent?';
  return build(SKILL, 3, {
    key: `geklappt:${fingerprint(left)}:${fingerprint(right)}`,
    ab,
    prompt,
    visual: pairGrid(left, right),
    answer: yesNo(rng, fits, MOVED_WHY, FLIPPED_WHY),
    hints: ['Klapp die rechte Figur im Kopf um.', 'Dreh die Figur danach, bis die Lage passt.'],
    steps: ['Auch Umklappen ändert keine Länge und keinen Winkel.', fits ? 'Nach dem Umklappen passt die rechte Figur genau.' : 'Auch nach dem Umklappen liegt ein Kästchen anders.', fits ? 'Die Figuren sind kongruent.' : 'Die Figuren sind nicht kongruent.'],
    praise: fits ? 'Du hast auch das Umklappen mitgedacht.' : 'Du hast trotz Umklappen den Unterschied gefunden.',
    srText: toSpeech(`${sayPair(left, right)} ${prompt}`),
    kmk: KMK,
  });
}

/** Who passt on whom, as the partners of A, B and C. Never the plain order D, E, F: the child has to work out the partner itself. */
const MATCHINGS = ['DFE', 'EDF', 'EFD', 'FDE', 'FED'] as const;

/** Stufe 3, AB II: Dreiecke ABC and DEF are kongruent, with their corners in another order. A side of DEF, read from the picture of ABC; or an angle of DEF, known or from the Winkelsumme. */
function corresponding(rng: Rng, ab: Ab): Exercise {
  const match = rng.pick(MATCHINGS);
  const partner = (corner: string) => match['ABC'.indexOf(corner)];
  const original = (corner: string) => 'ABC'[match.indexOf(corner)];
  const intro = `Die Dreiecke ABC und DEF sind kongruent. A passt auf ${match[0]}, B auf ${match[1]} und C auf ${match[2]}.`;
  const sinOf = (d: number) => Math.sin((d * Math.PI) / 180);
  const round = (x: number) => Math.round(x * 2) / 2;
  let alpha: number, beta: number, gamma: number, a: number, b: number, c: number;
  do {
    alpha = rng.pick([30, 40, 50, 60, 70, 80]);
    beta = rng.pick([35, 45, 55, 65, 75].filter((x) => x !== alpha && alpha + x < 150));
    gamma = 180 - alpha - beta;
    c = rng.int(4, 12);
    a = round((c * sinOf(alpha)) / sinOf(gamma));
    b = round((c * sinOf(beta)) / sinOf(gamma));
  } while (new Set([alpha, beta, gamma]).size < 3 || new Set([a, b, c]).size < 3);
  const points = triangleFromAngles(alpha, beta);
  if (rng.chance(0.5)) {
    const sizes: Readonly<Record<string, number>> = { A: alpha, B: beta, C: gamma };
    const unknown = rng.pick(['A', 'B', 'C']);
    const [first, second] = ['A', 'B', 'C'].filter((corner) => corner !== unknown);
    const corner = rng.pick(['A', 'B', 'C']);
    const value = sizes[corner];
    const asked = partner(corner);
    const context = `${intro} Der Winkel bei ${first} misst ${fmtAngle(sizes[first])}. Der Winkel bei ${second} misst ${fmtAngle(sizes[second])}.`;
    const prompt = `Wie groß ist der Winkel bei ${asked}?`;
    const others = [alpha, beta, gamma].filter((v) => v !== value);
    return build(SKILL, 3, {
      key: `winkel:${alpha}.${beta}:${match}:${unknown}:${corner}`,
      ab,
      context,
      prompt,
      visual: { type: 'figure', points },
      answer: makeChoice(rng, { label: fmtAngle(value) }, [...others.map((v) => ({ label: fmtAngle(v), whyWrong: 'Das ist ein anderer Winkel. Welche Ecke passt auf welche?' })), { label: fmtAngle(180 - value), whyWrong: 'Kongruente Figuren haben gleich große Winkel.' }]),
      hints: [`Welche Ecke von ABC passt auf ${asked}?`, 'Die drei Winkel eines Dreiecks ergeben zusammen 180°.'],
      steps: [`${corner} passt auf ${asked}.`, corner === unknown ? `180° − ${fmtAngle(sizes[first])} − ${fmtAngle(sizes[second])} = ${fmtAngle(value)}, das ist der Winkel bei ${corner}.` : `Der Winkel bei ${corner} misst ${fmtAngle(value)}.`, `Der Winkel bei ${asked} misst ${fmtAngle(value)}.`],
      praise: 'Du hast zuerst die passende Ecke gesucht.',
      srText: toSpeech(`${context} ${prompt}`),
      kmk: KMK,
    });
  }
  const visual: VisualOf<'figure'> = { type: 'figure', points, sides: [fmtQty(c, 'cm'), fmtQty(a, 'cm'), fmtQty(b, 'cm')] };
  const lengths: Readonly<Record<string, number>> = { AB: c, BC: a, CA: b };
  const asked = rng.pick(['DE', 'EF', 'FD']);
  const from = Object.keys(lengths).find((side) => side.includes(original(asked[0])) && side.includes(original(asked[1])))!;
  const value = lengths[from];
  const others = Object.values(lengths).filter((v) => v !== value);
  const prompt = `Das Bild zeigt das Dreieck ABC. Wie lang ist die Seite ${asked}?`;
  return build(SKILL, 3, {
    key: `seite:${alpha}.${beta}:${c}:${match}:${asked}`,
    ab,
    prompt,
    context: intro,
    visual,
    answer: makeChoice(rng, { label: fmtQty(value, 'cm') }, [...others.map((v) => ({ label: fmtQty(v, 'cm'), whyWrong: 'Das ist eine andere Seite. Welche Ecken passen aufeinander?' })), { label: fmtQty(value + 1, 'cm'), whyWrong: 'Kongruente Figuren haben gleich lange Seiten.' }, { label: fmtQty(2 * value, 'cm'), whyWrong: 'Kongruente Figuren haben gleich lange Seiten.' }]),
    hints: [`Welche Ecken von ABC passen auf ${asked[0]} und ${asked[1]}?`, 'Kongruente Figuren haben gleich lange Seiten.'],
    steps: [`${original(asked[0])} passt auf ${asked[0]}. ${original(asked[1])} passt auf ${asked[1]}.`, `Die Seite ${asked} ist so lang wie die Seite ${from}.`, `Die Seite ${asked} ist ${fmtQty(value, 'cm')} lang.`],
    praise: 'Du hast die passenden Seiten gefunden.',
    srText: toSpeech(`${intro} ${prompt}`),
    kmk: KMK,
  });
}

/** Stufe 3, AB III: reasoning. Which of four figures does not fit, now also flipped? */
function findOddFlipped(rng: Rng, ab: Ab): Exercise {
  const figure = lopsided(rng, rng.int(6, 7), 4, 4);
  const odd = turned(flipped(changed(rng, figure, 4, 4)), rng.int(0, 3));
  const correct = someOption(odd);
  const fits = [turned(figure, rng.int(0, 3)), turned(flipped(figure), 0), turned(flipped(figure), rng.int(1, 3))];
  const { answer, shown } = pictureChoice<SomeOption>(rng, correct, fits.map((cells) => someOption(cells, FLIPPED_WHY)));
  const prompt = 'Du darfst die Figuren drehen und umklappen. Drei Figuren sind kongruent. Welche Figur passt nicht dazu?';
  return build(SKILL, 3, {
    key: `anders-geklappt:${fingerprint(figure)}:${fingerprint(odd)}`,
    ab,
    prompt,
    answer,
    hints: ['Klapp eine Figur im Kopf um, dreh sie dann.', 'Passt sie danach auf eine andere Figur?'],
    steps: ['Umklappen und Drehen ändern keine Länge und keinen Winkel.', 'Drei Figuren sind dieselbe Form in anderer Lage.', `In der Figur ${'ABCD'[shown.indexOf(correct)]} liegt ein Kästchen anders.`],
    praise: 'Du hast auch das Umklappen mitgedacht.',
    srText: toSpeech(`Vier Figuren aus Kästchen auf einem Gitter. ${sayOptions(shown)} ${prompt}`),
    kmk: [...KMK, 'PK.argumentieren'],
  });
}

/** Stufe 3, AB III: reasoning. Two rectangles with the same area: one side of the second is missing, and the sides decide. */
function reasonRectangles(rng: Rng, ab: Ab): Exercise {
  const fits = rng.chance(0.4);
  const [w1, h1, w2, h2] = fits
    ? (() => { const p = rng.int(3, 8); const q = rng.int(p + 1, 12); return [p, q, q, p]; })()
    : rng.pick([[3, 8, 4, 6], [2, 12, 3, 8], [2, 12, 4, 6], [2, 9, 3, 6], [2, 10, 4, 5], [3, 10, 5, 6], [2, 15, 5, 6], [3, 12, 4, 9], [4, 10, 5, 8], [2, 16, 4, 8]]);
  const area = w1 * h1;
  const context = `Rechteck A ist ${fmtQty(w1, 'cm')} breit und ${fmtQty(h1, 'cm')} hoch. Rechteck B ist ${fmtQty(w2, 'cm')} breit und hat dieselbe Fläche.`;
  const prompt = 'Sind die Rechtecke kongruent?';
  return build(SKILL, 3, {
    key: `flaeche:${w1}.${h1}:${w2}.${h2}`,
    ab,
    context,
    prompt,
    answer: yesNo(rng, fits, AREA_WHY, 'Dreh ein Rechteck um 90°. Vergleiche dann die Seiten.'),
    hints: ['Rechne zuerst die Höhe von Rechteck B aus.', 'Vergleiche die Seiten. Du darfst ein Rechteck im Kopf drehen.'],
    steps: [`Die Fläche ist ${fmt(w1)} · ${fmt(h1)} = ${fmt(area)}, also ${fmtQty(area, 'cm²')}.`, `Rechteck B ist ${fmt(area)} : ${fmt(w2)} = ${fmt(h2)}, also ${fmtQty(h2, 'cm')} hoch.`, fits ? 'Gedreht passen beide genau aufeinander. Die Rechtecke sind kongruent.' : 'Die Seiten sind verschieden. Die Rechtecke sind nicht kongruent.'],
    praise: fits ? 'Du hast die Lage nicht mitgezählt.' : 'Du hast nicht nur auf die Fläche geschaut.',
    srText: toSpeech(`${context} ${prompt}`),
    kmk: [...KMK, 'PK.argumentieren'],
  });
}

const reasonEqual = (rng: Rng, ab: Ab) => (rng.chance(0.5) ? findOddFlipped(rng, ab) : reasonRectangles(rng, ab));

const FORMS: Record<Stufe, Record<Ab, (rng: Rng, ab: Ab) => Exercise>> = {
  1: { 1: pairSmall, 2: pairLarge, 3: pairClaim },
  2: { 1: findCopy, 2: findCopy, 3: findOdd },
  3: { 1: flippedPair, 2: corresponding, 3: reasonEqual },
};

export const kongruenzSkill: SkillDef = {
  ...SKILL,
  title: 'Kongruente Figuren',
  description: 'Du erkennst Figuren, die genau aufeinander passen.',
  stufen: {
    1: 'Gedrehte Figur: kongruent oder nicht',
    2: 'Die kongruente Figur auf dem Gitter finden',
    3: 'Gleiche Längen und Winkel; umgeklappte Figuren',
  },
  kmk: KMK,
  generate(rng, stufe, ctx) {
    const ab = targetAb(rng, stufe, ctx);
    return FORMS[stufe][ab](rng, ab);
  },
};
