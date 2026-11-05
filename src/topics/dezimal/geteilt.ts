/**
 * Dezimalzahlen dividieren.
 * Stufe 1: : 10, 100 and : a one-digit number, the result ends. Stufe 2: a Divisor with one decimal (0,8 : 0,2). Stufe 3: the result does not end, so it is rounded; stories.
 */
import { APPROX, fmt, fmtMoney, fmtQty, speak } from '../../core/format';
import type { Ab, Bug, ChoiceOption, Exercise, Rng, SkillDef, Stufe } from '../../core/types';
import { build, makeChoice, numberBugs, pickPerson, targetAb, writtenDecimal } from '../shared';
import { attempt, cutQuotient, euroAnswer, KEYS, noEndZero, numberAnswer, quotientStep, roundedQuotient, show, solved, val, type Dec } from './helpers';

const KMK = ['ZO.dezimal-rechnen'];
const SHIFT_HINT = 'Verschiebe das Komma bei beiden Zahlen, bis der Divisor keine Stelle mehr hat.';

// ─── Stufe 1 ─────────────────────────────────────────────────────────────────

function byPower(stufe: Stufe, ab: Ab, d: Dec, k: 1 | 2, praise: string): Exercise {
  const power = 10 ** k;
  const result: Dec = [d[0], d[1] + k];
  const expression = `${show(d)} : ${power} = □`;
  return build(skill, stufe, {
    key: `zehner:${show(d)}:${power}`,
    ab,
    prompt: 'Rechne.',
    expression,
    answer: numberAnswer(val(result), { label: 'Das Ergebnis' }),
    hints: [`Geteilt durch ${power} macht die Zahl kleiner. Das Komma rückt nach links.`, `Zähle die Nullen von ${power}.`],
    steps: [`${power} hat ${k} ${k === 1 ? 'Null' : 'Nullen'}.`, `Das Komma rückt um ${k === 1 ? 'eine Stelle' : '2 Stellen'} nach links.`, `${show(d)} : ${power} = ${show(result)}`],
    bugs: numberBugs(
      [
        { id: 'falsche-richtung', match: (d[0] * power) / 10 ** d[1], hint: 'Geteilt macht die Zahl hier kleiner. Das Komma rückt nach links.' },
        k > 1 && { id: 'stellen-zu-wenig', match: d[0] / 10 ** (d[1] + k - 1), hint: `Zähle die Nullen von ${power}. Das Komma rückt um so viele Stellen.` },
        d[1] + k < 3 && { id: 'stellen-zu-viel', match: d[0] / 10 ** (d[1] + k + 1), hint: `Zähle die Nullen von ${power}. Das Komma rückt um so viele Stellen.` },
      ],
      val(result),
    ),
    praise,
    srText: speak(expression),
    kmk: KMK,
  });
}

/** 6,4 : 2, in the head: every digit divides. */
function byDigitHead(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const n = rng.int(2, 4);
  const [x, y] = [rng.int(1, Math.floor(9 / n)), rng.int(1, Math.floor(9 / n))];
  const result: Dec = [x * 10 + y, 1];
  const d: Dec = [result[0] * n, 1];
  const expression = `${show(d)} : ${n} = □`;
  return build(skill, stufe, {
    key: `kopf:${show(d)}:${n}`,
    ab,
    prompt: 'Rechne.',
    expression,
    answer: numberAnswer(val(result), { label: 'Das Ergebnis' }),
    hints: ['Teile zuerst die Einer, dann die Zehntel.', 'Das Komma bleibt an seiner Stelle.'],
    steps: [`Einer: ${Math.floor(d[0] / 10)} : ${n} = ${x}`, `Zehntel: ${d[0] % 10} : ${n} = ${y}`, `${show(d)} : ${n} = ${show(result)}`],
    bugs: numberBugs([{ id: 'ohne-komma', match: result[0], hint: 'Setze das Komma im Ergebnis: Einer vor das Komma, Zehntel dahinter.' }], val(result)),
    praise: 'Du hast Einer und Zehntel einzeln geteilt.',
    srText: speak(expression),
    kmk: KMK,
  });
}

/**
 * Written with a one-digit Divisor, the result ends. With an inner zero half of the time. WrittenInput has a box per digit of the Dividend, so the Dividend has no more digits than the
 * result: every box holds a digit, and the first box is where the child starts and where the solution starts.
 */
