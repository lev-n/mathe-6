import { describe, expect, it } from 'vitest';
import { BANNED_PHRASES } from '../core/testing';
import { applyAnswer } from './mastery';
import { applyGrowth, emptyGrowth } from './growth';
import { IMPORT_MESSAGES, MAX_IMPORT_CHARS, CURRENT_VERSION, MIGRATIONS, migrate, parseDocument, parseSettings, parseText, sanitizeSettingsPatch, serializeState, validateState } from './schema';
import type { Migration } from './schema';
import { emptyState } from './store';
import { ev } from './testkit';
import { DEFAULT_SETTINGS } from './types';
import type { ProgressState } from './types';

function richState(): ProgressState {
  let s = emptyState();
  for (let i = 0; i < 8; i++) s = applyAnswer(s, ev()).state;
  s = applyAnswer(s, ev({ skillId: 'dezimal.stellenwert', topicId: 'dezimal' })).state;
  s = applyAnswer(s, ev({ skillId: 'brueche.gemischt', day: '2026-10-20' })).state;
  s = applyAnswer(s, ev({ purpose: 'review', day: '2026-10-20' })).state;
  return { ...s, badges: { 'brueche-sicher': '2026-10-19' }, settings: { ...s.settings, weeklyGoal: 4, plan: 'bm', notYet: ['brueche.mal'] } };
}

/** richState() with improvement tracking in every part of `growth`. */
function grownState(): ProgressState {
  let s = richState();
  const events = [
    ev({ day: '2026-10-21', firstTry: false, bugTags: ['abrunden-1', 'aufgerundet'], bugIds: ['abrunden-1'] }),
    ev({ day: '2026-10-22', bugTags: ['abrunden'] }),
  ];
  for (const e of events) s = applyGrowth(s, applyAnswer(s, e).state, e, e.day).state;
  return s;
}

const doc = (state: ProgressState) => JSON.parse(serializeState(state)) as Record<string, unknown>;

describe('serialisation round trip', () => {
  it('parseText(serializeState(s)) gives back the same state', () => {
    const s = richState();
    const r = parseText(serializeState(s));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.state).toEqual(s);
    expect(r.settingsValid).toBe(true);
    expect(r.state.reviewed).toEqual({ day: '2026-10-20', count: 1 });
    expect(r.state.lastPlayed).toEqual({ skillId: 'brueche.gemischt', stufe: 1 });
  });

  it('keeps a valid lastPlayed and drops a malformed one without rejecting the document', () => {
    const ok = doc(richState());
    expect(validateState(ok)!.state.lastPlayed).toEqual({ skillId: 'brueche.gemischt', stufe: 1 });
    for (const bad of [{ skillId: 'musik.noten', stufe: 1 }, { skillId: 'brueche.anteil', stufe: 4 }, { skillId: 3, stufe: 1 }, 'brueche.anteil', null]) {
      const d = doc(richState());
      d.lastPlayed = bad;
      const r = validateState(d);
      expect(r, JSON.stringify(bad)).not.toBeNull();
      expect(r!.state.lastPlayed).toBeUndefined();
    }
    const extra = doc(richState());
    extra.lastPlayed = { skillId: 'brueche.anteil', stufe: 2, at: '2026-10-19T14:37' };
    expect(validateState(extra)!.state.lastPlayed).toEqual({ skillId: 'brueche.anteil', stufe: 2 });
  });

  it('writes the app marker and the version', () => {
    const d = doc(emptyState());
    expect(d.app).toBe('mathe6');
    expect(d.version).toBe(CURRENT_VERSION);
    expect(CURRENT_VERSION).toBe(1);
  });

  it('accepts a document without the app marker if it looks like a state', () => {
    const { app: _app, ...rest } = doc(richState());
    void _app;
    expect(parseDocument(rest).ok).toBe(true);
  });
});

