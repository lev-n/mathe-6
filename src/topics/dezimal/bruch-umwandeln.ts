/**
 * Bruch und Dezimalzahl.
 * Stufe 1: Zehnerbrüche (7/10, 23/100). Stufe 2: Erweitern auf 10 oder 100 (3/4, 2/5, 7/20). Stufe 3: Zähler : Nenner, and periodic numbers (1/3, 1/6): the context carries no plan, so they
 * stand here (§6 "where planned", foundation report).
 */
import { frac, speak } from '../../core/format';
import type { Ab, Bug, ChoiceOption, Exercise, Rng, SkillDef, Stufe } from '../../core/types';
import { build, fractionAnswer, fractionBugs, makeChoice, numberBugs, targetAb } from '../shared';
import { ganze, KEYS, numberAnswer, show, sind, solved, tafel, val, type Dec } from './helpers';

const KMK = ['ZO.dezimal-darstellen', 'ZO.darstellung-wechseln'];
const ASK = 'Schreibe als Dezimalzahl.';
const LOWEST = 'Schreibe als Bruch. Kürze so weit wie möglich.';

/** 3/4 read as 3,4 and 7/20 as 7,20. */
const directBug = (n: number, d: number, hint: string): Bug => ({ id: 'zehner-bruch-direkt', match: Number(`${n}.${d}`), hint });

// ─── Stufe 1: Zehnerbrüche ───────────────────────────────────────────────────

function tenFraction(stufe: Stufe, ab: Ab, n: number, d: number): Exercise {
  const places = String(d).length - 1;
  const dec: Dec = [n, places];
  const name = d === 10 ? 'Zehntel' : 'Hundertstel';
  const expression = `${frac(n, d)} = □`;
  return build(skill, stufe, {
    key: `zehner:${n}:${d}`,
    ab,
    prompt: ASK,
    expression,
    ...(d === 10 && n < 10 ? { visual: { type: 'fractionModel' as const, form: 'bar' as const, parts: 10, filled: n } } : {}),
    answer: numberAnswer(val(dec), { label: 'Die Dezimalzahl' }),
    hints: [`Der Nenner ${d} sagt: Die letzte Ziffer steht bei den ${name}n.`, `Der Nenner hat ${places} ${places === 1 ? 'Null' : 'Nullen'}. So viele Stellen stehen nach dem Komma.`],
    steps: [`${frac(n, d)} ${sind(n)} ${n} ${name}.`, `Der Nenner ${d} heißt: ${places} ${places === 1 ? 'Stelle' : 'Stellen'} nach dem Komma.`, { text: `${frac(n, d)} = ${show(dec)}`, visual: tafel([dec]) }],
    bugs: numberBugs(
      [
        directBug(n, d, `Der Bruch heißt ${n} ${name}. Das ${sind(n)} nicht ${ganze(n)}.`),
        { id: 'null-ignoriert', match: Number(`${Math.floor(n / d)}.${n % d}`), hint: `Die letzte Ziffer steht bei den ${name}n. Davor gehört eine 0.` },
        { id: 'stelle-zu-weit', match: n / (d * 10), hint: `Das ist eine Stelle zu viel. Zähle die Nullen im Nenner.` },
        d > 10 && n % 10 !== 0 && { id: 'stelle-zu-frueh', match: n / (d / 10), hint: 'Zähle die Nullen im Nenner. So viele Stellen stehen nach dem Komma.' },
      ],
      val(dec),
    ),
    praise: 'Du hast die Nullen im Nenner als Stellen genutzt.',
    srText: speak(`${ASK} ${expression}`),
    kmk: KMK,
  });
}

