/**
 * flaechen.volumeneinheiten (docs/research.md §6). The comma key is on for the whole skill, so every field sets `decimals`.
 * Stufe 1: cm³ and ml, dm³ and l. AB I two equal units added or compared, so that the numbers decide (a bare '6 l = □ dm³' prints its answer, and choosing the unit of the same size always has one answer per unit), AB II cm³ read between the numbers of a measuring jug (the text
 * never names the jug, so its description reaches srText), AB III from l to cm³.
 * Stufe 2: m³ and dm³, whole numbers. AB I m³ to dm³, AB II dm³ to m³ or m³ to l, AB III two units at once.
 * Stufe 3: decimals, order mixed units, a plausible volume. AB I a comma, AB II order, AB III a volume that fits a thing, in a unit to convert first, or the litres of a Quader in cm.
 */
import { fmt } from '../../core/format';
import type { Bug, OrderAnswer, Rng, SkillDef } from '../../core/types';
import { makeChoice } from '../shared';
import { HINT, bug, clean, commaAnswer, commaField, generator, q, quaderPic, type Forms } from './common';

const SKILL = { id: 'flaechen.volumeneinheiten', topicId: 'flaechen' } as const;
const KMK = ['GM.volumeneinheiten'];

const SAME = '1 cm³ ist genau 1 ml. Die Zahl bleibt gleich.';
const SAME_SIZE = 'Beide Einheiten sind gleich groß. Rechne ohne Faktor.';
const WAY_DOWN = 'Eine kleinere Einheit braucht mehr Würfel. Die Zahl muss größer sein.';
const WAY_UP = 'Eine größere Einheit braucht weniger Würfel. Die Zahl muss kleiner sein.';
const M3 = '1 m³ hat 10 Schichten mit je 100 dm³.';

// ─── Stufe 1 ─────────────────────────────────────────────────────────────────

const SAME_UNITS = { 'cm³': 'ml', ml: 'cm³', 'dm³': 'l', l: 'dm³' } as const;

const s1Same: Forms[1][1] = (rng) => {
  const from = rng.pick(['cm³', 'ml', 'dm³', 'l'] as const);
  const to = SAME_UNITS[from];
  const small = from === 'cm³' || from === 'ml';
  const fact = small ? '1 cm³ = 1 ml' : '1 dm³ = 1 l';
  if (rng.chance(0.25)) {
    const step = small ? 10 : 1;
    const left = (small ? rng.int(2, 95) : rng.int(2, 60)) * step;
    const sign = rng.pick(['<', '>', '='] as const);
    const right = sign === '=' ? left : sign === '<' ? left + rng.int(1, 9) * step : left - rng.int(1, Math.min(9, left / step - 1)) * step;
    return {
      key: `gleich:vergleich:${from}:${left}:${right}`,
      prompt: 'Welches Zeichen passt in die Lücke?',
      expression: `${left} ${from} □ ${right} ${to}`,
      answer: makeChoice(rng, { label: sign }, (['<', '>', '='] as const).filter((x) => x !== sign).map((label) => ({ label, whyWrong: 'Beide Einheiten sind gleich groß. Vergleiche nur die Zahlen.' })), { layout: 'symbols', order: ['<', '>', '='] }),
      hints: ['Welche Einheit ist genauso groß?', small ? '1 ml Wasser füllt einen Würfel mit 1 cm³.' : '1 l Wasser füllt einen Würfel mit 1 dm³.'],
      steps: [fact, `Vergleiche ${left} und ${right}.`, `${left} ${from} ${sign} ${right} ${to}`],
      praise: 'Du hast gesehen: Beide Einheiten sind gleich groß.',
    };
  }
  const a = small ? rng.int(2, 60) * 10 : rng.int(2, 40);
  const b = small ? rng.int(2, 30) * 10 : rng.int(2, 40);
  const total = a + b;
  return {
    key: `gleich:plus:${from}:${a}:${b}`,
    prompt: `Rechne alles in ${to} um.`,
    expression: `${a} ${from} + ${b} ${to} = □ ${to}`,
    answer: commaAnswer(total, to),
    hints: [small ? '1 cm³ fasst genau 1 ml.' : '1 dm³ fasst genau 1 l.', 'Beide Einheiten sind gleich groß. Addiere dann die Zahlen.'],
    steps: [fact, `${a} + ${b} = ${total}`, `${a} ${from} + ${b} ${to} = ${total} ${to}`],
    bugs: [
      bug('einheit-tausend', a * 1000 + b, SAME_SIZE),
      bug('einheit-zehn', a * 10 + b, SAME_SIZE),
      bug('ohne-umrechnen', b, 'Das ist nur ein Teil. Beide Mengen gehören dazu.'),
    ],
    praise: 'Du hast gesehen: Beide Einheiten sind gleich groß.',
  };
};

