// @vitest-environment jsdom
// The visuals of Klasse 6 and the extensions of older ones (docs/research.md §6): drawing, accessible text, print.
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import type { Visual, VisualOf } from '../../core/types';
import { ANGLE, angleGeometry } from './AngleVisual';
import { barChartLabel } from './BarChartVisual';
import { gridGeometry } from './CoordinateGridVisual';
import { crossing, lineEnds } from './LinesVisual';
import { describeMarkPosition, numberLineAriaLabel, tickValues } from './NumberLineVisual';
import { lFormPoints } from './ShapeVisual';
import { quaderGeometry } from './QuaderVisual';
import { thermometerGeometry } from './ThermometerVisual';
import { unequalWidths } from './FractionModelVisual';
import VisualView from './Visual';

afterEach(cleanup);

const label = () => screen.getByRole('img').getAttribute('aria-label') ?? '';
const draw = (visual: Visual, print = false) => render(<VisualView visual={visual} print={print} />).container;

describe('every new visual renders on screen and in print, with an aria-label', () => {
  const all: Visual[] = [
    { type: 'coordinateGrid', xMin: 0, xMax: 8, yMin: 0, yMax: 8, step: 1, labelStep: 1, points: [{ x: 3, y: 2, label: 'P' }] },
    { type: 'angle', degrees: 40, baseRotation: 0, arm1: 1, arm2: 0.5, showArc: true },
    { type: 'fractionModel', form: 'bar', parts: 4, filled: 3 },
    { type: 'quader', a: 4, b: 3, c: 2, unit: 'cm', showLabels: true, hiddenEdges: 'dashed' },
    { type: 'term', lines: ['3 + 4 · 5', '3 + 20', '23'] },
    { type: 'lines', lines: [{ angle: 0, offset: 0 }] },
    { type: 'thermometer', min: -10, max: 10, step: 1, value: -5, unit: '°C' },
  ];
  it.each(all.map((v) => [v.type, v] as const))('%s', (_n, v) => {
    draw(v);
    expect(label().length).toBeGreaterThan(5);
    expect(label()).not.toMatch(/undefined|NaN/);
    cleanup();
    draw(v, true);
    expect(label().length).toBeGreaterThan(5);
  });
});

describe('coordinateGrid', () => {
  const G: VisualOf<'coordinateGrid'> = { type: 'coordinateGrid', xMin: 0, xMax: 8, yMin: 0, yMax: 8, step: 1, labelStep: 1, points: [{ x: 3, y: 2, label: 'P' }] };
  it('y increases upward, unlike grid; cells are about 40 px; value and position round trip', () => {
    const g = gridGeometry(G);
    expect(g.yOf(2)).toBeLessThan(g.yOf(1));
    expect(g.xOf(1) - g.xOf(0)).toBe(40);
    expect(g.valueAt(g.xOf(3), g.yOf(2))).toEqual({ x: 3, y: 2 });
  });
  it('arrowed axes, origin labelled 0, no extra zero label', () => {
    const c = draw(G);
    expect(c.querySelector('[data-origin]')!.textContent).toBe('0');
    expect(c.querySelector('[data-label-x="0"]')).toBeNull();
    expect(c.querySelector('[data-label-y="0"]')).toBeNull();
    expect(c.querySelectorAll('polygon').length).toBe(2);
    expect(c.querySelector('[data-label-x="8"]')!.textContent).toBe('8');
  });
  it('four quadrants only when a minimum is negative; labels use U+2212', () => {
    draw({ ...G, xMin: -8, yMin: -8 });
    expect(label()).toContain('vier Quadranten');
    expect(document.querySelector('[data-label-x="-3"]')!.textContent).toBe('−3');
    cleanup();
    draw(G);
    expect(label()).not.toContain('vier Quadranten');
  });
  it('names Rechtswert and Hochwert on request, and gives a point as the way from the origin, never as P(x | y)', () => {
    draw({ ...G, axisNames: 'rechtsHoch' });
    expect(label()).toContain('Rechtswert nach rechts, Hochwert nach oben');
    expect(label()).toContain('Punkt P: vom Ursprung aus 2 nach oben und 3 nach rechts');
    expect(label()).not.toMatch(/3[^a-z]*2/);
  });
});

