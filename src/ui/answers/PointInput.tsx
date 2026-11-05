/**
 * Plot a point (docs/research.md §6): a tap sets a marker on the nearest grid intersection, at least 32 px apart (the grid scrolls in its box rather than shrinks further), no drag is needed.
 * Four step buttons and the arrow keys move it one step, Enter places it. The live label shows P(3 | 5). With `targets` up to three markers can be set, in any order: Enter or a tap adds one, a tap on
 * a marker takes it away, and Entfernen drops the last. Prüfen stays disabled until a marker exists (isEmptyResponse), and the answer is correct only if exact.
 */
import { type KeyboardEvent, type PointerEvent, useRef } from 'react';
import { pointTargets } from '../../core/check';
import { UI_RULES } from '../../core/age';
import { fmtPoint, toSpeech } from '../../core/format';
import type { AnswerOf, GridPoint } from '../../core/types';
import { CoordinateAxes, coordinateAriaLabel, gridGeometry, type GridSpec } from '../visuals/CoordinateGridVisual';
import { READABLE, readableStyle } from '../visuals/types';
import { describedByIds, type AnswerInputProps } from './types';
import './PointInput.css';

/** Drawn cells are 40 units: never below 32 px on screen (§7.1). */
const POINT_SCALE = UI_RULES.pointSpacingPx / 40;
/** A pointer that moved this far was a swipe to scroll the grid, not a tap. */
const SWIPE_PX = 10;

type Marker = 'set' | 'wrong' | 'right' | 'solution';

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

/** The nearest grid value to v on an axis from min to max. */
export function snapToGrid(v: number, min: number, max: number, step: number): number {
  return clamp(min + Math.round((v - min) / step) * step, min, max);
}

const DIRS = [
  { key: 'ArrowUp', dx: 0, dy: 1, label: 'Punkt einen Schritt nach oben', path: 'M12 5l7 9H5z' },
  { key: 'ArrowLeft', dx: -1, dy: 0, label: 'Punkt einen Schritt nach links', path: 'M5 12l9-7v14z' },
  { key: 'ArrowRight', dx: 1, dy: 0, label: 'Punkt einen Schritt nach rechts', path: 'M19 12l-9 7V5z' },
  { key: 'ArrowDown', dx: 0, dy: -1, label: 'Punkt einen Schritt nach unten', path: 'M12 19l-7-9h14z' },
] as const;

function PointMark({ x, y, state, label, flip }: { x: number; y: number; state: Marker; label?: string; flip?: boolean }) {
  const colour = state === 'wrong' ? 'var(--retry)' : state === 'set' ? 'var(--primary)' : 'var(--ok)';
  return (
    <g data-marker={state}>
      <circle cx={x} cy={y} r={9} style={{ fill: state === 'wrong' ? 'var(--retry-soft)' : colour, stroke: colour, strokeWidth: 3, strokeDasharray: state === 'wrong' ? '4 3' : undefined }} />
      {label && (
        <text x={flip ? x - 13 : x + 13} y={y < 30 ? y + 26 : y - 11} textAnchor={flip ? 'end' : undefined} style={{ fill: colour, fontSize: 18, fontWeight: 700 }}>
          {label}
        </text>
      )}
    </g>
  );
}

