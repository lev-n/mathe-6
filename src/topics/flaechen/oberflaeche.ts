/**
 * flaechen.oberflaeche (docs/research.md §6).
 * Stufe 1: Würfel, edge ≤ 10 cm, so a whole Oberfläche gives only 9 results: AB I also n Würfel and k faces. AB II from a net, one face or all edges, AB III the edge from the Oberfläche, also of n Würfel.
 * Stufe 2: Quader, edges ≤ 15 cm, via net. AB I from a net, AB II from a Schrägbild with longer edges, AB III one face from the Oberfläche.
 * Stufe 3: a box without a lid, composite Quader in stories. AB I a box, AB II a tower of Würfel or two Quader glued together, never drawn as one Quader (the routine of Stufe 2 would give the answer), AB III a smaller Quader on a larger one, or a corner sawn off.
 */
import type { Rng, SkillDef, VisualOf } from '../../core/types';
import { pickPerson } from '../shared';
import { HINT, bug, generator, q, quaderPic, wholeAnswer, type Forms } from './common';
import { quaderNet } from './nets';

const SKILL = { id: 'flaechen.oberflaeche', topicId: 'flaechen' } as const;
const KMK = ['GM.oberflaeche-volumen'];

const surface = (a: number, b: number, c: number) => 2 * (a * b + a * c + b * c);
const cube = (a: number): VisualOf<'quader'> => quaderPic(a, a, a, { kind: 'wuerfel' });
/** The field of a task that asks for a whole Oberfläche; any other task names its own: 'Oberfläche:' on a part would train the misconception of this skill. */
const answer = (value: number, unit = 'cm²', before = 'Oberfläche:') => wholeAnswer(value, unit, before);

const ONE_FACE = 'Das ist eine Fläche. Der Würfel hat sechs.';
const THREE_FACES = 'Das sind drei Flächen. Der Würfel hat sechs.';
const EDGES = 'Das sind die Kanten. Gefragt sind die Flächen.';
/** HINT.volumenOberflaeche says six faces: a box without a lid has five, and a composite solid more. */
const VOLUME_FIVE = 'Das ist das Volumen. Gefragt sind die fünf Flächen.';
const VOLUME_OUTSIDE = 'Das ist das Volumen. Für die Oberfläche addierst du alle Flächen außen.';

const cubeBugs = (a: number) => [
  bug('volumen-oberflaeche', a * a * a, HINT.volumenOberflaeche),
  bug('eine-flaeche', a * a, ONE_FACE),
  bug('oberflaeche-drei-flaechen', 3 * a * a, THREE_FACES),
  bug('kanten-summe', 12 * a, EDGES),
];

const cubeSteps = (a: number) => [`Eine Fläche: ${a} · ${a} = ${a * a}`, `Sechs Flächen: 6 · ${a * a} = ${6 * a * a}`, `Die Oberfläche ist ${q(6 * a * a, 'cm²')}.`];

const quaderSteps = (a: number, b: number, c: number, unit = 'cm') => [
  `Oben und unten: 2 · ${a} · ${b} = ${2 * a * b}`,
  `Vorne und hinten: 2 · ${a} · ${c} = ${2 * a * c}`,
  `Links und rechts: 2 · ${b} · ${c} = ${2 * b * c}`,
  `${2 * a * b} + ${2 * a * c} + ${2 * b * c} = ${surface(a, b, c)}`,
  `Die Oberfläche ist ${q(surface(a, b, c), `${unit}²`)}.`,
];

const quaderBugs = (a: number, b: number, c: number) => [
  bug('volumen-oberflaeche', a * b * c, HINT.volumenOberflaeche),
  bug('oberflaeche-drei-flaechen', a * b + a * c + b * c, HINT.oberflaecheDrei),
  bug('kanten-summe', 4 * (a + b + c), 'Das sind die Kanten. Gefragt sind die Flächen.'),
];

// ─── Stufe 1 ─────────────────────────────────────────────────────────────────

