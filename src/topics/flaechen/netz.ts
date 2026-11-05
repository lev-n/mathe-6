/**
 * flaechen.netz (docs/research.md §6). Which faces meet is computed by folding (./nets.ts).
 * Stufe 1: which net folds into a Würfel. AB I yes or no, AB II the net among four pictures, AB III the picture that is no net.
 * Stufe 2: Quader net with measures, match to a Schrägbild. Only the folded edges give an answer, the printed numbers alone do not. AB I the size of the whole net, AB II a missing edge, then the
 * Schrägbild to the net, AB III the face of the Schrägbild to a face of the net.
 * Stufe 3: opposite faces, the wrong drawing. AB I the opposite face, AB II the number on a die with empty faces, AB III the Quader net that does not fold.
 */
import type { Cell, ChoiceOption, Rng, SkillDef, Visual, VisualOf } from '../../core/types';
import { makeChoice } from '../shared';
import { HINT, LETTERS, bug, generator, q, quaderPic, wholeAnswer, type Forms } from './common';
import { NETS, NOT_NETS, cellsKey, fold, oppositeFace, pickForm, quaderNet } from './nets';

const SKILL = { id: 'flaechen.netz', topicId: 'flaechen' } as const;
const KMK = ['RF.koerper'];

const FOLD_HINT = 'Falte das Netz im Kopf. Starte bei einer Fläche in der Mitte.';
const NO_OVERLAP = 'Falte im Kopf: Jede Fläche findet einen eigenen Platz.';

const netPicture = (cells: Cell[]): VisualOf<'net'> => ({ type: 'net', cells });

/** Picture options labelled A, B, … in the order shown. */
function pictureChoice(rng: Rng, right: Visual, wrong: { visual: Visual; whyWrong: string }[]) {
  const shuffled = rng.shuffle<{ visual: Visual; whyWrong?: string }>([{ visual: right }, ...wrong]);
  const options: ChoiceOption[] = shuffled.map((o, i) => ({ label: LETTERS[i], visual: o.visual, ...(o.whyWrong ? { whyWrong: o.whyWrong } : {}) }));
  return { kind: 'choice' as const, options, correct: shuffled.findIndex((o) => o.visual === right), layout: 'grid' as const };
}

// ─── Stufe 1 ─────────────────────────────────────────────────────────────────

const s1YesNo: Forms[1][1] = (rng) => {
  const isNet = rng.chance(0.5);
  const cells = pickForm(rng, rng.pick(isNet ? NETS : NOT_NETS));
  return {
    key: `ist-netz:${cellsKey(cells)}`,
    prompt: 'Lässt sich aus diesem Netz ein Würfel falten?',
    visual: netPicture(cells),
    answer: makeChoice(rng, { label: isNet ? 'Ja' : 'Nein' }, [{ label: isNet ? 'Nein' : 'Ja', whyWrong: isNet ? NO_OVERLAP : HINT.netzUeberlappt }], { order: ['Ja', 'Nein'] }),
    hints: [FOLD_HINT, HINT.netzUeberlappt],
    steps: ['Falte das Netz im Kopf, Fläche für Fläche.', isNet ? 'Jede der sechs Flächen findet einen eigenen Platz.' : 'Zwei Flächen landen auf derselben Stelle.', isNet ? 'Das ist ein Würfelnetz.' : 'Das ist kein Würfelnetz.'],
    praise: 'Du hast das Netz im Kopf gefaltet.',
  };
};

const s1Pick: Forms[1][2] = (rng) => {
  const net = pickForm(rng, rng.pick(NETS));
  const others = rng.sample(NOT_NETS, 3).map((c) => netPicture(pickForm(rng, c)));
  return {
    key: `welches-netz:${cellsKey(net)}:${others.map((o) => ('cells' in o ? cellsKey(o.cells) : '')).join('/')}`,
    prompt: 'Nur ein Bild zeigt ein Würfelnetz. Welches Bild ist das?',
    answer: pictureChoice(rng, netPicture(net), others.map((visual) => ({ visual, whyWrong: HINT.netzUeberlappt }))),
    hints: ['Prüfe ein Bild nach dem anderen.', HINT.netzUeberlappt],
    steps: [{ text: 'Dieses Netz lässt sich falten.', visual: netPicture(net) }, 'Bei den anderen Netzen liegen zwei Flächen aufeinander.'],
    praise: 'Du hast alle Netze einzeln geprüft.',
  };
};