function writtenByDigit(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const [n, q] = attempt<[number, number]>(() => {
    const divisor = rng.int(2, 9);
    const v = rng.chance(0.5) ? rng.int(1, 9) * 100 + rng.int(1, 9) : noEndZero(rng, 112, 498);
    return v * divisor < 1000 ? [divisor, v] : null;
  }, [2, 125]);
  // 7,50 : 2 stands with its end zero when the quotient needs the place.
  const d: Dec = [q * n, 2];
  const answer = writtenDecimal('div', [d[0], n], [d[1], 0]);
  const result: Dec = [answer.result, d[1]];
  const term = `${show(d)} : ${n}`;
  const digits = String(q);
  const withoutZero = digits.includes('0') ? Number(digits.replace('0', '')) : -1;
  return build(skill, stufe, {
    key: `schriftlich:${term}`,
    ab,
    prompt: 'Rechne schriftlich.',
    answer,
    hints: ['Teile Stelle für Stelle von links. Das Komma im Ergebnis steht schon.', 'Reicht eine Stelle nicht, schreibe im Ergebnis eine 0.'],
    steps: [{ text: 'Teile Stelle für Stelle von links.', visual: solved('div', [d[0], n], [d[1], 0]) }, `${term} = ${show(result)}`],
    bugs: numberBugs([withoutZero > 0 && { id: 'null-uebersprungen', match: withoutZero / 10 ** d[1], hint: 'Reicht eine Stelle nicht, schreibe im Ergebnis eine 0.' }], val(result)),
    praise: 'Du hast Stelle für Stelle von links geteilt.',
    srText: speak(`Rechne schriftlich: ${term}.`),
    kmk: KMK,
  });
}

/** '□ : 4 = 1,25', '□ : 100 = 0,35'. */
function missingDividend(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const power = rng.chance(0.5);
  const n = power ? rng.pick([10, 100]) : rng.int(2, 8);
  const q: Dec = power ? [noEndZero(rng, 11, 98), 2] : rng.pick<Dec>([[noEndZero(rng, 11, 98), 1], [rng.int(5, 40) * 5, 2]]);
  const value = (q[0] * n) / 10 ** q[1];
  const expression = `□ : ${n} = ${show(q)}`;
  return build(skill, stufe, {
    key: `luecke:${n}:${show(q)}`,
    ab,
    prompt: 'Welche Zahl fehlt?',
    expression,
    answer: numberAnswer(value, { label: 'Die fehlende Zahl' }),
    hints: ['Die Umkehrung von geteilt ist mal.', `Rechne ${show(q)} · ${n}.`],
    steps: [`Rechne die Umkehraufgabe: ${show(q)} · ${n} = ${fmt(value)}`, `Die fehlende Zahl ist ${fmt(value)}.`],
    bugs: numberBugs([{ id: 'umkehr-gleiche-rechnung', match: q[0] / 10 ** q[1] / n, hint: 'Die fehlende Zahl ist größer als das Ergebnis. Rechne mal.' }], value),
    praise: 'Du hast mit der Umkehraufgabe gerechnet.',
    srText: speak(`Welche Zahl fehlt? ${expression}`),
    kmk: KMK,
  });
}

// ─── Stufe 2 ─────────────────────────────────────────────────────────────────

/** Both with one decimal: 0,8 : 0,2. */
function bothOneDecimal(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const divisor = rng.int(2, 9);
  const q = rng.int(2, 9);
  const a: Dec = [divisor * q, 1];
  const b: Dec = [divisor, 1];
  const expression = `${show(a)} : ${show(b)} = □`;
  return build(skill, stufe, {
    key: `beide:${show(a)}:${show(b)}`,
    ab,
    prompt: 'Rechne.',
    expression,
    answer: numberAnswer(q, { label: 'Das Ergebnis' }),
    hints: [`Wie oft passt ${show(b)} in ${show(a)}?`, SHIFT_HINT],
    steps: [`Verschiebe das Komma bei beiden Zahlen: ${show(a)} : ${show(b)} = ${a[0]} : ${b[0]}`, `${a[0]} : ${b[0]} = ${q}`, `Also ${show(a)} : ${show(b)} = ${q}`],
    bugs: numberBugs([{ id: 'komma-nicht-verschoben', match: q / 10, hint: `Wie oft passt ${show(b)} in ${show(a)}? Verschiebe das Komma bei beiden Zahlen.` }], q),
    praise: 'Du hast das Komma bei beiden Zahlen verschoben.',
    srText: speak(expression),
    kmk: KMK,
  });
}

