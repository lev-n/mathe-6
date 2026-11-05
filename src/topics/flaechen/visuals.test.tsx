// @vitest-environment jsdom
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import type { Visual } from '../../core/types';
import VisualView from '../../ui/visuals/Visual';
import topic from './index';
import { allItems } from './testing';

afterEach(cleanup);

/** Width of the card on a 375 px phone; a readable picture may keep 75 % of its size and scroll beyond that (src/ui/visuals/types.ts). */
const PHONE_CONTENT = 311;
/** Height of a net whose 16 px labels stay at 12 px under the 55 mm cap of src/ui/pages/worksheet.css (208 px). */
const WORKSHEET_NET = 276;

function visualsOf(ex: ReturnType<typeof allItems>[number]): Visual[] {
  const out: Visual[] = ex.visual ? [ex.visual] : [];
  if (ex.answer.kind === 'choice') ex.answer.options.forEach((o) => o.visual && out.push(o.visual));
  ex.steps.forEach((s) => { if (typeof s !== 'string' && s.visual) out.push(s.visual); });
  return out;
}

/** The size of a label in src/ui/visuals/FigureVisual.tsx, for the glyphs: 17 px bold, 9.4 px per sign on average with getBBox in headless Chrome (jsdom measures no text). */
const CHAR_W = 9.4;
const LABEL_H = 17;

/** The box of a label from its anchor and text. */
function labelBox(text: Element) {
  const x = Number(text.getAttribute('x'));
  const y = Number(text.getAttribute('y'));
  const w = (text.textContent ?? '').length * CHAR_W;
  const left = text.getAttribute('text-anchor') === 'middle' ? x - w / 2 : text.getAttribute('text-anchor') === 'end' ? x - w : x;
  return { left, right: left + w, top: y - LABEL_H + 4, bottom: y + 4, text: text.textContent };
}

describe('the labels of a figure', () => {
  it.each(topic.skills.map((s) => [s.id, s] as const))('%s: no label lies on another', (_id, skill) => {
    for (const ex of allItems(skill, 40)) {
      if (ex.visual?.type !== 'figure') continue;
      const { container, unmount } = render(<VisualView visual={ex.visual} />);
      const svg = container.querySelector('svg')!;
      const boxes = [...svg.querySelectorAll('text')].map(labelBox);
      boxes.forEach((a, i) => boxes.slice(i + 1).forEach((b) => {
        const clear = a.right <= b.left || b.right <= a.left || a.bottom <= b.top || b.bottom <= a.top;
        expect(clear, `${ex.key}: '${a.text}' on '${b.text}'`).toBe(true);
      }));
      unmount();
    }
  });
});

describe('the pictures of the topic', () => {
  it.each(topic.skills.map((s) => [s.id, s] as const))('%s: each picture renders with a description and fits a phone', (_id, skill) => {
    for (const ex of allItems(skill, 8)) {
      for (const visual of visualsOf(ex)) {
        const { container, unmount } = render(<VisualView visual={visual} />);
        const svg = container.querySelector('svg');
        expect(svg, ex.key).not.toBeNull();
        expect(svg!.getAttribute('aria-label')?.length, ex.key).toBeGreaterThan(0);
        if (visual.type === 'figure' || (visual.type === 'net' && 'rects' in visual)) expect(Number(svg!.getAttribute('width')) * 0.75, ex.key).toBeLessThanOrEqual(PHONE_CONTENT);
        if (visual.type === 'net' && 'rects' in visual) expect(Number(svg!.getAttribute('height')), ex.key).toBeLessThanOrEqual(WORKSHEET_NET);
        unmount();
      }
    }
  });
});
