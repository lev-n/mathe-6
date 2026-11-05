/**
 * Dreiecke einteilen (docs/research.md §6). Stufe 1: by sides, gleichseitig or gleichschenklig. Stufe 2: by angles, spitz-, recht- or stumpfwinklig. Stufe 3: both at once, and which combination is impossible.
 * A gleichseitiges Dreieck also has two equal sides, so the question asks for the most exact name. Figures are drawn to their numbers.
 * The voice gets what the picture shows, as data: openings on a clock face and the marks. The kind of triangle is the answer, so it never says a verdict (see openingOnClock).
 */
import { fmt, fmtAngle, fmtQty, toSpeech } from '../../core/format';
import type { Ab, ChoiceOption, Exercise, Rng, SkillDef, Stufe, VisualOf } from '../../core/types';
import { build, makeChoice, targetAb } from '../shared';
import { CLOCK_FACE, clockMinute, fixedChoice, triangleFromAngles, triangleFromSides, yesNo } from './helpers';

const SKILL = { id: 'geometrie.dreiecke', topicId: 'geometrie' } as const;
const KMK = ['RF.figuren'];

type BySide = 'gleichseitig' | 'gleichschenklig' | 'verschieden';
type ByAngle = 'spitzwinklig' | 'rechtwinklig' | 'stumpfwinklig';
const SIDE_LABEL: Record<BySide, string> = { gleichseitig: 'gleichseitig', gleichschenklig: 'gleichschenklig', verschieden: 'alle Seiten verschieden lang' };
const SIDE_ORDER: readonly BySide[] = ['gleichseitig', 'gleichschenklig', 'verschieden'];
const ANGLE_ORDER: readonly ByAngle[] = ['spitzwinklig', 'rechtwinklig', 'stumpfwinklig'];
const ANGLE_WHY: Record<ByAngle, string> = {
  spitzwinklig: 'Spitzwinklig heißt: Alle drei Winkel sind kleiner als 90°.',
  rechtwinklig: 'Rechtwinklig heißt: Ein Winkel misst genau 90°.',
  stumpfwinklig: 'Stumpfwinklig heißt: Ein Winkel ist größer als 90°.',
};
const QUESTION = 'Welcher Name passt am genauesten?';
const SIDE_HINTS = ['Vergleiche die drei Seiten miteinander.', 'Wie viele Seiten sind gleich lang?'];
const ANGLE_HINTS = ['Suche den größten Winkel.', 'Vergleiche diesen Winkel mit 90°.'];
const TURNS = [0, 15, 30, 330, 345];

function sideWhy(right: BySide, picked: BySide): string {
  if (picked === 'gleichschenklig') return right === 'gleichseitig' ? 'Zwei Seiten sind gleich lang. Hier gibt es aber einen genaueren Namen.' : 'Gleichschenklig heißt: Zwei Seiten sind gleich lang.';
  if (picked === 'gleichseitig') return 'Gleichseitig heißt: Alle drei Seiten sind gleich lang.';
  return 'Schau genau: Hier sind Seiten gleich lang.';
}
const sideChoice = (rng: Rng, right: BySide) => fixedChoice(rng, SIDE_LABEL[right], SIDE_ORDER.filter((k) => k !== right).map((k) => ({ label: SIDE_LABEL[k], whyWrong: sideWhy(right, k) })), SIDE_ORDER.map((k) => SIDE_LABEL[k]));
const angleChoice = (rng: Rng, right: ByAngle) => fixedChoice(rng, right, ANGLE_ORDER.filter((k) => k !== right).map((k) => ({ label: k, whyWrong: ANGLE_WHY[k] })), ANGLE_ORDER);

const angleKind = (angles: readonly number[]): ByAngle => (Math.max(...angles) === 90 ? 'rechtwinklig' : Math.max(...angles) > 90 ? 'stumpfwinklig' : 'spitzwinklig');
const sideStep = (kind: BySide) => (kind === 'gleichseitig' ? 'Alle drei Seiten sind gleich lang.' : kind === 'gleichschenklig' ? 'Genau zwei Seiten sind gleich lang.' : 'Keine zwei Seiten sind gleich lang.');
const sideResult = (kind: BySide) => (kind === 'verschieden' ? 'Alle Seiten sind verschieden lang.' : `Das Dreieck ist ${kind}.`);