/**
 * 18,8 : 0,4 or 1,44 : 0,3, typed. The shift is the demand of this Stufe, and a written answer would show it as done (WrittenInput), which leaves the division of Stufe 1. So the child shifts,
 * and the digits do not divide one by one. An inner zero half of the time.
 */
function shiftAndDivide(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const divisor = rng.int(3, 9);
  const dividendPlaces = rng.int(1, 2);
  const inner = rng.chance(0.5);
  const q = attempt(() => {
    const v = inner ? rng.int(1, 9) * 100 + rng.int(1, 9) : noEndZero(rng, 12, 98);
    const dividend = v * divisor;
    return dividend % 10 !== 0 && [...String(dividend)].some((c) => Number(c) % divisor !== 0) ? v : null;
  }, 23);
  const a: Dec = [q * divisor, dividendPlaces];
  const b: Dec = [divisor, 1];
  const places = dividendPlaces - 1;
  const result: Dec = [q, places];
  const term = `${show(a)} : ${show(b)}`;
  const expression = `${term} = □`;
  const digits = String(q);
  const withoutZero = digits.includes('0') ? Number(digits.replace('0', '')) : -1;
  return build(skill, stufe, {
    key: `schieben:${term}`,
    ab,
    prompt: 'Rechne.',
    expression,
    answer: numberAnswer(val(result), { label: 'Das Ergebnis' }),
    hints: [SHIFT_HINT, 'Teile dann Stelle für Stelle von links.'],
    steps: [`Verschiebe das Komma bei beiden Zahlen: ${term} = ${show([a[0], places])} : ${divisor}`, { text: 'Teile dann Stelle für Stelle von links.', visual: solved('div', [a[0], b[0]], [a[1], b[1]]) }, `${term} = ${show(result)}`],
    bugs: numberBugs(
      [
        { id: 'komma-nicht-verschoben', match: val([q, dividendPlaces]), hint: `Wie oft passt ${show(b)} in ${show(a)}? Verschiebe das Komma bei beiden Zahlen.` },
        withoutZero > 0 && { id: 'null-uebersprungen', match: withoutZero / 10 ** places, hint: 'Reicht eine Stelle nicht, schreibe im Ergebnis eine 0.' },
        places > 0 && { id: 'ohne-komma', match: q, hint: 'Nach dem Verschieben bleibt 1 Stelle im Dividenden. Setze das Komma im Ergebnis.' },
      ],
      val(result),
    ),
    praise: 'Du hast das Komma verschoben und dann geteilt.',
    srText: speak(expression),
    kmk: KMK,
  });
}

/** How many pieces fit: 2,4 m in pieces of 0,3 m. */
function howManyStory(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const person = pickPerson(rng);
  const divisor = rng.int(2, 9);
  const q = rng.int(3, 15);
  const a: Dec = [divisor * q, 1];
  const b: Dec = [divisor, 1];
  const context = `Ein Band ist ${fmtQty(val(a), 'm')} lang. ${person.name} schneidet Stücke von je ${fmtQty(val(b), 'm')} ab.`;
  const prompt = `Wie viele Stücke bekommt ${person.name}?`;
  return build(skill, stufe, {
    key: `band:${show(a)}:${show(b)}`,
    ab,
    context,
    prompt,
    answer: numberAnswer(q, { unit: 'Stücke', label: 'Anzahl der Stücke' }),
    hints: [`Wie oft passt ${show(b)} in ${show(a)}?`, SHIFT_HINT],
    steps: [`Rechne ${show(a)} : ${show(b)}.`, `Verschiebe das Komma: ${a[0]} : ${b[0]} = ${q}`, `${person.name} bekommt ${q} Stücke.`],
    bugs: numberBugs([{ id: 'komma-nicht-verschoben', match: q / 10, hint: `Wie oft passt ${show(b)} in ${show(a)}? Verschiebe das Komma bei beiden Zahlen.` }], q),
    praise: 'Du hast erkannt: Hier fragt die Geschichte nach „wie oft“.',
    srText: speak(`${context} ${prompt}`),
    kmk: [...KMK, 'PK.modellieren'],
  });
}

