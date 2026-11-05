/**
 * Dezimalzahlen runden.
 * Stufe 1: to whole numbers, from one decimal. Stufe 2: to Zehntel or Hundertstel, also over a 9 (2,96 to 3,0). Stufe 3: sensible rounding: price, length, Überschlag.
 */
import { APPROX, fmt, fmtMoney, fmtQty, speak } from '../../core/format';
import type { Ab, Bug, ChoiceOption, Exercise, Rng, SkillDef, Stufe, VisualOf } from '../../core/types';
import { build, makeChoice, numberBugs, pickPerson, targetAb } from '../shared';
import { attempt, cutDec, cutQuotient, euroAnswer, fracOf, KEYS, numberAnswer, quotientStep, roundDec, roundedQuotient, show, val, wholeOf, type Dec } from './helpers';

const KMK = ['ZO.dezimal-darstellen'];
const NAMES = ['Zehntel', 'Hundertstel'] as const;

/** The digit that decides, the first one that is cut off. */
const deciding = (d: Dec, to: number) => Number(fracOf(d)[to]);

/** Two bugs of the deciding digit: cut off although it rounds up, or up although it rounds down. */
function directionBug(d: Dec, to: number): Bug {
  const digit = deciding(d, to);
  const cut = cutDec(d, to);
  return digit >= 5
    ? { id: 'runden-abschneiden', match: val(cut), hint: `Schau auf die nächste Stelle. Eine ${digit} bedeutet: aufrunden.` }
    : { id: 'aufgerundet', match: val([cut[0] + 1, to]), hint: `Schau auf die nächste Stelle. Eine ${digit} bedeutet: abrunden.` };
}

/** The piece of the line around the number, with an arrow on it. */
function around(d: Dec, to: number): VisualOf<'numberLine'> {
  const denominator = 10 ** d[1];
  const min = cutDec(d, to)[0] * 10 ** (d[1] - to);
  const max = min + 10 ** (d[1] - to);
  return { type: 'numberLine', min, max, majorStep: max - min === 10 ? 5 : max - min, minorStep: 1, labelMajor: false, labels: [min, max], marks: [{ value: d[0], label: fmt(val(d)) }], denominator, labelFormat: 'decimal' };
}

/** The picture of around() in words, for srText. It names the line, so describe.ts adds nothing, and speak() says the digits one by one (T20). */
function aroundWords(d: Dec, to: number): string {
  const v = around(d, to);
  const shown = (n: number) => fmt(n / 10 ** d[1]);
  return `Zahlenstrahl von ${shown(v.min)} bis ${shown(v.max)}. Der Pfeil steht bei ${fmt(val(d))}.`;
}

function toWhole(stufe: Stufe, ab: Ab, d: Dec, withLine: boolean): Exercise {
  const rounded = roundDec(d, 0);
  const expression = `${show(d)} ${APPROX} □`;
  const digit = deciding(d, 0);
  return build(skill, stufe, {
    key: `ganz:${show(d)}`,
    ab,
    prompt: 'Runde auf eine ganze Zahl.',
    expression,
    ...(withLine ? { visual: around(d, 0) } : {}),
    answer: numberAnswer(val(rounded), { label: 'Die gerundete Zahl' }),
    hints: ['Schau auf die erste Stelle nach dem Komma.', 'Bei 0 bis 4 rundest du ab, bei 5 bis 9 auf.'],
    steps: [`Die erste Stelle nach dem Komma ist ${digit}.`, `Bei ${digit} rundest du ${digit >= 5 ? 'auf' : 'ab'}.`, `${show(d)} ${APPROX} ${fmt(val(rounded))}`],
    bugs: numberBugs([directionBug(d, 0)], val(rounded)),
    praise: 'Du hast auf die Stelle nach dem Komma geschaut.',
    srText: speak(`Runde ${show(d)} auf eine ganze Zahl.${withLine ? ` ${aroundWords(d, 0)}` : ''}`),
    kmk: KMK,
  });
}