/** A scale with more ticks than numbers (labelEvery in src/ui/visuals/ContainerVisual.tsx): the fill lies between two numbers, so neither the picture nor its description states it. */
const JUGS = [
  { capacity: 500, step: 25, numbers: 50 },
  { capacity: 1000, step: 50, numbers: 100 },
  { capacity: 500, step: 20, numbers: 100 },
  { capacity: 250, step: 10, numbers: 50 },
] as const;

const s1Jug: Forms[1][2] = (rng) => {
  const { capacity, step, numbers } = rng.pick(JUGS);
  // above the first number: a fill of one tick would be the size of a tick, which the description states
  let fill = rng.int(1, capacity / step - 1) * step;
  while (fill % numbers === 0 || fill < numbers) fill = rng.int(1, capacity / step - 1) * step;
  const last = Math.floor(fill / numbers) * numbers;
  const ticks = (fill - last) / step;
  return {
    key: `gefaess:${capacity}:${step}:${fill}`,
    prompt: 'Lies das Wasser im Bild ab. Wie viel cm³ Wasser sind das?',
    visual: { type: 'container', capacityMl: capacity, fillMl: fill, stepMl: step },
    answer: commaAnswer(fill, 'cm³'),
    hints: ['Wie viel zählt ein Strich? Suche die Zahl unter dem Wasser.', 'Lies zuerst die Milliliter ab. 1 ml ist genau 1 cm³.'],
    steps: [`Unter dem Wasser steht die Zahl ${last}.`, `Darüber ${ticks} ${ticks === 1 ? 'Strich' : 'Striche'} mit je ${step} ml: ${last} + ${ticks} · ${step} = ${fill}`, '1 ml = 1 cm³', `Das sind ${fill} cm³.`],
    bugs: [
      bug('striche-gezaehlt', fill / step, `Das ist die Zahl der Striche. Ein Strich zählt ${step} ml.`),
      bug('naechste-zahl', last, 'Das ist die Zahl unter dem Wasser. Zähle die Striche darüber dazu.'),
      bug('einheit-tausend', fill * 1000, SAME),
      bug('richtung', clean(fill / 1000), SAME),
    ],
    praise: 'Du hast die Skala Strich für Strich abgelesen.',
    kmk: [...KMK, 'PK.darstellen'],
  };
};

const s1Bridge: Forms[1][3] = (rng) => {
  const n = rng.int(2, 9);
  const v = n * 1000;
  const fromL = rng.chance(0.5);
  const from = fromL ? 'l' : 'dm³';
  const to = fromL ? 'cm³' : 'ml';
  return {
    key: `bruecke:${from}:${n}`,
    prompt: 'Rechne um.',
    expression: `${n} ${from} = □ ${to}`,
    answer: commaAnswer(v, to),
    hints: [fromL ? '1 l sind 1000 ml. 1 ml ist 1 cm³.' : '1 dm³ ist 1 l. 1 l sind 1000 ml.', 'Gehe in zwei Schritten vor.'],
    steps: [fromL ? '1 l = 1000 ml' : '1 dm³ = 1 l', fromL ? '1 ml = 1 cm³' : '1 l = 1000 ml', `${n} · 1000 = ${v}`, `${n} ${from} = ${v} ${to}`],
    bugs: [
      bug('ohne-umrechnen', n, 'Das stimmt nur zwischen l und dm³, nicht zwischen diesen Einheiten.'),
      bug('volumeneinheit-zehn', n * 10, HINT.volumeneinheit),
      bug('volumeneinheit-hundert', n * 100, HINT.volumeneinheit),
    ],
    praise: 'Du hast den Weg über zwei Einheiten genommen.',
    kmk: [...KMK, 'PK.problemloesen'],
  };
};

