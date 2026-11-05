/**
 * Versioned storage schema for key 'mathe6.v1': validation, migration and serialisation.
 * (The key name stays 'mathe6.v1'; the document inside carries its own `version`.)
 *
 * Everything that comes from storage or from an imported file is untrusted. Each field is
 * type-checked; unknown fields are dropped; lists are cut to their documented length.
 * Anything structurally wrong makes the whole document invalid (it is then ignored safely).
 * The store only ever writes data that passes this validation.
 */
import { isDay } from './dates';
import { ERROR_MIN_SEEN, GROWTH_WINDOW, IMPROVE_MAX_BLOCKS, IMPROVE_RUN, OVERCOME_RUN, capTracks, emptyGrowth, normalizeTag } from './growth';
import { CHECKS_SIZE, MAX_BOX, RECENT_SIZE, TOPIC_IDS, parseSkillKey } from './mastery';
import { isPlanId } from '../data/plans';
import { DEFAULT_SETTINGS } from './types';
import type { Day, ErrorTrack, Growth, GrowthStufe, MasteryState, ProgressState, Settings, StufeProgress } from './types';

export const CURRENT_VERSION = 1;
/** Marker that identifies a Mathe 6 backup file. */
export const APP_MARKER = 'mathe6';
export const MAX_IMPORT_CHARS = 2_000_000;
const MAX_SKILL_ENTRIES = 5_000;
const MAX_DAYS = 20_000;
const MAX_COUNT = 1_000_000_000;

type Obj = Record<string, unknown>;

export type SchemaError = 'empty' | 'too-large' | 'not-json' | 'not-mathe6' | 'newer-version' | 'invalid';

/** Friendly German messages for "Fortschritt laden" (shown to children and adults). */
export const IMPORT_MESSAGES: Record<SchemaError, string> = {
  empty: 'Die Datei ist leer. Wähle die Datei, die du mit „Fortschritt sichern“ gespeichert hast.',
  'too-large': 'Diese Datei ist zu groß für eine Sicherung von Mathe 6.',
  'not-json': 'Diese Datei kann ich nicht lesen. Wähle die Datei, die du mit „Fortschritt sichern“ gespeichert hast.',
  'not-mathe6': 'Das ist keine Sicherung von Mathe 6. Wähle die Datei, die du mit „Fortschritt sichern“ gespeichert hast.',
  'newer-version': 'Diese Sicherung kommt aus einer neueren Version von Mathe 6. Lade die Seite neu und versuche es noch einmal.',
  invalid: 'Die Sicherung ist beschädigt. Dein Fortschritt ändert sich nicht.',
};

export type Migration = (data: Obj) => Obj;

/**
 * MIGRATIONS[n] upgrades a document of version n to version n + 1.
 * When the schema changes: bump ProgressState.version, add the step and a unit test with a stored
 * document of the old version.
 */
export const MIGRATIONS: Readonly<Record<number, Migration>> = {};

export type MigrateResult = { ok: true; data: Obj } | { ok: false; error: SchemaError };

/** Runs the migrations from data.version up to `target`. Unknown, newer or failing versions are rejected. */
export function migrate(data: Obj, migrations: Readonly<Record<number, Migration>> = MIGRATIONS, target = CURRENT_VERSION): MigrateResult {
  let version = data.version;
  if (typeof version !== 'number' || !Number.isInteger(version) || version < 0) return { ok: false, error: 'invalid' };
  if (version > target) return { ok: false, error: 'newer-version' };
  let current = data;
  while (version < target) {
    const step: Migration | undefined = Object.prototype.hasOwnProperty.call(migrations, version) ? migrations[version] : undefined;
    if (!step) return { ok: false, error: 'invalid' };
    try {
      current = step(current);
    } catch {
      return { ok: false, error: 'invalid' };
    }
    if (!isObj(current) || current.version !== version + 1) return { ok: false, error: 'invalid' };
    version += 1;
  }
  return { ok: true, data: current };
}

// ─── Field validators ───────────────────────────────────────────────────────

