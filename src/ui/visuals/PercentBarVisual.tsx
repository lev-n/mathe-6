/**
 * Prozentstreifen (docs/research.md §6, [1][17][24]): two parallel scales, percent above and value below, aligned over one bar. The shaded share carries a hatch, so it is not marked by colour
 * alone. unknown draws a □ where the Grundwert, Prozentwert or Prozentsatz belongs; a number that is the task never appears as a label (valueShown).
 */
import { useId } from 'react';
import { BOX, fmt, fmtPercent, toSpeech } from '../../core/format';
import type { VisualOf } from '../../core/types';
import { READABLE, readableStyle, type VisualProps } from './types';

type Bar = VisualOf<'percentBar'>;

const W = 420;
const PAD = 34;
const BAR_H = 46;
const TOP = 34;

/** The label of a tick at `share` (0–1) on the value scale; the end carries the unit, and a value with more than two places stays unlabelled. */
function valueAt(v: Bar, share: number): string | null {
  const value = v.total * share;
  if (Math.abs(value * 100 - Math.round(value * 100)) > 1e-6) return null;
  return fmt(Math.round(value * 100) / 100);
}

const close = (a: number, b: number) => Math.abs(a - b) < 1e-9;

/**
 * What the picture states. Without an unknown both scales carry every label asked for. With one, the value scale must not hand over the answer: it keeps its ends and what the task gives.
 * G: 0, the value at the mark and the □ at 100 %. W: 0, 100 % and the □ at the mark. p: 0, 100 % and the value at the mark, with the □ on the percent scale.
 */
function valueShown(v: Bar, share: number): boolean {
  if (!v.unknown) return true;
  const marked = (v.percent ?? 0) / 100;
  if (v.unknown === 'G') return close(share, 0) || close(share, marked);
  if (v.unknown === 'W') return close(share, 0) || close(share, 1);
  return close(share, 0) || close(share, 1) || close(share, marked);
}

export function percentBarLabel(v: Bar): string {
  const unit = v.unit ? ` ${v.unit}` : '';
  const atMark = v.percent === undefined ? null : valueAt(v, v.percent / 100);
  const parts = [`Prozentstreifen mit ${fmt(v.ticks)} gleich großen Teilen. Oben stehen Prozent, unten Werte.`];
  if (v.unknown !== 'G' && v.labels !== 'percent') parts.push(`100 % sind ${fmt(v.total)}${unit}.`);
  if (v.unknown === 'G') parts.push('Der Wert bei 100 % ist gesucht.');
  if (v.percent !== undefined) {
    if (v.unknown === 'p') parts.push(`Markiert ist ein Teil mit dem Wert ${atMark}${unit}. Sein Prozentsatz ist gesucht.`);
    else parts.push(`Markiert sind ${fmtPercent(v.percent)}.`);
    if (v.unknown === 'W') parts.push('Der Wert des markierten Teils ist gesucht.');
    if (v.unknown === 'G') parts.push(`Der markierte Teil hat den Wert ${atMark}${unit}.`);
  }
  return toSpeech(parts.join(' '));
}

export default function PercentBarVisual({ visual, print }: VisualProps<Bar>) {
  const { percent, ticks, labels, unknown, unit } = visual;
  const hatch = useId().replace(/[^a-zA-Z0-9]/g, '');
  const width = W - 2 * PAD;
  const xOf = (share: number) => PAD + share * width;
  const showPercent = labels !== 'value';
  const showValue = labels !== 'percent';
  const text = { fill: print ? 'var(--ink)' : 'var(--text)', fontSize: 17, fontVariantNumeric: 'tabular-nums' as const };
  const bold = { ...text, fontWeight: 700 };
  const H = TOP + BAR_H + 34;
  const marked = percent === undefined ? 0 : percent / 100;
  // A percent label is about 40 px wide and a part of 10 is 35 px: every second one from 6 parts, and the values from 11.
  const percentOn = (i: number) => i === ticks || i % (ticks > 5 ? 2 : 1) === 0;
  const valueOn = (i: number) => i === ticks || i % (ticks > 10 ? 2 : 1) === 0;
  return (
    <svg className={`visual visual-percent ${READABLE}${print ? ' visual--print' : ''}`} style={readableStyle(W, 0.7)} viewBox={`0 0 ${W} ${H}`} width={W} height={H} role="img" aria-label={percentBarLabel(visual)}>
      <defs>
        <pattern id={hatch} width={8} height={8} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width={8} height={8} style={{ fill: print ? 'var(--surface)' : 'var(--fill-1)' }} />
          <line x1={0} y1={0} x2={0} y2={8} style={{ stroke: 'var(--ink)', strokeWidth: 1.5 }} />
        </pattern>
      </defs>
      <rect x={PAD} y={TOP} width={width} height={BAR_H} style={{ fill: 'var(--surface)', stroke: 'var(--ink)', strokeWidth: 2 }} />
      {marked > 0 && <rect x={PAD} y={TOP} width={marked * width} height={BAR_H} data-marked={percent} style={{ fill: `url(#${hatch})`, stroke: 'var(--ink)', strokeWidth: 2 }} />}
      {Array.from({ length: ticks + 1 }, (_, i) => {
        const share = i / ticks;
        const x = xOf(share);
        const pct = Math.round(share * 1000) / 10;
        const value = valueAt(visual, share);
        const isEnd = i === ticks;
        return (
          <g key={i} data-tick={i}>
            <line x1={x} x2={x} y1={TOP} y2={TOP + BAR_H} style={{ stroke: 'var(--ink)', strokeWidth: 1.5 }} />
            {showPercent && percentOn(i) && !(unknown === 'p' && close(share, marked)) && <text x={x} y={TOP - 8} textAnchor="middle" data-percent={pct} style={text}>{fmtPercent(pct)}</text>}
            {showValue && value !== null && (unknown ? valueShown(visual, share) : valueOn(i)) && (
              <text x={x} y={TOP + BAR_H + 22} textAnchor="middle" data-value={value} style={text}>{`${value}${isEnd && unit ? ` ${unit}` : ''}`}</text>
            )}
            {unknown === 'G' && isEnd && <text x={x} y={TOP + BAR_H + 24} textAnchor="middle" data-unknown="G" style={bold}>{BOX}</text>}
          </g>
        );
      })}
      {unknown === 'W' && percent !== undefined && <text x={xOf(marked)} y={TOP + BAR_H + 24} textAnchor="middle" data-unknown="W" style={bold}>{BOX}</text>}
      {unknown === 'p' && percent !== undefined && <text x={xOf(marked)} y={TOP - 8} textAnchor="middle" data-unknown="p" style={bold}>{BOX}</text>}
    </svg>
  );
}
