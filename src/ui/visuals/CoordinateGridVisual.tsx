/**
 * Koordinatensystem (docs/research.md §6, F9): y increases upward, unlike `grid`. Arrowed axes, origin labelled 0, integer labels every labelStep.
 * A cell is drawn 40 units wide. Four quadrants only when a minimum is negative. The axes name Rechtswert and Hochwert
 * on request. polygon draws a closed figure (a Rechteck with its fourth corner, §6). Hand-written SVG; CoordinateAxes and gridGeometry are shared with src/ui/answers/PointInput.tsx.
 */
import { fmt, toSpeech } from '../../core/format';
import type { GridPoint, VisualOf } from '../../core/types';
import { READABLE, readableStyle, type VisualProps } from './types';

export interface GridSpec {
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
  step: number;
  labelStep: number;
  axisNames?: 'xy' | 'rechtsHoch';
}

/** Drawn size of a cell. The margins are as small as the labels allow. A point answer never draws it below 32 px (POINT_SCALE in src/ui/answers/PointInput.tsx), and scrolls in its box instead. */
const CELL = 40;
const ARROW = 14;
const MARGIN = { left: 30, right: 22, top: 24, bottom: 28 };

/** A grid keeps its labels readable on a phone (src/ui/visuals/types.ts) and still fits a 360 px screen whole: a wide one shrinks further, with larger labels. */
const PHONE_ROOM = 296;
const scaleOf = (W: number) => Math.min(0.72, PHONE_ROOM / W);
const labelSizeOf = (W: number) => (scaleOf(W) >= 0.72 ? 16 : Math.ceil(11.6 / scaleOf(W)));

export function gridGeometry(s: GridSpec) {
  const unit = CELL / s.step;
  const W = MARGIN.left + MARGIN.right + (s.xMax - s.xMin) * unit;
  const H = MARGIN.top + MARGIN.bottom + (s.yMax - s.yMin) * unit;
  const x0 = MARGIN.left;
  const yTop = MARGIN.top;
  const xOf = (x: number) => x0 + (x - s.xMin) * unit;
  const yOf = (y: number) => yTop + (s.yMax - y) * unit;
  return { W, H, xOf, yOf, valueAt: (px: number, py: number) => ({ x: s.xMin + (px - x0) / unit, y: s.yMax - (py - yTop) / unit }) };
}

function values(min: number, max: number, step: number): number[] {
  return Array.from({ length: Math.round((max - min) / step) + 1 }, (_, i) => min + i * step);
}

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

export function CoordinateAxes({ spec, points = [], segments, polygon, print }: { spec: GridSpec; points?: GridPoint[]; segments?: [GridPoint, GridPoint][]; polygon?: GridPoint[]; print?: boolean }) {
  const { xOf, yOf, W } = gridGeometry(spec);
  const ink = 'var(--ink)';
  const ox = xOf(clamp(0, spec.xMin, spec.xMax));
  const oy = yOf(clamp(0, spec.yMin, spec.yMax));
  const left = xOf(spec.xMin);
  const right = xOf(spec.xMax);
  const top = yOf(spec.yMax);
  const bottom = yOf(spec.yMin);
  const lines = { stroke: 'var(--grid-line)', strokeWidth: 1 };
  const label = { fill: print ? ink : 'var(--text)', fontSize: labelSizeOf(W), fontVariantNumeric: 'tabular-nums' as const };
  const names = spec.axisNames === 'rechtsHoch' ? ['Rechtswert', 'Hochwert'] : ['x', 'y'];
  return (
    <g data-testid="coordinate-axes">
      {values(spec.xMin, spec.xMax, spec.step).map((x) => (
        <line key={`vx${x}`} x1={xOf(x)} x2={xOf(x)} y1={top} y2={bottom} data-gridline="x" style={lines} />
      ))}
      {values(spec.yMin, spec.yMax, spec.step).map((y) => (
        <line key={`hy${y}`} x1={left} x2={right} y1={yOf(y)} y2={yOf(y)} data-gridline="y" style={lines} />
      ))}
      <line x1={left - ARROW / 2} x2={right + ARROW - 4} y1={oy} y2={oy} data-axis="x" style={{ stroke: ink, strokeWidth: 2.5 }} />
      <polygon points={`${right + ARROW + 4},${oy} ${right + ARROW - 8},${oy - 7} ${right + ARROW - 8},${oy + 7}`} style={{ fill: ink }} />
      <line x1={ox} x2={ox} y1={bottom + ARROW / 2} y2={top - ARROW + 4} data-axis="y" style={{ stroke: ink, strokeWidth: 2.5 }} />
      <polygon points={`${ox},${top - ARROW - 4} ${ox - 7},${top - ARROW + 8} ${ox + 7},${top - ARROW + 8}`} style={{ fill: ink }} />
      {values(spec.xMin, spec.xMax, spec.labelStep).filter((x) => x !== 0).map((x) => (
        <text key={`lx${x}`} x={xOf(x)} y={oy + 20} textAnchor="middle" data-label-x={x} style={label}>{fmt(x)}</text>
      ))}
      {values(spec.yMin, spec.yMax, spec.labelStep).filter((y) => y !== 0).map((y) => (
        <text key={`ly${y}`} x={ox - 8} y={yOf(y) + 5} textAnchor="end" data-label-y={y} style={label}>{fmt(y)}</text>
      ))}
      <text x={ox - 8} y={oy + 20} textAnchor="end" data-origin="" style={label}>0</text>
      <text x={right + ARROW + 4} y={oy - 12} textAnchor="end" style={{ ...label, fontWeight: 700 }}>{names[0]}</text>
      <text x={ox + 12} y={top - ARROW + 8} style={{ ...label, fontWeight: 700 }}>{names[1]}</text>
      {polygon && <polygon points={polygon.map((p) => `${xOf(p.x)},${yOf(p.y)}`).join(' ')} data-polygon="" style={{ fill: print ? 'none' : 'var(--fill-1)', fillOpacity: 0.5, stroke: print ? ink : 'var(--primary)', strokeWidth: 3, strokeLinejoin: 'round' }} />}
      {segments?.map(([a, b], i) => (
        <line key={`s${i}`} x1={xOf(a.x)} y1={yOf(a.y)} x2={xOf(b.x)} y2={yOf(b.y)} data-segment="" style={{ stroke: print ? ink : 'var(--primary)', strokeWidth: 3 }} />
      ))}
      {points.map((p, i) => (
        <g key={`p${i}`} data-point={p.label ?? ''}>
          <circle cx={xOf(p.x)} cy={yOf(p.y)} r={6} style={{ fill: print ? ink : 'var(--primary)', stroke: 'var(--surface)', strokeWidth: 1.5 }} />
          {p.label && (
            // At the right edge the letter goes to the left of its point: the margin is too narrow for it. Beside the axes it keeps clear of their numbers and names.
            <text x={xOf(p.x) + (p.x === spec.xMax || p.x === -1 ? -9 : 9)} y={yOf(p.y) + (p.y === -1 || p.y === spec.yMax ? 24 : -9)} textAnchor={p.x === spec.xMax || p.x === -1 ? 'end' : undefined} style={{ fill: print ? ink : 'var(--text)', fontSize: Math.max(18, labelSizeOf(W)), fontWeight: 700 }}>{p.label}</text>
          )}
        </g>
      ))}
    </g>
  );
}