/** 0,23 back to 23/100. Any equal value counts. */
function backToFraction(rng: Rng, stufe: Stufe, ab: Ab, hard: boolean): Exercise {
  const dec: Dec = hard ? rng.pick<Dec>([[rng.int(1, 9), 2], [10 + rng.int(1, 9) * 1 + 10 * rng.int(0, 2), 1], [rng.int(1, 9) * 100 + rng.int(1, 9), 2]]) : [rng.int(11, 97) | 1, 2];
  const [n, places] = dec;
  const d = 10 ** places;
  const name = d === 10 ? 'Zehntel' : 'Hundertstel';
  const answer = fractionAnswer(n, d, { accept: 'equivalent' });
  return build(skill, stufe, {
    key: `zurueck:${show(dec)}`,
    ab,
    prompt: `Schreibe ${show(dec)} als Bruch.`,
    answer,
    hints: ['Schau auf die letzte Stelle nach dem Komma.', `Die letzte Stelle von ${show(dec)} sind ${name}. Daraus liest du den Nenner ab.`],
    steps: [`Die letzte Stelle von ${show(dec)} sind ${name}.`, `${show(dec)} ${sind(n)} ${n} ${name}.`, `${show(dec)} = ${frac(n, d)}`],
    bugs: fractionBugs(
      [
        { id: 'stelle-zu-weit', match: { numerator: n, denominator: d * 10 }, hint: 'Zähle die Stellen nach dem Komma. So viele Nullen hat der Nenner.' },
        places > 1 && { id: 'stelle-zu-frueh', match: { numerator: n, denominator: d / 10 }, hint: 'Zähle die Stellen nach dem Komma. So viele Nullen hat der Nenner.' },
      ],
      answer,
    ),
    praise: 'Du hast den Nenner an der letzten Stelle abgelesen.',
    srText: speak(`Schreibe ${show(dec)} als Bruch.`),
    kmk: KMK,
  });
}

function sameFractionChoice(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const n = rng.int(1, 9);
  const shown = `0,${n}0`;
  const wrongs: ChoiceOption[] = [
    { label: frac(n, 100), whyWrong: `Die ${n} steht direkt nach dem Komma. Das sind Zehntel.` },
    { label: frac(10, n), whyWrong: 'Hier sind Zähler und Nenner vertauscht. Die Zahl ist kleiner als 1.' },
    { label: frac(n * 10, 10), whyWrong: `Das ${sind(n)} ${ganze(n)}. Die Zahl ist aber kleiner als 1.` },
  ];
  return build(skill, stufe, {
    key: `gleich:${n}`,
    ab,
    prompt: `Welcher Bruch hat denselben Wert wie ${shown}?`,
    answer: makeChoice(rng, { label: frac(n, 10) }, wrongs),
    hints: ['Eine 0 am Ende ändert den Wert nicht.', `Schreibe ${shown} ohne die letzte 0.`],
    steps: [`${shown} = 0,${n}`, `0,${n} ${sind(n)} ${n} Zehntel.`, `Das ist ${frac(n, 10)}.`],
    praise: 'Du hast erkannt: Die 0 am Ende ändert nichts.',
    srText: speak(`Welcher Bruch hat denselben Wert wie ${shown}?`),
    kmk: KMK,
  });
}

// ─── Stufe 2: Erweitern auf 10 oder 100 ──────────────────────────────────────

const TO_TEN: readonly (readonly [number, number])[] = [[1, 2], [1, 5], [2, 5], [3, 5], [4, 5]];
/** AB I: the most direct way to 10 or 100, one small factor. A round asks for 4 of them, so the pool holds far more. */
const DIRECT: readonly (readonly [number, number])[] = [
  ...TO_TEN,
  [1, 4], [3, 4],
  [1, 20], [3, 20], [7, 20], [9, 20], [11, 20], [13, 20], [17, 20], [19, 20],
  [1, 50], [3, 50], [7, 50], [9, 50], [11, 50], [13, 50], [17, 50], [19, 50],
];
const TO_HUNDRED: readonly (readonly [number, number])[] = [
  [1, 4], [3, 4],
  [1, 20], [3, 20], [7, 20], [9, 20], [11, 20], [13, 20], [17, 20], [19, 20],
  [1, 25], [2, 25], [3, 25], [4, 25], [6, 25], [7, 25], [8, 25], [9, 25], [11, 25], [12, 25], [13, 25], [14, 25], [16, 25], [18, 25], [21, 25], [24, 25],
  [1, 50], [3, 50], [7, 50], [9, 50], [11, 50], [13, 50], [17, 50], [19, 50], [21, 50], [23, 50], [27, 50], [29, 50], [31, 50], [33, 50], [37, 50], [39, 50], [41, 50], [43, 50], [47, 50], [49, 50],
];
const ABOVE_ONE: readonly (readonly [number, number])[] = [[3, 2], [5, 2], [7, 2], [5, 4], [7, 4], [9, 4], [11, 4], [6, 5], [7, 5], [8, 5], [9, 5], [11, 5], [21, 20], [27, 20], [33, 20], [26, 25], [32, 25], [51, 50], [63, 50]];

