/**
 * Dezimalzahlen addieren und subtrahieren.
 * Stufe 1: same number of decimals, up to 100, no carry over the comma. Stufe 2: different lengths (3,5 + 1,25), with carry. Stufe 3: three numbers, Überschlag first, money stories.
 */
import { fmtMoney, speak } from '../../core/format';
import type { Ab, Bug, Exercise, GenContext, Rng, SkillDef, Stufe, SubtractionMethod } from '../../core/types';
import { alignedOperands, digitAt, layoutSub, placeNameAt } from '../../core/written';
import { build, numberBugs, pickPerson, targetAb, writtenDecimal } from '../shared';
import { attempt, euroAnswer, KEYS, numberAnswer, scaled, show, solved, val, type Dec } from './helpers';

const KMK = ['ZO.dezimal-rechnen'];
// WrittenInput stands the numbers comma under comma and fills the end zeros, so a written item neither asks for that nor praises it.
const WRITE = 'Rechne schriftlich.';
const COMMA_HINT = 'Komma steht unter Komma. Rechne jede Spalte für sich.';
const COMMA_STEP = 'Komma steht unter Komma. Rechne von rechts.';

/** The words of a written subtraction, by the method set on the page for adults (never mixed): every hint, step and praise of a written minus task comes from here. */
const SUBTRACT: Record<SubtractionMethod, { hint: string; smaller: string; noReduce: string; done: string }> = {
  abziehen: {
    hint: 'Rechne Stelle für Stelle von rechts nach links.',
    smaller: 'Rechne immer oben minus unten. Reicht die obere Ziffer nicht, hol dir 1 von links.',
    noReduce: 'Du hast 1 von links geholt. Dort steht danach 1 weniger.',
    done: 'gerechnet',
  },
  ergaenzen: {
    hint: 'Ergänze Stelle für Stelle von rechts: von der unteren bis zur oberen Ziffer.',
    smaller: 'Ergänze von unten nach oben. Reicht es nicht: oben 10 dazu, 1 merken.',
    noReduce: 'Denk an die gemerkte 1. Zähle die 1 unten zur nächsten Ziffer dazu.',
    done: 'ergänzt',
  },
};

type Op = 'add' | 'sub';
const SIGN = { add: '+', sub: '−' } as const;

/** Digit by digit, without a carry: the mistake of a child who writes the last digit only. */
function noCarrySum(...numbers: number[]): number {
  let out = 0;
  for (let p = 0, f = 1; p < 8; p++, f *= 10) out += (numbers.reduce((sum, n) => sum + digitAt(n, p), 0) % 10) * f;
  return out;
}

/** Digit by digit, the smaller digit from the larger one. */
function smallerFromLarger(a: number, b: number): number {
  let out = 0;
  for (let p = 0, f = 1; p < 8; p++, f *= 10) out += Math.abs(digitAt(a, p) - digitAt(b, p)) * f;
  return out;
}

/** Digit by digit with the 10 where it does not fit, and the next place never told: 1 from the left is not taken off, or the gemerkte 1 is not added. */
function withoutReduce(a: number, b: number): number {
  let out = 0;
  for (let p = 0, f = 1; p < 8; p++, f *= 10) out += ((digitAt(a, p) - digitAt(b, p) + 10) % 10) * f;
  return out;
}

/** One column in the Sprechweise of the method: the first that needs the 10, else the one on the right. x and y are aligned, in units of `places`. */
function columnStep(x: number, y: number, places: number, method: SubtractionMethod): string {
  const { columns } = layoutSub(x, y, method);
  const column = columns.find((c) => c.regrouped || c.extended) ?? columns[0];
  const name = placeNameAt(column.place, places);
  const below = column.b ?? 0;
  if (method === 'ergaenzen') {
    const top = column.extended ? column.a + 10 : column.a;
    return `${name}: Von ${below} bis ${top} ${column.r === 1 ? 'fehlt' : 'fehlen'} ${column.r}.${column.extended ? ' Merke dir 1.' : ''}`;
  }
  return column.regrouped
    ? `${name}: ${column.before} minus ${below} geht nicht. Hol dir 1 von links: ${column.top} minus ${below} gleich ${column.r}.`
    : `${name}: ${column.before} minus ${below} gleich ${column.r}.`;
}

