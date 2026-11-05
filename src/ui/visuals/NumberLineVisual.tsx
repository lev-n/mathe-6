/**
 * Zahlenstrahl: base line with an arrow, short ticks every minorStep, long ticks every majorStep,
 * labels at every major tick (labelMajor) plus explicit labels, marks (arrows with a letter/text) and jumps
 * (arcs with an arrowhead, Rechenstrich-style).
 * A negative range is a Zahlengerade (arrows 'both', labels with U+2212); `denominator` counts d-ths, never as floats, and labelFormat says how labels are written: stacked, mixed or with a comma.
 * Labels that would overlap are staggered on a second row. Hand-written SVG.
 *
 * NumberLineAxis and the geometry helpers are shared with src/ui/answers/NumberLineInput.tsx.
 */
import { useEffect, useRef, type CSSProperties } from 'react';
import { fmt, fractionWords, toSpeech } from '../../core/format';
import type { LabelFormat, VisualOf } from '../../core/types';
import type { VisualProps } from './types';
import { useScrollStop } from './useScrollStop';
import './NumberLineVisual.css';

export interface AxisSpec {
  min: number;
  max: number;
  majorStep: number;
  minorStep: number;
  labelMajor: boolean;
  labels?: number[];
  /** Arrowheads at both ends (a Zahlengerade); default only at the right end. */
  arrows?: 'right' | 'both';
  /** Values count d-ths: 3 with d = 8 is three eighths, integer positions only, no floats. */
  denominator?: number;
  /** 'fraction': stacked, the default with a denominator. 'mixed': 1 3/4 from 1 on. 'decimal': with the comma, also without a denominator. Integers stay integers. */
  labelFormat?: LabelFormat;
}

/** The parts of a label that is no plain number: the sign, the whole of a mixed number, Zähler and Nenner. */
function stackedParts(a: Pick<AxisSpec, 'denominator' | 'labelFormat'>, v: number): { sign: string; whole?: number; numerator: number; denominator: number } | null {
  const d = a.denominator;
  if (d === undefined || v % d === 0 || a.labelFormat === 'decimal') return null;
  const abs = Math.abs(v);
  const sign = v < 0 ? '\u2212' : '';
  // Not reduced: on a line in quarters a tick is 2/4, as the child counts it.
  if (a.labelFormat === 'mixed' && abs > d) return { sign, whole: Math.floor(abs / d), numerator: abs % d, denominator: d };
  return { sign, numerator: abs, denominator: d };
}

/** The text of a value on the axis, as words for a fraction ('minus drei Viertel' through toSpeech). */
export const axisText = (a: Pick<AxisSpec, 'denominator' | 'labelFormat'>, v: number) => {
  const d = a.denominator;
  const parts = stackedParts(a, v);
  if (!parts) return fmt(d === undefined ? v : v / d);
  return `${parts.sign}${fractionWords(parts.numerator, parts.denominator, parts.whole)}`;
};

/** Width of a label in the axis: a stacked fraction is as wide as its longer part, and a mixed number has its whole beside it. */
function labelText(a: AxisSpec, v: number): string {
  const parts = stackedParts(a, v);
  if (!parts) return axisText(a, v);
  return `${parts.sign}${parts.whole ?? ''}${Math.max(parts.numerator, parts.denominator)}`;
}

/**
 * Geometry (viewBox units = px at the default size), for the number range up to 1000. On screen the line is never drawn
 * narrower than NL_MIN_WIDTH px, so it fits a 375 px phone (311 px inside the card) as it is, with labels ≥ 13 px;
 * narrower containers scroll it sideways (.nl-scroll).
 */
export const NL = { W: 400, PAD: 30, Y: 74, FONT: 18 } as const;
export const NL_MIN_WIDTH = 296; // the room on a 360 px phone: the design floor does not scroll sideways
export function xScale(min: number, max: number): (v: number) => number {
  return (v) => NL.PAD + ((v - min) / (max - min)) * (NL.W - 2 * NL.PAD);
}

/** min, min + step, … max (integer steps, no floating drift). */
export function tickValues(min: number, max: number, step: number): number[] {
  const count = Math.round((max - min) / step);
  return Array.from({ length: count + 1 }, (_, i) => min + i * step).filter((v) => v <= max + 1e-9);
}

export function labelValues(a: AxisSpec): number[] {
  const set = new Set<number>((a.labels ?? []).filter((v) => v >= a.min && v <= a.max));
  if (a.labelMajor) tickValues(a.min, a.max, a.majorStep).forEach((v) => set.add(v));
  return [...set].sort((x, y) => x - y);
}

