/**
 * Winkelarten (docs/research.md §6). Stufe 1: spitz, recht, stumpf in the usual position. Stufe 2: turned, also gestreckt and überstumpf. Stufe 3: estimates against 45°, 90° and 180°.
 * Choice answers carry the misconceptions winkel-art and winkel-armlaenge (§5) as whyWrong. Where pictures compete, the arm lengths are dealt at random: long arms are right as often as short ones, so
 * only the opening tells. The voice gives an opening as a way on a clock face (see openingOnClock).
 */
import { fmtAngle, toSpeech } from '../../core/format';
import type { Ab, ChoiceOption, Exercise, Rng, SkillDef, Stufe, VisualOf } from '../../core/types';
import { build, makeChoice, pickPerson, targetAb } from '../shared';
import { BASES, CLOCK_FACE, angleVisual, fixedChoice, openingOnClock, pictureChoice } from './helpers';

const SKILL = { id: 'geometrie.winkel-arten', topicId: 'geometrie' } as const;
const KMK = ['RF.winkel'];

type Art = 'spitz' | 'recht' | 'stumpf' | 'gestreckt' | 'ueberstumpf';
const artOf = (d: number): Art => (d < 90 ? 'spitz' : d === 90 ? 'recht' : d < 180 ? 'stumpf' : d === 180 ? 'gestreckt' : 'ueberstumpf');
const LABEL: Record<Art, string> = { spitz: 'spitzer Winkel', recht: 'rechter Winkel', stumpf: 'stumpfer Winkel', gestreckt: 'gestreckter Winkel', ueberstumpf: 'überstumpfer Winkel' };
const WHY: Record<Art, string> = {
  spitz: 'Ein spitzer Winkel ist kleiner als 90°.',
  recht: 'Ein rechter Winkel misst genau 90°.',
  stumpf: 'Ein stumpfer Winkel liegt zwischen 90° und 180°.',
  gestreckt: 'Ein gestreckter Winkel misst genau 180°.',
  ueberstumpf: 'Ein überstumpfer Winkel ist größer als 180°.',
};
const ARMS = 'Die Länge der Schenkel ist egal. Es zählt die Drehung.';
const THREE: readonly Art[] = ['spitz', 'recht', 'stumpf'];
const FIVE: readonly Art[] = ['spitz', 'recht', 'stumpf', 'gestreckt', 'ueberstumpf'];

const artChoice = (rng: Rng, art: Art, arts: readonly Art[]) => fixedChoice(rng, LABEL[art], arts.filter((a) => a !== art).map((a) => ({ label: LABEL[a], whyWrong: WHY[a] })), arts.map((a) => LABEL[a]));
const isThe = (d: number) => `Das ist ein ${LABEL[artOf(d)]}.`;
const USUAL: Record<'spitz' | 'recht' | 'stumpf', readonly number[]> = { spitz: [30, 40, 45, 50, 60, 70], recht: [90], stumpf: [110, 120, 130, 135, 140, 150] };
const someArm = (rng: Rng) => rng.pick([0.5, 0.65, 0.8, 1]);
const COMPARE_HINT = 'Vergleiche den Winkel mit einer Blattecke.';

/** Stufe 1, AB I: name the drawn angle, first arm flat. */
function namePicture(rng: Rng, ab: Ab): Exercise {
  const d = rng.pick(USUAL[rng.pick(['spitz', 'spitz', 'recht', 'stumpf', 'stumpf'] as const)]);
  const prompt = 'Welche Winkelart zeigt das Bild?';
  return build(SKILL, 1, {
    key: `bild:${d}`,
    ab,
    prompt,
    visual: angleVisual(d),
    answer: artChoice(rng, artOf(d), THREE),
    hints: [COMPARE_HINT, 'Eine Blattecke misst 90°.'],
    steps: ['Lege im Kopf eine Blattecke an den Winkel.', d === 90 ? 'Der Winkel passt genau in die Ecke.' : d < 90 ? 'Der Winkel ist kleiner als die Ecke.' : 'Der Winkel ist größer als die Ecke.', isThe(d)],
    praise: 'Du hast den Winkel mit einer Blattecke verglichen.',
    srText: toSpeech(`Ein Winkel. ${CLOCK_FACE} ${openingOnClock(d)} ${prompt}`),
    kmk: KMK,
  });
}

