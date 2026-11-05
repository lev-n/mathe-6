/**
 * flaechen.dreieck (docs/research.md §6). The comma key is on for the whole skill, so every field sets `decimals`.
 * Stufe 1: right triangle, half a rectangle. AB I an even product, AB II an odd product or longer sides, AB III the rectangle from the triangle.
 * Stufe 2: general triangle. AB I g and h, AB II a distractor side, AB III the height outside.
 * Stufe 3: h from A, composite figures. AB I h from A, AB II a house, AB III a cut corner or g from A with a comma.
 */
import { fmt } from '../../core/format';
import type { SkillDef, VisualOf } from '../../core/types';
import { HINT, TRIPLES, bug, clean, commaAnswer, figure, generator, q, type Forms } from './common';

const SKILL = { id: 'flaechen.dreieck', topicId: 'flaechen' } as const;
const KMK = ['GM.flaeche'];

const FORMULA = 'Fläche: Grundseite · Höhe, davon die Hälfte.';
const PLUS = 'Die Fläche ist kein Plus. Rechne Grundseite · Höhe, dann die Hälfte.';

/** A right triangle, the right angle lower left. */
const rightTriangle = (a: number, b: number): VisualOf<'figure'> => figure({
  points: [{ x: 0, y: b }, { x: a, y: b }, { x: 0, y: 0 }],
  sides: [q(a, 'cm'), null, q(b, 'cm')],
  rightAngles: [0],
});

/** A triangle with its base below, the top corner at x = top (before the base gives a height outside). */
function triangle(g: number, h: number, top: number, labels: { base?: string; height?: string; left?: string; right?: string } = {}): VisualOf<'figure'> {
  return figure({
    points: [{ x: 0, y: h }, { x: g, y: h }, { x: top, y: 0 }],
    sides: [labels.base ?? q(g, 'cm'), labels.right ?? null, labels.left ?? null],
    height: { from: 2, to: { x: top, y: h }, label: labels.height ?? q(h, 'cm'), ...(top < 0 ? { outside: true } : {}) },
  });
}

// ─── Stufe 1 ─────────────────────────────────────────────────────────────────

const halfSteps = (a: number, b: number) => {
  const box = a * b;
  return [`Rechteck: ${a} · ${b} = ${box}`, `Die Hälfte: ${box} : 2 = ${fmt(box / 2)}`, `Die Fläche ist ${q(box / 2, 'cm²')}.`];
};

const halfBugs = (a: number, b: number) => [
  bug('dreieck-ohne-halb', a * b, HINT.rechteckHalb),
  bug('seiten-plus', a + b, PLUS),
];

const s1Even: Forms[1][1] = (rng) => {
  const a = rng.pick([4, 6, 8, 10, 12]);
  const b = rng.int(3, 9);
  return {
    key: `halb:${a}x${b}`,
    prompt: 'Das Dreieck ist die Hälfte eines Rechtecks. Wie groß ist die Fläche?',
    visual: rightTriangle(a, b),
    answer: commaAnswer(a * b / 2, 'cm²', 'Fläche:'),
    hints: ['Rechne zuerst die Fläche des ganzen Rechtecks.', 'Nimm davon die Hälfte.'],
    steps: halfSteps(a, b),
    bugs: halfBugs(a, b),
    praise: 'Du hast das Rechteck halbiert.',
  };
};

const s1Odd: Forms[1][2] = (rng) => {
  const a = rng.chance(0.5) ? rng.pick([3, 5, 7, 9, 11, 13]) : rng.int(11, 20);
  const b = rng.pick([3, 5, 7, 9, 11]);
  return {
    key: `halb-schwer:${a}x${b}`,
    prompt: 'Das Dreieck ist die Hälfte eines Rechtecks. Wie groß ist die Fläche?',
    visual: rightTriangle(a, b),
    answer: commaAnswer(a * b / 2, 'cm²', 'Fläche:'),
    hints: ['Rechne zuerst die Fläche des ganzen Rechtecks.', 'Die Hälfte kann eine Kommazahl sein.'],
    steps: halfSteps(a, b),
    bugs: halfBugs(a, b),
    // b is odd: an even a gives an even product, and no odd number was halved
    praise: a * b % 2 === 1 ? 'Du hast auch eine ungerade Zahl halbiert.' : 'Du hast auch mit einer längeren Seite gerechnet und halbiert.',
  };
};

