/**
 * Geraden, Halbgeraden und Strecken (docs/research.md §6): parallel, senkrecht, crossings. End marks tell a Strecke from a Gerade, so the kind is drawn, never only named.
 * Lines lie in a picture of 300 × 200 units around the centre.
 */
import { toSpeech } from '../../core/format';
import type { VisualOf } from '../../core/types';
import type { VisualProps } from './types';

type Lines = VisualOf<'lines'>;
type Line = Lines['lines'][number];

const W = 300;
const H = 200;
const CX = W / 2;
const CY = H / 2;
const REACH = 118;

const rad = (d: number) => (d * Math.PI) / 180;

/** The two ends of a line, inside the picture. y points up in the angle, down on the screen. */
export function lineEnds(l: Pick<Line, 'angle' | 'offset'>): { a: [number, number]; b: [number, number]; dir: [number, number] } {
  const dir: [number, number] = [Math.cos(rad(l.angle)), -Math.sin(rad(l.angle))];
  const normal: [number, number] = [-dir[1], dir[0]];
  const px = CX + normal[0] * l.offset;
  const py = CY + normal[1] * l.offset;
  const fit = (s: number) => {
    let t = REACH;
    if (dir[0] !== 0) t = Math.min(t, Math.abs((s > 0 ? W - 10 - px : px - 10) / dir[0]));
    if (dir[1] !== 0) t = Math.min(t, Math.abs((s * Math.sign(dir[1]) > 0 ? H - 10 - py : py - 10) / dir[1]));
    return t;
  };
  const t1 = fit(1);
  const t2 = fit(-1);
  return { a: [px - dir[0] * t2, py - dir[1] * t2], b: [px + dir[0] * t1, py + dir[1] * t1], dir };
}

/** Where two lines cross; null if they are parallel. */
export function crossing(p: Line, q: Line): [number, number] | null {
  const e1 = lineEnds(p);
  const e2 = lineEnds(q);
  const det = e1.dir[0] * e2.dir[1] - e1.dir[1] * e2.dir[0];
  if (Math.abs(det) < 1e-9) return null;
  const dx = e2.a[0] - e1.a[0];
  const dy = e2.a[1] - e1.a[1];
  const t = (dx * e2.dir[1] - dy * e2.dir[0]) / det;
  return [e1.a[0] + e1.dir[0] * t, e1.a[1] + e1.dir[1] * t];
}

/** Describes what is drawn, by its end marks and not by the name of the line (naming it can be the task). */
export function linesAriaLabel(v: Lines): string {
  const parts = [v.lines.length === 1 ? 'Eine Linie.' : `${v.lines.length} Linien.`];
  v.lines.forEach((l, i) => {
    const kind = l.kind ?? 'gerade';
    const ends = kind === 'strecke' ? 'mit zwei Endpunkten' : kind === 'halbgerade' ? 'mit einem Endpunkt und einem Pfeil' : 'ohne Endpunkte';
    parts.push(`Linie ${l.label ?? i + 1}: ${ends}.`);
  });
  for (const [i, j] of v.rightAngleMarks ?? []) parts.push(`Zwischen den Linien ${v.lines[i]?.label ?? i + 1} und ${v.lines[j]?.label ?? j + 1} ist ein rechter Winkel markiert.`);
  for (const [i, j] of v.parallelMarks ?? []) parts.push(`Die Linien ${v.lines[i]?.label ?? i + 1} und ${v.lines[j]?.label ?? j + 1} sind als parallel markiert.`);
  if (v.geodreieck !== undefined) parts.push(`Das Geodreieck liegt an Linie ${v.lines[v.geodreieck]?.label ?? v.geodreieck + 1}.`);
  for (const p of v.points ?? []) if (p.label) parts.push(`Punkt ${p.label}.`);
  return toSpeech(parts.join(' '));
}

