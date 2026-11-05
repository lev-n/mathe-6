/**
 * flaechen.vieleck (docs/research.md §6). The comma key is on for the whole skill, so every field sets `decimals`.
 * Stufe 1: a grid figure into rectangles, ≤ 40 Kästchen. AB I an L-form with its line, AB II a T or U form without one, AB III a Kästchen wider than 1 cm.
 * Stufe 2: Trapez, Drachen, Raute by decomposition. AB I a right-angled Trapez, AB II Raute or Drachen by diagonals, AB III a symmetric Trapez, also with a comma.
 * Stufe 3: a polygon from measures, choosing a decomposition. AB I a hexagon with two tips, AB II the right calculation, AB III a measure to find first.
 */
import { fmt } from '../../core/format';
import type { Cell, Rng, SkillDef, VisualOf } from '../../core/types';
import { makeChoice } from '../shared';
import { HINT, bug, clean, commaAnswer, figure, generator, lArea, lFigure, pickL, q, type Forms, type LForm } from './common';

const SKILL = { id: 'flaechen.vieleck', topicId: 'flaechen' } as const;
const KMK = ['GM.flaeche'];

const SPLIT = 'Zerlege die Figur in Rechtecke. Rechne jedes Rechteck einzeln.';

// ─── Figures on a grid ───────────────────────────────────────────────────────

interface Part {
  x: number;
  y: number;
  w: number;
  h: number;
}

export function partCells(parts: readonly Part[]): Cell[] {
  return parts.flatMap(({ x, y, w, h }) => Array.from({ length: w * h }, (_, i): Cell => [x + (i % w), y + Math.floor(i / w)]));
}