/**
 * A point as the way from the origin, upright before sideways, not as P(x | y): on a reading task those numbers in that order are the answer, and
 * finding them from the way is what the picture asks of everyone.
 */
function movesFromOrigin({ x, y }: { x: number; y: number }): string {
  const moves = [y !== 0 && `${fmt(Math.abs(y))} nach ${y > 0 ? 'oben' : 'unten'}`, x !== 0 && `${fmt(Math.abs(x))} nach ${x > 0 ? 'rechts' : 'links'}`].filter(Boolean);
  return moves.length ? `vom Ursprung aus ${moves.join(' und ')}` : 'im Ursprung';
}

/** The description names the range and every point: screen readers get the same data as the picture, or they could not read a point off. */
export function coordinateAriaLabel(s: GridSpec & { points?: GridPoint[]; segments?: [GridPoint, GridPoint][]; polygon?: GridPoint[] }): string {
  const axes = s.axisNames === 'rechtsHoch' ? 'Rechtswert nach rechts, Hochwert nach oben' : 'x nach rechts, y nach oben';
  const parts = [`Koordinatensystem, ${axes}. x von ${fmt(s.xMin)} bis ${fmt(s.xMax)}, y von ${fmt(s.yMin)} bis ${fmt(s.yMax)}.`];
  if (s.xMin < 0 || s.yMin < 0) parts.push('Der Ursprung liegt in der Mitte, es gibt vier Quadranten.');
  for (const p of s.points ?? []) parts.push(`${p.label ? `Punkt ${p.label}` : 'Ein Punkt'}: ${movesFromOrigin(p)}.`);
  if (s.segments?.length) parts.push(`${s.segments.length === 1 ? 'Eine Strecke' : `${s.segments.length} Strecken`} zwischen Punkten.`);
  if (s.polygon?.length) parts.push(`Eine Figur mit den Ecken ${s.polygon.map((p) => `${fmt(p.x)} und ${fmt(p.y)}`).join(', ')}.`);
  return toSpeech(parts.join(' '));
}

export default function CoordinateGridVisual({ visual, print }: VisualProps<VisualOf<'coordinateGrid'>>) {
  const { W, H } = gridGeometry(visual);
  return (
    <svg className={`visual visual-coordinate ${READABLE}${print ? ' visual--print' : ''}`} style={readableStyle(W, scaleOf(W))} viewBox={`0 0 ${W} ${H}`} width={W} height={H} role="img" aria-label={coordinateAriaLabel(visual)}>
      <CoordinateAxes spec={visual} points={visual.points} segments={visual.segments} polygon={visual.polygon} print={print} />
    </svg>
  );
}
