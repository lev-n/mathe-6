/**
 * Dezimalzahlen multiplizieren.
 * Stufe 1: · 10, 100, 1000 and one digit · decimal. Stufe 2: 0,4 · 0,3, one decimal in each factor. Stufe 3: two digits each, written; the comma by Überschlag.
 */
import { APPROX, fmt, speak } from '../../core/format';
import type { Ab, Bug, ChoiceOption, Exercise, Rng, SkillDef, Stufe } from '../../core/types';
import { writtenPlaces } from '../../core/written';
import { build, makeChoice, numberBugs, targetAb, writtenDecimal } from '../shared';
import { KEYS, noEndZero, numberAnswer, roundDec, show, solved, val, type Dec } from './helpers';

const KMK = ['ZO.dezimal-rechnen'];
const PLACES_HINT = 'Zähle die Stellen nach dem Komma in beiden Faktoren zusammen.';

/** 3,47 · 10 and so on: the number with its digits, and the power of ten. */
function byPower(stufe: Stufe, ab: Ab, d: Dec, k: 1 | 2 | 3, praise: string): Exercise {
  const power = 10 ** k;
  const result = (d[0] * power) / 10 ** d[1];
  const expression = `${show(d)} · ${power} = □`;
  const stepWord = k === 1 ? 'eine Stelle' : `${k} Stellen`;
  return build(skill, stufe, {
    key: `zehner:${show(d)}:${power}`,
    ab,
    prompt: 'Rechne.',
    expression,
    answer: numberAnswer(result, { label: 'Das Ergebnis' }),
    hints: [`Mal ${power} macht die Zahl größer. Das Komma rückt nach rechts.`, `Zähle die Nullen von ${power}.`],
    steps: [`${power} hat ${k} ${k === 1 ? 'Null' : 'Nullen'}.`, `Das Komma rückt um ${stepWord} nach rechts.`, `${show(d)} · ${power} = ${fmt(result)}`],
    bugs: numberBugs(
      [
        { id: 'falsche-richtung', match: d[0] / 10 ** (d[1] + k), hint: 'Mal 10 macht die Zahl größer. Das Komma rückt nach rechts.' },
        { id: 'null-angehaengt', match: val(d), hint: 'Eine 0 am Ende ändert hier den Wert nicht. Das Komma muss rücken.' },
        k > 1 && { id: 'stellen-zu-wenig', match: (d[0] * 10 ** (k - 1)) / 10 ** d[1], hint: `Zähle die Nullen von ${power}. Das Komma rückt um so viele Stellen.` },
        { id: 'stellen-zu-viel', match: (d[0] * 10 ** (k + 1)) / 10 ** d[1], hint: `Zähle die Nullen von ${power}. Das Komma rückt um so viele Stellen.` },
      ],
      result,
    ),
    praise,
    srText: speak(expression),
    kmk: KMK,
  });
}

/** 3 · 1,2 or 8 · 0,5. Below 1, a typical answer stays larger than the whole factor. */
function byDigit(stufe: Stufe, ab: Ab, n: number, d: Dec, praise: string): Exercise {
  const digits = n * d[0];
  const result: Dec = [digits, d[1]];
  const expression = `${n} · ${show(d)} = □`;
  const below = val(d) < 1;
  return build(skill, stufe, {
    key: `ziffer:${n}:${show(d)}`,
    ab,
    prompt: 'Rechne.',
    expression,
    answer: numberAnswer(val(result), { label: 'Das Ergebnis' }),
    hints: [`Rechne zuerst ohne Komma: ${n} · ${d[0]}.`, `${show(d)} hat ${d[1]} ${d[1] === 1 ? 'Stelle' : 'Stellen'} nach dem Komma. Das Ergebnis auch.`],
    steps: [`Ohne Komma: ${n} · ${d[0]} = ${digits}`, `${show(d)} hat ${d[1]} ${d[1] === 1 ? 'Stelle' : 'Stellen'} nach dem Komma.`, `${n} · ${show(d)} = ${show(result)}`],
    bugs: numberBugs(
      [
        below
          ? { id: 'mal-groesser', match: digits, hint: `${show(d)} ist kleiner als 1. Das Ergebnis ist also kleiner als ${n}.` }
          : { id: 'ohne-komma', match: digits, hint: 'Setze im Ergebnis das Komma. Zähle die Stellen nach dem Komma.' },
        { id: 'komma-zu-weit', match: digits / 10 ** (d[1] + 1), hint: 'Überschlage das Ergebnis. Passt das Komma dazu?' },
        { id: 'nur-erste-ziffer', match: val([n * Math.floor(d[0] / 10 ** d[1]) * 10 ** d[1] + (d[0] % 10 ** d[1]), d[1]]), hint: `Nimm auch die Stellen nach dem Komma mal ${n}.` },
      ],
      val(result),
    ),
    praise,
    srText: speak(expression),
    kmk: KMK,
  });
}

