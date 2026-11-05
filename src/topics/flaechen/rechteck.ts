/**
 * flaechen.rechteck (docs/research.md §6). The comma key is on for the whole skill, so every field sets `decimals`.
 * Stufe 1: whole cm, sides ≤ 20. AB I Fläche or Umfang, AB II both with longer sides, AB III a side from the Umfang.
 * Stufe 2: decimal sides, from the area to a side. AB I Fläche or Umfang with a comma, AB II the side from the area, always with a comma, AB III a story: from the area to the Umfang.
 * Stufe 3: L-forms, same area with another Umfang. AB I an L-form with all sides, AB II two sides without a number, AB III equal areas with different Umfang.
 */
import { fmt } from '../../core/format';
import type { Cell, Rng, SkillDef, VisualOf } from '../../core/types';
import { makeChoice } from '../shared';
import { HINT, bug, clean, commaAnswer, commaField, generator, lArea, lFigure, pickL, q, rectFigure, type Forms, type Item, type LForm } from './common';

const SKILL = { id: 'flaechen.rechteck', topicId: 'flaechen' } as const;
const KMK = ['GM.flaeche'];

const TWO_SIDES = 'Das sind nur zwei Seiten. Das Rechteck hat vier Seiten.';

/** The rectangle as rows of Kästchen, for a worked step. */
const rows = (a: number, b: number): VisualOf<'grid'> => ({ type: 'grid', width: a, height: b, cells: Array.from({ length: a * b }, (_, i): Cell => [i % a, Math.floor(i / a)]), showOutline: true });

/** Fläche or Umfang of a rectangle, whole or with a comma. */
function areaOrRim(rng: Rng, a: number, b: number, unit: string, praise: { area: string; rim: string }): Item {
  const area = clean(a * b);
  const rim = clean(2 * a + 2 * b);
  const askArea = rng.chance(0.5);
  const digits = Number.isInteger(a) ? null : clean(a * 10 * b);
  return askArea
    ? {
      key: `flaeche:${fmt(a)}x${b}`,
      prompt: 'Wie groß ist die Fläche des Rechtecks?',
      visual: rectFigure(a, b, unit),
      answer: commaAnswer(area, `${unit}²`, 'Fläche:'),
      hints: ['Fläche: Länge · Breite.', 'Stell dir Reihen aus Quadraten vor. Jede Reihe ist gleich lang.'],
      steps: [
        { text: `${fmt(a)} · ${fmt(b)} = ${fmt(area)}`, ...(Number.isInteger(a) && a <= 9 ? { visual: rows(a, b) } : {}) },
        `Die Fläche ist ${q(area, `${unit}²`)}.`,
      ],
      bugs: [bug('umfang-flaeche', rim, HINT.umfangFlaeche), bug('seiten-plus', clean(a + b), 'Du hast die Seiten addiert. Die Fläche ist Länge · Breite.'), digits !== null && bug('komma-weg', digits, 'Schau auf das Komma. Das Ergebnis muss zu den Seiten passen.')],
      praise: praise.area,
    }
    : {
      key: `umfang:${fmt(a)}x${b}`,
      prompt: 'Wie groß ist der Umfang des Rechtecks?',
      visual: rectFigure(a, b, unit),
      answer: commaAnswer(rim, unit, 'Umfang:'),
      hints: ['Geh einmal um das Rechteck herum.', 'Je zwei Seiten sind gleich lang.'],
      steps: [`2 · ${fmt(a)} + 2 · ${fmt(b)} = ${fmt(rim)}`, `Der Umfang ist ${q(rim, unit)}.`],
      bugs: [bug('umfang-flaeche', area, HINT.umfangFlaeche), bug('halber-umfang', clean(a + b), TWO_SIDES)],
      praise: praise.rim,
    };
}

// ─── Stufe 1 ─────────────────────────────────────────────────────────────────