// ─── Stufe 2 ─────────────────────────────────────────────────────────────────

const s2Down: Forms[2][1] = (rng) => {
  const n = rng.int(2, 40);
  const v = n * 1000;
  return {
    key: `m-dm:${n}`,
    prompt: 'Rechne um.',
    expression: `${n} m³ = □ dm³`,
    answer: commaAnswer(v, 'dm³'),
    hints: [M3, '1 m³ sind 10 · 10 · 10 dm³.'],
    steps: ['1 m³ = 1000 dm³', `${n} · 1000 = ${fmt(v)}`, `${n} m³ = ${fmt(v)} dm³`],
    bugs: [
      bug('volumeneinheit-zehn', n * 10, M3),
      bug('volumeneinheit-hundert', n * 100, M3),
      bug('richtung', clean(n / 1000), WAY_DOWN),
    ],
    praise: 'Du hast mit dem Faktor 1000 gerechnet.',
  };
};

const s2Up: Forms[2][2] = (rng) => {
  if (rng.chance(0.5)) {
    const n = rng.int(2, 60);
    const value = n * 1000;
    return {
      key: `dm-m:${n}`,
      prompt: 'Rechne um.',
      expression: `${fmt(value)} dm³ = □ m³`,
      answer: commaAnswer(n, 'm³'),
      hints: ['1000 dm³ ergeben 1 m³.', 'Teile durch 1000.'],
      steps: ['1000 dm³ = 1 m³', `${fmt(value)} : 1000 = ${n}`, `${fmt(value)} dm³ = ${n} m³`],
      bugs: [
        bug('volumeneinheit-zehn', value / 10, M3),
        bug('volumeneinheit-hundert', value / 100, M3),
        bug('richtung', value * 1000, WAY_UP),
      ],
      praise: 'Du hast in die größere Einheit umgerechnet.',
    };
  }
  const n = rng.int(2, 25);
  const v = n * 1000;
  return {
    key: `m-l:${n}`,
    prompt: 'Rechne um.',
    expression: `${n} m³ = □ l`,
    answer: commaAnswer(v, 'l'),
    hints: ['1 m³ sind 1000 dm³.', '1 dm³ ist genau 1 l.'],
    steps: ['1 m³ = 1000 dm³', '1 dm³ = 1 l', `${n} · 1000 = ${fmt(v)}`, `${n} m³ = ${fmt(v)} l`],
    bugs: [
      bug('ohne-umrechnen', n, 'Nur dm³ und l sind gleich groß. 1 m³ ist viel mehr.'),
      bug('volumeneinheit-zehn', n * 10, M3),
      bug('volumeneinheit-hundert', n * 100, M3),
    ],
    praise: 'Du hast über dm³ zu Litern gerechnet.',
  };
};

