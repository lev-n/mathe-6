// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import RulerVisual from './RulerVisual';

afterEach(cleanup);

describe('RulerVisual', () => {
  it('renders cm labels 0…maxCm with one tick per mm', () => {
    render(<RulerVisual visual={{ type: 'ruler', maxCm: 10, startMm: 0, lengthMm: 70 }} />);
    const svg = screen.getByRole('img');
    const nums = [...svg.querySelectorAll('.rl-num')].map((t) => t.textContent);
    expect(nums).toEqual(['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10']);
    expect(svg.querySelectorAll('.rl-tick')).toHaveLength(101);
    expect(svg.getAttribute('aria-label')).toBe('Lineal von 0 bis 10 cm. Ein Streifen beginnt bei 0 cm und endet bei 7 cm.');
  });

  it('draws the bar exactly from start to end (2.8 px per mm), and names a position in cm and mm', () => {
    render(<RulerVisual visual={{ type: 'ruler', maxCm: 12, startMm: 20, lengthMm: 35 }} />);
    const bar = screen.getByTestId('ruler-bar');
    expect(Number(bar.getAttribute('width'))).toBeCloseTo(35 * 2.8);
    expect(Number(bar.getAttribute('x'))).toBeCloseTo(18 + 20 * 2.8);
    expect(screen.getByRole('img').getAttribute('aria-label')).toContain('endet bei 5 cm 5 mm.');
  });

  it('labels every 2nd cm on a long ruler, which still fits a 375 px phone at its minimum scale', () => {
    render(<RulerVisual visual={{ type: 'ruler', maxCm: 20, startMm: 0, lengthMm: 150 }} />);
    const svg = screen.getByRole('img');
    expect([...svg.querySelectorAll('.rl-num')]).toHaveLength(11);
    expect(Number(svg.getAttribute('width')) * 0.72).toBeLessThanOrEqual(311);
  });

  it('supports print mode', () => {
    render(<RulerVisual visual={{ type: 'ruler', maxCm: 15, startMm: 0, lengthMm: 100 }} print />);
    expect(screen.getByRole('img').getAttribute('class')).toContain('visual--print');
  });
});
