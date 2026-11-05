/**
 * Stellen nach dem Komma.
 * Stufe 1: name the place of a digit, up to 2 decimals. Stufe 2: up to 3 decimals, with inner zeros (3,05). Stufe 3: bundling (12 Hundertstel = 0,12) and splitting into places.
 */
import { speak } from '../../core/format';
import { digitField, emptyTafel, fracOf, KEYS, noEndZero, numberAnswer, show, tafel, val, wholeOf, type Dec } from './helpers';
import { build, joinDe, makeChoice, multiBugs, numberBugs, targetAb } from '../shared';
import type { Ab, ChoiceOption, Exercise, PlaceColumn, Rng, SkillDef, Stufe } from '../../core/types';

const PLACE = ['Zehntel', 'Hundertstel', 'Tausendstel'] as const;
const PLACE_DAT = ['Zehnteln', 'Hundertsteln', 'Tausendsteln'] as const;
const ORDINAL = ['erste', 'zweite', 'dritte'] as const;
const COLUMN: readonly PlaceColumn[] = ['z', 'h', 't'];
const KMK = ['ZO.dezimal-darstellen'];

const WHY: Readonly<Record<string, string>> = {
  Einer: 'Einer stehen direkt vor dem Komma. Schau noch einmal auf die Stelle.',
  Zehntel: 'Zehntel stehen direkt nach dem Komma. Zähle die Stellen noch einmal.',
  Hundertstel: 'Hundertstel stehen an der zweiten Stelle nach dem Komma.',
  Tausendstel: 'Tausendstel stehen an der dritten Stelle nach dem Komma.',
};
// The options are the names of the places: a hint names the Nenner, so it never states the option.
const PLACE_HINTS = ['Zähle die Stellen nach dem Komma von links.', 'Die erste Stelle nach dem Komma gehört zum Nenner 10, die zweite zu 100.'];

/** w,ab with distinct digits above 0. */
function plainNumber(rng: Rng, places: number): { dec: Dec; digits: number[] } {
  const digits = rng.sample([1, 2, 3, 4, 5, 6, 7, 8, 9], places + 1);
  return { dec: [Number(digits.join('')), places], digits: digits.slice(1) };
}

/** A number with an inner zero: 3,05, 4,207, 2,065, 6,008. The other digits are distinct. */
function innerZero(rng: Rng): Dec {
  const pattern = rng.pick(['0a', '0a', 'a0b', '0ab', '00a']);
  const [w, a, b] = rng.sample([1, 2, 3, 4, 5, 6, 7, 8, 9], 3);
  return [Number(`${w}${pattern.replace('a', String(a)).replace('b', String(b))}`), pattern.length];
}

/** The number with its zeros after the comma left out: 3,05 read as 3,5. */
const withoutZeros = (d: Dec) => Number(`${wholeOf(d)}.${fracOf(d).replace(/0/g, '') || 0}`);

function placeChoice(rng: Rng, stufe: Stufe, ab: Ab, dec: Dec, showTafel: boolean): Exercise {
  const frac = fracOf(dec);
  const indices = [...frac].flatMap((c, i) => (c === '0' ? [] : [i]));
  const idx = rng.pick(indices);
  const digit = frac[idx];
  const correct: ChoiceOption = { label: PLACE[idx] };
  const zeroFirst = frac[0] === '0';
  const wrongs: ChoiceOption[] = ['Einer', 'Zehntel', 'Hundertstel', 'Tausendstel']
    .filter((l) => l !== PLACE[idx])
    .map((label) => ({ label, whyWrong: label === 'Zehntel' && zeroFirst ? 'Die 0 steht für 0 Zehntel. Zähle die Stellen noch einmal.' : WHY[label] }));
  return build(skill, stufe, {
    key: `stelle:${show(dec)}:${idx}${showTafel ? ':t' : ''}`,
    ab,
    prompt: `An welcher Stelle steht die ${digit}?`,
    expression: show(dec),
    ...(showTafel ? { visual: emptyTafel(dec) } : {}),
    answer: makeChoice(rng, correct, wrongs),
    hints: zeroFirst ? ['Die 0 nach dem Komma zählt auch als Stelle.', ...PLACE_HINTS] : PLACE_HINTS,
    steps: [`${show(dec)} hat ${dec[1]} ${dec[1] === 1 ? 'Stelle' : 'Stellen'} nach dem Komma.`, `Die ${digit} steht an der ${ORDINAL[idx]}n Stelle.`, { text: `Das sind die ${PLACE[idx]}.`, visual: tafel([dec]) }],
    praise: 'Du hast die Stellen nach dem Komma genau gezählt.',
    srText: speak(`An welcher Stelle steht die ${digit} in der Zahl ${show(dec)}?`),
    kmk: KMK,
  });
}