const s1NotNet: Forms[1][3] = (rng) => {
  const odd = pickForm(rng, rng.pick(NOT_NETS));
  const others = rng.sample(NETS, 3).map((c) => netPicture(pickForm(rng, c)));
  return {
    key: `kein-netz:${cellsKey(odd)}:${others.map((o) => ('cells' in o ? cellsKey(o.cells) : '')).join('/')}`,
    prompt: 'Ein Bild zeigt kein Würfelnetz. Welches Bild ist das?',
    answer: pictureChoice(rng, netPicture(odd), others.map((visual) => ({ visual, whyWrong: 'Dieses Netz lässt sich falten. Suche das andere Netz.' }))),
    hints: ['Prüfe ein Bild nach dem anderen.', HINT.netzUeberlappt],
    steps: [{ text: 'Bei diesem Netz liegen zwei Flächen aufeinander.', visual: netPicture(odd) }, 'Die anderen Netze lassen sich falten.'],
    praise: 'Du hast das unpassende Netz gefunden.',
    kmk: [...KMK, 'PK.argumentieren'],
  };
};

// ─── Stufe 2 ─────────────────────────────────────────────────────────────────

/** Three different edges: the faces of a net can be told apart by their lengths. */
function edges(rng: Rng, max = 7): [number, number, number] {
  const [a, c] = rng.sample([2, 3, 4, 5, 6, 7].filter((n) => n <= max), 2);
  const b = rng.pick([2, 3, 4].filter((n) => n !== a && n !== c));
  return [a, b, c];
}

const s2Extent: Forms[2][1] = (rng) => {
  const [a, b, c] = edges(rng);
  const high = rng.chance(0.5);
  const value = high ? b + c + b : b + a + b + a;
  const OTHER = 'Das ist eine andere Kante. Suche die Kante, die beim Falten anstößt.';
  return {
    key: `netz-mass:${high ? 'hoch' : 'breit'}:${a}-${b}-${c}`,
    prompt: high ? 'Das Netz gehört zu einem Quader. Wie hoch ist das ganze Netz von oben bis unten?' : 'Das Netz gehört zu einem Quader. Wie breit ist das ganze Netz von links bis rechts?',
    visual: quaderNet(a, b, c, { topWidth: q(a, 'cm'), topHeight: q(b, 'cm'), leftHeight: q(c, 'cm') }),
    answer: wholeAnswer(value, 'cm', high ? 'Höhe:' : 'Breite:'),
    hints: ['Beim Falten treffen sich zwei Kanten. Beide sind gleich lang.', high ? 'Von oben nach unten liegen drei Flächen. Wie hoch ist jede?' : 'Von links nach rechts liegen vier Flächen. Wie breit ist jede?'],
    steps: high
      ? ['Die Flächen oben und unten liegen beim Falten gegenüber.', `Beide sind ${b} cm hoch, die Reihe ist ${c} cm hoch.`, `${b} + ${c} + ${b} = ${value}`, `Das Netz ist ${value} cm hoch.`]
      : ['Beim Falten stößt die linke Fläche an die Fläche oben.', `Die erste und die dritte Fläche sind je ${b} cm breit, die anderen je ${a} cm.`, `${b} + ${a} + ${b} + ${a} = ${value}`, `Das Netz ist ${value} cm breit.`],
    bugs: high
      ? [bug('andere-kante', a + c + a, OTHER), bug('nur-teil-des-netzes', b + c, 'Das ist nur ein Teil. Zähle alle drei Flächen von oben nach unten.')]
      : [bug('andere-kante', b + a + b + c, OTHER), bug('nur-teil-des-netzes', b + a, 'Das ist nur ein Teil. Zähle alle vier Flächen von links nach rechts.')],
    praise: 'Du hast die gleich langen Kanten im Netz gefunden.',
    kmk: [...KMK, 'PK.darstellen'],
  };
};

