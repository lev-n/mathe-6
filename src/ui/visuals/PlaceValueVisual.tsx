/**
 * Stellenwerttafel with digits, from Hunderter down to Tausendstel (a comma line between E and z).
 * A cell may hold more than one digit (14 ZT is a bundling task). highlight marks one column with a thick frame. A wide table scrolls sideways in its .visual-wrap. Hand-written SVG.
 */
import type { PlaceColumn, VisualOf } from '../../core/types';
import { READABLE, readableStyle, type VisualProps } from './types';

const NAMES: Record<PlaceColumn, string> = {
  H: 'Hunderter', Z: 'Zehner', E: 'Einer', z: 'Zehntel', h: 'Hundertstel', t: 'Tausendstel',
};

const COL_W = 56;
const HEAD_H = 44;
const ROW_H = 60;
const PAD = 4;

/** Spoken description, e.g. 'Stellenwerttafel. Zehner: 3, Einer: 4.' */
export function placeValueAriaLabel(v: VisualOf<'placeValue'>): string {
  const parts = ['Stellenwerttafel.'];
  if (v.highlight) parts.push(`Markiert sind die ${NAMES[v.highlight]}.`);
  v.rows.forEach((row, i) => {
    const cells = v.columns.map((c, j) => {
      const x = row.values[j];
      const name = NAMES[c];
      return x === null || x === undefined ? `${name}: leer` : `${name}: ${x}`;
    });
    const prefix = v.rows.length > 1 ? `Zeile ${i + 1}: ` : '';
    parts.push(`${prefix}${cells.join(', ')}.`);
  });
  return parts.join(' ');
}

export default function PlaceValueVisual({ visual, print }: VisualProps<VisualOf<'placeValue'>>) {
  const { columns, rows, highlight } = visual;
  const W = PAD * 2 + columns.length * COL_W;
  const H = 2 * PAD + HEAD_H + rows.length * ROW_H;
  const colX = (i: number) => PAD + i * COL_W;
  const ink = 'var(--ink)';
  const commaAt = columns.findIndex((c, i) => i > 0 && columns[i - 1] === 'E' && (c === 'z' || c === 'h' || c === 't'));
  const highlightAt = highlight ? columns.indexOf(highlight) : -1;

  return (
    <svg
      className={`visual visual-placevalue${columns.length > 6 ? ` ${READABLE}` : ''}${print ? ' visual--print' : ''}`}
      style={columns.length > 6 ? readableStyle(W, 0.85) : undefined}
      viewBox={`0 0 ${W} ${H}`}
      width={W}
      height={H}
      role="img"
      aria-label={placeValueAriaLabel(visual)}
    >
      {columns.map((c, i) => (
        <g key={c}>
          <rect
            x={colX(i)}
            y={PAD}
            width={COL_W}
            height={HEAD_H}
            style={{ fill: print ? 'var(--surface)' : 'var(--surface-2)', stroke: 'var(--grid-line)', strokeWidth: 1.5 }}
          />
          <text x={colX(i) + COL_W / 2} y={PAD + HEAD_H / 2 + 7} textAnchor="middle" style={{ fill: ink, fontSize: 18, fontWeight: 700 }}>
            {c}
          </text>
        </g>
      ))}
      {rows.map((row, r) => {
        const top = PAD + HEAD_H + r * ROW_H;
        return (
          <g key={r} data-row={r}>
            {columns.map((c, i) => {
              const v = row.values[i];
              return (
                <g key={c}>
                  <rect x={colX(i)} y={top} width={COL_W} height={ROW_H} style={{ fill: 'var(--surface)', stroke: 'var(--grid-line)', strokeWidth: 1.5 }} />
                  {v !== null && v !== undefined && (
                    <text
                      x={colX(i) + COL_W / 2}
                      y={top + ROW_H / 2 + 11}
                      textAnchor="middle"
                      data-cell={`${r}-${c}`}
                      style={{ fill: ink, fontSize: String(v).length > 1 ? 26 : 32, fontFamily: 'var(--font-mono)' }}
                    >
                      {v}
                    </text>
                  )}
                </g>
              );
            })}
          </g>
        );
      })}
      <rect x={PAD} y={PAD} width={columns.length * COL_W} height={H - 2 * PAD} style={{ fill: 'none', stroke: ink, strokeWidth: 2 }} />
      {commaAt > 0 && <line x1={colX(commaAt)} x2={colX(commaAt)} y1={PAD} y2={H - PAD} data-comma-line="" style={{ stroke: ink, strokeWidth: 4 }} />}
      {highlightAt >= 0 && <rect x={colX(highlightAt) + 2} y={PAD + 2} width={COL_W - 4} height={H - 2 * PAD - 4} data-highlight={highlight} style={{ fill: 'none', stroke: ink, strokeWidth: 4, strokeDasharray: '8 4' }} />}
    </svg>
  );
}