function digitAtPlace(rng: Rng, stufe: Stufe, ab: Ab, dec: Dec, showTafel: boolean): Exercise {
  const frac = fracOf(dec);
  const idx = rng.int(0, dec[1] - 1);
  const digit = Number(frac[idx]);
  const others = [...frac].map(Number).filter((_, i) => i !== idx);
  return build(skill, stufe, {
    key: `ziffer:${show(dec)}:${idx}${showTafel ? ':t' : ''}`,
    ab,
    prompt: `Welche Ziffer steht bei den ${PLACE_DAT[idx]}?`,
    expression: show(dec),
    ...(showTafel ? { visual: emptyTafel(dec) } : {}),
    answer: numberAnswer(digit, { label: 'Ziffer' }),
    hints: [`Die ${PLACE[idx]} stehen an der ${ORDINAL[idx]}n Stelle nach dem Komma.`, 'Zähle von links, direkt nach dem Komma.'],
    steps: [{ text: `Stellen nach dem Komma: ${[...frac].join(', ')}.`, visual: tafel([dec]) }, `An der ${ORDINAL[idx]}n Stelle steht die ${digit}.`],
    bugs: numberBugs(
      [
        ...others.map((o) => ({ id: 'andere-stelle', match: o, hint: 'Das ist eine andere Stelle. Zähle von links, direkt nach dem Komma.' })),
        { id: 'einer-statt-stelle', match: wholeOf(dec), hint: 'Das sind die Einer. Gesucht ist eine Stelle nach dem Komma.' },
      ],
      digit,
    ),
    praise: `Du hast die ${PLACE[idx]} an der richtigen Stelle gefunden.`,
    srText: speak(`Welche Ziffer steht in der Zahl ${show(dec)} bei den ${PLACE_DAT[idx]}?`),
    kmk: KMK,
  });
}

function digitWorth(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const { dec, digits } = plainNumber(rng, 2);
  const idx = rng.int(0, 1);
  const digit = digits[idx];
  const options = ['Einer', 'Zehntel', 'Hundertstel', 'Tausendstel'];
  const correct: ChoiceOption = { label: `${digit} ${PLACE[idx]}` };
  return build(skill, stufe, {
    key: `wert:${show(dec)}:${idx}`,
    ab,
    prompt: `Wie viel ist die ${digit} in ${show(dec)} wert?`,
    answer: makeChoice(rng, correct, options.filter((o) => o !== PLACE[idx]).map((o) => ({ label: `${digit} ${o}`, whyWrong: WHY[o] }))),
    hints: PLACE_HINTS,
    steps: [`Die ${digit} steht an der ${ORDINAL[idx]}n Stelle nach dem Komma.`, `Die Ziffer ist ${digit} ${PLACE[idx]} wert.`],
    praise: 'Du hast den Wert der Ziffer an der Stelle abgelesen.',
    srText: speak(`Wie viel ist die ${digit} in der Zahl ${show(dec)} wert?`),
    kmk: KMK,
  });
}