const s1Back: Forms[1][3] = (rng) => {
  const a = rng.int(3, 12);
  const b = rng.int(3, 12);
  const half = a * b / 2;
  return {
    key: `rechteck-aus-dreieck:${fmt(half)}`,
    prompt: `Eine Diagonale teilt ein Rechteck in zwei gleiche Dreiecke. Ein Dreieck hat ${q(half, 'cm²')}. Wie groß ist das Rechteck?`,
    answer: commaAnswer(a * b, 'cm²', 'Rechteck:'),
    hints: ['Das Rechteck besteht aus zwei gleichen Dreiecken.', 'Verdopple die Fläche des Dreiecks.'],
    steps: [`Zwei Dreiecke: 2 · ${fmt(half)} = ${a * b}`, `Das Rechteck hat ${a * b} cm².`],
    bugs: [
      bug('halb-statt-doppelt', half / 2, 'Das Rechteck ist größer als das Dreieck. Verdopple die Fläche.'),
      bug('rechteck-gleich', half, 'Das ist ein Dreieck. Das Rechteck besteht aus zwei Dreiecken.'),
    ],
    praise: 'Du hast vom Dreieck auf das Rechteck geschlossen.',
    kmk: [...KMK, 'PK.argumentieren'],
  };
};

// ─── Stufe 2 ─────────────────────────────────────────────────────────────────

const generalSteps = (g: number, h: number) => [`Grundseite · Höhe: ${g} · ${h} = ${g * h}`, `Die Hälfte: ${g * h} : 2 = ${fmt(g * h / 2)}`, `Die Fläche ist ${q(g * h / 2, 'cm²')}.`];

const s2General: Forms[2][1] = (rng) => {
  const g = rng.int(5, 16);
  const h = rng.int(3, 12);
  const top = rng.int(1, g - 1);
  return {
    key: `allgemein:${g}x${h}`,
    prompt: 'Die Höhe ist gestrichelt. Wie groß ist die Fläche des Dreiecks?',
    visual: triangle(g, h, top),
    answer: commaAnswer(g * h / 2, 'cm²', 'Fläche:'),
    hints: [FORMULA, HINT.dreieckHalb],
    steps: generalSteps(g, h),
    bugs: [bug('dreieck-ohne-halb', g * h, HINT.dreieckHalb), bug('seiten-plus', g + h, PLUS)],
    praise: 'Du hast Grundseite und Höhe genommen und halbiert.',
  };
};

/** A triple whose offset leaves room on the base: the slanted side is the distractor. */
const s2Distractor: Forms[2][2] = (rng) => {
  const [h, top, side] = rng.pick(TRIPLES.filter(([, shift]) => shift <= 12));
  const g = rng.int(top + 2, top + 8);
  return {
    key: `schraeg:${g}:${h}:${side}`,
    prompt: 'Drei Maße stehen im Bild. Wie groß ist die Fläche des Dreiecks?',
    visual: triangle(g, h, top, { left: q(side, 'cm') }),
    answer: commaAnswer(g * h / 2, 'cm²', 'Fläche:'),
    hints: ['Die Höhe ist gestrichelt. Die schräge Seite brauchst du nicht.', FORMULA],
    steps: generalSteps(g, h),
    bugs: [
      bug('schraege-seite', g * side / 2, HINT.schraegeSeite),
      bug('dreieck-ohne-halb', g * h, HINT.dreieckHalb),
      bug('schraege-ohne-halb', g * side, 'Nimm die Höhe statt der schrägen Seite. Denk auch an die Hälfte.'),
    ],
    praise: 'Du hast die Höhe statt der schrägen Seite genommen.',
  };
};