const hasCarry = (a: number, b: number) => noCarrySum(a, b) !== a + b;

/** Places below the comma: a carry from the Zehntel to the Einer goes over the comma. */
function carriesOverComma(a: number, b: number, places: number): boolean {
  const f = 10 ** places;
  return (a % f) + (b % f) >= f;
}

function writtenItem(stufe: Stufe, ab: Ab, op: Op, a: Dec, b: Dec, method: SubtractionMethod, bugs: (Bug | false)[], praise: string, prompt = WRITE): Exercise {
  const answer = writtenDecimal(op, [a[0], b[0]], [a[1], b[1]], op === 'sub' ? { method } : {});
  const places = Math.max(a[1], b[1]);
  const result: Dec = [answer.result, places];
  const term = `${show(a)} ${SIGN[op]} ${show(b)}`;
  const [x, y] = alignedOperands([a[0], b[0]], [a[1], b[1]]);
  return build(skill, stufe, {
    key: `schriftlich:${term}`,
    ab,
    prompt,
    answer,
    hints: [a[1] === b[1] ? 'Das Komma steht schon untereinander. Beginne ganz rechts.' : 'Die Nullen am Ende füllen die kürzere Zahl auf. Beginne ganz rechts.', op === 'sub' ? SUBTRACT[method].hint : 'Rechne Stelle für Stelle von rechts nach links.'],
    steps: [{ text: COMMA_STEP, visual: solved(op, [a[0], b[0]], [a[1], b[1]], op === 'sub' ? method : undefined) }, ...(op === 'sub' ? [columnStep(x, y, places, method)] : []), `${term} = ${show(result)}`],
    bugs: numberBugs(bugs, val(result)),
    praise,
    srText: speak(`Rechne schriftlich: ${term}.`),
    kmk: KMK,
  });
}

function rightAlignedBug(a: Dec, b: Dec, op: Op): Bug | false {
  const places = Math.max(a[1], b[1]);
  const wrong = op === 'add' ? a[0] + b[0] : a[0] - b[0];
  return a[1] !== b[1] && wrong > 0 && { id: 'komma-rechtsbuendig', match: wrong / 10 ** places, hint: COMMA_HINT };
}

function differenceBugs(a: Dec, b: Dec, op: Op, method: SubtractionMethod): (Bug | false)[] {
  const places = Math.max(a[1], b[1]);
  const [x, y] = alignedOperands([a[0], b[0]], [a[1], b[1]]);
  return op === 'add'
    ? [hasCarry(x, y) && { id: 'ohne-uebertrag', match: noCarrySum(x, y) / 10 ** places, hint: 'Denk an den Übertrag: 10 in einer Stelle sind 1 in der Stelle davor.' }]
    : [
        { id: 'kleinere-ziffer', match: smallerFromLarger(x, y) / 10 ** places, hint: SUBTRACT[method].smaller },
        { id: 'nicht-vermindert', match: withoutReduce(x, y) / 10 ** places, hint: SUBTRACT[method].noReduce },
        { id: 'plus-statt-minus', match: (x + y) / 10 ** places, hint: 'Hier steht minus. Das Ergebnis ist kleiner als die obere Zahl.' },
      ];
}