const s1Cube: Forms[1][1] = (rng) => {
  const kind = rng.pick(['ganz', 'papier', 'teil'] as const);
  if (kind === 'papier') {
    const a = rng.int(2, 8);
    const n = rng.int(2, 3);
    const one = 6 * a * a;
    return {
      key: `wuerfel-papier:${n}:${a}`,
      prompt: `Du beklebst ${n} gleiche Würfel ganz mit Papier. Wie viel cm² Papier brauchst du?`,
      visual: cube(a),
      answer: answer(n * one, 'cm²', 'Papier:'),
      hints: ['Rechne zuerst einen Würfel: sechs gleiche Flächen.', 'Nimm das Ergebnis dann mal die Zahl der Würfel.'],
      steps: [`Eine Fläche: ${a} · ${a} = ${a * a}`, `Ein Würfel: 6 · ${a * a} = ${one}`, `${n} Würfel: ${n} · ${one} = ${n * one}`, `Du brauchst ${q(n * one, 'cm²')} Papier.`],
      bugs: [...cubeBugs(a), bug('nur-ein-wuerfel', one, 'Das ist das Papier für einen Würfel. Du beklebst mehr.')],
      praise: 'Du hast die Flächen aller Würfel gerechnet.',
    };
  }
  if (kind === 'teil') {
    const a = rng.int(2, 10);
    const k = rng.int(2, 5);
    return {
      key: `wuerfel-teil:${k}:${a}`,
      prompt: `Du malst ${k} Flächen des Würfels an. Wie viel cm² malst du an?`,
      visual: cube(a),
      answer: answer(k * a * a, 'cm²', 'Fläche:'),
      hints: ['Rechne zuerst eine Fläche: Kante · Kante.', 'Alle Flächen des Würfels sind gleich groß.'],
      steps: [`Eine Fläche: ${a} · ${a} = ${a * a}`, `${k} Flächen: ${k} · ${a * a} = ${k * a * a}`, `Du malst ${q(k * a * a, 'cm²')} an.`],
      bugs: [
        bug('eine-flaeche', a * a, `Das ist eine Fläche. Du malst ${k} Flächen an.`),
        bug('alle-sechs', 6 * a * a, `Das sind alle sechs Flächen. Du malst ${k} Flächen an.`),
        bug('kanten-summe', 12 * a, EDGES),
      ],
      praise: 'Du hast genau die gefragten Flächen gerechnet.',
    };
  }
  const a = rng.int(2, 10);
  return {
    key: `wuerfel:${a}`,
    prompt: 'Wie groß ist die Oberfläche des Würfels?',
    visual: cube(a),
    answer: answer(6 * a * a),
    hints: ['Rechne zuerst eine Fläche: Kante · Kante.', 'Der Würfel hat sechs gleiche Flächen.'],
    steps: cubeSteps(a),
    bugs: cubeBugs(a),
    praise: 'Du hast alle sechs Flächen gerechnet.',
  };
};

const s1NetOrFace: Forms[1][2] = (rng) => {
  const kind = rng.pick(['netz', 'flaeche', 'kanten'] as const);
  // from 3 in the edge task: at 2 the 12 edges are 24 cm, and so is the Oberfläche the task asks for
  const a = rng.int(kind === 'kanten' ? 3 : 2, 10);
  if (kind === 'netz') {
    return {
      key: `wuerfelnetz:${a}`,
      prompt: 'Das Netz gehört zu einem Würfel. Wie groß ist die Oberfläche?',
      visual: quaderNet(a, a, a, { topWidth: q(a, 'cm') }),
      answer: answer(6 * a * a),
      hints: ['Jedes Quadrat im Netz ist eine Fläche des Würfels.', 'Zähle die Quadrate im Netz.'],
      steps: cubeSteps(a),
      bugs: cubeBugs(a),
      praise: 'Du hast im Netz alle sechs Flächen gesehen.',
      kmk: [...KMK, 'RF.koerper'],
    };
  }
  if (kind === 'kanten') {
    return {
      key: `wuerfelkanten:${a}`,
      prompt: `Alle 12 Kanten eines Würfels sind zusammen ${12 * a} cm lang. Wie groß ist die Oberfläche?`,
      answer: answer(6 * a * a),
      hints: ['Rechne zuerst die Länge einer Kante aus.', 'Rechne dann eine Fläche und alle sechs Flächen.'],
      steps: [`Eine Kante: ${12 * a} : 12 = ${a}`, `Eine Fläche: ${a} · ${a} = ${a * a}`, `Sechs Flächen: 6 · ${a * a} = ${6 * a * a}`, `Die Oberfläche ist ${q(6 * a * a, 'cm²')}.`],
      bugs: [bug('eine-flaeche', a * a, ONE_FACE), bug('oberflaeche-drei-flaechen', 3 * a * a, THREE_FACES)],
      praise: 'Du hast von den Kanten auf die Flächen geschlossen.',
    };
  }
  return {
    key: `wuerfelflaeche:${a}`,
    prompt: `Eine Fläche eines Würfels ist ${a * a} cm² groß. Wie groß ist die Oberfläche?`,
    answer: answer(6 * a * a),
    hints: ['Der Würfel hat sechs gleich große Flächen.', 'Die Kante brauchst du nicht.'],
    steps: [`Sechs Flächen: 6 · ${a * a} = ${6 * a * a}`, `Die Oberfläche ist ${q(6 * a * a, 'cm²')}.`],
    bugs: [bug('oberflaeche-drei-flaechen', 3 * a * a, THREE_FACES), bug('vier-flaechen', 4 * a * a, 'Oben und unten gehören auch dazu. Der Würfel hat sechs Flächen.')],
    praise: 'Du hast die eine Fläche auf alle sechs übertragen.',
  };
};

