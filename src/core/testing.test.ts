import { describe, expect, it } from 'vitest';
import { assertAnswerLimits, assertWellFormedExercise, assertWellFormedVisual, bareKey, revealedAnswers, stufeDifference, STUFE_TEST_MIN_DIFFERENT } from './testing';
import { createRng } from './rng';
import type { Exercise, SkillDef, Visual } from './types';

const skill = { id: 'brueche.von-groessen', topicId: 'brueche', title: 'Test', description: 'Test.', stufen: { 1: 'a', 2: 'b', 3: 'c' }, kmk: ['ZO.grosse-zahlen'] } as unknown as SkillDef;
const ex = (patch: Partial<Exercise> = {}): Exercise => ({
  key: 'brueche.von-groessen:1:x',
  topicId: 'brueche',
  skillId: 'brueche.von-groessen',
  stufe: 1,
  ab: 1,
  prompt: 'Rechne.',
  expression: '34 + 8 = □',
  answer: { kind: 'number', value: 42 },
  hints: ['Rechne erst bis zum nächsten Zehner.'],
  steps: ['34 + 6 = 40', '40 + 2 = 42'],
  praise: 'Du bist erst zum Zehner gegangen.',
  srText: '34 plus 8',
  kmk: ['ZO.dezimal-rechnen'],
  ...patch,
});
const check = (patch: Partial<Exercise>, stufe: 1 | 2 | 3 = 1) => () => assertWellFormedExercise(skill, stufe, ex({ stufe, key: `brueche.von-groessen:${stufe}:x`, ...patch }));
const option = (n: number) => Array.from({ length: n }, (_, i) => ({ label: `Wort ${i + 1}` }));

describe('assertWellFormedExercise: text rules', () => {
  it('accepts a task that keeps them', () => {
    expect(check({})).not.toThrow();
  });
  it('T1, T2: word limits, the story limits for exercises with context', () => {
    expect(check({ prompt: 'Schau dir dieses Bild ganz genau an und rechne dann die Aufgabe im Kopf aus. Dann bist du fertig und kannst weiter.' })).toThrow(/T1/);
    expect(check({ context: 'Mia hat 34 Karten.', prompt: 'Ali gibt Mia 8 Karten. Wie viele sind es?' })).not.toThrow();
    expect(check({ context: 'Mia hat heute früh genau 34 Karten. Ali gibt Mia am Mittag noch einmal 8 Karten dazu. Ben gibt Mia dann am Abend auch noch 2 Karten.', prompt: 'Wie viele Karten hat Mia jetzt dann am Ende des Tages genau?', expression: undefined })).toThrow(/T2/);
  });
  it('T3, T4, T5', () => {
    expect(check({ context: 'Mia hat 3. Ali hat 2. Ben hat 4. Ida hat 1.', prompt: 'Wie viele?' })).toThrow(/T3/);
    expect(check({ context: 'Mia und Ali und Ben und Ida und Lea und Emre und Noah spielen heute hier.', prompt: 'Wer fehlt?', expression: undefined })).toThrow(/T4/);
    expect(check({ prompt: 'Rechne, weil es Spaß macht.' })).toThrow(/T5/);
    expect(check({ prompt: 'Rechne, weil es Spaß macht.' }, 2)).not.toThrow();
  });
  it('T19: hints, praise and worked steps', () => {
    expect(check({ hints: ['Eins. Zwei. Drei.'] })).toThrow(/T19/);
    expect(check({ praise: 'Du hast wirklich an alle Zehner und auch an alle Einer noch gedacht.' })).toThrow(/T19/);
    expect(check({ steps: ['1 + 1 = 2', '2 + 1 = 3', '3 + 1 = 4', '4 + 1 = 5', '5 + 1 = 6', '6 + 1 = 7'] })).toThrow(/T19/);
    expect(check({ bugs: [{ id: 'x', match: 41, hint: 'Minus mal minus gibt plus.' }] })).toThrow(/catchphrase/);
  });
  it('T16 and §7.2: tone, and never a Schulform', () => {
    expect(check({ praise: 'Na, was haben wir denn hier?' })).toThrow(/T16/);
    expect(check({ prompt: 'Rechne wie am Gymnasium.' })).toThrow(/gymnasium/);
    expect(check({ praise: 'Das ist leider so.' })).toThrow(/leider/);
  });
  it('hints do not state an answer of 10 or more, unless the task shows that number', () => {
    expect(check({ hints: ['Das Ergebnis ist 42.'] })).toThrow(/reveals answer 42/);
    expect(check({ hints: ['Die Zahl 142 hilft nicht.'] })).not.toThrow();
    expect(revealedAnswers(ex({ expression: '42 − 0 = □', hints: ['Von 42 bleibt alles.'] }))).toEqual([]);
    expect(revealedAnswers(ex({ answer: { kind: 'number', value: 7 }, hints: ['Es sind 7.'] }))).toEqual([]);
    expect(revealedAnswers(ex({ answer: { kind: 'choice', options: [{ label: '42' }, { label: '24', whyWrong: 'Schau auf die Zehner.' }], correct: 0 }, hints: ['Es sind 42.'] }))).toHaveLength(1);
  });
  it('T10: number format, money with two decimals', () => {
    expect(check({ context: 'Mia zahlt 3,50 €.', prompt: 'Wie viel?' })).not.toThrow();
    expect(check({ context: 'Mia zahlt 3,5 €.', prompt: 'Wie viel?' })).toThrow(/T10/);
    expect(check({ context: 'Der Stift ist 3,5 cm lang.', prompt: 'Wie viel?' })).not.toThrow();
    expect(check({ context: 'Es sind 12500 Menschen.', prompt: 'Wie viele?' })).toThrow(/T10/);
  });
  it('keys: minus and comma are active for the whole skill, never per item (§7.1)', () => {
    expect(check({ answer: { kind: 'number', value: 42, signed: true } })).toThrow(/signed/);
    expect(check({ answer: { kind: 'number', value: 42, decimals: 1 } })).toThrow(/decimals/);
    const minus = { ...skill, keys: { minus: true as const } };
    expect(() => assertWellFormedExercise(minus, 1, ex({ answer: { kind: 'number', value: 42 } }))).toThrow(/signed/);
    expect(() => assertWellFormedExercise(minus, 1, ex({ answer: { kind: 'number', value: 42, signed: true } }))).not.toThrow();
  });
});

