// The notes for adults must match the catalogue, and KMK tags are known ids.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { createRng } from '../core/rng';
import { DEFAULT_CONTEXT } from '../core/generate';
import type { Exercise, SkillDef, Stufe } from '../core/types';
import { TOPICS, loadTopic } from '../topics/registry';
import { LAENDER_DIFFERENCES, TOPIC_ALIGNMENT, UNVERIFIED, isKmkTag, KMK_TAGS } from './curriculum';

async function allSkills(): Promise<SkillDef[]> {
  return (await Promise.all(TOPICS.map((t) => loadTopic(t.id)))).flatMap((m) => m.skills);
}

function sample(skill: SkillDef, stufe: Stufe, n = 150, ab: 1 | 2 | 3 = 3): Exercise[] {
  return Array.from({ length: n }, (_, i) => skill.generate(createRng(i * 613 + stufe), stufe, { ...DEFAULT_CONTEXT, ab }));
}

describe('Länder notes on the adult page', () => {
  it('every topic has its plan alignment for Bayern, NRW and Berlin-Brandenburg', () => {
    for (const t of TOPICS) {
      const a = TOPIC_ALIGNMENT[t.id];
      expect(a.kmk.length, t.id).toBeGreaterThan(0);
      for (const text of [a.bayern, a.nrw, a.bb]) expect(text.trim().length, t.id).toBeGreaterThan(0);
    }
  });

  it('the notes name the differences that affect the app, in Sie or neutral, and never a Stufe as a Schulform', () => {
    const topics = LAENDER_DIFFERENCES.map((d) => d.topic);
    for (const t of ['Bruchrechnung', 'Prozentrechnung', 'Negative Zahlen', 'Andere Bundesländer']) expect(topics).toContain(t);
    for (const d of LAENDER_DIFFERENCES) {
      expect(d.text, d.topic).not.toMatch(/(?<![\p{L}])(du|dein|deine)(?![\p{L}])/iu);
      expect(d.text, d.topic).not.toMatch(/Stufe \d[^.]*(Gymnasium|Realschule|Mittelschule) (ist|heißt|bedeutet)/);
    }
  });

  it('the topic and storage wording of the page match the research: adult page only for the method, no extra switch', () => {
    const page = '../ui/pages/AdultsPage.tsx'; // (a variable: Vite would turn a literal new URL(…) into an asset URL)
    const text = readFileSync(new URL(page, import.meta.url), 'utf8');
    expect(text).not.toMatch(/methodAsked|set-extras|Einmaleins-Aufgabe/);
    expect(text).toMatch(/PlanChoice/);
  });
});

describe('what is not verified', () => {
  it('is said in Sie or neutral, and names the limits of §8', () => {
    for (const t of UNVERIFIED) expect(t).not.toMatch(/(?<![\p{L}])(du|dein|deine)(?![\p{L}])/iu);
    expect(UNVERIFIED.join(' ')).toMatch(/Baden-Württemberg/);
    expect(UNVERIFIED.join(' ')).toMatch(/Keine Lehrkraft/);
    expect(UNVERIFIED.join(' ')).toMatch(/Alternativtext/);
  });
});

describe('KMK tags', () => {
  it('a skill uses only known tags, and each tag names a Leitidee of §2.1 or a process competence', async () => {
    const skills = await allSkills();
    const items = skills.flatMap((s) => [1, 2, 3].flatMap((stufe) => sample(s, stufe as Stufe, 10)));
    for (const tag of new Set([...skills.flatMap((s) => s.kmk), ...items.flatMap((ex) => ex.kmk)])) expect(isKmkTag(tag), tag).toBe(true);
    const leitideen = ['Zahl und Operation', 'Größen und Messen', 'Strukturen und funktionaler Zusammenhang', 'Raum und Form', 'Daten und Zufall', 'Prozessbezogene Kompetenz'];
    for (const [id, tag] of Object.entries(KMK_TAGS)) expect(leitideen, id).toContain(tag.leitidee);
  });

  it('every tag is used by a skill or an item, so a tag names real content', async () => {
    const skills = await allSkills();
    const used = new Set([...skills.flatMap((s) => s.kmk), ...skills.flatMap((s) => [1, 2, 3].flatMap((stufe) => [1, 2, 3].flatMap((ab) => sample(s, stufe as Stufe, 12, ab as 1 | 2 | 3).flatMap((ex) => ex.kmk))))]);
    expect(Object.keys(KMK_TAGS).filter((id) => !used.has(id))).toEqual([]);
  });
});
