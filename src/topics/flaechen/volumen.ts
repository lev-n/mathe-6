/**
 * flaechen.volumen (docs/research.md §6). The comma key is on for the whole skill, so every field sets `decimals`.
 * Stufe 1: layers of unit cubes. AB I count in a Quader, AB II cubes per layer, layers and all, AB III layers from the number of cubes, or the cubes still missing.
 * Stufe 2: a · b · c, edges ≤ 12 cm. AB I small edges, AB II a story up to 12, AB III an edge twice as long, or the larger of two.
 * Stufe 3: a missing edge, composite Quader, decimals. AB I the edge from V, AB II a composite Quader, AB III decimals.
 */
import { fmt } from '../../core/format';
import type { SkillDef } from '../../core/types';
import { makeChoice, pickPerson } from '../shared';
import { bug, clean, commaAnswer, commaField, generator, q, quaderPic, type Forms } from './common';

const SKILL = { id: 'flaechen.volumen', topicId: 'flaechen' } as const;
const KMK = ['GM.oberflaeche-volumen'];

const LAYER = 'Zähle eine Lage. Wie viele Lagen hat der Quader?';
const SURFACE = 'Das ist die Oberfläche. Volumen heißt: Länge · Breite · Höhe.';
const PLUS = 'Das Volumen ist ein Produkt: Länge · Breite · Höhe.';
const ONE_LAYER = 'Das ist eine Lage. Rechne noch mal die Höhe.';

const surface = (a: number, b: number, c: number) => clean(2 * (a * b + a * c + b * c));

const volumeBugs = (a: number, b: number, c: number) => [
  bug('volumen-oberflaeche', surface(a, b, c), SURFACE),
  bug('kanten-plus', clean(a + b + c), PLUS),
  bug('eine-lage', clean(a * b), ONE_LAYER),
];

// ─── Stufe 1 ─────────────────────────────────────────────────────────────────

const s1Count: Forms[1][1] = (rng) => {
  const a = rng.int(2, 5);
  const b = rng.int(2, 4);
  const c = rng.int(2, 4);
  const V = a * b * c;
  return {
    key: `lagen:${a}-${b}-${c}`,
    prompt: 'Jeder kleine Würfel hat 1 cm³. Wie viele kleine Würfel hat der Quader?',
    visual: { type: 'quader', a, b, c, showLabels: false, hiddenEdges: 'none', unitCubes: true },
    answer: commaAnswer(V, 'Würfel'),
    hints: [LAYER, 'Eine Lage liegt ganz unten. Alle Lagen sind gleich groß.'],
    steps: [`Eine Lage: ${a} · ${b} = ${a * b}`, `Es sind ${c} Lagen.`, `${a * b} · ${c} = ${V}`, `Der Quader hat ${V} kleine Würfel.`],
    bugs: [
      bug('eine-lage', a * b, ONE_LAYER),
      bug('kanten-plus', a + b + c, PLUS),
      bug('sichtbare-flaechen', a * b + a * c + b * c, 'Du siehst nur die Würfel außen. Innen liegen noch mehr.'),
    ],
    praise: 'Du hast Lage für Lage gezählt.',
  };
};

const s1Fields: Forms[1][2] = (rng) => {
  const a = rng.int(2, 4);
  const b = rng.int(2, 4);
  const c = rng.int(2, 5);
  const layer = a * b;
  const V = layer * c;
  return {
    key: `lagen-felder:${a}-${b}-${c}`,
    prompt: 'Der Quader besteht aus kleinen Würfeln. Fülle alle Felder aus.',
    visual: { type: 'cubeBuilding', heights: Array.from({ length: b }, () => Array.from({ length: a }, () => c)), view: 'iso' },
    answer: { kind: 'multi', fields: [commaField('lage', layer, 'Würfel in einer Lage:'), commaField('lagen', c, 'Anzahl der Lagen:'), commaField('alle', V, 'Alle Würfel:')] },
    hints: ['Eine Lage liegt ganz unten. Zähle Reihen und Würfel in einer Reihe.', 'Wie viele Lagen liegen übereinander?'],
    steps: [`Eine Lage: ${a} · ${b} = ${layer}`, `Lagen: ${c}`, `Alle: ${layer} · ${c} = ${V}`, `Eine Lage hat ${layer}, es sind ${c} Lagen und ${V} Würfel.`],
    bugs: [bug('kanten-plus', { lage: layer, lagen: c, alle: layer + c }, 'Jede Lage hat gleich viele Würfel. Rechne mal, nicht plus.')],
    praise: 'Du hast Lagen und Würfel getrennt gezählt.',
  };
};

