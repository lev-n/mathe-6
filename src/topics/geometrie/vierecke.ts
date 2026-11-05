/**
 * Vierecke (docs/research.md §6). Stufe 1: Quadrat, Rechteck, Parallelogramm in the usual position. Stufe 2: Raute, Trapez, Drachenviereck, turned, by their properties.
 * Stufe 3: Sonderformen, such as "Jedes Quadrat ist auch ein Parallelogramm". The plans define the Trapez differently (at least one or exactly one pair of parallel sides), so no statement depends on it.
 */
import { fmtQty, toSpeech } from '../../core/format';
import type { Ab, ChoiceOption, Exercise, MultiField, Rng, ShapeKind, SkillDef, Stufe, VisualOf } from '../../core/types';
import { build, makeChoice, multiBugs, pickPerson, targetAb } from '../shared';
import { fixedChoice, fitted, yesNo } from './helpers';

const SKILL = { id: 'geometrie.vierecke', topicId: 'geometrie' } as const;
const KMK = ['RF.figuren'];

type Kind = 'quadrat' | 'rechteck' | 'parallelogramm' | 'raute' | 'trapez' | 'drachen';
const NAME: Record<Kind, string> = { quadrat: 'Quadrat', rechteck: 'Rechteck', parallelogramm: 'Parallelogramm', raute: 'Raute', trapez: 'Trapez', drachen: 'Drachenviereck' };
const A: Record<Kind, string> = { quadrat: 'ein Quadrat', rechteck: 'ein Rechteck', parallelogramm: 'ein Parallelogramm', raute: 'eine Raute', trapez: 'ein Trapez', drachen: 'ein Drachenviereck' };
const EVERY: Record<Kind, string> = { quadrat: 'Jedes Quadrat', rechteck: 'Jedes Rechteck', parallelogramm: 'Jedes Parallelogramm', raute: 'Jede Raute', trapez: 'Jedes Trapez', drachen: 'Jedes Drachenviereck' };
const DEFINE: Record<Kind, string> = {
  quadrat: 'Ein Quadrat hat vier gleich lange Seiten und vier rechte Winkel.',
  rechteck: 'Ein Rechteck hat vier rechte Winkel.',
  parallelogramm: 'Beim Parallelogramm sind die Seiten gegenüber parallel.',
  raute: 'Eine Raute hat vier gleich lange Seiten.',
  trapez: 'Ein Trapez hat zwei parallele Seiten.',
  drachen: 'Beim Drachenviereck sind je zwei benachbarte Seiten gleich lang.',
};
/** Every figure of the key also is each figure of its list; the Trapez stays out (see above). */
const IS_ALSO: Partial<Record<Kind, readonly Kind[]>> = { quadrat: ['rechteck', 'raute', 'parallelogramm', 'drachen'], rechteck: ['parallelogramm'], raute: ['parallelogramm', 'drachen'] };
const isAlso = (a: Kind, b: Kind) => IS_ALSO[a]?.includes(b) ?? false;
const CLOSER = 'Der Name passt auch. Es gibt aber einen genaueren Namen.';
const QUESTION = 'Wie heißt dieses Viereck am genauesten?';

function nameChoice(rng: Rng, right: Kind, pool: readonly Kind[]) {
  const wrongs: ChoiceOption[] = pool.filter((k) => k !== right).map((k) => ({ label: NAME[k], whyWrong: isAlso(right, k) ? CLOSER : DEFINE[k] }));
  return fixedChoice(rng, NAME[right], wrongs, pool.map((k) => NAME[k]));
}

