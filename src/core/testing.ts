/**
 * Shared invariant suite for exercise generators. Only imported by *.test.ts files.
 *
 * Usage in a topic test:
 *   import { describeSkill } from '../../core/testing';
 *   describeSkill(zerlegenSkill, { minDistinct: 30 });
 */
import { describe, expect, it } from 'vitest';
import { MAX_CHOICE_OPTIONS, MAX_COORDINATE, MAX_DECIMALS, MAX_MULTI_FIELDS, MAX_NUMBER, MAX_ORDER_ITEMS, MAX_POINTS, MAX_WRITTEN_DIGITS, MAX_WRITTEN_FACTOR_DIGITS } from './age';
import { checkAnswer, correctResponse, pointTargets, responseForBug, sameFractionValue } from './check';
import { fmt, fmtPoint, frac } from './format';
import { createRng } from './rng';
import { clauseProblems, hintProblems, longWordProblems, methodWordProblems, numberFormatProblems, passiveProblems, percentTermProblems, praiseAndStepProblems, pronounProblems, questionProblems, restProblems, taskTextProblems, termProblems, toneProblems } from './textRules';
import { correctDecimalResult, shiftedDivision, writtenPlaces } from './written';
import { isKmkTag } from '../data/curriculum';
import type { Ab, Answer, Exercise, GenContext, SkillDef, Step, Stufe, Visual } from './types';
import { STUFEN } from './types';

import { wordCount } from './textRules';

export { wordCount, sentences } from './textRules';

/** Phrases that must never appear (docs/research.md §6.4 and M15). Matched case-insensitively as whole words. */
export const BANNED_PHRASES = [
  'falsch', 'leider', 'konzentrier', 'schlau', 'genie', 'naturtalent', 'perfekt', 'unglaublich', 'fantastisch',
  'weltklasse', 'zu langsam', 'so schnell', 'schneller', 'schon wieder', 'war doch einfach', 'alle anderen',
  // §7.2, §7.1: no hero or pro titles, no 'Super!'
  'super', 'profi', 'held', 'mathe-held', 'kinder', 'kids',
  // §7.2, Klasse 6: never a Schulform as a label, level, target or comparison
  'gymnasium', 'gymnasiast', 'gymnasiasten', 'gymnasial', 'realschule', 'hauptschule', 'hauptschul-niveau', 'mittelschule', 'gesamtschule', 'schulform',
];

/**
 * Extra traps of improvement praise (docs/research.md M15 "Verbesserung", M16): pressure, inflation, comparison
 * with others and error framing. Checked on every improvement text (round notes, progress view, badges).
 */
export const IMPROVEMENT_BANNED_PHRASES = [
  ...BANNED_PHRASES,
  'endlich', 'na also', 'besser als', 'andere kinder', 'viel besser', 'keine fehler', 'nie wieder', 'fehlerfrei',
];

/** Whole number `shown` in `text`, not as a part of a longer number. */
function mentions(text: string, shown: string): boolean {
  return new RegExp(`(?<!\\d)${shown}(?!\\d)`).test(text);
}

const CONTEXTS: GenContext[] = [
  { subtractionMethod: 'abziehen' },
  { subtractionMethod: 'ergaenzen' },
];

function allStrings(value: unknown, out: string[] = []): string[] {
  if (typeof value === 'string') out.push(value);
  else if (Array.isArray(value)) value.forEach((v) => allStrings(v, out));
  else if (value && typeof value === 'object') Object.values(value).forEach((v) => allStrings(v, out));
  return out;
}

function allNumbers(value: unknown, out: number[] = []): number[] {
  if (typeof value === 'number') out.push(value);
  else if (Array.isArray(value)) value.forEach((v) => allNumbers(v, out));
  else if (value && typeof value === 'object') Object.values(value).forEach((v) => allNumbers(v, out));
  return out;
}

