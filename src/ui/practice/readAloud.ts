/**
 * Read-aloud with local German voices only (docs/research.md §7.1, T16, P12): nothing leaves the device, nothing plays by itself.
 * The button appears only when the browser offers such a voice. Pure helpers, plus a thin wrapper around speechSynthesis.
 */
import { useEffect, useState } from 'react';
import { UNSOLVABLE_TEXT, isClockJoin } from '../../core/check';
import { BOX, SYMBOL_WORDS, fractionsAsWords, spokenWords, unitWord } from '../../core/format';
import type { Exercise } from '../../core/types';
import { describeWritten } from '../visuals/WrittenVisual';

/** A local German voice, preferring de-DE; null if there is none. Voices served over the network are never used. */
export function localGermanVoice(voices: readonly SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  const german = voices.filter((v) => v.localService && /^de\b/i.test(v.lang.replace('_', '-')));
  return german.find((v) => /^de-DE$/i.test(v.lang.replace('_', '-'))) ?? german[0] ?? null;
}

function synth(): SpeechSynthesis | null {
  try {
    return typeof window !== 'undefined' && window.speechSynthesis ? window.speechSynthesis : null;
  } catch {
    return null;
  }
}

// Browsers load the voice list on the first request: ask early, so it is there when the first task renders.
synth()?.getVoices();

/** The local German voice; browsers deliver their voice list late, through 'voiceschanged'. */
export function useLocalGermanVoice(): SpeechSynthesisVoice | null {
  // Known voices count from the first render: a button that appears afterwards would push the task down after its field was scrolled into view.
  const [voice, setVoice] = useState<SpeechSynthesisVoice | null>(() => localGermanVoice(synth()?.getVoices() ?? []));
  useEffect(() => {
    const s = synth();
    if (!s) return;
    const update = () => setVoice(localGermanVoice(s.getVoices()));
    update();
    s.addEventListener?.('voiceschanged', update);
    return () => s.removeEventListener?.('voiceschanged', update);
  }, []);
  return voice;
}

export function stopSpeaking(): void {
  synth()?.cancel();
}

/** Say `text` with `voice`, replacing what is being said; onEnd also runs when it was stopped. */
export function speakText(text: string, voice: SpeechSynthesisVoice, onEnd: () => void): void {
  const s = synth();
  if (!s || typeof SpeechSynthesisUtterance === 'undefined') {
    onEnd();
    return;
  }
  s.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.voice = voice;
  u.lang = voice.lang;
  u.rate = 0.9;
  u.onend = onEnd;
  u.onerror = onEnd;
  s.speak(u);
}

/** A field and the words around it; nothing if the expression has already said this gap with them ('460 ct = □ €', '17 : 5 = □ Rest □'). */
function fieldWords(ex: Exercise, before: string | undefined, ...after: (string | undefined)[]): string[] {
  if (!before && !after.some(Boolean)) return [];
  const around = (gap: string) => [before, gap, ...after].filter(Boolean).join(' ');
  return ex.expression?.includes(around(BOX)) ? [] : [around(BOX)];
}

/** What the answer asks for, as far as it is text: the words around the field, the options, the items to order. */
function answerWords(ex: Exercise): string[] {
  const a = ex.answer;
  switch (a.kind) {
    case 'number':
      // T16: the whole task, so also the button that can be the answer.
      return [...fieldWords(ex, a.before, a.unit, a.after), ...(a.offerUnsolvable ? [UNSOLVABLE_TEXT] : [])];
    case 'multi':
      // A clock time is two fields around '.' or ':'. The voice says it as a time, as a ':' between two gaps reads as a division.
      return a.fields.flatMap((f, i) => {
        if (isClockJoin(a.fields[i - 1]?.after)) return [];
        if (isClockJoin(f.after)) return [[f.before, 'Lücke Uhr Lücke'].filter(Boolean).join(' ')];
        return fieldWords(ex, f.before, f.after);
      });
    case 'choice':
      // silentOptions: the option list would say the number word the child has to find.
      if (a.silentOptions) return [];
      return a.options.filter((o) => o.label.trim() !== '').map((o) => SYMBOL_WORDS[o.label.trim()] ?? unitWord(o.label.trim()) ?? o.label);
    case 'order':
      return [a.direction === 'aufsteigend' ? 'Zuerst das Kleinste, zuletzt das Größte.' : 'Zuerst das Größte, zuletzt das Kleinste.', ...a.items];
    case 'written':
      // T17: a written task keeps its numbers in the columns, so the voice has to say them.
      return ex.visual?.type === 'written' ? [] : [describeWritten({ type: 'written', op: a.op, operands: a.operands, ...(a.decimalPlaces ? { decimalPlaces: a.decimalPlaces } : {}), method: a.method, showSolution: false })];
    case 'fraction':
      return fieldWords(ex, a.before, a.unit, a.after);
    case 'point':
      return a.targets ? [`Setze ${a.targets.length} Punkte.`] : [`Setze den Punkt ${a.name ?? 'P'}.`];
    default:
      return [];
  }
}

const closed = (text: string) => (/[.!?:]$/.test(text.trim()) ? text.trim() : `${text.trim()}.`);

/** A picture that holds the task itself: the voice has to say it (T16, T17). The other pictures stay for the eyes, and srText describes them. */
function picturedWords(ex: Exercise): string[] {
  if (ex.visual?.type === 'written') return [describeWritten(ex.visual)];
  if (ex.visual?.type === 'term') return ex.visual.lines.filter((line) => !ex.expression?.includes(line));
  return [];
}

/** The whole task and the hints on screen, ready for the voice: numbers and signs as spoken words (T16). */
export function taskSpeech(ex: Exercise, hints: readonly string[] = []): string {
  const parts = [ex.context, ex.prompt, ex.expression, ...picturedWords(ex), ...answerWords(ex), ...hints].filter((p): p is string => !!p && p.trim() !== '').map(fractionsAsWords);
  // the soft hyphens of a long Zahlwort are for the line break, not for the voice
  return spokenWords(parts.map(closed).join(' '), { literalComma: ex.literalComma }).replace(/\u00AD/g, '');
}
