/**
 * Winkel an Geraden (docs/research.md §6). Stufe 1: Nebenwinkel sum to 180°. Stufe 2: Scheitelwinkel, one of the four angles at a crossing. Stufe 3: Innenwinkel of a triangle and Stufenwinkel.
 * Every picture is drawn to the numbers of the task. A Scheitelwinkel or Stufenwinkel alone would repeat the number of the prompt, easier than Stufe 1: above it they are one step of two.
 * The tilt of a picture changes neither text nor answer, so it stays out of the keys: the repeat check of a round compares keys, and a tilt would let the same sentence appear twice.
 */
import { fmtAngle, toSpeech } from '../../core/format';
import type { Ab, Exercise, NumberAnswer, Rng, SkillDef, Stufe } from '../../core/types';
import { build, numberBugs, pickPerson, targetAb } from '../shared';
import { ANGLE_NAMES, crossing, parallels, sayAngles, triangleFromAngles } from './helpers';

const SKILL = { id: 'geometrie.winkel-beziehungen', topicId: 'geometrie' } as const;
const KMK = ['RF.winkel'];

const degrees = (value: number): NumberAnswer => ({ kind: 'number', value, unit: '°' });
const say = (text: string) => toSpeech(sayAngles(text));
const NEBEN_SAME = 'Gleich groß sind nur Scheitelwinkel. Nebenwinkel ergänzen sich zu 180°.';
const NEBEN_FULL = 'Nebenwinkel ergeben zusammen 180°, nicht 360°.';
const NEBEN_RIGHT = 'Nebenwinkel ergeben zusammen einen gestreckten Winkel, keinen rechten.';
const SCHEITEL_NEBEN = 'Dieser Winkel liegt gegenüber. Scheitelwinkel sind gleich groß.';
const TILTS = [0, 10, 20, 30, 160, 170];
const CROSS_TEXT = 'Zwei Geraden kreuzen sich. Die Winkel α, β, γ und δ liegen der Reihe nach um den Kreuzungspunkt.';

const nebenBugs = (given: number) => [
  { id: 'neben-gleich', match: given, hint: NEBEN_SAME },
  { id: 'neben-voll', match: 360 - given, hint: NEBEN_FULL },
  { id: 'neben-rechter', match: Math.abs(90 - given), hint: NEBEN_RIGHT },
];

/** The two Nebenwinkel α and β at a crossing, with α as the known or asked angle. */
function nebenTask(rng: Rng, ab: Ab, pool: readonly number[], key: string): Exercise {
  const alpha = rng.pick(pool);
  const tilt = rng.pick(TILTS);
  const beta = 180 - alpha;
  const askBeta = ab === 1 || rng.chance(0.5);
  const [known, wanted, knownName, wantedName] = askBeta ? [alpha, beta, 'α', 'β'] : [beta, alpha, 'β', 'α'];
  const prompt = `${knownName} und ${wantedName} sind Nebenwinkel. ${knownName} misst ${fmtAngle(known)}. Wie groß ist ${wantedName}?`;
  return build(SKILL, 1, {
    key: `${key}:${known}:${knownName}`,
    ab,
    prompt,
    visual: crossing(tilt, alpha, [0, 1]),
    answer: degrees(wanted),
    hints: ['Nebenwinkel liegen nebeneinander an einer Geraden.', 'Zusammen ergeben Nebenwinkel einen gestreckten Winkel: 180°.'],
    steps: ['Nebenwinkel ergeben zusammen 180°.', `180° − ${fmtAngle(known)} = ${fmtAngle(wanted)}`, `${wantedName} misst ${fmtAngle(wanted)}.`],
    bugs: numberBugs(nebenBugs(known), wanted),
    praise: 'Du hast den Nebenwinkel von 180° aus berechnet.',
    srText: say(`Zwei Geraden kreuzen sich. Die Winkel α und β liegen nebeneinander. ${prompt}`),
    kmk: KMK,
  });
}