const s1Direct: Forms[1][1] = (rng) => {
  const a = rng.int(3, 12);
  const b = rng.int(2, a - 1);
  return areaOrRim(rng, a, b, 'cm', { area: 'Du hast Länge und Breite malgenommen.', rim: 'Du hast alle vier Seiten gerechnet.' });
};

const s1Both: Forms[1][2] = (rng) => {
  const a = rng.int(11, 20);
  const b = rng.int(3, 12);
  const area = a * b;
  const rim = 2 * a + 2 * b;
  return {
    key: `beides:${a}x${b}`,
    prompt: 'Wie groß sind Fläche und Umfang des Rechtecks?',
    visual: rectFigure(a, b, 'cm'),
    answer: { kind: 'multi', fields: [commaField('flaeche', area, 'Fläche:', 'cm²'), commaField('umfang', rim, 'Umfang:', 'cm')] },
    hints: ['Fläche: Länge · Breite.', 'Umfang: einmal ganz um das Rechteck herum.'],
    steps: [`Fläche: ${a} · ${b} = ${area}`, `Umfang: 2 · ${a} + 2 · ${b} = ${rim}`, `Die Fläche ist ${area} cm², der Umfang ${rim} cm.`],
    bugs: [
      bug('umfang-flaeche', { flaeche: rim, umfang: area }, HINT.umfangFlaeche),
      bug('halber-umfang', { flaeche: area, umfang: a + b }, TWO_SIDES),
    ],
    praise: 'Du hast Fläche und Umfang sauber getrennt.',
  };
};

const s1Back: Forms[1][3] = (rng) => {
  const a = rng.int(5, 20);
  const b = rng.int(2, a - 1);
  const rim = 2 * a + 2 * b;
  return {
    key: `seite-aus-umfang:${rim}:${a}`,
    prompt: `Ein Rechteck hat den Umfang ${rim} cm. Eine Seite ist ${a} cm lang. Wie lang ist die andere Seite?`,
    visual: rectFigure(a, b, 'cm', { left: '?' }),
    answer: commaAnswer(b, 'cm', 'Andere Seite:'),
    hints: ['Der halbe Umfang ist Länge plus Breite.', 'Ziehe dann die bekannte Seite ab.'],
    steps: [`Der halbe Umfang: ${rim} : 2 = ${a + b}`, `${a + b} − ${a} = ${b}`, `Die andere Seite ist ${b} cm lang.`],
    bugs: [
      bug('umfang-nicht-halbiert', rim - a, 'Halbiere zuerst den Umfang. Der Umfang enthält jede Seite zweimal.'),
      bug('seite-nicht-halbiert', rim - 2 * a, 'Das sind zwei Seiten zusammen. Gesucht ist eine Seite.'),
      bug('seite-durch-vier', rim / 4, 'Nur beim Quadrat teilst du durch 4. Hier sind die Seiten verschieden.'),
    ],
    praise: 'Du hast vom Umfang rückwärts gerechnet.',
    kmk: [...KMK, 'PK.problemloesen'],
  };
};

// ─── Stufe 2 ─────────────────────────────────────────────────────────────────

const s2Decimal: Forms[2][1] = (rng) => {
  const half = rng.chance(0.5);
  const a = half ? rng.int(3, 12) + 0.5 : clean(rng.int(2, 9) + rng.int(1, 9) / 10);
  const b = half ? rng.pick([2, 4, 6, 8]) : rng.pick([5, 10]);
  return areaOrRim(rng, a, b, 'cm', { area: 'Du hast richtig mit dem Komma malgenommen.', rim: 'Du hast die Seiten mit Komma richtig addiert.' });
};

