/**
 * Ebene Figuren. rotate turns the figure (docs/research.md §6 `geometrie.vierecke`), showAxes draws the symmetry axes as dashed
 * lines. The aria-label describes the figure by its properties (not by its name, so naming tasks stay tasks). sideLabels write texts at the sides, clockwise from the
 * top side. lForm draws an L-form to scale, with its split line when given.
 */
import type { ShapeKind, VisualOf } from '../../core/types';
import type { VisualProps } from './types';

const W = 200;
const H = 160;
const CX = 100;
const CY = 80;
/** Room around the figure for side labels. */
const LABEL_MARGIN = 38;

type P = [number, number];

function regular(n: number, r: number, rotDeg: number): P[] {
  return Array.from({ length: n }, (_, i) => {
    const a = ((rotDeg + (360 / n) * i) * Math.PI) / 180;
    return [Math.round((CX + r * Math.cos(a)) * 10) / 10, Math.round((CY + r * Math.sin(a)) * 10) / 10] as P;
  });
}

const POLYGONS: Record<Exclude<ShapeKind, 'kreis'>, P[]> = {
  trapez: [[15, 130], [185, 130], [145, 35], [55, 35]],
  drachen: [[100, 10], [160, 60], [100, 150], [40, 60]],
  // the default L-form; a lForm spec draws its own measures
  'l-form': [[30, 20], [100, 20], [100, 80], [170, 80], [170, 140], [30, 140]],
  sechseck: regular(6, 70, 0),
  // clearly not a Raute: long sides 140, slanted sides ≈ 81
  parallelogramm: [[10, 115], [150, 115], [190, 45], [50, 45]],
  // clearly slanted (66° and 114°): a Raute that looks like a tilted square would teach the wrong picture
  raute: [[100, 10], [145, 80], [100, 150], [55, 80]],
  quadrat: [[45, 25], [155, 25], [155, 135], [45, 135]],
  rechteck: [[20, 40], [180, 40], [180, 125], [20, 125]],
  dreieck: [[20, 140], [180, 140], [50, 30]],
  'gleichseitiges-dreieck': [[25, 142], [175, 142], [100, 12.1]],
};

const mid = (a: P, b: P): P => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];

/** Symmetry axes as line segments (extended a little beyond the figure). */
function axes(shape: ShapeKind): [P, P][] {
  const ext = (a: P, b: P, k = 0.18): [P, P] => {
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    return [[a[0] - dx * k, a[1] - dy * k], [b[0] + dx * k, b[1] + dy * k]];
  };
  switch (shape) {
    case 'quadrat': {
      const [a, b, c, d] = POLYGONS.quadrat;
      return [ext(mid(a, b), mid(d, c)), ext(mid(a, d), mid(b, c)), ext(a, c, 0.1), ext(b, d, 0.1)];
    }
    case 'rechteck': {
      const [a, b, c, d] = POLYGONS.rechteck;
      return [ext(mid(a, b), mid(d, c)), ext(mid(a, d), mid(b, c), 0.06)];
    }
    case 'gleichseitiges-dreieck': {
      const [a, b, c] = POLYGONS['gleichseitiges-dreieck'];
      return [ext(c, mid(a, b), 0.08), ext(a, mid(b, c), 0.08), ext(b, mid(a, c), 0.08)];
    }
    case 'raute': {
      const [a, b, c, d] = POLYGONS.raute;
      return [ext(a, c, 0.05), ext(d, b, 0.12)];
    }
    case 'trapez':
      // the drawn Trapez is gleichschenklig
      return [ext([CX, 35], [CX, 130], 0.1)];
    case 'drachen': {
      const [a, , c] = POLYGONS.drachen;
      return [ext(a, c, 0.05)];
    }
    case 'sechseck': {
      const p = POLYGONS[shape];
      const n = p.length;
      const out: [P, P][] = [];
      for (let i = 0; i < n / 2; i++) {
        out.push(ext(p[i], p[i + n / 2], 0.08));
        out.push(ext(mid(p[i], p[i + 1]), mid(p[i + n / 2], p[(i + n / 2 + 1) % n]), 0.1));
      }
      return out;
    }
    case 'kreis':
      // A circle has very many axes: two of them stand for all, the label says "einige".
      return [ext([CX, CY - 66], [CX, CY + 66], 0.08), ext([CX - 66, CY], [CX + 66, CY], 0.08)];
    default:
      return [];
  }
}