/** '□ · 100 = 34,5' and '0,35 · □ = 350'. */
function missingPower(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const k = rng.int(1, 3);
  const power = 10 ** k;
  if (rng.chance(0.5)) {
    const x: Dec = [rng.int(11, 99) * 10 + rng.int(1, 9), rng.int(2, 3)];
    const product = (x[0] * power) / 10 ** x[1];
    const expression = `□ · ${power} = ${fmt(product)}`;
    return build(skill, stufe, {
      key: `luecke:${show(x)}:${power}`,
      ab,
      prompt: 'Welche Zahl fehlt?',
      expression,
      answer: numberAnswer(val(x), { label: 'Die fehlende Zahl' }),
      hints: ['Die Umkehrung von mal ist geteilt.', `Teile durch ${power}: Das Komma rückt nach links.`],
      steps: [`Rechne die Umkehraufgabe: ${fmt(product)} : ${power} = ${show(x)}`, `Die fehlende Zahl ist ${show(x)}.`],
      bugs: numberBugs([{ id: 'falsche-richtung', match: (x[0] * power * power) / 10 ** x[1], hint: 'Die fehlende Zahl ist kleiner als das Ergebnis. Das Komma rückt nach links.' }], val(x)),
      praise: 'Du hast mit der Umkehraufgabe gerechnet.',
      srText: speak(`Welche Zahl fehlt? ${expression}`),
      kmk: KMK,
    });
  }
  const base: Dec = [noEndZero(rng, 11, 98), 2];
  const product = (base[0] * power) / 100;
  const expression = `${show(base)} · □ = ${fmt(product)}`;
  return build(skill, stufe, {
    key: `faktor:${show(base)}:${power}`,
    ab,
    prompt: 'Mit welcher Zahl nimmst du mal?',
    expression,
    answer: numberAnswer(power, { label: 'Die fehlende Zahl' }),
    hints: ['Vergleiche die Stelle des Kommas in beiden Zahlen.', 'Um wie viele Stellen ist das Komma nach rechts gerückt?'],
    steps: [`Von ${show(base)} zu ${fmt(product)} rückt das Komma um ${k} ${k === 1 ? 'Stelle' : 'Stellen'}.`, `Das ist mal ${power}.`],
    bugs: numberBugs([k > 1 && { id: 'stellen-zu-wenig', match: 10 ** (k - 1), hint: 'Zähle noch einmal: Wie weit ist das Komma gerückt?' }, { id: 'stellen-zu-viel', match: 10 ** (k + 1), hint: 'Zähle noch einmal: Wie weit ist das Komma gerückt?' }], power),
    praise: 'Du hast die Verschiebung des Kommas abgelesen.',
    srText: speak(`Mit welcher Zahl nimmst du mal? ${expression}`),
    kmk: KMK,
  });
}

function bothOneDecimal(stufe: Stufe, ab: Ab, a: Dec, b: Dec, praise: string): Exercise {
  const digits = a[0] * b[0];
  const result: Dec = [digits, 2];
  const expression = `${show(a)} · ${show(b)} = □`;
  const [wa, wb] = [Math.floor(a[0] / 10), Math.floor(b[0] / 10)];
  // Exactly one factor below 1: taking its comma away makes the result larger than the other factor (§5 mal-groesser).
  const oneBelow = (wa === 0) !== (wb === 0);
  const bugs: (Bug | false)[] = [
    oneBelow ? { id: 'mal-groesser', match: digits / 10, hint: 'Ein Faktor ist kleiner als 1. Das Ergebnis ist kleiner als der andere Faktor.' } : { id: 'komma-wie-plus', match: digits / 10, hint: PLACES_HINT },
    { id: 'ohne-komma', match: digits, hint: PLACES_HINT },
  ];
  return build(skill, stufe, {
    key: `beide:${show(a)}:${show(b)}`,
    ab,
    prompt: 'Rechne.',
    expression,
    answer: numberAnswer(val(result), { label: 'Das Ergebnis' }),
    hints: [`Rechne zuerst ohne Komma: ${a[0]} · ${b[0]}.`, PLACES_HINT],
    steps: [`Ohne Komma: ${a[0]} · ${b[0]} = ${digits}`, 'Beide Faktoren haben je 1 Stelle: zusammen 2 Stellen.', `${show(a)} · ${show(b)} = ${show(result)}`],
    bugs: numberBugs(bugs, val(result)),
    praise,
    srText: speak(expression),
    kmk: KMK,
  });
}

