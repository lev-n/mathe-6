/**
 * Kreisdiagramm, read only (docs/research.md §6): starts at 12 o'clock and runs clockwise. Each slice has its label on or next to it and a pattern as well as a tint, so colour is never the only
 * signal, and the picture also works in black and white on a worksheet.
 */
import { useId } from 'react';
import { fmt, fmtPercent, toSpeech } from '../../core/format';
import type { PiePattern, VisualOf } from '../../core/types';
import { READABLE, readableStyle, type VisualProps } from './types';

type Pie = VisualOf<'pieChart'>;

const R = 96;
const W = 384;
const H = 320;
const CX = W / 2;
const CY = 172;
/** A line of a label. */
const LINE = 18;

const valueText = (v: Pie, value: number) => (v.showValues === 'percent' ? fmtPercent(value) : v.showValues === 'count' ? fmt(value) : '');

export function pieChartLabel(v: Pie): string {
  const parts = v.slices.map((s) => `${s.label}${v.showValues === 'none' ? '' : ` ${valueText(v, s.value)}`}`);
  return toSpeech(`Kreisdiagramm ${v.title}. Im Uhrzeigersinn von oben: ${parts.join(', ')}.`);
}

function PatternDef({ id, pattern, print }: { id: string; pattern: PiePattern; print?: boolean }) {
  const base = print ? 'var(--surface)' : 'var(--fill-1)';
  const ink = { stroke: 'var(--ink)', strokeWidth: 1.4 };
  return (
    <pattern id={id} width={10} height={10} patternUnits="userSpaceOnUse">
      <rect width={10} height={10} style={{ fill: pattern === 'none' ? 'var(--surface)' : base }} />
      {pattern === 'solid' && <rect width={10} height={10} style={{ fill: print ? 'var(--surface-high)' : 'var(--fill-2, var(--fill-1))' }} />}
      {pattern === 'lines' && <path d="M0 10 L10 0" style={ink} />}
      {pattern === 'dots' && <circle cx={5} cy={5} r={1.8} style={{ fill: 'var(--ink)' }} />}
      {pattern === 'cross' && <path d="M0 5 H10 M5 0 V10" style={ink} />}
      {pattern === 'waves' && <path d="M0 5 Q2.500 1 5 5 T10 5" style={{ ...ink, fill: 'none' }} />}
    </pattern>
  );
}

export default function PieChartVisual({ visual, print }: VisualProps<Pie>) {
  const prefix = useId().replace(/[^a-zA-Z0-9]/g, '');
  const total = visual.slices.reduce((n, s) => n + s.value, 0);
  const at = (share: number, r: number) => {
    const a = -Math.PI / 2 + share * 2 * Math.PI;
    return { x: CX + r * Math.cos(a), y: CY + r * Math.sin(a) };
  };
  let from = 0;
  const text = { fill: print ? 'var(--ink)' : 'var(--text)', fontSize: 17 };
  return (
    <svg className={`visual visual-pie ${READABLE}${print ? ' visual--print' : ''}`} style={readableStyle(W, 0.68)} viewBox={`0 0 ${W} ${H}`} width={W} height={H} role="img" aria-label={pieChartLabel(visual)}>
      <defs>
        {visual.slices.map((s) => (
          <PatternDef key={s.pattern} id={`${prefix}${s.pattern}`} pattern={s.pattern} print={print} />
        ))}
      </defs>
      <text x={CX} y={22} textAnchor="middle" style={{ ...text, fontSize: 18, fontWeight: 700 }}>{visual.title}</text>
      {visual.slices.map((s) => {
        const share = s.value / total;
        const start = at(from, R);
        const end = at(from + share, R);
        const middle = from + share / 2;
        const rim = at(middle, R + 12);
        const right = rim.x >= CX;
        const value = visual.showValues === 'none' ? '' : valueText(visual, s.value);
        // The block of text stands off the rim in the direction of the slice: under the circle at the bottom, over it at the top, centred at the sides. 13 is the height of the first line above its baseline.
        const block = value ? 2 * LINE : LINE;
        const labelY = rim.y + ((rim.y - CY) / (R + 12) - 1) * (block / 2) + 13;
        from += share;
        return (
          <g key={s.label} data-slice={s.label}>
            {share >= 1 ? (
              <circle cx={CX} cy={CY} r={R} style={{ fill: `url(#${prefix}${s.pattern})`, stroke: 'var(--ink)', strokeWidth: 2 }} />
            ) : (
              <path d={`M${CX} ${CY} L${start.x} ${start.y} A${R} ${R} 0 ${share > 0.5 ? 1 : 0} 1 ${end.x} ${end.y} Z`} data-pattern={s.pattern} style={{ fill: `url(#${prefix}${s.pattern})`, stroke: 'var(--ink)', strokeWidth: 2, strokeLinejoin: 'round' }} />
            )}
            {/* Label and value on two lines, so that the picture fits an answer option on a phone (a tspan is no gap for a screen reader: the svg has its own label). */}
            <text x={rim.x} y={labelY} textAnchor={right ? 'start' : 'end'} style={{ ...text, fontWeight: 600, paintOrder: 'stroke', stroke: 'var(--surface)', strokeWidth: 4 }}>
              {s.label}
              {value && <tspan x={rim.x} dy={LINE}> {value}</tspan>}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