export default function PointInput({ answer, response, onChange, onSubmit, disabled, result, reveal, idBase, print, describedBy }: AnswerInputProps<AnswerOf<'point'>>) {
  const svgRef = useRef<SVGSVGElement>(null);
  const pressAt = useRef<{ x: number; y: number } | null>(null);
  const name = answer.name ?? 'P';
  const wanted = pointTargets(answer);
  const several = wanted.length > 1;
  const spec: GridSpec = { xMin: answer.xMin, xMax: answer.xMax, yMin: answer.yMin, yMax: answer.yMax, step: answer.step, labelStep: answer.labelStep ?? answer.step, axisNames: answer.axisNames };
  const geo = gridGeometry(spec);
  const given: GridPoint[] = answer.points ?? [];
  const placed = response?.kind === 'point' ? response.points : [];
  const active = placed[placed.length - 1] ?? null;
  const task = several ? `${wanted.length} Punkte setzen.` : `Punkt ${name} setzen.`;
  const label = `${coordinateAriaLabel({ ...spec, points: given, segments: answer.segments, polygon: answer.polygon })} ${task}`;

  if (print) {
    return (
      <div className="pt-input pt-input--print">
        <svg className="visual pt-input__svg" viewBox={`0 0 ${geo.W} ${geo.H}`} width={geo.W} height={geo.H} role="img" aria-label={label}>
          <CoordinateAxes spec={spec} points={given} segments={answer.segments} polygon={answer.polygon} print />
        </svg>
      </div>
    );
  }

  const snap = (x: number, y: number) => ({ x: snapToGrid(x, answer.xMin, answer.xMax, answer.step), y: snapToGrid(y, answer.yMin, answer.yMax, answer.step) });
  const emit = (points: { x: number; y: number }[]) => onChange({ kind: 'point', points });
  /** A tap. One point: it moves the marker. Several: a new marker up to the limit, then the last one moves; a tap on a marker takes it away. */
  const tapAt = (x: number, y: number) => {
    if (disabled) return;
    const p = snap(x, y);
    const hit = placed.findIndex((q) => q.x === p.x && q.y === p.y);
    if (several && hit >= 0) return emit(placed.filter((_, i) => i !== hit));
    if (hit >= 0) return;
    if (several && placed.length < wanted.length) return emit([...placed, p]);
    emit([...placed.slice(0, -1), p]);
  };
  /** One step of the active marker; the first press sets it at the origin, or as near to it as the grid allows. */
  const step = (dx: number, dy: number) => {
    if (disabled) return;
    if (!active) return emit([snap(clamp(0, answer.xMin, answer.xMax), clamp(0, answer.yMin, answer.yMax))]);
    // A marker in the way is jumped over, so the keys never get stuck behind it; at the edge the marker stays.
    const others = placed.slice(0, -1);
    const taken = (q: { x: number; y: number }) => others.some((o) => o.x === q.x && o.y === q.y);
    let at = active;
    let next = snap(at.x + dx * answer.step, at.y + dy * answer.step);
    while (taken(next) && (next.x !== at.x || next.y !== at.y)) {
      at = next;
      next = snap(at.x + dx * answer.step, at.y + dy * answer.step);
    }
    if (!taken(next)) emit([...others, next]);
  };
  /** Enter with several points: the marker stays where it is and the next one starts beside it. */
  const placeNext = () => {
    if (!active || placed.length >= wanted.length) return;
    const free = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1]].map(([dx, dy]) => snap(active.x + dx * answer.step, active.y + dy * answer.step)).find((p) => !placed.some((q) => q.x === p.x && q.y === p.y));
    if (free) emit([...placed, free]);
  };

  const onPointerDown = (e: PointerEvent<SVGSVGElement>) => {
    pressAt.current = { x: e.clientX, y: e.clientY };
  };
  const onPointerUp = (e: PointerEvent<SVGSVGElement>) => {
    if (disabled) return;
    const from = pressAt.current;
    pressAt.current = null;
    if (from && Math.hypot(e.clientX - from.x, e.clientY - from.y) > SWIPE_PX) return;
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect || rect.width <= 0 || rect.height <= 0) return;
    const { x, y } = geo.valueAt(((e.clientX - rect.left) / rect.width) * geo.W, ((e.clientY - rect.top) / rect.height) * geo.H);
    tapAt(x, y);
  };
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const dir = DIRS.find((d) => d.key === e.key);
    if (dir) {
      e.preventDefault();
      step(dir.dx, dir.dy);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (several && placed.length > 0 && placed.length < wanted.length) placeNext();
      else if (placed.length > 0) onSubmit();
    } else if ((e.key === 'Backspace' || e.key === 'Delete') && several && placed.length > 0) {
      e.preventDefault();
      if (!disabled) emit(placed.slice(0, -1));
    }
  };

  const checked = result !== null && !result.invalid && !reveal;
  const isTarget = (p: { x: number; y: number }) => wanted.some(([x, y]) => x === p.x && y === p.y);
  const stateOf = (p: { x: number; y: number }): Marker => (checked ? (result.correct ? 'right' : 'wrong') : reveal ? (isTarget(p) ? 'right' : 'wrong') : 'set');
  const liveId = `${idBase}-point-live`;
  const helpId = `${idBase}-point-help`;
  // Several points have no name of their own: the task says which letter belongs where, so the read-out gives only the coordinates.
  const pointText = (x: number, y: number) => (several ? fmtPoint(name, x, y).slice(name.length) : fmtPoint(name, x, y));
  const pointWords = (x: number, y: number) => (several ? toSpeech(fmtPoint('P', x, y)).replace('Punkt P', 'Punkt') : toSpeech(fmtPoint(name, x, y)));
  // A pair stays on one line; the read-out may break between pairs.
  const pairs = (texts: string[]) => texts.map((t, i) => <span key={i} className="pt-input__pair">{t}{i < texts.length - 1 ? ',' : ''}{i < texts.length - 1 ? ' ' : ''}</span>);
  const shown = placed.map((p) => pointText(p.x, p.y));
  const solution = wanted.map(([x, y]) => pointText(x, y));

  return (
    <div className="pt-input">
      <p className="pt-input__help" id={helpId}>
        {several ? `Tippe auf ${wanted.length} Gitterpunkte. Ein zweiter Tipp nimmt einen Punkt wieder weg.` : 'Tippe auf einen Gitterpunkt.'} Mit den Knöpfen oder den Pfeiltasten schiebst du den Punkt um einen Schritt.
      </p>
      <div
        className={`pt-input__area visual-wrap${disabled ? ' is-disabled' : ''}`}
        role="group"
        tabIndex={0}
        aria-label={label}
        aria-describedby={describedByIds(describedBy, helpId, liveId)}
        data-answer-field=""
        data-answer-enter="self"
        data-answer-empty={String(placed.length === 0)}
        data-answer-wrong={checked && !result.correct ? '' : undefined}
        onKeyDown={onKeyDown}
      >
        <svg ref={svgRef} className={`visual pt-input__svg ${READABLE}`} style={readableStyle(geo.W, POINT_SCALE)} viewBox={`0 0 ${geo.W} ${geo.H}`} width={geo.W} height={geo.H} aria-hidden="true" focusable="false" onPointerDown={onPointerDown} onPointerUp={onPointerUp}>
          <rect x={0} y={0} width={geo.W} height={geo.H} style={{ fill: 'transparent' }} />
          <CoordinateAxes spec={spec} points={given} segments={answer.segments} polygon={answer.polygon} />
          {placed.map((p, i) => !(reveal && isTarget(p)) && <PointMark key={i} x={geo.xOf(p.x)} y={geo.yOf(p.y)} state={stateOf(p)} />)}
          {reveal && wanted.map(([x, y], i) => <PointMark key={`s${i}`} x={geo.xOf(x)} y={geo.yOf(y)} state="solution" label={several ? undefined : name} flip={x === answer.xMax} />)}
        </svg>
      </div>
      <div className="pt-input__controls">
        <output className="pt-input__live" id={liveId} aria-live="polite" aria-label={shown.length > 0 ? placed.map((p) => pointWords(p.x, p.y)).join(', ') : several ? 'Noch keine Punkte gesetzt' : 'Noch kein Punkt gesetzt'}>
          {reveal ? pairs(solution) : shown.length > 0 ? pairs(shown) : fmtPoint(name, 0, 0).replace(/0/g, '?')}
        </output>
        {several && (
          <button type="button" className="btn" disabled={disabled || placed.length === 0} onClick={() => emit(placed.slice(0, -1))}>
            Punkt entfernen
          </button>
        )}
        <div className="pt-input__steps">
          {DIRS.map((d) => (
            <button key={d.key} type="button" className={`pt-input__step pt-input__step--${d.key}`} aria-label={d.label} disabled={disabled} onClick={() => step(d.dx, d.dy)}>
              <svg viewBox="0 0 24 24" width={24} height={24} aria-hidden="true" focusable="false">
                <path d={d.path} style={{ fill: 'currentColor' }} />
              </svg>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