/** 'Du rundest auf ganze Zahlen und erhältst 5. Welche Zahl kann es sein?' */
function fromRounded(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const t = rng.int(2, 20);
  const right: Dec = rng.chance(0.5) ? [t * 10 - rng.int(1, 5), 1] : [t * 10 + rng.int(1, 4), 1];
  const below: Dec = [t * 10 - rng.int(6, 9), 1];
  const above: Dec = [t * 10 + rng.int(5, 9), 1];
  const far: Dec = [(t + 1) * 10 + rng.int(1, 4), 1];
  const why = (d: Dec): ChoiceOption => ({ label: show(d), whyWrong: `Runde ${show(d)} einmal. Du erhältst ${fmt(val(roundDec(d, 0)))}.` });
  const prompt = `Du rundest eine Zahl auf ganze Zahlen und erhältst ${t}. Welche Zahl kann es sein?`;
  return build(skill, stufe, {
    key: `zurueck:${t}:${show(right)}`,
    ab,
    prompt,
    answer: makeChoice(rng, { label: show(right) }, [why(below), why(above), why(far)]),
    hints: ['Runde jede Zahl zur Probe.', `Welche Zahl liegt nah genug an ${t}?`],
    steps: [`Runde die Zahl ${show(right)}: Die erste Stelle nach dem Komma ist ${fracOf(right)}.`, `${show(right)} ${APPROX} ${t}`],
    praise: 'Du hast jede Zahl zur Probe gerundet.',
    srText: speak(prompt),
    kmk: KMK,
  });
}

function toPlace(stufe: Stufe, ab: Ab, d: Dec, to: 1 | 2, withLine: boolean): Exercise {
  const rounded = roundDec(d, to);
  const digit = deciding(d, to);
  const expression = `${show(d)} ${APPROX} □`;
  const name = NAMES[to - 1];
  return build(skill, stufe, {
    key: `stelle:${show(d)}:${to}`,
    ab,
    prompt: `Runde auf ${name}.`,
    expression,
    ...(withLine ? { visual: around(d, to) } : {}),
    answer: numberAnswer(val(rounded), { label: 'Die gerundete Zahl' }),
    hints: [`Finde die ${name}. Schau auf die Stelle direkt dahinter.`, 'Bei 0 bis 4 rundest du ab, bei 5 bis 9 auf.'],
    steps: [`Die Stelle hinter den ${name === 'Zehntel' ? 'Zehnteln' : 'Hundertsteln'} ist ${digit}.`, `Bei ${digit} rundest du ${digit >= 5 ? 'auf' : 'ab'}.`, `${show(d)} ${APPROX} ${show(rounded)}`],
    bugs: numberBugs(
      [
        directionBug(d, to),
        { id: 'nicht-gerundet', match: val(d), hint: `Das ist die Zahl selbst. Die Zahl soll auf ${name} enden.` },
        { id: 'falsche-stelle', match: val(roundDec(d, to - 1)), hint: `Gefragt ist das Runden auf ${name}. Prüfe die Stelle.` },
      ],
      val(rounded),
    ),
    praise: 'Du hast auf die Stelle dahinter geschaut.',
    srText: speak(`Runde ${show(d)} auf ${name}.${withLine ? ` ${aroundWords(d, to)}` : ''}`),
    kmk: KMK,
  });
}

/**
 * 2,96 to 3,0: the end zero is what the place asks for. A number answer compares values and writes the fewest places, so it would take 3 and show 3: here the child taps the
 * written form, and 3 next to 3,0 is a mistake with its own answer (§6 "2,96 to 3,0").
 */
