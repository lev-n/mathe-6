// The type and touch rules for 11–12-year-olds in the shared CSS (docs/research.md §7.1).
import { readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { AB_MIX, DEFAULT_STUFE, MAX_CHOICE_OPTIONS, MAX_MULTI_FIELDS, MAX_ORDER_ITEMS, ROUND_SIZE, SHORT_ROUND_SIZE, TEXT_LIMITS, UI_RULES, abSequence } from '../core/age';

const read = (file: string) => readFileSync(new URL(file, import.meta.url), 'utf8');
const tokens = read('./tokens.css');
const value = (name: string) => new RegExp(`--${name}:\\s*([^;]+);`).exec(tokens)?.[1] ?? '';

describe('type', () => {
  it('body is 18 px at every width, at most 65ch; the task expression at least 2rem', () => {
    expect(parseFloat(value('fs-body')) * 16).toBe(18);
    expect(tokens.match(/--fs-body:/g)).toHaveLength(1);
    expect(parseFloat(value('measure'))).toBeLessThanOrEqual(65);
    expect(parseFloat(value('fs-task'))).toBeGreaterThanOrEqual(2);
  });

  it('stacked fractions are at least 1.5 times the body height, with numerals of at least 20 px', () => {
    expect(read('./base.css')).toMatch(/\.frac \{[^}]*min-height:\s*calc\(1\.5em \* var\(--lh\)\)/);
    expect(read('./base.css')).toMatch(/\.frac__num, \.frac__den \{ font-size: max\(20px, 1em\)/);
  });

  it('the task text keeps the measure', () => {
    const css = read('../ui/practice/practice.css');
    for (const cls of ['pr-prompt', 'pr-context', 'pr-solution', 'pr-feedback__text']) {
      const rule = new RegExp(`\\.${cls}\\s*\\{([^}]*)\\}`).exec(css)?.[1] ?? '';
      expect(rule, cls).toMatch(/max-width:\s*var\(--measure\)/);
    }
  });
});

describe('the rules of §7.1 and §7.3 in src/core/age.ts', () => {
  it('10 items everywhere, no shorter written round; an optional short round of 5; the AB mix 7/2/1, 4/4/2, 2/5/3', () => {
    expect(ROUND_SIZE).toBe(10);
    expect(SHORT_ROUND_SIZE).toBe(5);
    expect(AB_MIX).toEqual({ 1: [7, 2, 1], 2: [4, 4, 2], 3: [2, 5, 3] });
    for (const stufe of [1, 2, 3] as const) {
      expect(abSequence(stufe)).toHaveLength(10);
      expect(abSequence(stufe, 5)).toHaveLength(5);
      expect(abSequence(stufe, 5).at(-1), 'a short round keeps a harder item').toBe(3);
    }
  });
  it('holdover 300 ms, break after 20 minutes, warm-up 3 to 5, 8 reviews a day, default Stufe 1, mixed after two Sicher skills', () => {
    expect(UI_RULES).toMatchObject({ holdoverMs: 300, breakAfterMinutes: 20, warmUpMin: 3, warmUpMax: 5, reviewsPerDay: 8, mixMinSicher: 2, pointSpacingPx: 32 });
    expect(DEFAULT_STUFE).toBe(1);
  });
  it('choice up to 8, order up to 6, multi up to 4', () => {
    expect([MAX_CHOICE_OPTIONS, MAX_ORDER_ITEMS, MAX_MULTI_FIELDS]).toEqual([8, 6, 4]);
  });
  it('T4: 14 words a sentence, 18 on Stufe 3', () => {
    expect(TEXT_LIMITS.sentenceWords).toEqual({ 1: 14, 2: 14, 3: 18 });
  });
});

describe('sober tone and look (§7.1, T16)', () => {
  const sources = (dir: string): string[] => (readdirSync(new URL(dir, import.meta.url), { recursive: true }) as string[])
    .filter((f) => /\.tsx?$/.test(f) && !/\.test\./.test(f) && f !== 'testFixtures.ts')
    .map((f) => read(`${dir}/${f}`));
  it('no "Kinder" or "Kids" in interface text', () => {
    for (const src of [...sources('../ui'), ...sources('../seo'), ...sources('../state')]) {
      expect(src).not.toMatch(/(?<![\p{L}.])(Kinder|Kindern|Kids)(?![\p{L}])/u);
    }
  });
  it('no confetti, no sound, no mascot and no timed mode', () => {
    for (const src of sources('../ui')) expect(src).not.toMatch(/confetti|konfetti|new Audio|AudioContext|Blitzrunde|setInterval/i);
  });
  it('plain marks with a legend, no star', () => {
    expect(read('../ui/app/Marks.tsx')).toMatch(/MarkLegend/);
    expect(read('../ui/app/icons.tsx')).not.toMatch(/StarIcon|STAR_PATH/);
    expect(read('../ui/app/app.css')).not.toMatch(/\.star\b/);
    expect(read('../ui/practice/RoundSummary.tsx')).not.toMatch(/M12 2\.8/);
  });
});

describe('touch', () => {
  it('keypad and primary buttons are 56 px, everything else 48 px', () => {
    expect(value('tap-lg')).toBe('56px');
    expect(value('tap')).toBe('48px');
    expect(value('tap-cell')).toBe('48px');
    expect(read('../ui/keypad/keypad.css')).toMatch(/\.keypad__key\s*\{[^}]*min-height:\s*var\(--tap-lg\)/);
    expect(read('../ui/answers/ChoiceInput.css')).toMatch(/\.ans-choice__option\s*\{[^}]*min-height:\s*var\(--tap-lg\)/);
    expect(read('../ui/answers/OrderInput.css')).toMatch(/\.ans-order__item\s*\{[^}]*min-height:\s*var\(--tap-lg\)/);
    expect(read('./base.css')).toMatch(/\.btn\s*\{[^}]*min-height:\s*var\(--tap\)/);
    expect(read('../ui/answers/PointInput.css')).toMatch(/\.pt-input__step\s*\{[^}]*width:\s*48px/);
  });

  it('keeps the compact short-phone rule, so that Prüfen stays visible', () => {
    expect(read('../ui/keypad/keypad.css')).toMatch(/@media \(max-width: 899px\) and \(max-height: 740px\) \{[^}]*\.keypad__submit \{ min-height: var\(--tap\)/);
  });

  it('no bouncing rewards: the summary has no pop or fade', () => {
    const css = read('../ui/practice/practice.css');
    expect(css).not.toMatch(/pr-pop|pr-fade|bounce/);
  });

  it('written calculations scroll inside their box, never the page', () => {
    expect(read('../ui/answers/WrittenInput.css')).toMatch(/\.wi-scroll\s*\{[^}]*overflow-x:\s*auto/);
    expect(read('../ui/visuals/WrittenVisual.css')).toMatch(/\.written-visual\s*\{[^}]*overflow-x:\s*auto/);
  });

  it('hit areas reach into the gaps', () => {
    const gap = 'inset:\\s*calc\\(var\\(--gap-tap\\) / -2\\)';
    expect(read('../ui/keypad/keypad.css')).toMatch(new RegExp(`\\.keypad__key::before[^}]*${gap}`));
    expect(read('./base.css')).toMatch(new RegExp(`\\.btn::before\\s*\\{[^}]*${gap}`));
    expect(read('../ui/answers/ChoiceInput.css')).toMatch(new RegExp(`\\.ans-choice__option::before\\s*\\{[^}]*${gap}`));
    expect(read('../ui/answers/OrderInput.css')).toMatch(new RegExp(`\\.ans-order__item::before\\s*\\{[^}]*${gap}`));
  });

  it('on phones the outer keys reach to the screen edge', () => {
    const css = read('../ui/keypad/keypad.css');
    expect(css).toMatch(/\.keypad__key--d7::before[^}]*left:\s*calc\(-1 \* var\(--space-4\)\)/);
    expect(css).toMatch(/\.keypad__key--back::before[^}]*right:\s*calc\(-1 \* var\(--space-4\)\)/);
  });

  it('nothing clips the hit areas', () => {
    const btn = /\.btn\s*\{([^}]*)\}/.exec(read('./base.css'))?.[1] ?? '';
    expect(btn).not.toMatch(/overflow:\s*hidden/);
    const key = /\.keypad__key\s*\{([^}]*)\}/.exec(read('../ui/keypad/keypad.css'))?.[1] ?? '';
    expect(key).not.toMatch(/overflow:\s*hidden/);
  });
});