/** Stufe 1, AB II: the size in degrees, also close to 90°. */
function nameSize(rng: Rng, ab: Ab): Exercise {
  const d = rng.pick([35, 48, 65, 72, 80, 84, 88, 89, 90, 91, 92, 96, 100, 108, 125, 143, 166]);
  const prompt = `Ein Winkel misst ${fmtAngle(d)}. Welche Winkelart ist das?`;
  return build(SKILL, 1, {
    key: `groesse:${d}`,
    ab,
    prompt,
    answer: artChoice(rng, artOf(d), THREE),
    hints: ['Vergleiche die Größe mit 90°.', 'Ist der Winkel kleiner, gleich oder größer?'],
    steps: [d === 90 ? `${fmtAngle(d)} ist genau ein rechter Winkel.` : `${fmtAngle(d)} ist ${d < 90 ? 'kleiner' : 'größer'} als 90°.`, isThe(d)],
    praise: 'Du hast die Größe genau mit 90° verglichen.',
    srText: toSpeech(prompt),
    kmk: KMK,
  });
}

type AnglePicture = { d: number; arm: number; visual: VisualOf<'angle'>; whyWrong?: string };

/** The pictures of a choice: each angle gets one of the arm lengths, in random order, and whyWrong speaks of the arms only where the arms of that picture are longer. */
function anglePictures(rng: Rng, angles: readonly number[], arms: readonly number[], turn: () => number, otherWhy: (d: number) => string): AnglePicture[] {
  const dealt = rng.shuffle(arms);
  return angles.map((d, i) => {
    const arm = dealt[i];
    return { d, arm, visual: angleVisual(d, turn(), { arm1: arm, arm2: arm }), ...(i === 0 ? {} : { whyWrong: arm > dealt[0] ? ARMS : otherWhy(d) }) };
  });
}

/** Stufe 1, AB III: reversed. Which picture shows this art? */
function findPicture(rng: Rng, ab: Ab): Exercise {
  const art = rng.pick(['spitz', 'stumpf'] as const);
  const d = rng.pick(USUAL[art]);
  const others = THREE.filter((a) => a !== art).map((a) => rng.pick(USUAL[a as 'spitz' | 'recht' | 'stumpf']));
  const [correct, ...wrongs] = anglePictures(rng, [d, ...others], [0.5, 0.75, 1], () => 0, (o) => WHY[artOf(o)]);
  const { answer, shown } = pictureChoice<AnglePicture>(rng, correct, wrongs);
  const prompt = `Welcher Winkel ist ${art}?`;
  return build(SKILL, 1, {
    key: `finden:${art}:${d}:${others.join('.')}:${correct.arm}`,
    ab,
    prompt,
    answer,
    hints: ['Schau nur auf die Öffnung der Winkel.', WHY[art]],
    steps: [ARMS, WHY[art], `Der Winkel mit ${fmtAngle(d)} ist ${art}.`],
    praise: 'Du hast auf die Drehung geachtet, nicht auf die Schenkel.',
    srText: toSpeech(`Drei Winkel. ${CLOCK_FACE} ${shown.map((o, i) => `Bild ${'ABC'[i]}: bis etwa Minute ${Math.round(o.d / 6)}.`).join(' ')} ${prompt}`),
    kmk: [...KMK, 'PK.argumentieren'],
  });
}

const TURNED: Record<Art, readonly number[]> = { spitz: [25, 35, 50, 65, 75], recht: [90], stumpf: [105, 120, 140, 155, 170], gestreckt: [180], ueberstumpf: [200, 220, 250, 280, 310, 340] };