/** 'Ist 0,6 · 7,5 größer oder kleiner als 7,5?' The first factor stands below or above 1, so the answer has to be thought through each time. */
function compareWithFactor(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const isBelow = rng.chance(0.5);
  const factor: Dec = isBelow ? [rng.int(2, 9), 1] : [noEndZero(rng, 11, 29), 1];
  const fixed: Dec = [noEndZero(rng, 2, 98), 1];
  const prompt = `Ist ${show(factor)} · ${show(fixed)} größer oder kleiner als ${show(fixed)}?`;
  const [right, other] = isBelow ? ['kleiner', 'größer'] : ['größer', 'kleiner'];
  const wrongs: ChoiceOption[] = [
    { label: `${other} als ${show(fixed)}`, whyWrong: isBelow ? `${show(factor)} ist weniger als 1 Ganzes. Du nimmst nur einen Teil von ${show(fixed)}.` : `${show(factor)} ist mehr als 1 Ganzes. Du nimmst mehr als einmal ${show(fixed)}.` },
    { label: `genau ${show(fixed)}`, whyWrong: `Nur mal 1 bleibt die Zahl gleich. Hier steht ${show(factor)}.` },
  ];
  return build(skill, stufe, {
    key: `vergleich:${show(factor)}:${show(fixed)}`,
    ab,
    prompt,
    answer: makeChoice(rng, { label: `${right} als ${show(fixed)}` }, wrongs),
    hints: [`Ist ${show(factor)} größer oder kleiner als 1?`, 'Mal 0,5 ergibt die Hälfte, mal 2 das Doppelte.'],
    steps: [`${show(factor)} ist ${isBelow ? 'kleiner' : 'größer'} als 1.`, isBelow ? `Du nimmst also nur einen Teil von ${show(fixed)}.` : `Du nimmst also mehr als einmal ${show(fixed)}.`, `Das Ergebnis ist ${right} als ${show(fixed)}.`],
    praise: 'Du hast den ersten Faktor mit 1 verglichen.',
    srText: speak(prompt),
    kmk: [...KMK, 'PK.argumentieren'],
  });
}

/** '0,6 · □ = 0,24'. */
function missingOneDecimal(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const a: Dec = [rng.int(2, 9), 1];
  const b: Dec = [rng.int(2, 9), 1];
  const result: Dec = [a[0] * b[0], 2];
  const expression = `${show(a)} · □ = ${show(result)}`;
  return build(skill, stufe, {
    key: `luecke-eins:${show(a)}:${show(b)}`,
    ab,
    prompt: 'Welche Zahl fehlt?',
    expression,
    answer: numberAnswer(val(b), { label: 'Die fehlende Zahl' }),
    hints: [`Rechne ohne Komma: ${a[0]} · □ = ${result[0]}.`, 'Das Ergebnis hat 2 Stellen, der eine Faktor nur 1.'],
    steps: [`Ohne Komma: ${a[0]} · ${b[0]} = ${result[0]}`, 'Es fehlt noch 1 Stelle nach dem Komma.', `Die fehlende Zahl ist ${show(b)}.`],
    bugs: numberBugs([{ id: 'ohne-komma', match: b[0], hint: 'Das Ergebnis hat 2 Stellen nach dem Komma. Der andere Faktor hat nur 1.' }], val(b)),
    praise: 'Du hast die Stellen nach dem Komma zurückgerechnet.',
    srText: speak(`Welche Zahl fehlt? ${expression}`),
    kmk: KMK,
  });
}

// ─── Stufe 3: two digits each ────────────────────────────────────────────────

/** One significant digit, for an Überschlag: 2,4 → 2, 0,35 → 0,4. */
function leading(d: Dec): Dec {
  if (d[0] >= 10 ** d[1]) return roundDec(d, 0);
  return d[1] <= 1 ? d : roundDec(d, 1);
}

