/**
 * flaechen.einheiten (docs/research.md §6). The comma key is on for the whole skill, so every field sets `decimals`.
 * Stufe 1: cm² and dm², whole numbers. AB I dm² to cm², AB II the other way or two digits, AB III two units at once.
 * Stufe 2: m² and cm², decimals. AB I whole m² to cm² in two steps (one step · 100 is the demand of Stufe 1), AB II a comma, big to small, AB III small to big, always into a comma.
 * Stufe 3: a and ha, order mixed units. AB I m² to whole ha, or two units to m², each with two steps (digits that simply join are the demand of Stufe 1), AB II order four areas, AB III order five with a comma,
 * or m² to ha with three places after the comma (one place more than Stufe 2 AB III, with the same two steps).
 */
import { fmt } from '../../core/format';
import type { Bug, OrderAnswer, Rng, SkillDef, VisualOf } from '../../core/types';
import { HINT, bug, clean, commaAnswer, commaField, generator, q, type Forms } from './common';

const SKILL = { id: 'flaechen.einheiten', topicId: 'flaechen' } as const;
const KMK = ['GM.flaecheneinheiten'];

const WAY_DOWN = 'Eine kleinere Einheit braucht mehr Quadrate. Die Zahl muss größer sein.';
const WAY_UP = 'Eine größere Einheit braucht weniger Quadrate. Die Zahl muss kleiner sein.';
const TWO_STEPS = 'Von m² zu cm² sind es zwei Schritte: erst dm², dann cm².';
const COMMA = 'Das Komma rückt nur zwei Stellen. Prüfe die Größe deines Ergebnisses.';

/** Ten rows of ten: 1 dm² in cm², for a worked step. */
const HUNDRED: VisualOf<'grid'> = { type: 'grid', width: 10, height: 10, cells: Array.from({ length: 100 }, (_, i) => [i % 10, Math.floor(i / 10)] as [number, number]), showOutline: true, caption: '1 dm² = 100 cm²' };

// ─── Stufe 1 ─────────────────────────────────────────────────────────────────

const s1Down: Forms[1][1] = (rng) => {
  const n = rng.int(2, 30);
  const v = n * 100;
  return {
    key: `dm-cm:${n}`,
    prompt: 'Rechne um.',
    expression: `${n} dm² = □ cm²`,
    answer: commaAnswer(v, 'cm²'),
    hints: [HINT.flaecheneinheit, 'Jedes dm² besteht aus 100 cm².'],
    steps: [{ text: '1 dm² = 100 cm²', visual: HUNDRED }, `${n} · 100 = ${v}`, `${n} dm² = ${v} cm²`],
    bugs: [bug('flaecheneinheit-zehn', n * 10, HINT.flaecheneinheit), bug('richtung', clean(n / 100), WAY_DOWN)],
    praise: 'Du hast mit 100 umgerechnet.',
  };
};

const s1Up: Forms[1][2] = (rng) => {
  if (rng.chance(0.5)) {
    const n = rng.int(2, 19) * 100;
    const v = n / 100;
    return {
      key: `cm-dm:${n}`,
      prompt: 'Rechne um.',
      expression: `${n} cm² = □ dm²`,
      answer: commaAnswer(v, 'dm²'),
      hints: ['100 cm² ergeben 1 dm².', 'Teile durch 100.'],
      steps: ['100 cm² = 1 dm²', `${n} : 100 = ${v}`, `${n} cm² = ${v} dm²`],
      bugs: [bug('flaecheneinheit-zehn', n / 10, HINT.flaecheneinheit), bug('richtung', n * 100, WAY_UP)],
      praise: 'Du hast in die größere Einheit umgerechnet.',
    };
  }
  const n = rng.int(31, 95);
  const v = n * 100;
  return {
    key: `dm-cm:${n}`,
    prompt: 'Rechne um.',
    expression: `${n} dm² = □ cm²`,
    answer: commaAnswer(v, 'cm²'),
    hints: [HINT.flaecheneinheit, 'Jedes dm² besteht aus 100 cm².'],
    steps: ['1 dm² = 100 cm²', `${n} · 100 = ${v}`, `${n} dm² = ${v} cm²`],
    bugs: [bug('flaecheneinheit-zehn', n * 10, HINT.flaecheneinheit), bug('richtung', clean(n / 100), WAY_DOWN)],
    praise: 'Du hast auch große Zahlen mit 100 umgerechnet.',
  };
};