const s2Mixed: Forms[2][3] = (rng) => {
  const big = rng.int(2, 9);
  const small = rng.pick([rng.int(1, 9) * 100, rng.int(11, 99) * 10, rng.int(11, 99)]);
  const total = big * 1000 + small;
  if (rng.chance(0.5)) {
    return {
      key: `zwei-einheiten:zusammen:${big}:${small}`,
      prompt: 'Rechne alles in dm³ um.',
      expression: `${big} m³ ${small} dm³ = □ dm³`,
      answer: commaAnswer(total, 'dm³'),
      hints: ['Rechne zuerst die m³ in dm³ um.', 'Addiere danach die übrigen dm³.'],
      steps: [`${big} m³ = ${big * 1000} dm³`, `${big * 1000} + ${small} = ${fmt(total)}`, `${big} m³ ${small} dm³ = ${fmt(total)} dm³`],
      bugs: [
        bug('ohne-umrechnen', big + small, 'Zwei verschiedene Einheiten: Rechne zuerst alles in dm³ um.'),
        bug('ziffern-ohne-null', Number(`${big}${small}`), 'Schau auf die Stellen: 1 m³ sind 1000 dm³.'),
        bug('volumeneinheit-hundert', big * 100 + small, M3),
      ],
      praise: 'Du hast zuerst alles in dm³ umgerechnet.',
    };
  }
  return {
    key: `zwei-einheiten:zerlegen:${total}`,
    prompt: 'Zerlege in m³ und dm³.',
    expression: `${fmt(total)} dm³ = □ m³ □ dm³`,
    answer: { kind: 'multi', fields: [commaField('gross', big, 'Ganze:', 'm³'), commaField('klein', small, 'Rest:', 'dm³')] },
    hints: ['Je 1000 dm³ ergeben 1 m³.', 'Die übrigen Würfel bleiben dm³.'],
    steps: [`${fmt(total)} : 1000 = ${big} und ${small} übrig`, `${big} m³ = ${big * 1000} dm³`, `${big} m³ und ${small} dm³`],
    bugs: [bug('volumeneinheit-hundert', { gross: Math.floor(total / 100), klein: total % 100 }, M3)],
    praise: 'Du hast die Zahl auf zwei Einheiten verteilt.',
  };
};

// ─── Stufe 3 ─────────────────────────────────────────────────────────────────

const COMMA_NUMBERS = [1.2, 1.5, 2.5, 3.5, 0.5, 0.75, 0.25, 4.2, 6.25, 2.75, 1.05] as const;

const s3Comma: Forms[3][1] = (rng) => {
  const n = rng.pick(COMMA_NUMBERS);
  const [from, to] = rng.pick<readonly [string, string]>([['dm³', 'cm³'], ['m³', 'dm³'], ['l', 'ml'], ['l', 'cm³'], ['m³', 'l']]);
  const v = clean(n * 1000);
  return {
    key: `komma:${fmt(n)}${from}:${to}`,
    prompt: 'Rechne um.',
    expression: `${fmt(n)} ${from} = □ ${to}`,
    answer: commaAnswer(v, to),
    hints: [`1 ${from} sind 1000 ${to}.`, 'Beim Malnehmen mit 1000 rückt das Komma drei Stellen.'],
    steps: [`1 ${from} = 1000 ${to}`, `${fmt(n)} · 1000 = ${fmt(v)}`, `${fmt(n)} ${from} = ${fmt(v)} ${to}`],
    bugs: [
      bug('volumeneinheit-hundert', clean(n * 100), 'Bei Volumen ist jeder Schritt mal 1000, nicht mal 100.'),
      bug('volumeneinheit-zehn', clean(n * 10), 'Bei Volumen ist jeder Schritt mal 1000, nicht mal 10.'),
      bug('richtung', clean(n / 1000), WAY_DOWN),
    ],
    praise: 'Du hast das Komma drei Stellen verschoben.',
  };
};

