import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { createRng } from '../core/rng';
import { BANNED_PHRASES } from '../core/testing';
import type { GenContext, Stufe } from '../core/types';
import { STUFEN } from '../core/types';
import { normalizeTag } from '../state/growth';
import { ERROR_FAMILIES, FALLBACK_PHRASE, TOPIC_FAMILIES, bugKey, familyPhrase, tagFor, tagsFor } from './errorFamilies';
import * as errorPhrases from './errorPhrases';
import { TOPICS, loadAllTopics } from './registry';

const sentence = (tag: string) => {
  const { object, participle } = familyPhrase(tag);
  return `Du hast ${object} jetzt fünfmal ${participle}.`;
};
const familyIds = new Set(ERROR_FAMILIES.map((f) => f.id));
/** Every (skill, bug key, family) of the tables. */
const ENTRIES = ERROR_FAMILIES.flatMap((f) => Object.entries(f.skills).flatMap(([skillId, keys]) => keys.map((key) => ({ skillId, key, family: f.id }))));

describe('errorFamilies: the tables', () => {
  it('family ids are unique across topics, stable slugs that the progress store keeps unchanged', () => {
    expect(familyIds.size).toBe(ERROR_FAMILIES.length);
    for (const { id } of ERROR_FAMILIES) {
      expect(id, id).toMatch(/^[a-z][a-z0-9]*(?:[.-][a-z0-9]+)*$/);
      expect(id, id).not.toMatch(/-\d+$|-\d+-|-[A-Z]$/);
      expect(normalizeTag(id), id).toBe(id);
    }
  });

  it('a topic’s families.ts names only skills of that topic', () => {
    for (const t of TOPICS) {
      for (const [id, skills] of Object.entries(TOPIC_FAMILIES[t.id])) {
        for (const skillId of Object.keys(skills)) expect(skillId.split('.')[0], `${t.id}: ${id} ${skillId}`).toBe(t.id);
      }
    }
  });

  it('every (skill, bug key) belongs to exactly one family; every family applies to a skill', () => {
    const owner = new Map<string, string>();
    const conflicts: string[] = [];
    for (const f of ERROR_FAMILIES) {
      expect(Object.keys(f.skills).length, f.id).toBeGreaterThan(0);
      for (const [skillId, keys] of Object.entries(f.skills)) {
        expect(skillId, f.id).toMatch(/^[a-z]+\.[a-z0-9-]+$/);
        expect(keys.length, `${f.id} ${skillId}`).toBeGreaterThan(0);
        for (const key of keys) {
          // the tables list normalised keys only
          expect(bugKey(key), `${f.id} ${skillId} ${key}`).toBe(key);
          const k = `${skillId}|${key}`;
          if (owner.has(k)) conflicts.push(`${k}: ${owner.get(k)} and ${f.id}`);
          owner.set(k, f.id);
        }
      }
    }
    expect(conflicts).toEqual([]);
  });

  it('a stored family id given again keeps its family (no collision with a raw bug id of the same skill)', () => {
    for (const f of ERROR_FAMILIES) for (const skillId of Object.keys(f.skills)) expect(tagFor(skillId, f.id), `${skillId} ${f.id}`).toBe(f.id);
  });
});

describe('errorFamilies: bugKey', () => {
  it('drops the parts that only number the variants of a misconception', () => {
    const cases: [string, string][] = [
      ['vier-2', 'vier'],
      ['zeile-0-vergessen', 'zeile-vergessen'],
      ['faktor-10', 'faktor'],
      ['faktor-1000', 'faktor'],
      ['luecke-A', 'luecke'],
      ['nur-einer-b', 'nur-einer'],
      ['rechenart-+', 'rechenart'],
      ['rechenart--', 'rechenart'],
      ['rechenart-*', 'rechenart'],
      ['rechenart-:', 'rechenart'],
    ];
    for (const [id, key] of cases) expect(bugKey(id), id).toBe(key);
  });

  it('keeps words and numbers that are part of the misconception', () => {
    for (const id of ['minus-zehn', 'hs.minus-s', 'durch-10', 'bis-100', 'ohne-12', 'strich-100', 'strich-10g', 'ohne-1-und-zahl', 'ziffern-zu-10']) {
      expect(bugKey(id), id).toBe(id);
    }
  });
});