function overNine(rng: Rng, stufe: Stufe, ab: Ab, d: Dec, to: 1 | 2): Exercise {
  const rounded = roundDec(d, to);
  const digit = deciding(d, to);
  const name = NAMES[to - 1];
  const coarser = fmt(val(rounded), to - 1);
  const nine = `${wholeOf(d)},${fracOf(d).slice(0, to - 1)}10`;
  const wrongs: ChoiceOption[] = [
    { label: show(cutDec(d, to)), whyWrong: `Schau auf die nächste Stelle. Eine ${digit} bedeutet: aufrunden.` },
    { label: nine, whyWrong: 'Eine 9 und 1 mehr passen nicht in eine Stelle. Die Stelle davor wird größer.' },
    { label: coarser, whyWrong: `Auf ${name} gerundet hat die Zahl ${to} ${to === 1 ? 'Stelle' : 'Stellen'} nach dem Komma. Auch eine 0 bleibt stehen.` },
  ];
  return build(skill, stufe, {
    key: `neun:${show(d)}:${to}`,
    ab,
    prompt: `Runde auf ${name}.`,
    expression: `${show(d)} ${APPROX} □`,
    answer: makeChoice(rng, { label: show(rounded) }, wrongs),
    hints: [`Finde die ${name}. Schau auf die Stelle direkt dahinter.`, 'Eine 9 und 1 mehr passen nicht in eine Stelle. Das ändert die Stelle davor.'],
    steps: [`Die Stelle hinter den ${name === 'Zehntel' ? 'Zehnteln' : 'Hundertsteln'} ist ${digit}.`, `Bei ${digit} rundest du auf. Die 9 wird zu 0, und die Stelle davor wird größer.`, `${show(d)} ${APPROX} ${show(rounded)}`],
    praise: 'Du hast beim Aufrunden die Stelle davor mitgeändert.',
    srText: speak(`Runde ${show(d)} auf ${name}.`),
    kmk: KMK,
  });
}

/** A number whose rounded digit does not change over a 9, and does not end in 0: the answer shows the place it is rounded to, and rounding to another place gives another value. */
function plainForPlace(rng: Rng, to: 1 | 2): Dec {
  return attempt<Dec>(() => {
    const w = rng.int(1, 20);
    const front = to === 1 ? rng.int(0, 8) : rng.int(0, 9) * 10 + rng.int(0, 8);
    const d: Dec = [w * 10 ** (to + 1) + front * 10 + rng.int(1, 9), to + 1];
    return roundDec(d, to)[0] % 10 !== 0 ? d : null;
  }, to === 1 ? [234, 2] : [2342, 3]);
}

/** 2,96 or 3,996: rounding up changes the place before, too. */
function carryForPlace(rng: Rng, to: 1 | 2): Dec {
  const w = rng.int(1, 20);
  return to === 1 ? [w * 100 + 90 + rng.int(5, 9), 2] : [w * 1000 + rng.pick([0, 1, 3, 5, 9]) * 100 + 90 + rng.int(5, 9), 3];
}

/** 'Wie heißt die kleinste mögliche Zahl?' The way back from a rounded number. */
function extremeBefore(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const t = rng.int(11, 98) + (rng.chance(0.5) ? 0 : 100);
  const target: Dec = [t % 10 === 0 ? t + 1 : t, 1];
  const low = rng.chance(0.5);
  const value: Dec = [target[0] * 10 + (low ? -5 : 4), 2];
  const word = low ? 'kleinste' : 'größte';
  const context = `Eine Zahl hat 2 Stellen nach dem Komma. Auf Zehntel gerundet ist die Zahl ${show(target)}.`;
  const prompt = `Wie heißt die ${word} mögliche Zahl?`;
  return build(skill, stufe, {
    key: `grenze:${show(target)}:${word}`,
    ab,
    context,
    prompt,
    answer: numberAnswer(val(value), { label: 'Die Zahl' }),
    hints: ['Probiere Zahlen mit 2 Stellen nach dem Komma.', low ? 'Ab welcher Hundertstel-Ziffer rundest du auf?' : 'Bis zu welcher Hundertstel-Ziffer rundest du ab?'],
    steps: [`Auf Zehntel gerundet heißt die Zahl ${show(target)}.`, low ? 'Ab einer 5 rundest du auf.' : 'Bis zur 4 rundest du ab.', `Die ${word} Zahl ist ${show(value)}.`],
    bugs: numberBugs(
      [
        { id: 'nicht-gerundet', match: val(target), hint: 'Das ist die gerundete Zahl. Gesucht ist die Zahl davor.' },
        { id: 'grenze-daneben', match: val([value[0] + (low ? -1 : 1), 2]), hint: `Runde diese Zahl zur Probe. Du erhältst nicht ${show(target)}.` },
      ],
      val(value),
    ),
    praise: 'Du hast die Grenze des Rundens gefunden.',
    srText: speak(`${context} ${prompt}`),
    kmk: KMK,
  });
}

