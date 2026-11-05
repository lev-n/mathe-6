// @vitest-environment jsdom
import { cleanup } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { IMPROVEMENT_BANNED_PHRASES } from '../../core/testing';
import { childTextProblems } from '../../core/textRules';
import { BADGES } from '../../state/badges';
import type { RoundNote, SkillGrowthView } from '../../state/growth';
import { ERROR_FAMILIES } from '../../topics/errorFamilies';
import { afterPracticeAnnouncement, agoPhrase, growthViewLines, noteParts, overcomeSentence, summaryAnnouncement, type NoteParts } from './growthText';
import { EFFORT_PHRASES, TWIN_SOLVED_PHRASES } from './phrases';

afterEach(cleanup);

vi.mock('../../topics/errorPhrases', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../topics/errorPhrases')>();
  // fixed test phrases, so these tests do not depend on the families of any topic
  const fixture: Record<string, { object: string; participle: string }> = {
    'test-plain': { object: 'den Übertrag', participle: 'richtig beachtet' },
    'test-anderes': { object: 'die Zahlen', participle: 'richtig geordnet' },
    'test-an': { object: 'an alle Rechenschritte', participle: 'gedacht' },
    'test-auch': { object: 'auch die großen Quadrate', participle: 'mitgezählt' },
  };
  return { ...actual, familyPhrase: (tag: string) => fixture[tag] ?? actual.familyPhrase(tag) };
});

const title = (id: string) => ({ 'brueche.anteil': 'Nachbarzahlen', 'dezimal.plus-minus': 'Plus ohne Übertrag' })[id] ?? id;
const line = (p: NoteParts) => (p.head ? `${p.head}: ${p.text}` : p.text);

const NOTES: RoundNote[] = [
  { kind: 'behalten', skillId: 'brueche.anteil', stufe: 2, days: 4 },
  { kind: 'besser', skillId: 'brueche.anteil', stufe: 2, early: 4, recent: 9 },
  { kind: 'besser', skillId: 'brueche.anteil', stufe: 1, early: 0, recent: 8 },
  { kind: 'besser', skillId: 'brueche.anteil', stufe: 3, early: 3, recent: 8 },
  { kind: 'fehler', skillId: 'dezimal.plus-minus', stufe: 2, tag: 'test-plain', run: 5 },
  { kind: 'zwilling', count: 1 },
  { kind: 'zwilling', count: 2 },
  { kind: 'selbst', count: 1 },
  { kind: 'selbst', count: 4 },
];

describe('round notes ("Das hast du verbessert")', () => {
  it('name what the child did, compared only with their own earlier answers', () => {
    expect(NOTES.map((n) => line(noteParts(n, title)))).toEqual([
      'Nachbarzahlen – Stufe 2: Vor ein paar Tagen war das noch knifflig. Heute hast du so eine Aufgabe auf Anhieb gelöst.',
      'Nachbarzahlen – Stufe 2: Am Anfang 4 von 10 auf Anhieb, jetzt 9 von 10.',
      'Nachbarzahlen – Stufe 1: Am Anfang war das noch knifflig – jetzt 8 von 10 auf Anhieb.',
      'Nachbarzahlen – Stufe 3: Am Anfang 3 von 10 auf Anhieb, jetzt 8 von 10.',
      'Plus ohne Übertrag: Du hast den Übertrag jetzt fünfmal richtig beachtet.',
      'Danach hast du die ähnliche Aufgabe auf Anhieb gelöst.',
      'Danach hast du 2 ähnliche Aufgaben auf Anhieb gelöst.',
      'Bei einer Aufgabe hast du deine Antwort selbst verbessert.',
      'Bei 4 Aufgaben hast du deine Antwort selbst verbessert.',
    ]);
  });

  it('keeps the skill title apart from the sentence (titles can end in "?" or contain commas)', () => {
    const odd = (id: string) => ({ 'dezimal.plus-minus': 'Plus oder minus?', 'dezimal.mal': 'Mal 2, 5 und 10' })[id] ?? id;
    expect(noteParts({ kind: 'besser', skillId: 'dezimal.plus-minus', stufe: 2, early: 4, recent: 9 }, odd)).toEqual({
      head: 'Plus oder minus? – Stufe 2',
      text: 'Am Anfang 4 von 10 auf Anhieb, jetzt 9 von 10.',
    });
    expect(noteParts({ kind: 'fehler', skillId: 'dezimal.mal', stufe: 1, tag: 'test-plain', run: 5 }, odd)).toEqual({
      head: 'Mal 2, 5 und 10',
      text: 'Du hast den Übertrag jetzt fünfmal richtig beachtet.',
    });
  });

  it('time phrases for a miss day', () => {
    expect([3, 6, 7, 8, 13, 14, 40].map(agoPhrase)).toEqual([
      'Vor ein paar Tagen',
      'Vor ein paar Tagen',
      'Vor einer Woche',
      'Vor mehr als einer Woche',
      'Vor mehr als einer Woche',
      'Vor ein paar Wochen',
      'Vor ein paar Wochen',
    ]);
  });

  it('error phrases: word order for prepositional objects, a calm fallback', () => {
    expect(overcomeSentence('test-an')).toBe('Du hast jetzt fünfmal an alle Rechenschritte gedacht.');
    expect(overcomeSentence('unbekannt')).toBe('Du hast die knifflige Stelle in diesen Aufgaben jetzt fünfmal richtig gelöst.');
    expect(overcomeSentence('test-plain', 5, '')).toBe('Du hast den Übertrag fünfmal richtig beachtet.');
    expect(overcomeSentence('test-auch')).toBe('Du hast jetzt fünfmal auch die großen Quadrate mitgezählt.');
  });

  it('every family sentence is a grammatical "Du hast …" sentence without traps', () => {
    for (const f of ERROR_FAMILIES) {
      const sentence = overcomeSentence(f.id, 5, 'jetzt ');
      expect(sentence, f.id).toMatch(/^Du hast .+ fünfmal .+\.$/);
      expect(sentence, f.id).not.toMatch(/\s{2}|\s\./);
      for (const banned of IMPROVEMENT_BANNED_PHRASES) expect(sentence.toLowerCase(), `${f.id}: ${banned}`).not.toContain(banned);
    }
  });
});

