import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { STUFEN } from '../core/types';
import { loadAllTopics } from '../topics/registry';
import { CATALOGUE, CORE_SKILLS, DEFAULT_PLAN, PLAN_MAP, PLAN_OPTIONS, PLAN_TEXT, isInPlan, isPlanId, planStufen } from './plans';

const file = '../../docs/research.md'; // (a variable: Vite would turn a literal new URL(…) into an asset URL)
const research = readFileSync(new URL(file, import.meta.url), 'utf8');
/** The catalogue rows of §6: id → status. */
const rows = new Map(
  [...research.slice(research.indexOf('## 6. Skill catalogue'), research.indexOf('### New answer types')).matchAll(/^\| `([a-z]+\.[a-z-]+)` \|.*\| (core|opt) \| [^|]*\|$/gm)].map((m) => [m[1], m[2]]),
);
const allIds = Object.values(CATALOGUE).flat();

describe('the catalogue table', () => {
  it('holds every skill of §6, by topic', () => {
    expect(rows.size).toBe(allIds.length);
    expect([...allIds].sort()).toEqual([...rows.keys()].sort());
    for (const [topic, ids] of Object.entries(CATALOGUE)) ids.forEach((id) => expect(id.split('.')[0], id).toBe(topic));
  });

  it('marks the core skills of §6', () => {
    expect([...CORE_SKILLS].sort()).toEqual([...rows].filter(([, status]) => status === 'core').map(([id]) => id).sort());
  });
});

describe('the registry', () => {
  it('every topic has exactly the skills of the catalogue, in teaching order', async () => {
    for (const m of await loadAllTopics()) {
      expect(m.skills.map((s) => s.id), m.topicId).toEqual([...CATALOGUE[m.topicId]]);
    }
  });

  it('every id of the plan map exists', async () => {
    const built = (await loadAllTopics()).flatMap((m) => m.skills.map((s) => s.id));
    const planned = PLAN_MAP.flatMap((r) => [...Object.keys(r.optional), ...r.hiddenCore]);
    for (const id of planned) expect(allIds, id).toContain(id);
    for (const id of planned) expect(built, id).toContain(id);
  });
});

describe('the plan choice of §2.5', () => {
  it('uses the wording of the research, word for word', () => {
    for (const t of [PLAN_TEXT.line, PLAN_TEXT.question, PLAN_TEXT.note, 'Lehrplan: eingestellt']) expect(research).toContain(t);
  });

  it('has seven options, sorted by Land and then alphabetically, and the default is the last', () => {
    expect(PLAN_OPTIONS.map((o) => o.label)).toEqual(['Bayern Gymnasium', 'Bayern Mittelschule', 'Bayern Realschule', 'Berlin/Brandenburg Klasse 6', 'NRW Gesamtschule, Hauptschule, Realschule, Sekundarschule', 'NRW Gymnasium', 'Anderes Land oder weiß nicht']);
    const line = research.slice(research.indexOf('**Wording:**'), research.indexOf('**Effect:**'));
    let at = 0;
    for (const o of PLAN_OPTIONS) {
      const found = line.indexOf(o.label, at);
      expect(found, o.label).toBeGreaterThan(-1);
      at = found;
    }
    expect(DEFAULT_PLAN).toBe('offen');
    expect(PLAN_OPTIONS[PLAN_OPTIONS.length - 1].id).toBe(DEFAULT_PLAN);
  });

  it('has one row per plan except the default', () => {
    expect(PLAN_MAP.map((r) => r.id).sort()).toEqual(PLAN_OPTIONS.map((o) => o.id).filter((id) => id !== DEFAULT_PLAN).sort());
    expect(isPlanId('bg')).toBe(true);
    expect(isPlanId('gymnasium')).toBe(false);
  });

  /** The table of §2.5: code → optional ids with their restriction, and the hidden core skills. */
  const table = research.slice(research.indexOf('**Plan map: optional skills per plan**'), research.indexOf('**Core rule.**'));
  it.each(PLAN_MAP.map((r) => [r.code, r] as const))('row %s matches the research, with its Stufen', (code, row) => {
    const cells = new RegExp(`^\\| ${code} \\| (.*) \\| (.*) \\|$`, 'm').exec(table);
    expect(cells, code).not.toBeNull();
    const wanted = [...cells![1].matchAll(/`([a-z]+\.[a-z-]+)`(?: \(([^)]*)\))?/g)].map((m) => [m[1], m[2] ? m[2].split(', ').map((s) => Number(s.slice(1))) : 'alle']);
    const have = Object.entries(row.optional).map(([id, stufen]) => [id, stufen]);
    expect([...have].sort()).toEqual([...wanted].sort());
    for (const id of Object.keys(row.optional)) expect(CORE_SKILLS, id).not.toContain(id);
  });

  it('BB hides all of negativ and two percent skills, as §2.5 says; they stay reachable as Extras', () => {
    const bb = PLAN_MAP.find((r) => r.id === 'bb')!;
    expect([...bb.hiddenCore].sort()).toEqual([...CATALOGUE.negativ.filter((id) => CORE_SKILLS.includes(id)), 'prozent.bedeutung', 'prozent.umwandeln'].sort());
    expect(isInPlan('bb', 'negativ.kontext')).toBe(false);
    expect(isInPlan('bg', 'negativ.kontext')).toBe(true);
    expect(isInPlan('offen', 'negativ.kontext')).toBe(true);
  });

  it('without a plan the core counts and optional skills are Extras', () => {
    expect(allIds.filter((id) => isInPlan(DEFAULT_PLAN, id)).sort()).toEqual([...CORE_SKILLS].sort());
  });

  it('gives the Stufen of a restricted skill, and only those', () => {
    expect(planStufen('bm', 'brueche.geteilt')).toEqual([1]);
    expect(planStufen('bg', 'brueche.geteilt')).toEqual(STUFEN);
    expect(planStufen('nr', 'brueche.geteilt')).toEqual([]);
    expect(planStufen('bb', 'daten.kennwerte')).toEqual([1, 2]);
  });

  it('a plan never names a Stufe as a school: the option labels stay out of the catalogue and the row data', () => {
    for (const r of PLAN_MAP) expect(JSON.stringify(r)).not.toMatch(/Gymnasium|Realschule|Mittelschule|Hauptschule/);
  });
});