const s1Back: Forms[1][3] = (rng) => {
  const a = rng.int(2, 5);
  const b = rng.int(2, 5);
  const layer = a * b;
  if (rng.chance(0.5)) {
    // never as many layers as cubes in a layer: the task would print its answer
    const c = rng.pick([2, 3, 4, 5, 6].filter((n) => n !== layer));
    const V = layer * c;
    return {
      key: `lagen-rueck:${V}:${layer}`,
      prompt: `Ein Quader besteht aus ${V} kleinen Würfeln. Eine Lage hat ${layer} Würfel. Wie viele Lagen hat der Quader?`,
      answer: commaAnswer(c, 'Lagen'),
      hints: ['Alle Lagen sind gleich groß.', 'Teile alle Würfel durch die Würfel einer Lage.'],
      steps: [`□ · ${layer} = ${V}`, `${V} : ${layer} = ${c}`, `Der Quader hat ${c} Lagen.`],
      bugs: [bug('minus-statt-geteilt', V - layer, 'Jede Lage hat gleich viele Würfel. Teile durch eine Lage.')],
      praise: 'Du hast von den Würfeln auf die Lagen geschlossen.',
      kmk: [...KMK, 'PK.problemloesen'],
    };
  }
  const c = rng.int(3, 6);
  const V = layer * c;
  // at least two layers missing, and not as many as are in the box: the answer would be the layer or the cubes in the box, both printed in the task
  const missing = rng.pick(Array.from({ length: c - 2 }, (_, i) => i + 2).filter((n) => n !== c - n));
  const have = layer * (c - missing);
  return {
    key: `kiste-fehlt:${a}-${b}-${c}:${have}`,
    context: `In eine Kiste passen ${c} Lagen mit je ${layer} Würfeln. Es liegen schon ${have} Würfel in der Kiste.`,
    prompt: 'Wie viele Würfel fehlen noch?',
    answer: commaAnswer(V - have, 'Würfel'),
    hints: ['Rechne zuerst alle Würfel der vollen Kiste.', 'Ziehe dann die Würfel ab, die schon drin sind.'],
    steps: [`Volle Kiste: ${c} · ${layer} = ${V}`, `${V} − ${have} = ${V - have}`, `Es fehlen ${V - have} Würfel.`],
    bugs: [bug('nur-volle-kiste', V, 'Das ist die volle Kiste. Ein Teil liegt schon drin.')],
    praise: 'Du hast zuerst die volle Kiste gerechnet.',
    kmk: [...KMK, 'PK.modellieren'],
  };
};

// ─── Stufe 2 ─────────────────────────────────────────────────────────────────

const abcSteps = (a: number, b: number, c: number, unit = 'cm') => {
  const V = clean(a * b * c);
  return [`Grundfläche: ${fmt(a)} · ${fmt(b)} = ${fmt(clean(a * b))}`, `Mal Höhe: ${fmt(clean(a * b))} · ${fmt(c)} = ${fmt(V)}`, `Das Volumen ist ${q(V, `${unit}³`)}.`];
};

const s2Small: Forms[2][1] = (rng) => {
  const a = rng.int(2, 8);
  const b = rng.int(2, 8);
  const c = rng.int(2, 8);
  return {
    key: `abc:${a}-${b}-${c}`,
    prompt: 'Wie groß ist das Volumen des Quaders?',
    visual: quaderPic(a, b, c),
    answer: commaAnswer(a * b * c, 'cm³', 'Volumen:'),
    hints: ['Volumen: Länge · Breite · Höhe.', LAYER],
    steps: abcSteps(a, b, c),
    bugs: volumeBugs(a, b, c),
    praise: 'Du hast alle drei Kanten malgenommen.',
  };
};

