/**
 * Winkel (docs/research.md §6, F8): arm lengths are independent of the opening. Over 180° the larger arc is drawn. The Geodreieck draws the half-circle
 * scale with both directions 0–180, zero on the first arm and its centre on the vertex; toolOffset misplaces it on purpose, only for a Fehlerdetektiv item.
 * AngleDrawing and angleGeometry are exported for reuse.
 */
import { toSpeech } from '../../core/format';
import type { VisualOf } from '../../core/types';
import type { VisualProps } from './types';

/** Centre and arm length of the drawing, in viewBox units. */
export const ANGLE = { CX: 170, CY: 170, R: 130, ARC: 42 } as const;

const rad = (d: number) => (d * Math.PI) / 180;
const pointAt = (deg: number, r: number) => ({ x: ANGLE.CX + r * Math.cos(rad(deg)), y: ANGLE.CY - r * Math.sin(rad(deg)) });

/**
 * The picture around the sweep from baseRotation, with room for labels: an angle does not keep the empty rest of the circle. x0 and y0: its top left in viewBox units.
 * directionAt: the direction of a point of the picture (px from its top left), counterclockwise from the positive x-axis; null at the vertex itself.
 */
export function angleGeometry(baseRotation = 0, sweep = 360) {
  const pad = 30;
  const dirs = [baseRotation, baseRotation + sweep];
  for (let d = Math.ceil(baseRotation / 90) * 90; d <= baseRotation + sweep; d += 90) dirs.push(d);
  const pts = dirs.map((d) => pointAt(d, ANGLE.R));
  const x0 = Math.floor(Math.min(ANGLE.CX, ...pts.map((p) => p.x))) - pad;
  const y0 = Math.floor(Math.min(ANGLE.CY, ...pts.map((p) => p.y))) - pad;
  const W = Math.ceil(Math.max(ANGLE.CX, ...pts.map((p) => p.x))) + pad - x0;
  const H = Math.ceil(Math.max(ANGLE.CY, ...pts.map((p) => p.y))) + pad - y0;
  return {
    W,
    H,
    x0,
    y0,
    viewBox: `${x0} ${y0} ${W} ${H}`,
    directionAt(x: number, y: number): number | null {
      const dx = x + x0 - ANGLE.CX;
      const dy = ANGLE.CY - (y + y0);
      if (dx * dx + dy * dy < 100) return null;
      return ((Math.atan2(dy, dx) * 180) / Math.PI + 360) % 360;
    },
  };
}

function arcPath(from: number, sweep: number, r: number): string {
  const a = pointAt(from, r);
  const b = pointAt(from + sweep, r);
  const large = sweep > 180 ? 1 : 0;
  return `M ${a.x} ${a.y} A ${r} ${r} 0 ${large} 0 ${b.x} ${b.y}`;
}

/** The half-circle scale: both directions 0–180, a tick every 1°, longer ones every 5° and 10°. Its numbers are GeodreieckNumbers. */
function Geodreieck({ baseRotation, offset, print }: { baseRotation: number; offset?: { x: number; y: number }; print?: boolean }) {
  const ink = 'var(--ink)';
  const R = GEO_R;
  const dx = offset?.x ?? 0;
  const dy = offset?.y ?? 0;
  return (
    <g data-testid="geodreieck" transform={`translate(${dx} ${dy})`} style={{ pointerEvents: 'none' }}>
      <path d={`${arcPath(baseRotation, 180, R)} Z`} style={{ fill: print ? 'none' : 'var(--primary-soft)', fillOpacity: 0.5, stroke: ink, strokeWidth: 1.5 }} />
      {Array.from({ length: 181 }, (_, d) => d).map((d) => {
        const size = d % 10 === 0 ? 12 : d % 5 === 0 ? 8 : 4;
        const a = pointAt(baseRotation + d, R);
        const b = pointAt(baseRotation + d, R - size);
        return <line key={d} x1={a.x} y1={a.y} x2={b.x} y2={b.y} style={{ stroke: ink, strokeWidth: d % 10 === 0 ? 1.5 : 0.75 }} />;
      })}
      <circle cx={ANGLE.CX} cy={ANGLE.CY} r={3} style={{ fill: ink }} />
    </g>
  );
}

const GEO_R = 128;

/**
 * Both numbers every 20°, drawn after the arms with a halo: an arm over a number would strike out the very number the child has to read. The two
 * rings stand far enough apart that upright numbers stay apart where a radius runs near horizontal.
 */
function GeodreieckNumbers({ baseRotation, offset, highlight }: { baseRotation: number; offset?: { x: number; y: number }; highlight?: 'inner' | 'outer' }) {
  const style = { fill: 'var(--ink)', fontSize: 14, stroke: 'var(--surface)', strokeWidth: 3, paintOrder: 'stroke' } as const;
  // highlightScale (§6): the scale to read gets heavier numbers and a line under them, the other one steps back; never colour alone.
  const ring = (which: 'inner' | 'outer') => (!highlight ? style : highlight === which ? { ...style, fontSize: 16, fontWeight: 800 } : { ...style, fillOpacity: 0.55 });
  const line = highlight === 'outer' ? GEO_R - 12 : GEO_R - 42;
  return (
    <g transform={`translate(${offset?.x ?? 0} ${offset?.y ?? 0})`} style={{ pointerEvents: 'none' }}>
      {highlight && <path d={arcPath(baseRotation, 180, line)} data-highlight-scale={highlight} style={{ fill: 'none', stroke: 'var(--ink)', strokeWidth: 3 }} />}
      {Array.from({ length: 10 }, (_, i) => i * 20).map((d) => {
        // The numbers at the ends stand a little above the arm that lies there.
        const at = baseRotation + Math.min(174, Math.max(6, d));
        const inner = pointAt(at, GEO_R - 24);
        const outer = pointAt(at, GEO_R - 54);
        return (
          <g key={d} data-scale={d}>
            <text x={inner.x} y={inner.y + 5} textAnchor="middle" data-ring="outer" style={ring('outer')}>{d}</text>
            <text x={outer.x} y={outer.y + 5} textAnchor="middle" data-ring="inner" style={ring('inner')}>{180 - d}</text>
          </g>
        );
      })}
    </g>
  );
}