function numberItem(stufe: Stufe, ab: Ab, op: Op, a: Dec, b: Dec, praise: string): Exercise {
  const places = Math.max(a[1], b[1]);
  const [x, y] = [scaled(a, places), scaled(b, places)];
  const result: Dec = [op === 'add' ? x + y : x - y, places];
  const expression = `${show(a)} ${SIGN[op]} ${show(b)} = □`;
  return build(skill, stufe, {
    key: `kopf:${show(a)}:${op}:${show(b)}`,
    ab,
    prompt: 'Rechne.',
    expression,
    answer: numberAnswer(val(result), { label: 'Das Ergebnis' }),
    hints: ['Rechne Zehntel mit Zehnteln und Hundertstel mit Hundertsteln.', 'Das Komma bleibt an seiner Stelle.'],
    steps: [`Rechne ohne Komma: ${x} ${SIGN[op]} ${y} = ${result[0]}`, `Setze das Komma wieder: ${places} ${places === 1 ? 'Stelle' : 'Stellen'} nach dem Komma.`, `${show(a)} ${SIGN[op]} ${show(b)} = ${show(result)}`],
    bugs: numberBugs(
      [
        { id: 'ohne-komma', match: result[0], hint: 'Das Komma bleibt an seiner Stelle. Setze es auch im Ergebnis.' },
        op === 'sub' && { id: 'plus-statt-minus', match: (x + y) / 10 ** places, hint: 'Hier steht minus. Das Ergebnis ist kleiner als die erste Zahl.' },
      ],
      val(result),
    ),
    praise,
    srText: speak(expression),
    kmk: KMK,
  });
}

/** '□ + 2,3 = 5,7', '8,6 − □ = 3,2', '□ − 1,4 = 2,5'. a + b = c, with all three shown as numbers of `places`. */
function missingItem(rng: Rng, stufe: Stufe, ab: Ab, a: Dec, b: Dec, praise: string): Exercise {
  const places = Math.max(a[1], b[1]);
  const [x, y] = [scaled(a, places), scaled(b, places)];
  const sum: Dec = [x + y, places];
  const form = rng.int(1, 3);
  const expression = form === 1 ? `□ + ${show(b)} = ${show(sum)}` : form === 2 ? `${show(sum)} − □ = ${show(a)}` : `□ − ${show(b)} = ${show(a)}`;
  const answerDec: Dec = form === 1 ? a : form === 2 ? b : sum;
  const line = form === 1 ? `${show(sum)} − ${show(b)} = ${show(a)}` : form === 2 ? `${show(sum)} − ${show(a)} = ${show(b)}` : `${show(a)} + ${show(b)} = ${show(sum)}`;
  const wrongOp = (form === 1 ? x + 2 * y : form === 2 ? 2 * x + y : x - y) / 10 ** places;
  return build(skill, stufe, {
    key: `luecke:${form}:${show(a)}:${show(b)}`,
    ab,
    prompt: 'Welche Zahl fehlt?',
    expression,
    answer: numberAnswer(val(answerDec), { label: 'Die fehlende Zahl' }),
    hints: ['Mit der Umkehraufgabe findest du die Zahl.', form === 3 ? 'Die Umkehrung von minus ist plus.' : 'Rechne die große Zahl minus die bekannte Zahl.'],
    steps: [`Rechne die Umkehraufgabe: ${line}`, `Die fehlende Zahl ist ${show(answerDec)}.`],
    bugs: numberBugs(
      [{ id: 'umkehr-gleiche-rechnung', match: wrongOp, hint: form === 3 ? 'Die fehlende Zahl ist die größte. Die Umkehrung von minus ist plus.' : 'Die fehlende Zahl ist kleiner als die große Zahl. Rechne minus.' }],
      val(answerDec),
    ),
    praise,
    srText: speak(`Welche Zahl fehlt? ${expression}`),
    kmk: KMK,
  });
}

// ─── Stufe 1 ─────────────────────────────────────────────────────────────────