describe('migrate', () => {
  const fake: Record<number, Migration> = {
    0: (d) => ({ ...d, version: 1, skills: d.skillMap ?? {}, skillMap: undefined }),
    1: (d) => ({ ...d, version: 2, renamed: true }),
  };

  it('runs the steps from the stored version up to the target', () => {
    const r = migrate({ version: 0, skillMap: { a: 1 } }, fake, 2);
    expect(r).toEqual({ ok: true, data: { version: 2, skills: { a: 1 }, skillMap: undefined, renamed: true } });
    expect(migrate({ version: 2, x: 1 }, fake, 2)).toEqual({ ok: true, data: { version: 2, x: 1 } });
  });

  it('rejects newer, unknown or broken versions', () => {
    expect(migrate({ version: 3 }, fake, 2)).toEqual({ ok: false, error: 'newer-version' });
    expect(migrate({ version: -1 }, fake, 2)).toEqual({ ok: false, error: 'invalid' });
    expect(migrate({ version: '1' }, fake, 2)).toEqual({ ok: false, error: 'invalid' });
    expect(migrate({ version: 1.5 }, fake, 2)).toEqual({ ok: false, error: 'invalid' });
    expect(migrate({}, fake, 2)).toEqual({ ok: false, error: 'invalid' });
    // missing step
    expect(migrate({ version: 0 }, { 1: fake[1] }, 2)).toEqual({ ok: false, error: 'invalid' });
    // step that throws or forgets to bump the version
    expect(migrate({ version: 0 }, { 0: () => { throw new Error('x'); } }, 1)).toEqual({ ok: false, error: 'invalid' });
    expect(migrate({ version: 0 }, { 0: (d) => d }, 1)).toEqual({ ok: false, error: 'invalid' });
    // prototype keys are not steps
    expect(migrate({ version: 0 }, {}, 1)).toEqual({ ok: false, error: 'invalid' });
  });

  it('the first schema version has no migrations; unknown older versions are ignored safely', () => {
    expect(Object.keys(MIGRATIONS)).toEqual([]);
    const d = doc(richState());
    expect(migrate(d)).toEqual({ ok: true, data: d });
    expect(parseDocument({ ...d, version: 0 })).toEqual({ ok: false, error: 'invalid' });
  });

  it('a document of a newer version is rejected as such, never read as this version', () => {
    const d = doc(richState());
    expect(parseDocument({ ...d, version: CURRENT_VERSION + 1 })).toEqual({ ok: false, error: 'newer-version' });
    expect(parseText(JSON.stringify({ ...d, version: CURRENT_VERSION + 1 }))).toEqual({ ok: false, error: 'newer-version' });
    expect(IMPORT_MESSAGES['newer-version']).toMatch(/neueren Version/);
  });
});

describe('improvement tracking round trip', () => {
  it('keeps the growth data exactly', () => {
    const s = grownState();
    expect(Object.keys(s.growth.errors)).toEqual(['brueche.anteil']);
    const r = parseText(serializeState(s));
    expect(r.ok && r.state).toEqual(s);
  });
});