/** Whole sides of the given kind: a triangle exists with them. */
function pickSides(rng: Rng, kind: BySide): [number, number, number] {
  if (kind === 'gleichseitig') {
    const a = rng.int(3, 12);
    return [a, a, a];
  }
  if (kind === 'gleichschenklig') {
    const a = rng.int(4, 12);
    const b = rng.pick([3, 4, 5, 6, 7, 8, 9, 10].filter((x) => x !== a && x < 2 * a));
    return [a, a, b];
  }
  for (;;) {
    const [a, b, c] = rng.sample([3, 4, 5, 6, 7, 8, 9, 10, 11, 12], 3);
    if (a + b > c && a + c > b && b + c > a) return [a, b, c];
  }
}

/** Stufe 1, AB I: a drawn triangle with its side lengths. */
function sidesPicture(rng: Rng, ab: Ab): Exercise {
  const kind = rng.pick(SIDE_ORDER);
  const [a, b, c] = pickSides(rng, kind);
  return build(SKILL, 1, {
    key: `seiten-bild:${a}.${b}.${c}`,
    ab,
    prompt: QUESTION,
    visual: { type: 'figure', points: triangleFromSides(a, b, c), sides: [fmtQty(c, 'cm'), fmtQty(a, 'cm'), fmtQty(b, 'cm')] },
    answer: sideChoice(rng, kind),
    hints: SIDE_HINTS,
    steps: [`Die Seiten sind ${fmt(a)} cm, ${fmt(b)} cm und ${fmt(c)} cm lang.`, sideStep(kind), sideResult(kind)],
    praise: 'Du hast alle drei Seiten verglichen.',
    srText: toSpeech(`Ein Dreieck mit den Seiten ${a} Zentimeter, ${b} Zentimeter und ${c} Zentimeter. ${QUESTION}`),
    kmk: KMK,
  });
}

/** Stufe 1, AB II: only the lengths in the text, also with a comma. */
function sidesText(rng: Rng, ab: Ab): Exercise {
  const kind = rng.pick(SIDE_ORDER);
  const half = rng.chance(0.5);
  const [a, b, c] = pickSides(rng, kind).map((x) => (half ? x + 0.5 : x));
  const shown = rng.shuffle([a, b, c]);
  const text = `${fmtQty(shown[0], 'cm')}, ${fmtQty(shown[1], 'cm')} und ${fmtQty(shown[2], 'cm')}`;
  const prompt = `Ein Dreieck hat die Seiten ${text}. ${QUESTION}`;
  return build(SKILL, 1, {
    key: `seiten-text:${shown.join('.')}`,
    ab,
    prompt,
    answer: sideChoice(rng, kind),
    hints: SIDE_HINTS,
    steps: [sideStep(kind), sideResult(kind)],
    praise: 'Du hast die Längen genau verglichen.',
    srText: toSpeech(prompt),
    kmk: KMK,
  });
}

const sidesLabel = (sides: readonly number[]) => sides.map((s) => fmtQty(s, 'cm')).join(', ');
const sidesKey = (sides: readonly number[]) => [...sides].sort((p, q) => p - q).join('.');