/** Two numbers of the same places, sum up to 100, without any carry. */
function noCarryPair(rng: Rng): [Dec, Dec] {
  const places = rng.int(1, 2);
  const f = 10 ** places;
  return attempt<[Dec, Dec]>(() => {
    const x = rng.int(f + 1, 60 * f);
    const y = rng.int(f + 1, 30 * f);
    return hasCarry(x, y) || x % 10 === 0 || y % 10 === 0 ? null : [[x, places], [y, places]];
  }, [[34, 1], [25, 1]]);
}

/** Two numbers of 2 places with a carry below the comma, none over it. */
function innerCarryPair(rng: Rng): [Dec, Dec] {
  return attempt<[Dec, Dec]>(() => {
    const x = rng.int(101, 6000);
    const y = rng.int(101, 3000);
    const h = (x % 10) + (y % 10) >= 10;
    return h && !carriesOverComma(x, y, 2) && (x + y) % 10 !== 0 ? [[x, 2], [y, 2]] : null;
  }, [[237, 2], [125, 2]]);
}

// ─── Stufe 2 ─────────────────────────────────────────────────────────────────

/** Different lengths and a carry: 3,5 + 1,75. */
function differentLengths(rng: Rng): [Dec, Dec] {
  return attempt<[Dec, Dec]>(() => {
    const a: Dec = [rng.int(11, 400), 1];
    const b: Dec = [rng.int(101, 900), 2];
    const pair: [Dec, Dec] = rng.chance(0.5) ? [a, b] : [b, a];
    const [x, y] = [scaled(a, 2), scaled(b, 2)];
    return hasCarry(x, y) && a[0] % 10 !== 0 && b[0] % 10 !== 0 ? pair : null;
  }, [[35, 1], [175, 2]]);
}

/** A shorter Minuend and a borrow: 7,2 − 2,85. */
function shorterMinuend(rng: Rng): [Dec, Dec] {
  return attempt<[Dec, Dec]>(() => {
    const a: Dec = [rng.int(31, 500), 1];
    const b: Dec = [rng.int(101, 900), 2];
    const [x, y] = [scaled(a, 2), scaled(b, 2)];
    return x > y && a[0] % 10 !== 0 && b[0] % 10 !== 0 && smallerFromLarger(x, y) !== x - y ? [a, b] : null;
  }, [[72, 1], [285, 2]]);
}

/** 10 − 3,75: a whole number, with its comma only in the mind. */
function wholeMinus(rng: Rng, ctx: GenContext, stufe: Stufe, ab: Ab): Exercise {
  const w = rng.pick([5, 10, 20, 50]);
  const places = rng.int(1, 2);
  const f = 10 ** places;
  const y = attempt(() => {
    const v = rng.int(f + 1, Math.min(w, 20) * f - 1);
    return v % 10 !== 0 ? v : null;
  }, f + 5);
  const a: Dec = [w, 0];
  const b: Dec = [y, places];
  const whole = Math.floor(y / f);
  const frac = y % f;
  return writtenItem(
    stufe,
    ab,
    'sub',
    a,
    b,
    ctx.subtractionMethod,
    [{ id: 'ganze-ignoriert', match: (w - whole) + frac / f, hint: `${w} steht hier als ${show([w * f, places])}. Rechne Stelle für Stelle.` }, ...differenceBugs(a, b, 'sub', ctx.subtractionMethod)],
    `Du hast auch mit den Nullen nach dem Komma ${SUBTRACT[ctx.subtractionMethod].done}.`,
  );
}

// ─── Stufe 3 ─────────────────────────────────────────────────────────────────

function threeNumbers(rng: Rng): Dec[] {
  return attempt<Dec[]>(() => {
    const out: Dec[] = [[rng.int(101, 300), 1], [rng.int(101, 900), 2], [rng.int(11, 99), 1]];
    return out.every((d) => d[0] % 10 !== 0) ? rng.shuffle(out) : null;
  }, [[125, 1], [375, 2], [15, 1]]);
}