const CONTAINERS = [
  { a: 'Ein Aquarium', the: 'des Aquariums' },
  { a: 'Eine Kiste', the: 'der Kiste' },
  { a: 'Ein Regalfach', the: 'des Regalfachs' },
] as const;

const s2Story: Forms[2][2] = (rng) => {
  const { a: one, the } = rng.pick(CONTAINERS);
  const a = rng.int(7, 12);
  const b = rng.int(5, 12);
  const c = rng.int(4, 10);
  return {
    key: `geschichte:${one}:${a}-${b}-${c}`,
    context: `${one} ist ${a} dm lang, ${b} dm breit und ${c} dm hoch.`,
    prompt: `Wie groß ist das Volumen ${the}?`,
    visual: quaderPic(a, b, c, { unit: 'dm' }),
    answer: commaAnswer(a * b * c, 'dm³', 'Volumen:'),
    hints: ['Volumen: Länge · Breite · Höhe.', 'Rechne zuerst die Grundfläche.'],
    steps: abcSteps(a, b, c, 'dm'),
    bugs: volumeBugs(a, b, c),
    praise: 'Du hast aus den Maßen das Volumen berechnet.',
    kmk: [...KMK, 'PK.modellieren'],
  };
};

const s2Reason: Forms[2][3] = (rng) => {
  if (rng.chance(0.5)) {
    const a = rng.int(2, 6);
    const b = rng.int(2, 6);
    const c = rng.int(2, 6);
    const V = a * b * c;
    return {
      key: `doppelt:${a}-${b}-${c}`,
      context: `Ein Quader ist ${a} cm lang, ${b} cm breit und ${c} cm hoch. Ein zweiter Quader ist doppelt so hoch.`,
      prompt: 'Wie groß ist das Volumen des zweiten Quaders?',
      answer: commaAnswer(2 * V, 'cm³', 'Volumen:'),
      hints: ['Doppelt so hoch heißt: doppelt so viele Lagen.', 'Die Lagen bleiben gleich groß.'],
      steps: [`Erster Quader: ${a} · ${b} · ${c} = ${V}`, `Doppelt so viele Lagen: 2 · ${V} = ${2 * V}`, `Das Volumen ist ${q(2 * V, 'cm³')}.`],
      bugs: [
        bug('alle-kanten', 8 * V, 'Nur die Höhe ändert sich. Länge und Breite bleiben gleich.'),
        bug('plus-zwei', a * b * (c + 2), 'Doppelt so hoch heißt mal 2, nicht plus 2.'),
        bug('nur-erster', V, 'Das ist der erste Quader. Der zweite ist doppelt so hoch.'),
      ],
      praise: 'Du hast gesehen: doppelte Höhe, doppeltes Volumen.',
      kmk: [...KMK, 'PK.argumentieren'],
    };
  }
  // One Quader at least as large on every sorted edge could be told by looking: the longer edges must lie on different sides.
  const sorted = (x: readonly number[]) => [...x].sort((p, q) => q - p);
  const covers = (x: readonly number[], y: readonly number[]) => sorted(x).every((n, i) => n >= sorted(y)[i]);
  const pickEdges = () => [rng.int(3, 12), rng.int(2, 8), rng.int(2, 6)] as const;
  let first = pickEdges();
  let second = pickEdges();
  while (covers(first, second) || covers(second, first) || first[0] * first[1] * first[2] === second[0] * second[1] * second[2]) {
    first = pickEdges();
    second = pickEdges();
  }
  const [a1, b1, c1] = first;
  const [a2, b2, c2] = second;
  const V1 = a1 * b1 * c1;
  const V2 = a2 * b2 * c2;
  const firstBigger = V1 > V2;
  const label = (name: string, x: number, y: number, z: number) => `${name}: ${x} cm, ${y} cm, ${z} cm`;
  const A = label('Quader A', a1, b1, c1);
  const B = label('Quader B', a2, b2, c2);
  return {
    key: `vergleich:${a1}-${b1}-${c1}:${a2}-${b2}-${c2}`,
    prompt: 'Welcher Quader hat das größere Volumen?',
    answer: makeChoice(rng, { label: firstBigger ? A : B }, [{ label: firstBigger ? B : A, whyWrong: 'Rechne bei beiden Quadern alle drei Kanten mal.' }], { order: [A, B] }),
    hints: ['Rechne beide Volumen aus.', 'Die längste Kante allein entscheidet nicht.'],
    steps: [`Quader A: ${a1} · ${b1} · ${c1} = ${V1}`, `Quader B: ${a2} · ${b2} · ${c2} = ${V2}`, `Quader ${firstBigger ? 'A' : 'B'} hat das größere Volumen.`],
    praise: 'Du hast beide Volumen gerechnet und verglichen.',
    kmk: [...KMK, 'PK.argumentieren'],
  };
};