describe('the Stufe test', () => {
  const generate = (same: boolean): SkillDef => ({
    ...skill,
    generate: (rng, stufe, ctx) => {
      const n = rng.int(1, 1000);
      return ex({ key: `brueche.von-groessen:${stufe}:${same ? n : stufe * 10000 + n}`, stufe, ab: ctx.ab ?? 1 });
    },
  });
  it('compares the key without the skill and Stufe parts', () => {
    expect(bareKey({ key: 'brueche.von-groessen:3:1:7', skillId: 'brueche.von-groessen', stufe: 3 })).toBe('1:7');
  });
  it('a skill whose Stufe changes nothing fails, one with its own content passes', () => {
    expect(stufeDifference(generate(true), 1)).toBeLessThan(STUFE_TEST_MIN_DIFFERENT);
    expect(stufeDifference(generate(false), 1)).toBeGreaterThanOrEqual(STUFE_TEST_MIN_DIFFERENT);
  });
  it('seeds stay independent of the AB', () => {
    expect(generate(false).generate(createRng(1), 3, { subtractionMethod: 'abziehen', ab: 2 }).ab).toBe(2);
  });
});

describe('answer limits', () => {
  it('choice: up to 8 options', () => {
    const choice = (n: number) => ({ kind: 'choice', options: option(n), correct: 0 }) as const;
    expect(() => assertAnswerLimits(choice(8), 1)).not.toThrow();
    expect(() => assertAnswerLimits(choice(9), 3)).toThrow();
  });
  it('order: 6 items, multi: 4 fields, "Nicht lösbar" on Stufe 3', () => {
    const order = (n: number) => ({ kind: 'order', items: Array.from({ length: n }, (_, i) => String(i)), correct: Array.from({ length: n }, (_, i) => i), direction: 'aufsteigend' }) as const;
    expect(() => assertAnswerLimits(order(6), 1)).not.toThrow();
    expect(() => assertAnswerLimits(order(7), 1)).toThrow();
    const field = (id: string) => ({ id, value: 1 });
    expect(() => assertAnswerLimits({ kind: 'multi', fields: ['a', 'b', 'c', 'd'].map(field) }, 3)).not.toThrow();
    expect(() => assertAnswerLimits({ kind: 'multi', fields: ['a', 'b', 'c', 'd', 'e'].map(field) }, 3)).toThrow();
    expect(() => assertAnswerLimits({ kind: 'number', value: null, offerUnsolvable: true }, 2)).toThrow();
    expect(() => assertAnswerLimits({ kind: 'number', value: null, offerUnsolvable: true }, 3)).not.toThrow();
  });
  it('point: up to 3 points, up to 12 steps a side', () => {
    const point = { kind: 'point', xMin: -6, xMax: 6, yMin: -6, yMax: 6, step: 1, target: [1, 1], tolerance: 0 } as const;
    expect(() => assertAnswerLimits(point, 3)).not.toThrow();
    expect(() => assertAnswerLimits({ ...point, xMax: 7 }, 3)).toThrow();
    expect(() => assertAnswerLimits({ ...point, targets: [[1, 1], [2, 2], [3, 3], [4, 4]] }, 3)).toThrow();
  });
  it('written: 8 digits, factor and divisor up to 3', () => {
    const w = (op: 'add' | 'mul', operands: number[]) => ({ kind: 'written', op, operands, result: 0 }) as const;
    expect(() => assertAnswerLimits(w('add', [99999999, 1]), 3)).not.toThrow();
    expect(() => assertAnswerLimits(w('add', [100000000, 1]), 3)).toThrow();
    expect(() => assertAnswerLimits(w('mul', [1234, 567]), 3)).not.toThrow();
    expect(() => assertAnswerLimits(w('mul', [1234, 5678]), 3)).toThrow();
  });

});