/** Answer limits for this age (docs/research.md §7.1, §6). */
export function assertAnswerLimits(answer: Answer, stufe: Stufe): void {
  switch (answer.kind) {
    case 'number':
      if (answer.offerUnsolvable) expect(stufe, '"Nicht lösbar" only on Stufe 3').toBe(3);
      expect(answer.decimals ?? 0, `at most ${MAX_DECIMALS} decimal places`).toBeLessThanOrEqual(MAX_DECIMALS);
      break;
    case 'written':
      expect(answer.operands.length, 'written: at most 4 numbers').toBeLessThanOrEqual(4);
      answer.operands.forEach((o) => expect(String(o).length, `written: operands up to ${MAX_WRITTEN_DIGITS} digits`).toBeLessThanOrEqual(MAX_WRITTEN_DIGITS));
      (answer.decimalPlaces ?? []).forEach((p) => expect(p, `written: at most ${MAX_DECIMALS} places after the comma`).toBeLessThanOrEqual(MAX_DECIMALS));
      if (answer.op === 'mul' || answer.op === 'div') expect(String(answer.operands[1]).length, `written: factor and divisor up to ${MAX_WRITTEN_FACTOR_DIGITS} digits`).toBeLessThanOrEqual(MAX_WRITTEN_FACTOR_DIGITS);
      break;
    case 'choice':
      expect(answer.options.length, `at most ${MAX_CHOICE_OPTIONS} options`).toBeLessThanOrEqual(MAX_CHOICE_OPTIONS);
      break;
    case 'order':
      expect(answer.items.length, `order: at most ${MAX_ORDER_ITEMS} items`).toBeLessThanOrEqual(MAX_ORDER_ITEMS);
      break;
    case 'multi':
      expect(answer.fields.length, `multi: at most ${MAX_MULTI_FIELDS} fields`).toBeLessThanOrEqual(MAX_MULTI_FIELDS);
      answer.fields.forEach((f) => expect(f.decimals ?? 0, `at most ${MAX_DECIMALS} decimal places`).toBeLessThanOrEqual(MAX_DECIMALS));
      break;
    case 'numberline':
      expect(Math.max(Math.abs(answer.min), Math.abs(answer.max)), 'number line above its range').toBeLessThanOrEqual(MAX_NUMBER);
      break;
    case 'cells':
      // 6 columns of 49 px fit a 360 px phone (src/ui/answers/CellsInput.css)
      expect(answer.width, 'cells: at most 6 columns').toBeLessThanOrEqual(6);
      expect(answer.height, 'cells: at most 6 rows').toBeLessThanOrEqual(6);
      break;
    case 'point':
      // At least 32 px between grid points (§7.1): a grid wider than a phone scrolls sideways in its box, so it stays at a size a hand can read.
      expect((answer.xMax - answer.xMin) / answer.step, 'point: at most 12 steps wide').toBeLessThanOrEqual(MAX_COORDINATE);
      expect((answer.yMax - answer.yMin) / answer.step, 'point: at most 12 steps high').toBeLessThanOrEqual(MAX_COORDINATE);
      expect(pointTargets(answer).length, `point: at most ${MAX_POINTS} points`).toBeLessThanOrEqual(MAX_POINTS);
      break;
    default:
      break;
  }
}

/** A value has no more decimal places than the item allows. */
function fitsDecimals(value: number, decimals = 0): boolean {
  const scaled = value * 10 ** decimals;
  return Math.abs(scaled - Math.round(scaled)) < 1e-9;
}

export function assertWellFormedAnswer(answer: Answer): void {
  switch (answer.kind) {
    case 'number':
      if (answer.value === null) expect(answer.offerUnsolvable, 'value null requires offerUnsolvable').toBe(true);
      else expect(Number.isFinite(answer.value)).toBe(true);
      if (answer.value !== null) expect(fitsDecimals(answer.value, answer.decimals), `${answer.value} with ${answer.decimals ?? 0} decimal places`).toBe(true);
      break;
    case 'choice': {
      expect(answer.options.length).toBeGreaterThanOrEqual(2);
      expect(answer.options.length).toBeLessThanOrEqual(MAX_CHOICE_OPTIONS);
      expect(answer.correct).toBeGreaterThanOrEqual(0);
      expect(answer.correct).toBeLessThan(answer.options.length);
      const labels = answer.options.map((o) => o.label + JSON.stringify(o.visual ?? null));
      expect(new Set(labels).size, `duplicate choice options: ${labels.join(' | ')}`).toBe(labels.length);
      expect(answer.options[answer.correct].whyWrong, 'correct option must not have whyWrong').toBeUndefined();
      break;
    }
    case 'multi': {
      expect(answer.fields.length).toBeGreaterThanOrEqual(1);
      expect(new Set(answer.fields.map((f) => f.id)).size).toBe(answer.fields.length);
      for (const f of answer.fields) {
        expect(Number.isFinite(f.value)).toBe(true);
        expect(fitsDecimals(f.value, f.decimals), `${f.value} with ${f.decimals ?? 0} decimal places`).toBe(true);
      }
      break;
    }
    case 'written': {
      const ops = answer.operands;
      ops.forEach((o) => expect(Number.isInteger(o) && o >= 0, `operand ${o}`).toBe(true));
      if (answer.decimalPlaces) {
        expect(answer.decimalPlaces.length, 'written: one place count per operand').toBe(ops.length);
        answer.decimalPlaces.forEach((p) => expect(Number.isInteger(p) && p >= 0, `places ${p}`).toBe(true));
        expect(Number.isInteger(answer.result), 'written: result as an integer plus places').toBe(true);
      }
      expect(answer.result, 'written: the result').toBe(correctDecimalResult(answer.op, ops, answer.decimalPlaces));
      if (answer.op === 'add') expect(ops.length).toBeGreaterThanOrEqual(2);
      else expect(ops.length).toBe(2);
      if (answer.op === 'sub') expect(answer.result).toBeGreaterThanOrEqual(0);
      if (answer.op === 'div') {
        expect(ops[1], 'written: a divisor above 0').toBeGreaterThan(0);
        const { dividend, divisor } = shiftedDivision(ops, answer.decimalPlaces);
        if (answer.decimalPlaces) expect(dividend % divisor, 'written: a decimal division ends').toBe(0);
        expect(answer.remainder ?? 0).toBe(dividend % divisor);
      }
      if (answer.op !== 'div') expect(answer.remainder, 'a Rest only in a division').toBeUndefined();
      break;
    }
    case 'cells': {
      const inside = (c: readonly [number, number]) => c[0] >= 0 && c[1] >= 0 && c[0] < answer.width && c[1] < answer.height;
      answer.given.forEach((c) => expect(inside(c)).toBe(true));
      answer.solution.forEach((c) => expect(inside(c)).toBe(true));
      expect(answer.solution.length).toBeGreaterThan(0);
      const given = new Set(answer.given.map((c) => c.join()));
      answer.solution.forEach((c) => expect(given.has(c.join()), 'solution overlaps given').toBe(false));
      break;
    }
    case 'fraction': {
      expect(inRange(answer.numerator, 0, 10_000), `Zähler ${answer.numerator}`).toBe(true);
      expect(inRange(answer.denominator, 1, 10_000), `Nenner ${answer.denominator}`).toBe(true);
      if (answer.whole !== undefined) expect(inRange(answer.whole, 0, 10_000), `whole ${answer.whole}`).toBe(true);
      if (answer.accept === 'lowest' && answer.numerator !== 0) {
        const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
        expect(gcd(answer.numerator, answer.denominator), `${answer.numerator}/${answer.denominator} is not in lowest terms`).toBe(1);
      }
      if (answer.negative) expect(answer.allowNegative, 'a negative fraction needs allowNegative').toBe(true);
      break;
    }
    case 'point': {
      expect(answer.xMax).toBeGreaterThan(answer.xMin);
      expect(answer.yMax).toBeGreaterThan(answer.yMin);
      expect(answer.step).toBeGreaterThan(0);
      expect(answer.tolerance, 'point: correct only if exact').toBe(0);
      if (answer.targets) {
        expect(answer.targets.length, 'targets: two or three points').toBeGreaterThanOrEqual(2);
        expect(answer.targets[0], 'target is the first of targets').toEqual(answer.target);
        expect(new Set(answer.targets.map((t) => t.join())).size, 'targets differ').toBe(answer.targets.length);
      }
      for (const [x, y] of pointTargets(answer)) {
        for (const [v, min, max] of [[x, answer.xMin, answer.xMax], [y, answer.yMin, answer.yMax]]) {
          expect(v, 'target inside the grid').toBeGreaterThanOrEqual(min);
          expect(v, 'target inside the grid').toBeLessThanOrEqual(max);
          expect(Math.abs((v - min) / answer.step - Math.round((v - min) / answer.step)), 'target on a grid point').toBeLessThan(1e-9);
        }
      }
      break;
    }
    case 'numberline':
      expect(answer.value).toBeGreaterThanOrEqual(answer.min);
      expect(answer.value).toBeLessThanOrEqual(answer.max);
      expect(answer.step).toBeGreaterThan(0);
      expect(answer.max).toBeGreaterThan(answer.min);
      expect(Math.abs(((answer.value - answer.min) / answer.step) - Math.round((answer.value - answer.min) / answer.step))).toBeLessThan(1e-9);
      if (answer.denominator !== undefined) for (const n of [answer.min, answer.max, answer.value, answer.step, answer.minorStep, answer.majorStep]) expect(Number.isInteger(n), `numberline with denominator: ${n} is not an integer position`).toBe(true);
      break;
    case 'order': {
      expect(answer.items.length).toBeGreaterThanOrEqual(2);
      expect([...answer.correct].sort((a, b) => a - b)).toEqual(answer.items.map((_, i) => i));
      break;
    }
  }
}