const s2ToDrawing: Forms[2][2] = (rng) => {
  const [a, b, c] = edges(rng);
  const high = 2 * b + c;
  // every other Schrägbild has the two printed edges too: only the edge worked out decides. A Set: for b = 2 the list would hold 4 twice, and with it two equal pictures.
  const others = rng.sample([...new Set([2 * b, b + 1, b + 2, b > 2 ? b - 1 : b + 3])], 2);
  // each drawing stands turned or not on its own: a right one that alone stands turned would be the odd one out, with nothing worked out
  const drawn = (x: number) => (rng.chance(0.5) ? quaderPic(c, x, a) : quaderPic(a, x, c));
  const right = drawn(b);
  const wrong = others.map((x) => ({ visual: drawn(x), whyWrong: 'Rechne zuerst die Kante mit dem Fragezeichen aus.' }));
  return {
    key: `zum-schraegbild:${a}-${b}-${c}:${others.join('/')}:${[right, ...wrong.map((w) => w.visual)].map((v) => v.a).join('/')}`,
    prompt: `Das Netz ist von oben bis unten ${high} cm hoch. Welches Schrägbild gehört zu dem Netz?`,
    visual: quaderNet(a, b, c, { topWidth: q(a, 'cm'), topHeight: '?', leftHeight: q(c, 'cm') }),
    answer: pictureChoice(rng, right, wrong),
    hints: ['Von oben nach unten liegen drei Flächen. Zwei davon sind gleich hoch.', 'Rechne zuerst die Kante mit dem Fragezeichen aus.'],
    steps: [`Oben und unten zusammen: ${high} − ${c} = ${2 * b}`, `Die Kante mit dem Fragezeichen: ${2 * b} : 2 = ${b}`, { text: `Nur dieses Schrägbild hat die Kanten ${q(a, 'cm')}, ${q(b, 'cm')} und ${q(c, 'cm')}.`, visual: right }],
    praise: 'Du hast die fehlende Kante aus dem Netz berechnet.',
    kmk: [...KMK, 'PK.darstellen'],
  };
};

const FACE_OF_MARK = { bottom: 'top', back: 'front', right: 'side' } as const;

const s2ToFace: Forms[2][3] = (rng) => {
  const [a, b, c] = edges(rng);
  const mark = rng.pick(['bottom', 'back', 'right'] as const);
  const [x, y] = { bottom: [a, b], back: [a, c], right: [b, c] }[mark];
  const picture = (highlightFace: 'front' | 'top' | 'side') => quaderPic(a, b, c, { highlightFace });
  const right = picture(FACE_OF_MARK[mark]);
  // the three Schrägbilder show the same numbers: only folding tells which face is meant
  const wrong = (['front', 'top', 'side'] as const).filter((f) => f !== FACE_OF_MARK[mark]).map((f) => ({ visual: picture(f), whyWrong: 'Die markierte Fläche hat andere Kanten. Vergleiche beide Kanten mit dem Netz.' }));
  return {
    key: `flaeche-im-netz:${mark}:${a}-${b}-${c}`,
    prompt: 'Eine Fläche des Netzes trägt das Fragezeichen. Welches Schrägbild zeigt eine gleich große Fläche markiert?',
    visual: quaderNet(a, b, c, { topWidth: q(a, 'cm'), topHeight: q(b, 'cm'), leftHeight: q(c, 'cm'), mark }),
    answer: pictureChoice(rng, right, wrong),
    hints: ['Falte im Kopf: An welche Flächen stößt die Fläche mit dem Fragezeichen?', 'Lies die zwei Kanten dieser Fläche ab. Suche dann die Fläche im Schrägbild.'],
    steps: [`Die Fläche mit dem Fragezeichen hat die Kanten ${q(x, 'cm')} und ${q(y, 'cm')}.`, { text: 'Nur hier hat die markierte Fläche diese zwei Kanten.', visual: right }],
    praise: 'Du hast vom Netz auf das Schrägbild geschlossen.',
    kmk: [...KMK, 'PK.darstellen'],
  };
};

// ─── Stufe 3 ─────────────────────────────────────────────────────────────────

const s3Opposite: Forms[3][1] = (rng) => {
  const cells = pickForm(rng, rng.pick(NETS));
  const faces = fold(cells)!;
  const letters = rng.shuffle([...LETTERS]);
  const target = rng.int(0, 5);
  const partner = faces.indexOf(oppositeFace(faces[target]));
  const touching = letters.filter((_, i) => i !== target && i !== partner);
  return {
    key: `gegenueber:${cellsKey(cells)}:${letters.join('')}:${letters[target]}`,
    prompt: `Falte das Netz zum Würfel. Welche Fläche liegt gegenüber von ${letters[target]}?`,
    visual: { type: 'net', cells, faces: letters },
    answer: makeChoice(rng, { label: letters[partner] }, touching.map((l) => ({ label: l, whyWrong: `Fläche ${l} stößt an ${letters[target]}.` })), { max: 5 }),
    hints: [`Welche Flächen stoßen an ${letters[target]}?`, `Die Fläche gegenüber berührt ${letters[target]} nicht.`],
    steps: [`An ${letters[target]} stoßen vier Flächen.`, `Nur ${letters[partner]} berührt ${letters[target]} nicht.`, `${letters[partner]} liegt gegenüber von ${letters[target]}.`],
    praise: 'Du hast die Flächen im Kopf gefaltet.',
  };
};

