// @vitest-environment jsdom
// The answer kinds of Klasse 6 (docs/research.md §6): fraction and point. Input, check, keyboard, reveal and print.
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { COMMA_MISSING, FRACTION_NOT_LOWEST, checkAnswer, correctResponse, formatAnswer, responseForBug } from '../../core/check';
import { alignedOperands, shiftedDivision, writtenPlaces } from '../../core/written';
import type { Answer, AnswerOf, CheckResult, Response } from '../../core/types';
import { taskSpeech } from '../practice/readAloud';
import AnswerInput from './AnswerInput';
import { snapToGrid } from './PointInput';

afterEach(cleanup);

function Host({ answer, onResponse, onSubmit = () => {}, result = null, reveal = false }: { answer: Answer; onResponse?: (r: Response) => void; onSubmit?: () => void; result?: CheckResult | null; reveal?: boolean }) {
  const [response, setResponse] = useState<Response | null>(null);
  return (
    <AnswerInput
      answer={answer}
      response={response}
      onChange={(r) => {
        setResponse(r);
        onResponse?.(r);
      }}
      onSubmit={onSubmit}
      disabled={false}
      result={result}
      reveal={reveal}
      idBase="t"
      keypad={false}
    />
  );
}

const FR: AnswerOf<'fraction'> = { kind: 'fraction', numerator: 2, denominator: 3, accept: 'equivalent' };
const frac = (numerator: string, denominator: string, whole?: string): Response => ({ kind: 'fraction', numerator, denominator, ...(whole !== undefined ? { whole } : {}) });

describe('fraction: checking', () => {
  it('exact: both numbers must match', () => {
    const a: Answer = { ...FR, numerator: 8, denominator: 12, accept: 'exact' };
    expect(checkAnswer(a, frac('8', '12')).correct).toBe(true);
    expect(checkAnswer(a, frac('2', '3')).correct).toBe(false);
  });
  it('equivalent: any equal value, by integer cross-multiplication', () => {
    expect(checkAnswer(FR, frac('2', '3')).correct).toBe(true);
    expect(checkAnswer(FR, frac('4', '6')).correct).toBe(true);
    expect(checkAnswer(FR, frac('200000', '300000')).correct).toBe(true);
    expect(checkAnswer(FR, frac('3', '4')).correct).toBe(false);
    // a float comparison would call these equal
    expect(checkAnswer({ ...FR, numerator: 1, denominator: 3 }, frac('333333333', '1000000000')).correct).toBe(false);
  });
  it('lowest: an equal value that can be shortened gets the neutral prompt and uses no attempt', () => {
    const a: Answer = { ...FR, accept: 'lowest' };
    expect(checkAnswer(a, frac('2', '3')).correct).toBe(true);
    const r = checkAnswer(a, frac('4', '6'));
    expect(r.correct).toBe(false);
    expect(r.invalid).toBe(FRACTION_NOT_LOWEST);
    expect(FRACTION_NOT_LOWEST).toBe('Das Ergebnis stimmt. Kannst du noch kürzen?');
    expect(checkAnswer(a, frac('3', '4')).invalid).toBeUndefined();
  });
  it('an empty field or Nenner 0 gives a parse message, not an attempt', () => {
    expect(checkAnswer(FR, frac('', '3')).invalid).toBeTruthy();
    expect(checkAnswer(FR, frac('2', '')).invalid).toBeTruthy();
    expect(checkAnswer(FR, frac('2', '0')).invalid).toBeTruthy();
  });
  it('with a whole: the value counts, bugs match on the pair and the whole', () => {
    const a: Answer = { ...FR, whole: 1, numerator: 1, denominator: 2 };
    expect(checkAnswer(a, frac('1', '2', '1')).correct).toBe(true);
    expect(checkAnswer(a, frac('2', '4', '1')).correct).toBe(true);
    expect(checkAnswer(a, frac('3', '2', '0')).correct).toBe(true);
    expect(checkAnswer(a, frac('1', '2', '')).invalid).toBeTruthy();
    const bugs = [{ id: 'x', match: { numerator: 1, denominator: 2, whole: 2 }, hint: 'Schau auf die Ganzen.' }];
    expect(checkAnswer(a, frac('1', '2', '2'), bugs).bugId).toBe('x');
  });
  it('formats the answer with a stacked token and reads it as words', () => {
    expect(formatAnswer(FR)).toBe('{frac:2/3}');
    expect(taskSpeech({ prompt: 'Trage {frac:2/3} ein.', answer: FR } as never)).toContain('zwei Drittel');
  });
});

