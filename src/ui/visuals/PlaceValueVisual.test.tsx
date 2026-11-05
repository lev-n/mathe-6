// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import PlaceValueVisual from './PlaceValueVisual';
import type { VisualOf } from '../../core/types';

const digits: VisualOf<'placeValue'> = { type: 'placeValue', columns: ['Z', 'E'], rows: [{ values: [3, null] }] };

describe('PlaceValueVisual', () => {
  it('renders an SVG image with a German aria-label naming every column', () => {
    render(<PlaceValueVisual visual={digits} />);
    const img = screen.getByRole('img');
    expect(img.tagName.toLowerCase()).toBe('svg');
    const label = img.getAttribute('aria-label') ?? '';
    expect(label).toContain('Stellenwerttafel');
    expect(label).toContain('Zehner: 3');
    expect(label).toContain('Einer: leer');
    expect(img.getAttribute('viewBox')).toMatch(/^0 0 \d+ \d+$/);
  });

  it('draws the digits (empty cells stay empty)', () => {
    const { container } = render(<PlaceValueVisual visual={{ ...digits, rows: [{ values: [3, 4] }, { values: [null, 14] }] }} />);
    const shown = [...container.querySelectorAll('[data-cell]')].map((t) => t.textContent);
    expect(shown).toEqual(['3', '4', '14']);
  });

  it('numbers several rows', () => {
    const v: VisualOf<'placeValue'> = { type: 'placeValue', columns: ['Z', 'E'], rows: [{ values: [3, 4] }, { values: [4, 3] }] };
    render(<PlaceValueVisual visual={v} />);
    expect(screen.getByRole('img').getAttribute('aria-label')).toContain('Zeile 2: Zehner: 4, Einer: 3.');
  });
});