const s1Back: Forms[1][3] = (rng) => {
  const a = rng.int(2, 10);
  const O = 6 * a * a;
  if (rng.chance(0.5)) {
    // never the edge itself: the task would print its answer
    const n = rng.pick([2, 3].filter((x) => x !== a));
    return {
      key: `kante-aus-wuerfeln:${n}:${a}`,
      prompt: `${n} gleiche Würfel haben zusammen die Oberfläche ${q(n * O, 'cm²')}. Wie lang ist eine Kante?`,
      answer: wholeAnswer(a, 'cm', 'Kante:'),
      hints: ['Rechne zuerst die Oberfläche von einem Würfel aus.', 'Teile dann durch die Anzahl der Flächen.'],
      steps: [`Ein Würfel: ${n * O} : ${n} = ${O}`, `Eine Fläche: ${O} : 6 = ${a * a}`, `${a} · ${a} = ${a * a}`, `Eine Kante ist ${a} cm lang.`],
      bugs: [
        bug('eine-flaeche', a * a, 'Das ist eine Fläche. Gesucht ist die Seite des Quadrats.'),
        bug('nur-ein-wuerfel', O, 'Das ist die Oberfläche von einem Würfel. Gesucht ist die Kante.'),
      ],
      praise: 'Du hast von mehreren Würfeln auf eine Kante geschlossen.',
      kmk: [...KMK, 'PK.problemloesen'],
    };
  }
  return {
    key: `kante-aus-oberflaeche:${a}`,
    prompt: `Ein Würfel hat die Oberfläche ${q(O, 'cm²')}. Wie lang ist eine Kante?`,
    answer: wholeAnswer(a, 'cm', 'Kante:'),
    hints: ['Teile zuerst durch die Anzahl der Flächen.', 'Welche Zahl mal sich selbst ergibt eine Fläche?'],
    steps: [`Eine Fläche: ${O} : 6 = ${a * a}`, `${a} · ${a} = ${a * a}`, `Eine Kante ist ${a} cm lang.`],
    bugs: [
      bug('eine-flaeche', a * a, 'Das ist eine Fläche. Gesucht ist die Seite des Quadrats.'),
      bug('oberflaeche-drei-flaechen', O / 3, 'Der Würfel hat sechs Flächen. Teile durch 6.'),
    ],
    praise: 'Du hast von der Oberfläche zur Kante geschlossen.',
    kmk: [...KMK, 'PK.problemloesen'],
  };
};

// ─── Stufe 2 ─────────────────────────────────────────────────────────────────

/** Three different edges up to max. */
function edges(rng: Rng, min: number, max: number): [number, number, number] {
  const [a, b, c] = rng.sample(Array.from({ length: max - min + 1 }, (_, i) => min + i), 3);
  return [a, b, c];
}

const s2Net: Forms[2][1] = (rng) => {
  const [a, b, c] = edges(rng, 2, 8);
  return {
    key: `quadernetz:${a}-${b}-${c}`,
    prompt: 'Das Netz gehört zu einem Quader. Wie groß ist die Oberfläche?',
    visual: quaderNet(a, b, c, { topWidth: q(a, 'cm'), topHeight: q(b, 'cm'), leftHeight: q(c, 'cm') }),
    answer: answer(surface(a, b, c)),
    hints: [HINT.oberflaecheDrei, 'Rechne jedes Paar einzeln und addiere am Ende.'],
    steps: quaderSteps(a, b, c),
    bugs: quaderBugs(a, b, c),
    praise: 'Du hast alle Flächenpaare im Netz gerechnet.',
    kmk: [...KMK, 'RF.koerper'],
  };
};