describe('fraction: input', () => {
  it('has Zähler above and Nenner below, digits only; the whole only when set', () => {
    const onResponse = vi.fn();
    render(<Host answer={FR} onResponse={onResponse} />);
    expect(screen.queryByLabelText('Ganze')).toBeNull();
    const num = screen.getByLabelText('Zähler') as HTMLInputElement;
    fireEvent.change(num, { target: { value: '2a−' } });
    expect(num.value).toBe('2');
    fireEvent.change(screen.getByLabelText('Nenner'), { target: { value: '3' } });
    expect(onResponse).toHaveBeenLastCalledWith({ kind: 'fraction', numerator: '2', denominator: '3' });
    cleanup();
    render(<Host answer={{ ...FR, whole: 1 }} />);
    expect(screen.getByLabelText('Ganze')).toBeTruthy();
  });
  it('reveal shows the solution, print shows empty boxes', () => {
    render(<Host answer={FR} reveal />);
    expect((screen.getByLabelText('Zähler') as HTMLInputElement).value).toBe('2');
    cleanup();
    const { container } = render(<AnswerInput answer={FR} response={null} onChange={() => {}} onSubmit={() => {}} disabled result={null} reveal={false} idBase="p" keypad={false} print />);
    expect(container.querySelector('input')).toBeNull();
    expect(container.querySelectorAll('.print-box')).toHaveLength(2);
  });
});

const PT: AnswerOf<'point'> = { kind: 'point', xMin: 0, xMax: 8, yMin: 0, yMax: 8, step: 1, target: [3, 2], tolerance: 0 };

describe('point', () => {
  it('correct only if exact; a swapped pair matches its bug', () => {
    const bugs = [{ id: 'koord-getauscht', match: { x: 2, y: 3 }, hint: 'Erst nach rechts, dann nach oben.' }];
    expect(checkAnswer(PT, { kind: 'point', points: [{ x: 3, y: 2 }] }).correct).toBe(true);
    const r = checkAnswer(PT, { kind: 'point', points: [{ x: 2, y: 3 }] }, bugs);
    expect(r.correct).toBe(false);
    expect(r.bugId).toBe('koord-getauscht');
    expect(correctResponse(PT)).toEqual({ kind: 'point', points: [{ x: 3, y: 2 }] });
  });
  it('snaps to the nearest grid intersection, inside the grid', () => {
    expect(snapToGrid(2.4, 0, 8, 1)).toBe(2);
    expect(snapToGrid(2.6, 0, 8, 1)).toBe(3);
    expect(snapToGrid(99, 0, 8, 1)).toBe(8);
    expect(snapToGrid(-99, -8, 8, 1)).toBe(-8);
  });
  it('the keys and the 48 px step buttons move the marker; the live label shows P(3 | 5); Enter checks only with a marker', () => {
    const onResponse = vi.fn();
    const onSubmit = vi.fn();
    const { container } = render(<Host answer={PT} onResponse={onResponse} onSubmit={onSubmit} />);
    const area = container.querySelector<HTMLElement>('.pt-input__area')!;
    expect(area.dataset.answerEmpty).toBe('true');
    fireEvent.keyDown(area, { key: 'Enter' });
    expect(onSubmit).not.toHaveBeenCalled();
    fireEvent.keyDown(area, { key: 'ArrowRight' });
    expect(onResponse).toHaveBeenLastCalledWith({ kind: 'point', points: [{ x: 0, y: 0 }] });
    fireEvent.keyDown(area, { key: 'ArrowRight' });
    fireEvent.click(screen.getByRole('button', { name: 'Punkt einen Schritt nach oben' }));
    expect(onResponse).toHaveBeenLastCalledWith({ kind: 'point', points: [{ x: 1, y: 1 }] });
    expect(container.querySelector('output')!.textContent).toBe('P(1\u00A0|\u00A01)');
    expect(area.dataset.answerEmpty).toBe('false');
    expect(container.querySelector('[data-marker="set"]')).not.toBeNull();
    fireEvent.keyDown(area, { key: 'Enter' });
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });
  it('a marker never leaves the grid; a negative range works in four quadrants', () => {
    const onResponse = vi.fn();
    const { container } = render(<Host answer={{ ...PT, xMin: -8, yMin: -8, target: [-2, 3] }} onResponse={onResponse} />);
    const area = container.querySelector<HTMLElement>('.pt-input__area')!;
    fireEvent.keyDown(area, { key: 'ArrowLeft' });
    fireEvent.keyDown(area, { key: 'ArrowLeft' });
    expect(onResponse).toHaveBeenLastCalledWith({ kind: 'point', points: [{ x: -1, y: 0 }] });
    expect(container.querySelector('output')!.textContent).toBe('P(−1\u00A0|\u00A00)');
    expect(container.querySelector('[data-label-x="-8"]')!.textContent).toBe('−8');
  });
  it('reveal shows the target; print draws the empty grid with no controls', () => {
    const { container } = render(<Host answer={PT} reveal />);
    expect(container.querySelector('[data-marker="solution"]')).not.toBeNull();
    expect(container.querySelector('output')!.textContent).toBe('P(3\u00A0|\u00A02)');
    cleanup();
    const print = render(<AnswerInput answer={PT} response={null} onChange={() => {}} onSubmit={() => {}} disabled result={null} reveal={false} idBase="p" keypad={false} print />);
    expect(print.container.querySelector('button')).toBeNull();
    expect(print.container.querySelector('[data-testid="coordinate-axes"]')).not.toBeNull();
  });
});