const textWidth = (s: string) => s.length * NL.FONT * 0.58 + 6;

/**
 * Room beside the line for the outer labels: '10 000 000 000' at the ends is far wider than NL.PAD. The drawing widens by this on both sides, with
 * the scale kept, so a label is never cut at the edge (the line then scrolls sideways on a phone).
 */
export function axisMargin(a: AxisSpec): number {
  const overhang = layoutLabels(a).map((l) => textWidth(labelText(a, l.value)) / 2 - Math.min(l.x, NL.W - l.x));
  return Math.ceil(Math.max(0, ...overhang));
}

/** viewBox, width and scroll style for a drawing of an axis from `top`, with that room. */
export function axisBox(a: AxisSpec, top: number, H: number) {
  const m = axisMargin(a);
  return { m, W: NL.W + 2 * m, viewBox: `${-m} ${top} ${NL.W + 2 * m} ${H}`, scrollStyle: { '--nl-min-width': `${Math.round((NL_MIN_WIDTH * (NL.W + 2 * m)) / NL.W)}px` } as CSSProperties };
}

/** Highest point of a jump arc above its start: leaves room for its label inside the band above the line. */
const ARC_MAX_RISE = 34;

/** Place labels on up to two rows so they never overlap; labels that do not fit are left out. */
export function layoutLabels(a: AxisSpec): { value: number; x: number; row: 0 | 1 }[] {
  const xOf = xScale(a.min, a.max);
  const explicit = new Set(a.labels ?? []);
  const lastRight: [number, number] = [-Infinity, -Infinity];
  const out: { value: number; x: number; row: 0 | 1 }[] = [];
  for (const value of labelValues(a)) {
    const x = xOf(value);
    const w = textWidth(labelText(a, value));
    const left = x - w / 2;
    let row: 0 | 1 | null = left >= lastRight[0] ? 0 : left >= lastRight[1] ? 1 : null;
    if (row === null && explicit.has(value)) row = 1;
    if (row === null) continue;
    lastRight[row] = x + w / 2;
    out.push({ value, x, row });
  }
  return out;
}

/** Height of the drawing for an axis (taller when labels are staggered). */
export function axisHeight(a: AxisSpec): number {
  const base = layoutLabels(a).some((l) => l.row === 1) ? 74 : 52;
  // a stacked label reaches further down than a plain one
  return NL.Y + base + (a.denominator !== undefined && a.labelFormat !== 'decimal' ? 18 : 0);
}

/** A value below the line: plain text, or Zähler over Nenner with a bar. */
function AxisLabel({ axis, value, x, y, colour }: { axis: AxisSpec; value: number; x: number; y: number; colour: string }) {
  const style = { fill: colour, fontSize: NL.FONT, fontVariantNumeric: 'tabular-nums' as const };
  const parts = stackedParts(axis, value);
  if (!parts) {
    return <text x={x} y={y} textAnchor="middle" data-label={value} style={style}>{axisText(axis, value)}</text>;
  }
  const w = textWidth(String(Math.max(parts.numerator, parts.denominator))) / 2;
  const lead = `${parts.sign}${parts.whole ?? ''}`;
  // A sign or a whole stands before the bar, so the bar stays above its tick mark.
  return (
    <g data-label={value}>
      {lead && <text x={x - w - 3} y={y + 6} textAnchor="end" style={style}>{lead}</text>}
      <text x={x} y={y - 4} textAnchor="middle" style={style}>{fmt(parts.numerator)}</text>
      <line x1={x - w} x2={x + w} y1={y + 1} y2={y + 1} style={{ stroke: colour, strokeWidth: 1.5 }} />
      <text x={x} y={y + 18} textAnchor="middle" style={style}>{fmt(parts.denominator)}</text>
    </g>
  );
}