describe('angle', () => {
  it('arm lengths are independent of the opening (F8)', () => {
    const c = draw({ type: 'angle', degrees: 40, baseRotation: 0, arm1: 1, arm2: 0.3, showArc: true });
    const len = (arm: string) => {
      const l = c.querySelector(`[data-arm="${arm}"]`)!;
      return Math.hypot(Number(l.getAttribute('x2')) - Number(l.getAttribute('x1')), Number(l.getAttribute('y2')) - Number(l.getAttribute('y1')));
    };
    expect(len('1')).toBeGreaterThan(len('2') * 3);
  });
  it('over 180° draws the larger arc', () => {
    expect(draw({ type: 'angle', degrees: 300, baseRotation: 0, arm1: 1, arm2: 1, showArc: true }).querySelector('[data-arc]')!.getAttribute('data-arc')).toBe('large');
    cleanup();
    expect(draw({ type: 'angle', degrees: 60, baseRotation: 0, arm1: 1, arm2: 1, showArc: true }).querySelector('[data-arc]')!.getAttribute('data-arc')).toBe('small');
  });
  it('the Geodreieck has both scales; the description gives both readings, the plain angle not its size', () => {
    const c = draw({ type: 'angle', degrees: 40, baseRotation: 0, arm1: 1, arm2: 1, showArc: false, tool: 'geodreieck' });
    const mark = c.querySelector('[data-scale="40"]')!;
    expect([...mark.querySelectorAll('text')].map((t) => t.textContent)).toEqual(['40', '140']);
    expect(c.querySelectorAll('[data-testid="geodreieck"] > line')).toHaveLength(181);
    expect(label()).toContain('auf jeder Skala: 40 und 140');
    cleanup();
    draw({ type: 'angle', degrees: 40, baseRotation: 0, arm1: 1, arm2: 1, showArc: true });
    expect(label()).not.toMatch(/40/);
  });
});

describe('angle picture', () => {
  it('keeps the part of the circle the sweep needs; a tap counts from the vertex', () => {
    const small = angleGeometry(0, 90);
    const full = angleGeometry(0, 360);
    expect(small.H).toBeLessThan(full.H);
    expect(small.W).toBeLessThan(full.W);
    const vertex = { x: ANGLE.CX - small.x0, y: ANGLE.CY - small.y0 };
    expect(small.directionAt(vertex.x, vertex.y)).toBeNull();
    expect(small.directionAt(vertex.x + 50, vertex.y)).toBeCloseTo(0, 6);
    expect(small.directionAt(vertex.x, vertex.y - 50)).toBeCloseTo(90, 6);
    expect(full.directionAt(ANGLE.CX - full.x0, ANGLE.CY - full.y0 + 50)).toBeCloseTo(270, 6);
  });
});

describe('fractionModel', () => {
  it('draws parts and shades across wholes, with a hatch; the description states parts, not the fraction', () => {
    const c = draw({ type: 'fractionModel', form: 'bar', parts: 4, filled: 5, wholes: 2 });
    expect(c.querySelectorAll('[data-part]')).toHaveLength(8);
    expect(c.querySelectorAll('[data-part="filled"]')).toHaveLength(5);
    expect(c.querySelector('pattern')).not.toBeNull();
    expect(label()).toContain('4 Teilen');
    expect(label()).toContain('5 Teile sind gefärbt');
    expect(label()).not.toMatch(/Viertel/);
  });
  it.each(['bar', 'circle', 'rect'] as const)('%s: all parts, refineTo adds finer lines', (form) => {
    const c = draw({ type: 'fractionModel', form, parts: 4, filled: 1, refineTo: 8 });
    expect(c.querySelectorAll('[data-part]')).toHaveLength(4);
    expect(c.querySelectorAll('[data-refine]').length).toBeGreaterThan(0);
    expect(label()).toContain('Feinere Linien');
  });
  it('unequal parts are really unequal and add up to the whole', () => {
    const w = unequalWidths(4);
    expect(new Set(w).size).toBeGreaterThan(1);
    expect(w.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 9);
    draw({ type: 'fractionModel', form: 'bar', parts: 4, filled: 1, unequal: true });
    expect(label()).toContain('ungleich große Teile');
  });
});

