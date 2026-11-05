// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import NumberLineInput, { snapValue } from './NumberLineInput';
import type { AnswerOf, CheckResult, Response } from '../../core/types';

const answer: AnswerOf<'numberline'> = {
  kind: 'numberline',
  min: 0,
  max: 100,
  majorStep: 10,
  minorStep: 5,
  step: 5,
  value: 45,
  tolerance: 0,
  labelMajor: true,
};

describe('a Zahlenstrahl that counts d-ths', () => {
  const fifths: AnswerOf<'numberline'> = { kind: 'numberline', min: 0, max: 10, majorStep: 5, minorStep: 1, step: 1, value: 3, tolerance: 0, labelMajor: true, denominator: 5 };
  const noop = () => {};
  const base = { answer: fifths, onChange: noop, onSubmit: noop, disabled: false, result: null, idBase: 't', keypad: false };

  it('labels the whole numbers only, and speaks a place as a fraction, never as a count of ticks', () => {
    const { container } = render(<NumberLineInput {...base} response={{ kind: 'numberline', value: 3 }} reveal={false} />);
    expect(screen.getByRole('slider').getAttribute('aria-valuetext')).toBe('drei Fünftel');
    expect([...container.querySelectorAll('[data-label]')].map((l) => l.textContent)).toEqual(['0', '1', '2']);
  });

  it('names the solution as a fraction', () => {
    render(<NumberLineInput {...base} response={{ kind: 'numberline', value: 2 }} reveal />);
    expect(document.body.textContent).toContain('Die richtige Stelle ist drei Fünftel.');
  });
});

function Harness(props: { onSubmit?: () => void; disabled?: boolean; reveal?: boolean; result?: CheckResult | null; initial?: number; onChange?: (r: Response) => void }) {
  const [response, setResponse] = useState<Response | null>(props.initial === undefined ? null : { kind: 'numberline', value: props.initial });
  return (
    <NumberLineInput
      answer={answer}
      response={response}
      onChange={(r) => {
        setResponse(r);
        props.onChange?.(r);
      }}
      onSubmit={props.onSubmit ?? (() => {})}
      disabled={props.disabled ?? false}
      result={props.result ?? null}
      reveal={props.reveal ?? false}
      idBase="t1"
      keypad={false}
    />
  );
}