const s2Side: Forms[2][2] = (rng) => {
  // a comma in the known side or in the answer: a whole division from the times table would be easier than Stufe 1
  const knownComma = rng.chance(0.5);
  const a = knownComma ? rng.int(2, 9) + 0.5 : rng.int(3, 12);
  const b = knownComma ? rng.pick([2, 4, 6, 8, 10, 12]) : rng.int(3, 14) + 0.5;
  const area = clean(a * b);
  return {
    key: `seite-aus-flaeche:${fmt(area)}:${fmt(a)}`,
    prompt: `Ein Rechteck hat die Fläche ${q(area, 'cm²')}. Eine Seite ist ${q(a, 'cm')} lang. Wie lang ist die andere Seite?`,
    visual: rectFigure(a, b, 'cm', { left: '?' }),
    answer: commaAnswer(b, 'cm', 'Andere Seite:'),
    hints: ['Fläche = Länge · Breite. Welche Zahl fehlt?', 'Rechne rückwärts: Teile die Fläche durch die bekannte Seite.'],
    steps: [`□ · ${fmt(a)} = ${fmt(area)}`, `${fmt(area)} : ${fmt(a)} = ${fmt(b)}`, `Die andere Seite ist ${q(b, 'cm')} lang.`],
    bugs: [
      bug('minus-statt-geteilt', clean(area - a), 'Die Fläche ist ein Produkt. Rechne rückwärts mit geteilt.'),
      bug('mal-statt-geteilt', clean(area * a), 'Die Seite ist kleiner als die Fläche. Teile durch die bekannte Seite.'),
      bug('umfang-flaeche', clean(area / 2 - a), HINT.umfangFlaeche),
      !Number.isInteger(b) && bug('komma-weg', clean(b * 10), 'Schau auf das Komma. Das Ergebnis muss zu den Seiten passen.'),
    ],
    praise: 'Du hast aus der Fläche die Seite berechnet.',
  };
};

/** Each place with sizes of its own: width in m, and whole metres of the other side, which ends in ,5. */
const STORIES = [
  { a: 'Ein Beet', the: 'das Beet', edge: 'Zaun', widths: [2, 4], length: [3, 9] },
  { a: 'Ein Spielfeld', the: 'das Spielfeld', edge: 'Absperrband', widths: [8, 10, 12, 14], length: [15, 28] },
  { a: 'Ein Pausenhof', the: 'der Pausenhof', edge: 'Zaun', widths: [20, 24, 30, 36], length: [30, 60] },
] as const;

const s2Story: Forms[2][3] = (rng) => {
  const { a: one, the, edge, widths, length } = rng.pick(STORIES);
  const a = rng.pick(widths);
  const b = rng.int(length[0], length[1]) + 0.5;
  const area = a * b;
  const rim = 2 * a + 2 * b;
  return {
    key: `geschichte:${one}:${area}:${a}`,
    context: `${one} hat die Fläche ${q(area, 'm²')}. ${the[0].toUpperCase()}${the.slice(1)} ist ${a} m breit.`,
    prompt: `Wie viel Meter ${edge} braucht ${the} ringsum?`,
    answer: commaAnswer(rim, 'm', `${edge}:`),
    hints: ['Rechne zuerst die fehlende Seite aus.', 'Ringsum heißt: der ganze Umfang.'],
    steps: [`Die fehlende Seite: ${fmt(area)} : ${a} = ${fmt(b)}`, `Der Umfang: 2 · ${fmt(b)} + 2 · ${a} = ${fmt(rim)}`, `Das sind ${q(rim, 'm')} ${edge}.`],
    bugs: [
      bug('nur-seite', b, 'Das ist die fehlende Seite. Gesucht ist der Weg ringsum.'),
      bug('umfang-flaeche', area, HINT.umfangFlaeche),
      bug('halber-umfang', a + b, TWO_SIDES),
    ],
    praise: 'Du hast aus der Fläche den Umfang berechnet.',
    kmk: [...KMK, 'PK.modellieren'],
  };
};

// ─── Stufe 3 ─────────────────────────────────────────────────────────────────

const lKey = (l: LForm) => `${l.w}x${l.h}-${l.cutW}x${l.cutH}`;

function lBugs(l: LForm) {
  return [
    bug('huelle', l.w * l.h, HINT.huelle),
    bug('zerlegen-doppelt', (l.w - l.cutW) * l.h + l.w * (l.h - l.cutH), HINT.doppelt),
    bug('umfang-flaeche', 2 * l.w + 2 * l.h, HINT.umfangFlaeche),
  ];
}

