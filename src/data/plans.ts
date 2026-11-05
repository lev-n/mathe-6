/**
 * The optional plan choice (docs/research.md §2.5) as data: the exact wording, the seven options, the catalogue and one row per plan. Adding a Land means adding one row.
 *
 * A plan decides only which optional skills count as "in deinem Plan" and which Stufen of them appear by default. Everything else stays reachable under "Extra", never counts towards topic progress
 * and never produces a warning. The plan never sets a Stufe, a target or a message, it never reaches a generator, and a default Stufe is never derived from it (F18). The plan id lives in the settings:
 * in memory only until the opt-in, never in a URL, a query, a worksheet, a badge, a summary or a request. The screen says "Lehrplan: eingestellt", never the school type.
 *
 * Skill ids are the catalogue's (§6). src/data/plans.test.ts checks this file against docs/research.md and against the registry.
 */
import type { PlanId, Stufe, TopicId } from '../core/types';
import { STUFEN } from '../core/types';

export const DEFAULT_PLAN: PlanId = 'offen';

/** §2.5, word for word. */
export const PLAN_TEXT = {
  line: 'Passt das zu deinem Unterricht? Lehrplan wählen',
  question: 'Welcher Lehrplan passt?',
  note: 'Wenn du unsicher bist, frag jemanden aus deiner Klasse oder zu Hause.',
  set: 'Lehrplan: eingestellt',
  change: 'Ändern',
  confirm: 'Übernehmen',
} as const;

/** M15 "Plan": for a skill or a Stufe outside the plan. Never a warning. */
export const PLAN_EXTRA_NOTE = 'Das kommt in manchen Plänen später. Du kannst es trotzdem üben.';

/** The seven options, sorted by Land and then alphabetically, so that the list does not read as a ranking. */
export const PLAN_OPTIONS: readonly { id: PlanId; label: string }[] = [
  { id: 'bg', label: 'Bayern Gymnasium' },
  { id: 'bm', label: 'Bayern Mittelschule' },
  { id: 'br', label: 'Bayern Realschule' },
  { id: 'bb', label: 'Berlin/Brandenburg Klasse 6' },
  { id: 'nr', label: 'NRW Gesamtschule, Hauptschule, Realschule, Sekundarschule' },
  { id: 'ng', label: 'NRW Gymnasium' },
  { id: 'offen', label: 'Anderes Land oder weiß nicht' },
];

export function isPlanId(v: unknown): v is PlanId {
  return typeof v === 'string' && PLAN_OPTIONS.some((o) => o.id === v);
}

/** Every skill of the catalogue (§6), by topic, in teaching order. */
export const CATALOGUE: Readonly<Record<TopicId, readonly string[]>> = {
  brueche: ['brueche.anteil', 'brueche.von-groessen', 'brueche.zahlenstrahl', 'brueche.erweitern-kuerzen', 'brueche.vergleichen', 'brueche.gemischt', 'brueche.plus-minus', 'brueche.mal', 'brueche.geteilt'],
  dezimal: ['dezimal.stellenwert', 'dezimal.bruch-umwandeln', 'dezimal.vergleichen', 'dezimal.zahlenstrahl', 'dezimal.runden', 'dezimal.plus-minus', 'dezimal.mal', 'dezimal.geteilt', 'dezimal.groessen'],
  negativ: ['negativ.kontext', 'negativ.zahlengerade', 'negativ.vergleichen', 'negativ.aenderung', 'negativ.plus-minus', 'negativ.mal-geteilt'],
  prozent: ['prozent.bedeutung', 'prozent.umwandeln', 'prozent.prozentwert', 'prozent.grundwert-satz', 'prozent.dreisatz', 'prozent.proportional', 'prozent.massstab'],
  terme: ['terme.rechenterm', 'terme.text-term', 'terme.geschickt', 'terme.platzhalter', 'terme.variable-einsetzen', 'terme.variable-aufstellen', 'terme.gleichung-loesen'],
  geometrie: ['geometrie.winkel-arten', 'geometrie.winkel-messen', 'geometrie.winkel-beziehungen', 'geometrie.dreiecke', 'geometrie.vierecke', 'geometrie.kreis', 'geometrie.koordinaten', 'geometrie.spiegeln', 'geometrie.kongruenz'],
  flaechen: ['flaechen.rechteck', 'flaechen.einheiten', 'flaechen.parallelogramm', 'flaechen.dreieck', 'flaechen.vieleck', 'flaechen.netz', 'flaechen.oberflaeche', 'flaechen.volumen', 'flaechen.volumeneinheiten'],
  daten: ['daten.diagramm', 'daten.kritisch', 'daten.haeufigkeit', 'daten.kreisdiagramm', 'daten.mittelwert', 'daten.kennwerte', 'daten.chancen'],
};

/** Status `core` in the catalogue (§6): everything else is `opt`, and an Extra without a plan. */
export const CORE_SKILLS: readonly string[] = [
  'brueche.anteil', 'brueche.von-groessen', 'brueche.zahlenstrahl', 'brueche.erweitern-kuerzen', 'brueche.vergleichen', 'brueche.plus-minus',
  'dezimal.stellenwert', 'dezimal.bruch-umwandeln', 'dezimal.vergleichen', 'dezimal.zahlenstrahl', 'dezimal.runden', 'dezimal.plus-minus', 'dezimal.mal', 'dezimal.geteilt', 'dezimal.groessen',
  'negativ.kontext', 'negativ.zahlengerade', 'negativ.vergleichen', 'negativ.aenderung',
  'prozent.bedeutung', 'prozent.umwandeln',
  'terme.rechenterm', 'terme.text-term', 'terme.geschickt', 'terme.platzhalter',
  'geometrie.winkel-arten', 'geometrie.winkel-messen', 'geometrie.vierecke', 'geometrie.kreis', 'geometrie.koordinaten',
  'flaechen.rechteck', 'flaechen.einheiten', 'flaechen.netz', 'flaechen.oberflaeche', 'flaechen.volumen', 'flaechen.volumeneinheiten',
  'daten.diagramm', 'daten.kritisch',
];

