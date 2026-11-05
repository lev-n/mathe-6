import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { hintProblems, toneProblems } from '../core/textRules';
import { samples } from '../topics/test-utils';
import { loadAllTopics } from '../topics/registry';
import { FACHWOERTER, glossTexts, type GlossSegment } from './glossary';

const RESEARCH = '../../docs/research.md'; // (a variable: Vite would turn a literal new URL(…) into an asset URL)
const words = (s: readonly GlossSegment[]) => s.flatMap((x) => ('word' in x ? [x.word] : []));
const textOf = (s: readonly GlossSegment[]) => s.map((x) => ('word' in x ? x.word : x.text)).join('');

describe('glossary (T12)', () => {
  it('names every Fachwort of T12', () => {
    expect(FACHWOERTER.map((f) => f.word).sort()).toEqual(
      ['Zähler', 'Nenner', 'erweitern', 'kürzen', 'gleichnamig', 'Hauptnenner', 'Kehrwert', 'gemischte Zahl', 'Zehntel', 'Hundertstel', 'Tausendstel', 'Vorzeichen', 'Gegenzahl', 'Betrag', 'Term', 'Variable', 'Schenkel', 'Scheitel', 'Radius', 'Durchmesser', 'Grundseite', 'Höhe', 'Mittelwert', 'relative Häufigkeit', 'Grundwert', 'Prozentwert', 'Prozentsatz'].sort(),
    );
    const research = readFileSync(new URL(RESEARCH, import.meta.url), 'utf8');
    const t12 = /^\| T12 \|(.*)$/m.exec(research)![1];
    for (const f of FACHWOERTER) expect(t12, f.word).toContain(f.word);
  });

  it('a gloss is short, plain and keeps the tone (T19, T16)', () => {
    for (const f of FACHWOERTER) {
      expect(hintProblems(f.gloss), f.word).toEqual([]);
      expect(toneProblems([f.gloss]), f.word).toEqual([]);
    }
  });

  it('glosses only the first use across the texts of a task, in any form, and keeps the text', () => {
    const [context, prompt, hint] = glossTexts(['Der Term stimmt.', 'Erweitere den Bruch. Die Terme stimmen.', 'Der Nenner bleibt, der Zähler auch.'], 'brueche');
    expect(words(context)).toEqual(['Term']);
    expect(words(prompt)).toEqual(['Erweitere']);
    expect(words(hint)).toEqual(['Nenner', 'Zähler']);
    expect(textOf(prompt)).toBe('Erweitere den Bruch. Die Terme stimmen.');
  });

  it('leaves longer words and other meanings alone', () => {
    expect(words(glossTexts(['Der Scheitelwinkel, die Nennerzahl. Zähle und nenne.'], 'dezimal')[0])).toEqual([]);
    expect(words(glossTexts(['Welcher Betrag fehlt?'], 'dezimal')[0])).toEqual([]);
    expect(words(glossTexts(['Wie groß ist der Betrag?'], 'negativ')[0])).toEqual(['Betrag']);
  });

  it('a text without a Fachwort stays one text, and fractions stay whole', () => {
    expect(glossTexts(['Rechne.', ''], 'dezimal')).toEqual([[{ text: 'Rechne.' }], [{ text: '' }]]);
    expect(textOf(glossTexts(['{frac:3/4} hat den Nenner 4.'], 'brueche')[0])).toBe('{frac:3/4} hat den Nenner 4.');
  });

  it('never hands over a right choice: no gloss of a task holds the label of its answer', async () => {
    for (const mod of await loadAllTopics()) {
      for (const skill of mod.skills) {
        for (const stufe of [1, 2, 3] as const) {
          for (const ex of samples(skill, stufe, 60)) {
            if (ex.answer.kind !== 'choice') continue;
            const right = ex.answer.options[ex.answer.correct].label;
            const glosses = glossTexts([ex.context ?? '', ex.prompt, ...ex.hints], ex.topicId).flat().flatMap((s) => ('gloss' in s ? [s.gloss] : []));
            for (const g of glosses) expect(g.includes(right) && right.length > 2, `${ex.key}: ${right}`).toBe(false);
          }
        }
      }
    }
  }, 120_000);
});
