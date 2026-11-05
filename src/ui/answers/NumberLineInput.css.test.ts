import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const css = readFileSync(new URL('./NumberLineInput.css', import.meta.url), 'utf8');
const fieldNav = readFileSync(new URL('./fieldNav.css', import.meta.url), 'utf8');

describe('NumberLineInput.css', () => {
  it('the size container around the slider has an explicit width (otherwise the line collapses to 0 px)', () => {
    const rule = /\.nl-input__scroll\s*\{([^}]*)\}/.exec(css)?.[1] ?? '';
    expect(rule).toMatch(/container-type:\s*inline-size/);
    expect(rule).toMatch(/width:\s*100%/);
  });

  it('the focus ring stays inside the slider (its scroll wrapper clips anything outside)', () => {
    const own = /\.nl-input__slider:focus-visible\s*\{([^}]*)\}/.exec(css)?.[1] ?? '';
    expect(own).toMatch(/outline-offset:\s*-3px/);
    const answer = /\.answer-input \.nl-input__slider\[data-answer-field\]:focus\s*\{([^}]*)\}/.exec(fieldNav)?.[1] ?? '';
    expect(answer).toMatch(/outline-offset:\s*-3px/);
  });
});
