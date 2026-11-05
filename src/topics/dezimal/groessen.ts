/**
 * Kommazahlen bei Größen. Every item sets literalComma: the comma is the task, so the voice says '7 Komma 0 8 Euro'.
 * Stufe 1: € to ct, m to cm, 1,25 m. Stufe 2: kg to g, km to m, 0,75 kg. Stufe 3: l to ml, order mixed units.
 */
import { fmt, fmtQty, speak } from '../../core/format';
import type { Ab, Bug, Exercise, OrderAnswer, Rng, SkillDef, Stufe, VisualOf } from '../../core/types';
import { build, numberBugs, targetAb } from '../shared';
import { attempt, euroAnswer, KEYS, noEndZero, numberAnswer, orderBugs, show, val, type Dec } from './helpers';

const KMK = ['GM.einheiten', 'ZO.dezimal-darstellen'];

interface Pair {
  big: string;
  small: string;
  factor: 100 | 1000;
}

const PAIRS_S1: readonly Pair[] = [{ big: '€', small: 'ct', factor: 100 }, { big: 'm', small: 'cm', factor: 100 }];
const PAIRS_S2: readonly Pair[] = [{ big: 'kg', small: 'g', factor: 1000 }, { big: 'km', small: 'm', factor: 1000 }];
const LITRE: Pair = { big: 'l', small: 'ml', factor: 1000 };

const places = (p: Pair) => (p.factor === 100 ? 2 : 3);

const say = (text: string) => speak(text, { literalComma: true });

/** A number as a quantity: money always with two places. */
function qty(value: number, unit: string): string {
  return unit === '€' ? fmtQty(value, '€', 2) : fmtQty(value, unit);
}

function conversionTable(p: Pair, cell: string): VisualOf<'table'> {
  return { type: 'table', header: [p.big, p.small], rows: [['1', String(p.factor)], [cell, '□']], arrows: [{ from: 0, to: 1, label: `· ${cell}`, side: 'right' }] };
}

function factorBugs(p: Pair, d: Dec): Bug[] {
  const hint = `1 ${p.big} sind ${p.factor} ${p.small}. Wie viel sind dann ${qty(val(d), p.big)}?`;
  const times = (f: number) => (d[0] * f) / 10 ** d[1];
  return p.factor === 1000
    ? [
        { id: 'einheit-100-1000', match: times(100), hint },
        { id: 'einheit-falsch', match: times(10), hint },
      ]
    : [
        { id: 'einheit-falsch', match: times(10), hint },
        { id: 'einheit-falsch', match: times(1000), hint },
      ];
}

/** '3,25 € = □ ct' */
function toSmall(stufe: Stufe, ab: Ab, p: Pair, d: Dec, withTable: boolean, praise: string): Exercise {
  const value = val(d);
  const small = (d[0] * p.factor) / 10 ** d[1];
  const expression = `${qty(value, p.big)} = □ ${p.small}`;
  const digits = `${Math.floor(value)}${String(d[0] % 10 ** d[1]).replace(/^0+/, '')}`;
  const zeroInside = d[1] === 2 && d[0] % 100 < 10;
  return build(skill, stufe, {
    key: `klein:${show(d)}:${p.big}`,
    ab,
    prompt: 'Wandle um.',
    expression,
    literalComma: true,
    ...(withTable ? { visual: conversionTable(p, show(d)) } : {}),
    answer: numberAnswer(small, { unit: p.small, label: `Wert in ${p.small}` }),
    hints: [`1 ${p.big} sind ${p.factor} ${p.small}.`, `Nimm ${show(d)} mal ${p.factor}: Das Komma rückt nach rechts.`],
    steps: [`1 ${p.big} = ${p.factor} ${p.small}`, `${show(d)} · ${p.factor} = ${fmt(small)}`, `${qty(value, p.big)} = ${fmtQty(small, p.small)}`],
    bugs: numberBugs(
      [
        ...factorBugs(p, d),
        zeroInside && { id: 'null-ignoriert', match: Number(digits), hint: `Die 0 nach dem Komma zählt mit. 1 ${p.big} sind ${p.factor} ${p.small}.` },
      ],
      small,
    ),
    praise,
    srText: say(`Wandle um: ${expression}`),
    kmk: KMK,
  });
}