describe('validation of the improvement tracking: derived data never makes stored progress unloadable', () => {
  const base = () => doc(grownState());
  type G = { stufen: Record<string, Record<string, unknown>>; errors: Record<string, Record<string, Record<string, unknown>>> };
  const g = (d: Record<string, unknown>) => d.growth as G;
  const stufe = (d: Record<string, unknown>) => g(d).stufen['brueche.anteil#1'];
  const parsedGrowth = (d: Record<string, unknown>) => {
    const r = parseDocument(d);
    expect(r.ok).toBe(true);
    if (!r.ok) throw new Error('not ok');
    // everything else is untouched
    expect(r.state.skills).toEqual(grownState().skills);
    expect(r.state.badges).toEqual(grownState().badges);
    return r.state.growth;
  };

  it('a missing or broken growth loads as an empty tracking', () => {
    for (const bad of [undefined, null, [], 'kaputt', 3]) {
      const d = base();
      d.growth = bad;
      expect(parsedGrowth(d), String(bad)).toEqual(emptyGrowth());
    }
  });

  const dropped: Array<[string, (d: Record<string, unknown>) => unknown, (gr: ReturnType<typeof parsedGrowth>) => void]> = [
    ['stufen missing', (d) => delete (d.growth as Record<string, unknown>).stufen, (gr) => expect(gr.stufen).toEqual({})],
    ['a bad skill key', (d) => (g(d).stufen['brueche.anteil#7'] = stufe(d)), (gr) => expect(gr.stufen['brueche.anteil#7']).toBeUndefined()],
    ['an entry without a skill entry (orphan)', (d) => (g(d).stufen['geometrie.vierecke#2'] = stufe(d)), (gr) => expect(gr.stufen['geometrie.vierecke#2']).toBeUndefined()],
    ['earlyN not a count', (d) => (stufe(d).earlyN = 'zehn'), (gr) => expect(gr.stufen['brueche.anteil#1']).toBeUndefined()],
    ['after negative', (d) => (stufe(d).after = -1), (gr) => expect(gr.stufen['brueche.anteil#1']).toBeUndefined()],
    ['after above 10 (clamped)', (d) => (stufe(d).after = 11), (gr) => expect(gr.stufen['brueche.anteil#1'].after).toBe(10)],
    ['earlyOk above earlyN (clamped)', (d) => (stufe(d).earlyOk = 99), (gr) => expect(gr.stufen['brueche.anteil#1'].earlyOk).toBe(gr.stufen['brueche.anteil#1'].earlyN)],
    ['miss not a day (field dropped)', (d) => (stufe(d).miss = 20261019), (gr) => expect(gr.stufen['brueche.anteil#1']).not.toHaveProperty('miss')],
    ['earlyDay while the window is not full (field dropped)', (d) => (stufe(d).earlyDay = '2026-10-19'), (gr) => expect(gr.stufen['brueche.anteil#1']).not.toHaveProperty('earlyDay')],
    ['kept fractional (field dropped)', (d) => (stufe(d).kept = 1.5), (gr) => expect(gr.stufen['brueche.anteil#1']).not.toHaveProperty('kept')],
    ['improved not true (field dropped)', (d) => (stufe(d).improved = '2026-10-19'), (gr) => expect(gr.stufen['brueche.anteil#1']).not.toHaveProperty('improved')],
    ['later above the 8 blocks (clamped)', (d) => (stufe(d).later = 95), (gr) => expect(gr.stufen['brueche.anteil#1'].later).toBe(80)],
    [
      'run above 3 (clamped)',
      (d) => Object.assign(stufe(d), { run: 7, runDay: '2026-10-19' }),
      (gr) => expect(gr.stufen['brueche.anteil#1']).toMatchObject({ run: 3, runDay: '2026-10-19' }),
    ],
    [
      'run without its day, or a day without a run (dropped together)',
      (d) => Object.assign(stufe(d), { run: 2, runDay: 'gestern' }),
      (gr) => {
        expect(gr.stufen['brueche.anteil#1']).not.toHaveProperty('run');
        expect(gr.stufen['brueche.anteil#1']).not.toHaveProperty('runDay');
      },
    ],
    ['a run day without a run (dropped)', (d) => Object.assign(stufe(d), { run: 0, runDay: '2026-10-19' }), (gr) => expect(gr.stufen['brueche.anteil#1']).not.toHaveProperty('runDay')],
    ['an unknown field (dropped)', (d) => (stufe(d).unbekannt = 3), (gr) => expect(gr.stufen['brueche.anteil#1']).not.toHaveProperty('unbekannt')],
    ['errors for an unknown topic', (d) => (g(d).errors['musik.noten'] = {}), (gr) => expect(gr.errors['musik.noten']).toBeUndefined()],
    ['errors of a skill without entries', (d) => (g(d).errors['geometrie.vierecke'] = { x: { day: '2026-10-19', seen: 2, run: 5, done: '2026-10-20' } }), (gr) => expect(gr.errors['geometrie.vierecke']).toBeUndefined()],
    ['errors not an object', (d) => (g(d).errors['brueche.anteil'] = [] as unknown as Record<string, Record<string, unknown>>), (gr) => expect(gr.errors['brueche.anteil']).toBeUndefined()],
  ];

  it.each(dropped)('%s → dropped or clamped, the rest loads', (_name, mutate, check) => {
    const d = base();
    mutate(d);
    check(parsedGrowth(d));
  });

  it('tags are re-normalised, merged, trimmed or dropped', () => {
    const d = base();
    const errors = g(d).errors['brueche.anteil'];
    errors['abrunden-3'] = { day: '2026-10-25', seen: 1, run: 2 }; // merges with 'abrunden' (later day, more evidence)
    errors['ein tag'] = { day: '2026-10-19', seen: 1, run: 0 }; // dropped
    errors.ohneTag = { seen: 1, run: 0 }; // no day: dropped
    errors.kaputt = { day: '2026-10-19', seen: 1, run: 0, done: 'ja' }; // bad done: the field is dropped
    errors.lauf = { day: '2026-10-19', seen: 7, run: 9 }; // clamped to the current limits
    for (let i = 0; i < 14; i++) errors[`extra${'abcdefghijklmn'[i]}x`] = { day: `2026-09-${String(i + 1).padStart(2, '0')}`, seen: 1, run: 0 };
    const tracks = parsedGrowth(d).errors['brueche.anteil'];
    expect(Object.keys(tracks)).toHaveLength(12);
    expect(tracks.abrunden).toEqual({ day: '2026-10-25', seen: 1, run: 2 });
    expect(tracks.lauf).toEqual({ day: '2026-10-19', seen: 2, run: 5 });
    expect(tracks.kaputt).toEqual({ day: '2026-10-19', seen: 1, run: 0 });
    for (const gone of ['ein tag', 'ohneTag', 'abrunden-3', 'extraax']) expect(tracks[gone], gone).toBeUndefined();
  });
});

