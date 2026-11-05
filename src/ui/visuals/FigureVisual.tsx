/**
 * Figur mit Maßen (docs/research.md §6, F9): a closed figure from its corners, side lengths, a dashed height with a right-angle mark, also outside the figure, marks for parallel and for equal
 * sides, and a circle with its radius or diameter. Covers Parallelogramm, Dreieck, Trapez, Drachen, Raute and Kreis. The picture is drawn to the given units, not to the numbers in its labels.
 */
import { fmt, toSpeech } from '../../core/format';
import type { FigurePoint, VisualOf } from '../../core/types';
import { READABLE, readableStyle, type VisualProps } from './types';

type Figure = VisualOf<'figure'>;

const PAD = 40;

interface Xy {
  x: number;
  y: number;
}

/** The outer normal of a side, for a figure running in either direction: it points away from the centre of the points. */
function outwards(a: Xy, b: Xy, centre: Xy): Xy {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 1;
  const n = { x: dy / len, y: -dx / len };
  const toCentre = (centre.x - (a.x + b.x) / 2) * n.x + (centre.y - (a.y + b.y) / 2) * n.y;
  return toCentre > 0 ? { x: -n.x, y: -n.y } : n;
}

/** A drawn label is about 9.5 units per letter and 18 high. */
const LABEL_W = 9.5;
const LABEL_H = 18;

/** The middle of a side's label: its box keeps a small gap from the side and from a mark across it, also on a steep side, where a text is wider than high. */
function sideLabelAt(a: Xy, b: Xy, n: Xy, label: string): Xy {
  const off = 8 + Math.abs(n.x) * (label.length * LABEL_W) / 2 + Math.abs(n.y) * LABEL_H / 2;
  return { x: (a.x + b.x) / 2 + n.x * off, y: (a.y + b.y) / 2 + n.y * off };
}

const centreOf = (points: readonly Xy[]): Xy => ({ x: points.reduce((s, p) => s + p.x, 0) / points.length, y: points.reduce((s, p) => s + p.y, 0) / points.length });

function bounds(v: Figure) {
  const xs = v.points.map((p) => p.x);
  const ys = v.points.map((p) => p.y);
  if (v.height) {
    xs.push(v.height.to.x);
    ys.push(v.height.to.y);
  }
  if (v.circle) {
    xs.push(v.circle.x - v.circle.r, v.circle.x + v.circle.r);
    ys.push(v.circle.y - v.circle.r, v.circle.y + v.circle.r);
  }
  return { minX: Math.min(...xs), maxX: Math.max(...xs), minY: Math.min(...ys), maxY: Math.max(...ys) };
}

/** The screen reader gets what the picture states: corners by name if any, every side length, the height and the circle. Never a result. */
export function figureAriaLabel(v: Figure): string {
  const parts: string[] = [];
  if (v.points.length > 0) parts.push(`Figur mit ${fmt(v.points.length)} Ecken${v.points.some((p) => p.label) ? `: ${v.points.map((p) => p.label ?? '').join(', ')}` : ''}.`);
  (v.sides ?? []).forEach((text, i) => {
    if (!text) return;
    const a = v.points[i];
    const b = v.points[(i + 1) % v.points.length];
    parts.push(a.label && b.label ? `Seite ${a.label}${b.label}: ${text}.` : `Eine Seite: ${text}.`);
  });
  if (v.height) parts.push(`Die Höhe ist gestrichelt${v.height.outside ? ' und liegt außerhalb der Figur' : ''}${v.height.label ? `: ${v.height.label}` : ''}.`);
  if (v.rightAngles?.length) parts.push(v.rightAngles.length === 1 ? 'Ein rechter Winkel ist markiert.' : `${fmt(v.rightAngles.length)} rechte Winkel sind markiert.`);
  if (v.parallelMarks?.length) parts.push('Parallele Seiten sind markiert.');
  if (v.equalMarks?.length) parts.push('Gleich lange Seiten sind markiert.');
  if (v.circle) parts.push(`Kreis${v.circle.centre ? ` mit Mittelpunkt ${v.circle.centre}` : ''}${v.circle.label ? `, ${v.circle.diameter ? 'Durchmesser' : 'Radius'} ${v.circle.label}` : ''}.`);
  return toSpeech(parts.join(' '));
}

function Corner({ at, from, to, size = 12 }: { at: Xy; from: Xy; to: Xy; size?: number }) {
  const unit = (p: Xy) => {
    const len = Math.hypot(p.x - at.x, p.y - at.y) || 1;
    return { x: (p.x - at.x) / len, y: (p.y - at.y) / len };
  };
  const u = unit(from);
  const w = unit(to);
  const d = `M${at.x + u.x * size} ${at.y + u.y * size} L${at.x + (u.x + w.x) * size} ${at.y + (u.y + w.y) * size} L${at.x + w.x * size} ${at.y + w.y * size}`;
  return <path d={d} data-right-angle="" style={{ fill: 'none', stroke: 'var(--ink)', strokeWidth: 1.5 }} />;
}