/** 'Ist 4,2 : 0,6 größer oder kleiner als 4,2?' The Divisor stands below or above 1, so the answer has to be thought through each time. */
function compareWithDividend(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const below = rng.chance(0.5);
  const [a, b] = attempt<[Dec, Dec]>(() => {
    const divisor = below ? rng.int(2, 9) : noEndZero(rng, 11, 29);
    const n = divisor * rng.int(2, 9);
    return n % 10 !== 0 ? [[n, 1], [divisor, 1]] : null;
  }, below ? [[42, 1], [6, 1]] : [[42, 1], [14, 1]]);
  const prompt = `Ist ${show(a)} : ${show(b)} größer oder kleiner als ${show(a)}?`;
  const [right, other] = below ? ['größer', 'kleiner'] : ['kleiner', 'größer'];
  const wrongs: ChoiceOption[] = [
    { label: `${other} als ${show(a)}`, whyWrong: `Du teilst durch eine Zahl ${other} als 1. Wie oft passt ${show(b)} in ${show(a)}?` },
    { label: `genau ${show(a)}`, whyWrong: 'Nur geteilt durch 1 bleibt die Zahl gleich.' },
  ];
  return build(skill, stufe, {
    key: `vergleich:${show(a)}:${show(b)}`,
    ab,
    prompt,
    answer: makeChoice(rng, { label: `${right} als ${show(a)}` }, wrongs),
    hints: [`Ist ${show(b)} größer oder kleiner als 1?`, `Passt ${show(b)} öfter oder seltener in ${show(a)} als die 1?`],
    steps: [`${show(b)} ist ${other} als 1.`, `1 passt ${show(a)}-mal in ${show(a)}. ${show(b)} passt ${below ? 'öfter' : 'seltener'} hinein.`, `Das Ergebnis ist ${right} als ${show(a)}.`],
    praise: 'Du hast den Divisor mit 1 verglichen.',
    srText: speak(prompt),
    kmk: [...KMK, 'PK.argumentieren'],
  });
}

// ─── Stufe 3: the result does not end ────────────────────────────────────────

const ROUND_HINT = 'Rechne bis zur dritten Stelle. Die dritte Stelle entscheidet über das Runden.';

function roundedItem(stufe: Stufe, ab: Ab, a: Dec, b: Dec, praise: string): Exercise {
  const rounded = roundedQuotient(a, b, 2);
  const cut = cutQuotient(a, b, 2);
  const third = cutQuotient(a, b, 3);
  const expression = `${show(a)} : ${show(b)} ${APPROX} □`;
  const wholes = a[1] === 0 && b[1] === 0 ? a[0] % b[0] : 0;
  const bugs: (Bug | false)[] = [
    third[0] % 10 >= 5 && { id: 'runden-abschneiden', match: val(cut), hint: `Schau auf die nächste Stelle. Eine ${third[0] % 10} bedeutet: aufrunden.` },
    { id: 'nicht-gerundet', match: val(third), hint: 'Hier sind nur 2 Stellen nach dem Komma gefragt. Runde noch.' },
    wholes > 0 && { id: 'rest-als-komma', match: Number(`${Math.floor(a[0] / b[0])}.${wholes}`), hint: 'Der Rest ist keine Stelle nach dem Komma. Rechne weiter hinter dem Komma.' },
    b[1] > 0 && { id: 'komma-nicht-verschoben', match: val(roundedQuotient(a, [b[0], 0], 2)), hint: 'Verschiebe das Komma bei beiden Zahlen. Der Divisor hat dann keine Stelle mehr.' },
  ];
  return build(skill, stufe, {
    key: `runden:${show(a)}:${show(b)}`,
    ab,
    prompt: 'Das Ergebnis endet nicht. Runde auf Hundertstel.',
    expression,
    answer: numberAnswer(val(rounded), { label: 'Das gerundete Ergebnis' }),
    hints: b[1] > 0 ? [SHIFT_HINT, ROUND_HINT] : [ROUND_HINT, 'Hänge Nullen an die Zahl an. So kannst du weiterteilen.'],
    steps: [
      ...(b[1] > 0 ? [`Verschiebe das Komma: ${show(a)} : ${show(b)} = ${fmt(val(a) * 10)} : ${b[0]}`] : []),
      `Die ersten Stellen: ${show(third)}…`,
      `Die dritte Stelle ist ${third[0] % 10}. Also rundest du ${third[0] % 10 >= 5 ? 'auf' : 'ab'}.`,
      `${show(a)} : ${show(b)} ${APPROX} ${show(rounded)}`,
    ],
    bugs: numberBugs(bugs, val(rounded)),
    praise,
    srText: speak(`Das Ergebnis endet nicht. Runde auf Hundertstel. ${expression}`),
    kmk: KMK,
  });
}