const S1: readonly Kind[] = ['quadrat', 'rechteck', 'parallelogramm'];
const S2: readonly Kind[] = ['parallelogramm', 'raute', 'trapez', 'drachen'];
const ANGLE_WORD: Partial<Record<Kind, string>> = { quadrat: 'vier rechte Winkel', rechteck: 'vier rechte Winkel', parallelogramm: 'keinen rechten Winkel', raute: 'keinen rechten Winkel' };
const capital = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** Side lengths clockwise from the top: all equal, or a longer pair above and below, at most 2,5 times the other (the figures are drawn so). */
function sidePair(rng: Rng, kind: Kind): [number, number] {
  if (kind === 'quadrat' || kind === 'raute') {
    const a = rng.int(3, 12);
    return [a, a];
  }
  const a = rng.int(5, 12);
  return [a, rng.pick([3, 4, 5, 6, 7, 8, 9, 10].filter((b) => 1.25 * b <= a && a <= 2.5 * b))];
}

/** The figure drawn to its numbers, clockwise from the top left, the side a above and below: every item looks different, and a Parallelogramm leans by the given share of b. */
function drawn(kind: Kind, a: number, b: number, lean: number): VisualOf<'figure'> {
  const shift = lean * b;
  const high = Math.sqrt(b * b - shift * shift);
  const points = fitted([[shift, 0], [a + shift, 0], [a, high], [0, high]]).map(({ x, y }) => ({ x, y }));
  return { type: 'figure', points, sides: [fmtQty(a, 'cm'), fmtQty(b, 'cm'), fmtQty(a, 'cm'), fmtQty(b, 'cm')], ...(kind === 'parallelogramm' ? {} : { rightAngles: [0, 1, 2, 3] }) };
}

/** Stufe 1, AB I: name the drawn figure, with its side lengths. A Rechteck also stands upright, a Parallelogramm leans more or less. */
function namePicture(rng: Rng, ab: Ab): Exercise {
  const kind = rng.pick(S1);
  const [long, short] = sidePair(rng, kind);
  const [a, b] = kind === 'rechteck' && rng.chance(0.4) ? [short, long] : [long, short];
  const lean = kind === 'parallelogramm' ? rng.pick([0.3, 0.4, 0.5, 0.6]) : 0;
  return build(SKILL, 1, {
    key: `name:${kind}:${a}.${b}:${lean}`,
    ab,
    prompt: QUESTION,
    visual: drawn(kind, a, b, lean),
    answer: nameChoice(rng, kind, S1),
    hints: ['Vergleiche zuerst die Längen der Seiten.', 'Prüfe dann die Winkel: Sind es rechte Winkel?'],
    steps: [a === b ? 'Alle vier Seiten sind gleich lang.' : 'Je zwei Seiten gegenüber sind gleich lang.', `Das Viereck hat ${ANGLE_WORD[kind]}.`, `Das Viereck ist ${A[kind]}.`],
    praise: 'Du hast Seiten und Winkel beide geprüft.',
    srText: toSpeech(`Ein Viereck mit 4 Ecken. Die Seiten sind ${a} Zentimeter und ${b} Zentimeter lang, im Wechsel. Es hat ${ANGLE_WORD[kind]}. ${QUESTION}`),
    kmk: KMK,
  });
}

/** Stufe 1, AB II: the figure from a description, no picture. */
function nameText(rng: Rng, ab: Ab): Exercise {
  const kind = rng.pick(S1);
  const [a, b] = sidePair(rng, kind);
  const sideText = a === b ? `Alle vier Seiten sind ${fmtQty(a, 'cm')} lang.` : `Je zwei Seiten gegenüber sind gleich lang: ${fmtQty(a, 'cm')} und ${fmtQty(b, 'cm')}.`;
  const angleText = kind === 'parallelogramm' ? 'Kein Winkel ist ein rechter.' : 'Alle Winkel sind rechte Winkel.';
  const prompt = `${sideText} ${angleText} Welcher Name passt am genauesten?`;
  return build(SKILL, 1, {
    key: `text:${kind}:${a}.${b}`,
    ab,
    prompt,
    answer: nameChoice(rng, kind, S1),
    hints: ['Zeichne das Viereck grob auf ein Blatt.', 'Sind alle Seiten gleich lang? Gibt es rechte Winkel?'],
    steps: [sideText, angleText, `Das Viereck ist ${A[kind]}.`],
    praise: 'Du hast aus Seiten und Winkeln den Namen gefunden.',
    srText: toSpeech(prompt),
    kmk: KMK,
  });
}

