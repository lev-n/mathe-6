// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import NumberLineVisual, { describeMarkPosition, layoutLabels, NL, NL_MIN_WIDTH, numberLineAriaLabel, tickValues } from './NumberLineVisual';
import type { VisualOf } from '../../core/types';

const zoom: VisualOf<'numberLine'> = {
  type: 'numberLine',
  min: 30,
  max: 40,
  majorStep: 2,
  minorStep: 1,
  labelMajor: false,
  labels: [30, 40],
  marks: [{ value: 35, label: 'A' }],
};

describe('NumberLineVisual', () => {
  it('renders ticks, labels and the mark', () => {
    const { container } = render(<NumberLineVisual visual={zoom} />);
    expect(container.querySelectorAll('[data-tick]')).toHaveLength(11);
    expect(container.querySelectorAll('[data-tick="major"]')).toHaveLength(6);
    expect([...container.querySelectorAll('[data-label]')].map((t) => t.textContent)).toEqual(['30', '40']);
    expect(container.querySelector('[data-mark="A"]')).not.toBeNull();
  });

  it('describes the mark position without giving away its value', () => {
    render(<NumberLineVisual visual={zoom} />);
    const label = screen.getByRole('img').getAttribute('aria-label') ?? '';
    expect(label).toContain('Zahlenstrahl von 30 bis 40.');
    expect(label).toContain('Pfeil A: 2 lange Abschnitte und 1 kleinen Abschnitt rechts von 30.');
    expect(label).not.toContain('35');
  });

  it('never lets labels overlap (staggers or thins them)', () => {
    const configs: VisualOf<'numberLine'>[] = [
      { type: 'numberLine', min: 0, max: 100, majorStep: 10, minorStep: 5, labelMajor: true },
      { type: 'numberLine', min: 0, max: 100, majorStep: 5, minorStep: 1, labelMajor: true },
      { type: 'numberLine', min: 90, max: 100, majorStep: 1, minorStep: 1, labelMajor: true },
    ];
    for (const c of configs) {
      const ls = layoutLabels(c);
      expect(ls.length).toBeGreaterThan(1);
      for (const row of [0, 1]) {
        const xs = ls.filter((l) => l.row === row);
        // half of each label's width (0.58 of the font size per digit) fits between two neighbours
        const half = (v: number) => (String(v).length * 18 * 0.58) / 2;
        for (let i = 1; i < xs.length; i++) expect(xs[i].x - xs[i - 1].x).toBeGreaterThan(half(xs[i].value) + half(xs[i - 1].value));
      }
    }
  });

  it('keeps every label of 0 to 100 in steps of 10 on one row', () => {
    const ls = layoutLabels({ min: 0, max: 100, majorStep: 10, minorStep: 5, labelMajor: true });
    expect(ls).toHaveLength(11);
    expect(ls.every((l) => l.row === 0)).toBe(true);
  });

  it('helpers', () => {
    expect(tickValues(0, 100, 25)).toEqual([0, 25, 50, 75, 100]);
    expect(describeMarkPosition({ min: 0, max: 100, majorStep: 10, minorStep: 10, labelMajor: false, labels: [0, 100] }, 65)).toBe('im 7. Abschnitt von links, in der Mitte');
    expect(numberLineAriaLabel({ ...zoom, marks: [] })).toContain('Lange Striche teilen ihn in 5 Abschnitte. Jeder Abschnitt hat 2 kleine Abschnitte.');
  });

  it('renders in print mode', () => {
    const { container } = render(<NumberLineVisual visual={zoom} print />);
    expect(screen.getByRole('img')).toBeTruthy();
    expect(container.querySelector('.nl-scroll')).toBeNull();
  });

  it('on screen scrolls sideways below a readable minimum width instead of shrinking the labels', () => {
    const { container } = render(<NumberLineVisual visual={zoom} />);
    const box = container.querySelector('.nl-scroll') as HTMLElement;
    expect(box).not.toBeNull();
    expect(box.style.getPropertyValue('--nl-min-width')).toBe(`${NL_MIN_WIDTH}px`);
    // labels are 18 viewBox units: at the minimum width they are still ≥ 13 px, and the minimum fits a 375 px phone
    expect((18 * NL_MIN_WIDTH) / NL.W).toBeGreaterThanOrEqual(13);
    expect(NL_MIN_WIDTH).toBeLessThanOrEqual(311);
    expect(box.querySelector('svg[role="img"]')).not.toBeNull();
  });

  it('the arrowhead at the end of the line stays inside the drawing', () => {
    const { container } = render(<NumberLineVisual visual={{ type: 'numberLine', min: 0, max: 100, majorStep: 10, minorStep: 10, labelMajor: true }} />);
    const tip = container.querySelector('[data-testid="numberline-axis"] polygon')!.getAttribute('points')!.split(' ')[0];
    expect(Number(tip.split(',')[0])).toBeLessThanOrEqual(NL.W);
  });

  it('draws jump arcs with an arrowhead and a label, forwards and backwards', () => {
    const line: VisualOf<'numberLine'> = {
      type: 'numberLine', min: 30, max: 50, majorStep: 5, minorStep: 1, labelMajor: true,
      jumps: [{ from: 35, to: 40, label: '+ 5' }, { from: 40, to: 43, label: '+ 3' }, { from: 43, to: 41 }],
    };
    const { container } = render(<NumberLineVisual visual={line} />);
    expect(container.querySelectorAll('[data-jump]')).toHaveLength(3);
    expect(container.querySelector('[data-jump="35-40"] path')).not.toBeNull();
    expect(container.querySelector('[data-jump="35-40"] polygon')).not.toBeNull();
    expect(container.querySelector('[data-jump="35-40"] text')?.textContent).toBe('+ 5');
    expect(container.querySelector('[data-jump="43-41"] text')).toBeNull();
    const label = screen.getByRole('img').getAttribute('aria-label') ?? '';
    expect(label).toContain('Sprung von 35 bis 40: plus 5.');
    expect(label).toContain('Sprung von 43 bis 41.');
  });

  it('keeps the band above the line for jumps (no arc is cropped)', () => {
    const { container } = render(<NumberLineVisual visual={{ type: 'numberLine', min: 0, max: 100, majorStep: 10, minorStep: 10, labelMajor: true, jumps: [{ from: 0, to: 100, label: '+ 100' }] }} />);
    expect(container.querySelector('svg')?.getAttribute('viewBox')?.startsWith('0 0 ')).toBe(true);
    const y = Number(container.querySelector('[data-jump] text')?.getAttribute('y'));
    expect(y).toBeGreaterThanOrEqual(16);
  });
});