describe('assertWellFormedVisual: Klasse 6', () => {
  const ok: Visual[] = [

    { type: 'numberLine', min: 30, max: 50, majorStep: 5, minorStep: 1, labelMajor: true, jumps: [{ from: 35, to: 40 }] },
    { type: 'ruler', maxCm: 15, startMm: 30, lengthMm: 65 },
    { type: 'numberLine', min: 0, max: 1000, majorStep: 100, minorStep: 100, labelMajor: true },
    { type: 'placeValue', columns: ['Z', 'E'], rows: [{ values: [2, 14] }] },
    { type: 'shape', shape: 'quadrat', rotate: 45 },
    { type: 'numberLine', min: -10, max: 10, majorStep: 5, minorStep: 1, labelMajor: true, arrows: 'both', jumps: [{ from: -3, to: 5, label: '+ 8' }] },
    { type: 'placeValue', columns: ['Z', 'E', 'z', 'h'], rows: [{ values: [1, 14, 3, null] }], highlight: 'E' },
    { type: 'coordinateGrid', xMin: -8, xMax: 8, yMin: -8, yMax: 8, step: 1, labelStep: 2, points: [{ x: -2, y: 3, label: 'A' }], axisNames: 'rechtsHoch' },
    { type: 'angle', degrees: 300, baseRotation: 20, arm1: 0.4, arm2: 1, showArc: true, tool: 'geodreieck' },
    { type: 'fractionModel', form: 'circle', parts: 8, filled: 3, wholes: 2 },
    { type: 'quader', a: 3, b: 3, c: 3, kind: 'wuerfel', showLabels: true, hiddenEdges: 'dashed', highlightFace: 'top' },
    { type: 'term', lines: ['3 + 4 · 5', '3 + 20', '23'], highlight: [4, 9] },
    { type: 'lines', lines: [{ angle: 0, offset: 0 }, { angle: 90, offset: 0 }], rightAngleMarks: [[0, 1]] },
    { type: 'thermometer', min: -10, max: 10, step: 1, value: -3, unit: '°C', change: 8 },
    { type: 'barChart', title: 'T', categories: ['a', 'b'], values: [2, 4], axisMax: 5, axisStep: 1, meanLine: 3, levelled: true },
    { type: 'net', cells: [[0, 0], [1, 0], [2, 0], [3, 0], [1, 1], [1, 2]], groups: [0, 1, 2, 3, 4, 5] },
  ];
  it.each(ok.map((v) => [v.type, v] as const))('%s: accepts a fitting one', (_n, v) => {
    expect(() => assertWellFormedVisual(v)).not.toThrow();
  });
  const bad: [string, Visual][] = [




    ['number line above its range', { type: 'numberLine', min: 0, max: 2e13, majorStep: 1e12, minorStep: 1e12, labelMajor: true }],
    ['thermometer value', { type: 'thermometer', min: -10, max: 10, step: 1, value: 12, unit: '°C' }],
    ['thermometer change', { type: 'thermometer', min: -10, max: 10, step: 1, value: 5, unit: '°C', change: 8 }],
    ['angle above 360°', { type: 'angle', degrees: 400, baseRotation: 0, arm1: 1, arm2: 1, showArc: true }],
    ['grid point outside', { type: 'coordinateGrid', xMin: 0, xMax: 8, yMin: 0, yMax: 8, step: 1, labelStep: 1, points: [{ x: 9, y: 1 }] }],
    ['fraction filled', { type: 'fractionModel', form: 'bar', parts: 4, filled: 5 }],
    ['fraction refine', { type: 'fractionModel', form: 'bar', parts: 4, filled: 1, refineTo: 6 }],
    ['fraction unequal circle', { type: 'fractionModel', form: 'circle', parts: 4, filled: 1, unequal: true }],
    ['Würfel edges', { type: 'quader', a: 2, b: 3, c: 4, kind: 'wuerfel', showLabels: true, hiddenEdges: 'dashed' }],
    ['term highlight', { type: 'term', lines: ['3 + 4'], highlight: [2, 20] }],
    ['mean above the axis', { type: 'barChart', title: 'T', categories: ['a'], values: [2], axisMax: 5, axisStep: 1, meanLine: 7 }],
    ['levelled without mean', { type: 'barChart', title: 'T', categories: ['a'], values: [2], axisMax: 5, axisStep: 1, levelled: true }],
    ['net of 5', { type: 'net', cells: [[0, 0], [1, 0], [2, 0], [3, 0], [1, 1]] }],
    ['jump outside', { type: 'numberLine', min: 0, max: 10, majorStep: 1, minorStep: 1, labelMajor: true, jumps: [{ from: 5, to: 12 }] }],
    ['ruler object', { type: 'ruler', maxCm: 10, startMm: 80, lengthMm: 50 }],
  ];
  it.each(bad)('%s: rejects it', (_n, v) => {
    expect(() => assertWellFormedVisual(v)).toThrow();
  });
});