const s1Mixed: Forms[1][3] = (rng) => {
  const big = rng.int(2, 9);
  const small = rng.pick([rng.int(1, 9), rng.int(11, 99)]);
  const total = big * 100 + small;
  if (rng.chance(0.5)) {
    return {
      key: `zwei-einheiten:zusammen:${big}:${small}`,
      prompt: 'Rechne alles in cm² um.',
      expression: `${big} dm² ${small} cm² = □ cm²`,
      answer: commaAnswer(total, 'cm²'),
      hints: ['Rechne zuerst die dm² in cm² um.', 'Addiere danach die übrigen cm².'],
      steps: [`${big} dm² = ${big * 100} cm²`, `${big * 100} + ${small} = ${total}`, `${big} dm² ${small} cm² = ${total} cm²`],
      bugs: [
        bug('ohne-umrechnen', big + small, 'Zwei verschiedene Einheiten: Rechne zuerst alles in cm² um.'),
        bug('flaecheneinheit-zehn', big * 10 + small, HINT.flaecheneinheit),
      ],
      praise: 'Du hast zuerst alles in cm² umgerechnet.',
    };
  }
  const expression = `${total} cm² = □ dm² □ cm²`;
  return {
    key: `zwei-einheiten:zerlegen:${total}`,
    prompt: 'Zerlege in dm² und cm².',
    expression,
    answer: { kind: 'multi', fields: [commaField('gross', big, 'Ganze:', 'dm²'), commaField('klein', small, 'Rest:', 'cm²')] },
    hints: ['Je 100 cm² ergeben 1 dm².', 'Die übrigen Quadrate bleiben cm².'],
    steps: [`${total} : 100 = ${big} und ${small} übrig`, `${big} dm² = ${big * 100} cm²`, `${big} dm² und ${small} cm²`],
    bugs: [bug('flaecheneinheit-zehn', { gross: Math.floor(total / 10), klein: total % 10 }, HINT.flaecheneinheit)],
    praise: 'Du hast die Zahl auf zwei Einheiten verteilt.',
  };
};

// ─── Stufe 2 ─────────────────────────────────────────────────────────────────

const s2Whole: Forms[2][1] = (rng) => {
  const n = rng.int(2, 30);
  const v = n * 10_000;
  return {
    key: `m-cm:${n}`,
    prompt: 'Rechne um.',
    expression: `${n} m² = □ cm²`,
    answer: commaAnswer(v, 'cm²'),
    hints: ['Gehe über dm²: erst mal 100, dann noch einmal mal 100.', '1 m² hat 100 dm². 1 dm² hat 100 cm².'],
    steps: ['1 m² = 100 dm²', '1 dm² = 100 cm²', `${n} · 100 · 100 = ${fmt(v)}`, `${n} m² = ${fmt(v)} cm²`],
    bugs: [
      bug('ein-schritt', n * 100, TWO_STEPS),
      bug('laengen-faktor', n * 1000, 'Bei Flächen ist jeder Schritt mal 100, nicht mal 10.'),
      bug('flaecheneinheit-zehn', n * 10, 'Bei Flächen ist jeder Schritt mal 100, nicht mal 10.'),
    ],
    praise: 'Du bist in zwei Schritten zu cm² gegangen.',
  };
};

const s2Comma: Forms[2][2] = (rng) => {
  const pairs = [['m²', 'dm²'], ['dm²', 'cm²']] as const;
  const [big, small] = rng.pick(pairs);
  const tenths = rng.chance(0.5);
  const n = tenths ? clean(rng.int(1, 9) + rng.pick([1, 2, 3, 4, 5, 6, 7, 8, 9]) / 10) : clean(rng.int(1, 9) + rng.pick([15, 25, 45, 75]) / 100);
  const v = clean(n * 100);
  return {
    key: `komma:${fmt(n)}${big}`,
    prompt: 'Rechne um.',
    expression: `${fmt(n)} ${big} = □ ${small}`,
    answer: commaAnswer(v, small),
    hints: [`1 ${big} sind 100 ${small}.`, 'Beim Malnehmen mit 100 rückt das Komma zwei Stellen.'],
    steps: [`1 ${big} = 100 ${small}`, `${fmt(n)} · 100 = ${fmt(v)}`, `${fmt(n)} ${big} = ${fmt(v)} ${small}`],
    bugs: [
      bug('flaecheneinheit-zehn', clean(n * 10), 'Bei Flächen ist jeder Schritt mal 100, nicht mal 10.'),
      bug('komma-weg', clean(n * (tenths ? 1000 : 10_000)), COMMA),
      bug('richtung', clean(n / 100), WAY_DOWN),
    ],
    praise: 'Du hast das Komma zwei Stellen verschoben.',
  };
};

