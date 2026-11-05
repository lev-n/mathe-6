/** Test support of the topic (imported only by *.test.ts). */
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createRng } from '../../core/rng';
import { formatAnswer } from '../../core/check';
import { fmt, fmtPercent, toSpeech } from '../../core/format';
import type { Ab, Exercise, SkillDef, Stufe, Visual } from '../../core/types';
import VisualView from '../../ui/visuals/Visual';
import { srTextWithPicture } from '../../ui/visuals/describe';
import { CTX } from '../test-utils';

/** n exercises of one Stufe and AB level. */
export function atAb(skill: SkillDef, stufe: Stufe, ab: Ab, n = 200): Exercise[] {
  return Array.from({ length: n }, (_, i) => skill.generate(createRng(i * 5507 + 19 + stufe * 7 + ab), stufe, { ...CTX, ab }));
}

/** The part of a key that names the task kind: 'daten.diagramm:1:wert:…' → 'wert'. */
export const formOf = (ex: Exercise) => ex.key.split(':')[2];

export function number(ex: Exercise): number {
  if (ex.answer.kind !== 'number' || ex.answer.value === null) throw new Error(`${ex.key}: number answer expected`);
  return ex.answer.value;
}

export function field(ex: Exercise, id: string): number {
  if (ex.answer.kind !== 'multi') throw new Error(`${ex.key}: multi answer expected`);
  const f = ex.answer.fields.find((x) => x.id === id);
  if (!f) throw new Error(`${ex.key}: no field ${id}`);
  return f.value;
}

export function chosen(ex: Exercise) {
  if (ex.answer.kind !== 'choice') throw new Error(`${ex.key}: choice answer expected`);
  return ex.answer.options[ex.answer.correct];
}

export function bar(ex: Exercise) {
  if (ex.visual?.type !== 'barChart') throw new Error(`${ex.key}: bar chart expected`);
  return ex.visual;
}

/** The value of a group of the chart. */
export const valueOf = (chart: { categories: string[]; values: number[] }, category: string) => chart.values[chart.categories.indexOf(category)];

/** A label with its numbers, its quoted answers and the words of its chart hidden: what is left is the form of the sentence. */
function shapeOf(ex: Exercise, label: string): string {
  const v = ex.visual?.type === 'barChart' ? ex.visual : undefined;
  const words = [...(v?.categories ?? []), ...(v?.valueLabel ? [v.valueLabel.replace('Anzahl: ', '')] : [])];
  return words
    .reduce((text, w) => text.split(w).join('@'), label)
    .replace(/\b(?:bei|am|im|in der) @/gi, '@')
    .replace(/„[^“]*“/g, '@')
    .replace(/\d[\d\u202F]*/g, '#');
}

/**
 * Choice forms that can be answered without the data: one label is right every time, or one sentence form is right nearly every time and stands alone among the
 * options. Returns 'Stufe:AB:form: reason' for each.
 */
export function giveaways(skill: SkillDef): string[] {
  const out: string[] = [];
  for (const stufe of [1, 2, 3] as const) {
    for (const ab of [1, 2, 3] as const) {
      const forms = new Map<string, Exercise[]>();
      for (const ex of atAb(skill, stufe, ab, 400)) {
        if (ex.answer.kind === 'choice' && !ex.answer.options.every((o) => o.visual)) forms.set(formOf(ex), [...(forms.get(formOf(ex)) ?? []), ex]);
      }
      for (const [form, items] of forms) {
        if (new Set(items.map((ex) => chosen(ex).label)).size === 1) out.push(`${stufe}:${ab}:${form}: always the same label`);
        const alone = new Map<string, number>();
        for (const ex of items) {
          if (ex.answer.kind !== 'choice') continue;
          const shapes = ex.answer.options.map((o) => shapeOf(ex, o.label));
          const right = shapes[ex.answer.correct];
          if (shapes.filter((x) => x === right).length === 1) alone.set(right, (alone.get(right) ?? 0) + 1);
        }
        for (const [shape, n] of alone) if (n > items.length * 0.8) out.push(`${stufe}:${ab}:${form}: "${shape}" is right, alone of its form, in ${n} of ${items.length}`);
      }
    }
  }
  return out;
}

const plain = (text: string) => toSpeech(text).replace(/[.,;:]/g, ' ').replace(/\s+/g, ' ');

/** The data of the task's own picture that its screen-reader text does not hold, row by row. */
export function dataNotSaid(ex: Exercise): string[] {
  const said = ` ${plain(srTextWithPicture(ex))} `;
  const v = ex.visual;
  const data = v?.type === 'table' ? v.rows.map((r) => r.join(' ')) : v?.type === 'barChart' ? v.categories.map((c, i) => `${c} ${fmt(v.values[i])}`) : v?.type === 'pieChart' && v.showValues === 'percent' ? v.slices.map((s) => `${s.label} ${fmtPercent(s.value)}`) : [];
  return data.filter((d) => !said.includes(` ${plain(d)} `));
}

/** Every skill of the topic, every Stufe and AB: the picture can be used from the text alone. */
export function picturesNotSaid(skill: SkillDef, n = 200): string[] {
  const out: string[] = [];
  for (const stufe of [1, 2, 3] as const) {
    for (const ab of [1, 2, 3] as const) {
      for (const ex of atAb(skill, stufe, ab, n)) for (const gap of dataNotSaid(ex)) out.push(`${ex.key}: ${gap}`);
    }
  }
  return out;
}

