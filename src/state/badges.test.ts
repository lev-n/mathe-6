import { describe, expect, it } from 'vitest';
import { BANNED_PHRASES } from '../core/testing';
import { childTextProblems } from '../core/textRules';
import { BADGES, badgeById, badgeFacts, evaluateBadges } from './badges';
import { TOPIC_IDS } from './mastery';
import { emptyState } from './store';
import { entry, withSkills } from './testkit';
import type { ProgressState, StufeProgress } from './types';

const sicher = (...keys: string[]): Record<string, StufeProgress> => Object.fromEntries(keys.map((k) => [k, entry('sicher')]));

describe('badge definitions', () => {
  it('has one sicher and one gemeistert badge per topic, Stufe 3 and the four improvement badges, with unique ids and titles', () => {
    expect(BADGES.length).toBeGreaterThanOrEqual(15);
    expect(BADGES.length).toBeLessThanOrEqual(25);
    expect(BADGES.filter((b) => b.improvement).map((b) => b.id)).toEqual(['fehler-ueberwunden', 'besser-geworden', 'behalten', 'vieles-behalten']);
    // no badge for effort alone: small improvements (2nd try, twin task) get a calm line in the round only
    expect(badgeById('dranbleiber')).toBeUndefined();
    expect(new Set(BADGES.map((b) => b.id)).size).toBe(BADGES.length);
    expect(new Set(BADGES.map((b) => b.title)).size).toBe(BADGES.length);
  });

  it('every badge has a German title and a "Du …" description, in a plain look: no emoji, no icon', () => {
    for (const b of BADGES) {
      expect(b.title.length, b.id).toBeGreaterThan(3);
      expect(b.description, b.id).toMatch(/^Du .+\.$/);
      expect(b.description.split(/[.!?]/).filter((x) => x.trim()).every((sentence) => sentence.trim().split(/\s+/).length <= 15), b.description).toBe(true);
      expect(`${b.title} ${b.description}`, b.id).not.toMatch(/\p{Extended_Pictographic}/u);
      expect(Object.keys(b)).not.toContain('icon');
    }
  });

  it('keeps the text rules of docs/research.md §4 (T4, T5, T6, T8)', () => {
    expect(BADGES.flatMap((b) => childTextProblems(b.description))).toEqual([]);
  });

  it('uses no banned phrases, no participation wording and school notation', () => {
    for (const b of BADGES) {
      const text = `${b.title} ${b.description}`;
      const lower = text.toLowerCase();
      for (const banned of BANNED_PHRASES) expect(lower.includes(banned), `${banned} in ${text}`).toBe(false);
      expect(lower).not.toMatch(/anmeld|login|eingeloggt|erste[nrs]? (mal|besuch)|willkommen|teilgenommen|serie|schnell/);
      expect(text).not.toMatch(/[×÷*]|\d\.\d{3}/);
    }
  });

  it('no badge for trying all topics, none naming a track or trait (§7.1)', () => {
    expect(badgeById('allrounder')).toBeUndefined();
    for (const b of BADGES) expect(`${b.id} ${b.title}`, b.id).not.toMatch(/profi|kenner|\bmeister(in)?\b|held|genie|gymnasi|realschul|mittelschul|alle themen|allrounder|lehrplan/i);
  });

  it('badgeById', () => {
    expect(badgeById('stufe3')?.title).toBe('Stufe 3 gemeistert');
    expect(badgeById('brueche-sicher')?.title).toBe('Brüche: Sicher');
    expect(badgeById('prozent-sicher')?.title).toBe('Prozent: Sicher');
    expect(badgeById('brueche-gemeistert')?.title).toBe('Brüche: Gemeistert');
    expect(badgeById('gibt-es-nicht')).toBeUndefined();
  });
});

describe('no badge for just showing up', () => {
  it('an empty state or a little practice earns nothing', () => {
    expect(evaluateBadges(emptyState())).toEqual([]);
    const s = withSkills({ 'brueche.anteil#1': entry('geuebt'), 'flaechen.einheiten#1': entry('geuebt') });
    expect(evaluateBadges({ ...s, days: ['2026-10-19'], totals: { ...s.totals, answered: 50, firstTry: 40, rounds: 5 } })).toEqual([]);
  });
});

describe('topic badges', () => {
  it.each(TOPIC_IDS)('%s: one Stufe sicher → "-sicher"; one Stufe gemeistert → "-gemeistert"', (t) => {
    expect(evaluateBadges(withSkills({ [`${t}.x#2`]: entry('geuebt') }))).toEqual([]);
    expect(evaluateBadges(withSkills(sicher(`${t}.x#2`)))).toEqual([`${t}-sicher`]);
    expect(evaluateBadges(withSkills({ [`${t}.x#1`]: entry('gemeistert') }))).toEqual([`${t}-sicher`, `${t}-gemeistert`]);
  });

  it('already earned badges are not returned again', () => {
    const s = withSkills(sicher('brueche.anteil#1'));
    expect(evaluateBadges({ ...s, badges: { 'brueche-sicher': '2026-10-01' } })).toEqual([]);
  });
});

describe('cross-topic badges', () => {
  it('Stufe 3 gemeistert: one Stufe 3 at gemeistert, not at sicher', () => {
    expect(evaluateBadges(withSkills(sicher('brueche.von-groessen#3')))).not.toContain('stufe3');
    expect(evaluateBadges(withSkills({ 'brueche.von-groessen#3': entry('gemeistert') }))).toContain('stufe3');
    expect(evaluateBadges(withSkills({ 'brueche.von-groessen#1': entry('gemeistert') }))).not.toContain('stufe3');
  });

  it('practice days, rounds and answered tasks alone never earn a badge (no participation badges, § 6.4)', () => {
    // every day of a whole week, for every weekly goal
    const week = ['2026-10-19', '2026-10-20', '2026-10-21', '2026-10-22', '2026-10-23', '2026-10-24', '2026-10-25'];
    for (let goal = 1; goal <= 5; goal++) {
      const s = emptyState();
      const busy: ProgressState = { ...s, days: week, totals: { ...s.totals, answered: 500, rounds: 50 }, settings: { ...s.settings, weeklyGoal: goal } };
      expect(evaluateBadges(busy), `goal ${goal}`).toEqual([]);
    }
    expect(badgeById('wochenziel')).toBeUndefined();
  });

  it('badgeFacts summarises per topic', () => {
    const f = badgeFacts(withSkills({ ...sicher('brueche.von-groessen#1', 'brueche.von-groessen#2', 'brueche.von-groessen#3'), 'daten.c#1': entry('gemeistert') }));
    expect(f.sicherSkills.brueche).toBe(1);
    expect(f.sicherSkills.daten).toBe(1);
    expect(f.gemeistert.daten).toBe(1);
    expect(f.gemeistertTotal).toBe(1);
    expect(f.stufe3Gemeistert).toBe(0);
  });
});
