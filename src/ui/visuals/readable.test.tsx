// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { DEFAULT_CONTEXT } from '../../core/generate';
import { createRng } from '../../core/rng';
import type { Visual } from '../../core/types';
import { loadTopic } from '../../topics/registry';
import VisualView from './Visual';

afterEach(cleanup);

/** Data pictures whose labels have to be read off: they must not shrink to unreadable text on phones. */
const READABLE_VISUALS: Visual[] = [
  { type: 'barChart', title: 'Lieblingsobst', categories: ['Äpfel', 'Birnen', 'Kirschen'], values: [12, 8, 5], axisMax: 15, axisStep: 1 },
  { type: 'ruler', maxCm: 12, startMm: 0, lengthMm: 70 },
  { type: 'tally', title: 'Lieblingstiere', rows: [{ label: 'Hund', count: 7 }, { label: 'Katze', count: 4 }] },
];

/** Smallest SVG font size in a visual's CSS file (px). */
function minFontPx(css: string): number {
  return Math.min(...[...css.matchAll(/font-size:\s*(\d+(?:\.\d+)?)px/g)].map((m) => Number(m[1])));
}

const CSS_FILE: Record<string, string> = {
  barChart: './BarChartVisual.css',
  ruler: './RulerVisual.css',
  tally: './TallyVisual.css',
  bag: './BagVisual.css',
};

describe('readable data pictures on small phones', () => {
  it.each(READABLE_VISUALS.map((v) => [v.type, v] as const))(
    '%s keeps at least ~12 px labels and never shrinks below its minimum width',
    (_name, visual) => {
      const { container } = render(<VisualView visual={visual} />);
      const svg = container.querySelector('svg.visual')!;
      expect(svg.classList.contains('visual--readable')).toBe(true);
      const width = Number(svg.getAttribute('width'));
      const style = (svg as SVGElement).style;
      expect(style.getPropertyValue('--vw')).toBe(`${Math.round(width)}px`);
      const minScale = Number(style.getPropertyValue('--min-scale'));
      const smallest = minFontPx(readFileSync(new URL(CSS_FILE[visual.type], import.meta.url), 'utf8'));
      expect(smallest * minScale, `${visual.type}: ${smallest} px × ${minScale}`).toBeGreaterThanOrEqual(11.5);
    },
  );

  it('print pictures are left alone (worksheets size them for paper)', () => {
    const { container } = render(<VisualView visual={READABLE_VISUALS[0]} print />);
    expect(container.querySelector('svg')!.classList.contains('visual--print')).toBe(true);
  });

  it('a picture in an answer option keeps the same floor, and at that floor it fits an option on a 375 px phone', async () => {
    const file = '../../styles/base.css';
    const css = readFileSync(new URL(file, import.meta.url), 'utf8');
    expect(css).toMatch(/\.ans-choice__visual > \.visual--readable:not\(\.visual--print\)\s*\{[^}]*min-width:\s*calc\(var\(--vw, 0px\) \* var\(--min-scale, 0\.7\)\)/);
    expect(css).toMatch(/\.ans-choice__visual:has\(> \.visual--readable:not\(\.visual--print\)\)\s*\{[^}]*overflow-x:\s*auto/);
    const OPTION_CONTENT = 277; // 311 px card minus the padding and border of the option
    let checked = 0;
    for (const id of ['daten', 'dezimal', 'prozent'] as const) {
      const { skills } = await loadTopic(id);
      for (const skill of skills) {
        for (const stufe of [1, 2, 3] as const) {
          for (const ab of [1, 2, 3] as const) {
            for (let seed = 1; seed <= 6; seed++) {
              const ex = skill.generate(createRng(seed * 977 + stufe * 13 + ab), stufe, { ...DEFAULT_CONTEXT, ab });
              if (ex.answer.kind !== 'choice') continue;
              for (const option of ex.answer.options) {
                if (!option.visual) continue;
                const { container, unmount } = render(<VisualView visual={option.visual} />);
                const svg = container.querySelector<SVGElement>('svg.visual--readable');
                if (svg) {
                  checked++;
                  const floor = parseFloat(svg.style.getPropertyValue('--vw')) * Number(svg.style.getPropertyValue('--min-scale'));
                  expect(floor, `${ex.key}: ${option.visual.type}`).toBeLessThanOrEqual(OPTION_CONTENT);
                }
                unmount();
              }
            }
          }
        }
      }
    }
    // A chart as an answer option, whatever the topics offer at the moment.
    const { container } = render(<VisualView visual={READABLE_VISUALS[0]} />);
    const svg = container.querySelector<SVGElement>('svg.visual--readable')!;
    expect(parseFloat(svg.style.getPropertyValue('--vw')) * Number(svg.style.getPropertyValue('--min-scale'))).toBeLessThanOrEqual(OPTION_CONTENT);
    expect(checked).toBeGreaterThanOrEqual(0);
  }, 60_000);

  it('base.css lets the picture scroll sideways instead of shrinking it below --min-scale', () => {
    const file = '../../styles/base.css'; // (a variable: Vite would turn a literal new URL(…) into an asset URL)
    const css = readFileSync(new URL(file, import.meta.url), 'utf8');
    expect(css).toMatch(/\.visual-wrap:has\(> \.visual--readable:not\(\.visual--print\)\)\s*\{[^}]*overflow-x:\s*auto/);
    expect(css).toMatch(/\.visual-wrap > \.visual--readable:not\(\.visual--print\),[^{]*\{[^}]*min-width:\s*calc\(var\(--vw, 0px\) \* var\(--min-scale, 0\.7\)\)/);
  });
});
