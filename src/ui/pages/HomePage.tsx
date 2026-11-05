import { useMemo } from 'react';
import { fmt } from '../../core/format';
import type { SkillDef, Stufe, TopicId, TopicModule } from '../../core/types';
import { today } from '../../state/dates';
import { practisedTopics, topicMarks, weekProgress } from '../../state/selectors';
import { useProgress } from '../../state/useProgress';
import { TOPICS } from '../../topics/registry';
import { useTopicModules } from '../app/hooks';
import { ArrowIcon, RepeatIcon, TopicIcon } from '../app/icons';
import { daysPhrase, stufeLabel, tasksPhrase } from '../app/labels';
import { PageTitle } from '../app/PageTitle';
import { continueStufe, lastPractisedSkillId, reviewRoundSize } from '../app/progress';
import { Link } from '../app/router';
import { PATHS, practicePath, topicPath } from '../app/routes';
import { PlanChoice } from './PlanChoice';
import { WeekGoal } from './WeekGoal';

/** A practised topic without a mark yet: an Extra counts for no topic (§2.5), and the card still says what is true. */
const PRACTISED = 'Schon geübt';

function findSkill(mods: Partial<Record<TopicId, TopicModule | 'error'>>, skillId: string): SkillDef | undefined {
  const mod = mods[skillId.split('.')[0] as TopicId];
  return mod && mod !== 'error' ? mod.skills.find((s) => s.id === skillId) : undefined;
}

export default function HomePage() {
  const state = useProgress();
  // Only topics with progress need their module (for stars); new visitors load nothing extra.
  const practised = useMemo(() => practisedTopics(state), [state]);
  const mods = useTopicModules(practised);
  const day = today();

  // Count exactly what the review round will contain (3 to 5 items, ≤ 8 a day).
  const loadedSkills = useMemo(() => Object.values(mods).flatMap((m) => (m && m !== 'error' ? m.skills : [])), [mods]);
  const reviewCount = useMemo(() => reviewRoundSize(state, day, loadedSkills), [state, day, loadedSkills]);
  const week = weekProgress(state, day);
  const lifetimeDays = state.days.length;

  const lastId = useMemo(() => lastPractisedSkillId(state), [state]);
  const lastSkill = lastId ? findSkill(mods, lastId) : undefined;
  const lastStufe: Stufe | null = lastSkill ? continueStufe(state, lastSkill.id) : null;

  return (
    <div className="page home">
      <PageTitle docTitle={null}>Was möchtest du heute üben?</PageTitle>

      {(reviewCount > 0 || (lastSkill && lastStufe)) && (
        <div className="home__start">
          {reviewCount > 0 && (
            <section className="review-card" aria-labelledby="review-title">
              <span className="review-card__icon">
                <RepeatIcon />
              </span>
              <div className="review-card__body">
                <h2 id="review-title">Heute wiederholen</h2>
                <p>{tasksPhrase(reviewCount)} von früher. So bleibt es im Gedächtnis.</p>
              </div>
              <Link to={PATHS.review} className="btn btn--primary btn--lg review-card__go">
                Wiederholen <ArrowIcon />
              </Link>
            </section>
          )}
          {lastSkill && lastStufe && (
            <Link
              to={practicePath(lastSkill.id, lastStufe)}
              className={`continue-tile topic--${lastSkill.topicId}`}
            >
              <span className="continue-tile__kicker">Weiter üben</span>
              <span className="continue-tile__title">
                {lastSkill.title} – {stufeLabel(lastStufe)}
              </span>
              <ArrowIcon />
            </Link>
          )}
        </div>
      )}

      <section aria-labelledby="topics-title" className="home__topics">
        <h2 id="topics-title" className="visually-hidden">
          Themen
        </h2>
        <ul className="topic-grid">
          {TOPICS.map((t) => {
            const mod = mods[t.id];
            const touched = practised.includes(t.id);
            // Topic progress counts only what is in the plan (§2.5).
            const marks = touched && mod && mod !== 'error' ? topicMarks(state, mod.skills) : null;
            return (
              <li key={t.id}>
                <Link to={topicPath(t.id)} className={`topic-card topic--${t.id}`}>
                  <span className="topic-card__icon">
                    <TopicIcon topicId={t.id} />
                  </span>
                  <span className="topic-card__text">
                    <span className="topic-card__title">{t.title}</span>
                    <span className="topic-card__desc">{t.description}</span>
                    {!touched && <span className="topic-card__marks topic-card__marks--new">Noch nicht geübt</span>}
                    {marks && marks.max > 0 && (
                      <span className="topic-card__progress">
                        <svg className="bar" viewBox="0 0 100 8" preserveAspectRatio="none" aria-hidden="true" focusable="false">
                          <rect className="bar__track" x="0" y="0" width="100" height="8" rx="4" />
                          {marks.marks > 0 && (
                            <rect className="bar__fill" x="0" y="0" width={Math.max(4, (100 * marks.marks) / marks.max)} height="8" rx="4" />
                          )}
                        </svg>
                        <span className="topic-card__marks">
                          {marks.marks > 0 ? `${fmt(marks.marks)} von ${fmt(marks.max)} Marken` : PRACTISED}
                        </span>
                      </span>
                    )}
                    {marks && marks.max === 0 && <span className="topic-card__marks">{PRACTISED}</span>}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      <PlanChoice />

      <section className="home__week" aria-labelledby="week-title">
        <h2 id="week-title" className="visually-hidden">
          Deine Übungstage
        </h2>
        <WeekGoal days={week.days} goal={week.goal} reached={week.reached} />
        {lifetimeDays > 0 && <p className="home__lifetime">Du hast schon {daysPhrase(lifetimeDays)} geübt.</p>}
      </section>
    </div>
  );
}