/** Every number and multi answer as the child sees it after 'Die Lösung' and in the worksheet key: a whole number has no decimals. */
export function paddedAnswers(skill: SkillDef, n = 60): string[] {
  const out: string[] = [];
  for (const stufe of [1, 2, 3] as const) {
    for (const ab of [1, 2, 3] as const) {
      for (const ex of atAb(skill, stufe, ab, n)) {
        if ((ex.answer.kind === 'number' || ex.answer.kind === 'multi') && /,\d*0(?!\d)/.test(formatAnswer(ex.answer))) out.push(`${ex.key}: ${formatAnswer(ex.answer)}`);
      }
    }
  }
  return out;
}

const STUFEN_AB = ([1, 2, 3] as const).flatMap((stufe) => ([1, 2, 3] as const).map((ab) => [stufe, ab] as const));

/** Different tasks under one key: dedupe and twins would take them for the same task. Pictures of a choice are compared by what they show, as their letters change. */
export function keyClashes(skill: SkillDef, n = 1500): string[] {
  const out = new Map<string, string>();
  const clashes: string[] = [];
  for (const [stufe, ab] of STUFEN_AB) {
    for (const ex of atAb(skill, stufe, ab, n)) {
      const asked = ex.answer.kind === 'choice' ? (chosen(ex).visual ? JSON.stringify(chosen(ex).visual) : chosen(ex).label) : formatAnswer(ex.answer);
      const task = `${ex.context ?? ''} | ${ex.prompt} | ${asked}`;
      const seen = out.get(ex.key);
      if (seen !== undefined && seen !== task) clashes.push(`${ex.key}: ${seen} <> ${task}`);
      out.set(ex.key, task);
    }
  }
  return clashes;
}

/** Nouns of this topic whose singular differs: '1 Kästchen' is right. */
const COUNTED = 'Personen|Bücher|Fahrräder|Anmeldungen|Waffeln|Sprünge|Punkte|Karten|Seiten|Kugeln|Felder|Würfe|Striche|Werte|Stimmen';
const ONE_WITH_PLURAL = new RegExp(`(?<![\\d,])1 (?:\\p{L}+e )?(?:${COUNTED})(?!\\p{L})`, 'u');

/** Every text a child sees, with a count of 1 in the plural: '1 Personen'. */
export function pluralSlips(skill: SkillDef, n = 400): string[] {
  const out: string[] = [];
  for (const [stufe, ab] of STUFEN_AB) {
    for (const ex of atAb(skill, stufe, ab, n)) {
      const options = ex.answer.kind === 'choice' ? ex.answer.options.flatMap((o) => [o.label, o.whyWrong ?? '']) : [];
      const steps = ex.steps.map((step) => (typeof step === 'string' ? step : step.text));
      const texts = [ex.context ?? '', ex.prompt, formatAnswer(ex.answer), ...ex.hints, ...steps, ...options, ...(ex.bugs ?? []).map((b) => b.hint), ex.praise];
      for (const text of texts) if (ONE_WITH_PLURAL.test(text)) out.push(`${ex.key}: ${text}`);
    }
  }
  return out;
}

/** Screen-reader texts with a doubled stop, or an option or field that runs into the next sentence without one. */
export function speechSlips(skill: SkillDef, n = 200): string[] {
  const out: string[] = [];
  for (const [stufe, ab] of STUFEN_AB) {
    for (const ex of atAb(skill, stufe, ab, n)) {
      const said = srTextWithPicture(ex);
      if (/\.\s*\./.test(said) || /\s[.,]/.test(said)) out.push(`${ex.key}: doubled stop: ${said}`);
      if (!/[.?!]$/.test(ex.srText)) out.push(`${ex.key}: no closing mark: ${ex.srText}`);
    }
  }
  return out;
}

/** The narrowest a picture gets on a phone, as a data picture keeps its --min-scale and then scrolls sideways. */
function floorPx(visual: Visual): number {
  const html = renderToStaticMarkup(createElement(VisualView, { visual }));
  const width = /--vw:\s*([\d.]+)px/.exec(html);
  const scale = /--min-scale:\s*([\d.]+)/.exec(html);
  if (!width || !scale) throw new Error(`${visual.type}: no floor`);
  return Number(width[1]) * Number(scale[1]);
}

/** Card and answer option on a 375 px phone (src/ui/visuals/phone.test.tsx, readable.test.tsx). */
const CARD_PX = 311;
const OPTION_PX = 277;

/** Bar charts that do not fit a 375 px phone: as the task's picture, in a worked step or as an answer option. */
export function chartsTooWide(skill: SkillDef, n = 100): string[] {
  const out: string[] = [];
  const check = (key: string, visual: Visual | undefined, limit: number) => {
    if (visual?.type === 'barChart' && floorPx(visual) > limit) out.push(`${key}: ${floorPx(visual)} > ${limit}: ${visual.categories.join(', ')}; ${visual.title}`);
  };
  for (const [stufe, ab] of STUFEN_AB) {
    for (const ex of atAb(skill, stufe, ab, n)) {
      check(ex.key, ex.visual, CARD_PX);
      for (const step of ex.steps) if (typeof step !== 'string') check(ex.key, step.visual, CARD_PX);
      if (ex.answer.kind === 'choice') for (const o of ex.answer.options) check(ex.key, o.visual, OPTION_PX);
    }
  }
  return out;
}

/** The order of size of some values, as ranks: [20, 32, 28] and [25, 40, 35] are the same order. */
export const rankOf = (values: readonly number[]) => values.map((x) => values.filter((y) => y < x).length).join();