function expandFraction(stufe: Stufe, ab: Ab, n: number, d: number): Exercise {
  const target = 100 % d === 0 && 10 % d !== 0 ? 100 : 10;
  const factor = target / d;
  const places = target === 10 ? 1 : 2;
  const dec: Dec = [n * factor, places];
  const expression = `${frac(n, d)} = □`;
  return build(skill, stufe, {
    key: `erweitern:${n}:${d}`,
    ab,
    prompt: ASK,
    expression,
    ...(target === 10 && n < d ? { visual: { type: 'fractionModel' as const, form: 'bar' as const, parts: d, filled: n, refineTo: 10 } } : {}),
    answer: numberAnswer(val(dec), { label: 'Die Dezimalzahl' }),
    hints: [`Mit welcher Zahl wird aus dem Nenner ${d} der Nenner ${target}?`, 'Nimm Zähler und Nenner mit dieser Zahl mal.'],
    steps: [`Erweitere mit ${factor}: ${n} · ${factor} = ${n * factor} und ${d} · ${factor} = ${target}.`, `${frac(n, d)} = ${frac(n * factor, target)}`, `${frac(n * factor, target)} = ${show(dec)}`],
    bugs: numberBugs(
      [
        directBug(n, d, `${frac(n, d)} heißt ${n} : ${d}. Erweitere den Bruch auf ${target === 10 ? 'Zehntel' : 'Hundertstel'}.`),
        { id: 'nur-nenner', match: n / target, hint: 'Beim Erweitern ändern sich Zähler und Nenner. Nimm auch den Zähler mal.' },
      ],
      val(dec),
    ),
    praise: `Du hast den Bruch auf ${target === 10 ? 'Zehntel' : 'Hundertstel'} erweitert.`,
    srText: speak(`${ASK} ${expression}`),
    kmk: KMK,
  });
}

/** 0,75 back to 3/4: the fraction fully reduced. */
function reduceToFraction(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const [n, d] = rng.pick([...TO_TEN, ...TO_HUNDRED.slice(0, 12), ...ABOVE_ONE]);
  const target = 100 % d === 0 && 10 % d !== 0 ? 100 : 10;
  const dec: Dec = [(n * target) / d, target === 10 ? 1 : 2];
  const factor = target / d;
  const answer = fractionAnswer(n, d);
  return build(skill, stufe, {
    key: `kuerzen:${n}:${d}`,
    ab,
    prompt: LOWEST,
    expression: show(dec),
    answer,
    hints: [`Schreibe ${show(dec)} zuerst mit dem Nenner ${target}.`, 'Teile dann Zähler und Nenner durch dieselbe Zahl.'],
    steps: [`${show(dec)} = ${frac(dec[0], target)}`, `Kürze mit ${factor}: ${dec[0]} : ${factor} = ${n} und ${target} : ${factor} = ${d}.`, `${show(dec)} = ${frac(n, d)}`],
    bugs: fractionBugs([{ id: target === 10 ? 'stelle-zu-weit' : 'stelle-zu-frueh', match: { numerator: dec[0], denominator: target === 10 ? 100 : 10 }, hint: 'Zähle die Stellen nach dem Komma. So viele Nullen hat der Nenner.' }], answer),
    praise: 'Du hast den Bruch abgelesen und ganz gekürzt.',
    srText: speak(`Schreibe ${show(dec)} als Bruch. Kürze so weit wie möglich.`),
    kmk: KMK,
  });
}