/** 'Welche Zahl hat 8 Hundertstel, 5 Einer und 3 Zehntel?' The places come in a mixed order. */
function composeMixed(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const digits = rng.sample([1, 2, 3, 4, 5, 6, 7, 8, 9], 3);
  const dec: Dec = [Number(digits.join('')), 2];
  const names = ['Einer', 'Zehntel', 'Hundertstel'];
  const order = rng.pick([[2, 0, 1], [1, 2, 0], [2, 1, 0], [1, 0, 2]]);
  const given = order.map((i) => digits[i]);
  return build(skill, stufe, {
    key: `bauen:${show(dec)}:${order.join('')}`,
    ab,
    prompt: `Welche Zahl hat ${joinDe(order.map((i) => `${digits[i]} ${names[i]}`))}?`,
    answer: numberAnswer(val(dec), { label: 'Die Zahl' }),
    hints: ['Die Stellen stehen hier nicht der Reihe nach.', 'Beginne mit den Einern, dann kommen Zehntel und Hundertstel.'],
    steps: [{ text: 'Trage die Ziffern in die Stellentafel ein.', visual: tafel([dec]) }, `Die Zahl heißt ${show(dec)}.`],
    bugs: numberBugs([{ id: 'reihenfolge', match: Number(`${given[0]}.${given[1]}${given[2]}`), hint: 'Das ist die Reihenfolge aus dem Text. Ordne zuerst nach den Stellen.' }], val(dec)),
    praise: 'Du hast die Ziffern nach ihren Stellen geordnet.',
    srText: speak(`Welche Zahl hat ${joinDe(order.map((i) => `${digits[i]} ${names[i]}`))}?`),
    kmk: KMK,
  });
}

/** 'Welche Zahl hat 3 Zehntel?' The same three digits stand in other places. */
function whichNumber(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const [t, a, b] = rng.sample([1, 2, 3, 4, 5, 6, 7, 8, 9], 3);
  const idx = rng.int(0, 1);
  const right = idx === 0 ? `${a},${t}${b}` : `${a},${b}${t}`;
  const others = idx === 0 ? [`${a},${b}${t}`, `${b},${a}${t}`, `${t},${a}${b}`] : [`${a},${t}${b}`, `${b},${t}${a}`, `${t},${a}${b}`];
  return build(skill, stufe, {
    key: `welche:${right}:${idx}`,
    ab,
    prompt: `Welche Zahl hat ${t} ${PLACE[idx]}?`,
    answer: makeChoice(rng, { label: right }, others.map((label) => ({ label, whyWrong: idx === 0 ? WHY.Zehntel : WHY.Hundertstel }))),
    hints: [`Die ${PLACE[idx]} stehen an der ${ORDINAL[idx]}n Stelle nach dem Komma.`, `Prüfe bei jeder Zahl diese Stelle.`],
    steps: [`Die ${PLACE[idx]} stehen an der ${ORDINAL[idx]}n Stelle nach dem Komma.`, `In ${right} steht dort die ${t}.`],
    praise: `Du hast bei jeder Zahl die ${PLACE[idx]} geprüft.`,
    srText: speak(`Welche Zahl hat ${t} ${PLACE[idx]}?`),
    kmk: KMK,
  });
}

function readTafel(stufe: Stufe, ab: Ab, dec: Dec): Exercise {
  return build(skill, stufe, {
    key: `lesen:${show(dec)}`,
    ab,
    prompt: 'Welche Zahl steht in der Stellentafel?',
    visual: tafel([dec]),
    answer: numberAnswer(val(dec), { label: 'Die Zahl' }),
    hints: ['Das Komma steht zwischen E und z.', 'Eine 0 in der Tafel schreibst du mit.'],
    steps: [`Vor dem Komma: ${wholeOf(dec)}.`, `Nach dem Komma: ${[...fracOf(dec)].join(', ')}.`, `Die Zahl heißt ${show(dec)}.`],
    bugs: numberBugs(
      [
        { id: 'null-ignoriert', match: withoutZeros(dec), hint: 'Die 0 steht für eine leere Stelle. Schreibe auch die 0 mit.' },
        { id: 'ohne-komma', match: dec[0], hint: 'Das Komma steht zwischen E und z. Setze es in deine Zahl.' },
      ],
      val(dec),
    ),
    praise: 'Du hast auch die 0 in der Stellentafel mitgeschrieben.',
    // Names the picture, so describe.ts adds nothing: the digits must stand here, or a child who tabs to the field never hears them.
    srText: speak(`Welche Zahl steht in der Stellentafel? Einer: ${wholeOf(dec)}, ${[...fracOf(dec)].map((c, i) => `${PLACE[i]}: ${c}`).join(', ')}.`),
    kmk: KMK,
  });
}