/** An order answer of volumes with their value in cm³; bug: the order by the number alone, without the unit. */
function volumeOrder(rng: Rng, items: { label: string; cm3: number; shown: number }[]): { answer: OrderAnswer; bugs: Bug[]; sorted: string[] } {
  const correctOrder = (list: typeof items) => list.map((_, i) => i).sort((x, y) => list[x].cm3 - list[y].cm3);
  let shown = rng.shuffle(items);
  if (correctOrder(shown).every((v, i) => v === i)) shown = [...shown.slice(1), shown[0]];
  const correct = correctOrder(shown);
  const byNumber = shown.map((_, i) => i).sort((x, y) => shown[x].shown - shown[y].shown);
  return {
    answer: { kind: 'order', items: shown.map((x) => x.label), correct, direction: 'aufsteigend' },
    bugs: byNumber.some((v, i) => v !== correct[i]) ? [bug('nach-zahl', byNumber, 'Vergleiche erst in derselben Einheit. Die Zahl allein reicht nicht.')] : [],
    sorted: correct.map((i) => shown[i].label),
  };
}

const s3Order: Forms[3][2] = (rng) => {
  const l = rng.pick([1.5, 2.5, 0.75, 3.2, 0.4]);
  const cm = rng.pick([350, 1200, 2800, 4500, 950]);
  const dm = rng.int(2, 6);
  const ml = rng.pick([120, 600, 800, 1800, 5500]);
  const items = [
    { label: q(l, 'l'), cm3: clean(l * 1000), shown: l },
    { label: q(cm, 'cm³'), cm3: cm, shown: cm },
    { label: q(dm, 'dm³'), cm3: dm * 1000, shown: dm },
    { label: q(ml, 'ml'), cm3: ml, shown: ml },
  ];
  const { answer, bugs, sorted } = volumeOrder(rng, items);
  return {
    key: `ordnen:${l}:${cm}:${dm}:${ml}`,
    prompt: 'Ordne die Volumen. Beginne mit dem kleinsten Volumen.',
    answer,
    hints: ['Rechne alle Volumen in cm³ um.', '1 l ist 1 dm³, also 1000 cm³. 1 ml ist 1 cm³.'],
    steps: [`In cm³: ${items.map((x) => fmt(x.cm3)).join(', ')}`, `Geordnet: ${sorted.join(' < ')}`],
    bugs,
    praise: 'Du hast zuerst alles in dieselbe Einheit gebracht.',
    kmk: [...KMK, 'PK.problemloesen'],
  };
};

const CM3_IN = { 'cm³': 1, ml: 1, 'dm³': 1000, l: 1000, 'm³': 1_000_000 } as const;

/** A thing with its usual volume, and the units to ask in: never only its usual one, where the wrong options would differ by their unit alone. */
const THINGS = [
  { name: 'einer Trinkflasche', usual: '750 ml', cm3: 750, units: ['l', 'dm³'] },
  { name: 'einem Kochtopf', usual: '3 l', cm3: 3000, units: ['dm³', 'ml', 'cm³'] },
  { name: 'einer Badewanne', usual: '150 l', cm3: 150_000, units: ['m³', 'dm³'] },
  { name: 'einem Klassenzimmer', usual: '200 m³', cm3: 200_000_000, units: ['l', 'dm³'] },
  { name: 'einem Spielwürfel', usual: '4 cm³', cm3: 4, units: ['ml'] },
  { name: 'einem Eimer', usual: '10 l', cm3: 10_000, units: ['dm³', 'ml'] },
  { name: 'einem Schulranzen', usual: '20 l', cm3: 20_000, units: ['dm³', 'm³'] },
  { name: 'einem kleinen Aquarium', usual: '60 l', cm3: 60_000, units: ['dm³', 'm³'] },
  { name: 'einer Tasse', usual: '200 ml', cm3: 200, units: ['cm³', 'l'] },
  { name: 'einer Regentonne', usual: '200 l', cm3: 200_000, units: ['dm³', 'm³'] },
  { name: 'einem Kühlschrank', usual: '300 l', cm3: 300_000, units: ['dm³', 'm³'] },
  { name: 'einem Schwimmbecken', usual: '500 m³', cm3: 500_000_000, units: ['l', 'dm³'] },
] as const;

