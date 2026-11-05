import { UI_RULES } from '../../core/age';
import { fmt } from '../../core/format';
import type { SkillDef, Stufe, TopicId } from '../../core/types';
import { STUFEN } from '../../core/types';
import { PLAN_EXTRA_NOTE, planStufen } from '../../data/plans';
import { topicDocTitle } from '../../seo/meta';
import { isExtraSkill, isNotYet, marksOf, masteryOf, suggestedStufe } from '../../state/selectors';
import { store } from '../../state/store';
import type { ProgressState } from '../../state/types';
import { useProgress } from '../../state/useProgress';
import { getTopicMeta } from '../../topics/registry';
import { useTopicModule } from '../app/hooks';
import { TopicIcon } from '../app/icons';
import { MASTERY_LABEL, stufeLabel } from '../app/labels';
import { Loading, PageTitle } from '../app/PageTitle';
import { Link } from '../app/router';
import { PATHS, mixPath, practicePath } from '../app/routes';
import { MarkLegend, Marks } from '../app/Marks';

/** Minimum number of 'sicher' skills before "Gemischte Runde" is offered (docs/research.md F14). */
export const MIX_MIN_SICHER = UI_RULES.mixMinSicher;

/** A skill counts as sicher when at least one of its Stufen is sicher or gemeistert. */
export function isSkillSicher(state: ProgressState, skillId: string): boolean {
  return STUFEN.some((s) => {
    const m = masteryOf(state, skillId, s);
    return m === 'sicher' || m === 'gemeistert';
  });
}

/** "Haben wir noch nicht" (§2.5): only moves the skill to the bottom of the list and leaves it out of the review. */
function toggleNotYet(state: ProgressState, skillId: string) {
  const { notYet } = state.settings;
  store.updateSettings({ notYet: notYet.includes(skillId) ? notYet.filter((id) => id !== skillId) : [...notYet, skillId] });
}

function StufeButton({ skill, stufe, state, suggested }: { skill: SkillDef; stufe: Stufe; state: ProgressState; suggested: Stufe }) {
  const mastery = masteryOf(state, skill.id, stufe);
  const recommended = stufe === suggested;
  return (
    <li>
      <Link to={practicePath(skill.id, stufe)} className={recommended ? 'stufe-btn stufe-btn--recommended' : 'stufe-btn'}>
        <span className="stufe-btn__head">
          <span className="stufe-btn__label">{stufeLabel(stufe)}</span>
          {recommended && <span className="tag tag--recommended">Empfohlen</span>}
        </span>
        <span className="stufe-btn__desc">Vor allem: {skill.stufen[stufe]}</span>
        <span className="stufe-btn__state">
          <Marks count={marksOf(state, skill.id, stufe)} />
          <span>{MASTERY_LABEL[mastery]}</span>
        </span>
      </Link>
    </li>
  );
}

function SkillCard({ skill, state, extra }: { skill: SkillDef; state: ProgressState; extra?: boolean }) {
  const suggested = suggestedStufe(state, skill.id);
  const headingId = `skill-${skill.id.replace(/[^a-z0-9-]/gi, '-')}`;
  const notYet = isNotYet(state, skill.id);
  // The plan decides which Stufen of a skill appear by default; the others stay one tap away. An Extra shows all of them.
  const inPlan = planStufen(state.settings.plan, skill.id);
  const shown = extra ? STUFEN : inPlan;
  const rest = STUFEN.filter((s) => !shown.includes(s));
  return (
    <li className={`skill-card${notYet ? ' skill-card--not-yet' : ''}`}>
      <h2 className="skill-card__title" id={headingId}>
        {skill.title}
        {extra && <span className="tag">Extra</span>}
      </h2>
      <p className="skill-card__desc">{skill.description}</p>
      <ul className="stufe-list" aria-labelledby={headingId}>
        {shown.map((s) => (
          <StufeButton key={s} skill={skill} stufe={s} state={state} suggested={suggested} />
        ))}
      </ul>
      {rest.length > 0 && (
        <details className="skill-card__more" open={rest.some((s) => masteryOf(state, skill.id, s) !== 'neu') || undefined}>
          <summary>Weitere Stufen ({fmt(rest.length)})</summary>
          <p className="more-topics__note">{PLAN_EXTRA_NOTE}</p>
          <ul className="stufe-list" aria-labelledby={headingId}>
            {rest.map((s) => (
              <StufeButton key={s} skill={skill} stufe={s} state={state} suggested={suggested} />
            ))}
          </ul>
        </details>
      )}
      <Link to={practicePath(skill.id, suggested, true)} className="skill-card__short">
        Kurze Runde: 5 Aufgaben
      </Link>
      <div className="skill-card__not-yet">
        <button type="button" className="btn" aria-pressed={notYet} onClick={() => toggleNotYet(state, skill.id)}>
          Haben wir noch nicht
        </button>
      </div>
    </li>
  );
}

