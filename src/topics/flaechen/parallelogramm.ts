/**
 * flaechen.parallelogramm (docs/research.md §6). The comma key is on for the whole skill, so every field sets `decimals`.
 * Stufe 1: g and h given, whole numbers. AB I small numbers, AB II a story with larger numbers, AB III what stays when it turns into a Rechteck.
 * Stufe 2: the slanted side as a distractor. AB I whole numbers, AB II a base with a comma, AB III a worked calculation that takes the slanted side.
 * Stufe 3: h from A, several base-height pairs. AB I h from A, AB II the height to the other side, AB III the same with a comma.
 */
import { fmt } from '../../core/format';
import type { Rng, SkillDef, VisualOf } from '../../core/types';
import { makeChoice, pickPerson } from '../shared';
import { HINT, TRIPLES, bug, clean, commaAnswer, figure, generator, q, rectFigure, type Forms } from './common';

const SKILL = { id: 'flaechen.parallelogramm', topicId: 'flaechen' } as const;
const KMK = ['GM.flaeche'];

const NO_HALF = 'Beim Parallelogramm nimmst du keine Hälfte. Rechne Grundseite · Höhe.';
const PRODUCT = 'Die Fläche ist ein Produkt. Rechne Grundseite · Höhe.';
const FORMULA = 'Fläche: Grundseite · Höhe.';
const HEIGHT = 'Die Höhe ist gestrichelt und steht senkrecht auf der Grundseite.';

/** A parallelogram: the base below, the top side moved by shift to the right, the height dashed from the top left corner. A shift beyond the base puts the height outside. */
function para(g: number, h: number, shift: number, unit: string, labels: { side?: string; left?: string; base?: string; height?: string }): VisualOf<'figure'> {
  return figure({
    points: [{ x: 0, y: h }, { x: g, y: h }, { x: g + shift, y: 0 }, { x: shift, y: 0 }],
    sides: [labels.base ?? q(g, unit), labels.side ?? null, null, labels.left ?? null],
    height: { from: 3, to: { x: shift, y: h }, label: labels.height ?? q(h, unit), ...(shift > g ? { outside: true } : {}) },
    parallelMarks: [[0, 2], [1, 3]],
  });
}

// ─── Stufe 1 ─────────────────────────────────────────────────────────────────

const s1Direct: Forms[1][1] = (rng) => {
  const g = rng.int(4, 12);
  const h = rng.int(2, 9);
  const shift = rng.int(1, 3);
  const area = g * h;
  return {
    key: `gh:${g}x${h}`,
    prompt: 'Wie groß ist die Fläche des Parallelogramms?',
    visual: para(g, h, shift, 'cm', { base: `g = ${g} cm`, height: `h = ${h} cm` }),
    answer: commaAnswer(area, 'cm²', 'Fläche:'),
    hints: [FORMULA, HEIGHT],
    steps: [`Grundseite · Höhe: ${g} · ${h} = ${area}`, `Die Fläche ist ${area} cm².`],
    bugs: [bug('halbiert', area / 2, NO_HALF), bug('seiten-plus', g + h, PRODUCT)],
    praise: 'Du hast Grundseite und Höhe malgenommen.',
  };
};

const PLACES = [{ a: 'Ein Beet', unit: 'm' }, { a: 'Eine Terrasse', unit: 'm' }, { a: 'Ein Schild', unit: 'dm' }] as const;

const s1Story: Forms[1][2] = (rng) => {
  const { a, unit } = rng.pick(PLACES);
  // Neither is a round number: 20 · 8 or 15 · 10 would ask for no calculation of its own.
  const g = rng.pick([11, 12, 13, 14, 15, 16, 17, 18, 19, 21, 22, 23, 24, 25]);
  const h = rng.pick([6, 7, 8, 9, 11, 12, 13, 14, 15]);
  const area = g * h;
  return {
    key: `geschichte:${a}:${g}x${h}`,
    context: `${a} hat die Form eines Parallelogramms.`,
    prompt: `Die Grundseite ist ${g} ${unit} lang, die Höhe ${h} ${unit}. Wie groß ist die Fläche?`,
    visual: para(g, h, rng.int(2, 5), unit, {}),
    answer: commaAnswer(area, `${unit}²`, 'Fläche:'),
    hints: [FORMULA, `Zerlege ${g} in ${g - g % 10} und ${g % 10}. Rechne jeden Teil mal ${h}.`],
    steps: [`${g} · ${h} = ${area}`, `Die Fläche ist ${area} ${unit}².`],
    bugs: [bug('halbiert', area / 2, NO_HALF), bug('seiten-plus', g + h, PRODUCT)],
    praise: 'Du hast auch mit großen Zahlen g · h gerechnet.',
    kmk: [...KMK, 'PK.modellieren'],
  };
};