/** Stufe 1, AB III: reversed. The lengths of the sides without a label. */
function missingSides(rng: Rng, ab: Ab): Exercise {
  const kind = rng.pick(['quadrat', 'rechteck', 'parallelogramm'] as const);
  const [a, b] = sidePair(rng, kind);
  const fields: MultiField[] = [{ id: 'unten', value: a, before: 'unten', after: 'cm', label: 'Seite unten' }, { id: 'links', value: b, before: 'links', after: 'cm', label: 'Seite links' }];
  const prompt = `Das ist ${A[kind]}. Wie lang sind die Seiten unten und links?`;
  return build(SKILL, 1, {
    key: `seiten:${kind}:${a}.${b}`,
    ab,
    prompt,
    visual: { type: 'shape', shape: kind as ShapeKind, named: true, sideLabels: [fmtQty(a, 'cm'), fmtQty(b, 'cm'), null, null] },
    answer: { kind: 'multi', fields },
    hints: [kind === 'quadrat' ? 'Alle vier Seiten sind gleich lang.' : 'Die Seiten gegenüber sind gleich lang.', 'Unten liegt gegenüber von oben. Links liegt gegenüber von rechts.'],
    steps: [`Unten liegt gegenüber von oben: ${fmtQty(a, 'cm')}.`, `Links liegt gegenüber von rechts: ${fmtQty(b, 'cm')}.`],
    bugs: multiBugs([{ id: 'seiten-getauscht', match: { unten: b, links: a }, hint: 'Schau auf die Seite gegenüber. Unten liegt gegenüber von oben.' }], fields),
    praise: 'Du hast die Seiten gegenüber genutzt.',
    srText: toSpeech(`Das ist ${A[kind]}. Die Seite oben ist ${a} Zentimeter lang, die Seite rechts ${b} Zentimeter. Wie lang sind die Seiten unten und links?`),
    kmk: [...KMK, 'PK.argumentieren'],
  });
}

const ROTATIONS = [15, 25, 40, 60, 90, 120, 180, 200, 240, 300, 330];
const KIND_STEP: Partial<Record<Kind, string>> = {
  parallelogramm: 'Die Seiten gegenüber sind parallel. Die Seiten sind verschieden lang.',
  raute: 'Alle vier Seiten sind gleich lang.',
  trapez: 'Zwei Seiten sind parallel. Die anderen zwei nicht.',
  drachen: 'Je zwei benachbarte Seiten sind gleich lang.',
};
const KIND_SPOKEN: Partial<Record<Kind, string>> = {
  parallelogramm: 'Die Seiten gegenüber sind parallel, und die Seiten sind verschieden lang.',
  raute: 'Alle vier Seiten sind gleich lang, kein Winkel ist rechtwinklig.',
  trapez: 'Zwei Seiten sind parallel, die anderen beiden nicht.',
  drachen: 'Je zwei benachbarte Seiten sind gleich lang.',
};

/** Stufe 2, AB I: name a turned figure. */
function nameTurned(rng: Rng, ab: Ab): Exercise {
  const kind = rng.pick<Kind>(['raute', 'trapez', 'drachen', 'raute', 'trapez', 'drachen', 'parallelogramm']);
  const rotate = rng.pick(ROTATIONS);
  const prompt = 'Das Viereck liegt gedreht. Wie heißt das Viereck am genauesten?';
  return build(SKILL, 2, {
    key: `gedreht:${kind}:${rotate}`,
    ab,
    prompt,
    visual: { type: 'shape', shape: kind as ShapeKind, rotate },
    answer: nameChoice(rng, kind, S2),
    hints: ['Dreh das Bild im Kopf. Suche parallele Seiten.', 'Prüfe auch: Sind benachbarte Seiten gleich lang?'],
    steps: ['Die Lage ändert den Namen nicht.', KIND_STEP[kind]!, `Das Viereck ist ${A[kind]}.`],
    praise: 'Du hast die Seiten auch in schräger Lage verglichen.',
    srText: toSpeech(`Ein gedrehtes Viereck. ${KIND_SPOKEN[kind]} ${prompt}`),
    kmk: KMK,
  });
}