/** A Dividend and a Divisor whose quotient does not end. */
function notEnding(rng: Rng, decimalDivisor: boolean): [Dec, Dec] {
  return attempt<[Dec, Dec]>(() => {
    const b: Dec = decimalDivisor ? [rng.pick([3, 6, 7, 9]), 1] : [rng.pick([3, 6, 7, 9, 11]), 0];
    const a: Dec = decimalDivisor || rng.chance(0.5) ? [noEndZero(rng, 11, 98), 1] : [rng.int(4, 50), 0];
    // ends if every factor of the Divisor beyond 2 and 5 is in the Dividend
    const scaledA = a[0] * 10 ** (Math.max(a[1], b[1]) - a[1]);
    const scaledB = b[0] * 10 ** (Math.max(a[1], b[1]) - b[1]);
    return (scaledA * 10000) % scaledB !== 0 ? [a, b] : null;
  }, [[10, 0], [3, 0]]);
}

/** The price of one ticket from the price of all: a price per piece is a rounded number, so no sum has to come out in whole Cent. */
function shareStory(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const persons = rng.pick([3, 6, 7, 9]);
  const total = attempt(() => {
    const t = rng.int(10, 60) * 100 + rng.pick([0, 50]);
    return t % persons !== 0 ? t : null;
  }, 2500);
  const rounded = Math.floor((2 * total + persons) / (2 * persons));
  const cut = Math.floor(total / persons);
  const third = Math.floor((total * 10) / persons) % 10;
  const person = pickPerson(rng);
  const context = `${person.name} kauft für einen Ausflug ${persons} gleiche Fahrkarten. Zusammen kosten die Fahrkarten ${fmtMoney(total)}.`;
  const prompt = 'Wie viel Euro kostet eine Fahrkarte ungefähr, auf Cent gerundet?';
  return build(skill, stufe, {
    key: `ausflug:${total}:${persons}`,
    ab,
    context,
    prompt,
    answer: euroAnswer(rounded, { label: 'Preis für eine Fahrkarte' }),
    hints: [`Rechne ${fmtMoney(total)} : ${persons}.`, 'Cent sind 2 Stellen nach dem Komma. Die dritte Stelle entscheidet.'],
    steps: [`${fmt(total / 100, 2)} : ${persons} = ${show(cutQuotient([total, 2], [persons, 0], 3))}…`, `Die dritte Stelle ist ${third}. Also rundest du ${third >= 5 ? 'auf' : 'ab'}.`, `Eine Fahrkarte kostet ungefähr ${fmtMoney(rounded)}.`],
    bugs: numberBugs([third >= 5 && { id: 'runden-abschneiden', match: cut / 100, hint: `Schau auf die nächste Stelle. Eine ${third} bedeutet: aufrunden.` }], rounded / 100),
    praise: 'Du hast geteilt und passend zum Geld gerundet.',
    srText: speak(`${context} ${prompt}`),
    kmk: [...KMK, 'PK.modellieren'],
  });
}

const CANS: readonly { goods: string; content: string; amounts: readonly Dec[] }[] = [
  { goods: 'Flaschen', content: 'Saft', amounts: [[75, 2], [15, 1], [33, 2]] },
  { goods: 'Dosen', content: 'Farbe', amounts: [[25, 2], [75, 2], [12, 1]] },
];