// ─── Stufe 3 ─────────────────────────────────────────────────────────────────

const s3Edge: Forms[3][1] = (rng) => {
  const a = rng.int(3, 12);
  const b = rng.int(2, 10);
  // never an edge the task prints: it would be its own answer
  const c = rng.pick([2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].filter((n) => n !== a && n !== b));
  const V = a * b * c;
  return {
    key: `kante:${V}:${a}:${b}`,
    prompt: `Ein Quader hat das Volumen ${q(V, 'cm³')}. Der Quader ist ${a} cm lang und ${b} cm breit. Wie hoch ist der Quader?`,
    answer: commaAnswer(c, 'cm', 'Höhe:'),
    hints: ['Rechne zuerst die Grundfläche.', 'Teile das Volumen durch die Grundfläche.'],
    steps: [`Grundfläche: ${a} · ${b} = ${a * b}`, `${fmt(V)} : ${a * b} = ${c}`, `Der Quader ist ${c} cm hoch.`],
    bugs: [
      bug('nur-eine-kante', V / a, 'Teile durch die ganze Grundfläche, nicht nur durch eine Kante.'),
      bug('kanten-minus', V - a - b, 'Das Volumen ist ein Produkt. Rechne rückwärts mit geteilt.'),
    ],
    praise: 'Du hast rückwärts über die Grundfläche gerechnet.',
  };
};

const s3Composite: Forms[3][2] = (rng) => {
  const a = rng.int(6, 12);
  const b = rng.int(4, 10);
  const c = rng.int(4, 10);
  const x = rng.int(2, 4);
  const y = rng.int(2, 3);
  const z = rng.int(2, 3);
  const big = a * b * c;
  const cut = x * y * z;
  const V = big - cut;
  if (rng.chance(0.5)) {
    return {
      key: `ausschnitt:${a}-${b}-${c}:${x}-${y}-${z}`,
      prompt: `Aus der Ecke des Quaders fehlt ein Stück: ${x} cm breit, ${y} cm tief, ${z} cm hoch. Wie groß ist das Volumen?`,
      visual: quaderPic(a, b, c, { cutout: { a: x, b: y, c: z } }),
      answer: commaAnswer(V, 'cm³', 'Volumen:'),
      hints: ['Rechne zuerst den ganzen Quader.', 'Ziehe das fehlende Stück ab.'],
      steps: [`Ganzer Quader: ${a} · ${b} · ${c} = ${big}`, `Fehlendes Stück: ${x} · ${y} · ${z} = ${cut}`, `${big} − ${cut} = ${V}`, `Das Volumen ist ${q(V, 'cm³')}.`],
      bugs: [
        bug('huelle', big, 'Das ist der ganze Quader. Ein Stück fehlt.'),
        bug('ausschnitt-addiert', big + cut, 'Das Stück fehlt. Ziehe es ab.'),
        bug('nur-ausschnitt', cut, 'Das ist nur das fehlende Stück.'),
      ],
      praise: 'Du hast das fehlende Stück abgezogen.',
    };
  }
  const low = a * b * y;
  const top = x * y * z;
  const { name } = pickPerson(rng);
  return {
    key: `stapel:${a}-${b}-${y}:${x}-${z}`,
    context: `${name} baut eine Treppe aus zwei Quadern. Der untere Quader ist ${a} dm lang, ${b} dm breit und ${y} dm hoch. Der obere Quader ist ${x} dm lang, ${y} dm breit und ${z} dm hoch.`,
    prompt: 'Wie groß ist das Volumen der Treppe?',
    answer: commaAnswer(low + top, 'dm³', 'Volumen:'),
    hints: ['Rechne jeden Quader einzeln.', 'Addiere danach beide Volumen.'],
    steps: [`Unterer Quader: ${a} · ${b} · ${y} = ${low}`, `Oberer Quader: ${x} · ${y} · ${z} = ${top}`, `${low} + ${top} = ${low + top}`, `Das Volumen ist ${q(low + top, 'dm³')}.`],
    bugs: [
      bug('nur-ein-quader', low, 'Das ist nur der untere Quader. Der obere gehört dazu.'),
      bug('kanten-plus', a + b + y + x + y + z, PLUS),
    ],
    praise: 'Du hast die Treppe in zwei Quader zerlegt.',
    kmk: [...KMK, 'PK.modellieren'],
  };
};