const inRange = (n: number, min: number, max: number) => Number.isInteger(n) && n >= min && n <= max;

/** A visual is complete and fits Klasse 6. */
export function assertWellFormedVisual(v: Visual): void {
  switch (v.type) {
    case 'placeValue':
      v.rows.forEach((r) => {
        expect(r.values.length).toBe(v.columns.length);
        // 14 ZT is a bundling task, so a cell may hold more than one digit.
        r.values.forEach((x) => expect(x === null || inRange(x, 0, 99), `place value cell ${x}`).toBe(true));
      });
      break;
    case 'numberLine':
      expect(v.max).toBeGreaterThan(v.min);
      expect(Math.max(Math.abs(v.min), Math.abs(v.max)), 'number line above its range').toBeLessThanOrEqual(MAX_NUMBER);
      expect(v.minorStep).toBeGreaterThan(0);
      expect((v.max - v.min) / v.minorStep, 'too many ticks').toBeLessThanOrEqual(40);
      (v.marks ?? []).forEach((m) => {
        expect(m.value).toBeGreaterThanOrEqual(v.min);
        expect(m.value).toBeLessThanOrEqual(v.max);
      });
      if (v.denominator !== undefined) for (const n of [v.min, v.max, v.minorStep, v.majorStep]) expect(Number.isInteger(n), `numberLine with denominator: ${n} is not an integer position`).toBe(true);
      (v.jumps ?? []).forEach((j) => {
        expect(j.from >= v.min && j.from <= v.max, `jump from ${j.from}`).toBe(true);
        expect(j.to >= v.min && j.to <= v.max, `jump to ${j.to}`).toBe(true);
        expect(j.from, 'a jump goes somewhere').not.toBe(j.to);
      });
      break;
    case 'barChart':
      expect(v.values.length).toBe(v.categories.length);
      v.values.forEach((x) => expect(Number.isFinite(x) && x >= 0 && x <= MAX_NUMBER, `data value ${x}`).toBe(true));
      expect(v.axisStart ?? 0, 'the axis starts below its end').toBeLessThan(v.axisMax);
      if (v.meanLine !== undefined) expect(v.meanLine >= (v.axisStart ?? 0) && v.meanLine <= v.axisMax, `mean line ${v.meanLine}`).toBe(true);
      if (v.levelled) expect(v.meanLine, 'a levelled chart needs meanLine').toBeDefined();
      break;
    case 'tally':
      v.rows.forEach((r) => expect(inRange(r.count, 0, 25), `tally count ${r.count}`).toBe(true));
      break;
    case 'table':
      v.rows.forEach((r) => expect(r.length, 'table row length').toBe(v.header.length));
      expect(v.header.length, 'at most 6 columns fit a phone').toBeLessThanOrEqual(6);
      (v.arrows ?? []).forEach((a) => {
        expect(a.from >= 0 && a.from < v.rows.length && a.to >= 0 && a.to < v.rows.length, `arrow from row ${a.from} to ${a.to}`).toBe(true);
        expect(a.from, 'an arrow goes somewhere').not.toBe(a.to);
      });
      break;
    case 'grid':
      v.cells.forEach((c) => {
        expect(c[0]).toBeLessThan(v.width);
        expect(c[1]).toBeLessThan(v.height);
      });
      break;
    case 'ruler':
      expect(inRange(v.maxCm, 1, 20), `ruler to ${v.maxCm} cm`).toBe(true);
      expect(inRange(v.startMm, 0, v.maxCm * 10), `object starts at ${v.startMm} mm`).toBe(true);
      expect(inRange(v.startMm + v.lengthMm, 0, v.maxCm * 10), `object ends at ${v.startMm + v.lengthMm} mm`).toBe(true);
      expect(v.lengthMm, 'an object has a length').toBeGreaterThan(0);
      break;
    case 'written':
      expect(v.operands.length).toBeGreaterThanOrEqual(2);
      expect(v.operands.length, 'written: at most 4 numbers').toBeLessThanOrEqual(4);
      v.operands.forEach((o) => expect(Number.isInteger(o) && o >= 0 && String(o).length <= MAX_WRITTEN_DIGITS, `written operand ${o}`).toBe(true));
      if (v.decimalPlaces) expect(v.decimalPlaces.length, 'one place count per operand').toBe(v.operands.length);
      if (v.op === 'sub') expect(correctDecimalResult('sub', v.operands, v.decimalPlaces)).toBeGreaterThanOrEqual(0);
      if (v.op === 'mul' || v.op === 'div') expect(String(v.operands[1]).length, 'written: factor and divisor up to 3 digits').toBeLessThanOrEqual(MAX_WRITTEN_FACTOR_DIGITS);
      if (v.op === 'div') expect(v.operands[1]).toBeGreaterThan(0);
      break;
    case 'net':
      if ('rects' in v) {
        expect(v.rects.length, 'a Quader net has 6 faces').toBe(6);
        v.rects.forEach((r) => expect(r.w > 0 && r.h > 0, 'a face has a size').toBe(true));
        break;
      }
      expect(v.cells.length, 'a net has at least 6 squares, a Quader net at most 40').toBeGreaterThanOrEqual(6);
      expect(v.cells.length).toBeLessThanOrEqual(40);
      if (v.faces) expect(v.faces.length).toBe(v.cells.length);
      if (v.groups) {
        expect(v.groups.length, 'one group per cell').toBe(v.cells.length);
        expect(new Set(v.groups).size, 'a Quader has 6 faces').toBe(6);
      } else expect(v.cells.length, 'without groups every cell is one of the 6 faces').toBe(6);
      break;
    case 'container':
      expect(v.fillMl).toBeGreaterThanOrEqual(0);
      expect(v.fillMl).toBeLessThanOrEqual(v.capacityMl);
      expect(v.stepMl).toBeGreaterThan(0);
      break;
    case 'coordinateGrid': {
      expect(v.xMax).toBeGreaterThan(v.xMin);
      expect(v.yMax).toBeGreaterThan(v.yMin);
      expect(v.step).toBeGreaterThan(0);
      expect(v.labelStep).toBeGreaterThanOrEqual(v.step);
      const inside = (p: { x: number; y: number }) => p.x >= v.xMin && p.x <= v.xMax && p.y >= v.yMin && p.y <= v.yMax;
      v.points.forEach((p) => expect(inside(p), `point (${p.x}|${p.y}) outside the grid`).toBe(true));
      (v.segments ?? []).forEach(([a, b]) => expect(inside(a) && inside(b), 'segment outside the grid').toBe(true));
      (v.polygon ?? []).forEach((p) => expect(inside(p), `polygon corner (${p.x}|${p.y}) outside the grid`).toBe(true));
      if (v.polygon) expect(v.polygon.length, 'a polygon has at least 3 corners').toBeGreaterThanOrEqual(3);
      break;
    }
    case 'angle':
      expect(v.degrees, 'an angle above 0').toBeGreaterThan(0);
      expect(v.degrees, 'an angle up to 360°').toBeLessThanOrEqual(360);
      expect(v.arm1 >= 0.3 && v.arm1 <= 1, `arm1 ${v.arm1}`).toBe(true);
      expect(v.arm2 >= 0.3 && v.arm2 <= 1, `arm2 ${v.arm2}`).toBe(true);
      if (v.toolOffset) expect(v.tool, 'toolOffset needs the tool').toBe('geodreieck');
      break;
    case 'fractionModel': {
      expect(inRange(v.parts, 1, 24), `parts ${v.parts}`).toBe(true);
      const wholes = v.wholes ?? 1;
      expect(inRange(wholes, 1, 4), `wholes ${wholes}`).toBe(true);
      expect(inRange(v.filled, 0, v.parts * wholes), `filled ${v.filled}`).toBe(true);
      if (v.refineTo !== undefined) expect(v.refineTo % v.parts, 'refineTo is a multiple of parts').toBe(0);
      if (v.unequal) expect(v.form, 'unequal parts: bar or rect').not.toBe('circle');
      if (v.compare) {
        expect(v.form, 'a second aligned bar needs form bar').toBe('bar');
        expect(wholes, 'a second aligned bar compares one whole').toBe(1);
        expect(inRange(v.compare.parts, 1, 24), `compare parts ${v.compare.parts}`).toBe(true);
        expect(inRange(v.compare.filled, 0, v.compare.parts), `compare filled ${v.compare.filled}`).toBe(true);
      }
      break;
    }
    case 'quader':
      for (const d of [v.a, v.b, v.c]) expect(d, 'a Quader edge above 0').toBeGreaterThan(0);
      if (v.kind === 'wuerfel') expect(v.a === v.b && v.b === v.c, 'a Würfel has equal edges').toBe(true);
      if (v.cutout) expect(v.cutout.a < v.a && v.cutout.b < v.b && v.cutout.c < v.c, 'a cutout fits inside the Quader').toBe(true);
      break;
    case 'term':
      expect(v.lines.length, 'a term has at least one line, and at most 5 steps').toBeGreaterThanOrEqual(1);
      expect(v.lines.length).toBeLessThanOrEqual(5);
      if (v.highlight) {
        expect(v.highlight[0]).toBeLessThan(v.highlight[1]);
        expect(v.highlight[1]).toBeLessThanOrEqual(v.lines[0].length);
      }
      break;
    case 'lines':
      expect(v.lines.length).toBeGreaterThanOrEqual(1);
      expect(v.lines.length, 'at most 6 lines').toBeLessThanOrEqual(6);
      (v.rightAngleMarks ?? []).forEach(([i, j]) => expect(i < v.lines.length && j < v.lines.length, 'mark on a line').toBe(true));
      (v.parallelMarks ?? []).forEach(([i, j]) => expect(i < v.lines.length && j < v.lines.length, 'mark on a line').toBe(true));
      if (v.geodreieck !== undefined) expect(v.geodreieck).toBeLessThan(v.lines.length);
      break;
    case 'thermometer':
      expect(v.max).toBeGreaterThan(v.min);
      expect(v.step).toBeGreaterThan(0);
      expect((v.max - v.min) / v.step, 'too many ticks').toBeLessThanOrEqual(40);
      expect(v.value >= v.min && v.value <= v.max, `value ${v.value}`).toBe(true);
      if (v.change !== undefined) expect(v.value + v.change >= v.min && v.value + v.change <= v.max, 'the change stays on the scale').toBe(true);
      break;
    case 'percentBar':
      expect(v.total, 'a Grundwert above 0').toBeGreaterThan(0);
      expect(inRange(v.ticks, 2, 20), `percent bar with ${v.ticks} parts`).toBe(true);
      if (v.percent !== undefined) expect(v.percent >= 0 && v.percent <= 100, `percent ${v.percent}`).toBe(true);
      break;
    case 'figure':
      expect(v.points.length, 'at most 8 corners').toBeLessThanOrEqual(8);
      if (!v.circle) expect(v.points.length, 'a figure has at least 3 corners').toBeGreaterThanOrEqual(3);
      if (v.sides) expect(v.sides.length, 'one label per side').toBe(v.points.length);
      if (v.height) expect(v.height.from).toBeLessThan(v.points.length);
      (v.rightAngles ?? []).forEach((i) => expect(i).toBeLessThan(v.points.length));
      (v.parallelMarks ?? []).forEach(([i, j]) => expect(i < v.points.length && j < v.points.length, 'mark on a side').toBe(true));
      (v.equalMarks ?? []).forEach((group) => group.forEach((i) => expect(i).toBeLessThan(v.points.length)));
      if (v.circle) expect(v.circle.r).toBeGreaterThan(0);
      break;
    case 'pieChart': {
      expect(v.slices.length, 'a pie chart has 2 to 6 slices').toBeGreaterThanOrEqual(2);
      expect(v.slices.length).toBeLessThanOrEqual(6);
      v.slices.forEach((x) => expect(x.value, `slice ${x.label}`).toBeGreaterThan(0));
      expect(new Set(v.slices.map((x) => x.pattern)).size, 'never colour alone: each slice has its own pattern').toBe(v.slices.length);
      if (v.showValues === 'percent') expect(v.slices.reduce((n, x) => n + x.value, 0), 'the slices sum to 100 %').toBe(100);
      break;
    }
    case 'bag':
      expect(v.balls.reduce((n, b) => n + b.count, 0), 'a bag holds 2 to 20 Kugeln').toBeLessThanOrEqual(20);
      expect(v.balls.reduce((n, b) => n + b.count, 0)).toBeGreaterThanOrEqual(2);
      break;
    case 'dice':
      v.values.forEach((d) => expect(inRange(d, 1, 6), `a die shows ${d}`).toBe(true));
      break;
    case 'spinner':
      expect(v.sectors.length, 'a spinner has 2 to 12 sectors').toBeGreaterThanOrEqual(2);
      expect(v.sectors.length).toBeLessThanOrEqual(12);
      break;
    default:
      break;
  }
}