/** '325 ct = □ €', '85 cm = □ m', '750 g = □ kg'. */
function toBig(stufe: Stufe, ab: Ab, p: Pair, small: number, praise: string): Exercise {
  const value = small / p.factor;
  const expression = `${fmtQty(small, p.small)} = □ ${p.big}`;
  const answer = p.big === '€' ? euroAnswer(small, { label: 'Wert in Euro' }) : numberAnswer(value, { unit: p.big, label: `Wert in ${p.big}` });
  const shownValue = p.big === '€' ? fmt(value, 2) : fmt(value);
  return build(skill, stufe, {
    key: `gross:${small}:${p.small}`,
    ab,
    prompt: 'Wandle um.',
    expression,
    literalComma: true,
    answer,
    hints: [`${p.factor} ${p.small} sind 1 ${p.big}.`, `Teile durch ${p.factor}: Das Komma rückt nach links.`],
    steps: [`${p.factor} ${p.small} = 1 ${p.big}`, `${small} : ${p.factor} = ${shownValue}`, `${fmtQty(small, p.small)} = ${qty(value, p.big)}`],
    bugs: numberBugs(
      [
        { id: 'einheit-falsch', match: small / (p.factor === 1000 ? 100 : 10), hint: `${p.factor} ${p.small} sind 1 ${p.big}. Zähle die Nullen noch einmal.` },
        p.factor === 1000 && { id: 'einheit-falsch', match: small / 10000, hint: `${p.factor} ${p.small} sind 1 ${p.big}. Zähle die Nullen noch einmal.` },
      ],
      value,
    ),
    praise,
    srText: say(`Wandle um: ${expression}`),
    kmk: KMK,
  });
}

/** '3 m 5 cm = □ m'. */
function mixedToBig(stufe: Stufe, ab: Ab, p: Pair, whole: number, rest: number): Exercise {
  const small = whole * p.factor + rest;
  const value = small / p.factor;
  const expression = `${whole} ${p.big} ${rest} ${p.small} = □ ${p.big}`;
  const answer = p.big === '€' ? euroAnswer(small, { label: 'Wert in Euro' }) : numberAnswer(value, { unit: p.big, label: `Wert in ${p.big}` });
  return build(skill, stufe, {
    key: `gemischt:${whole}:${rest}:${p.big}`,
    ab,
    prompt: 'Schreibe mit Komma.',
    expression,
    literalComma: true,
    answer,
    hints: [`${p.factor} ${p.small} sind 1 ${p.big}. Vor das Komma kommt ${whole}.`, `Die ${rest} ${p.small} stehen nach dem Komma. Achte auf die Stellen.`],
    steps: [`Vor dem Komma stehen die ${whole} ${p.big}.`, `${rest} ${p.small} sind ${fmt(rest / p.factor, places(p))} ${p.big}.`, `Zusammen: ${qty(value, p.big)}`],
    bugs: numberBugs(
      [
        { id: 'null-ignoriert', match: Number(`${whole}.${rest}`), hint: `${rest} ${p.small} sind weniger als ${p.factor / 10} ${p.small}. Die Stelle davor bleibt 0.` },
      ],
      value,
    ),
    praise: 'Du hast die 0 als leere Stelle mitgeschrieben.',
    srText: say(`Schreibe mit Komma: ${expression}`),
    kmk: KMK,
  });
}

/** '2,5 kg + 300 g = □ kg': two units, one result. */
function sumMixed(rng: Rng, stufe: Stufe, ab: Ab, p: Pair): Exercise {
  const big: Dec = [noEndZero(rng, 11, 48), 1];
  const small = rng.int(1, 9) * 100 + (rng.chance(0.5) ? 0 : rng.int(1, 9) * 10);
  const total = val(big) + small / p.factor;
  const value = Math.round(total * 1000) / 1000;
  const expression = `${fmtQty(val(big), p.big)} + ${fmtQty(small, p.small)} = □ ${p.big}`;
  return build(skill, stufe, {
    key: `summe:${show(big)}:${small}:${p.big}`,
    ab,
    prompt: 'Rechne in eine Einheit um.',
    expression,
    literalComma: true,
    answer: numberAnswer(value, { unit: p.big, label: `Wert in ${p.big}` }),
    hints: ['Rechne zuerst beide Angaben in dieselbe Einheit um.', `${p.factor} ${p.small} sind 1 ${p.big}.`],
    steps: [`${fmtQty(small, p.small)} = ${fmtQty(small / p.factor, p.big)}`, `${fmtQty(val(big), p.big)} + ${fmtQty(small / p.factor, p.big)} = ${fmtQty(value, p.big)}`],
    bugs: numberBugs([{ id: 'einheit-ignoriert', match: val(big) + small, hint: 'Die Einheiten sind verschieden. Rechne zuerst in dieselbe Einheit um.' }], value),
    praise: 'Du hast zuerst in dieselbe Einheit umgerechnet.',
    srText: say(`Rechne in eine Einheit um: ${expression}`),
    kmk: KMK,
  });
}

// ─── Stufe 3: order mixed units ──────────────────────────────────────────────

// No € and no m with cm: OrderInput reads its buttons with speak() without literalComma, which says '0,90 €' as '90 Cent' and so does the conversion that is the task.
const ORDER_PAIRS: readonly Pair[] = [LITRE, { big: 'kg', small: 'g', factor: 1000 }, { big: 'km', small: 'm', factor: 1000 }];