function writtenTwoDigits(stufe: Stufe, ab: Ab, a: Dec, b: Dec, praise: string): Exercise {
  const [la, lb] = [leading(a), leading(b)];
  const ueberschlagDigits = la[0] * lb[0];
  const ueberschlag = ueberschlagDigits / 10 ** (la[1] + lb[1]);
  const answer = writtenDecimal('mul', [a[0], b[0]], [a[1], b[1]], { ueberschlag });
  const places = writtenPlaces(answer);
  const result: Dec = [answer.result, places];
  const term = `${show(a)} · ${show(b)}`;
  const shiftless = a[0] * (b[0] % 10) + a[0] * Math.floor(b[0] / 10);
  const bugs: (Bug | false)[] = [
    { id: 'komma-wie-plus', match: answer.result / 10 ** Math.max(a[1], b[1]), hint: PLACES_HINT },
    { id: 'ohne-komma', match: answer.result, hint: PLACES_HINT },
    b[0] >= 10 && { id: 'einruecken-vergessen', match: shiftless / 10 ** places, hint: 'Die obere Zeile endet eine Stelle weiter links als die untere.' },
  ];
  return build(skill, stufe, {
    key: `schriftlich:${term}`,
    ab,
    prompt: 'Mach zuerst einen Überschlag. Rechne dann schriftlich und setze das Komma.',
    answer,
    hints: ['Rechne zuerst ohne Komma.', PLACES_HINT],
    steps: [`Überschlag: ${fmt(val(la))} · ${fmt(val(lb))} = ${fmt(ueberschlag)}`, { text: 'Rechne ohne Komma und setze dann das Komma.', visual: solved('mul', [a[0], b[0]], [a[1], b[1]]) }, `Zusammen ${places} Stellen: ${term} = ${show(result)}`],
    bugs: numberBugs(bugs, val(result)),
    praise,
    srText: speak(`Mach zuerst einen Überschlag. Rechne dann schriftlich: ${term}. Setze das Komma.`),
    kmk: KMK,
  });
}

/** Two digits, the last not 0. */
const twoDigits = (rng: Rng, min = 11) => noEndZero(rng, min, 98);

/** '46 · 23 = 1058. Wie viel ist 4,6 · 2,3?' */
function commaFromKnown(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const [x, y] = [twoDigits(rng, 21), twoDigits(rng, 21)];
  const a: Dec = [x, 1];
  const b: Dec = [y, 1];
  const digits = x * y;
  const result: Dec = [digits, 2];
  const prompt = `Es gilt ${x} · ${y} = ${digits}. Wie viel ist ${show(a)} · ${show(b)}?`;
  const [ra, rb] = [Math.round(val(a)), Math.round(val(b))];
  return build(skill, stufe, {
    key: `bekannt:${x}:${y}`,
    ab,
    prompt,
    answer: numberAnswer(val(result), { label: 'Das Ergebnis' }),
    hints: [`Überschlage: ${show(a)} ${APPROX} ${ra} und ${show(b)} ${APPROX} ${rb}.`, 'Die Ziffern kennst du schon. Es fehlt nur das Komma.'],
    steps: [`Überschlag: ${ra} · ${rb} = ${ra * rb}`, `Die Ziffern kommen von ${digits}, das Komma passt zum Überschlag.`, `${show(a)} · ${show(b)} = ${show(result)}`],
    bugs: numberBugs(
      [
        { id: 'komma-wie-plus', match: digits / 10, hint: 'Überschlage das Ergebnis. Dein Komma passt noch nicht dazu.' },
        { id: 'ohne-komma', match: digits, hint: 'Überschlage das Ergebnis. Dein Komma passt noch nicht dazu.' },
        { id: 'komma-zu-weit', match: digits / 1000, hint: 'Überschlage das Ergebnis. Dein Komma passt noch nicht dazu.' },
      ],
      val(result),
    ),
    praise: 'Dein Überschlag hat das Komma festgelegt.',
    srText: speak(prompt),
    kmk: [...KMK, 'PK.problemloesen'],
  });
}

