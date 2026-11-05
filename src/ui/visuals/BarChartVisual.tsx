/**
 * Säulendiagramm (vertical) or Balkendiagramm (horizontal), hand-written SVG.
 * - Labelled value axis with a grid line at every axisStep; the axis normally starts at 0, or at axisStart on purpose (daten.kritisch, said in the aria-label).
 * - meanLine: the Mittelwert as a dashed line with its value. levelled: the bars levelled to meanLine, with the original heights as dashed outlines (daten.mittelwert).
 * - Bars carry no numbers: reading them is the task. The aria-label lists every value so that
 *   screen-reader users get the same information.
 */
import { fmt } from '../../core/format';
import type { VisualOf } from '../../core/types';
import { READABLE, readableStyle, type VisualProps } from './types';
import './BarChartVisual.css';

type BarChart = VisualOf<'barChart'>;

const PAD = 14;
const CHAR = 10; // approx. width of one character at 18 px
const TITLE_H = 34;

function listDe(items: string[]): string {
  if (items.length <= 1) return items.join('');
  return `${items.slice(0, -1).join(', ')} und ${items[items.length - 1]}`;
}

export function barChartLabel(v: BarChart): string {
  const kind = v.horizontal ? 'Balkendiagramm' : 'Säulendiagramm';
  const values = listDe(v.categories.map((c, i) => `${c} ${fmt(v.values[i])}`));
  const unit = v.valueLabel ? ` ${v.valueLabel}:` : '';
  let text = `${kind} „${v.title}“.${unit} ${values}.`;
  // Said for every chart, so that the sentence alone never answers 'Täuscht das Bild?'.
  text += ` Die Achse beginnt bei ${fmt(v.axisStart ?? 0)}.`;
  if (v.meanLine !== undefined) text += ` Eine gestrichelte Linie zeigt den Mittelwert ${fmt(v.meanLine)}.`;
  if (v.levelled && v.meanLine !== undefined) text += ` Die Säulen sind auf diese Höhe ausgeglichen, die alten Höhen sind gestrichelt.`;
  return text;
}

/** Tick values from 0 to axisMax and how often a label is printed (every k-th tick). */
function ticks(v: BarChart, lengthPx: number, minGap: number) {
  const out: number[] = [];
  for (let t = v.axisStart ?? 0; t <= v.axisMax + 1e-9; t += v.axisStep) out.push(Math.round(t * 1000) / 1000);
  const spacing = lengthPx / Math.max(1, out.length - 1);
  const every = Math.max(1, Math.ceil(minGap / spacing));
  return { list: out, every };
}

function scale(v: BarChart, value: number, lengthPx: number): number {
  const start = v.axisStart ?? 0;
  const clamped = Math.min(Math.max(value, start), v.axisMax);
  return ((clamped - start) / Math.max(1e-9, v.axisMax - start)) * lengthPx;
}

function Vertical({ v, label, cls }: { v: BarChart; label: string; cls: string }) {
  const plotH = 264;
  // Every grid line gets its number as long as the lines are ≥ 20 px apart (≤ 13 lines).
  const tickInfo = ticks(v, plotH, 20);
  const tickW = Math.max(...tickInfo.list.map((t) => fmt(t).length)) * CHAR + 10;
  const unitH = v.valueLabel ? 28 : 0;
  const plotTop = TITLE_H + unitH + 14;
  const left = PAD + tickW;
  // A long label ('Donnerstag') would make the chart wider than a phone: the labels then stand on two rows, so each has the room of two bars.
  const labelW = Math.max(...v.categories.map((c) => c.length)) * CHAR + 16;
  const stagger = labelW > 72;
  const slot = stagger ? Math.max(58, Math.ceil(labelW / 2)) : 72;
  const plotW = slot * v.categories.length;
  const barW = Math.min(52, slot * 0.6);
  const bottom = plotTop + plotH;
  const width = Math.max(left + plotW + PAD + 6 + (v.meanLine !== undefined ? fmt(v.meanLine).length * CHAR + 4 : 0), (v.title.length + 2) * 11 + 2 * PAD);
  const height = bottom + 44 + (stagger ? 22 : 0) + PAD;
  const y = (value: number) => bottom - scale(v, value, plotH);
  return (
    <svg className={cls} style={readableStyle(width, 0.7)} viewBox={`0 0 ${width} ${height}`} width={width} height={height} role="img" aria-label={label}>
      <text className="bc-title" x={width / 2} y={24} textAnchor="middle">
        {v.title}
      </text>
      {v.valueLabel && (
        <text className="bc-unit" x={PAD} y={TITLE_H + 20}>
          {v.valueLabel}
        </text>
      )}
      {tickInfo.list.map((t, i) => (
        <g key={t}>
          <line className="bc-grid" x1={left} x2={left + plotW} y1={y(t)} y2={y(t)} data-testid="bc-grid" />
          {i % tickInfo.every === 0 && (
            <text className="bc-tick" x={left - 8} y={y(t) + 6} textAnchor="end">
              {fmt(t)}
            </text>
          )}
        </g>
      ))}
      {v.values.map((value, i) => {
        const shown = v.levelled && v.meanLine !== undefined ? v.meanLine : value;
        const h = scale(v, shown, plotH);
        const x = left + i * slot + (slot - barW) / 2;
        return <rect key={i} className="bc-bar" x={x} y={bottom - h} width={barW} height={h} data-testid="bc-bar" />;
      })}
      {v.levelled && v.values.map((value, i) => {
        const h = scale(v, value, plotH);
        return <rect key={i} className="bc-old" x={left + i * slot + (slot - barW) / 2} y={bottom - h} width={barW} height={h} data-testid="bc-old" />;
      })}
      {v.meanLine !== undefined && (
        <g data-testid="bc-mean">
          <line className="bc-mean" x1={left} x2={left + plotW} y1={y(v.meanLine)} y2={y(v.meanLine)} />
          <text className="bc-mean-label" x={left + plotW + 4} y={y(v.meanLine) + 6}>{fmt(v.meanLine)}</text>
        </g>
      )}
      <line className="bc-axis" x1={left} x2={left} y1={plotTop - 8} y2={bottom} />
      <line className="bc-axis" x1={left} x2={left + plotW} y1={bottom} y2={bottom} />
      {v.categories.map((c, i) => (
        <text key={c + i} className="bc-cat" x={left + i * slot + slot / 2} y={bottom + 28 + (stagger && i % 2 === 1 ? 22 : 0)} textAnchor="middle">
          {c}
        </text>
      ))}
    </svg>
  );
}