// ─── Stufe 3: sinnvoll runden ────────────────────────────────────────────────

const PACKS = [
  { pieces: 'Heften', one: 'ein Heft' },
  { pieces: 'Filzstiften', one: 'ein Filzstift' },
  { pieces: 'Klebestiften', one: 'ein Klebestift' },
];

/** The price of one piece of a pack: a price per piece is a rounded number, so no sum has to come out in whole Cent. */
function moneyShare(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const { pieces, one } = rng.pick(PACKS);
  const count = rng.pick([3, 6, 7, 9]);
  const total = attempt(() => {
    const t = rng.int(5, 25) * 100;
    return t % count !== 0 ? t : null;
  }, 1000);
  const ten = Math.floor((total * 100) / count);
  const display = `${Math.floor(ten / 10000)},${String(ten % 10000).padStart(4, '0')}`;
  const rounded = Math.floor((2 * total + count) / (2 * count));
  const cut = Math.floor(total / count);
  const third = Math.floor((total * 10) / count) % 10;
  const context = `Eine Packung mit ${count} ${pieces} kostet ${fmtMoney(total)}. Der Taschenrechner zeigt ${display}.`;
  const prompt = `Wie viel Euro kostet ${one} ungefähr, auf Cent gerundet?`;
  return build(skill, stufe, {
    key: `teilen:${total}:${count}:${pieces}`,
    ab,
    context,
    prompt,
    answer: euroAnswer(rounded, { label: 'Preis für ein Stück' }),
    hints: ['Cent sind Hundertstel. Du brauchst 2 Stellen nach dem Komma.', 'Schau auf die dritte Stelle nach dem Komma.'],
    steps: ['Cent sind 2 Stellen nach dem Komma.', `Die dritte Stelle ist ${third}. Also rundest du ${third >= 5 ? 'auf' : 'ab'}.`, `Ein Stück kostet ungefähr ${fmtMoney(rounded)}.`],
    bugs: numberBugs(
      [
        third >= 5 && { id: 'runden-abschneiden', match: cut / 100, hint: `Schau auf die nächste Stelle. Eine ${third} bedeutet: aufrunden.` },
        { id: 'falsche-stelle', match: Math.round(total / count / 100), hint: 'Beim Preis rechnest du auf Cent genau. Das sind 2 Stellen.' },
      ],
      rounded / 100,
    ),
    praise: 'Du hast auf Cent gerundet, wie es beim Geld passt.',
    srText: speak(`${context} ${prompt}`),
    kmk: KMK,
  });
}

/** What the Klasse 6b measures, and the metres such a thing has. */
const MEASURED = [
  { thing: 'den Flur', min: 12, max: 40 },
  { thing: 'die Turnhalle', min: 20, max: 45 },
  { thing: 'den Schulhof', min: 30, max: 80 },
  { thing: 'die Laufbahn', min: 50, max: 110 },
  { thing: 'den Weg zum Bus', min: 80, max: 250 },
];

/** The rounded length does not end in 0, so the answer shows its 2 places, and rounding to Zehntel gives another value. */
function lengthRound(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const { thing, min, max } = rng.pick(MEASURED);
  const d = attempt<Dec>(() => {
    const out: Dec = [rng.int(min, max) * 1000 + rng.int(1, 99) * 10 + rng.int(1, 9), 3];
    return roundDec(out, 2)[0] % 10 !== 0 ? out : null;
  }, [min * 1000 + 123, 3]);
  const rounded = roundDec(d, 2);
  const context = `Die Klasse 6b misst ${thing}. Das Messgerät zeigt ${fmtQty(val(d), 'm')}.`;
  const prompt = 'Runde auf ganze Zentimeter. Wie viele Meter sind das?';
  return build(skill, stufe, {
    key: `laenge:${show(d)}`,
    ab,
    context,
    prompt,
    answer: numberAnswer(val(rounded), { unit: 'm', label: 'Länge in Metern' }),
    hints: ['1 cm ist 0,01 m. Das ist die zweite Stelle nach dem Komma.', 'Schau auf die dritte Stelle nach dem Komma.'],
    steps: ['1 cm ist 0,01 m. Du brauchst also 2 Stellen nach dem Komma.', `Die dritte Stelle ist ${deciding(d, 2)}.`, `Auf Zentimeter genau: ${fmtQty(val(rounded), 'm', 2)}`],
    bugs: numberBugs(
      [
        directionBug(d, 2),
        { id: 'falsche-stelle', match: val(roundDec(d, 1)), hint: '1 cm ist 0,01 m. Du brauchst 2 Stellen nach dem Komma.' },
        { id: 'einheit-gewechselt', match: rounded[0], hint: 'Das sind Zentimeter. Gefragt ist die Länge in Metern.' },
      ],
      val(rounded),
    ),
    praise: 'Du hast die Stelle passend zu den Zentimetern gewählt.',
    srText: speak(`${context} ${prompt}`),
    kmk: KMK,
  });
}