describe('errorFamilies: tagFor', () => {
  it('every table entry gives its family, also with an index on the bug id', () => {
    for (const { skillId, key, family } of ENTRIES) {
      expect(tagFor(skillId, key), `${skillId} ${key}`).toBe(family);
      expect(tagFor(skillId, `${key}-3`), `${skillId} ${key}-3`).toBe(family);
    }
  });

  it('unknown skills or ids fall back to the id without its index parts, which growth.ts keeps as it is', () => {
    expect(tagFor('brueche.von-groessen', 'one-more')).toBe('one-more');
    expect(tagFor('neu.skill', 'neu.fehler-3')).toBe('neu.fehler');
    expect(tagFor('neu.skill', 'zeile-12')).toBe('zeile');
    expect(tagFor('neu.skill', 'zeile-12-vergessen')).toBe('zeile-vergessen');
    expect(tagFor('neu.skill', 'luecke-B')).toBe('luecke');
    expect(tagFor('neu.skill', 'rechenart-+')).toBe('rechenart');
    for (const id of ['one-more', 'neu.fehler-3', 'zeile-12', 'faktor-10000', 'x-1-y-22', 'luecke-B', 'rechenart-:', 'toString']) {
      const tag = tagFor('neu.skill', id)!;
      expect(tag, id).not.toBeNull();
      expect(normalizeTag(tag), id).toBe(tag);
    }
  });

  it('families are per skill: a known bug key in another skill is not guessed', () => {
    for (const { key, family } of ENTRIES) expect(tagFor('neu.skill', key), key).not.toBe(family);
  });

  it('ids that are no usable tag give null; prototype names are plain strings', () => {
    for (const bad of ['', ' ', 'mit leerzeichen', 'ü-fehler', '__proto__', '<script>', '-x', 'x'.repeat(49)]) expect(tagFor('neu.skill', bad), bad).toBeNull();
    expect(tagFor('neu.skill', 3 as unknown as string)).toBeNull();
    expect(tagFor('constructor', 'toString')).toBe('toString');
    expect(tagFor('neu.skill', 'constructor')).toBe('constructor');
    expect(tagFor('__proto__', 'x')).toBe('x');
  });

  it('tagsFor: distinct tags in order, unusable ids dropped', () => {
    expect(tagsFor('neu.skill', ['a-1', 'b', 'a-2', 'kaputt id', 'c'])).toEqual(['a', 'b', 'c']);
    expect(tagsFor('neu.skill', undefined)).toEqual([]);
    expect(tagsFor('neu.skill', [])).toEqual([]);
    for (const { skillId, key, family } of ENTRIES) expect(tagsFor(skillId, [key, `${key}-1`]), `${skillId} ${key}`).toEqual([family]);
  });
});

describe('errorFamilies: familyPhrase', () => {
  it('unknown tags (also raw bug ids and prototype names) get the fallback phrase', () => {
    expect(FALLBACK_PHRASE).toEqual({ object: 'die knifflige Stelle in diesen Aufgaben', participle: 'richtig gelöst' });
    for (const tag of ['one-more', 'neu.fehler', '', 'constructor', '__proto__', 'toString']) expect(familyPhrase(tag), tag).toEqual(FALLBACK_PHRASE);
  });

  it('every sentence names what the child did, in du-form, without banned words, traits or speed', () => {
    const traits = /\b(schlau|klug|clever|begabt|talent\w*|schnell\w*|langsam\w*|super|toll\w*|großartig\w*|beste[nmrs]?|meister\w*|fehlerfrei)\b/i;
    const all = [...ERROR_FAMILIES.map((f) => sentence(f.id)), sentence('unbekannt')];
    for (const s of all) {
      expect(s).toMatch(/^Du hast .+ jetzt fünfmal .+\.$/);
      expect(s, s).not.toMatch(traits);
      expect(s, s).not.toMatch(/\s{2}|\s\.$/);
      const lower = s.toLowerCase();
      for (const banned of BANNED_PHRASES) expect(new RegExp(`(^|[^a-zäöüß])${banned}([^a-zäöüß]|$)`).test(lower), `"${banned}" in "${s}"`).toBe(false);
    }
  });

  it('within a skill, every family has its own sentence (the progress view lists them side by side)', () => {
    const bySkill = new Map<string, string[]>();
    for (const f of ERROR_FAMILIES) for (const skillId of Object.keys(f.skills)) bySkill.set(skillId, [...(bySkill.get(skillId) ?? []), f.id]);
    for (const [skillId, ids] of bySkill) {
      const texts = ids.map((id) => sentence(id));
      expect(new Set(texts).size, `${skillId}: ${texts.join(' | ')}`).toBe(texts.length);
      expect(texts, skillId).not.toContain(sentence('unbekannt'));
    }
  });
});

