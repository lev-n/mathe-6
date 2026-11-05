// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import type { ShapeKind } from '../../core/types';
import ShapeVisual from './ShapeVisual';

afterEach(cleanup);

const SHAPES: ShapeKind[] = ['quadrat', 'rechteck', 'dreieck', 'gleichseitiges-dreieck', 'kreis'];

describe('ShapeVisual', () => {
  it.each(SHAPES)('%s: aria-label without the name, and without a word for the out-of-scope right angle', (shape) => {
    render(<ShapeVisual visual={{ type: 'shape', shape }} />);
    const label = screen.getByRole('img').getAttribute('aria-label')!;
    expect(label).toMatch(/^Flache Figur: /);
    expect(label.toLowerCase()).not.toContain(shape.split('-').pop()!);
    expect(label).not.toMatch(/Winkel/);
  });

  it('named: the name only, when a task asks for what the description would state', () => {
    render(<ShapeVisual visual={{ type: 'shape', shape: 'dreieck', named: true }} />);
    expect(screen.getByRole('img').getAttribute('aria-label')).toBe('Flache Figur: ein Dreieck.');
  });

  it('says that a figure is turned', () => {
    render(<ShapeVisual visual={{ type: 'shape', shape: 'quadrat', rotate: 45 }} />);
    expect(screen.getByRole('img').getAttribute('aria-label')).toContain('Die Figur ist gedreht.');
  });

  it.each([['quadrat', 4], ['rechteck', 2], ['gleichseitiges-dreieck', 3], ['sechseck', 6], ['kreis', 2], ['dreieck', 0]] as [ShapeKind, number][])('%s: showAxes draws %i dashed lines, and the label says so', (shape, n) => {
    const { container } = render(<ShapeVisual visual={{ type: 'shape', shape, showAxes: true }} />);
    expect(container.querySelectorAll('[data-testid="shape-axis"]')).toHaveLength(n);
    expect(screen.getByRole('img').getAttribute('aria-label')).toMatch(n === 0 ? /keine Symmetrieachse/ : /Gestrichelt/);
    cleanup();
    const plain = render(<ShapeVisual visual={{ type: 'shape', shape }} />);
    expect(plain.container.querySelectorAll('[data-testid="shape-axis"]')).toHaveLength(0);
  });
});