function estimate(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const mul = rng.chance(0.5);
  const places = mul ? 1 : 2;
  const pick = (): Dec => {
    const whole = rng.int(mul ? 2 : 3, mul ? 9 : 40);
    const frac = mul ? rng.int(1, 9) : rng.int(1, 99);
    return [whole * 10 ** places + frac, places];
  };
  const [a, b] = [pick(), pick()];
  const op = mul ? '·' : '+';
  const [ra, rb] = [val(roundDec(a, 0)), val(roundDec(b, 0))];
  const [ca, cb] = [val(cutDec(a, 0)), val(cutDec(b, 0))];
  const value = mul ? ra * rb : ra + rb;
  const exact = mul ? (a[0] * b[0]) / 10 ** (places * 2) : (a[0] + b[0]) / 10 ** places;
  const expression = `${show(a)} ${op} ${show(b)} ${APPROX} □`;
  return build(skill, stufe, {
    key: `ueberschlag:${show(a)}:${op}:${show(b)}`,
    ab,
    prompt: 'Überschlage: Runde jede Zahl auf eine ganze Zahl und rechne.',
    expression,
    answer: numberAnswer(value, { label: 'Der Überschlag' }),
    hints: [`Runde ${show(a)} und ${show(b)} auf ganze Zahlen.`, 'Rechne dann mit den gerundeten Zahlen im Kopf.'],
    steps: [`${show(a)} ${APPROX} ${ra} und ${show(b)} ${APPROX} ${rb}`, `${ra} ${op} ${rb} = ${value}`, `Der Überschlag ist ${value}.`],
    bugs: numberBugs(
      [
        { id: 'genau-gerechnet', match: exact, hint: 'Beim Überschlag rechnest du nicht genau. Runde zuerst jede Zahl.' },
        { id: 'runden-abschneiden', match: mul ? ca * cb : ca + cb, hint: 'Du hast die Stellen abgeschnitten. Schau auf die erste Stelle nach dem Komma.' },
      ],
      value,
    ),
    praise: 'Du hast mit gerundeten Zahlen im Kopf gerechnet.',
    srText: speak(`Überschlage. Runde jede Zahl auf eine ganze Zahl. ${expression}`),
    kmk: ['ZO.dezimal-darstellen', 'ZO.dezimal-rechnen'],
  });
}