describe('errorPhrases: the phrases of the families', () => {
  it('every family has a phrase in its own topic’s phrases.ts and every phrase a family; errorFamilies.ts takes it from there', () => {
    for (const t of TOPICS) {
      const families = Object.keys(TOPIC_FAMILIES[t.id]).sort();
      const phrases = Object.keys(errorPhrases.TOPIC_PHRASES[t.id]).sort();
      expect(phrases, t.id).toEqual(families);
    }
    for (const f of ERROR_FAMILIES) {
      // the same objects, not copies
      expect(f.phrase, f.id).toBe(errorPhrases.familyPhrase(f.id));
      expect(f.phrase, f.id).not.toBe(FALLBACK_PHRASE);
    }
  });

  it('family ids in the phrase files are unique across topics', () => {
    const ids = Object.values(errorPhrases.TOPIC_PHRASES).flatMap((p) => Object.keys(p));
    expect(new Set(ids).size).toBe(ids.length);
    expect(Object.keys(errorPhrases.FAMILY_PHRASES).length).toBe(ids.length);
  });

  it('errorFamilies.ts re-exports the phrase lookup', () => {
    expect(familyPhrase).toBe(errorPhrases.familyPhrase);
    expect(FALLBACK_PHRASE).toBe(errorPhrases.FALLBACK_PHRASE);
  });

  it('the phrases import no code (the progress view needs them in the initial chunk)', () => {
    const importsOf = (url: URL) =>
      readFileSync(url, 'utf8')
        .split('\n')
        .filter((l) => /^\s*import\b/.test(l) || /^\s*export\b.*\bfrom\s/.test(l));
    for (const line of importsOf(new URL('./errorPhrases.ts', import.meta.url))) expect(line).toMatch(/^import type |^import [a-z]+ from '\.\/[a-z]+\/phrases';$/);
    for (const t of TOPICS) {
      for (const line of importsOf(new URL(`./${t.id}/phrases.ts`, import.meta.url))) expect(line, t.id).toMatch(/^import type /);
    }
  });
});

describe('errorFamilies: generator sweep', () => {
  const SEEDS = 400;
  const CONTEXTS: GenContext[] = (['abziehen', 'ergaenzen'] as const).map((subtractionMethod) => ({ subtractionMethod }));

  it(`every Bug id of every skill (Stufe 1–3, both methods, ${SEEDS} seeds) has a family of that skill, and every table entry is emitted`, async () => {
    const mods = await loadAllTopics();
    const unmapped = new Map<string, number>();
    const emitted = new Set<string>();
    for (const mod of mods) {
      for (const skill of mod.skills) {
        for (const stufe of STUFEN as readonly Stufe[]) {
          for (let seed = 1; seed <= SEEDS; seed++) {
            const ex = skill.generate(createRng(seed * 104_729 + stufe * 31), stufe, CONTEXTS[seed % 2]);
            const ids = (ex.bugs ?? []).map((b) => b.id);
            for (const id of ids) {
              emitted.add(`${skill.id}|${bugKey(id)}`);
              const tag = tagFor(skill.id, id);
              const family = ERROR_FAMILIES.find((f) => f.id === tag);
              if (!family || !Object.hasOwn(family.skills, skill.id)) {
                const k = `${skill.id} ${id} → ${tag}`;
                unmapped.set(k, (unmapped.get(k) ?? 0) + 1);
              }
            }
            for (const tag of tagsFor(skill.id, ids)) {
              if (!familyIds.has(tag)) unmapped.set(`${skill.id} tagsFor → ${tag}`, 1);
            }
          }
        }
      }
    }
    expect([...unmapped.keys()]).toEqual([]);
    // the other way round: a table entry that no generator emits is a dead key (remove it, or fix the generator)
    expect(ENTRIES.map((e) => `${e.skillId}|${e.key}`).filter((k) => !emitted.has(k))).toEqual([]);
    expect(mods.flatMap((m) => m.skills).length).toBeGreaterThan(0);
  }, 60_000);
});