const EXACT = [37, 43, 48, 54, 62, 68, 73, 79, 84, 96, 104, 113, 126, 138];
const neben1 = (rng: Rng, ab: Ab) => nebenTask(rng, ab, [30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 100, 105, 110, 115, 120, 125, 130, 135, 140, 145, 150], 'neben');
const neben2 = (rng: Rng, ab: Ab) => nebenTask(rng, ab, EXACT, 'neben-genau');

/** Stufe 1, AB III: reasoning. A wrong Nebenwinkel to check, then the same subtraction with exact numbers. */
function nebenCheck(rng: Rng, ab: Ab): Exercise {
  const alpha = rng.pick(EXACT);
  const tilt = rng.pick(TILTS);
  const askBeta = rng.chance(0.5);
  const [known, wanted, knownName, wantedName] = askBeta ? [alpha, 180 - alpha, 'α', 'β'] : [180 - alpha, alpha, 'β', 'α'];
  const claim = wanted + rng.pick([-10, 10]);
  const { name } = pickPerson(rng);
  const prompt = `${knownName} und ${wantedName} sind Nebenwinkel. ${knownName} misst ${fmtAngle(known)}. ${name} sagt: ${wantedName} misst ${fmtAngle(claim)}. Wie groß ist ${wantedName} wirklich?`;
  return build(SKILL, 1, {
    key: `pruefen:${known}:${claim}:${knownName}`,
    ab,
    prompt,
    visual: crossing(tilt, alpha, [0, 1]),
    answer: degrees(wanted),
    hints: ['Prüfe zuerst: Ergeben beide Winkel zusammen 180°?', 'Rechne selbst von 180° aus.'],
    steps: [`${fmtAngle(known)} + ${fmtAngle(claim)} = ${fmtAngle(known + claim)}, nicht 180°.`, `180° − ${fmtAngle(known)} = ${fmtAngle(wanted)}`, `${wantedName} misst ${fmtAngle(wanted)}.`],
    bugs: numberBugs([{ id: 'neben-differenz', match: claim, hint: `Das ist die Zahl von ${name}. Rechne selbst von 180° aus.` }, ...nebenBugs(known)], wanted),
    praise: 'Du hast die Angabe geprüft und selbst gerechnet.',
    srText: say(`Zwei Geraden kreuzen sich. Die Winkel α und β liegen nebeneinander. ${prompt}`),
    kmk: [...KMK, 'PK.argumentieren'],
  });
}

/** Stufe 1, AB III: two steps from the sum of 180°, forwards. How much larger is the Nebenwinkel? 60° stays out: the gap would be 60° as well. */
function nebenGap(rng: Rng, ab: Ab): Exercise {
  const alpha = rng.pick([34, 38, 42, 46, 52, 56, 64, 68, 72, 76]);
  const beta = 180 - alpha;
  const gap = beta - alpha;
  const tilt = rng.pick(TILTS);
  const prompt = `α und β sind Nebenwinkel. α misst ${fmtAngle(alpha)}. Um wie viel Grad ist β größer als α?`;
  return build(SKILL, 1, {
    key: `unterschied:${alpha}`,
    ab,
    prompt,
    visual: crossing(tilt, alpha, [0, 1]),
    answer: degrees(gap),
    hints: ['Berechne zuerst β. Nebenwinkel ergeben zusammen 180°.', 'Zieh dann α von β ab.'],
    steps: [`180° − ${fmtAngle(alpha)} = ${fmtAngle(beta)}`, `${fmtAngle(beta)} − ${fmtAngle(alpha)} = ${fmtAngle(gap)}`, `β ist um ${fmtAngle(gap)} größer als α.`],
    bugs: numberBugs([{ id: 'neben-differenz', match: beta, hint: 'Das ist die Größe von β. Gefragt ist der Unterschied zu α.' }, { id: 'neben-differenz', match: alpha, hint: 'Das ist die Größe von α. Gefragt ist der Unterschied zu β.' }], gap),
    praise: 'Du hast zuerst den Nebenwinkel berechnet und dann verglichen.',
    srText: say(`Zwei Geraden kreuzen sich. Die Winkel α und β liegen nebeneinander. ${prompt}`),
    kmk: [...KMK, 'PK.problemloesen'],
  });
}