describe('quader', () => {
  it('45° receding edges at half depth, sizes to scale', () => {
    const g = quaderGeometry(4, 2, 3);
    expect(g.dx).toBeCloseTo(g.dy, 9);
    expect(g.dx).toBeCloseTo(g.unit * 2 * 0.5 * Math.SQRT1_2, 9);
    expect((g.B[0] - g.A[0]) / (g.A[1] - g.D[1])).toBeCloseTo(4 / 3, 9);
  });
  it('hidden edges dashed, labels, highlight, layers', () => {
    const c = draw({ type: 'quader', a: 3, b: 2, c: 2, unit: 'cm', showLabels: true, hiddenEdges: 'dashed', highlightFace: 'top', layers: true });
    expect(c.querySelectorAll('[data-testid="quader-hidden"] line')).toHaveLength(3);
    // drawn after the opaque faces, or the dashes would be painted over
    const order = [...c.querySelector('svg')!.children].map((el) => el.getAttribute('data-testid') ?? el.getAttribute('data-face'));
    expect(order.indexOf('quader-hidden')).toBeGreaterThan(order.indexOf('front'));
    expect(c.querySelector('[data-testid="quader-labels"]')!.textContent).toContain('3 cm');
    expect((c.querySelector('[data-face="top"]') as SVGElement).style.fill).toContain('url(');
    expect(c.querySelectorAll('[data-layers]')).toHaveLength(3);
    expect(label()).toContain('verdeckten Kanten');
    cleanup();
    expect(draw({ type: 'quader', a: 3, b: 2, c: 2, showLabels: false, hiddenEdges: 'none' }).querySelector('[data-testid="quader-hidden"]')).toBeNull();
  });
  it('a Würfel is named in the description', () => {
    draw({ type: 'quader', a: 2, b: 2, c: 2, showLabels: false, hiddenEdges: 'none', kind: 'wuerfel' });
    expect(label()).toContain('Würfel');
  });
});

describe('term', () => {
  it('lines one by one; the next step has a mark besides the tint', () => {
    const c = draw({ type: 'term', lines: ['3 + 4 · 5', '3 + 20', '23'], highlight: [4, 9] });
    expect([...c.querySelectorAll('.term-line')].map((l) => l.textContent)).toEqual(['3 + 4 · 5', '3 + 20', '23']);
    expect(c.querySelector('mark')!.textContent).toBe('4 · 5');
    expect(label()).toBe('Rechenweg: 3 plus 4 mal 5. Dann: 3 plus 20. Dann: 23. Markiert: 4 mal 5.');
  });
  it('bracketDepth lifts the outer brackets by level', () => {
    const c = draw({ type: 'term', lines: ['2 · (3 + (4 − 1))'], bracketDepth: true });
    const b = [...c.querySelectorAll<HTMLElement>('.term-bracket')];
    expect(b.map((x) => x.dataset.depth)).toEqual(['1', '2', '2', '1']);
    expect(parseInt(b[0].style.fontSize)).toBeGreaterThan(parseInt(b[1].style.fontSize));
    expect(c.querySelector('.term-line')!.textContent).toBe('2 · (3 + (4 − 1))');
  });
  it('reads a negative after an operator with its sign', () => {
    draw({ type: 'term', lines: ['5 − (−3)'] });
    expect(label()).toContain('5 minus, minus 3');
  });
});

describe('lines', () => {
  it('Strecke, Gerade and Halbgerade differ by their end marks', () => {
    const c = draw({ type: 'lines', lines: [{ angle: 0, offset: -40, kind: 'strecke' }, { angle: 0, offset: 0, kind: 'gerade' }, { angle: 0, offset: 40, kind: 'halbgerade' }] });
    const of = (i: number) => c.querySelector(`[data-line="${i}"]`)!;
    expect(of(0).querySelectorAll('[data-end]')).toHaveLength(2);
    expect(of(1).querySelectorAll('[data-end], [data-arrow]')).toHaveLength(0);
    expect(of(2).querySelectorAll('[data-end]')).toHaveLength(1);
    expect(of(2).querySelectorAll('[data-arrow]')).toHaveLength(1);
    expect(label()).toContain('mit zwei Endpunkten');
  });
  it('the ends stay in the picture, also for tilted lines; offset moves a line sideways', () => {
    for (const angle of [0, 30, 45, 90, 135]) {
      for (const offset of [-60, 0, 60]) {
        const { a, b } = lineEnds({ angle, offset });
        for (const [x, y] of [a, b]) {
          expect(x, `${angle}/${offset}`).toBeGreaterThanOrEqual(0);
          expect(x).toBeLessThanOrEqual(300);
          expect(y).toBeGreaterThanOrEqual(0);
          expect(y).toBeLessThanOrEqual(200);
        }
      }
    }
    expect(lineEnds({ angle: 0, offset: 40 }).a[1]).toBe(140);
  });
  it('marks a right angle at a real crossing, and parallel lines have no crossing', () => {
    const lines = [{ angle: 20, offset: 0 }, { angle: 110, offset: 10 }];
    const c = draw({ type: 'lines', lines, rightAngleMarks: [[0, 1]] });
    expect(c.querySelector('[data-right-angle]')).not.toBeNull();
    expect(crossing({ angle: 0, offset: 0 }, { angle: 0, offset: 30 })).toBeNull();
    expect(label()).toContain('rechter Winkel');
  });
  it('marks a parallel pair on both lines and says so', () => {
    const c = draw({ type: 'lines', lines: [{ angle: 0, offset: -30, label: 'a' }, { angle: 0, offset: 30, label: 'b' }], parallelMarks: [[0, 1]] });
    expect(c.querySelectorAll('[data-parallel-mark]')).toHaveLength(2);
    expect(label()).toContain('Die Linien a und b sind als parallel markiert.');
  });
  it('the Geodreieck', () => {
    const c = draw({ type: 'lines', lines: [{ angle: 0, offset: -30 }, { angle: 0, offset: 30 }], geodreieck: 0 });
    expect(c.querySelector('[data-testid="lines-geodreieck"]')).not.toBeNull();
  });
});