function valueChoice(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const [n, d] = rng.pick([[2, 5], [3, 5], [4, 5], [1, 4], [3, 4], [1, 5]] as const);
  const dec: Dec = d === 5 ? [n * 2, 1] : [n * 25, 2];
  const pool: ChoiceOption[] = [
    { label: frac(dec[0], 1000), whyWrong: 'Zähle die Stellen nach dem Komma. So viele Nullen hat der Nenner.' },
    { label: frac(dec[0], d === 5 ? 100 : 10), whyWrong: 'Zähle die Stellen nach dem Komma. So viele Nullen hat der Nenner.' },
    { label: frac(d, n === 1 ? 2 : n), whyWrong: 'Erweitere den Bruch auf den Nenner 10 oder 100. Vergleiche dann.' },
    { label: frac(n, d === 5 ? 4 : 5), whyWrong: 'Erweitere den Bruch auf den Nenner 10 oder 100. Vergleiche dann.' },
  ];
  return build(skill, stufe, {
    key: `welcher:${n}:${d}`,
    ab,
    prompt: `Welcher Bruch hat den Wert ${show(dec)}?`,
    answer: makeChoice(rng, { label: frac(n, d) }, pool),
    hints: [`Schreibe ${show(dec)} als Zehntel oder Hundertstel.`, 'Kürze dann so weit wie möglich.'],
    steps: [`${show(dec)} = ${frac(dec[0], d === 5 ? 10 : 100)}`, `Kürzen ergibt ${frac(n, d)}.`],
    praise: 'Du hast den Bruch mit dem passenden Nenner gefunden.',
    srText: speak(`Welcher Bruch hat den Wert ${show(dec)}?`),
    kmk: KMK,
  });
}

// ─── Stufe 3: Zähler : Nenner, periodisch ────────────────────────────────────

const BY_DIVISION: readonly (readonly [number, number])[] = [[1, 8], [3, 8], [5, 8], [7, 8], [1, 40], [3, 40], [7, 40], [9, 40], [11, 40], [13, 40], [17, 40], [19, 40], [21, 40], [23, 40], [27, 40], [29, 40], [31, 40], [33, 40], [37, 40], [39, 40]];
const EIGHTHS_ABOVE_ONE: readonly (readonly [number, number])[] = [[9, 8], [11, 8], [13, 8], [15, 8], [17, 8], [19, 8], [21, 8], [41, 40], [43, 40], [47, 40], [49, 40], [51, 40], [53, 40]];

function divideFraction(stufe: Stufe, ab: Ab, n: number, d: number): Exercise {
  const dec: Dec = [(n * 1000) / d, 3];
  const expression = `${frac(n, d)} = ${n} : ${d} = □`;
  const swapped = (d * 1000) % n === 0 ? d / n : -1;
  return build(skill, stufe, {
    key: `division:${n}:${d}`,
    ab,
    prompt: 'Rechne Zähler : Nenner.',
    expression,
    answer: numberAnswer(val(dec), { label: 'Die Dezimalzahl' }),
    hints: [`Der Bruchstrich ist ein Geteiltzeichen: ${n} : ${d}.`, `Schreibe ${n} als ${show([n * 1000, 3])}. Teile dann Stelle für Stelle.`],
    steps: [`${frac(n, d)} heißt ${n} : ${d}.`, { text: `Schreibe ${n} als ${show([n * 1000, 3])} und teile.`, visual: solved('div', [n * 1000, d], [3, 0]) }, `${show([n * 1000, 3])} : ${d} = ${show(dec)}`],
    bugs: numberBugs(
      [
        directBug(n, d, `${frac(n, d)} heißt ${n} : ${d}. Rechne die Division aus.`),
        swapped > 0 && { id: 'nenner-durch-zaehler', match: swapped, hint: 'Der Zähler kommt zuerst: Zähler geteilt durch Nenner.' },
      ],
      val(dec),
    ),
    praise: 'Du hast den Bruch als Division gerechnet.',
    srText: speak(`Rechne Zähler geteilt durch Nenner. ${expression}`),
    kmk: KMK,
  });
}