describe('number: signed and tolerance', () => {
  const num = (text: string) => ({ kind: 'number', text }) as const;
  it('signed accepts − and -, +5 is 5, −0 is 0; without it a calm message', () => {
    const s: Answer = { kind: 'number', value: -5, signed: true };
    expect(checkAnswer(s, num('−5')).correct).toBe(true);
    expect(checkAnswer(s, num('-5')).correct).toBe(true);
    expect(checkAnswer({ ...s, value: 5 }, num('+5')).correct).toBe(true);
    expect(checkAnswer({ ...s, value: 0 }, num('−0')).correct).toBe(true);
    expect(checkAnswer({ kind: 'number', value: 5 }, num('−5')).invalid).toBeTruthy();
  });
  it('multi fields are signed one by one', () => {
    const a: Answer = { kind: 'multi', fields: [{ id: 'x', value: -2, signed: true }, { id: 'y', value: 3, signed: true }] };
    expect(checkAnswer(a, { kind: 'multi', values: { x: '−2', y: '3' } }).correct).toBe(true);
    expect(checkAnswer({ kind: 'multi', fields: [{ id: 'x', value: 2 }] }, { kind: 'multi', values: { x: '−2' } }).invalid).toBeTruthy();
  });
  it('tolerance is absolute, compared in integer steps of the decimals', () => {
    const a: Answer = { kind: 'number', value: 40, tolerance: 2 };
    for (const t of ['38', '42', '40']) expect(checkAnswer(a, num(t)).correct, t).toBe(true);
    for (const t of ['37', '43']) expect(checkAnswer(a, num(t)).correct, t).toBe(false);
    // 0.1 + 0.2 style drift must not reject the edge
    const d: Answer = { kind: 'number', value: 0.3, decimals: 1, tolerance: 0.1 };
    for (const t of ['0,2', '0,4']) expect(checkAnswer(d, num(t)).correct, t).toBe(true);
    expect(checkAnswer(d, num('0,5')).correct).toBe(false);
  });
});