function stepVisual(step: Step): Visual | undefined {
  return typeof step === 'string' ? undefined : step.visual;
}

/** All visuals of an exercise: the task, the options and the worked steps. */
function visualsOf(ex: Exercise): Visual[] {
  const out: Visual[] = [];
  if (ex.visual) out.push(ex.visual);
  if (ex.answer.kind === 'choice') ex.answer.options.forEach((o) => o.visual && out.push(o.visual));
  ex.steps.forEach((s) => {
    const v = stepVisual(s);
    if (v) out.push(v);
  });
  return out;
}

/** The strategy hints, bug hints and whyWrong texts of an exercise. */
function allHints(ex: Exercise): string[] {
  const whyWrong = ex.answer.kind === 'choice' ? ex.answer.options.flatMap((o) => (o.whyWrong ? [o.whyWrong] : [])) : [];
  return [...ex.hints, ...(ex.bugs ?? []).map((b) => b.hint), ...whyWrong];
}

/** The answers a hint must not state: numbers ≥ 10 (for a multi answer, its field values), fractions and points. */
function revealableAnswers(answer: Answer): (number | string)[] {
  switch (answer.kind) {
    case 'number':
      return answer.value === null ? [] : [answer.value];
    case 'numberline':
      return [answer.value];
    case 'written':
      return [answer.result / 10 ** writtenPlaces(answer)];
    case 'multi':
      return answer.fields.map((f) => f.value);
    case 'choice': {
      const label = answer.options[answer.correct].label.trim();
      return /^\d+$/.test(label) ? [Number(label)] : [];
    }
    case 'fraction':
      return [frac(answer.numerator, answer.denominator, answer.whole)];
    case 'point':
      return pointTargets(answer).map(([x, y]) => fmtPoint(answer.name ?? 'P', x, y));
    default:
      return [];
  }
}