/** Mixed quantities, each as small units and as its text. */
function mixedQuantities(rng: Rng, p: Pair, count: number): { small: number; label: string; shownNumber: number }[] {
  return attempt(
    () => {
      const seen = new Set<number>();
      const out: { small: number; label: string; shownNumber: number }[] = [];
      for (let i = 0; i < count; i++) {
        const small = (rng.int(4, 18) * p.factor) / 10 + (rng.chance(0.5) ? 0 : p.factor === 1000 ? rng.int(1, 9) * 10 : rng.int(1, 9));
        if (seen.has(small)) return null;
        seen.add(small);
        const inBig = i % 2 === 0;
        const value = small / p.factor;
        out.push({ small, label: inBig ? qty(value, p.big) : fmtQty(small, p.small), shownNumber: inBig ? value : small });
      }
      return out;
    },
    [0.8, 1.2, 0.95, 1.05, 1.5].slice(0, count).map((v, i) => ({ small: v * p.factor, label: i % 2 === 0 ? qty(v, p.big) : fmtQty(v * p.factor, p.small), shownNumber: i % 2 === 0 ? v : v * p.factor })),
  );
}

function orderItem(rng: Rng, stufe: Stufe, ab: Ab, p: Pair, count: number, direction: OrderAnswer['direction']): Exercise {
  const items = mixedQuantities(rng, p, count);
  const up = [...items].sort((x, y) => x.small - y.small);
  const sorted = direction === 'aufsteigend' ? up : [...up].reverse();
  let shown = rng.shuffle(items);
  if (shown.every((d, i) => d === sorted[i])) shown = [...shown.slice(1), shown[0]];
  const answer: OrderAnswer = { kind: 'order', items: shown.map((d) => d.label), correct: sorted.map((d) => shown.indexOf(d)), direction };
  const byNumber = [...items].sort((x, y) => x.shownNumber - y.shownNumber);
  const wrong = (direction === 'aufsteigend' ? byNumber : [...byNumber].reverse()).map((d) => d.label);
  const word = direction === 'aufsteigend' ? 'Beginne mit der kleinsten Angabe.' : 'Beginne mit der größten Angabe.';
  return build(skill, stufe, {
    key: `ordnen:${items.map((d) => d.small).join(':')}:${p.big}:${direction}`,
    ab,
    prompt: `Ordne die Angaben. ${word}`,
    literalComma: true,
    answer,
    hints: [`Rechne alle Angaben in ${p.small} um.`, `1 ${p.big} sind ${p.factor} ${p.small}.`],
    steps: [`Alle in ${p.small}: ${up.map((d) => fmtQty(d.small, p.small)).join(', ')}.`, `Die Reihenfolge ist: ${sorted.map((d) => d.label).join(direction === 'aufsteigend' ? ' < ' : ' > ')}.`],
    bugs: orderBugs(answer, [{ id: 'einheit-ignoriert', order: wrong, hint: 'Die Einheiten sind verschieden. Rechne zuerst in dieselbe Einheit um.' }]),
    praise: 'Du hast alles in dieselbe Einheit gebracht und verglichen.',
    srText: say(`Ordne die Angaben. ${word} ${items.map((d) => d.label).join(', ')}.`),
    kmk: KMK,
  });
}

/** 6 Flaschen zu je 0,75 l: wie viele ml? */
function bottlesStory(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const [each, count] = attempt<[number, number]>(() => {
    const pair: [number, number] = [rng.pick([125, 150, 250, 330, 500, 750, 1250, 1500]), rng.int(3, 9)];
    // 1000 ml would stand in the hint
    return pair[0] * pair[1] === 1000 ? null : pair;
  }, [330, 3]);
  const eachL = each / 1000;
  const total = each * count;
  const context = `Eine Flasche fasst ${fmtQty(eachL, 'l')}. Die Klasse 6b füllt ${count} Flaschen mit Saft.`;
  const prompt = 'Wie viele Milliliter Saft sind das?';
  return build(skill, stufe, {
    key: `flaschen:${each}:${count}`,
    ab,
    context,
    prompt,
    literalComma: true,
    answer: numberAnswer(total, { unit: 'ml', label: 'Menge in Millilitern' }),
    hints: ['Rechne zuerst eine Flasche in Milliliter um.', '1 l sind 1000 ml.'],
    steps: [`${fmtQty(eachL, 'l')} = ${fmtQty(each, 'ml')}`, `${count} · ${fmt(each)} = ${fmt(total)}`, `Das sind ${fmtQty(total, 'ml')}.`],
    bugs: numberBugs(
      [
        { id: 'einheit-100-1000', match: (each / 10) * count, hint: `1 l sind 1000 ml. Wie viel sind dann ${fmtQty(eachL, 'l')}?` },
        { id: 'einheit-nicht-umgerechnet', match: eachL * count, hint: 'Das sind Liter. Gefragt sind Milliliter.' },
      ],
      total,
    ),
    praise: 'Du hast umgerechnet und dann mal genommen.',
    srText: say(`${context} ${prompt}`),
    kmk: [...KMK, 'PK.modellieren'],
  });
}