function Horizontal({ v, label, cls }: { v: BarChart; label: string; cls: string }) {
  // Short enough for a 375 px phone at the minimum scale below: no bar starts out of view.
  const plotW = 250;
  const tickInfo = ticks(v, plotW, Math.max(...[v.axisMax].map((t) => fmt(t).length)) * CHAR + 8);
  const catW = Math.max(...v.categories.map((c) => c.length)) * CHAR + 14;
  const left = PAD + catW;
  const rowH = 46;
  const barH = 28;
  const plotTop = TITLE_H + 12;
  const plotH = rowH * v.categories.length;
  const bottom = plotTop + plotH;
  const width = Math.max(left + plotW + PAD + 20, (v.title.length + 2) * 11 + 2 * PAD);
  const height = bottom + 34 + (v.valueLabel ? 30 : 0) + PAD;
  const x = (value: number) => left + scale(v, value, plotW);
  return (
    <svg className={cls} style={readableStyle(width, 0.7)} viewBox={`0 0 ${width} ${height}`} width={width} height={height} role="img" aria-label={label}>
      <text className="bc-title" x={width / 2} y={24} textAnchor="middle">
        {v.title}
      </text>
      {tickInfo.list.map((t, i) => (
        <g key={t}>
          <line className="bc-grid" x1={x(t)} x2={x(t)} y1={plotTop} y2={bottom} data-testid="bc-grid" />
          {i % tickInfo.every === 0 && (
            <text className="bc-tick" x={x(t)} y={bottom + 24} textAnchor="middle">
              {fmt(t)}
            </text>
          )}
        </g>
      ))}
      {v.values.map((value, i) => (
        <rect key={i} className="bc-bar" x={left} y={plotTop + i * rowH + (rowH - barH) / 2} width={scale(v, v.levelled && v.meanLine !== undefined ? v.meanLine : value, plotW)} height={barH} data-testid="bc-bar" />
      ))}
      {v.levelled && v.values.map((value, i) => (
        <rect key={i} className="bc-old" x={left} y={plotTop + i * rowH + (rowH - barH) / 2} width={scale(v, value, plotW)} height={barH} data-testid="bc-old" />
      ))}
      {v.meanLine !== undefined && (
        <g data-testid="bc-mean">
          <line className="bc-mean" x1={x(v.meanLine)} x2={x(v.meanLine)} y1={plotTop} y2={bottom} />
          <text className="bc-mean-label" x={x(v.meanLine)} y={plotTop - 4} textAnchor="middle">{fmt(v.meanLine)}</text>
        </g>
      )}
      <line className="bc-axis" x1={left} x2={left} y1={plotTop} y2={bottom} />
      <line className="bc-axis" x1={left} x2={left + plotW + 8} y1={bottom} y2={bottom} />
      {v.categories.map((c, i) => (
        <text key={c + i} className="bc-cat" x={left - 10} y={plotTop + i * rowH + rowH / 2 + 6} textAnchor="end">
          {c}
        </text>
      ))}
      {v.valueLabel && (
        <text className="bc-unit" x={left + plotW / 2} y={bottom + 54} textAnchor="middle">
          {v.valueLabel}
        </text>
      )}
    </svg>
  );
}

export default function BarChartVisual({ visual, print }: VisualProps<BarChart>) {
  const label = barChartLabel(visual);
  const cls = `visual visual-barchart ${READABLE}${print ? ' visual--print' : ''}`;
  return visual.horizontal ? <Horizontal v={visual} label={label} cls={cls} /> : <Vertical v={visual} label={label} cls={cls} />;
}
