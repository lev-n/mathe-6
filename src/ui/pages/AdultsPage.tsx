/**
 * "Für Eltern und Lehrkräfte": how the app works (docs/research.md in plain German), all settings,
 * storage status + backup/restore/delete, and the curriculum alignment.
 */
import { useRef, useState } from 'react';
import type { ChangeEvent, ReactNode } from 'react';
import type { TopicId } from '../../core/types';
import { LAENDER_DIFFERENCES, TOPIC_ALIGNMENT, UNVERIFIED } from '../../data/curriculum';
import { PLAN_EXTRA_NOTE, PLAN_MAP, PLAN_OPTIONS, PLAN_TEXT } from '../../data/plans';
import { DOC_TITLES } from '../../seo/meta';
import { badgeById } from '../../state/badges';
import { today } from '../../state/dates';
import { IMPORT_MESSAGES, MAX_IMPORT_CHARS, parseText } from '../../state/schema';
import { STORAGE_KEY, store } from '../../state/store';
import type { ProgressState, Settings } from '../../state/types';
import { useConsent, useProgress, useSaveStatus, useSettings } from '../../state/useProgress';
import { SAVE_FAILED_ADULT } from '../practice/phrases';
import { TOPICS } from '../../topics/registry';
import { PlanChoice } from './PlanChoice';
import { formatDay } from '../app/labels';
import { PageTitle } from '../app/PageTitle';
import { Link } from '../app/router';
import { PATHS } from '../app/routes';

// ─── Helpers ────────────────────────────────────────────────────────────────

/** The catalogue's titles for the plan table (docs/research.md §6). */
const SKILL_TITLES: Readonly<Record<string, string>> = {
  'brueche.gemischt': 'Gemischte Zahlen', 'brueche.mal': 'Brüche multiplizieren', 'brueche.geteilt': 'Brüche dividieren',
  'negativ.kontext': 'Negative Zahlen im Alltag', 'negativ.zahlengerade': 'Die Zahlengerade', 'negativ.vergleichen': 'Negative Zahlen vergleichen', 'negativ.aenderung': 'Zustand und Änderung',
  'negativ.plus-minus': 'Plus und Minus mit negativen Zahlen', 'negativ.mal-geteilt': 'Mal und Geteilt mit negativen Zahlen',
  'prozent.bedeutung': 'Was heißt Prozent?', 'prozent.umwandeln': 'Bruch, Dezimalzahl, Prozent', 'prozent.prozentwert': 'Prozent von einer Größe', 'prozent.grundwert-satz': 'Prozentsatz und Grundwert',
  'prozent.dreisatz': 'Dreisatz', 'prozent.proportional': 'Proportional oder nicht?', 'prozent.massstab': 'Maßstab',
  'terme.variable-einsetzen': 'Zahlen einsetzen', 'terme.variable-aufstellen': 'Term aufstellen', 'terme.gleichung-loesen': 'Gleichungen lösen',
  'geometrie.winkel-beziehungen': 'Winkel an Geraden', 'geometrie.dreiecke': 'Dreiecke einteilen', 'geometrie.spiegeln': 'Spiegeln und Verschieben', 'geometrie.kongruenz': 'Kongruente Figuren',
  'flaechen.parallelogramm': 'Parallelogramm', 'flaechen.dreieck': 'Dreieck', 'flaechen.vieleck': 'Zerlegen und Ergänzen',
  'daten.haeufigkeit': 'Absolute und relative Häufigkeit', 'daten.kreisdiagramm': 'Kreisdiagramme lesen', 'daten.mittelwert': 'Mittelwert', 'daten.kennwerte': 'Spannweite und Median', 'daten.chancen': 'Chancen vergleichen',
};

/** Triggers a file download of `text` (Blob + temporary <a download>). */
export function downloadText(filename: string, text: string, type = 'application/json'): void {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.rel = 'noopener';
  a.className = 'visually-hidden';
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function readFileText(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(reader.error ?? new Error('read failed'));
    reader.readAsText(file);
  });
}

export const backupFilename = (day: string): string => `mathe6-fortschritt-${day}.json`;

function update(patch: Partial<Settings>) {
  store.updateSettings(patch);
}

// ─── Small form controls (labels are the hit area, ≥ 48 px) ──────────────────

function Toggle({ checked, onChange, label, hint, id }: { checked: boolean; onChange: (v: boolean) => void; label: string; hint?: ReactNode; id: string }) {
  return (
    <div className="setting">
      <label className="check-row" htmlFor={id}>
        <input id={id} type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} aria-describedby={hint ? `${id}-hint` : undefined} />
        <span className="check-row__title">{label}</span>
      </label>
      {hint && (
        <p className="hint setting__hint" id={`${id}-hint`}>
          {hint}
        </p>
      )}
    </div>
  );
}