/** Stufe 2, AB I: a turned angle, any of the five arts. */
function nameTurned(rng: Rng, ab: Ab): Exercise {
  const d = rng.pick(TURNED[rng.pick(FIVE)]);
  const base = rng.pick(BASES);
  const arm1 = someArm(rng);
  const prompt = 'Der Winkel liegt gedreht. Welche Winkelart ist das?';
  return build(SKILL, 2, {
    key: `gedreht:${d}:${base}`,
    ab,
    prompt,
    visual: angleVisual(d, base, { arm1 }),
    answer: artChoice(rng, artOf(d), FIVE),
    hints: ['Der Bogen zeigt den Winkel. Dreh das Bild im Kopf.', 'Vergleiche mit einer Blattecke und einer geraden Linie.'],
    steps: ['Die Lage ändert den Winkel nicht.', d > 180 ? 'Der Bogen geht über eine gerade Linie hinaus.' : d === 180 ? 'Beide Schenkel bilden eine gerade Linie.' : d === 90 ? 'Der Winkel passt genau in eine Blattecke.' : d < 90 ? 'Der Winkel ist kleiner als eine Blattecke.' : 'Der Winkel ist größer als eine Blattecke.', isThe(d)],
    praise: d > 180 ? 'Du hast den Bogen über die Gerade hinaus verfolgt.' : 'Du hast den Winkel auch in schräger Lage erkannt.',
    srText: toSpeech(`Ein gedrehter Winkel. ${CLOCK_FACE} ${openingOnClock(d)} ${prompt}`),
    kmk: KMK,
  });
}

/** Stufe 2, AB II: the size in degrees, close to 90° and 180°. */
function nameBorder(rng: Rng, ab: Ab): Exercise {
  const d = rng.pick([86, 89, 90, 92, 97, 165, 172, 178, 179, 180, 181, 183, 188, 195, 270, 290, 355]);
  const prompt = `Ein Winkel misst ${fmtAngle(d)}. Welche Winkelart ist das?`;
  return build(SKILL, 2, {
    key: `grenze:${d}`,
    ab,
    prompt,
    answer: artChoice(rng, artOf(d), FIVE),
    hints: ['Die Grenzen sind 90° und 180°.', 'Genau auf einer Grenze hat der Winkel einen eigenen Namen.'],
    steps: [d === 90 || d === 180 ? `${fmtAngle(d)} liegt genau auf einer Grenze.` : d < 90 ? `${fmtAngle(d)} liegt unter 90°.` : d < 180 ? `${fmtAngle(d)} liegt zwischen 90° und 180°.` : `${fmtAngle(d)} liegt über 180°.`, isThe(d)],
    praise: 'Du hast die Grenzen 90° und 180° genau geprüft.',
    srText: toSpeech(prompt),
    kmk: KMK,
  });
}

/** Stufe 2, AB III: reasoning. Two angles side by side, or the turn of a Minutenzeiger. */
function nameDerived(rng: Rng, ab: Ab): Exercise {
  if (rng.chance(0.5)) {
    const sum = rng.pick([70, 80, 90, 90, 100, 130, 150, 180, 180, 210, 250]);
    const a = rng.pick([20, 25, 30, 35, 40, 45].filter((x) => sum - x !== x));
    const b = sum - a;
    const prompt = `Zwei Winkel liegen direkt nebeneinander: ${fmtAngle(a)} und ${fmtAngle(b)}. Welche Art hat der ganze Winkel?`;
    return build(SKILL, 2, {
      key: `zusammen:${a}:${b}`,
      ab,
      prompt,
      answer: artChoice(rng, artOf(sum), FIVE),
      hints: ['Addiere die beiden Winkel.', 'Vergleiche die Summe mit 90° und 180°.'],
      steps: [`${fmtAngle(a)} + ${fmtAngle(b)} = ${fmtAngle(sum)}`, isThe(sum)],
      praise: 'Du hast zuerst addiert und dann die Summe eingeordnet.',
      srText: toSpeech(prompt),
      kmk: [...KMK, 'PK.argumentieren'],
    });
  }
  const minutes = rng.pick([5, 10, 15, 20, 25, 30, 35, 40, 50]);
  const d = minutes * 6;
  const context = `Der Minutenzeiger einer Uhr dreht sich ${minutes} Minuten lang.`;
  const prompt = 'Welche Winkelart überstreicht der Zeiger?';
  return build(SKILL, 2, {
    key: `uhr:${minutes}`,
    ab,
    context,
    prompt,
    answer: artChoice(rng, artOf(d), FIVE),
    hints: ['In 60 Minuten dreht sich der Zeiger einmal ganz herum.', 'Eine ganze Drehung sind 360°. In 1 Minute sind das 6°.'],
    steps: ['In 1 Minute dreht sich der Zeiger um 6°.', `${minutes} · 6° = ${fmtAngle(d)}`, isThe(d)],
    praise: 'Du hast die Drehung des Zeigers in Grad umgerechnet.',
    srText: toSpeech(`${context} ${prompt}`),
    kmk: [...KMK, 'PK.modellieren'],
  });
}