const DESCRIPTION: Record<ShapeKind, string> = {
  trapez: '4 Ecken, zwei Seiten sind parallel, die anderen beiden nicht',
  drachen: '4 Ecken, je zwei benachbarte Seiten sind gleich lang',
  'l-form': '6 Ecken, wie ein großer Buchstabe L, aus zwei Rechtecken zusammengesetzt',
  quadrat: '4 Ecken, 4 gleich lange Seiten',
  sechseck: '6 Ecken und 6 gleich lange Seiten',
  parallelogramm: '4 Ecken, schief, gegenüberliegende Seiten sind parallel und gleich lang',
  raute: '4 Ecken, 4 gleich lange Seiten, schief',
  rechteck: '4 Ecken, 2 lange und 2 kurze Seiten',
  dreieck: '3 Ecken, alle Seiten sind verschieden lang',
  'gleichseitiges-dreieck': '3 Ecken und 3 gleich lange Seiten',
  kreis: 'ganz rund, ohne Ecken',
};

const NAME: Record<ShapeKind, string> = {
  trapez: 'ein Trapez',
  drachen: 'ein Drachenviereck',
  'l-form': 'eine L-Form',
  quadrat: 'ein Quadrat',
  sechseck: 'ein Sechseck',
  parallelogramm: 'ein Parallelogramm',
  raute: 'eine Raute',
  rechteck: 'ein Rechteck',
  dreieck: 'ein Dreieck',
  'gleichseitiges-dreieck': 'ein Dreieck',
  kreis: 'ein Kreis',
};

/** By its properties, or (named) by its name when a task asks for a property. */
export function shapeAriaLabel(shape: ShapeKind, rotate?: number, named?: boolean, showAxes?: boolean): string {
  let text = `Flache Figur: ${named ? NAME[shape] : DESCRIPTION[shape]}.${rotate ? ' Die Figur ist gedreht.' : ''}`;
  if (showAxes) {
    const n = axes(shape).length;
    if (shape === 'kreis') text += ' Gestrichelt sind 2 von sehr vielen Symmetrieachsen eingezeichnet, beide durch den Mittelpunkt.';
    else if (n === 0) text += ' Die Figur hat keine Symmetrieachse.';
    else text += ` Gestrichelt ${n === 1 ? 'ist 1 Symmetrieachse' : `sind ${n} Symmetrieachsen`} eingezeichnet.`;
  }
  return text;
}

/** The L-form of a lForm spec, to scale inside the picture: bounding box w × h with its top-right corner cut out; clockwise from the top left. */
export function lFormPoints(l: { w: number; h: number; cutW: number; cutH: number }): P[] {
  const unit = Math.min((W - 20) / l.w, (H - 20) / l.h);
  const x0 = (W - l.w * unit) / 2;
  const y0 = (H - l.h * unit) / 2;
  const at = (x: number, y: number): P => [x0 + x * unit, y0 + y * unit];
  return [at(0, 0), at(l.w - l.cutW, 0), at(l.w - l.cutW, l.cutH), at(l.w, l.cutH), at(l.w, l.h), at(0, l.h)];
}

/** The side labels sit outside the figure, at the middle of each side, in clockwise order from the top side. Figures start at a different corner: this maps them. */
function sidesClockwise(shape: ShapeKind, pts: P[]): [P, P][] {
  const n = pts.length;
  const sides = pts.map((p, i): [P, P] => [p, pts[(i + 1) % n]]);
  if (shape === 'l-form') return sides;
  // Polygons in y-down coordinates: make the order clockwise on the screen, starting at the topmost side.
  let area = 0;
  for (const [a, b] of sides) area += a[0] * b[1] - b[0] * a[1];
  const ordered = area > 0 ? sides : sides.map(([a, b]): [P, P] => [b, a]).reverse();
  const midY = (s: [P, P]) => (s[0][1] + s[1][1]) / 2;
  let top = 0;
  ordered.forEach((s, i) => {
    if (midY(s) < midY(ordered[top]) - 1e-9) top = i;
  });
  return [...ordered.slice(top), ...ordered.slice(0, top)];
}

