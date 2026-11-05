/**
 * Zahlenstrahl answer: the child places an arrow on the number line (docs/research.md P17).
 *
 * - APG slider pattern: role="slider", aria-valuemin/max/now, German aria-valuetext ('34 500').
 *   Arrow keys = one step, PageUp/PageDown = one major step, Home/End = ends, Enter = Prüfen.
 * - Tap/click anywhere on the line places the arrow. There is no dragging (docs/research.md F14, §7.1: tap only).
 * - Narrow screens: the line keeps a readable minimum width and scrolls sideways (.nl-scroll). There a swipe
 *   scrolls and a tap (pointer up without a scroll) places the arrow; step buttons (touch devices) move it one step.
 * - The current value is never shown as visible text (that would give the answer away); only the arrow.
 * - reveal: the correct place is drawn with its value; print: an empty static line to mark by hand.
 */
import { useEffect, useRef, type KeyboardEvent, type PointerEvent } from 'react';
import { MINUS, fmt } from '../../core/format';
import type { AnswerOf } from '../../core/types';
import { describedByIds, type AnswerInputProps } from './types';
import { axisBox, axisHeight, axisText, NL, NumberLineAxis, xScale, type AxisSpec } from '../visuals/NumberLineVisual';
import './NumberLineInput.css';

type MarkerState = 'set' | 'wrong' | 'right' | 'solution';

/** Snap to the answer's step grid and clamp to [min, max]. */
export function snapValue(v: number, a: Pick<AnswerOf<'numberline'>, 'min' | 'max' | 'step'>): number {
  const k = Math.round((v - a.min) / a.step);
  const snapped = Math.round((a.min + k * a.step) * 1e6) / 1e6;
  return Math.min(a.max, Math.max(a.min, snapped));
}

function StepIcon({ dir }: { dir: -1 | 1 }) {
  return (
    <svg viewBox="0 0 24 24" width={24} height={24} aria-hidden="true" focusable="false">
      <path d={dir < 0 ? 'M16 4 6 12l10 8z' : 'M8 4l10 8-10 8z'} style={{ fill: 'currentColor' }} />
    </svg>
  );
}

/** The value as its digits, shortened: 2/4 is 1/2 and 11/6 stays 11/6, or 1 5/6 on a line of mixed numbers. The words would not fit beside the arrow, and the status line under the line says them. */
function shortValue(a: Pick<AnswerOf<'numberline'>, 'denominator' | 'labelFormat'>, value: number): string {
  const d0 = a.denominator;
  if (!d0) return fmt(value);
  const gcd = (x: number, y: number): number => (y === 0 ? x : gcd(y, x % y));
  const g = gcd(Math.abs(value), d0) || 1;
  const n = Math.abs(value) / g;
  const d = d0 / g;
  const sign = value < 0 ? MINUS : '';
  if (d === 1) return `${sign}${n}`;
  if (a.labelFormat === 'mixed' && n > d) return `${sign}${Math.floor(n / d)} ${n % d}/${d}`;
  return `${sign}${n}/${d}`;
}

function Marker({ x, state, label }: { x: number; state: MarkerState; label?: string }) {
  const colour = state === 'wrong' ? 'var(--retry)' : state === 'set' ? 'var(--primary)' : 'var(--ok)';
  const knobY = NL.Y - 46;
  return (
    <g className={`nl-marker nl-marker--${state}`} data-marker={state}>
      {/* invisible 48 × 64 hit area around the handle */}
      <rect x={x - 24} y={knobY - 24} width={48} height={64} style={{ fill: 'transparent' }} />
      <line x1={x} y1={knobY + 14} x2={x} y2={NL.Y - 12} style={{ stroke: colour, strokeWidth: 4 }} />
      <polygon points={`${x},${NL.Y - 2} ${x - 8},${NL.Y - 15} ${x + 8},${NL.Y - 15}`} style={{ fill: colour }} />
      <circle
        cx={x}
        cy={knobY}
        r={15}
        style={{ fill: state === 'wrong' ? 'var(--retry-soft)' : colour, stroke: colour, strokeWidth: 3, strokeDasharray: state === 'wrong' ? '5 3' : undefined }}
      />
      {state === 'wrong' && (
        <>
          <path d={`M${x} ${knobY - 8}v9`} style={{ stroke: colour, strokeWidth: 3, strokeLinecap: 'round' }} />
          <circle cx={x} cy={knobY + 6} r={2} style={{ fill: colour }} />
        </>
      )}
      {(state === 'right' || state === 'solution') && (
        <path d={`M${x - 7} ${knobY}l5 5l9 -10`} style={{ fill: 'none', stroke: 'var(--on-primary)', strokeWidth: 3, strokeLinecap: 'round', strokeLinejoin: 'round' }} />
      )}
      {label && (
        <text
          x={x < NL.W / 2 ? x + 22 : x - 22}
          y={knobY + 6}
          textAnchor={x < NL.W / 2 ? 'start' : 'end'}
          style={{ fill: 'var(--ok)', fontSize: 18, fontWeight: 700 }}
        >
          {label}
        </text>
      )}
    </g>
  );
}