/** 'Welches Ergebnis passt zum Überschlag?' */
function commaChoice(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const [x, y] = [twoDigits(rng, 21), twoDigits(rng, 21)];
  const digits = x * y;
  const a: Dec = [x, 1];
  const b: Dec = [y, 1];
  const right: Dec = [digits, 2];
  const [ra, rb] = [Math.round(val(a)), Math.round(val(b))];
  const expression = `${show(a)} · ${show(b)}`;
  const options: ChoiceOption[] = [digits / 1000, digits / 10, digits].map((v) => ({ label: fmt(v), whyWrong: `Überschlage: ${ra} · ${rb}. Dieses Ergebnis passt nicht dazu.` }));
  return build(skill, stufe, {
    key: `wahl:${x}:${y}`,
    ab,
    prompt: 'Welches Ergebnis passt zum Überschlag?',
    expression,
    answer: makeChoice(rng, { label: fmt(val(right)) }, options),
    hints: [`Runde ${show(a)} und ${show(b)} auf ganze Zahlen.`, 'Wie groß ist das Ergebnis ungefähr?'],
    steps: [`Überschlag: ${ra} · ${rb} = ${ra * rb}`, `Dazu passt ${fmt(val(right))}.`],
    praise: 'Dein Überschlag hat geholfen.',
    srText: speak(`Welches Ergebnis passt zum Überschlag? ${expression}`),
    kmk: [...KMK, 'PK.argumentieren'],
  });
}

function generate(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  if (stufe === 1) {
    if (ab === 1) {
      if (rng.chance(0.5)) return byPower(stufe, ab, [noEndZero(rng, 101, 998), 2], 1, 'Du hast das Komma um eine Stelle verschoben.');
      // Digit by digit, no carry: 3 · 2,3.
      const n = rng.int(2, 4);
      const most = Math.floor(9 / n);
      return byDigit(stufe, ab, n, [rng.int(1, most) * 10 + rng.int(1, most), 1], 'Du hast erst ohne Komma gerechnet und es dann gesetzt.');
    }
    if (ab === 2) {
      if (rng.chance(0.5)) return byPower(stufe, ab, rng.chance(0.5) ? [noEndZero(rng, 101, 998), 2] : [noEndZero(rng, 11, 98), 1], rng.chance(0.5) ? 2 : 3, 'Du hast die Nullen gezählt und das Komma verschoben.');
      const d: Dec = rng.chance(0.5) ? [rng.int(2, 9), 1] : [noEndZero(rng, 101, 450), 2];
      return byDigit(stufe, ab, rng.int(3, 9), d, 'Du hast die Stellen nach dem Komma richtig gesetzt.');
    }
    return missingPower(rng, stufe, ab);
  }
  if (stufe === 2) {
    if (ab === 1) return bothOneDecimal(stufe, ab, [rng.int(2, 9), 1], [rng.int(2, 9), 1], 'Du hast die Stellen nach dem Komma zusammengezählt.');
    if (ab === 2) {
      // Two digits times one: two digits each is the written task of Stufe 3.
      const longer: Dec = [twoDigits(rng), 1];
      const shorter: Dec = [rng.int(2, 9), 1];
      const [a, b] = rng.chance(0.5) ? [longer, shorter] : [shorter, longer];
      return bothOneDecimal(stufe, ab, a, b, 'Du hast die Stellen beider Faktoren gezählt.');
    }
    return rng.chance(0.5) ? compareWithFactor(rng, stufe, ab) : missingOneDecimal(rng, stufe, ab);
  }
  if (ab === 1) return writtenTwoDigits(stufe, ab, [twoDigits(rng), 1], [twoDigits(rng), 1], 'Du hast das Komma nach den Stellen beider Faktoren gesetzt.');
  if (ab === 2) {
    const first: Dec = rng.chance(0.5) ? [twoDigits(rng), 1] : [twoDigits(rng), 2];
    return writtenTwoDigits(stufe, ab, first, first[1] === 2 ? [twoDigits(rng), 1] : [twoDigits(rng), 2], 'Du hast auch bei ungleich vielen Stellen richtig gezählt.');
  }
  return rng.chance(0.5) ? commaFromKnown(rng, stufe, ab) : commaChoice(rng, stufe, ab);
}

const skill: SkillDef = {
  id: 'dezimal.mal',
  topicId: 'dezimal',
  title: 'Dezimalzahlen multiplizieren',
  description: 'Du nimmst Dezimalzahlen mal und setzt das Komma.',
  stufen: {
    1: 'Mal 10, 100, 1000; eine Ziffer mal Dezimalzahl',
    2: '0,4 · 0,3: je eine Stelle in beiden Faktoren',
    3: 'Je 2 Ziffern, schriftlich; Komma mit dem Überschlag setzen',
  },
  kmk: KMK,
  keys: KEYS,
  generate: (rng, stufe, ctx) => generate(rng, stufe, targetAb(rng, stufe, ctx)),
};
export default skill;