const nebenReason = (rng: Rng, ab: Ab) => (rng.chance(0.5) ? nebenCheck(rng, ab) : nebenGap(rng, ab));

const sizes = (alpha: number) => [alpha, 180 - alpha, alpha, 180 - alpha];

/** Stufe 2, AB I: through the Scheitelwinkel to its Nebenwinkel, each named in the task. */
function scheitel(rng: Rng, ab: Ab): Exercise {
  const alpha = rng.pick([40, 50, 55, 65, 70, 75, 105, 110, 125, 130, 140]);
  const tilt = rng.pick(TILTS);
  const given = rng.int(0, 3);
  const opposite = (given + 2) % 4;
  const next = (opposite + rng.pick([1, 3])) % 4;
  const all = sizes(alpha);
  const [g, o, n] = [ANGLE_NAMES[given], ANGLE_NAMES[opposite], ANGLE_NAMES[next]];
  const prompt = `${g} misst ${fmtAngle(all[given])}. ${o} ist der Scheitelwinkel von ${g}. ${n} ist ein Nebenwinkel von ${o}. Wie groß ist ${n}?`;
  return build(SKILL, 2, {
    key: `scheitel:${alpha}:${given}:${next}`,
    ab,
    prompt,
    visual: crossing(tilt, alpha),
    answer: degrees(all[next]),
    hints: ['Scheitelwinkel sind gleich groß.', 'Nebenwinkel ergeben zusammen 180°.'],
    steps: [`${o} ist so groß wie ${g}: ${fmtAngle(all[given])}.`, `180° − ${fmtAngle(all[given])} = ${fmtAngle(all[next])}`, `${n} misst ${fmtAngle(all[next])}.`],
    bugs: numberBugs(nebenBugs(all[given]), all[next]),
    praise: 'Du hast Scheitelwinkel und Nebenwinkel verbunden.',
    srText: say(`${CROSS_TEXT} ${prompt}`),
    kmk: KMK,
  });
}