/** How many whole bottles fill or fit: the story says whether up or down. */
function wholeStory(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const person = pickPerson(rng);
  const up = rng.chance(0.5);
  const { goods, content, amounts } = rng.pick(CANS);
  const each = rng.pick(amounts);
  const total = attempt<Dec>(() => {
    const t: Dec = [rng.int(21, 99), 1];
    const q = Math.floor((t[0] * 10 ** each[1]) / (each[0] * 10));
    const rest = (t[0] * 10 ** each[1]) % (each[0] * 10);
    return rest !== 0 && q >= 2 ? t : null;
  }, [75, 1]);
  const down = Math.floor((total[0] * 10 ** each[1]) / (each[0] * 10));
  const value = up ? down + 1 : down;
  const context = up
    ? `${person.name} braucht ${fmtQty(val(total), 'l')} ${content}. In einer Packung sind ${fmtQty(val(each), 'l')}.`
    : `${person.name} hat ${fmtQty(val(total), 'l')} ${content}. ${person.name} füllt alles in ${goods} zu je ${fmtQty(val(each), 'l')}.`;
  const prompt = up ? `Wie viele Packungen kauft ${person.name} mindestens?` : `Wie viele ${goods} werden ganz voll?`;
  return build(skill, stufe, {
    key: `ganz:${show(total)}:${show(each)}:${up ? 'auf' : 'ab'}`,
    ab,
    context,
    prompt,
    answer: numberAnswer(value, { unit: up ? 'Packungen' : goods, label: 'Die Anzahl' }),
    hints: [`Rechne ${show(total)} : ${show(each)}.`, up ? 'Reicht die Menge, wenn du abrundest?' : `Nur ganz volle ${goods} zählen hier.`],
    steps: [quotientStep(total, each), up ? 'Eine Packung weniger reicht nicht. Du rundest auf.' : 'Der Rest füllt nichts mehr ganz. Du rundest ab.', `Die Anzahl ist ${value}.`],
    bugs: numberBugs([{ id: 'nach-regel-gerundet', match: up ? down : down + 1, hint: up ? 'So reicht die Menge noch nicht. Hier hilft nur aufrunden.' : 'Die letzte ist nicht ganz voll. Hier hilft nur abrunden.' }], value),
    praise: up ? 'Du hast passend zur Geschichte aufgerundet.' : 'Du hast passend zur Geschichte abgerundet.',
    srText: speak(`${context} ${prompt}`),
    kmk: [...KMK, 'PK.modellieren'],
  });
}

function generate(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  if (stufe === 1) {
    if (ab === 1) {
      if (rng.chance(0.5)) return byPower(stufe, ab, [noEndZero(rng, 101, 998), 1], 1, 'Du hast das Komma um eine Stelle nach links gerückt.');
      return byDigitHead(rng, stufe, ab);
    }
    if (ab === 2) {
      if (rng.chance(0.5)) return writtenByDigit(rng, stufe, ab);
      return byPower(stufe, ab, [noEndZero(rng, 11, 98), 1], 2, 'Du hast die Nullen gezählt und das Komma gerückt.');
    }
    return missingDividend(rng, stufe, ab);
  }
  if (stufe === 2) {
    if (ab === 1) return bothOneDecimal(rng, stufe, ab);
    if (ab === 2) return shiftAndDivide(rng, stufe, ab);
    return rng.chance(0.6) ? howManyStory(rng, stufe, ab) : compareWithDividend(rng, stufe, ab);
  }
  if (ab === 1) {
    const [a, b] = notEnding(rng, false);
    return roundedItem(stufe, ab, a, b, 'Du hast weitergeteilt und auf Hundertstel gerundet.');
  }
  if (ab === 2) {
    if (rng.chance(0.5)) return shareStory(rng, stufe, ab);
    const [a, b] = notEnding(rng, true);
    return roundedItem(stufe, ab, a, b, 'Du hast das Komma verschoben und dann gerundet.');
  }
  return wholeStory(rng, stufe, ab);
}

const skill: SkillDef = {
  id: 'dezimal.geteilt',
  topicId: 'dezimal',
  title: 'Dezimalzahlen dividieren',
  description: 'Du teilst Dezimalzahlen und verschiebst das Komma.',
  stufen: {
    1: 'Durch 10, 100 oder eine Ziffer; das Ergebnis endet',
    2: 'Divisor mit einer Stelle: 0,8 : 0,2',
    3: 'Das Ergebnis endet nicht, du rundest; Geschichten',
  },
  kmk: KMK,
  keys: KEYS,
  generate: (rng, stufe, ctx) => generate(rng, stufe, targetAb(rng, stufe, ctx)),
};
export default skill;