/**
 * What stays when the triangle moves, in a task whose numbers decide: fixed statements would be one item in all their keys. Either the area of the new Rechteck, with the width of the triangle as a
 * third number that stays out, or the Rechteck of another shape with the same area, which has to be calculated.
 */
const s1Rectangle: Forms[1][3] = (rng) => {
  if (rng.chance(0.5)) {
    const g = rng.int(5, 12);
    const h = rng.int(2, g - 2);
    const shift = rng.int(1, 4);
    const area = g * h;
    const triangle = shift * h / 2;
    return {
      key: `zum-rechteck:flaeche:${g}x${h}:${shift}`,
      context: `Schneide das Dreieck links ab und lege es rechts an. Das Dreieck ist ${shift} cm breit.`,
      prompt: 'Wie groß ist die Fläche des neuen Rechtecks?',
      visual: para(g, h, shift, 'cm', { base: `g = ${g} cm`, height: `h = ${h} cm` }),
      answer: commaAnswer(area, 'cm²', 'Fläche:'),
      hints: ['Das Dreieck wandert nach rechts. Es füllt dort die Lücke.', 'Vergleiche Grundseite, Höhe und Fläche vor und nach dem Umlegen.'],
      steps: [{ text: 'Das Dreieck füllt rechts die Lücke.', visual: rectFigure(g, h, 'cm') }, 'Es kommt nichts dazu, und es fällt nichts weg.', `${g} · ${h} = ${area}`, `Die Fläche ist ${area} cm².`],
      bugs: [
        bug('dreieck-dazu', (g + shift) * h, 'Das Dreieck füllt nur die Lücke. Die Länge bleibt die Grundseite.'),
        bug('dreieck-flaeche-dazu', area + triangle, 'Das Dreieck war schon vorher ein Teil der Figur.'),
        bug('dreieck-flaeche-weg', area - triangle, 'Du legst das Dreieck nur um. Es geht nichts verloren.'),
        bug('halbiert', area / 2, NO_HALF),
      ],
      praise: 'Du hast die Fläche beim Umlegen verfolgt.',
      kmk: [...KMK, 'PK.argumentieren'],
    };
  }
  // g · h written as another Rechteck: g and h themselves would only be read off the picture
  const factors = (n: number) => Array.from({ length: n }, (_, i) => i + 1).filter((l) => n % l === 0 && n / l >= 2 && l >= n / l);
  let g = rng.int(5, 12);
  let h = rng.int(2, g - 2);
  while (factors(g * h).filter((l) => l !== g && l !== h).length === 0) {
    g = rng.int(5, 12);
    h = rng.int(2, g - 2);
  }
  const area = g * h;
  const length = rng.pick(factors(area).filter((l) => l !== g && l !== h));
  const width = area / length;
  const shift = rng.int(1, 4);
  const label = (x: number, y: number) => `${x} cm lang, ${y} cm breit`;
  const OTHER = 'Rechne Länge · Breite. Vergleiche mit Grundseite · Höhe.';
  return {
    key: `zum-rechteck:gleich:${g}x${h}:${length}`,
    context: 'Schneide das Dreieck links ab und lege es rechts an.',
    prompt: 'Welches Rechteck hat dieselbe Fläche wie das Parallelogramm?',
    visual: para(g, h, shift, 'cm', { base: `g = ${g} cm`, height: `h = ${h} cm` }),
    answer: makeChoice(rng, { label: label(length, width) }, [
      { label: label(g + shift, h), whyWrong: 'Das Dreieck füllt nur die Lücke. Die Länge bleibt die Grundseite.' },
      { label: label(length + 1, width), whyWrong: OTHER },
      { label: label(length, width + 1), whyWrong: OTHER },
    ]),
    hints: ['Beim Umlegen bleibt die Fläche gleich.', 'Rechne bei jedem Rechteck Länge · Breite.'],
    steps: [`Parallelogramm: ${g} · ${h} = ${area}`, `Rechteck: ${length} · ${width} = ${area}`, `Das Rechteck mit ${length} cm und ${width} cm hat dieselbe Fläche.`],
    praise: 'Du hast die Flächen gerechnet und verglichen.',
    kmk: [...KMK, 'PK.argumentieren'],
  };
};