const s2Reverse: Forms[2][3] = (rng) => {
  const toCm = rng.chance(0.5);
  // never a whole result: this form goes into a comma, and at 100 dm² the fact in the hint would be the answer
  const n = toCm ? rng.pick(Array.from({ length: 80 }, (_, i) => (i + 1) * 500).filter((x) => x % 10_000 !== 0)) : rng.pick(Array.from({ length: 396 }, (_, i) => (i + 5) * 5).filter((x) => x % 100 !== 0));
  const v = clean(n / (toCm ? 10_000 : 100));
  const from = toCm ? 'cm²' : 'dm²';
  return {
    key: `klein-gross:${n}${from}`,
    prompt: 'Rechne in m² um.',
    expression: `${fmt(n)} ${from} = □ m²`,
    answer: commaAnswer(v, 'm²'),
    hints: toCm ? ['Gehe über dm²: erst durch 100, dann noch einmal durch 100.', TWO_STEPS] : ['100 dm² ergeben 1 m².', 'Beim Teilen durch 100 rückt das Komma zwei Stellen.'],
    steps: toCm
      ? ['100 cm² = 1 dm²', '100 dm² = 1 m²', `${fmt(n)} : 100 : 100 = ${fmt(v)}`, `${fmt(n)} cm² = ${fmt(v)} m²`]
      : ['100 dm² = 1 m²', `${fmt(n)} : 100 = ${fmt(v)}`, `${fmt(n)} dm² = ${fmt(v)} m²`],
    bugs: [
      toCm && bug('ein-schritt', clean(n / 100), TWO_STEPS),
      bug('flaecheneinheit-zehn', clean(n / 10), 'Bei Flächen ist jeder Schritt durch 100, nicht durch 10.'),
      bug('richtung', n * 100, WAY_UP),
    ],
    praise: 'Du hast in die größere Einheit umgerechnet.',
  };
};

// ─── Stufe 3 ─────────────────────────────────────────────────────────────────

/** An order answer of areas with their value in m²; bug: the order by the number alone, without the unit. */
function areaOrder(rng: Rng, items: { label: string; m2: number; shown: number }[]): { answer: OrderAnswer; bugs: Bug[]; sorted: string[] } {
  const correctOrder = (list: typeof items) => list.map((_, i) => i).sort((x, y) => list[x].m2 - list[y].m2);
  let shown = rng.shuffle(items);
  const sortedIdx = correctOrder(shown);
  if (sortedIdx.every((v, i) => v === i)) shown = [...shown.slice(1), shown[0]];
  const correct = correctOrder(shown);
  const byNumber = shown.map((_, i) => i).sort((x, y) => shown[x].shown - shown[y].shown);
  const differs = byNumber.some((v, i) => v !== correct[i]);
  return {
    answer: { kind: 'order', items: shown.map((x) => x.label), correct, direction: 'aufsteigend' },
    bugs: differs ? [bug('nach-zahl', byNumber, 'Vergleiche erst in derselben Einheit. Die Zahl allein reicht nicht.')] : [],
    sorted: correct.map((i) => shown[i].label),
  };
}