const s2Drawing: Forms[2][2] = (rng) => {
  const [a, b, c] = edges(rng, 3, 15);
  return {
    key: `quader:${a}-${b}-${c}`,
    prompt: 'Wie groß ist die Oberfläche des Quaders?',
    visual: quaderPic(a, b, c),
    answer: answer(surface(a, b, c)),
    hints: ['Du siehst nur drei Flächen. Der Quader hat sechs.', HINT.oberflaecheDrei],
    steps: quaderSteps(a, b, c),
    bugs: quaderBugs(a, b, c),
    praise: 'Du hast auch die verdeckten Flächen mitgerechnet.',
  };
};

const s2OneFace: Forms[2][3] = (rng) => {
  let [a, b, c] = edges(rng, 2, 12);
  // a face as large as a printed pair would be an answer already in the task
  while (b * c === 2 * a * b || b * c === 2 * a * c) [a, b, c] = edges(rng, 2, 12);
  const top = 2 * a * b;
  const front = 2 * a * c;
  const O = surface(a, b, c);
  const side = b * c;
  return {
    key: `flaeche-aus-oberflaeche:${a}-${b}-${c}`,
    context: `Ein Quader hat die Oberfläche ${q(O, 'cm²')}. Oben und unten sind zusammen ${q(top, 'cm²')} groß. Vorne und hinten sind zusammen ${q(front, 'cm²')} groß.`,
    prompt: 'Wie groß ist die Fläche links?',
    answer: answer(side, 'cm²', 'Fläche links:'),
    hints: ['Ziehe die bekannten Paare von der Oberfläche ab.', 'Der Rest sind die Flächen links und rechts zusammen.'],
    steps: [`Rest: ${O} − ${top} − ${front} = ${2 * side}`, `Eine Fläche: ${2 * side} : 2 = ${side}`, `Die Fläche links ist ${side} cm² groß.`],
    bugs: [
      bug('paar-statt-flaeche', 2 * side, 'Das sind die Flächen links und rechts zusammen. Gesucht ist eine.'),
      bug('nur-ein-paar', O - top, 'Ziehe beide bekannten Paare ab.'),
    ],
    praise: 'Du hast von der Oberfläche auf eine Fläche geschlossen.',
    kmk: [...KMK, 'PK.problemloesen'],
  };
};

// ─── Stufe 3 ─────────────────────────────────────────────────────────────────

const BOXES = [
  { what: 'Eine Pappschachtel', the: 'die Pappschachtel', stuff: 'Pappe' },
  { what: 'Eine Holzkiste', the: 'die Holzkiste', stuff: 'Holz' },
  { what: 'Ein Aquarium', the: 'das Aquarium', stuff: 'Glas' },
] as const;

const s3Box: Forms[3][1] = (rng) => {
  const { what, the, stuff } = rng.pick(BOXES);
  const a = rng.int(5, 15);
  const b = rng.int(4, 12);
  const c = rng.int(3, 8);
  const O = surface(a, b, c);
  const open = O - a * b;
  return {
    key: `ohne-deckel:${what}:${a}-${b}-${c}`,
    context: `${what} hat keinen Deckel. Der Boden ist ${a} dm lang und ${b} dm breit. Die Höhe ist ${c} dm.`,
    prompt: `Wie viel dm² ${stuff} braucht man für ${the}?`,
    visual: quaderPic(a, b, c, { unit: 'dm' }),
    answer: answer(open, 'dm²', `${stuff}:`),
    hints: ['Der Deckel fehlt. Es bleiben fünf Flächen.', 'Rechne die Oberfläche und ziehe den Deckel ab.'],
    steps: [`Ganze Oberfläche: 2 · (${a} · ${b} + ${a} · ${c} + ${b} · ${c}) = ${O}`, `Deckel: ${a} · ${b} = ${a * b}`, `${O} − ${a * b} = ${open}`, `Es sind ${q(open, 'dm²')} ${stuff}.`],
    bugs: [
      bug('mit-deckel', O, 'Der Deckel fehlt. Ziehe seine Fläche ab.'),
      bug('ohne-boden', O - 2 * a * b, 'Nur der Deckel fehlt. Der Boden gehört dazu.'),
      bug('volumen-oberflaeche', a * b * c, VOLUME_FIVE),
    ],
    praise: 'Du hast genau die fünf Flächen gerechnet.',
    kmk: [...KMK, 'PK.modellieren'],
  };
};

