/**
 * Quader als Schrägbild (docs/research.md §6, F10): receding edges at 45° and half depth, the usual school convention, sizes to scale. Hidden edges dashed.
 * highlightFace tints a face and adds a hatch, so it is not marked by colour alone. layers and unitCubes draw the unit cubes on the visible faces. cutout takes a box out of the top
 * front right corner, drawn as the three faces it leaves open. schematic adds a line under the drawing: it is not to the numbers shown (§6).
 */
import { useId } from 'react';
import { fmt } from '../../core/format';
import type { VisualOf } from '../../core/types';
import type { VisualProps } from './types';

type Quader = VisualOf<'quader'>;

const MAX_W = 300;
const MAX_H = 220;
/** Room for the labels: a length beside the front face on the left, beside the depth edge on the right, under the front face. */
const PAD = { x: 56, y: 30 };

/** Corners of the Schrägbild. Front face lower left, the depth goes up and to the right. */
export function quaderGeometry(a: number, b: number, c: number) {
  const fullW = a + (b / 2) * Math.SQRT1_2;
  const fullH = c + (b / 2) * Math.SQRT1_2;
  const unit = Math.min(MAX_W / fullW, MAX_H / fullH);
  const dx = (b / 2) * Math.SQRT1_2 * unit;
  const dy = dx;
  const x0 = PAD.x;
  const y0 = PAD.y + dy + c * unit;
  const w = a * unit;
  const h = c * unit;
  return {
    unit, dx, dy,
    W: PAD.x * 2 + w + dx,
    H: PAD.y * 2 + h + dy,
    A: [x0, y0], B: [x0 + w, y0], C: [x0 + w, y0 - h], D: [x0, y0 - h],
    E: [x0 + dx, y0 - dy], F: [x0 + w + dx, y0 - dy], G: [x0 + w + dx, y0 - h - dy], H_: [x0 + dx, y0 - h - dy],
  };
}

const pts = (...p: number[][]) => p.map(([x, y]) => `${x},${y}`).join(' ');

/** The drawing is not to scale, and a task must say so (§6). */
export const SCHEMATIC_NOTE = 'Die Zeichnung ist nicht maßstabsgetreu.';

export function quaderAriaLabel(v: Quader): string {
  const name = v.kind === 'wuerfel' ? 'Würfel' : 'Quader';
  const unit = v.unit ? ` ${v.unit}` : '';
  const parts = [`${name} als Schrägbild.`];
  if (v.showLabels) parts.push(`Breite ${fmt(v.a)}${unit}, Tiefe ${fmt(v.b)}${unit}, Höhe ${fmt(v.c)}${unit}.`);
  if (v.hiddenEdges === 'dashed') parts.push('Die verdeckten Kanten sind gestrichelt.');
  if (v.highlightFace) parts.push(`Markiert ist die Fläche ${v.highlightFace === 'front' ? 'vorne' : v.highlightFace === 'top' ? 'oben' : 'an der Seite'}.`);
  if (v.layers || v.unitCubes) parts.push('Die Würfel der Lagen sind eingezeichnet.');
  if (v.cutout) parts.push(`Aus der Ecke vorne oben rechts fehlt ein Quader, ${fmt(v.cutout.a)}${unit} breit, ${fmt(v.cutout.b)}${unit} tief und ${fmt(v.cutout.c)}${unit} hoch.`);
  if (v.schematic) parts.push(SCHEMATIC_NOTE);
  return parts.join(' ');
}