/** 'Schreibe als Dezimalzahl: 3 Einer und 5 Hundertstel.' A place without a digit is not named. */
function composeWithZero(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const dec = innerZero(rng);
  const frac = fracOf(dec);
  const parts = [`${wholeOf(dec)} Einer`, ...[...frac].flatMap((c, i) => (c === '0' ? [] : [`${c} ${PLACE[i]}`]))];
  const text = joinDe(parts);
  return build(skill, stufe, {
    key: `null:${show(dec)}`,
    ab,
    prompt: `Schreibe als Dezimalzahl: ${text}.`,
    answer: numberAnswer(val(dec), { label: 'Die Dezimalzahl' }),
    hints: ['Eine Stelle ohne Angabe bekommt eine 0.', 'Trage die Ziffern in Gedanken in die Stellentafel ein.'],
    steps: [{ text: 'Eine leere Stelle bekommt eine 0.', visual: tafel([dec]) }, `Die Zahl heißt ${show(dec)}.`],
    bugs: numberBugs(
      [
        { id: 'null-ignoriert', match: withoutZeros(dec), hint: 'Die 0 steht für eine leere Stelle. Die anderen Ziffern bleiben an ihrem Platz.' },
        { id: 'stelle-zu-weit', match: Number(`${wholeOf(dec)}.0${frac}`), hint: 'Das ist eine 0 zu viel. Prüfe die Stelle der letzten Ziffer.' },
      ],
      val(dec),
    ),
    praise: 'Du hast die leere Stelle mit einer 0 gefüllt.',
    srText: speak(`Schreibe als Dezimalzahl: ${text}.`),
    kmk: KMK,
  });
}

/** 'Welche Zahl ist 1 Hundertstel größer als 2,09?' with a change over a place. */
function neighbour(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const kind = rng.pick(['plus-h', 'plus-t', 'minus-z', 'minus-h'] as const);
  const w = rng.int(2, 9);
  const a = rng.int(1, 8);
  const b = rng.int(1, 9);
  const zeroOrDigit = rng.chance(0.5) ? 0 : a;
  const setup: Record<typeof kind, { dec: Dec; unit: number; idx: number; up: boolean }> = {
    'plus-h': { dec: [w * 100 + zeroOrDigit * 10 + 9, 2], unit: 1, idx: 1, up: true },
    'plus-t': { dec: [w * 1000 + zeroOrDigit * 100 + a * 10 + 9, 3], unit: 1, idx: 2, up: true },
    'minus-z': { dec: [w * 100 + b, 2], unit: 10, idx: 0, up: false },
    'minus-h': { dec: [w * 1000 + a * 100 + b, 3], unit: 10, idx: 1, up: false },
  };
  const { dec, unit, idx, up } = setup[kind];
  const [int, places] = dec;
  const result: Dec = [up ? int + unit : int - unit, places];
  const prompt = `Welche Zahl ist 1 ${PLACE[idx]} ${up ? 'größer' : 'kleiner'} als ${show(dec)}?`;
  const unitText = UNIT[idx];
  return build(skill, stufe, {
    key: `nachbar:${show(dec)}:${kind}`,
    ab,
    prompt,
    answer: numberAnswer(val(result), { label: 'Die Zahl' }),
    hints: up
      ? [`10 ${PLACE[idx]} sind 1 ${PLACE[idx - 1]}. Denk an den Übertrag.`, `Rechne ${show(dec)} + ${unitText}.`]
      : [`Bei den ${PLACE_DAT[idx]} steht eine 0. Du musst bündeln.`, `Rechne ${show(dec)} − ${unitText}.`],
    steps: [`1 ${PLACE[idx]} ist ${unitText}.`, `${show(dec)} ${up ? '+' : '−'} ${unitText} = ${show(result)}`],
    bugs: numberBugs(
      up
        ? [
            { id: 'stelle-daneben', match: (int + 10) / 10 ** places, hint: `Das ist 1 ${PLACE[idx - 1]} mehr. Ändere die ${PLACE[idx]}.` },
            // 2,09 + 1 Hundertstel written as 2,010
            { id: 'ueberlauf', match: Number(`${wholeOf(dec)}.${fracOf(dec).slice(0, -1)}10`), hint: `10 ${PLACE[idx]} passen nicht in eine Stelle. Das ist 1 ${PLACE[idx - 1]}.` },
          ]
        : [
            { id: 'stelle-daneben', match: (int - 1) / 10 ** places, hint: `Das ist 1 ${PLACE[idx + 1]} weniger. Ändere die ${PLACE[idx]}.` },
            // 3,05 − 1 Zehntel written as 3,95: the place before gave nothing away
            { id: 'ueberlauf', match: (int + 90) / 10 ** places, hint: 'Die Stelle davor gibt 1 ab. Dort steht dann 1 weniger.' },
          ],
      val(result),
    ),
    praise: up ? 'Du hast den Übertrag in die nächste Stelle gesetzt.' : 'Du hast aus der Stelle davor gebündelt.',
    srText: speak(prompt),
    kmk: KMK,
  });
}