/** The picture shows the parts, never the whole solid with its measures: a Quader labelled a, a and 2a would be Stufe 2 with no thought of what is glued. No name in a key: a new name is not a new task. */
const s3Glued: Forms[3][2] = (rng) => {
  const { name } = pickPerson(rng);
  if (rng.chance(0.5)) {
    const n = rng.int(2, 4);
    const a = rng.int(3, 12);
    const one = a * a;
    const inside = 2 * (n - 1);
    const outside = 6 * n - inside;
    return {
      key: `wuerfel-kleben:${n}:${a}`,
      context: `${name} klebt ${n === 2 ? 'zwei gleiche Holzwürfel aufeinander' : `${n} gleiche Holzwürfel zu einem Turm`}. Jede Kante ist ${a} cm lang. Der neue Körper bekommt Farbe.`,
      prompt: 'Wie groß ist die Oberfläche des neuen Körpers?',
      visual: { type: 'cubeBuilding', heights: [[n]], view: 'iso' },
      answer: answer(outside * one),
      hints: ['An jeder Klebestelle liegen zwei Flächen innen. Diese Flächen sind nicht mehr außen.', 'Zähle die Quadrate außen.'],
      steps: [`Eine Fläche: ${a} · ${a} = ${one}`, `Außen liegen ${6 * n} − ${inside} = ${outside} Quadrate.`, `${outside} · ${one} = ${outside * one}`, `Die Oberfläche ist ${q(outside * one, 'cm²')}.`],
      bugs: [
        bug('beruehrflaeche', 6 * n * one, 'Die Klebeflächen sind innen und gehören nicht zur Oberfläche.'),
        bug('eine-klebeflaeche', (6 * n - (n - 1)) * one, 'An jeder Klebestelle liegen zwei Flächen innen. Ziehe beide ab.'),
        bug('volumen-oberflaeche', n * one * a, VOLUME_OUTSIDE),
      ],
      praise: 'Du hast die Klebeflächen weggelassen.',
      kmk: [...KMK, 'PK.modellieren'],
    };
  }
  const [a, b, c] = edges(rng, 3, 12);
  const O = surface(a, b, c);
  const glued = a * b;
  const total = 2 * O - 2 * glued;
  return {
    key: `quader-kleben:${a}-${b}-${c}`,
    context: `${name} klebt zwei gleiche Quader aufeinander. Das Bild zeigt einen Quader. Die Klebefläche ist ${a} cm lang und ${b} cm breit.`,
    prompt: 'Wie groß ist die Oberfläche des neuen Körpers?',
    visual: quaderPic(a, b, c),
    answer: answer(total),
    hints: ['Zwei Flächen kleben aufeinander. Diese Flächen sind nicht mehr außen.', 'Rechne zuerst die Oberfläche beider Quader.'],
    steps: [`Ein Quader: 2 · (${a} · ${b} + ${a} · ${c} + ${b} · ${c}) = ${O}`, `Zwei Quader: 2 · ${O} = ${2 * O}`, `Klebefläche: ${a} · ${b} = ${glued}`, `${2 * O} − 2 · ${glued} = ${total}`, `Die Oberfläche ist ${q(total, 'cm²')}.`],
    bugs: [
      bug('beruehrflaeche', 2 * O, 'Die Klebeflächen sind innen und gehören nicht zur Oberfläche.'),
      bug('eine-klebeflaeche', 2 * O - glued, 'An der Klebestelle liegen zwei Flächen innen. Ziehe beide ab.'),
      bug('volumen-oberflaeche', 2 * a * b * c, VOLUME_OUTSIDE),
    ],
    praise: 'Du hast die Klebeflächen weggelassen.',
    kmk: [...KMK, 'PK.modellieren'],
  };
};