describe('text rules (docs/research.md §4)', () => {
  it('round notes and progress lines keep T4, T5, T6 and T8', () => {
    const title = () => 'Nachbarzahlen';
    const notes: RoundNote[] = [
      { kind: 'behalten', skillId: 'brueche.anteil', stufe: 2, days: 5 },
      { kind: 'zwilling', count: 1 },
      { kind: 'zwilling', count: 2 },
      { kind: 'selbst', count: 1 },
      { kind: 'selbst', count: 4 },
    ];
    expect(notes.flatMap((n) => childTextProblems(noteParts(n, title).text))).toEqual([]);
    const lines = growthViewLines({ stufen: [{ stufe: 2, kept: 1 }, { stufe: 3, kept: 3 }], overcome: [] });
    expect(lines.flatMap(childTextProblems)).toEqual([]);
  });
});

describe('progress view lines ("So hast du dich verbessert")', () => {
  it('positive lines only, a very low start is said in words', () => {
    const view: SkillGrowthView = {
      stufen: [
        { stufe: 1, window: { early: 4, best: 9 }, kept: 0 },
        { stufe: 2, level: 'gemeistert', early: 1, kept: 1 },
        { stufe: 3, window: { early: 2, best: 8 }, kept: 3 },
      ],
      overcome: ['test-plain', 'unbekannt', 'auch-unbekannt'],
    };
    expect(growthViewLines(view)).toEqual([
      'Stufe 1: Am Anfang 4 von 10 auf Anhieb, später 9 von 10.',
      'Stufe 2: Am Anfang war das noch knifflig – jetzt ist die Stufe „Gemeistert“.',
      'Stufe 2: Das war vorher noch knifflig. In der Wiederholung hast du es auf Anhieb gelöst.',
      'Stufe 3: Am Anfang 2 von 10 auf Anhieb, später 8 von 10.',
      'Stufe 3: Das war vorher noch knifflig. In der Wiederholung hast du es 3-mal auf Anhieb gelöst.',
      'Du hast den Übertrag fünfmal richtig beachtet.',
      // two unknown tags share the fallback: said once
      'Du hast die knifflige Stelle in diesen Aufgaben fünfmal richtig gelöst.',
    ]);
  });
});

describe('screen readers', () => {
  it('the announcement is short and complete, in spoken form', () => {
    const badge = BADGES.find((b) => b.id === 'behalten')!;
    expect(summaryAnnouncement(8, 10, ['a', 'b'], [badge])).toBe('8 von 10 geschafft. 2 Aufgaben waren noch knifflig. Darunter stehen deine Fortschritte. Neues Abzeichen: Gut behalten.');
    expect(summaryAnnouncement(3, 3, [], [])).toBe('3 von 3 geschafft.');
    expect(afterPracticeAnnouncement('Tschüss!', 0, [badge, BADGES.find((b) => b.id === 'besser-geworden')!])).toBe('Tschüss! Neue Abzeichen: Gut behalten, Besser geworden.');
  });

});

describe('improvement wording never uses the traps of improvement praise', () => {
  it('notes, progress lines, badges and in-item lines', () => {
    const texts = [
      ...NOTES.map((n) => line(noteParts(n, title))),
      ...growthViewLines({ stufen: [{ stufe: 1, window: { early: 4, best: 9 }, level: 'sicher', early: 4, kept: 2 }], overcome: ['uebertrag'] }),
      ...BADGES.filter((b) => b.improvement).flatMap((b) => [b.title, b.description]),
      ...TWIN_SOLVED_PHRASES,
      ...EFFORT_PHRASES,
    ];
    for (const t of texts) {
      for (const banned of IMPROVEMENT_BANNED_PHRASES) expect(t.toLowerCase(), `${banned} in ${t}`).not.toContain(banned);
      expect(t, t).not.toMatch(/(^|\s)0 von 10|schneller|schlau|Fehler!/);
    }
    // the twin lines name an action; at most one starts with "Diesmal" (it points back at the miss)
    expect(TWIN_SOLVED_PHRASES.filter((p) => p.startsWith('Diesmal'))).toHaveLength(1);
  });
});