const s3AHa: Forms[3][1] = (rng) => {
  const kind = rng.pick(['m-ha', 'ha-a', 'ha-m'] as const);
  if (kind === 'm-ha') {
    const n = rng.int(2, 40);
    const from = n * 10_000;
    return {
      key: `m-ha:${n}`,
      prompt: 'Rechne um.',
      expression: `${fmt(from)} m² = □ ha`,
      answer: commaAnswer(n, 'ha'),
      hints: ['Gehe über a: erst durch 100, dann noch einmal durch 100.', '100 m² sind 1 a. 100 a sind 1 ha.'],
      steps: ['100 m² = 1 a', '100 a = 1 ha', `${fmt(from)} : 100 : 100 = ${n}`, `${fmt(from)} m² = ${n} ha`],
      bugs: [bug('ein-schritt', from / 100, 'Von m² zu ha sind es zwei Schritte: erst a, dann ha.'), bug('flaecheneinheit-zehn', from / 1000, 'Bei Flächen ist jeder Schritt durch 100, nicht durch 10.'), bug('richtung', from * 100, WAY_UP)],
      praise: 'Du bist in zwei Schritten zu ha gegangen.',
    };
  }
  const ha = rng.int(2, 9);
  // two units whose digits never just join: ha to m² is two steps, and the rest does not fill the places left free
  const small = kind === 'ha-a' ? rng.int(5, 95) : rng.int(11, 99) * 10;
  const rest = kind === 'ha-a' ? small * 100 : small;
  const unit = kind === 'ha-a' ? 'a' : 'm²';
  const total = ha * 10_000 + rest;
  return {
    key: `zwei-einheiten:${kind}:${ha}:${small}`,
    prompt: 'Rechne alles in m² um.',
    expression: `${ha} ha ${small} ${unit} = □ m²`,
    answer: commaAnswer(total, 'm²'),
    hints: ['1 ha sind 100 a. 1 a sind 100 m².', 'Rechne zuerst jede Einheit in m² um. Addiere danach.'],
    steps: [`${ha} ha = ${fmt(ha * 10_000)} m²`, ...(kind === 'ha-a' ? [`${small} a = ${fmt(rest)} m²`] : []), `${fmt(ha * 10_000)} + ${fmt(rest)} = ${fmt(total)}`, `${ha} ha ${small} ${unit} = ${fmt(total)} m²`],
    bugs: [
      bug('ohne-umrechnen', ha + small, 'Zwei verschiedene Einheiten: Rechne zuerst alles in m² um.'),
      bug('ein-schritt', ha * 100 + small, 'Von ha zu m² sind es zwei Schritte: erst a, dann m².'),
      bug('flaecheneinheit-zehn', ha * 1000 + rest, 'Auch bei a und ha ist jeder Schritt mal 100.'),
    ],
    praise: 'Du hast zuerst alles in m² umgerechnet.',
  };
};

const s3Order: Forms[3][2] = (rng) => {
  const ha = rng.int(1, 3);
  const aBig = rng.pick([150, 180, 250, 320, 450]);
  const mSmall = rng.pick([900, 2500, 3400, 6500, 8000]);
  const aSmall = rng.int(5, 95);
  const items = [
    { label: q(ha, 'ha'), m2: ha * 10_000, shown: ha },
    { label: q(aBig, 'a'), m2: aBig * 100, shown: aBig },
    { label: q(mSmall, 'm²'), m2: mSmall, shown: mSmall },
    { label: q(aSmall, 'a'), m2: aSmall * 100, shown: aSmall },
  ];
  // two equal areas would leave no single right order
  if (new Set(items.map((x) => x.m2)).size < items.length) items[3] = { label: q(aSmall + 2, 'a'), m2: (aSmall + 2) * 100, shown: aSmall + 2 };
  const { answer, bugs, sorted } = areaOrder(rng, items);
  return {
    key: `ordnen:${ha}:${aBig}:${mSmall}:${aSmall}`,
    prompt: 'Ordne die Flächen. Beginne mit der kleinsten Fläche.',
    answer,
    hints: ['Rechne alle Flächen in m² um.', '1 a sind 100 m². 1 ha sind 100 a.'],
    steps: [`In m²: ${items.map((x) => fmt(x.m2)).join(', ')}`, `Geordnet: ${sorted.join(' < ')}`],
    bugs,
    praise: 'Du hast zuerst alles in dieselbe Einheit gebracht.',
    kmk: [...KMK, 'PK.problemloesen'],
  };
};