/** One row of the plan map (§2.5). optional: skill id → its Stufen in the plan, 'alle' without a restriction. hiddenCore: core skills this plan moves to "Extra". */
export interface PlanRow {
  id: PlanId;
  /** The code of §2.5, for the table on the adult page. */
  code: string;
  optional: Readonly<Record<string, 'alle' | readonly Stufe[]>>;
  hiddenCore: readonly string[];
}

const all = (...ids: string[]): Record<string, 'alle'> => Object.fromEntries(ids.map((id) => [id, 'alle' as const]));

/** The plan map of §2.5. One row per plan; the default has neither optional nor hidden skills. */
export const PLAN_MAP: readonly PlanRow[] = [
  {
    id: 'bg',
    code: 'BG',
    optional: all('brueche.gemischt', 'brueche.mal', 'brueche.geteilt', 'negativ.plus-minus', 'negativ.mal-geteilt', 'prozent.prozentwert', 'prozent.grundwert-satz', 'prozent.dreisatz', 'prozent.massstab', 'flaechen.parallelogramm', 'flaechen.dreieck', 'flaechen.vieleck', 'daten.haeufigkeit', 'daten.kreisdiagramm', 'daten.mittelwert'),
    hiddenCore: [],
  },
  {
    id: 'br',
    code: 'BR',
    optional: all('brueche.gemischt', 'brueche.mal', 'brueche.geteilt', 'negativ.plus-minus', 'negativ.mal-geteilt', 'prozent.prozentwert', 'prozent.grundwert-satz', 'prozent.dreisatz', 'prozent.proportional', 'prozent.massstab', 'terme.variable-einsetzen', 'terme.variable-aufstellen', 'terme.gleichung-loesen', 'geometrie.winkel-beziehungen', 'geometrie.dreiecke', 'geometrie.spiegeln', 'geometrie.kongruenz', 'flaechen.parallelogramm', 'flaechen.dreieck', 'flaechen.vieleck'),
    hiddenCore: [],
  },
  {
    id: 'bm',
    code: 'BM',
    optional: { ...all('brueche.gemischt', 'brueche.mal', 'daten.mittelwert'), 'brueche.geteilt': [1], 'negativ.plus-minus': [1], 'negativ.mal-geteilt': [1] },
    hiddenCore: [],
  },
  {
    id: 'ng',
    code: 'NG',
    optional: { ...all('brueche.mal', 'brueche.geteilt', 'prozent.dreisatz', 'prozent.massstab', 'terme.variable-einsetzen', 'terme.variable-aufstellen', 'geometrie.dreiecke', 'geometrie.spiegeln', 'daten.haeufigkeit', 'daten.kreisdiagramm', 'daten.mittelwert', 'daten.kennwerte'), 'flaechen.dreieck': [1], 'flaechen.vieleck': [1] },
    hiddenCore: [],
  },
  {
    id: 'nr',
    code: 'NR',
    optional: { ...all('prozent.massstab', 'terme.variable-einsetzen', 'terme.variable-aufstellen', 'geometrie.dreiecke', 'geometrie.spiegeln', 'daten.haeufigkeit', 'daten.kreisdiagramm', 'daten.mittelwert', 'daten.kennwerte'), 'flaechen.dreieck': [1], 'flaechen.vieleck': [1] },
    hiddenCore: [],
  },
  {
    id: 'bb',
    code: 'BB',
    optional: {
      ...all('brueche.mal', 'brueche.geteilt', 'prozent.dreisatz', 'prozent.proportional', 'geometrie.winkel-beziehungen', 'geometrie.dreiecke', 'geometrie.spiegeln', 'geometrie.kongruenz', 'daten.chancen'),
      'brueche.gemischt': [1],
      'flaechen.vieleck': [1],
      'daten.haeufigkeit': [1],
      'daten.kreisdiagramm': [1],
      'daten.kennwerte': [1, 2],
    },
    hiddenCore: ['negativ.kontext', 'negativ.zahlengerade', 'negativ.vergleichen', 'negativ.aenderung', 'prozent.bedeutung', 'prozent.umwandeln'],
  },
];

const rowOf = (plan: PlanId): PlanRow | undefined => PLAN_MAP.find((r) => r.id === plan);

/** The Stufen of a skill that appear by default in this plan; empty: the skill is an Extra here. Default without a plan: core skills count, optional skills are Extras. */
export function planStufen(plan: PlanId, skillId: string): readonly Stufe[] {
  const row = rowOf(plan);
  if (CORE_SKILLS.includes(skillId)) return row?.hiddenCore.includes(skillId) ? [] : STUFEN;
  const optional = row?.optional[skillId];
  return optional === undefined ? [] : optional === 'alle' ? STUFEN : optional;
}

/** "In deinem Plan"; everything else appears as "Extra" and stays reachable. */
export function isInPlan(plan: PlanId, skillId: string): boolean {
  return planStufen(plan, skillId).length > 0;
}
