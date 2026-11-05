// @vitest-environment jsdom
import { cleanup, render } from '@testing-library/react';
import { useRef } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import TableVisual from './TableVisual';
import { useScrollStop } from './useScrollStop';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function widths(scrollWidth: number, clientWidth: number) {
  vi.spyOn(HTMLElement.prototype, 'scrollWidth', 'get').mockReturnValue(scrollWidth);
  vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(clientWidth);
}

function Box({ overflow }: { overflow: 'auto' | 'visible' }) {
  const ref = useRef<HTMLDivElement>(null);
  return <div ref={ref} data-testid="box" style={{ overflowX: overflow }} {...useScrollStop(ref, 'Bild')} />;
}

describe('useScrollStop', () => {
  it('a box that overflows and scrolls is a named Tab stop', () => {
    widths(300, 256);
    const box = render(<Box overflow="auto" />).getByTestId('box');
    expect(box.getAttribute('tabindex')).toBe('0');
    expect(box.getAttribute('role')).toBe('group');
    expect(box.getAttribute('aria-label')).toBe('Bild');
  });

  it('a box that fits, or that does not scroll, adds no Tab stop', () => {
    widths(256, 256);
    expect(render(<Box overflow="auto" />).getByTestId('box').getAttribute('tabindex')).toBeNull();
    cleanup();
    widths(300, 256);
    expect(render(<Box overflow="visible" />).getByTestId('box').getAttribute('tabindex')).toBeNull();
  });

  it('the table wrap has no Tab stop in the prerender or while it fits', () => {
    const { container } = render(<TableVisual visual={{ type: 'table', header: ['A', 'B'], rows: [['1', '2']] }} />);
    expect(container.querySelector('.table-visual-wrap')!.getAttribute('tabindex')).toBeNull();
  });
});