/** Rounded to its highest place, as the help of WrittenInput says for an Überschlag: 16,6 → 20, 3,2 → 3. */
function toHighestPlace([int, places]: Dec): number {
  const unit = 10 ** (String(int).length - 1);
  return (Math.floor((int + unit / 2) / unit) * unit) / 10 ** places;
}

const highestSum = (decs: Dec[]) => decs.map(toHighestPlace).reduce((x, y) => x + y, 0);

function threeWritten(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  // The Überschlag stays near the sum, so that the praise can say it confirmed the result.
  const decs = attempt<Dec[]>(() => {
    const out = threeNumbers(rng);
    const sum = out.reduce((x, d) => x + val(d), 0);
    return Math.abs(highestSum(out) - sum) <= 0.25 * sum ? out : null;
  }, [[125, 1], [375, 2], [15, 1]]);
  const operands = decs.map((d) => d[0]);
  const placesList = decs.map((d) => d[1]);
  const rounded = decs.map(toHighestPlace);
  const ueberschlag = highestSum(decs);
  const answer = writtenDecimal('add', operands, placesList, { ueberschlag });
  const result: Dec = [answer.result, 2];
  const term = decs.map(show).join(' + ');
  return build(skill, stufe, {
    key: `drei:${term}`,
    ab,
    prompt: 'Mach zuerst einen Überschlag. Rechne dann schriftlich.',
    answer,
    hints: ['Runde für den Überschlag jede Zahl auf ihre höchste Stelle.', 'Rechne dann jede Spalte von rechts. Denk an den Übertrag.'],
    steps: [`Überschlag: ${rounded.join(' + ')} = ${ueberschlag}`, { text: COMMA_STEP, visual: solved('add', operands, placesList) }, `${term} = ${show(result)}`],
    bugs: numberBugs([{ id: 'komma-rechtsbuendig', match: operands.reduce((x, y) => x + y, 0) / 100, hint: COMMA_HINT }], val(result)),
    praise: 'Dein Überschlag hat das Ergebnis bestätigt.',
    srText: speak(`Mach zuerst einen Überschlag. Rechne dann schriftlich: ${term}.`),
    kmk: KMK,
  });
}

/** Three prices, and the change from a note. */
function changeStory(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const person = pickPerson(rng);
  const prices = [rng.int(105, 390), rng.int(105, 390), rng.int(105, 390)];
  const total = prices.reduce((x, y) => x + y, 0);
  const paid = total < 1000 ? 1000 : 2000;
  const rest = paid - total;
  const context = `${person.name} kauft ein Heft für ${fmtMoney(prices[0])}, einen Stift für ${fmtMoney(prices[1])} und Kleber für ${fmtMoney(prices[2])}. ${person.name} bezahlt mit ${fmtMoney(paid)}.`;
  const prompt = `Wie viel Geld bekommt ${person.name} zurück?`;
  return build(skill, stufe, {
    key: `rueckgeld:${prices.join(':')}`,
    ab,
    context,
    prompt,
    answer: euroAnswer(rest, { label: 'Rückgeld' }),
    hints: ['Addiere zuerst alle Preise.', 'Rechne dann: bezahlter Betrag minus Summe.'],
    steps: [`${prices.map(fmtMoney).join(' + ')} = ${fmtMoney(total)}`, `${fmtMoney(paid)} − ${fmtMoney(total)} = ${fmtMoney(rest)}`, `${person.name} bekommt ${fmtMoney(rest)} zurück.`],
    bugs: numberBugs([{ id: 'rueckgeld-vergessen', match: total / 100, hint: 'Das ist die Summe der Preise. Gefragt ist das Geld, das zurückkommt.' }], rest / 100),
    praise: 'Du hast erst addiert und dann vom bezahlten Betrag abgezogen.',
    srText: speak(`${context} ${prompt}`),
    kmk: [...KMK, 'PK.modellieren'],
  });
}

