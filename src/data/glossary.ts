/**
 * The Fachwörter of T12 (docs/research.md §4) with a short gloss. ItemView lets the child tap the first use of a word in a task to read it, inline and not as a pop-up;
 * this holds on every task of a skill, so nothing about a visit has to be remembered. Forms lists the inflected words as they occur in the task texts.
 */
import type { TopicId } from '../core/types';

export interface Fachwort {
  word: string;
  forms: string;
  gloss: string;
  /** Only in this topic: outside it the word means something else (a Betrag of money). */
  topic?: TopicId;
}

export const FACHWOERTER: readonly Fachwort[] = [
  { word: 'Zähler', forms: 'Zählern?|Zählers', gloss: 'Die Zahl über dem Bruchstrich: So viele Teile zählst du.' },
  { word: 'Nenner', forms: 'Nennern?|Nenners', gloss: 'Die Zahl unter dem Bruchstrich: In so viele Teile ist das Ganze geteilt.' },
  { word: 'erweitern', forms: 'erweitern|erweitere|erweitert', gloss: 'Zähler und Nenner mit derselben Zahl malnehmen.' },
  { word: 'kürzen', forms: 'kürzen|kürze|kürzt|gekürzt', gloss: 'Zähler und Nenner durch dieselbe Zahl teilen.' },
  { word: 'gleichnamig', forms: 'gleichnamig(?:e|en|er)?', gloss: 'Die Brüche haben denselben Nenner.' },
  { word: 'Hauptnenner', forms: 'Hauptnenner[ns]?', gloss: 'Ein gemeinsamer Nenner, so klein wie möglich.' },
  { word: 'Kehrwert', forms: 'Kehrwert(?:e|es)?', gloss: 'Zähler und Nenner tauschen die Plätze.' },
  { word: 'gemischte Zahl', forms: 'gemischten? Zahl(?:en)?|gemischte Zahlen', gloss: 'Ganze und ein Bruch zusammen.' },
  { word: 'Zehntel', forms: 'Zehnteln?', gloss: 'Ein Ganzes in 10 gleiche Teile geteilt: ein Teil davon.' },
  { word: 'Hundertstel', forms: 'Hundertsteln?', gloss: 'Ein Ganzes in 100 gleiche Teile geteilt: ein Teil davon.' },
  { word: 'Tausendstel', forms: 'Tausendsteln?', gloss: 'Ein Ganzes in 1000 gleiche Teile geteilt: ein Teil davon.' },
  { word: 'Vorzeichen', forms: 'Vorzeichen', gloss: 'Plus oder Minus vor einer Zahl.' },
  { word: 'Gegenzahl', forms: 'Gegenzahl(?:en)?', gloss: 'Gleich weit von der 0, auf der anderen Seite.' },
  { word: 'Betrag', forms: 'Betrag|Beträge|Beträgen', gloss: 'Der Abstand einer Zahl zur 0.', topic: 'negativ' },
  { word: 'Term', forms: 'Terme?n?|Terms', gloss: 'Eine Rechnung aus Zahlen, Variablen und Rechenzeichen.' },
  { word: 'Variable', forms: 'Variablen?', gloss: 'Ein Buchstabe, der für eine Zahl steht.' },
  { word: 'Schenkel', forms: 'Schenkeln?|Schenkels', gloss: 'Die zwei Linien, die einen Winkel bilden.' },
  { word: 'Scheitel', forms: 'Scheitels?', gloss: 'Der Punkt, an dem die zwei Linien eines Winkels beginnen.' },
  { word: 'Radius', forms: 'Radius|Radien', gloss: 'Die Strecke vom Mittelpunkt zum Kreisrand.' },
  { word: 'Durchmesser', forms: 'Durchmessers?', gloss: 'Die Strecke durch den Mittelpunkt, von Rand zu Rand.' },
  { word: 'Grundseite', forms: 'Grundseiten?', gloss: 'Die Seite, auf der die Höhe senkrecht steht.' },
  { word: 'Höhe', forms: 'Höhen?', gloss: 'Der senkrechte Abstand von der Grundseite zur Spitze.', topic: 'flaechen' },
  { word: 'Mittelwert', forms: 'Mittelwert(?:e|es)?', gloss: 'Alle Werte zusammen, geteilt durch ihre Anzahl.' },
  { word: 'relative Häufigkeit', forms: 'relativen? Häufigkeit(?:en)?|relative Häufigkeiten', gloss: 'Der Anteil an allen: so oft, geteilt durch die Anzahl aller.' },
  { word: 'Grundwert', forms: 'Grundwert(?:e|es)?', gloss: 'Das Ganze, also 100 %.' },
  { word: 'Prozentwert', forms: 'Prozentwert(?:e|es)?', gloss: 'Der Teil vom Ganzen, als Größe.' },
  { word: 'Prozentsatz', forms: 'Prozentsatz|Prozentsatzes', gloss: 'Der Teil vom Ganzen, in Prozent.' },
];

const WORDS = new RegExp(`(?<![\\p{L}\\p{N}-])(?:${FACHWOERTER.map((f, i) => `(?<w${i}>${f.forms})`).join('|')})(?![\\p{L}\\p{N}-])`, 'giu');

export type GlossSegment = { text: string } | { word: string; gloss: string };

/** One text in segments: the first use of each Fachwort in `seen` becomes a word with its gloss. Adds what it finds to `seen`. */
function glossSegments(text: string, seen: Set<string>, topic: TopicId): GlossSegment[] {
  const out: GlossSegment[] = [];
  let from = 0;
  for (const m of text.matchAll(WORDS)) {
    const f = FACHWOERTER[Object.keys(m.groups ?? {}).findIndex((k) => m.groups?.[k] !== undefined)];
    if (seen.has(f.word) || (f.topic && f.topic !== topic)) continue;
    seen.add(f.word);
    if (m.index > from) out.push({ text: text.slice(from, m.index) });
    out.push({ word: m[0], gloss: f.gloss });
    from = m.index + m[0].length;
  }
  if (from < text.length || out.length === 0) out.push({ text: text.slice(from) });
  return out;
}

/** The texts of a task in reading order: only the first use across all of them gets a gloss. */
export function glossTexts(texts: readonly string[], topic: TopicId): GlossSegment[][] {
  const seen = new Set<string>();
  return texts.map((t) => glossSegments(t, seen, topic));
}