const s3Hard: Forms[3][3] = (rng) => {
  if (rng.chance(0.5)) {
    // a tens digit in the m²: three places after the comma, with a zero to place when the m² are few
    const m = rng.int(0, 9) * 100 + rng.int(1, 9) * 10;
    if (rng.chance(0.5)) {
      const n = rng.int(1, 39) * 1000 + m;
      const v = clean(n / 10_000);
      return {
        key: `m-ha-komma:${n}`,
        prompt: 'Rechne in ha um.',
        expression: `${fmt(n)} m² = □ ha`,
        answer: commaAnswer(v, 'ha'),
        hints: ['Gehe über a: erst durch 100, dann noch einmal durch 100.', 'Das Komma rückt zweimal um zwei Stellen.'],
        steps: [`${fmt(n)} m² = ${fmt(clean(n / 100))} a`, `${fmt(clean(n / 100))} a = ${fmt(v)} ha`, `${fmt(n)} m² = ${fmt(v)} ha`],
        bugs: [bug('ein-schritt', clean(n / 100), 'Von m² zu ha sind es zwei Schritte: erst a, dann ha.'), bug('flaecheneinheit-zehn', clean(n / 1000), 'Bei Flächen ist jeder Schritt durch 100, nicht durch 10.'), bug('richtung', n * 100, WAY_UP)],
        praise: 'Du hast das Komma in zwei Schritten verschoben.',
      };
    }
    const ha = rng.int(2, 9);
    const part = clean(m / 10_000);
    const v = clean(ha + part);
    return {
      key: `zwei-einheiten-komma:${ha}:${m}`,
      prompt: 'Rechne alles in ha um.',
      expression: `${ha} ha ${m} m² = □ ha`,
      answer: commaAnswer(v, 'ha'),
      hints: ['Gehe bei den m² über a: erst durch 100, dann noch einmal durch 100.', 'Addiere danach die ganzen ha.'],
      steps: [`${m} m² = ${fmt(part)} ha`, `${ha} + ${fmt(part)} = ${fmt(v)}`, `${ha} ha ${m} m² = ${fmt(v)} ha`],
      bugs: [
        bug('ohne-umrechnen', ha + m, 'Zwei verschiedene Einheiten: Rechne zuerst alles in ha um.'),
        bug('ein-schritt', clean(ha + m / 100), 'Von m² zu ha sind es zwei Schritte: erst a, dann ha.'),
        bug('flaecheneinheit-zehn', clean(ha + m / 1000), 'Bei Flächen ist jeder Schritt durch 100, nicht durch 10.'),
      ],
      praise: 'Du hast das Komma an der richtigen Stelle gesetzt.',
    };
  }
  const haA = rng.pick([0.8, 1.5, 1.2, 2.5]);
  const haB = rng.pick([0.3, 0.6, 3.5]);
  const a = rng.pick([95, 140, 210, 75]);
  const m = rng.pick([1800, 13_000, 7400, 26_000]);
  const a2 = rng.pick([45, 5, 310]);
  const items = [
    { label: q(haA, 'ha'), m2: clean(haA * 10_000), shown: haA },
    { label: q(haB, 'ha'), m2: clean(haB * 10_000), shown: haB },
    { label: q(a, 'a'), m2: a * 100, shown: a },
    { label: q(m, 'm²'), m2: m, shown: m },
    { label: q(a2, 'a'), m2: a2 * 100, shown: a2 },
  ];
  const { answer, bugs, sorted } = areaOrder(rng, items);
  return {
    key: `ordnen-komma:${haA}:${haB}:${a}:${m}:${a2}`,
    prompt: 'Ordne die Flächen. Beginne mit der kleinsten Fläche.',
    answer,
    hints: ['Rechne alle Flächen in m² um.', 'Das Komma bei ha rückt zweimal um zwei Stellen.'],
    steps: [`In m²: ${items.map((x) => fmt(x.m2)).join(', ')}`, `Geordnet: ${sorted.join(' < ')}`],
    bugs,
    praise: 'Du hast auch die Kommazahlen richtig einsortiert.',
    kmk: [...KMK, 'PK.problemloesen'],
  };
};

export const einheitenSkill: SkillDef = {
  ...SKILL,
  title: 'Flächeneinheiten',
  description: 'Du wandelst Flächeneinheiten um.',
  stufen: { 1: 'cm² und dm², ganze Zahlen', 2: 'm² und cm², auch mit Komma', 3: 'a und ha, gemischte Einheiten ordnen' },
  kmk: KMK,
  keys: { comma: true },
  generate: generator(SKILL, KMK, {
    1: { 1: s1Down, 2: s1Up, 3: s1Mixed },
    2: { 1: s2Whole, 2: s2Comma, 3: s2Reverse },
    3: { 1: s3AHa, 2: s3Order, 3: s3Hard },
  }),
};