/** The way back: from what is left to a price. */
function missingPriceStory(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const person = pickPerson(rng);
  const start = rng.pick([1000, 1500, 2000]);
  const first = rng.int(205, 495);
  const second = rng.int(155, 395);
  const left = start - first - second;
  const context = `${person.name} hat ${fmtMoney(start)}. ${person.name} kauft Saft für ${fmtMoney(first)} und Brot. Danach hat ${person.name} noch ${fmtMoney(left)}.`;
  const prompt = 'Wie viel kostet das Brot?';
  return build(skill, stufe, {
    key: `preis:${start}:${first}:${left}`,
    ab,
    context,
    prompt,
    answer: euroAnswer(second, { label: 'Preis des Brots' }),
    hints: [`Wie viel Geld hat ${person.name} insgesamt ausgegeben?`, 'Ziehe davon den Preis für den Saft ab.'],
    steps: [`Ausgegeben: ${fmtMoney(start)} − ${fmtMoney(left)} = ${fmtMoney(start - left)}`, `Brot: ${fmtMoney(start - left)} − ${fmtMoney(first)} = ${fmtMoney(second)}`, `Das Brot kostet ${fmtMoney(second)}.`],
    bugs: numberBugs(
      [
        { id: 'rest-vergessen', match: (start - first) / 100, hint: `Von diesem Geld bleiben noch ${fmtMoney(left)} übrig. Ziehe auch das ab.` },
        { id: 'alles-ausgegeben', match: (start - left) / 100, hint: 'Das ist alles Ausgegebene. Darin steckt auch der Saft.' },
      ],
      second / 100,
    ),
    praise: 'Du hast vom Ende her gerechnet.',
    srText: speak(`${context} ${prompt}`),
    kmk: [...KMK, 'PK.modellieren'],
  });
}

/**
 * Fehlerdetektiv (§7.1): a written sum whose result forgets every carry, so the mistake can be found in the columns of the picture. A written visual always stands comma under comma:
 * it cannot show digits lined up on the right, and a result from that mistake would not follow from the digits it shows.
 */
function detective(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const person = pickPerson(rng);
  const decs = attempt<Dec[]>(() => {
    const out = threeNumbers(rng);
    const aligned = alignedOperands(out.map((d) => d[0]), out.map((d) => d[1]));
    return noCarrySum(...aligned) !== aligned.reduce((x, y) => x + y, 0) ? out : null;
  }, [[125, 1], [375, 2], [15, 1]]);
  const operands = decs.map((d) => d[0]);
  const placesList = decs.map((d) => d[1]);
  const aligned = alignedOperands(operands, placesList);
  const wrong = noCarrySum(...aligned);
  const correct: Dec = [aligned.reduce((x, y) => x + y, 0), 2];
  const term = decs.map(show).join(' + ');
  const prompt = `Die Rechnung von ${person.name} stimmt noch nicht. Wie heißt das richtige Ergebnis?`;
  return build(skill, stufe, {
    key: `detektiv:${decs.map(show).join(':')}`,
    ab,
    prompt,
    visual: { type: 'written', op: 'add', operands, decimalPlaces: placesList, showSolution: false, shownResult: wrong },
    answer: numberAnswer(val(correct), { label: 'Das richtige Ergebnis' }),
    hints: ['Überschlage zuerst. Passt das Ergebnis zum Überschlag?', 'Rechne jede Spalte von rechts nach. Achte auf die Überträge.'],
    steps: ['In dieser Rechnung fehlen die Überträge.', { text: 'Rechne neu, von rechts und mit Übertrag.', visual: solved('add', operands, placesList) }, `${term} = ${show(correct)}`],
    bugs: numberBugs(
      [
        { id: 'ohne-uebertrag', match: wrong / 100, hint: 'Das ist das Ergebnis aus dem Bild. Denk an die Überträge.' },
        { id: 'komma-rechtsbuendig', match: operands.reduce((x, y) => x + y, 0) / 100, hint: COMMA_HINT },
      ],
      val(correct),
    ),
    praise: 'Du hast die Rechnung geprüft und neu gerechnet.',
    srText: speak(`${prompt} Die Rechnung: ${term}. Darunter steht als Ergebnis ${show([wrong, 2])}.`),
    kmk: [...KMK, 'PK.argumentieren'],
  });
}