/** Label of a periodic number: 0,333… or 0,1666… */
function periodicLabel(n: number, d: number): string {
  const whole = Math.floor(n / d);
  let rest = n % d;
  let digits = '';
  for (let i = 0; i < 4; i++) {
    rest *= 10;
    digits += Math.floor(rest / d);
    rest %= d;
  }
  return `${whole},${digits.slice(0, d === 6 ? 4 : 3)}…`;
}

const PERIODIC: readonly (readonly [number, number])[] = [[1, 3], [2, 3], [1, 6], [5, 6], [1, 9], [2, 9], [4, 9], [5, 9], [7, 9], [8, 9]];

function periodicChoice(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const [n, d] = rng.pick(PERIODIC);
  const label = periodicLabel(n, d);
  const cut = label.replace('…', '').slice(0, 3);
  // Two wrong options also end in '…', so the dots do not point at the right one: the child has to divide.
  const wrongs: ChoiceOption[] = [
    { label: periodicLabel(d - n, d), whyWrong: `Der Zähler ist ${n}. Rechne ${n} : ${d}.` },
    { label: `${n},${String(d).repeat(3)}…`, whyWrong: `${frac(n, d)} heißt ${n} : ${d}. Rechne die Division aus.` },
    { label: cut, whyWrong: 'Die Division endet hier nicht. Eine Ziffer wiederholt sich immer weiter.' },
  ];
  return build(skill, stufe, {
    key: `periodisch:${n}:${d}`,
    ab,
    prompt: `Welche Dezimalzahl gehört zu ${frac(n, d)}?`,
    answer: makeChoice(rng, { label }, wrongs),
    hints: [`Rechne ${n} : ${d} Stelle für Stelle.`, 'Schau auf den Rest. Kommt derselbe Rest immer wieder?'],
    steps: [`${frac(n, d)} heißt ${n} : ${d}.`, 'Beim Teilen kommt immer wieder derselbe Rest.', `Darum endet die Zahl nicht: ${label}`],
    praise: 'Du hast den wiederkehrenden Rest erkannt.',
    srText: speak(`Welche Dezimalzahl gehört zu ${frac(n, d)}?`),
    kmk: KMK,
  });
}

const PERIODIC_ROUND: readonly (readonly [number, number])[] = [...PERIODIC, [4, 3], [5, 3], [7, 3], [8, 3], [7, 6], [11, 6], [13, 6], [10, 9], [14, 9]];

function periodicRounded(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const [n, d] = rng.pick(PERIODIC_ROUND);
  const rounded: Dec = [Math.floor((200 * n + d) / (2 * d)), 2];
  const cut: Dec = [Math.floor((100 * n) / d), 2];
  const third = Math.floor((1000 * n) / d) % 10;
  const prompt = `Schreibe ${frac(n, d)} als Dezimalzahl. Runde auf Hundertstel.`;
  return build(skill, stufe, {
    key: `gerundet:${n}:${d}`,
    ab,
    prompt,
    answer: numberAnswer(val(rounded), { label: 'Die gerundete Zahl' }),
    hints: [`Rechne ${n} : ${d} bis zur dritten Stelle nach dem Komma.`, 'Die dritte Stelle entscheidet: ab 5 rundest du auf.'],
    steps: [`${n} : ${d} = ${periodicLabel(n, d)}`, `Die dritte Stelle nach dem Komma ist ${third}.`, `Also ${frac(n, d)} ≈ ${show(rounded)}`],
    bugs: numberBugs(
      [
        third >= 5 && { id: 'runden-abschneiden', match: val(cut), hint: `Schau auf die nächste Stelle. Eine ${third} bedeutet: aufrunden.` },
        directBug(n, d, `${frac(n, d)} heißt ${n} : ${d}. Rechne die Division aus.`),
        { id: 'nicht-gerundet', match: Math.floor((1000 * n) / d) / 1000, hint: 'Hier sind nur 2 Stellen nach dem Komma gefragt. Runde noch.' },
      ],
      val(rounded),
    ),
    praise: 'Du hast geteilt und an der richtigen Stelle gerundet.',
    srText: speak(prompt),
    kmk: KMK,
  });
}

