// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Exercise } from '../../core/types';
import ReadAloudButton from './ReadAloudButton';
import { localGermanVoice, taskSpeech } from './readAloud';

const voice = (lang: string, localService = true, name = lang) => ({ lang, localService, name }) as SpeechSynthesisVoice;

class FakeUtterance {
  voice: SpeechSynthesisVoice | null = null;
  lang = '';
  rate = 1;
  onend: (() => void) | null = null;
  onerror: (() => void) | null = null;
  text: string;
  constructor(text: string) {
    this.text = text;
  }
}

function stubSpeech(voices: SpeechSynthesisVoice[]) {
  const listeners = new Set<() => void>();
  const speech = {
    voices,
    getVoices: () => speech.voices,
    spoken: [] as FakeUtterance[],
    speak: vi.fn((u: FakeUtterance) => speech.spoken.push(u)),
    cancel: vi.fn(),
    addEventListener: (_: string, f: () => void) => listeners.add(f),
    removeEventListener: (_: string, f: () => void) => listeners.delete(f),
    fire: () => listeners.forEach((f) => f()),
  };
  vi.stubGlobal('speechSynthesis', speech);
  vi.stubGlobal('SpeechSynthesisUtterance', FakeUtterance);
  return speech;
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('localGermanVoice', () => {
  it('uses only local German voices, preferring de-DE', () => {
    expect(localGermanVoice([voice('de-DE', false), voice('en-GB')])).toBeNull();
    expect(localGermanVoice([voice('de-AT'), voice('de_DE'), voice('en-US')])?.lang).toBe('de_DE');
    expect(localGermanVoice([voice('de-CH'), voice('fr-FR')])?.lang).toBe('de-CH');
    expect(localGermanVoice([])).toBeNull();
  });
});

describe('taskSpeech', () => {
  const base = { prompt: 'Rechne.', hints: [], steps: [], praise: '', srText: '', kmk: [], key: 'x', topicId: 'schriftlich', skillId: 'x', stufe: 1, ab: 1 } as const;

  it('reads the unit beside the field, also without words around it', () => {
    const ex = { ...base, prompt: 'Wie lange dauert der Ausflug?', answer: { kind: 'number', value: 3, unit: 'Stunden' } } as unknown as Exercise;
    expect(taskSpeech(ex)).toBe('Wie lange dauert der Ausflug? Lücke Stunden.');
  });

  it('says a gap once when the expression already has it with its unit', () => {
    const single = { ...base, prompt: 'Schreibe in Euro mit Komma.', expression: '460 ct = □ €', answer: { kind: 'number', value: 4.6, decimals: 2, unit: '€' } } as unknown as Exercise;
    expect(taskSpeech(single).match(/Lücke/g)).toHaveLength(1);
    const two = { ...base, prompt: 'Schreibe ohne Komma.', expression: '8,20 € = □ € □ ct', answer: { kind: 'multi', fields: [{ id: 'e', value: 8, after: '€' }, { id: 'c', value: 20, after: 'ct' }] } } as unknown as Exercise;
    expect(taskSpeech(two).match(/Lücke/g)).toHaveLength(2);
    const rest = { ...base, expression: '17 : 5 = □ Rest □', answer: { kind: 'multi', fields: [{ id: 'q', value: 3 }, { id: 'r', value: 2, before: 'Rest' }] } } as unknown as Exercise;
    expect(taskSpeech(rest).match(/Lücke/g)).toHaveLength(2);
    // Words the expression does not have are still read: they say which gap is which.
    const named = { ...base, expression: '907 = □ + □', answer: { kind: 'multi', fields: [{ id: 'h', value: 900, before: 'Hunderter:' }, { id: 'e', value: 7, before: 'Einer:' }] } } as unknown as Exercise;
    expect(taskSpeech(named)).toContain('Hunderter: Lücke. Einer: Lücke.');
  });

  it('reads context, prompt, expression and hints, with numbers as words', () => {
    const ex = { ...base, context: 'Mia hat 34 Karten.', expression: '34 + 8 = □', answer: { kind: 'number', value: 42, before: 'Mia hat', after: 'Karten.' } } as unknown as Exercise;
    expect(taskSpeech(ex, ['Rechne erst bis 40.'])).toBe('Mia hat vierunddreißig Karten. Rechne. vierunddreißig plus acht gleich Lücke. Mia hat Lücke Karten. Rechne erst bis vierzig.');
  });

  it('reads the options and the items to order, never an answer value', () => {
    const choice = { ...base, answer: { kind: 'choice', options: [{ label: '34' }, { label: '43' }], correct: 0 } } as unknown as Exercise;
    expect(taskSpeech(choice)).toBe('Rechne. vierunddreißig. dreiundvierzig.');
    const order = { ...base, answer: { kind: 'order', items: ['12', '7'], correct: [1, 0], direction: 'aufsteigend' } } as unknown as Exercise;
    expect(taskSpeech(order)).toBe('Rechne. Zuerst das Kleinste, zuletzt das Größte. zwölf. sieben.');
    const number = { ...base, expression: '3 · 4 = □', answer: { kind: 'number', value: 12 } } as unknown as Exercise;
    expect(taskSpeech(number)).not.toContain('zwölf');
    const signs: Exercise = { ...choice, answer: { kind: 'choice', correct: 0, layout: 'symbols', options: [{ label: '<' }, { label: '>' }, { label: '=' }] } };
    expect(taskSpeech(signs)).toBe('Rechne. kleiner als. größer als. gleich.');
    const silent: Exercise = { ...choice, answer: { kind: 'choice', correct: 0, silentOptions: true, options: [{ label: '34' }, { label: '43' }] } };
    expect(taskSpeech(silent)).toBe('Rechne.');
  });
});

describe('ReadAloudButton', () => {
  it('shows from the first render when the voice is already known (no jump after the field was scrolled into view)', () => {
    stubSpeech([voice('de-DE')]);
    expect(renderToStaticMarkup(<ReadAloudButton text="Rechne." />)).toContain('Vorlesen');
  });

  it('is hidden without a voice, and without speechSynthesis', () => {
    render(<ReadAloudButton text="Rechne." />);
    expect(screen.queryByRole('button', { name: 'Vorlesen' })).toBeNull();
    cleanup();
    stubSpeech([voice('de-DE', false), voice('en-US')]);
    render(<ReadAloudButton text="Rechne." />);
    expect(screen.queryByRole('button', { name: 'Vorlesen' })).toBeNull();
  });

  it('shows up when the voice list arrives late, and never plays by itself', () => {
    const speech = stubSpeech([]);
    render(<ReadAloudButton text="Rechne." />);
    expect(screen.queryByRole('button', { name: 'Vorlesen' })).toBeNull();
    speech.voices = [voice('de-DE')];
    act(() => speech.fire());
    expect(screen.getByRole('button', { name: 'Vorlesen' })).toBeTruthy();
    expect(speech.speak).not.toHaveBeenCalled();
  });

  it('speaks with the local voice on a press, stops on a second press and when the task goes away', () => {
    const de = voice('de-DE');
    const speech = stubSpeech([de, voice('de-DE', false)]);
    const { unmount } = render(<ReadAloudButton text="Rechne." />);
    const button = screen.getByRole('button', { name: 'Vorlesen' });
    fireEvent.click(button);
    expect(speech.spoken).toHaveLength(1);
    expect(speech.spoken[0].text).toBe('Rechne.');
    expect(speech.spoken[0].voice).toBe(de);
    expect(speech.spoken[0].lang).toBe('de-DE');
    expect(button.getAttribute('aria-pressed')).toBe('true');
    const cancels = speech.cancel.mock.calls.length;
    fireEvent.click(button);
    expect(speech.cancel.mock.calls.length).toBe(cancels + 1);
    expect(button.getAttribute('aria-pressed')).toBe('false');
    fireEvent.click(button);
    act(() => speech.spoken[1].onend?.());
    expect(button.getAttribute('aria-pressed')).toBe('false');
    const before = speech.cancel.mock.calls.length;
    unmount();
    expect(speech.cancel.mock.calls.length).toBe(before + 1);
  });
});