export default function LinesVisual({ visual }: VisualProps<Lines>) {
  const ink = 'var(--ink)';
  const end = (x: number, y: number, dir: [number, number], key: string) => {
    const nx = -dir[1] * 7;
    const ny = dir[0] * 7;
    return <line key={key} x1={x - nx} y1={y - ny} x2={x + nx} y2={y + ny} data-end="" style={{ stroke: ink, strokeWidth: 2.5 }} />;
  };
  const arrow = (x: number, y: number, dir: [number, number], key: string) => {
    const nx = -dir[1] * 6;
    const ny = dir[0] * 6;
    return <polygon key={key} points={`${x + dir[0] * 8},${y + dir[1] * 8} ${x - dir[0] * 4 + nx},${y - dir[1] * 4 + ny} ${x - dir[0] * 4 - nx},${y - dir[1] * 4 - ny}`} data-arrow="" style={{ fill: ink }} />;
  };
  return (
    <svg className="visual visual-lines" viewBox={`0 0 ${W} ${H}`} width={W} height={H} role="img" aria-label={linesAriaLabel(visual)}>
      {visual.lines.map((l, i) => {
        const { a, b, dir } = lineEnds(l);
        const kind = l.kind ?? 'gerade';
        return (
          <g key={i} data-line={i} data-kind={kind}>
            <line x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} style={{ stroke: ink, strokeWidth: 3 }} />
            {kind === 'strecke' && [end(a[0], a[1], dir, 'a'), end(b[0], b[1], dir, 'b')]}
            {kind === 'halbgerade' && [end(a[0], a[1], dir, 'a'), arrow(b[0], b[1], dir, 'b')]}
            {l.label && (
              <text x={Math.min(W - 10, Math.max(10, (l.labelAtStart ? a : b)[0] - dir[1] * 14))} y={Math.min(H - 4, Math.max(16, (l.labelAtStart ? a : b)[1] + dir[0] * 14 + 5))} textAnchor="middle" style={{ fill: 'var(--text)', fontSize: 18, fontWeight: 700 }}>{l.label}</text>
            )}
          </g>
        );
      })}
      {visual.rightAngleMarks?.map(([i, j], k) => {
        const p = visual.lines[i];
        const q = visual.lines[j];
        const at = p && q ? crossing(p, q) : null;
        if (!at) return null;
        const d1 = lineEnds(p).dir;
        const d2 = lineEnds(q).dir;
        const s = 14;
        return <path key={k} data-right-angle="" d={`M ${at[0] + d1[0] * s} ${at[1] + d1[1] * s} L ${at[0] + (d1[0] + d2[0]) * s} ${at[1] + (d1[1] + d2[1]) * s} L ${at[0] + d2[0] * s} ${at[1] + d2[1] * s}`} style={{ fill: 'none', stroke: ink, strokeWidth: 2 }} />;
      })}
      {visual.parallelMarks?.flatMap(([i, j], k) => [i, j].map((at) => {
        const l = visual.lines[at];
        if (!l) return null;
        const { a, b, dir } = lineEnds(l);
        const n: [number, number] = [-dir[1], dir[0]];
        // off the middle, where a third line often crosses
        const m: [number, number] = [a[0] + (b[0] - a[0]) * 0.22, a[1] + (b[1] - a[1]) * 0.22];
        const chevron = (t: number) => `M ${m[0] + dir[0] * (t - 7) + n[0] * 7} ${m[1] + dir[1] * (t - 7) + n[1] * 7} L ${m[0] + dir[0] * t} ${m[1] + dir[1] * t} L ${m[0] + dir[0] * (t - 7) - n[0] * 7} ${m[1] + dir[1] * (t - 7) - n[1] * 7}`;
        return <path key={`${k}-${at}`} data-parallel-mark={at} d={Array.from({ length: k + 1 }, (_, c) => chevron(c * 8)).join(' ')} style={{ fill: 'none', stroke: 'var(--ink)', strokeWidth: 2.5 }} />;
      }))}
      {visual.geodreieck !== undefined && visual.lines[visual.geodreieck] && (() => {
        const l = visual.lines[visual.geodreieck!];
        const { dir } = lineEnds(l);
        const n: [number, number] = [-dir[1], dir[0]];
        const base = lineEnds({ angle: l.angle, offset: l.offset });
        const c: [number, number] = [(base.a[0] + base.b[0]) / 2, (base.a[1] + base.b[1]) / 2];
        const side = 70;
        return (
          <polygon data-testid="lines-geodreieck" points={`${c[0] - dir[0] * side},${c[1] - dir[1] * side} ${c[0] + dir[0] * side},${c[1] + dir[1] * side} ${c[0] + n[0] * side},${c[1] + n[1] * side}`} style={{ fill: 'var(--primary-soft)', fillOpacity: 0.5, stroke: ink, strokeWidth: 1.5 }} />
        );
      })()}
      {visual.points?.map((p, i) => (
        <g key={i} data-point={p.label ?? ''}>
          <circle cx={CX + p.x} cy={CY - p.y} r={4.5} style={{ fill: ink }} />
          {p.label && <text x={CX + p.x + 8} y={CY - p.y - 8} style={{ fill: 'var(--text)', fontSize: 18, fontWeight: 700 }}>{p.label}</text>}
        </g>
      ))}
    </svg>
  );
}
