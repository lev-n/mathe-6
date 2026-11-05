// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import GridVisual, { describeGridCells } from './GridVisual';

afterEach(cleanup);

describe('GridVisual', () => {
  it('says where a line is and never calls it a Symmetrieachse: it may be a wrong line', () => {
    const { container } = render(<GridVisual visual={{ type: 'grid', width: 4, height: 2, cells: [[0, 0]], axis: { orientation: 'vertical', at: 2 } }} />);
    const label = container.querySelector('svg')!.getAttribute('aria-label')!;
    expect(label).toContain('Gestrichelte senkrechte Linie zwischen Spalte 2 und 3.');
    expect(label).not.toMatch(/Symmetrie|Spiegelachse/);
  });

  it('without an outline, filled cells get an edge on screen: the tint alone is below 3:1 (WCAG 1.4.11)', () => {
    const plain = { type: 'grid', width: 3, height: 2, cells: [[0, 0], [1, 0]] } as const;
    const screenEdge = render(<GridVisual visual={{ ...plain, cells: [...plain.cells] as [number, number][] }} />).container.querySelector('[data-testid="grid-edge"]')!;
    expect(screenEdge.querySelectorAll('line')).toHaveLength(6);
    cleanup();
    expect(render(<GridVisual visual={{ ...plain, cells: [...plain.cells] as [number, number][] }} print />).container.querySelector('[data-testid="grid-edge"]')).toBeNull();
    cleanup();
    expect(render(<GridVisual visual={{ ...plain, cells: [...plain.cells] as [number, number][], showOutline: true }} />).container.querySelector('[data-testid="grid-edge"]')).toBeNull();
  });

  it('renders filled cells, outline and a dashed axis with a German aria-label', () => {
    const { container } = render(
      <GridVisual
        visual={{
          type: 'grid', width: 6, height: 4, cells: [[1, 1], [2, 1], [1, 2]],
          axis: { orientation: 'vertical', at: 3 }, showOutline: true, caption: 'Figur A',
        }}
      />,
    );
    const img = screen.getByRole('img');
    const label = img.getAttribute('aria-label')!;
    expect(label).toContain('Figur A.');
    expect(label).toContain('6 Kästchen breit und 4 Kästchen hoch');
    expect(label).toContain('Zeile 2: Spalte 2 und 3. Zeile 3: Spalte 2');
    expect(label).toContain('senkrechte Linie zwischen Spalte 3 und 4');
    expect(label).not.toMatch(/Symmetrie|Achse/); // the line may be a wrong one, and T11 has no such word
    expect(container.querySelectorAll('[data-cell]')).toHaveLength(3);
    const axis = screen.getByTestId('grid-axis');
    expect(axis.getAttribute('x1')).toBe(String(14 + 3 * 32));
    expect((axis as unknown as SVGElement).style.strokeDasharray).toBeTruthy();
    expect(img.getAttribute('class')).toContain('visual');
    expect(img.getAttribute('viewBox')).toMatch(/^0 0 \d+ \d+$/);
  });

  it('uses only token colours and a hatch pattern in print mode', () => {
    const { container } = render(<GridVisual visual={{ type: 'grid', width: 3, height: 3, cells: [[0, 0]] }} print />);
    expect(container.querySelector('pattern')).toBeTruthy();
    const html = container.innerHTML;
    expect(html).not.toMatch(/#[0-9a-f]{6}\b|rgb\(/i); // colours come from tokens (var(--…))
    expect(html).toContain('var(--ink)');
  });

  it('describes rows with runs', () => {
    expect(describeGridCells([[0, 0], [1, 0], [2, 0], [5, 0], [3, 1]])).toBe('Zeile 1: Spalte 1 bis 3, Spalte 6. Zeile 2: Spalte 4');
  });
});