/** Stufe 1, AB III: reversed. From the name to the lengths: which three lengths fit it? Only triangles that exist are offered, and no gleichseitiges where gleichschenklig is asked: it would fit too. */
function sidesForName(rng: Rng, ab: Ab): Exercise {
  const kind = rng.pick<BySide>(['gleichseitig', 'gleichschenklig']);
  const right = rng.shuffle(pickSides(rng, kind));
  const others: { sides: number[]; whyWrong: string }[] = [];
  while (others.length < 3) {
    const other = rng.pick<BySide>(kind === 'gleichseitig' ? ['gleichschenklig', 'verschieden'] : ['verschieden']);
    const sides = rng.shuffle(pickSides(rng, other));
    if (sidesKey(sides) !== sidesKey(right) && !others.some((o) => sidesKey(o.sides) === sidesKey(sides))) others.push({ sides, whyWrong: other === 'verschieden' ? 'Hier sind alle drei Seiten verschieden lang.' : 'Hier sind nur zwei Seiten gleich lang.' });
  }
  const prompt = `Welche Längen passen zu einem ${kind === 'gleichseitig' ? 'gleichseitigen' : 'gleichschenkligen'} Dreieck?`;
  return build(SKILL, 1, {
    key: `laengen:${kind}:${sidesKey(right)}:${others.map((o) => sidesKey(o.sides)).sort().join('_')}`,
    ab,
    prompt,
    answer: makeChoice(rng, { label: sidesLabel(right) }, others.map((o) => ({ label: sidesLabel(o.sides), whyWrong: o.whyWrong }))),
    hints: ['Wie viele Seiten sind bei diesem Namen gleich lang?', 'Vergleiche in jeder Antwort die drei Längen.'],
    steps: [kind === 'gleichseitig' ? 'Bei diesem Namen sind alle drei Seiten gleich lang.' : 'Bei diesem Namen sind zwei Seiten gleich lang.', `Das passt zu ${sidesLabel(right)}.`],
    praise: 'Du hast vom Namen auf die Längen geschlossen.',
    srText: toSpeech(prompt),
    kmk: [...KMK, 'PK.argumentieren'],
  });
}

/** Stufe 1, AB III: reversed. The name and the Umfang are known: how long is the side that is missing? */
function sideFromUmfang(rng: Rng, ab: Ab): Exercise {
  const equal = rng.chance(0.5);
  const [a, , b] = pickSides(rng, equal ? 'gleichseitig' : 'gleichschenklig');
  const umfang = 2 * a + b;
  const prompt = equal ? `Ein gleichseitiges Dreieck hat den Umfang ${fmtQty(umfang, 'cm')}. Wie lang ist eine Seite?` : `Ein gleichschenkliges Dreieck hat den Umfang ${fmtQty(umfang, 'cm')}. Zwei Seiten sind je ${fmtQty(a, 'cm')} lang. Wie lang ist die dritte Seite?`;
  const wrongs: ChoiceOption[] = equal
    ? [{ label: fmtQty(umfang / 2, 'cm'), whyWrong: 'Ein Dreieck hat drei Seiten. Teile den Umfang durch 3.' }, { label: fmtQty(umfang - a, 'cm'), whyWrong: 'Das sind zwei Seiten zusammen. Gefragt ist eine Seite.' }, { label: fmtQty(a + 1, 'cm'), whyWrong: 'Rechne mal 3 zur Probe. Kommt der Umfang heraus?' }, { label: fmtQty(a + 2, 'cm'), whyWrong: 'Rechne mal 3 zur Probe. Kommt der Umfang heraus?' }]
    : [{ label: fmtQty(a, 'cm'), whyWrong: 'Dann ist das Dreieck gleichseitig. Rechne den Umfang nach.' }, { label: fmtQty(umfang - a, 'cm'), whyWrong: 'Zieh beide gleich langen Seiten vom Umfang ab.' }, { label: fmtQty(b + 1, 'cm'), whyWrong: 'Addiere alle drei Seiten zur Probe. Kommt der Umfang heraus?' }, { label: fmtQty(b + 2, 'cm'), whyWrong: 'Addiere alle drei Seiten zur Probe. Kommt der Umfang heraus?' }];
  return build(SKILL, 1, {
    key: `umfang:${equal ? 'gleichseitig' : 'gleichschenklig'}:${a}.${b}`,
    ab,
    prompt,
    answer: makeChoice(rng, { label: fmtQty(b, 'cm') }, wrongs),
    hints: ['Der Umfang ist die Summe aller drei Seiten.', equal ? 'Alle drei Seiten sind gleich lang.' : 'Zwei Seiten kennst du schon.'],
    steps: equal ? ['Alle drei Seiten sind gleich lang.', `${fmtQty(umfang, 'cm')} : 3 = ${fmtQty(b, 'cm')}`] : ['Zwei Seiten sind gleich lang.', `${fmtQty(umfang, 'cm')} − ${fmtQty(a, 'cm')} − ${fmtQty(a, 'cm')} = ${fmtQty(b, 'cm')}`],
    praise: 'Du hast vom Umfang auf die Seite geschlossen.',
    srText: toSpeech(prompt),
    kmk: [...KMK, 'PK.argumentieren'],
  });
}