type DrawingState = 'set' | 'wrong' | 'right' | 'solution';

export function AngleDrawing({
  degrees, baseRotation, arm1, arm2, showArc, labels, tool, toolOffset, highlightScale, state, print,
}: {
  degrees: number;
  baseRotation: number;
  arm1: number;
  arm2: number;
  showArc: boolean;
  labels?: VisualOf<'angle'>['labels'];
  tool?: 'none' | 'geodreieck';
  toolOffset?: { x: number; y: number };
  highlightScale?: 'inner' | 'outer';
  state?: DrawingState;
  print?: boolean;
}) {
  const ink = 'var(--ink)';
  const moving = state === 'wrong' ? 'var(--retry)' : state === 'right' || state === 'solution' ? 'var(--ok)' : state === 'set' ? 'var(--primary)' : ink;
  const a = pointAt(baseRotation, ANGLE.R * arm1);
  const b = pointAt(baseRotation + degrees, ANGLE.R * arm2);
  const mid = pointAt(baseRotation + degrees / 2, ANGLE.ARC + 18);
  const text = { fill: print ? ink : 'var(--text)', fontSize: 18, fontWeight: 700 };
  const lab1 = pointAt(baseRotation, ANGLE.R * arm1 + 14);
  const lab2 = pointAt(baseRotation + degrees, ANGLE.R * arm2 + 14);
  return (
    <g data-testid="angle">
      {tool === 'geodreieck' && <Geodreieck baseRotation={baseRotation} offset={toolOffset} print={print} />}
      {showArc && degrees > 0 && (
        <path d={degrees >= 360 ? `${arcPath(baseRotation, 359.9, ANGLE.ARC)}` : arcPath(baseRotation, degrees, ANGLE.ARC)} data-arc={degrees > 180 ? 'large' : 'small'} style={{ fill: 'none', stroke: moving, strokeWidth: 2.5 }} />
      )}
      <line x1={ANGLE.CX} y1={ANGLE.CY} x2={a.x} y2={a.y} data-arm="1" style={{ stroke: ink, strokeWidth: 3.5, strokeLinecap: 'round' }} />
      {arm2 > 0 && <line x1={ANGLE.CX} y1={ANGLE.CY} x2={b.x} y2={b.y} data-arm="2" style={{ stroke: moving, strokeWidth: 3.5, strokeLinecap: 'round' }} />}
      {tool === 'geodreieck' && <GeodreieckNumbers baseRotation={baseRotation} offset={toolOffset} highlight={highlightScale} />}
      <circle cx={ANGLE.CX} cy={ANGLE.CY} r={4.5} style={{ fill: ink }} />
      {labels?.vertex && <text x={ANGLE.CX - 14} y={ANGLE.CY + 20} textAnchor="middle" style={text}>{labels.vertex}</text>}
      {labels?.arm1 && <text x={lab1.x} y={lab1.y + 6} textAnchor="middle" style={text}>{labels.arm1}</text>}
      {labels?.arm2 && <text x={lab2.x} y={lab2.y + 6} textAnchor="middle" style={text}>{labels.arm2}</text>}
      {labels?.arc && <text x={mid.x} y={mid.y + 6} textAnchor="middle" style={text}>{labels.arc}</text>}
    </g>
  );
}

/** Never the size of the angle unless the arc label states it: naming or measuring it is the task. The Geodreieck reading is given in words, so screen readers can do it too. */
export function angleAriaLabel(v: VisualOf<'angle'>): string {
  const parts = ['Winkel mit zwei Schenkeln und einem Scheitel.'];
  if (v.labels?.vertex) parts.push(`Scheitel ${v.labels.vertex}.`);
  if (v.labels?.arc) parts.push(`Bogen ${v.labels.arc}.`);
  if (v.tool === 'geodreieck') parts.push(v.toolOffset ? `Das Geodreieck liegt nicht richtig am Scheitel. Der zweite Schenkel zeigt auf zwei Zahlen, eine auf jeder Skala: ${Math.min(v.degrees, 180 - v.degrees)} und ${Math.max(v.degrees, 180 - v.degrees)}.` : `Das Geodreieck liegt mit der Mitte am Scheitel und mit der 0 am ersten Schenkel. Der zweite Schenkel zeigt auf zwei Zahlen, eine auf jeder Skala: ${Math.min(v.degrees, 180 - v.degrees)} und ${Math.max(v.degrees, 180 - v.degrees)}.`);
  else if (!v.showArc) parts.push('Kein Bogen eingezeichnet.');
  return toSpeech(parts.join(' '));
}

export default function AngleVisual({ visual, print }: VisualProps<VisualOf<'angle'>>) {
  const geo = angleGeometry(visual.baseRotation, visual.tool === 'geodreieck' ? Math.max(180, visual.degrees) : visual.degrees);
  return (
    <svg className="visual visual-angle" viewBox={geo.viewBox} width={geo.W} height={geo.H} role="img" aria-label={angleAriaLabel(visual)}>
      <AngleDrawing {...visual} print={print} />
    </svg>
  );
}
