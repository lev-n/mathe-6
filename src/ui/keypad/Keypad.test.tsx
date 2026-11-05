// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, renderHook, screen } from '@testing-library/react';
import { useRef, useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import Keypad, { keypadTarget, useKeypadEnabled } from './Keypad';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function Harness({ onSubmit, fields = 1 }: { onSubmit: () => void; fields?: number }) {
  const scope = useRef<HTMLDivElement>(null);
  const [values, setValues] = useState<string[]>(Array(fields).fill(''));
  return (
    <div>
      <div ref={scope}>
        {values.map((v, i) => (
          <input
            key={i}
            type="text"
            inputMode="none"
            aria-label={`Feld ${i + 1}`}
            value={v}
            onChange={(e) => setValues((prev) => prev.map((x, j) => (j === i ? e.target.value : x)))}
          />
        ))}
      </div>
      <output data-testid="out">{values.join('|')}</output>
      <Keypad scopeRef={scope} onSubmit={onSubmit} submitDisabled={values.every((v) => v === '')} />
    </div>
  );
}

describe('Keypad: fractions and the ± key', () => {
  function Fractions() {
    const scope = useRef<HTMLDivElement>(null);
    return (
      <>
        <div ref={scope}>
          <input data-answer-field="" aria-label="Zähler" />
          <input data-answer-field="" aria-label="Nenner" />
        </div>
        <Keypad scopeRef={scope} onSubmit={() => {}} submitDisabled={false} next minus />
      </>
    );
  }
  it('↓ moves to the next field and comes round again', () => {
    render(<Fractions />);
    const [zaehler, nenner] = [screen.getByLabelText('Zähler'), screen.getByLabelText('Nenner')];
    zaehler.focus();
    fireEvent.click(screen.getByRole('button', { name: 'Nächstes Feld' }));
    expect(document.activeElement).toBe(nenner);
    fireEvent.click(screen.getByRole('button', { name: 'Nächstes Feld' }));
    expect(document.activeElement).toBe(zaehler);
  });
  it('the sign key reads as ±, and has no ↓ beside it without a fraction', () => {
    render(<Fractions />);
    expect(screen.getByRole('button', { name: 'Plus oder Minus' }).textContent).toBe('±');
    cleanup();
    const scope = { current: null };
    render(<Keypad scopeRef={scope} onSubmit={() => {}} submitDisabled={false} />);
    expect(screen.queryByRole('button', { name: 'Nächstes Feld' })).toBeNull();
  });
});

describe('Keypad', () => {
  it('has digits 0–9, minus, comma, delete and Prüfen in a labelled group; minus and comma are always in place, quiet when inactive', () => {
    const { getByRole } = render(<Harness onSubmit={() => {}} />);
    const group = getByRole('group', { name: 'Ziffernblock' });
    for (let d = 0; d <= 9; d++) expect(getByRole('button', { name: String(d) })).toBeTruthy();
    for (const name of ['Komma', 'Plus oder Minus']) {
      const key = getByRole('button', { name }) as HTMLButtonElement;
      expect(key.disabled, name).toBe(true);
      expect(key.className, name).toContain('is-quiet');
    }
    expect(getByRole('button', { name: 'Löschen' })).toBeTruthy();
    expect(getByRole('button', { name: 'Prüfen' })).toBeTruthy();
    expect(group.querySelectorAll('button')).toHaveLength(14);
  });

  it('types into the focused field, deletes, and submits', () => {
    const onSubmit = vi.fn();
    const { getByRole, getByLabelText, getByTestId } = render(<Harness onSubmit={onSubmit} />);
    const prufen = getByRole('button', { name: 'Prüfen' }) as HTMLButtonElement;
    expect(prufen.disabled).toBe(true);
    (getByLabelText('Feld 1') as HTMLInputElement).focus();
    fireEvent.click(getByRole('button', { name: '5' }));
    fireEvent.click(getByRole('button', { name: '6' }));
    expect(getByTestId('out').textContent).toBe('56');
    fireEvent.click(getByRole('button', { name: 'Löschen' }));
    expect(getByTestId('out').textContent).toBe('5');
    expect(prufen.disabled).toBe(false);
    fireEvent.click(prufen);
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it('keeps focus in the field (pointerdown is prevented)', () => {
    const { getByRole } = render(<Harness onSubmit={() => {}} />);
    const key = getByRole('button', { name: '3' });
    const ev = new Event('pointerdown', { bubbles: true, cancelable: true });
    key.dispatchEvent(ev);
    expect(ev.defaultPrevented).toBe(true);
    const md = new MouseEvent('mousedown', { bubbles: true, cancelable: true });
    key.dispatchEvent(md);
    expect(md.defaultPrevented).toBe(true);
  });

  it('uses the last focused field, or the first field, when no field is focused', () => {
    const { getByRole, getByLabelText, getByTestId } = render(<Harness onSubmit={() => {}} fields={2} />);
    fireEvent.click(getByRole('button', { name: '1' }));
    expect(getByTestId('out').textContent).toBe('1|');
    (getByLabelText('Feld 2') as HTMLInputElement).focus();
    (getByRole('button', { name: '9' }) as HTMLButtonElement).focus(); // e.g. keyboard user tabbed to the keypad
    fireEvent.click(getByRole('button', { name: '9' }));
    expect(getByTestId('out').textContent).toBe('1|9');
  });

  it('a physical keyboard still types into the field', () => {
    const { getByLabelText, getByTestId } = render(<Harness onSubmit={() => {}} />);
    fireEvent.change(getByLabelText('Feld 1'), { target: { value: '42' } });
    expect(getByTestId('out').textContent).toBe('42');
  });

  it('keypadTarget prefers the focused input inside the scope', () => {
    const { container } = render(
      <div>
        <div data-testid="scope">
          <input type="text" aria-label="a" />
          <input type="text" aria-label="b" />
        </div>
        <input type="text" aria-label="outside" />
      </div>,
    );
    const scope = container.querySelector('[data-testid=scope]') as HTMLElement;
    const [a, b, outside] = Array.from(container.querySelectorAll('input'));
    b.focus();
    expect(keypadTarget(scope, null)).toBe(b);
    outside.focus();
    expect(keypadTarget(scope, null)).toBe(a);
    expect(keypadTarget(scope, b)).toBe(b);
  });
});

describe('useKeypadEnabled', () => {
  const stubMatchMedia = (matches: boolean) =>
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches,
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
    }));

  it("'on' and 'off' override the device", () => {
    stubMatchMedia(false);
    expect(renderHook(() => useKeypadEnabled('on')).result.current).toBe(true);
    stubMatchMedia(true);
    expect(renderHook(() => useKeypadEnabled('off')).result.current).toBe(false);
  });

  it("'auto' follows (pointer: coarse)", () => {
    stubMatchMedia(true);
    expect(renderHook(() => useKeypadEnabled('auto')).result.current).toBe(true);
    stubMatchMedia(false);
    const { result } = renderHook(() => useKeypadEnabled('auto'));
    act(() => {});
    expect(result.current).toBe(false);
  });
});
