// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { glossTexts } from '../../data/glossary';
import { GlossedText } from './GlossedText';

afterEach(cleanup);

describe('GlossedText (T12)', () => {
  const [segments] = glossTexts(['Welcher Zähler passt zu {frac:3/4}?'], 'brueche');

  it('a tap opens the gloss in the text, a second tap closes it, nothing else moves', () => {
    const { container } = render(<p><GlossedText segments={segments} keyBase="a" /></p>);
    const word = screen.getByRole('button', { name: 'Zähler' });
    const gloss = () => container.querySelector('.gloss-text') as HTMLElement;
    expect(word.getAttribute('aria-expanded')).toBe('false');
    expect(gloss().hidden).toBe(true);
    expect(word.getAttribute('aria-controls')).toBe(gloss().id);
    fireEvent.click(word);
    expect(word.getAttribute('aria-expanded')).toBe('true');
    expect(gloss().hidden).toBe(false);
    expect(gloss().textContent).toBe('Die Zahl über dem Bruchstrich: So viele Teile zählst du.');
    fireEvent.click(word);
    expect(gloss().hidden).toBe(true);
    expect(container.querySelector('.frac')).not.toBeNull();
  });

  it('closes on a new task', () => {
    const { container, rerender } = render(<p><GlossedText segments={segments} keyBase="a" /></p>);
    fireEvent.click(screen.getByRole('button', { name: 'Zähler' }));
    rerender(<p><GlossedText segments={segments} keyBase="b" /></p>);
    expect((container.querySelector('.gloss-text') as HTMLElement).hidden).toBe(true);
  });

  it('a sign after the word stays with it, so it never starts a line alone', () => {
    const { container } = render(<p><GlossedText segments={glossTexts(['Wie groß ist die Höhe?'], 'flaechen')[0]} keyBase="a" /></p>);
    expect(container.querySelector('.gloss-pair')?.textContent).toBe('Höhe?');
    expect(container.textContent).toContain('Wie groß ist die Höhe?');
  });

  it('text without a Fachwort has no button', () => {
    render(<p><GlossedText segments={glossTexts(['Rechne.'], 'brueche')[0]} keyBase="a" /></p>);
    expect(screen.queryByRole('button')).toBeNull();
  });
});