/** 0,55 to 4,95 in steps of 0,05, and no whole number: 1,00 kg = 1000 g would stand in the hint. */
function noWholeHundred(rng: Rng): number {
  const n = rng.int(11, 99) * 5;
  return n % 100 === 0 ? n + 5 : n;
}

/**
 * Litres whose millilitres take more than dropping the comma: zeros to fill and a zero to keep, 2,07 l, 0,05 l, 12,5 l. That is harder than kg and g on Stufe 2. A number with 3 places
 * stays out: 4,072 l is 4072 ml, the same digits without their comma.
 */
function litres(rng: Rng): Dec {
  const form = rng.int(1, 3);
  if (form === 1) return [rng.int(1, 9) * 100 + rng.int(1, 9), 2];
  return form === 2 ? [rng.int(1, 9), 2] : [noEndZero(rng, 101, 498), 1];
}

function generate(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  if (stufe === 1) {
    const p = rng.pick(PAIRS_S1);
    if (ab === 1) return toSmall(stufe, ab, p, [noEndZero(rng, 101, 998), 2], true, `Du hast ${p.big} in ${p.small} umgerechnet.`);
    if (ab === 2) {
      if (rng.chance(0.5)) return toBig(stufe, ab, p, noEndZero(rng, 11, 998), 'Du hast das Komma um 2 Stellen nach links gerückt.');
      return toSmall(stufe, ab, p, [noEndZero(rng, 11, 98), 1], false, 'Du hast die fehlende Stelle mit einer 0 gefüllt.');
    }
    if (rng.chance(0.5)) return mixedToBig(stufe, ab, p, rng.int(2, 9), rng.int(1, 9));
    return toSmall(stufe, ab, p, [rng.int(2, 9) * 100 + rng.int(1, 9), 2], false, 'Du hast die 0 nach dem Komma beachtet.');
  }
  if (stufe === 2) {
    const p = rng.pick(PAIRS_S2);
    if (ab === 1) return toSmall(stufe, ab, p, rng.chance(0.5) ? [noEndZero(rng, 11, 48), 1] : [noWholeHundred(rng), 2], false, `Du hast mit 1000 gerechnet: 1 ${p.big} sind 1000 ${p.small}.`);
    if (ab === 2) {
      const small = rng.chance(0.5) ? rng.int(11, 99) * 10 + rng.int(1, 9) : rng.int(1, 9) * 100 + rng.int(1, 19) * 50;
      return toBig(stufe, ab, p, small % 1000 === 0 ? small + 50 : small, 'Du hast das Komma um 3 Stellen nach links gerückt.');
    }
    if (rng.chance(0.5)) return sumMixed(rng, stufe, ab, p);
    return toBig(stufe, ab, p, rng.int(11, 99), 'Du hast die Nullen nach dem Komma mitgeschrieben.');
  }
  if (ab === 1) {
    if (rng.chance(0.5)) return toSmall(stufe, ab, LITRE, litres(rng), false, 'Du hast Liter in Milliliter umgerechnet.');
    return toBig(stufe, ab, LITRE, rng.chance(0.5) ? noEndZero(rng, 11, 98) : rng.int(1, 4) * 1000 + noEndZero(rng, 11, 98), 'Du hast Milliliter in Liter umgerechnet.');
  }
  if (ab === 2) return orderItem(rng, stufe, ab, rng.pick(ORDER_PAIRS), 4, 'aufsteigend');
  return rng.chance(0.6) ? orderItem(rng, stufe, ab, rng.pick(ORDER_PAIRS), 5, rng.chance(0.5) ? 'absteigend' : 'aufsteigend') : bottlesStory(rng, stufe, ab);
}

const skill: SkillDef = {
  id: 'dezimal.groessen',
  topicId: 'dezimal',
  title: 'Kommazahlen bei Größen',
  description: 'Du wandelst Größen um und schreibst sie mit Komma.',
  stufen: {
    1: 'Euro und Cent, Meter und Zentimeter: 1,25 m',
    2: 'Kilogramm und Gramm, Kilometer und Meter: 0,75 kg',
    3: 'Liter und Milliliter; gemischte Einheiten ordnen',
  },
  kmk: KMK,
  keys: KEYS,
  generate: (rng, stufe, ctx) => generate(rng, stufe, targetAb(rng, stufe, ctx)),
};
export default skill;