export function NumberLineAxis({ axis, print }: { axis: AxisSpec; print?: boolean }) {
  const xOf = xScale(axis.min, axis.max);
  const majors = new Set(tickValues(axis.min, axis.max, axis.majorStep));
  const ink = 'var(--ink)';
  const x0 = xOf(axis.min);
  const x1 = xOf(axis.max);
  return (
    <g data-testid="numberline-axis">
      <line x1={x0 - (axis.arrows === 'both' ? 19 : 10)} y1={NL.Y} x2={x1 + 19} y2={NL.Y} style={{ stroke: ink, strokeWidth: 2.5 }} />
      {axis.arrows === 'both' && <polygon data-arrow="left" points={`${x0 - 29},${NL.Y} ${x0 - 17},${NL.Y - 7} ${x0 - 17},${NL.Y + 7}`} style={{ fill: ink }} />}
      <polygon points={`${x1 + 29},${NL.Y} ${x1 + 17},${NL.Y - 7} ${x1 + 17},${NL.Y + 7}`} style={{ fill: ink }} />
      {tickValues(axis.min, axis.max, axis.minorStep).map((v) => {
        const major = majors.has(v);
        const h = major ? 15 : 8;
        return <line key={v} x1={xOf(v)} y1={NL.Y - h} x2={xOf(v)} y2={NL.Y + h} data-tick={major ? 'major' : 'minor'} style={{ stroke: ink, strokeWidth: major ? 2.5 : 1.5 }} />;
      })}
      {layoutLabels(axis).map((l) => (
        <AxisLabel key={l.value} axis={axis} value={l.value} x={l.x} y={NL.Y + (l.row === 0 ? 40 : 62)} colour={print ? ink : 'var(--text)'} />
      ))}
    </g>
  );
}

// ─── Accessible description ──────────────────────────────────────────────────

const plural = (k: number, one: string, many: string) => `${k} ${k === 1 ? one : many}`;

/** Where a mark is, in tick counts from the nearest label on its left (never its value). */
export function describeMarkPosition(a: AxisSpec, value: number): string {
  const labels = labelValues(a);
  const ref = [...labels].reverse().find((x) => x <= value) ?? a.min;
  const d = value - ref;
  if (d === 0) return `genau bei ${axisText(a, ref)}`;
  const onTick = Math.abs(d / a.minorStep - Math.round(d / a.minorStep)) < 1e-9;
  if (!onTick) {
    const idx = Math.floor((value - a.min) / a.majorStep);
    const f = (value - a.min - idx * a.majorStep) / a.majorStep;
    const where = f < 0.5 ? 'näher am linken Strich' : f > 0.5 ? 'näher am rechten Strich' : 'in der Mitte';
    return `im ${idx + 1}. Abschnitt von links, ${where}`;
  }
  if (a.majorStep === a.minorStep) return `${plural(Math.round(d / a.minorStep), 'Strich', 'Striche')} rechts von ${axisText(a, ref)}`;
  const big = Math.floor(d / a.majorStep);
  const small = Math.round((d - big * a.majorStep) / a.minorStep);
  const bits = [big > 0 ? plural(big, 'langen Abschnitt', 'lange Abschnitte') : '', small > 0 ? plural(small, 'kleinen Abschnitt', 'kleine Abschnitte') : ''].filter(Boolean);
  return `${bits.join(' und ')} rechts von ${axisText(a, ref)}`;
}

export function numberLineAriaLabel(v: VisualOf<'numberLine'>): string {
  const majors = Math.round((v.max - v.min) / v.majorStep);
  const perMajor = Math.round(v.majorStep / v.minorStep);
  // The empty Rechenstrich has no scale: only the points at the jump ends.
  const empty = majors === 1 && perMajor === 1;
  // (Spoken: axisText gives a stacked label as words and a negative value with U+2212.)
  const gerade = !empty && (v.arrows === 'both' || v.min < 0);
  const it = gerade ? 'sie' : 'ihn';
  const parts = [`${empty ? 'Rechenstrich' : gerade ? 'Zahlengerade' : 'Zahlenstrahl'} von ${axisText(v, v.min)} bis ${axisText(v, v.max)}.`];
  if (!empty) {
    parts.push(
      perMajor > 1 && majors === 1
        ? `Striche teilen ${it} in ${perMajor} gleiche Abschnitte.`
        : perMajor > 1
        ? `Lange Striche teilen ${it} in ${majors} Abschnitte. Jeder Abschnitt hat ${perMajor} kleine Abschnitte.`
        : `Striche teilen ${it} in ${majors} gleiche Abschnitte.`,
    );
  }
  const shown = layoutLabels(v).map((l) => l.value);
  if (shown.length) parts.push(`Beschriftet: ${shown.map((x) => axisText(v, x)).join(', ')}.`);
  for (const m of v.marks ?? []) parts.push(`Pfeil ${m.label}: ${describeMarkPosition(v, m.value)}.`);
  for (const j of v.jumps ?? []) parts.push(`Sprung von ${axisText(v, j.from)} bis ${axisText(v, j.to)}${j.label ? `: ${toSpeech(` ${j.label}`)}` : ''}.`);
  return toSpeech(parts.join(' '));
}