/** A sentence and the figures of S2 for which it always holds; `right`: it may be the answer for these (a Raute has two parallel sides, but that is not its property). */
const PROPERTIES: readonly { text: string; holds: readonly Kind[]; right?: readonly Kind[] }[] = [
  { text: 'Alle vier Seiten sind gleich lang.', holds: ['raute'] },
  { text: 'Die Seiten gegenüber sind parallel.', holds: ['raute', 'parallelogramm'] },
  { text: 'Die Seiten gegenüber sind gleich lang.', holds: ['raute', 'parallelogramm'] },
  { text: 'Die Winkel gegenüber sind gleich groß.', holds: ['raute', 'parallelogramm'] },
  { text: 'Zwei Seiten sind parallel.', holds: ['trapez', 'raute', 'parallelogramm'], right: ['trapez'] },
  { text: 'Je zwei benachbarte Seiten sind gleich lang.', holds: ['raute', 'drachen'] },
  { text: 'Eine Diagonale ist Symmetrieachse.', holds: ['raute', 'drachen'] },
  { text: 'Die Diagonalen stehen senkrecht aufeinander.', holds: ['raute', 'drachen'] },
  { text: 'Die Diagonalen halbieren sich.', holds: ['raute', 'parallelogramm'] },
  { text: 'Alle Winkel sind rechte Winkel.', holds: [] },
  { text: 'Keine zwei Seiten sind parallel.', holds: [] },
  { text: 'Nur zwei Seiten sind gleich lang.', holds: [] },
  { text: 'Genau drei Seiten sind gleich lang.', holds: [] },
];
const PROPERTY_WHY = 'Stell dir ein Beispiel vor. Prüfe die Eigenschaft daran.';

/** Stufe 2, AB II: a property that holds for every such figure, or the figure that always has this property. */
function property(rng: Rng, ab: Ab): Exercise {
  if (rng.chance(0.35)) {
    const { text, holds, right: only } = rng.pick(PROPERTIES.filter((x) => x.holds.length > 0));
    const kind = rng.pick(only ?? holds);
    const prompt = `Welches Viereck hat immer diese Eigenschaft: ${text.slice(0, -1)}?`;
    return build(SKILL, 2, {
      key: `figur:${kind}:${text}`,
      ab,
      prompt,
      answer: makeChoice(rng, { label: NAME[kind] }, S2.filter((k) => !holds.includes(k)).map((k) => ({ label: NAME[k], whyWrong: DEFINE[k] }))),
      hints: ['Stell dir jede Figur vor. Prüfe die Eigenschaft daran.', 'Die Eigenschaft muss für jedes Beispiel gelten.'],
      steps: [`Das gilt immer: ${text}`, `${capital(A[kind])} hat das immer.`],
      praise: 'Du hast die Figuren an der Eigenschaft geprüft.',
      srText: toSpeech(prompt),
      kmk: KMK,
    });
  }
  const kind = rng.pick<Kind>(['raute', 'trapez', 'drachen', 'parallelogramm']);
  const right = rng.pick(PROPERTIES.filter((x) => (x.right ?? x.holds).includes(kind))).text;
  const prompt = `Welche Eigenschaft hat ${EVERY[kind].replace('Jed', 'jed')}?`;
  const rotate = rng.pick(ROTATIONS);
  return build(SKILL, 2, {
    key: `eigenschaft:${kind}:${right}`,
    ab,
    prompt,
    visual: { type: 'shape', shape: kind as ShapeKind, rotate, named: true },
    answer: makeChoice(rng, { label: right }, rng.sample(PROPERTIES.filter((x) => !x.holds.includes(kind)), 3).map(({ text }) => ({ label: text, whyWrong: PROPERTY_WHY }))),
    hints: ['Schau auf die Seiten und auf die Winkel im Bild.', 'Die Eigenschaft gilt für jedes Beispiel, nicht nur für dieses.'],
    steps: [`Die Figur ist ${A[kind]}.`, `Das gilt immer: ${right}`],
    praise: 'Du hast die Eigenschaft am Bild geprüft.',
    srText: toSpeech(`${capital(A[kind])}. ${prompt}`),
    kmk: KMK,
  });
}

