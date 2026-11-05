// T20 for this topic; src/ui/practice/speech.test.ts covers all topics at once.
import { describe, expect, it } from 'vitest';
import { taskSpeech } from '../../ui/practice/readAloud';
import { srTextWithPicture } from '../../ui/visuals/describe';
import { figure, figureWords } from './common';
import topic from './index';
import { allItems } from './testing';

const RAW_SIGN = /[·□−<>=+∥⊥]|(^|\s):(\s|$)|\{frac|\d[⁰¹²³⁴-⁹]/;

describe('flaechen: a figure in words', () => {
  it.each(topic.skills.map((s) => [s.id, s] as const))('%s: each measure has its place, and the picture is not read a second time without one', (_id, skill) => {
    for (const ex of allItems(skill, 30)) {
      if (ex.visual?.type !== 'figure') continue;
      const said = srTextWithPicture(ex);
      expect(said, `${ex.key}: ${said}`).not.toContain('Eine Seite:');
      expect(said, ex.key).toContain('Erste Seite');
      for (const label of ex.visual.sides ?? []) if (label) expect(figureWords(ex.visual), ex.key).toContain(label === '?' ? 'Fragezeichen' : label.replace(/^[a-z] = /, '').replace(/\u00A0/g, ' '));
    }
  });

  it('tells the base from the slanted side, the wall from the width, and names the sides without a number', () => {
    const para = figure({ points: [{ x: 0, y: 9 }, { x: 16, y: 9 }, { x: 28, y: 0 }, { x: 12, y: 0 }], sides: ['16 cm', '15 cm', null, null], height: { from: 3, to: { x: 12, y: 9 }, label: '9 cm' }, parallelMarks: [[0, 2], [1, 3]] });
    expect(figureWords(para)).toBe('Figur mit 4 Ecken. Der Weg um die Figur beginnt unten links. Erste Seite nach rechts: 16 cm. Zweite Seite schräg nach rechts oben: 15 cm. Dritte Seite nach links: ohne Zahl. Vierte Seite schräg nach links unten: ohne Zahl. Die gestrichelte Höhe geht von der Ecke oben senkrecht zur Seite unten: 9 cm. Parallel sind die erste und dritte Seite. Parallel sind die zweite und vierte Seite.');
    const house = figure({ points: [{ x: 0, y: 2 }, { x: 3, y: 0 }, { x: 6, y: 2 }, { x: 6, y: 6 }, { x: 0, y: 6 }], sides: [null, null, '4 cm', '6 cm', null], height: { from: 1, to: { x: 3, y: 2 }, label: '2 cm' } });
    expect(figureWords(house)).toContain('Dritte Seite nach unten: 4 cm. Vierte Seite nach links: 6 cm.');
    expect(figureWords(house)).toContain('senkrecht nach unten ins Innere der Figur: 2 cm');
  });
});

describe('flaechen: read-aloud', () => {
  it.each(topic.skills.map((s) => [s.id, s] as const))('%s says signs as words and no raw unit symbol', (_id, skill) => {
    for (const ex of allItems(skill, 12)) {
      const said = taskSpeech(ex, ex.hints);
      expect(said, ex.key).not.toMatch(RAW_SIGN);
      expect(said, `${ex.key}: ${said}`).not.toMatch(/(mm|cm|dm|km|m)[²³]/);
      expect(ex.srText, ex.key).not.toMatch(/[·□−]/);
    }
  });

  it.each(topic.skills.map((s) => [s.id, s] as const))('%s: a picture with numbers reaches the screen reader', (_id, skill) => {
    for (const ex of allItems(skill, 6)) {
      if (ex.visual?.type !== 'figure' && ex.visual?.type !== 'quader' && ex.visual?.type !== 'container') continue;
      expect(srTextWithPicture(ex).length, ex.key).toBeGreaterThan(ex.srText.length - 1);
      if (ex.visual.type === 'container') expect(srTextWithPicture(ex), ex.key).toContain(String(ex.visual.capacityMl));
    }
  });
});