/** Stufe 2, AB II: one angle is known, harder numbers, no name for the relation: a neighbour of it, or two opposite angles together. */
function oneOfFour(rng: Rng, ab: Ab): Exercise {
  const alpha = rng.pick([38, 47, 53, 64, 71, 82, 98, 107, 116, 123, 134, 142]);
  const tilt = rng.pick(TILTS);
  const given = rng.int(0, 3);
  const all = sizes(alpha);
  if (rng.chance(0.3)) {
    const own = rng.chance(0.5);
    const first = own ? given : (given + 1) % 4;
    const second = (first + 2) % 4;
    const value = 2 * all[first];
    const [g, p, q] = [ANGLE_NAMES[given], ANGLE_NAMES[first], ANGLE_NAMES[second]];
    const prompt = `${g} misst ${fmtAngle(all[given])}. Wie groß sind ${p} und ${q} zusammen?`;
    return build(SKILL, 2, {
      key: `vier-summe:${alpha}:${given}:${first}`,
      ab,
      prompt,
      visual: crossing(tilt, alpha),
      answer: degrees(value),
      hints: ['Liegen die beiden Winkel gegenüber oder nebeneinander?', 'Gegenüber: gleich groß. Nebeneinander: zusammen 180°.'],
      steps: [...(own ? [] : [`${p} liegt neben ${g}: 180° − ${fmtAngle(all[given])} = ${fmtAngle(all[first])}`]), `${q} liegt ${p} gegenüber, also misst ${q} auch ${fmtAngle(all[first])}.`, `${fmtAngle(all[first])} + ${fmtAngle(all[first])} = ${fmtAngle(value)}`],
      bugs: numberBugs([{ id: 'scheitel-summe', match: all[first], hint: `Das ist nur ein Winkel. Gefragt sind ${p} und ${q} zusammen.` }, { id: 'scheitel-neben', match: 2 * (180 - all[first]), hint: own ? SCHEITEL_NEBEN : `${p} und ${q} liegen neben ${g}. Nebenwinkel ergänzen sich zu 180°.` }], value),
      praise: 'Du hast die beiden Winkel gegenüber erkannt.',
      srText: say(`${CROSS_TEXT} ${prompt}`),
      kmk: KMK,
    });
  }
  const wanted = (given + rng.pick([1, 3])) % 4;
  const prompt = `${ANGLE_NAMES[given]} misst ${fmtAngle(all[given])}. Wie groß ist ${ANGLE_NAMES[wanted]}?`;
  return build(SKILL, 2, {
    key: `vier:${alpha}:${given}:${wanted}`,
    ab,
    prompt,
    visual: crossing(tilt, alpha),
    answer: degrees(all[wanted]),
    hints: ['Liegen die beiden Winkel gegenüber oder nebeneinander?', 'Gegenüber: gleich groß. Nebeneinander: zusammen 180°.'],
    steps: [`${ANGLE_NAMES[wanted]} liegt neben ${ANGLE_NAMES[given]}.`, `180° − ${fmtAngle(all[given])} = ${fmtAngle(all[wanted])}`, `${ANGLE_NAMES[wanted]} misst ${fmtAngle(all[wanted])}.`],
    bugs: numberBugs(nebenBugs(all[given]), all[wanted]),
    praise: 'Du hast die Nebenwinkel an der Lage erkannt.',
    srText: say(`${CROSS_TEXT} ${prompt}`),
    kmk: KMK,
  });
}

/** Stufe 2, AB III: reasoning. Two Scheitelwinkel have a known sum; a Nebenwinkel of them is asked. */
function scheitelSum(rng: Rng, ab: Ab): Exercise {
  const alpha = rng.pick([35, 40, 45, 50, 55, 65, 70, 75, 80, 85]);
  const beta = 180 - alpha;
  const sum = 2 * alpha;
  const tilt = rng.pick(TILTS);
  const prompt = `α und γ ergeben zusammen ${fmtAngle(sum)}. Wie groß ist β?`;
  return build(SKILL, 2, {
    key: `summe:${alpha}`,
    ab,
    prompt,
    visual: crossing(tilt, alpha),
    answer: degrees(beta),
    hints: ['α und γ sind Scheitelwinkel. Beide sind gleich groß.', 'Bestimme zuerst α. β ist dann der Nebenwinkel von α.'],
    steps: [`${fmtAngle(sum)} : 2 = ${fmtAngle(alpha)}, das ist α.`, `180° − ${fmtAngle(alpha)} = ${fmtAngle(beta)}`, `β misst ${fmtAngle(beta)}.`],
    bugs: numberBugs([{ id: 'scheitel-summe', match: alpha, hint: 'Das ist α. Gefragt ist der Nebenwinkel β.' }, { id: 'scheitel-summe', match: 180 - sum, hint: 'α und γ sind beide gemeint. Halbiere zuerst die Summe.' }], beta),
    praise: 'Du hast zuerst α bestimmt und dann den Nebenwinkel.',
    srText: say(`${CROSS_TEXT} ${prompt}`),
    kmk: [...KMK, 'PK.argumentieren'],
  });
}