const s2Outside: Forms[2][3] = (rng) => {
  // The long slanted side carries the distractor: beside the height a label would run into the height's own. A flat triple keeps both labels apart.
  const [h, reach, side] = rng.pick(TRIPLES.filter(([x, y]) => x < y));
  const g = rng.int(Math.ceil(reach / 2), reach - 1);
  const shift = reach - g;
  return {
    key: `aussen:${g}:${h}:${side}`,
    prompt: 'Die Höhe liegt außerhalb des Dreiecks. Wie groß ist die Fläche des Dreiecks?',
    visual: triangle(g, h, -shift, { right: q(side, 'cm') }),
    answer: commaAnswer(g * h / 2, 'cm²', 'Fläche:'),
    hints: ['Die Grundseite bleibt gleich lang. Die Höhe steht auf ihrer Verlängerung.', FORMULA],
    steps: generalSteps(g, h),
    bugs: [
      bug('schraege-seite', g * side / 2, HINT.schraegeSeite),
      bug('dreieck-ohne-halb', g * h, HINT.dreieckHalb),
      bug('fuss-dazu', reach * h / 2, 'Die Grundseite endet an der Ecke. Das Stück bis zur Höhe zählt nicht.'),
    ],
    praise: 'Du hast auch die Höhe außerhalb richtig genutzt.',
    kmk: [...KMK, 'PK.darstellen'],
  };
};

// ─── Stufe 3 ─────────────────────────────────────────────────────────────────

const s3Height: Forms[3][1] = (rng) => {
  const g = rng.int(4, 16);
  // never the base again: the task would print its answer
  const h = rng.pick([3, 4, 5, 6, 7, 8, 9, 10, 11, 12].filter((n) => n !== g));
  const area = g * h / 2;
  return {
    key: `hoehe:${fmt(area)}:${g}`,
    prompt: `Ein Dreieck hat die Fläche ${q(area, 'cm²')}. Die Grundseite ist ${g} cm lang. Wie groß ist die Höhe?`,
    visual: triangle(g, h, rng.int(1, g - 1), { height: 'h = ?' }),
    answer: commaAnswer(h, 'cm', 'Höhe:'),
    hints: ['Verdopple zuerst die Fläche: Das ergibt ein Parallelogramm.', 'Teile dann durch die Grundseite.'],
    steps: [`Verdoppeln: 2 · ${fmt(area)} = ${g * h}`, `${g * h} : ${g} = ${h}`, `Die Höhe ist ${h} cm.`],
    bugs: [
      bug('ohne-verdoppeln', clean(area / g), 'Die Hälfte fehlt noch in deiner Rechnung. Verdopple zuerst die Fläche.'),
      bug('minus-statt-geteilt', clean(area - g), 'Die Fläche ist ein Produkt. Rechne rückwärts mit geteilt.'),
    ],
    praise: 'Du hast zuerst verdoppelt und dann geteilt.',
  };
};

const s3House: Forms[3][2] = (rng) => {
  const w = rng.pick([4, 6, 8, 10, 12]);
  const wall = rng.int(3, 9);
  const roof = rng.int(2, 7);
  const box = w * wall;
  const top = w * roof / 2;
  return {
    key: `haus:${w}:${wall}:${roof}`,
    prompt: 'Die Figur besteht aus einem Rechteck und einem Dreieck. Wie groß ist die Fläche?',
    visual: figure({
      points: [{ x: 0, y: roof }, { x: w / 2, y: 0 }, { x: w, y: roof }, { x: w, y: roof + wall }, { x: 0, y: roof + wall }],
      sides: [null, null, q(wall, 'cm'), q(w, 'cm'), null],
      height: { from: 1, to: { x: w / 2, y: roof }, label: q(roof, 'cm') },
    }),
    answer: commaAnswer(box + top, 'cm²', 'Fläche:'),
    hints: ['Rechne Rechteck und Dreieck einzeln.', 'Das Dreieck hat dieselbe Grundseite wie das Rechteck.'],
    steps: [`Rechteck: ${w} · ${wall} = ${box}`, `Dreieck: ${w} · ${roof} : 2 = ${fmt(top)}`, `${box} + ${fmt(top)} = ${fmt(box + top)}`, `Die Fläche ist ${q(box + top, 'cm²')}.`],
    bugs: [
      bug('dreieck-ohne-halb', box + w * roof, HINT.dreieckHalb),
      bug('nur-rechteck', box, 'Das ist nur das Rechteck. Das Dreieck gehört dazu.'),
      bug('huelle', w * (wall + roof), HINT.huelle),
    ],
    praise: 'Du hast die Figur in zwei bekannte Teile zerlegt.',
  };
};