export default function NumberLineInput({ answer, response, onChange, onSubmit, disabled, result, reveal, idBase, print, describedBy }: AnswerInputProps<AnswerOf<'numberline'>>) {
  const svgRef = useRef<SVGSVGElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const gerade = answer.arrows === 'both';
  /** Touch on a scrolling line: placed on pointer up, unless the browser took the gesture as a scroll (pointercancel). */
  const pendingTap = useRef(false);
  // Explicit labels if given; otherwise, without major labels, the two ends are labelled.
  const labels = answer.labels ?? (answer.labelMajor ? undefined : [answer.min, answer.max]);
  const axis: AxisSpec = {
    min: answer.min,
    max: answer.max,
    majorStep: answer.majorStep,
    minorStep: answer.minorStep,
    labelMajor: answer.labelMajor,
    ...(labels ? { labels } : {}),
    ...(answer.arrows ? { arrows: answer.arrows } : {}),
    ...(answer.denominator ? { denominator: answer.denominator } : {}),
    ...(answer.labelFormat ? { labelFormat: answer.labelFormat } : {}),
  };
  const value = response?.kind === 'numberline' && Number.isFinite(response.value) ? response.value : null;
  const xOf = xScale(answer.min, answer.max);
  const H = axisHeight(axis) + 6;
  const box = axisBox(axis, 0, H);

  /** Scroll a sideways-scrolling line so that v is in view (keys, buttons and the revealed solution). */
  const showValue = (v: number) => {
    const scroller = scrollRef.current;
    const width = svgRef.current?.getBoundingClientRect().width ?? 0;
    if (!scroller || width <= 0 || scroller.scrollWidth <= scroller.clientWidth + 1) return;
    const px = ((xOf(v) + box.m) / box.W) * width;
    if (px < scroller.scrollLeft + 32 || px > scroller.scrollLeft + scroller.clientWidth - 32) scroller.scrollLeft = Math.max(0, px - scroller.clientWidth / 2);
  };

  useEffect(() => {
    if (reveal) showValue(answer.value);
    // showValue only reads refs and the answer: re-run when the solution is revealed
  }, [reveal, answer.value]);

  if (print) {
    return (
      <div className="nl-input nl-input--print">
        <svg className="visual nl-input__svg" viewBox={box.viewBox} width={box.W} height={H} role="img" aria-label={`${gerade ? 'Zahlengerade' : 'Zahlenstrahl'} von ${axisText(axis, answer.min)} bis ${axisText(axis, answer.max)} zum Eintragen`}>
          <NumberLineAxis axis={axis} print />
        </svg>
      </div>
    );
  }

  const set = (v: number) => {
    if (disabled) return;
    const s = snapValue(v, answer);
    if (s !== value) onChange({ kind: 'numberline', value: s });
  };
  /** Keys and buttons: move, then keep the arrow in view. */
  const moveTo = (v: number) => {
    if (disabled) return;
    set(v);
    showValue(snapValue(v, answer));
  };
  const scrolls = () => {
    const scroller = scrollRef.current;
    return !!scroller && scroller.scrollWidth > scroller.clientWidth + 1;
  };

  const valueAt = (clientX: number): number | null => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect || rect.width <= 0) return null;
    const x = ((clientX - rect.left) / rect.width) * box.W - box.m;
    return answer.min + ((x - NL.PAD) / (NL.W - 2 * NL.PAD)) * (answer.max - answer.min);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const base = value ?? answer.min;
    switch (e.key) {
      case 'ArrowRight':
      case 'ArrowUp':
        moveTo(base + answer.step);
        break;
      case 'ArrowLeft':
      case 'ArrowDown':
        moveTo(base - answer.step);
        break;
      case 'PageUp':
        moveTo(base + answer.majorStep);
        break;
      case 'PageDown':
        moveTo(base - answer.majorStep);
        break;
      case 'Home':
        moveTo(answer.min);
        break;
      case 'End':
        moveTo(answer.max);
        break;
      case 'Enter':
        if (value !== null) onSubmit();
        break;
      default:
        return;
    }
    e.preventDefault();
  };

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (disabled) return;
    e.currentTarget.focus();
    if (e.pointerType === 'touch' && scrolls()) {
      // the finger may be starting a sideways scroll: wait for pointer up
      pendingTap.current = true;
      return;
    }
    const v = valueAt(e.clientX);
    if (v !== null) set(v);
  };
  const onPointerUp = (e: PointerEvent<HTMLDivElement>) => {
    if (!pendingTap.current) return;
    pendingTap.current = false;
    const v = valueAt(e.clientX);
    if (v !== null) set(v);
  };
  const cancelTap = () => {
    pendingTap.current = false;
  };

  const checked = result !== null && !reveal;
  const state: MarkerState = checked ? (result.correct ? 'right' : 'wrong') : reveal && value !== null && Math.abs(value - answer.value) <= answer.tolerance ? 'right' : reveal ? 'wrong' : 'set';
  const showOwn = value !== null && !(reveal && Math.abs(value - answer.value) <= answer.tolerance);
  const helpId = `${idBase}-help`;
  const statusId = `${idBase}-status`;

  return (
    <div className="nl-input">
      <p className="nl-input__help" id={helpId}>
        Tippe auf die Stelle {gerade ? 'an der Zahlengeraden' : 'am Zahlenstrahl'}.{' '}
        {/* CSS shows the sentence that fits the device: arrow keys, or the step buttons on touch screens */}
        <span className="nl-input__help-keys">Mit den Pfeiltasten kannst du den Pfeil verschieben.</span>
        <span className="nl-input__help-touch">Mit den Knöpfen {gerade ? 'unter der Zahlengeraden' : 'unter dem Zahlenstrahl'} schiebst du den Pfeil genau.</span>
      </p>
      <div className="nl-scroll nl-input__scroll" ref={scrollRef} style={box.scrollStyle}>
        <div
          className={`nl-input__slider${disabled ? ' is-disabled' : ''}`}
          role="slider"
          tabIndex={0}
          id={`${idBase}-slider`}
          aria-label={`Pfeil ${gerade ? 'auf der Zahlengeraden' : 'auf dem Zahlenstrahl'}`}
          aria-describedby={describedByIds(describedBy, helpId, (checked || reveal) && statusId)}
          // the answer field (fieldNav.ts); Enter is handled here (Prüfen once the arrow is placed)
          data-answer-field=""
          data-answer-enter="self"
          data-answer-empty={String(value === null)}
          data-answer-wrong={checked && !result.correct ? '' : undefined}
          aria-orientation="horizontal"
          aria-valuemin={answer.min}
          aria-valuemax={answer.max}
          aria-valuenow={value ?? answer.min}
          aria-valuetext={value === null ? 'Noch kein Pfeil gesetzt' : axisText(axis, value)}
          aria-disabled={disabled || undefined}
          onKeyDown={onKeyDown}
          onPointerDown={onPointerDown}
          onPointerUp={onPointerUp}
          onPointerCancel={cancelTap}
        >
          <svg ref={svgRef} className="visual nl-input__svg" viewBox={box.viewBox} width={box.W} height={H} aria-hidden="true" focusable="false">
            <rect x={-box.m} y={0} width={box.W} height={H} style={{ fill: 'transparent' }} />
            <NumberLineAxis axis={axis} />
            {showOwn && value !== null && <Marker x={xOf(value)} state={state} />}
            {reveal && <Marker x={xOf(answer.value)} state="solution" label={shortValue(answer, answer.value)} />}
          </svg>
        </div>
      </div>
      <div className="nl-input__steps">
        <button
          type="button"
          className="nl-input__step"
          aria-label="Pfeil einen Schritt nach links"
          aria-controls={`${idBase}-slider`}
          disabled={disabled}
          onClick={() => moveTo((value ?? answer.min) - answer.step)}
        >
          <StepIcon dir={-1} />
        </button>
        <button
          type="button"
          className="nl-input__step"
          aria-label="Pfeil einen Schritt nach rechts"
          aria-controls={`${idBase}-slider`}
          disabled={disabled}
          onClick={() => moveTo((value ?? answer.min) + answer.step)}
        >
          <StepIcon dir={1} />
        </button>
      </div>
      {(checked || reveal) && (
        <p className={`nl-input__status nl-input__status--${reveal ? 'solution' : state}`} id={statusId}>
          {reveal
            ? `Die richtige Stelle ist ${axisText(axis, answer.value)}. Sie ist mit einem Haken markiert.`
            : state === 'right'
              ? 'Dein Pfeil steht an der richtigen Stelle.'
              : 'Dein Pfeil steht noch nicht an der richtigen Stelle.'}
        </p>
      )}
    </div>
  );
}