/** Stufe 3, AB I: the third Innenwinkel of a triangle. */
function innenwinkel(rng: Rng, ab: Ab): Exercise {
  const alpha = rng.pick([30, 35, 40, 45, 50, 55, 60, 70, 75, 80]);
  const beta = rng.pick([25, 35, 40, 50, 55, 65, 70, 85].filter((b) => alpha + b <= 150 && new Set([alpha, b, 180 - alpha - b]).size === 3));
  const gamma = 180 - alpha - beta;
  const turn = rng.pick([0, 0, 15, 345]);
  const context = `Im Dreieck misst der Winkel bei A ${fmtAngle(alpha)}. Der Winkel bei B misst ${fmtAngle(beta)}.`;
  const prompt = 'Wie groß ist der Winkel bei C?';
  return build(SKILL, 3, {
    key: `innen:${alpha}:${beta}`,
    ab,
    context,
    prompt,
    visual: { type: 'figure', points: triangleFromAngles(alpha, beta, turn) },
    answer: degrees(gamma),
    hints: ['Die Innenwinkel eines Dreiecks ergeben zusammen 180°.', 'Addiere die beiden Winkel. Was fehlt noch bis 180°?'],
    steps: [`${fmtAngle(alpha)} + ${fmtAngle(beta)} = ${fmtAngle(alpha + beta)}`, `180° − ${fmtAngle(alpha + beta)} = ${fmtAngle(gamma)}`, `Der Winkel bei C misst ${fmtAngle(gamma)}.`],
    bugs: numberBugs([{ id: 'dreieck-voll', match: 360 - alpha - beta, hint: 'Im Dreieck sind es zusammen 180°, nicht 360°.' }, { id: 'dreieck-summe', match: alpha + beta, hint: 'Das ist die Summe der beiden Winkel. Was fehlt noch bis 180°?' }], gamma),
    praise: 'Du hast die Winkelsumme im Dreieck genutzt.',
    srText: toSpeech(`Ein Dreieck mit den Ecken A, B und C. ${context} ${prompt}`),
    kmk: KMK,
  });
}

/** Stufe 3, AB II: from α to γ or back at two parallel lines: a Stufenwinkel and its Nebenwinkel. */
function stufenwinkel(rng: Rng, ab: Ab): Exercise {
  const theta = rng.pick([40, 48, 55, 62, 68, 73, 107, 112, 118, 125, 132, 140]);
  const fromAlpha = rng.chance(0.5);
  const [known, value] = fromAlpha ? [theta, 180 - theta] : [180 - theta, theta];
  const [knownName, name] = fromAlpha ? ['α', 'γ'] : ['γ', 'α'];
  const prompt = `Die Geraden p und q sind parallel. ${knownName} misst ${fmtAngle(known)}. Wie groß ist ${name}?`;
  return build(SKILL, 3, {
    key: `stufen:${theta}:${name}`,
    ab,
    prompt,
    visual: parallels(theta),
    answer: degrees(value),
    hints: ['Stufenwinkel an parallelen Geraden sind gleich groß.', fromAlpha ? 'Suche zuerst den Stufenwinkel von α. γ liegt daneben.' : 'β liegt neben γ. Der Stufenwinkel von β ist α.'],
    steps: fromAlpha
      ? ['β ist der Stufenwinkel von α.', `β misst also ${fmtAngle(theta)}.`, `180° − ${fmtAngle(theta)} = ${fmtAngle(value)}`, `γ misst ${fmtAngle(value)}.`]
      : ['β liegt neben γ.', `180° − ${fmtAngle(known)} = ${fmtAngle(value)}`, 'α und β sind Stufenwinkel, also gleich groß.', `α misst ${fmtAngle(value)}.`],
    bugs: numberBugs([{ id: 'stufen-neben', match: known, hint: fromAlpha ? 'γ liegt neben dem Stufenwinkel von α. Rechne noch bis 180°.' : 'γ und α sind nicht gleich groß. β liegt neben γ: Rechne bis 180°.' }], value),
    praise: 'Du hast Stufenwinkel und Nebenwinkel verbunden.',
    srText: say(`Die parallelen Geraden p und q werden von der Geraden r gekreuzt. α liegt an der Kreuzung mit p, oben rechts von r. β liegt an der Kreuzung mit q an der gleichen Stelle. γ liegt neben β. ${prompt}`),
    kmk: KMK,
  });
}