const lSteps = (l: LForm) => {
  const left = (l.w - l.cutW) * l.h;
  const right = l.cutW * (l.h - l.cutH);
  return [`Rechteck links: ${l.w - l.cutW} · ${l.h} = ${left}`, `Rechteck rechts: ${l.cutW} · ${l.h - l.cutH} = ${right}`, `${left} + ${right} = ${left + right}`, `Die Fläche ist ${left + right} cm².`];
};

const s3L: Forms[3][1] = (rng) => {
  const l = pickL(rng, [8, 14], [6, 12]);
  return {
    key: `l-form:${lKey(l)}`,
    prompt: 'Zerlege die L-Form in zwei Rechtecke. Wie groß ist die Fläche?',
    visual: lFigure(l, 'cm'),
    answer: commaAnswer(lArea(l), 'cm²', 'Fläche:'),
    hints: ['Zeichne im Kopf eine Linie durch die innere Ecke.', 'Rechne jedes Rechteck einzeln. Addiere danach beide Teile.'],
    steps: lSteps(l),
    bugs: lBugs(l),
    praise: 'Du hast die L-Form in Rechtecke zerlegt.',
  };
};

const s3LHidden: Forms[3][2] = (rng) => {
  const l = pickL(rng, [8, 16], [6, 12]);
  const rim = 2 * l.w + 2 * l.h;
  const askArea = rng.chance(0.5);
  // the two sides at the cut stay without a number
  const visual = lFigure(l, 'cm', [2, 3]);
  const missing = `Fehlende Seiten: ${l.w} − ${l.w - l.cutW} = ${l.cutW}; ${l.h} − ${l.cutH} = ${l.h - l.cutH}`;
  if (askArea) {
    return {
      key: `l-form-versteckt:flaeche:${lKey(l)}`,
      prompt: 'Zwei Seiten stehen ohne Zahl. Wie groß ist die Fläche?',
      visual,
      answer: commaAnswer(lArea(l), 'cm²', 'Fläche:'),
      hints: ['Rechne zuerst die Seiten ohne Zahl aus.', 'Vergleiche die lange Seite unten mit den Stücken oben.'],
      steps: [missing, ...lSteps(l)],
      bugs: lBugs(l),
      praise: 'Du hast die fehlenden Seiten zuerst berechnet.',
    };
  }
  const labelled = (l.w - l.cutW) + l.cutH + l.w + l.h;
  return {
    key: `l-form-versteckt:umfang:${lKey(l)}`,
    prompt: 'Zwei Seiten stehen ohne Zahl. Wie groß ist der Umfang?',
    visual,
    answer: commaAnswer(rim, 'cm', 'Umfang:'),
    hints: ['Rechne zuerst die Seiten ohne Zahl aus.', 'Der Umfang enthält alle sechs Seiten.'],
    steps: [missing, `${labelled} + ${l.cutW} + ${l.h - l.cutH} = ${rim}`, `Der Umfang ist ${rim} cm.`],
    bugs: [
      bug('nur-beschriftete', labelled, 'Die zwei Seiten ohne Zahl gehören auch zum Umfang.'),
      bug('umfang-flaeche', lArea(l), HINT.umfangFlaeche),
    ],
    praise: 'Du hast alle sechs Seiten mitgerechnet.',
  };
};

/** Areas with several whole rectangles: longer side first. */
const SAME_AREA: readonly (readonly (readonly [number, number])[])[] = [
  [[8, 3], [6, 4], [12, 2]],
  [[12, 3], [9, 4], [6, 6], [18, 2]],
  [[12, 4], [8, 6], [16, 3]],
  [[12, 5], [10, 6], [15, 4], [20, 3]],
  [[12, 6], [9, 8], [18, 4], [24, 3]],
  [[16, 5], [10, 8], [20, 4]],
  [[15, 6], [10, 9], [18, 5]],
];