export default function QuaderVisual({ visual, print }: VisualProps<Quader>) {
  const { a, b, c, unit, showLabels, hiddenEdges, highlightFace, cutout, schematic } = visual;
  const layers = visual.layers || visual.unitCubes;
  const g = quaderGeometry(a, b, c);
  // The corner box, in the same drawing: width to the left of the right edge, height down from the top, depth from the front to the back.
  const cut = cutout && (() => {
    const sx = g.unit * cutout.a;
    const sz = g.unit * cutout.c;
    const sd = (cutout.b / 2) * Math.SQRT1_2 * g.unit;
    const front = [[g.C[0] - sx, g.C[1]], [g.C[0], g.C[1]], [g.C[0], g.C[1] + sz], [g.C[0] - sx, g.C[1] + sz]];
    const back = front.map(([x, y]) => [x + sd, y - sd]);
    return { front, back };
  })();
  const hatch = useId().replace(/[^a-zA-Z0-9]/g, '');
  const u = unit ? ` ${unit}` : '';
  const face = (name: 'front' | 'top' | 'side') => ({
    fill: highlightFace === name ? `url(#${hatch})` : print ? 'var(--surface)' : name === 'front' ? 'var(--surface)' : 'var(--surface-low)',
    stroke: 'var(--ink)',
    strokeWidth: 2.5,
    strokeLinejoin: 'round' as const,
  });
  const thin = { stroke: 'var(--ink)', strokeWidth: 1 };
  const label = { fill: print ? 'var(--ink)' : 'var(--text)', fontSize: 17 };
  const hidden = { stroke: 'var(--ink)', strokeWidth: 2, strokeDasharray: '6 5' };
  const lerp = (p: number[], q: number[], t: number) => [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t];
  const grid = (p: number[], q: number[], r: number[], s: number[], nu: number, nv: number, name: string) => (
    <g key={name} data-layers={name}>
      {Array.from({ length: Math.max(0, nu - 1) }, (_, i) => {
        const t = (i + 1) / nu;
        const m = lerp(p, q, t);
        const n = lerp(s, r, t);
        return <line key={`u${i}`} x1={m[0]} y1={m[1]} x2={n[0]} y2={n[1]} style={thin} />;
      })}
      {Array.from({ length: Math.max(0, nv - 1) }, (_, i) => {
        const t = (i + 1) / nv;
        const m = lerp(p, s, t);
        const n = lerp(q, r, t);
        return <line key={`v${i}`} x1={m[0]} y1={m[1]} x2={n[0]} y2={n[1]} style={thin} />;
      })}
    </g>
  );
  return (
    <svg className="visual visual-quader" viewBox={`0 0 ${g.W} ${g.H + (schematic ? 22 : 0)}`} width={g.W} height={g.H + (schematic ? 22 : 0)} role="img" aria-label={quaderAriaLabel(visual)}>
      <defs>
        <pattern id={hatch} width={8} height={8} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width={8} height={8} style={{ fill: print ? 'var(--surface)' : 'var(--fill-1)' }} />
          <line x1={0} y1={0} x2={0} y2={8} style={{ stroke: 'var(--ink)', strokeWidth: 1.5 }} />
        </pattern>
      </defs>
      <polygon points={pts(g.D, g.C, g.G, g.H_)} data-face="top" style={face('top')} />
      <polygon points={pts(g.B, g.F, g.G, g.C)} data-face="side" style={face('side')} />
      <polygon points={pts(g.A, g.B, g.C, g.D)} data-face="front" style={face('front')} />
      {cut && (
        <g data-testid="quader-cutout">
          {/* the open back, bottom and left side of the corner that is gone */}
          <polygon points={pts(cut.back[0], cut.back[1], cut.back[2], cut.back[3])} style={face('side')} />
          <polygon points={pts(cut.front[3], cut.front[2], cut.back[2], cut.back[3])} style={face('top')} />
          <polygon points={pts(cut.front[0], cut.front[3], cut.back[3], cut.back[0])} style={face('side')} />
        </g>
      )}
      {layers && [grid(g.A, g.B, g.C, g.D, a, c, 'front'), grid(g.D, g.C, g.G, g.H_, a, b, 'top'), grid(g.B, g.F, g.G, g.C, b, c, 'side')]}
      {/* above the faces: a Schrägbild shows the hidden edges through the body */}
      {hiddenEdges === 'dashed' && (
        <g data-testid="quader-hidden">
          <line x1={g.E[0]} y1={g.E[1]} x2={g.A[0]} y2={g.A[1]} style={hidden} />
          <line x1={g.E[0]} y1={g.E[1]} x2={g.F[0]} y2={g.F[1]} style={hidden} />
          <line x1={g.E[0]} y1={g.E[1]} x2={g.H_[0]} y2={g.H_[1]} style={hidden} />
        </g>
      )}
      {showLabels && (
        <g data-testid="quader-labels">
          <text x={(g.A[0] + g.B[0]) / 2} y={g.A[1] + 22} textAnchor="middle" style={label}>{fmt(a)}{u}</text>
          <text x={(g.B[0] + g.F[0]) / 2 + 8} y={(g.B[1] + g.F[1]) / 2 + 10} style={label}>{fmt(b)}{u}</text>
          <text x={g.A[0] - 6} y={(g.A[1] + g.D[1]) / 2 + 5} textAnchor="end" style={label}>{fmt(c)}{u}</text>
        </g>
      )}
      {schematic && <text x={g.W / 2} y={g.H + 14} textAnchor="middle" data-testid="quader-schematic" style={{ ...label, fontSize: 16 }}>{SCHEMATIC_NOTE}</text>}
    </svg>
  );
}