const reversedSides = (rng: Rng, ab: Ab) => (rng.chance(0.5) ? sidesForName(rng, ab) : sideFromUmfang(rng, ab));

/** Three angles of one kind, with the first two as drawn at A and B. */
function pickAngles(rng: Rng, kind: ByAngle): [number, number, number] {
  if (kind === 'rechtwinklig') {
    const a = rng.pick([20, 25, 30, 35, 40, 45, 50, 55, 60, 65]);
    return rng.shuffle([a, 90 - a, 90]) as [number, number, number];
  }
  if (kind === 'stumpfwinklig') {
    const big = rng.pick([100, 105, 110, 115, 120, 125, 130, 140]);
    const a = rng.pick([15, 20, 25, 30].filter((x) => (180 - big - x) >= 10));
    return rng.shuffle([a, 180 - big - a, big]) as [number, number, number];
  }
  const a = rng.pick([50, 55, 60, 65, 70, 75, 80]);
  const b = rng.pick([40, 45, 50, 55, 60, 65, 70].filter((x) => 180 - a - x < 90 && 180 - a - x > 20));
  return rng.shuffle([a, b, 180 - a - b]) as [number, number, number];
}

const anglePicture = (angles: readonly number[], turn: number): VisualOf<'figure'> => {
  const right = angles.indexOf(90);
  return { type: 'figure', points: triangleFromAngles(angles[0], angles[1], turn), ...(right >= 0 ? { rightAngles: [right] } : {}) };
};
const angleStep = (kind: ByAngle, biggest: number) => (kind === 'rechtwinklig' ? 'Ein Winkel misst genau 90°.' : kind === 'stumpfwinklig' ? `Der größte Winkel misst ${fmtAngle(biggest)}. Das ist mehr als 90°.` : `Der größte Winkel misst ${fmtAngle(biggest)}. Das ist weniger als 90°.`);
/** The openings at A, B and C for the voice. Its 3 says the number of corners the picture's description names, so the description is not read a second time. */
const spokenOpenings = ([a, b, c]: readonly number[]) => `Ein Dreieck mit 3 Ecken: A, B und C. ${CLOCK_FACE} Die Öffnung bei A reicht von der 12 bis etwa Minute ${clockMinute(a)}, bei B bis etwa Minute ${clockMinute(b)}, bei C bis etwa Minute ${clockMinute(c)}.${[a, b, c].includes(90) ? ' Ein rechter Winkel ist markiert.' : ''}`;
/** The marks of equal sides for the voice, in the places of bothPicture. How many sides are equal stays for the child to count. */
const spokenMarks = (side: BySide) => (side === 'gleichseitig' ? 'Die Seiten AB, BC und CA tragen denselben Strich.' : side === 'gleichschenklig' ? 'Die Seiten BC und CA tragen denselben Strich.' : 'Keine Seite trägt einen Strich.');

/** Stufe 2, AB I: a drawn triangle, mostly turned. */
function anglesPicture(rng: Rng, ab: Ab): Exercise {
  const kind = rng.pick(ANGLE_ORDER);
  const angles = pickAngles(rng, kind);
  const turn = rng.pick(TURNS);
  const prompt = 'Welche Art von Dreieck zeigt das Bild?';
  return build(SKILL, 2, {
    key: `winkel-bild:${angles.join('.')}:${turn}`,
    ab,
    prompt,
    visual: anglePicture(angles, turn),
    answer: angleChoice(rng, kind),
    hints: ANGLE_HINTS,
    steps: [angleStep(kind, Math.max(...angles)), `Das Dreieck ist ${kind}.`],
    praise: 'Du hast den größten Winkel geprüft.',
    srText: toSpeech(`${spokenOpenings(angles)} ${prompt}`),
    kmk: KMK,
  });
}