const s3Same: Forms[3][3] = (rng) => {
  const pairs = rng.pick(SAME_AREA);
  const area = pairs[0][0] * pairs[0][1];
  if (rng.chance(0.5)) {
    const [[a, b], [c, d]] = rng.sample(pairs, 2);
    const rimA = 2 * a + 2 * b;
    const rimB = 2 * c + 2 * d;
    return {
      key: `gleiche-flaeche:umfang:${a}x${b}:${c}x${d}`,
      context: `Rechteck A ist ${a} cm lang und ${b} cm breit. Rechteck B hat die gleiche Fläche und ist ${d} cm breit.`,
      prompt: 'Wie groß ist der Umfang von Rechteck B?',
      answer: commaAnswer(rimB, 'cm', 'Umfang:'),
      hints: ['Rechne zuerst die Fläche von Rechteck A aus.', 'Teile die Fläche dann durch die Breite von Rechteck B.'],
      steps: [`Fläche: ${a} · ${b} = ${area}`, `Länge von B: ${area} : ${d} = ${c}`, `Umfang von B: 2 · ${c} + 2 · ${d} = ${rimB}`, `Der Umfang von Rechteck B ist ${rimB} cm.`],
      bugs: [
        bug('gleicher-umfang', rimA, 'Gleiche Fläche heißt nicht gleicher Umfang. Rechne mit den Seiten von B.'),
        bug('nur-laenge', c, 'Das ist die Länge von B. Gesucht ist der Umfang.'),
        bug('umfang-flaeche', area, HINT.umfangFlaeche),
      ],
      praise: 'Du hast gesehen: Gleiche Fläche, anderer Umfang.',
      kmk: [...KMK, 'PK.problemloesen'],
    };
  }
  const shown = rng.sample(pairs, 3);
  const rims = shown.map(([a, b]) => 2 * a + 2 * b);
  const smallest = rng.chance(0.5);
  const best = rims.indexOf(smallest ? Math.min(...rims) : Math.max(...rims));
  const label = ([a, b]: readonly [number, number]) => `${a} cm lang, ${b} cm breit`;
  return {
    key: `gleiche-flaeche:wahl:${smallest ? 'klein' : 'gross'}:${area}:${shown.map(([a]) => a).join('-')}`,
    prompt: `Alle Rechtecke haben die Fläche ${area} cm². Welches Rechteck hat den ${smallest ? 'kleinsten' : 'größten'} Umfang?`,
    answer: makeChoice(rng, { label: label(shown[best]) }, shown.filter((_, i) => i !== best).map((p) => ({ label: label(p), whyWrong: `Rechne den Umfang aus: 2 · ${p[0]} + 2 · ${p[1]}. Vergleiche alle drei.` }))),
    hints: ['Rechne für jedes Rechteck den Umfang aus.', 'Vergleiche dann die drei Umfänge.'],
    steps: [`Die Umfänge: ${rims.map((r) => `${r} cm`).join(', ')}.`, `Der ${smallest ? 'kleinste' : 'größte'} Umfang ist ${rims[best]} cm.`, `Das Rechteck ist ${label(shown[best])}.`],
    praise: 'Du hast alle drei Umfänge verglichen.',
    kmk: [...KMK, 'PK.argumentieren'],
  };
};

export const rechteckSkill: SkillDef = {
  ...SKILL,
  title: 'Rechteck: Fläche und Umfang',
  description: 'Du rechnest Fläche und Umfang von Rechtecken.',
  stufen: { 1: 'Ganze Zentimeter, Seiten bis 20 cm', 2: 'Seiten mit Komma, von der Fläche zur Seite', 3: 'L-Formen, gleiche Fläche mit anderem Umfang' },
  kmk: KMK,
  keys: { comma: true },
  generate: generator(SKILL, KMK, {
    1: { 1: s1Direct, 2: s1Both, 3: s1Back },
    2: { 1: s2Decimal, 2: s2Side, 3: s2Story },
    3: { 1: s3L, 2: s3LHidden, 3: s3Same },
  }),
};
