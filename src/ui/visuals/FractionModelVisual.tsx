/**
 * Bruchteil als Streifen, Kreis oder Rechteck (docs/research.md §6). Equal parts unless `unequal`. Shaded parts carry a hatch besides the tint, so colour is not
 * the only signal. refineTo draws finer lines for Erweitern (Vergröbern bzw. Verfeinern). compare draws a second bar aligned under the first, for Erweitern and comparing. A circle starts at
 * 12 o'clock and fills clockwise. The description states parts and shaded parts, not the fraction.
 */
import { useId } from 'react';
import { fmt } from '../../core/format';
import type { VisualOf } from '../../core/types';
import type { VisualProps } from './types';

type Model = VisualOf<'fractionModel'>;

const BAR_W = 300;
const BAR_H = 56;
const RECT_W = 240;
const RECT_H = 120;
const R = 62;
const GAP = 14;

/** Unequal part widths that add up to 1 (a fixed pattern, so the same item always looks the same). */
export function unequalWidths(parts: number): number[] {
  const raw = Array.from({ length: parts }, (_, i) => (i % 3 === 0 ? 2.4 : i % 3 === 1 ? 1 : 1.6));
  const sum = raw.reduce((a, b) => a + b, 0);
  return raw.map((w) => w / sum);
}

/** Rows and columns of a rect model with `parts` cells: as square as the number allows. */
function rectGrid(parts: number): { rows: number; cols: number } {
  let rows = Math.floor(Math.sqrt(parts));
  while (parts % rows !== 0) rows--;
  return { rows, cols: parts / rows };
}

export function fractionModelLabel(v: Model): string {
  const wholes = v.wholes ?? 1;
  const form = v.form === 'bar' ? 'Streifen' : v.form === 'circle' ? 'Kreis' : 'Rechteck';
  const count = wholes > 1 ? `${fmt(wholes)} Ganze als ${form}, jedes` : form;
  const kind = v.unequal ? 'ungleich große Teile' : 'gleich große Teile';
  const refine = v.refineTo ? ` Feinere Linien teilen in ${fmt(v.refineTo)} Teile.` : '';
  const compare = v.compare ? ` Darunter ein gleich langer Streifen mit ${fmt(v.compare.parts)} Teilen, ${v.compare.filled === 1 ? '1 Teil ist' : `${fmt(v.compare.filled)} Teile sind`} gefärbt.` : '';
  return `${count} mit ${fmt(v.parts)} Teilen, ${kind}. ${v.filled === 1 ? '1 Teil ist' : `${fmt(v.filled)} Teile sind`} gefärbt.${refine}${compare}`;
}

function sectorPath(cx: number, cy: number, r: number, i: number, n: number): string {
  if (n === 1) return `M ${cx - r} ${cy} A ${r} ${r} 0 1 1 ${cx + r} ${cy} A ${r} ${r} 0 1 1 ${cx - r} ${cy} Z`;
  const at = (k: number) => {
    const a = ((-90 + (360 * k) / n) * Math.PI) / 180;
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
  };
  const [x1, y1] = at(i);
  const [x2, y2] = at(i + 1);
  return `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${2 * (i + 1 - i) > n ? 1 : 0} 1 ${x2} ${y2} Z`;
}