const s3Die: Forms[3][2] = (rng) => {
  const cells = pickForm(rng, rng.pick(NETS));
  const faces = fold(cells)!;
  // each face gets a pip number; opposite faces sum to 7
  const lows = rng.shuffle([1, 2, 3]);
  const pips = (face: number) => (face % 2 === 0 ? lows[face >> 1] : 7 - lows[face >> 1]);
  const asked = rng.int(0, 5);
  const value = pips(faces[asked]);
  const partner = faces.indexOf(oppositeFace(faces[asked]));
  const partnerValue = 7 - value;
  // Of the two other pairs one face each shows its number. So three numbers are absent, and only the face opposite the '?' tells which of them belongs there.
  const shown = [0, 2, 4].filter((pair) => pair >> 1 !== faces[asked] >> 1).map((pair) => faces.indexOf(pair + rng.int(0, 1)));
  const labels = faces.map((face, i) => (i === asked ? '?' : i === partner || shown.includes(i) ? String(pips(face)) : null));
  const absent = faces.filter((_, i) => labels[i] === null).map(pips);
  return {
    key: `spielwuerfel:${cellsKey(cells)}:${lows.join('')}:${asked}:${shown.join('')}`,
    context: 'Das Netz gehört zu einem Spielwürfel. Zwei Zahlen gegenüber ergeben zusammen 7.',
    prompt: 'Welche Zahl gehört auf das Fragezeichen?',
    visual: { type: 'net', cells, faces: labels },
    answer: wholeAnswer(value, undefined, 'Zahl:'),
    hints: ['Falte das Netz im Kopf. Suche die Fläche gegenüber vom Fragezeichen.', 'Beide Zahlen ergeben zusammen 7.'],
    steps: [`Gegenüber vom Fragezeichen steht die ${partnerValue}.`, `7 − ${partnerValue} = ${value}`, `Auf das Fragezeichen gehört die ${value}.`],
    bugs: [
      bug('partner-zahl', partnerValue, 'Das ist die Zahl gegenüber. Beide ergeben zusammen 7.'),
      ...absent.map((n) => bug('andere-flaeche', n, 'Diese Zahl gehört auf eine leere Fläche. Suche die Fläche gegenüber vom Fragezeichen.')),
    ],
    praise: 'Du hast die Fläche gegenüber gefunden.',
    kmk: [...KMK, 'PK.problemloesen'],
  };
};

const s3Wrong: Forms[3][3] = (rng) => {
  const [a, b, c] = edges(rng, 5);
  const overlap = rng.chance(0.5);
  const wrong = quaderNet(a, b, c, {}, overlap ? 'gleiche-seite' : 'zu-lang');
  const fine = [quaderNet(a, b, c), quaderNet(a, b, c, {}, 'versetzt')];
  return {
    key: `falsches-netz:${overlap ? 'seite' : 'lang'}:${a}-${b}-${c}`,
    prompt: 'Zwei Netze falten sich zu diesem Quader. Welches Netz lässt sich nicht zu diesem Quader falten?',
    visual: quaderPic(a, b, c),
    answer: pictureChoice(rng, wrong, fine.map((visual) => ({ visual, whyWrong: 'Dieses Netz lässt sich falten. Suche das andere Netz.' }))),
    hints: [HINT.netzUeberlappt, 'Prüfe auch: Passen die Seiten beim Falten genau aufeinander?'],
    steps: [{ text: overlap ? 'Bei diesem Netz liegen zwei Flächen aufeinander.' : 'Bei diesem Netz ist eine Fläche zu lang.', visual: wrong }, 'Die anderen Netze lassen sich falten.'],
    praise: 'Du hast das unpassende Netz gefunden.',
    kmk: [...KMK, 'PK.argumentieren'],
  };
};

export const netzSkill: SkillDef = {
  ...SKILL,
  title: 'Netz und Schrägbild',
  description: 'Du erkennst Quader in Netz und Schrägbild.',
  stufen: { 1: 'Welches Netz faltet sich zum Würfel?', 2: 'Quadernetze mit Maßen, passendes Schrägbild', 3: 'Flächen gegenüber und unpassende Netze finden' },
  kmk: KMK,
  generate: generator(SKILL, KMK, {
    1: { 1: s1YesNo, 2: s1Pick, 3: s1NotNet },
    2: { 1: s2Extent, 2: s2ToDrawing, 3: s2ToFace },
    3: { 1: s3Opposite, 2: s3Die, 3: s3Wrong },
  }),
};