const RANGES = ['kleiner als 45°', 'zwischen 45° und 90°', 'zwischen 90° und 180°', 'größer als 180°'] as const;
const rangeOf = (d: number) => (d < 45 ? 0 : d < 90 ? 1 : d < 180 ? 2 : 3);
const RANGE_WHY = ['Halbiere im Kopf eine Blattecke. Das sind 45°.', 'Eine Blattecke misst 90°. Vergleiche auch mit ihrer Hälfte.', 'Eine Blattecke misst 90°. Eine gerade Linie misst 180°.', 'Eine gerade Linie misst 180°. Geht der Bogen darüber hinaus?'];

/** Stufe 3, AB I: into which range between the benchmarks does the angle fall? */
function estimateRange(rng: Rng, ab: Ab): Exercise {
  const d = rng.pick([15, 20, 25, 30, 60, 65, 70, 75, 110, 125, 140, 155, 165, 200, 230, 260, 300, 330]);
  const base = rng.pick(BASES);
  const prompt = 'Schätze ohne Geodreieck. Wie groß ist der Winkel?';
  const right = rangeOf(d);
  return build(SKILL, 3, {
    key: `bereich:${d}:${base}`,
    ab,
    prompt,
    visual: angleVisual(d, base, { arm2: someArm(rng) }),
    answer: fixedChoice(rng, RANGES[right], RANGES.flatMap((r, i) => (i === right ? [] : [{ label: r, whyWrong: RANGE_WHY[i] }])), RANGES),
    hints: ['Vergleiche zuerst mit einer Blattecke: 90°.', 'Eine halbe Blattecke sind 45°. Eine gerade Linie sind 180°.'],
    steps: ['Stell dir eine Blattecke und eine gerade Linie vor.', `Der Winkel misst etwa ${fmtAngle(d)}.`, `Der Winkel ist ${RANGES[right]}.`],
    praise: 'Du hast mit 45°, 90° und 180° verglichen.',
    srText: toSpeech(`Ein gedrehter Winkel. ${CLOCK_FACE} ${openingOnClock(d)} ${prompt}`),
    kmk: ['GM.winkel', ...KMK],
  });
}