describe('thermometer', () => {
  const T: VisualOf<'thermometer'> = { type: 'thermometer', min: -10, max: 10, step: 1, value: -3, unit: '°C' };
  it('vertical: higher values are higher; the level stands where the value is', () => {
    const g = thermometerGeometry(T);
    expect(g.yOf(5)).toBeLessThan(g.yOf(-5));
    const level = draw(T).querySelector('[data-testid="thermo-level"]')!;
    expect(Number(level.getAttribute('y'))).toBeCloseTo(g.yOf(-3), 6);
  });
  it('the level is drawn in a fill of at least 3:1 on the white tube, also on paper (WCAG 1.4.11)', () => {
    expect((draw(T).querySelector('[data-testid="thermo-level"]') as SVGElement).style.fill).toBe('var(--fill-strong)');
    cleanup();
    expect((draw(T, true).querySelector('[data-testid="thermo-level"]') as SVGElement).style.fill).toBe('var(--ink)');
  });
  it('labels with U+2212, zero labelled; says the temperature in words', () => {
    const c = draw(T);
    expect(c.querySelector('[data-label="0"]')!.textContent).toBe('0');
    expect(c.querySelector('[data-label="-10"]')!.textContent).toBe('−10');
    expect(label()).toContain('Striche über dem unteren Ende');
    expect(label()).not.toContain('minus 3');
  });
  it('change draws an arrow from the state', () => {
    const c = draw({ ...T, change: 8 });
    expect(c.querySelector('[data-testid="thermo-change"]')).not.toBeNull();
    expect(label()).toContain('nach oben, um 8 Grad');
  });
});

describe('placeValue: after a comma', () => {
  it('names the columns, draws the comma line, a cell may hold more digits, highlight is not colour alone', () => {
    const c = draw({ type: 'placeValue', columns: ['Z', 'E', 'z', 'h', 't'], rows: [{ values: [1, 14, 5, null, 7] }], highlight: 'E' });
    expect(label()).toContain('Zehner: 1');
    expect(label()).toContain('Einer: 14');
    expect(label()).toContain('Hundertstel: leer');
    expect(label()).toContain('Markiert sind die Einer');
    expect(c.querySelector('[data-cell="0-E"]')!.textContent).toBe('14');
    expect(c.querySelector('[data-comma-line]')).not.toBeNull();
    expect(c.querySelector('[data-highlight="E"]')).not.toBeNull();
  });
  it('has no comma line without places after the comma', () => {
    const narrow = draw({ type: 'placeValue', columns: ['H', 'Z', 'E'], rows: [{ values: [1, 2, 3] }] });
    expect(narrow.querySelector('[data-comma-line]')).toBeNull();
    expect(narrow.querySelector('svg')!.getAttribute('class')).not.toContain('visual--readable');
  });
});

