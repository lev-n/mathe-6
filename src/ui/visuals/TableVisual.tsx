/**
 * Tabular data as a semantic HTML <table> with caption (screen readers navigate it natively).
 * The first column holds row labels (<th scope="row">) when the table has a header for it and the column
 * holds labels ('Hund', '1 Heft', '1 + 6'). A first column of plain numbers is data.
 * Placeholders '□' / '?' are drawn as empty boxes; numeric cells are right-aligned with tabular digits.
 * Tables with 5 or more columns are drawn compact, so they fit a 375 px phone.
 * arrows: annotations between two rows, such as ': 3' and '· 5' (LISUM Minitabelle, §6), in a cell at the side of the table that spans those rows. Rows the same arrows use share one side.
 */
import { useRef } from 'react';
import { BOX } from '../../core/format';
import type { VisualOf } from '../../core/types';
import type { VisualProps } from './types';
import { useScrollStop } from './useScrollStop';
import './TableVisual.css';

const NUMERIC = /^[−\-+]?[\d   .,]+(\s?(€|ct|cm|m|min|h|Stück))?$/;

/** Clock times ('7.48', '14.05 Uhr') line up like numbers in tables. */
const CLOCK_TIME = /^\d{1,2}[.:]\d{2}(\s?Uhr)?$/;

export function isNumericCell(text: string): boolean {
  const t = text.trim();
  return NUMERIC.test(t) || CLOCK_TIME.test(t);
}

/** From 5 columns: a Wochentag table with its row heads must fit a 375 px phone (311 px inside the card) without hiding a column. */
const COMPACT_COLUMNS = 5;

const isGap = (text: string) => text.trim() === BOX || text.trim() === '?';

export function hasRowHeaders(header: readonly string[], rows: readonly (readonly string[])[]): boolean {
  if (header.length === 0 || rows.length === 0 || !rows.every((r) => r.length > 1)) return false;
  // A blank cell is no label either.
  return !rows.every((r) => isNumericCell(r[0] ?? '') || isGap(r[0] ?? '') || (r[0] ?? '').trim() === '');
}

function Cell({ text }: { text: string }) {
  if (isGap(text)) {
    return (
      <>
        <span className="table-visual__gap" aria-hidden="true" />
        <span className="visually-hidden">Lücke</span>
      </>
    );
  }
  return <>{text}</>;
}

/** The arrows of a table in words (the cell itself is hidden from screen readers). */
export function tableArrowsText(v: Pick<VisualOf<'table'>, 'arrows'>): string {
  return (v.arrows ?? []).map((a) => ` Von Zeile ${a.from + 1} zu Zeile ${a.to + 1}: ${a.label}.`).join('');
}

type TableArrow = NonNullable<VisualOf<'table'>['arrows']>[number];

/** A bent arrow from the first row of its cell to the last, with its text beside it. */
function ArrowCell({ arrow, side }: { arrow: TableArrow; side: 'left' | 'right' }) {
  const span = Math.abs(arrow.to - arrow.from) + 1;
  const down = arrow.to > arrow.from;
  return (
    <td rowSpan={span} className={`table-visual__arrow table-visual__arrow--${side}`} aria-hidden="true" data-arrow={arrow.label}>
      <span className="table-visual__arrow-body">
        <svg viewBox="0 0 20 60" width="20" height="60" preserveAspectRatio="none" focusable="false">
          <path d={side === 'left' ? 'M18 6 H8 V54 H16' : 'M2 6 H12 V54 H4'} style={{ fill: 'none', stroke: 'var(--ink)', strokeWidth: 2 }} />
          {down
            ? <path d={side === 'left' ? 'M12 49 L19 54 L12 59 Z' : 'M8 49 L1 54 L8 59 Z'} style={{ fill: 'var(--ink)' }} />
            : <path d={side === 'left' ? 'M12 1 L19 6 L12 11 Z' : 'M8 1 L1 6 L8 11 Z'} style={{ fill: 'var(--ink)' }} />}
        </svg>
        <span className="table-visual__arrow-text">{arrow.label}</span>
      </span>
    </td>
  );
}

/** Which arrow, if any, starts its side cell at this body row; `covered` rows have their cell from a row above. */
function arrowAt(arrows: readonly TableArrow[], side: 'left' | 'right', row: number): { arrow?: TableArrow; covered: boolean } {
  const onSide = arrows.filter((a) => (a.side ?? 'left') === side);
  const arrow = onSide.find((a) => Math.min(a.from, a.to) === row);
  const covered = onSide.some((a) => Math.min(a.from, a.to) < row && row <= Math.max(a.from, a.to));
  return { arrow, covered };
}

export default function TableVisual({ visual, print }: VisualProps<VisualOf<'table'>>) {
  const { caption, header, rows } = visual;
  const arrows = visual.arrows ?? [];
  const leftArrows = arrows.some((a) => (a.side ?? 'left') === 'left');
  const rightArrows = arrows.some((a) => a.side === 'right');
  const sideCell = (side: 'left' | 'right', r: number) => {
    const { arrow, covered } = arrowAt(arrows, side, r);
    if (arrow) return <ArrowCell arrow={arrow} side={side} />;
    return covered ? null : <td className="table-visual__arrow table-visual__arrow--none" aria-hidden="true" />;
  };
  const wrapRef = useRef<HTMLDivElement>(null);
  const scrollStop = useScrollStop(wrapRef, 'Tabelle. Mit den Pfeiltasten kannst du sie verschieben.');
  const rowHeaders = hasRowHeaders(header, rows);
  const numericColumn = (i: number) => rows.every((r) => isNumericCell(r[i] ?? '') || isGap(r[i] ?? ''));
  return (
    <div ref={wrapRef} className={`table-visual-wrap${print ? ' table-visual-wrap--print' : ''}`} {...scrollStop}>
      <table className={`table-visual${header.length >= COMPACT_COLUMNS ? ' table-visual--compact' : ''}`} aria-label={caption ? undefined : 'Tabelle'}>
        {caption && <caption>{caption}</caption>}
        {header.length > 0 && (
          <thead>
            <tr>
              {leftArrows && <td className="table-visual__arrow table-visual__arrow--none" aria-hidden="true" />}
              {header.map((h, i) => (
                <th key={i} scope="col" className={(i > 0 || !rowHeaders) && numericColumn(i) ? 'is-num' : undefined}>
                  {h}
                </th>
              ))}
              {rightArrows && <td className="table-visual__arrow table-visual__arrow--none" aria-hidden="true" />}
            </tr>
          </thead>
        )}
        <tbody>
          {rows.map((row, r) => (
            <tr key={r}>
              {leftArrows && sideCell('left', r)}
              {row.map((cell, c) =>
                c === 0 && rowHeaders ? (
                  <th key={c} scope="row">
                    <Cell text={cell} />
                  </th>
                ) : (
                  <td key={c} className={isNumericCell(cell) ? 'is-num' : undefined}>
                    <Cell text={cell} />
                  </td>
                ),
              )}
              {rightArrows && sideCell('right', r)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