describe('point: up to 3 points in any order', () => {
  const THREE: AnswerOf<'point'> = { ...PT, target: [1, 1], targets: [[1, 1], [4, 1], [4, 3]] };
  const pts = (...p: [number, number][]) => ({ kind: 'point', points: p.map(([x, y]) => ({ x, y })) }) as const;
  it('takes the points in any order; too few is a message and uses no attempt', () => {
    expect(checkAnswer(THREE, pts([4, 3], [1, 1], [4, 1])).correct).toBe(true);
    expect(checkAnswer(THREE, pts([1, 1], [4, 1])).invalid).toBe('Setze noch einen Punkt.');
    expect(checkAnswer(THREE, pts([1, 1], [4, 1], [5, 5])).correct).toBe(false);
    expect(correctResponse(THREE)).toEqual(pts([1, 1], [4, 1], [4, 3]));
  });
  it('a swapped pair among the points matches its bug', () => {
    const bugs = [{ id: 'koord-getauscht', match: { x: 3, y: 4 }, hint: 'Zuerst nach rechts: x.' }];
    expect(checkAnswer(THREE, pts([1, 1], [4, 1], [3, 4]), bugs).bugId).toBe('koord-getauscht');
  });
  it('Enter places a marker and starts the next; a further Enter checks; Entfernen takes one back', () => {
    const onResponse = vi.fn();
    const onSubmit = vi.fn();
    const { container } = render(<Host answer={{ ...PT, target: [1, 1], targets: [[1, 1], [4, 1]] }} onResponse={onResponse} onSubmit={onSubmit} />);
    const area = container.querySelector<HTMLElement>('.pt-input__area')!;
    fireEvent.keyDown(area, { key: 'ArrowRight' });
    fireEvent.keyDown(area, { key: 'Enter' });
    expect(onResponse).toHaveBeenLastCalledWith(pts([0, 0], [1, 0]));
    expect(onSubmit).not.toHaveBeenCalled();
    fireEvent.keyDown(area, { key: 'Enter' });
    expect(onSubmit).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: 'Punkt entfernen' }));
    expect(onResponse).toHaveBeenLastCalledWith(pts([0, 0]));
  });
  it('a step jumps over a marker in its way, and stays put at the edge', () => {
    const onResponse = vi.fn();
    const { container } = render(<Host answer={{ ...PT, target: [1, 1], targets: [[1, 1], [4, 1]] }} onResponse={onResponse} />);
    const area = container.querySelector<HTMLElement>('.pt-input__area')!;
    fireEvent.keyDown(area, { key: 'ArrowRight' }); // first marker at the origin
    fireEvent.keyDown(area, { key: 'Enter' }); // second beside it, at (1 | 0)
    fireEvent.keyDown(area, { key: 'ArrowLeft' }); // (0 | 0) is taken and the edge is behind it: no move
    expect(onResponse).toHaveBeenLastCalledWith(pts([0, 0], [1, 0]));
    fireEvent.keyDown(area, { key: 'ArrowRight' });
    fireEvent.keyDown(area, { key: 'ArrowLeft' });
    fireEvent.keyDown(area, { key: 'ArrowLeft' });
    expect(onResponse).toHaveBeenLastCalledWith(pts([0, 0], [1, 0]));
  });
  it('the grid never draws below 32 px between points on a phone', () => {
    const { container } = render(<Host answer={PT} />);
    const svg = container.querySelector<SVGElement>('.pt-input__svg')!;
    expect(svg.getAttribute('style')).toMatch(/--min-scale:\s*0\.8/);
    expect(svg.classList.contains('visual--readable')).toBe(true);
  });
});

