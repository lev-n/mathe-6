// @vitest-environment jsdom
// The visuals and extensions of Klasse 6 (docs/research.md §6).
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { assertWellFormedVisual } from '../../core/testing';
import type { Visual } from '../../core/types';
import VisualView from './Visual';
import { describeVisual } from './describe';

afterEach(cleanup);

const draw = (v: Visual, print = false) => {
  assertWellFormedVisual(v);
  return render(<VisualView visual={v} print={print} />).container;
};

describe('percentBar', () => {
  it('has two aligned scales, a tick for each part and a mark that is more than a colour', () => {
    const c = draw({ type: 'percentBar', total: 200, percent: 25, ticks: 4, labels: 'both', unit: '€' });
    expect(c.querySelector('[data-percent="25"]')!.textContent).toBe('25\u00A0%');
    expect(c.querySelector('[data-value="50"]')).not.toBeNull();
    expect(c.querySelectorAll('[data-tick]')).toHaveLength(5);
    expect(c.querySelector('[data-marked="25"]')!.getAttribute('style')).toMatch(/url\("?#/);
    expect(c.querySelector('[data-percent="25"]')!.getAttribute('x')).toBe(c.querySelector('[data-value="50"]')!.getAttribute('x'));
  });
  it('the unknown is a box, and no scale hands over the answer', () => {
    const bar = (unknown: 'G' | 'W' | 'p') => draw({ type: 'percentBar', total: 60, percent: 20, ticks: 10, labels: 'both', unknown });
    const g = bar('G');
    expect(g.querySelector('[data-unknown="G"]')!.textContent).toBe('\u25A1');
    expect(g.querySelector('[data-value="60"]')).toBeNull();
    expect(g.querySelector('[data-value="12"]'), 'the given part stays').not.toBeNull();
    expect(g.querySelector('[data-value="6"]')).toBeNull();
    cleanup();
    const w = bar('W');
    expect(w.querySelector('[data-unknown="W"]')!.textContent).toBe('\u25A1');
    expect(w.querySelector('[data-value="12"]')).toBeNull();
    expect(w.querySelector('[data-value="6"]')).toBeNull();
    expect(w.querySelector('[data-value="60"]')).not.toBeNull();
    cleanup();
    const p = bar('p');
    expect(p.querySelector('[data-unknown="p"]')!.textContent).toBe('\u25A1');
    expect(p.querySelector('[data-percent="20"]')).toBeNull();
    expect(p.querySelector('[data-value="12"]')).not.toBeNull();
  });
  it('labels stay apart: every second percent label from 6 parts', () => {
    const c = draw({ type: 'percentBar', total: 60, percent: 20, ticks: 10, labels: 'both' });
    expect(c.querySelector('[data-percent="10"]')).toBeNull();
    expect(c.querySelector('[data-percent="20"]')).not.toBeNull();
    expect(c.querySelector('[data-value="6"]')).not.toBeNull();
  });
  it('labels: one scale only, and the description states what it shows', () => {
    const c = draw({ type: 'percentBar', total: 80, ticks: 10, labels: 'percent' });
    expect(c.querySelector('[data-value]')).toBeNull();
    expect(c.querySelector('[data-percent="20"]')).not.toBeNull();
    expect(describeVisual({ type: 'percentBar', total: 60, percent: 25, ticks: 4, labels: 'both', unknown: 'G' })).toContain('Der Wert bei 100 Prozent ist gesucht');
  });
  it('rejects a bar outside its limits', () => {
    expect(() => assertWellFormedVisual({ type: 'percentBar', total: 100, ticks: 30, labels: 'both' })).toThrow();
    expect(() => assertWellFormedVisual({ type: 'percentBar', total: 100, percent: 120, ticks: 10, labels: 'both' })).toThrow();
  });
});

describe('figure', () => {
  const parallelogram: Visual = {
    type: 'figure',
    points: [{ x: 0, y: 120, label: 'A' }, { x: 200, y: 120, label: 'B' }, { x: 260, y: 0, label: 'C' }, { x: 60, y: 0, label: 'D' }],
    sides: ['8 cm', '5 cm', null, null],
    height: { from: 3, to: { x: 60, y: 120 }, label: '4 cm' },
    parallelMarks: [[0, 2], [1, 3]],
  };
  it('draws the sides, a dashed height with a right angle, and parallel marks', () => {
    const c = draw(parallelogram);
    expect(c.querySelector('[data-side="0"]')!.textContent).toBe('8 cm');
    expect(c.querySelector('[data-height="inside"] line')!.getAttribute('style')).toMatch(/dasharray/);
    expect(c.querySelector('[data-height] [data-right-angle]')).not.toBeNull();
    expect(c.querySelectorAll('[data-side-mark="parallel"]')).toHaveLength(4);
    expect(c.querySelector('[data-corner="A"]')).not.toBeNull();
    expect(screen.getByRole('img').getAttribute('aria-label')).toContain('Die Höhe ist gestrichelt: 4 cm');
  });
  it('a label beside a steep side keeps clear of it, and the picture makes room for it', () => {
    const c = draw({ type: 'figure', points: [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 200 }, { x: 0, y: 200 }], sides: [null, '112,5 cm', null, '112,5 cm'] });
    const right = c.querySelector('[data-side="1"]')!;
    // the side stands at 140 with the padding: half the label plus a gap
    expect(Number(right.getAttribute('x'))).toBeGreaterThanOrEqual(140 + (8 * 9.5) / 2 + 8);
    const [x, , w] = c.querySelector('svg')!.getAttribute('viewBox')!.split(' ').map(Number);
    expect(x).toBeLessThan(0);
    expect(x + w).toBeGreaterThan(Number(right.getAttribute('x')) + (8 * 9.5) / 2 - 1);
  });
  it('the text of an outside height stands off the figure', () => {
    const c = draw({ type: 'figure', points: [{ x: 60, y: 120 }, { x: 160, y: 120 }, { x: 0, y: 0 }], sides: [null, null, null], height: { from: 2, to: { x: 0, y: 120 }, outside: true, label: '6 cm' } });
    const text = [...c.querySelectorAll('[data-height] text')][0];
    expect(text.getAttribute('text-anchor')).toBe('end');
  });
  it('a height outside the figure carries the base line on to its foot', () => {
    const c = draw({ type: 'figure', points: [{ x: 60, y: 120 }, { x: 180, y: 120 }, { x: 0, y: 0 }], height: { from: 2, to: { x: 0, y: 120 }, outside: true } });
    expect(c.querySelector('[data-height="outside"] [data-base-line]')).not.toBeNull();
    expect(screen.getByRole('img').getAttribute('aria-label')).toContain('außerhalb der Figur');
  });
  it('a circle with its radius or diameter, and equal sides by groups', () => {
    const c = draw({ type: 'figure', points: [], circle: { x: 100, y: 100, r: 80, label: 'r = 3 cm', centre: 'M' } });
    expect(c.querySelector('[data-radius]')).not.toBeNull();
    expect(screen.getByRole('img').getAttribute('aria-label')).toContain('Kreis mit Mittelpunkt M');
    cleanup();
    const k = draw({ type: 'figure', points: [{ x: 100, y: 0 }, { x: 200, y: 60 }, { x: 100, y: 160 }, { x: 0, y: 60 }], equalMarks: [[0, 3], [1, 2]], rightAngles: [1] });
    expect(k.querySelectorAll('[data-side-mark="equal"]')).toHaveLength(4);
    expect(k.querySelector('[data-right-angle]')).not.toBeNull();
  });
});

describe('pieChart', () => {
  const pie: Visual = { type: 'pieChart', title: 'Lieblingssport', slices: [{ label: 'Fußball', value: 50, pattern: 'lines' }, { label: 'Tennis', value: 25, pattern: 'dots' }, { label: 'Judo', value: 25, pattern: 'cross' }], showValues: 'percent' };
  it('starts at 12 o\'clock and runs clockwise, with direct labels and a pattern per slice', () => {
    const c = draw(pie);
    const first = c.querySelector('[data-slice="Fußball"] path')!.getAttribute('d')!;
    // from the centre straight up (x stays at the centre), then an arc
    expect(first).toMatch(/^M192 172 L192 76 A/);
    expect(c.querySelector('[data-slice="Fußball"] text')!.textContent).toBe('Fußball 50\u00A0%');
    expect(new Set([...c.querySelectorAll('[data-pattern]')].map((p) => p.getAttribute('data-pattern'))).size).toBe(3);
    expect(describeVisual(pie)).toBe('Kreisdiagramm Lieblingssport. Im Uhrzeigersinn von oben: Fußball 50 Prozent, Tennis 25 Prozent, Judo 25 Prozent.');
  });
  it('checks the sum and the patterns', () => {
    expect(() => assertWellFormedVisual({ ...pie, slices: [{ label: 'a', value: 50, pattern: 'lines' }, { label: 'b', value: 40, pattern: 'dots' }] } as Visual)).toThrow(/100/);
    expect(() => assertWellFormedVisual({ type: 'pieChart', title: 't', slices: [{ label: 'a', value: 1, pattern: 'lines' }, { label: 'b', value: 1, pattern: 'lines' }], showValues: 'count' })).toThrow(/pattern/);
  });
});

describe('bag, dice and spinner', () => {
  it('draw through the shared view, and the description says the counts', () => {
    draw({ type: 'bag', balls: [{ color: 'rot', count: 3 }, { color: 'blau', count: 2 }] });
    expect(describeVisual({ type: 'bag', balls: [{ color: 'rot', count: 3 }, { color: 'blau', count: 2 }] })).toContain('3 rote Kugeln');
    cleanup();
    draw({ type: 'dice', values: [1, 6] });
    cleanup();
    draw({ type: 'spinner', sectors: ['rot', 'blau', 'rot'] });
    expect(describeVisual({ type: 'spinner', sectors: ['rot', 'blau', 'rot'] })).toContain('2 Felder rot');
  });
});

describe('angle: highlightScale', () => {
  const v = (highlightScale?: 'inner' | 'outer'): Visual => ({ type: 'angle', degrees: 50, baseRotation: 0, arm1: 1, arm2: 1, showArc: true, tool: 'geodreieck', ...(highlightScale ? { highlightScale } : {}) });
  it.each(['inner', 'outer'] as const)('%s marks that ring with a heavier line and bold numbers', (which) => {
    const c = draw(v(which));
    expect(c.querySelector(`[data-highlight-scale="${which}"]`)).not.toBeNull();
    expect(c.querySelector(`text[data-ring="${which}"]`)!.getAttribute('style')).toMatch(/font-weight:\s*800/);
    expect(c.querySelector(`text[data-ring="${which === 'inner' ? 'outer' : 'inner'}"]`)!.getAttribute('style')).not.toMatch(/font-weight:\s*800/);
  });
  it('without it no ring stands out', () => {
    expect(draw(v()).querySelector('[data-highlight-scale]')).toBeNull();
  });
});

describe('numberLine: labelFormat and arrows for changes', () => {
  const quarters = { type: 'numberLine', min: -8, max: 12, majorStep: 2, minorStep: 1, labelMajor: true, denominator: 4 } as const;
  it('fraction by default, mixed from 1 on, decimal with the comma', () => {
    expect(draw(quarters).querySelector('[data-label="10"]')!.textContent).toBe('104');
    cleanup();
    expect(draw({ ...quarters, labelFormat: 'mixed' }).querySelector('[data-label="10"]')!.textContent).toBe('224');
    cleanup();
    expect(draw({ ...quarters, labelFormat: 'decimal' }).querySelector('[data-label="10"]')!.textContent).toBe('2,5');
    cleanup();
    expect(draw({ type: 'numberLine', min: 0, max: 1, majorStep: 0.5, minorStep: 0.1, labelMajor: true, labelFormat: 'decimal' }).querySelector('[data-label="0.5"]')!.textContent).toBe('0,5');
  });
  it('a negative fraction keeps its sign before the bar, and its integer positions', () => {
    const c = draw(quarters);
    expect(c.querySelector('[data-label="-6"]')!.textContent).toContain('\u2212');
    expect(() => assertWellFormedVisual({ ...quarters, minorStep: 0.5 })).toThrow(/integer position/);
  });
  it('jumps are the arrows of a change, over zero too', () => {
    const c = draw({ type: 'numberLine', min: -5, max: 5, majorStep: 1, minorStep: 1, labelMajor: true, arrows: 'both', jumps: [{ from: -3, to: 2, label: '+ 5' }] });
    expect(c.textContent).toContain('+ 5');
    expect(screen.getByRole('img').getAttribute('aria-label')).toContain('Zahlengerade');
  });
});

describe('net: rectangular faces with side lengths', () => {
  const rects = [
    { x: 2, y: 0, w: 4, h: 2, label: 'oben' },
    { x: 0, y: 2, w: 2, h: 3, heightLabel: '3 cm' },
    { x: 2, y: 2, w: 4, h: 3, widthLabel: '4 cm', label: 'vorne' },
    { x: 6, y: 2, w: 2, h: 3 },
    { x: 8, y: 2, w: 4, h: 3 },
    { x: 2, y: 5, w: 4, h: 2 },
  ];
  it('draws six faces to scale, with their lengths', () => {
    const c = draw({ type: 'net', rects });
    expect(c.querySelectorAll('[data-face]')).toHaveLength(6);
    expect(c.querySelector('[data-side="width"]')!.textContent).toBe('4 cm');
    expect(c.querySelector('[data-side="height"]')!.textContent).toBe('3 cm');
    const [a, b] = [c.querySelector('[data-face="0"] rect')!, c.querySelector('[data-face="1"] rect')!];
    expect(Number(a.getAttribute('width')) / Number(b.getAttribute('width'))).toBe(2);
    expect(describeVisual({ type: 'net', rects })).toContain('6 rechteckigen Flächen');
  });
  it('a Quader net has six faces', () => {
    expect(() => assertWellFormedVisual({ type: 'net', rects: rects.slice(1) })).toThrow(/6 faces/);
  });
  it('the cells of a Würfel net stay as they were', () => {
    const c = draw({ type: 'net', cells: [[1, 0], [0, 1], [1, 1], [2, 1], [3, 1], [1, 2]] });
    expect(c.querySelectorAll('[data-cell]')).toHaveLength(6);
  });
});

describe('table: arrows between rows', () => {
  it('draws the annotations beside the rows, hidden from the table reader and said in the description', () => {
    const v: Visual = { type: 'table', header: ['Hefte', 'Preis'], rows: [['3', '6 €'], ['1', '2 €'], ['5', '10 €']], arrows: [{ from: 0, to: 1, label: ': 3' }, { from: 1, to: 2, label: '· 5', side: 'right' }] };
    const c = draw(v);
    const cell = c.querySelector('[data-arrow=": 3"]')!;
    expect(cell.getAttribute('rowspan')).toBe('2');
    expect(cell.getAttribute('aria-hidden')).toBe('true');
    expect(c.querySelector('[data-arrow="· 5"]')!.className).toContain('table-visual__arrow--right');
    expect(describeVisual(v)).toContain('Von Zeile 1 zu Zeile 2');
    expect(describeVisual(v)).toContain('geteilt durch 3');
    expect(() => assertWellFormedVisual({ ...v, arrows: [{ from: 0, to: 9, label: 'x' }] } as Visual)).toThrow(/arrow/);
  });
});

describe('coordinateGrid: polygon', () => {
  it('draws a closed figure and names its corners', () => {
    const c = draw({ type: 'coordinateGrid', xMin: 0, xMax: 8, yMin: 0, yMax: 8, step: 1, labelStep: 1, points: [], polygon: [{ x: 1, y: 1 }, { x: 5, y: 1 }, { x: 5, y: 4 }, { x: 1, y: 4 }] });
    expect(c.querySelector('[data-polygon]')).not.toBeNull();
    expect(screen.getByRole('img').getAttribute('aria-label')).toContain('Eine Figur mit den Ecken 1 und 1');
  });
});

describe('quader: unitCubes, cutout, schematic', () => {
  const q: Visual = { type: 'quader', a: 3, b: 2, c: 2, showLabels: true, hiddenEdges: 'dashed' };
  it('unitCubes draws the rows like layers', () => {
    expect(draw({ ...q, unitCubes: true } as Visual).querySelectorAll('[data-layers]')).toHaveLength(3);
  });
  it('a cutout is drawn and said, and must fit', () => {
    const c = draw({ ...q, cutout: { a: 1, b: 1, c: 1 } } as Visual);
    expect(c.querySelector('[data-testid="quader-cutout"]')).not.toBeNull();
    expect(screen.getByRole('img').getAttribute('aria-label')).toContain('Aus der Ecke vorne oben rechts fehlt ein Quader');
    expect(() => assertWellFormedVisual({ ...q, cutout: { a: 3, b: 1, c: 1 } } as Visual)).toThrow(/cutout/);
  });
  it('schematic says in text that the drawing is not to scale', () => {
    const c = draw({ ...q, schematic: true } as Visual);
    expect(c.querySelector('[data-testid="quader-schematic"]')!.textContent).toBe('Die Zeichnung ist nicht maßstabsgetreu.');
  });
});

describe('fractionModel: compare', () => {
  it('draws a second bar of the same length, aligned; a circle runs from 12 o\'clock', () => {
    const c = draw({ type: 'fractionModel', form: 'bar', parts: 2, filled: 1, compare: { parts: 4, filled: 2 } });
    const parts = c.querySelectorAll('[data-compare] rect');
    expect(parts).toHaveLength(4);
    expect(c.querySelectorAll('[data-compare] [data-part="filled"]')).toHaveLength(2);
    expect(Number(parts[0].getAttribute('width')) * 4).toBe(300);
    expect(screen.getByRole('img').getAttribute('aria-label')).toContain('Darunter ein gleich langer Streifen mit 4 Teilen');
    expect(() => assertWellFormedVisual({ type: 'fractionModel', form: 'circle', parts: 2, filled: 1, compare: { parts: 4, filled: 2 } })).toThrow(/bar/);
  });
});

describe('written: decimal numbers on the page', () => {
  const v = (patch: object): Visual => ({ type: 'written', op: 'add', operands: [35, 125], decimalPlaces: [1, 2], showSolution: true, ...patch } as Visual);
  it('add stands comma under comma with a muted end zero, and says the numbers', () => {
    const c = draw(v({}));
    expect(c.querySelectorAll('.wv-comma').length).toBeGreaterThanOrEqual(3);
    expect(c.querySelectorAll('.wv-padded')).toHaveLength(1);
    expect(screen.getByRole('img').getAttribute('aria-label')).toBe('Schriftliche Addition: 3,5 plus 1,25. Ergebnis 4,75.');
  });
  it('sub keeps its Entbündeln marks', () => {
    const c = draw(v({ op: 'sub', operands: [305, 125], decimalPlaces: [2, 2] }));
    expect(screen.getByRole('img').getAttribute('aria-label')).toContain('Ergebnis 1,80');
    expect(c.textContent).toContain(',');
  });
  it('mul has the comma in the factors and the result, with its 0', () => {
    const c = draw(v({ op: 'mul', operands: [4, 3], decimalPlaces: [1, 1] }));
    expect(screen.getByRole('img').getAttribute('aria-label')).toContain('Ergebnis 0,12');
    expect(c.querySelectorAll('.wv-comma')).toHaveLength(3);
  });
  it('div shows the shift of the comma as its first line', () => {
    const c = draw(v({ op: 'div', operands: [75, 5], decimalPlaces: [2, 1] }));
    expect(c.querySelector('.wv-shift')!.textContent).toBe('Komma um 1 Stelle verschieben: 0,75 : 0,5 = 7,5 : 5');
    expect(screen.getByRole('img').getAttribute('aria-label')).toContain('Ergebnis 1,5');
  });
});
