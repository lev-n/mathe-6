/**
 * Kästchengitter: filled cells (var(--fill-1)), half cells (diagonal triangles), optional outline of the figure, optional dashed fold line and caption, optional
 * short labels in cells (who sits where). Small grids (up to 4 × 4) are drawn with larger cells, so labels fit. Hand-written SVG.
 * The tint alone is 1.86:1 on an empty cell: without showOutline a thin line edges the filled cells on screen (WCAG 1.4.11), on paper the hatch does.
 */
import { useId } from 'react';
import type { Axis, Cell, VisualOf } from '../../core/types';
import type { VisualProps } from './types';

const SMALL_GRID = 4;
const cellSize = (width: number, height: number) => (width <= SMALL_GRID && height <= SMALL_GRID ? 64 : 32);
const PAD = 14;
const CAPTION_H = 30;

/** Runs of consecutive numbers: [1,2,3,6] → [[1,3],[6,6]]. */
function runs(xs: number[]): [number, number][] {
  const out: [number, number][] = [];
  for (const x of xs) {
    const last = out[out.length - 1];
    if (last && x === last[1] + 1) last[1] = x;
    else out.push([x, x]);
  }
  return out;
}

/** Spoken description row by row (1-based): 'Zeile 2: Spalte 3 bis 5, Spalte 7'. */
export function describeGridCells(cells: readonly Cell[]): string {
  const rows = new Map<number, number[]>();
  for (const [x, y] of cells) {
    if (!rows.has(y)) rows.set(y, []);
    rows.get(y)!.push(x);
  }
  return [...rows.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([y, xs]) => {
      const parts = runs([...new Set(xs)].sort((a, b) => a - b)).map(([a, b]) =>
        a === b ? `Spalte ${a + 1}` : b === a + 1 ? `Spalte ${a + 1} und ${b + 1}` : `Spalte ${a + 1} bis ${b + 1}`,
      );
      return `Zeile ${y + 1}: ${parts.join(', ')}`;
    })
    .join('. ');
}

/** Says only where the line is: on a figure that does not fold, or on a wrong line, it must not sound like an answer. */
function axisText(axis: Axis): string {
  if (axis.orientation === 'vertical') return `Gestrichelte senkrechte Linie zwischen Spalte ${axis.at} und ${axis.at + 1}.`;
  return `Gestrichelte waagerechte Linie zwischen Zeile ${axis.at} und ${axis.at + 1}.`;
}

export function gridAriaLabel(v: VisualOf<'grid'>): string {
  const parts: string[] = [];
  if (v.caption) parts.push(`${v.caption}.`);
  parts.push(`Kästchengitter, ${v.width} Kästchen breit und ${v.height} Kästchen hoch.`);
  parts.push(v.cells.length ? `Angemalt: ${describeGridCells(v.cells)}.` : 'Kein Kästchen ist angemalt.');
  if (v.axis) parts.push(axisText(v.axis));
  return parts.join(' ');
}

/** Boundary segments of the figure, in cell units. */
function outlineSegments(cells: readonly Cell[]): [number, number, number, number][] {
  const count = new Map<string, number>();
  const seg = new Map<string, [number, number, number, number]>();
  const add = (x1: number, y1: number, x2: number, y2: number) => {
    const a = `${x1},${y1}`;
    const b = `${x2},${y2}`;
    const k = a < b ? `${a}|${b}` : `${b}|${a}`;
    count.set(k, (count.get(k) ?? 0) + 1);
    seg.set(k, [x1, y1, x2, y2]);
  };
  const unique = [...new Map(cells.map((c) => [`${c[0]},${c[1]}`, c] as const)).values()];
  for (const [x, y] of unique) {
    add(x, y, x + 1, y);
    add(x + 1, y, x + 1, y + 1);
    add(x, y + 1, x + 1, y + 1);
    add(x, y, x, y + 1);
  }
  return [...count.entries()].filter(([, n]) => n === 1).map(([k]) => seg.get(k)!);
}

export default function GridVisual({ visual, print }: VisualProps<VisualOf<'grid'>>) {
  const rawId = useId();
  const hatchId = `hatch-${rawId.replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const { width, height, cells, axis, showOutline, caption } = visual;
  const CELL = cellSize(width, height);
  const gw = width * CELL;
  const gh = height * CELL;
  const W = gw + 2 * PAD;
  const H = gh + 2 * PAD + (caption ? CAPTION_H : 0);
  const px = (u: number) => PAD + u * CELL;
  const fill = print ? `url(#${hatchId})` : 'var(--fill-1)';

  const axisLine = (() => {
    if (!axis) return null;
    const ext = PAD - 3;
    const vertical = axis.orientation === 'vertical';
    return (
      <line
        x1={vertical ? px(axis.at) : PAD - ext}
        y1={vertical ? PAD - ext : px(axis.at)}
        x2={vertical ? px(axis.at) : PAD + gw + ext}
        y2={vertical ? PAD + gh + ext : px(axis.at)}
        style={{ stroke: print ? 'var(--ink)' : 'var(--focus)', strokeWidth: 3.5, strokeDasharray: '10 6', strokeLinecap: 'round' }}
        data-testid="grid-axis"
      />
    );
  })();

  return (
    <svg
      className="visual visual-grid"
      viewBox={`0 0 ${W} ${H}`}
      width={W}
      height={H}
      role="img"
      aria-label={gridAriaLabel(visual)}
    >
      {print && (
        <defs>
          <pattern id={hatchId} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width="6" height="6" style={{ fill: 'var(--surface)' }} />
            <line x1="0" y1="0" x2="0" y2="6" style={{ stroke: 'var(--ink)', strokeWidth: 1.5 }} />
          </pattern>
        </defs>
      )}
      <rect x={PAD} y={PAD} width={gw} height={gh} style={{ fill: 'var(--surface)' }} />
      {cells.map(([x, y]) => (
        <rect key={`c${x},${y}`} x={px(x)} y={px(y)} width={CELL} height={CELL} style={{ fill }} data-cell={`${x},${y}`} />
      ))}
      <g style={{ stroke: 'var(--grid-line)', strokeWidth: 1 }}>
        {Array.from({ length: width + 1 }, (_, i) => (
          <line key={`v${i}`} x1={px(i)} y1={PAD} x2={px(i)} y2={PAD + gh} />
        ))}
        {Array.from({ length: height + 1 }, (_, i) => (
          <line key={`h${i}`} x1={PAD} y1={px(i)} x2={PAD + gw} y2={px(i)} />
        ))}
      </g>
      {!showOutline && !print && (
        <g data-testid="grid-edge" style={{ stroke: 'var(--primary)', strokeWidth: 2, strokeLinecap: 'round' }}>
          {outlineSegments(cells).map(([x1, y1, x2, y2]) => (
            <line key={`e${x1},${y1},${x2},${y2}`} x1={px(x1)} y1={px(y1)} x2={px(x2)} y2={px(y2)} />
          ))}
        </g>
      )}
      {showOutline && (
        <g style={{ stroke: 'var(--ink)', strokeWidth: 3, strokeLinecap: 'round' }}>
          {outlineSegments(cells).map(([x1, y1, x2, y2]) => (
            <line key={`o${x1},${y1},${x2},${y2}`} x1={px(x1)} y1={px(y1)} x2={px(x2)} y2={px(y2)} />
          ))}
        </g>
      )}
      {axisLine}
      {caption && (
        <text x={W / 2} y={PAD + gh + PAD + 18} textAnchor="middle" style={{ fill: 'var(--text)', fontSize: 18 }}>
          {caption}
        </text>
      )}
    </svg>
  );
}
