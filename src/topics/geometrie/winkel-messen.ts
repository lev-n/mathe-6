/**
 * Winkel messen (docs/research.md §6): reading the Geodreieck into a number field, ±2° at Stufe 1 and 2, ±1° at Stufe 3. No drawing or setting of an angle in v1.
 * Stufe 1: arm on 0, steps of 10°, the scale highlighted. Stufe 2: steps of 5°, turned, both scales. Stufe 3: steps of 1°, choosing the scale, different arm lengths.
 * 90° stays out: both scales read the same there, and the hints name it.
 * The voice gets what the Geodreieck shows: both numbers at the second arm, and the opening on a clock face to choose between them. One number alone would be the answer.
 */
import { fmtAngle, toSpeech } from '../../core/format';
import type { Ab, Bug, Exercise, NumberAnswer, Rng, SkillDef, Stufe } from '../../core/types';
import { build, pickPerson, targetAb } from '../shared';
import { BASES, CLOCK_FACE, beyondTolerance, openingOnClock, toolVisual } from './helpers';

const SKILL = { id: 'geometrie.winkel-messen', topicId: 'geometrie' } as const;
const KMK = ['GM.winkel'];

const SCALE_HINT = 'Der Schenkel liegt auf der 0 dieser Skala? Lies auf derselben Skala ab.';
const degrees = (value: number, tolerance: number): NumberAnswer => ({ kind: 'number', value, unit: '°', tolerance });
const scaleBug = (d: number): Bug => ({ id: 'skala-verwechselt', match: 180 - d, hint: SCALE_HINT });
const tickBug = (match: number, hint: string): Bug => ({ id: 'strich-verzaehlt', match, hint });
const TENS_HINT = 'Zähle die langen Striche noch einmal. Jeder lange Strich zählt 10°.';
const FIVES_HINT = 'Schau auf den mittleren Strich zwischen zwei Zehnerstrichen. Dieser Strich zählt 5°.';
const ONES_HINT = 'Geh zum Zehnerstrich davor. Jeder kleine Strich zählt dann 1°.';
const READ_STEPS = ['Die 0 liegt auf dem ersten Schenkel.', 'Folge dieser Skala bis zum zweiten Schenkel.'];
const spokenTool = (d: number, extra = '') => `Ein Winkel mit dem Geodreieck${extra}. Die Mitte liegt am Scheitel, die 0 einer Skala am ersten Schenkel. Der zweite Schenkel zeigt auf zwei Zahlen, eine auf jeder Skala: ${Math.min(d, 180 - d)} und ${Math.max(d, 180 - d)}. ${CLOCK_FACE} ${openingOnClock(d)}`;
const MARKED_SCALE = 'Die markierte Skala hat die 0 am ersten Schenkel.';

/** A whole degree that no 5° tick hits: its last digit is 2, 3, 7 or 8. Not within 8° of 90°, where both scales look alike. */
function offTick(rng: Rng): number {
  const pool: number[] = [];
  for (let d = 12; d <= 168; d++) if ([2, 3, 7, 8].includes(d % 10) && Math.abs(d - 90) >= 8) pool.push(d);
  return rng.pick(pool);
}
const nearestFive = (d: number) => Math.round(d / 5) * 5;

/** Stufe 1, AB I and II: a printed multiple of 20°, or an odd ten between two printed numbers. */
function readTens(rng: Rng, ab: Ab): Exercise {
  const d = ab === 1 ? rng.pick([20, 40, 60, 80, 100, 120, 140, 160]) : rng.pick([30, 50, 70, 110, 130, 150]);
  const prompt = 'Lies den Winkel an der markierten Skala ab.';
  return build(SKILL, 1, {
    key: `lesen:${d}`,
    ab,
    prompt,
    visual: toolVisual(d, 0, { highlightScale: 'outer' }),
    answer: degrees(d, 2),
    hints: ab === 1 ? ['Die 0 der markierten Skala liegt auf dem ersten Schenkel.', 'Folge der Skala bis zum zweiten Schenkel.'] : ['Der Schenkel zeigt zwischen zwei Zahlen. Zähle die langen Striche.', 'Jeder lange Strich zählt 10°.'],
    steps: [...READ_STEPS, `Der Winkel misst ${fmtAngle(d)}.`],
    bugs: beyondTolerance([scaleBug(d), tickBug(d - 10, TENS_HINT), tickBug(d + 10, TENS_HINT)], d, 2),
    praise: ab === 1 ? 'Du hast an der Skala mit der 0 abgelesen.' : 'Du hast die langen Striche genau gezählt.',
    srText: toSpeech(`${spokenTool(d)} ${MARKED_SCALE} ${prompt}`),
    kmk: KMK,
  });
}