describe('validation rejects malformed documents', () => {
  const base = () => doc(richState());
  const skill = (d: Record<string, unknown>) => (d.skills as Record<string, Record<string, unknown>>)['brueche.anteil#1'];

  const cases: Array<[string, (d: Record<string, unknown>) => unknown]> = [
    ['negative attempts', (d) => (skill(d).attempts = -1)],
    ['fractional attempts', (d) => (skill(d).attempts = 1.5)],
    ['recent with strings', (d) => (skill(d).recent = ['ja'])],
    ['unknown mastery state', (d) => (skill(d).state = 'super')],
    ['box 6', (d) => (skill(d).box = 6)],
    ['impossible date', (d) => (skill(d).due = '2026-02-30')],
    ['practiceDays missing', (d) => delete skill(d).practiceDays],
    ['practiceDays negative', (d) => (skill(d).practiceDays = -1)],
    ['practiceDays a list', (d) => (skill(d).practiceDays = ['s1'])],
    ['reviewed with a bad day', (d) => (d.reviewed = { day: 'heute', count: 1 })],
    ['reviewed with a bad count', (d) => (d.reviewed = { day: '2026-10-19', count: 1.5 })],
    ['reviewed not an object', (d) => (d.reviewed = 3)],
    ['skill entry not an object', (d) => ((d.skills as Record<string, unknown>)['brueche.anteil#1'] = 5)],
    ['bad skill key', (d) => ((d.skills as Record<string, unknown>)['brueche.anteil#4'] = skill(d))],
    ['unknown topic', (d) => ((d.skills as Record<string, unknown>)['musik.noten#1'] = skill(d))],
    ['days not days', (d) => (d.days = ['gestern'])],
    ['days not a list', (d) => (d.days = '2026-10-19')],
    ['badge with bad day', (d) => (d.badges = { 'brueche-sicher': 'heute' })],
    ['totals missing', (d) => delete d.totals],
    ['totals with negative number', (d) => ((d.totals as Record<string, unknown>).rounds = -2)],
    ['skills is a list', (d) => (d.skills = [])],
  ];

  it.each(cases)('%s → invalid', (_name, mutate) => {
    const d = base();
    mutate(d);
    expect(parseDocument(d)).toEqual({ ok: false, error: 'invalid' });
  });

  it('rejects things that are not a Mathe 6 document', () => {
    expect(parseText('')).toEqual({ ok: false, error: 'empty' });
    expect(parseText('   ')).toEqual({ ok: false, error: 'empty' });
    expect(parseText('{nicht json')).toEqual({ ok: false, error: 'not-json' });
    expect(parseText('[]')).toEqual({ ok: false, error: 'not-mathe6' });
    expect(parseText('null')).toEqual({ ok: false, error: 'not-mathe6' });
    expect(parseText('42')).toEqual({ ok: false, error: 'not-mathe6' });
    expect(parseText('{"hello":"world"}')).toEqual({ ok: false, error: 'not-mathe6' });
    expect(parseText(JSON.stringify({ ...doc(emptyState()), app: 'anderes-spiel' }))).toEqual({ ok: false, error: 'not-mathe6' });
    expect(parseText('x'.repeat(MAX_IMPORT_CHARS + 1))).toEqual({ ok: false, error: 'too-large' });
    expect(parseText(undefined)).toEqual({ ok: false, error: 'empty' });
  });

  it('does not let __proto__ keys pollute anything', () => {
    const text = serializeState(emptyState()).replace('"skills":{}', '"skills":{"__proto__":{"polluted":true}}');
    expect(parseText(text)).toEqual({ ok: false, error: 'invalid' });
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
  });
});