/** A Drachenviereck with the sides a above and b below, drawn to these numbers: top, right, bottom, left, y downward. */
function kite(a: number, b: number) {
  const w = 0.75 * Math.min(a, b);
  return fitted([[0, -Math.sqrt(a * a - w * w)], [w, 0], [0, Math.sqrt(b * b - w * w)], [-w, 0]]).map(({ x, y }) => ({ x, y }));
}

/** Stufe 2, AB III: reversed. The other two sides of a Drachenviereck. */
function kiteSides(rng: Rng, ab: Ab): Exercise {
  const a = rng.int(3, 6);
  const b = rng.int(a + 2, 12);
  const fields: MultiField[] = [{ id: 'oben', value: a, before: 'oben rechts', after: 'cm', label: 'Seite oben rechts' }, { id: 'unten', value: b, before: 'unten rechts', after: 'cm', label: 'Seite unten rechts' }];
  const prompt = 'Das ist ein Drachenviereck. Wie lang sind die beiden Seiten rechts?';
  return build(SKILL, 2, {
    key: `drachen:${a}.${b}`,
    ab,
    prompt,
    visual: { type: 'figure', points: kite(a, b), sides: [null, null, fmtQty(b, 'cm'), fmtQty(a, 'cm')], equalMarks: [[0, 3], [1, 2]] },
    answer: { kind: 'multi', fields },
    hints: ['Beim Drachenviereck sind benachbarte Seiten gleich lang.', 'Die Striche zeigen, welche Seiten gleich lang sind.'],
    steps: ['Oben links und oben rechts sind benachbart und gleich lang.', 'Unten links und unten rechts sind auch gleich lang.', `oben rechts ${fmtQty(a, 'cm')}, unten rechts ${fmtQty(b, 'cm')}`],
    bugs: multiBugs([{ id: 'seiten-getauscht', match: { oben: b, unten: a }, hint: 'Beim Drachenviereck sind benachbarte Seiten gleich lang, nicht die Seiten gegenüber.' }], fields),
    praise: 'Du hast die benachbarten Seiten verglichen.',
    srText: toSpeech(`Ein Drachenviereck. Die Seite oben links ist ${a} Zentimeter lang, die Seite unten links ${b} Zentimeter. ${prompt}`),
    kmk: [...KMK, 'PK.argumentieren'],
  });
}

const STATEMENT: readonly (readonly [Kind, Kind])[] = [
  ['quadrat', 'rechteck'], ['quadrat', 'raute'], ['quadrat', 'parallelogramm'], ['quadrat', 'drachen'], ['rechteck', 'parallelogramm'], ['raute', 'parallelogramm'], ['raute', 'drachen'],
  ['rechteck', 'quadrat'], ['raute', 'quadrat'], ['parallelogramm', 'rechteck'], ['parallelogramm', 'quadrat'], ['parallelogramm', 'raute'], ['rechteck', 'raute'], ['drachen', 'raute'], ['drachen', 'parallelogramm'],
];
/** What a child who taps Nein at a true statement should check: the property of the second figure, in the first. */
const YES_WHY: Readonly<Record<string, string>> = {
  'quadrat:rechteck': 'Prüfe die Eigenschaften: Vier rechte Winkel hat auch das Quadrat.',
  'quadrat:raute': 'Prüfe die Eigenschaften: Vier gleich lange Seiten hat auch das Quadrat.',
  'quadrat:parallelogramm': 'Prüfe die Eigenschaften: Beim Quadrat sind die Seiten gegenüber parallel.',
  'quadrat:drachen': 'Prüfe die Eigenschaften: Beim Quadrat sind benachbarte Seiten gleich lang.',
  'rechteck:parallelogramm': 'Prüfe die Eigenschaften: Beim Rechteck sind die Seiten gegenüber parallel.',
  'raute:parallelogramm': 'Prüfe die Eigenschaften: Bei der Raute sind die Seiten gegenüber parallel.',
  'raute:drachen': 'Prüfe die Eigenschaften: Bei der Raute sind benachbarte Seiten gleich lang.',
};
const statementStep = (a: Kind, b: Kind) => (isAlso(a, b) ? `Das hat ${EVERY[a].replace('Jed', 'jed')}.` : `Das hat nicht ${EVERY[a].replace('Jed', 'jed')}.`);