/** Stufe 3, AB III: reasoning. The angles of a gleichschenkliges Dreieck, forwards and backwards. */
function basiswinkel(rng: Rng, ab: Ab): Exercise {
  const tip = rng.pick([20, 30, 36, 40, 44, 50, 56, 64, 70, 80, 96, 100, 110, 120]);
  const base = (180 - tip) / 2;
  const turn = rng.pick([0, 0, 15, 345]);
  const fromTip = rng.chance(0.5);
  const value = fromTip ? base : tip;
  const prompt = fromTip
    ? `In einem gleichschenkligen Dreieck misst der Winkel an der Spitze ${fmtAngle(tip)}. Wie groß ist ein Basiswinkel?`
    : `In einem gleichschenkligen Dreieck misst ein Basiswinkel ${fmtAngle(base)}. Wie groß ist der Winkel an der Spitze?`;
  return build(SKILL, 3, {
    key: `basis:${tip}:${fromTip ? 'spitze' : 'basis'}`,
    ab,
    prompt,
    visual: { type: 'figure', points: triangleFromAngles(base, base, turn), equalMarks: [[1, 2]] },
    answer: degrees(value),
    hints: ['Im gleichschenkligen Dreieck sind beide Basiswinkel gleich groß.', 'Alle drei Winkel ergeben zusammen 180°.'],
    steps: fromTip
      ? [`180° − ${fmtAngle(tip)} = ${fmtAngle(2 * base)}`, 'Die beiden Basiswinkel sind gleich groß.', `${fmtAngle(2 * base)} : 2 = ${fmtAngle(base)}`]
      : ['Die beiden Basiswinkel sind gleich groß.', `2 · ${fmtAngle(base)} = ${fmtAngle(2 * base)}`, `180° − ${fmtAngle(2 * base)} = ${fmtAngle(tip)}`],
    bugs: numberBugs(fromTip
      ? [{ id: 'basis-zusammen', match: 2 * base, hint: 'Das sind beide Basiswinkel zusammen. Wie groß ist einer davon?' }, { id: 'basis-einfach', match: tip, hint: 'Der Winkel an der Spitze ist nicht immer so groß wie ein Basiswinkel.' }]
      : [{ id: 'basis-zusammen', match: 180 - base, hint: 'Es gibt zwei Basiswinkel. Zieh beide von 180° ab.' }, { id: 'basis-einfach', match: base, hint: 'Der Winkel an der Spitze ist nicht immer so groß wie ein Basiswinkel.' }], value),
    praise: 'Du hast gleiche Basiswinkel und Winkelsumme verbunden.',
    srText: toSpeech(`Ein gleichschenkliges Dreieck, zwei Seiten sind als gleich lang markiert. ${prompt}`),
    kmk: [...KMK, 'PK.argumentieren'],
  });
}

const FORMS: Record<Stufe, Record<Ab, (rng: Rng, ab: Ab) => Exercise>> = {
  1: { 1: neben1, 2: neben2, 3: nebenReason },
  2: { 1: scheitel, 2: oneOfFour, 3: scheitelSum },
  3: { 1: innenwinkel, 2: stufenwinkel, 3: basiswinkel },
};

export const winkelBeziehungenSkill: SkillDef = {
  ...SKILL,
  title: 'Winkel an Geraden',
  description: 'Du findest Nebenwinkel und Scheitelwinkel.',
  stufen: {
    1: 'Nebenwinkel ergeben zusammen 180°',
    2: 'Scheitelwinkel; einen von vier Winkeln an einer Kreuzung finden',
    3: 'Innenwinkel im Dreieck und Stufenwinkel',
  },
  kmk: KMK,
  generate(rng, stufe, ctx) {
    const ab = targetAb(rng, stufe, ctx);
    return FORMS[stufe][ab](rng, ab);
  },
};
