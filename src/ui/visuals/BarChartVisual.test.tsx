// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import type { VisualOf } from '../../core/types';
import BarChartVisual from './BarChartVisual';

afterEach(cleanup);

const base: VisualOf<'barChart'> = {
  type: 'barChart',
  title: 'Lieblingsobst',
  categories: ['Kiwis', 'Birnen', 'Trauben'],
  values: [12, 6, 9],
  axisMax: 14,
  axisStep: 2,
  valueLabel: 'Anzahl der Kinder',
};

const bars = () => screen.getAllByTestId('bc-bar');
const num = (el: Element, attr: string) => Number(el.getAttribute(attr));

describe('BarChartVisual', () => {
  it('Säulendiagramm: German aria-label with all values, one bar per category, a grid line per step', () => {
    render(<BarChartVisual visual={base} />);
    const svg = screen.getByRole('img');
    const label = svg.getAttribute('aria-label')!;
    expect(label).toContain('Säulendiagramm „Lieblingsobst“');
    expect(label).toContain('Kiwis 12, Birnen 6 und Trauben 9');
    expect(svg.getAttribute('viewBox')).toMatch(/^0 0 \d+(\.\d+)? \d+(\.\d+)?$/);
    expect(svg.getAttribute('class')).toContain('visual');
    expect(bars()).toHaveLength(3);
    expect(screen.getAllByTestId('bc-grid')).toHaveLength(14 / 2 + 1);
    // Heights are proportional to the values (axis from 0).
    expect(num(bars()[0], 'height')).toBeCloseTo(2 * num(bars()[1], 'height'));
    // Category names and axis numbers are visible text.
    expect(svg.textContent).toContain('Trauben');
    expect(svg.textContent).toContain('14');
    // A static picture: nothing focusable.
    expect(svg.querySelector('[tabindex]')).toBeNull();
  });

  it('Balkendiagramm: horizontal bars with proportional widths', () => {
    render(<BarChartVisual visual={{ ...base, horizontal: true }} />);
    expect(screen.getByRole('img').getAttribute('aria-label')).toMatch(/^Balkendiagramm/);
    expect(num(bars()[0], 'width')).toBeCloseTo(2 * num(bars()[1], 'width'));
  });

  it('print mode adds the print modifier', () => {
    render(<BarChartVisual visual={base} print />);
    expect(screen.getByRole('img').getAttribute('class')).toContain('visual--print');
  });

  it('a Balkendiagramm with the longest day fits a 375 px phone at its minimum scale', () => {
    render(<BarChartVisual visual={{ ...base, horizontal: true, categories: ['Donnerstag', 'Montag', 'Freitag'], values: [450, 400, 50], axisMax: 500, axisStep: 50 }} />);
    const width = Number(screen.getByRole('img').getAttribute('width'));
    expect(width * 0.7).toBeLessThanOrEqual(311);
  });
});