function enoughMoney(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const person = pickPerson(rng);
  const prices = [rng.int(101, 495), rng.int(101, 495), rng.int(101, 495)].map((c) => (c % 100 === 0 ? c + 5 : c));
  const total = prices.reduce((x, y) => x + y, 0);
  const estimateEuro = prices.map((c) => Math.round(c / 100));
  const sum = estimateEuro.reduce((x, y) => x + y, 0);
  const enough = rng.chance(0.5);
  const budget = enough ? Math.max(Math.ceil(total / 100), sum) + rng.int(1, 2) : Math.min(Math.floor(total / 100), sum) - rng.int(1, 2);
  const context = `${person.name} hat ${fmtMoney(budget * 100)}. ${person.name} kauft Hefte für ${fmtMoney(prices[0])}, Stifte für ${fmtMoney(prices[1])} und Kleber für ${fmtMoney(prices[2])}.`;
  const prompt = 'Reicht das Geld?';
  const [yes, no] = ['Ja, das Geld reicht.', 'Nein, das Geld reicht nicht.'];
  return build(skill, stufe, {
    key: `reicht:${prices.join(':')}:${budget}`,
    ab,
    context,
    prompt,
    answer: makeChoice(rng, { label: enough ? yes : no }, [{ label: enough ? no : yes, whyWrong: 'Runde die Preise auf ganze Euro. Addiere und vergleiche mit dem Geld.' }], { order: [yes, no] }),
    hints: ['Runde jeden Preis auf ganze Euro.', 'Addiere die gerundeten Preise. Vergleiche mit dem Geld.'],
    steps: [`Überschlag: ${estimateEuro.join(' + ')} = ${sum}`, `${person.name} hat ${budget} Euro.`, enough ? 'Das Geld reicht.' : 'Das Geld reicht nicht.'],
    praise: 'Dein Überschlag hat geholfen.',
    srText: speak(`${context} ${prompt}`),
    kmk: ['ZO.dezimal-darstellen', 'ZO.dezimal-rechnen', 'PK.modellieren'],
  });
}

/** Amounts in tenths: what one piece holds in the shop. A class needs up to 30 of the unit, so each of these is a real amount for a class. */
const THINGS = [
  { noun: 'Packungen', dative: 'Packungen', stuff: 'Saft', unit: 'l', event: 'Für das Schulfest', inOne: 'In einer Packung sind', sizes: [12, 15] },
  { noun: 'Rollen', dative: 'Rollen', stuff: 'Papier', unit: 'm', event: 'Für die Bastelstunde', inOne: 'Auf einer Rolle sind', sizes: [15, 25, 35] },
  { noun: 'Eimer', dative: 'Eimern', stuff: 'Farbe', unit: 'l', event: 'Für die Schulhof-Wand', inOne: 'In einem Eimer sind', sizes: [25, 35] },
  { noun: 'Säcke', dative: 'Säcken', stuff: 'Kartoffeln', unit: 'kg', event: 'Für die Klassenfahrt', inOne: 'In einem Sack sind', sizes: [15, 25] },
];

/** 17 l in Packungen zu 1,5 l: 11,33. The number comes from a division, then the rule says down and the story says up. */
function roundUpStory(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const { noun, dative, stuff, unit, event, inOne, sizes } = rng.pick(THINGS);
  // total and each in tenths; the rest is below half of a pack, so the rule rounds down
  const [total, each] = attempt<[number, number]>(() => {
    const e = rng.pick(sizes);
    const t = rng.int(3, 30) * 10;
    const rest = t % e;
    return rest > 0 && 2 * rest < e && t >= 2 * e ? [t, e] : null;
  }, [170, 15]);
  const down = Math.floor(total / each);
  const [a, b]: [Dec, Dec] = [[total / 10, 0], [each, 1]];
  const totalText = fmt(total / 10);
  const eachText = fmt(each / 10);
  const context = `${event} braucht die Klasse 6b ${totalText} ${unit} ${stuff}. ${inOne} ${eachText} ${unit}.`;
  const prompt = `Wie viele ${noun} kauft die Klasse?`;
  return build(skill, stufe, {
    key: `auf:${totalText}:${eachText}:${noun}`,
    ab,
    context,
    prompt,
    answer: numberAnswer(down + 1, { unit: noun, label: `Anzahl der ${noun}` }),
    hints: [`Rechne ${totalText} : ${eachText}.`, 'Reicht die Menge, wenn du abrundest?'],
    steps: [quotientStep(a, b), `${down} ${noun} reichen nicht. Im Laden gibt es nur ganze Stücke.`, `Die Klasse kauft ${down + 1} ${noun}.`],
    bugs: numberBugs(
      [
        { id: 'nach-regel-gerundet', match: down, hint: `Mit ${down} ${dative} fehlt noch etwas. Hier hilft nur aufrunden.` },
        { id: 'nicht-gerundet', match: val(roundedQuotient(a, b, 2)), hint: 'Im Laden gibt es nur ganze Stücke. Runde noch.' },
        { id: 'nicht-gerundet', match: val(cutQuotient(a, b, 2)), hint: 'Im Laden gibt es nur ganze Stücke. Runde noch.' },
      ],
      down + 1,
    ),
    praise: 'Du hast passend zur Geschichte aufgerundet.',
    srText: speak(`${context} ${prompt}`),
    kmk: ['ZO.dezimal-darstellen', 'PK.modellieren'],
  });
}