/** Stufe 2, AB II: three angles in the text, close to 90° too. */
function anglesText(rng: Rng, ab: Ab): Exercise {
  const kind = rng.pick(ANGLE_ORDER);
  const big = kind === 'rechtwinklig' ? 90 : kind === 'stumpfwinklig' ? rng.pick([91, 92, 94, 96, 103, 117, 128]) : rng.pick([72, 78, 83, 86, 88, 89]);
  const a = rng.int(Math.max(10, Math.ceil(180 - 2 * big) + 1), Math.min(big - 1, 180 - big - 10));
  const angles = rng.shuffle([big, a, 180 - big - a]);
  const prompt = `Ein Dreieck hat die Winkel ${fmtAngle(angles[0])}, ${fmtAngle(angles[1])} und ${fmtAngle(angles[2])}. Welche Art von Dreieck ist das?`;
  return build(SKILL, 2, {
    key: `winkel-text:${angles.join('.')}`,
    ab,
    prompt,
    answer: angleChoice(rng, kind),
    hints: ANGLE_HINTS,
    steps: [angleStep(kind, big), `Das Dreieck ist ${kind}.`],
    praise: 'Du hast den größten Winkel genau mit 90° verglichen.',
    srText: toSpeech(prompt),
    kmk: KMK,
  });
}

/** Stufe 2, AB III: reasoning. Two angles are given, the third decides. */
function anglesReason(rng: Rng, ab: Ab): Exercise {
  const a = rng.pick([20, 25, 30, 35, 40, 45, 50, 55, 60, 65]);
  const b = rng.pick([15, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70].filter((x) => x !== a && a + x < 160));
  const c = 180 - a - b;
  const kind = angleKind([a, b, c]);
  const prompt = `Zwei Winkel eines Dreiecks messen ${fmtAngle(a)} und ${fmtAngle(b)}. Welche Art von Dreieck ist das?`;
  return build(SKILL, 2, {
    key: `winkel-dritter:${a}.${b}`,
    ab,
    prompt,
    answer: angleChoice(rng, kind),
    hints: ['Die drei Winkel ergeben zusammen 180°.', 'Berechne zuerst den dritten Winkel.'],
    steps: [`180° − ${fmtAngle(a)} − ${fmtAngle(b)} = ${fmtAngle(c)}`, angleStep(kind, Math.max(a, b, c)), `Das Dreieck ist ${kind}.`],
    praise: 'Du hast zuerst den dritten Winkel berechnet.',
    srText: toSpeech(prompt),
    kmk: [...KMK, 'PK.argumentieren'],
  });
}

const combo = (side: BySide, angle: ByAngle) => (side === 'verschieden' ? `verschieden lange Seiten, ${angle}` : `${side} und ${angle}`);

/** A triangle by side kind and angle kind, as its three angles; equal angles lie opposite equal sides. */
function pickCombination(rng: Rng): { side: BySide; angle: ByAngle; angles: [number, number, number] } {
  const choice = rng.pick<[BySide, ByAngle]>([['gleichseitig', 'spitzwinklig'], ['gleichschenklig', 'spitzwinklig'], ['gleichschenklig', 'rechtwinklig'], ['gleichschenklig', 'stumpfwinklig'], ['verschieden', 'spitzwinklig'], ['verschieden', 'rechtwinklig'], ['verschieden', 'stumpfwinklig']]);
  const [side, angle] = choice;
  if (side === 'gleichseitig') return { side, angle, angles: [60, 60, 60] };
  if (side === 'gleichschenklig') {
    if (angle === 'rechtwinklig') return { side, angle, angles: [45, 45, 90] };
    const tip = angle === 'stumpfwinklig' ? rng.pick([100, 110, 120, 130, 140]) : rng.pick([30, 40, 50, 70, 80]);
    const base = (180 - tip) / 2;
    return { side, angle, angles: [base, base, tip] };
  }
  for (;;) {
    const angles = pickAngles(rng, angle);
    if (new Set(angles).size === 3) return { side, angle, angles };
  }
}

function comboWrongs(side: BySide, angle: ByAngle): ChoiceOption[] {
  const out: ChoiceOption[] = [];
  for (const s of SIDE_ORDER) {
    for (const a of ANGLE_ORDER) {
      if (s === side && a === angle) continue;
      if (s === 'gleichseitig' && a !== 'spitzwinklig') continue;
      // These questions ask what fits, not what fits most exactly, and a gleichseitiges Dreieck also is gleichschenklig: this option would be true as well.
      if (side === 'gleichseitig' && s === 'gleichschenklig' && a === angle) continue;
      out.push({ label: combo(s, a), whyWrong: a !== angle ? ANGLE_WHY[a] : sideWhy(side, s) });
    }
  }
  return out;
}