describe('fraction: Ganze, sign and fields', () => {
  const FR: AnswerOf<'fraction'> = { kind: 'fraction', numerator: 3, denominator: 4, accept: 'lowest' };
  const f = (numerator: string, denominator: string, extra: { whole?: string; negative?: boolean } = {}) => ({ kind: 'fraction', numerator, denominator, ...extra }) as const;
  it('lowest: a correct unreduced answer uses no attempt, with the exact wording', () => {
    const r = checkAnswer(FR, f('6', '8'));
    expect(r.correct).toBe(false);
    expect(r.invalid).toBe('Das Ergebnis stimmt. Kannst du noch kürzen?');
    expect(FRACTION_NOT_LOWEST).toBe('Das Ergebnis stimmt. Kannst du noch kürzen?');
  });
  it('mixed: with allowMixed 11/4 and 2 3/4 are the same answer, and a whole alone is enough for a whole number', () => {
    const m: AnswerOf<'fraction'> = { kind: 'fraction', numerator: 3, denominator: 4, whole: 2, accept: 'lowest', allowMixed: true };
    expect(checkAnswer(m, f('11', '4')).correct).toBe(true);
    expect(checkAnswer(m, f('3', '4', { whole: '2' })).correct).toBe(true);
    expect(checkAnswer(m, f('3', '4')).correct).toBe(false);
    expect(checkAnswer({ kind: 'fraction', numerator: 0, denominator: 1, whole: 3, accept: 'equivalent', allowMixed: true }, f('', '', { whole: '3' })).correct).toBe(true);
    expect(correctResponse(m)).toEqual(f('3', '4', { whole: '2' }));
  });
  it('sign: with allowNegative the sign counts, and −0 is 0', () => {
    const n: AnswerOf<'fraction'> = { kind: 'fraction', numerator: 3, denominator: 4, negative: true, accept: 'equivalent', allowNegative: true };
    expect(checkAnswer(n, f('3', '4', { negative: true })).correct).toBe(true);
    expect(checkAnswer(n, f('3', '4')).correct).toBe(false);
    expect(checkAnswer({ ...n, numerator: 0, negative: false }, f('0', '4', { negative: true })).correct).toBe(true);
  });
  it('bugs match the exact form first; a whole or a sign the bug does not name must be absent', () => {
    const bugs = [{ id: 'nenner-bleibt', match: { numerator: 12, denominator: 5 }, hint: 'Beim Malnehmen gilt: Zähler mal Zähler.' }];
    const a: AnswerOf<'fraction'> = { kind: 'fraction', numerator: 12, denominator: 25, accept: 'lowest', allowMixed: true };
    expect(checkAnswer(a, f('12', '5'), bugs).bugId).toBe('nenner-bleibt');
    expect(checkAnswer(a, f('12', '5', { whole: '1' }), bugs).bugId).toBeUndefined();
  });
  it('the Ganze toggle hands the focus on to the field it opened, and back to the Zähler', () => {
    render(<Host answer={{ ...FR, allowMixed: true }} onResponse={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: 'Ganze' }));
    expect(document.activeElement).toBe(screen.getByLabelText('Ganze'));
    fireEvent.click(screen.getByRole('button', { name: 'Ganze' }));
    expect(document.activeElement).toBe(screen.getByLabelText('Zähler'));
  });

  it('the toggles: Ganze opens the field, ± shows the sign, for every item whatever the answer', () => {
    const onResponse = vi.fn();
    const { container } = render(<Host answer={{ ...FR, allowMixed: true, allowNegative: true }} onResponse={onResponse} />);
    expect(screen.queryByLabelText('Ganze')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Ganze' }));
    fireEvent.change(screen.getByLabelText('Ganze'), { target: { value: '2' } });
    expect(onResponse).toHaveBeenLastCalledWith(f('', '', { whole: '2' }));
    fireEvent.click(screen.getByRole('button', { name: 'Vorzeichen: Minus' }));
    expect(onResponse).toHaveBeenLastCalledWith(f('', '', { whole: '2', negative: true }));
    expect(container.querySelector('.ans-fraction__sign')!.textContent).toBe('−');
  });
  it('a physical minus key toggles the sign of the whole fraction', () => {
    const onResponse = vi.fn();
    render(<Host answer={{ ...FR, allowNegative: true }} onResponse={onResponse} />);
    fireEvent.keyDown(screen.getByLabelText('Zähler'), { key: '-' });
    expect(onResponse).toHaveBeenLastCalledWith(f('', '', { negative: true }));
  });
  it('on a keyboard / moves to the Nenner, and Tab order is Ganze, Zähler, Nenner', () => {
    render(<Host answer={{ ...FR, whole: 1 }} />);
    const inputs = screen.getAllByRole('textbox') as HTMLInputElement[];
    expect(inputs.map((i) => i.getAttribute('aria-label'))).toEqual(['Ganze', 'Zähler', 'Nenner']);
    inputs[1].focus();
    fireEvent.keyDown(inputs[1], { key: '/' });
    expect(document.activeElement).toBe(inputs[2]);
  });
});