/**
 * Hints never give the result away: a hint must not mention an answer ≥ 10 as a whole number, unless the task itself shows
 * this number (8 + □ = 15 can say 15; the answer is another number then). safeHints() in src/topics/shared.ts filters this way.
 */
export function revealedAnswers(ex: Exercise): string[] {
  const task = [ex.context, ex.prompt, ex.expression].filter(Boolean).join(' ');
  const out: string[] = [];
  for (const value of revealableAnswers(ex.answer)) {
    if (typeof value === 'string') {
      if (task.includes(value)) continue;
      for (const h of allHints(ex)) if (h.includes(value)) out.push(`hint reveals answer ${value}: "${h}"`);
      continue;
    }
    if (Math.abs(value) < 10) continue;
    // a comma answer can also be written with two decimals ('3,4' and '3,40')
    for (const shown of Number.isInteger(value) ? [fmt(value)] : [fmt(value), fmt(value, 2)]) {
      if (mentions(task, shown)) continue;
      for (const h of allHints(ex)) if (mentions(h, shown)) out.push(`hint reveals answer ${shown}: "${h}"`);
    }
  }
  return out;
}

/** The numbers of a text, with their groups: '1 250 000 und −3' → [1250000, 3]. */
function numbersOf(text: string): number[] {
  return [...text.matchAll(/\d(?:[\d\u202F\u2009])*/g)].map((m) => Number(m[0].replace(/[\u202F\u2009]/g, '')));
}