/** Stufe 3, AB I: true or not? Every X is also a Y. */
function statement(rng: Rng, ab: Ab): Exercise {
  const [a, b] = rng.pick(STATEMENT);
  const prompt = `${EVERY[a]} ist auch ${A[b]}. Stimmt diese Aussage?`;
  const yes = isAlso(a, b);
  return build(SKILL, 3, {
    key: `aussage:${a}:${b}`,
    ab,
    prompt,
    answer: yesNo(rng, yes, DEFINE[b], YES_WHY[`${a}:${b}`] ?? DEFINE[b]),
    hints: [`Was muss ${A[b]} alles haben?`, `Hat wirklich ${EVERY[a].replace('Jed', 'jed')} diese Eigenschaften?`],
    steps: [DEFINE[b], statementStep(a, b), yes ? 'Die Aussage stimmt.' : 'Die Aussage stimmt nicht.'],
    praise: 'Du hast die Aussage an den Eigenschaften geprüft.',
    srText: toSpeech(prompt),
    kmk: [...KMK, 'PK.argumentieren'],
  });
}

const MISSING: readonly { from: Kind; to: Kind; right: string }[] = [
  { from: 'rechteck', to: 'quadrat', right: 'Alle Seiten sind gleich lang.' },
  { from: 'raute', to: 'quadrat', right: 'Alle Winkel sind rechte Winkel.' },
  { from: 'parallelogramm', to: 'rechteck', right: 'Alle Winkel sind rechte Winkel.' },
  { from: 'parallelogramm', to: 'raute', right: 'Alle Seiten sind gleich lang.' },
  { from: 'parallelogramm', to: 'quadrat', right: 'Alle Seiten sind gleich lang und alle Winkel sind rechte Winkel.' },
];
const ALL_SIDES = 'Alle Seiten sind gleich lang.';
const ALL_ANGLES = 'Alle Winkel sind rechte Winkel.';
const HAS_ALL_SIDES: readonly Kind[] = ['raute', 'quadrat'];
const HAS_ALL_ANGLES: readonly Kind[] = ['rechteck', 'quadrat'];

/** Why this sentence is not what is missing: the first figure has it already, the second does not need it, or it is not enough. */
function missingWhy(label: string, from: Kind, to: Kind): string {
  if (label.startsWith('Nur')) return 'Das passt zu keiner dieser Figuren.';
  if (label === ALL_SIDES && !HAS_ALL_SIDES.includes(from) && HAS_ALL_SIDES.includes(to)) return `Das reicht noch nicht für ${A[to]}. Prüfe auch die Winkel.`;
  if (label === ALL_ANGLES && !HAS_ALL_ANGLES.includes(from) && HAS_ALL_ANGLES.includes(to)) return `Das reicht noch nicht für ${A[to]}. Prüfe auch die Seiten.`;
  if (label === ALL_SIDES && !HAS_ALL_SIDES.includes(to)) return `Das braucht ${A[to]} nicht.`;
  if (label === ALL_ANGLES && !HAS_ALL_ANGLES.includes(to)) return `Das braucht ${A[to]} nicht.`;
  return `Das hat ${A[from]} schon.`;
}