const s3Decimal: Forms[3][3] = (rng) => {
  if (rng.chance(0.5)) {
    const a = clean(rng.int(1, 9) + 0.5);
    const b = rng.pick([2, 4, 6, 8]);
    const c = clean(rng.int(1, 9) + rng.pick([0.5, 0.2, 0.4]));
    const V = clean(a * b * c);
    return {
      key: `komma:${fmt(a)}-${b}-${fmt(c)}`,
      prompt: 'Wie groß ist das Volumen des Quaders?',
      visual: quaderPic(a, b, c),
      answer: commaAnswer(V, 'cm³', 'Volumen:'),
      hints: ['Volumen: Länge · Breite · Höhe.', 'Zähle am Ende die Stellen nach dem Komma.'],
      steps: abcSteps(a, b, c),
      bugs: volumeBugs(a, b, c),
      praise: 'Du hast auch mit Kommazahlen richtig malgenommen.',
    };
  }
  const a = rng.pick([2, 4, 5, 8, 10]);
  const b = rng.pick([2, 3, 4, 5, 6]);
  const c = clean(rng.int(1, 9) + rng.pick([0.5, 0.25, 0.75]));
  const V = clean(a * b * c);
  return {
    key: `kante-komma:${fmt(V)}:${a}:${b}`,
    prompt: `Ein Quader hat das Volumen ${q(V, 'cm³')}. Der Quader ist ${a} cm lang und ${b} cm breit. Wie hoch ist der Quader?`,
    answer: commaAnswer(c, 'cm', 'Höhe:'),
    hints: ['Rechne zuerst die Grundfläche.', 'Die Höhe kann eine Kommazahl sein.'],
    steps: [`Grundfläche: ${a} · ${b} = ${a * b}`, `${fmt(V)} : ${a * b} = ${fmt(c)}`, `Der Quader ist ${q(c, 'cm')} hoch.`],
    bugs: [
      bug('nur-eine-kante', clean(V / a), 'Teile durch die ganze Grundfläche, nicht nur durch eine Kante.'),
      bug('kanten-minus', clean(V - a - b), 'Das Volumen ist ein Produkt. Rechne rückwärts mit geteilt.'),
    ],
    praise: 'Du hast rückwärts bis zur Kommazahl gerechnet.',
  };
};

export const volumenSkill: SkillDef = {
  ...SKILL,
  title: 'Volumen',
  description: 'Du rechnest das Volumen von Quadern.',
  stufen: { 1: 'Lagen aus kleinen Würfeln zählen', 2: 'Länge · Breite · Höhe, Kanten bis 12 cm', 3: 'Fehlende Kante, zusammengesetzte Quader, Kommazahlen' },
  kmk: KMK,
  keys: { comma: true },
  generate: generator(SKILL, KMK, {
    1: { 1: s1Count, 2: s1Fields, 3: s1Back },
    2: { 1: s2Small, 2: s2Story, 3: s2Reason },
    3: { 1: s3Edge, 2: s3Composite, 3: s3Decimal },
  }),
};