describe('NumberLineInput', () => {
  it('is an APG slider with German value text and no visible value', () => {
    render(<Harness />);
    const slider = screen.getByRole('slider', { name: 'Pfeil auf dem Zahlenstrahl' });
    expect(slider.getAttribute('aria-valuemin')).toBe('0');
    expect(slider.getAttribute('aria-valuemax')).toBe('100');
    expect(slider.getAttribute('aria-valuetext')).toBe('Noch kein Pfeil gesetzt');
    expect(slider.tabIndex).toBe(0);
    expect(screen.getByText(/Tippe auf die Stelle am Zahlenstrahl/)).toBeTruthy();
  });

  it('says Zahlengerade for a line with arrows at both ends', () => {
    render(<NumberLineInput answer={{ ...answer, min: -50, max: 50, arrows: 'both' }} response={null} onChange={() => {}} onSubmit={() => {}} disabled={false} result={null} reveal={false} idBase="t1" keypad={false} />);
    expect(screen.getByRole('slider', { name: 'Pfeil auf der Zahlengeraden' })).toBeTruthy();
    expect(screen.getByText(/Tippe auf die Stelle an der Zahlengeraden/)).toBeTruthy();
  });

  it('moves with arrow keys, PageUp/PageDown, Home and End', () => {
    render(<Harness />);
    const slider = screen.getByRole('slider');
    fireEvent.keyDown(slider, { key: 'ArrowRight' });
    expect(slider.getAttribute('aria-valuenow')).toBe('5');
    expect(slider.getAttribute('aria-valuetext')).toBe('5');
    fireEvent.keyDown(slider, { key: 'PageUp' });
    expect(slider.getAttribute('aria-valuenow')).toBe('15');
    fireEvent.keyDown(slider, { key: 'ArrowLeft' });
    expect(slider.getAttribute('aria-valuenow')).toBe('10');
    fireEvent.keyDown(slider, { key: 'End' });
    expect(slider.getAttribute('aria-valuenow')).toBe('100');
    fireEvent.keyDown(slider, { key: 'ArrowRight' });
    expect(slider.getAttribute('aria-valuenow')).toBe('100');
    fireEvent.keyDown(slider, { key: 'Home' });
    expect(slider.getAttribute('aria-valuenow')).toBe('0');
    fireEvent.keyDown(slider, { key: 'PageDown' });
    expect(slider.getAttribute('aria-valuenow')).toBe('0');
  });

  it('submits with Enter only when a value is set', () => {
    const onSubmit = vi.fn();
    render(<Harness onSubmit={onSubmit} />);
    const slider = screen.getByRole('slider');
    fireEvent.keyDown(slider, { key: 'Enter' });
    expect(onSubmit).not.toHaveBeenCalled();
    fireEvent.keyDown(slider, { key: 'ArrowRight' });
    fireEvent.keyDown(slider, { key: 'Enter' });
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it('places the arrow where the line is tapped (snapped to the step)', () => {
    const onChange = vi.fn();
    const { container } = render(<Harness onChange={onChange} />);
    const svg = container.querySelector('svg')!;
    svg.getBoundingClientRect = () => ({ left: 0, top: 0, width: 640, height: 130, right: 640, bottom: 130, x: 0, y: 0, toJSON: () => ({}) });
    const slider = screen.getByRole('slider');
    // x for 45: PAD + 0.45 · (640 − 2 · PAD) = 52 + 0.45 · 536 = 293.2
    fireEvent.pointerDown(slider, { clientX: 295, pointerId: 1 });
    expect(onChange).toHaveBeenLastCalledWith({ kind: 'numberline', value: 45 });
    expect(container.querySelector('[data-marker="set"]')).not.toBeNull();
    // Tap only (docs/research.md F14): a sliding finger or mouse does not move the arrow.
    fireEvent.pointerMove(slider, { clientX: 400, pointerId: 1 });
    expect(slider.getAttribute('aria-valuenow')).toBe('45');
    fireEvent.pointerUp(slider, { clientX: 400, pointerId: 1 });
    expect(slider.getAttribute('aria-valuenow')).toBe('45');
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it('ignores input when disabled', () => {
    const onChange = vi.fn();
    render(<Harness disabled onChange={onChange} initial={20} />);
    const slider = screen.getByRole('slider');
    fireEvent.keyDown(slider, { key: 'ArrowRight' });
    expect(onChange).not.toHaveBeenCalled();
    expect(slider.getAttribute('aria-disabled')).toBe('true');
  });

  it('marks a wrong arrow with colour and text, and reveals the solution', () => {
    const { container, rerender } = render(<Harness initial={20} result={{ correct: false }} />);
    expect(container.querySelector('[data-marker="wrong"]')).not.toBeNull();
    expect(screen.getByText('Dein Pfeil steht noch nicht an der richtigen Stelle.')).toBeTruthy();
    rerender(<Harness initial={20} reveal />);
    expect(container.querySelector('[data-marker="solution"]')).not.toBeNull();
    expect(screen.getByText(/Die richtige Stelle ist 45/)).toBeTruthy();
  });

  it('print mode shows an empty static line', () => {
    const { container } = render(
      <NumberLineInput answer={answer} response={null} onChange={() => {}} onSubmit={() => {}} disabled={false} result={null} reveal={false} idBase="p" keypad={false} print />,
    );
    expect(screen.queryByRole('slider')).toBeNull();
    expect(screen.getByRole('img').getAttribute('aria-label')).toContain('zum Eintragen');
    expect(container.querySelector('[data-marker]')).toBeNull();
  });

  it('labels both ends when the answer has no major labels', () => {
    const { container } = render(
      <NumberLineInput
        answer={{ ...answer, min: 0, max: 100, majorStep: 10, minorStep: 10, step: 1, value: 64, tolerance: 2_000, labelMajor: false }}
        response={null}
        onChange={() => {}}
        onSubmit={() => {}}
        disabled={false}
        result={null}
        reveal={false}
        idBase="e"
        keypad={false}
      />,
    );
    expect([...container.querySelectorAll('[data-label]')].map((t) => t.getAttribute('data-label'))).toEqual(['0', '100']);
  });

  it('uses explicit labels from the answer when given', () => {
    const { container } = render(
      <NumberLineInput
        answer={{ ...answer, labelMajor: false, labels: [0, 50] }}
        response={null}
        onChange={() => {}}
        onSubmit={() => {}}
        disabled={false}
        result={null}
        reveal={false}
        idBase="l"
        keypad={false}
      />,
    );
    expect([...container.querySelectorAll('[data-label]')].map((t) => t.getAttribute('data-label'))).toEqual(['0', '50']);
  });

  it('snaps and clamps', () => {
    expect(snapValue(47, answer)).toBe(45);
    expect(snapValue(-10, answer)).toBe(0);
    expect(snapValue(200, answer)).toBe(100);
  });

  it('step buttons move the arrow one step (touch screens) and are off when disabled', () => {
    const { rerender } = render(<Harness />);
    const slider = screen.getByRole('slider');
    const right = screen.getByRole('button', { name: 'Pfeil einen Schritt nach rechts' });
    const left = screen.getByRole('button', { name: 'Pfeil einen Schritt nach links' });
    fireEvent.click(right);
    expect(slider.getAttribute('aria-valuenow')).toBe('5');
    fireEvent.click(right);
    fireEvent.click(left);
    expect(slider.getAttribute('aria-valuenow')).toBe('5');
    rerender(<Harness disabled />);
    expect((screen.getByRole('button', { name: 'Pfeil einen Schritt nach rechts' }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('on a sideways-scrolling line a touch places the arrow on release, not when a swipe starts', () => {
    const onChange = vi.fn();
    const { container } = render(<Harness onChange={onChange} />);
    const svg = container.querySelector('svg')!;
    svg.getBoundingClientRect = () => ({ left: 0, top: 0, width: 640, height: 130, right: 640, bottom: 130, x: 0, y: 0, toJSON: () => ({}) });
    const box = container.querySelector('.nl-scroll') as HTMLElement;
    Object.defineProperty(box, 'scrollWidth', { configurable: true, value: 560 });
    Object.defineProperty(box, 'clientWidth', { configurable: true, value: 288 });
    const slider = screen.getByRole('slider');
    // a swipe: the browser scrolls and cancels the pointer → nothing placed
    fireEvent.pointerDown(slider, { clientX: 295, pointerId: 1, pointerType: 'touch' });
    fireEvent.pointerCancel(slider, { pointerId: 1, pointerType: 'touch' });
    fireEvent.pointerUp(slider, { clientX: 295, pointerId: 1, pointerType: 'touch' });
    expect(onChange).not.toHaveBeenCalled();
    // a tap: placed on release
    fireEvent.pointerDown(slider, { clientX: 295, pointerId: 2, pointerType: 'touch' });
    expect(onChange).not.toHaveBeenCalled();
    fireEvent.pointerUp(slider, { clientX: 295, pointerId: 2, pointerType: 'touch' });
    expect(onChange).toHaveBeenLastCalledWith({ kind: 'numberline', value: 45 });
  });

  it('keeps a readable minimum width and scrolls instead of shrinking', () => {
    const { container } = render(<Harness />);
    const box = container.querySelector('.nl-scroll') as HTMLElement;
    expect(box.style.getPropertyValue('--nl-min-width')).toBe('296px');
    expect(box.querySelector('[role="slider"]')).not.toBeNull();
  });
});