const UNIT = ['0,1', '0,01', '0,001'] as const;

function bundle(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const idx = rng.int(0, 2);
  const n = noEndZero(rng, 11, idx === 0 ? 38 : 98);
  const dec: Dec = [n, idx + 1];
  const columns: PlaceColumn[] = ['E', ...COLUMN.slice(0, idx + 1)];
  const cell = { type: 'placeValue' as const, columns, rows: [{ values: columns.map((c) => (c === COLUMN[idx] ? n : null)) }] };
  const next = Math.floor(n / 10);
  const coarser = idx === 0 ? 'Einer' : PLACE[idx - 1];
  const expression = `${n} ${PLACE[idx]} = □`;
  return build(skill, stufe, {
    key: `buendeln:${n}:${idx}`,
    ab,
    prompt: 'Schreibe als Dezimalzahl.',
    expression,
    visual: cell,
    answer: numberAnswer(val(dec), { label: 'Die Dezimalzahl' }),
    hints: [`10 ${PLACE[idx]} sind 1 ${coarser}.`, 'Eine Stelle darf nur eine Ziffer haben. Bündle also.'],
    steps: [`${n} ${PLACE[idx]} sind ${next} ${coarser} und ${n % 10} ${PLACE[idx]}.`, { text: 'Trage beides in die Stellentafel ein.', visual: tafel([dec]) }, `Also ${n} ${PLACE[idx]} = ${show(dec)}.`],
    bugs: numberBugs(
      [
        { id: 'stelle-weg', match: n, hint: `Das sind ${n} Ganze. Gemeint sind ${PLACE[idx]}.` },
        idx > 0 && { id: 'stelle-zu-frueh', match: n / 10 ** idx, hint: `Die letzte Ziffer steht bei den ${PLACE_DAT[idx]}. Prüfe die Stelle.` },
        idx < 2 && { id: 'stelle-zu-weit', match: n / 10 ** (idx + 2), hint: `Die letzte Ziffer steht bei den ${PLACE_DAT[idx]}. Prüfe die Stelle.` },
      ],
      val(dec),
    ),
    praise: `Du hast ${PLACE[idx]} richtig gebündelt.`,
    srText: speak(`Schreibe als Dezimalzahl: ${expression}`),
    kmk: KMK,
  });
}

/**
 * '4,27' into Zehntel and Hundertstel: 42 Zehntel and 7 Hundertstel. Everything in front of the last place is bundled into one field, so the digits cannot be copied in their places, which Stufe 2
 * asks for with the same numbers.
 */
