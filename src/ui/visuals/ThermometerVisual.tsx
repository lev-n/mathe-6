/**
 * Thermometer, a vertical Zahlengerade (docs/research.md §6, BM; F6): ticks every step, labels every second tick at most, zero drawn thicker. marker names the level;
 * change draws an arrow from the level. The level is part of the picture: the description gives it, so a screen reader can read it off too.
 */
import { fmt, fmtTemp, toSpeech } from '../../core/format';
import type { VisualOf } from '../../core/types';
import type { VisualProps } from './types';

type Thermometer = VisualOf<'thermometer'>;

const W = 180;
const TOP = 34;
const TICK_H = 22;
const BULB = 18;
const TUBE_X = 70;
const TUBE_W = 14;

export function thermometerGeometry(v: Pick<Thermometer, 'min' | 'max' | 'step'>) {
  const count = Math.round((v.max - v.min) / v.step);
  const tickH = Math.max(12, Math.min(TICK_H, 300 / count));
  const bottom = TOP + count * tickH;
  return { count, tickH, bottom, H: bottom + 2 * BULB + 10, yOf: (value: number) => bottom - ((value - v.min) / v.step) * tickH };
}

export function thermometerLabel(v: Thermometer): string {
  // In ticks from the lower end, never from the 0 or as the value: reading it off can be the task, and with one degree per tick a count from the 0 would state it.
  const ticks = Math.round((v.value - v.min) / v.step);
  const level = ticks === 0 ? 'am unteren Ende' : `${ticks} ${ticks === 1 ? 'Strich' : 'Striche'} über dem unteren Ende`;
  const parts = [`Thermometer von ${fmtTemp(v.min)} bis ${fmtTemp(v.max)}, ein Strich sind ${fmt(v.step)} Grad.`, `Die Säule steht ${level}.`];
  if (v.change !== undefined) parts.push(`Ein Pfeil geht von dort ${v.change >= 0 ? 'nach oben' : 'nach unten'}, um ${fmt(Math.abs(v.change))} Grad.`);
  return toSpeech(parts.join(' '));
}

export default function ThermometerVisual({ visual, print }: VisualProps<Thermometer>) {
  const { min, max, step, value, change } = visual;
  const g = thermometerGeometry(visual);
  const ink = 'var(--ink)';
  // The ticks sit outside the tube, so the edge of the column is the reading: ≥ 3:1 on the white tube (WCAG 1.4.11), on paper too.
  const liquid = print ? ink : 'var(--fill-strong)';
  const labelEvery = g.tickH >= 20 ? 1 : g.tickH >= 14 ? 2 : 5;
  const cx = TUBE_X + TUBE_W / 2;
  const level = g.yOf(value);
  const ticks = Array.from({ length: g.count + 1 }, (_, i) => min + i * step);
  const labelled = (t: number) => Math.round((t - min) / step) % labelEvery === 0 || t === 0;
  return (
    <svg className="visual visual-thermometer" viewBox={`0 0 ${W} ${g.H}`} width={W} height={g.H} role="img" aria-label={thermometerLabel(visual)}>
      <rect x={TUBE_X} y={TOP - 8} width={TUBE_W} height={g.bottom - TOP + 8 + BULB} rx={TUBE_W / 2} style={{ fill: 'var(--surface)', stroke: ink, strokeWidth: 2 }} />
      <rect x={TUBE_X + 3} y={level} width={TUBE_W - 6} height={g.bottom + BULB - level} data-testid="thermo-level" style={{ fill: liquid }} />
      <circle cx={cx} cy={g.bottom + BULB} r={BULB - 2} style={{ fill: liquid, stroke: ink, strokeWidth: 2 }} />
      {ticks.map((t) => {
        const y = g.yOf(t);
        const zero = t === 0;
        return (
          <g key={t}>
            <line x1={TUBE_X + TUBE_W} x2={TUBE_X + TUBE_W + (zero ? 18 : 10)} y1={y} y2={y} data-tick={t} style={{ stroke: ink, strokeWidth: zero ? 3 : 1.5 }} />
            {labelled(t) && (
              <text x={TUBE_X - 8} y={y + 5} textAnchor="end" data-label={t} style={{ fill: print ? ink : 'var(--text)', fontSize: 16, fontWeight: zero ? 700 : 400, fontVariantNumeric: 'tabular-nums' }}>{fmt(t)}</text>
            )}
          </g>
        );
      })}
      <text x={TUBE_X - 8} y={TOP - 14} textAnchor="end" style={{ fill: print ? ink : 'var(--text)', fontSize: 16 }}>°C</text>
      {change !== undefined && change !== 0 && (() => {
        const toY = g.yOf(Math.min(max, Math.max(min, value + change)));
        const x = TUBE_X + TUBE_W + 18;
        const d = change > 0 ? 1 : -1;
        return (
          <g data-testid="thermo-change">
            <line x1={x} x2={x} y1={level} y2={toY + d * 8} style={{ stroke: ink, strokeWidth: 3 }} />
            <polygon points={`${x},${toY} ${x - 6},${toY + d * 11} ${x + 6},${toY + d * 11}`} style={{ fill: ink }} />
          </g>
        );
      })()}
    </svg>
  );
}