function generate(rng: Rng, stufe: Stufe, ab: Ab, ctx: GenContext): Exercise {
  if (stufe === 1) {
    if (ab === 1) {
      const [a, b] = noCarryPair(rng);
      if (rng.chance(0.5)) return numberItem(stufe, ab, 'add', a, b, 'Du hast die Stellen einzeln zusammengezählt.');
      const sum: Dec = [a[0] + b[0], a[1]];
      return numberItem(stufe, ab, 'sub', sum, b, 'Du hast die Stellen einzeln abgezogen.');
    }
    if (ab === 2) {
      const [a, b] = innerCarryPair(rng);
      if (rng.chance(0.5)) return writtenItem(stufe, ab, 'add', a, b, ctx.subtractionMethod, differenceBugs(a, b, 'add', ctx.subtractionMethod), 'Du hast den Übertrag bei den Hundertsteln beachtet.');
      const sum: Dec = [a[0] + b[0], 2];
      return writtenItem(stufe, ab, 'sub', sum, b, ctx.subtractionMethod, differenceBugs(sum, b, 'sub', ctx.subtractionMethod), `Du hast Stelle für Stelle von rechts ${SUBTRACT[ctx.subtractionMethod].done}.`);
    }
    const [a, b] = noCarryPair(rng);
    return missingItem(rng, stufe, ab, a, b, 'Du hast die Umkehraufgabe gerechnet.');
  }
  if (stufe === 2) {
    if (ab === 1) {
      const [a, b] = differentLengths(rng);
      return writtenItem(stufe, ab, 'add', a, b, ctx.subtractionMethod, [rightAlignedBug(a, b, 'add'), ...differenceBugs(a, b, 'add', ctx.subtractionMethod)], 'Du hast auch verschieden lange Zahlen Stelle für Stelle addiert.');
    }
    if (ab === 2) {
      const [a, b] = shorterMinuend(rng);
      return writtenItem(stufe, ab, 'sub', a, b, ctx.subtractionMethod, [rightAlignedBug(a, b, 'sub'), ...differenceBugs(a, b, 'sub', ctx.subtractionMethod)], `Du hast mit der aufgefüllten 0 richtig ${SUBTRACT[ctx.subtractionMethod].done}.`);
    }
    if (rng.chance(0.5)) return wholeMinus(rng, ctx, stufe, ab);
    const [a, b] = differentLengths(rng);
    return missingItem(rng, stufe, ab, a, b, 'Du hast mit der Umkehraufgabe gerechnet.');
  }
  if (ab === 1) return threeWritten(rng, stufe, ab);
  if (ab === 2) return changeStory(rng, stufe, ab);
  return rng.chance(0.5) ? missingPriceStory(rng, stufe, ab) : detective(rng, stufe, ab);
}

const skill: SkillDef = {
  id: 'dezimal.plus-minus',
  topicId: 'dezimal',
  title: 'Dezimalzahlen addieren und subtrahieren',
  description: 'Du rechnest plus und minus mit Dezimalzahlen.',
  stufen: {
    1: 'Gleich viele Stellen, bis 100, kein Übertrag über das Komma',
    2: 'Verschieden lang: 3,5 + 1,25, mit Übertrag',
    3: 'Drei Zahlen, zuerst Überschlag, Geschichten mit Geld',
  },
  kmk: KMK,
  keys: KEYS,
  generate: (rng, stufe, ctx) => generate(rng, stufe, targetAb(rng, stufe, ctx), ctx),
};
export default skill;