function isObj(v: unknown): v is Obj {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function isCount(v: unknown, max = MAX_COUNT): v is number {
  return typeof v === 'number' && Number.isInteger(v) && v >= 0 && v <= max;
}

function boolList(v: unknown, keep: number): boolean[] | null {
  if (!Array.isArray(v) || v.length > 1_000 || !v.every((b) => typeof b === 'boolean')) return null;
  return (v as boolean[]).slice(-keep);
}

function optionalDay(v: unknown): { ok: boolean; day?: Day } {
  if (v === undefined) return { ok: true };
  return isDay(v) ? { ok: true, day: v } : { ok: false };
}

/** Per-skill "Haben wir noch nicht": at most the whole catalogue and a little room. */
const MAX_NOT_YET = 200;
const NOT_YET_ID = /^[a-z]+\.[A-Za-z0-9_.-]{1,60}$/;

const MASTERY: readonly MasteryState[] = ['neu', 'geuebt', 'sicher', 'gemeistert'];

const SETTING_CHECKS: { [K in keyof Settings]: (v: unknown) => boolean } = {
  subtractionMethod: (v) => v === 'abziehen' || v === 'ergaenzen',
  plan: isPlanId,
  notYet: (v) => Array.isArray(v) && v.length <= MAX_NOT_YET && v.every((id) => typeof id === 'string' && NOT_YET_ID.test(id)),
  weeklyGoal: (v) => typeof v === 'number' && Number.isInteger(v) && v >= 1 && v <= 5,
  largeText: (v) => typeof v === 'boolean',
  wideSpacing: (v) => typeof v === 'boolean',
  reduceMotion: (v) => typeof v === 'boolean',
  schoolFont: (v) => typeof v === 'boolean',
  keypad: (v) => v === 'auto' || v === 'on' || v === 'off',
};
const SETTING_KEYS = Object.keys(SETTING_CHECKS) as (keyof Settings)[];

/** Valid fields of a settings patch (invalid or unknown fields are dropped). */
export function sanitizeSettingsPatch(patch: unknown): Partial<Settings> {
  const out: Partial<Settings> = {};
  if (!isObj(patch)) return out;
  for (const key of SETTING_KEYS) {
    if (key in patch && SETTING_CHECKS[key](patch[key])) (out as Record<string, unknown>)[key] = patch[key];
  }
  return out;
}

/**
 * Settings from untrusted data: null if missing or if any known field has an invalid value.
 * Missing fields are filled with defaults; unknown fields are dropped.
 */
export function parseSettings(raw: unknown): Settings | null {
  if (!isObj(raw)) return null;
  for (const key of SETTING_KEYS) {
    if (key in raw && !SETTING_CHECKS[key](raw[key])) return null;
  }
  return { ...DEFAULT_SETTINGS, ...sanitizeSettingsPatch(raw) };
}

function parseStufe(v: unknown): StufeProgress | null {
  if (!isObj(v)) return null;
  const recent = boolList(v.recent, RECENT_SIZE);
  const checks = boolList(v.checks, CHECKS_SIZE);
  const since = optionalDay(v.sicherSince);
  const due = optionalDay(v.due);
  const last = optionalDay(v.last);
  if (
    !isCount(v.attempts) ||
    !recent ||
    !checks ||
    !isCount(v.practiceDays) ||
    !MASTERY.includes(v.state as MasteryState) ||
    !isCount(v.box, MAX_BOX) ||
    !since.ok ||
    !due.ok ||
    !last.ok
  ) {
    return null;
  }
  const p: StufeProgress = { attempts: v.attempts, recent, practiceDays: v.practiceDays, state: v.state as MasteryState, box: v.box, checks };
  if (since.day) p.sicherSince = since.day;
  if (due.day) p.due = due.day;
  if (last.day) p.last = last.day;
  return p;
}

const SKILL_ID_RE = /^([a-z]+)\.[A-Za-z0-9_.-]{1,60}$/;

function isSkillId(id: string): boolean {
  const m = SKILL_ID_RE.exec(id);
  return !!m && (TOPIC_IDS as readonly string[]).includes(m[1]);
}

/** A count clamped to 0 … max, or null if it is not a non-negative integer. */
function clampCount(v: unknown, max: number): number | null {
  return isCount(v) ? Math.min(v, max) : null;
}

/** One skill-Stufe of the tracking: counts are clamped, a bad optional field is dropped, a bad entry gives null. */
function parseGrowthStufe(v: unknown): GrowthStufe | null {
  if (!isObj(v)) return null;
  const earlyN = clampCount(v.earlyN, GROWTH_WINDOW);
  const earlyOk = clampCount(v.earlyOk, GROWTH_WINDOW);
  const earlyWrong = clampCount(v.earlyWrong, GROWTH_WINDOW);
  const after = clampCount(v.after, GROWTH_WINDOW);
  if (earlyN === null || earlyOk === null || earlyWrong === null || after === null) return null;
  const g: GrowthStufe = { earlyN, earlyOk: Math.min(earlyOk, earlyN), earlyWrong: Math.min(earlyWrong, earlyN), after };
  if (earlyN === GROWTH_WINDOW && isDay(v.earlyDay)) g.earlyDay = v.earlyDay;
  const best = clampCount(v.best, GROWTH_WINDOW);
  if (best !== null) g.best = best;
  // kind 4's later blocks; `run` and `runDay` only together
  const later = clampCount(v.later, IMPROVE_MAX_BLOCKS * GROWTH_WINDOW);
  if (later) g.later = later;
  const run = clampCount(v.run, IMPROVE_RUN);
  if (run && isDay(v.runDay)) {
    g.run = run;
    g.runDay = v.runDay;
  }
  if (isDay(v.miss)) g.miss = v.miss;
  if (v.improved === true) g.improved = true;
  if (isCount(v.kept) && v.kept > 0) g.kept = v.kept;
  return g;
}

/** An error track, or null if it is unusable (then it is dropped; counts above today's limits are clamped). */
function parseTrack(v: unknown): ErrorTrack | null {
  if (!isObj(v) || !isDay(v.day) || !isCount(v.run) || !isCount(v.seen) || v.seen < 1) return null;
  const t: ErrorTrack = { day: v.day, seen: Math.min(v.seen, ERROR_MIN_SEEN), run: Math.min(v.run, OVERCOME_RUN) };
  if (isDay(v.done)) t.done = v.done;
  return t;
}

/** Two tracks of tags that normalise to the same tag: the later error, the more evidence, overcome if either was. */
function mergeTracks(a: ErrorTrack, b: ErrorTrack): ErrorTrack {
  const t: ErrorTrack = { day: a.day > b.day ? a.day : b.day, seen: Math.max(a.seen, b.seen), run: Math.max(a.run, b.run) };
  const done = a.done && b.done ? (a.done < b.done ? a.done : b.done) : (a.done ?? b.done);
  if (done) t.done = done;
  return t;
}

/**
 * `growth` of a document; missing or not an object gives an empty tracking.
 * The tracking is derived data: a malformed part is dropped, clamped or trimmed and never makes the whole stored
 * progress unloadable (a changed rule in a later version must not cost a child their stars). Entries without a
 * skill entry are dropped, so they can never earn a badge.
 */
function parseGrowth(raw: unknown, skills: Readonly<Record<string, StufeProgress>>): Growth {
  const out = emptyGrowth();
  if (!isObj(raw)) return out;
  const has = (key: string) => Object.prototype.hasOwnProperty.call(skills, key);
  if (isObj(raw.stufen)) {
    for (const key of Object.keys(raw.stufen).slice(0, MAX_SKILL_ENTRIES)) {
      const g = has(key) ? parseGrowthStufe(raw.stufen[key]) : null;
      if (g) out.stufen[key] = g;
    }
  }
  if (isObj(raw.errors)) {
    for (const skillId of Object.keys(raw.errors).slice(0, MAX_SKILL_ENTRIES)) {
      const tracks = raw.errors[skillId];
      if (!isSkillId(skillId) || !isObj(tracks) || ![1, 2, 3].some((s) => has(`${skillId}#${s}`))) continue;
      // A tag that a later version normalises differently is merged, an unusable one is dropped, the list trimmed.
      const parsed: Record<string, ErrorTrack> = {};
      for (const stored of Object.keys(tracks).slice(0, 1_000)) {
        const tag = normalizeTag(stored);
        const t = tag ? parseTrack(tracks[stored]) : null;
        if (!tag || !t) continue;
        parsed[tag] = Object.prototype.hasOwnProperty.call(parsed, tag) ? mergeTracks(parsed[tag], t) : t;
      }
      if (Object.keys(parsed).length > 0) out.errors[skillId] = capTracks(parsed);
    }
  }
  return out;
}

/** Strict validation of a current-version document. `knownBadge` filters badge ids (unknown ones are dropped). */
export function validateState(data: Obj, knownBadge: (id: string) => boolean = () => true): { state: ProgressState; settingsValid: boolean } | null {
  if (data.version !== CURRENT_VERSION) return null;
  const { skills, days, badges, totals, reviewed, lastPlayed } = data;
  if (!isObj(skills) || !Array.isArray(days) || !isObj(badges) || !isObj(totals)) return null;

  const skillKeys = Object.keys(skills);
  if (skillKeys.length > MAX_SKILL_ENTRIES) return null;
  const outSkills: Record<string, StufeProgress> = {};
  for (const key of skillKeys) {
    const p = parseSkillKey(key) ? parseStufe(skills[key]) : null;
    if (!p) return null;
    outSkills[key] = p;
  }

  if (days.length > MAX_DAYS || !days.every(isDay)) return null;
  const outDays = [...new Set(days as Day[])].sort();

  const outBadges: Record<string, Day> = {};
  for (const [id, day] of Object.entries(badges)) {
    if (!isDay(day)) return null;
    if (knownBadge(id)) outBadges[id] = day;
  }

  const t = totals;
  if (!isCount(t.answered) || !isCount(t.firstTry) || !isCount(t.rounds) || !isCount(t.checksPassed)) return null;
  if (reviewed !== undefined && !(isObj(reviewed) && isDay(reviewed.day) && isCount(reviewed.count))) return null;
  // lastPlayed is a convenience: a malformed value is dropped instead of rejecting the whole document.
  const last = isObj(lastPlayed) && typeof lastPlayed.skillId === 'string' ? parseSkillKey(`${lastPlayed.skillId}#${String(lastPlayed.stufe)}`) : null;

  const growth = parseGrowth(data.growth, outSkills);
  const settings = parseSettings(data.settings);
  const state: ProgressState = {
    version: CURRENT_VERSION,
    skills: outSkills,
    days: outDays,
    badges: outBadges,
    totals: { answered: t.answered, firstTry: t.firstTry, rounds: t.rounds, checksPassed: t.checksPassed },
    growth,
    settings: settings ?? { ...DEFAULT_SETTINGS },
  };
  if (isObj(reviewed)) state.reviewed = { day: reviewed.day as Day, count: reviewed.count as number };
  if (last) state.lastPlayed = { skillId: last.skillId, stufe: last.stufe };
  return { state, settingsValid: settings !== null };
}

export type ParseResult = { ok: true; state: ProgressState; settingsValid: boolean } | { ok: false; error: SchemaError };

/** Parse a stored or exported document (already JSON-parsed). */
export function parseDocument(raw: unknown, knownBadge?: (id: string) => boolean): ParseResult {
  if (!isObj(raw)) return { ok: false, error: 'not-mathe6' };
  if ('app' in raw && raw.app !== APP_MARKER) return { ok: false, error: 'not-mathe6' };
  // Every document we write carries the marker; without it, accept only something that looks like a state.
  if (!('version' in raw) || (!('app' in raw) && !('skills' in raw))) return { ok: false, error: 'not-mathe6' };
  const migrated = migrate(raw);
  if (!migrated.ok) return migrated;
  const valid = validateState(migrated.data, knownBadge);
  return valid ? { ok: true, ...valid } : { ok: false, error: 'invalid' };
}

/** Parse JSON text (storage value or imported file). */
export function parseText(text: unknown, knownBadge?: (id: string) => boolean): ParseResult {
  if (typeof text !== 'string' || text.trim() === '') return { ok: false, error: 'empty' };
  if (text.length > MAX_IMPORT_CHARS) return { ok: false, error: 'too-large' };
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, error: 'not-json' };
  }
  return parseDocument(raw, knownBadge);
}

/** The stored/exported form: the state plus the app marker. */
export function serializeState(state: ProgressState): string {
  return JSON.stringify({ app: APP_MARKER, ...state });
}