/** The length of the outline, in Kästchen. */
export function outline(cells: readonly Cell[]): number {
  const taken = new Set(cells.map((c) => c.join()));
  return cells.reduce((n, [x, y]) => n + [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(([dx, dy]) => !taken.has(`${x + dx},${y + dy}`)).length, 0);
}

/** The picture of a figure, mirrored at random, with a margin of one Kästchen. line: the vertical split of an L-form. */
function onGrid(rng: Rng, parts: readonly Part[], line?: number) {
  const cells = partCells(parts);
  const w = Math.max(...cells.map((c) => c[0])) + 1;
  const h = Math.max(...cells.map((c) => c[1])) + 1;
  const flipX = rng.chance(0.5);
  const flipY = rng.chance(0.5);
  const moved = cells.map(([x, y]): Cell => [(flipX ? w - 1 - x : x) + 1, (flipY ? h - 1 - y : y) + 1]);
  const visual: VisualOf<'grid'> = { type: 'grid', width: w + 2, height: h + 2, cells: moved, showOutline: true, ...(line !== undefined ? { axis: { orientation: 'vertical', at: 1 + (flipX ? w - line : line) } } : {}) };
  return { visual, cells, box: w * h, key: `${parts.map((p) => `${p.x}.${p.y}.${p.w}.${p.h}`).join('+')}:${flipX ? 'x' : ''}${flipY ? 'y' : ''}` };
}

const lParts = (l: LForm): Part[] => [{ x: 0, y: 0, w: l.w - l.cutW, h: l.h }, { x: l.w - l.cutW, y: l.cutH, w: l.cutW, h: l.h - l.cutH }];

function tParts(rng: Rng): Part[] {
  const w = rng.pick([5, 6, 7, 8]);
  const stem = rng.pick(w % 2 ? [1, 3] : [2, 4]);
  const bar = rng.int(1, 2);
  return [{ x: 0, y: 0, w, h: bar }, { x: (w - stem) / 2, y: bar, w: stem, h: rng.int(2, 4) }];
}

function uParts(rng: Rng): Part[] {
  const side = rng.int(1, 2);
  const gap = rng.int(1, 3);
  const foot = rng.int(1, 2);
  const h = rng.int(2, 4);
  return [{ x: 0, y: 0, w: side, h }, { x: side + gap, y: 0, w: side, h }, { x: 0, y: h, w: 2 * side + gap, h: foot }];
}

const size = (p: Part) => p.w * p.h;

function partSteps(parts: readonly Part[], last: string) {
  const sizes = parts.map(size);
  const total = sizes.reduce((a, b) => a + b, 0);
  return [...parts.map((p, i) => `Rechteck ${i + 1} hat ${p.w} · ${p.h} = ${size(p)} Kästchen.`), `${sizes.join(' + ')} = ${total}`, last.replace('#', String(total))];
}

const gridBugs = (cells: readonly Cell[], box: number) => [
  bug('huelle', box, HINT.huelle),
  bug('umfang-flaeche', outline(cells), HINT.umfangFlaeche),
];

const s1LGrid: Forms[1][1] = (rng) => {
  const l: LForm = { w: rng.int(4, 7), h: rng.int(3, 5), cutW: 0, cutH: 0 };
  l.cutW = rng.int(1, l.w - 2);
  l.cutH = rng.int(1, l.h - 1);
  const parts = lParts(l);
  const { visual, cells, box, key } = onGrid(rng, parts, l.w - l.cutW);
  return {
    key: `gitter-l:${key}`,
    prompt: 'Die Linie teilt die Figur in zwei Rechtecke. Wie viele Kästchen hat die Figur?',
    visual,
    answer: commaAnswer(cells.length, 'Kästchen'),
    hints: ['Rechne jedes Rechteck einzeln: Reihen · Kästchen in einer Reihe.', 'Addiere danach beide Teile.'],
    steps: partSteps(parts, 'Die Figur hat # Kästchen.'),
    bugs: gridBugs(cells, box),
    praise: 'Du hast die Figur an der Linie zerlegt.',
  };
};

const s1Free: Forms[1][2] = (rng) => {
  const parts = rng.chance(0.5) ? tParts(rng) : uParts(rng);
  const { visual, cells, box, key } = onGrid(rng, parts);
  return {
    key: `gitter-frei:${key}`,
    prompt: 'Zerlege die Figur in Rechtecke. Wie viele Kästchen hat die Figur?',
    visual,
    answer: commaAnswer(cells.length, 'Kästchen'),
    hints: [SPLIT, 'Jedes Kästchen gehört zu genau einem Rechteck.'],
    steps: partSteps(parts, 'Die Figur hat # Kästchen.'),
    bugs: gridBugs(cells, box),
    praise: 'Du hast deine eigene Zerlegung gefunden.',
  };
};

const s1Worth: Forms[1][3] = (rng) => {
  const parts = rng.pick([tParts, uParts])(rng);
  const { visual, cells, key } = onGrid(rng, parts);
  const side = rng.pick([2, 3]);
  const one = side * side;
  const area = cells.length * one;
  return {
    key: `kaestchen-wert:${side}:${key}`,
    prompt: `Jedes Kästchen ist ${side} cm lang und ${side} cm breit. Wie groß ist die Fläche der Figur?`,
    visual,
    answer: commaAnswer(area, 'cm²', 'Fläche:'),
    hints: ['Rechne zuerst die Fläche von einem Kästchen.', 'Zähle dann die Kästchen der Figur.'],
    steps: [`Ein Kästchen: ${side} · ${side} = ${one}`, `Die Figur hat ${cells.length} Kästchen.`, `${cells.length} · ${one} = ${area}`, `Die Fläche ist ${area} cm².`],
    bugs: [
      bug('kaestchen-wert', cells.length, 'Das ist die Zahl der Kästchen. Ein Kästchen hat mehr als 1 cm².'),
      bug('kaestchen-seite', cells.length * side, 'Ein Kästchen ist ein Quadrat. Rechne Seite · Seite.'),
    ],
    praise: 'Du hast den Wert eines Kästchens beachtet.',
    kmk: [...KMK, 'PK.problemloesen'],
  };
};

// ─── Stufe 2 ─────────────────────────────────────────────────────────────────

const s2RightTrapez: Forms[2][1] = (rng) => {
  const c = rng.int(3, 10);
  const a = c + rng.int(2, 6);
  const h = rng.int(3, 9);
  const rect = c * h;
  const tri = clean((a - c) * h / 2);
  const area = clean(rect + tri);
  return {
    key: `trapez-rechts:${a}:${c}:${h}`,
    prompt: 'Zerlege das Trapez in ein Rechteck und ein Dreieck. Wie groß ist die Fläche?',
    visual: figure({
      points: [{ x: 0, y: h }, { x: a, y: h }, { x: c, y: 0 }, { x: 0, y: 0 }],
      sides: [q(a, 'cm'), null, q(c, 'cm'), q(h, 'cm')],
      rightAngles: [0, 3],
    }),
    answer: commaAnswer(area, 'cm²', 'Fläche:'),
    hints: ['Zeichne im Kopf die Höhe von der oberen rechten Ecke.', 'Das Dreieck hat die Grundseite: untere Seite minus obere Seite.'],
    steps: [`Rechteck: ${c} · ${h} = ${rect}`, `Dreieck: (${a} − ${c}) · ${h} : 2 = ${fmt(tri)}`, `${rect} + ${fmt(tri)} = ${fmt(area)}`, `Die Fläche ist ${q(area, 'cm²')}.`],
    bugs: [
      bug('huelle', a * h, HINT.huelle),
      bug('nur-rechteck', rect, 'Das ist nur das Rechteck. Das Dreieck gehört dazu.'),
      bug('dreieck-ohne-halb', rect + (a - c) * h, HINT.dreieckHalb),
    ],
    praise: 'Du hast das Trapez in zwei Teile zerlegt.',
  };
};

const s2Diagonals: Forms[2][2] = (rng) => {
  const rhombus = rng.chance(0.5);
  const e = rng.pick([4, 6, 8, 10, 12]);
  const f = rng.pick([6, 8, 10, 12, 14]);
  const top = rhombus ? f / 2 : rng.int(1, Math.floor(f / 2) - 1);
  const area = e * f / 2;
  const name = rhombus ? 'Raute' : 'Drachen';
  const whole = rhombus ? 'die Raute' : 'den Drachen';
  return {
    key: `diagonalen:${name}:${e}:${f}:${top}`,
    prompt: `Die Diagonalen sind ${e} cm und ${f} cm lang. Zerlege ${whole} in zwei Dreiecke. Wie groß ist die Fläche?`,
    visual: figure({
      points: [{ x: 0, y: top }, { x: e / 2, y: 0 }, { x: e, y: top }, { x: e / 2, y: f }],
      equalMarks: rhombus ? [[0, 1, 2, 3]] : [[0, 1], [2, 3]],
    }),
    answer: commaAnswer(area, 'cm²', 'Fläche:'),
    hints: [`Die Diagonale mit ${e} cm ist die Grundseite beider Dreiecke.`, `Beide Höhen zusammen sind ${f} cm.`],
    // The task states no split of the long diagonal, and none is needed: the two heights add up to it.
    steps: [`Beide Dreiecke haben die Grundseite ${e} cm.`, `Beide Höhen zusammen sind ${f} cm.`, `Beide Dreiecke zusammen: ${e} · ${f} : 2 = ${fmt(area)}`, `Die Fläche ist ${q(area, 'cm²')}.`],
    bugs: [
      bug('dreieck-ohne-halb', e * f, 'Das sind zwei ganze Rechtecke. Jedes Dreieck ist nur die Hälfte davon.'),
      rhombus && bug('nur-ein-dreieck', e * top / 2, 'Das ist ein Dreieck. Die Figur hat zwei Dreiecke.'),
      bug('seiten-plus', e + f, 'Die Fläche ist kein Plus. Zerlege die Figur in zwei Dreiecke.'),
    ],
    praise: `Du hast ${whole} in zwei Dreiecke zerlegt.`,
  };
};

const s2SymTrapez: Forms[2][3] = (rng) => {
  const c = rng.int(3, 10);
  const over = rng.pick([1, 1.5, 2, 2.5, 3]);
  const a = c + 2 * over;
  const h = rng.pick([4, 6, 8, 10]);
  const rect = c * h;
  const tris = over * h;
  const area = clean(rect + tris);
  return {
    key: `trapez-sym:${a}:${c}:${h}`,
    prompt: 'Zerlege das Trapez in ein Rechteck und zwei gleiche Dreiecke. Wie groß ist die Fläche?',
    visual: figure({
      points: [{ x: 0, y: h }, { x: a, y: h }, { x: over + c, y: 0 }, { x: over, y: 0 }],
      sides: [q(a, 'cm'), null, q(c, 'cm'), null],
      height: { from: 3, to: { x: over, y: h }, label: q(h, 'cm') },
      parallelMarks: [[0, 2]],
      equalMarks: [[1, 3]],
    }),
    answer: commaAnswer(area, 'cm²', 'Fläche:'),
    hints: ['Links und rechts steht je ein gleiches Stück über.', 'Rechne zuerst, wie lang dieses Stück ist.'],
    steps: [`Stück links: (${fmt(a)} − ${c}) : 2 = ${fmt(over)}`, `Rechteck: ${c} · ${h} = ${rect}`, `Zwei Dreiecke: 2 · ${fmt(over)} · ${h} : 2 = ${fmt(tris)}`, `${rect} + ${fmt(tris)} = ${fmt(area)}`, `Die Fläche ist ${q(area, 'cm²')}.`],
    bugs: [
      bug('huelle', clean(a * h), HINT.huelle),
      bug('nur-rechteck', rect, 'Das ist nur das Rechteck. Die Dreiecke gehören dazu.'),
      bug('dreieck-ohne-halb', clean(rect + 2 * tris), HINT.dreieckHalb),
      bug('nur-ein-dreieck', clean(rect + tris / 2), 'Das ist ein Dreieck zu wenig. Das Trapez hat zwei.'),
    ],
    praise: 'Du hast das Trapez sauber in drei Teile zerlegt.',
  };
};

// ─── Stufe 3 ─────────────────────────────────────────────────────────────────

const s3Hexagon: Forms[3][1] = (rng) => {
  const w = rng.int(5, 12);
  const h = rng.pick([4, 6, 8, 10]);
  const tip = rng.int(2, 4);
  const rect = w * h;
  const tris = tip * h;
  return {
    key: `sechseck:${w}:${h}:${tip}`,
    prompt: `Links und rechts ragt je eine Spitze ${tip} cm über das Rechteck hinaus. Wie groß ist die Fläche?`,
    visual: figure({
      points: [{ x: tip, y: 0 }, { x: tip + w, y: 0 }, { x: tip + w + tip, y: h / 2 }, { x: tip + w, y: h }, { x: tip, y: h }, { x: 0, y: h / 2 }],
      sides: [q(w, 'cm'), null, null, null, null, null],
      height: { from: 0, to: { x: tip, y: h }, label: q(h, 'cm') },
    }),
    answer: commaAnswer(rect + tris, 'cm²', 'Fläche:'),
    hints: ['Die Figur besteht aus einem Rechteck und zwei gleichen Dreiecken.', `Jedes Dreieck hat die Grundseite ${h} cm und die Höhe ${tip} cm.`],
    steps: [`Rechteck: ${w} · ${h} = ${rect}`, `Ein Dreieck: ${h} · ${tip} : 2 = ${fmt(h * tip / 2)}`, `Zwei Dreiecke: 2 · ${fmt(h * tip / 2)} = ${tris}`, `${rect} + ${tris} = ${rect + tris}`, `Die Fläche ist ${rect + tris} cm².`],
    bugs: [
      bug('dreieck-ohne-halb', rect + 2 * tris, HINT.dreieckHalb),
      bug('nur-rechteck', rect, 'Das ist nur das Rechteck. Die Dreiecke gehören dazu.'),
      bug('nur-ein-dreieck', rect + tris / 2, 'Das ist ein Dreieck zu wenig. Die Figur hat zwei.'),
    ],
    praise: 'Du hast das Sechseck aus den Maßen zerlegt.',
  };
};

const s3Choose: Forms[3][2] = (rng) => {
  const l = pickL(rng, [8, 14], [6, 12]);
  const area = lArea(l);
  const add = `${l.w - l.cutW} · ${l.h} + ${l.cutW} · ${l.h - l.cutH}`;
  const take = `${l.w} · ${l.h} − ${l.cutW} · ${l.cutH}`;
  const useTake = rng.chance(0.5);
  const wrongs = [
    { label: `${l.w} · ${l.h}`, value: l.w * l.h, whyWrong: 'Das ist das große Rechteck. Eine Ecke fehlt.' },
    { label: `${l.w - l.cutW} · ${l.h} + ${l.w} · ${l.h - l.cutH}`, value: (l.w - l.cutW) * l.h + l.w * (l.h - l.cutH), whyWrong: 'Hier zählst du ein Stück doppelt.' },
    { label: `${l.w} · ${l.h} + ${l.cutW} · ${l.cutH}`, value: l.w * l.h + l.cutW * l.cutH, whyWrong: 'Die fehlende Ecke musst du abziehen.' },
    { label: `${l.w - l.cutW} · ${l.cutH} + ${l.cutW} · ${l.h - l.cutH}`, value: (l.w - l.cutW) * l.cutH + l.cutW * (l.h - l.cutH), whyWrong: 'Das linke Rechteck ist so zu kurz. Ein Stück fehlt.' },
  ].filter((o) => o.value !== area);
  return {
    key: `zerlegung:${l.w}x${l.h}-${l.cutW}x${l.cutH}:${useTake ? 'minus' : 'plus'}`,
    prompt: 'Welche Rechnung gibt die Fläche der Figur an?',
    visual: lFigure(l, 'cm'),
    answer: makeChoice(rng, { label: useTake ? take : add }, wrongs.map(({ label, whyWrong }) => ({ label, whyWrong }))),
    hints: ['Zerlege die Figur oder ergänze sie zum großen Rechteck.', 'Prüfe bei jeder Rechnung: Passt jedes Stück in die Figur?'],
    steps: useTake
      ? [`Großes Rechteck: ${l.w} · ${l.h} = ${l.w * l.h}`, `Fehlende Ecke: ${l.cutW} · ${l.cutH} = ${l.cutW * l.cutH}`, `Die passende Rechnung ist ${take} = ${area}.`]
      : [`Rechteck links: ${l.w - l.cutW} · ${l.h} = ${(l.w - l.cutW) * l.h}`, `Rechteck rechts: ${l.cutW} · ${l.h - l.cutH} = ${l.cutW * (l.h - l.cutH)}`, `Die passende Rechnung ist ${add} = ${area}.`],
    praise: 'Du hast die Rechnung mit der Figur verglichen.',
    kmk: [...KMK, 'PK.argumentieren'],
  };
};

const s3Hidden: Forms[3][3] = (rng) => {
  if (rng.chance(0.5)) {
    const w = rng.pick([6, 8, 10, 12]);
    const wall = rng.int(3, 8);
    const roof = rng.int(2, 6);
    const total = wall + roof;
    const box = w * wall;
    const top = w * roof / 2;
    return {
      key: `haus-gesamt:${w}:${wall}:${total}`,
      prompt: `Das Haus ist insgesamt ${total} m hoch. Die Wand ist ${wall} m hoch und ${w} m breit. Wie groß ist die Fläche?`,
      visual: figure({
        points: [{ x: 0, y: roof }, { x: w / 2, y: 0 }, { x: w, y: roof }, { x: w, y: total }, { x: 0, y: total }],
        sides: [null, null, q(wall, 'm'), q(w, 'm'), null],
        height: { from: 1, to: { x: w / 2, y: total }, label: q(total, 'm') },
      }),
      answer: commaAnswer(box + top, 'm²', 'Fläche:'),
      hints: ['Das Dach ist die gesamte Höhe minus die Wand.', 'Rechne Wand und Dach einzeln.'],
      steps: [`Höhe des Dachs: ${total} − ${wall} = ${roof}`, `Wand: ${w} · ${wall} = ${box}`, `Dach: ${w} · ${roof} : 2 = ${top}`, `${box} + ${top} = ${box + top}`, `Die Fläche ist ${box + top} m².`],
      bugs: [
        bug('huelle', w * total, HINT.huelle),
        bug('dach-gesamthoehe', box + w * total / 2, 'Das Dach ist nicht so hoch wie das ganze Haus. Ziehe die Wand ab.'),
        bug('dreieck-ohne-halb', box + w * roof, HINT.dreieckHalb),
        bug('nur-rechteck', box, 'Das ist nur die Wand. Das Dach gehört dazu.'),
      ],
      praise: 'Du hast die Höhe des Dachs zuerst berechnet.',
      kmk: [...KMK, 'PK.problemloesen'],
    };
  }
  const p = rng.int(1, 3);
  const r = rng.int(2, 4);
  const top = rng.int(3, 8);
  const wall = rng.int(3, 6);
  const w = top + 2 * p;
  const h = wall + r;
  const box = w * h;
  const cut = p * r;
  return {
    key: `zwei-ecken:${w}:${top}:${h}:${wall}`,
    prompt: 'Am Rechteck fehlen oben zwei gleiche Ecken. Ergänze die Figur zum Rechteck. Wie groß ist die Fläche?',
    visual: figure({
      points: [{ x: p, y: 0 }, { x: p + top, y: 0 }, { x: w, y: r }, { x: w, y: h }, { x: 0, y: h }, { x: 0, y: r }],
      sides: [q(top, 'cm'), null, q(wall, 'cm'), q(w, 'cm'), null, null],
      height: { from: 0, to: { x: p, y: h }, label: q(h, 'cm') },
      rightAngles: [3, 4],
    }),
    answer: commaAnswer(box - cut, 'cm²', 'Fläche:'),
    hints: ['Rechne zuerst das ganze Rechteck.', 'Finde die Maße einer Ecke aus den Seiten.'],
    steps: [`Ecke: (${w} − ${top}) : 2 = ${p} und ${h} − ${wall} = ${r}`, `Rechteck: ${w} · ${h} = ${box}`, `Zwei Ecken: 2 · ${p} · ${r} : 2 = ${cut}`, `${box} − ${cut} = ${box - cut}`, `Die Fläche ist ${box - cut} cm².`],
    bugs: [
      bug('huelle', box, HINT.huelle),
      bug('dreieck-ohne-halb', box - 2 * cut, HINT.dreieckHalb),
      bug('nur-ein-dreieck', box - cut / 2, 'Es fehlen zwei Ecken. Ziehe beide Dreiecke ab.'),
    ],
    praise: 'Du hast die Figur zum Rechteck ergänzt.',
    kmk: [...KMK, 'PK.problemloesen'],
  };
};

export const vieleckSkill: SkillDef = {
  ...SKILL,
  title: 'Zerlegen und Ergänzen',
  description: 'Du zerlegst Figuren in bekannte Teile.',
  stufen: { 1: 'Figuren im Gitter in Rechtecke zerlegen', 2: 'Trapez, Drachen und Raute zerlegen', 3: 'Vielecke aus Maßen, passende Zerlegung wählen' },
  kmk: KMK,
  keys: { comma: true },
  generate: generator(SKILL, KMK, {
    1: { 1: s1LGrid, 2: s1Free, 3: s1Worth },
    2: { 1: s2RightTrapez, 2: s2Diagonals, 3: s2SymTrapez },
    3: { 1: s3Hexagon, 2: s3Choose, 3: s3Hidden },
  }),
};
