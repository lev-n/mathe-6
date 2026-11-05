/**
 * 'Vorlesen' on every task when a local German voice exists (docs/research.md §7.1, F11, T16): never plays by itself and is hidden
 * without such a voice. A second press stops it, and leaving the task stops it too.
 */
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { revealField } from '../answers/fieldNav';
import { speakText, stopSpeaking, useLocalGermanVoice } from './readAloud';

function SpeakerIcon() {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" focusable="false">
      <path d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5z" fill="currentColor" />
      <path d="M15 9a4 4 0 0 1 0 6M17.5 6.5a7.5 7.5 0 0 1 0 11" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export default function ReadAloudButton({ text }: { text: string }) {
  const voice = useLocalGermanVoice();
  const [speaking, setSpeaking] = useState(false);
  useEffect(() => stopSpeaking, []);
  // A voice list that arrives after the first render pushes the task down: show the focused field again.
  const voiceWasMissing = useRef(voice === null);
  useLayoutEffect(() => {
    if (!voice || !voiceWasMissing.current) return;
    voiceWasMissing.current = false;
    const active = document.activeElement;
    if (active instanceof HTMLElement && active.matches('[data-answer-field]')) revealField(active);
  }, [voice]);
  if (!voice) return null;
  const toggle = () => {
    if (speaking) {
      stopSpeaking();
      setSpeaking(false);
      return;
    }
    setSpeaking(true);
    speakText(text, voice, () => setSpeaking(false));
  };
  return (
    <button type="button" className={`btn pr-read no-print${speaking ? ' is-speaking' : ''}`} aria-pressed={speaking} onClick={toggle}>
      <SpeakerIcon />
      Vorlesen
    </button>
  );
}