// ─── Stufe 2 ─────────────────────────────────────────────────────────────────

/** A triple and a base that is longer than the offset, so the foot of the height lies on the base. */
function slanted(rng: Rng, maxH: number) {
  const [h, shift, side] = rng.pick(TRIPLES.filter(([x]) => x <= maxH));
  return { h, shift, side, g: rng.int(shift + 2, Math.max(shift + 6, 12)) };
}

const slantBugs = (g: number, h: number, side: number) => {
  const area = clean(g * h);
  return [
    bug('schraege-seite', clean(g * side), HINT.schraegeSeite),
    bug('umfang-flaeche', clean(2 * g + 2 * side), HINT.umfangFlaeche),
    bug('halbiert', clean(area / 2), NO_HALF),
    bug('hoehe-mal-seite', h * side, 'Die Höhe gehört zur Grundseite. Nimm nicht die schräge Seite.'),
  ];
};

const s2Whole: Forms[2][1] = (rng) => {
  const { h, shift, side, g } = slanted(rng, 12);
  const area = g * h;
  return {
    key: `schraeg:${g}:${h}:${side}`,
    prompt: 'Drei Maße stehen im Bild. Wie groß ist die Fläche des Parallelogramms?',
    visual: para(g, h, shift, 'cm', { side: q(side, 'cm') }),
    answer: commaAnswer(area, 'cm²', 'Fläche:'),
    hints: [HEIGHT, 'Eine Zahl brauchst du nicht.'],
    steps: [`Die Grundseite ist ${g} cm, die Höhe ${h} cm.`, `${g} · ${h} = ${area}`, `Die Fläche ist ${area} cm².`],
    bugs: slantBugs(g, h, side),
    praise: 'Du hast die Höhe statt der schrägen Seite genommen.',
  };
};

const s2Comma: Forms[2][2] = (rng) => {
  const { h, shift, side, g } = slanted(rng, 15);
  const base = clean(g + 0.5);
  const area = clean(base * h);
  return {
    key: `schraeg-komma:${fmt(base)}:${h}:${side}`,
    prompt: 'Drei Maße stehen im Bild. Wie groß ist die Fläche des Parallelogramms?',
    visual: para(base, h, shift, 'cm', { side: q(side, 'cm') }),
    answer: commaAnswer(area, 'cm²', 'Fläche:'),
    hints: [HEIGHT, 'Rechne mit dem Komma wie mit ganzen Zahlen. Setze es danach.'],
    steps: [`Die Grundseite ist ${fmt(base)} cm, die Höhe ${h} cm.`, `${fmt(base)} · ${h} = ${fmt(area)}`, `Die Fläche ist ${q(area, 'cm²')}.`],
    bugs: slantBugs(base, h, side),
    praise: 'Du hast die Höhe statt der schrägen Seite genommen.',
  };
};

