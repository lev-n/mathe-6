/** The generator sweep of errorFamilies.test.ts for this topic alone, so that it does not depend on the state of another topic. */
import { describe, expect, it } from 'vitest';
import { createRng } from '../../core/rng';
import type { GenContext, Stufe } from '../../core/types';
import { STUFEN } from '../../core/types';
import { bugKey, ERROR_FAMILIES, tagFor } from '../errorFamilies';
import families from './families';
import phrases from './phrases';
import topic from './index';

const SEEDS = 400;
const CONTEXTS: GenContext[] = (['abziehen', 'ergaenzen'] as const).map((subtractionMethod) => ({ subtractionMethod }));

describe('negativ: error families', () => {
  it('every family has a phrase, with the prefix of the topic', () => {
    expect(Object.keys(phrases).sort()).toEqual(Object.keys(families).sort());
    for (const id of Object.keys(families)) expect(id.startsWith('negativ-'), id).toBe(true);
  });

  it(`every Bug id (Stufe 1–3, ${SEEDS} seeds) has a family of its skill, and every table entry is emitted`, () => {
    const unmapped = new Set<string>();
    const emitted = new Set<string>();
    for (const skill of topic.skills) {
      for (const stufe of STUFEN as readonly Stufe[]) {
        for (let seed = 1; seed <= SEEDS; seed++) {
          const ex = skill.generate(createRng(seed * 104_729 + stufe * 31), stufe, CONTEXTS[seed % 2]);
          for (const b of ex.bugs ?? []) {
            emitted.add(`${skill.id}|${bugKey(b.id)}`);
            const family = ERROR_FAMILIES.find((f) => f.id === tagFor(skill.id, b.id));
            if (!family || !Object.hasOwn(family.skills, skill.id)) unmapped.add(`${skill.id} ${b.id}`);
          }
        }
      }
    }
    expect([...unmapped]).toEqual([]);
    const entries = Object.values(families).flatMap((skills) => Object.entries(skills).flatMap(([skillId, keys]) => keys.split(/\s+/).map((k) => `${skillId}|${k}`)));
    expect(entries.filter((k) => !emitted.has(k))).toEqual([]);
  });
});