/** A jump as an arc above the line, ending in an arrowhead on the target; wider jumps rise higher (never above the label band). */
function JumpArc({ jump, xOf, colour }: { jump: { from: number; to: number; label?: string }; xOf: (v: number) => number; colour: string }) {
  const x1 = xOf(jump.from);
  const x2 = xOf(jump.to);
  const base = NL.Y - 16;
  const rise = Math.min(ARC_MAX_RISE, 12 + Math.abs(x2 - x1) * 0.45);
  const mx = (x1 + x2) / 2;
  const dir = x2 >= x1 ? 1 : -1;
  return (
    <g data-jump={`${jump.from}-${jump.to}`}>
      <path d={`M ${x1} ${base} Q ${mx} ${base - 2 * rise} ${x2} ${base}`} style={{ fill: 'none', stroke: colour, strokeWidth: 2.5 }} />
      <polygon points={`${x2},${base + 3} ${x2 - dir * 9},${base - 6} ${x2 + dir * 1},${base - 9}`} style={{ fill: colour }} />
      {jump.label && (
        <text x={mx} y={base - rise - 6} textAnchor="middle" style={{ fill: 'var(--text)', fontSize: 16, fontWeight: 700 }}>
          {jump.label}
        </text>
      )}
    </g>
  );
}

export default function NumberLineVisual({ visual, print }: VisualProps<VisualOf<'numberLine'>>) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const scrollStop = useScrollStop(scrollRef, visual.arrows === 'both' ? 'Zahlengerade. Mit den Pfeiltasten kannst du sie verschieben.' : 'Zahlenstrahl. Mit den Pfeiltasten kannst du ihn verschieben.');
  const firstMark = visual.marks?.length ? Math.min(...visual.marks.map((m) => m.value)) : null;
  // A line that scrolls sideways on a narrow screen starts with the first arrow in view (not cut off).
  useEffect(() => {
    const box = scrollRef.current;
    if (!box || firstMark === null || box.scrollWidth <= box.clientWidth + 1) return;
    const svgWidth = box.firstElementChild?.getBoundingClientRect().width ?? 0;
    if (svgWidth <= 0) return;
    const m = axisMargin(visual);
    const px = ((xScale(visual.min, visual.max)(firstMark) + m) / (NL.W + 2 * m)) * svgWidth;
    if (px > box.clientWidth - 48) box.scrollLeft = Math.max(0, px - box.clientWidth / 2);
    // the labels only change with the numbers the effect already reads
  }, [firstMark, visual]);
  // Without arrows and jumps, the empty band above the line (room for their labels) is cropped: on phones that space
  // is needed to keep the task, the answer field and the Ziffernblock on screen together.
  const top = visual.marks?.length || visual.jumps?.length ? 0 : NL.Y - 26;
  const H = axisHeight(visual) - top;
  const box = axisBox(visual, top, H);
  const xOf = xScale(visual.min, visual.max);
  const markColour = print ? 'var(--ink)' : 'var(--primary)';
  const svg = (
    <svg
      className="visual visual-numberline"
      viewBox={box.viewBox}
      width={box.W}
      height={H}
      role="img"
      aria-label={numberLineAriaLabel(visual)}
    >
      <NumberLineAxis axis={visual} print={print} />
      {(visual.jumps ?? []).map((j, i) => (
        <JumpArc key={i} jump={j} xOf={xOf} colour={markColour} />
      ))}
      {(visual.marks ?? []).map((m) => {
        const x = xOf(m.value);
        // The arrow stays on its value; a long label near an end moves inward, so that the picture does not cut it off.
        const half = (m.label.length * 12) / 2;
        return (
          <g key={`${m.value}-${m.label}`} data-mark={m.label}>
            <line x1={x} y1={NL.Y - 50} x2={x} y2={NL.Y - 12} style={{ stroke: markColour, strokeWidth: 3 }} />
            <polygon points={`${x},${NL.Y - 3} ${x - 7},${NL.Y - 15} ${x + 7},${NL.Y - 15}`} style={{ fill: markColour }} />
            <text x={Math.min(NL.W + box.m - half, Math.max(half - box.m, x))} y={NL.Y - 56} textAnchor="middle" style={{ fill: print ? 'var(--ink)' : 'var(--text)', fontSize: 20, fontWeight: 700 }}>
              {m.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
  // On paper the line fits the page; on screen a narrow container scrolls it instead of shrinking the labels.
  return print ? svg : (
    <div className="nl-scroll" style={box.scrollStyle} ref={scrollRef} {...scrollStop}>
      {svg}
    </div>
  );
}