/** Stufe 3, AB I: both names for a drawn triangle with marks. */
function bothPicture(rng: Rng, ab: Ab): Exercise {
  const { side, angle, angles } = pickCombination(rng);
  const turn = rng.pick(TURNS);
  const marks: VisualOf<'figure'>['equalMarks'] = side === 'gleichseitig' ? [[0, 1, 2]] : side === 'gleichschenklig' ? [[1, 2]] : undefined;
  const right = angles.indexOf(90);
  const visual: VisualOf<'figure'> = { type: 'figure', points: triangleFromAngles(angles[0], angles[1], turn), ...(marks ? { equalMarks: marks } : {}), ...(right >= 0 ? { rightAngles: [right] } : {}) };
  const prompt = 'Welche Beschreibung passt zu dem Dreieck?';
  return build(SKILL, 3, {
    key: `beides-bild:${angles.join('.')}:${turn}`,
    ab,
    prompt,
    visual,
    answer: makeChoice(rng, { label: combo(side, angle) }, rng.shuffle(comboWrongs(side, angle))),
    hints: ['Die Striche zeigen gleich lange Seiten.', 'Prüfe danach den größten Winkel.'],
    steps: [sideStep(side), angleStep(angle, Math.max(...angles)), `Das Dreieck: ${combo(side, angle)}.`],
    praise: 'Du hast Seiten und Winkel beide geprüft.',
    srText: toSpeech(`${spokenOpenings(angles)} ${spokenMarks(side)} ${prompt}`),
    kmk: KMK,
  });
}

/** Stufe 3, AB II: only the angles. Equal angles tell the equal sides. */
function bothAngles(rng: Rng, ab: Ab): Exercise {
  const { side, angle, angles } = pickCombination(rng);
  const shown = rng.shuffle(angles);
  const prompt = `Ein Dreieck hat die Winkel ${fmtAngle(shown[0])}, ${fmtAngle(shown[1])} und ${fmtAngle(shown[2])}. Welche Beschreibung passt?`;
  return build(SKILL, 3, {
    key: `beides-winkel:${shown.join('.')}`,
    ab,
    prompt,
    answer: makeChoice(rng, { label: combo(side, angle) }, rng.shuffle(comboWrongs(side, angle))),
    hints: ['Gleich große Winkel liegen gleich langen Seiten gegenüber.', 'Prüfe danach den größten Winkel.'],
    steps: [side === 'verschieden' ? 'Alle Winkel sind verschieden groß, also auch alle Seiten.' : side === 'gleichseitig' ? 'Alle Winkel sind gleich groß, also auch alle Seiten.' : 'Zwei Winkel sind gleich groß, also auch zwei Seiten.', angleStep(angle, Math.max(...angles)), `Das Dreieck: ${combo(side, angle)}.`],
    praise: 'Du hast aus den Winkeln auf die Seiten geschlossen.',
    srText: toSpeech(prompt),
    kmk: [...KMK, 'PK.argumentieren'],
  });
}

const GLEICHSEITIG: [BySide, ByAngle, string] = ['gleichseitig', 'spitzwinklig', 'Das gibt es: alle Winkel 60°.'];
const POSSIBLE: readonly [BySide, ByAngle, string][] = [
  ['gleichschenklig', 'rechtwinklig', 'Das gibt es: die Winkel 45°, 45° und 90°.'],
  ['gleichschenklig', 'stumpfwinklig', 'Das gibt es: die Winkel 30°, 30° und 120°.'],
  ['gleichschenklig', 'spitzwinklig', 'Das gibt es: die Winkel 70°, 70° und 40°.'],
  ['verschieden', 'rechtwinklig', 'Das gibt es: die Winkel 30°, 60° und 90°.'],
  ['verschieden', 'stumpfwinklig', 'Das gibt es: die Winkel 20°, 40° und 120°.'],
];