/** Stufe 3, AB II: what is missing from the one Sonderform to the other, which name also fits a figure, or which figure also has this name. */
function relation(rng: Rng, ab: Ab): Exercise {
  const form = rng.pick(['fehlt', 'fehlt', 'auch', 'immer'] as const);
  if (form === 'fehlt') {
    const { from, to, right } = rng.pick(MISSING);
    const prompt = `${capital(A[from])} soll auch ${A[to]} sein. Was muss noch gelten?`;
    const wrongOptions = ['Die Seiten gegenüber sind parallel.', ALL_SIDES, ALL_ANGLES, 'Nur zwei Seiten sind parallel.'].filter((t) => t !== right);
    return build(SKILL, 3, {
      key: `fehlt:${from}:${to}`,
      ab,
      prompt,
      answer: makeChoice(rng, { label: right }, wrongOptions.map((label) => ({ label, whyWrong: missingWhy(label, from, to) }))),
      hints: [`Was hat ${A[from]} schon?`, `Was muss ${A[to]} alles haben?`],
      steps: [DEFINE[to], `Es fehlt noch: ${right}`],
      praise: 'Du hast die Eigenschaften der Figuren verglichen.',
      srText: toSpeech(prompt),
      kmk: [...KMK, 'PK.argumentieren'],
    });
  }
  if (form === 'immer') {
    const to = rng.pick<Kind>(['rechteck', 'raute', 'drachen']);
    const right = to === 'drachen' ? rng.pick<Kind>(['quadrat', 'raute']) : 'quadrat';
    const prompt = `Welches Viereck ist immer auch ${A[to]}?`;
    const pool = (['rechteck', 'raute', 'parallelogramm', 'drachen'] as Kind[]).filter((k) => k !== to && !isAlso(k, to));
    return build(SKILL, 3, {
      key: `immer:${to}:${right}`,
      ab,
      prompt,
      answer: makeChoice(rng, { label: NAME[right] }, pool.map((k) => ({ label: NAME[k], whyWrong: `Nicht jedes Beispiel passt. ${DEFINE[to]}` }))),
      hints: [`Was muss ${A[to]} alles haben?`, 'Hat jedes Beispiel der Figur diese Eigenschaften?'],
      steps: [DEFINE[to], `Das hat ${A[right]} immer.`, `Also ist ${A[right]} auch ${A[to]}.`],
      praise: 'Du hast die Eigenschaften mit dem Namen verglichen.',
      srText: toSpeech(prompt),
      kmk: [...KMK, 'PK.argumentieren'],
    });
  }
  const kind = rng.pick<Kind>(['rechteck', 'raute']);
  const right: Kind = kind === 'rechteck' ? 'parallelogramm' : rng.pick(['parallelogramm', 'drachen']);
  const prompt = `Das ist ${A[kind]}. Welcher andere Name passt auch immer?`;
  const pool = (['quadrat', 'rechteck', 'raute', 'drachen'] as Kind[]).filter((k) => k !== kind && !isAlso(kind, k));
  return build(SKILL, 3, {
    key: `auch:${kind}:${right}`,
    ab,
    prompt,
    visual: { type: 'shape', shape: kind as ShapeKind, named: true },
    answer: makeChoice(rng, { label: NAME[right] }, pool.map((k) => ({ label: NAME[k], whyWrong: DEFINE[k] }))),
    hints: [`Was hat ${A[kind]} alles?`, 'Welcher andere Name verlangt nur Eigenschaften davon?'],
    steps: [DEFINE[right], `Das hat ${A[kind]} immer.`, `Also passt der Name ${NAME[right]} auch.`],
    praise: 'Du hast die Eigenschaften mit dem Namen verglichen.',
    srText: toSpeech(`${capital(A[kind])}. ${prompt}`),
    kmk: [...KMK, 'PK.argumentieren'],
  });
}