const s3Plausible: Forms[3][3] = (rng) => {
  if (rng.chance(0.5)) {
    // 20 · 50 and 25 · 40 are 1000: the litres would be the third edge, printed in the task and in the picture
    let edges = rng.sample([20, 25, 30, 40, 50, 60], 3);
    while (edges.includes(edges[0] * edges[1] * edges[2] / 1000)) edges = rng.sample([20, 25, 30, 40, 50, 60], 3);
    const [a, b, c] = edges;
    const cm3 = a * b * c;
    const litres = clean(cm3 / 1000);
    return {
      key: `aquarium:${a}-${b}-${c}`,
      context: `Ein Aquarium ist ${a} cm lang, ${b} cm breit und ${c} cm hoch.`,
      prompt: 'Wie viel Liter Wasser passen hinein?',
      visual: quaderPic(a, b, c),
      answer: commaAnswer(litres, 'l'),
      hints: ['Rechne zuerst das Volumen in cm³ aus.', '1000 cm³ sind 1 l.'],
      steps: [`${a} · ${b} · ${c} = ${fmt(cm3)}`, `Das Volumen ist ${q(cm3, 'cm³')}.`, `${fmt(cm3)} : 1000 = ${fmt(litres)}`, `Es passen ${q(litres, 'l')} Wasser hinein.`],
      bugs: [
        bug('ohne-umrechnen', cm3, 'Das sind cm³. Gefragt sind Liter.'),
        bug('volumeneinheit-hundert', clean(cm3 / 100), 'Bei Volumen ist jeder Schritt durch 1000, nicht durch 100.'),
        bug('volumeneinheit-zehn', clean(cm3 / 10), 'Bei Volumen ist jeder Schritt durch 1000, nicht durch 10.'),
      ],
      praise: 'Du hast vom Volumen zu Litern umgerechnet.',
      kmk: [...KMK, 'GM.oberflaeche-volumen', 'PK.modellieren'],
    };
  }
  const thing = rng.pick(THINGS);
  const unit = rng.pick<keyof typeof CM3_IN>(thing.units);
  const value = clean(thing.cm3 / CM3_IN[unit]);
  // All in one unit: only the size decides, so a child converts before comparing.
  const scales = value >= 1000 ? [0.01, 0.1, 10] : [0.1, 10, 100];
  return {
    key: `passt:${thing.name}:${unit}`,
    prompt: `Welches Volumen passt zu ${thing.name}?`,
    answer: makeChoice(rng, { label: q(value, unit) }, scales.map((scale) => ({ label: q(clean(value * scale), unit), whyWrong: 'Rechne in Liter um. 1 l füllt einen Milchkarton, 1 m³ sind 1000 l.' }))),
    hints: ['Rechne jede Angabe in eine Einheit um, die du dir vorstellen kannst.', '1 l passt in einen Milchkarton. 1 m³ sind 1000 l.'],
    steps: ['1 cm³ ist ein Zuckerwürfel, 1 l ein Milchkarton, 1 m³ eine große Kiste.', `${q(value, unit)} sind so viel wie ${thing.usual}.`, `Zu ${thing.name} passt ${q(value, unit)}.`],
    praise: 'Du hast umgerechnet und die Größe verglichen.',
    kmk: [...KMK, 'PK.modellieren'],
  };
};

export const volumeneinheitenSkill: SkillDef = {
  ...SKILL,
  title: 'Volumeneinheiten',
  description: 'Du wandelst cm³, dm³, m³, ml und l um.',
  stufen: { 1: 'cm³ und ml, dm³ und l', 2: 'm³ und dm³, ganze Zahlen', 3: 'Kommazahlen, gemischte Einheiten ordnen, passendes Volumen' },
  kmk: KMK,
  keys: { comma: true },
  generate: generator(SKILL, KMK, {
    1: { 1: s1Same, 2: s1Jug, 3: s1Bridge },
    2: { 1: s2Down, 2: s2Up, 3: s2Mixed },
    3: { 1: s3Comma, 2: s3Order, 3: s3Plausible },
  }),
};