function RadioGroup<T extends string | number>({
  legend,
  name,
  value,
  options,
  onChange,
  hint,
  segmented = false,
}: {
  legend: string;
  name: string;
  value: T;
  options: { value: T; label: string; hint?: string }[];
  onChange: (v: T) => void;
  hint?: ReactNode;
  segmented?: boolean;
}) {
  return (
    <fieldset className="choice-group setting">
      <legend>{legend}</legend>
      {hint && <p className="hint setting__hint">{hint}</p>}
      <div className={segmented ? 'segmented' : 'check-list'}>
        {options.map((o) => (
          <label key={String(o.value)} className={segmented ? 'segmented__item' : 'check-row'}>
            <input type="radio" name={name} value={String(o.value)} checked={value === o.value} onChange={() => onChange(o.value)} />
            <span>
              <span className="check-row__title">{o.label}</span>
              {o.hint && <span className="check-row__desc">{o.hint}</span>}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

// ─── Sections ───────────────────────────────────────────────────────────────

function HowItWorks() {
  return (
    <section aria-labelledby="how-title" className="prose">
      <h2 id="how-title">So funktioniert das Üben</h2>

      <h3>Selbst rechnen statt nur lesen</h3>
      <p>
        Jede Aufgabe verlangt eine eigene Antwort. Wer Wissen aktiv aus dem Gedächtnis abruft, behält es besser als beim
        bloßen Wiederlesen. Dieser Testungseffekt gehört zu den am besten belegten Befunden der Lernforschung.
      </p>

      <h3>Rückmeldung, die weiterhilft</h3>
      <ul>
        <li>Der Knopf „Tipp“ ist immer sichtbar. Er gibt einen Denkanstoß, aber nie die Lösung.</li>
        <li>
          Stimmt eine Antwort noch nicht, kommt ein gezielter Hinweis – oft passend zum typischen Fehler, etwa einem
          vergessenen Übertrag – und ein zweiter Versuch.
        </li>
        <li>
          Nach dem zweiten Fehlversuch zeigt die App den Lösungsweg mit den Zahlen der Aufgabe und danach eine ähnliche
          „Zwillingsaufgabe“.
        </li>
      </ul>
      <p>
        Erklärende Rückmeldungen wirken in Studien deutlich stärker als die reine Auskunft, ob eine Antwort stimmt.
      </p>

      <h3>Lob für den Weg, nicht für die Person</h3>
      <p>
        Rückmeldungen benennen, was das Kind getan hat: „Richtig. Du hast an den Übertrag gedacht.“ oder „Geschafft – du
        hast weiter geübt.“ Eigenschaften, Tempo oder Superlative werden nicht gelobt. Dass solches Prozesslob langfristig
        hilft, ist vor allem in Beobachtungsstudien gezeigt; es kostet aber nichts und birgt wenig Risiko.
      </p>

      <h3>Drei Stufen, nichts ist gesperrt</h3>
      <p>
        Die Stufe bestimmt den Inhalt einer Übung. Sie steht nie für eine Schulform. Innerhalb einer Stufe mischt jede Runde die Anforderungsbereiche I bis III der KMK-Bildungsstandards: 7, 2 und 1 Aufgaben auf Stufe 1, 4, 4 und 2 auf Stufe 2,
        2, 5 und 3 auf Stufe 3. Die App schlägt für eine neue Übung Stufe 1 vor („Empfohlen“). Der Lehrplan ändert das nicht. Jede Stufe lässt sich frei wählen.
      </p>

      <h3>Marken zeigen den Lernstand</h3>
      <ul>
        <li>1 Marke – Geübt: Die Stufe wurde bearbeitet.</li>
        <li>
          2 Marken – Sicher: Mindestens 8 der letzten 10 Aufgaben wurden im ersten Versuch ohne Tipp gelöst, darunter die
          letzten 3.
        </li>
        <li>
          3 Marken – Gemeistert: Zusätzlich wurden mindestens 4 der letzten 5 Kontrollen im ersten Versuch gelöst (Wiederholungen
          frühestens 3 Tage nach „Sicher“), und die Stufe wurde an mindestens 3 verschiedenen Tagen geübt.
        </li>
      </ul>
      <p>
        Marken bedeuten nur den Lernstand, nie die Leistung in einer einzelnen Runde. Die Schwellen sind begründete
        Faustregeln, keine geprüften Normen.
      </p>

      <h3>Wiederholen mit Abstand</h3>
      <p>
        Was sicher sitzt, kommt nach 1, 3, 7, 14 und 28 Tagen wieder („Heute wiederholen“: 3 bis 5 Aufgaben zum Einstieg, höchstens 8 am Tag).
        Verteiltes Üben hält Wissen deutlich länger als Üben am Stück. Von selbst verteilt man sein Üben aber selten.
        Überfällige Aufgaben warten einfach, ohne Mahnung.
      </p>

      <h3>Gemischte Runde</h3>
      <p>
        Sobald zwei Übungen eines Themas „Sicher“ sind, wird eine gemischte Runde angeboten. In gemischten Runden liegen die Ergebnisse oft niedriger als beim Üben einer einzelnen Übung. Das ist
        normal und gewollt: Bei jeder Aufgabe muss neu entschieden werden, welcher Rechenweg passt. In einer Studie mit Klasse 7 lag der Test einen Monat später deutlich höher. Bitte werten Sie niedrigere
        Werte in dieser Runde nicht als Rückschritt.
      </p>

      <h3>Warum es keine Zeitlimits, Serien und Ranglisten gibt</h3>
      <ul>
        <li>
          <strong>Keine Uhr:</strong> Zeitdruck kann Stress und Matheangst verstärken. Deshalb gibt es hier keine Aufgaben auf Zeit.
        </li>
        <li>
          <strong>Keine Tagesserien:</strong> „Streaks“ wirken über die Angst, etwas zu verlieren. Stattdessen gibt es ein
          freiwilliges Wochenziel, das sich jeden Montag still zurücksetzt, und einen Zähler der Übungstage, der nie sinkt.
        </li>
        <li>
          <strong>Keine Ranglisten:</strong> Vergleiche mit anderen können denen schaden, die (noch) hinten liegen. Sichtbar ist
          nur die eigene Entwicklung.
        </li>
        <li>
          <strong>Keine Punkte, Münzen oder Shops:</strong> Angekündigte Belohnungen können die Freude an der Sache mindern. Abzeichen kommen deshalb überraschend und tragen sachliche Titel wie „Brüche: Sicher“.
        </li>
      </ul>

      <h3>Abzeichen fürs Besserwerden</h3>
      <p>
        Die wichtigsten Abzeichen gibt es nicht fürs Richtigmachen beim ersten Mal, sondern dafür, dass etwas, das am Anfang
        schwerfiel, später gelingt: an einem anderen Tag oder in der Wiederholung nach ein paar Tagen. Verglichen wird nur mit dem
        eigenen früheren Stand. Kleine Fortschritte in einer Runde bekommen nur einen kurzen Satz. Mit absichtlich verkehrten
        Antworten allein lässt sich kein Abzeichen verdienen: Jedes braucht echte Erfolge an späteren Tagen oder in einer
        Wiederholung. Unter „Mein Fortschritt“ zeigt „So hast du dich verbessert“, was besser geworden ist. Dafür werden
        nur Zahlen, Fehlerarten und Tage gespeichert, wie alles andere nur auf diesem Gerät und erst nach Ihrer oder des Kindes Zustimmung.
      </p>

      <h3>Faires Design</h3>
      <p>
        Jede Runde lässt sich jederzeit mit einem Klick verlassen. Es gibt kein automatisches Weiterspielen, keine Pop-ups während
        einer Runde, keine Erinnerungen, keine E-Mails und keinen Ton. Nach etwa 20 Minuten schlägt die App eine Pause vor.
        Eine Runde hat 10 Aufgaben und dauert etwa 12 bis 15 Minuten. Das ist eine Schätzung, die noch nicht im Versuch geprüft wurde. Eine kurze Runde mit 5 Aufgaben steht frei zur Wahl und hat keine Nachteile.
      </p>

      <h3>Für das Alter von 11 und 12 Jahren</h3>
      <ul>
        <li>Auf Touch-Geräten kommt ein Ziffernblock mit ± und Komma. Beide Tasten stehen immer an derselben Stelle und gelten für die ganze Übung, sodass sie nichts über die Antwort verraten. Sonst wird die Tastatur des Geräts benutzt, und der Ziffernblock lässt sich in den Einstellungen einschalten.</li>
        <li>Die Texte sind kurz und sachlich und benutzen die Fachwörter aus dem Unterricht. Ein Fachwort lässt sich antippen und zeigt eine kurze Erklärung. Es gibt keine Maskottchen und keine Aufgaben auf Zeit.</li>
        <li>
          Der Knopf „Vorlesen“ liest die Aufgabe vor, wenn das Gerät eine deutsche Stimme hat. Es werden nur Stimmen auf dem Gerät
          benutzt, nichts wird verschickt. Ohne eine solche Stimme fehlt der Knopf. Von selbst liest die App nie vor.
        </li>
      </ul>

      <h3>Worauf das beruht</h3>
      <p>
        Die Gestaltung stützt sich auf eine Auswertung der Forschung zu Lernen, Motivation, Barrierefreiheit und Datenschutz
        (unter anderem Metaanalysen zu Abrufübung, verteiltem und gemischtem Üben, Rückmeldung, Lösungsbeispielen und
        Belohnungen), auf die KMK-Bildungsstandards 2022 und auf die Lehrpläne von Bayern, NRW und Berlin-Brandenburg. Viele Effekte sind in anderen Altersgruppen oder
        anderen Ländern belegt. Für diese Altersstufe ist die Lage oft dünner. Die Inhalte wurden noch nicht von Lehrkräften geprüft.
      </p>
    </section>
  );
}

function SettingsSection() {
  const s = useSettings();
  const consent = useConsent();
  const saveStatus = useSaveStatus();
  return (
    <section aria-labelledby="settings-title" className="settings">
      <h2 id="settings-title">Einstellungen</h2>
      {consent === 'granted' && saveStatus !== 'ok' ? (
        <p className="notice" data-testid="settings-status">
          <span>Die Einstellungen gelten sofort. {SAVE_FAILED_ADULT}</span>
        </p>
      ) : consent === 'granted' ? (
        <p data-testid="settings-status">Die Einstellungen gelten sofort und werden mit dem Fortschritt auf diesem Gerät gespeichert.</p>
      ) : (
        // Without the opt-in nothing is written to storage (§ 25 TDDDG), so settings last only for this visit.
        <p className="notice" data-testid="settings-status">
          <span>
            Die Einstellungen gelten sofort, aber nur, bis die Seite geschlossen wird. Damit sie erhalten bleiben, wählen Sie
            unten <a href="#storage-title">„Fortschritt auf diesem Gerät merken“</a>.
          </span>
        </p>
      )}

      <RadioGroup
        legend="Schriftliche Subtraktion"
        name="set-sub"
        value={s.subtractionMethod}
        onChange={(v) => update({ subtractionMethod: v })}
        hint="Voreingestellt ist Abziehen. Wählen Sie das Verfahren, das in der Klasse gelernt wird. Das Kind wird danach nicht gefragt. Innerhalb einer Übung wird nie gemischt, und kein Verfahren gilt hier als das richtige."
        options={[
          {
            value: 'abziehen',
            label: 'Abziehen (Entbündeln)',
            hint: 'Ist die obere Ziffer zu klein, wird an der nächsten Stelle entbündelt, z. B. 1 Zehner in 10 Einer getauscht. Realschule und Mittelschule in Bayern nennen dieses Verfahren.',
          },
          {
            value: 'ergaenzen',
            label: 'Ergänzen (Erweitern)',
            hint: 'Man ergänzt von der unteren zur oberen Ziffer. Reicht es nicht, werden beide Zahlen um gleich viel erweitert.',
          },
        ]}
      />

      <div className="setting">
        <h3>Lehrplan</h3>
        <p className="hint setting__hint">{PLAN_INTRO}</p>
        <PlanChoice intro={PLAN_INTRO} />
      </div>

      <RadioGroup
        legend="Wochenziel: Übungstage pro Woche"
        name="set-goal"
        value={s.weeklyGoal}
        onChange={(v) => update({ weeklyGoal: v })}
        hint="Das Ziel setzt sich jeden Montag still zurück. Es geht nichts verloren."
        segmented
        options={[1, 2, 3, 4, 5].map((n) => ({ value: n, label: String(n) }))}
      />

      <fieldset className="choice-group setting">
        <legend>Darstellung</legend>
        <Toggle id="set-large" checked={s.largeText} onChange={(v) => update({ largeText: v })} label="Schrift größer" hint="Alle Texte 25 % größer." />
        <Toggle
          id="set-spacing"
          checked={s.wideSpacing}
          onChange={(v) => update({ wideSpacing: v })}
          label="Mehr Abstand"
          hint="Mehr Platz zwischen Buchstaben, Wörtern und Zeilen. Das kann beim Lesen helfen."
        />
        <Toggle
          id="set-motion"
          checked={s.reduceMotion}
          onChange={(v) => update({ reduceMotion: v })}
          label="Animationen aus"
          hint="Alles erscheint sofort, ohne Bewegung."
        />
        <Toggle
          id="set-font"
          checked={s.schoolFont}
          onChange={(v) => update({ schoolFont: v })}
          label="Schulschrift (Andika)"
          hint="Eine Schrift mit Buchstabenformen wie in der Schulschrift."
        />
      </fieldset>

      <RadioGroup
        legend="Ziffernblock auf dem Bildschirm"
        name="set-keypad"
        value={s.keypad}
        onChange={(v) => update({ keypad: v })}
        options={[
          { value: 'auto', label: 'Automatisch', hint: 'An bei Geräten mit Touchscreen, sonst aus. Das ist die Voreinstellung.' },
          { value: 'on', label: 'An', hint: 'Auch mit Maus und Tastatur. Eine Tastatur funktioniert trotzdem.' },
          { value: 'off', label: 'Aus', hint: 'Die Tastatur des Geräts wird benutzt.' },
        ]}
      />
    </section>
  );
}

type Message = { kind: 'ok' | 'error'; text: string } | null;

/**
 * Files larger than this cannot be a valid backup (≤ MAX_IMPORT_CHARS characters, and UTF-8 needs at most
 * 3 bytes per UTF-16 code unit; ×4 leaves headroom), so they are rejected before being read into memory.
 */
export const MAX_IMPORT_BYTES = MAX_IMPORT_CHARS * 4;

/** True if loading a file would overwrite something (asks for confirmation first). */
export function hasProgress(state: ProgressState): boolean {
  return (
    state.totals.answered > 0 ||
    state.days.length > 0 ||
    Object.keys(state.skills).length > 0 ||
    Object.keys(state.badges).length > 0
  );
}

const isKnownBadge = (id: string) => badgeById(id) !== undefined;
const lastDay = (days: readonly string[]): string => (days.length > 0 ? formatDay(days[days.length - 1]) : 'noch keiner');
const importError = (text: string): Message => ({ kind: 'error', text: `Die Datei konnte nicht geladen werden: ${text}` });

/** Pending confirmation: "Fortschritt löschen" or loading a file over existing progress. */
type Pending = { kind: 'delete' } | { kind: 'import'; text: string; fileLastDay: string } | null;

export function StorageSection() {
  const consent = useConsent();
  const saveStatus = useSaveStatus();
  const progress = useProgress();
  const [message, setMessage] = useState<Message>(null);
  const [pending, setPending] = useState<Pending>(null);
  const confirmRef = useRef<HTMLDivElement>(null);
  const deleteRef = useRef<HTMLButtonElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const focusLater = (el: { current: HTMLElement | null }) => window.setTimeout(() => el.current?.focus(), 0);

  function exportProgress() {
    try {
      downloadText(backupFilename(today()), store.exportJson());
      setMessage({ kind: 'ok', text: 'Die Datei mit dem Fortschritt wurde heruntergeladen.' });
    } catch {
      setMessage({ kind: 'error', text: 'Die Datei konnte nicht erstellt werden.' });
    }
  }

  function applyImport(text: string) {
    const result = store.importJson(text);
    if (!result.ok) {
      setMessage(importError(result.error));
      return;
    }
    const kept = store.getConsent() === 'granted';
    setMessage({
      kind: 'ok',
      text: kept
        ? 'Der Fortschritt wurde geladen.'
        : 'Der Fortschritt wurde geladen. Damit er erhalten bleibt, wählen Sie oben „Fortschritt auf diesem Gerät merken“.',
    });
  }

  async function importProgress(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setPending(null);
    if (file.size > MAX_IMPORT_BYTES) {
      setMessage(importError(IMPORT_MESSAGES['too-large']));
      return;
    }
    let text: string;
    try {
      text = await readFileText(file);
    } catch {
      setMessage({ kind: 'error', text: 'Die Datei konnte nicht gelesen werden.' });
      return;
    }
    // Check the file first, so nobody is asked to replace their progress with a broken file.
    const parsed = parseText(text, isKnownBadge);
    if (!parsed.ok) {
      setMessage(importError(IMPORT_MESSAGES[parsed.error]));
      return;
    }
    if (!hasProgress(store.get())) {
      applyImport(text);
      return;
    }
    setMessage(null);
    setPending({ kind: 'import', text, fileLastDay: lastDay(parsed.state.days) });
    focusLater(confirmRef);
  }

  function confirmImport() {
    if (pending?.kind !== 'import') return;
    applyImport(pending.text);
    setPending(null);
    focusLater(fileRef);
  }

  function askDelete() {
    setPending({ kind: 'delete' });
    setMessage(null);
    focusLater(confirmRef);
  }

  function cancel() {
    const kind = pending?.kind;
    setPending(null);
    focusLater(kind === 'import' ? fileRef : deleteRef);
  }

  function confirmDelete() {
    store.reset();
    setPending(null);
    setMessage({ kind: 'ok', text: 'Der Fortschritt wurde gelöscht.' });
    focusLater(deleteRef);
  }

  return (
    <section aria-labelledby="storage-title" className="storage">
      <h2 id="storage-title">Fortschritt speichern</h2>
      <div className="status-box" data-testid="storage-status">
        {consent === 'granted' ? (
          <>
            {saveStatus === 'newer' ? (
              <p>
                <strong>{SAVE_FAILED_ADULT}</strong> Auf diesem Gerät ist Fortschritt aus einer neueren Version von Mathe 6
                gespeichert. Er wird hier nicht überschrieben. Laden Sie die Seite neu, oder löschen Sie ihn mit „Fortschritt
                löschen“, damit wieder gespeichert wird.
              </p>
            ) : saveStatus === 'failed' ? (
              <p>
                <strong>{SAVE_FAILED_ADULT}</strong> Der Browser lässt das Speichern nicht zu (zum Beispiel im privaten Modus
                oder wenn der Speicher voll ist). Mit „Fortschritt sichern“ können Sie ihn in einer Datei aufbewahren.
              </p>
            ) : (
              <p>
                <strong>Der Fortschritt wird auf diesem Gerät gespeichert</strong> – im Browser unter dem Eintrag „{STORAGE_KEY}“.
                Nichts wird verschickt.
              </p>
            )}
            <button type="button" className="btn" onClick={() => store.forget()}>
              Nicht mehr merken
            </button>
            <p className="hint">Löscht den Eintrag auf diesem Gerät. Bis zum Schließen der Seite bleibt der Fortschritt erhalten.</p>
          </>
        ) : (
          <>
            <p>
              <strong>Der Fortschritt wird zurzeit nicht gespeichert.</strong> Er geht verloren, wenn die Seite geschlossen wird.
            </p>
            <button type="button" className="btn" onClick={() => store.setConsent('granted')}>
              Fortschritt auf diesem Gerät merken
            </button>
            <p className="hint">Wird nur in diesem Browser gespeichert. Nichts wird verschickt.</p>
          </>
        )}
      </div>
      <p className="hint">
        Der Fortschritt gehört zu einer Person: Mathe 6 kennt keine Namen und unterscheidet nicht, wer übt. Üben mehrere Personen
        im selben Browser, mischt sich ihr Fortschritt. Dann hilft für jede ein eigenes Browser-Profil.
      </p>

      <h3>Sichern und laden</h3>
      <p>
        Mit einer Sicherungsdatei können Sie den Fortschritt aufbewahren oder auf ein anderes Gerät übertragen. Manche
        Browser (z. B. Safari) und Gastzugänge auf Schulgeräten löschen gespeicherte Daten nach einiger Zeit.
      </p>
      <div className="row">
        <button type="button" className="btn" onClick={exportProgress}>
          Fortschritt sichern
        </button>
        <label className="btn file-btn">
          Fortschritt laden
          <input ref={fileRef} type="file" accept="application/json,.json" className="visually-hidden" onChange={importProgress} />
        </label>
      </div>
      {pending?.kind === 'import' && (
        <div className="confirm-box" ref={confirmRef} tabIndex={-1} role="group" aria-labelledby="import-confirm-text">
          <p id="import-confirm-text">
            <strong>Den jetzigen Fortschritt durch die Datei ersetzen?</strong> Marken, Abzeichen und Übungstage auf diesem
            Gerät werden überschrieben.
          </p>
          <p data-testid="import-days">
            Letzter Übungstag in der Datei: {pending.fileLastDay}. Auf diesem Gerät: {lastDay(progress.days)}.
          </p>
          <p className="hint">Mit „Erst sichern“ bewahren Sie den jetzigen Fortschritt vorher in einer Datei auf.</p>
          <div className="row">
            <button type="button" className="btn btn--primary" onClick={confirmImport}>
              Ja, ersetzen
            </button>
            <button type="button" className="btn" onClick={exportProgress}>
              Erst sichern
            </button>
            <button type="button" className="btn" onClick={cancel}>
              Abbrechen
            </button>
          </div>
        </div>
      )}

      <h3>Löschen</h3>
      {pending?.kind !== 'delete' ? (
        <button ref={deleteRef} type="button" className="btn" onClick={askDelete}>
          Fortschritt löschen
        </button>
      ) : (
        <div className="confirm-box" ref={confirmRef} tabIndex={-1} role="group" aria-labelledby="confirm-text">
          <p id="confirm-text">
            <strong>Wirklich den ganzen Fortschritt löschen?</strong> Marken, Abzeichen und Übungstage werden entfernt. Die
            Einstellungen bleiben.
          </p>
          <div className="row">
            <button type="button" className="btn btn--primary" onClick={confirmDelete}>
              Ja, löschen
            </button>
            <button type="button" className="btn" onClick={cancel}>
              Abbrechen
            </button>
          </div>
        </div>
      )}

      <p className={message ? `message message--${message.kind}` : 'message'} role="status" data-testid="storage-message">
        {message?.text}
      </p>
    </section>
  );
}

/** What the plan choice does, in one place for the setting and the section. */
const PLAN_INTRO = 'Die Wahl entscheidet nur, welche optionalen Übungen zum Plan zählen und welche Stufen davon zuerst erscheinen. Sie legt keine Stufe und kein Ziel fest, und nichts wird gesperrt. Gespeichert wird nur ein Kürzel, auf diesem Gerät und erst nach Ihrer Zustimmung. Es steht in keiner Adresse und auf keinem Arbeitsblatt.';

/** The Stufen of a row as a short note: '(Stufe 1)' for a restricted skill. */
function planCell(optional: Readonly<Record<string, 'alle' | readonly number[]>>): string {
  return Object.entries(optional)
    .map(([id, stufen]) => `${SKILL_TITLES[id] ?? id}${stufen === 'alle' ? '' : ` (Stufe ${stufen.join(', ')})`}`)
    .join(', ');
}

function LaenderSection() {
  return (
    <section aria-labelledby="laender-title" className="prose">
      <h2 id="laender-title">Lehrpläne und Bundesländer</h2>
      <p>
        Für Klasse 6 zählt das Land so viel wie die Schulart. Nur Bayern legt fest, was in die 6. Klasse gehört. NRW nennt das Ende von Klasse 6, Berlin-Brandenburg Niveaustufen. Deshalb gibt es einen gemeinsamen Kern und
        eine freiwillige Wahl des Lehrplans. Nichts ist gesperrt, und ohne Wahl zählt der Kern. Alles andere bleibt unter „Extra“ erreichbar. Es zählt nicht zum Fortschritt im Thema und löst keine Warnung aus. Der Hinweis dort lautet: „{PLAN_EXTRA_NOTE}“
      </p>
      <h3>Die Wahl des Lehrplans</h3>
      <p>
        Die Frage „{PLAN_TEXT.question}“ erscheint nie von selbst und ist nie eine Voraussetzung zum Üben. Sie steht als kleine Zeile unter den Themen und hier unter den Einstellungen. Danach zeigt die Seite nur „{PLAN_TEXT.set}“, nie die Schulart.
        Jede Übung hat außerdem den Knopf „Haben wir noch nicht“: Er schiebt sie ans Ende der Liste und nimmt sie aus der Wiederholung.
      </p>
      <p>
        Gespeichert wird nur ein Kürzel, und auch das nur nach Zustimmung: {PLAN_OPTIONS.map((o) => `„${o.id}“ für „${o.label}“`).join(', ')}. Das Kürzel lässt auf das Land und oft auf die Schulart schließen.
      </p>
      <table className="plan-table" role="table" data-testid="plan-table">
        <caption className="visually-hidden">Welche optionalen Übungen in welchem Lehrplan zählen</caption>
        <thead role="rowgroup">
          <tr role="row">
            <th scope="col" role="columnheader">Lehrplan</th>
            <th scope="col" role="columnheader">Optionale Übungen im Plan</th>
            <th scope="col" role="columnheader">Kern-Übungen, die dort als Extra erscheinen</th>
          </tr>
        </thead>
        <tbody role="rowgroup">
          {PLAN_MAP.map((row) => (
            <tr key={row.id} role="row">
              <th scope="row" role="rowheader">{PLAN_OPTIONS.find((o) => o.id === row.id)?.label}</th>
              <td role="cell" data-label="Optionale Übungen im Plan">{planCell(row.optional)}</td>
              <td role="cell" data-label="Kern-Übungen, die dort als Extra erscheinen">{row.hiddenCore.length > 0 ? row.hiddenCore.map((id) => SKILL_TITLES[id] ?? id).join(', ') : 'keine'}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <dl className="laender-list">
        {LAENDER_DIFFERENCES.map((d) => (
          <div key={d.topic}>
            <dt>{d.topic}</dt>
            <dd>{d.text}</dd>
          </div>
        ))}
      </dl>
      <p>
        Auch die Reihenfolge im Schuljahr ist verschieden, und selbst in Bayern ist kein Monat festgelegt. Ein Thema kann im Oktober noch unbekannt sein. Deshalb ist nichts gesperrt, und ein noch unbekanntes Thema kann einfach warten.
      </p>
      <h3 id="unverified-title">Was noch nicht geprüft ist</h3>
      <ul data-testid="unverified">
        {UNVERIFIED.map((t) => (
          <li key={t}>{t}</li>
        ))}
      </ul>
    </section>
  );
}

function CurriculumSection() {
  return (
    <section aria-labelledby="curriculum-title">
      <h2 id="curriculum-title">Bezug zum Lehrplan</h2>
      <p>
        Die KMK-Bildungsstandards für den Ersten und den Mittleren Schulabschluss (Fassung vom 23.06.2022) beschreiben das Ende der Schulzeit und nennen keinen Zwischenstand
        für die 6. Klasse. Sie geben den Rahmen. Der Umfang der Aufgaben kommt aus den Lehrplänen: LehrplanPLUS Bayern (Gymnasium, Realschule, Mittelschule), den Kernlehrplänen NRW und dem Rahmenlehrplan Berlin-Brandenburg mit der Planungshilfe für Jahrgangsstufe 6.
        Die Inhalte wurden mit automatischen Tests und einer KI-Durchsicht geprüft, noch nicht von Lehrkräften.
      </p>
      <table className="align-table" role="table">
        <caption className="visually-hidden">Themen von Mathe 6 und ihr Bezug zu KMK, Bayern, NRW und Berlin-Brandenburg</caption>
        <thead role="rowgroup">
          <tr role="row">
            <th scope="col" role="columnheader">Thema</th>
            <th scope="col" role="columnheader">KMK-Leitideen</th>
            <th scope="col" role="columnheader">Bayern (LehrplanPLUS)</th>
            <th scope="col" role="columnheader">NRW (Kernlehrpläne)</th>
            <th scope="col" role="columnheader">Berlin-Brandenburg</th>
          </tr>
        </thead>
        <tbody role="rowgroup">
          {TOPICS.map((t) => {
            const a = TOPIC_ALIGNMENT[t.id as TopicId];
            return (
              <tr key={t.id} role="row">
                <th scope="row" role="rowheader">
                  {t.title}
                </th>
                <td role="cell" data-label="KMK-Leitideen">
                  {a.kmk.join(', ')}
                </td>
                <td role="cell" data-label="Bayern">
                  {a.bayern}
                </td>
                <td role="cell" data-label="NRW">
                  {a.nrw}
                </td>
                <td role="cell" data-label="Berlin-Brandenburg">
                  {a.bb}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p>
        Zum Ausdrucken gibt es <Link to={PATHS.worksheet}>Arbeitsblätter mit Lösungsblatt</Link>.
      </p>
    </section>
  );
}

export default function AdultsPage() {
  return (
    <div className="page adults-page">
      <PageTitle docTitle={DOC_TITLES.adults}>Für Eltern und Lehrkräfte</PageTitle>
      <p className="lead">
        Mathe 6 ist ein kostenloses Übungsportal für die 6. Klasse. Es braucht keine Anmeldung, zeigt keine Werbung und
        schickt keine Daten an Dritte.
      </p>
      <nav aria-label="Auf dieser Seite" className="toc">
        <ul>
          <li>
            <a href="#how-title">So funktioniert das Üben</a>
          </li>
          <li>
            <a href="#settings-title">Einstellungen</a>
          </li>
          <li>
            <a href="#storage-title">Fortschritt speichern</a>
          </li>
          <li>
            <a href="#laender-title">Lehrpläne und Bundesländer</a>
          </li>
          <li>
            <a href="#curriculum-title">Bezug zum Lehrplan</a>
          </li>
        </ul>
      </nav>
      <HowItWorks />
      <SettingsSection />
      <StorageSection />
      <LaenderSection />
      <CurriculumSection />
      <p className="legal-links">
        <Link to={PATHS.privacy}>Datenschutz</Link> · <Link to={PATHS.imprint}>Impressum</Link>
      </p>
    </div>
  );
}