/** Numbers and results stay in the Klasse-6 range (MAX_NUMBER). A Rest task has its Probe line. */
function assertNumberRange(ex: Exercise): void {
  const a = ex.answer;
  const values = a.kind === 'number' && a.value !== null ? [a.value] : a.kind === 'multi' ? a.fields.map((f) => f.value) : [];
  values.forEach((v) => expect(Math.abs(v), `${ex.key}: answer above ${MAX_NUMBER}`).toBeLessThanOrEqual(MAX_NUMBER));
  for (const n of numbersOf(ex.expression ?? '')) expect(n, `${ex.key}: ${n} in the expression`).toBeLessThanOrEqual(MAX_NUMBER);
  if (a.kind === 'multi' && a.fields.some((f) => f.before?.trim() === 'Rest')) {
    expect(ex.steps.some((step) => /\d+ · \d+ \+ \d+ = \d+/.test((typeof step === 'string' ? step : step.text).replace(/[\u202F\u2009]/g, ''))), `${ex.key}: Rest needs a Probe line, 3 · 5 + 2 = 17`).toBe(true);
  }
}

/** The keys of a skill are the same for every item (§7.1): SkillDef.keys and the fields' signed and decimals agree in both directions. */
function assertKeysFitSkill(skill: SkillDef, ex: Exercise): void {
  const a = ex.answer;
  const fields = a.kind === 'number' ? [a] : a.kind === 'multi' ? a.fields : [];
  for (const f of fields) {
    expect(f.signed === true, `${ex.key}: ${skill.keys?.minus ? 'every item of a minus skill sets signed' : 'signed without keys.minus'}`).toBe(skill.keys?.minus === true);
    expect((f.decimals ?? 0) > 0, `${ex.key}: ${skill.keys?.comma ? 'every item of a comma skill sets decimals' : 'decimals without keys.comma'}`).toBe(skill.keys?.comma === true);
  }
  if (a.kind === 'fraction') {
    expect(a.allowNegative === true, `${ex.key}: ${skill.keys?.minus ? 'every fraction of a minus skill sets allowNegative' : 'allowNegative without keys.minus'}`).toBe(skill.keys?.minus === true);
    expect(a.allowMixed === true, `${ex.key}: ${skill.keys?.mixed ? 'every fraction of a mixed skill sets allowMixed' : 'allowMixed without keys.mixed'}`).toBe(skill.keys?.mixed === true);
  }
  if (a.kind === 'written' && a.op === 'mul' && (a.decimalPlaces ?? []).some((p) => p > 0)) expect(skill.keys?.comma, `${ex.key}: the comma in the result needs keys.comma`).toBe(true);
}