describe('numberLine: negative range, arrows on both ends, jump arcs, fractions', () => {
  const L: VisualOf<'numberLine'> = { type: 'numberLine', min: -10, max: 10, majorStep: 5, minorStep: 1, labelMajor: true, arrows: 'both', marks: [{ value: -3, label: 'A' }], jumps: [{ from: -3, to: 5, label: '+ 8' }] };
  it('labels with U+2212, an arrowhead at both ends, the jump arc', () => {
    const c = draw(L);
    expect(c.querySelector('[data-label="-10"]')!.textContent).toBe('−10');
    expect(c.querySelector('[data-arrow="left"]')).not.toBeNull();
    expect(c.querySelector('[data-jump="-3-5"]')).not.toBeNull();
  });
  it('a right-only line has no left arrowhead', () => {
    expect(draw({ type: 'numberLine', min: 0, max: 100, majorStep: 10, minorStep: 10, labelMajor: true }).querySelector('[data-arrow="left"]')).toBeNull();
  });
  it('the description calls it a Zahlengerade and says the signs as words', () => {
    expect(numberLineAriaLabel(L)).toMatch(/^Zahlengerade von minus 10 bis 10\./);
    expect(numberLineAriaLabel(L)).toContain('Sprung von minus 3 bis 5');
    expect(numberLineAriaLabel(L)).toContain('Pfeil A: ');
  });
  it('a mark is placed from the left label, across zero', () => {
    expect(describeMarkPosition(L, -3)).toBe('2 kleine Abschnitte rechts von −5');
    expect(tickValues(-10, 10, 5)).toEqual([-10, -5, 0, 5, 10]);
  });
  it('denominator: values count d-ths, labels draw stacked, integers stay integers', () => {
    const c = draw({ type: 'numberLine', min: 0, max: 8, majorStep: 2, minorStep: 1, labelMajor: true, denominator: 4 });
    const half = c.querySelector('[data-label="2"]')!;
    expect([...half.querySelectorAll('text')].map((t) => t.textContent)).toEqual(['2', '4']);
    expect(half.querySelector('line')).not.toBeNull();
    expect(c.querySelector('[data-label="4"]')!.textContent).toBe('1');
    expect(c.querySelector('[data-label="8"]')!.textContent).toBe('2');
  });
});

describe('barChart: meanLine, levelled, axisStart', () => {
  const B: VisualOf<'barChart'> = { type: 'barChart', title: 'Tore', categories: ['A', 'B', 'C'], values: [2, 4, 6], axisMax: 8, axisStep: 2 };
  it('meanLine is a dashed line with its value', () => {
    const c = draw({ ...B, meanLine: 4 });
    expect(c.querySelector('[data-testid="bc-mean"]')!.textContent).toBe('4');
    expect(barChartLabel({ ...B, meanLine: 4 })).toContain('Mittelwert 4');
  });
  it('levelled: all bars at the mean, the old heights as dashed outlines', () => {
    const c = draw({ ...B, meanLine: 4, levelled: true });
    const bars = [...c.querySelectorAll('[data-testid="bc-bar"]')];
    expect(new Set(bars.map((b) => b.getAttribute('height'))).size).toBe(1);
    const old = [...c.querySelectorAll('[data-testid="bc-old"]')];
    expect(old).toHaveLength(3);
    expect(new Set(old.map((b) => b.getAttribute('height'))).size).toBe(3);
    expect(barChartLabel({ ...B, meanLine: 4, levelled: true })).toContain('ausgeglichen');
  });
  it('axisStart: the axis starts there on purpose, and the description says so', () => {
    const c = draw({ ...B, values: [52, 54, 56], axisStart: 50, axisMax: 60, axisStep: 2 });
    expect([...c.querySelectorAll('.bc-tick')].map((t) => t.textContent)[0]).toBe('50');
    const heights = [...c.querySelectorAll('[data-testid="bc-bar"]')].map((b) => Number(b.getAttribute('height')));
    expect(heights[2] / heights[0]).toBeCloseTo(3, 6);
    expect(barChartLabel({ ...B, axisStart: 50, axisMax: 60 })).toContain('Die Achse beginnt bei 50.');
  });
  it('horizontal charts carry them too', () => {
    const c = draw({ ...B, horizontal: true, meanLine: 4, levelled: true });
    expect(c.querySelector('[data-testid="bc-mean"]')).not.toBeNull();
    expect(c.querySelectorAll('[data-testid="bc-old"]')).toHaveLength(3);
  });
});