export default function FractionModelVisual({ visual, print }: VisualProps<Model>) {
  const { form, parts, filled, refineTo, unequal, compare } = visual;
  const wholes = visual.wholes ?? 1;
  const hatch = useId().replace(/[^a-zA-Z0-9]/g, '');
  const stroke = { stroke: 'var(--ink)', strokeWidth: 2 };
  const fine = { stroke: 'var(--ink)', strokeWidth: 1, strokeDasharray: '4 3' };
  const fillOf = (index: number, whole: number) => ((whole * parts + index) < filled ? `url(#${hatch})` : 'var(--surface)');
  const unitW = form === 'bar' ? BAR_W : form === 'rect' ? RECT_W : 2 * R;
  const unitH = form === 'bar' ? BAR_H : form === 'rect' ? RECT_H : 2 * R;
  const vertical = form !== 'circle';
  const W = 4 + (vertical ? unitW : wholes * unitW + (wholes - 1) * GAP);
  const H = 4 + (vertical ? wholes * unitH + (wholes - 1) * GAP : unitH) + (compare ? unitH + GAP : 0);
  const originOf = (w: number) => (vertical ? { x: 2, y: 2 + w * (unitH + GAP) } : { x: 2 + w * (unitW + GAP), y: 2 });

  return (
    <svg className="visual visual-fraction" viewBox={`0 0 ${W} ${H}`} width={W} height={H} role="img" aria-label={fractionModelLabel(visual)} data-form={form}>
      <defs>
        <pattern id={hatch} width={8} height={8} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width={8} height={8} style={{ fill: print ? 'var(--surface)' : 'var(--fill-1)' }} />
          <line x1={0} y1={0} x2={0} y2={8} style={{ stroke: 'var(--ink)', strokeWidth: 1.5 }} />
        </pattern>
      </defs>
      {Array.from({ length: wholes }, (_, w) => {
        const o = originOf(w);
        if (form === 'circle') {
          const cx = o.x + R;
          const cy = o.y + R;
          return (
            <g key={w} data-whole={w}>
              {Array.from({ length: parts }, (_, i) => <path key={i} d={sectorPath(cx, cy, R, i, parts)} data-part={fillOf(i, w).startsWith('url') ? 'filled' : 'empty'} style={{ fill: fillOf(i, w), ...stroke }} />)}
              {refineTo && Array.from({ length: refineTo }, (_, i) => {
                const a = ((-90 + (360 * i) / refineTo) * Math.PI) / 180;
                return <line key={i} x1={cx} y1={cy} x2={cx + R * Math.cos(a)} y2={cy + R * Math.sin(a)} data-refine="" style={fine} />;
              })}
            </g>
          );
        }
        if (form === 'rect' && !unequal) {
          const { rows, cols } = rectGrid(parts);
          const cw = unitW / cols;
          const ch = unitH / rows;
          return (
            <g key={w} data-whole={w}>
              {Array.from({ length: parts }, (_, i) => <rect key={i} x={o.x + (i % cols) * cw} y={o.y + Math.floor(i / cols) * ch} width={cw} height={ch} data-part={fillOf(i, w).startsWith('url') ? 'filled' : 'empty'} style={{ fill: fillOf(i, w), ...stroke }} />)}
              {refineTo && refineTo % cols === 0 && Array.from({ length: refineTo / rows - 1 }, (_, i) => <line key={i} x1={o.x + ((i + 1) * unitW) / (refineTo / rows)} y1={o.y} x2={o.x + ((i + 1) * unitW) / (refineTo / rows)} y2={o.y + unitH} data-refine="" style={fine} />)}
            </g>
          );
        }
        const widths = unequal ? unequalWidths(parts) : Array.from({ length: parts }, () => 1 / parts);
        let x = o.x;
        return (
          <g key={w} data-whole={w}>
            {widths.map((f, i) => {
              const r = <rect key={i} x={x} y={o.y} width={f * unitW} height={unitH} data-part={fillOf(i, w).startsWith('url') ? 'filled' : 'empty'} style={{ fill: fillOf(i, w), ...stroke }} />;
              x += f * unitW;
              return r;
            })}
            {refineTo && Array.from({ length: refineTo - 1 }, (_, i) => <line key={i} x1={o.x + ((i + 1) * unitW) / refineTo} y1={o.y} x2={o.x + ((i + 1) * unitW) / refineTo} y2={o.y + unitH} data-refine="" style={fine} />)}
          </g>
        );
      })}
      {compare && (
        <g data-compare="">
          {Array.from({ length: compare.parts }, (_, i) => (
            <rect key={i} x={2 + (i * unitW) / compare.parts} y={2 + unitH + GAP} width={unitW / compare.parts} height={unitH} data-part={i < compare.filled ? 'filled' : 'empty'} style={{ fill: i < compare.filled ? `url(#${hatch})` : 'var(--surface)', ...stroke }} />
          ))}
        </g>
      )}
    </svg>
  );
}