/** Chevrons for parallel sides and ticks for equal sides, across the middle of a side. */
function SideMark({ a, b, count, kind }: { a: Xy; b: Xy; count: number; kind: 'parallel' | 'equal' }) {
  const mx = (a.x + b.x) / 2;
  const my = (a.y + b.y) / 2;
  const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
  const t = { x: (b.x - a.x) / len, y: (b.y - a.y) / len };
  const n = { x: -t.y, y: t.x };
  return (
    <g data-side-mark={kind}>
      {Array.from({ length: count }, (_, i) => {
        const o = (i - (count - 1) / 2) * 7;
        const c = { x: mx + t.x * o, y: my + t.y * o };
        const d = kind === 'equal'
          ? `M${c.x - n.x * 7} ${c.y - n.y * 7} L${c.x + n.x * 7} ${c.y + n.y * 7}`
          : `M${c.x - t.x * 5 - n.x * 6} ${c.y - t.y * 5 - n.y * 6} L${c.x + t.x * 2} ${c.y + t.y * 2} L${c.x - t.x * 5 + n.x * 6} ${c.y - t.y * 5 + n.y * 6}`;
        return <path key={i} d={d} style={{ fill: 'none', stroke: 'var(--ink)', strokeWidth: 2 }} />;
      })}
    </g>
  );
}

