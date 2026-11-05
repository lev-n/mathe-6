// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import NetVisual from './NetVisual';

afterEach(cleanup);

const cross: [number, number][] = [[1, 0], [0, 1], [1, 1], [2, 1], [3, 1], [1, 2]];

describe('NetVisual', () => {
  it('describes the net row by row with labels', () => {
    render(<NetVisual visual={{ type: 'net', cells: cross, faces: ['A', 'B', 'C', 'D', 'E', '?'] }} />);
    const label = screen.getByRole('img').getAttribute('aria-label')!;
    expect(label).toBe('Netz aus 6 Quadraten. Zeile 1: Spalte 2 (A). Zeile 2: Spalte 1 (B), Spalte 2 (C), Spalte 3 (D), Spalte 4 (E). Zeile 3: Spalte 2 (Fragezeichen).');
    expect(screen.getByText('A')).toBeTruthy();
  });

});