describe('the keys of a fraction follow the skill (§7.1)', () => {
  const fraction = (extra: object = {}) => ({ kind: 'fraction', numerator: 3, denominator: 4, accept: 'equivalent', ...extra }) as const;
  const task = (answer: Exercise['answer'], keys?: SkillDef['keys']) => () => assertWellFormedExercise({ ...skill, keys }, 1, ex({ answer, hints: ['Teile zuerst.'] }));
  it('allowNegative needs keys.minus and keys.minus needs allowNegative', () => {
    expect(task(fraction({ allowNegative: true }))).toThrow(/allowNegative/);
    expect(task(fraction(), { minus: true })).toThrow(/allowNegative/);
    expect(task(fraction({ allowNegative: true }), { minus: true })).not.toThrow();
    expect(task(fraction({ negative: true }))).toThrow(/allowNegative/);
  });
  it('allowMixed needs keys.mixed and keys.mixed needs allowMixed', () => {
    expect(task(fraction({ allowMixed: true }))).toThrow(/allowMixed/);
    expect(task(fraction(), { mixed: true })).toThrow(/allowMixed/);
    expect(task(fraction({ allowMixed: true }), { mixed: true })).not.toThrow();
  });
});

describe('written with decimals', () => {
  const answer = (patch: object): Exercise['answer'] => ({ kind: 'written', op: 'add', operands: [35, 125], decimalPlaces: [1, 2], result: 475, ...patch });
  const task = (a: Exercise['answer'], keys?: SkillDef['keys']) => () => assertWellFormedExercise({ ...skill, keys }, 1, ex({ answer: a, hints: ['Schreibe Komma unter Komma.'] }));
  it('checks the result in units of the places', () => {
    expect(task(answer({}))).not.toThrow();
    expect(task(answer({ result: 47 }))).toThrow(/the result/);
  });
  it('one place count per operand, a division that ends, and the comma key for a mul', () => {
    expect(task(answer({ decimalPlaces: [1] }))).toThrow(/place count/);
    expect(task(answer({ op: 'div', operands: [7, 2], decimalPlaces: [1, 0], result: 3 }))).toThrow(/ends/);
    expect(task(answer({ op: 'mul', operands: [4, 3], decimalPlaces: [1, 1], result: 12 }))).toThrow(/keys\.comma/);
    expect(task(answer({ op: 'mul', operands: [4, 3], decimalPlaces: [1, 1], result: 12 }), { comma: true })).not.toThrow();
  });
});

describe('T13 and T12 run on generator output', () => {
  it('flags Zahlenstrahl on a negative line, and a percent term outside its skills', () => {
    const line = (min: number) => ({ type: 'numberLine', min, max: 5, majorStep: 1, minorStep: 1, labelMajor: true }) as const;
    expect(() => assertWellFormedExercise(skill, 1, ex({ prompt: 'Lies am Zahlenstrahl ab.', visual: line(-5), hints: ['Zähle die Striche.'] }))).toThrow(/T13/);
    expect(() => assertWellFormedExercise(skill, 1, ex({ prompt: 'Lies am Zahlenstrahl ab.', visual: line(0), hints: ['Zähle die Striche.'] }))).not.toThrow();
    expect(() => assertWellFormedExercise(skill, 1, ex({ prompt: 'Wie groß ist der Grundwert?', hints: ['Zähle die Striche.'] }))).toThrow(/T12/);
  });
});

describe('the Klasse-6 visuals are checked', () => {
  it('a thermometer stays a vertical line; bag, dice and spinner hold their limits', () => {
    expect(() => assertWellFormedVisual({ type: 'dice', values: [7] })).toThrow(/die shows/);
    expect(() => assertWellFormedVisual({ type: 'spinner', sectors: ['rot'] })).toThrow(/sectors/);
    expect(() => assertWellFormedVisual({ type: 'bag', balls: [{ color: 'rot', count: 21 }] })).toThrow(/Kugeln/);
  });
});
