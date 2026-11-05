import { useEffect, useRef, useState } from 'react';
import { fmt } from '../../core/format';
import type { TopicMeta, TopicModule } from '../../core/types';
import { STUFEN } from '../../core/types';
import { today } from '../../state/dates';
import { growthView } from '../../state/growth';
import { masteryOf, practisedStufe, practisedTopics, marksOf, isExtraSkill, weekProgress } from '../../state/selectors';
import type { ProgressState } from '../../state/types';
import { store } from '../../state/store';
import { useConsent, useProgress, useSaveStatus } from '../../state/useProgress';
import { GROWTH_VIEW_HEADING, growthViewLines } from '../practice/growthText';
import { SAVE_FAILED_CHILD } from '../practice/phrases';
import { TOPICS } from '../../topics/registry';
import { useTopicModules } from '../app/hooks';
import { TopicIcon } from '../app/icons';
import { MASTERY_LABEL, daysPhrase, stufeLabel } from '../app/labels';
import { PageTitle } from '../app/PageTitle';
import { Link } from '../app/router';
import { PATHS, topicPath } from '../app/routes';
import { MarkLegend, Marks } from '../app/Marks';
import { WeekGoal } from './WeekGoal';

/** The skills in the plan, and Extras only once practised: they earn the status labels but never make a topic look unfinished (§2.5). */
function shownSkills(state: ProgressState, mod: TopicModule) {
  return mod.skills.filter((s) => !isExtraSkill(state, s.id) || practisedStufe(state, s.id) !== undefined);
}

function TopicTable({ meta, mod, state }: { meta: TopicMeta; mod: TopicModule; state: ProgressState }) {
  const skills = shownSkills(state, mod);
  if (skills.length === 0) return null;
  return (
    <table className="progress-table" role="table">
      <caption className="visually-hidden">{meta.title}: Marken pro Stufe</caption>
      <thead role="rowgroup">
        <tr role="row">
          <th scope="col" role="columnheader">Übung</th>
          {STUFEN.map((s) => (
            <th scope="col" role="columnheader" key={s}>
              {stufeLabel(s)}
            </th>
          ))}
        </tr>
      </thead>
      <tbody role="rowgroup">
        {skills.map((skill) => (
          <tr key={skill.id} role="row">
            <th scope="row" role="rowheader">
              {skill.title}
            </th>
            {STUFEN.map((s) => {
              const m = masteryOf(state, skill.id, s);
              return (
                <td key={s} role="cell" data-label={stufeLabel(s)} className={`progress-cell progress-cell--${m}`}>
                  <Marks count={marksOf(state, skill.id, s)} />
                  <span className="progress-cell__word">{MASTERY_LABEL[m]}</span>
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/**
 * "So hast du dich verbessert" (docs/research.md M16): per skill, only what got better compared with the
 * child's own earlier answers (never a decline, never a comparison with others). Nothing is shown without improvement.
 */
function GrowthList({ meta, mod, state }: { meta: TopicMeta; mod: TopicModule; state: ProgressState }) {
  const items = shownSkills(state, mod)
    .map((skill) => {
      const view = growthView(state, skill.id);
      return view ? { skill, lines: growthViewLines(view) } : null;
    })
    .filter((x): x is { skill: (typeof mod.skills)[number]; lines: string[] } => x !== null && x.lines.length > 0);
  if (items.length === 0) return null;
  return (
    <div className="progress-growth">
      <h3 className="progress-growth__title">
        {GROWTH_VIEW_HEADING}
        <span className="visually-hidden">: {meta.title}</span>
      </h3>
      <ul className="progress-growth__list">
        {items.map(({ skill, lines }) => (
          <li key={skill.id} className="progress-growth__skill">
            <span className="progress-growth__name">{skill.title}</span>
            <ul className="progress-growth__lines">
              {lines.map((line, i) => (
                <li key={i}>{line}</li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function ProgressPage() {
  const state = useProgress();
  const consent = useConsent();
  const saveStatus = useSaveStatus();
  const practised = practisedTopics(state);
  const mods = useTopicModules(practised);
  const week = weekProgress(state, today());
  const badgeCount = Object.keys(state.badges).length;
  const lifetime = state.days.length;
  const [granted, setGranted] = useState(false);
  const storedNote = useRef<HTMLParagraphElement>(null);

  // The answered button disappears: hand the focus on to the note that replaces it, as ConsentPrompt does in a round.
  useEffect(() => {
    if (granted) storedNote.current?.focus({ preventScroll: true });
  }, [granted]);

  const grant = () => {
    store.setConsent('granted');
    setGranted(true);
  };

  return (
    <div className="page progress-page">
      <PageTitle docTitle="Mein Fortschritt">Mein Fortschritt</PageTitle>

      <section className="summary-card" aria-label="Überblick">
        <p className="summary-card__lifetime">
          {lifetime > 0 ? `Du hast schon ${daysPhrase(lifetime)} geübt.` : 'Hier siehst du bald deine Übungen.'}
        </p>
        <WeekGoal days={week.days} goal={week.goal} reached={week.reached} />
        <p>
          <Link to={PATHS.badges} className="btn">
            {badgeCount > 0 ? `Meine Abzeichen (${fmt(badgeCount)})` : 'Meine Abzeichen'}
          </Link>
        </p>
      </section>

      <MarkLegend />

      {TOPICS.map((t) => {
        const mod = mods[t.id];
        const touched = practised.includes(t.id);
        return (
          <section key={t.id} className={`progress-topic topic--${t.id}`} aria-labelledby={`progress-${t.id}`}>
            <h2 id={`progress-${t.id}`} className="progress-topic__title">
              <span className="progress-topic__icon">
                <TopicIcon topicId={t.id} />
              </span>
              {t.title}
            </h2>
            {!touched ? (
              <p className="progress-topic__empty">
                Noch nicht geübt. <Link to={topicPath(t.id)}>Zum Thema</Link>
              </p>
            ) : mod === undefined ? (
              <p className="loading">Wird geladen …</p>
            ) : mod === 'error' ? (
              <p className="notice">Dieses Thema konnte gerade nicht geladen werden.</p>
            ) : (
              <>
                <TopicTable meta={t} mod={mod} state={state} />
                <GrowthList meta={t} mod={mod} state={state} />
                <p>
                  <Link to={topicPath(t.id)}>Weiter üben: {t.shortTitle}</Link>
                </p>
              </>
            )}
          </section>
        );
      })}

      <section className="storage-note" aria-labelledby="storage-title">
        <h2 id="storage-title">Wo ist dein Fortschritt gespeichert?</h2>
        {consent === 'granted' ? (
          <p tabIndex={-1} ref={storedNote}>
            {saveStatus !== 'ok' ? SAVE_FAILED_CHILD : 'Dein Fortschritt bleibt nur auf diesem Gerät. Die Seite verschickt nichts.'}
          </p>
        ) : (
          <>
            <p>Noch gilt dein Fortschritt nur für jetzt.</p>
            <p>Soll die Seite deinen Fortschritt auf diesem Gerät speichern? Die Seite verschickt nichts.</p>
            <div className="row">
              <button type="button" className="btn" onClick={grant}>
                Ja, auf diesem Gerät merken
              </button>
              <Link to={PATHS.privacy}>Mehr zum Datenschutz</Link>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