const s3Hard: Forms[3][3] = (rng) => {
  const { name } = pickPerson(rng);
  if (rng.chance(0.5)) {
    const a = rng.int(6, 14);
    const b = rng.int(5, 12);
    const c = rng.int(5, 10);
    const d = rng.int(2, 4);
    const O = surface(a, b, c);
    return {
      key: `ecke-gesaegt:${a}-${b}-${c}:${d}`,
      context: `${name} sägt aus der Ecke eines Holzquaders einen Würfel heraus. Die Kante des Würfels ist ${d} cm lang.`,
      prompt: 'Wie groß ist die Oberfläche des Restkörpers?',
      visual: quaderPic(a, b, c, { cutout: { a: d, b: d, c: d } }),
      answer: answer(O),
      hints: ['An der Ecke fehlen drei kleine Flächen außen.', 'Innen kommen drei gleich große Flächen dazu.'],
      steps: ['Außen fehlen drei kleine Quadrate.', 'Innen kommen drei gleiche Quadrate dazu.', 'Die Oberfläche bleibt also gleich.', `2 · ${a} · ${b} + 2 · ${a} · ${c} + 2 · ${b} · ${c} = ${O}`, `Die Oberfläche ist ${q(O, 'cm²')}.`],
      bugs: [
        bug('ecke-abgezogen', O - 3 * d * d, 'Drei Flächen fehlen, aber drei neue kommen dazu.'),
        bug('ecke-sechs', O - 6 * d * d, 'Nur drei Flächen des Würfels lagen außen. Drei neue kommen dazu.'),
        bug('ecke-addiert', O + 3 * d * d, 'Es kommen drei Flächen dazu, aber drei fehlen auch.'),
      ],
      praise: 'Du hast gesehen: Die Oberfläche bleibt gleich.',
      kmk: [...KMK, 'PK.argumentieren'],
    };
  }
  const [a, b, c] = edges(rng, 6, 12);
  const [d, e, f] = edges(rng, 2, 5);
  const bigO = surface(a, b, c);
  const smallO = surface(d, e, f);
  const contact = d * e;
  const total = bigO + smallO - 2 * contact;
  return {
    key: `gestapelt:${a}-${b}-${c}:${d}-${e}-${f}`,
    context: `Ein Podest ist ein Quader mit ${a} dm, ${b} dm und ${c} dm. Darauf steht ein Quader mit ${d} dm, ${e} dm und ${f} dm. Die Grundfläche des kleinen Quaders ist ${d} dm mal ${e} dm.`,
    prompt: 'Wie groß ist die Oberfläche des neuen Körpers?',
    answer: answer(total, 'dm²'),
    hints: ['Rechne beide Oberflächen aus und addiere.', 'Die Berührfläche ist zweimal nicht außen.'],
    steps: [`Großer Quader: ${bigO} dm²`, `Kleiner Quader: ${smallO} dm²`, `Berührfläche: ${d} · ${e} = ${contact}`, `${bigO} + ${smallO} − 2 · ${contact} = ${total}`, `Die Oberfläche ist ${q(total, 'dm²')}.`],
    bugs: [
      bug('beruehrflaeche', bigO + smallO, 'Die Berührfläche ist innen. Ziehe die Fläche zweimal ab.'),
      bug('eine-klebeflaeche', bigO + smallO - contact, 'Die Berührfläche zählt bei beiden Quadern. Ziehe die Fläche zweimal ab.'),
      bug('volumen-oberflaeche', a * b * c + d * e * f, VOLUME_OUTSIDE),
    ],
    praise: 'Du hast die Berührfläche an beiden Quadern abgezogen.',
    kmk: [...KMK, 'PK.modellieren'],
  };
};

export const oberflaecheSkill: SkillDef = {
  ...SKILL,
  title: 'Oberfläche',
  description: 'Du addierst alle Flächen von Würfel und Quader.',
  stufen: { 1: 'Würfel mit Kanten bis 10 cm', 2: 'Quader mit Kanten bis 15 cm, auch im Netz', 3: 'Kiste ohne Deckel, zusammengesetzte Quader in Geschichten' },
  kmk: KMK,
  generate: generator(SKILL, KMK, {
    1: { 1: s1Cube, 2: s1NetOrFace, 3: s1Back },
    2: { 1: s2Net, 2: s2Drawing, 3: s2OneFace },
    3: { 1: s3Box, 2: s3Glued, 3: s3Hard },
  }),
};