/** Stufe 3, AB III: which combination does not exist? The gleichseitige Dreieck that does exist is always on offer, so the first word of an option tells nothing. */
function noSuchCombination(rng: Rng, ab: Ab): Exercise {
  const bad = rng.pick<ByAngle>(['rechtwinklig', 'stumpfwinklig']);
  const label = combo('gleichseitig', bad);
  const shown = [GLEICHSEITIG, ...rng.sample(POSSIBLE, 2)];
  const prompt = 'Welche Kombination gibt es bei Dreiecken nicht?';
  return build(SKILL, 3, {
    key: `unmoeglich:${bad}:${shown.map(([s, a]) => `${s[0]}${a[0]}`).sort().join('.')}`,
    ab,
    prompt,
    answer: makeChoice(rng, { label }, shown.map(([s, a, why]) => ({ label: combo(s, a), whyWrong: why }))),
    hints: ['Welche Winkel müsste jedes dieser Dreiecke haben?', 'Die drei Winkel ergeben zusammen 180°.'],
    steps: ['Alle Seiten gleich lang heißt: Alle Winkel sind gleich groß.', '180° : 3 = 60°', `Darum gibt es nicht: ${label}.`],
    praise: 'Du hast die Kombination mit den Winkeln geprüft.',
    srText: toSpeech(`${prompt} Zur Wahl: ${[label, ...shown.map(([s, a]) => combo(s, a))].sort().join('; ')}.`),
    kmk: [...KMK, 'PK.argumentieren'],
  });
}

type Claim = { kind: string; name: string; angles: readonly number[]; exists: boolean; steps: string[] };

/** Two angles and a claim about the third: it decides. */
function claimFromTwo(name: string, kind: string, a: number, b: number, exists: boolean, verdict: string): Claim {
  return { kind, name, angles: [a, b], exists, steps: [`180° − ${fmtAngle(a)} − ${fmtAngle(b)} = ${fmtAngle(180 - a - b)}`, verdict] };
}

/** A claim that holds or fails in about half of the items, so neither Ja nor Nein tells: a kind of triangle with one or two angles. */
function pickClaim(rng: Rng, exists: boolean): Claim {
  const form = rng.pick(['rechtwinklig', 'gleichseitig', 'gleichschenklig', 'stumpfwinklig', 'spitzwinklig'] as const);
  if (form === 'rechtwinklig') {
    const x = exists ? rng.pick([25, 35, 40, 50, 55, 65, 70]) : rng.pick([95, 100, 110, 120, 130]);
    return { kind: form, name: 'rechtwinkliges', angles: [x], exists, steps: exists ? ['Ein rechter Winkel misst 90°.', `180° − 90° − ${fmtAngle(x)} = ${fmtAngle(90 - x)}`] : ['Ein rechter Winkel misst 90°.', `90° + ${fmtAngle(x)} = ${fmtAngle(90 + x)}, das sind schon mehr als 180°.`] };
  }
  if (form === 'gleichseitig') {
    const x = exists ? 60 : rng.pick([45, 50, 55, 65, 70, 75]);
    return { kind: form, name: 'gleichseitiges', angles: [x], exists, steps: ['Im gleichseitigen Dreieck sind alle Winkel gleich groß.', '180° : 3 = 60°'] };
  }
  if (form === 'gleichschenklig') {
    if (exists) {
      const base = rng.pick([20, 25, 35, 40, 50, 55, 65, 70, 80]);
      const [a, b] = rng.shuffle([base, 180 - 2 * base]);
      return claimFromTwo('gleichschenkliges', form, a, b, true, 'Zwei Winkel sind gleich groß.');
    }
    const [a, b] = rng.pick([[30, 40], [30, 50], [40, 60], [40, 75], [50, 60], [50, 75], [55, 60], [35, 65], [45, 60]]);
    return claimFromTwo('gleichschenkliges', form, a, b, false, 'Alle drei Winkel sind verschieden groß.');
  }
  // spitzwinklig and stumpfwinklig: the two given angles are small either way, only the third one tells.
  const wide = form === 'stumpfwinklig' ? exists : !exists;
  const [a, b] = rng.pick(wide ? [[20, 35], [25, 40], [30, 45], [15, 50], [35, 30], [40, 25]] : [[50, 60], [55, 70], [65, 45], [40, 75], [70, 60], [45, 80]]);
  const third = 180 - a - b;
  return claimFromTwo(form === 'stumpfwinklig' ? 'stumpfwinkliges' : 'spitzwinkliges', form, a, b, exists, angleStep(third > 90 ? 'stumpfwinklig' : 'spitzwinklig', Math.max(a, b, third)));
}

