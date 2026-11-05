/**
 * Practice routes (/ueben/:skillId/:stufe, /mix/:topicId, /wiederholen):
 * validates the route, sets the document title and lazy-loads the PracticePage.
 */
import { Suspense, lazy } from 'react';
import type { SkillDef, TopicId } from '../../core/types';
import type { PracticePlan } from '../../state/types';
import { getTopicMeta } from '../../topics/registry';
import { useDocumentTitle, useTopicModule } from '../app/hooks';
import { stufeLabel } from '../app/labels';
import { Loading, PageTitle } from '../app/PageTitle';
import { Link, navigate } from '../app/router';
import { PATHS, exitPath, planPath } from '../app/routes';
import NotFoundPage, { NOT_FOUND_TITLE } from './NotFoundPage';

const PracticePage = lazy(() => import('../practice/PracticePage'));

const LOADING_TEXT = 'Einen Moment, die Aufgaben werden vorbereitet …';

function titleFor(plan: PracticePlan, skill: SkillDef | undefined, skillMissing: boolean): string {
  switch (plan.mode) {
    case 'skill':
      if (skillMissing) return NOT_FOUND_TITLE;
      return skill ? `${skill.title} – ${stufeLabel(plan.stufe)}` : 'Üben';
    case 'mixed':
      return `Gemischte Runde: ${getTopicMeta(plan.topicId).shortTitle}`;
    case 'review':
      return 'Heute wiederholen';
  }
}

export default function PracticeRoute({ plan, navKey }: { plan: PracticePlan; navKey: number }) {
  const topicId = plan.mode === 'skill' ? (plan.skillId.split('.')[0] as TopicId) : null;
  const mod = useTopicModule(topicId);
  const skill = plan.mode === 'skill' && mod.status === 'ready' ? mod.data.skills.find((s) => s.id === plan.skillId) : undefined;
  const skillMissing = plan.mode === 'skill' && mod.status === 'ready' && !skill;
  useDocumentTitle(titleFor(plan, skill, skillMissing));

  if (plan.mode === 'skill') {
    if (mod.status === 'loading') return <Loading text={LOADING_TEXT} />;
    if (mod.status === 'error') {
      return (
        <div className="page page--narrow">
          <PageTitle docTitle="Üben">Das hat nicht geklappt</PageTitle>
          <p>Die Aufgaben konnten gerade nicht geladen werden. Lade die Seite bitte neu.</p>
          <Link to={PATHS.home} className="btn">
            Zur Startseite
          </Link>
        </div>
      );
    }
    if (skillMissing) return <NotFoundPage />;
  }

  return (
    <Suspense fallback={<Loading text={LOADING_TEXT} />}>
      <PracticePage
        key={navKey}
        plan={plan}
        onExit={() => navigate(exitPath(plan))}
        onNavigate={(next) => navigate(planPath(next))}
      />
    </Suspense>
  );
}