/** 0,125 back to 1/8. */
function eighthBack(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const [n, d] = rng.pick([[1, 8], [3, 8], [5, 8], [7, 8], [9, 8], [11, 8]] as const);
  const dec: Dec = [(n * 1000) / d, 3];
  const answer = fractionAnswer(n, d);
  return build(skill, stufe, {
    key: `achtel:${n}`,
    ab,
    prompt: LOWEST,
    expression: show(dec),
    answer,
    hints: [`Schreibe ${show(dec)} zuerst mit dem Nenner 1000.`, 'Kürze dann, bis du nicht mehr weiterkommst.'],
    steps: [`${show(dec)} = ${frac(dec[0], 1000)}`, `Kürze mit 125: ${dec[0]} : 125 = ${n} und 1000 : 125 = ${d}.`, `${show(dec)} = ${frac(n, d)}`],
    bugs: fractionBugs([{ id: 'stelle-zu-frueh', match: { numerator: dec[0], denominator: 100 }, hint: 'Zähle die Stellen nach dem Komma. So viele Nullen hat der Nenner.' }], answer),
    praise: 'Du hast über den Nenner 1000 ganz gekürzt.',
    srText: speak(`Schreibe ${show(dec)} als Bruch. Kürze so weit wie möglich.`),
    kmk: KMK,
  });
}

function generate(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  if (stufe === 1) {
    if (ab === 1) return rng.chance(0.5) ? tenFraction(stufe, ab, rng.int(1, 9), 10) : tenFraction(stufe, ab, rng.int(11, 99) | 1, 100);
    if (ab === 2) {
      const form = rng.int(1, 3);
      if (form === 1) return tenFraction(stufe, ab, rng.int(1, 9), 100);
      if (form === 2) return tenFraction(stufe, ab, rng.int(101, 399) | 1, 100);
      return backToFraction(rng, stufe, ab, false);
    }
    const form = rng.int(1, 3);
    if (form === 1) return backToFraction(rng, stufe, ab, true);
    // Over 1 with an inner zero: 407/100 = 4,07. Still a Nenner of 100, as the Stufe says.
    if (form === 2) return tenFraction(stufe, ab, rng.int(1, 9) * 100 + rng.int(1, 9), 100);
    return sameFractionChoice(rng, stufe, ab);
  }
  if (stufe === 2) {
    if (ab === 1) {
      const [n, d] = rng.pick(DIRECT);
      return expandFraction(stufe, ab, n, d);
    }
    if (ab === 2) {
      const [n, d] = rng.pick(TO_HUNDRED);
      return expandFraction(stufe, ab, n, d);
    }
    const form = rng.int(1, 3);
    if (form === 1) {
      const [n, d] = rng.pick(ABOVE_ONE);
      return expandFraction(stufe, ab, n, d);
    }
    return form === 2 ? reduceToFraction(rng, stufe, ab) : valueChoice(rng, stufe, ab);
  }
  if (ab === 1) {
    const [n, d] = rng.pick(BY_DIVISION);
    return divideFraction(stufe, ab, n, d);
  }
  if (ab === 2) {
    if (rng.chance(0.6)) return periodicChoice(rng, stufe, ab);
    const [n, d] = rng.pick(EIGHTHS_ABOVE_ONE);
    return divideFraction(stufe, ab, n, d);
  }
  return rng.chance(0.65) ? periodicRounded(rng, stufe, ab) : eighthBack(rng, stufe, ab);
}

const skill: SkillDef = {
  id: 'dezimal.bruch-umwandeln',
  topicId: 'dezimal',
  title: 'Bruch und Dezimalzahl',
  description: 'Du schreibst Brüche als Dezimalzahlen und umgekehrt.',
  stufen: {
    1: 'Brüche mit Nenner 10 und 100',
    2: 'Erst erweitern auf 10 oder 100',
    3: 'Zähler : Nenner rechnen, auch Zahlen ohne Ende',
  },
  kmk: KMK,
  keys: KEYS,
  generate: (rng, stufe, ctx) => generate(rng, stufe, targetAb(rng, stufe, ctx)),
};
export default skill;