const s3Hard: Forms[3][3] = (rng) => {
  if (rng.chance(0.5)) {
    const w = rng.int(8, 14);
    const h = rng.int(6, 10);
    const p = rng.int(2, 4);
    const r = rng.int(2, 4);
    const box = w * h;
    const cut = p * r / 2;
    return {
      key: `ecke:${w}:${h}:${p}:${r}`,
      prompt: `Von einem Rechteck fehlt eine Ecke: ein rechtwinkliges Dreieck mit ${p} cm und ${r} cm. Wie groß ist die Fläche?`,
      visual: figure({
        points: [{ x: 0, y: 0 }, { x: w - p, y: 0 }, { x: w, y: r }, { x: w, y: h }, { x: 0, y: h }],
        sides: [null, null, null, q(w, 'cm'), q(h, 'cm')],
        rightAngles: [0, 3, 4],
      }),
      answer: commaAnswer(box - cut, 'cm²', 'Fläche:'),
      hints: ['Rechne zuerst das ganze Rechteck.', 'Ziehe das Dreieck danach ab. Denk an die Hälfte.'],
      steps: [`Rechteck: ${w} · ${h} = ${box}`, `Dreieck: ${p} · ${r} : 2 = ${fmt(cut)}`, `${box} − ${fmt(cut)} = ${fmt(box - cut)}`, `Die Fläche ist ${q(box - cut, 'cm²')}.`],
      bugs: [
        bug('dreieck-ohne-halb', box - p * r, HINT.dreieckHalb),
        bug('huelle', box, HINT.huelle),
        bug('ecke-addiert', box + cut, 'Die Ecke fehlt. Ziehe das Dreieck ab.'),
      ],
      praise: 'Du hast das fehlende Dreieck abgezogen.',
      kmk: [...KMK, 'PK.problemloesen'],
    };
  }
  const h = rng.pick([4, 5, 8, 10]);
  const g = clean(rng.int(3, 12) + 0.5);
  const area = clean(g * h / 2);
  return {
    key: `grundseite:${fmt(area)}:${h}`,
    prompt: `Ein Dreieck hat die Fläche ${q(area, 'cm²')} und die Höhe ${h} cm. Wie lang ist die Grundseite?`,
    answer: commaAnswer(g, 'cm', 'Grundseite:'),
    hints: ['Verdopple zuerst die Fläche.', 'Teile dann durch die Höhe.'],
    steps: [`Verdoppeln: 2 · ${fmt(area)} = ${fmt(clean(g * h))}`, `${fmt(clean(g * h))} : ${h} = ${fmt(g)}`, `Die Grundseite ist ${q(g, 'cm')} lang.`],
    bugs: [
      bug('ohne-verdoppeln', clean(area / h), 'Die Hälfte fehlt noch in deiner Rechnung. Verdopple zuerst die Fläche.'),
      bug('minus-statt-geteilt', clean(area - h), 'Die Fläche ist ein Produkt. Rechne rückwärts mit geteilt.'),
    ],
    praise: 'Du hast zuerst verdoppelt und dann geteilt.',
  };
};

export const dreieckSkill: SkillDef = {
  ...SKILL,
  title: 'Dreieck',
  description: 'Du rechnest die Fläche als halbes Parallelogramm oder Rechteck.',
  stufen: { 1: 'Rechtwinkliges Dreieck als halbes Rechteck', 2: 'Allgemeines Dreieck, Extra-Seite, Höhe außerhalb', 3: 'Höhe aus der Fläche, zusammengesetzte Figuren' },
  kmk: KMK,
  keys: { comma: true },
  generate: generator(SKILL, KMK, {
    1: { 1: s1Even, 2: s1Odd, 3: s1Back },
    2: { 1: s2General, 2: s2Distractor, 3: s2Outside },
    3: { 1: s3Height, 2: s3House, 3: s3Hard },
  }),
};
