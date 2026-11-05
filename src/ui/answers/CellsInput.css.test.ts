import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const css = readFileSync(new URL('./CellsInput.css', import.meta.url), 'utf8');

describe('CellsInput.css', () => {
  it('hover tints only apply to real pointers (on touch screens :hover sticks and a switched-off cell looks half painted)', () => {
    const at = css.indexOf('@media (hover: hover)');
    expect(at).toBeGreaterThan(0);
    expect(css.slice(0, at)).not.toMatch(/:hover/);
    // nothing after the media block either
    const block = css.slice(at);
    const end = block.indexOf('\n}\n');
    expect(block.slice(end)).not.toMatch(/:hover/);
  });

  it('a painted cell has a mark with 3:1 on top of its tint (WCAG 1.4.11): the mark colour is pinned in contrast.test.ts', () => {
    const rule = css.match(/\.cells-cell\.is-on:not\(\.is-extra\):not\(\.is-solution\) \.cells-icon \{[^}]*\}/);
    expect(rule?.[0]).toContain('background: var(--primary)');
  });

  it('a given cell has dark stripes: 3:1 on the empty cell and on the tint (contrast.test.ts), the tint alone has 1.86:1', () => {
    const rule = css.match(/\.cells-cell\.is-given \{[^}]*\}/);
    expect(rule?.[0]).toContain('var(--primary) 0 3px');
  });

  it('on phones the line does not stick out of the grid: that alone would make the grid scroll up and down', () => {
    const phone = css.slice(css.indexOf('@media (max-width: 480px)'));
    expect(phone).toMatch(/\.cells-axis--vertical \{ top: 0; bottom: 0; \}/);
    expect(phone).toMatch(/\.cells-axis--horizontal \{ left: 0; right: 0; \}/);
    expect(css).toMatch(/\.cells-scroll \{[^}]*overflow-y: hidden/);
  });

  it('the key sentence only hides on touch screens', () => {
    expect(css).toMatch(/@media \(hover: none\) and \(pointer: coarse\) \{\s*\.cells-help-keys \{ display: none; \}/);
  });
});