export function assertWellFormedExercise(skill: SkillDef, stufe: Stufe, ex: Exercise): void {
  expect(ex.skillId).toBe(skill.id);
  expect(ex.topicId).toBe(skill.topicId);
  expect(ex.stufe).toBe(stufe);
  expect([1, 2, 3]).toContain(ex.ab);
  expect(ex.key.length).toBeGreaterThan(0);
  expect(ex.key.startsWith(skill.id), `key must start with skill id: ${ex.key}`).toBe(true);
  expect(ex.prompt.trim().length).toBeGreaterThan(0);
  expect(ex.hints.length).toBeGreaterThanOrEqual(1);
  expect(ex.steps.length).toBeGreaterThanOrEqual(1);
  expect(ex.praise.trim().length).toBeGreaterThan(0);
  expect(ex.srText.trim().length).toBeGreaterThan(0);
  expect(ex.kmk.length).toBeGreaterThanOrEqual(1);
  ex.kmk.forEach((t) => expect(isKmkTag(t), `unknown KMK tag ${t}`).toBe(true));

  // Bug ids are internal (never shown to children), so they are exempt from the wording checks.
  const strings = allStrings({ ...ex, bugs: ex.bugs?.map(({ id: _id, ...shown }) => shown) });
  for (const s of strings) {
    expect(/\bundefined\b|\bNaN\b|\[object|\bInfinity\b/.test(s), `suspicious text: "${s}"`).toBe(false);
    const lower = s.toLowerCase();
    for (const banned of BANNED_PHRASES) {
      const re = new RegExp(`(^|[^a-zäöüß])${banned}([^a-zäöüß]|$)`);
      expect(re.test(lower), `banned phrase "${banned}" in "${s}"`).toBe(false);
    }
    expect(s.includes('×') || s.includes('÷'), `use · and : instead of × ÷ in "${s}"`).toBe(false);
  }
  allNumbers(ex).forEach((n) => expect(Number.isFinite(n), 'non-finite number in exercise').toBe(true));

  // Text rules (docs/research.md §4). Bug ids are not text; visuals hold labels, not sentences.
  const childTexts = [
    ...[ex.context, ex.prompt, ex.praise].filter((t): t is string => !!t),
    ...allHints(ex),
    ...ex.steps.map((step) => (typeof step === 'string' ? step : step.text)),
  ];
  const task = [ex.context, ex.prompt].filter(Boolean).join(' ');
  const answerTexts = ex.answer.kind === 'choice' ? ex.answer.options.map((o) => o.label ?? '') : ex.answer.kind === 'order' ? ex.answer.items : ex.answer.kind === 'multi' ? ex.answer.fields.flatMap((f) => [f.before ?? '', f.after ?? '']) : ex.answer.kind === 'number' || ex.answer.kind === 'fraction' ? [ex.answer.before ?? '', ex.answer.after ?? ''] : [];
  const lines = [ex.answer, ...visualsOf(ex)].flatMap((v) => (('kind' in v && v.kind === 'numberline') || ('type' in v && v.type === 'numberLine') ? [v as { min: number }] : []));
  const withNegatives = lines.length === 0 ? undefined : lines.some((l) => l.min < 0);
  const problems = [
    ...taskTextProblems(ex, stufe),
    ...questionProblems(ex),
    ...allHints(ex).flatMap(hintProblems),
    ...praiseAndStepProblems(ex),
    ...clauseProblems([...childTexts.filter((t) => t !== ex.prompt && t !== ex.context), task], stufe),
    ...passiveProblems(childTexts),
    ...termProblems(childTexts, withNegatives),
    ...percentTermProblems(skill.id, [...childTexts, ...answerTexts]),
    ...longWordProblems(childTexts),
    ...pronounProblems([...childTexts, task]),
    ...numberFormatProblems([...childTexts, ex.expression ?? '', ...answerTexts]),
    ...(ex.answer.kind === 'written' ? methodWordProblems(childTexts) : []),
    ...restProblems([...childTexts, ex.expression ?? '']),
    ...toneProblems([task, ex.praise, ...ex.hints, ...answerTexts]),
    ...revealedAnswers(ex),
  ];
  expect(problems.length, `text rules in ${ex.key}:\n${problems.join('\n')}`).toBe(0);

  assertWellFormedAnswer(ex.answer);
  assertAnswerLimits(ex.answer, stufe);
  assertNumberRange(ex);
  assertKeysFitSkill(skill, ex);
  visualsOf(ex).forEach((v) => assertWellFormedVisual(v));

  // The correct response is accepted.
  const ok = checkAnswer(ex.answer, correctResponse(ex.answer), ex.bugs);
  expect(ok.correct, `correct response rejected for ${ex.key}: ${JSON.stringify(ok)}`).toBe(true);

  // Bugs never coincide with the correct answer and always produce their hint.
  for (const bug of ex.bugs ?? []) {
    const r = responseForBug(ex.answer, bug);
    if (!r) continue;
    const res = checkAnswer(ex.answer, r, ex.bugs);
    if (ex.answer.kind === 'fraction' && ex.answer.accept !== 'exact') {
      const m = bug.match as Record<string, number>;
      expect(sameFractionValue({ n: (m.whole ?? 0) * m.denominator + m.numerator, d: m.denominator }, { n: (ex.answer.whole ?? 0) * ex.answer.denominator + ex.answer.numerator, d: ex.answer.denominator }), `bug ${bug.id} has the value of the answer in ${ex.key}`).toBe(false);
    }
    expect(res.correct, `bug ${bug.id} equals the correct answer in ${ex.key}`).toBe(false);
    expect(res.invalid, `bug ${bug.id} response is not parseable in ${ex.key}`).toBeUndefined();
    expect(res.bugHint, `bug ${bug.id} hint not returned`).toBeTruthy();
  }
}

export interface SkillSuiteOptions {
  /** Samples per Stufe and context (default 150). */
  samples?: number;
  /** Minimum number of distinct exercise keys per Stufe across samples (default 30). */
  minDistinct?: number | Partial<Record<Stufe, number>>;
}

/** Samples of the Stufe test: for each AB, the same seeds at Stufe 1 and at Stufe 3. */
const STUFE_TEST_SAMPLES = 40;
/** At least this share of those items must differ between Stufe 1 and Stufe 3. */
export const STUFE_TEST_MIN_DIFFERENT = 0.95;

/** The key without the skill and Stufe parts (src/topics/shared.ts build()). */
export function bareKey(ex: Pick<Exercise, 'key' | 'skillId' | 'stufe'>): string {
  const prefix = `${ex.skillId}:${ex.stufe}:`;
  return ex.key.startsWith(prefix) ? ex.key.slice(prefix.length) : ex.key;
}

/** Share of items that differ between Stufe 1 and Stufe 3 with the same seed and AB. */
export function stufeDifference(skill: SkillDef, ab: Ab, samples = STUFE_TEST_SAMPLES): number {
  const ctx = { ...CONTEXTS[0], ab };
  let different = 0;
  for (let seed = 1; seed <= samples; seed++) {
    const low = skill.generate(createRng(seed * 4099), 1, ctx);
    const high = skill.generate(createRng(seed * 4099), 3, ctx);
    if (bareKey(low) !== bareKey(high)) different++;
  }
  return different / samples;
}

/** Registers a vitest suite that checks every invariant above for one skill. */
export function describeSkill(skill: SkillDef, opts: SkillSuiteOptions = {}): void {
  const samples = opts.samples ?? 150;
  describe(`skill ${skill.id}`, () => {
    it('has complete metadata', () => {
      expect(skill.id.startsWith(skill.topicId + '.')).toBe(true);
      expect(skill.title.trim()).not.toBe('');
      expect(skill.description.trim()).not.toBe('');
      STUFEN.forEach((s) => expect(skill.stufen[s].trim()).not.toBe(''));
      expect(longWordProblems([skill.title, skill.description, ...STUFEN.map((s) => skill.stufen[s])])).toEqual([]);
      const stufenLines = STUFEN.map((s) => skill.stufen[s]);
      stufenLines.forEach((line) => expect(wordCount(line), `at most 12 words: "${line}"`).toBeLessThanOrEqual(12));
      expect([...clauseProblems(stufenLines), ...pronounProblems(stufenLines), ...toneProblems(stufenLines)]).toEqual([]);
      skill.kmk.forEach((t) => expect(isKmkTag(t), `unknown KMK tag ${t}`).toBe(true));
    });
    it('returns the planned AB level (GenContext.ab), and keeps every rule at each Stufe', () => {
      const AB_SAMPLES = Math.min(samples, 40);
      for (const stufe of STUFEN) {
        for (const ab of [1, 2, 3] as Ab[]) {
          for (let seed = 1; seed <= AB_SAMPLES; seed++) {
            const ex = skill.generate(createRng(seed * 6271 + stufe * 31 + ab), stufe, { ...CONTEXTS[1], ab });
            expect(ex.ab, `${skill.id} Stufe ${stufe}, planned AB ${ab}`).toBe(ab);
            assertWellFormedExercise(skill, stufe, ex);
          }
        }
      }
    });
    // No opt-out: a Stufe chooses the content, AB varies the demand inside it. If a skill cannot meet this, its catalogue row needs rethinking.
    it.each([1, 2, 3] as Ab[])('AB %i: Stufe 1 and Stufe 3 are different tasks', (ab) => {
      const share = stufeDifference(skill, ab);
      expect(share, `${skill.id}, AB ${ab}: only ${Math.round(share * 100)} % of the items differ between Stufe 1 and Stufe 3`).toBeGreaterThanOrEqual(STUFE_TEST_MIN_DIFFERENT);
    });
    for (const stufe of STUFEN) {
      it(`Stufe ${stufe}: ${samples} samples are well-formed, deterministic and varied`, () => {
        for (const ctx of CONTEXTS) {
          const keys = new Set<string>();
          for (let seed = 1; seed <= samples; seed++) {
            const ex = skill.generate(createRng(seed * 7919 + stufe), stufe, ctx);
            assertWellFormedExercise(skill, stufe, ex);
            keys.add(ex.key);
            if (seed <= 5) {
              const again = skill.generate(createRng(seed * 7919 + stufe), stufe, ctx);
              expect(JSON.stringify(again)).toBe(JSON.stringify(ex));
            }
          }
          const min = typeof opts.minDistinct === 'number' ? opts.minDistinct : (opts.minDistinct?.[stufe] ?? 30);
          expect(keys.size, `only ${keys.size} distinct exercises at Stufe ${stufe}`).toBeGreaterThanOrEqual(Math.min(min, samples));
        }
      });
    }
  });
}