/** 5,6 Hefte: the rule says up, the story says down. */
function roundDownStory(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const person = pickPerson(rng);
  const [price, money] = attempt<[number, number]>(() => {
    const p = rng.int(11, 39) * 10;
    const m = rng.int(5, 20) * 100;
    const fifths = Math.floor((m * 10) / p) % 10;
    return fifths >= 5 && m % p !== 0 && m >= 2 * p ? [p, m] : null;
  }, [130, 750]);
  const down = Math.floor(money / price);
  const context = `Ein Heft kostet ${fmtMoney(price)}. ${person.name} hat ${fmtMoney(money)}.`;
  const prompt = `Wie viele Hefte kann ${person.name} kaufen?`;
  return build(skill, stufe, {
    key: `ab:${price}:${money}`,
    ab,
    context,
    prompt,
    answer: numberAnswer(down, { unit: 'Hefte', label: 'Anzahl der Hefte' }),
    hints: [`Rechne ${fmtMoney(money)} : ${fmtMoney(price)}.`, 'Kann man ein halbes Heft kaufen?'],
    steps: [quotientStep([money, 2], [price, 2]), 'Für ein weiteres Heft reicht das Geld nicht.', `${person.name} kann ${down} Hefte kaufen.`],
    bugs: numberBugs([{ id: 'nach-regel-gerundet', match: down + 1, hint: 'Für das letzte Heft reicht das Geld nicht. Hier hilft nur abrunden.' }], down),
    praise: 'Du hast passend zur Geschichte abgerundet.',
    srText: speak(`${context} ${prompt}`),
    kmk: ['ZO.dezimal-darstellen', 'PK.modellieren'],
  });
}

function generate(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  if (stufe === 1) {
    const withoutZero = (n: number) => (n % 10 === 0 ? n + rng.int(1, 9) : n);
    if (ab === 1) return toWhole(stufe, ab, [withoutZero(rng.int(11, 99)), 1], true);
    if (ab === 2) return toWhole(stufe, ab, [withoutZero(rng.int(100, 998)), 1], false);
    return fromRounded(rng, stufe, ab);
  }
  if (stufe === 2) {
    const to = rng.pick<1 | 2>([1, 2]);
    if (ab === 1) return toPlace(stufe, ab, plainForPlace(rng, to), to, true);
    if (ab === 2) return rng.chance(0.5) ? overNine(rng, stufe, ab, carryForPlace(rng, to), to) : toPlace(stufe, ab, plainForPlace(rng, to), to, false);
    return extremeBefore(rng, stufe, ab);
  }
  if (ab === 1) return rng.chance(0.5) ? moneyShare(rng, stufe, ab) : lengthRound(rng, stufe, ab);
  if (ab === 2) return rng.chance(0.6) ? estimate(rng, stufe, ab) : enoughMoney(rng, stufe, ab);
  return rng.chance(0.5) ? roundUpStory(rng, stufe, ab) : roundDownStory(rng, stufe, ab);
}

const skill: SkillDef = {
  id: 'dezimal.runden',
  topicId: 'dezimal',
  title: 'Dezimalzahlen runden',
  description: 'Du rundest auf die passende Stelle.',
  stufen: {
    1: 'Auf ganze Zahlen, eine Stelle nach dem Komma',
    2: 'Auf Zehntel oder Hundertstel, auch 2,96 auf 3,0',
    3: 'Sinnvoll runden: Preis, Länge, Überschlag',
  },
  kmk: KMK,
  keys: KEYS,
  generate: (rng, stufe, ctx) => generate(rng, stufe, targetAb(rng, stufe, ctx)),
};
export default skill;