function split(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const dec = rng.chance(0.5) ? plainNumber(rng, 2).dec : innerZero(rng);
  const [coarseIdx, fineIdx] = [dec[1] - 2, dec[1] - 1];
  const [coarse, fine] = [Math.floor(dec[0] / 10), dec[0] % 10];
  const fields = [digitField('grob', coarse, PLACE[coarseIdx]), digitField('fein', fine, PLACE[fineIdx])];
  const parts = joinDe(fields.map((f) => `${f.value} ${f.after}`));
  const names = `${PLACE[coarseIdx]} und ${PLACE[fineIdx]}`;
  return build(skill, stufe, {
    key: `zerlegen:${show(dec)}`,
    ab,
    prompt: `Zerlege die Zahl in ${names}.`,
    expression: show(dec),
    answer: { kind: 'multi', fields },
    hints: ['Auch die Einer zählen mit. Die Einer stecken in den kleineren Stellen.', `Rechne alles vor der letzten Stelle in ${PLACE[coarseIdx]} um.`],
    steps: [{ text: 'So steht die Zahl in der Stellentafel.', visual: tafel([dec]) }, `Bis zu den ${PLACE_DAT[coarseIdx]} liest du ${coarse}.`, `${show(dec)} sind ${parts}.`],
    bugs: multiBugs([{ id: 'einer-vergessen', match: { grob: Number(fracOf(dec)[coarseIdx]), fein: fine }, hint: `Auch die Einer zählen mit. Rechne die Einer in ${PLACE[coarseIdx]} um.` }], fields),
    praise: 'Du hast die Stellen in einem Feld gebündelt.',
    srText: speak(`Zerlege die Zahl ${show(dec)} in ${names}.`),
    kmk: KMK,
  });
}

/** '3 Einer und 14 Zehntel', '2 Einer und 135 Hundertstel', or '135 Hundertstel', '23 Zehntel'. The parts always hold more than 1 Einer, so the digits cannot just be copied. */
function bundleWithWhole(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const mixed = rng.chance(0.5);
  const idx = rng.int(0, 1);
  const w = mixed ? rng.int(1, 8) : 0;
  const n = idx === 0 ? noEndZero(rng, 11, mixed ? 38 : 98) : noEndZero(rng, 101, 398);
  const text = mixed ? `${w} Einer und ${n} ${PLACE[idx]}` : `${n} ${PLACE[idx]}`;
  const dec: Dec = [w * 10 ** (idx + 1) + n, idx + 1];
  const unit = 10 ** (idx + 1);
  const ones = Math.floor(n / unit);
  return build(skill, stufe, {
    key: `gemischt:${text}`,
    ab,
    prompt: `Schreibe als Dezimalzahl: ${text}.`,
    answer: numberAnswer(val(dec), { label: 'Die Dezimalzahl' }),
    hints: [`Wie viele Einer stecken in ${n} ${PLACE[idx]}?`, `${unit} ${PLACE[idx]} sind 1 Einer. Bündle von rechts nach links.`],
    steps: [`${n} ${PLACE[idx]} sind ${ones} Einer und ${n % unit} ${PLACE[idx]}.`, { text: mixed ? `Zusammen sind das ${w + ones} Einer.` : 'So steht die Zahl in der Stellentafel.', visual: tafel([dec]) }, `Die Zahl heißt ${show(dec)}.`],
    bugs: numberBugs(
      [
        mixed && { id: 'einfach-addiert', match: w + n, hint: `Einer und ${PLACE[idx]} sind verschiedene Stellen. Schreibe beide in die Stellentafel.` },
        // 2 Einer und 135 Hundertstel written as 2,135
        mixed && { id: 'ueberlauf', match: Number(`${w}.${n}`), hint: `${n} ${PLACE[idx]} sind mehr als 1 Einer. Bündle zuerst.` },
        !mixed && { id: 'stelle-weg', match: n, hint: `Das sind ${n} Ganze. Gemeint sind ${PLACE[idx]}.` },
        idx < 2 && { id: 'stelle-zu-weit', match: dec[0] / 10 ** (idx + 2), hint: `Die letzte Ziffer steht bei den ${PLACE_DAT[idx]}. Prüfe die Stelle.` },
      ],
      val(dec),
    ),
    praise: 'Du hast die Stellen beim Bündeln richtig gesetzt.',
    srText: speak(`Schreibe als Dezimalzahl: ${text}.`),
    kmk: KMK,
  });
}