export default function FigureVisual({ visual, print }: VisualProps<Figure>) {
  const { points, sides, height, rightAngles, parallelMarks, equalMarks, circle } = visual;
  const box = bounds(visual);
  const baseW = box.maxX - box.minX + 2 * PAD;
  const baseH = box.maxY - box.minY + 2 * PAD;
  const at = (p: Xy): Xy => ({ x: p.x - box.minX + PAD, y: p.y - box.minY + PAD });
  const drawn = points.map(at);
  const centre = drawn.length > 0 ? centreOf(drawn) : at({ x: circle?.x ?? 0, y: circle?.y ?? 0 });
  const text = { fill: print ? 'var(--ink)' : 'var(--text)', fontSize: 17, fontWeight: 600 };
  const halo = { ...text, paintOrder: 'stroke', stroke: 'var(--surface)', strokeWidth: 5 } as const;
  const sideOf = (i: number): [Xy, Xy] => [drawn[i], drawn[(i + 1) % drawn.length]];
  const foot = height ? at(height.to) : null;
  const top = height ? drawn[height.from] : null;
  // The base: the side whose line holds the foot and not the top. It gives the right angle and, outside the figure, the base line on to the foot; its nearer end is where that line starts.
  const baseEnd = (() => {
    if (!foot || drawn.length < 2) return null;
    const onLine = (p: Xy, a: Xy, b: Xy) => Math.abs((b.x - a.x) * (p.y - a.y) - (b.y - a.y) * (p.x - a.x)) / (Math.hypot(b.x - a.x, b.y - a.y) || 1) < 1;
    let best: Xy | null = null;
    let dist = Infinity;
    drawn.forEach((a, i) => {
      const b = drawn[(i + 1) % drawn.length];
      if (!onLine(foot, a, b) || (top && onLine(top, a, b))) return;
      for (const p of [a, b]) {
        const d = Math.hypot(p.x - foot.x, p.y - foot.y);
        if (d > 1 && d < dist) {
          best = p;
          dist = d;
        }
      }
    });
    return best as Xy | null;
  })();
  // No side holds the foot: the mark still stands at a right angle to the height.
  const markEnd = baseEnd ?? (foot && top ? { x: foot.x + (top.y - foot.y), y: foot.y - (top.x - foot.x) } : null);
  // The height's text takes the first free place beside its line, clear of the side labels and of the marks across the sides.
  const sideBoxes = (sides ?? []).flatMap((label, i) => {
    if (!label) return [];
    const [a, b] = sideOf(i);
    const c = sideLabelAt(a, b, outwards(a, b, centre), label);
    const w = label.length * LABEL_W;
    return [{ x: c.x - w / 2, y: c.y - LABEL_H / 2, w, h: LABEL_H }];
  });
  const markBoxes = [...(parallelMarks ?? []).flat(), ...(equalMarks ?? []).flat()].map((i) => {
    const [a, b] = sideOf(i);
    return { x: (a.x + b.x) / 2 - 10, y: (a.y + b.y) / 2 - 10, w: 20, h: 20 };
  });
  const heightLabel = (() => {
    if (!height?.label || !foot || !top) return null;
    const w = height.label.length * LABEL_W;
    // Outside the figure the text stands on the far side of the line, off the figure.
    const toRight = height.outside ? foot.x > centre.x : foot.x <= centre.x;
    for (const t of [0.5, 0.3, 0.7]) {
      for (const right of toRight ? [true, false] : [false, true]) {
        const x = top.x + (foot.x - top.x) * t + (right ? 8 : -8);
        const y = top.y + (foot.y - top.y) * t;
        const box = { x: right ? x : x - w, y: y - LABEL_H / 2, w, h: LABEL_H };
        const free = [...sideBoxes, ...markBoxes].every((o) => box.x + box.w < o.x || o.x + o.w < box.x || box.y + box.h < o.y || o.y + o.h < box.y);
        if (free || (t === 0.7 && !right === toRight)) return { x, y: y + 5, anchor: right ? 'start' : 'end', box } as const;
      }
    }
    return null;
  })();
  // A long label beside a steep side may need more room than the padding.
  const labelBoxes = heightLabel ? [...sideBoxes, heightLabel.box] : sideBoxes;
  const left = Math.max(0, ...labelBoxes.map((o) => -o.x));
  const right = Math.max(0, ...labelBoxes.map((o) => o.x + o.w - baseW));
  const W = baseW + left + right;
  return (
    <svg className={`visual visual-figure ${READABLE}${print ? ' visual--print' : ''}`} style={readableStyle(W, 0.75)} viewBox={`${-left} 0 ${W} ${baseH}`} width={W} height={baseH} role="img" aria-label={figureAriaLabel(visual)}>
      {drawn.length > 0 && <polygon points={drawn.map((p) => `${p.x},${p.y}`).join(' ')} data-figure="" style={{ fill: print ? 'none' : 'var(--fill-1)', fillOpacity: print ? undefined : 0.45, stroke: 'var(--ink)', strokeWidth: 2.5, strokeLinejoin: 'round' }} />}
      {circle && (() => {
        const c = at({ x: circle.x, y: circle.y });
        return (
          <g data-circle="">
            <circle cx={c.x} cy={c.y} r={circle.r} style={{ fill: print ? 'none' : 'var(--fill-1)', fillOpacity: print ? undefined : 0.45, stroke: 'var(--ink)', strokeWidth: 2.5 }} />
            <circle cx={c.x} cy={c.y} r={3.5} style={{ fill: 'var(--ink)' }} />
            {circle.centre && <text x={c.x - 10} y={c.y + 20} textAnchor="end" style={text}>{circle.centre}</text>}
            {circle.label && (
              <>
                <line x1={circle.diameter ? c.x - circle.r : c.x} y1={c.y} x2={c.x + circle.r} y2={c.y} data-radius="" style={{ stroke: 'var(--ink)', strokeWidth: 2 }} />
                <text x={circle.diameter ? c.x : c.x + circle.r / 2} y={c.y - 8} textAnchor="middle" style={halo}>{circle.label}</text>
              </>
            )}
          </g>
        );
      })()}
      {height && foot && top && (
        <g data-height={height.outside ? 'outside' : 'inside'}>
          {height.outside && baseEnd && <line x1={baseEnd.x} y1={baseEnd.y} x2={foot.x} y2={foot.y} data-base-line="" style={{ stroke: 'var(--ink)', strokeWidth: 1.5, strokeDasharray: '2 4' }} />}
          <line x1={top.x} y1={top.y} x2={foot.x} y2={foot.y} style={{ stroke: 'var(--ink)', strokeWidth: 2, strokeDasharray: '7 5' }} />
          {markEnd && <Corner at={foot} from={top} to={markEnd} />}
          {heightLabel && <text x={heightLabel.x} y={heightLabel.y} textAnchor={heightLabel.anchor} style={halo}>{height.label}</text>}
        </g>
      )}
      {(rightAngles ?? []).map((i) => (
        <Corner key={`r${i}`} at={drawn[i]} from={drawn[(i + drawn.length - 1) % drawn.length]} to={drawn[(i + 1) % drawn.length]} />
      ))}
      {(parallelMarks ?? []).flatMap((pair, k) => pair.map((i) => {
        const [a, b] = sideOf(i);
        return <SideMark key={`p${k}-${i}`} a={a} b={b} count={k + 1} kind="parallel" />;
      }))}
      {(equalMarks ?? []).flatMap((group, k) => group.map((i) => {
        const [a, b] = sideOf(i);
        return <SideMark key={`e${k}-${i}`} a={a} b={b} count={k + 1} kind="equal" />;
      }))}
      {(sides ?? []).map((label, i) => {
        if (!label) return null;
        const [a, b] = sideOf(i);
        const c = sideLabelAt(a, b, outwards(a, b, centre), label);
        return <text key={`s${i}`} x={c.x} y={c.y + 5} textAnchor="middle" data-side={i} style={halo}>{label}</text>;
      })}
      {points.map((p: FigurePoint, i) => {
        if (!p.label) return null;
        const d = drawn[i];
        const len = Math.hypot(d.x - centre.x, d.y - centre.y) || 1;
        return <text key={`c${i}`} x={d.x + ((d.x - centre.x) / len) * 18} y={d.y + ((d.y - centre.y) / len) * 18 + 6} textAnchor="middle" data-corner={p.label} style={{ ...text, fontWeight: 700 }}>{p.label}</text>;
      })}
    </svg>
  );
}
