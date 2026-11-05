// @vitest-environment jsdom
// The tables of prozent.proportional as they are drawn: every row fills the same columns, whatever its arrows span.
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import VisualView from '../../ui/visuals/Visual';
import { itemsAt } from './test-support';
import { proportionalSkill } from './proportional';

afterEach(cleanup);

/** Columns each row of a table takes, counting the cells of rows above that span into it. */
function columnsPerRow(table: HTMLTableElement): number[] {
  const open: number[] = [];
  return [...table.rows].map((row) => {
    const taken = open.filter((left) => left > 0).length;
    for (let i = open.length - 1; i >= 0; i--) if (--open[i] <= 0) open.splice(i, 1);
    for (const cell of row.cells) if (cell.rowSpan > 1) open.push(cell.rowSpan - 1);
    return taken + row.cells.length;
  });
}

describe('prozent.proportional: tables of Stufe 1', () => {
  it('no row shifts out of its columns', () => {
    for (const ab of [1, 2, 3] as const) {
      for (const ex of itemsAt(proportionalSkill, 1, ab, 10)) {
        const { container } = render(<VisualView visual={ex.visual!} />);
        const table = container.querySelector('table')!;
        const columns = columnsPerRow(table);
        expect(new Set(columns).size, `${ex.key}: ${columns.join(',')}`).toBe(1);
        // the two columns and one arrow column: a second one makes the table wider than a phone
        expect(columns[0], ex.key).toBe(3);
        cleanup();
      }
    }
  });
});
