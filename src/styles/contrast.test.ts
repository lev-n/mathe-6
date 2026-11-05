// Verifies the colour tokens in tokens.css meet the contrast targets from docs/research.md.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const css = readFileSync(new URL('./tokens.css', import.meta.url), 'utf8');
/** Resolves a token to its hex value, following aliases such as `--text: var(--md-on-surface)`. */
const token = (name: string, depth = 0): string => {
  const m = css.match(new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{6}|var\\(--[a-z0-9-]+\\))`));
  if (!m) throw new Error(`token --${name} not found`);
  if (m[1].startsWith('#')) return m[1];
  if (depth > 5) throw new Error(`token --${name}: alias chain too deep`);
  return token(m[1].slice(6, -1), depth + 1);
};
const lum = (hex: string) => {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};
export const contrast = (a: string, b: string) => {
  const [l1, l2] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
};

describe('colour tokens', () => {
  it('task text ≥ 7:1 on surfaces', () => {
    for (const bg of ['surface', 'bg', 'surface-2']) expect(contrast(token('text'), token(bg))).toBeGreaterThanOrEqual(7);
  });
  it('muted text and feedback text ≥ 4.5:1', () => {
    for (const fg of ['text-muted', 'ok', 'retry', 'primary']) {
      for (const bg of ['surface', 'bg']) expect(contrast(token(fg), token(bg)), `${fg} on ${bg}`).toBeGreaterThanOrEqual(4.5);
    }
    expect(contrast(token('ok'), token('ok-soft'))).toBeGreaterThanOrEqual(4.5);
    expect(contrast(token('retry'), token('retry-soft'))).toBeGreaterThanOrEqual(4.5);
    expect(contrast(token('on-primary'), token('primary'))).toBeGreaterThanOrEqual(4.5);
    expect(contrast(token('on-primary'), token('primary-hover'))).toBeGreaterThanOrEqual(4.5);
  });
  it('borders, focus ring and topic accents ≥ 3:1', () => {
    for (const fg of ['border', 'focus', 'grid-line', 'topic-brueche', 'topic-dezimal', 'topic-negativ', 'topic-prozent', 'topic-terme', 'topic-geometrie', 'topic-flaechen', 'topic-daten']) {
      expect(contrast(token(fg), token('surface')), fg).toBeGreaterThanOrEqual(3);
    }
  });
  it('the mark of a painted grid cell and the stripes of a given one ≥ 3:1 on the tint and on the empty cell (WCAG 1.4.11)', () => {
    for (const bg of ['fill-1', 'surface']) expect(contrast(token('primary'), token(bg)), bg).toBeGreaterThanOrEqual(3);
  });
  it('a fill that carries data alone, and the edge of a painted grid cell, ≥ 3:1 on the surface (WCAG 1.4.11)', () => {
    expect(contrast(token('fill-strong'), token('surface'))).toBeGreaterThanOrEqual(3);
    expect(contrast(token('primary'), token('surface'))).toBeGreaterThanOrEqual(3);
  });
  it('the boxes of a written calculation have a border ≥ 3:1 on their fill and on the card (WCAG 1.4.11)', () => {
    for (const bg of ['surface-low', 'surface']) expect(contrast(token('border'), token(bg)), bg).toBeGreaterThanOrEqual(3);
    const written = readFileSync(new URL('../ui/answers/WrittenInput.css', import.meta.url), 'utf8');
    const rule = /\.wi-helper--digit \{[^}]*\}/.exec(written)?.[0] ?? '';
    expect(rule).toContain('border-style');
    expect(rule).not.toContain('--border-subtle');
  });
  it('topic accents are readable as text on their soft backgrounds', () => {
    for (const t of ['brueche', 'dezimal', 'negativ', 'prozent', 'terme', 'geometrie', 'flaechen', 'daten']) {
      expect(contrast(token(`topic-${t}`), token(`topic-${t}-bg`)), t).toBeGreaterThanOrEqual(4.5);
    }
  });
});