describe('validation sanitises harmless deviations', () => {
  it('drops unknown fields and unknown badges, cuts lists, sorts and de-duplicates days', () => {
    const d = doc(richState());
    const sk = (d.skills as Record<string, Record<string, unknown>>)['brueche.anteil#1'];
    sk.recent = Array(15).fill(true);
    sk.checks = [true, false, true, true, true, true, false];
    sk.extra = 'weg damit';
    (d.reviewed as Record<string, unknown>).extra = 'weg';
    d.days = ['2026-10-20', '2026-10-19', '2026-10-20'];
    d.badges = { 'brueche-sicher': '2026-10-19', 'gibt-es-nicht': '2026-10-19' };
    d.name = 'Max Mustermann';
    const r = validateState(d, (id) => id === 'brueche-sicher');
    expect(r).not.toBeNull();
    const p = r!.state.skills['brueche.anteil#1'] as unknown as Record<string, unknown>;
    expect(p.recent).toHaveLength(10);
    expect(p.checks).toEqual([true, true, true, true, false]);
    expect(p.extra).toBeUndefined();
    expect(r!.state.reviewed).toEqual({ day: '2026-10-20', count: 1 });
    expect(r!.state.days).toEqual(['2026-10-19', '2026-10-20']);
    expect(r!.state.badges).toEqual({ 'brueche-sicher': '2026-10-19' });
    expect((r!.state as unknown as Record<string, unknown>).name).toBeUndefined();
  });

  it('falls back to default settings when the stored settings are invalid', () => {
    const d = doc(richState());
    (d.settings as Record<string, unknown>).weeklyGoal = 9;
    const r = parseDocument(d);
    expect(r.ok && r.settingsValid).toBe(false);
    expect(r.ok && r.state.settings).toEqual(DEFAULT_SETTINGS);
  });
});

describe('settings', () => {
  it('parseSettings fills missing fields with defaults and rejects invalid values', () => {
    expect(parseSettings({ weeklyGoal: 5 })).toEqual({ ...DEFAULT_SETTINGS, weeklyGoal: 5 });
    expect(parseSettings({ ...DEFAULT_SETTINGS, keypad: 'on', unknown: 1 })).toEqual({ ...DEFAULT_SETTINGS, keypad: 'on' });
    expect(parseSettings({ weeklyGoal: 0 })).toBeNull();
    expect(parseSettings({ weeklyGoal: 2.5 })).toBeNull();
    expect(parseSettings({ keypad: 'vielleicht' })).toBeNull();
    expect(parseSettings({ plan: 'gymnasium' })).toBeNull();
    expect(parseSettings({ notYet: 'brueche.mal' })).toBeNull();
    expect(parseSettings({ notYet: [3] })).toBeNull();
    expect(parseSettings(undefined)).toBeNull();
    expect(parseSettings([])).toBeNull();
  });

  it('sanitizeSettingsPatch keeps only valid fields', () => {
    expect(sanitizeSettingsPatch({ weeklyGoal: 7, largeText: true, keypad: 'maybe', foo: 1 })).toEqual({ largeText: true });
    expect(sanitizeSettingsPatch({ plan: 'bg', notYet: ['brueche.mal'], weeklyGoal: 1 })).toEqual({ plan: 'bg', notYet: ['brueche.mal'], weeklyGoal: 1 });
    expect(sanitizeSettingsPatch({ plan: 'gymnasium', extras: true } as never)).toEqual({});
    expect(sanitizeSettingsPatch(null)).toEqual({});
  });
});

describe('import messages', () => {
  it('are friendly German sentences without banned phrases', () => {
    for (const msg of Object.values(IMPORT_MESSAGES)) {
      expect(msg).toMatch(/^[A-ZÄÖÜ].*\.$/);
      const lower = msg.toLowerCase();
      for (const banned of BANNED_PHRASES) expect(lower.includes(banned), `${banned} in ${msg}`).toBe(false);
      expect(lower).not.toMatch(/fehler|error|ungültig|json/);
    }
  });
});