/** Stufe 3, AB III: a counterexample to a statement that does not hold. */
function counterexample(rng: Rng, ab: Ab): Exercise {
  const { name } = pickPerson(rng);
  const a = rng.int(3, 7);
  const b = a + rng.int(2, 5);
  const c = rng.int(3, 9);
  const form = rng.pick(['rechteck', 'raute', 'parallelogramm'] as const);
  const text = {
    rechteck: { claim: 'Jedes Rechteck ist ein Quadrat.', right: `Rechteck mit ${fmtQty(a, 'cm')} und ${fmtQty(b, 'cm')}`, wrongs: [`Rechteck mit ${fmtQty(c, 'cm')} und ${fmtQty(c, 'cm')}`, `Quadrat mit ${fmtQty(a, 'cm')}`, `Raute mit ${fmtQty(c, 'cm')}`], why: 'Ein Quadrat hat vier gleich lange Seiten.', not: 'Dieses Rechteck ist kein Quadrat.' },
    raute: { claim: 'Jede Raute ist ein Quadrat.', right: `Raute mit ${fmtQty(a, 'cm')} ohne rechte Winkel`, wrongs: [`Raute mit ${fmtQty(a, 'cm')} und vier rechten Winkeln`, `Quadrat mit ${fmtQty(c, 'cm')}`, `Rechteck mit ${fmtQty(a, 'cm')} und ${fmtQty(b, 'cm')}`], why: 'Ein Quadrat hat vier rechte Winkel.', not: 'Diese Raute ist kein Quadrat.' },
    parallelogramm: { claim: 'Jedes Parallelogramm ist ein Rechteck.', right: `Parallelogramm mit ${fmtQty(a, 'cm')} und ${fmtQty(b, 'cm')} ohne rechte Winkel`, wrongs: [`Parallelogramm mit vier rechten Winkeln`, `Quadrat mit ${fmtQty(c, 'cm')}`, `Rechteck mit ${fmtQty(a, 'cm')} und ${fmtQty(b, 'cm')}`], why: 'Ein Rechteck hat vier rechte Winkel.', not: 'Dieses Parallelogramm ist kein Rechteck.' },
  }[form];
  const prompt = `${name} sagt: ${text.claim} Welches Viereck zeigt, dass die Aussage nicht stimmt?`;
  return build(SKILL, 3, {
    key: `gegenbeispiel:${form}:${a}.${b}.${c}:${name}`,
    ab,
    prompt,
    answer: makeChoice(rng, { label: text.right }, text.wrongs.map((label) => ({ label, whyWrong: `Das passt zur Aussage. ${text.why}` }))),
    hints: ['Ein Gegenbeispiel gehört zur ersten Figur, aber nicht zur zweiten.', text.why],
    steps: [text.why, `${text.right}: ${text.not}`, 'Das Beispiel zeigt: Die Aussage stimmt nicht.'],
    praise: 'Du hast ein passendes Gegenbeispiel gefunden.',
    srText: toSpeech(prompt),
    kmk: [...KMK, 'PK.argumentieren'],
  });
}

const FORMS: Record<Stufe, Record<Ab, (rng: Rng, ab: Ab) => Exercise>> = {
  1: { 1: namePicture, 2: nameText, 3: missingSides },
  2: { 1: nameTurned, 2: property, 3: kiteSides },
  3: { 1: statement, 2: relation, 3: counterexample },
};

export const viereckeSkill: SkillDef = {
  ...SKILL,
  title: 'Vierecke',
  description: 'Du erkennst Vierecke an ihren Eigenschaften.',
  stufen: {
    1: 'Quadrat, Rechteck und Parallelogramm in üblicher Lage',
    2: 'Raute, Trapez und Drachenviereck; gedreht; Eigenschaften',
    3: 'Sonderformen: Jedes Quadrat ist auch ein Parallelogramm',
  },
  kmk: KMK,
  generate(rng, stufe, ctx) {
    const ab = targetAb(rng, stufe, ctx);
    return FORMS[stufe][ab](rng, ab);
  },
};