/** Stufe 1, AB III: someone read the other scale. The art of the angle shows it. */
function otherScaleTens(rng: Rng, ab: Ab): Exercise {
  const d = rng.pick([30, 40, 50, 60, 70, 110, 120, 130, 140, 150]);
  const { name } = pickPerson(rng);
  const read = 180 - d;
  const art = d < 90 ? 'spitz' : 'stumpf';
  const prompt = `${name} liest ${fmtAngle(read)} ab. Der Winkel im Bild ist aber ${art}. Wie groß ist der Winkel?`;
  return build(SKILL, 1, {
    key: `andere-skala:${d}:${name}`,
    ab,
    prompt,
    visual: toolVisual(d, 0, { highlightScale: 'outer' }),
    answer: degrees(d, 2),
    hints: ['Das Geodreieck hat zwei Skalen. Beide zählen von 0 bis 180.', 'Nimm die markierte Skala.'],
    steps: [`Ein ${art}er Winkel misst nie ${fmtAngle(read)}.`, 'An der markierten Skala liegt die 0 auf dem ersten Schenkel.', `Der Winkel misst ${fmtAngle(d)}.`],
    bugs: beyondTolerance([{ id: 'skala-verwechselt', match: read, hint: SCALE_HINT }, tickBug(d - 10, TENS_HINT), tickBug(d + 10, TENS_HINT)], d, 2),
    praise: 'Du hast die Skala mit der Winkelart geprüft.',
    srText: toSpeech(`${name} liest ${read} Grad ab. Der Winkel im Bild ist aber ${art}. ${spokenTool(d)} ${MARKED_SCALE} Wie groß ist der Winkel?`),
    kmk: [...KMK, 'PK.argumentieren'],
  });
}

const FIVES = [15, 25, 35, 45, 55, 65, 75, 105, 115, 125, 135, 145, 155, 165];

/** Stufe 2, AB I: steps of 5°, slightly turned, both scales shown. */
function readFives(rng: Rng, ab: Ab): Exercise {
  const d = rng.pick(FIVES);
  const base = rng.pick([10, 15, 20, 30, 340, 350]);
  const prompt = 'Das Geodreieck hat zwei Skalen. Wie groß ist der Winkel?';
  return build(SKILL, 2, {
    key: `fuenf:${d}:${base}`,
    ab,
    prompt,
    visual: toolVisual(d, base),
    answer: degrees(d, 2),
    hints: ['Starte an der 0 auf dem ersten Schenkel.', 'Der mittlere Strich zwischen zwei Zehnerstrichen zählt 5°.'],
    steps: [...READ_STEPS, `Der Winkel misst ${fmtAngle(d)}.`],
    bugs: beyondTolerance([scaleBug(d), tickBug(d - 5, FIVES_HINT), tickBug(d + 5, FIVES_HINT)], d, 2),
    praise: 'Du hast die passende Skala gefunden.',
    srText: toSpeech(`${spokenTool(d, ', leicht gedreht')} ${prompt}`),
    kmk: KMK,
  });
}

/** Stufe 2, AB II: strongly turned. The art of the angle tells the scale. */
function readTurned(rng: Rng, ab: Ab): Exercise {
  const d = rng.pick(FIVES);
  const base = rng.pick(BASES);
  const prompt = 'Der Winkel liegt gedreht. Schätze zuerst die Winkelart. Wie groß ist der Winkel?';
  return build(SKILL, 2, {
    key: `gedreht:${d}:${base}`,
    ab,
    prompt,
    visual: toolVisual(d, base),
    answer: degrees(d, 2),
    hints: ['Ist der Winkel spitz oder stumpf?', 'Nimm die Skala mit der 0 auf dem ersten Schenkel.'],
    steps: [`Der Winkel ist ${d < 90 ? 'spitz' : 'stumpf'}.`, 'Nimm die Skala mit der 0 auf dem ersten Schenkel.', `Der Winkel misst ${fmtAngle(d)}.`],
    bugs: beyondTolerance([scaleBug(d), tickBug(d - 5, FIVES_HINT), tickBug(d + 5, FIVES_HINT)], d, 2),
    praise: 'Du hast deine Schätzung mit der Skala verglichen.',
    srText: toSpeech(`${spokenTool(d, ', stark gedreht')} ${prompt}`),
    kmk: KMK,
  });
}