/** 'Wie viele Hundertstel sind 0,7?' The way back from a number to its parts, always in a finer unit than the number's last place: the digits alone do not answer it. hard: Tausendstel of a number above 1. */
function countUnits(rng: Rng, stufe: Stufe, ab: Ab, hard: boolean): Exercise {
  const idx = hard ? 2 : rng.int(1, 2);
  const dec: Dec = hard
    ? rng.chance(0.5) ? [noEndZero(rng, 11, 38), 1] : [noEndZero(rng, 101, 398), 2]
    : idx === 1 ? rng.chance(0.5) ? [rng.int(2, 9), 1] : [noEndZero(rng, 11, 38), 1] : [noEndZero(rng, 11, 98), 2];
  const count = dec[0] * 10 ** (idx + 1 - dec[1]);
  return build(skill, stufe, {
    key: `wieviele:${show(dec)}:${idx}`,
    ab,
    prompt: `Wie viele ${PLACE[idx]} sind ${show(dec)}?`,
    answer: numberAnswer(count, { unit: PLACE[idx], label: `Anzahl der ${PLACE[idx]}` }),
    hints: [`1 Ganzes hat ${fmtWhole(idx)} ${PLACE[idx]}.`, 'Verschiebe das Komma, bis die letzte Stelle passt.'],
    steps: [`1 ${PLACE[idx]} ist ${UNIT[idx]}.`, `${show(dec)} : ${UNIT[idx]} = ${count}`, `Das sind ${count} ${PLACE[idx]}.`],
    bugs: numberBugs(
      [
        { id: 'ohne-komma', match: dec[0], hint: `Das zählt die letzte Stelle von ${show(dec)}. Prüfe, ob das ${PLACE[idx]} sind.` },
        { id: 'stelle-zu-frueh', match: count * 10, hint: `Prüfe die Stellen: 1 ${PLACE[idx]} ist ${UNIT[idx]}.` },
      ],
      count,
    ),
    praise: `Du hast die Zahl in ${PLACE[idx]} ausgedrückt.`,
    srText: speak(`Wie viele ${PLACE[idx]} sind ${show(dec)}?`),
    kmk: KMK,
  });
}

const fmtWhole = (idx: number) => [10, 100, 1000][idx];

/** '2 Zehntel + 15 Hundertstel = □': two bundles at once. */
function twoBundles(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const a = rng.int(2, 14);
  const b = noEndZero(rng, 11, 35);
  const dec: Dec = [a * 10 + b, 2];
  const expression = `${a} Zehntel + ${b} Hundertstel = □`;
  return build(skill, stufe, {
    key: `zwei:${a}:${b}`,
    ab,
    prompt: 'Schreibe als Dezimalzahl.',
    expression,
    answer: numberAnswer(val(dec), { label: 'Die Dezimalzahl' }),
    hints: ['Schreibe beide Teile als Dezimalzahl.', 'Addiere dann mit Komma unter Komma.'],
    steps: [`${a} Zehntel = ${show([a, 1])}`, `${b} Hundertstel = ${show([b, 2])}`, `${show([a, 1])} + ${show([b, 2])} = ${show(dec)}`],
    bugs: numberBugs(
      [
        { id: 'einfach-addiert', match: (a + b) / 100, hint: 'Zehntel und Hundertstel sind verschiedene Stellen. Schreibe zuerst beide Teile als Dezimalzahl.' },
        { id: 'einfach-addiert', match: a + b, hint: 'Zehntel und Hundertstel sind verschiedene Stellen. Schreibe zuerst beide Teile als Dezimalzahl.' },
      ],
      val(dec),
    ),
    praise: 'Du hast beide Teile gebündelt und dann addiert.',
    srText: speak(`Schreibe als Dezimalzahl: ${expression}`),
    kmk: KMK,
  });
}

/**
 * 'Welche Angabe hat denselben Wert wie 4,25?' 3 Einer und 125 Hundertstel: the right option opens 1 Einer, so its digits are not the digits of the number. One unit for all would be the digits
 * without the comma.
 */