/** A label outside its side (sides run clockwise, so the outside is to their left in reading direction): beside a steep side, above or below a flat one. */
function sideLabelPos(a: P, b: P): { x: number; y: number; anchor: 'start' | 'middle' | 'end' } {
  const m = mid(a, b);
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const len = Math.hypot(dx, dy) || 1;
  const nx = dy / len;
  const ny = -dx / len;
  if (Math.abs(nx) > 0.5) return { x: m[0] + nx * 7, y: m[1] + ny * 7 + 5, anchor: nx > 0 ? 'start' : 'end' };
  return { x: m[0] + nx * 7, y: m[1] + (ny < 0 ? -7 : 19), anchor: 'middle' };
}

export default function ShapeVisual({ visual, print }: VisualProps<VisualOf<'shape'>>) {
  const { shape, rotate, named, showAxes, sideLabels, lForm, split } = visual;
  const points = shape === 'kreis' ? [] : lForm ? lFormPoints(lForm) : POLYGONS[shape];
  const style = {
    fill: print ? 'var(--surface)' : 'var(--fill-1)',
    stroke: 'var(--ink)',
    strokeWidth: 3,
    strokeLinejoin: 'round' as const,
  };
  const labels = sideLabels ?? [];
  const m = labels.some(Boolean) ? LABEL_MARGIN : 0;
  const sides = shape === 'kreis' ? [] : sidesClockwise(shape, points);
  const given = labels.map((t, i) => (t ? `Seite ${i + 1}: ${t}` : '')).filter(Boolean);
  const shapeLabel = `${shapeAriaLabel(shape, rotate, named, showAxes)}${given.length ? ` Die Seiten im Uhrzeigersinn, oben beginnend: ${given.join(', ')}.` : ''}${split ? ` Eine ${split === 'vertical' ? 'senkrechte' : 'waagerechte'} Linie teilt die Figur in zwei Rechtecke.` : ''}`;
  const lSplit = lForm && split ? (split === 'vertical' ? [points[1], [points[1][0], points[4][1]] as P] : [points[3], [points[0][0], points[3][1]] as P]) : null;
  return (
    <svg className="visual visual-shape" viewBox={`${-m} ${-m} ${W + 2 * m} ${H + 2 * m}`} width={W + 2 * m} height={H + 2 * m} role="img" aria-label={shapeLabel} data-shape={shape}>
      {shape === 'kreis' ? (
        <circle cx={CX} cy={CY} r={66} style={style} />
      ) : (
        // A turned figure is drawn a little smaller, so its corners stay inside the picture.
        <g transform={rotate ? `rotate(${rotate} ${CX} ${CY}) translate(${CX} ${CY}) scale(0.72) translate(${-CX} ${-CY})` : undefined}>
          <polygon points={points.map(([x, y]) => `${x},${y}`).join(' ')} style={style} />
        </g>
      )}
      {lSplit && <line x1={lSplit[0][0]} y1={lSplit[0][1]} x2={lSplit[1][0]} y2={lSplit[1][1]} data-testid="shape-split" style={{ stroke: 'var(--ink)', strokeWidth: 2, strokeDasharray: '6 5' }} />}
      {!rotate &&
        labels.map((text, i) => {
          if (!text || !sides[i]) return null;
          const pos = sideLabelPos(sides[i][0], sides[i][1]);
          // At the cut of an L-form two short sides meet: the flat one moves to its far end, or the two labels touch.
          const { x, y, anchor } = shape === 'l-form' && i === 2 ? { ...pos, x: sides[i][1][0], anchor: 'end' as const } : pos;
          return (
            <text key={i} x={x} y={y} textAnchor={anchor} data-side={i} style={{ fill: print ? 'var(--ink)' : 'var(--text)', fontSize: 16 }}>
              {text}
            </text>
          );
        })}
      {showAxes &&
        axes(shape).map(([a, b], i) => (
          <line
            key={i}
            x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]}
            style={{ stroke: print ? 'var(--ink)' : 'var(--focus)', strokeWidth: 2.5, strokeDasharray: '8 6', strokeLinecap: 'round' }}
            data-testid="shape-axis"
          />
        ))}
    </svg>
  );
}