export default function TopicPage({ topicId }: { topicId: TopicId }) {
  const meta = getTopicMeta(topicId);
  const state = useProgress();
  const mod = useTopicModule(topicId);
  const skills = mod.status === 'ready' ? mod.data.skills : [];
  // Nothing is locked (docs/research.md §2.5): what is outside the plan sits under "Extra", and "Haben wir noch nicht" moves a skill to the bottom of its list.
  const lastNotYet = (list: readonly SkillDef[]) => [...list.filter((s) => !isNotYet(state, s.id)), ...list.filter((s) => isNotYet(state, s.id))];
  const main = lastNotYet(skills.filter((s) => !isExtraSkill(state, s.id)));
  const extras = lastNotYet(skills.filter((s) => isExtraSkill(state, s.id)));
  // An Extra the child has already worked on stays open.
  const extraOpen = extras.some((s) => STUFEN.some((st) => masteryOf(state, s.id, st) !== 'neu'));
  // Extras count too: a Sicher Extra has been practised, so a mixed round can use it (buildMixed in src/state/round.ts), and a topic of Extras only could never reach the count.
  const sicherCount = skills.filter((s) => isSkillSicher(state, s.id)).length;
  const mixReady = sicherCount >= MIX_MIN_SICHER;

  return (
    <div className={`page topic-page topic--${topicId}`}>
      <div className="topic-head">
        <span className="topic-head__icon">
          <TopicIcon topicId={topicId} />
        </span>
        <div>
          <PageTitle docTitle={topicDocTitle(meta)}>{meta.title}</PageTitle>
          <p className="lead">{meta.description}</p>
        </div>
      </div>

      {mod.status === 'loading' && <Loading text="Die Aufgaben werden geladen …" />}
      {mod.status === 'error' && (
        <p className="notice">Die Aufgaben konnten gerade nicht geladen werden. Lade die Seite bitte neu.</p>
      )}

      {mod.status === 'ready' && (
        <>
          <p className="topic-page__intro">Wähle eine Stufe. Du kannst jede Stufe ausprobieren.</p>
          <MarkLegend />
          {skills.length === 0 ? (
            <p className="notice">Hier gibt es noch keine Aufgaben.</p>
          ) : (
            <ul className="skill-list">
              {main.map((s) => (
                <SkillCard key={s.id} skill={s} state={state} />
              ))}
            </ul>
          )}
          {extras.length > 0 && (
            <details className="more-topics" open={main.length === 0 || extraOpen || undefined}>
              <summary>Extra ({fmt(extras.length)})</summary>
              <p className="more-topics__note">{PLAN_EXTRA_NOTE}</p>
              <ul className="skill-list">
                {extras.map((s) => (
                  <SkillCard key={s.id} skill={s} state={state} extra />
                ))}
              </ul>
            </details>
          )}

          <section className="mix-card" aria-labelledby="mix-title">
            <h2 id="mix-title">Gemischte Runde</h2>
            <p>Aufgaben aus dem ganzen Thema durcheinander. Gemischte Aufgaben sind schwerer. Das bringt mehr beim Üben.</p>
            {mixReady ? (
              <Link to={mixPath(topicId)} className="btn btn--primary btn--lg">
                Gemischte Runde starten
              </Link>
            ) : (
              <>
                <button type="button" className="btn btn--lg" disabled aria-describedby="mix-reason">
                  Gemischte Runde starten
                </button>
                <p id="mix-reason" className="mix-card__reason">
                  Das geht, sobald du in {fmt(MIX_MIN_SICHER)} Übungen „Sicher“ bist. Jetzt: {fmt(sicherCount)} von {fmt(MIX_MIN_SICHER)}.
                </p>
              </>
            )}
          </section>
        </>
      )}

      <p className="back-link">
        <Link to={PATHS.home}>Zurück zur Startseite</Link>
      </p>
    </div>
  );
}