function sameWorth(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const idx = rng.int(0, 1);
  const w = rng.int(2, 9);
  const rest = idx === 0 ? rng.int(1, 9) : noEndZero(rng, 11, 98);
  const unit = 10 ** (idx + 1);
  const dec: Dec = [w * unit + rest, idx + 1];
  const name = PLACE[idx];
  const opened = unit + rest;
  const right = `${w - 1} Einer und ${opened} ${name}`;
  const wrongs: ChoiceOption[] = [
    { label: `${w} Einer und ${opened} ${name}`, whyWrong: `${opened} ${name} sind mehr als 1 Einer. Das ist 1 Einer zu viel.` },
    { label: `${w - 1} Einer und ${rest} ${name}`, whyWrong: `Das ist 1 Einer zu wenig. ${unit} ${name} sind 1 Einer.` },
    { label: `${dec[0]} ${idx === 0 ? 'Hundertstel' : 'Zehntel'}`, whyWrong: `Schreibe die Angabe als Dezimalzahl. Vergleiche dann mit ${show(dec)}.` },
  ];
  return build(skill, stufe, {
    key: `gleich:${show(dec)}`,
    ab,
    prompt: `Welche Angabe hat denselben Wert wie ${show(dec)}?`,
    answer: makeChoice(rng, { label: right }, wrongs),
    hints: ['Schreibe jede Angabe als Dezimalzahl.', `${unit} ${name} sind 1 Einer.`],
    steps: [`${show(dec)} sind ${w} Einer und ${rest} ${name}.`, `1 Einer sind ${unit} ${name}. Dazu ${rest === 1 ? 'kommt' : 'kommen'} ${rest} ${name}.`, `${show(dec)} sind also ${right}.`],
    praise: 'Du hast einen Einer in kleinere Stellen getauscht.',
    srText: speak(`Welche Angabe hat denselben Wert wie ${show(dec)}?`),
    kmk: KMK,
  });
}

function generate(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  if (stufe === 1) {
    if (ab === 1) return rng.chance(0.5) ? placeChoice(rng, stufe, ab, plainNumber(rng, rng.int(1, 2)).dec, true) : digitAtPlace(rng, stufe, ab, plainNumber(rng, 2).dec, true);
    if (ab === 2) return rng.chance(0.5) ? digitAtPlace(rng, stufe, ab, plainNumber(rng, 2).dec, false) : digitWorth(rng, stufe, ab);
    return rng.chance(0.5) ? composeMixed(rng, stufe, ab) : whichNumber(rng, stufe, ab);
  }
  if (stufe === 2) {
    if (ab === 1) return rng.chance(0.5) ? readTafel(stufe, ab, innerZero(rng)) : placeChoice(rng, stufe, ab, innerZero(rng), false);
    if (ab === 2) return rng.chance(0.5) ? composeWithZero(rng, stufe, ab) : digitAtPlace(rng, stufe, ab, innerZero(rng), false);
    return neighbour(rng, stufe, ab);
  }
  if (ab === 1) return rng.chance(0.5) ? bundle(rng, stufe, ab) : split(rng, stufe, ab);
  if (ab === 2) return rng.chance(0.6) ? bundleWithWhole(rng, stufe, ab) : countUnits(rng, stufe, ab, false);
  const form = rng.int(1, 3);
  return form === 1 ? twoBundles(rng, stufe, ab) : form === 2 ? countUnits(rng, stufe, ab, true) : sameWorth(rng, stufe, ab);
}

const skill: SkillDef = {
  id: 'dezimal.stellenwert',
  topicId: 'dezimal',
  title: 'Stellen nach dem Komma',
  description: 'Du liest Zehntel, Hundertstel und Tausendstel in der Stellentafel.',
  stufen: {
    1: 'Du benennst die Stelle einer Ziffer, bis zu 2 Stellen.',
    2: 'Bis zu 3 Stellen nach dem Komma, auch mit 0: 3,05',
    3: 'Bündeln: 12 Hundertstel = 0,12. Zahlen in Stellen zerlegen.',
  },
  kmk: KMK,
  keys: KEYS,
  generate: (rng, stufe, ctx) => generate(rng, stufe, targetAb(rng, stufe, ctx)),
};
export default skill;