/** Stufe 3, AB III: reasoning. Does a triangle of this kind with these angles exist? */
function doesItExist(rng: Rng, ab: Ab): Exercise {
  const claim = pickClaim(rng, rng.chance(0.5));
  const given = claim.angles.length === 1 ? `einem Winkel von ${fmtAngle(claim.angles[0])}` : `den Winkeln ${fmtAngle(claim.angles[0])} und ${fmtAngle(claim.angles[1])}`;
  const prompt = `Gibt es ein ${claim.name} Dreieck mit ${given}?`;
  return build(SKILL, 3, {
    key: `gibt-es:${claim.kind}:${claim.angles.join('.')}`,
    ab,
    prompt,
    answer: yesNo(rng, claim.exists, 'Prüfe mit der Winkelsumme: Die drei Winkel ergeben zusammen 180°.', 'Rechne die Winkel aus. Prüfe dann noch einmal.'),
    hints: ['Die drei Winkel ergeben zusammen 180°.', 'Welche Winkel müsste so ein Dreieck haben?'],
    steps: [...claim.steps, claim.exists ? 'So ein Dreieck gibt es.' : 'So ein Dreieck gibt es nicht.'],
    praise: 'Du hast mit der Winkelsumme begründet.',
    srText: toSpeech(prompt),
    kmk: [...KMK, 'PK.argumentieren'],
  });
}

/** Stufe 3, AB III: two angles are given, the third one decides both names: one step more than Stufe 2, AB III and Stufe 3, AB II. */
function bothFromTwo(rng: Rng, ab: Ab): Exercise {
  const { side, angle, angles } = pickCombination(rng);
  const [a, b, c] = rng.shuffle(angles);
  const prompt = `Zwei Winkel eines Dreiecks messen ${fmtAngle(a)} und ${fmtAngle(b)}. Welche Beschreibung passt?`;
  return build(SKILL, 3, {
    key: `beides-dritter:${a}.${b}`,
    ab,
    prompt,
    answer: makeChoice(rng, { label: combo(side, angle) }, rng.shuffle(comboWrongs(side, angle))),
    hints: ['Berechne zuerst den dritten Winkel.', 'Gleich große Winkel liegen gleich langen Seiten gegenüber.'],
    steps: [`180° − ${fmtAngle(a)} − ${fmtAngle(b)} = ${fmtAngle(c)}`, side === 'verschieden' ? 'Alle Winkel sind verschieden groß, also auch alle Seiten.' : side === 'gleichseitig' ? 'Alle Winkel sind gleich groß, also auch alle Seiten.' : 'Zwei Winkel sind gleich groß, also auch zwei Seiten.', angleStep(angle, Math.max(a, b, c)), `Das Dreieck: ${combo(side, angle)}.`],
    praise: 'Du hast den dritten Winkel berechnet und beide Namen geprüft.',
    srText: toSpeech(prompt),
    kmk: [...KMK, 'PK.argumentieren'],
  });
}

/** Stufe 3, AB III: reasoning with the sum of 180°, in three forms. */
function reasonBoth(rng: Rng, ab: Ab): Exercise {
  return rng.pick([noSuchCombination, doesItExist, doesItExist, bothFromTwo])(rng, ab);
}

const FORMS: Record<Stufe, Record<Ab, (rng: Rng, ab: Ab) => Exercise>> = {
  1: { 1: sidesPicture, 2: sidesText, 3: reversedSides },
  2: { 1: anglesPicture, 2: anglesText, 3: anglesReason },
  3: { 1: bothPicture, 2: bothAngles, 3: reasonBoth },
};

export const dreieckeSkill: SkillDef = {
  ...SKILL,
  title: 'Dreiecke einteilen',
  description: 'Du ordnest Dreiecke nach Seiten und Winkeln.',
  stufen: {
    1: 'Nach Seiten: gleichseitig und gleichschenklig',
    2: 'Nach Winkeln: spitzwinklig, rechtwinklig und stumpfwinklig',
    3: 'Beides zusammen; welche Kombination gibt es nicht?',
  },
  kmk: KMK,
  generate(rng, stufe, ctx) {
    const ab = targetAb(rng, stufe, ctx);
    return FORMS[stufe][ab](rng, ab);
  },
};