describe('written: decimal numbers', () => {
  const w = (result: string, extra: { comma?: number; ueberschlag?: string } = {}) => ({ kind: 'written', result, ...extra }) as const;
  it('add and sub stand comma under comma; a result counts in units of the places', () => {
    const add: AnswerOf<'written'> = { kind: 'written', op: 'add', operands: [35, 125], decimalPlaces: [1, 2], result: 475 };
    expect(checkAnswer(add, w('475')).correct).toBe(true);
    expect(checkAnswer(add, w('476')).wrongColumns).toEqual([0]);
    expect(writtenPlaces(add)).toBe(2);
    expect(alignedOperands(add.operands, add.decimalPlaces)).toEqual([350, 125]);
    expect(formatAnswer(add)).toBe('4,75');
    const { container } = render(<Host answer={add} />);
    expect(container.querySelector('.wi-table')!.textContent).toContain(',');
    expect(container.querySelectorAll('.wi-padded')).toHaveLength(1);
    expect(screen.getByLabelText('Ergebnis, Hundertstel')).toBeTruthy();
    expect(screen.getByLabelText('Ergebnis, Einer')).toBeTruthy();
    cleanup();
    const sub: AnswerOf<'written'> = { kind: 'written', op: 'sub', operands: [35, 125], decimalPlaces: [1, 2], result: 225 };
    expect(checkAnswer(sub, correctResponse(sub)).correct).toBe(true);
  });
  it('mul: the child places the comma; without it a message and no attempt; the bug has the value', () => {
    const mul: AnswerOf<'written'> = { kind: 'written', op: 'mul', operands: [4, 3], decimalPlaces: [1, 1], result: 12 };
    expect(writtenPlaces(mul)).toBe(2);
    expect(checkAnswer(mul, w('12')).invalid).toBe(COMMA_MISSING);
    expect(checkAnswer(mul, w('12', { comma: 2 })).correct).toBe(true);
    const bugs = [{ id: 'komma-wie-plus', match: 1.2, hint: 'Zähle die Stellen nach dem Komma in beiden Faktoren zusammen.' }];
    const wrong = checkAnswer(mul, w('12', { comma: 1 }), bugs);
    expect([wrong.correct, wrong.commaCorrect, wrong.bugId]).toEqual([false, false, 'komma-wie-plus']);
    expect(responseForBug(mul, bugs[0])).toEqual(w('12', { comma: 1 }));
    expect(correctResponse(mul)).toEqual(w('12', { comma: 2 }));
    expect(formatAnswer(mul)).toBe('0,12');
    // 0,20 and 0,2 are the same value
    const m2: AnswerOf<'written'> = { kind: 'written', op: 'mul', operands: [5, 4], decimalPlaces: [1, 1], result: 20 };
    expect(checkAnswer(m2, w('2', { comma: 1 })).correct).toBe(true);
  });
  it('mul in the input: the comma key and the buttons set the comma, and the state is said in words', () => {
    const onResponse = vi.fn();
    const { container } = render(<Host answer={{ kind: 'written', op: 'mul', operands: [12, 34], decimalPlaces: [1, 1], result: 408 }} onResponse={onResponse} />);
    expect(container.querySelector('.wi-comma-state')!.textContent).toBe('Noch kein Komma gesetzt');
    fireEvent.click(screen.getByRole('button', { name: /Komma nach links/ }));
    fireEvent.click(screen.getByRole('button', { name: /Komma nach links/ }));
    expect(onResponse).toHaveBeenLastCalledWith(expect.objectContaining({ comma: 2 }));
    expect(container.querySelector('.wi-comma-state')!.textContent).toBe('2 Stellen nach dem Komma');
    fireEvent.click(screen.getByRole('button', { name: /Komma nach rechts/ }));
    expect(onResponse).toHaveBeenLastCalledWith(expect.objectContaining({ comma: 1 }));
    fireEvent.change(screen.getAllByLabelText(/Ergebnis, Stelle 4 von rechts/)[0], { target: { value: ',' } });
    expect(onResponse).toHaveBeenLastCalledWith(expect.objectContaining({ comma: 3 }));
  });
  it('div: shows the shift of the comma as a worked step, and has no Rest', () => {
    const div: AnswerOf<'written'> = { kind: 'written', op: 'div', operands: [8, 2], decimalPlaces: [1, 1], result: 4 };
    expect(shiftedDivision(div.operands, div.decimalPlaces)).toEqual({ dividend: 8, divisor: 2, shift: 1, dividendPlaces: 0 });
    expect(checkAnswer(div, correctResponse(div)).correct).toBe(true);
    const { container } = render(<Host answer={div} />);
    expect(screen.getByTestId('wi-shift').textContent!.replace(/\u00A0/g, ' ')).toBe('Verschiebe das Komma bei beiden Zahlen um 1 Stelle: 0,8 : 0,2 = 8 : 2');
    expect(screen.queryByRole('group', { name: 'Rest' })).toBeNull();
    cleanup();
    // 0,75 : 0,5 = 7,5 : 5 = 1,5
    const d2: AnswerOf<'written'> = { kind: 'written', op: 'div', operands: [75, 5], decimalPlaces: [2, 1], result: 15 };
    expect(writtenPlaces(d2)).toBe(1);
    expect(formatAnswer(d2)).toBe('1,5');
    const r2 = render(<Host answer={d2} />);
    expect(r2.container.querySelector('.wi-comma')).not.toBeNull();
    expect(checkAnswer(d2, w('1_')).invalid).toBeTruthy();
    expect(container).toBeTruthy();
  });
  it('only the calculation scrolls: it fits a 360 px screen', () => {
    const { container } = render(<Host answer={{ kind: 'written', op: 'add', operands: [12345678, 1234], decimalPlaces: [3, 3], result: 12346912 }} />);
    expect(container.querySelector('.wi-scroll table')).not.toBeNull();
    expect(container.querySelector('.written-input > .wi-legend')).not.toBeNull();
  });
  it('the worksheet prints the comma, in add and in div; mul leaves it to the child', () => {
    const print = (a: AnswerOf<'written'>) => render(<AnswerInput answer={a} response={null} onChange={() => {}} onSubmit={() => {}} disabled result={null} reveal={false} idBase="p" keypad={false} print />).container;
    expect(print({ kind: 'written', op: 'add', operands: [35, 125], decimalPlaces: [1, 2], result: 475 }).textContent).toContain(',');
    cleanup();
    const div = print({ kind: 'written', op: 'div', operands: [75, 5], decimalPlaces: [2, 1], result: 15 });
    expect(div.textContent).toContain('Verschiebe das Komma');
    expect(div.textContent).not.toContain('Rest');
  });
  it('natural-number written stays as it was', () => {
    const add: Answer = { kind: 'written', op: 'add', operands: [4873, 3125], result: 7998 };
    expect(checkAnswer(add, { kind: 'written', result: '7998' }).correct).toBe(true);
    expect(formatAnswer(add)).toBe('7998');
    const { container } = render(<Host answer={add} />);
    expect(container.querySelector('.wi-comma')).toBeNull();
  });
  it('a three-digit divisor has three Rest boxes, and a three-digit factor three partial product rows', () => {
    const { container } = render(<Host answer={{ kind: 'written', op: 'mul', operands: [1254, 307], result: 384978 }} />);
    expect(container.querySelectorAll('.wi-partial-row')).toHaveLength(3);
    cleanup();
    render(<Host answer={{ kind: 'written', op: 'div', operands: [98765, 123], result: 802, remainder: 119 }} />);
    expect(screen.getByRole('group', { name: 'Rest' }).querySelectorAll('input')).toHaveLength(3);
  });
});