describe('shape: sideLabels and the L-form', () => {
  it('writes side labels clockwise from the top side', () => {
    const c = draw({ type: 'shape', shape: 'rechteck', sideLabels: ['5 cm', '3 cm', null, null] });
    const side = (i: number) => c.querySelector(`[data-side="${i}"]`);
    expect(side(0)!.textContent).toBe('5 cm');
    expect(side(1)!.textContent).toBe('3 cm');
    expect(side(2)).toBeNull();
    expect(Number(side(0)!.getAttribute('y'))).toBeLessThan(Number(side(1)!.getAttribute('y')));
    expect(Number(side(1)!.getAttribute('x'))).toBeGreaterThan(150);
    expect(side(1)!.getAttribute('text-anchor')).toBe('start');
    expect(side(0)!.getAttribute('text-anchor')).toBe('middle');
    expect(label()).toContain('Seite 1: 5 cm');
  });
  it('the L-form is drawn to scale, with its split line; six sides clockwise from the top', () => {
    const l = { w: 8, h: 6, cutW: 3, cutH: 2 };
    const pts = lFormPoints(l);
    expect(pts).toHaveLength(6);
    const len = (i: number) => Math.hypot(pts[(i + 1) % 6][0] - pts[i][0], pts[(i + 1) % 6][1] - pts[i][1]);
    const unit = len(0) / (l.w - l.cutW);
    for (const [i, side] of [[1, l.cutH], [2, l.cutW], [3, l.h - l.cutH], [4, l.w], [5, l.h]] as const) expect(len(i)).toBeCloseTo(side * unit, 6);
    const c = draw({ type: 'shape', shape: 'l-form', lForm: l, split: 'vertical', sideLabels: ['5 m', '2 m', '3 m', '4 m', '8 m', '6 m'] });
    expect(c.querySelector('[data-testid="shape-split"]')).not.toBeNull();
    expect(c.querySelectorAll('[data-side]')).toHaveLength(6);
    expect(label()).toContain('senkrechte Linie');
    // The two sides at the cut do not run into each other.
    const x = (i: number) => Number(c.querySelector(`[data-side="${i}"]`)!.getAttribute('x'));
    const LABEL = 28; // about the width of '3 m' at 16 px
    expect(x(1) + LABEL).toBeLessThanOrEqual(x(2) - LABEL + 8);
  });
  it('the new figures describe their properties, not their names', () => {
    for (const shape of ['trapez', 'drachen', 'l-form'] as const) {
      draw({ type: 'shape', shape });
      expect(label().toLowerCase()).not.toMatch(/trapez|drachen/);
      cleanup();
    }
    draw({ type: 'shape', shape: 'trapez', named: true });
    expect(label()).toContain('ein Trapez');
  });
});

describe('net: non-cube Quader nets', () => {
  // A 2 × 1 × 1 Quader: long faces of two cells, end faces of one.
  const cells = [[1, 0], [2, 0], [0, 1], [1, 1], [2, 1], [3, 1], [1, 2], [2, 2], [1, 3], [2, 3]] as [number, number][];
  const groups = [0, 0, 1, 2, 2, 3, 4, 4, 5, 5];
  it('thin lines inside a face, thick fold lines between faces, one label per face', () => {
    const c = draw({ type: 'net', cells, groups, faces: ['A', 'A', 'B', 'C', 'C', 'D', 'E', 'E', 'F', 'F'] });
    expect(c.querySelectorAll('[data-edge="inner"]').length).toBeGreaterThan(0);
    expect(c.querySelectorAll('[data-edge="fold"]').length).toBeGreaterThan(0);
    expect([...c.querySelectorAll('text')].map((t) => t.textContent).sort()).toEqual(['A', 'B', 'C', 'D', 'E', 'F']);
    expect(label()).toContain('Netz aus 6 Flächen auf 10 Kästchen');
  });
  it('a cube net keeps its plain squares', () => {
    const cube = draw({ type: 'net', cells: [[0, 0], [1, 0], [2, 0], [3, 0], [1, 1], [1, 2]] });
    expect(cube.querySelector('[data-edge]')).toBeNull();
    expect(label()).toContain('Netz aus 6 Quadraten');
  });
});

describe('written: multi-digit and division restored', () => {
  it('shows partial products and division steps; places adds a head row', () => {
    const mul = draw({ type: 'written', op: 'mul', operands: [123, 45], showSolution: true });
    expect(mul.querySelectorAll('.wv-partial')).toHaveLength(2);
    cleanup();
    const div = draw({ type: 'written', op: 'div', operands: [4230, 6], showSolution: true });
    expect(div.querySelectorAll('.wv-step').length).toBeGreaterThan(0);
    expect(div.textContent).toContain('705');
  });
});