/** Stufe 3, AB II: which size fits? The sizes stand at least 30° apart, and 180° minus the angle is among them. */
function estimateSize(rng: Rng, ab: Ab): Exercise {
  const d = rng.pick([25, 35, 40, 50, 55, 65, 70, 110, 115, 125, 130, 140, 145, 155]);
  const base = rng.pick(BASES);
  const big = d > 90;
  const pool = [d - 60, d - 30, d + 30, d + 60, d + 90].filter((x) => x >= 10 && x !== 180 - d && Math.abs(x - (180 - d)) >= 20);
  const wrongs: ChoiceOption[] = [
    { label: fmtAngle(180 - d), whyWrong: big ? 'Der Winkel ist stumpf. Ein stumpfer Winkel ist größer als 90°.' : WHY.spitz },
    ...rng.sample(pool, 2).map((x) => ({ label: fmtAngle(x), whyWrong: x > d ? 'Der Winkel ist kleiner. Vergleiche noch einmal mit 90°.' : 'Der Winkel ist größer. Vergleiche noch einmal mit 90°.' })),
  ];
  const prompt = 'Schätze ohne Geodreieck. Welche Größe passt am besten?';
  return build(SKILL, 3, {
    key: `schaetzen:${d}:${base}`,
    ab,
    prompt,
    visual: angleVisual(d, base, { arm1: someArm(rng) }),
    answer: makeChoice(rng, { label: fmtAngle(d) }, wrongs),
    hints: ['Ist der Winkel größer oder kleiner als 90°?', big ? 'Liegt der Winkel näher an 90° oder an 180°?' : 'Liegt der Winkel näher an 45° oder an 90°?'],
    steps: [big ? 'Der Winkel ist größer als 90°.' : 'Der Winkel ist kleiner als 90°.', `Am besten passt ${fmtAngle(d)}.`],
    praise: 'Du hast zuerst grob eingeordnet und dann genauer geschätzt.',
    srText: toSpeech(`Ein gedrehter Winkel. ${CLOCK_FACE} ${openingOnClock(d)} ${prompt}`),
    kmk: ['GM.winkel', ...KMK],
  });
}

/** Both sides of one benchmark, at least 25° apart: the wrong estimate of an angle comes from the other side, so 90° alone never decides between them. */
const SIDES: readonly { low: readonly number[]; high: readonly number[]; side: (x: number) => string }[] = [
  { low: [15, 20, 25, 30], high: [60, 65, 70, 75], side: (x) => `ist ${x < 45 ? 'kleiner' : 'größer'} als 45°` },
  { low: [100, 105, 110, 115], high: [150, 155, 160, 165], side: (x) => `liegt näher an ${x < 135 ? '90°' : '180°'}` },
  { low: [160, 165, 170], high: [195, 200, 210], side: (x) => `ist ${x < 180 ? 'kleiner' : 'größer'} als 180°` },
];
const VERDICTS = ['Ja, das passt', 'Nein, der Winkel ist größer', 'Nein, der Winkel ist kleiner'];
const BENCHMARK_WHY = 'Vergleiche den Winkel noch einmal mit 45°, 90° und 180°.';

/** Stufe 3, AB III: reasoning. Does an estimate fit, or is the angle larger or smaller? */
function estimateCheck(rng: Rng, ab: Ab): Exercise {
  const { low, high, side } = rng.pick(SIDES);
  const fromLow = rng.chance(0.5);
  const d = rng.pick(fromLow ? low : high);
  const fits = rng.chance(0.5);
  const claim = fits ? d + rng.pick([-5, 5]) : rng.pick(fromLow ? high : low);
  const base = rng.pick(BASES);
  const { name } = pickPerson(rng);
  const prompt = `${name} schätzt den Winkel auf ${fmtAngle(claim)}. Passt diese Schätzung?`;
  const right = fits ? VERDICTS[0] : d > claim ? VERDICTS[1] : VERDICTS[2];
  return build(SKILL, 3, {
    key: `pruefen:${d}:${base}:${claim}`,
    ab,
    prompt,
    visual: angleVisual(d, base),
    answer: fixedChoice(rng, right, VERDICTS.filter((v) => v !== right).map((label) => ({ label, whyWrong: BENCHMARK_WHY })), VERDICTS),
    hints: ['Vergleiche den Winkel mit 45°, 90° und 180°.', `Liegt ${fmtAngle(claim)} auf derselben Seite wie der Winkel?`],
    steps: fits
      ? [`Der Winkel misst etwa ${fmtAngle(d)}.`, `${fmtAngle(claim)} liegt nah daran.`, 'Die Schätzung passt.']
      : [`Der Winkel ${side(d)}.`, `${fmtAngle(claim)} ${side(claim)}.`, `Der Winkel ist ${d > claim ? 'größer' : 'kleiner'} als die Schätzung.`],
    praise: 'Du hast die Schätzung mit 45°, 90° und 180° geprüft.',
    srText: toSpeech(`Ein gedrehter Winkel. ${CLOCK_FACE} ${openingOnClock(d)} ${prompt}`),
    kmk: ['GM.winkel', ...KMK, 'PK.argumentieren'],
  });
}