const s2Detective: Forms[2][3] = (rng) => {
  const { h, shift, side, g } = slanted(rng, 12);
  const { name } = pickPerson(rng);
  return {
    key: `detektiv:${g}:${h}:${side}`,
    prompt: `${name} rechnet ${g} · ${side} = ${g * side}. Diese Rechnung stimmt noch nicht. Was muss ${name} ändern?`,
    visual: para(g, h, shift, 'cm', { side: q(side, 'cm') }),
    answer: makeChoice(rng, { label: `Statt ${side} cm die Höhe ${h} cm nehmen` }, [
      // With g = h the swap would change nothing.
      ...(g === h ? [] : [{ label: `Statt ${g} cm die Höhe ${h} cm nehmen`, whyWrong: 'Die Grundseite gehört in die Rechnung. Prüfe die andere Zahl.' }]),
      { label: 'Das Ergebnis halbieren', whyWrong: 'Beim Parallelogramm nimmst du keine Hälfte.' },
      { label: 'Die Seiten addieren', whyWrong: 'Addieren gehört zum Umfang. Gesucht ist die Fläche.' },
    ]),
    hints: ['Welche Zahlen gehören in die Formel?', HINT.schraegeSeite],
    steps: [`${side} cm ist die schräge Seite.`, `Die Höhe ist ${h} cm.`, `Richtig ist ${g} · ${h} = ${g * h}.`],
    praise: 'Du hast die schräge Seite in der Rechnung gefunden.',
    kmk: [...KMK, 'PK.argumentieren'],
  };
};

// ─── Stufe 3 ─────────────────────────────────────────────────────────────────

const s3Height: Forms[3][1] = (rng) => {
  const g = rng.int(4, 15);
  // never the base again: the task would print its answer
  const h = rng.pick([3, 4, 5, 6, 7, 8, 9, 10, 11, 12].filter((n) => n !== g));
  const area = g * h;
  return {
    key: `hoehe:${area}:${g}`,
    prompt: `Ein Parallelogramm hat die Fläche ${area} cm². Die Grundseite ist ${g} cm lang. Wie groß ist die Höhe?`,
    visual: para(g, h, rng.int(1, 3), 'cm', { height: 'h = ?' }),
    answer: commaAnswer(h, 'cm', 'Höhe:'),
    hints: ['Fläche = Grundseite · Höhe. Welche Zahl fehlt?', 'Rechne rückwärts mit geteilt.'],
    steps: [`${g} · □ = ${area}`, `${area} : ${g} = ${h}`, `Die Höhe ist ${h} cm.`],
    bugs: [
      bug('minus-statt-geteilt', area - g, 'Die Fläche ist ein Produkt. Rechne rückwärts mit geteilt.'),
      bug('dreieck-verdoppelt', 2 * area / g, 'Beim Parallelogramm verdoppelst du die Fläche nicht.'),
    ],
    praise: 'Du hast aus der Fläche die Höhe berechnet.',
  };
};

/**
 * Two sides with their heights, g1 · h1 = g2 · h2, in either order: all whole numbers where each height fits the other side and the figure is not too flat to read. A height may stand outside.
 */
const PAIRS: readonly (readonly [g1: number, h1: number, g2: number, h2: number])[] = (() => {
  const out: [number, number, number, number][] = [];
  for (let g1 = 6; g1 <= 24; g1++) {
    for (let h1 = 3; h1 <= 12; h1++) {
      for (let g2 = 6; g2 <= 24; g2++) {
        const h2 = g1 * h1 / g2;
        // h2 = g2 would print the answer in the task
        if (g2 === g1 || !Number.isInteger(h2) || h2 < 3 || h1 >= g2 || h2 >= g1 || h2 === g2) continue;
        if ((g1 + Math.sqrt(g2 * g2 - h1 * h1)) / h1 <= 9) out.push([g1, h1, g2, h2]);
      }
    }
  }
  return out;
})();

/** PAIRS with a comma in the second height. */
const COMMA_PAIRS: readonly (readonly [g1: number, h1: number, g2: number, h2: number])[] = [
  [10, 6, 8, 7.5], [15, 6, 12, 7.5], [12, 5, 8, 7.5], [9, 5, 6, 7.5], [18, 5, 12, 7.5], [14, 3, 4, 10.5], [13, 6, 12, 6.5], [21, 5, 14, 7.5], [20, 7, 16, 8.75], [11, 6, 12, 5.5],
];