/** Stufe 2, AB III: read, then the rest to a gestreckter Winkel. */
function restFives(rng: Rng, ab: Ab): Exercise {
  const d = rng.pick(FIVES);
  const base = rng.pick(BASES);
  const value = 180 - d;
  const prompt = 'Lies den Winkel ab. Wie viel Grad fehlen bis zu einem gestreckten Winkel?';
  return build(SKILL, 2, {
    key: `rest:${d}:${base}`,
    ab,
    prompt,
    visual: toolVisual(d, base),
    answer: degrees(value, 2),
    hints: ['Ein gestreckter Winkel misst 180°.', 'Lies zuerst ab. Rechne dann bis 180°.'],
    steps: [`Der Winkel misst ${fmtAngle(d)}.`, `180° − ${fmtAngle(d)} = ${fmtAngle(value)}`, `Es fehlen ${fmtAngle(value)}.`],
    bugs: beyondTolerance([{ id: 'rest-abgelesen', match: d, hint: 'Das ist der abgelesene Winkel. Rechne noch bis 180°.' }, tickBug(value + 5, FIVES_HINT), tickBug(value - 5, FIVES_HINT)], value, 2),
    praise: 'Du hast abgelesen und den Rest berechnet.',
    srText: toSpeech(`${spokenTool(d, ', gedreht')} ${prompt}`),
    kmk: KMK,
  });
}

const someArm = (rng: Rng) => rng.pick([0.55, 0.7, 0.85, 1]);

/** Stufe 3, AB I: to the degree, both scales, the first arm of another length. */
function readOnes(rng: Rng, ab: Ab): Exercise {
  const d = offTick(rng);
  const base = rng.pick(BASES);
  const prompt = 'Lies den Winkel auf 1° genau ab.';
  return build(SKILL, 3, {
    key: `grad:${d}:${base}`,
    ab,
    prompt,
    visual: toolVisual(d, base, { arm1: someArm(rng) }),
    answer: degrees(d, 1),
    hints: ['Ein kleiner Strich zählt 1°.', 'Geh zum Zehnerstrich davor. Zähle dann die kleinen Striche.'],
    steps: [...READ_STEPS, `Der Winkel misst ${fmtAngle(d)}.`],
    bugs: beyondTolerance([scaleBug(d), tickBug(nearestFive(d), ONES_HINT)], d, 1),
    praise: 'Du hast die kleinen Striche einzeln gezählt.',
    srText: toSpeech(`${spokenTool(d, ', gedreht')} ${prompt}`),
    kmk: KMK,
  });
}

/** Stufe 3, AB II: the second arm stops before the ticks, so the eye has to go on along it. */
function readShort(rng: Rng, ab: Ab): Exercise {
  const d = offTick(rng);
  const base = rng.pick(BASES);
  const prompt = 'Der zweite Schenkel reicht nicht bis zur Skala. Wie groß ist der Winkel?';
  return build(SKILL, 3, {
    key: `kurz:${d}:${base}`,
    ab,
    prompt,
    visual: toolVisual(d, base, { arm1: someArm(rng), arm2: 0.8 }),
    answer: degrees(d, 1),
    hints: ['Verlängere den kurzen Schenkel im Kopf bis zur Skala.', 'Die Länge der Schenkel ändert den Winkel nicht.'],
    steps: ['Verlängere den Schenkel bis zur Skala.', 'Lies an der Skala mit der 0 auf dem ersten Schenkel ab.', `Der Winkel misst ${fmtAngle(d)}.`],
    bugs: beyondTolerance([scaleBug(d), tickBug(nearestFive(d), ONES_HINT)], d, 1),
    praise: 'Du hast den kurzen Schenkel im Kopf verlängert.',
    srText: toSpeech(`${spokenTool(d, ' und einem kurzen Schenkel')} ${prompt}`),
    kmk: KMK,
  });
}