/** Stufe 3, AB III: reversed. Which of three turned angles has this size, whatever its arms? It is the smallest, middle or largest of them about equally often, so the look alone never tells. */
function estimatePick(rng: Rng, ab: Ab): Exercise {
  const size = rng.pick([40, 50, 60, 70, 80, 100, 110, 120, 135, 150, 160, 200]);
  const [near, far] = [rng.pick([25, 30]), rng.pick([55, 60])];
  const offsets = rng.pick([[-far, -near], [-near, near], [near, far]]);
  const others = size + offsets[0] >= 15 ? offsets.map((o) => size + o) : [size + near, size + far];
  const [correct, ...wrongs] = anglePictures(rng, [size, ...others], [0.45, 0.7, 1], () => rng.pick([0, 20, 45, 60, 100]), () => BENCHMARK_WHY);
  const { answer, shown } = pictureChoice<AnglePicture>(rng, correct, wrongs);
  const prompt = `Schätze ohne Geodreieck. Welcher Winkel misst etwa ${fmtAngle(size)}?`;
  const sorted = [size, ...others].sort((p, q) => p - q);
  return build(SKILL, 3, {
    key: `arme:${sorted.join('.')}:${size}:${correct.arm}:${correct.visual.baseRotation}`,
    ab,
    prompt,
    answer,
    hints: ['Vergleiche nur die Öffnung, nicht die Schenkel.', 'Schätze jeden Winkel gegen 45°, 90° und 180°.'],
    steps: [ARMS, `Die Winkel messen etwa ${fmtAngle(sorted[0])}, ${fmtAngle(sorted[1])} und ${fmtAngle(sorted[2])}.`, `Der Winkel mit etwa ${fmtAngle(size)} passt.`],
    praise: 'Du hast die Öffnung verglichen, nicht die Länge der Schenkel.',
    srText: toSpeech(`Drei Winkel. ${CLOCK_FACE} ${shown.map((o, i) => `Bild ${'ABC'[i]}: ${o.arm < 0.6 ? 'kurze' : o.arm < 0.9 ? 'mittlere' : 'lange'} Schenkel, bis etwa Minute ${Math.round(o.d / 6)}.`).join(' ')} ${prompt}`),
    kmk: ['GM.winkel', ...KMK, 'PK.argumentieren'],
  });
}

const estimateReason = (rng: Rng, ab: Ab) => (rng.chance(0.5) ? estimateCheck(rng, ab) : estimatePick(rng, ab));

const FORMS: Record<Stufe, Record<Ab, (rng: Rng, ab: Ab) => Exercise>> = {
  1: { 1: namePicture, 2: nameSize, 3: findPicture },
  2: { 1: nameTurned, 2: nameBorder, 3: nameDerived },
  3: { 1: estimateRange, 2: estimateSize, 3: estimateReason },
};

export const winkelArtenSkill: SkillDef = {
  ...SKILL,
  title: 'Winkelarten',
  description: 'Du erkennst spitze, rechte und stumpfe Winkel.',
  stufen: {
    1: 'Spitz, recht und stumpf in üblicher Lage',
    2: 'Gedrehte Winkel; auch gestreckt und überstumpf',
    3: 'Winkel gegen 45°, 90° und 180° schätzen',
  },
  kmk: KMK,
  generate(rng, stufe, ctx) {
    const ab = targetAb(rng, stufe, ctx);
    return FORMS[stufe][ab](rng, ab);
  },
};