function pairItem([g1, h1, g2, h2]: readonly [number, number, number, number], key: string, praise: string) {
  const area = g1 * h1;
  const shift = Math.sqrt(g2 * g2 - h1 * h1);
  return {
    key: `${key}:${g1}:${h1}:${g2}`,
    prompt: `Zur Seite ${g1} cm gehört die Höhe ${h1} cm. Die andere Seite ist ${g2} cm lang. Wie groß ist die Höhe zu dieser Seite?`,
    // on the left side: on the right its label would run into the height's, which stands beside the top corner and reaches the right side once the shift nears the base
    visual: para(g1, h1, Math.round(shift * 10) / 10, 'cm', { left: q(g2, 'cm') }),
    answer: commaAnswer(h2, 'cm', 'Höhe:'),
    hints: ['Jede Seite hat ihre eigene Höhe. Die Fläche bleibt gleich.', 'Rechne zuerst die Fläche aus.'],
    steps: [`Fläche: ${g1} · ${h1} = ${area}`, `Höhe zur anderen Seite: ${area} : ${g2} = ${fmt(h2)}`, `Die Höhe zu dieser Seite ist ${q(h2, 'cm')}.`],
    bugs: [
      bug('gleiche-hoehe', h1, 'Jede Seite hat ihre eigene Höhe. Rechne über die Fläche.'),
      bug('nur-flaeche', area, 'Das ist die Fläche. Teile die Fläche durch die andere Seite.'),
      bug('paar-gemischt', clean(g2 * h1 / g1), 'Die Höhe gehört zu ihrer Seite. Rechne zuerst die Fläche aus.'),
    ],
    praise,
    kmk: [...KMK, 'PK.problemloesen'],
  };
}

const s3Pairs: Forms[3][2] = (rng) => pairItem(rng.pick(PAIRS), 'paar', 'Du hast zu jeder Seite die passende Höhe genommen.');

const s3Hard: Forms[3][3] = (rng) => {
  if (rng.chance(0.5)) return pairItem(rng.pick(COMMA_PAIRS), 'paar-komma', 'Du hast über die Fläche die andere Höhe gefunden.');
  const g = rng.pick([4, 6, 8, 10, 12, 14]);
  const h = clean(rng.int(2, 11) + rng.pick([0.25, 0.5, 0.75]));
  const area = clean(g * h);
  return {
    key: `hoehe-komma:${fmt(area)}:${g}`,
    prompt: `Ein Parallelogramm hat die Fläche ${q(area, 'cm²')}. Die Grundseite ist ${g} cm lang. Wie groß ist die Höhe?`,
    visual: para(g, h, rng.int(1, 3), 'cm', { height: 'h = ?' }),
    answer: commaAnswer(h, 'cm', 'Höhe:'),
    hints: ['Fläche = Grundseite · Höhe. Welche Zahl fehlt?', 'Die Höhe kann eine Kommazahl sein.'],
    steps: [`${g} · □ = ${fmt(area)}`, `${fmt(area)} : ${g} = ${fmt(h)}`, `Die Höhe ist ${q(h, 'cm')}.`],
    bugs: [bug('minus-statt-geteilt', clean(area - g), 'Die Fläche ist ein Produkt. Rechne rückwärts mit geteilt.'), bug('dreieck-verdoppelt', clean(2 * area / g), 'Beim Parallelogramm verdoppelst du die Fläche nicht.')],
    praise: 'Du hast rückwärts bis zur Kommazahl gerechnet.',
  };
};

export const parallelogrammSkill: SkillDef = {
  ...SKILL,
  title: 'Parallelogramm',
  description: 'Du rechnest die Fläche mit Grundseite und Höhe.',
  stufen: { 1: 'Grundseite und Höhe gegeben, ganze Zahlen', 2: 'Auch die schräge Seite steht im Bild', 3: 'Höhe aus der Fläche, mehrere Paare aus Seite und Höhe' },
  kmk: KMK,
  keys: { comma: true },
  generate: generator(SKILL, KMK, {
    1: { 1: s1Direct, 2: s1Story, 3: s1Rectangle },
    2: { 1: s2Whole, 2: s2Comma, 3: s2Detective },
    3: { 1: s3Height, 2: s3Pairs, 3: s3Hard },
  }),
};