/** Stufe 3, AB III: a reading on the wrong scale to correct, or the rest to 90° or 180° to the degree. */
function reasonOnes(rng: Rng, ab: Ab): Exercise {
  const d = offTick(rng);
  const base = rng.pick(BASES);
  if (rng.chance(0.5)) {
    const { name } = pickPerson(rng);
    const read = 180 - d;
    const art = d < 90 ? 'spitz' : 'stumpf';
    const prompt = `${name} liest ${fmtAngle(read)} ab. Der Winkel im Bild ist aber ${art}. Wie groß ist der Winkel genau?`;
    return build(SKILL, 3, {
      key: `korrektur:${d}:${base}:${name}`,
      ab,
      prompt,
      visual: toolVisual(d, base, { arm1: someArm(rng) }),
      answer: degrees(d, 1),
      hints: ['Welche Skala hat die 0 auf dem ersten Schenkel?', 'Lies auf dieser Skala auf 1° genau ab.'],
      steps: [`Ein ${art}er Winkel misst nie ${fmtAngle(read)}.`, 'Nimm die Skala mit der 0 auf dem ersten Schenkel.', `Der Winkel misst ${fmtAngle(d)}.`],
      bugs: beyondTolerance([{ id: 'skala-verwechselt', match: read, hint: SCALE_HINT }, tickBug(nearestFive(d), ONES_HINT)], d, 1),
      praise: 'Du hast die Skala begründet gewählt.',
      srText: toSpeech(`${name} liest ${read} Grad ab. Der Winkel im Bild ist aber ${art}. ${spokenTool(d, ', gedreht')} Wie groß ist der Winkel genau?`),
      kmk: [...KMK, 'PK.argumentieren'],
    });
  }
  const whole = d < 90 && rng.chance(0.5) ? 90 : 180;
  const value = whole - d;
  const goal = whole === 90 ? 'einem rechten Winkel' : 'einem gestreckten Winkel';
  const prompt = `Lies auf 1° genau ab. Wie viel Grad fehlen bis zu ${goal}?`;
  return build(SKILL, 3, {
    key: `rest-genau:${d}:${base}:${whole}`,
    ab,
    prompt,
    visual: toolVisual(d, base, { arm1: someArm(rng) }),
    answer: degrees(value, 1),
    hints: [`Das Ziel ist ${fmtAngle(whole)}.`, 'Lies zuerst genau ab. Rechne dann den Rest aus.'],
    steps: [`Der Winkel misst ${fmtAngle(d)}.`, `${fmtAngle(whole)} − ${fmtAngle(d)} = ${fmtAngle(value)}`, `Es fehlen ${fmtAngle(value)}.`],
    bugs: beyondTolerance([{ id: 'rest-abgelesen', match: d, hint: `Das ist der abgelesene Winkel. Rechne noch bis ${fmtAngle(whole)}.` }, tickBug(whole - nearestFive(d), ONES_HINT)], value, 1),
    praise: 'Du hast genau abgelesen und den Rest berechnet.',
    srText: toSpeech(`${spokenTool(d, ', gedreht')} ${prompt}`),
    kmk: KMK,
  });
}

const FORMS: Record<Stufe, Record<Ab, (rng: Rng, ab: Ab) => Exercise>> = {
  1: { 1: readTens, 2: readTens, 3: otherScaleTens },
  2: { 1: readFives, 2: readTurned, 3: restFives },
  3: { 1: readOnes, 2: readShort, 3: reasonOnes },
};

export const winkelMessenSkill: SkillDef = {
  ...SKILL,
  title: 'Winkel messen',
  description: 'Du liest Winkel mit dem Geodreieck ab.',
  stufen: {
    1: 'Schritte von 10°; die richtige Skala ist markiert',
    2: 'Schritte von 5°; gedreht; beide Skalen sichtbar',
    3: 'Auf 1° genau; Skala wählen; verschieden lange Schenkel',
  },
  kmk: KMK,
  generate(rng, stufe, ctx) {
    const ab = targetAb(rng, stufe, ctx);
    return FORMS[stufe][ab](rng, ab);
  },
};
