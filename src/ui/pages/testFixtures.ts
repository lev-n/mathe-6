/**
 * Test-only fixtures (imported by *.test.tsx files only): small deterministic stand-ins with real skill ids, so page tests
 * stay fast and do not change with the task texts. src/integration.test.tsx runs the pages with the real generators.
 */
import { BOX, fmt } from '../../core/format';
import type { Exercise, SkillDef, Stufe, TopicId, TopicModule } from '../../core/types';
import { emptyState } from '../../state/store';
import type { MasteryState, ProgressState, StufeProgress } from '../../state/types';

export function fakeSkill(id: string, title: string, opts: { topicId?: TopicId } = {}): SkillDef {
  const topicId = opts.topicId ?? (id.split('.')[0] as TopicId);
  return {
    id,
    topicId,
    title,
    description: `${title} üben.`,
    stufen: { 1: `${title} leicht`, 2: `${title} mittel`, 3: `${title} knifflig` },
    kmk: ['ZO.dezimal-rechnen'],
    generate(rng, stufe: Stufe): Exercise {
      const max = stufe === 1 ? 20 : stufe === 2 ? 40 : 49;
      const a = rng.int(10, max);
      const b = rng.int(10, max);
      const sum = a + b;
      return {
        key: `${id}:${stufe}:${a}+${b}`,
        topicId,
        skillId: id,
        stufe,
        ab: stufe,
        prompt: 'Rechne im Kopf.',
        expression: `${fmt(a)} + ${fmt(b)} = ${BOX}`,
        answer: { kind: 'number', value: sum },
        hints: ['Rechne zuerst die Zehner.'],
        steps: [`${fmt(a)} + ${fmt(b)} = ${fmt(sum)}`],
        praise: 'Du hast die Zehner zuerst gerechnet.',
        srText: `${a} plus ${b}`,
        kmk: stufe === 3 ? ['ZO.rationale-zahlen', 'ZO.dezimal-rechnen'] : ['ZO.dezimal-rechnen'],
      };
    },
  };
}

export const FAKE_SKILLS: Record<TopicId, SkillDef[]> = {
  // brueche.anteil and brueche.zahlenstrahl are core; brueche.gemischt is an Extra in the default plan.
  brueche: [fakeSkill('brueche.anteil', 'Anteile als Bruch'), fakeSkill('brueche.zahlenstrahl', 'Brüche am Zahlenstrahl'), fakeSkill('brueche.gemischt', 'Gemischte Zahlen')],
  dezimal: [fakeSkill('dezimal.plus-minus', 'Dezimalzahlen addieren und subtrahieren')],
  negativ: [fakeSkill('negativ.kontext', 'Negative Zahlen im Alltag')],
  prozent: [fakeSkill('prozent.bedeutung', 'Was heißt Prozent?')],
  terme: [fakeSkill('terme.rechenterm', 'Reihenfolge beim Rechnen')],
  geometrie: [fakeSkill('geometrie.vierecke', 'Vierecke')],
  flaechen: [fakeSkill('flaechen.rechteck', 'Rechteck: Fläche und Umfang')],
  daten: [fakeSkill('daten.diagramm', 'Diagramme lesen')],
};

export function fakeModule(topicId: TopicId): TopicModule {
  return { topicId, skills: FAKE_SKILLS[topicId] };
}

export function progress(state: MasteryState, extra: Partial<StufeProgress> = {}): StufeProgress {
  return { attempts: 10, recent: [], practiceDays: 1, state, box: 0, checks: [], last: '2026-10-17', ...extra };
}

/** emptyState() with some skill progress, e.g. { 'brueche.anteil#1': progress('sicher') }. */
export function stateWith(skills: Record<string, StufeProgress> = {}, patch: Partial<ProgressState> = {}): ProgressState {
  const s = emptyState();
  return { ...s, ...patch, skills, settings: { ...s.settings, ...(patch.settings ?? {}) } };
}
